// server/src/services/redisService.js
import { createClient } from 'redis';
import { EventEmitter } from 'events';
import MemoryCacheService from './memoryCacheService.js';

// Lightweight dd-trace helper (lazy import)
let _redisDdTracerInitialized = false;
let _redisDdTracer = null;
async function getDdTracer() {
  if (_redisDdTracerInitialized) return _redisDdTracer;
  _redisDdTracerInitialized = true;
  try {
    const mod = await import('dd-trace');
    _redisDdTracer = mod.default || mod;
  } catch (e) {
    _redisDdTracer = null;
  }
  return _redisDdTracer;
}

/**
 * Redis Service for caching and session management
 * Provides high-performance caching with fallback mechanisms
 */
const SHOULD_LOG_REDIS = process.env.NODE_ENV !== 'test' || process.env.DEBUG_REDIS === 'true';
const logRedis = (...args) => {
  if (SHOULD_LOG_REDIS) {
    console.log(...args);
  }
};
const warnRedis = (...args) => {
  if (SHOULD_LOG_REDIS) {
    console.warn(...args);
  }
};

class RedisService extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.fallbackCache = null;
    this.isConnected = false;
    this.usingFallback = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3; // Reduced for faster fallback
    this.reconnectDelay = 2000;

    this.cacheStats = {
      hits: 0,
      misses: 0,
      errors: 0,
      operations: 0
    };
  }

  /**
   * Initialize Redis connection with fallback
   */
  async initialize() {
    logRedis('[REDIS] Initializing Redis service...');

    // Quick check if Redis is available
    if (!process.env.REDIS_URL && process.env.NODE_ENV === 'development') {
      logRedis('[REDIS] No REDIS_URL configured in development, using memory cache');
      return this.initializeFallback();
    }

    try {
      // Attempt Redis connection with timeout
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 2000, // Reduced timeout for faster fallback
          lazyConnect: true
        }
      });

      // Set up event handlers
      this.client.on('connect', () => {
        logRedis('[REDIS] Connected to Redis server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.client.on('error', (error) => {
        if (!this.usingFallback) {
          warnRedis('[REDIS] Connection error:', error.message);
          this.isConnected = false;
          // Don't attempt reconnection immediately, fall back
          this.initializeFallback();
        }
      });

      this.client.on('end', () => {
        logRedis('[REDIS] Connection ended');
        this.isConnected = false;
      });

      // Try to connect with short timeout
      const connectPromise = this.client.connect();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 2000)
      );

      await Promise.race([connectPromise, timeoutPromise]);

      logRedis('✅ Redis connected successfully');
      return true;

    } catch (error) {
      warnRedis(`[REDIS] Redis connection failed: ${error.message}`);
      logRedis('[REDIS] Falling back to memory cache...');
      return this.initializeFallback();
    }
  }

  /**
   * Initialize fallback memory cache
   */
  async initializeFallback() {
    this.fallbackCache = new MemoryCacheService();
    this.usingFallback = true;
    this.isConnected = false;
    logRedis('✅ Memory cache fallback initialized');
    return true;
  }

  getStatus() {
    return {
      connected: this.isConnected,
      usingFallback: this.usingFallback,
      stats: this.cacheStats
    };
  }

  async ping() {
    if (this.usingFallback) {
      return {
        ok: false,
        mode: 'fallback',
        message: 'Using in-memory fallback cache'
      };
    }

    if (!this.client || !this.isConnected) {
      return {
        ok: false,
        mode: 'redis',
        message: 'Redis client not connected'
      };
    }

    try {
      const start = Date.now();
      await this.client.ping();
      return {
        ok: true,
        mode: 'redis',
        latencyMs: Date.now() - start
      };
    } catch (error) {
      return {
        ok: false,
        mode: 'redis',
        message: error.message
      };
    }
  }

  /**
   * Handle Redis reconnection attempts
   */
  async handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[REDIS] Max reconnection attempts reached, switching to fallback');
      await this.initializeFallback();
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 10000);

    console.log(`[REDIS] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(async () => {
      try {
        if (!this.isConnected && this.client) {
          await this.client.connect();
        }
      } catch (error) {
        console.error('[REDIS] Reconnection failed:', error.message);
        this.handleReconnection();
      }
    }, delay);
  }

  /**
   * Set cache value with TTL
   */
  async set(key, value, ttlSeconds = 3600) {
    if (this.usingFallback) {
      return this.fallbackCache.set(key, value, ttlSeconds);
    }

    if (!this.isConnected) {
      console.warn('[REDIS] Cache set failed - Redis not connected');
      return false;
    }

    let _span = null;
    try {
      const tracer = await getDdTracer();
      if (tracer) {
        try {
          _span = tracer.startSpan('redis.command', {
            service: process.env.DD_SERVICE || process.env.npm_package_name || 'secure-gate-server',
            resource: `redis.setEx`,
            tags: { 'redis.key': key, 'estate_id': process.env.ESTATE_ID || 'unknown' }
          });
        } catch (e) { _span = null; }
      }

      this.cacheStats.operations++;
      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, ttlSeconds, serializedValue);
      console.log(`[REDIS] Cache set: ${key} (TTL: ${ttlSeconds}s)`);

      if (_span) {
        try { _span.setTag('redis.ttl', ttlSeconds); } catch (e) {}
        try { _span.finish(); } catch (e) {}
        _span = null;
      }

      return true;
    } catch (error) {
      if (_span) {
        try { _span.setTag('error', true); _span.setTag('error.message', error.message); _span.finish(); } catch (e) {}
        _span = null;
      }
      console.error('[REDIS] Cache set error:', error.message);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Get cache value
   */
  async get(key) {
    if (this.usingFallback) {
      return this.fallbackCache.get(key);
    }

    if (!this.isConnected) {
      console.warn('[REDIS] Cache get failed - Redis not connected');
      this.cacheStats.misses++;
      return null;
    }

    let _span = null;
    try {
      const tracer = await getDdTracer();
      if (tracer) {
        try {
          _span = tracer.startSpan('redis.command', {
            service: process.env.DD_SERVICE || process.env.npm_package_name || 'secure-gate-server',
            resource: `redis.get`,
            tags: { 'redis.key': key, 'estate_id': process.env.ESTATE_ID || 'unknown' }
          });
        } catch (e) { _span = null; }
      }

      this.cacheStats.operations++;
      const value = await this.client.get(key);

      if (value === null) {
        this.cacheStats.misses++;
        console.log(`[REDIS] Cache miss: ${key}`);
        if (_span) { try { _span.setTag('redis.hit', false); _span.finish(); } catch (e) {} }
        return null;
      }

      this.cacheStats.hits++;
      console.log(`[REDIS] Cache hit: ${key}`);
      if (_span) { try { _span.setTag('redis.hit', true); _span.finish(); } catch (e) {} }
      return JSON.parse(value);
    } catch (error) {
      if (_span) { try { _span.setTag('error', true); _span.setTag('error.message', error.message); _span.finish(); } catch (e) {} }
      console.error('[REDIS] Cache get error:', error.message);
      this.cacheStats.errors++;
      this.cacheStats.misses++;
      return null;
    }
  }

  /**
   * Delete cache key
   */
  async delete(key) {
    if (this.usingFallback) {
      return this.fallbackCache.delete(key);
    }

    if (!this.isConnected) {
      console.warn('[REDIS] Cache delete failed - Redis not connected');
      return false;
    }

    let _span = null;
    try {
      const tracer = await getDdTracer();
      if (tracer) {
        try {
          _span = tracer.startSpan('redis.command', {
            service: process.env.DD_SERVICE || process.env.npm_package_name || 'secure-gate-server',
            resource: `redis.del`,
            tags: { 'redis.key': key, 'estate_id': process.env.ESTATE_ID || 'unknown' }
          });
        } catch (e) { _span = null; }
      }

      this.cacheStats.operations++;
      const result = await this.client.del(key);
      console.log(`[REDIS] Cache deleted: ${key} (found: ${result > 0})`);

      if (_span) { try { _span.setTag('redis.deleted', result > 0); _span.finish(); } catch (e) {} }
      return result > 0;
    } catch (error) {
      if (_span) { try { _span.setTag('error', true); _span.setTag('error.message', error.message); _span.finish(); } catch (e) {} }
      console.error('[REDIS] Cache delete error:', error.message);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern) {
    if (this.usingFallback) {
      return this.fallbackCache.deletePattern(pattern);
    }

    if (!this.isConnected) {
      console.warn('[REDIS] Cache pattern delete failed - Redis not connected');
      return 0;
    }

    try {
      this.cacheStats.operations++;
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.client.del(keys);
      console.log(`[REDIS] Cache pattern deleted: ${pattern} (${result} keys)`);
      return result;
    } catch (error) {
      console.error('[REDIS] Cache pattern delete error:', error.message);
      this.cacheStats.errors++;
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (this.usingFallback) {
      return this.fallbackCache.exists(key);
    }

    if (!this.isConnected) {
      return false;
    }

    try {
      this.cacheStats.operations++;
      return await this.client.exists(key) > 0;
    } catch (error) {
      console.error('[REDIS] Cache exists error:', error.message);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Set TTL for existing key
   */
  async expire(key, ttlSeconds) {
    if (this.usingFallback) {
      return this.fallbackCache.expire(key, ttlSeconds);
    }

    if (!this.isConnected) {
      return false;
    }

    try {
      this.cacheStats.operations++;
      return await this.client.expire(key, ttlSeconds) > 0;
    } catch (error) {
      console.error('[REDIS] Cache expire error:', error.message);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.cacheStats.operations > 0
      ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2)
      : 0;

    const stats = {
      ...this.cacheStats,
      hitRate: `${hitRate}%`,
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      usingFallback: this.usingFallback
    };

    // Include fallback cache stats if using fallback
    if (this.usingFallback && this.fallbackCache) {
      stats.fallbackStats = this.fallbackCache.getStats();
    }

    return stats;
  }

  /**
   * Reset cache statistics
   */
  resetStats() {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      errors: 0,
      operations: 0
    };
  }

  /**
   * Graceful shutdown
   */
  async close() {
    try {
      if (this.client && this.isConnected) {
        console.log('[REDIS] Closing Redis connection...');
        await this.client.quit();
        this.isConnected = false;
        console.log('✅ Redis connection closed gracefully');
      }

      // Clean up fallback cache if using it
      if (this.usingFallback && this.fallbackCache) {
        this.fallbackCache.clear();
        console.log('✅ Memory cache cleared');
      }
    } catch (error) {
      console.error('[REDIS] Error during shutdown:', error.message);
    }
  }

  /**
   * Add token to blacklist with TTL matching token expiry
   */
  async blacklistToken(token, expirySeconds) {
    const key = `token:blacklist:${token}`;
    return await this.set(key, { revokedAt: new Date().toISOString() }, expirySeconds);
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token) {
    const key = `token:blacklist:${token}`;
    return await this.exists(key);
  }

  /**
   * Remove token from blacklist (for testing/recovery)
   */
  async removeFromBlacklist(token) {
    const key = `token:blacklist:${token}`;
    return await this.delete(key);
  }

  /**
   * Get count of blacklisted tokens
   */
  async getBlacklistedTokenCount() {
    if (this.usingFallback) {
      // Fallback doesn't support pattern matching easily
      return 0;
    }

    if (!this.isConnected) {
      return 0;
    }

    try {
      const keys = await this.client.keys('token:blacklist:*');
      return keys.length;
    } catch (error) {
      console.error('[REDIS] Error counting blacklisted tokens:', error.message);
      return 0;
    }
  }

  /**
   * Clear all blacklisted tokens (admin operation)
   */
  async clearAllBlacklistedTokens() {
    return await this.deletePattern('token:blacklist:*');
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (this.usingFallback) {
      return {
        status: 'fallback',
        message: 'Using memory cache fallback',
        stats: this.getStats()
      };
    }

    if (!this.isConnected) {
      return {
        status: 'disconnected',
        error: 'Redis client not connected'
      };
    }

    try {
      const start = Date.now();
      await this.client.ping();
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        stats: this.getStats()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

// Cache key builders for different data types
export const CacheKeys = {
  user: (id) => `user:${id}`,
  userByEmail: (email) => `user:email:${email}`,
  visitor: (id) => `visitor:${id}`,
  visitorsByDate: (date) => `visitors:date:${date}`,
  bulkInvite: (code) => `bulk_invite:${code}`,
  accessLogs: (userId, page = 1) => `access_logs:${userId}:page:${page}`,
  apiResponse: (path, query) => `api:${path}:${Buffer.from(query).toString('base64')}`,
  session: (sessionId) => `session:${sessionId}`,
  rateLimiting: (identifier) => `rate_limit:${identifier}`,
  otp: (visitorId) => `otp:${visitorId}`,
  activeVisitors: () => 'active_visitors',
  dashboardStats: () => 'dashboard_stats'
};

// Default TTL values (in seconds)
export const CacheTTL = {
  SHORT: 300,     // 5 minutes
  MEDIUM: 1800,   // 30 minutes
  LONG: 3600,     // 1 hour
  SESSION: 86400, // 24 hours
  PERMANENT: -1   // No expiration
};

export default RedisService;
