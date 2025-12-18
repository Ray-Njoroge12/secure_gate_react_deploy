// server/src/middleware/securityHeadersMiddleware.js
import helmet from 'helmet';
import securityConfig from '../config/securityConfig.js';
import securityMonitoringService from '../services/securityMonitoringService.js';
import logger from '../config/logger.js';

/**
 * Enhanced Security Headers Middleware
 * Implements comprehensive OWASP security headers with environment-specific configurations
 */

const {
  cspDirectives,
  hstsConfig,
  permissionsPolicy,
  securityHeaders,
  environmentConfig,
  allowedContentTypes,
  requestLimits
} = securityConfig;

/**
 * CSP Violation Reporting Handler
 */
export const handleCSPViolation = async (req, res, next) => {
  try {
    const violation = req.body;

    // Log CSP violation for security monitoring
    await securityMonitoringService.logCSPViolation(violation, req);

    // Return empty response to browser
    res.status(204).end();

  } catch (error) {
    logger.error('Error handling CSP violation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Main Helmet Configuration
 * Uses centralized security configuration
 */
export const enhancedHelmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: cspDirectives,
    reportOnly: environmentConfig.cspReportOnly,
    useDefaults: false
  },

  // HTTP Strict Transport Security (HSTS)
  hsts: environmentConfig.strictTransportSecurity ? {
    maxAge: hstsConfig.maxAge,
    includeSubDomains: hstsConfig.includeSubDomains,
    preload: hstsConfig.preload
  } : false,

  // X-Frame-Options - Prevent clickjacking
  frameguard: {
    action: securityHeaders.frameOptions.toLowerCase()
  },

  // X-Content-Type-Options - Prevent MIME sniffing
  noSniff: true,

  // X-XSS-Protection - Enable XSS filtering (legacy browsers)
  xssFilter: true,

  // Referrer Policy - Control referrer information
  referrerPolicy: {
    policy: securityHeaders.referrerPolicy
  },

  // X-Download-Options - Prevent IE from executing downloads
  ieNoOpen: true,

  // X-DNS-Prefetch-Control - Control DNS prefetching
  dnsPrefetchControl: {
    allow: false
  },

  // Cross-Origin-Embedder-Policy
  crossOriginEmbedderPolicy: false, // Allow embedding for QR codes and file uploads

  // Cross-Origin-Opener-Policy
  crossOriginOpenerPolicy: {
    policy: securityHeaders.crossOriginOpenerPolicy
  },

  // Cross-Origin-Resource-Policy
  crossOriginResourcePolicy: {
    policy: securityHeaders.crossOriginResourcePolicy
  },

  // Permissions Policy (formerly Feature Policy)
  permissionsPolicy: permissionsPolicy,

  // Hide X-Powered-By header
  hidePoweredBy: true
});

/**
 * Custom Security Headers Middleware
 * Additional security headers not covered by Helmet
 */
export const customSecurityHeaders = (req, res, next) => {
  try {
    // Add custom security headers
    res.set({
      // Prevent browsers from MIME-type sniffing
      'X-Content-Type-Options': securityHeaders.contentTypeOptions,

      // Control referrer information
      'Referrer-Policy': securityHeaders.referrerPolicy,

      // Cross-Origin policies
      'Cross-Origin-Opener-Policy': securityHeaders.crossOriginOpenerPolicy,
      'Cross-Origin-Resource-Policy': securityHeaders.crossOriginResourcePolicy,

      // Additional security headers
      'X-Permitted-Cross-Domain-Policies': 'none',

      // Server information hiding
      'Server': 'SecureGate'
    });

    // Cache control for sensitive responses
    if (req.path.includes('/api/auth/') ||
        req.path.includes('/api/admin/') ||
        req.path.includes('/api/security/')) {
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
    }

    // Add request ID for tracking
    if (!req.headers['x-request-id']) {
      req.headers['x-request-id'] = generateRequestId();
    }
    res.set('X-Request-ID', req.headers['x-request-id']);

    next();
  } catch (error) {
    logger.error('Error in custom security headers middleware:', error);
    next(error);
  }
};

/**
 * Enhanced Content Type Validation Middleware
 * Validate request content types using centralized configuration
 */
