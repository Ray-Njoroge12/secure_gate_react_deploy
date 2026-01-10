/**
 * @file walkInController.js
 * @description Phase G2 - Controller for guard walk-in visitor registration
 * Handles unexpected visitors at the gate
 */

import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError } from '../utils/respond.js';
import { PASS_STATUS } from '../constants/statuses.js';
import logger from '../config/logger.js';

/**
 * Register a walk-in visitor (guard only)
 * Creates visitor with pending_approval status
 */
export const registerWalkIn = async (req, res) => {
  try {
    // Auth check: guard only
    if (!req.user || !req.user.email) {
      return respondError(res, 401, 'Unauthorized');
    }
    if (req.user.role !== 'guard') {
      await req.audit?.('walk_in.create', 'visitor', null, { 
        outcome: 'fail', 
        message: 'Forbidden: only guards can register walk-ins' 
      });
      return respondError(res, 403, 'Forbidden - guards only');
    }

    const { name, phone, purpose, residentName, vehiclePlate, dateOfVisit, timeOfVisit } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return respondError(res, 400, 'Visitor name is required');
    }
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return respondError(res, 400, 'Phone number is required');
    }
    if (!residentName || typeof residentName !== 'string' || !residentName.trim()) {
      return respondError(res, 400, 'Resident name is required');
    }

    // Sanitize inputs
    const sanitizedName = name.trim();
    const sanitizedPhone = phone.trim();
    const sanitizedPurpose = purpose ? purpose.trim() : 'Walk-in visit';
    const sanitizedResidentName = residentName.trim();
    const sanitizedVehiclePlate = vehiclePlate ? vehiclePlate.trim() : null;

    // Look up resident by name (fuzzy match)
    const residentQuery = await dbManager.query(
      `SELECT id, email, username, estate_id 
       FROM users 
       WHERE role = 'resident' 
       AND (username ILIKE $1 OR email ILIKE $1)
       LIMIT 1`,
      [`%${sanitizedResidentName}%`]
    );

    let residentId = null;
    let residentEmail = null;
    let residentEstateId = null;

    if (residentQuery.rows.length > 0) {
      residentId = residentQuery.rows[0].id;
      residentEmail = residentQuery.rows[0].email;
      residentEstateId = residentQuery.rows[0].estate_id ?? null;
    } else {
      // Resident not found - still create visitor but note in audit
      logger.warn(`Walk-in: Resident '${sanitizedResidentName}' not found in system`);
    }

    // Create visitor record with walk-in flag
    const now = new Date().toISOString();
    const visitDate = dateOfVisit || now.split('T')[0];
    const visitTime = timeOfVisit || now.split('T')[1].slice(0, 5);

    const insertQuery = `
      INSERT INTO visitors (
        name, 
        phone, 
        email,
        purpose, 
        date_of_visit, 
        time_of_visit, 
        status,
        resident_id,
        created_by,
        vehicle_plate,
        created_at,
        estate_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, name, phone, email, purpose, date_of_visit, time_of_visit, status, vehicle_plate, created_at
    `;

    const result = await dbManager.query(insertQuery, [
      sanitizedName,
      sanitizedPhone,
      residentEmail, // Store resident email if found
      sanitizedPurpose,
      visitDate,
      visitTime,
      'pending', // Initial status (will change to pending_approval when guard requests)
      residentId,
      req.user.email, // Guard who created it
      sanitizedVehiclePlate,
      now,
      residentEstateId ?? req.user.estate_id ?? null
    ]);

    const visitor = result.rows[0];

    // Audit log
    await req.audit?.('walk_in.create', 'visitor', String(visitor.id), {
      outcome: 'success',
      message: 'Walk-in visitor registered by guard',
      guardId: req.user.id,
      residentName: sanitizedResidentName,
      residentFound: residentId ? 'yes' : 'no'
    });

    // Return visitor data
    respond(res, {
      message: 'Walk-in visitor registered successfully',
      data: {
        ...visitor,
        residentName: sanitizedResidentName,
        residentId
      }
    });

  } catch (error) {
    logger.error('Walk-in registration error:', error);
    await req.audit?.('walk_in.create', 'visitor', null, {
      outcome: 'fail',
      message: 'Failed to register walk-in visitor',
      error: error.message
    });
    respondError(res, 500, 'Failed to register walk-in visitor');
  }
};

/**
 * Get all walk-in visitors for today (guard dashboard)
 */
export const getTodayWalkIns = async (req, res) => {
  try {
    if (!req.user || !req.user.email) {
      return respondError(res, 401, 'Unauthorized');
    }
    if (req.user.role !== 'guard' && req.user.role !== 'admin') {
      return respondError(res, 403, 'Forbidden');
    }

    const today = new Date().toISOString().split('T')[0];

    const estateId = req.user.estate_id ?? null;
    const query = `
      SELECT 
        v.id,
        v.name,
        v.phone,
        v.purpose,
        v.status,
        v.vehicle_plate,
        v.created_at,
        v.approved_at,
        v.rejected_at,
        v.rejection_reason,
        u.username as resident_name
      FROM visitors v
      LEFT JOIN users u ON v.resident_id = u.id
      WHERE v.date_of_visit = $1
      ${estateId !== null ? 'AND v.estate_id = $2' : ''}
      AND v.created_by LIKE '%@%' -- Created by guard (has email format)
      ORDER BY v.created_at DESC
    `;

    const result = await dbManager.query(query, estateId !== null ? [today, estateId] : [today]);

    respond(res, {
      data: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    logger.error('Error fetching today\'s walk-ins:', error);
    respondError(res, 500, 'Failed to fetch walk-ins');
  }
};

export default {
  registerWalkIn,
  getTodayWalkIns
};
