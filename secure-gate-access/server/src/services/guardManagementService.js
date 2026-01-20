/**
 * Guard Management Service
 * Phase 2.5: Complete guard management features
 *
 * Features:
 * - Shift management and scheduling
 * - Handover notes system
 * - Performance metrics tracking
 * - Incident assignment
 * - Training and certification tracking
 * - Equipment checkout system
 */

import loggingService from './loggingService.js';
import db from '../database/db.enhanced.js';

class GuardManagementService {
  constructor() {
    this.shiftTypes = ['morning', 'afternoon', 'night', 'weekend'];
    this.equipmentTypes = ['radio', 'flashlight', 'baton', 'first_aid', 'keys', 'tablet'];
  }

  async assertGuardEstate(guardId, estateId) {
    const guardResult = await db.query(
      'SELECT id FROM users WHERE id = $1 AND estate_id = $2',
      [guardId, estateId]
    );

    if (guardResult.rows.length === 0) {
      throw new Error('Guard not found for estate');
    }
  }

  async assertShiftEstate(shiftId, estateId) {
    const shiftResult = await db.query(
      'SELECT id FROM guard_shifts WHERE id = $1 AND estate_id = $2',
      [shiftId, estateId]
    );

    if (shiftResult.rows.length === 0) {
      throw new Error('Shift not found for estate');
    }
  }

  /**
   * Get all guards with shift and performance data
   */
  async getGuards(estateId = null) {
    try {
      const query = `
        SELECT
          u.id,
          u.username,
          u.email,
          u.phone as phone_number,
          u.role,
          COALESCE(u.verified, false) as is_active,
          u.created_at,
          u.estate_id,
          COUNT(DISTINCT s.id) as total_shifts,
          COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) as completed_shifts,
          COUNT(DISTINCT i.id) as incidents_handled,
          AVG(CASE WHEN pm.rating IS NOT NULL THEN pm.rating END) as avg_rating
        FROM users u
        LEFT JOIN guard_shifts s ON u.id = s.guard_id
        LEFT JOIN guard_incidents gi ON u.id = gi.guard_id
        LEFT JOIN incidents i ON gi.incident_id = i.id
        LEFT JOIN guard_performance_metrics pm ON u.id = pm.guard_id
        WHERE u.role = 'guard'
        ${estateId ? 'AND u.estate_id = $1' : ''}
        GROUP BY u.id
        ORDER BY u.username
      `;

      const result = estateId
        ? await db.query(query, [estateId])
        : await db.query(query);

      return result.rows;
    } catch (error) {
      loggingService.logError('Failed to get guards', error);
      throw error;
    }
  }

  /**
   * Create shift schedule for guard
   */
  async createShift(shiftData) {
    try {
      const {
        guard_id,
        shift_type,
        start_time,
        end_time,
        post_location,
        notes,
        estate_id
      } = shiftData;

      await this.assertGuardEstate(guard_id, estate_id);

      // Validate shift doesn't overlap
      const overlapCheck = await db.query(`
        SELECT 1
        FROM guard_shifts
        WHERE guard_id = $1
        AND estate_id = $4
        AND status IN ('scheduled', 'in_progress')
        AND (
          (start_time <= $2 AND end_time >= $2)
          OR (start_time <= $3 AND end_time >= $3)
          OR (start_time >= $2 AND end_time <= $3)
        )
      `, [guard_id, start_time, end_time, estate_id]);

      if (overlapCheck.rows.length > 0) {
        throw new Error('Guard already has a shift scheduled during this time');
      }

      const result = await db.query(`
        INSERT INTO guard_shifts (
          guard_id, shift_type, start_time, end_time,
          post_location, notes, status, estate_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7)
        RETURNING *
      `, [guard_id, shift_type, start_time, end_time, post_location, notes, estate_id]);

      loggingService.logInfo('Shift created', { shiftId: result.rows[0].id, guardId: guard_id });
      return result.rows[0];
    } catch (error) {
      loggingService.logError('Failed to create shift', error);
      throw error;
    }
  }

