// server/src/services/optimizedDatabaseService.js
/**
 * Optimized Database Service
 * High-performance database operations with monitoring and caching
 */

import db from '../database/db.js';
import { 
  queryPerformanceMonitor, 
  ConnectionPoolOptimizer,
  QueryCacheManager 
} from '../utils/queryOptimization.js';
import redisServiceClass from './redisService.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

/**
 * Optimized Database Service with Performance Monitoring
 */
class OptimizedDatabaseService {
  constructor() {
    this.db = db;
    this.queryCache = null;
    this.connectionOptimizer = null;
    this.initialized = false;
  }
  
  /**
   * Initialize the optimized database service
   */
  async initialize(redisService = null) {
    try {
      // Initialize query cache if Redis is available
      if (redisService && redisService.isConnected()) {
        this.queryCache = new QueryCacheManager(redisService.client, 300); // 5 minute default TTL
        logger.info('Query cache initialized with Redis backend');
      }
      
      // Initialize connection pool optimizer
      if (this.db && this.db.pool) {
        this.connectionOptimizer = new ConnectionPoolOptimizer(this.db.pool);
        logger.info('Connection pool optimizer initialized');
      }
      
      this.initialized = true;
      logger.info('Optimized database service initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize optimized database service:', error);
      this.initialized = false;
    }
  }
  
  /**
   * Execute optimized query with monitoring and caching
   */
  async executeQuery(queryName, queryText, params = [], options = {}) {
    const {
      cache = false,
      cacheTTL = 300,
      cacheKey = null,
      timeout = 30000
    } = options;
    
    const finalCacheKey = cacheKey || this.generateCacheKey(queryName, params);
    
    return await queryPerformanceMonitor.monitorQuery(
      queryName,
      async () => {
        // Try cache first if enabled
        if (cache && this.queryCache) {
          const cached = await this.queryCache.get(finalCacheKey);
          if (cached) {
            return cached;
          }
        }
        
        // Execute query with timeout
        const result = await this.executeWithTimeout(queryText, params, timeout);
        
        // Cache result if enabled
        if (cache && this.queryCache && result) {
          await this.queryCache.set(finalCacheKey, result, cacheTTL);
        }
        
        return result;
      },
      { queryText, params, cache: cache ? finalCacheKey : null }
    );
  }
  
