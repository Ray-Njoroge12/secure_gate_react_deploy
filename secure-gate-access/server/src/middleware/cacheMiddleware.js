/**
 * Cache Middleware for API Response Caching
 * 
 * Implements Redis-based caching with configurable TTL and invalidation strategies
 */

import redis from 'redis';
import crypto from 'crypto';

class CacheMiddleware {
  constructor(options = {}) {
    this.redisClient = null;
    this.isConnected = false;
    this.defaultTTL = options.defaultTTL || 300; // 5 minutes
    this.maxTTL = options.maxTTL || 3600; // 1 hour
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
    
    this.init();
  }

  async init() {
    // Skip Redis initialization if disabled via environment variable
    if (process.env.ENABLE_REDIS_CACHE === 'false' || process.env.NODE_ENV === 'test') {
      console.log('Redis cache disabled (ENABLE_REDIS_CACHE=false or NODE_ENV=test)');
      this.isConnected = false;
      return;
    }

    try {
      // Create Redis client
      this.redisClient = redis.createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis connection failed after 10 retries');
              return false;
            }
            return Math.min(retries * 100, 3000);
          }
        },
        password: process.env.REDIS_PASSWORD,
        database: parseInt(process.env.REDIS_DB) || 0
      });

      // Event handlers
      this.redisClient.on('error', (error) => {
        console.error('Redis Client Error:', error);
        this.isConnected = false;
        this.cacheStats.errors++;
      });

      this.redisClient.on('connect', () => {
        console.log('Redis Client Connected');
        this.isConnected = true;
      });

      this.redisClient.on('ready', () => {
        console.log('Redis Client Ready');
        this.isConnected = true;
      });

      this.redisClient.on('end', () => {
        console.log('Redis Client Disconnected');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.redisClient.connect();
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      this.isConnected = false;
    }
  }

  /**
   * Generate cache key from request
   */
  generateCacheKey(req, options = {}) {
    const {
      includeQuery = true,
      includeBody = false,
      includeHeaders = false,
      prefix = 'cache'
    } = options;

    let key = `${prefix}:${req.method}:${req.path}`;

    // Include query parameters
    if (includeQuery && req.query && Object.keys(req.query).length > 0) {
      const sortedQuery = Object.keys(req.query)
        .sort()
        .map(key => `${key}=${req.query[key]}`)
        .join('&');
      key += `:query:${crypto.createHash('md5').update(sortedQuery).digest('hex')}`;
    }

    // Include request body (for POST/PUT requests)
    if (includeBody && req.body && Object.keys(req.body).length > 0) {
      const bodyHash = crypto.createHash('md5').update(JSON.stringify(req.body)).digest('hex');
      key += `:body:${bodyHash}`;
    }

    // Include relevant headers
    if (includeHeaders && req.headers) {
      const relevantHeaders = ['authorization', 'user-agent', 'accept-language'];
      const headerValues = relevantHeaders
        .filter(header => req.headers[header])
        .map(header => `${header}:${req.headers[header]}`)
        .join('|');
      
      if (headerValues) {
        const headerHash = crypto.createHash('md5').update(headerValues).digest('hex');
        key += `:headers:${headerHash}`;
      }
    }

    return key;
  }

  /**
   * Get cached response
   */
  async get(key) {
    if (!this.isConnected) {
      return null;
    }

    try {
      const cached = await this.redisClient.get(key);
      if (cached) {
        this.cacheStats.hits++;
        const parsed = JSON.parse(cached);
        
        // Check if cache has expired
        if (parsed.expires && Date.now() > parsed.expires) {
          await this.redisClient.del(key);
          this.cacheStats.misses++;
          return null;
        }
        
        return parsed.data;
      } else {
        this.cacheStats.misses++;
        return null;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      this.cacheStats.errors++;
      return null;
    }
  }

  /**
   * Set cached response
   */
  async set(key, data, ttl = null) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const actualTTL = Math.min(ttl || this.defaultTTL, this.maxTTL);
      const cacheData = {
        data: data,
        timestamp: Date.now(),
        expires: Date.now() + (actualTTL * 1000),
        ttl: actualTTL
      };

      await this.redisClient.setEx(key, actualTTL, JSON.stringify(cacheData));
      this.cacheStats.sets++;
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Delete cached response
   */
  async del(key) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.redisClient.del(key);
      this.cacheStats.deletes++;
      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern) {
    if (!this.isConnected) {
      return 0;
    }

    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        const result = await this.redisClient.del(keys);
        this.cacheStats.deletes += keys.length;
        return result;
      }
      return 0;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      this.cacheStats.errors++;
      return 0;
    }
  }

  /**
   * Cache middleware factory
   */
  createMiddleware(options = {}) {
    const {
      ttl = this.defaultTTL,
      keyOptions = {},
      skipCache = false,
      cacheCondition = null,
      invalidateOn = []
    } = options;

    return async (req, res, next) => {
      // Skip caching if disabled
      if (skipCache || !this.isConnected) {
        return next();
      }

      // Skip non-GET requests unless explicitly allowed
      if (req.method !== 'GET' && !options.allowMethods?.includes(req.method)) {
        return next();
      }

      // Check cache condition
      if (cacheCondition && !cacheCondition(req)) {
        return next();
      }

      try {
        // Generate cache key
        const cacheKey = this.generateCacheKey(req, keyOptions);
        
        // Try to get from cache
        const cachedData = await this.get(cacheKey);
        
        if (cachedData) {
          // Add cache headers
          res.set({
            'X-Cache': 'HIT',
            'X-Cache-TTL': ttl.toString(),
            'Cache-Control': `public, max-age=${ttl}`
          });
          
          return res.json(cachedData);
        }

        // Cache miss - continue to route handler
        // Store original json method
        const originalJson = res.json.bind(res);
        
        // Override json method to cache response
        res.json = async (data) => {
          // Cache the response
          await this.set(cacheKey, data, ttl);
          
          // Add cache headers
          res.set({
            'X-Cache': 'MISS',
            'X-Cache-TTL': ttl.toString(),
            'Cache-Control': `public, max-age=${ttl}`
          });
          
          // Send response
          return originalJson(data);
        };

        next();
      } catch (error) {
        console.error('Cache middleware error:', error);
        next();
      }
    };
  }

  /**
   * Cache invalidation middleware
   */
  createInvalidationMiddleware(options = {}) {
    const {
      patterns = [],
      customInvalidation = null
    } = options;

    return async (req, res, next) => {
      // Store original methods
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);

      // Override response methods to invalidate cache after successful operations
      res.json = async (data) => {
        try {
          // Custom invalidation logic
          if (customInvalidation) {
            await customInvalidation(req, res, data);
          }

          // Pattern-based invalidation
          for (const pattern of patterns) {
            const cachePattern = typeof pattern === 'function' 
              ? pattern(req, res, data) 
              : pattern;
            
            if (cachePattern) {
              await this.delPattern(cachePattern);
            }
          }

          return originalJson(data);
        } catch (error) {
          console.error('Cache invalidation error:', error);
          return originalJson(data);
        }
      };

      res.send = async (data) => {
        try {
          // Custom invalidation logic
          if (customInvalidation) {
            await customInvalidation(req, res, data);
          }

          // Pattern-based invalidation
          for (const pattern of patterns) {
            const cachePattern = typeof pattern === 'function' 
              ? pattern(req, res, data) 
              : pattern;
            
            if (cachePattern) {
              await this.delPattern(cachePattern);
            }
          }

          return originalSend(data);
        } catch (error) {
          console.error('Cache invalidation error:', error);
          return originalSend(data);
        }
      };

      next();
    };
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? (this.cacheStats.hits / total * 100).toFixed(2) : 0;
    
    return {
      ...this.cacheStats,
      hitRate: `${hitRate}%`,
      isConnected: this.isConnected,
      total: total
    };
  }

  /**
   * Clear all cache statistics
   */
  clearStats() {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.isConnected) {
      return { status: 'error', message: 'Redis not connected' };
    }

    try {
      const result = await this.redisClient.ping();
      return { status: 'healthy', message: 'Redis connected', response: result };
    } catch (error) {
      return { status: 'error', message: 'Redis health check failed', error: error.message };
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.isConnected = false;
    }
  }
}

// Create singleton instance
const cacheMiddleware = new CacheMiddleware();

export default cacheMiddleware;