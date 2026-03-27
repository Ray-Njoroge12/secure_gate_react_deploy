/**
 * Sync Service
 * Handles offline data synchronization with privacy-first approach
 * - Minimal data in offline packages
 * - Time-limited offline access
 * - Secure sync with conflict resolution
 */

import db from '../database/db.enhanced.js';
import * as crypto from 'crypto';
import logger from '../config/logger.js';

const pool = db;

class SyncService {
  /**
   * Generate offline data package for a user
   * Contains minimal data needed for offline functionality
   */
  async generateOfflinePackage(userId, userRole, estateId = null) {
    const packageId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const offlineData = {
      packageId,
      generatedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      userId,
      userRole,
      data: {}
    };

    try {
      if (userRole === 'guard') {
        // SECURITY: Pass estate_id for guard data filtering
        offlineData.data = await this.getGuardOfflineData(userId, estateId);
      } else if (userRole === 'resident') {
        offlineData.data = await this.getResidentOfflineData(userId);
      }

      // Log the sync package generation
      await this.logSyncEvent(userId, 'download', packageId);

      // Generate integrity hash
      offlineData.integrityHash = this.generateIntegrityHash(offlineData.data);

      return offlineData;
    } catch (error) {
      logger.error('Error generating offline package:', error);
      throw error;
    }
  }

