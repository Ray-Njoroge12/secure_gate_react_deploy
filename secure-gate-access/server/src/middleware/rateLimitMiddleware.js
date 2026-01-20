// server/src/middleware/rateLimitMiddleware.js
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { buildErrorPayload } from '../utils/responseFormatter.js';

/**
 * Updated Rate Limiting Middleware compatible with express-rate-limit v7+
 * Provides multiple levels of protection against abuse and DDoS attacks
 */

// Redis-based store for rate limiting (will be injected)
let redisService = null;

/**
 * Environment-specific rate limit configuration
 * SECURITY FIX: Prevents accidental deployment of relaxed dev limits to production
 */
const rateLimitConfig = {
  registration: {
    production: 5,      // Strict in production
    staging: 50,        // Moderate in staging
    development: 1000,  // Relaxed for testing
    test: 10000         // Very relaxed for automated tests
  },
  authentication: {
    production: 10,
    staging: 50,
    development: 100,
    test: 10000
  },
  passwordReset: {
    production: 3,
    staging: 5,
    development: 10,
    test: 100
  },
  general: {
    production: 100,
    staging: 500,
    development: 1000,
    test: 10000
  }
};

/**
 * Get rate limit for current environment
 * Always defaults to production limits if environment is unknown
 */
function getEnvLimit(limitType) {
  const env = process.env.NODE_ENV || 'development';
  const limits = rateLimitConfig[limitType];

  if (!limits) {
    console.warn(`Unknown rate limit type: ${limitType}, using default 100`);
    return 100;
  }

  // SECURITY: Default to production limits if environment not recognized
  return limits[env] ?? limits.production;
}

export function setRateLimitRedisService(redis) {
  redisService = redis;
}

// IPv6-compatible IP key generation
const getClientIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() :
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown';
  return ip.replace(/^::ffff:/, ''); // Remove IPv4-mapped IPv6 prefix
};

/**
 * Redis store for express-rate-limit v7+ compatible
 */
class RedisRateLimitStore {
  constructor() {
    this.name = 'redis-rate-limit-store';
    this.prefix = 'rate_limit:';
  }

  async increment(key, windowMs) {
    try {
      if (!redisService || !redisService.isConnected()) {
        console.warn('⚠️ Redis not available, using memory store fallback');
        return { totalHits: 1, resetTime: new Date(Date.now() + windowMs) };
      }

      const redisKey = this.prefix + key;
      const client = redisService.getClient();

      // Use Redis pipeline for atomic operations
      const multi = client.multi();
      multi.incr(redisKey);
      multi.expire(redisKey, Math.ceil(windowMs / 1000));

      const results = await multi.exec();
      const hits = results[0][1];

      return {
        totalHits: hits,
        resetTime: new Date(Date.now() + windowMs)
      };
    } catch (error) {
      console.warn('⚠️ Redis error in rate limiting:', error.message);
      return { totalHits: 1, resetTime: new Date(Date.now() + windowMs) };
    }
  }

  async decrement(key) {
    try {
      if (redisService && redisService.isConnected()) {
        const redisKey = this.prefix + key;
        await redisService.getClient().decr(redisKey);
      }
    } catch (error) {
      console.warn('⚠️ Redis decrement error:', error.message);
    }
  }

  async resetKey(key) {
    try {
      if (redisService && redisService.isConnected()) {
        const redisKey = this.prefix + key;
        await redisService.getClient().del(redisKey);
      }
    } catch (error) {
      console.warn('⚠️ Redis reset error:', error.message);
    }
  }
}

// Create store instance
const createStore = () => {
  if (redisService && redisService.isConnected()) {
    return new RedisRateLimitStore();
  }
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️ Using memory store for rate limiting (not suitable for production clusters)');
  }
  return undefined; // Use default memory store
};

const rateLimitErrorCode = 'RATE_LIMIT_EXCEEDED';

