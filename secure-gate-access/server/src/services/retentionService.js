/**
 * Data Retention Service
 * Implements GDPR Article 5(1)(e) - Storage Limitation
 * 
 * Purpose:
 * - Archive visitors after their access period expires + retention period
 * - Delete or anonymize data after legal retention period
 * - Maintain audit trail of retention operations
 * 
 * Retention Periods:
 * - Active visitors: Until valid_until + grace period
 * - Archived visitors: 90 days (configurable)
 * - Access logs: 1 year
 * - Audit logs: 7 years (legal requirement)
 */

import pool from '../database/db.enhanced.js';
import logger from '../config/logger.js';

class RetentionService {
  constructor() {
    // Configurable retention periods (in days converted from years in env)
    const visitorsYears = parseInt(process.env.DATA_RETENTION_VISITORS_YEARS || '2', 10);
    const accessLogsYears = parseInt(process.env.DATA_RETENTION_ACCESS_LOGS_YEARS || '1', 10);
    const auditLogsYears = parseInt(process.env.DATA_RETENTION_AUDIT_LOGS_YEARS || '3', 10);
    
    const visitorsDeletionYears = parseInt(process.env.DATA_DELETION_VISITORS_YEARS || '3', 10);
    const accessLogsDeletionYears = parseInt(process.env.DATA_DELETION_ACCESS_LOGS_YEARS || '2', 10);
    const auditLogsDeletionYears = parseInt(process.env.DATA_DELETION_AUDIT_LOGS_YEARS || '5', 10);
    
    const auditLogsAnonymizeYears = parseInt(process.env.DATA_ANONYMIZE_AUDIT_LOGS_YEARS || '3', 10);
    
    this.config = {
      // Archive periods (convert years to days)
      visitorArchiveDays: visitorsYears * 365,
      accessLogArchiveDays: accessLogsYears * 365,
      auditLogArchiveDays: auditLogsYears * 365,
      
      // Deletion periods
      visitorDeletionDays: visitorsDeletionYears * 365,
      accessLogDeletionDays: accessLogsDeletionYears * 365,
      auditLogDeletionDays: auditLogsDeletionYears * 365,
      
      // Anonymization period
      auditLogAnonymizeDays: auditLogsAnonymizeYears * 365,
      
      // Legacy compatibility
      visitorGracePeriod: parseInt(process.env.VISITOR_GRACE_PERIOD_DAYS || '30', 10),
      archivedVisitorRetention: visitorsDeletionYears * 365,
      accessLogRetention: accessLogsYears * 365,
      auditLogRetention: auditLogsYears * 365,
      
      batchSize: parseInt(process.env.RETENTION_BATCH_SIZE || '100', 10),
      dryRun: process.env.DATA_RETENTION_DRY_RUN === 'true'
    };
    
    logger.info('[RetentionService] Initialized with config:', {
      visitorArchive: `${visitorsYears} years`,
      visitorDeletion: `${visitorsDeletionYears} years`,
      accessLogArchive: `${accessLogsYears} years`,
      accessLogDeletion: `${accessLogsDeletionYears} years`,
      auditLogArchive: `${auditLogsYears} years`,
      auditLogAnonymize: `${auditLogsAnonymizeYears} years`,
      dryRun: this.config.dryRun
    });
  }