export const contentTypeValidation = (req, res, next) => {
  try {
    console.log(`🔍 [contentTypeValidation] Method: ${req.method}, Path: ${req.path}`);

    // Skip validation for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      console.log(`🔍 [contentTypeValidation] Skipping validation for ${req.method} request`);
      return next();
    }

    console.log(`🔍 [contentTypeValidation] Processing ${req.method} request validation`);

    const contentType = req.get('Content-Type');

    if (!contentType) {
      console.warn(`⚠️ [contentTypeValidation] Missing Content-Type for ${req.method} ${req.path}`);

      return res.status(400).json({
        error: 'Content-Type header is required'
      });
    }

    // Check if content type is allowed using centralized config
    const isAllowed = allowedContentTypes.some(type =>
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isAllowed) {
      console.warn(`⚠️ [contentTypeValidation] Unsupported Content-Type: ${contentType} for ${req.method} ${req.path}`);

      return res.status(415).json({
        error: 'Unsupported Media Type',
        allowed: allowedContentTypes
      });
    }

    console.log(`✅ [contentTypeValidation] Content-Type validation passed for ${req.method} ${req.path}`);
    next();
  } catch (error) {
    console.error('❌ [contentTypeValidation] Error in content type validation:', error);
    logger.error('Error in content type validation:', error);
    next(error);
  }
};

/**
 * Enhanced Request Size Limitation
 * Uses centralized configuration and security monitoring
 */
export const requestSizeLimit = (req, res, next) => {
  try {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const contentType = req.get('Content-Type') || '';

    // Determine size limit based on content type
    let maxSize = 1024 * 1024; // Default 1MB

    if (contentType.includes('application/json')) {
      maxSize = parseSize(requestLimits.json);
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      maxSize = parseSize(requestLimits.urlencoded);
    } else if (contentType.includes('multipart/form-data')) {
      maxSize = parseSize(requestLimits.fileUpload);
    } else if (contentType.includes('text/')) {
      maxSize = parseSize(requestLimits.text);
    }

    if (contentLength > maxSize) {
      // Log security event
      securityMonitoringService.logSecurityEvent({
        type: 'MALFORMED_REQUEST',
        severity: 'medium',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        details: {
          contentLength,
          maxSize,
          contentType,
          reason: 'Request too large'
        }
      });

      return res.status(413).json({
        error: 'Payload Too Large',
        maxSize: formatSize(maxSize),
        received: formatSize(contentLength)
      });
    }

    next();
  } catch (error) {
    logger.error('Error in request size limit middleware:', error);
    next(error);
  }
};

/**
 * Security Response Middleware
 * Adds security-related response headers and monitoring
 */
export const securityResponseMiddleware = (req, res, next) => {
  try {
    const startTime = Date.now();

    // Override res.json to add security headers
    const originalJson = res.json;
    res.json = function(data) {
      // Add security headers for API responses
      this.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
      });

      return originalJson.call(this, data);
    };

    // Log response time and status
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;

      // Log slow responses as potential security events
      if (responseTime > 5000) { // 5 seconds
        securityMonitoringService.logSecurityEvent({
          type: 'SUSPICIOUS_ACTIVITY',
          severity: 'low',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.path,
          method: req.method,
          details: {
            responseTime,
            statusCode: res.statusCode,
            reason: 'Slow response time'
          }
        });
      }
    });

    next();
  } catch (error) {
    logger.error('Error in security response middleware:', error);
    next(error);
  }
};

/**
 * Security Event Logger Middleware
 * Logs security-related request events
 */
export const securityEventLogger = (req, res, next) => {
  try {
    // Log requests to sensitive endpoints
    const sensitiveEndpoints = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/reset-password',
      '/api/admin',
      '/api/security'
    ];

    const isSensitive = sensitiveEndpoints.some(endpoint =>
      req.path.startsWith(endpoint)
    );

    if (isSensitive && environmentConfig.debugHeaders) {
      logger.info('Sensitive endpoint access', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        referer: req.get('Referer'),
        timestamp: new Date().toISOString()
      });
    }

    next();
  } catch (error) {
    logger.error('Error in security event logger:', error);
    next(error);
  }
};

/**
 * Security Middleware Stack
 * Combines all security middleware in the correct order
 */
export const securityMiddlewareStack = [
  enhancedHelmetConfig,
  customSecurityHeaders,
  contentTypeValidation,
  requestSizeLimit,
  securityResponseMiddleware,
  securityEventLogger
];

/**
 * Utility functions
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

function parseSize(size) {
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };

  const match = size.toString().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';

  return Math.floor(value * units[unit]);
}

function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export default {
  enhancedHelmetConfig,
  customSecurityHeaders,
  contentTypeValidation,
  requestSizeLimit,
  securityResponseMiddleware,
  securityEventLogger,
  securityMiddlewareStack,
  handleCSPViolation
};