import helmet from 'helmet';
import { randomBytes } from 'crypto';
import securityConfig from '../config/securityConfig.js';
import securityMonitoringService from '../services/securityMonitoringService.js';
import logger from '../config/logger.js';
import { errorResponse } from '../utils/responseFormatter.js';
import loggingService from '../services/loggingService.js';

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
 * Generate unique nonce for each request (prevents XSS)
 */
export const generateNonce = (req, res, next) => {
  res.locals.nonce = randomBytes(16).toString('base64');
  res.locals.cspNonce = res.locals.nonce;
  next();
};

/**
 * Main Helmet Configuration
 * Dynamically generated to support nonces in CSP
 */
export const enhancedSecurityMiddleware = (req, res, next) => {
  const nonce = res.locals.nonce;

  // Create dynamic Helmet instance to inject nonce
  const helmetMiddleware = helmet({
    contentSecurityPolicy: {
      directives: {
        ...cspDirectives,
        scriptSrc: cspDirectives.scriptSrc.map(s => typeof s === 'function' ? s(req, res) : s),
        styleSrc: cspDirectives.styleSrc.map(s => typeof s === 'function' ? s(req, res) : s)
      },
      reportOnly: environmentConfig.cspReportOnly,
      useDefaults: false
    },
    hsts: environmentConfig.strictTransportSecurity ? hstsConfig : false,
    frameguard: { action: securityHeaders.frameOptions.toLowerCase() },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: securityHeaders.referrerPolicy },
    ieNoOpen: true,
    dnsPrefetchControl: { allow: false },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: securityHeaders.crossOriginOpenerPolicy },
    crossOriginResourcePolicy: { policy: securityHeaders.crossOriginResourcePolicy },
    permissionsPolicy: permissionsPolicy,
    hidePoweredBy: true
  });

  helmetMiddleware(req, res, next);
};

/**
 * Custom Security Headers (Non-Helmet)
 * Handles custom cache policies and Request-ID attribution
 */
export const customSecurityHeaders = (req, res, next) => {
  const isSensitive = req.path.includes('/api/auth/') || req.path.includes('/api/admin/') || req.path.includes('/api/security/');

  res.set({
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Server': 'SecureGate',
    ...(isSensitive && {
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    })
  });

  // Request ID consistency
  const requestId = req.requestId || req.id || req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  req.requestId = requestId;
  res.set('X-Request-ID', requestId);

  next();
};

/**
 * CSRF Protection
 */
export const csrfProtection = (req, res, next) => {
  if (process.env.NODE_ENV === 'test' || (process.env.NODE_ENV === 'development' && process.env.DISABLE_CSRF === 'true')) {
    return next();
  }

  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const publicEndpoints = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/health', '/api/public'];
  if (publicEndpoints.some(endpoint => req.path.startsWith(endpoint))) return next();

  const token = req.headers['x-csrf-token'] || req.headers['csrf-token'] || req.body?._csrf || req.cookies?.['csrf-token'];
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    loggingService.logSecurity('warn', 'CSRF validation failed', { statusCode: 403, method: req.method, path: req.path });
    return errorResponse(res, 'Invalid or missing CSRF token', 'CSRF_VALIDATION_FAILED', 403, null, req);
  }

  next();
};

/**
 * Generate CSRF Token for session
 */
export const csrfTokenGenerator = (req, res, next) => {
  if (req.session && !req.session.csrfToken) {
    req.session.csrfToken = randomBytes(32).toString('hex');
  }
  if (req.session?.csrfToken) {
    res.setHeader('X-CSRF-Token', req.session.csrfToken);
  }
  next();
};

export default {
  generateNonce,
  enhancedSecurityMiddleware,
  customSecurityHeaders,
  csrfProtection,
  csrfTokenGenerator
};

