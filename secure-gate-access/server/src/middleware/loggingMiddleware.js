// server/src/middleware/loggingMiddleware.js
/**
 * Enhanced Logging Middleware
 * Request/response logging with correlation IDs and structured data
 */

import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import loggingService from '../services/loggingService.js';
import { maskEmail, maskPhone } from '../utils/redaction.js';

/**
 * Correlation ID middleware for request tracing
 */
export const correlationIdMiddleware = (req, res, next) => {
  // Get correlation ID from header or generate new one
  const correlationId = req.correlationId ||
                       req.requestId ||
                       req.id ||
                       req.headers['x-correlation-id'] ||
                       req.headers['x-request-id'] ||
                       uuidv4();

  // Set correlation ID in request and response
  req.correlationId = correlationId;
  req.requestId = correlationId;
  req.id = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('X-Request-ID', correlationId);

  // Set in logging service for this request (with error handling)
  try {
    loggingService.setCorrelationId(correlationId);

    // Clear correlation ID after response
    res.on('finish', () => {
      try {
        loggingService.clearCorrelationId();
      } catch (error) {
        console.warn('Failed to clear correlation ID:', error.message);
      }
    });
  } catch (error) {
    console.warn('Failed to set correlation ID:', error.message);
  }

  next();
};

/**
 * Enhanced request logging middleware
 */
export const requestLoggingMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  // Log request start
  loggingService.logAPI('info', 'Request started', req, {
    correlationId: req.correlationId,
    request_id: req.requestId || req.correlationId,
    user_id: req.user?.id ?? null,
    estate_id: req.user?.estate_id ?? null,
    role: req.user?.role ?? null,
    route: req.originalUrl,
    startTime: new Date(startTime).toISOString()
  });

  // Capture response details
  const originalSend = res.send;
  res.send = function(data) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const memoryUsed = process.memoryUsage().heapUsed - startMemory;

    // Determine log level based on status code and duration
    let logLevel = 'info';
    if (res.statusCode >= 500) {
      logLevel = 'error';
    } else if (res.statusCode >= 400) {
      logLevel = 'warn';
    } else if (duration > 2000) { // Slow requests
      logLevel = 'warn';
    }

    // Log response
    loggingService.logAPI(logLevel, 'Request completed', req, {
      correlationId: req.correlationId,
      request_id: req.requestId || req.correlationId,
      user_id: req.user?.id ?? null,
      estate_id: req.user?.estate_id ?? null,
      role: req.user?.role ?? null,
      route: req.originalUrl,
      status: res.statusCode,
      latency: duration,
      statusCode: res.statusCode,
      duration,
      memoryUsed,
      responseSize: data ? Buffer.byteLength(data, 'utf8') : 0,
      endTime: new Date(endTime).toISOString(),
      performance: {
        fast: duration < 100,
        acceptable: duration < 1000,
        slow: duration >= 2000
      }
    });

    if (res.statusCode === 403 || res.statusCode === 429) {
      loggingService.logSecurity('warn', 'Security response emitted', {
        correlationId: req.correlationId,
        request_id: req.requestId || req.correlationId,
        user_id: req.user?.id ?? null,
        estate_id: req.user?.estate_id ?? null,
        role: req.user?.role ?? null,
        route: req.originalUrl,
        status: res.statusCode,
        method: req.method,
        code: res.statusCode === 429 ? 'RATE_LIMITED' : 'FORBIDDEN'
      });
    }

    // Log to performance logger if slow
    if (duration > 1000) {
      loggingService.logPerformance('warn', 'Slow request detected', {
        correlationId: req.correlationId,
        method: req.method,
        url: req.originalUrl,
        duration,
        statusCode: res.statusCode
      });
    }

    return originalSend.call(this, data);
  };

  // Handle errors
  res.on('error', (error) => {
    loggingService.logError('Response error', error, {
      correlationId: req.correlationId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode
    });
  });

  next();
};

/**
 * Morgan configuration for access logging
 */
