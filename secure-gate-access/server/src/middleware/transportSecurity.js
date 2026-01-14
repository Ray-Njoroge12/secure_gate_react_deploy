/**
 * Transport Security Middleware
 *
 * Provides comprehensive transport layer security including:
 * - HTTPS enforcement and redirection
 * - Secure cookie configuration
 * - HSTS (HTTP Strict Transport Security) headers
 * - Certificate pinning headers
 * - TLS security headers
 * - Protocol security validations
 */

import auditLogger from '../services/auditLogger.js';
import { getCookieOptions } from '../utils/cookies.js';

/**
 * HTTPS Enforcement Middleware
 * Redirects HTTP requests to HTTPS in production
 */
export const httpsEnforcement = (req, res, next) => {
  // Skip in development or if already HTTPS
  if (process.env.NODE_ENV !== 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https') {
    return next();
  }

  // Log HTTP access attempts in production (with error handling)
  if (process.env.ENFORCE_HTTPS === 'true') {
    try {
      auditLogger.logSecurityEvent('security.http_access_attempt', {
        originalUrl: req.originalUrl,
        method: req.method,
        redirected: true
      }, {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.id
      });
    } catch (error) {
      console.warn('Failed to log HTTP access attempt:', error.message);
    }

    // Permanent redirect to HTTPS
    const httpsUrl = `https://${req.get('host')}${req.originalUrl}`;
    return res.redirect(301, httpsUrl);
  }

  next();
};

/**
 * Secure Transport Headers Middleware
 * Adds comprehensive transport security headers
 */
export const transportSecurityHeaders = (req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

  // HTTP Strict Transport Security (HSTS)
  if (isHttps || isProduction) {
    // HSTS with 2-year max-age, includeSubDomains, and preload
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  // Upgrade Insecure Requests
  if (process.env.ENFORCE_HTTPS === 'true') {
    res.setHeader('Content-Security-Policy', 'upgrade-insecure-requests');
  }

  // Protocol security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Feature Policy / Permissions Policy
  res.setHeader('Permissions-Policy', [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'magnetometer=()',
    'gyroscope=()',
    'fullscreen=(self)',
    'payment=()'
  ].join(', '));

  // Cross-Origin Policies
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  next();
};

/**
 * Secure Cookie Configuration Middleware
 * Ensures all cookies are set with secure attributes
 */
export const secureCookieConfig = (req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const baseOptions = getCookieOptions();

  // Override res.cookie to add security attributes
  const originalCookie = res.cookie.bind(res);

  res.cookie = function(name, value, options = {}) {
    // Default secure cookie options
    const secureOptions = {
      ...baseOptions,
      ...options,
      httpOnly: options.httpOnly !== false,
      secure: options.secure ?? ((isProduction && process.env.SECURE_COOKIES === 'true') || isHttps),
      sameSite: options.sameSite ?? baseOptions.sameSite,
      domain: options.domain ?? baseOptions.domain,
      path: options.path ?? baseOptions.path
    };

    // Add security validations
    if (isProduction) {
      // Ensure secure flag in production
      if (secureOptions.secure !== true && isHttps) {
        console.warn(`🔐 Security Warning: Cookie '${name}' should be secure in production`);
      }

      // Validate SameSite attribute
      if (!['strict', 'lax', 'none'].includes(secureOptions.sameSite)) {
        console.warn(`🔐 Security Warning: Cookie '${name}' has invalid SameSite value`);
        secureOptions.sameSite = 'strict';
      }

      // Audit cookie setting for sensitive cookies (with error handling)
      if (['refreshToken', 'sessionId', 'authToken'].includes(name)) {
        try {
          auditLogger.logSecurityEvent('security.secure_cookie_set', {
            cookieName: name,
            secure: secureOptions.secure,
            httpOnly: secureOptions.httpOnly,
            sameSite: secureOptions.sameSite
          }, {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestId: req.id
        });
        } catch (error) {
          console.warn('Failed to log security event for cookie:', error.message);
        }
      }
    }

    return originalCookie(name, value, secureOptions);
  };

  next();
};

/**
 * Certificate Transparency and Pinning Headers
 * Adds certificate validation headers for enhanced security
 */
export const certificateSecurityHeaders = (req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Certificate Transparency (Expect-CT)
    // This header is deprecated but still useful for older browsers
    res.setHeader('Expect-CT', 'max-age=86400, enforce');

    // Public Key Pinning (HPKP) - Use with extreme caution
    // Only enable if you have proper backup pins and processes
    if (process.env.ENABLE_HPKP === 'true' && process.env.HPKP_PINS) {
      const pins = process.env.HPKP_PINS.split(',');
      const maxAge = process.env.HPKP_MAX_AGE || '300'; // 5 minutes default for safety

      if (pins.length >= 2) { // Minimum 2 pins required
        const pinHeader = pins.map(pin => `pin-sha256="${pin}"`).join('; ');
        res.setHeader('Public-Key-Pins', `${pinHeader}; max-age=${maxAge}; includeSubDomains`);
      }
    }
  }

  next();
};

/**
 * TLS Security Validation Middleware
 * Validates and logs TLS connection security
 */
