// server/src/config/rateLimits.js
/**
 * Enhanced Rate Limiting Configuration
 * Provides comprehensive rate limiting strategies with monitoring and analytics
 */

import rateLimit from 'express-rate-limit';
import { buildErrorPayload } from '../utils/responseFormatter.js';
import slowDown from 'express-slow-down';

const rateLimitHandler = (message) => (req, res) => {
  const response = buildErrorPayload(req, res, message, 'RATE_LIMITED');
  res.status(429).json(response);
};

/**
 * Rate limiting configuration profiles
 */
export const RATE_LIMIT_PROFILES = {
  // Public endpoints - lenient for normal usage
  PUBLIC: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 200 : 500, // Environment-aware
    message: 'Too many requests from this IP, please try again later.',
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    standardHeaders: true,
    legacyHeaders: false
  },

  // Authentication endpoints - moderate protection
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 20 : 100, // Environment-aware
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true, // Don't count successful logins
    skipFailedRequests: false,
    standardHeaders: true,
    legacyHeaders: false
  },

  // Admin endpoints - strict protection
  ADMIN: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'production' ? 50 : 200, // Environment-aware
    message: 'Too many admin requests, please try again later.',
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    standardHeaders: true,
    legacyHeaders: false
  },

  // Sensitive operations - very strict
  SENSITIVE: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: process.env.NODE_ENV === 'production' ? 5 : 20, // Environment-aware
    message: 'Too many requests to sensitive endpoint, please try again later.',
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    standardHeaders: true,
    legacyHeaders: false
  },

  // DDoS protection - aggressive
  DDOS: {
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: 'DDoS protection activated. Too many requests.',
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // File uploads - moderate with size consideration
  UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'Too many file uploads, please try again later.',
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  },

  // API key generation - very strict
  API_KEY: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 3,
    message: 'Too many API key generation requests, please try again tomorrow.',
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  }
};

/**
 * Advanced rate limiting strategies
 */
export const RATE_LIMIT_STRATEGIES = {
  // Progressive rate limiting - increases restrictions over time
  PROGRESSIVE: {
    windowMs: 15 * 60 * 1000,
    max: (req) => {
      const userAgent = req.get('User-Agent') || '';
      const isBot = /bot|crawler|spider/i.test(userAgent);
      return isBot ? 10 : 100; // Bots get stricter limits
    },
    message: 'Rate limit exceeded. Please slow down your requests.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => rateLimitHandler('Rate limit exceeded. Please slow down your requests.')(req, res)
  },

  // Adaptive rate limiting - adjusts based on system load
  ADAPTIVE: {
    windowMs: 15 * 60 * 1000,
    max: (req) => {
      const memoryUsage = process.memoryUsage();
      const memoryPressure = memoryUsage.heapUsed / memoryUsage.heapTotal;
      
      if (memoryPressure > 0.9) return 10; // Very strict under high memory pressure
      if (memoryPressure > 0.7) return 50; // Moderate under medium pressure
      return 100; // Normal under low pressure
    },
    message: 'System under load. Rate limiting adjusted.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => rateLimitHandler('System under load. Rate limiting adjusted.')(req, res)
  },

  // Geographic rate limiting - different limits by region
  GEOGRAPHIC: {
    windowMs: 15 * 60 * 1000,
    max: (req) => {
      const country = req.headers['cf-ipcountry'] || req.headers['x-country-code'];
      
      // Known high-risk countries get stricter limits
      const highRiskCountries = ['CN', 'RU', 'KP', 'IR'];
      if (highRiskCountries.includes(country)) return 20;
      
      // Known low-risk countries get more lenient limits
      const lowRiskCountries = ['US', 'CA', 'GB', 'AU', 'DE', 'FR'];
      if (lowRiskCountries.includes(country)) return 150;
      
      return 100; // Default limit
    },
    message: 'Rate limit exceeded for your region.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => rateLimitHandler('Rate limit exceeded for your region.')(req, res)
  }
};

/**
 * Speed limiting configurations
 */
export const SPEED_LIMIT_CONFIGS = {
  // General speed limiting
  GENERAL: {
    windowMs: 15 * 60 * 1000,
    delayAfter: 50,
    delayMs: 500,
    maxDelayMs: 20000
  },

  // Aggressive speed limiting for suspicious behavior
  AGGRESSIVE: {
    windowMs: 5 * 60 * 1000,
    delayAfter: 10,
    delayMs: 1000,
    maxDelayMs: 30000
  },

  // Gradual speed limiting
  GRADUAL: {
    windowMs: 15 * 60 * 1000,
    delayAfter: 30,
    delayMs: (used, req) => used * 100, // Gradual increase
    maxDelayMs: 15000
  }
};

/**
 * Rate limiting bypass conditions
 */
export const BYPASS_CONDITIONS = {
  // Skip rate limiting for health checks
  isHealthCheck: (req) => {
    return req.path === '/health' || 
           req.path === '/api/health' ||
           req.path === '/ping';
  },

  // Skip rate limiting for internal services
  isInternalService: (req) => {
    const internalIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
    const clientIP = getClientIP(req);
    return internalIPs.includes(clientIP);
  },

  // Skip rate limiting for whitelisted IPs
  isWhitelisted: (req) => {
    const whitelistedIPs = process.env.RATE_LIMIT_WHITELIST?.split(',') || [];
    const clientIP = getClientIP(req);
    return whitelistedIPs.includes(clientIP);
  },

  // Skip rate limiting for authenticated admin users
  isAdminUser: (req) => {
    return req.user?.role === 'admin' && req.user?.isVerified;
  }
};

/**
 * Get client IP address with IPv6 support
 */
