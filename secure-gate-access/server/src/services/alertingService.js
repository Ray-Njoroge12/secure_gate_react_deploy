// server/src/services/alertingService.js
/**
 * Alerting Service
 * Threshold-based monitoring and alert generation
 */

import loggingService from './loggingService.js';

class AlertingService {
  constructor() {
    this.alerts = [];
    this.thresholds = {
      errorRate: { warning: 0.05, critical: 0.15 },
      queueDepth: { warning: 50, critical: 200 },
      dbPoolUtilization: { warning: 0.85, critical: 0.95 },
      responseTime: { warning: 1000, critical: 3000 },
      memoryUsage: { warning: 0.8, critical: 0.95 },
      cpuUsage: { warning: 0.7, critical: 0.9 }
    };
    this.alertHistory = [];
    this.subscribers = [];
  }

  setThreshold(metric, level, value) {
    if (!this.thresholds[metric]) {
      this.thresholds[metric] = {};
    }
    this.thresholds[metric][level] = value;
  }

  checkThreshold(metric, value) {
    const threshold = this.thresholds[metric];
    if (!threshold) return null;

    if (value >= threshold.critical) {
      return 'critical';
    } else if (value >= threshold.warning) {
      return 'warning';
    }
    return null;
  }

  createAlert(type, severity, message, metadata = {}) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      metadata,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      resolved: false
    };

    this.alerts.push(alert);
    this.alertHistory.push(alert);

    // Keep only last 1000 alerts in history
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-1000);
    }

    // Log the alert
    loggingService.logAPI(severity === 'critical' ? 'error' : 'warn', 
      `Alert: ${message}`, null, { alertId: alert.id, type, severity, ...metadata });

    // Notify subscribers
    this.notifySubscribers(alert);

    return alert;
  }

  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  resolveAlert(alertId, resolution = '') {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      alert.resolution = resolution;
      // Remove from active alerts
      this.alerts = this.alerts.filter(a => a.id !== alertId);
      return true;
    }
    return false;
  }

  getActiveAlerts(severity = null) {
    if (severity) {
      return this.alerts.filter(a => a.severity === severity && !a.resolved);
    }
    return this.alerts.filter(a => !a.resolved);
  }

  getAlertHistory(limit = 100) {
    return this.alertHistory.slice(-limit);
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notifySubscribers(alert) {
    this.subscribers.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        loggingService.logAPI('error', 'Alert subscriber notification failed', null, { error: error.message });
      }
    });
  }

  getStatistics() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const oneDayAgo = now - 86400000;

    const recentAlerts = this.alertHistory.filter(a => new Date(a.timestamp).getTime() > oneHourAgo);
    const dailyAlerts = this.alertHistory.filter(a => new Date(a.timestamp).getTime() > oneDayAgo);

    return {
      activeAlerts: this.alerts.length,
      criticalAlerts: this.alerts.filter(a => a.severity === 'critical').length,
      warningAlerts: this.alerts.filter(a => a.severity === 'warning').length,
      alertsLastHour: recentAlerts.length,
      alertsLast24Hours: dailyAlerts.length,
      totalHistorical: this.alertHistory.length
    };
  }
}

export const alertingService = new AlertingService();
export default alertingService;
