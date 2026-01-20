/**
 * Visitor Factory for Integration Testing
 * Generates test visitors with all states and relationships
 */

import { dbManager } from '../../src/database/db.enhanced.js';

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateInviteCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

/**
 * Visitor Factory - Creates visitors with various configurations
 */
export const visitorFactory = {
  /**
   * Build visitor data without persisting
   */
  build: (overrides = {}) => {
    const id = generateId();
    return {
      name: overrides.name || `Visitor ${id}`,
      phone: overrides.phone || `+2547${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      email: overrides.email || `visitor_${id}@test.com`,
      purpose: overrides.purpose || 'Business meeting',
      status: overrides.status || 'pending',
      host_id: overrides.host_id || null,
      invite_code: overrides.invite_code || generateInviteCode(),
      qr_code: overrides.qr_code || null,
      check_in_time: overrides.check_in_time || null,
      check_out_time: overrides.check_out_time || null,
      expected_arrival: overrides.expected_arrival || new Date(Date.now() + 86400000).toISOString(),
      ...overrides
    };
  },

  /**
   * Create and persist visitor to database
   */
  create: async (overrides = {}) => {
    const visitorData = visitorFactory.build(overrides);

    const result = await dbManager.query(
      `INSERT INTO visitors (name, phone, email, purpose, status, host_id, invite_code, qr_code, check_in_time, check_out_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        visitorData.name,
        visitorData.phone,
        visitorData.email,
        visitorData.purpose,
        visitorData.status,
        visitorData.host_id,
        visitorData.invite_code,
        visitorData.qr_code,
        visitorData.check_in_time,
        visitorData.check_out_time
      ]
    );

    return result.rows[0];
  },

  /**
   * Create pending visitor
   */
  createPending: async (hostId, overrides = {}) => {
    return visitorFactory.create({ 
      host_id: hostId, 
      status: 'pending',
      ...overrides 
    });
  },

  /**
   * Create approved visitor (ready for check-in)
   */
  createApproved: async (hostId, overrides = {}) => {
    return visitorFactory.create({ 
      host_id: hostId, 
      status: 'approved',
      qr_code: 'data:image/png;base64,mockQRCode',
      ...overrides 
    });
  },

  /**
   * Create checked-in visitor (on premise)
   */
  createCheckedIn: async (hostId, overrides = {}) => {
    return visitorFactory.create({ 
      host_id: hostId, 
      status: 'on_premise',
      check_in_time: new Date().toISOString(),
      qr_code: 'data:image/png;base64,mockQRCode',
      ...overrides 
    });
  },

  /**
   * Create checked-out visitor
   */
  createCheckedOut: async (hostId, overrides = {}) => {
    const checkIn = new Date(Date.now() - 3600000); // 1 hour ago
    return visitorFactory.create({ 
      host_id: hostId, 
      status: 'checked_out',
      check_in_time: checkIn.toISOString(),
      check_out_time: new Date().toISOString(),
      qr_code: 'data:image/png;base64,mockQRCode',
      ...overrides 
    });
  },

  /**
   * Create expired visitor
   */
  createExpired: async (hostId, overrides = {}) => {
    return visitorFactory.create({ 
      host_id: hostId, 
      status: 'expired',
      expected_arrival: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      ...overrides 
    });
  },

  /**
   * Create cancelled visitor
   */
  createCancelled: async (hostId, overrides = {}) => {
    return visitorFactory.create({ 
      host_id: hostId, 
      status: 'cancelled',
      ...overrides 
    });
  },

  /**
   * Create multiple visitors
   */
  createMany: async (count, overrides = {}) => {
    const visitors = [];
    for (let i = 0; i < count; i++) {
      const visitor = await visitorFactory.create({
        ...overrides,
        invite_code: generateInviteCode()
      });
      visitors.push(visitor);
    }
    return visitors;
  },

  /**
   * Create visitors in all states
   */
  createAllStates: async (hostId) => {
    return {
      pending: await visitorFactory.createPending(hostId),
      approved: await visitorFactory.createApproved(hostId),
      checkedIn: await visitorFactory.createCheckedIn(hostId),
      checkedOut: await visitorFactory.createCheckedOut(hostId),
      expired: await visitorFactory.createExpired(hostId),
      cancelled: await visitorFactory.createCancelled(hostId)
    };
  },

  /**
   * Update visitor status
   */
  updateStatus: async (visitorId, status, additionalFields = {}) => {
    const setClauses = ['status = $1'];
    const values = [status];
    let paramIndex = 2;

    for (const [key, value] of Object.entries(additionalFields)) {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    values.push(visitorId);
    
    const result = await dbManager.query(
      `UPDATE visitors SET ${setClauses.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0];
  },

  /**
   * Delete visitor by ID
   */
  delete: async (visitorId) => {
    await dbManager.query('DELETE FROM visitors WHERE id = $1', [visitorId]);
  },

  /**
   * Clean up all test visitors
   */
  cleanup: async () => {
    await dbManager.query("DELETE FROM visitors WHERE email LIKE '%@test.com'");
  }
};

export default visitorFactory;