export const accessLoggingMiddleware = morgan((tokens, req, res) => {
  const logData = {
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: parseInt(tokens.status(req, res)),
    responseTime: parseFloat(tokens['response-time'](req, res)),
    contentLength: tokens.res(req, res, 'content-length'),
    userAgent: tokens['user-agent'](req, res),
    correlationId: req.correlationId,
    remoteAddr: tokens['remote-addr'](req, res),
    httpVersion: tokens['http-version'](req, res),
    referrer: tokens.referrer(req, res)
  };

  // Log to API logger
  const level = res.statusCode >= 400 ? 'warn' : 'info';
  loggingService.logAPI(level, 'Access log', req, logData);

  // Return empty string to prevent double logging
  return '';
});

/**
 * Error logging middleware (should be used after all routes)
 */
export const errorLoggingMiddleware = (error, req, res, next) => {
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  const safeHeaders = sanitizeHeaders(req.headers);
  const safeBody = req.body
    ? JSON.stringify(sanitizeData(req.body, sensitiveFields)).substring(0, 1000)
    : null;
  const safeParams = sanitizeData(req.params, sensitiveFields);
  const safeQuery = sanitizeData(req.query, sensitiveFields);
  const safeUser = req.user
    ? { id: req.user.id, username: maskUserIdentifier(req.user.username) }
    : null;

  // Log the error with full context
  loggingService.logError('Unhandled request error', error, {
    correlationId: req.correlationId,
    method: req.method,
    url: req.originalUrl || req.url,
    headers: safeHeaders,
    body: safeBody, // Limit body size
    params: safeParams,
    query: safeQuery,
    user: safeUser,
    statusCode: error.status || error.statusCode || 500,
    stack: error.stack
  });

  // Log security event if it looks suspicious
  if (error.status === 401 || error.status === 403 || error.message.includes('unauthorized')) {
    loggingService.logSecurity('warn', 'Authentication/Authorization error', {
      correlationId: req.correlationId,
      error: error.message,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      user: safeUser
    });
  }

  next(error);
};

/**
 * Security event logging middleware
 */
export const securityLoggingMiddleware = (req, res, next) => {
  // Log suspicious activities
  const suspiciousPatterns = [
    /\/\.\.\//, // Path traversal
    /script.*>/i, // XSS attempts
    /union.*select/i, // SQL injection
    /javascript:/i, // JavaScript protocol
    /<iframe/i, // Iframe injection
    /eval\(/i, // Code injection
  ];

  const url = req.originalUrl || req.url;
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  const body = JSON.stringify(req.body || {});
  const query = JSON.stringify(req.query || {});
  const safeBody = JSON.stringify(sanitizeData(req.body || {}, sensitiveFields));
  const safeQuery = JSON.stringify(sanitizeData(req.query || {}, sensitiveFields));

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url) || pattern.test(body) || pattern.test(query)) {
      loggingService.logSecurity('warn', 'Suspicious request pattern detected', {
        correlationId: req.correlationId,
        pattern: pattern.toString(),
        method: req.method,
        url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: safeBody.substring(0, 500), // Limit size
        query: safeQuery
      });
      break; // Only log once per request
    }
  }

  // Log authentication attempts
  if (req.originalUrl?.includes('/auth') || req.originalUrl?.includes('/login')) {
    const identifier = req.body?.username || req.body?.email;
    loggingService.logSecurity('info', 'Authentication attempt', {
      correlationId: req.correlationId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      username: maskUserIdentifier(identifier)
    });
  }

  next();
};

/**
 * Database operation logging middleware
 */
