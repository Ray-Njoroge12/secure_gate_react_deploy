/**
 * Database Query Helpers
 * Provides typed, optimized query builders to replace SELECT *
 * 
 * Usage:
 *   const user = await dbManager.query(queries.users.findById, [userId]);
 *   const visitors = await dbManager.query(queries.visitors.findByEstate, [estateId]);
 */

export const queries = {
  users: {
    // Core user fields (excluding sensitive data)
    fields: 'id, username, email, role, phone, area, house, estate_id, account_status, verified, created_at, updated_at',
    
    findById: `
      SELECT id, username, email, role, phone, area, house, estate_id, 
             account_status, verified, created_at, updated_at
      FROM users 
      WHERE id = $1
    `,
    
    findByEmail: `
      SELECT id, username, email, role, phone, area, house, estate_id,
             account_status, verified, password_hash, created_at, updated_at
      FROM users 
      WHERE email = $1
    `,
    
    findByEstate: `
      SELECT id, username, email, role, phone, area, house, 
             account_status, verified, created_at
      FROM users 
      WHERE estate_id = $1 AND account_status = 'active'
      ORDER BY created_at DESC
    `
  },
  
  visitors: {
    fields: 'id, name, phone, email, purpose, status, invite_code, estate_id, resident_id, date_of_visit, check_in_time, check_out_time, created_at',
    
    findById: `
      SELECT id, name, phone, email, id_number, vehicle_plate, purpose, 
             status, invite_code, qr_code, estate_id, resident_id,
             date_of_visit, time_of_visit, check_in_time, check_out_time,
             created_by, created_at, updated_at
      FROM visitors 
      WHERE id = $1
    `,
    
    findByEstateActive: `
      SELECT id, name, phone, email, purpose, status, invite_code,
             resident_id, date_of_visit, check_in_time, created_at
      FROM visitors 
      WHERE estate_id = $1 
        AND status IN ('PENDING', 'APPROVED', 'CHECKED_IN')
        AND (date_of_visit >= CURRENT_DATE OR date_of_visit IS NULL)
      ORDER BY created_at DESC
      LIMIT 100
    `,
    
    findByInviteCode: `
      SELECT id, name, phone, email, purpose, status, invite_code, qr_code,
             estate_id, resident_id, date_of_visit, time_of_visit,
             check_in_time, check_out_time, created_at
      FROM visitors 
      WHERE invite_code = $1 AND estate_id = $2
    `
  },
  
  estates: {
    findById: `
      SELECT id, name, slug, timezone, address_line1, address_line2,
             city, state, postal_code, country, contact_phone, contact_email,
             status, created_at, updated_at
      FROM estates 
      WHERE id = $1
    `,
    
    findAll: `
      SELECT id, name, slug, status, city, state, created_at
      FROM estates 
      WHERE status = 'active'
      ORDER BY name
    `
  },
  
  auditLogs: {
    findRecent: `
      SELECT id, user_id, action, resource, entity_type, entity_id,
             outcome, message, ip_address, timestamp, created_at
      FROM audit_logs 
      WHERE estate_id = $1 
      ORDER BY timestamp DESC 
      LIMIT 100
    `,
    
    findByUser: `
      SELECT id, action, resource, entity_type, entity_id, outcome,
             timestamp, created_at
      FROM audit_logs 
      WHERE user_id = $1 AND estate_id = $2
      ORDER BY timestamp DESC 
      LIMIT 50
    `
  }
};

/**
 * Build dynamic SELECT query with only requested fields
 * @param {string} table - Table name
 * @param {string[]} fields - Fields to select
 * @param {string} whereClause - WHERE conditions
 * @returns {string} SQL query
 */
export function buildSelect(table, fields, whereClause = '') {
  const fieldList = fields.join(', ');
  const where = whereClause ? ` WHERE ${whereClause}` : '';
  return `SELECT ${fieldList} FROM ${table}${where}`;
}

/**
 * Pagination helper
 * @param {string} query - Base query
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @returns {string} Query with LIMIT/OFFSET
 */
export function paginate(query, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  return `${query} LIMIT ${limit} OFFSET ${offset}`;
}

export default queries;
