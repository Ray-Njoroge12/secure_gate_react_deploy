// server/src/middleware/cacheMiddleware.js
import { CacheKeys, CacheTTL } from '../services/redisService.js';

// Redis service injection
let redisService = null;

export function setCacheRedisService(redis) {
  redisService = redis;
}
import crypto from 'crypto';

/**
 * Cache middleware for API responses
 * Provides intelligent caching with cache invalidation
 */
class CacheMiddleware {
  /**
   * Generic API response cache middleware
   */
  static apiCache(ttl = CacheTTL.MEDIUM, keyGenerator = null) {
    return async (req, res, next) => {
      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      try {
        // Generate cache key
        const cacheKey = keyGenerator 
          ? keyGenerator(req)
          : CacheKeys.apiResponse(req.path, JSON.stringify(req.query));

        // Try to get cached response
        const cachedResponse = await redisService.get(cacheKey);
        
        if (cachedResponse) {
          console.log(`[CACHE] API Cache hit: ${req.path}`);
          
          // Set cache headers
          res.set({
            'X-Cache': 'HIT',
            'Cache-Control': `max-age=${ttl}, must-revalidate`
          });
          
          return res.status(cachedResponse.statusCode).json(cachedResponse.data);
        }

        // Cache miss - intercept response
        console.log(`[CACHE] API Cache miss: ${req.path}`);
        
        const originalJson = res.json;
        const originalStatus = res.status;
        let statusCode = 200;

        // Intercept status method
        res.status = function(code) {
          statusCode = code;
          return originalStatus.call(this, code);
        };

        // Intercept json method to cache response
        res.json = function(data) {
          // Only cache successful responses
          if (statusCode >= 200 && statusCode < 300) {
            const responseToCache = {
              statusCode,
              data,
              timestamp: Date.now()
            };

            // Cache response asynchronously
            redisService.set(cacheKey, responseToCache, ttl)
              .catch(error => console.error('[CACHE] Failed to cache response:', error));
          }

          // Set cache headers for miss
          res.set({
            'X-Cache': 'MISS',
            'Cache-Control': `max-age=${ttl}, must-revalidate`
          });

          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        console.error('[CACHE] Cache middleware error:', error);
        next(); // Continue without caching on error
      }
    };
  }

  /**
   * User data cache middleware
   */
  static userCache(ttl = CacheTTL.MEDIUM) {
    return this.apiCache(ttl, (req) => {
      const userId = req.user?.id || req.params.userId;
      return CacheKeys.user(userId);
    });
  }

  /**
   * Visitor data cache middleware
   */
  static visitorCache(ttl = CacheTTL.SHORT) {
    return this.apiCache(ttl, (req) => {
      if (req.params.visitorId) {
        return CacheKeys.visitor(req.params.visitorId);
      }
      // For visitor lists, include date filter
      const date = req.query.date || new Date().toISOString().split('T')[0];
      return CacheKeys.visitorsByDate(date);
    });
  }

  /**
   * Dashboard stats cache middleware
   */
  static dashboardCache(ttl = CacheTTL.SHORT) {
    return this.apiCache(ttl, () => CacheKeys.dashboardStats());
  }

  /**
   * Access logs cache middleware
   */
  static accessLogsCache(ttl = CacheTTL.MEDIUM) {
    return this.apiCache(ttl, (req) => {
      const userId = req.user?.id;
      const page = req.query.page || 1;
      return CacheKeys.accessLogs(userId, page);
    });
  }

  /**
   * Cache invalidation middleware
   * Clears related cache entries when data is modified
   */
  static invalidateCache(patterns = []) {
    return async (req, res, next) => {
      // Store original methods
      const originalJson = res.json;
      
      res.json = function(data) {
        // Only invalidate cache on successful operations
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Invalidate cache patterns asynchronously
          patterns.forEach(async (pattern) => {
            try {
              if (typeof pattern === 'function') {
                pattern = pattern(req, data);
              }
              
              await redisService.deletePattern(pattern);
              console.log(`[CACHE] Invalidated cache pattern: ${pattern}`);
            } catch (error) {
              console.error('[CACHE] Cache invalidation error:', error);
            }
          });
        }
        
        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * User-specific cache invalidation
   */
  static invalidateUserCache(req, responseData) {
    const userId = req.user?.id || req.params.userId;
    return [
      CacheKeys.user(userId),
      `user:${userId}:*`,
      CacheKeys.dashboardStats(),
      'active_visitors'
    ];
  }

  /**
   * Visitor-specific cache invalidation
   */
  static invalidateVisitorCache(req, responseData) {
    const visitorId = req.params.visitorId || responseData?.visitor?.id;
    const date = new Date().toISOString().split('T')[0];
    
    return [
      visitorId ? CacheKeys.visitor(visitorId) : null,
      CacheKeys.visitorsByDate(date),
      'visitors:*',
      CacheKeys.dashboardStats(),
      CacheKeys.activeVisitors()
    ].filter(Boolean);
  }

  /**
   * Bulk invite cache invalidation
   */
  static invalidateBulkInviteCache(req, responseData) {
    const inviteCode = req.params.inviteCode || responseData?.inviteCode;
    
    return [
      inviteCode ? CacheKeys.bulkInvite(inviteCode) : null,
      'bulk_invite:*',
      CacheKeys.dashboardStats()
    ].filter(Boolean);
  }

  /**
   * Authentication cache invalidation
   */
  static invalidateAuthCache(req, responseData) {
    const userId = req.user?.id;
    const email = req.body?.email;
    
    return [
      userId ? CacheKeys.user(userId) : null,
      email ? CacheKeys.userByEmail(email) : null,
      'session:*',
      CacheKeys.dashboardStats()
    ].filter(Boolean);
  }
}

/**
 * Cache warming utilities
 */
export class CacheWarmer {
  /**
   * Warm dashboard stats cache
   */
  static async warmDashboardStats(calculateStats) {
    try {
      console.log('[CACHE] Warming dashboard stats cache...');
      const stats = await calculateStats();
      await redisService.set(CacheKeys.dashboardStats(), stats, CacheTTL.SHORT);
      console.log('[CACHE] Dashboard stats cache warmed');
    } catch (error) {
      console.error('[CACHE] Failed to warm dashboard stats:', error);
    }
  }

  /**
   * Warm active visitors cache
   */
  static async warmActiveVisitors(getActiveVisitors) {
    try {
      console.log('[CACHE] Warming active visitors cache...');
      const visitors = await getActiveVisitors();
      await redisService.set(CacheKeys.activeVisitors(), visitors, CacheTTL.SHORT);
      console.log('[CACHE] Active visitors cache warmed');
    } catch (error) {
      console.error('[CACHE] Failed to warm active visitors cache:', error);
    }
  }
}

export default CacheMiddleware;