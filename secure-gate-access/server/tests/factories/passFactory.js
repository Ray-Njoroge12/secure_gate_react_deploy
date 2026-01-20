/**
 * Pass Factory for Integration Testing
 * Generates test passes with all variants
 */

import { dbManager } from '../../src/database/db.enhanced.js';

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateAccessPin = () => (Math.floor(100000 + Math.random() * 900000)).toString();
const generateQrToken = () => `RP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Pass Factory - Creates recurring passes with various configurations
 */
export const passFactory = {
  /**
   * Build pass data without persisting
   */
  build: (overrides = {}) => {
    const id = generateId();
    return {
      visitor_name: overrides.visitor_name || `Pass Holder ${id}`,
      visitor_phone: overrides.visitor_phone || `+2547${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      visitor_id_number: overrides.visitor_id_number || null,
      vehicle_plate: overrides.vehicle_plate || null,
      resident_id: overrides.resident_id || null,
      pass_type: overrides.pass_type || 'daily_worker',
      purpose: overrides.purpose || 'General access',
      access_pin: overrides.access_pin || generateAccessPin(),
      qr_code_token: overrides.qr_code_token || generateQrToken(),
      valid_from: overrides.valid_from || new Date().toISOString().split('T')[0],
      valid_until: overrides.valid_until || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      allowed_days: overrides.allowed_days || ['mon', 'wed', 'fri'],
      allowed_time_start: overrides.allowed_time_start || '06:00',
      allowed_time_end: overrides.allowed_time_end || '18:00',
      status: overrides.status || 'active',
      ...overrides
    };
  },

  /**
   * Create and persist pass to database
   */
  create: async (overrides = {}) => {
    const passData = passFactory.build(overrides);

    const result = await dbManager.query(
      `INSERT INTO recurring_passes (
        resident_id, visitor_name, visitor_phone, visitor_id_number, vehicle_plate,
        pass_type, purpose, access_pin, qr_code_token,
        valid_from, valid_until, allowed_days, allowed_time_start, allowed_time_end, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        passData.resident_id,
        passData.visitor_name,
        passData.visitor_phone,
        passData.visitor_id_number,
        passData.vehicle_plate,
        passData.pass_type,
        passData.purpose,
        passData.access_pin,
        passData.qr_code_token,
        passData.valid_from,
        passData.valid_until,
        passData.allowed_days,
        passData.allowed_time_start,
        passData.allowed_time_end,
        passData.status
      ]
    );

    return result.rows[0];
  },

  /**
   * Create active pass
   */
  createActive: async (residentId, overrides = {}) => {
    return passFactory.create({ 
      resident_id: residentId, 
      status: 'active',
      ...overrides 
    });
  },

  /**
   * Create expired pass
   */
  createExpired: async (residentId, overrides = {}) => {
    return passFactory.create({ 
      resident_id: residentId, 
      status: 'expired',
      valid_from: new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0],
      valid_until: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
      ...overrides 
    });
  },

  /**
   * Create revoked pass
   */
  createRevoked: async (residentId, overrides = {}) => {
    return passFactory.create({ 
      resident_id: residentId, 
      status: 'revoked',
      ...overrides 
    });
  },

  /**
   * Create single-use pass
   */
  createSingleUse: async (residentId, overrides = {}) => {
    const today = new Date().toISOString().split('T')[0];
    return passFactory.create({ 
      resident_id: residentId, 
      pass_type: 'contractor',
      valid_from: today,
      valid_until: today,
      allowed_days: null,
      ...overrides 
    });
  },

  /**
   * Create multiple passes
   */
  createMany: async (count, overrides = {}) => {
    const passes = [];
    for (let i = 0; i < count; i++) {
      const pass = await passFactory.create(overrides);
      passes.push(pass);
    }
    return passes;
  },

  /**
   * Delete pass by ID
   */
  delete: async (passId) => {
    await dbManager.query('DELETE FROM recurring_passes WHERE id = $1', [passId]);
  },

  /**
   * Clean up all test passes
   */
  cleanup: async () => {
    await dbManager.query("DELETE FROM recurring_passes WHERE visitor_name LIKE 'Pass Holder %'");
  }
};

export default passFactory;
