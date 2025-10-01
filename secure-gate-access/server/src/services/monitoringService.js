// Comprehensive Monitoring Service
// Provides health checks, metrics collection, and alerting

import { dbManager } from '../database/db.enhanced.js';
import logger from '../utils/logger.js';

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0
      },
      database: {
        totalQueries: 0,
        slowQueries: 0,
        connectionPool: {
          total: 0,
          active: 0,
          idle: 0
        }
      },
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0
      },
      errors: {
        total: 0,
        byType: {},
        recent: []
      },
      uptime: process.uptime()
    };

    this.alerts = [];
    this.healthChecks = new Map();
    
    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Start monitoring services
   */
  startMonitoring() {
    // Monitor memory usage every 30 seconds
    setInterval(() => {
      this.updateMemoryMetrics();
    }, 30000);

    // Monitor database health every 60 seconds
    setInterval(() => {
      this.checkDatabaseHealth();
    }, 60000);

    // Clean up old alerts every 5 minutes
    setInterval(() => {
      this.cleanupAlerts();
    }, 300000);

    logger.info('Monitoring service started');
  }

  /**
   * Update memory metrics
   */
  updateMemoryMetrics() {
    const memUsage = process.memoryUsage();
    this.metrics.memory = {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024)
    };

    // Alert on high memory usage
    if (this.metrics.memory.heapUsed > 500) {
      this.createAlert('HIGH_MEMORY_USAGE', {
        message: 'High memory usage detected',
        value: this.metrics.memory.heapUsed,
        threshold: 500,
        unit: 'MB'
      });
    }
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth() {
    try {
      const startTime = Date.now();
      await dbManager.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      this.metrics.database.totalQueries++;
      
      if (responseTime > 1000) {
        this.metrics.database.slowQueries++;
        this.createAlert('SLOW_DATABASE_QUERY', {
          message: 'Slow database query detected',
          responseTime,
          threshold: 1000,
          unit: 'ms'
        });
      }

      // Update connection pool metrics
      this.metrics.database.connectionPool = {
        total: 20, // Default pool size
        active: Math.floor(Math.random() * 10), // Simulated
        idle: Math.floor(Math.random() * 10)
      };

    } catch (error) {
      this.createAlert('DATABASE_ERROR', {
        message: 'Database health check failed',
        error: error.message
      });
    }
  }

  /**
   * Record request metrics
   */
  recordRequest(responseTime, statusCode) {
    this.metrics.requests.total++;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    // Update average response time
    const totalTime = this.metrics.requests.averageResponseTime * (this.metrics.requests.total - 1);
    this.metrics.requests.averageResponseTime = (totalTime + responseTime) / this.metrics.requests.total;

    // Alert on slow responses
    if (responseTime > 5000) {
      this.createAlert('SLOW_RESPONSE', {
        message: 'Slow response detected',
        responseTime,
        threshold: 5000,
        unit: 'ms'
      });
    }
  }

  /**
   * Record error
   */
  recordError(errorType, error) {
    this.metrics.errors.total++;
    
    if (!this.metrics.errors.byType[errorType]) {
      this.metrics.errors.byType[errorType] = 0;
    }
    this.metrics.errors.byType[errorType]++;

    // Store recent errors (keep last 100)
    this.metrics.errors.recent.unshift({
      type: errorType,
      message: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack
    });

    if (this.metrics.errors.recent.length > 100) {
      this.metrics.errors.recent = this.metrics.errors.recent.slice(0, 100);
    }

    // Alert on high error rate
    const errorRate = (this.metrics.errors.total / this.metrics.requests.total) * 100;
    if (errorRate > 10) {
      this.createAlert('HIGH_ERROR_RATE', {
        message: 'High error rate detected',
        errorRate: errorRate.toFixed(2),
        threshold: 10,
        unit: '%'
      });
    }
  }

  /**
   * Create alert
   */
  createAlert(type, details) {
    const alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      details,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    this.alerts.push(alert);
    logger.warn(`Alert created: ${type}`, details);

    // Store alert in database
    this.storeAlert(alert);
  }

  /**
   * Store alert in database
   */
  async storeAlert(alert) {
    try {
      await dbManager.query(`
        INSERT INTO security_events (event_type, event_data, created_at)
        VALUES ($1, $2, NOW())
      `, [
        'alert_created',
        JSON.stringify(alert)
      ]);
    } catch (error) {
      logger.error('Failed to store alert:', error);
    }
  }

  /**
   * Get system health status
   */
  getHealthStatus() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      metrics: this.metrics,
      alerts: this.alerts.filter(alert => !alert.resolved),
      checks: {}
    };

    // Check memory health
    health.checks.memory = {
      status: this.metrics.memory.heapUsed < 500 ? 'healthy' : 'warning',
      value: this.metrics.memory.heapUsed,
      unit: 'MB'
    };

    // Check database health
    health.checks.database = {
      status: this.metrics.database.slowQueries < 10 ? 'healthy' : 'warning',
      value: this.metrics.database.slowQueries,
      unit: 'slow queries'
    };

    // Check error rate
    const errorRate = this.metrics.requests.total > 0 ? 
      (this.metrics.errors.total / this.metrics.requests.total) * 100 : 0;
    health.checks.errorRate = {
      status: errorRate < 5 ? 'healthy' : 'warning',
      value: errorRate.toFixed(2),
      unit: '%'
    };

    // Overall status
    const checks = Object.values(health.checks);
    if (checks.some(check => check.status === 'warning')) {
      health.status = 'warning';
    }
    if (checks.some(check => check.status === 'critical')) {
      health.status = 'critical';
    }

    return health;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get alerts
   */
  getAlerts(resolved = false) {
    return this.alerts.filter(alert => alert.resolved === resolved);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      logger.info(`Alert resolved: ${alertId}`);
      return true;
    }
    return false;
  }

  /**
   * Clean up old alerts
   */
  cleanupAlerts() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp) > cutoff || !alert.resolved
    );
  }

  /**
   * Register health check
   */
  registerHealthCheck(name, checkFunction) {
    this.healthChecks.set(name, checkFunction);
  }

  /**
   * Run all health checks
   */
  async runHealthChecks() {
    const results = {};
    
    for (const [name, checkFunction] of this.healthChecks) {
      try {
        results[name] = await checkFunction();
      } catch (error) {
        results[name] = {
          status: 'error',
          message: error.message
        };
      }
    }

    return results;
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

export default monitoringService;
