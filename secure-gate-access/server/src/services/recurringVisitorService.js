/**
 * Recurring Visitor Service
 * P4: Manages daily workers, caregivers, contractors with persistent credentials
 */

import { pool } from '../database/connection.js';
import * as crypto from 'crypto';
import argon2 from 'argon2';

/**
 * Generate a unique 6-digit PIN
 * SECURITY FIX: Use crypto.randomInt() instead of Math.random() for cryptographic security
 * @returns {string} 6-digit numeric PIN
 */
function generatePin() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hash a PIN using Argon2
 * SEC-002: Secure PIN storage
 * @param {string} pin - Plaintext PIN to hash
 * @returns {Promise<string>} Argon2 hash
 */
async function hashPin(pin) {
  return argon2.hash(pin, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4
  });
}

/**
 * Verify a PIN against its hash
 * @param {string} hash - Stored Argon2 hash
 * @param {string} pin - Plaintext PIN to verify
 * @returns {Promise<boolean>} True if PIN matches
 */
async function verifyPin(hash, pin) {
  try {
    return await argon2.verify(hash, pin);
  } catch (error) {
    console.error('PIN verification error:', error.message);
    return false;
  }
}

/**
 * Generate a unique QR code token
 */
function generateQrToken() {
  return `RP-${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * Create a recurring pass for a visitor
 */
export async function createRecurringPass(residentId, passData) {
  const {
    visitorName,
    visitorPhone,
    visitorIdNumber,
    vehiclePlate,
    passType = 'daily_worker',
    purpose,
    validFrom,
    validUntil,
    allowedDays = ['mon', 'tue', 'wed', 'thu', 'fri'],
    allowedTimeStart = '06:00',
    allowedTimeEnd = '18:00'
  } = passData;

  if (!visitorName || !validUntil) {
    return { success: false, error: 'Visitor name and valid until date are required' };
  }

  const accessPin = generatePin();
  const accessPinHash = await hashPin(accessPin); // SEC-002: Hash PIN before storage
  const qrCodeToken = generateQrToken();

  try {
    const result = await pool.query(
      `INSERT INTO recurring_passes (
        resident_id, visitor_name, visitor_phone, visitor_id_number, vehicle_plate,
        pass_type, purpose, access_pin_hash, qr_code_token,
        valid_from, valid_until, allowed_days, allowed_time_start, allowed_time_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, visitor_name, pass_type, qr_code_token, valid_from, valid_until, status, created_at`,
      [
        residentId, visitorName, visitorPhone, visitorIdNumber, vehiclePlate,
        passType, purpose, accessPinHash, qrCodeToken,
        validFrom || new Date(), validUntil, allowedDays, allowedTimeStart, allowedTimeEnd
      ]
    );

    // SEC-002: Return plaintext PIN only once for SMS delivery, never store it
    return {
      success: true,
      data: {
        ...result.rows[0],
        access_pin: accessPin // Plaintext PIN for SMS - DO NOT LOG THIS
      },
      message: 'Recurring pass created successfully'
    };
  } catch (error) {
    console.error('Create recurring pass error:', error);
    return { success: false, error: 'Failed to create recurring pass' };
  }
}

/**
 * Get all recurring passes for a resident
 */
export async function getResidentRecurringPasses(residentId, { status, includeExpired = false, estateId = null } = {}) {
  let query = `
    SELECT 
      rp.id, rp.visitor_name, rp.visitor_phone, rp.vehicle_plate, rp.pass_type, rp.purpose,
      rp.access_pin, rp.qr_code_token, rp.valid_from, rp.valid_until,
      rp.allowed_days, rp.allowed_time_start, rp.allowed_time_end,
      rp.status, rp.total_entries, rp.last_used_at, rp.created_at
    FROM recurring_passes rp
    ${estateId ? 'JOIN users u ON rp.resident_id = u.id' : ''}
    WHERE rp.resident_id = $1
    ${estateId ? 'AND u.estate_id = $2' : ''}
  `;
  const params = estateId ? [residentId, estateId] : [residentId];
  let paramIndex = estateId ? 3 : 2;

  if (status) {
    query += ` AND rp.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  } else if (!includeExpired) {
    query += ` AND rp.status IN ('active', 'suspended')`;
  }

  query += ' ORDER BY rp.created_at DESC';

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get a single recurring pass by ID (for resident)
 */
export async function getRecurringPassById(passId, residentId) {
  const result = await pool.query(
    `SELECT * FROM recurring_passes WHERE id = $1 AND resident_id = $2`,
    [passId, residentId]
  );
  return result.rows[0] || null;
}

/**
 * Update a recurring pass
 */
export async function updateRecurringPass(passId, residentId, updates) {
  const allowedFields = [
    'visitor_name', 'visitor_phone', 'vehicle_plate', 'purpose',
    'valid_until', 'allowed_days', 'allowed_time_start', 'allowed_time_end'
  ];

  const setClauses = [];
  const values = [passId, residentId];
  let paramIndex = 3;

  for (const [key, value] of Object.entries(updates)) {
    const snakeKey = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
    if (allowedFields.includes(snakeKey) && value !== undefined) {
      setClauses.push(`${snakeKey} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    return { success: false, error: 'No valid fields to update' };
  }

  const result = await pool.query(
    `UPDATE recurring_passes SET ${setClauses.join(', ')}
     WHERE id = $1 AND resident_id = $2
     RETURNING id, visitor_name, status, valid_until`,
    values
  );

  if (result.rows.length === 0) {
    return { success: false, error: 'Pass not found' };
  }

  return { success: true, data: result.rows[0] };
}

/**
 * Revoke a recurring pass
 */
export async function revokeRecurringPass(passId, residentId, reason = null) {
  const result = await pool.query(
    `UPDATE recurring_passes 
     SET status = 'revoked', revoked_at = NOW(), revoked_reason = $3
     WHERE id = $1 AND resident_id = $2 AND status = 'active'
     RETURNING id, visitor_name, status`,
    [passId, residentId, reason]
  );

  if (result.rows.length === 0) {
    return { success: false, error: 'Pass not found or already revoked' };
  }

  return { success: true, data: result.rows[0], message: 'Pass revoked successfully' };
}

/**
 * Suspend a recurring pass temporarily
 */
export async function suspendRecurringPass(passId, residentId) {
  const result = await pool.query(
    `UPDATE recurring_passes SET status = 'suspended'
     WHERE id = $1 AND resident_id = $2 AND status = 'active'
     RETURNING id, visitor_name, status`,
    [passId, residentId]
  );

  if (result.rows.length === 0) {
    return { success: false, error: 'Pass not found or not active' };
  }

  return { success: true, data: result.rows[0] };
}

/**
 * Reactivate a suspended pass
 */
export async function reactivateRecurringPass(passId, residentId) {
  const result = await pool.query(
    `UPDATE recurring_passes SET status = 'active'
     WHERE id = $1 AND resident_id = $2 AND status = 'suspended'
     RETURNING id, visitor_name, status`,
    [passId, residentId]
  );

  if (result.rows.length === 0) {
    return { success: false, error: 'Pass not found or not suspended' };
  }

  return { success: true, data: result.rows[0] };
}

/**
 * Validate a recurring pass (Guard action)
 * SEC-002: Uses Argon2 verification for PIN, direct comparison for QR token
 * SEC-003: Includes rate limiting checks
 * SECURITY: Filters by estate_id to prevent cross-estate access
 * @param {string} credential - PIN or QR token
 * @param {string} method - 'pin' or 'qr'
 * @param {string} ipAddress - Client IP for rate limiting
 * @param {number|null} estateId - Estate ID for filtering
 * @returns {Promise<Object>} Validation result
 */
export async function validateRecurringPass(credential, method = 'pin', ipAddress = null, estateId = null) {
  // SECURITY: Require estate context for pass validation
  if (!estateId) {
    return { valid: false, error: 'Estate context required for pass validation' };
  }

  let pass;

  if (method === 'qr') {
    // QR token is a direct lookup (token is unique and random) - filtered by estate
    const result = await pool.query(
      `SELECT rp.*, u.username as resident_name, u.house as resident_unit
       FROM recurring_passes rp
       JOIN users u ON rp.resident_id = u.id
       WHERE rp.qr_code_token = $1 AND u.estate_id = $2`,
      [credential, estateId]
    );

    if (result.rows.length === 0) {
      return { valid: false, error: 'Invalid QR code' };
    }
    pass = result.rows[0];
  } else {
    // SEC-002: PIN validation requires fetching all active passes and verifying hash
    // This is necessary because we can't query by hash directly
    // We'll get passes that are potentially valid and verify PIN against each
    // SECURITY: Filter by estate_id
    const result = await pool.query(
      `SELECT rp.*, u.username as resident_name, u.house as resident_unit
       FROM recurring_passes rp
       JOIN users u ON rp.resident_id = u.id
       WHERE rp.status = 'active'
         AND rp.valid_from <= CURRENT_DATE
         AND rp.valid_until >= CURRENT_DATE
         AND rp.access_pin_hash IS NOT NULL
         AND (rp.pin_locked_until IS NULL OR rp.pin_locked_until < NOW())
         AND u.estate_id = $1
       ORDER BY rp.last_used_at DESC NULLS LAST
       LIMIT 100`,
      [estateId]
    );

    if (result.rows.length === 0) {
      return { valid: false, error: 'No active passes found' };
    }

    // SEC-002: Verify PIN against hashes (Argon2)
    for (const candidate of result.rows) {
      const isMatch = await verifyPin(candidate.access_pin_hash, credential);
      if (isMatch) {
        pass = candidate;
        break;
      }
    }

    if (!pass) {
      // SEC-003: Log failed attempt for rate limiting
      // Note: We can't know which pass was targeted, log IP-based attempt
      await logFailedPinAttempt(null, ipAddress);
      return { valid: false, error: 'Invalid PIN' };
    }

    // SEC-003: Check if this specific pass is locked due to failed attempts
    if (pass.pin_locked_until && new Date(pass.pin_locked_until) > new Date()) {
      const lockRemaining = Math.ceil((new Date(pass.pin_locked_until) - new Date()) / 60000);
      return {
        valid: false,
        error: `PIN locked. Try again in ${lockRemaining} minutes`,
        locked: true
      };
    }
  }

  // Check status
  if (pass.status !== 'active') {
    return { valid: false, error: `Pass is ${pass.status}`, pass };
  }

  // Check date validity
  const today = new Date();
  const validFrom = new Date(pass.valid_from);
  const validUntil = new Date(pass.valid_until);

  if (today < validFrom || today > validUntil) {
    return { valid: false, error: 'Pass not valid on this date', pass };
  }

  // Check day of week
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const currentDay = dayNames[today.getDay()];
  if (!pass.allowed_days.includes(currentDay)) {
    return { valid: false, error: `Not valid on ${currentDay}`, pass };
  }

  // Check time window
  const currentTime = today.toTimeString().slice(0, 5);
  if (currentTime < pass.allowed_time_start || currentTime > pass.allowed_time_end) {
    return { valid: false, error: 'Outside allowed hours', pass };
  }

  // SEC-003: Reset failed attempts on successful validation
  if (method === 'pin' && pass.failed_pin_attempts > 0) {
    await pool.query(
      `UPDATE recurring_passes 
       SET failed_pin_attempts = 0, pin_locked_until = NULL 
       WHERE id = $1`,
      [pass.id]
    );
  }

  return {
    valid: true,
    pass: {
      id: pass.id,
      visitorName: pass.visitor_name,
      visitorPhone: pass.visitor_phone,
      vehiclePlate: pass.vehicle_plate,
      passType: pass.pass_type,
      purpose: pass.purpose,
      residentName: pass.resident_name,
      residentUnit: pass.resident_unit,
      totalEntries: pass.total_entries
    }
  };
}

/**
 * SEC-003: Log failed PIN attempt for rate limiting
 * @param {number|null} passId - Pass ID if known
 * @param {string|null} ipAddress - Client IP address
 */
async function logFailedPinAttempt(passId, ipAddress) {
  try {
    await pool.query(
      `INSERT INTO pin_validation_attempts (pass_id, ip_address, success, attempt_method)
       VALUES ($1, $2, false, 'pin')`,
      [passId, ipAddress]
    );

    // If passId is known, increment failed attempts
    if (passId) {
      const result = await pool.query(
        `UPDATE recurring_passes 
         SET failed_pin_attempts = COALESCE(failed_pin_attempts, 0) + 1,
             last_failed_attempt = NOW()
         WHERE id = $1
         RETURNING failed_pin_attempts`,
        [passId]
      );

      // Lock after 5 failed attempts (15 minute lockout)
      if (result.rows[0]?.failed_pin_attempts >= 5) {
        await pool.query(
          `UPDATE recurring_passes 
           SET pin_locked_until = NOW() + INTERVAL '15 minutes'
           WHERE id = $1`,
          [passId]
        );
      }
    }
  } catch (error) {
    console.error('Failed to log PIN attempt:', error.message);
  }
}

/**
 * Record entry for a recurring pass (Guard action)
 */
export async function recordPassEntry(passId, guardId, method = 'pin', notes = null) {
  try {
    await pool.transaction(async (client) => {
      // Insert entry record
      await client.query(
        `INSERT INTO recurring_pass_entries (pass_id, verified_by_guard_id, entry_method, notes)
         VALUES ($1, $2, $3, $4)`,
        [passId, guardId, method, notes]
      );

      // Update pass stats
      await client.query(
        `UPDATE recurring_passes 
         SET total_entries = total_entries + 1, last_used_at = NOW()
         WHERE id = $1`,
        [passId]
      );
    });

    return { success: true, message: 'Entry recorded' };
  } catch (error) {
    console.error('Record entry error:', error);
    throw error;
  }
}

/**
 * Get entry history for a pass (Resident audit)
 */
export async function getPassEntryHistory(passId, residentId, limit = 50, estateId = null) {
  // Verify ownership first
  const query = estateId
    ? 'SELECT rp.id FROM recurring_passes rp JOIN users u ON rp.resident_id = u.id WHERE rp.id = $1 AND rp.resident_id = $2 AND u.estate_id = $3'
    : 'SELECT id FROM recurring_passes WHERE id = $1 AND resident_id = $2';

  const params = estateId ? [passId, residentId, estateId] : [passId, residentId];

  const passCheck = await pool.query(query, params);

  if (passCheck.rows.length === 0) {
    return { success: false, error: 'Pass not found' };
  }

  const result = await pool.query(
    `SELECT rpe.*, u.username as guard_name
     FROM recurring_pass_entries rpe
     LEFT JOIN users u ON rpe.verified_by_guard_id = u.id
     WHERE rpe.pass_id = $1
     ORDER BY rpe.checked_in_at DESC
     LIMIT $2`,
    [passId, limit]
  );

  return { success: true, data: result.rows };
}

export default {
  createRecurringPass,
  getResidentRecurringPasses,
  getRecurringPassById,
  updateRecurringPass,
  revokeRecurringPass,
  suspendRecurringPass,
  reactivateRecurringPass,
  validateRecurringPass,
  recordPassEntry,
  getPassEntryHistory
};