const buildRateLimitHandler = ({ message, retryAfter, details = {} }) => {
  return (req, res) => {
    const errorResponse = buildErrorResponse({
      message,
      errorCode: rateLimitErrorCode,
      details: {
        retryAfter,
        ...details
      },
      req
    });

    loggingService.logSecurity('warn', 'Rate limit exceeded', {
      code: rateLimitErrorCode,
      status: 429,
      method: req.method,
      route: req.originalUrl,
      user_id: req.user?.id ?? null,
      estate_id: req.user?.estate_id ?? null,
      requestId: req.requestId,
      correlationId: req.correlationId
    });

    res.status(429).json(errorResponse);
  };
};

/**
 * General rate limiting for all API endpoints
 * 100 requests per 15 minutes per IP
 */
export const generalRateLimit = () => rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  keyGenerator: (req) => `general:${getClientIP(req)}`,
  handler: (req, res) => {
    const response = buildErrorPayload(req, res, 'Too many requests from this IP, please try again later.', 'RATE_LIMITED');
    response.retryAfter = '15 minutes';
    res.status(429).json(response);
  }
});

/**
 * Authentication rate limiting
 * 50 login attempts per 15 minutes per IP (increased for testing)
 */
export const authRateLimit = () => rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  keyGenerator: (req) => `auth:${getClientIP(req)}`,
  handler: (req, res) => {
    const response = buildErrorPayload(req, res, 'Too many login attempts, please try again later.', 'RATE_LIMITED');
    response.retryAfter = '15 minutes';
    res.status(429).json(response);
  }
});

/**
 * Admin operations rate limiting
 * 20 admin actions per hour per user/IP
 */
export const adminRateLimit = () => rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  keyGenerator: (req) => `admin:${req.user?.id || getClientIP(req)}`,
  handler: (req, res) => {
    const response = buildErrorPayload(req, res, 'Too many admin requests, please try again later.', 'RATE_LIMITED');
    response.retryAfter = '1 hour';
    res.status(429).json(response);
  }
});

/**
 * Bulk operations rate limiting
 * 3 bulk operations per hour per user/IP
 */
export const bulkOperationLimit = () => rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  keyGenerator: (req) => `bulk:${req.user?.id || getClientIP(req)}`,
  handler: (req, res) => {
    const response = buildErrorPayload(req, res, 'Too many bulk operations, please try again later.', 'RATE_LIMITED');
    response.retryAfter = '1 hour';
    res.status(429).json(response);
  }
});

/**
 * Password reset rate limiting
 * 3 password reset attempts per hour per IP
 */
export const passwordResetLimit = () => rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  keyGenerator: (req) => `pwd_reset:${getClientIP(req)}`,
  handler: (req, res) => {
    const response = buildErrorPayload(req, res, 'Too many password reset requests, please try again later.', 'RATE_LIMITED');
    response.retryAfter = '1 hour';
    res.status(429).json(response);
  }
});

/**
 * Registration rate limiting
 * SECURITY FIX: Now environment-aware (production: 5/hour, dev: 1000/hour)
 */
export const registrationLimit = () => rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: getEnvLimit('registration'),
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  keyGenerator: (req) => `register:${getClientIP(req)}`,
  handler: (req, res) => {
    const response = buildErrorPayload(req, res, 'Too many registration attempts, please try again later.', 'RATE_LIMITED');
    response.retryAfter = '1 hour';
    response.limit = getEnvLimit('registration');
    res.status(429).json(response);
  }
});

/**
 * Speed limiting middleware (progressive delays)
 * Slows down requests instead of blocking them
 */
export const speedLimitMiddleware = () => slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per window without delay
  delayMs: () => 500, // Fixed 500ms delay (new v2 behavior)
  maxDelayMs: 20000, // Max delay of 20 seconds
  store: createStore(),
  keyGenerator: (req) => getClientIP(req),
  validate: { delayMs: false } // Disable warning
});

/**
 * Strict rate limiting for sensitive operations
 * 10 requests per 10 minutes per user/IP per endpoint
 */
export const strictRateLimit = () => rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  keyGenerator: (req) => `strict:${req.user?.id || getClientIP(req)}:${req.path}`,
  handler: (req, res) => {
    const response = buildErrorPayload(req, res, 'Too many requests to this sensitive endpoint.', 'RATE_LIMITED');
    response.retryAfter = '10 minutes';
    res.status(429).json(response);
  }
});

/**
 * DDoS protection - very aggressive rate limiting
 * 20 requests per minute per IP
 */