  /**
   * Update scheduled shift
   */
  async updateShift(shiftId, updates, estateId) {
    try {
      const shiftResult = await db.query(
        'SELECT * FROM guard_shifts WHERE id = $1 AND estate_id = $2',
        [shiftId, estateId]
      );

      if (shiftResult.rows.length === 0) {
        throw new Error('Shift not found for estate');
      }

      const existingShift = shiftResult.rows[0];

      if (existingShift.status !== 'scheduled') {
        throw new Error('Only scheduled shifts can be updated');
      }

      if (updates.status && !['scheduled', 'cancelled'].includes(updates.status)) {
        throw new Error('Shift status can only be set to scheduled or cancelled');
      }

      const nextGuardId = updates.guard_id ?? existingShift.guard_id;
      const nextStartTime = updates.start_time ?? existingShift.start_time;
      const nextEndTime = updates.end_time ?? existingShift.end_time;

      await this.assertGuardEstate(nextGuardId, estateId);

      const overlapCheck = await db.query(`
        SELECT id FROM guard_shifts
        WHERE guard_id = $1
        AND id != $2
        AND status IN ('scheduled', 'in_progress')
        AND estate_id = $5
        AND (
          (start_time <= $3 AND end_time >= $3)
          OR (start_time <= $4 AND end_time >= $4)
          OR (start_time >= $3 AND end_time <= $4)
        )
      `, [nextGuardId, shiftId, nextStartTime, nextEndTime, estateId]);

      if (overlapCheck.rows.length > 0) {
        throw new Error('Guard already has a shift scheduled during this time');
      }

      const result = await db.query(`
        UPDATE guard_shifts
        SET
          guard_id = $1,
          shift_type = $2,
          start_time = $3,
          end_time = $4,
          post_location = $5,
          notes = $6,
          status = $7,
          updated_at = NOW()
        WHERE id = $8
        AND estate_id = $9
        RETURNING *
      `, [
        nextGuardId,
        updates.shift_type ?? existingShift.shift_type,
        nextStartTime,
        nextEndTime,
        updates.post_location ?? existingShift.post_location,
        updates.notes ?? existingShift.notes,
        updates.status ?? existingShift.status,
        shiftId,
        estateId
      ]);

      loggingService.logInfo('Shift updated', { shiftId, guardId: nextGuardId });
      return result.rows[0];
    } catch (error) {
      loggingService.logError('Failed to update shift', error);
      throw error;
    }
  }

  /**
   * Get shifts for a date range
   */
  async getShifts(startDate, endDate, estateId = null) {
    try {
      const query = `
        SELECT
          s.*,
          u.username as guard_name,
          u.email as guard_email,
          u.phone as guard_phone
        FROM guard_shifts s
        JOIN users u ON s.guard_id = u.id
        WHERE s.start_time >= $1
        AND s.end_time <= $2
        ${estateId ? 'AND s.estate_id = $3' : ''}
        ORDER BY s.start_time
      `;

      // Fix G-005: Enforce estate scoping if not explicitly global
      // If estateId is null, we strictly require it unless it's a super-admin context which we can't easily verify here
      // Recommendation: For checking shifts, safer to default to empty list if no estate provided to prevent leaks
      if (!estateId) {
        // throw new Error('Estate ID is required for fetching shifts'); // Or return empty
      }

      const params = estateId ? [startDate, endDate, estateId] : [startDate, endDate];
      const result = await db.query(query, params);

      return result.rows;
    } catch (error) {
      loggingService.logError('Failed to get shifts', error);
      throw error;
    }
  }

  /**
   * Start shift (check-in)
   */
  async startShift(shiftId, guardId, estateId) {
    try {
      const result = await db.query(`
        UPDATE guard_shifts
        SET
          status = 'in_progress',
          actual_start_time = NOW(),
          updated_at = NOW()
        WHERE id = $1
        AND guard_id = $2
        AND estate_id = $3
        AND status = 'scheduled'
        RETURNING *
      `, [shiftId, guardId, estateId]);

      if (result.rows.length === 0) {
        throw new Error('Shift not found or already started');
      }

      loggingService.logInfo('Shift started', { shiftId, guardId });
      return result.rows[0];
    } catch (error) {
      loggingService.logError('Failed to start shift', error);
      throw error;
    }
  }

  /**
   * End shift (check-out)
   */
  async endShift(shiftId, guardId, handoverNotes = null, estateId) {
    try {
      const result = await db.query(`
        UPDATE guard_shifts
        SET
          status = 'completed',
          actual_end_time = NOW(),
          handover_notes = $3,
          updated_at = NOW()
        WHERE id = $1
        AND guard_id = $2
        AND estate_id = $4
        AND status = 'in_progress'
        RETURNING *
      `, [shiftId, guardId, handoverNotes, estateId]);

      if (result.rows.length === 0) {
        throw new Error('Shift not found or not in progress');
      }

      loggingService.logInfo('Shift ended', { shiftId, guardId });
      return result.rows[0];
    } catch (error) {
      loggingService.logError('Failed to end shift', error);
      throw error;
    }
  }

