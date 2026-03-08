/**
 * Emergency Panic Button Service
 * Phase 1.1: Guard Panic Button Implementation
 * 
 * Privacy Features:
 * - GPS captured only at moment of activation (no continuous tracking)
 * - Location auto-anonymized after resolution + 90 days
 * - Guards can view their own panic history only
 * - Admins cannot use panic data for performance reviews (policy enforced)
 * 
 * @module services/emergencyService
 */

import { dbManager } from '../database/connection.js';
import loggingService from './loggingService.js';

class EmergencyService {
  constructor() {
    this.activeEmergencies = new Map(); // In-memory cache of active emergencies
  }

  /**
   * Trigger a panic button alert
   * Captures location, creates incident, broadcasts to all admins and guards
   * 
   * @param {number} guardId - ID of guard triggering the panic
   * @param {Object} locationData - GPS coordinates (optional)
   * @param {number} locationData.latitude
   * @param {number} locationData.longitude
   * @param {number} locationData.accuracy
   * @param {number} gateId - Optional gate assignment
   * @returns {Object} Created emergency incident
   */
  async triggerPanicButton(guardId, locationData = {}, gateId = null) {
    const client = await dbManager.pool.connect();

    try {
      await client.query('BEGIN');

      // Verify user exists and get their info
      const guardResult = await client.query(
        `SELECT id, username, email, phone, estate_id, role FROM users WHERE id = $1 AND role IN ('guard', 'resident')`,
        [guardId]
      );

      if (guardResult.rows.length === 0) {
        throw new Error('User not found or invalid role');
      }

      const guard = guardResult.rows[0];

      // Check for recent panic (cooldown: prevent spam - 5 minutes)
      const recentPanic = await client.query(
        `SELECT id FROM emergency_incidents 
         WHERE guard_id = $1 
         AND triggered_at > NOW() - INTERVAL '5 minutes'
         AND status != 'cancelled'`,
        [guardId]
      );

      if (recentPanic.rows.length > 0) {
        throw new Error('Panic button cooldown active. Please wait before triggering again.');
      }

      // Create emergency incident
      const insertResult = await client.query(
        `INSERT INTO emergency_incidents (
          guard_id, gate_id, latitude, longitude, location_accuracy, status, estate_id
        ) VALUES ($1, $2, $3, $4, $5, 'triggered', $6)
        RETURNING *`,
        [
          guardId,
          gateId,
          locationData.latitude || null,
          locationData.longitude || null,
          locationData.accuracy || null,
          guard.estate_id
        ]
      );

      const emergency = insertResult.rows[0];

      // Add to active emergencies cache
      this.activeEmergencies.set(emergency.id, {
        ...emergency,
        guardName: guard.username
      });

      // Get all admins and other guards to notify - filtered by estate
      // Note: estateId should be passed from guard's user record
      const recipientsResult = await client.query(
        `SELECT id, username, role, phone, email 
         FROM users 
         WHERE role IN ('admin', 'guard') 
         AND id != $1
         AND verified = true
         AND estate_id = $2`,
        [guardId, guard.estate_id]
      );

      const recipients = recipientsResult.rows;

      // Log alert sends (privacy: only log recipient IDs, not personal details)
      for (const recipient of recipients) {
        await client.query(
          `INSERT INTO emergency_alert_log (
            emergency_id, recipient_id, channel
          ) VALUES ($1, $2, $3)`,
          [emergency.id, recipient.id, 'in_app']
        );
      }

      await client.query('COMMIT');

      // Log for audit (privacy: minimal info logged)
      loggingService.logInfo('PANIC_BUTTON_TRIGGERED', {
        emergencyId: emergency.id,
        guardId: guardId,
        gateId: gateId,
        hasLocation: !!(locationData.latitude && locationData.longitude),
        recipientCount: recipients.length
      });

      return {
        emergency,
        guard: {
          id: guard.id,
          username: guard.username
        },
        recipients: recipients.map(r => ({
          id: r.id,
          role: r.role
        })),
        message: 'Emergency alert triggered successfully'
      };

    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          loggingService.logError('PANIC_BUTTON_ROLLBACK_FAILED', { guardId, error: rollbackError.message });
        }
      }
      loggingService.logError('PANIC_BUTTON_FAILED', error, { guardId });
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Acknowledge an emergency alert
   * Admin or security personnel acknowledges they are responding
   * 
   * @param {number} emergencyId - Emergency incident ID
   * @param {number} responderId - User ID acknowledging
   * @returns {Object} Updated emergency
   */
  async acknowledgeEmergency(emergencyId, responderId) {
    const client = await dbManager.pool.connect();

    try {
      // Verify responder is admin or guard and get their estate
      const responderResult = await client.query(
        `SELECT id, role, estate_id FROM users WHERE id = $1 AND role IN ('admin', 'guard')`,
        [responderId]
      );

      if (responderResult.rows.length === 0) {
        throw new Error('Only admins or guards can acknowledge emergencies');
      }

      // Update emergency status
      const updateResult = await client.query(
        `UPDATE emergency_incidents 
         SET status = 'acknowledged', 
             acknowledged_at = NOW(), 
             acknowledged_by = $1
         WHERE id = $2 
         AND status = 'triggered'
         AND estate_id = $3
         RETURNING *`,
        [responderId, emergencyId, responderResult.rows[0].estate_id]
      );

      if (updateResult.rows.length === 0) {
        throw new Error('Emergency not found or already acknowledged');
      }

      const emergency = updateResult.rows[0];

      // Update alert log
      await client.query(
        `UPDATE emergency_alert_log 
         SET acknowledged_at = NOW() 
         WHERE emergency_id = $1 AND recipient_id = $2`,
        [emergencyId, responderId]
      );

      // Update cache
      if (this.activeEmergencies.has(emergencyId)) {
        this.activeEmergencies.set(emergencyId, {
          ...this.activeEmergencies.get(emergencyId),
          status: 'acknowledged',
          acknowledged_by: responderId
        });
      }

      loggingService.logInfo('EMERGENCY_ACKNOWLEDGED', {
        emergencyId,
        responderId,
        responderRole: responderResult.rows[0].role
      });

      return emergency;

    } finally {
      client.release();
    }
  }

