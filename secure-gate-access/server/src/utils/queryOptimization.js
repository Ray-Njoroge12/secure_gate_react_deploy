// server/src/utils/queryOptimization.js
/**
 * Database Query Optimization Utilities
 * Performance improvements for database operations
 */

import logger from './logger.js';

/**
 * Query Performance Monitor
 * Tracks slow queries and provides optimization insights
 */
class QueryPerformanceMonitor {
  constructor() {
    this.slowQueries = new Map();
    this.queryStats = new Map();
    this.slowQueryThreshold = 1000; // 1 second
  }

  /**
   * Monitor query execution time
   */
  async monitorQuery(queryName, queryFn, params = {}) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const result = await queryFn();
      const executionTime = Date.now() - startTime;
      const memoryUsed = process.memoryUsage().heapUsed - startMemory;

      // Track query statistics
      this.recordQueryStats(queryName, executionTime, memoryUsed, true);

      // Log slow queries
      if (executionTime > this.slowQueryThreshold) {
        this.recordSlowQuery(queryName, executionTime, params);
      }

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordQueryStats(queryName, executionTime, 0, false);

      logger.error('Query execution failed:', {
        queryName,
        executionTime,
        params,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Record query statistics
   */
  recordQueryStats(queryName, executionTime, memoryUsed, success) {
    if (!this.queryStats.has(queryName)) {
      this.queryStats.set(queryName, {
        totalExecutions: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0,
        successCount: 0,
        errorCount: 0,
        totalMemory: 0,
        avgMemory: 0
      });
    }

    const stats = this.queryStats.get(queryName);
    stats.totalExecutions++;
    stats.totalTime += executionTime;
    stats.avgTime = stats.totalTime / stats.totalExecutions;
    stats.minTime = Math.min(stats.minTime, executionTime);
    stats.maxTime = Math.max(stats.maxTime, executionTime);
    stats.totalMemory += memoryUsed;
    stats.avgMemory = stats.totalMemory / stats.totalExecutions;

    if (success) {
      stats.successCount++;
    } else {
      stats.errorCount++;
    }
  }

  /**
   * Record slow query for analysis
   */
  recordSlowQuery(queryName, executionTime, params) {
    const key = `${queryName}_${Date.now()}`;

    this.slowQueries.set(key, {
      queryName,
      executionTime,
      params,
      timestamp: new Date().toISOString()
    });

    // Keep only last 100 slow queries
    if (this.slowQueries.size > 100) {
      const firstKey = this.slowQueries.keys().next().value;
      this.slowQueries.delete(firstKey);
    }

    logger.warn('Slow query detected:', {
      queryName,
      executionTime,
      params: Object.keys(params).length > 0 ? params : 'none'
    });
  }

  /**
   * Get query performance statistics
   */
  getQueryStats() {
    const stats = {};

    for (const [queryName, data] of this.queryStats.entries()) {
      stats[queryName] = {
        ...data,
        successRate: data.totalExecutions > 0 ? data.successCount / data.totalExecutions : 0
      };
    }

    return stats;
  }

  /**
   * Get slow queries
   */
  getSlowQueries() {
    return Array.from(this.slowQueries.values())
      .sort((a, b) => b.executionTime - a.executionTime);
  }

  /**
   * Get recommendations for query optimization
   */
  getOptimizationRecommendations() {
    const recommendations = [];
    const stats = this.getQueryStats();

    for (const [queryName, data] of Object.entries(stats)) {
      if (data.avgTime > 500) {
        recommendations.push({
          type: 'slow_average',
          queryName,
          severity: data.avgTime > 1000 ? 'high' : 'medium',
          message: `Query "${queryName}" has average execution time of ${data.avgTime}ms`,
          suggestion: 'Consider adding indexes, optimizing WHERE clauses, or implementing caching'
        });
      }

      if (data.maxTime > 5000) {
        recommendations.push({
          type: 'slow_max',
          queryName,
          severity: 'high',
          message: `Query "${queryName}" had maximum execution time of ${data.maxTime}ms`,
          suggestion: 'Investigate specific cases causing very slow execution'
        });
      }

      if (data.successRate < 0.95) {
        recommendations.push({
          type: 'low_success_rate',
          queryName,
          severity: 'medium',
          message: `Query "${queryName}" has success rate of ${(data.successRate * 100).toFixed(1)}%`,
          suggestion: 'Review error handling and query logic'
        });
      }

      if (data.avgMemory > 10 * 1024 * 1024) { // 10MB
        recommendations.push({
          type: 'high_memory',
          queryName,
          severity: 'medium',
          message: `Query "${queryName}" uses average ${(data.avgMemory / 1024 / 1024).toFixed(2)}MB memory`,
          suggestion: 'Consider result set pagination or memory optimization'
        });
      }
    }

    return recommendations;
  }

  /**
   * Reset statistics
   */
  reset() {
    this.slowQueries.clear();
    this.queryStats.clear();
  }
}

/**
 * Database Connection Pool Optimizer
 */
class ConnectionPoolOptimizer {
  constructor(pool) {
    this.pool = pool;
    this.connectionStats = {
      active: 0,
      idle: 0,
      waiting: 0,
      created: 0,
      destroyed: 0
    };

    this.monitoringInterval = null;
    this.startMonitoring();
  }

  /**
   * Start connection pool monitoring
   */
  startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      if (this.pool) {
        this.updateConnectionStats();
      }
    }, 5000); // Every 5 seconds
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Update connection statistics
   */
  updateConnectionStats() {
    try {
      // These properties might vary depending on the connection pool library
      this.connectionStats = {
        active: this.pool.activeConnections || 0,
        idle: this.pool.idleConnections || 0,
        waiting: this.pool.waitingClients || 0,
        total: this.pool.totalConnections || 0,
        max: this.pool.maxConnections || this.pool.max || 10
      };

      // Check for potential issues
      this.checkPoolHealth();

    } catch (error) {
      logger.error('Error updating connection stats:', error);
    }
  }

