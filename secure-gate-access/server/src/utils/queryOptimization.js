/**
 * Database Query Optimization Utilities
 * 
 * Provides tools for monitoring, analyzing, and optimizing database queries
 */

import { db } from '../database/db.enhanced.js';

class QueryOptimizer {
  constructor() {
    this.slowQueryThreshold = parseInt(process.env.SLOW_REQUEST_THRESHOLD) || 1000; // 1 second
    this.queryStats = new Map();
    this.slowQueries = [];
    this.isMonitoring = false;
    
    // Query performance counters
    this.stats = {
      totalQueries: 0,
      slowQueries: 0,
      averageQueryTime: 0,
      totalQueryTime: 0,
      queriesByType: new Map(),
      topSlowQueries: []
    };
  }

  /**
   * Start query monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    console.log('Query optimization monitoring started');
    
    // Set up periodic cleanup of old stats
    setInterval(() => {
      this.cleanupOldStats();
    }, 300000); // 5 minutes
  }

  /**
   * Stop query monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
    console.log('Query optimization monitoring stopped');
  }

  /**
   * Monitor a query execution
   */
  async monitorQuery(queryFunction, queryName, queryType = 'SELECT') {
    if (!this.isMonitoring) {
      return await queryFunction();
    }

    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    try {
      const result = await queryFunction();
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      const endMemory = process.memoryUsage();
      
      // Update statistics
      this.updateStats(queryName, queryType, executionTime, true, null);
      
      // Check if query was slow
      if (executionTime > this.slowQueryThreshold) {
        this.recordSlowQuery(queryName, queryType, executionTime, null);
      }
      
      // Log query performance
      if (process.env.ENABLE_DATABASE_METRICS === 'true') {
        console.log(`Query: ${queryName} | Type: ${queryType} | Time: ${executionTime}ms | Memory: ${endMemory.heapUsed - startMemory.heapUsed} bytes`);
      }
      
      return result;
    } catch (error) {
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Update statistics for failed query
      this.updateStats(queryName, queryType, executionTime, false, error.message);
      
      // Record slow failed query
      if (executionTime > this.slowQueryThreshold) {
        this.recordSlowQuery(queryName, queryType, executionTime, error.message);
      }
      
      throw error;
    }
  }

  /**
   * Update query statistics
   */
  updateStats(queryName, queryType, executionTime, success, error) {
    this.stats.totalQueries++;
    this.stats.totalQueryTime += executionTime;
    this.stats.averageQueryTime = this.stats.totalQueryTime / this.stats.totalQueries;
    
    if (!success) {
      this.stats.slowQueries++;
    }
    
    // Update query type statistics
    if (!this.stats.queriesByType.has(queryType)) {
      this.stats.queriesByType.set(queryType, {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        slowQueries: 0
      });
    }
    
    const typeStats = this.stats.queriesByType.get(queryType);
    typeStats.count++;
    typeStats.totalTime += executionTime;
    typeStats.averageTime = typeStats.totalTime / typeStats.count;
    
    if (executionTime > this.slowQueryThreshold) {
      typeStats.slowQueries++;
    }
    
    // Update individual query stats
    if (!this.queryStats.has(queryName)) {
      this.queryStats.set(queryName, {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0,
        slowQueries: 0,
        errors: 0,
        lastExecuted: null
      });
    }
    
    const queryStat = this.queryStats.get(queryName);
    queryStat.count++;
    queryStat.totalTime += executionTime;
    queryStat.averageTime = queryStat.totalTime / queryStat.count;
    queryStat.minTime = Math.min(queryStat.minTime, executionTime);
    queryStat.maxTime = Math.max(queryStat.maxTime, executionTime);
    queryStat.lastExecuted = new Date();
    
    if (executionTime > this.slowQueryThreshold) {
      queryStat.slowQueries++;
    }
    
    if (!success) {
      queryStat.errors++;
    }
  }

  /**
   * Record slow query details
   */
  recordSlowQuery(queryName, queryType, executionTime, error) {
    const slowQuery = {
      queryName,
      queryType,
      executionTime,
      error,
      timestamp: new Date(),
      memoryUsage: process.memoryUsage()
    };
    
    this.slowQueries.push(slowQuery);
    
    // Keep only last 100 slow queries
    if (this.slowQueries.length > 100) {
      this.slowQueries.shift();
    }
    
    // Update top slow queries
    this.updateTopSlowQueries(slowQuery);
    
    // Log slow query
    console.warn(`SLOW QUERY DETECTED: ${queryName} (${queryType}) took ${executionTime}ms${error ? ` - Error: ${error}` : ''}`);
  }

  /**
   * Update top slow queries list
   */
  updateTopSlowQueries(slowQuery) {
    // Add to top slow queries if it's in the top 10
    this.stats.topSlowQueries.push(slowQuery);
    this.stats.topSlowQueries.sort((a, b) => b.executionTime - a.executionTime);
    
    // Keep only top 10
    if (this.stats.topSlowQueries.length > 10) {
      this.stats.topSlowQueries = this.stats.topSlowQueries.slice(0, 10);
    }
  }

