/**
 * Query Monitor
 * 
 * Monitors database query performance and provides real-time insights
 */

import queryOptimizer from '../utils/queryOptimization.js';
import { db } from '../database/db.enhanced.js';

class QueryMonitor {
  constructor() {
    this.isRunning = false;
    this.monitoringInterval = null;
    this.alertThresholds = {
      slowQueryCount: 10,
      averageQueryTime: 500,
      errorRate: 0.05, // 5%
      memoryUsage: 0.8 // 80%
    };
    this.alerts = [];
    this.lastAlertTime = new Map();
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log('Query monitoring started');

    // Start query optimizer monitoring
    queryOptimizer.startMonitoring();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Check every minute

    // Initial health check
    this.performHealthCheck();
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log('Query monitoring stopped');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    queryOptimizer.stopMonitoring();
  }

  /**
   * Perform health check
   */
  async performHealthCheck() {
    try {
      const stats = queryOptimizer.getStats();
      const suggestions = queryOptimizer.getOptimizationSuggestions();
      const databaseInfo = await this.getDatabaseHealthInfo();

      // Check for alert conditions
      this.checkAlertConditions(stats, databaseInfo);

      // Log performance summary
      if (process.env.ENABLE_DATABASE_METRICS === 'true') {
        console.log('Query Performance Summary:', {
          totalQueries: stats.totalQueries,
          averageQueryTime: `${stats.averageQueryTime.toFixed(2)}ms`,
          slowQueries: stats.slowQueries,
          hitRate: this.calculateHitRate(stats),
          suggestions: suggestions.length
        });
      }

      return {
        stats,
        suggestions,
        databaseInfo,
        alerts: this.getRecentAlerts()
      };
    } catch (error) {
      console.error('Query health check failed:', error);
      return null;
    }
  }

