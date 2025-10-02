// server/src/services/monitoringDashboardService.js
/**
 * Monitoring Dashboard Service
 * Real-time monitoring, alerting, and analytics for system health
 */

import EventEmitter from 'events';
import loggingService from './loggingService.js';
// import { performanceMonitor } from '../middleware/performanceMiddleware.js';
import optimizedDb from './optimizedDatabaseService.js';

/**
 * Real-time Monitoring Dashboard Service
 */
class MonitoringDashboardService extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.monitoringInterval = null;
    this.alertThresholds = {
      errorRate: 0.05, // 5% error rate
      responseTime: 2000, // 2 seconds
      memoryUsage: 500 * 1024 * 1024, // 500MB
      diskUsage: 0.9, // 90%
      logErrors: 10, // 10 errors in monitoring window
      securityEvents: 5 // 5 security events in monitoring window
    };

    this.monitoringWindow = 5 * 60 * 1000; // 5 minutes
    this.checkInterval = 30 * 1000; // 30 seconds

    this.metrics = {
      system: {
        uptime: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        loadAverage: []
      },
      application: {
        totalRequests: 0,
        errorRate: 0,
        averageResponseTime: 0,
        activeConnections: 0,
        logErrors: 0,
        securityEvents: 0
      },
      database: {
        connectionPoolUsage: 0,
        slowQueries: 0,
        queryErrors: 0,
        avgQueryTime: 0
      },
      alerts: [],
      lastUpdate: null
    };

    this.historicalData = {
      metrics: [],
      maxHistory: 288 // 24 hours of 5-minute intervals
    };

    this.connectedClients = new Set();
  }

  /**
   * Start monitoring service
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.checkInterval);

    loggingService.logInfo('Monitoring dashboard service started', {
      checkInterval: this.checkInterval,
      monitoringWindow: this.monitoringWindow,
      thresholds: this.alertThresholds
    });

    // Initial metrics collection
    this.collectMetrics();
  }

  /**
   * Stop monitoring service
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    loggingService.logInfo('Monitoring dashboard service stopped');
  }

  /**
   * Collect all system metrics
   */
  async collectMetrics() {
    const timestamp = new Date().toISOString();

    // Collect each metric type independently to prevent single failures from crashing the whole system
    try {
      // System metrics - usually reliable
      await this.collectSystemMetrics();
    } catch (error) {
      loggingService.logError('Error collecting system metrics (non-fatal)', error);
    }

    try {
      // Application metrics
      await this.collectApplicationMetrics();
    } catch (error) {
      loggingService.logError('Error collecting application metrics (non-fatal)', error);
    }

    try {
      // Database metrics - most likely to fail
      await this.collectDatabaseMetrics();
    } catch (error) {
      loggingService.logError('Error collecting database metrics (non-fatal)', error);
      // Set degraded database status
      this.metrics.database = {
        status: 'DEGRADED',
        responseTime: -1,
        connectionPool: { status: 'UNKNOWN' },
        error: error.message
      };
    }

    try {
      // Logging metrics
      await this.collectLoggingMetrics();
    } catch (error) {
      loggingService.logError('Error collecting logging metrics (non-fatal)', error);
    }

    try {
      // Check for alerts
      this.checkAlerts();
    } catch (error) {
      loggingService.logError('Error checking alerts (non-fatal)', error);
    }

    this.metrics.lastUpdate = timestamp;

    try {
      // Store historical data
      this.storeHistoricalData(timestamp);

      // Emit update event to connected clients
      this.emit('metrics-updated', {
        metrics: this.metrics,
        timestamp
      });

      // Broadcast to SSE clients
      this.broadcastToClients('metrics-update', this.metrics);
    } catch (error) {
      loggingService.logError('Error updating monitoring clients (non-fatal)', error);
    }
  }

  /**
   * Collect system-level metrics
   */
  async collectSystemMetrics() {
    const memoryUsage = process.memoryUsage();

    this.metrics.system = {
      uptime: process.uptime(),
      memoryUsage: memoryUsage.rss,
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      processId: process.pid,
      nodeVersion: process.version,
      platform: process.platform
    };
  }

  /**
   * Collect application-level metrics
   */
  async collectApplicationMetrics() {
    // Get performance metrics if available
    if (typeof performanceMonitor !== 'undefined' && performanceMonitor) {
      const perfMetrics = performanceMonitor.getMetrics();

      this.metrics.application = {
        totalRequests: perfMetrics.summary?.totalRequests || 0,
        errorRate: perfMetrics.summary?.errorRate || 0,
        averageResponseTime: perfMetrics.summary?.averageResponseTime || 0,
        activeRequests: perfMetrics.summary?.activeRequests || 0,
        slowRequests: perfMetrics.slowRequests?.length || 0,
        alerts: perfMetrics.alerts?.length || 0
      };
    }
  }

  /**
   * Collect database metrics
   */
  async collectDatabaseMetrics() {
    try {
      if (optimizedDb) {
        const dbStats = optimizedDb.getPerformanceStats();
        const health = await optimizedDb.healthCheck();

        this.metrics.database = {
          status: health.status,
          responseTime: health.responseTime || 0,
          connectionPool: health.connectionPool,
          queryPerformance: health.queryPerformance,
          cache: health.cache,
          slowQueries: dbStats.slowQueries?.length || 0,
          totalQueries: Object.values(dbStats.queries || {}).reduce((sum, q) => sum + q.totalExecutions, 0),
          avgQueryTime: Object.values(dbStats.queries || {}).reduce((sum, q) => sum + q.avgTime, 0) / Object.keys(dbStats.queries || {}).length || 0
        };
      }
    } catch (error) {
      loggingService.logError('Error collecting database metrics', error);
    }
  }

  /**
   * Collect logging metrics
   */
  async collectLoggingMetrics() {
    const loggingStats = loggingService.getStats();

    this.metrics.logging = {
      totalLogs: loggingStats.totalLogs,
      errorCount: loggingStats.errorCount,
      warningCount: loggingStats.warningCount,
      errorRate: loggingStats.totalLogs > 0 ? (loggingStats.errorCount / loggingStats.totalLogs) : 0,
      logsByLevel: loggingStats.logsByLevel,
      logsByCategory: loggingStats.logsByCategory,
      lastLogTime: loggingStats.lastLogTime
    };
  }

  /**
   * Check for alert conditions
   */
  checkAlerts() {
    const alerts = [];
    const timestamp = new Date();

    // Check error rate
    if (this.metrics.application.errorRate > this.alertThresholds.errorRate) {
      alerts.push({
        id: `error-rate-${timestamp.getTime()}`,
        type: 'error_rate',
        severity: 'high',
        message: `High error rate detected: ${(this.metrics.application.errorRate * 100).toFixed(2)}%`,
        threshold: this.alertThresholds.errorRate * 100,
        current: this.metrics.application.errorRate * 100,
        timestamp: timestamp.toISOString(),
        category: 'performance'
      });
    }

    // Check response time
    if (this.metrics.application.averageResponseTime > this.alertThresholds.responseTime) {
      alerts.push({
        id: `response-time-${timestamp.getTime()}`,
        type: 'response_time',
        severity: 'medium',
        message: `Slow response time: ${this.metrics.application.averageResponseTime.toFixed(0)}ms`,
        threshold: this.alertThresholds.responseTime,
        current: this.metrics.application.averageResponseTime,
        timestamp: timestamp.toISOString(),
        category: 'performance'
      });
    }

    // Check memory usage
    if (this.metrics.system.memoryUsage > this.alertThresholds.memoryUsage) {
      const memoryMB = Math.round(this.metrics.system.memoryUsage / 1024 / 1024);
      const thresholdMB = Math.round(this.alertThresholds.memoryUsage / 1024 / 1024);

      alerts.push({
        id: `memory-usage-${timestamp.getTime()}`,
        type: 'memory_usage',
        severity: 'medium',
        message: `High memory usage: ${memoryMB}MB`,
        threshold: thresholdMB,
        current: memoryMB,
        timestamp: timestamp.toISOString(),
        category: 'system'
      });
    }

    // Check logging errors
    const recentLogErrors = this.getRecentLogErrors();
    if (recentLogErrors > this.alertThresholds.logErrors) {
      alerts.push({
        id: `log-errors-${timestamp.getTime()}`,
        type: 'log_errors',
        severity: 'high',
        message: `High number of log errors: ${recentLogErrors} in ${this.monitoringWindow / 60000} minutes`,
        threshold: this.alertThresholds.logErrors,
        current: recentLogErrors,
        timestamp: timestamp.toISOString(),
        category: 'logging'
      });
    }

    // Check database health
    if (this.metrics.database?.status === 'unhealthy') {
      alerts.push({
        id: `database-health-${timestamp.getTime()}`,
        type: 'database_health',
        severity: 'critical',
        message: 'Database health check failed',
        timestamp: timestamp.toISOString(),
        category: 'database'
      });
    }

    // Update alerts and log new ones
    const newAlerts = alerts.filter(alert =>
      !this.metrics.alerts.some(existing => existing.type === alert.type)
    );

    if (newAlerts.length > 0) {
      newAlerts.forEach(alert => {
        loggingService.logWarning(`Alert: ${alert.message}`, {
          alertId: alert.id,
          alertType: alert.type,
          severity: alert.severity,
          category: alert.category,
          threshold: alert.threshold,
          current: alert.current
        });
      });

      // Broadcast new alerts
      this.broadcastToClients('new-alerts', newAlerts);
    }

    this.metrics.alerts = alerts;
  }

  /**
   * Get recent log errors count
   */
  getRecentLogErrors() {
    // This is a simplified implementation
    // In a real system, you might query the log files or database
    const cutoffTime = new Date(Date.now() - this.monitoringWindow);
    return this.metrics.logging?.errorCount || 0;
  }

  /**
   * Store historical metrics data
   */
  storeHistoricalData(timestamp) {
    const historicalEntry = {
      timestamp,
      system: { ...this.metrics.system },
      application: { ...this.metrics.application },
      database: { ...this.metrics.database },
      logging: { ...this.metrics.logging },
      alertCount: this.metrics.alerts.length
    };

    this.historicalData.metrics.push(historicalEntry);

    // Keep only the last maxHistory entries
    if (this.historicalData.metrics.length > this.historicalData.maxHistory) {
      this.historicalData.metrics = this.historicalData.metrics.slice(-this.historicalData.maxHistory);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      current: this.metrics,
      historical: this.getHistoricalSummary(),
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      thresholds: this.alertThresholds
    };
  }

  /**
   * Get historical data summary
   */
  getHistoricalSummary() {
    if (this.historicalData.metrics.length === 0) {
      return null;
    }

    const last24h = this.historicalData.metrics.slice(-288); // Last 24 hours
    const last1h = this.historicalData.metrics.slice(-12); // Last hour

    return {
      last24Hours: {
        dataPoints: last24h.length,
        avgResponseTime: this.calculateAverage(last24h, 'application.averageResponseTime'),
        avgErrorRate: this.calculateAverage(last24h, 'application.errorRate'),
        avgMemoryUsage: this.calculateAverage(last24h, 'system.memoryUsage'),
        totalAlerts: last24h.reduce((sum, entry) => sum + entry.alertCount, 0)
      },
      lastHour: {
        dataPoints: last1h.length,
        avgResponseTime: this.calculateAverage(last1h, 'application.averageResponseTime'),
        avgErrorRate: this.calculateAverage(last1h, 'application.errorRate'),
        avgMemoryUsage: this.calculateAverage(last1h, 'system.memoryUsage'),
        totalAlerts: last1h.reduce((sum, entry) => sum + entry.alertCount, 0)
      }
    };
  }

  /**
   * Calculate average of nested property
   */
  calculateAverage(data, property) {
    const values = data.map(entry => {
      const keys = property.split('.');
      let value = entry;
      for (const key of keys) {
        value = value?.[key];
      }
      return typeof value === 'number' ? value : 0;
    }).filter(v => v > 0);

    return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
  }

  /**
   * Add SSE client
   */
  addClient(res, clientId) {
    this.connectedClients.add({ res, clientId, connectedAt: new Date() });

    // Send current metrics immediately
    this.sendToClient(res, 'initial-metrics', this.metrics);

    loggingService.logInfo('Monitoring client connected', { clientId, totalClients: this.connectedClients.size });
  }

  /**
   * Remove SSE client
   */
  removeClient(clientId) {
    for (const client of this.connectedClients) {
      if (client.clientId === clientId) {
        this.connectedClients.delete(client);
        break;
      }
    }

    loggingService.logInfo('Monitoring client disconnected', { clientId, totalClients: this.connectedClients.size });
  }

  /**
   * Send data to specific client
   */
  sendToClient(res, event, data) {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      // Client disconnected
    }
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastToClients(event, data) {
    const disconnectedClients = [];

    for (const client of this.connectedClients) {
      try {
        this.sendToClient(client.res, event, data);
      } catch (error) {
        disconnectedClients.push(client);
      }
    }

    // Remove disconnected clients
    disconnectedClients.forEach(client => {
      this.connectedClients.delete(client);
    });
  }

  /**
   * Update alert thresholds
   */
  updateThresholds(newThresholds) {
    this.alertThresholds = {
      ...this.alertThresholds,
      ...newThresholds
    };

    loggingService.logInfo('Alert thresholds updated', {
      newThresholds,
      currentThresholds: this.alertThresholds
    });
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const criticalAlerts = this.metrics.alerts.filter(alert => alert.severity === 'critical');
    const highAlerts = this.metrics.alerts.filter(alert => alert.severity === 'high');

    let status = 'healthy';
    if (criticalAlerts.length > 0) {
      status = 'critical';
    } else if (highAlerts.length > 0) {
      status = 'degraded';
    } else if (this.metrics.alerts.length > 0) {
      status = 'warning';
    }

    return {
      status,
      alertCounts: {
        critical: criticalAlerts.length,
        high: highAlerts.length,
        medium: this.metrics.alerts.filter(alert => alert.severity === 'medium').length,
        low: this.metrics.alerts.filter(alert => alert.severity === 'low').length
      },
      uptime: this.metrics.system.uptime,
      lastUpdate: this.metrics.lastUpdate,
      isMonitoring: this.isRunning
    };
  }
}

// Create and export singleton instance
const monitoringDashboard = new MonitoringDashboardService();

export default monitoringDashboard;
export { MonitoringDashboardService };