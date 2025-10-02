/**
 * Production Rate Limiting Configuration
 * Comprehensive rate limiting for different endpoint types
 */

import rateLimit from 'express-rate-limit';

// General API rate limiting
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // More lenient in dev/test
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP + User-Agent for more granular limiting
    return `${req.ip}-${req.get('User-Agent')?.slice(0, 50) || 'unknown'}`;
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  }
});

// Authentication rate limiting (stricter)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // More lenient in dev/test
  message: {
    error: 'Too many login attempts from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `auth-${req.ip}`;
  },
  skipSuccessfulRequests: false, // Count successful requests too
  skip: (req) => {
    // Only apply to auth endpoints
    return !req.path.startsWith('/api/auth');
  }
});

// OTP rate limiting (very strict)
export const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 3 : 30, // More lenient in dev/test
  message: {
    error: 'Too many OTP requests from this IP, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `otp-${req.ip}`;
  },
  skip: (req) => {
    // Only apply to OTP endpoints
    return !req.path.includes('otp');
  }
});

// Sensitive operations rate limiting
export const sensitiveOperationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 sensitive operations per windowMs
  message: {
    error: 'Rate limit exceeded for sensitive operations',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `sensitive-${req.ip}`;
  },
  skip: (req) => {
    // Apply to admin and sensitive endpoints
    return !req.path.startsWith('/api/admin') && 
           !req.path.includes('delete') && 
           !req.path.includes('update');
  }
});

// Public endpoints rate limiting (more lenient)
export const publicEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    error: 'Rate limit exceeded for public endpoints',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `public-${req.ip}`;
  },
  skip: (req) => {
    // Apply to public endpoints only
    return !req.path.startsWith('/api/public') && 
           !req.path.startsWith('/health');
  }
});

// Rate limiting middleware factory
export function createRateLimiter(type) {
  switch (type) {
    case 'auth':
      return authLimiter;
    case 'otp':
      return otpLimiter;
    case 'sensitive':
      return sensitiveOperationsLimiter;
    case 'public':
      return publicEndpointsLimiter;
    case 'general':
    default:
      return generalApiLimiter;
  }
}

// Rate limiting configuration for different environments
export const rateLimitConfig = {
  development: {
    general: { windowMs: 15 * 60 * 1000, max: 1000 },
    auth: { windowMs: 15 * 60 * 1000, max: 50 },
    otp: { windowMs: 60 * 1000, max: 10 },
    sensitive: { windowMs: 15 * 60 * 1000, max: 100 },
    public: { windowMs: 15 * 60 * 1000, max: 200 }
  },
  production: {
    general: { windowMs: 15 * 60 * 1000, max: 100 },
    auth: { windowMs: 15 * 60 * 1000, max: 5 },
    otp: { windowMs: 60 * 1000, max: 3 },
    sensitive: { windowMs: 15 * 60 * 1000, max: 20 },
    public: { windowMs: 15 * 60 * 1000, max: 50 }
  },
  testing: {
    general: { windowMs: 15 * 60 * 1000, max: 10000 },
    auth: { windowMs: 15 * 60 * 1000, max: 1000 },
    otp: { windowMs: 60 * 1000, max: 100 },
    sensitive: { windowMs: 15 * 60 * 1000, max: 1000 },
    public: { windowMs: 15 * 60 * 1000, max: 1000 }
  }
};

// Get rate limiting configuration for current environment
export function getRateLimitConfig() {
  const env = process.env.NODE_ENV || 'development';
  return rateLimitConfig[env] || rateLimitConfig.development;
}

// Rate limiting status endpoint
export function rateLimitStatus(req, res) {
  const config = getRateLimitConfig();
  res.json({
    status: 'active',
    environment: process.env.NODE_ENV || 'development',
    redis: 'disabled',
    limits: config,
    timestamp: new Date().toISOString()
  });
}

export default {
  generalApiLimiter,
  authLimiter,
  otpLimiter,
  sensitiveOperationsLimiter,
  publicEndpointsLimiter,
  createRateLimiter,
  getRateLimitConfig,
  rateLimitStatus
};