  /**
   * Get database health information
   */
  async getDatabaseHealthInfo() {
    try {
      const queries = [
        {
          name: 'active_connections',
          query: 'SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = \'active\''
        },
        {
          name: 'database_size',
          query: 'SELECT pg_size_pretty(pg_database_size(current_database())) as database_size'
        },
        {
          name: 'cache_hit_ratio',
          query: `
            SELECT 
              round(
                (sum(blks_hit) * 100.0 / (sum(blks_hit) + sum(blks_read))), 
                2
              ) as cache_hit_ratio
            FROM pg_stat_database 
            WHERE datname = current_database()
          `
        },
        {
          name: 'long_running_queries',
          query: `
            SELECT 
              pid,
              now() - pg_stat_activity.query_start AS duration,
              query
            FROM pg_stat_activity 
            WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
            AND state = 'active'
          `
        },
        {
          name: 'table_bloat',
          query: `
            SELECT 
              schemaname,
              tablename,
              pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
              pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
              pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
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
      console.error('Failed to get database health info:', error);
      return {};
    }
  }

  /**
   * Check for alert conditions
   */
  checkAlertConditions(stats, databaseInfo) {
    const now = Date.now();
    
    // Check slow query count
    if (stats.slowQueries > this.alertThresholds.slowQueryCount) {
      this.createAlert('slow_queries', 'high', 
        `${stats.slowQueries} slow queries detected (threshold: ${this.alertThresholds.slowQueryCount})`,
        now);
    }

    // Check average query time
    if (stats.averageQueryTime > this.alertThresholds.averageQueryTime) {
      this.createAlert('slow_average', 'medium',
        `Average query time is ${stats.averageQueryTime.toFixed(2)}ms (threshold: ${this.alertThresholds.averageQueryTime}ms)`,
        now);
    }

    // Check cache hit ratio
    if (databaseInfo.cache_hit_ratio && databaseInfo.cache_hit_ratio.length > 0) {
      const hitRatio = parseFloat(databaseInfo.cache_hit_ratio[0].cache_hit_ratio);
      if (hitRatio < 95) {
        this.createAlert('low_cache_hit_ratio', 'medium',
          `Cache hit ratio is ${hitRatio}% (threshold: 95%)`,
          now);
      }
    }

    // Check active connections
    if (databaseInfo.active_connections && databaseInfo.active_connections.length > 0) {
      const activeConnections = parseInt(databaseInfo.active_connections[0].active_connections);
      if (activeConnections > 80) {
        this.createAlert('high_connections', 'high',
          `${activeConnections} active database connections (threshold: 80)`,
          now);
      }
    }

    // Check for long-running queries
    if (databaseInfo.long_running_queries && databaseInfo.long_running_queries.length > 0) {
      this.createAlert('long_running_queries', 'high',
        `${databaseInfo.long_running_queries.length} long-running queries detected`,
        now);
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = memoryUsage.heapUsed / memoryUsage.heapTotal;
    if (memoryUsagePercent > this.alertThresholds.memoryUsage) {
      this.createAlert('high_memory_usage', 'medium',
        `Memory usage is ${(memoryUsagePercent * 100).toFixed(2)}% (threshold: ${this.alertThresholds.memoryUsage * 100}%)`,
        now);
    }
  }

  /**
   * Create alert
   */
  createAlert(type, severity, message, timestamp) {
    const alertKey = `${type}_${severity}`;
    const lastAlert = this.lastAlertTime.get(alertKey);
    
    // Throttle alerts (don't spam)
    const throttleTime = severity === 'high' ? 300000 : 900000; // 5 min for high, 15 min for medium
    if (lastAlert && (timestamp - lastAlert) < throttleTime) {
      return;
    }

    const alert = {
      type,
      severity,
      message,
      timestamp: new Date(timestamp),
      resolved: false
    };

    this.alerts.push(alert);
    this.lastAlertTime.set(alertKey, timestamp);

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }

    // Log alert
    console.warn(`QUERY MONITOR ALERT [${severity.toUpperCase()}]: ${message}`);

    return alert;
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 10) {
    return this.alerts
      .filter(alert => !alert.resolved)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId) {
    const alert = this.alerts.find(a => a.timestamp.getTime() === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
    }
  }

  /**
   * Calculate cache hit rate
   */
  calculateHitRate(stats) {
    if (stats.totalQueries === 0) return '0%';
    const hitRate = ((stats.totalQueries - stats.slowQueries) / stats.totalQueries) * 100;
    return `${hitRate.toFixed(2)}%`;
  }

  /**
   * Get performance metrics for dashboard
   */
  async getPerformanceMetrics() {
    const stats = queryOptimizer.getStats();
    const databaseInfo = await this.getDatabaseHealthInfo();
    
    return {
      queryStats: {
        totalQueries: stats.totalQueries,
        averageQueryTime: stats.averageQueryTime,
        slowQueries: stats.slowQueries,
        hitRate: this.calculateHitRate(stats),
        queriesByType: Object.fromEntries(stats.queriesByType)
      },
      databaseHealth: {
        activeConnections: databaseInfo.active_connections?.[0]?.active_connections || 0,
        databaseSize: databaseInfo.database_size?.[0]?.database_size || 'Unknown',
        cacheHitRatio: databaseInfo.cache_hit_ratio?.[0]?.cache_hit_ratio || 'Unknown',
        longRunningQueries: databaseInfo.long_running_queries?.length || 0
      },
      alerts: this.getRecentAlerts(),
      timestamp: new Date()
    };
  }

  /**
   * Generate performance report
   */
  async generateReport() {
    const analysis = await queryOptimizer.analyzeQueryPerformance();
    const metrics = await this.getPerformanceMetrics();
    
    return {
      timestamp: new Date(),
      analysis,
      metrics,
      recommendations: this.generateRecommendations(analysis, metrics)
    };
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(analysis, metrics) {
    const recommendations = [];

    // Query performance recommendations
    if (metrics.queryStats.averageQueryTime > 200) {
      recommendations.push({
        priority: 'high',
        category: 'query_performance',
        title: 'Optimize Query Performance',
        description: `Average query time is ${metrics.queryStats.averageQueryTime.toFixed(2)}ms`,
        actions: [
          'Review slow queries in the top slow queries list',
          'Add missing database indexes',
          'Optimize query structure and joins',
          'Consider implementing query result caching'
        ]
      });
    }

    // Cache recommendations
    if (metrics.databaseHealth.cacheHitRatio !== 'Unknown' && 
        parseFloat(metrics.databaseHealth.cacheHitRatio) < 95) {
      recommendations.push({
        priority: 'medium',
        category: 'caching',
        title: 'Improve Database Caching',
        description: `Cache hit ratio is ${metrics.databaseHealth.cacheHitRatio}%`,
        actions: [
          'Increase shared_buffers in PostgreSQL configuration',
          'Review and optimize query patterns',
          'Consider implementing application-level caching'
        ]
      });
    }

    // Connection recommendations
    if (parseInt(metrics.databaseHealth.activeConnections) > 50) {
      recommendations.push({
        priority: 'medium',
        category: 'connections',
        title: 'Optimize Database Connections',
        description: `${metrics.databaseHealth.activeConnections} active connections`,
        actions: [
          'Review connection pool settings',
          'Optimize long-running queries',
          'Consider connection pooling optimization'
        ]
      });
    }

    // Memory recommendations
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    if (memoryUsagePercent > 70) {
      recommendations.push({
        priority: 'medium',
        category: 'memory',
        title: 'Optimize Memory Usage',
        description: `Memory usage is ${memoryUsagePercent.toFixed(2)}%`,
        actions: [
          'Review memory-intensive queries',
          'Implement query result pagination',
          'Consider increasing server memory'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
      alertThresholds: this.alertThresholds,
      totalAlerts: this.alerts.length,
      activeAlerts: this.alerts.filter(a => !a.resolved).length
    };
  }
}

// Create singleton instance
const queryMonitor = new QueryMonitor();

// Auto-start if enabled
if (process.env.ENABLE_DATABASE_METRICS === 'true') {
  queryMonitor.start();
}

export default queryMonitor;
