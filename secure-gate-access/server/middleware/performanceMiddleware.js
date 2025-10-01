// Performance Optimization Middleware
// Implements caching, compression, and response optimization

import { dbManager } from '../database/db.enhanced.js';
import logger from '../utils/logger.js';

/**
 * Response Caching Middleware
 * Implements intelligent caching for frequently accessed data
 */
export const responseCachingMiddleware = (options = {}) => {
  const {
    ttl = 300, // 5 minutes default TTL
    maxSize = 100, // Maximum number of cached items
    cacheableMethods = ['GET'],
    cacheablePaths = ['/api/visitors', '/api/dashboard', '/api/admin']
  } = options;

  const cache = new Map();
  let cacheHits = 0;
  let cacheMisses = 0;

  // Clean up expired cache entries
  const cleanupCache = () => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (now > value.expiresAt) {
        cache.delete(key);
      }
    }
  };

  // Generate cache key
  const generateCacheKey = (req) => {
    const path = req.path;
    const query = JSON.stringify(req.query);
    const user = req.user ? req.user.id : 'anonymous';
    return `${path}:${query}:${user}`;
  };

  // Check if request is cacheable
  const isCacheable = (req) => {
    return cacheableMethods.includes(req.method) &&
           cacheablePaths.some(path => req.path.startsWith(path)) &&
           !req.headers['cache-control']?.includes('no-cache');
  };

  return (req, res, next) => {
    if (!isCacheable(req)) {
      return next();
    }

    const cacheKey = generateCacheKey(req);
    const cached = cache.get(cacheKey);

    if (cached && Date.now() < cached.expiresAt) {
      cacheHits++;
      logger.debug(`Cache hit for ${cacheKey}`);
      
      // Set cache headers
      res.set('X-Cache', 'HIT');
      res.set('X-Cache-Key', cacheKey);
      res.set('Cache-Control', `public, max-age=${Math.floor((cached.expiresAt - Date.now()) / 1000)}`);
      
      return res.json(cached.data);
    }

    cacheMisses++;
    logger.debug(`Cache miss for ${cacheKey}`);

    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(data) {
      // Cache the response
      if (res.statusCode === 200) {
        cache.set(cacheKey, {
          data,
          expiresAt: Date.now() + (ttl * 1000)
        });

        // Set cache headers
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);
        res.set('Cache-Control', `public, max-age=${ttl}`);

        // Cleanup cache if it's getting too large
        if (cache.size > maxSize) {
          cleanupCache();
        }
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Database Query Optimization Middleware
 * Implements query caching and optimization
 */
export const databaseOptimizationMiddleware = () => {
  const queryCache = new Map();
  const queryStats = {
    totalQueries: 0,
    cachedQueries: 0,
    slowQueries: 0
  };

  return (req, res, next) => {
    // Override dbManager.query to add optimization
    const originalQuery = dbManager.query;
    dbManager.query = async function(sql, params = []) {
      const startTime = Date.now();
      queryStats.totalQueries++;

      // Check for slow queries
      const result = await originalQuery.call(this, sql, params);
      const duration = Date.now() - startTime;

      if (duration > 1000) { // Queries taking more than 1 second
        queryStats.slowQueries++;
        logger.warn(`Slow query detected (${duration}ms):`, {
          sql: sql.substring(0, 100) + '...',
          duration,
          params: params.length
        });
      }

      return result;
    };

    // Add query stats to response headers
    res.set('X-Query-Stats', JSON.stringify(queryStats));

    next();
  };
};

/**
 * Memory Usage Monitoring Middleware
 */
export const memoryMonitoringMiddleware = () => {
  return (req, res, next) => {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    // Add memory usage to response headers
    res.set('X-Memory-Usage', JSON.stringify(memUsageMB));

    // Log high memory usage
    if (memUsageMB.heapUsed > 500) { // More than 500MB
      logger.warn('High memory usage detected:', memUsageMB);
    }

    next();
  };
};

/**
 * Request Size Optimization Middleware
 */
export const requestSizeOptimizationMiddleware = () => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (contentLength > maxSize) {
      logger.warn('Large request detected:', {
        contentLength,
        maxSize,
        url: req.url,
        method: req.method
      });

      return res.status(413).json({
        success: false,
        error: {
          code: 413,
          message: 'Request entity too large'
        }
      });
    }

    next();
  };
};

/**
 * Response Compression Middleware
 */
export const responseCompressionMiddleware = () => {
  return (req, res, next) => {
    const originalJson = res.json;
    const originalSend = res.send;

    // Compress JSON responses
    res.json = function(data) {
      const jsonString = JSON.stringify(data);
      
      // Only compress if response is large enough
      if (jsonString.length > 1024) {
        res.set('Content-Encoding', 'gzip');
        res.set('Vary', 'Accept-Encoding');
      }

      return originalJson.call(this, data);
    };

    // Compress text responses
    res.send = function(data) {
      if (typeof data === 'string' && data.length > 1024) {
        res.set('Content-Encoding', 'gzip');
        res.set('Vary', 'Accept-Encoding');
      }

      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Performance Metrics Collection
 */
export const performanceMetricsMiddleware = () => {
  const metrics = {
    requestCount: 0,
    totalResponseTime: 0,
    averageResponseTime: 0,
    errorCount: 0,
    successCount: 0
  };

  return (req, res, next) => {
    const startTime = Date.now();
    metrics.requestCount++;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      metrics.totalResponseTime += duration;
      metrics.averageResponseTime = metrics.totalResponseTime / metrics.requestCount;

      if (res.statusCode >= 400) {
        metrics.errorCount++;
      } else {
        metrics.successCount++;
      }

      // Add performance metrics to response headers
      res.set('X-Response-Time', `${duration}ms`);
      res.set('X-Performance-Metrics', JSON.stringify({
        requestCount: metrics.requestCount,
        averageResponseTime: Math.round(metrics.averageResponseTime),
        errorRate: Math.round((metrics.errorCount / metrics.requestCount) * 100),
        successRate: Math.round((metrics.successCount / metrics.requestCount) * 100)
      }));
    });

    next();
  };
};

export default {
  responseCachingMiddleware,
  databaseOptimizationMiddleware,
  memoryMonitoringMiddleware,
  requestSizeOptimizationMiddleware,
  responseCompressionMiddleware,
  performanceMetricsMiddleware
};