  /**
   * Get minimal guard data for offline mode
   * SECURITY: Filters all data by guard's estate_id
   */
  async getGuardOfflineData(guardId, estateId) {
    // SECURITY: Require estate context
    if (!estateId) {
      logger.warn('[SyncService] Guard offline package requested without estate_id');
      return {
        expectedVisitors: [],
        activeEmergencies: [],
        pendingDeliveries: [],
        lastSync: new Date().toISOString(),
        error: 'Estate context required'
      };
    }

    // Get today's expected visitors (minimal info) - filtered by estate
    const visitorsQuery = `
      SELECT 
        v.id,
        v.visitor_name,
        v.expected_arrival,
        v.status,
        u.first_name as resident_first_name,
        u.last_name as resident_last_name,
        u.unit_number
      FROM visitors v
      JOIN users u ON v.resident_id = u.id
      WHERE v.expected_arrival >= CURRENT_DATE
        AND v.expected_arrival < CURRENT_DATE + INTERVAL '2 days'
        AND v.status IN ('pending', 'approved')
        AND v.estate_id = $1
      ORDER BY v.expected_arrival
      LIMIT 100
    `;

    // Get active emergency status - filtered by estate
    const emergencyQuery = `
      SELECT id, type, status, created_at
      FROM emergency_incidents
      WHERE status = 'active'
        AND created_at >= NOW() - INTERVAL '24 hours'
        AND estate_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // Get pending deliveries - filtered by estate
    const deliveriesQuery = `
      SELECT 
        d.id,
        d.carrier,
        d.tracking_number_hash,
        d.status,
        u.first_name,
        u.last_name,
        u.unit_number
      FROM deliveries d
      JOIN users u ON d.resident_id = u.id
      WHERE d.status = 'pending'
        AND d.estate_id = $1
      ORDER BY d.created_at DESC
      LIMIT 50
    `;

    const [visitors, emergencies, deliveries] = await Promise.all([
      pool.query(visitorsQuery, [estateId]),
      pool.query(emergencyQuery, [estateId]),
      pool.query(deliveriesQuery, [estateId])
    ]);

    return {
      expectedVisitors: visitors.rows,
      activeEmergencies: emergencies.rows,
      pendingDeliveries: deliveries.rows,
      lastSync: new Date().toISOString()
    };
  }

  /**
   * Get minimal resident data for offline mode
   */
  async getResidentOfflineData(residentId) {
    // Get resident's pending visitors
    const visitorsQuery = `
      SELECT 
        id,
        visitor_name,
        expected_arrival,
        status,
        purpose
      FROM visitors
      WHERE resident_id = $1
        AND expected_arrival >= CURRENT_DATE
        AND status IN ('pending', 'approved')
      ORDER BY expected_arrival
      LIMIT 20
    `;

    // Get resident's pending deliveries
    const deliveriesQuery = `
      SELECT 
        id,
        carrier,
        status,
        created_at
      FROM deliveries
      WHERE resident_id = $1
        AND status IN ('pending', 'in_transit')
      ORDER BY created_at DESC
      LIMIT 20
    `;

    // Get resident's auto-approval rules (for reference)
    const rulesQuery = `
      SELECT 
        id,
        rule_name,
        visitor_pattern,
        is_active
      FROM auto_approval_rules
      WHERE resident_id = $1
        AND is_active = true
      LIMIT 10
    `;

    const [visitors, deliveries, rules] = await Promise.all([
      pool.query(visitorsQuery, [residentId]),
      pool.query(deliveriesQuery, [residentId]),
      pool.query(rulesQuery, [residentId])
    ]);

    return {
      pendingVisitors: visitors.rows,
      pendingDeliveries: deliveries.rows,
      autoApprovalRules: rules.rows,
      lastSync: new Date().toISOString()
    };
  }

  /**
   * Process offline changes uploaded from client
   */
  async processOfflineChanges(userId, userRole, changes, packageId, estateId = null) {
    const results = {
      processed: 0,
      conflicts: [],
      errors: [],
      duplicates: []
    };

    try {
      // Verify package integrity
      if (!await this.verifyPackageValidity(packageId, userId)) {
        throw new Error('Invalid or expired sync package');
      }

      for (const change of changes) {
        try {
          if (change.idempotencyKey) {
            const isDuplicate = await this.isDuplicateChange(userId, change.idempotencyKey);
            if (isDuplicate) {
              results.duplicates.push({
                change,
                reason: 'idempotency_key_already_processed'
              });
              continue;
            }
          }

          const result = await this.processSingleChange(userId, userRole, change, estateId);
          if (result.conflict) {
            results.conflicts.push(result);
          } else {
            results.processed++;
            if (change.idempotencyKey) {
              await this.logProcessedChange(userId, change);
            }
          }
        } catch (error) {
          results.errors.push({
            change,
            error: error.message
          });
        }
      }

      // Log the sync upload
      await this.logSyncEvent(userId, 'upload', packageId, {
        processed: results.processed,
        conflicts: results.conflicts.length,
        errors: results.errors.length,
        duplicates: results.duplicates.length
      });

      return results;
    } catch (error) {
      logger.error('Error processing offline changes:', error);
      throw error;
    }
  }

  async isDuplicateChange(userId, idempotencyKey) {
    try {
      const result = await pool.query(
        `SELECT 1 FROM sync_change_log WHERE user_id = $1 AND idempotency_key = $2`,
        [userId, idempotencyKey]
      );
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  }

  async logProcessedChange(userId, change) {
    try {
      await pool.query(
        `INSERT INTO sync_change_log (user_id, idempotency_key, entity, action, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id, idempotency_key) DO NOTHING`,
        [userId, change.idempotencyKey, change.entity, change.action]
      );
    } catch (error) {
      logger.warn('Failed to log sync change idempotency:', error);
    }
  }

  /**
   * Process a single offline change with conflict detection
   */
  async processSingleChange(userId, userRole, change, estateId = null) {
    const { entity, action, data, timestamp } = change;

    switch (entity) {
      case 'visitor':
        return await this.processVisitorChange(userId, userRole, action, data, timestamp, estateId);
      case 'delivery':
        return await this.processDeliveryChange(userId, userRole, action, data, timestamp, estateId);
      default:
        throw new Error(`Unknown entity type: ${entity}`);
    }
  }

  /**
   * Process visitor-related offline changes
   */
  async processVisitorChange(userId, userRole, action, data, timestamp, estateId = null) {
    // Check for conflicts by comparing timestamps
    const currentQuery = `
      SELECT updated_at, estate_id FROM visitors WHERE id = $1
    `;
    const current = await pool.query(currentQuery, [data.id]);

    if (current.rows.length > 0) {
      // SECURITY: Verify estate context
      if (estateId && current.rows[0].estate_id !== estateId) {
        throw new Error('Visitor belongs to different estate');
      }
      const serverTimestamp = new Date(current.rows[0].updated_at);
      const clientTimestamp = new Date(timestamp);

      if (serverTimestamp > clientTimestamp) {
        return {
          conflict: true,
          entity: 'visitor',
          id: data.id,
          serverValue: current.rows[0],
          clientValue: data
        };
      }
    }

    // Apply the change based on action and role
    if (action === 'check_in' && userRole === 'guard') {
      const query = `UPDATE visitors SET status = 'checked_in', check_in_time = $1, updated_at = NOW() WHERE id = $2 ${estateId ? 'AND estate_id = $3' : ''}`;
      const params = estateId ? [data.checkInTime, data.id, estateId] : [data.checkInTime, data.id];
      await pool.query(query, params);
    } else if (action === 'check_out' && userRole === 'guard') {
      const query = `UPDATE visitors SET status = 'checked_out', check_out_time = $1, updated_at = NOW() WHERE id = $2 ${estateId ? 'AND estate_id = $3' : ''}`;
      const params = estateId ? [data.checkOutTime, data.id, estateId] : [data.checkOutTime, data.id];
      await pool.query(query, params);
    } else if (action === 'approve' && userRole === 'resident') {
      await pool.query(
        `UPDATE visitors SET status = 'approved', updated_at = NOW() WHERE id = $1 AND resident_id = $2`,
        [data.id, userId]
      );
    }

    return { processed: true };
  }

  /**
   * Process delivery-related offline changes
   */
  async processDeliveryChange(userId, userRole, action, data, timestamp, estateId = null) {
    if (action === 'receive' && userRole === 'guard') {
      const query = `UPDATE deliveries SET status = 'received', received_at = $1, received_by = $2, updated_at = NOW() WHERE id = $3 ${estateId ? 'AND estate_id = $4' : ''}`;
      const params = estateId ? [data.receivedAt, userId, data.id, estateId] : [data.receivedAt, userId, data.id];
      await pool.query(query, params);
    } else if (action === 'pickup' && userRole === 'resident') {
      await pool.query(
        `UPDATE deliveries SET status = 'picked_up', picked_up_at = NOW(), updated_at = NOW() WHERE id = $1 AND resident_id = $2`,
        [data.id, userId]
      );
    }

    return { processed: true };
  }

  /**
   * Log sync events for audit trail
   */
  async logSyncEvent(userId, eventType, packageId, metadata = {}) {
    try {
      await pool.query(
        `INSERT INTO sync_logs (user_id, event_type, package_id, metadata, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, eventType, packageId, JSON.stringify(metadata)]
      );
    } catch (error) {
      // Log table might not exist yet, just log to console
      logger.debug('Sync event:', { userId, eventType, packageId, metadata });
    }
  }

  /**
   * Verify if a sync package is still valid
   */
  async verifyPackageValidity(packageId, userId) {
    try {
      const result = await pool.query(
        `SELECT * FROM sync_logs 
         WHERE package_id = $1 AND user_id = $2 AND event_type = 'download'
         AND created_at >= NOW() - INTERVAL '24 hours'`,
        [packageId, userId]
      );
      return result.rows.length > 0;
    } catch (error) {
      // If table doesn't exist, allow for now
      return true;
    }
  }

  /**
   * Generate integrity hash for offline data
   */
  generateIntegrityHash(data) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * Purge expired sync packages and logs
   */
  async purgeExpiredSyncData() {
    try {
      const result = await pool.query(
        `DELETE FROM sync_logs WHERE created_at < NOW() - INTERVAL '7 days'`
      );
      logger.info(`Purged ${result.rowCount} expired sync logs`);
      return result.rowCount;
    } catch (error) {
      logger.error('Error purging sync data:', error);
      return 0;
    }
  }
}

const syncService = new SyncService();
export default syncService;
