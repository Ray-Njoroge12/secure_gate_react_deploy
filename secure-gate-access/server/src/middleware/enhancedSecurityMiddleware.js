/**
 * Enhanced Security Middleware
 * 
 * Provides middleware functions for enforcing additional authentication,
 * comprehensive access logging, and automated security monitoring.
 */

import { enhancedSecurityService } from '../services/enhancedSecurityService.js';
import loggingService from '../services/loggingService.js';
import { errorResponse } from '../utils/responseUtils.js';

/**
 * Middleware to require additional authentication for sensitive operations
 */
export const requireAdditionalAuth = (operation, options = {}) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'Authentication required', 'AUTH_REQUIRED', 401);
      }

      // Check if additional auth is required for this operation
      const authRequired = await enhancedSecurityService.requireAdditionalAuth(
        userId,
        operation,
        {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
          ...options.context
        }
      );

      if (authRequired.required) {
        // Check if additional auth has been provided
        const additionalAuthHeader = req.headers['x-additional-auth'];
        if (!additionalAuthHeader) {
          return res.status(202).json({
            success: false,
            message: 'Additional authentication required',
            additionalAuth: {
              sessionId: authRequired.sessionId,
              factors: authRequired.factors,
              expiresAt: authRequired.expiresAt
            }
          });
        }

        // Verify additional authentication
        try {
          const authData = JSON.parse(additionalAuthHeader);
          const verification = await enhancedSecurityService.verifyAdditionalAuth(
            authData.sessionId,
            authRequired.factors,
            authData.factors
          );

          if (!verification.success) {
            return errorResponse(res, 'Additional authentication failed', 'ADDITIONAL_AUTH_FAILED', 403);
          }

          // Log successful additional authentication
          await enhancedSecurityService.logSecurityEvent({
            type: 'additional_auth_success',
            userId,
            operation,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date(),
            severity: 'low'
          });

        } catch (error) {
          return errorResponse(res, 'Invalid additional authentication data', 'INVALID_ADDITIONAL_AUTH', 400);
        }
      }

      next();
    } catch (error) {
      loggingService.logError('Additional authentication middleware error', error, {
        operation,
        userId: req.user?.id,
        path: req.path
      });
      return errorResponse(res, 'Security check failed', 'SECURITY_CHECK_FAILED', 500);
    }
  };
};

/**
 * Middleware for comprehensive security event logging
 */
export const logSecurityEvent = (eventType, options = {}) => {
  return async (req, res, next) => {
    const startTime = Date.now();

    // Capture original response methods
    const originalSend = res.send;
    const originalJson = res.json;

    // Override response methods to capture response data
    res.send = function (data) {
      logResponseEvent.call(this, data, 'send');
      return originalSend.call(this, data);
    };

    res.json = function (data) {
      logResponseEvent.call(this, data, 'json');
      return originalJson.call(this, data);
    };

    async function logResponseEvent(data, method) {
      try {
        const responseTime = Date.now() - startTime;
        const success = res.statusCode < 400;

        await enhancedSecurityService.logSecurityEvent({
          type: eventType,
          userId: req.user?.id,
          operation: options.operation || `${req.method} ${req.path}`,
          success,
          responseTime,
          statusCode: res.statusCode,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          referer: req.get('Referer'),
          sessionId: req.sessionID,
          requestId: req.requestId,
          timestamp: new Date(),
          severity: success ? 'low' : 'medium',
          details: {
            method: req.method,
            path: req.path,
            query: req.query,
            bodySize: req.get('Content-Length'),
            responseSize: Buffer.byteLength(JSON.stringify(data)),
            ...options.additionalDetails
          }
        });
      } catch (error) {
        loggingService.logError('Security event logging failed', error, {
          eventType,
          userId: req.user?.id,
          path: req.path
        });
      }
    }

    next();
  };
};

/**
 * Middleware for automated security incident detection
 */
export const detectSecurityIncidents = (options = {}) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next();
      }

      // Detect potential security incidents
      const incidents = await enhancedSecurityService.detectSecurityIncident(
        userId,
        options.eventType || 'api_access',
        {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
          timestamp: new Date()
        }
      );

      // Add incident information to request for downstream processing
      if (incidents.length > 0) {
        req.securityIncidents = incidents;
      }

      next();
    } catch (error) {
      loggingService.logError('Security incident detection failed', error, {
        userId: req.user?.id,
        path: req.path
      });
      next(); // Continue processing even if incident detection fails
    }
  };
};

/**
 * Middleware to enforce security policies
 */
