// server/src/services/metricsService.js
/**
 * Metrics Service
 * Captures request latency percentiles, error rates, queue depth,
 * database pool stats, and authentication anomalies.
 */

import loggingService from './loggingService.js';
import alertingService from './alertingService.js';
import notificationQueueService from './notificationQueueService.js';
import { dbManager } from '../database/db.enhanced.js';
import { getExportQueueDepth } from './dataExportService.js';

class MetricsService {
  constructor() {
    this.requestLatencies = [];
    this.requestCount = 0;
    this.errorCount = 0;
    this.authAnomalies = 0;
    this.queueDepth = null;
    this.dbPoolStats = null;
    this.lastSnapshot = null;
    this.intervalMs = Number(process.env.METRICS_INTERVAL_MS) || 60000;
    this.timer = null;
    this.alertStates = {
      errorRate: null,
      queueDepth: null,
      dbPool: null
    };
  }

  recordRequest({
    requestId,
    userId,
    estateId,
    role,
    route,
    method,
    statusCode,
    latencyMs
  }) {
    this.requestCount += 1;

    if (statusCode >= 500) {
      this.errorCount += 1;
    }

    if (statusCode === 401 || statusCode === 403) {
      this.authAnomalies += 1;
    }

    if (Number.isFinite(latencyMs)) {
      this.requestLatencies.push(latencyMs);
      if (this.requestLatencies.length > 1000) {
        this.requestLatencies.shift();
      }
    }

    loggingService.logPerformance('debug', 'Request metrics captured', {
      request_id: requestId,
      user_id: userId,
      estate_id: estateId,
      role,
      route,
      method,
      status: statusCode,
      latency: latencyMs
    }, requestId);
  }

  calculatePercentile(percentile) {
    if (this.requestLatencies.length === 0) return 0;
    const sorted = [...this.requestLatencies].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  getErrorRate() {
    if (this.requestCount === 0) return 0;
    return this.errorCount / this.requestCount;
  }

  async collectQueueDepth() {
    const notificationStats = await notificationQueueService.getStatistics();
    const exportQueue = getExportQueueDepth();

    if (!notificationStats || notificationStats.initialized === false) {
      return {
        initialized: false,
        notification: null,
        export: exportQueue,
        totalBacklog: exportQueue.queued
      };
    }

    const email = notificationStats.email || {};
    const sms = notificationStats.sms || {};
    const deadLetter = notificationStats.deadLetter || {};

    const notificationBacklog = (email.waiting || 0) + (email.delayed || 0)
      + (sms.waiting || 0) + (sms.delayed || 0);
    const totalBacklog = notificationBacklog + exportQueue.queued;

    return {
      initialized: true,
      notification: {
        email,
        sms,
        deadLetter,
        backlog: notificationBacklog
      },
      export: exportQueue,
      totalBacklog
    };
  }

  collectDbPoolStats() {
    const status = dbManager.getStatus();
    const maxConnections = dbManager.config?.max || 0;
    const utilization = maxConnections > 0
      ? status.totalCount / maxConnections
      : 0;

    return {
      ...status,
      maxConnections,
      utilization
    };
  }

  buildSnapshot() {
    const p95 = this.calculatePercentile(0.95);
    const p99 = this.calculatePercentile(0.99);
    const errorRate = this.getErrorRate();

    return {
      timestamp: new Date().toISOString(),
      latency: {
        p95,
        p99
      },
      errorRate,
      authAnomalies: this.authAnomalies,
      requestCount: this.requestCount,
      queueDepth: this.queueDepth,
      dbPool: this.dbPoolStats
    };
  }

  evaluateAlerts(snapshot) {
    const errorRateSeverity = alertingService.checkThreshold('errorRate', snapshot.errorRate);
    if (errorRateSeverity && this.alertStates.errorRate !== errorRateSeverity) {
      alertingService.createAlert(
        'error_rate',
        errorRateSeverity,
        `Error rate ${Math.round(snapshot.errorRate * 100)}% exceeds threshold`,
        { errorRate: snapshot.errorRate }
      );
      this.alertStates.errorRate = errorRateSeverity;
    } else if (!errorRateSeverity) {
      this.alertStates.errorRate = null;
    }

    const backlog = snapshot.queueDepth?.totalBacklog ?? 0;
    const queueSeverity = alertingService.checkThreshold('queueDepth', backlog);
    if (queueSeverity && this.alertStates.queueDepth !== queueSeverity) {
      alertingService.createAlert(
        'queue_backlog',
        queueSeverity,
        `Queue backlog depth ${backlog} exceeds threshold`,
        { backlog }
      );
      this.alertStates.queueDepth = queueSeverity;
    } else if (!queueSeverity) {
      this.alertStates.queueDepth = null;
    }

    const utilization = snapshot.dbPool?.utilization ?? 0;
    const dbSeverity = alertingService.checkThreshold('dbPoolUtilization', utilization);
    if (dbSeverity && this.alertStates.dbPool !== dbSeverity) {
      alertingService.createAlert(
        'db_pool_exhaustion',
        dbSeverity,
        `DB pool utilization ${(utilization * 100).toFixed(1)}% exceeds threshold`,
        {
          utilization,
          totalCount: snapshot.dbPool?.totalCount,
          maxConnections: snapshot.dbPool?.maxConnections,
          waitingCount: snapshot.dbPool?.waitingCount
        }
      );
      this.alertStates.dbPool = dbSeverity;
    } else if (!dbSeverity) {
      this.alertStates.dbPool = null;
    }
  }

  async poll() {
    this.queueDepth = await this.collectQueueDepth();
    this.dbPoolStats = this.collectDbPoolStats();
    const snapshot = this.buildSnapshot();
    this.lastSnapshot = snapshot;

    loggingService.logPerformance('info', 'Metrics snapshot captured', snapshot);
    this.evaluateAlerts(snapshot);

    return snapshot;
  }

  start() {
    if (this.timer) return;
    this.poll().catch(() => {});
    this.timer = setInterval(() => {
      this.poll().catch(() => {});
    }, this.intervalMs);
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  getSnapshot() {
    return this.lastSnapshot;
  }
}

const metricsService = new MetricsService();
export default metricsService;
