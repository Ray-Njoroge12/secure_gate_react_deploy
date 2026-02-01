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

import { dbManager } from '../database/db.enhanced.js';
import logger from '../config/logger.js';

class RetentionService {
  constructor() {
    // Configurable retention periods (in days)
    // Defaults based on approved Data Retention Policy (Cost-Effective)

    // Visitors: 90 days (approx 3 months)
    const visitorArchiveDays = parseInt(process.env.DATA_RETENTION_VISITOR_DAYS || '90', 10);
    // Access Logs (Check-in/out): 180 days (approx 6 months)
    const accessLogArchiveDays = parseInt(process.env.DATA_RETENTION_ACCESS_LOG_DAYS || '180', 10);
    // Audit Logs: 365 days (1 year)
    const auditLogArchiveDays = parseInt(process.env.DATA_RETENTION_AUDIT_LOG_DAYS || '365', 10);

    // Deletion (Purge) Periods - Time after archiving to permanently delete
    const visitorDeletionDays = parseInt(process.env.DATA_DELETION_VISITOR_DAYS || '1095', 10); // 3 years
    const accessLogDeletionDays = parseInt(process.env.DATA_DELETION_ACCESS_LOG_DAYS || '730', 10); // 2 years
    const auditLogDeletionDays = parseInt(process.env.DATA_DELETION_AUDIT_LOG_DAYS || '1825', 10); // 5 years

    // Anonymization
    const auditLogAnonymizeDays = parseInt(process.env.DATA_ANONYMIZE_AUDIT_LOG_DAYS || '1095', 10); // 3 years

    this.config = {
      // Archive periods
      visitorArchiveDays,
      accessLogArchiveDays,
      auditLogArchiveDays,

      // Deletion periods
      visitorDeletionDays,
      accessLogDeletionDays,
      auditLogDeletionDays,

      // Anonymization period
      auditLogAnonymizeDays,

      // Legacy compatibility
      visitorGracePeriod: parseInt(process.env.VISITOR_GRACE_PERIOD_DAYS || '30', 10),
      archivedVisitorRetention: visitorDeletionDays, // Alias for consistency with existing methods
      accessLogRetention: accessLogArchiveDays,      // Alias
      auditLogRetention: auditLogArchiveDays,        // Alias

      batchSize: parseInt(process.env.RETENTION_BATCH_SIZE || '100', 10),
      dryRun: process.env.DATA_RETENTION_DRY_RUN === 'true'
    };

    logger.info('[RetentionService] Initialized with config:', {
      visitorArchive: `${visitorArchiveDays} days`,
      visitorDeletion: `${visitorDeletionDays} days`,
      accessLogArchive: `${accessLogArchiveDays} days`,
      accessLogDeletion: `${accessLogDeletionDays} days`,
      auditLogArchive: `${auditLogArchiveDays} days`,
      auditLogAnonymize: `${auditLogAnonymizeDays} days`,
      dryRun: this.config.dryRun
    });

    this.tableColumnsCache = new Map();
    this.tableColumnTypesCache = new Map();
    this.accessLogTimestampExpr = null;
    this.auditLogTimestampExpr = null;
  }

  async getDbClient() {
    if (!dbManager.pool) {
      await dbManager.initializeAsync();
    }
    if (!dbManager.pool) {
      throw new Error('Database connection not initialized');
    }
    return dbManager.pool.connect();
  }

