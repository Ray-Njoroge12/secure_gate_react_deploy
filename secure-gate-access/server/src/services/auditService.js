import { dbManager } from '../database/db.enhanced.js';
import { maskEmail, maskPhone } from '../utils/redaction.js';

const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]';
const shouldMaskAsEmail = (key) => key.includes('email');
const shouldMaskAsPhone = (key) => (
  key.includes('phone')
  || key.includes('msisdn')
  || key.includes('mobile')
);
const isRecipientKey = (key) => key === 'to' || key === 'recipient';

const sanitizeAuditDetails = (details) => {
  if (!details || typeof details !== 'object') {
    return details;
  }

  if (Array.isArray(details)) {
    return details.map(item => sanitizeAuditDetails(item));
  }

  if (!isPlainObject(details)) {
    return details;
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(details)) {
    const normalizedKey = key.toLowerCase();

    if (Array.isArray(value)) {
      sanitized[key] = value.map(item => sanitizeAuditDetails(item));
      continue;
    }

    if (value && typeof value === 'object') {
      sanitized[key] = isPlainObject(value) ? sanitizeAuditDetails(value) : value;
      continue;
    }

    if (typeof value === 'string' && shouldMaskAsEmail(normalizedKey)) {
      sanitized[key] = maskEmail(value);
      continue;
    }

    if (typeof value === 'string' && shouldMaskAsPhone(normalizedKey)) {
      sanitized[key] = maskPhone(value);
      continue;
    }

    if (typeof value === 'string' && isRecipientKey(normalizedKey)) {
      sanitized[key] = value.includes('@') ? maskEmail(value) : maskPhone(value);
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
};

export async function auditLog(userId, action, entity_type = null, entity_id = null, details = null, ip = null, estateId = null) {
  try {
    const sanitizedDetails = details ? sanitizeAuditDetails(details) : null;
    await dbManager.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, estate_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [userId || null, action, entity_type, entity_id, sanitizedDetails ? JSON.stringify(sanitizedDetails) : null, ip, estateId]
    );
  } catch (err) {
    console.error('auditLog failed', err);
  }
}

export default { auditLog };
