import { auditLog } from '../services/auditService.js';

export function attachRequestAudit(req, res, next) {
  req.audit = async (action, entity_type = null, entity_id = null, details = null) => {
    const userId = req.user?.id || null;
    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    await auditLog(userId, action, entity_type, entity_id, details, ip);
  };
  next();
}

export default attachRequestAudit;