export const getClientIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const cfConnectingIP = req.headers['cf-connecting-ip'];
  
  const ip = cfConnectingIP || 
            realIP || 
            (forwarded ? forwarded.split(',')[0].trim() : null) ||
            req.connection?.remoteAddress ||
            req.socket?.remoteAddress ||
            req.ip ||
            'unknown';
  
  return ip.replace(/^::ffff:/, ''); // Remove IPv4-mapped IPv6 prefix
};

/**
 * Enhanced key generator with multiple factors
 */
export const createKeyGenerator = (type, includeUser = false, includePath = false) => {
  return (req) => {
    const ip = getClientIP(req);
    const user = includeUser ? req.user?.id : '';
    const path = includePath ? req.path : '';
    
    return `${type}:${ip}:${user}:${path}`.replace(/::/g, ':');
  };
};

/**
 * Rate limiting middleware factory
 */
export const createRateLimit = (profile, options = {}) => {
  const config = {
    ...RATE_LIMIT_PROFILES[profile],
    ...options,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || createKeyGenerator(profile.toLowerCase()),
    skip: (req) => {
      // Check bypass conditions
      for (const [name, condition] of Object.entries(BYPASS_CONDITIONS)) {
        if (condition(req)) {
          console.log(`Rate limit bypassed: ${name} for ${getClientIP(req)}`);
          return true;
        }
      }
      return false;
    },
    handler: (req, res) => {
      const retryAfter = Math.ceil(req.rateLimit.resetTime / 1000);
      
      const response = buildErrorPayload(req, res, config.message, 'RATE_LIMIT_EXCEEDED');
      response.error.details = {
        limit: req.rateLimit.limit,
        remaining: req.rateLimit.remaining,
        resetTime: new Date(req.rateLimit.resetTime).toISOString(),
        retryAfter: retryAfter
      };
      res.status(429).json(response);
    }
  };

  return rateLimit(config);
};

/**
 * Speed limiting middleware factory
 */
export const createSpeedLimit = (config, options = {}) => {
  const speedConfig = {
    ...SPEED_LIMIT_CONFIGS[config],
    ...options,
    keyGenerator: options.keyGenerator || ((req) => getClientIP(req)),
    skip: (req) => {
      for (const [name, condition] of Object.entries(BYPASS_CONDITIONS)) {
        if (condition(req)) return true;
      }
      return false;
    },
    // Suppress delayMs validation warning (we're using legacy behavior intentionally)
    validate: { delayMs: false }
  };

  return slowDown(speedConfig);
};

/**
 * Rate limiting analytics and monitoring
 */
export class RateLimitAnalytics {
  constructor() {
    this.stats = new Map();
    this.alerts = [];
  }

  recordHit(key, limit, remaining, resetTime) {
    const now = Date.now();
    const stats = this.stats.get(key) || {
      hits: 0,
      limit,
      lastHit: now,
      firstHit: now,
      violations: 0
    };

    stats.hits++;
    stats.lastHit = now;
    stats.remaining = remaining;
    stats.resetTime = resetTime;

    if (remaining <= 0) {
      stats.violations++;
      this.triggerAlert(key, stats);
    }

    this.stats.set(key, stats);
  }

  triggerAlert(key, stats) {
    const alert = {
      key,
      timestamp: new Date().toISOString(),
      hits: stats.hits,
      limit: stats.limit,
      violations: stats.violations
    };

    this.alerts.push(alert);
    console.warn('🚨 Rate limit violation:', alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  getStats() {
    const now = Date.now();
    const activeKeys = Array.from(this.stats.entries())
      .filter(([_, stats]) => now - stats.lastHit < 15 * 60 * 1000) // Last 15 minutes
      .map(([key, stats]) => ({ key, ...stats }));

    return {
      totalKeys: this.stats.size,
      activeKeys: activeKeys.length,
      recentAlerts: this.alerts.slice(-10),
      topViolators: activeKeys
        .sort((a, b) => b.violations - a.violations)
        .slice(0, 10)
    };
  }

  clearStats() {
    this.stats.clear();
    this.alerts = [];
  }
}

// Global analytics instance
export const rateLimitAnalytics = new RateLimitAnalytics();

/**
 * Pre-configured rate limiting middleware
 */
export const rateLimiters = {
  // General API rate limiting
  general: createRateLimit('PUBLIC'),
  
  // Authentication rate limiting
  auth: createRateLimit('AUTH'),
  
  // Admin operations rate limiting
  admin: createRateLimit('ADMIN'),
  
  // Sensitive operations rate limiting
  sensitive: createRateLimit('SENSITIVE'),
  
  // DDoS protection
  ddos: createRateLimit('DDOS'),
  
  // File upload rate limiting
  upload: createRateLimit('UPLOAD'),
  
  // API key generation rate limiting
  apiKey: createRateLimit('API_KEY'),
  
  // Progressive rate limiting
  progressive: rateLimit(RATE_LIMIT_STRATEGIES.PROGRESSIVE),
  
  // Adaptive rate limiting
  adaptive: rateLimit(RATE_LIMIT_STRATEGIES.ADAPTIVE),
  
  // Geographic rate limiting
  geographic: rateLimit(RATE_LIMIT_STRATEGIES.GEOGRAPHIC)
};

/**
 * Speed limiting middleware
 */
export const speedLimiters = {
  general: createSpeedLimit('GENERAL'),
  aggressive: createSpeedLimit('AGGRESSIVE'),
  gradual: createSpeedLimit('GRADUAL')
};

export default {
  RATE_LIMIT_PROFILES,
  RATE_LIMIT_STRATEGIES,
  SPEED_LIMIT_CONFIGS,
  BYPASS_CONDITIONS,
  createRateLimit,
  createSpeedLimit,
  rateLimiters,
  speedLimiters,
  rateLimitAnalytics,
  getClientIP
};