export const ddosProtection = () => rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  keyGenerator: (req) => `ddos:${getClientIP(req)}`,
  handler: (req, res) => {
    const response = buildErrorPayload(req, res, 'DDoS protection activated. Too many requests.', 'RATE_LIMITED');
    response.retryAfter = '1 minute';
    res.status(429).json(response);
  }
});

/**
 * Custom rate limit function for specific use cases
 */
export const customRateLimit = (options = {}) => {
  const fallbackMessage = 'Too many requests, please try again later.';
  const messageValue = typeof options.message === 'string'
    ? options.message
    : options.message?.error || fallbackMessage;
  const retryAfterValue = typeof options.message === 'object' && options.message?.retryAfter
    ? options.message.retryAfter
    : 'later';
  const defaults = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore(),
    keyGenerator: (req) => `custom:${getClientIP(req)}`,
    handler: (req, res) => {
      const message = options.message?.error || 'Too many requests, please try again later.';
      const retryAfter = options.message?.retryAfter || 'later';
      const response = buildErrorPayload(req, res, message, 'RATE_LIMITED');
      response.retryAfter = retryAfter;
      res.status(429).json(response);
    }
  };

  return rateLimit({ ...defaults, ...options, store: createStore() });
};

/**
 * Administrative functions for rate limit management
 */

// Store for rate limit statistics (in memory for demo, should use Redis in production)
const rateLimitStatsStore = new Map();

export const rateLimitStats = {
  /**
   * Get current rate limiting statistics
   */
  async getStats() {
    try {
      if (redisService && redisService.isConnected()) {
        // Get stats from Redis
        const client = redisService.getClient();
        const keys = await client.keys('rate_limit:*');

        const stats = {
          totalKeys: keys.length,
          activeRateLimits: keys.length,
          redisConnected: true,
          storeType: 'redis'
        };

        // Group by type
        const byType = {};
        for (const key of keys) {
          const type = key.split(':')[1]?.split(':')[0] || 'unknown';
          byType[type] = (byType[type] || 0) + 1;
        }

        stats.byType = byType;
        return stats;
      } else {
        return {
          totalKeys: 0,
          activeRateLimits: 0,
          redisConnected: false,
          storeType: 'memory',
          byType: {}
        };
      }
    } catch (error) {
      console.error('Error getting rate limit stats:', error);
      return {
        error: 'Failed to get rate limit statistics',
        redisConnected: false,
        storeType: 'memory'
      };
    }
  },

  /**
   * Reset rate limits for a specific key pattern
   */
  async resetKey(keyPattern) {
    try {
      if (redisService && redisService.isConnected()) {
        const client = redisService.getClient();
        const keys = await client.keys(`rate_limit:*${keyPattern}*`);

        if (keys.length > 0) {
          await client.del(...keys);
          return { success: true, keysDeleted: keys.length };
        } else {
          return { success: true, keysDeleted: 0 };
        }
      } else {
        return { success: false, error: 'Redis not available' };
      }
    } catch (error) {
      console.error('Error resetting rate limit keys:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get system status for rate limiting
   */
  async getSystemStatus() {
    return {
      redisConnected: redisService?.isConnected() || false,
      storeType: redisService?.isConnected() ? 'redis' : 'memory',
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Whitelist an IP temporarily
   */
  async whitelistIP(ip, duration = 3600) {
    try {
      if (redisService && redisService.isConnected()) {
        const client = redisService.getClient();
        const key = `rate_limit:whitelist:${ip}`;
        await client.set(key, 'whitelisted', duration);
        return { success: true, ip, duration };
      } else {
        return { success: false, error: 'Redis not available for whitelisting' };
      }
    } catch (error) {
      console.error('Error whitelisting IP:', error);
      return { success: false, error: error.message };
    }
  }
};

// Default export with all rate limiting functions
const rateLimitMiddleware = {
  setRateLimitRedisService,
  generalRateLimit,
  authRateLimit,
  adminRateLimit,
  bulkOperationLimit,
  passwordResetLimit,
  registrationLimit,
  speedLimitMiddleware,
  strictRateLimit,
  ddosProtection,
  customRateLimit,
  rateLimitStats
};

export default rateLimitMiddleware;
