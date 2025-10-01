// server/middleware/securityEventMiddleware.js
/**
 * Enhanced Security Event Middleware
 * Captures and monitors security events with error monitoring integration
 */

import loggingService from '../src/services/loggingService.js';
import { alertingService } from '../src/services/alertingService.js';
import { metrics } from '../src/utils/tokenHelper.js';

/**
 * Security event tracking middleware
 */
export function securityEventTracker() {
  return (req, res, next) => {
    // Track security-related request patterns
    const securityContext = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      method: req.method,
      path: req.path,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString()
    };

    // Monitor for suspicious patterns
    if (isSuspiciousRequest(req)) {
      logSecurityEvent('suspicious_request', securityContext, {
        suspicious_patterns: detectSuspiciousPatterns(req),
        severity: 'medium'
      });
    }

    // Monitor authentication attempts
    if (isAuthEndpoint(req.path)) {
      trackAuthenticationAttempt(req, securityContext);
    }

    // Monitor for potential injection attacks
    if (hasPotentialInjection(req)) {
      logSecurityEvent('potential_injection', securityContext, {
        injection_type: detectInjectionType(req),
        severity: 'high'
      });
    }

    next();
  };
}

/**
 * Enhanced authentication failure tracking
 */
export function authenticationFailureTracker() {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Check for authentication failure responses
      if (res.statusCode === 401 || res.statusCode === 403) {
        handleAuthenticationFailure(req, res, {
          statusCode: res.statusCode,
          endpoint: req.originalUrl,
          method: req.method
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
}

/**
 * Rate limiting event tracker
 */
export function rateLimitEventTracker() {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Check for rate limit responses (429)
      if (res.statusCode === 429) {
        handleRateLimitEvent(req, res);
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
}

/**
 * CSRF protection event tracker
 */
export function csrfEventTracker() {
  return (req, res, next) => {
    // Check for CSRF token validation
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const csrfToken = req.get('X-CSRF-Token') || req.body?._csrf;
      
      if (!csrfToken && requiresCSRFProtection(req.path)) {
        logSecurityEvent('csrf_missing_token', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          correlationId: req.correlationId
        }, {
          severity: 'medium'
        });
      }
    }
    
    next();
  };
}

/**
 * Security header validation middleware
 */
export function securityHeaderValidator() {
  return (req, res, next) => {
    const securityHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options', 
      'X-XSS-Protection',
      'Strict-Transport-Security'
    ];

    // Validate security headers in response
    const originalSend = res.send;
    res.send = function(data) {
      const missingHeaders = securityHeaders.filter(header => 
        !res.getHeader(header)
      );
      
      if (missingHeaders.length > 0) {
        loggingService.logSecurity('Missing security headers detected', {
          endpoint: req.originalUrl,
          missingHeaders,
          correlationId: req.correlationId
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
}

/**
 * Content Security Policy violation tracker
 */
export function cspViolationTracker() {
  return (req, res, next) => {
    if (req.path === '/csp-report' && req.method === 'POST') {
      handleCSPViolation(req.body, req);
    }
    
    next();
  };
}

// Helper Functions

function isSuspiciousRequest(req) {
  const suspiciousPatterns = [
    /\.\./,              // Path traversal
    /<script/i,          // XSS attempts
    /union.*select/i,    // SQL injection
    /eval\(/i,           // Code injection
    /javascript:/i,      // JavaScript protocol
    /%00/,               // Null bytes
    /\bwget\b|\bcurl\b/i // Command injection
  ];
  
  const testString = `${req.originalUrl} ${JSON.stringify(req.query)} ${JSON.stringify(req.body)}`;
  
  return suspiciousPatterns.some(pattern => pattern.test(testString));
}

function detectSuspiciousPatterns(req) {
  const patterns = [];
  const testString = `${req.originalUrl} ${JSON.stringify(req.query)} ${JSON.stringify(req.body)}`;
  
  if (/\.\./.test(testString)) patterns.push('path_traversal');
  if (/<script/i.test(testString)) patterns.push('xss_attempt');
  if (/union.*select/i.test(testString)) patterns.push('sql_injection');
  if (/eval\(/i.test(testString)) patterns.push('code_injection');
  
  return patterns;
}

function isAuthEndpoint(path) {
  const authPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/users/login',
    '/api/admin/login'
  ];
  
  return authPaths.some(authPath => path.startsWith(authPath));
}

function trackAuthenticationAttempt(req, securityContext) {
  loggingService.logSecurity('Authentication attempt', {
    ...securityContext,
    endpoint: req.originalUrl,
    hasCredentials: !!(req.body?.username || req.body?.email || req.body?.password)
  });
}

function hasPotentialInjection(req) {
  const injectionPatterns = [
    /['";].*--/,                    // SQL comment injection
    /union.*select.*from/i,         // SQL union injection
    /<script.*?>.*?<\/script>/i,    // Script injection
    /javascript:/i,                 // JavaScript protocol injection
    /on\w+\s*=/i,                  // Event handler injection
    /eval\s*\(/i,                  // Eval injection
    /exec\s*\(/i                   // Exec injection
  ];
  
  const testString = `${req.originalUrl} ${JSON.stringify(req.query)} ${JSON.stringify(req.body)}`;
  
  return injectionPatterns.some(pattern => pattern.test(testString));
}

function detectInjectionType(req) {
  const testString = `${req.originalUrl} ${JSON.stringify(req.query)} ${JSON.stringify(req.body)}`;
  
  if (/union.*select/i.test(testString)) return 'sql_injection';
  if (/<script/i.test(testString)) return 'xss_injection';
  if (/eval\(/i.test(testString)) return 'code_injection';
  if (/javascript:/i.test(testString)) return 'protocol_injection';
  
  return 'unknown_injection';
}

function handleAuthenticationFailure(req, res, context) {
  // Update authentication failure metrics
  metrics.auth_failures = (metrics.auth_failures || 0) + 1;
  
  // Log security event
  logSecurityEvent('authentication_failure', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    endpoint: context.endpoint,
    method: context.method,
    correlationId: req.correlationId
  }, {
    statusCode: context.statusCode,
    severity: 'medium'
  });
  
  // Check for brute force patterns
  checkBruteForcePattern(req.ip, req.get('User-Agent'));
}

function handleRateLimitEvent(req, res) {
  // Update rate limit metrics
  metrics.rate_limit_exceeded = (metrics.rate_limit_exceeded || 0) + 1;
  
  // Log security event
  logSecurityEvent('rate_limit_exceeded', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    endpoint: req.originalUrl,
    correlationId: req.correlationId
  }, {
    severity: 'medium'
  });
}

function handleCSPViolation(violationReport, req) {
  loggingService.logSecurity('CSP violation detected', {
    violation: violationReport,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    correlationId: req.correlationId
  });
  
  // Check if violation indicates attack
  if (isCSPAttackPattern(violationReport)) {
    logSecurityEvent('csp_attack_detected', {
      ip: req.ip,
      violatedDirective: violationReport['violated-directive'],
      blockedURI: violationReport['blocked-uri']
    }, {
      severity: 'high'
    });
  }
}

function isCSPAttackPattern(report) {
  const attackIndicators = [
    'javascript:',
    'data:',
    'eval',
    'inline'
  ];
  
  const blockedURI = report['blocked-uri'] || '';
  return attackIndicators.some(indicator => blockedURI.includes(indicator));
}

function requiresCSRFProtection(path) {
  const protectedPaths = [
    '/api/admin/',
    '/api/users/',
    '/api/auth/'
  ];
  
  return protectedPaths.some(protectedPath => path.startsWith(protectedPath));
}

function checkBruteForcePattern(ip, userAgent) {
  // This would implement brute force detection logic
  // For now, it's a placeholder for more sophisticated detection
  loggingService.logSecurity('Brute force check', {
    ip,
    userAgent,
    timestamp: new Date().toISOString()
  });
}

function logSecurityEvent(eventType, context, metadata = {}) {
  const securityEvent = {
    type: eventType,
    timestamp: new Date().toISOString(),
    context,
    metadata,
    severity: metadata.severity || 'medium'
  };
  
  // Log to security logger
  loggingService.logSecurity(`Security event: ${eventType}`, securityEvent);
  
  // Check if event should trigger an alert
  checkSecurityEventAlert(securityEvent);
}

function checkSecurityEventAlert(event) {
  const criticalEvents = [
    'potential_injection',
    'csp_attack_detected',
    'brute_force_detected'
  ];
  
  const warningEvents = [
    'suspicious_request',
    'authentication_failure',
    'rate_limit_exceeded',
    'csrf_missing_token'
  ];
  
  if (criticalEvents.includes(event.type)) {
    alertingService.processAlert(alertingService.createAlert(
      'critical',
      'security',
      `Critical security event: ${event.type}`,
      event.timestamp
    ));
  } else if (warningEvents.includes(event.type)) {
    alertingService.processAlert(alertingService.createAlert(
      'warning',
      'security',
      `Security event: ${event.type}`,
      event.timestamp
    ));
  }
}

export default {
  securityEventTracker,
  authenticationFailureTracker,
  rateLimitEventTracker,
  csrfEventTracker,
  securityHeaderValidator,
  cspViolationTracker
};