  /**
   * Check connection pool health
   */
  checkPoolHealth() {
    const { active, idle, waiting, total, max } = this.connectionStats;
    const utilization = total / max;

    if (utilization > 0.9) {
      logger.warn('High connection pool utilization', {
        utilization: (utilization * 100).toFixed(1) + '%',
        active,
        idle,
        waiting,
        total,
        max
      });
    }

    if (waiting > 5) {
      logger.warn('High number of waiting connections', {
        waiting,
        active,
        idle
      });
    }
  }

  /**
   * Get connection pool statistics
   */
  getStats() {
    return {
      ...this.connectionStats,
      utilization: this.connectionStats.total / this.connectionStats.max,
      efficiency: this.connectionStats.active / (this.connectionStats.active + this.connectionStats.idle) || 0
    };
  }

  /**
   * Get pool optimization recommendations
   */
  getRecommendations() {
    const recommendations = [];
    const stats = this.getStats();

    if (stats.utilization > 0.8) {
      recommendations.push({
        type: 'pool_size',
        severity: 'medium',
        message: 'Connection pool utilization is high',
        suggestion: 'Consider increasing max connections or optimizing query performance'
      });
    }

    if (stats.efficiency < 0.5 && stats.total > 5) {
      recommendations.push({
        type: 'pool_efficiency',
        severity: 'low',
        message: 'Many idle connections detected',
        suggestion: 'Consider reducing max connections or implementing connection timeout'
      });
    }

    if (this.connectionStats.waiting > 10) {
      recommendations.push({
        type: 'waiting_connections',
        severity: 'high',
        message: 'High number of waiting connections',
        suggestion: 'Increase pool size or optimize query performance immediately'
      });
    }

    return recommendations;
  }
}

/**
 * Query Cache Manager
 */
class QueryCacheManager {
  constructor(redisClient, defaultTTL = 300) {
    this.redis = redisClient;
    this.defaultTTL = defaultTTL; // 5 minutes
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      errors: 0
    };
  }

  /**
   * Get cached query result
   */
  async get(key) {
    try {
      const cached = await this.redis.get(this.getCacheKey(key));

      if (cached) {
        this.cacheStats.hits++;
        return JSON.parse(cached);
      } else {
        this.cacheStats.misses++;
        return null;
      }

    } catch (error) {
      this.cacheStats.errors++;
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached query result
   */
  async set(key, data, ttl = this.defaultTTL) {
    try {
      await this.redis.setex(
        this.getCacheKey(key),
        ttl,
        JSON.stringify(data)
      );

      this.cacheStats.sets++;
      return true;

    } catch (error) {
      this.cacheStats.errors++;
      logger.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Execute query with caching
   */
  async cachedQuery(key, queryFn, ttl = this.defaultTTL) {
    // Try to get from cache first
    const cached = await this.get(key);
    if (cached) {
      return cached;
    }

    // Execute query and cache result
    const result = await queryFn();
    await this.set(key, result, ttl);

    return result;
  }

  /**
   * Invalidate cached query
   */
  async invalidate(pattern) {
    try {
      const keys = await this.redis.keys(this.getCacheKey(pattern));

      if (keys.length > 0) {
        await this.redis.del(keys);
      }

      return keys.length;

    } catch (error) {
      logger.error('Cache invalidation error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.cacheStats.hits + this.cacheStats.misses;

    return {
      ...this.cacheStats,
      hitRate: total > 0 ? this.cacheStats.hits / total : 0,
      totalRequests: total
    };
  }

  /**
   * Generate cache key
   */
  getCacheKey(key) {
    return `query_cache:${key}`;
  }

  /**
   * Reset cache statistics
   */
  resetStats() {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      errors: 0
    };
  }
}

// Create singleton instances
export const queryPerformanceMonitor = new QueryPerformanceMonitor();

// Export classes for custom instances
export {
  QueryPerformanceMonitor,
  ConnectionPoolOptimizer,
  QueryCacheManager
};