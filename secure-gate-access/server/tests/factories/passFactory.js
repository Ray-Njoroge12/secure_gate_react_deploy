/**
 * Pass Factory for Integration Testing
 * Generates test passes with all variants
 */

import { dbManager } from '../../src/database/db.enhanced.js';

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateAccessCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

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
      name: overrides.name || `Pass Holder ${id}`,
      phone: overrides.phone || `+2547${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      email: overrides.email || `pass_${id}@test.com`,
      resident_id: overrides.resident_id || null,
      schedule_type: overrides.schedule_type || 'weekly',
      days_of_week: overrides.days_of_week || ['monday', 'wednesday', 'friday'],
      start_date: overrides.start_date || new Date().toISOString().split('T')[0],
      end_date: overrides.end_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: overrides.status || 'active',
      access_code: overrides.access_code || generateAccessCode(),
      max_uses: overrides.max_uses || null,
      current_uses: overrides.current_uses || 0,
      ...overrides
    };
  },

  /**
   * Create and persist pass to database
   */
  create: async (overrides = {}) => {
    const passData = passFactory.build(overrides);

    const result = await dbManager.query(
      `INSERT INTO recurring_passes (name, phone, email, resident_id, schedule_type, days_of_week, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        passData.name,
        passData.phone,
        passData.email,
        passData.resident_id,
        passData.schedule_type,
        passData.days_of_week,
        passData.start_date,
        passData.end_date,
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
      start_date: new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0],
      end_date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
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
    return passFactory.create({ 
      resident_id: residentId, 
      max_uses: 1,
      current_uses: 0,
      schedule_type: 'once',
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
    await dbManager.query("DELETE FROM recurring_passes WHERE email LIKE '%@test.com'");
  }
};

export default passFactory;
