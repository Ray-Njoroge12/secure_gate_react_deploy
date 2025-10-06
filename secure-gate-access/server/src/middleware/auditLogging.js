#!/usr/bin/env node
/**
 * Audit Logging Middleware
 * Provides comprehensive audit logging for security and compliance
 */

import { auditLogger, logAuditEvent } from '../config/logger.js';

/**
 * Audit logging middleware
 */
export const auditLogging = (options = {}) => {
  const {
    logRequests = true,
    logResponses = true,
    logErrors = true,
    logAuthEvents = true,
    logDataChanges = true,
    sensitiveFields = ['password', 'token', 'secret', 'key'],
    excludePaths = ['/health', '/metrics']
  } = options;

  return (req, res, next) => {
    // Skip excluded paths
    if (excludePaths.some(path => req.originalUrl.startsWith(path))) {
      return next();
    }

    const requestId = req.id || 'unknown';
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Log request
    if (logRequests) {
      const requestData = {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        headers: sanitizeHeaders(req.headers),
        body: sanitizeBody(req.body, sensitiveFields),
        query: req.query,
        params: req.params
      };

      logAuditEvent('request', 'api', requestData, req);
    }

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      if (logResponses) {
        const responseData = {
          statusCode: res.statusCode,
          headers: sanitizeHeaders(res.getHeaders()),
          responseTime: res.get('X-Response-Time'),
          contentLength: res.get('Content-Length')
        };

        logAuditEvent('response', 'api', responseData, req);
      }

      originalEnd.call(this, chunk, encoding);
    };

    // Override res.json to log data changes
    if (logDataChanges && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const originalJson = res.json;
      res.json = function(obj) {
        const changeData = {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          data: sanitizeBody(obj, sensitiveFields)
        };

        logAuditEvent('data_change', 'api', changeData, req);
        return originalJson.call(this, obj);
      };
    }

    next();
  };
};

/**
 * Authentication audit logging
 */
export const authAuditLogging = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(obj) {
    // Log authentication events
    if (req.originalUrl.includes('/auth/login')) {
      const loginData = {
        success: res.statusCode === 200,
        email: req.body?.email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      };

      logAuditEvent('login_attempt', 'auth', loginData, req);
    }

    if (req.originalUrl.includes('/auth/register')) {
      const registerData = {
        success: res.statusCode === 201,
        email: req.body?.email,
        role: req.body?.role,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      };

      logAuditEvent('registration_attempt', 'auth', registerData, req);
    }

    if (req.originalUrl.includes('/auth/logout')) {
      const logoutData = {
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      };

      logAuditEvent('logout', 'auth', logoutData, req);
    }

    if (req.originalUrl.includes('/auth/refresh')) {
      const refreshData = {
        success: res.statusCode === 200,
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      };

      logAuditEvent('token_refresh', 'auth', refreshData, req);
    }

    return originalJson.call(this, obj);
  };

  next();
};

/**
 * Security event audit logging
 */
export const securityAuditLogging = (req, res, next) => {
  // Log security-related events
  const securityEvents = [
    'unauthorized_access',
    'permission_denied',
    'rate_limit_exceeded',
    'suspicious_activity',
    'data_breach_attempt',
    'sql_injection_attempt',
    'xss_attempt',
    'csrf_attempt'
  ];

  // Check for security events in response
  const originalJson = res.json;
  res.json = function(obj) {
    if (res.statusCode === 401) {
      logAuditEvent('unauthorized_access', 'security', {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        reason: obj.message || 'Unauthorized access attempt'
      }, req);
    }

    if (res.statusCode === 403) {
      logAuditEvent('permission_denied', 'security', {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        reason: obj.message || 'Permission denied'
      }, req);
    }

    if (res.statusCode === 429) {
      logAuditEvent('rate_limit_exceeded', 'security', {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'Rate limit exceeded'
      }, req);
    }

    return originalJson.call(this, obj);
  };

  next();
};

/**
 * Data access audit logging
 */
export const dataAccessAuditLogging = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(obj) {
    // Log data access events
    if (req.originalUrl.includes('/admin/') || req.originalUrl.includes('/residents/') || req.originalUrl.includes('/visitors/')) {
      const accessData = {
        resource: req.originalUrl,
        method: req.method,
        userId: req.user?.id,
        userRole: req.user?.role,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        recordCount: Array.isArray(obj.data) ? obj.data.length : 1
      };

      logAuditEvent('data_access', 'data', accessData, req);
    }

    return originalJson.call(this, obj);
  };

  next();
};

/**
 * System configuration audit logging
 */
export const configAuditLogging = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(obj) {
    // Log configuration changes
    if (req.originalUrl.includes('/config/') || req.originalUrl.includes('/settings/')) {
      const configData = {
        resource: req.originalUrl,
        method: req.method,
        userId: req.user?.id,
        userRole: req.user?.role,
        ip: req.ip,
        changes: req.body,
        timestamp: new Date().toISOString()
      };

      logAuditEvent('config_change', 'system', configData, req);
    }

    return originalJson.call(this, obj);
  };

  next();
};

/**
 * Sanitize headers to remove sensitive information
 */
function sanitizeHeaders(headers) {
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
  const sanitized = { ...headers };
  
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

/**
 * Sanitize body to remove sensitive fields
 */
function sanitizeBody(body, sensitiveFields) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  // Recursively sanitize nested objects
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeBody(sanitized[key], sensitiveFields);
    }
  });

  return sanitized;
}

/**
 * Log specific audit event (helper function)
 */
export const logAuditEventHelper = (action, resource, details, req = null) => {
  const auditData = {
    action,
    resource,
    details,
    timestamp: new Date().toISOString(),
    ...(req && {
      requestId: req.id,
      ip: req.ip,
      userId: req.user?.id,
      userRole: req.user?.role
    })
  };

  auditLogger.info('Audit event', auditData);
};

export default {
  auditLogging,
  authAuditLogging,
  securityAuditLogging,
  dataAccessAuditLogging,
  configAuditLogging,
  logAuditEvent: logAuditEventHelper
};