  /**
   * Execute query with timeout protection
   */
  async executeWithTimeout(queryText, params, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Query timeout after ${timeout}ms`));
      }, timeout);
      
      this.db.query(queryText, params)
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
  
  /**
   * Optimized visitor queries with caching
   */
  async getActiveVisitors(options = {}) {
    return await this.executeQuery(
      'getActiveVisitors',
      `SELECT v.*, u.first_name as resident_first_name, u.last_name as resident_last_name 
       FROM visitors v 
       LEFT JOIN users u ON v.resident_id = u.id 
       WHERE v.status = 'active' AND v.expiry_time > NOW() 
       ORDER BY v.created_at DESC`,
      [],
      { 
        cache: true, 
        cacheTTL: 60, // 1 minute cache for active visitors
        ...options 
      }
    );
  }
  
  async getVisitorById(visitorId, options = {}) {
    return await this.executeQuery(
      'getVisitorById',
      `SELECT v.*, u.first_name as resident_first_name, u.last_name as resident_last_name 
       FROM visitors v 
       LEFT JOIN users u ON v.resident_id = u.id 
       WHERE v.id = ?`,
      [visitorId],
      { 
        cache: true, 
        cacheTTL: 300, // 5 minute cache for visitor details
        cacheKey: `visitor_${visitorId}`,
        ...options 
      }
    );
  }
  
  async getVisitorsByResident(residentId, limit = 50, options = {}) {
    return await this.executeQuery(
      'getVisitorsByResident',
      `SELECT v.* FROM visitors v 
       WHERE v.resident_id = ? 
       ORDER BY v.created_at DESC 
       LIMIT ?`,
      [residentId, limit],
      { 
        cache: true, 
        cacheTTL: 180, // 3 minute cache
        cacheKey: `resident_visitors_${residentId}_${limit}`,
        ...options 
      }
    );
  }
  
  /**
   * Optimized user queries with caching
   */
  async getUserById(userId, options = {}) {
    return await this.executeQuery(
      'getUserById',
      'SELECT * FROM users WHERE id = ?',
      [userId],
      { 
        cache: true, 
        cacheTTL: 600, // 10 minute cache for user data
        cacheKey: `user_${userId}`,
        ...options 
      }
    );
  }
  
  async getUserByUsername(username, options = {}) {
    return await this.executeQuery(
      'getUserByUsername',
      'SELECT * FROM users WHERE username = ?',
      [username],
      { 
        cache: true, 
        cacheTTL: 600, // 10 minute cache
        cacheKey: `user_username_${username}`,
        ...options 
      }
    );
  }
  
  /**
   * Optimized access log queries with intelligent caching
   */
  async getRecentAccessLogs(limit = 100, options = {}) {
    return await this.executeQuery(
      'getRecentAccessLogs',
      `SELECT al.*, v.first_name, v.last_name, v.phone, v.status as visitor_status,
              u.first_name as resident_first_name, u.last_name as resident_last_name
       FROM access_logs al
       LEFT JOIN visitors v ON al.visitor_id = v.id
       LEFT JOIN users u ON v.resident_id = u.id
       ORDER BY al.timestamp DESC
       LIMIT ?`,
      [limit],
      { 
        cache: true, 
        cacheTTL: 30, // 30 second cache for recent logs
        cacheKey: `recent_access_logs_${limit}`,
        ...options 
      }
    );
  }
  
  async getAccessLogsByDateRange(startDate, endDate, limit = 1000, options = {}) {
    return await this.executeQuery(
      'getAccessLogsByDateRange',
      `SELECT al.*, v.first_name, v.last_name, v.phone
       FROM access_logs al
       LEFT JOIN visitors v ON al.visitor_id = v.id
       WHERE al.timestamp BETWEEN ? AND ?
       ORDER BY al.timestamp DESC
       LIMIT ?`,
      [startDate, endDate, limit],
      { 
        cache: true, 
        cacheTTL: 300, // 5 minute cache for historical data
        cacheKey: `access_logs_${startDate}_${endDate}_${limit}`,
        ...options 
      }
    );
  }
  
  /**
   * Batch operations with optimized performance
   */
  async bulkInsertVisitors(visitors, options = {}) {
    const batchSize = options.batchSize || 100;
    const results = [];
    
    for (let i = 0; i < visitors.length; i += batchSize) {
      const batch = visitors.slice(i, i + batchSize);
      
      const batchResult = await queryPerformanceMonitor.monitorQuery(
        'bulkInsertVisitors',
        async () => {
          const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
          const values = batch.flatMap(v => [
            v.resident_id, v.first_name, v.last_name, v.phone,
            v.purpose, v.expiry_time, v.qr_code, v.otp_code, v.status
          ]);
          
          return await this.executeWithTimeout(
            `INSERT INTO visitors (resident_id, first_name, last_name, phone, purpose, expiry_time, qr_code, otp_code, status) VALUES ${placeholders}`,
            values,
            options.timeout || 60000
          );
        },
        { batchSize: batch.length, totalBatches: Math.ceil(visitors.length / batchSize) }
      );
      
      results.push(batchResult);
      
      // Invalidate related caches
      if (this.queryCache) {
        await this.queryCache.invalidate('active_visitors*');
        await this.queryCache.invalidate('recent_access_logs*');
      }
    }
    
    return results;
  }
  
  /**
   * Cache management methods
   */
  async invalidateCache(pattern) {
    if (this.queryCache) {
      return await this.queryCache.invalidate(pattern);
    }
    return 0;
  }
  
  async invalidateUserCache(userId) {
    if (this.queryCache) {
      await this.queryCache.invalidate(`user_${userId}*`);
      await this.queryCache.invalidate(`resident_visitors_${userId}*`);
    }
  }
  
  async invalidateVisitorCache(visitorId) {
    if (this.queryCache) {
      await this.queryCache.invalidate(`visitor_${visitorId}*`);
      await this.queryCache.invalidate('active_visitors*');
      await this.queryCache.invalidate('recent_access_logs*');
    }
  }
  
  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const stats = {
      queries: queryPerformanceMonitor.getQueryStats(),
      slowQueries: queryPerformanceMonitor.getSlowQueries(),
      recommendations: queryPerformanceMonitor.getOptimizationRecommendations()
    };
    
    if (this.queryCache) {
      stats.cache = this.queryCache.getStats();
    }
    
    if (this.connectionOptimizer) {
      stats.connectionPool = this.connectionOptimizer.getStats();
      stats.connectionRecommendations = this.connectionOptimizer.getRecommendations();
    }
    
    return stats;
  }
  
  /**
   * Generate cache key for query
   */
  generateCacheKey(queryName, params) {
    const paramHash = params.length > 0 ? 
      crypto.createHash('md5').update(JSON.stringify(params)).digest('hex').slice(0, 8) :
      'noparams';
    
    return `${queryName}_${paramHash}`;
  }
  
  /**
   * Health check for database service
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      // Test basic connectivity
      await this.executeWithTimeout('SELECT 1 as test', [], 5000);
      
      const responseTime = Date.now() - startTime;
      const stats = this.getPerformanceStats();
      
      return {
        status: 'healthy',
        responseTime,
        connectionPool: this.connectionOptimizer ? this.connectionOptimizer.getStats() : null,
        cache: this.queryCache ? this.queryCache.getStats() : null,
        queryPerformance: {
          totalQueries: Object.values(stats.queries).reduce((sum, q) => sum + q.totalExecutions, 0),
          avgResponseTime: Object.values(stats.queries).reduce((sum, q) => sum + q.avgTime, 0) / Object.keys(stats.queries).length || 0,
          slowQueries: stats.slowQueries.length
        }
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        connectionPool: this.connectionOptimizer ? this.connectionOptimizer.getStats() : null
      };
    }
  }
  
  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.connectionOptimizer) {
      this.connectionOptimizer.stopMonitoring();
    }
    
    if (this.queryCache) {
      this.queryCache.resetStats();
    }
    
    queryPerformanceMonitor.reset();
  }
}

// Create and export singleton instance
const optimizedDb = new OptimizedDatabaseService();

export default optimizedDb;
export { OptimizedDatabaseService };