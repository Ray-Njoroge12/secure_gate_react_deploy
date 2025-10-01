// Database health monitoring service
import { dbManager, getDBStatus, testDBConnection } from '../database/db.enhanced.js';
import { EventEmitter } from 'events';

/**
 * Database health monitoring and alerting service
 */
class DatabaseHealthService extends EventEmitter {
  constructor() {
    super();

    this.isMonitoring = false;
    this.alerts = new Map();
    this.healthHistory = [];
    this.maxHistorySize = 100;

    // Thresholds for health alerts
    this.thresholds = {
      responseTime: Number(process.env.DB_HEALTH_RESPONSE_THRESHOLD) || 1000, // 1 second
      errorRate: Number(process.env.DB_HEALTH_ERROR_RATE_THRESHOLD) || 0.1, // 10%
      consecutiveFailures: Number(process.env.DB_HEALTH_FAILURE_THRESHOLD) || 3,
      connectionUtilization: Number(process.env.DB_HEALTH_CONNECTION_THRESHOLD) || 0.8 // 80%
    };

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen to database manager events
    dbManager.on('connect', (data) => {
      this.recordHealth('connection', { status: 'connected', ...data });
      this.clearAlert('connection_down');
    });

    dbManager.on('connectionError', (data) => {
      this.recordHealth('connection_error', { status: 'error', ...data });
      this.raiseAlert('connection_error', `Database connection error: ${data.error.message}`, data);
    });

    dbManager.on('healthCheck', (data) => {
      this.recordHealth('health_check', data);
      this.analyzeHealthMetrics(data);
    });

    dbManager.on('query', (data) => {
      this.recordHealth('query', data);
      if (!data.success) {
        this.analyzeErrorRate();
      }
    });

    dbManager.on('reconnectAttempt', (data) => {
      this.recordHealth('reconnect_attempt', data);
    });

    dbManager.on('reconnectSuccess', (data) => {
      this.recordHealth('reconnect_success', data);
      this.clearAlert('connection_down');
      this.clearAlert('max_retries_exceeded');
    });

    dbManager.on('maxRetriesExceeded', (data) => {
      this.recordHealth('max_retries_exceeded', data);
      this.raiseAlert('max_retries_exceeded', 'Database connection max retries exceeded', data);
    });
  }

  recordHealth(type, data) {
    const record = {
      timestamp: new Date(),
      type,
      data
    };

    this.healthHistory.push(record);

    // Keep history size manageable
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory.shift();
    }