  /**
   * Main retention job - runs all retention tasks
   */
  async runRetentionJob() {
    const jobId = `retention_job_${Date.now()}`;
    const startTime = Date.now();
    
    logger.info(`[RetentionService] Starting retention job ${jobId}`);
    
    const results = {
      jobId,
      startTime: new Date(startTime),
      visitorsArchived: 0,
      visitorsDeleted: 0,
      accessLogsArchived: 0,
      auditLogsArchived: 0,
      errors: [],
      duration: 0
    };

    try {
      // Step 1: Archive expired visitors
      results.visitorsArchived = await this.archiveExpiredVisitors();
      
      // Step 2: Delete old archived visitors
      results.visitorsDeleted = await this.deleteOldArchivedVisitors();
      
      // Step 3: Archive old access logs
      results.accessLogsArchived = await this.archiveOldAccessLogs();
      
      // Step 4: Archive old audit logs (if needed)
      results.auditLogsArchived = await this.archiveOldAuditLogs();
      
      results.duration = Date.now() - startTime;
      
      // Log job completion
      await this.logRetentionJob(results);
      
      logger.info(`[RetentionService] Completed retention job ${jobId}`, results);
      
      return results;
    } catch (error) {
      results.errors.push(error.message);
      results.duration = Date.now() - startTime;
      
      logger.error(`[RetentionService] Retention job ${jobId} failed`, error);
      
      // Still log the failed job
      await this.logRetentionJob(results);
      
      throw error;
    }
  }

