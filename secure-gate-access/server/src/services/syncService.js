/**
 * Sync Service
 * Handles offline data synchronization with privacy-first approach
 * - Minimal data in offline packages
 * - Time-limited offline access
 * - Secure sync with conflict resolution
 */

import db from '../database/db.enhanced.js';
import crypto from 'crypto';

const pool = db;

class SyncService {
  /**
   * Generate offline data package for a user
   * Contains minimal data needed for offline functionality
   */
  async generateOfflinePackage(userId, userRole) {
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
        offlineData.data = await this.getGuardOfflineData(userId);
      } else if (userRole === 'resident') {
        offlineData.data = await this.getResidentOfflineData(userId);
      }

      // Log the sync package generation
      await this.logSyncEvent(userId, 'download', packageId);

      // Generate integrity hash
      offlineData.integrityHash = this.generateIntegrityHash(offlineData.data);

      return offlineData;
    } catch (error) {
      console.error('Error generating offline package:', error);
      throw error;
    }
  }

  /**
   * Get minimal guard data for offline mode
   */
  async getGuardOfflineData(guardId) {
    // Get today's expected visitors (minimal info)
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
      ORDER BY v.expected_arrival
      LIMIT 100
    `;

    // Get active emergency status
    const emergencyQuery = `
      SELECT id, type, status, created_at
      FROM emergency_incidents
      WHERE status = 'active'
        AND created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // Get pending deliveries
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
      ORDER BY d.created_at DESC
      LIMIT 50
    `;

    const [visitors, emergencies, deliveries] = await Promise.all([
      pool.query(visitorsQuery),
      pool.query(emergencyQuery),
      pool.query(deliveriesQuery)
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
  async processOfflineChanges(userId, userRole, changes, packageId) {
    const results = {
      processed: 0,
      conflicts: [],
      errors: []
    };

    try {
      // Verify package integrity
      if (!await this.verifyPackageValidity(packageId, userId)) {
        throw new Error('Invalid or expired sync package');
      }

      for (const change of changes) {
        try {
          const result = await this.processSingleChange(userId, userRole, change);
          if (result.conflict) {
            results.conflicts.push(result);
          } else {
            results.processed++;
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
        errors: results.errors.length
      });

      return results;
    } catch (error) {
      console.error('Error processing offline changes:', error);
      throw error;
    }
  }

  /**
   * Process a single offline change with conflict detection
   */
  async processSingleChange(userId, userRole, change) {
    const { entity, action, data, timestamp } = change;

    switch (entity) {
      case 'visitor':
        return await this.processVisitorChange(userId, userRole, action, data, timestamp);
      case 'delivery':
        return await this.processDeliveryChange(userId, userRole, action, data, timestamp);
      default:
        throw new Error(`Unknown entity type: ${entity}`);
    }
  }

  /**
   * Process visitor-related offline changes
   */
  async processVisitorChange(userId, userRole, action, data, timestamp) {
    // Check for conflicts by comparing timestamps
    const currentQuery = `
      SELECT updated_at FROM visitors WHERE id = $1
    `;
    const current = await pool.query(currentQuery, [data.id]);

    if (current.rows.length > 0) {
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
      await pool.query(
        `UPDATE visitors SET status = 'checked_in', check_in_time = $1, updated_at = NOW() WHERE id = $2`,
        [data.checkInTime, data.id]
      );
    } else if (action === 'check_out' && userRole === 'guard') {
      await pool.query(
        `UPDATE visitors SET status = 'checked_out', check_out_time = $1, updated_at = NOW() WHERE id = $2`,
        [data.checkOutTime, data.id]
      );
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
  async processDeliveryChange(userId, userRole, action, data, timestamp) {
    if (action === 'receive' && userRole === 'guard') {
      await pool.query(
        `UPDATE deliveries SET status = 'received', received_at = $1, received_by = $2, updated_at = NOW() WHERE id = $3`,
        [data.receivedAt, userId, data.id]
      );
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
      console.log('Sync event:', { userId, eventType, packageId, metadata });
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
      console.log(`Purged ${result.rowCount} expired sync logs`);
      return result.rowCount;
    } catch (error) {
      console.error('Error purging sync data:', error);
      return 0;
    }
  }
}

const syncService = new SyncService();
export default syncService;