    this.emit('healthRecord', record);
  }

  analyzeHealthMetrics(healthData) {
    const status = getDBStatus();

    // Check response time
    if (healthData.success && healthData.responseTime > this.thresholds.responseTime) {
      this.raiseAlert('slow_response',
        `Database response time (${healthData.responseTime}ms) exceeds threshold (${this.thresholds.responseTime}ms)`,
        { responseTime: healthData.responseTime, threshold: this.thresholds.responseTime }
      );
    } else {
      this.clearAlert('slow_response');
    }

    // Check connection utilization
    const utilizationRate = status.totalCount > 0 ?
      (status.totalCount - status.idleCount) / status.totalCount : 0;

    if (utilizationRate > this.thresholds.connectionUtilization) {
      this.raiseAlert('high_connection_usage',
        `Database connection utilization (${(utilizationRate * 100).toFixed(1)}%) exceeds threshold (${(this.thresholds.connectionUtilization * 100).toFixed(1)}%)`,
        { utilizationRate, threshold: this.thresholds.connectionUtilization, status }
      );
    } else {
      this.clearAlert('high_connection_usage');
    }

    // Check consecutive failures
    if (status.consecutiveFailures >= this.thresholds.consecutiveFailures) {
      this.raiseAlert('consecutive_failures',
        `Database has ${status.consecutiveFailures} consecutive failures (threshold: ${this.thresholds.consecutiveFailures})`,
        { consecutiveFailures: status.consecutiveFailures, threshold: this.thresholds.consecutiveFailures }
      );
    } else {
      this.clearAlert('consecutive_failures');
    }
  }

  analyzeErrorRate() {
    // Calculate error rate from recent queries
    const recentQueries = this.healthHistory
      .filter(record => record.type === 'query' &&
              Date.now() - record.timestamp.getTime() < 60000) // Last minute
      .map(record => record.data);

    if (recentQueries.length >= 10) { // Only analyze if we have enough data
      const errorCount = recentQueries.filter(q => !q.success).length;
      const errorRate = errorCount / recentQueries.length;

      if (errorRate > this.thresholds.errorRate) {
        this.raiseAlert('high_error_rate',
          `Database error rate (${(errorRate * 100).toFixed(1)}%) exceeds threshold (${(this.thresholds.errorRate * 100).toFixed(1)}%)`,
          { errorRate, threshold: this.thresholds.errorRate, recentQueries: recentQueries.length }
        );
      } else {
        this.clearAlert('high_error_rate');
      }
    }
  }

  raiseAlert(alertId, message, data = {}) {
    if (this.alerts.has(alertId)) {
      // Update existing alert
      const alert = this.alerts.get(alertId);
      alert.count++;
      alert.lastOccurrence = new Date();
      alert.data = data;
    } else {
      // Create new alert
      const alert = {
        id: alertId,
        message,
        firstOccurrence: new Date(),
        lastOccurrence: new Date(),
        count: 1,
        data,
        severity: this.getAlertSeverity(alertId)
      };

      this.alerts.set(alertId, alert);
      console.warn(`⚠️ Database Alert [${alert.severity.toUpperCase()}]: ${message}`);

      this.emit('alert', alert);
    }
  }

  clearAlert(alertId) {
    if (this.alerts.has(alertId)) {
      const alert = this.alerts.get(alertId);
      this.alerts.delete(alertId);
      console.log(`✅ Database Alert Resolved: ${alert.message}`);

      this.emit('alertResolved', { ...alert, resolvedAt: new Date() });
    }
  }

  getAlertSeverity(alertId) {
    const severityMap = {
      connection_down: 'critical',
      max_retries_exceeded: 'critical',
      connection_error: 'high',
      consecutive_failures: 'high',
      high_error_rate: 'medium',
      slow_response: 'medium',
      high_connection_usage: 'low'
    };

    return severityMap[alertId] || 'low';
  }

  /**
   * Get current health summary
   */
  getHealthSummary() {
    const status = getDBStatus();
    const activeAlerts = Array.from(this.alerts.values());
    const recentRecords = this.healthHistory.filter(
      record => Date.now() - record.timestamp.getTime() < 300000 // Last 5 minutes
    );

    return {
      status: status.isConnected ? 'healthy' : 'unhealthy',
      connection: status,
      activeAlerts,
      alertCount: activeAlerts.length,
      recentActivity: {
        total: recentRecords.length,
        byType: recentRecords.reduce((acc, record) => {
          acc[record.type] = (acc[record.type] || 0) + 1;
          return acc;
        }, {})
      },
      thresholds: this.thresholds,
      timestamp: new Date()
    };
  }

  /**
   * Get detailed health report
   */
  getHealthReport() {
    const summary = this.getHealthSummary();

    return {
      ...summary,
      history: this.healthHistory.slice(-50), // Last 50 records
      alerts: Array.from(this.alerts.values()),
      metrics: {
        uptime: Date.now() - (this.healthHistory[0]?.timestamp?.getTime() || Date.now()),
        totalRecords: this.healthHistory.length
      }
    };
  }

  /**
   * Test database connection manually
   */
  async runHealthCheck() {
    try {
      const startTime = Date.now();
      await testDBConnection();
      const responseTime = Date.now() - startTime;

      return {
        success: true,
        responseTime,
        timestamp: new Date(),
        message: 'Database connection healthy'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
        message: 'Database connection failed'
      };
    }
  }

  /**
   * Clear all alerts (for testing/reset)
   */
  clearAllAlerts() {
    this.alerts.clear();
    this.emit('allAlertsCleared');
  }

  /**
   * Reset health history (for testing/reset)
   */
  resetHistory() {
    this.healthHistory = [];
    this.emit('historyReset');
  }
}

// Create singleton instance
const dbHealthService = new DatabaseHealthService();

export default dbHealthService;
export { DatabaseHealthService };