  /**
   * Resolve an emergency
   * Mark as resolved with optional notes
   * 
   * @param {number} emergencyId - Emergency incident ID
   * @param {number} resolverId - User ID resolving
   * @param {Object} resolution - Resolution details
   * @param {string} resolution.notes - Resolution notes
   * @param {boolean} resolution.isFalseAlarm - Was it a false alarm?
   * @param {string} resolution.falseAlarmReason - Reason if false alarm
   * @returns {Object} Updated emergency
   */
  async resolveEmergency(emergencyId, resolverId, resolution = {}) {
    const client = await dbManager.pool.connect();

    try {
      // Verify resolver is admin and get their estate
      const resolverResult = await client.query(
        `SELECT id, role, estate_id FROM users WHERE id = $1 AND role = 'admin'`,
        [resolverId]
      );

      if (resolverResult.rows.length === 0) {
        throw new Error('Only admins can resolve emergencies');
      }

      const updateResult = await client.query(
        `UPDATE emergency_incidents 
         SET status = 'resolved',
             resolved_at = NOW(),
             resolved_by = $1,
             resolution_notes = $2,
             is_false_alarm = $3,
             false_alarm_reason = $4
         WHERE id = $5
         AND status IN ('triggered', 'acknowledged')
         AND estate_id = $6
         RETURNING *`,
        [
          resolverId,
          resolution.notes || null,
          resolution.isFalseAlarm || false,
          resolution.falseAlarmReason || null,
          emergencyId,
          resolverResult.rows[0].estate_id
        ]
      );

      if (updateResult.rows.length === 0) {
        throw new Error('Emergency not found or already resolved');
      }

      // Remove from active cache
      this.activeEmergencies.delete(emergencyId);

      loggingService.logInfo('EMERGENCY_RESOLVED', {
        emergencyId,
        resolverId,
        isFalseAlarm: resolution.isFalseAlarm || false
      });

      return updateResult.rows[0];

    } finally {
      client.release();
    }
  }

  /**
   * Cancel a panic alert (by the guard who triggered it)
   * For accidental triggers within 30 seconds
   * 
   * @param {number} emergencyId - Emergency incident ID
   * @param {number} guardId - Guard who triggered (must match)
   * @returns {Object} Updated emergency
   */
  async cancelEmergency(emergencyId, guardId) {
    const client = await dbManager.pool.connect();

    try {
      // Can only cancel within 30 seconds and if you triggered it
      const updateResult = await client.query(
        `UPDATE emergency_incidents 
         SET status = 'cancelled',
             resolution_notes = 'Cancelled by guard within 30 seconds'
         WHERE id = $1
         AND guard_id = $2
         AND status = 'triggered'
         AND triggered_at > NOW() - INTERVAL '30 seconds'
         RETURNING *`,
        [emergencyId, guardId]
      );

      if (updateResult.rows.length === 0) {
        throw new Error('Cannot cancel: either not your alert, too late, or already processed');
      }

      // Remove from active cache
      this.activeEmergencies.delete(emergencyId);

      loggingService.logInfo('EMERGENCY_CANCELLED', {
        emergencyId,
        guardId,
        reason: 'Guard cancelled within 30 seconds'
      });

      return updateResult.rows[0];

    } finally {
      client.release();
    }
  }

