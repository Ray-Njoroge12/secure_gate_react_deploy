// Enhanced Security Audit Middleware
// Provides comprehensive security monitoring and threat detection

import { dbManager } from '../database/db.enhanced.js';
import logger from '../config/logger.js';
import { maskEmail, maskPhone } from '../utils/redaction.js';

/**
 * Security Audit Middleware
 * Monitors and logs security-related events for threat detection
 */
export const securityAuditMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || `audit-${Date.now()}`;
  
  // Security event tracking
  const securityEvents = {
    suspiciousPatterns: [],
    rateLimitHits: 0,
    authenticationFailures: 0,
    authorizationFailures: 0,
    inputValidationFailures: 0,
    suspiciousHeaders: [],
    suspiciousUserAgent: false,
    suspiciousIP: false
  };

  // Check for suspicious patterns
  const checkSuspiciousPatterns = () => {
    const suspiciousPatterns = [
      /\.\./,  // Directory traversal
      /<script/i,  // XSS attempts
      /union\s+select/i,  // SQL injection
      /drop\s+table/i,  // SQL injection
      /insert\s+into/i,  // SQL injection
      /delete\s+from/i,  // SQL injection
      /exec\s*\(/i,  // Command injection
      /eval\s*\(/i,  // Code injection
      /javascript:/i,  // XSS
      /vbscript:/i,  // XSS
      /onload\s*=/i,  // XSS
      /onerror\s*=/i,  // XSS
      /alert\s*\(/i,  // XSS
      /document\.cookie/i,  // XSS
      /window\.location/i,  // XSS
      /\.\.\/\.\./,  // Path traversal
      /%2e%2e%2f/i,  // URL encoded path traversal
      /%252e%252e%252f/i,  // Double URL encoded path traversal
    ];

    const checkString = (str) => {
      if (typeof str !== 'string') return;
      return suspiciousPatterns.some(pattern => pattern.test(str));
    };

    // Check URL parameters
    if (req.query && Object.values(req.query).some(checkString)) {
      securityEvents.suspiciousPatterns.push('suspicious_query_params');
    }

    // Check request body
    if (req.body && typeof req.body === 'object') {
      const bodyStr = JSON.stringify(req.body);
      if (checkString(bodyStr)) {
        securityEvents.suspiciousPatterns.push('suspicious_request_body');
      }
    }

    // Check headers
    Object.entries(req.headers).forEach(([key, value]) => {
      if (checkString(key) || checkString(value)) {
        securityEvents.suspiciousPatterns.push('suspicious_headers');
        securityEvents.suspiciousHeaders.push({ key, value });
      }
    });
  };

  // Check for suspicious User-Agent
  const checkUserAgent = () => {
    const userAgent = req.headers['user-agent'] || '';
    const suspiciousUserAgents = [
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /masscan/i,
      /zap/i,
      /burp/i,
      /w3af/i,
      /havij/i,
      /acunetix/i,
      /nessus/i,
      /openvas/i,
      /scanner/i,
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i
    ];

    if (suspiciousUserAgents.some(pattern => pattern.test(userAgent))) {
      securityEvents.suspiciousUserAgent = true;
    }
  };

  // Check for suspicious IP patterns
  const checkSuspiciousIP = () => {
    const ip = req.ip || req.connection.remoteAddress;
    // Add logic to check against known malicious IP ranges
    // This is a simplified example
    if (ip && (ip.startsWith('127.0.0.1') || ip.startsWith('192.168.'))) {
      // Local IPs are generally safe, but could be flagged in production
      if (process.env.NODE_ENV === 'production') {
        securityEvents.suspiciousIP = true;
      }
    }
  };

  // Enhanced request logging
  const logSecurityEvent = async () => {
    const duration = Date.now() - startTime;
    const hasSuspiciousActivity = 
      securityEvents.suspiciousPatterns.length > 0 ||
      securityEvents.suspiciousUserAgent ||
      securityEvents.suspiciousIP ||
      securityEvents.suspiciousHeaders.length > 0;

    if (hasSuspiciousActivity) {
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
      const securityLog = {
        request_id: requestId,
        requestId, // Keep for backward compatibility
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        method: req.method,
        url: req.url,
        headers: sanitizeHeaders(req.headers),
        query: sanitizeData(req.query, sensitiveFields),
        body: sanitizeData(req.body, sensitiveFields),
        securityEvents,
        duration,
        statusCode: res.statusCode
      };

      // Log to security monitoring system
      logger.warn('Security event detected', securityLog);

      // Store in database for analysis
      try {
        await dbManager.query(`
          INSERT INTO security_events (event_type, details, ip_address, user_agent, created_at)
          VALUES ($1, $2, $3, $4, NOW())
        `, [
          'suspicious_activity',
          JSON.stringify(securityLog),
          req.ip || req.connection.remoteAddress,
          req.headers['user-agent']
        ]);
      } catch (error) {
        logger.error('Failed to store security event:', error);
      }
    }
  };

  // Run security checks
  checkSuspiciousPatterns();
  checkUserAgent();
  checkSuspiciousIP();

  // Add security events to request object
  req.securityEvents = securityEvents;

  // Override res.end to capture response status
  const originalEnd = res.end;
  res.end = function(...args) {
    logSecurityEvent().catch(error => {
      logger.error('Security audit logging failed:', error);
    });
    return originalEnd.apply(this, args);
  };

  next();
};

/**
 * Rate Limit Violation Handler
 */
export const handleRateLimitViolation = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || `rate-limit-${Date.now()}`;
  
  logger.warn('Rate limit exceeded', {
    request_id: requestId,
    requestId, // Keep for backward compatibility
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Store rate limit violation
  dbManager.query(`
    INSERT INTO security_events (event_type, details, ip_address, user_agent, created_at)
    VALUES ($1, $2, $3, $4, NOW())
  `, [
    'rate_limit_exceeded',
    JSON.stringify({
      requestId,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    }),
    req.ip || req.connection.remoteAddress,
    req.headers['user-agent']
  ]).catch(error => {
    logger.error('Failed to store rate limit violation:', error);
  });

  next();
};

/**
 * Authentication Failure Handler
 */
export const handleAuthFailure = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || `auth-fail-${Date.now()}`;
  
  logger.warn('Authentication failure', {
    request_id: requestId,
    requestId, // Keep for backward compatibility
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Store authentication failure
  dbManager.query(`
    INSERT INTO security_events (event_type, details, ip_address, user_agent, created_at)
    VALUES ($1, $2, $3, $4, NOW())
  `, [
    'authentication_failure',
    JSON.stringify({
      requestId,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    }),
    req.ip || req.connection.remoteAddress,
    req.headers['user-agent']
  ]).catch(error => {
    logger.error('Failed to store authentication failure:', error);
  });

  next();
};

function sanitizeHeaders(headers = {}) {
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
  const sanitized = { ...headers };

  for (const header of sensitiveHeaders) {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  }

  return sanitized;
}

function sanitizeData(data, sensitiveFields = []) {
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
}

export default securityAuditMiddleware;
