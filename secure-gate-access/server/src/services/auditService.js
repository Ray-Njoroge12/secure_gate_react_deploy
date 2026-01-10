import { dbManager } from '../database/db.enhanced.js';

export async function auditLog(userId, action, entity_type = null, entity_id = null, details = null, ip = null, estateId = null) {
  try {
    await dbManager.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, estate_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [userId || null, action, entity_type, entity_id, details ? JSON.stringify(details) : null, ip, estateId]
    );
  } catch (err) {
    console.error('auditLog failed', err);
  }
}

export default { auditLog };