  /**
   * Archive visitors whose valid_until date has passed + grace period
   */
  async archiveExpiredVisitors() {
    const client = await pool.connect();
    let archived = 0;
    
    try {
      await client.query('BEGIN');
      
      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.visitorGracePeriod);
      
      // Find expired visitors (batch processing)
      const findQuery = `
        SELECT id FROM visitors
        WHERE valid_until < $1
        AND status != 'archived'
        ORDER BY valid_until ASC
        LIMIT $2
      `;
      
      const expiredVisitors = await client.query(findQuery, [cutoffDate, this.config.batchSize]);
      
      if (expiredVisitors.rows.length === 0) {
        await client.query('COMMIT');
        logger.info('[RetentionService] No expired visitors to archive');
        return 0;
      }
      
      const visitorIds = expiredVisitors.rows.map(v => v.id);
      
      // Archive visitors (insert into archive table)
      const archiveQuery = `
        INSERT INTO visitors_archive 
        SELECT *, NOW() as archived_at, 'system' as archived_by, 
               'Expired visitor - retention policy' as archive_reason
        FROM visitors
        WHERE id = ANY($1)
      `;
      
      await client.query(archiveQuery, [visitorIds]);
      
      // Update status in main table
      const updateQuery = `
        UPDATE visitors
        SET status = 'archived',
            updated_at = NOW()
        WHERE id = ANY($1)
      `;
      
      const result = await client.query(updateQuery, [visitorIds]);
      archived = result.rowCount;
      
      await client.query('COMMIT');
      
      logger.info(`[RetentionService] Archived ${archived} expired visitors`);
      
      return archived;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('[RetentionService] Error archiving visitors', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete archived visitors that have exceeded retention period
   * Implements "right to erasure" (GDPR Article 17)
   */
  async deleteOldArchivedVisitors() {
    const client = await pool.connect();
    let deleted = 0;
    
    try {
      await client.query('BEGIN');
      
      // Calculate deletion cutoff
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.archivedVisitorRetention);
      
      // Delete from archive (anonymize sensitive data instead of full delete)
      const anonymizeQuery = `
        UPDATE visitors_archive
        SET 
          name = 'REDACTED',
          email = 'redacted@privacy.local',
          phone = 'REDACTED',
          id_number = 'REDACTED',
          id_number_encrypted = NULL,
          vehicle_plate = 'REDACTED',
          notes = 'Data anonymized per retention policy'
        WHERE archived_at < $1
        AND name != 'REDACTED'
        RETURNING id
      `;
      
      const result = await client.query(anonymizeQuery, [cutoffDate]);
      deleted = result.rowCount;
      
      // Also delete from main table if still there
      const deleteMainQuery = `
        DELETE FROM visitors
        WHERE status = 'archived'
        AND updated_at < $1
      `;
      
      await client.query(deleteMainQuery, [cutoffDate]);
      
      await client.query('COMMIT');
      
      logger.info(`[RetentionService] Anonymized ${deleted} old archived visitors`);
      
      return deleted;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('[RetentionService] Error deleting archived visitors', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Archive old access logs
   */
  async archiveOldAccessLogs() {
    const client = await pool.connect();
    let archived = 0;
    
    try {
      await client.query('BEGIN');
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.accessLogRetention);
      
      // Archive old access logs
      const archiveQuery = `
        WITH old_logs AS (
          SELECT * FROM access_logs
          WHERE created_at < $1
          ORDER BY created_at ASC
          LIMIT $2
        )
        INSERT INTO access_logs_archive
        SELECT *, NOW() as archived_at
        FROM old_logs
        RETURNING id
      `;
      
      const result = await client.query(archiveQuery, [cutoffDate, this.config.batchSize]);
      archived = result.rowCount;
      
      if (archived > 0) {
        // Delete from main table
        const deleteQuery = `
          DELETE FROM access_logs
          WHERE id = ANY($1)
        `;
        
        const archivedIds = result.rows.map(r => r.id);
        await client.query(deleteQuery, [archivedIds]);
      }
      
      await client.query('COMMIT');
      
      logger.info(`[RetentionService] Archived ${archived} access logs`);
      
      return archived;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('[RetentionService] Error archiving access logs', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Archive old audit logs (7 year retention)
   */
  async archiveOldAuditLogs() {
    const client = await pool.connect();
    let archived = 0;
    
    try {
      await client.query('BEGIN');
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.auditLogRetention);
      
      // Archive very old audit logs
      const archiveQuery = `
        WITH old_logs AS (
          SELECT * FROM audit_logs
          WHERE created_at < $1
          ORDER BY created_at ASC
          LIMIT $2
        )
        INSERT INTO audit_logs_archive
        SELECT *, NOW() as archived_at
        FROM old_logs
        RETURNING id
      `;
      
      const result = await client.query(archiveQuery, [cutoffDate, this.config.batchSize]);
      archived = result.rowCount;
      
      if (archived > 0) {
        const deleteQuery = `
          DELETE FROM audit_logs
          WHERE id = ANY($1)
        `;
        
        const archivedIds = result.rows.map(r => r.id);
        await client.query(deleteQuery, [archivedIds]);
      }
      
      await client.query('COMMIT');
      
      logger.info(`[RetentionService] Archived ${archived} audit logs`);
      
      return archived;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('[RetentionService] Error archiving audit logs', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Log retention job results to audit_logs
   */
  async logRetentionJob(results) {
    try {
      const query = `
        INSERT INTO audit_logs (
          action,
          entity_type,
          entity_id,
          changes,
          user_id,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `;
      
      await pool.query(query, [
        'data_retention_job',
        'system',
        results.jobId,
        JSON.stringify(results),
        null // System job
      ]);
    } catch (error) {
      logger.error('[RetentionService] Error logging retention job', error);
      // Don't throw - logging failure shouldn't fail the job
    }
  }

  /**
   * Get retention statistics
   */
  async getRetentionStats() {
    try {
      const stats = {};
      
      // Count visitors by status
      const visitorsQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE status = 'active') as active_count,
          COUNT(*) FILTER (WHERE status = 'archived') as archived_count,
          COUNT(*) FILTER (WHERE valid_until < NOW()) as expired_count
        FROM visitors
      `;
      
      const visitorsResult = await pool.query(visitorsQuery);
      stats.visitors = visitorsResult.rows[0];
      
      // Count archived records
      const archiveQuery = `
        SELECT 
          (SELECT COUNT(*) FROM visitors_archive) as visitors_archived,
          (SELECT COUNT(*) FROM access_logs_archive) as access_logs_archived,
          (SELECT COUNT(*) FROM audit_logs_archive) as audit_logs_archived
      `;
      
      const archiveResult = await pool.query(archiveQuery);
      stats.archived = archiveResult.rows[0];
      
      // Get last retention job
      const lastJobQuery = `
        SELECT changes, created_at
        FROM audit_logs
        WHERE action = 'data_retention_job'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const lastJobResult = await pool.query(lastJobQuery);
      stats.lastJob = lastJobResult.rows[0] || null;
      
      return stats;
    } catch (error) {
      logger.error('[RetentionService] Error getting retention stats', error);
      throw error;
    }
  }
}

export default new RetentionService();