  /**
   * Get query performance statistics
   */
  getStats() {
    return {
      ...this.stats,
      queriesByType: Object.fromEntries(this.stats.queriesByType),
      queryDetails: Object.fromEntries(this.queryStats),
      slowQueriesCount: this.slowQueries.length,
      recentSlowQueries: this.slowQueries.slice(-10),
      topSlowQueries: this.stats.topSlowQueries
    };
  }

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions() {
    const suggestions = [];
    
    // Check for slow queries
    if (this.stats.slowQueries > 0) {
      suggestions.push({
        type: 'slow_queries',
        severity: 'high',
        message: `${this.stats.slowQueries} slow queries detected (${this.stats.averageQueryTime.toFixed(2)}ms average)`,
        recommendations: [
          'Review slow query execution plans',
          'Add missing database indexes',
          'Optimize query structure',
          'Consider query result caching'
        ]
      });
    }
    
    // Check query type performance
    for (const [queryType, stats] of this.stats.queriesByType) {
      if (stats.averageTime > this.slowQueryThreshold) {
        suggestions.push({
          type: 'query_type_performance',
          severity: 'medium',
          message: `${queryType} queries are slow (${stats.averageTime.toFixed(2)}ms average)`,
          recommendations: [
            `Optimize ${queryType} query patterns`,
            'Add appropriate indexes for this query type',
            'Consider query result caching'
          ]
        });
      }
    }
    
    // Check for query errors
    const totalErrors = Array.from(this.queryStats.values())
      .reduce((sum, stat) => sum + stat.errors, 0);
    
    if (totalErrors > 0) {
      suggestions.push({
        type: 'query_errors',
        severity: 'high',
        message: `${totalErrors} query errors detected`,
        recommendations: [
          'Review error logs for failed queries',
          'Check database connection stability',
          'Validate query parameters and data types'
        ]
      });
    }
    
    return suggestions;
  }

  /**
   * Analyze query performance and generate report
   */
  async analyzeQueryPerformance() {
    const analysis = {
      timestamp: new Date(),
      summary: this.getStats(),
      suggestions: this.getOptimizationSuggestions(),
      databaseInfo: await this.getDatabaseInfo()
    };
    
    return analysis;
  }

  /**
   * Get database information
   */
  async getDatabaseInfo() {
    try {
      const queries = [
        {
          name: 'database_size',
          query: "SELECT pg_size_pretty(pg_database_size(current_database())) as size"
        },
        {
          name: 'table_sizes',
          query: `
            SELECT 
              schemaname,
              tablename,
              pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
          `
        },
        {
          name: 'index_usage',
          query: `
            SELECT 
              schemaname,
              tablename,
              indexname,
              idx_scan,
              idx_tup_read,
              idx_tup_fetch
            FROM pg_stat_user_indexes 
            WHERE schemaname = 'public'
            ORDER BY idx_scan DESC
          `
        },
        {
          name: 'table_stats',
          query: `
            SELECT 
              schemaname,
              tablename,
              seq_scan,
              seq_tup_read,
              idx_scan,
              idx_tup_fetch,
              n_tup_ins,
              n_tup_upd,
              n_tup_del
            FROM pg_stat_user_tables 
            WHERE schemaname = 'public'
            ORDER BY seq_scan DESC
          `
        }
      ];
      
      const results = {};
      
      for (const queryInfo of queries) {
        try {
          const result = await db.query(queryInfo.query);
          results[queryInfo.name] = result.rows;
        } catch (error) {
          console.error(`Failed to execute ${queryInfo.name} query:`, error);
          results[queryInfo.name] = [];
        }
      }
      
      return results;
    } catch (error) {
      console.error('Failed to get database info:', error);
      return {};
    }
  }

  /**
   * Clean up old statistics
   */
  cleanupOldStats() {
    const oneHourAgo = new Date(Date.now() - 3600000);
    
    // Clean up old slow queries
    this.slowQueries = this.slowQueries.filter(
      query => query.timestamp > oneHourAgo
    );
    
    // Clean up old top slow queries
    this.stats.topSlowQueries = this.stats.topSlowQueries.filter(
      query => query.timestamp > oneHourAgo
    );
  }

  /**
   * Reset all statistics
   */
  resetStats() {
    this.queryStats.clear();
    this.slowQueries = [];
    this.stats = {
      totalQueries: 0,
      slowQueries: 0,
      averageQueryTime: 0,
      totalQueryTime: 0,
      queriesByType: new Map(),
      topSlowQueries: []
    };
  }

  /**
   * Get query execution plan
   */
  async getQueryExecutionPlan(query) {
    try {
      const result = await db.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`);
      return result.rows[0]['QUERY PLAN'];
    } catch (error) {
      console.error('Failed to get query execution plan:', error);
      return null;
    }
  }

  /**
   * Check for missing indexes
   */
  async checkMissingIndexes() {
    try {
      const query = `
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        AND n_distinct > 100
        ORDER BY n_distinct DESC
      `;
      
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      console.error('Failed to check missing indexes:', error);
      return [];
    }
  }
}

// Create singleton instance
const queryOptimizer = new QueryOptimizer();

// Start monitoring if enabled
if (process.env.ENABLE_DATABASE_METRICS === 'true') {
  queryOptimizer.startMonitoring();
}

export default queryOptimizer;