  /**
   * Get all active emergencies (triggered or acknowledged)
   * For admin dashboard
   * SECURITY: Filters by estate_id
   * 
   * @param {number} estateId - Estate ID for filtering
   * @returns {Array} Active emergencies
   */
  async getActiveEmergencies(estateId) {
    // Build query with optional estate filter
    let query = `SELECT 
      e.*,
      g.username as guard_name,
      a.username as acknowledged_by_name
     FROM emergency_incidents e
     LEFT JOIN users g ON e.guard_id = g.id
     LEFT JOIN users a ON e.acknowledged_by = a.id
     WHERE e.status IN ('triggered', 'acknowledged')`;
    const params = [];

    // SECURITY: Must filter by estate!
    if (!estateId) throw new Error('Estate context required for active emergencies');

    query += ` AND e.estate_id = $1`;
    params.push(estateId);

    query += ` ORDER BY e.triggered_at DESC`;

    const result = await dbManager.query(query, params);

    return result.rows;
  }

  /**
   * Get guard's own panic history (privacy: guards see only their own)
   * 
   * @param {number} guardId - Guard ID
   * @param {number} limit - Max results
   * @returns {Array} Guard's emergency history
   */
  async getGuardEmergencyHistory(guardId, limit = 10) {
    const result = await dbManager.query(
      `SELECT 
        id,
        triggered_at,
        status,
        is_false_alarm,
        acknowledged_at,
        resolved_at
        -- Note: We don't return location data in history for privacy
       FROM emergency_incidents
       WHERE guard_id = $1
       ORDER BY triggered_at DESC
       LIMIT $2`,
      [guardId, limit]
    );

    return result.rows;
  }

  /**
   * Get emergency details (for admin view)
   * 
   * @param {number} emergencyId - Emergency ID
   * @param {number} requesterId - User requesting (for access control)
   * @returns {Object} Emergency details
   */
  async getEmergencyDetails(emergencyId, requesterId) {
    const client = await dbManager.pool.connect();

    try {
      // Check if requester is admin or the guard who triggered
      const requesterResult = await client.query(
        `SELECT role, estate_id FROM users WHERE id = $1`,
        [requesterId]
      );

      if (requesterResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const requesterRole = requesterResult.rows[0].role;
      const requesterEstateId = requesterResult.rows[0].estate_id;

      if (!requesterEstateId) {
        throw new Error('Estate context required');
      }

      // Get emergency with guard info
      const result = await client.query(
        `SELECT 
          e.*,
          g.username as guard_name,
          a.username as acknowledged_by_name,
          r.username as resolved_by_name
         FROM emergency_incidents e
         LEFT JOIN users g ON e.guard_id = g.id
         LEFT JOIN users a ON e.acknowledged_by = a.id
         LEFT JOIN users r ON e.resolved_by = r.id
         WHERE e.id = $1 AND e.estate_id = $2`,
        [emergencyId, requesterEstateId]
      );

      if (result.rows.length === 0) {
        throw new Error('Emergency not found');
      }

      const emergency = result.rows[0];

      const isAdmin = requesterRole === 'admin' || requesterRole === 'super_admin';

      // Non-admin users can only view their own emergencies
      if (!isAdmin && emergency.guard_id !== requesterId) {
        throw new Error('Access denied: You can only view your own emergencies');
      }

      // For non-admins, redact location after 24 hours (extra privacy)
      if (!isAdmin) {
        const hoursAgo = (Date.now() - new Date(emergency.triggered_at).getTime()) / (1000 * 60 * 60);
        if (hoursAgo > 24) {
          emergency.latitude = null;
          emergency.longitude = null;
          emergency.location_accuracy = null;
        }
      }

      return emergency;

    } finally {
      client.release();
    }
  }

  /**
   * Get aggregate emergency statistics (privacy-safe)
   * For admin dashboard - no individual identification
   * SECURITY: Filters by estate_id
   * 
   * @param {string} period - 'day', 'week', 'month'
   * @param {number} estateId - Estate ID for filtering
   * @returns {Object} Aggregate statistics
   */
  async getEmergencyStats(period = 'month', estateId) {
    const intervalMap = {
      day: '1 day',
      week: '7 days',
      month: '30 days'
    };

    const interval = intervalMap[period] || '30 days';

    // Build query with optional estate filter
    let query = `SELECT 
      COUNT(*) as total_emergencies,
      COUNT(*) FILTER (WHERE is_false_alarm = true) as false_alarms,
      COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
      AVG(EXTRACT(EPOCH FROM (acknowledged_at - triggered_at))) as avg_acknowledge_seconds,
      AVG(EXTRACT(EPOCH FROM (resolved_at - triggered_at))) as avg_resolve_seconds
     FROM emergency_incidents
     WHERE triggered_at > NOW() - INTERVAL '${interval}'`;
    const params = [];

    // SECURITY: Require estate context
    if (!estateId) throw new Error('Estate context required for stats');
    query += ` AND estate_id = $1`;
    params.push(estateId);

    const result = await dbManager.query(query, params);

    return {
      period,
      ...result.rows[0],
      // Note: No breakdown by guard ID (privacy)
    };
  }
}

// Export singleton instance
const emergencyService = new EmergencyService();
export default emergencyService;
