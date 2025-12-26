/**
 * Rideshare Service
 * P5: Quick entry for Uber, Bolt, Taxi drivers
 */

import { pool } from '../database/connection.js';
import crypto from 'crypto';

/**
 * Generate a 6-character alphanumeric access code
 */
function generateAccessCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

/**
 * Create a rideshare entry request (Resident action)
 */
export async function createRideshareEntry(residentId, data) {
  const {
    driverName,
    vehiclePlate,
    vehicleDescription,
    serviceProvider = 'uber',
    expiryMinutes = 30
  } = data;

  if (!driverName || !vehiclePlate) {
    return { success: false, error: 'Driver name and vehicle plate are required' };
  }

  const accessCode = generateAccessCode();
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  try {
    const result = await pool.query(
      `INSERT INTO rideshare_entries (
        resident_id, driver_name, vehicle_plate, vehicle_description,
        service_provider, access_code, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, driver_name, vehicle_plate, service_provider, access_code, expires_at, status, created_at`,
      [residentId, driverName.trim(), vehiclePlate.trim().toUpperCase(), vehicleDescription, serviceProvider, accessCode, expiresAt]
    );

    return {
      success: true,
      data: result.rows[0],
      message: `Access code valid until ${expiresAt.toLocaleTimeString()}`
    };
  } catch (error) {
    console.error('Create rideshare entry error:', error);
    return { success: false, error: 'Failed to create rideshare entry' };
  }
}

/**
 * Get active rideshare entries for resident
 */
export async function getResidentRideshareEntries(residentId, includeExpired = false) {
  let query = `
    SELECT id, driver_name, vehicle_plate, vehicle_description, service_provider,
           access_code, expires_at, status, arrived_at, created_at
    FROM rideshare_entries
    WHERE resident_id = $1
  `;

  if (!includeExpired) {
    query += ` AND status IN ('pending', 'arrived') AND expires_at > NOW()`;
  }

  query += ' ORDER BY created_at DESC LIMIT 20';

  const result = await pool.query(query, [residentId]);
  return result.rows;
}

/**
 * Cancel a rideshare entry (Resident action)
 */
export async function cancelRideshareEntry(entryId, residentId) {
  const result = await pool.query(
    `UPDATE rideshare_entries 
     SET status = 'cancelled'
     WHERE id = $1 AND resident_id = $2 AND status = 'pending'
     RETURNING id, status`,
    [entryId, residentId]
  );

  if (result.rows.length === 0) {
    return { success: false, error: 'Entry not found or already processed' };
  }

  return { success: true, data: result.rows[0] };
}

/**
 * Validate rideshare entry (Guard action)
 * Can validate by access code or vehicle plate
 */
export async function validateRideshareEntry(credential, method = 'code') {
  const column = method === 'plate' ? 'vehicle_plate' : 'access_code';
  const searchValue = method === 'plate' ? credential.toUpperCase() : credential.toUpperCase();

  const result = await pool.query(
    `SELECT re.*, u.username as resident_name, u.house as resident_unit
     FROM rideshare_entries re
     JOIN users u ON re.resident_id = u.id
     WHERE re.${column} = $1 AND re.status = 'pending' AND re.expires_at > NOW()`,
    [searchValue]
  );

  if (result.rows.length === 0) {
    // Check if expired
    const expiredCheck = await pool.query(
      `SELECT id, status, expires_at FROM rideshare_entries WHERE ${column} = $1`,
      [searchValue]
    );

    if (expiredCheck.rows.length > 0) {
      const entry = expiredCheck.rows[0];
      if (entry.expires_at < new Date()) {
        return { valid: false, error: 'Entry has expired' };
      }
      return { valid: false, error: `Entry status: ${entry.status}` };
    }

    return { valid: false, error: 'No matching entry found' };
  }

  return {
    valid: true,
    entry: {
      id: result.rows[0].id,
      driverName: result.rows[0].driver_name,
      vehiclePlate: result.rows[0].vehicle_plate,
      vehicleDescription: result.rows[0].vehicle_description,
      serviceProvider: result.rows[0].service_provider,
      residentName: result.rows[0].resident_name,
      residentUnit: result.rows[0].resident_unit,
      expiresAt: result.rows[0].expires_at
    }
  };
}

/**
 * Mark rideshare entry as arrived (Guard action)
 */
export async function markRideshareArrived(entryId, guardId) {
  const result = await pool.query(
    `UPDATE rideshare_entries 
     SET status = 'arrived', arrived_at = NOW(), verified_by_guard_id = $2
     WHERE id = $1 AND status = 'pending'
     RETURNING id, status, arrived_at`,
    [entryId, guardId]
  );

  if (result.rows.length === 0) {
    return { success: false, error: 'Entry not found or already processed' };
  }

  return { success: true, data: result.rows[0] };
}

/**
 * Mark rideshare entry as completed (Guard action - driver left)
 */
export async function markRideshareCompleted(entryId, guardId) {
  const result = await pool.query(
    `UPDATE rideshare_entries 
     SET status = 'completed', completed_at = NOW()
     WHERE id = $1 AND status = 'arrived'
     RETURNING id, status`,
    [entryId, guardId]
  );

  if (result.rows.length === 0) {
    return { success: false, error: 'Entry not found or not arrived' };
  }

  return { success: true, data: result.rows[0] };
}

/**
 * Get pending rideshare entries for guard view
 */
export async function getPendingRideshareEntries() {
  const result = await pool.query(
    `SELECT re.id, re.driver_name, re.vehicle_plate, re.vehicle_description,
            re.service_provider, re.access_code, re.expires_at, re.status,
            re.arrived_at, re.created_at,
            u.username as resident_name, u.house as resident_unit
     FROM rideshare_entries re
     JOIN users u ON re.resident_id = u.id
     WHERE re.status IN ('pending', 'arrived') AND re.expires_at > NOW()
     ORDER BY re.created_at DESC`
  );

  return result.rows.map(r => ({
    id: r.id,
    driverName: r.driver_name,
    vehiclePlate: r.vehicle_plate,
    vehicleDescription: r.vehicle_description,
    serviceProvider: r.service_provider,
    accessCode: r.access_code,
    expiresAt: r.expires_at,
    status: r.status,
    arrivedAt: r.arrived_at,
    createdAt: r.created_at,
    residentName: r.resident_name,
    residentUnit: r.resident_unit
  }));
}

export default {
  createRideshareEntry,
  getResidentRideshareEntries,
  cancelRideshareEntry,
  validateRideshareEntry,
  markRideshareArrived,
  markRideshareCompleted,
  getPendingRideshareEntries
};