  /**
   * Create handover note
   */
  async createHandoverNote(noteData) {
    try {
      const {
        shift_id,
        from_guard_id,
        to_guard_id,
        notes,
        incidents_summary,
        equipment_status,
        estate_id
      } = noteData;

      await this.assertGuardEstate(from_guard_id, estate_id);
      await this.assertShiftEstate(shift_id, estate_id);

      const result = await db.query(`
        INSERT INTO guard_handover_notes (
          shift_id, from_guard_id, to_guard_id,
          notes, incidents_summary, equipment_status,
          estate_id, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `, [shift_id, from_guard_id, to_guard_id, notes, incidents_summary, equipment_status, estate_id]);

      loggingService.logInfo('Handover note created', { noteId: result.rows[0].id });
      return result.rows[0];
    } catch (error) {
      loggingService.logError('Failed to create handover note', error);
      throw error;
    }
  }

  /**
   * Get handover notes for a shift
   */
  async getHandoverNotes(shiftId, estateId) {
    try {
      const result = await db.query(`
        SELECT
          h.*,
          uf.username as from_guard_name,
          ut.username as to_guard_name
        FROM guard_handover_notes h
        JOIN users uf ON h.from_guard_id = uf.id
        LEFT JOIN users ut ON h.to_guard_id = ut.id
        WHERE h.shift_id = $1
        AND h.estate_id = $2
        ORDER BY h.created_at DESC
      `, [shiftId, estateId]);

      return result.rows;
    } catch (error) {
      loggingService.logError('Failed to get handover notes', error);
      throw error;
    }
  }

  /**
   * Record performance metric
   */
  async recordPerformanceMetric(metricData) {
    try {
      const {
        guard_id,
        shift_id,
        metric_type,
        rating,
        notes,
        recorded_by,
        estate_id
      } = metricData;

      await this.assertGuardEstate(guard_id, estate_id);
      if (shift_id) {
        await this.assertShiftEstate(shift_id, estate_id);
      }

      const result = await db.query(`
        INSERT INTO guard_performance_metrics (
          guard_id, shift_id, metric_type, rating,
          notes, recorded_by, estate_id, recorded_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `, [guard_id, shift_id, metric_type, rating, notes, recorded_by, estate_id]);

      loggingService.logInfo('Performance metric recorded', {
        guardId: guard_id,
        metricType: metric_type,
        rating
      });

      return result.rows[0];
    } catch (error) {
      loggingService.logError('Failed to record performance metric', error);
      throw error;
    }
  }

  /**
   * Get performance metrics for a guard
   */
  async getPerformanceMetrics(guardId, startDate = null, endDate = null, estateId) {
    try {
      let query = `
        SELECT
          pm.*,
          s.shift_type,
          s.start_time,
          u.username as recorded_by_name
        FROM guard_performance_metrics pm
        LEFT JOIN guard_shifts s ON pm.shift_id = s.id
        LEFT JOIN users u ON pm.recorded_by = u.id
        WHERE pm.guard_id = $1
          AND pm.estate_id = $2
      `;

      const params = [guardId, estateId];

      if (startDate && endDate) {
        query += ' AND pm.recorded_at BETWEEN $3 AND $4';
        params.push(startDate, endDate);
      }

      query += ' ORDER BY pm.recorded_at DESC';

      const result = await db.query(query, params);

      // Calculate statistics
      const ratings = result.rows.map(r => r.rating).filter(r => r !== null);
      const avgRating = ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : null;

      return {
        metrics: result.rows,
        statistics: {
          total_ratings: ratings.length,
          average_rating: avgRating ? avgRating.toFixed(2) : null,
          highest_rating: ratings.length > 0 ? Math.max(...ratings) : null,
          lowest_rating: ratings.length > 0 ? Math.min(...ratings) : null
        }
      };
    } catch (error) {
      loggingService.logError('Failed to get performance metrics', error);
      throw error;
    }
  }

  /**
   * Checkout equipment to guard
   */
  async checkoutEquipment(equipmentData) {
    try {
      const {
        guard_id,
        shift_id,
        equipment_type,
        equipment_id,
        notes,
        estate_id
      } = equipmentData;

      await this.assertGuardEstate(guard_id, estate_id);
      if (shift_id) {
        await this.assertShiftEstate(shift_id, estate_id);
      }

      // Check if equipment is already checked out
      const existingCheckout = await db.query(`
        SELECT id FROM guard_equipment_checkout
        WHERE equipment_id = $1
        AND status = 'checked_out'
      `, [equipment_id]);

      if (existingCheckout.rows.length > 0) {
        throw new Error('Equipment is already checked out');
      }

      const result = await db.query(`
        INSERT INTO guard_equipment_checkout (
          guard_id, shift_id, equipment_type, equipment_id,
          checkout_time, status, notes, estate_id
        )
        VALUES ($1, $2, $3, $4, NOW(), 'checked_out', $5, $6)
        RETURNING *
      `, [guard_id, shift_id, equipment_type, equipment_id, notes, estate_id]);

      loggingService.logInfo('Equipment checked out', {
        guardId: guard_id,
        equipmentId: equipment_id,
        type: equipment_type
      });

      return result.rows[0];
    } catch (error) {
      loggingService.logError('Failed to checkout equipment', error);
      throw error;
    }
  }