  async getTableColumns(tableName) {
    if (this.tableColumnsCache.has(tableName)) {
      return this.tableColumnsCache.get(tableName);
    }

    const result = await dbManager.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [tableName]
    );
    const columns = result.rows.map((row) => row.column_name);
    this.tableColumnsCache.set(tableName, columns);
    return columns;
  }

  async getTableColumnTypes(tableName) {
    if (this.tableColumnTypesCache.has(tableName)) {
      return this.tableColumnTypesCache.get(tableName);
    }

    const result = await dbManager.query(
      `SELECT column_name, data_type, udt_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [tableName]
    );

    const columnTypes = new Map();
    for (const row of result.rows) {
      const normalizedType = row.data_type === 'USER-DEFINED' ? row.udt_name : row.data_type;
      columnTypes.set(row.column_name, normalizedType);
    }

    this.tableColumnTypesCache.set(tableName, columnTypes);
    return columnTypes;
  }

  isJsonType(dataType) {
    return dataType === 'json' || dataType === 'jsonb';
  }

  async columnExists(tableName, columnName) {
    const columns = await this.getTableColumns(tableName);
    return columns.includes(columnName);
  }

  async getSharedColumns(sourceTable, targetTable) {
    const [sourceColumns, targetColumns] = await Promise.all([
      this.getTableColumns(sourceTable),
      this.getTableColumns(targetTable)
    ]);
    const targetSet = new Set(targetColumns);
    return sourceColumns.filter((column) => targetSet.has(column));
  }

  async getAccessLogTimestampExpression() {
    if (this.accessLogTimestampExpr) {
      return this.accessLogTimestampExpr;
    }

    const [createdAtExists, logTimeExists] = await Promise.all([
      this.columnExists('access_logs', 'created_at'),
      this.columnExists('access_logs', 'log_time')
    ]);

    if (createdAtExists && logTimeExists) {
      this.accessLogTimestampExpr = 'COALESCE(created_at, log_time)';
    } else if (createdAtExists) {
      this.accessLogTimestampExpr = 'created_at';
    } else if (logTimeExists) {
      this.accessLogTimestampExpr = 'log_time';
    } else {
      this.accessLogTimestampExpr = 'NOW()';
    }

    return this.accessLogTimestampExpr;
  }

  async getAuditLogTimestampExpression() {
    if (this.auditLogTimestampExpr) {
      return this.auditLogTimestampExpr;
    }

    const [createdAtExists, timestampExists] = await Promise.all([
      this.columnExists('audit_logs', 'created_at'),
      this.columnExists('audit_logs', 'timestamp')
    ]);

    if (createdAtExists && timestampExists) {
      this.auditLogTimestampExpr = 'COALESCE(created_at, timestamp)';
    } else if (createdAtExists) {
      this.auditLogTimestampExpr = 'created_at';
    } else if (timestampExists) {
      this.auditLogTimestampExpr = 'timestamp';
    } else {
      this.auditLogTimestampExpr = 'NOW()';
    }

    return this.auditLogTimestampExpr;
  }

  getVisitorExpirySql() {
    return `COALESCE(
      check_out_time,
      check_in_time,
      (date_of_visit::timestamp + COALESCE(time_of_visit, '00:00'::time)),
      created_at
    )`;
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
      dryRun: this.config.dryRun,
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
    if (this.config.dryRun) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.visitorGracePeriod);

      const previewQuery = `
        SELECT COUNT(*) AS count FROM (
          SELECT id FROM visitors
          WHERE ${this.getVisitorExpirySql()} < $1
          AND status != 'archived'
          ORDER BY ${this.getVisitorExpirySql()} ASC
          LIMIT $2
        ) AS preview
      `;

      const result = await dbManager.query(previewQuery, [cutoffDate, this.config.batchSize]);
      const count = Number(result.rows[0]?.count || 0);
      logger.info(`[RetentionService] Dry-run: would archive ${count} expired visitors`);
      return count;
    }

    const client = await this.getDbClient();
    let archived = 0;

    try {
      await client.query('BEGIN');

      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.visitorGracePeriod);

      // Find expired visitors (batch processing)
      const findQuery = `
        SELECT id FROM visitors
        WHERE ${this.getVisitorExpirySql()} < $1
        AND status != 'archived'
        ORDER BY ${this.getVisitorExpirySql()} ASC
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
    if (this.config.dryRun) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.archivedVisitorRetention);

      const previewQuery = `
        SELECT COUNT(*) AS count
        FROM visitors_archive
        WHERE archived_at < $1
        AND name != 'REDACTED'
      `;

      const result = await dbManager.query(previewQuery, [cutoffDate]);
      const count = Number(result.rows[0]?.count || 0);
      logger.info(`[RetentionService] Dry-run: would anonymize ${count} archived visitors`);
      return count;
    }

    const client = await this.getDbClient();
    let deleted = 0;

    try {
      await client.query('BEGIN');

      // Calculate deletion cutoff
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.archivedVisitorRetention);

      const redactions = [
        { column: 'name', value: 'REDACTED' },
        { column: 'email', value: 'redacted@privacy.local' },
        { column: 'phone', value: 'REDACTED' },
        { column: 'id_number', value: 'REDACTED' },
        { column: 'id_number_encrypted', value: null },
        { column: 'vehicle_plate', value: 'REDACTED' },
        { column: 'name_encrypted', value: null },
        { column: 'phone_encrypted', value: null },
        { column: 'email_encrypted', value: null },
        { column: 'vehicle_plate_encrypted', value: null },
        { column: 'notes', value: 'Data anonymized per retention policy' },
        { column: 'additional_info', value: 'REDACTED' },
        { column: 'consent_data', value: null }
      ];

      const [archiveColumns, archiveColumnTypes] = await Promise.all([
        this.getTableColumns('visitors_archive'),
        this.getTableColumnTypes('visitors_archive')
      ]);
      const setClauses = [];
      const values = [cutoffDate];
      let paramIndex = 2;

      for (const redaction of redactions) {
        if (archiveColumns.includes(redaction.column)) {
          const columnType = archiveColumnTypes.get(redaction.column);
          const value = this.isJsonType(columnType) && redaction.value !== null
            ? { redacted: true }
            : redaction.value;
          setClauses.push(`${redaction.column} = $${paramIndex++}`);
          values.push(value);
        }
      }

      if (setClauses.length === 0) {
        await client.query('COMMIT');
        logger.warn('[RetentionService] No anonymization fields available for visitors_archive');
        return 0;
      }

      const anonymizeQuery = `
        UPDATE visitors_archive
        SET ${setClauses.join(', ')}
        WHERE archived_at < $1
        AND name != 'REDACTED'
        RETURNING id
      `;

      const result = await client.query(anonymizeQuery, values);
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
    const timestampExpression = await this.getAccessLogTimestampExpression();

    if (this.config.dryRun) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.accessLogRetention);

      const previewQuery = `
        SELECT COUNT(*) AS count FROM (
          SELECT id FROM access_logs
          WHERE ${timestampExpression} < $1
          ORDER BY ${timestampExpression} ASC
          LIMIT $2
        ) AS preview
      `;

      const result = await dbManager.query(previewQuery, [cutoffDate, this.config.batchSize]);
      const count = Number(result.rows[0]?.count || 0);
      logger.info(`[RetentionService] Dry-run: would archive ${count} access logs`);
      return count;
    }

    const client = await this.getDbClient();
    let archived = 0;

    try {
      await client.query('BEGIN');

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.accessLogRetention);

      const sharedColumns = await this.getSharedColumns('access_logs', 'access_logs_archive');
      if (sharedColumns.length === 0) {
        await client.query('COMMIT');
        logger.warn('[RetentionService] access_logs_archive schema mismatch; skipping archive');
        return 0;
      }

      const archiveColumns = sharedColumns.map((column) => `"${column}"`).join(', ');
      const hasArchivedAt = await this.columnExists('access_logs_archive', 'archived_at');

      // Archive old access logs
      const archiveQuery = `
        WITH old_logs AS (
          SELECT ${archiveColumns} FROM access_logs
          WHERE ${timestampExpression} < $1
          ORDER BY ${timestampExpression} ASC
          LIMIT $2
        )
        INSERT INTO access_logs_archive (${archiveColumns}${hasArchivedAt ? ', archived_at' : ''})
        SELECT ${archiveColumns}${hasArchivedAt ? ', NOW() as archived_at' : ''}
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
    const timestampExpression = await this.getAuditLogTimestampExpression();

    if (this.config.dryRun) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.auditLogRetention);

      const previewQuery = `
        SELECT COUNT(*) AS count FROM (
          SELECT id FROM audit_logs
          WHERE ${timestampExpression} < $1
          ORDER BY ${timestampExpression} ASC
          LIMIT $2
        ) AS preview
      `;

      const result = await dbManager.query(previewQuery, [cutoffDate, this.config.batchSize]);
      const count = Number(result.rows[0]?.count || 0);
      logger.info(`[RetentionService] Dry-run: would archive ${count} audit logs`);
      return count;
    }

    const client = await this.getDbClient();
    let archived = 0;

    try {
      await client.query('BEGIN');

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.auditLogRetention);

      const sharedColumns = await this.getSharedColumns('audit_logs', 'audit_logs_archive');
      if (sharedColumns.length === 0) {
        await client.query('COMMIT');
        logger.warn('[RetentionService] audit_logs_archive schema mismatch; skipping archive');
        return 0;
      }

      const archiveColumns = sharedColumns.map((column) => `"${column}"`).join(', ');
      const hasArchivedAt = await this.columnExists('audit_logs_archive', 'archived_at');

      // Archive very old audit logs
      const archiveQuery = `
        WITH old_logs AS (
          SELECT ${archiveColumns} FROM audit_logs
          WHERE ${timestampExpression} < $1
          ORDER BY ${timestampExpression} ASC
          LIMIT $2
        )
        INSERT INTO audit_logs_archive (${archiveColumns}${hasArchivedAt ? ', archived_at' : ''})
        SELECT ${archiveColumns}${hasArchivedAt ? ', NOW() as archived_at' : ''}
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
          details,
          user_id,
          created_at,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      `;

      await dbManager.query(query, [
        'data_retention_job',
        'system',
        results.jobId,
        `Retention job ${results.jobId} completed`,
        null, // System job
        JSON.stringify(results)
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
          COUNT(*) FILTER (WHERE ${this.getVisitorExpirySql()} < NOW()) as expired_count
        FROM visitors
      `;

      const visitorsResult = await dbManager.query(visitorsQuery);
      stats.visitors = visitorsResult.rows[0];

      // Count archived records
      const archiveQuery = `
        SELECT 
          (SELECT COUNT(*) FROM visitors_archive) as visitors_archived,
          (SELECT COUNT(*) FROM access_logs_archive) as access_logs_archived,
          (SELECT COUNT(*) FROM audit_logs_archive) as audit_logs_archived
      `;

      const archiveResult = await dbManager.query(archiveQuery);
      stats.archived = archiveResult.rows[0];

      // Get last retention job
      const lastJobQuery = `
        SELECT changes, created_at
        FROM audit_logs
        WHERE action = 'data_retention_job'
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const lastJobResult = await dbManager.query(lastJobQuery);
      stats.lastJob = lastJobResult.rows[0] || null;

      return stats;
    } catch (error) {
      logger.error('[RetentionService] Error getting retention stats', error);
      throw error;
    }
  }
  /**
   * Get retention settings (current config)
   */
  async getRetentionSettings() {
    // In a real implementation, these might be stored in a 'system_settings' table
    // For now, we return the in-memory config initialized from env vars
    return {
      visitorArchiveDays: this.config.visitorArchiveDays,
      accessLogArchiveDays: this.config.accessLogArchiveDays,
      auditLogArchiveDays: this.config.auditLogArchiveDays,
      visitorDeletionDays: this.config.visitorDeletionDays,
      accessLogDeletionDays: this.config.accessLogDeletionDays,
      auditLogDeletionDays: this.config.auditLogDeletionDays,
      auditLogAnonymizeDays: this.config.auditLogAnonymizeDays,
      dryRun: this.config.dryRun
    };
  }

  /**
   * Update retention setting
   * Note: Since config is currently env-var based, this persists to a DB table overriding envs
   * or simply updates in-memory for the runtime duration (simulated for now).
   */
  async updateRetentionSetting(id, type, duration) {
    const validTypes = [
      'visitorArchiveDays', 'accessLogArchiveDays', 'auditLogArchiveDays',
      'visitorDeletionDays', 'accessLogDeletionDays', 'auditLogDeletionDays'
    ];

    if (!validTypes.includes(type)) {
      throw new Error(`Invalid retention setting type: ${type}`);
    }

    const value = parseInt(duration, 10);
    if (isNaN(value) || value < 1) {
      throw new Error('Duration must be a positive integer');
    }

    // Update in-memory
    this.config[type] = value;
    logger.info(`[RetentionService] Updated setting ${type} to ${value} days`);

    // TODO: Persist to 'system_settings' table if persistent overrides are needed

    return { [type]: value };
  }
}

export default new RetentionService();
