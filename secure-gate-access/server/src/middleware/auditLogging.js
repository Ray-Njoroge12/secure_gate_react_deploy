#!/usr/bin/env node
/**
 * Unified Audit Logging Middleware
 *
 * Single source of truth for all audit logging. Replaces the legacy auditLogger.js.
 * - Attaches req.audit() helper for controller-level manual logging.
 * - Exports attachRequestAudit as a named export for drop-in compatibility.
 * - Persists to DB + Winston on every response.
 */

import { logAuditEvent as winstonLogAuditEvent } from '../config/logger.js';
import { dbManager } from '../database/db.enhanced.js';

/**
 * Persist audit event to database
 */
async function persistToDatabase(auditData) {
  try {
    const query = `
      INSERT INTO audit_logs (
        action, resource, user_id, user_role, estate_id, request_id,
        ip_address, user_agent, details, timestamp, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
      )
    `;

    await dbManager.query(query, [
      auditData.category || 'api',
      auditData.url.substring(0, 100),
      auditData.user?.id || null,
      auditData.user?.role || null,
      auditData.user?.estateId || null,
      auditData.requestId || null,
      auditData.ip || '127.0.0.1',
      auditData.userAgent || null,
      JSON.stringify(auditData.details || {})
    ]);
  } catch (error) {
    console.error('❌ Failed to persist audit log to DB:', error.message);
  }
}

/**
 * Unified Audit Logging Middleware
 *
 * Usage: app.use(unifiedAuditMiddleware())
 * Or as a per-route middleware: router.post('/...', unifiedAuditMiddleware(), handler)
 */
export const unifiedAuditMiddleware = (options = {}) => {
  const {
    sensitiveFields = ['password', 'token', 'secret', 'key', 'otp'],
    excludePaths = ['/health', '/metrics', '/api/health']
  } = options;

  return (req, res, next) => {
    if (excludePaths.some(path => req.originalUrl.startsWith(path))) return next();

    const timestamp = new Date().toISOString();
    const requestId = req.requestId || req.id || 'unknown';

    // Attach req.audit() helper for controllers to manually log specific actions
    if (!req.audit) {
      req.audit = async (action, entityType, entityId, details = {}) => {
        try {
          const resource = (entityType || req.path || 'unknown').toString().substring(0, 100);
          const userAgent = req.get?.('User-Agent') || req.headers?.['user-agent'] || null;
          await dbManager.query(
            `INSERT INTO audit_logs (
               action, resource, user_id, user_role, estate_id, request_id,
               ip_address, user_agent, details, timestamp, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
            [
              String(action || 'unknown').substring(0, 100),
              resource,
              req.user?.id || null,
              req.user?.role || null,
              req.user?.estate_id ?? null,
              requestId,
              req.ip || '127.0.0.1',
              userAgent,
              JSON.stringify({ entity_type: entityType || null, entity_id: entityId || null, ...details })
            ]
          );
        } catch {
          // Non-critical: silently ignore audit insert failures
        }
      };
    }

    const requestData = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId
    };

    const originalJson = res.json;
    res.json = function (obj) {
      const statusCode = res.statusCode;
      const isSensitivePath = req.originalUrl.includes('/auth/') || req.originalUrl.includes('/admin/');

      let category = 'api';
      if (req.originalUrl.includes('/auth/')) category = 'auth';
      if (statusCode === 401 || statusCode === 403 || statusCode === 429) category = 'security';
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) category = 'data_change';

      const auditData = {
        ...requestData,
        statusCode,
        timestamp,
        category,
        user: req.user ? { id: req.user.id, role: req.user.role, estateId: req.user.estate_id } : null,
        details: isSensitivePath ? { message: 'Sensitive action' } : sanitizeBody(obj, sensitiveFields)
      };

      // 1. Winston structured logging
      winstonLogAuditEvent(category, category === 'security' ? 'warn' : 'info', auditData, req);

      // 2. Database persistence (async, fire-and-forget)
      persistToDatabase(auditData);

      return originalJson.call(this, obj);
    };

    next();
  };
};

/**
 * Pre-instantiated middleware for drop-in compatibility with the legacy auditLogger.js.
 * Replaces: import attachRequestAudit from '../middleware/auditLogger.js'
 * With:     import { attachRequestAudit } from '../middleware/auditLogging.js'
 */
/**
 * Named export for drop-in compatibility with the legacy auditLogger.js factory.
 * Supports BOTH patterns without breaking existing routes:
 *   - attachRequestAudit          (direct middleware reference)
 *   - attachRequestAudit()        (legacy factory-call pattern from auditLogger.js)
 */
const _attachMiddleware = unifiedAuditMiddleware();
export const attachRequestAudit = function (...args) {
  // Called as factory: attachRequestAudit() — return the middleware function
  if (args.length === 0) return _attachMiddleware;
  // Called as middleware directly: router.use(attachRequestAudit)
  return _attachMiddleware(...args);
};


/**
 * Sanitize body to remove sensitive fields before logging
 */
function sanitizeBody(body, sensitiveFields) {
  if (!body || typeof body !== 'object') return body;
  const sanitized = Array.isArray(body) ? [...body.slice(0, 5)] : { ...body };
  sensitiveFields.forEach(field => {
    if (sanitized[field]) sanitized[field] = '[REDACTED]';
  });
  return sanitized;
}

export default {
  unifiedAuditMiddleware,
  attachRequestAudit,
  logAuditEvent: winstonLogAuditEvent
};
