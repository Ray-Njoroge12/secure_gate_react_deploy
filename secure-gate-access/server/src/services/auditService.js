import pool from '../database/db.js';

export async function auditLog(userId, action, entity_type = null, entity_id = null, details = null, ip = null) {
  try {
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
      [userId || null, action, entity_type, entity_id, details ? JSON.stringify(details) : null, ip]
    );
  } catch (err) {
    console.error('auditLog failed', err);
  }
}

export default { auditLog };