export const enforceSecurityPolicy = (policy, options = {}) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      switch (policy) {
        case 'rate_limit_sensitive_operations':
          const rateLimitResult = await checkSensitiveOperationRateLimit(userId, req.path);
          if (!rateLimitResult.allowed) {
            await enhancedSecurityService.logSecurityEvent({
              type: 'rate_limit_exceeded',
              userId,
              operation: req.path,
              ipAddress: req.ip,
              timestamp: new Date(),
              severity: 'medium'
            });
            return errorResponse(res, 'Rate limit exceeded for sensitive operations', 'RATE_LIMIT_EXCEEDED', 429);
          }
          break;

        case 'restrict_admin_operations':
          if (userRole === 'admin' || userRole === 'super_admin') {
            const timeRestriction = await checkAdminTimeRestrictions(userId);
            if (!timeRestriction.allowed) {
              return errorResponse(res, 'Admin operations restricted during this time', 'TIME_RESTRICTION', 403);
            }
          }
          break;

        case 'require_secure_connection':
          if (!req.secure && req.get('X-Forwarded-Proto') !== 'https') {
            return errorResponse(res, 'Secure connection required', 'SECURE_CONNECTION_REQUIRED', 400);
          }
          break;

        case 'validate_session_integrity':
          const sessionValid = await validateSessionIntegrity(req);
          if (!sessionValid) {
            await enhancedSecurityService.logSecurityEvent({
              type: 'session_integrity_violation',
              userId,
              ipAddress: req.ip,
              timestamp: new Date(),
              severity: 'high'
            });
            return errorResponse(res, 'Session integrity violation detected', 'SESSION_INTEGRITY_VIOLATION', 401);
          }
          break;
      }

      next();
    } catch (error) {
      loggingService.logError('Security policy enforcement failed', error, {
        policy,
        userId: req.user?.id,
        path: req.path
      });
      return errorResponse(res, 'Security policy check failed', 'SECURITY_POLICY_FAILED', 500);
    }
  };
};

/**
 * Middleware to collect forensic information for security analysis
 */
export const collectForensicData = (options = {}) => {
  return async (req, res, next) => {
    try {
      // Collect forensic information
      const forensicData = await enhancedSecurityService.collectForensicInformation(
        {
          type: options.eventType || 'api_request',
          userId: req.user?.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date()
        },
        {
          path: req.path,
          method: req.method,
          headers: sanitizeHeaders(req.headers),
          query: req.query,
          sessionId: req.sessionID
        }
      );

      // Attach forensic data to request for downstream use
      req.forensicData = forensicData;

      next();
    } catch (error) {
      loggingService.logError('Forensic data collection failed', error, {
        userId: req.user?.id,
        path: req.path
      });
      next(); // Continue processing even if forensic collection fails
    }
  };
};

/**
 * Middleware to monitor for suspicious activity patterns
 */
export const monitorSuspiciousActivity = (options = {}) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next();
      }

      // Check for suspicious patterns
      const suspiciousPatterns = await detectSuspiciousPatterns(req, options);

      if (suspiciousPatterns.length > 0) {
        await enhancedSecurityService.logSecurityEvent({
          type: 'suspicious_activity_detected',
          userId,
          patterns: suspiciousPatterns,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date(),
          severity: 'medium',
          details: {
            path: req.path,
            method: req.method,
            patterns: suspiciousPatterns
          }
        });

        // Add suspicious activity flag to request
        req.suspiciousActivity = suspiciousPatterns;
      }

      next();
    } catch (error) {
      loggingService.logError('Suspicious activity monitoring failed', error, {
        userId: req.user?.id,
        path: req.path
      });
      next();
    }
  };
};

// Helper functions

async function checkSensitiveOperationRateLimit(userId, operation) {
  // Implement rate limiting logic for sensitive operations
  // This is a simplified implementation
  const sensitiveOperations = [
    '/api/admin/users',
    '/api/admin/settings',
    '/api/export',
    '/api/bulk-operations'
  ];

  if (!sensitiveOperations.some(op => operation.includes(op))) {
    return { allowed: true };
  }

  // Check rate limit (simplified - in production use Redis or similar)
  const key = `rate_limit:${userId}:${operation}`;
  // Implementation would check against rate limit store
  return { allowed: true }; // Placeholder
}

async function checkAdminTimeRestrictions(userId) {
  // Check if admin operations are allowed at current time
  const currentHour = new Date().getHours();
  const restrictedHours = [0, 1, 2, 3, 4, 5]; // 12 AM - 5 AM

  return { allowed: !restrictedHours.includes(currentHour) };
}

async function validateSessionIntegrity(req) {
  // Validate session integrity (simplified implementation)
  const sessionId = req.sessionID;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  if (!sessionId || !userId) {
    return false;
  }

  // In production, implement comprehensive session validation
  // Check session store, validate IP consistency, etc.
  return true; // Placeholder
}

function sanitizeHeaders(headers) {
  // Remove sensitive headers from forensic data
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  const sanitized = { ...headers };

  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });

  return sanitized;
}

async function detectSuspiciousPatterns(req, options) {
  const patterns = [];

  // Check for rapid requests
  if (options.checkRapidRequests) {
    // Implementation would check request frequency
  }

  // Check for unusual user agent
  const userAgent = req.get('User-Agent');
  if (!userAgent || userAgent.length < 10) {
    patterns.push('unusual_user_agent');
  }

  // Check for suspicious headers
  const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip'];
  if (suspiciousHeaders.some(header => req.get(header))) {
    patterns.push('proxy_headers_present');
  }

  return patterns;
}

// Composite middleware for comprehensive security
export const comprehensiveSecurityMiddleware = (operation, options = {}) => {
  return [
    collectForensicData({ eventType: 'security_check' }),
    monitorSuspiciousActivity(options),
    detectSecurityIncidents({ eventType: 'security_operation' }),
    logSecurityEvent('security_operation', { operation }),
    enforceSecurityPolicy('validate_session_integrity'),
    enforceSecurityPolicy('require_secure_connection')
  ];
};