export const tlsSecurityValidation = (req, res, next) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

  // Log TLS information for security monitoring
  if (isHttps && req.connection && req.connection.getPeerCertificate) {
    try {
      const cert = req.connection.getPeerCertificate();
      const cipher = req.connection.getCipher();

      // Log TLS details for security analysis
      if (cipher && cipher.version) {
        try {
          auditLogger.logSecurityEvent('security.tls_connection', {
            tlsVersion: cipher.version,
            cipherName: cipher.name,
            certificateValid: cert && !cert.valid_from || new Date(cert.valid_from) <= new Date(),
            certificateExpiry: cert ? cert.valid_to : null
          }, {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            requestId: req.id
          });
        } catch (error) {
          console.warn('Failed to log TLS connection event:', error.message);
        }
      }
    } catch (error) {
      // TLS information may not be available in all environments
      // This is normal for reverse proxy setups
    }
  }

  next();
};

/**
 * Mixed Content Prevention Middleware
 * Prevents mixed HTTP/HTTPS content issues
 */
export const mixedContentPrevention = (req, res, next) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

  if (isHttps || process.env.ENFORCE_HTTPS === 'true') {
    // Block mixed content by default
    const currentCSP = res.getHeader('Content-Security-Policy') || '';

    if (!currentCSP.includes('block-all-mixed-content')) {
      // Add mixed content blocking to existing CSP
      const updatedCSP = currentCSP + (currentCSP ? '; ' : '') + 'block-all-mixed-content';
      res.setHeader('Content-Security-Policy', updatedCSP);
    }
  }

  next();
};

/**
 * Protocol Downgrade Attack Prevention
 * Prevents SSL/TLS downgrade attacks
 */
export const protocolDowngradeProtection = (req, res, next) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const isProduction = process.env.NODE_ENV === 'production';

  // Check for potential downgrade attacks in production
  if (isProduction && !isHttps && req.headers['x-forwarded-proto'] !== 'https') {
    // Log potential downgrade attack
    try {
      auditLogger.logSecurityEvent('security.protocol_downgrade_attempt', {
        expectedProtocol: 'https',
        actualProtocol: 'http',
        forwardedProto: req.headers['x-forwarded-proto'],
        userAgent: req.get('User-Agent')
      }, {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.id
      });
    } catch (error) {
      console.warn('Failed to log protocol downgrade attempt:', error.message);
    }

    // Force HTTPS if enforcement is enabled
    if (process.env.ENFORCE_HTTPS === 'true') {
      return res.status(426).json({
        error: 'Upgrade Required',
        message: 'HTTPS is required for this service',
        upgradeRequired: 'TLS/1.2'
      });
    }
  }

  next();
};

/**
 * Transport Security Configuration Validator
 * Validates transport security settings at startup
 */
export const validateTransportSecurity = () => {
  const issues = [];
  const warnings = [];

  // Check HTTPS enforcement
  if (process.env.NODE_ENV === 'production') {
    if (process.env.ENFORCE_HTTPS !== 'true' && !process.env.ALLOW_HTTP_IN_PRODUCTION) {
      issues.push('ENFORCE_HTTPS should be "true" in production');
    }

    if (process.env.SECURE_COOKIES !== 'true') {
      warnings.push('SECURE_COOKIES should be "true" in production');
    }

    // Check HSTS configuration
    if (!process.env.HSTS_MAX_AGE) {
      warnings.push('HSTS_MAX_AGE not configured - using default');
    } else {
      const maxAge = parseInt(process.env.HSTS_MAX_AGE);
      if (maxAge < 31536000) { // 1 year minimum recommended
        warnings.push('HSTS_MAX_AGE should be at least 31536000 (1 year)');
      }
    }

    // Check certificate pinning
    if (process.env.ENABLE_HPKP === 'true') {
      if (!process.env.HPKP_PINS) {
        issues.push('HPKP_PINS required when ENABLE_HPKP is true');
      } else {
        const pins = process.env.HPKP_PINS.split(',');
        if (pins.length < 2) {
          issues.push('HPKP requires at least 2 pins for safety');
        }
      }
    }
  }

  return { issues, warnings };
};

/**
 * Complete transport security middleware stack
 */
export const transportSecurityStack = [
  httpsEnforcement,
  transportSecurityHeaders,
  secureCookieConfig,
  certificateSecurityHeaders,
  tlsSecurityValidation,
  mixedContentPrevention,
  protocolDowngradeProtection
];

/**
 * Initialize transport security with validation
 */
export const initializeTransportSecurity = () => {
  const validation = validateTransportSecurity();

  if (validation.issues.length > 0) {
    console.error('🚨 Transport Security Issues:');
    validation.issues.forEach(issue => console.error(`   ❌ ${issue}`));

    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 Production deployment blocked due to transport security issues');
      process.exit(1);
    }
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️ Transport Security Warnings:');
    validation.warnings.forEach(warning => console.warn(`   ⚠️ ${warning}`));
  }

  console.log('🔒 Transport security initialized');
  console.log(`   HTTPS Enforcement: ${process.env.ENFORCE_HTTPS === 'true' ? '✅' : '❌'}`);
  console.log(`   Secure Cookies: ${process.env.SECURE_COOKIES === 'true' ? '✅' : '❌'}`);
  console.log(`   HSTS Enabled: ${process.env.NODE_ENV === 'production' ? '✅' : '⚠️ (dev mode)'}`);

  return validation;
};
