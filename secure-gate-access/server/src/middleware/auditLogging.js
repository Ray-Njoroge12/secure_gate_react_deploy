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
import logger from '../config/logger.js';
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
 * Legacy audit middleware factory kept for test/backward compatibility.
 */
export const auditLogging = (options = {}) => {
  const {
    logRequests = true,
    logResponses = true,
    logDataChanges = false,
    excludePaths = ['/health', '/metrics', '/api/health'],
    sensitiveFields = ['password', 'token', 'secret', 'key', 'otp']
  } = options;

  return (req, res, next) => {
    if (excludePaths.some(path => req.originalUrl?.startsWith(path))) {
      next();
      return;
    }

    if (logRequests) {
      winstonLogAuditEvent(
        'request',
        'api',
        {
          method: req.method,
          url: req.originalUrl,
          ip: req.ip,
          userId: req.user?.id,
          userRole: req.user?.role,
          headers: sanitizeHeaders(req.headers || {}),
          body: sanitizeDeep(req.body, sensitiveFields),
          query: req.query,
          params: req.params,
          timestamp: new Date().toISOString()
        },
        req
      );
    }

    const originalEnd = res.end;
    res.end = function (...args) {
      if (logResponses) {
        winstonLogAuditEvent(
          'response',
          'api',
          {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            responseTime: res.get?.('X-Response-Time'),
            contentLength: res.get?.('Content-Length'),
            timestamp: new Date().toISOString()
          },
          req
        );
      }
      return originalEnd.apply(this, args);
    };

    if (logDataChanges && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const originalJson = res.json;
      res.json = function (payload) {
        winstonLogAuditEvent(
          'data_change',
          'api',
          {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            userId: req.user?.id,
            userRole: req.user?.role,
            timestamp: new Date().toISOString(),
            payload: sanitizeDeep(payload, sensitiveFields)
          },
          req
        );
        return originalJson.call(this, payload);
      };
    }

    next();
  };
};

export const authAuditLogging = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (payload = {}) {
    const url = req.originalUrl || '';
    const status = res.statusCode;

    if (url.includes('/auth/login')) {
      winstonLogAuditEvent('login_attempt', 'auth', {
        success: status < 400,
        email: req.body?.email,
        ip: req.ip,
        timestamp: new Date().toISOString()
      }, req);
    } else if (url.includes('/auth/register')) {
      winstonLogAuditEvent('registration_attempt', 'auth', {
        success: status < 400,
        email: req.body?.email,
        role: req.body?.role,
        ip: req.ip,
        timestamp: new Date().toISOString()
      }, req);
    } else if (url.includes('/auth/logout')) {
      winstonLogAuditEvent('logout', 'auth', {
        userId: req.user?.id,
        ip: req.ip,
        timestamp: new Date().toISOString()
      }, req);
    } else if (url.includes('/auth/refresh')) {
      winstonLogAuditEvent('token_refresh', 'auth', {
        success: status < 400,
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      }, req);
    }

    return originalJson.call(this, payload);
  };

  next();
};

export const securityAuditLogging = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (payload = {}) {
    const status = res.statusCode;

    if (status === 401) {
      winstonLogAuditEvent('unauthorized_access', 'security', {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        reason: payload.message || payload.error || 'Unauthorized access attempt',
        timestamp: new Date().toISOString()
      }, req);
    }

    if (status === 403) {
      winstonLogAuditEvent('permission_denied', 'security', {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        reason: payload.message || payload.error || 'Permission denied',
        timestamp: new Date().toISOString()
      }, req);
    }

    if (status === 429) {
      winstonLogAuditEvent('rate_limit_exceeded', 'security', {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        reason: 'Rate limit exceeded',
        timestamp: new Date().toISOString()
      }, req);
    }

    return originalJson.call(this, payload);
  };

  next();
};

export const dataAccessAuditLogging = (req, res, next) => {
  const sensitivePaths = ['/admin/', '/residents/', '/visitors/'];
  const originalJson = res.json;

  res.json = function (payload = {}) {
    if (sensitivePaths.some(path => (req.originalUrl || '').includes(path))) {
      const data = payload?.data;
      const recordCount = Array.isArray(data) ? data.length : 1;
      winstonLogAuditEvent('data_access', 'data', {
        resource: req.originalUrl,
        method: req.method,
        userId: req.user?.id,
        userRole: req.user?.role,
        recordCount,
        userAgent: req.get?.('User-Agent') || req.headers?.['user-agent'],
        timestamp: new Date().toISOString()
      }, req);
    }
    return originalJson.call(this, payload);
  };

  next();
};

export const configAuditLogging = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (payload = {}) {
    const url = req.originalUrl || '';
    if (url.includes('/config/') || url.includes('/settings/')) {
      winstonLogAuditEvent('config_change', 'system', {
        resource: req.originalUrl,
        method: req.method,
        userId: req.user?.id,
        userRole: req.user?.role,
        changes: sanitizeDeep(req.body, ['password', 'token', 'secret', 'key', 'otp']),
        ip: req.ip,
        timestamp: new Date().toISOString()
      }, req);
    }
    return originalJson.call(this, payload);
  };

  next();
};

export const logAuditEventHelper = (action, resource, details = {}, req = null) => {
  const auditData = {
    action,
    resource,
    details,
    timestamp: new Date().toISOString(),
    ...(req?.id && { requestId: req.id }),
    ...(req?.ip && { ip: req.ip }),
    ...(req?.user?.id && { userId: req.user.id }),
    ...(req?.user?.role && { userRole: req.user.role })
  };

  logger.info('Audit event', auditData);
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

function sanitizeHeaders(headers) {
  const sanitized = {};
  for (const [key, value] of Object.entries(headers || {})) {
    const lower = key.toLowerCase();
    if (['authorization', 'cookie', 'set-cookie', 'x-api-key'].includes(lower)) {
      sanitized[lower] = '[REDACTED]';
    } else {
      sanitized[lower] = value;
    }
  }
  return sanitized;
}

function sanitizeDeep(value, sensitiveFields) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(item => sanitizeDeep(item, sensitiveFields));
  const result = {};
  for (const [k, v] of Object.entries(value)) {
    if (sensitiveFields.includes(k)) {
      result[k] = '[REDACTED]';
    } else {
      result[k] = sanitizeDeep(v, sensitiveFields);
    }
  }
  return result;
}

export default {
  auditLogging,
  authAuditLogging,
  securityAuditLogging,
  dataAccessAuditLogging,
  configAuditLogging,
  logAuditEventHelper,
  unifiedAuditMiddleware,
  attachRequestAudit,
  logAuditEvent: winstonLogAuditEvent
};
