/**
 * Cache Middleware
 * 
 * This middleware implements Redis caching for improved performance
 * and reduced database load.
 */

import redis from 'redis';
import { promisify } from 'util';

class CacheMiddleware {
  constructor() {
    this.client = null;
    this.enabled = false;
    
    try {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.warn('⚠️  Redis connection refused - caching disabled');
            return undefined;
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            console.warn('⚠️  Redis retry time exhausted - caching disabled');
            return undefined;
          }
          if (options.attempt > 10) {
            console.warn('⚠️  Redis max retry attempts reached - caching disabled');
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      // Promisify Redis methods only if client is available and has methods
      if (this.client && this.client.get) {
        this.get = promisify(this.client.get).bind(this.client);
        this.set = promisify(this.client.set).bind(this.client);
        this.del = promisify(this.client.del).bind(this.client);
        this.exists = promisify(this.client.exists).bind(this.client);
        this.expire = promisify(this.client.expire).bind(this.client);
        this.flushdb = promisify(this.client.flushdb).bind(this.client);
        this.enabled = true;
      }
    } catch (error) {
      console.warn('⚠️  Redis not available - caching disabled:', error.message);
      this.enabled = false;
    }

    // Handle Redis connection events only if client exists
    if (this.client) {
      this.client.on('connect', () => {
        console.log('✅ Redis connected');
        this.enabled = true;
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis error:', err);
        this.enabled = false;
      });
      
      this.client.on('end', () => {
        console.log('🔌 Redis disconnected');
        this.enabled = false;
      });
    } else {
      console.warn('⚠️  Redis client not initialized - caching disabled');
      this.enabled = false;
    }
  }

  /**
   * Cache middleware factory
   */
  cache(options = {}) {
    const {
      ttl = 300, // 5 minutes default
      keyGenerator = null,
      skipCache = false,
      skipIf = null
    } = options;

    return async (req, res, next) => {
      try {
        // Skip caching if requested
        if (skipCache || (skipIf && skipIf(req))) {
          return next();
        }

        // Generate cache key
        const cacheKey = keyGenerator ? keyGenerator(req) : this.generateCacheKey(req);
        
        // Check if data exists in cache
        const cachedData = await this.get(cacheKey);
        
        if (cachedData) {
          // Return cached data
          const data = JSON.parse(cachedData);
          res.json(data);
          return;
        }

        // Store original res.json method
        const originalJson = res.json.bind(res);
        
        // Override res.json to cache the response
        res.json = (data) => {
          // Cache the response
          this.set(cacheKey, JSON.stringify(data), 'EX', ttl)
            .catch(err => console.error('Cache set error:', err));
          
          // Send the response
          originalJson(data);
        };

        next();
      } catch (error) {
        console.error('Cache middleware error:', error);
        next(); // Continue without caching
      }
    };
  }

  /**
   * Generate cache key from request
   */
  generateCacheKey(req) {
    const baseKey = `${req.method}:${req.originalUrl}`;
    const queryString = req.query ? JSON.stringify(req.query) : '';
    const user = req.user ? req.user.id : 'anonymous';
    
    return `cache:${user}:${baseKey}:${queryString}`;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern) {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
        console.log(`🗑️  Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Invalidate user cache
   */
  async invalidateUserCache(userId) {
    const pattern = `cache:${userId}:*`;
    await this.invalidatePattern(pattern);
  }

  /**
   * Invalidate all cache
   */
  async invalidateAllCache() {
    try {
      await this.flushdb();
      console.log('🗑️  All cache invalidated');
    } catch (error) {
      console.error('Cache flush error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      
      return {
        memory: this.parseRedisInfo(info),
        keyspace: this.parseRedisInfo(keyspace),
        connected: this.client.connected
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { connected: false, error: error.message };
    }
  }

  /**
   * Parse Redis info output
   */
  parseRedisInfo(info) {
    const lines = info.split('\r\n');
    const result = {};
    
    lines.forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = isNaN(value) ? value : Number(value);
        }
      }
    });
    
    return result;
  }

  /**
   * Cache specific data
   */
  async setCache(key, data, ttl = 300) {
    if (!this.enabled || !this.client) {
      return true; // Return true when caching is disabled
    }
    
    try {
      await this.set(key, JSON.stringify(data), 'EX', ttl);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Get cached data
   */
  async getCache(key) {
    if (!this.enabled || !this.client) {
      return null;
    }
    
    try {
      const data = await this.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Delete cached data
   */
  async deleteCache(key) {
    if (!this.enabled || !this.client) {
      return true; // Return true when caching is disabled
    }
    
    try {
      await this.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Check if cache exists
   */
  async cacheExists(key) {
    if (!this.enabled || !this.client) {
      return false;
    }
    
    try {
      const exists = await this.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Set cache expiration
   */
  async setCacheExpiration(key, ttl) {
    if (!this.enabled || !this.client) {
      return true; // Return true when caching is disabled
    }
    
    try {
      await this.expire(key, ttl);
      return true;
    } catch (error) {
      console.error('Cache expiration error:', error);
      return false;
    }
  }

  /**
   * API cache middleware
   */
  apiCache(ttl, keyGenerator) {
    return async (req, res, next) => {
      if (!this.enabled || !this.client) {
        return next();
      }

      try {
        const key = keyGenerator ? keyGenerator(req) : `api:${req.method}:${req.originalUrl}`;
        const cached = await this.getCache(key);
        
        if (cached) {
          return res.json(cached);
        }

        // Store original json method
        const originalJson = res.json;
        res.json = function(data) {
          // Cache the response
          cacheMiddleware.setCache(key, data, ttl).catch(err => {
            console.error('Cache set error:', err);
          });
          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        console.error('API cache error:', error);
        next();
      }
    };
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (!this.client) {
      return;
    }
    
    try {
      await this.client.quit();
      console.log('🔌 Redis connection closed');
    } catch (error) {
      console.error('Redis close error:', error);
    }
  }
}

// Create singleton instance
const cacheMiddleware = new CacheMiddleware();

export default cacheMiddleware;