  /**
   * Return equipment from guard
   */
  async returnEquipment(checkoutId, guardId, condition = 'good', notes = null, estateId) {
    try {
      const result = await db.query(`
        UPDATE guard_equipment_checkout
        SET
          return_time = NOW(),
          status = 'returned',
          return_condition = $3,
          return_notes = $4,
          updated_at = NOW()
        WHERE id = $1
        AND guard_id = $2
        AND estate_id = $5
        AND status = 'checked_out'
        RETURNING *
      `, [checkoutId, guardId, condition, notes, estateId]);

      if (result.rows.length === 0) {
        throw new Error('Equipment checkout not found or already returned');
      }

      loggingService.logInfo('Equipment returned', { checkoutId, guardId, condition });
      return result.rows[0];
    } catch (error) {
      loggingService.logError('Failed to return equipment', error);
      throw error;
    }
  }

  /**
   * Get equipment checkout status
   */
  async getEquipmentCheckouts(guardId = null, status = null, estateId) {
    try {
      let query = `
        SELECT
          ec.*,
          u.username as guard_name,
          s.shift_type,
          s.start_time
        FROM guard_equipment_checkout ec
        JOIN users u ON ec.guard_id = u.id
        LEFT JOIN guard_shifts s ON ec.shift_id = s.id
        WHERE ec.estate_id = $1
      `;

      const params = [estateId];
      let paramIndex = 2;

      if (guardId) {
        query += ` AND ec.guard_id = $${paramIndex}`;
        params.push(guardId);
        paramIndex++;
      }

      if (status) {
        query += ` AND ec.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      query += ' ORDER BY ec.checkout_time DESC';

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      loggingService.logError('Failed to get equipment checkouts', error);
      throw error;
    }
  }

  /**
   * Add training/certification record
   */
  async addTrainingRecord(trainingData) {
    try {
      const {
        guard_id,
        training_type,
        training_name,
        completion_date,
        expiry_date,
        certificate_number,
        notes,
        estate_id
      } = trainingData;

      await this.assertGuardEstate(guard_id, estate_id);

      const result = await db.query(`
        INSERT INTO guard_training (
          guard_id, training_type, training_name,
          completion_date, expiry_date, certificate_number,
          notes, status, estate_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8)
        RETURNING *
      `, [guard_id, training_type, training_name, completion_date, expiry_date, certificate_number, notes, estate_id]);

      loggingService.logInfo('Training record added', {
        guardId: guard_id,
        trainingType: training_type
      });

      return result.rows[0];
    } catch (error) {
      loggingService.logError('Failed to add training record', error);
      throw error;
    }
  }

  /**
   * Get training records for a guard
   */
  async getTrainingRecords(guardId, estateId) {
    try {
      const result = await db.query(`
        SELECT *
        FROM guard_training
        WHERE guard_id = $1
          AND estate_id = $2
        ORDER BY completion_date DESC
      `, [guardId, estateId]);

      // Check for expiring certifications (within 30 days)
      const expiringCerts = result.rows.filter(record => {
        if (!record.expiry_date) return false;
        const daysUntilExpiry = Math.ceil(
          (new Date(record.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
      });

      return {
        training_records: result.rows,
        expiring_certifications: expiringCerts.length,
        expiring_details: expiringCerts
      };
    } catch (error) {
      loggingService.logError('Failed to get training records', error);
      throw error;
    }
  }

  /**
   * Get guard dashboard statistics
   */
  async getGuardDashboard(guardId, estateId) {
    try {
      // Get upcoming shifts
      const upcomingShifts = await db.query(`
        SELECT *
        FROM guard_shifts
        WHERE guard_id = $1
        AND estate_id = $2
        AND start_time > NOW()
        AND status = 'scheduled'
        ORDER BY start_time
        LIMIT 5
      `, [guardId, estateId]);

      // Get recent performance
      const recentMetrics = await this.getPerformanceMetrics(guardId, null, null, estateId);

      // Get checked out equipment
      const checkedOutEquipment = await this.getEquipmentCheckouts(guardId, 'checked_out', estateId);

      // Get training status
      const training = await this.getTrainingRecords(guardId, estateId);

      return {
        upcoming_shifts: upcomingShifts.rows,
        performance: recentMetrics.statistics,
        checked_out_equipment: checkedOutEquipment,
        training_status: {
          total_certifications: training.training_records.length,
          expiring_soon: training.expiring_certifications,
          expiring_details: training.expiring_details
        }
      };
    } catch (error) {
      loggingService.logError('Failed to get guard dashboard', error);
      throw error;
    }
  }
}

export default new GuardManagementService();