export const databaseLoggingWrapper = (operation, queryName) => {
  return async (queryFn) => {
    const startTime = Date.now();

    try {
      loggingService.logDatabase('debug', `Database ${operation} started`, {
        queryName,
        operation,
        timestamp: new Date().toISOString()
      });

      const result = await queryFn();
      const duration = Date.now() - startTime;

      const level = duration > 1000 ? 'warn' : 'debug';
      loggingService.logDatabase(level, `Database ${operation} completed`, {
        queryName,
        operation,
        duration,
        success: true,
        rowCount: result?.rowCount || result?.length || 'unknown'
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      loggingService.logDatabase('error', `Database ${operation} failed`, {
        queryName,
        operation,
        duration,
        error: error.message,
        success: false
      });

      throw error;
    }
  };
};

/**
 * Audit logging helper
 */
export const logAuditEvent = (action, details = {}, req = null) => {
  const userId = req?.user?.id || details.userId || 'anonymous';
  const correlationId = req?.correlationId || loggingService.getCorrelationId();

  loggingService.logAudit(`Audit: ${action}`, action, userId, {
    ...details,
    ip: req?.ip,
    userAgent: req?.get('User-Agent'),
    timestamp: new Date().toISOString()
  }, correlationId);
};

/**
 * Performance monitoring wrapper
 */
export const performanceLoggingWrapper = (operationName, threshold = 1000) => {
  return (target, propertyName, descriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        const memoryUsed = process.memoryUsage().heapUsed - startMemory;

        const level = duration > threshold ? 'warn' : 'debug';
        loggingService.logPerformance(level, `Performance: ${operationName}`, {
          operation: operationName,
          duration,
          memoryUsed,
          threshold,
          slow: duration > threshold
        });

        return result;

      } catch (error) {
        const duration = Date.now() - startTime;

        loggingService.logPerformance('error', `Performance: ${operationName} failed`, {
          operation: operationName,
          duration,
          error: error.message
        });

        throw error;
      }
    };

    return descriptor;
  };
};

/**
 * Structured logging utilities
 */
export const logUtils = {
  // Quick logging methods
  info: (message, meta = {}) => loggingService.logInfo(message, meta),
  warn: (message, meta = {}) => loggingService.logWarning(message, meta),
  error: (message, error = null, meta = {}) => loggingService.logError(message, error, meta),
  debug: (message, meta = {}) => loggingService.logDebug(message, meta),

  // Specialized logging
  security: (level, message, meta = {}) => loggingService.logSecurity(level, message, meta),
  performance: (level, message, meta = {}) => loggingService.logPerformance(level, message, meta),
  audit: (message, action, userId = null, meta = {}) => loggingService.logAudit(message, action, userId, meta),
  database: (level, message, meta = {}) => loggingService.logDatabase(level, message, meta),
  api: (level, message, request = null, meta = {}) => loggingService.logAPI(level, message, request, meta)
};

const maskUserIdentifier = (value) => {
  if (!value || typeof value !== 'string') {
    return value ?? null;
  }
  if (value.includes('@')) {
    return maskEmail(value);
  }
  if (/\d{7,}/.test(value)) {
    return maskPhone(value);
  }
  return value;
};

const sanitizeHeaders = (headers = {}) => {
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
  const sanitized = { ...headers };

  for (const header of sensitiveHeaders) {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  }

  return sanitized;
};

const sanitizeData = (data, sensitiveFields = []) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, sensitiveFields));
  }

  const sanitized = { ...data };
  const shouldMaskAsEmail = (key) => key.includes('email');
  const shouldMaskAsPhone = (key) => (
    key.includes('phone')
    || key.includes('msisdn')
    || key.includes('mobile')
  );
  const isRecipientKey = (key) => key === 'to' || key === 'recipient';

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  for (const [key, value] of Object.entries(sanitized)) {
    const normalizedKey = key.toLowerCase();

    if (value && typeof value === 'object') {
      sanitized[key] = sanitizeData(value, sensitiveFields);
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
    }
  }

  return sanitized;
};

export default {
  correlationIdMiddleware,
  requestLoggingMiddleware,
  accessLoggingMiddleware,
  errorLoggingMiddleware,
  securityLoggingMiddleware,
  databaseLoggingWrapper,
  logAuditEvent,
  performanceLoggingWrapper,
  logUtils
};
