/**
 * Alerting Service - Threshold-based monitoring and notifications
 * Provides real-time alerting for security events, performance issues, and system health
 */

import { log } from '../utils/tokenHelper.js';

class AlertingService {
  constructor() {
    this.alerts = [];
    this.thresholds = {
      // Performance thresholds
      responseTime: {
        warning: 1000,   // 1 second
        critical: 5000   // 5 seconds
      },
      errorRate: {
        warning: 0.05,   // 5%
        critical: 0.15   // 15%
      },
      
      // Security thresholds
      authFailures: {
        warning: 10,     // 10 failures per hour
        critical: 50     // 50 failures per hour
      },
      
      // System thresholds
      memoryUsage: {
        warning: 80,     // 80%
        critical: 95     // 95%
      },
      diskUsage: {
        warning: 85,     // 85%
        critical: 95     // 95%
      },
      
      // Business thresholds
      slowRequests: {
        warning: 5,      // 5 slow requests per minute
        critical: 20     // 20 slow requests per minute
      }
    };
    
    this.alertHistory = [];
    this.maxHistorySize = 1000;
    
    // Start periodic monitoring
    this.startMonitoring();
  }
  
  /**
   * Check system metrics against thresholds
   */
  checkThresholds(metrics) {
    const alerts = [];
    const timestamp = new Date().toISOString();
    
    // Performance checks
    if (metrics.performance?.globalStats) {
      const { avgResponseTime, errorRate, totalRequests } = metrics.performance.globalStats;
      
      // Response time alerts
      if (avgResponseTime > this.thresholds.responseTime.critical) {
        alerts.push(this.createAlert('critical', 'performance', `Critical response time: ${avgResponseTime}ms`, timestamp));
      } else if (avgResponseTime > this.thresholds.responseTime.warning) {
        alerts.push(this.createAlert('warning', 'performance', `Slow response time: ${avgResponseTime}ms`, timestamp));
      }
      
      // Error rate alerts  
      if (errorRate > this.thresholds.errorRate.critical) {
        alerts.push(this.createAlert('critical', 'performance', `Critical error rate: ${(errorRate * 100).toFixed(1)}%`, timestamp));
      } else if (errorRate > this.thresholds.errorRate.warning) {
        alerts.push(this.createAlert('warning', 'performance', `High error rate: ${(errorRate * 100).toFixed(1)}%`, timestamp));
      }
    }
    
    // Security checks
    if (metrics.security) {
      const authFailures = metrics.security.authFailures || 0;
      
      if (authFailures > this.thresholds.authFailures.critical) {
        alerts.push(this.createAlert('critical', 'security', `Critical: ${authFailures} authentication failures`, timestamp));
      } else if (authFailures > this.thresholds.authFailures.warning) {
        alerts.push(this.createAlert('warning', 'security', `High authentication failures: ${authFailures}`, timestamp));
      }
    }
    
    // System health checks
    if (metrics.performance?.systemHealth) {
      const memoryUsage = metrics.performance.systemHealth.memory?.system ? 
        parseInt(metrics.performance.systemHealth.memory.system.usage) : null;
      
      if (memoryUsage !== null) {
        if (memoryUsage > this.thresholds.memoryUsage.critical) {
          alerts.push(this.createAlert('critical', 'system', `Critical memory usage: ${memoryUsage}%`, timestamp));
        } else if (memoryUsage > this.thresholds.memoryUsage.warning) {
          alerts.push(this.createAlert('warning', 'system', `High memory usage: ${memoryUsage}%`, timestamp));
        }
      }
    }
    
    // Business logic checks
    const slowRequests = metrics.performance?.slowRequests?.length || 0;
    if (slowRequests > this.thresholds.slowRequests.critical) {
      alerts.push(this.createAlert('critical', 'business', `Critical: ${slowRequests} slow requests detected`, timestamp));
    } else if (slowRequests > this.thresholds.slowRequests.warning) {
      alerts.push(this.createAlert('warning', 'business', `${slowRequests} slow requests detected`, timestamp));
    }
    
    // Process new alerts
    alerts.forEach(alert => this.processAlert(alert));
    
    return alerts;
  }
  
  /**
   * Create a standardized alert object
   */
  createAlert(level, category, message, timestamp) {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      level,
      category,
      message,
      timestamp,
      acknowledged: false,
      resolved: false
    };
  }
  
  /**
   * Process and handle a new alert
   */
  processAlert(alert) {
    // Add to active alerts
    this.alerts.push(alert);
    
    // Add to history
    this.alertHistory.push({...alert});
    
    // Trim history if needed
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory = this.alertHistory.slice(-this.maxHistorySize);
    }
    
    // Log the alert
    log(alert.level === 'critical' ? 'error' : 'warn', 'alert.triggered', {
      alertId: alert.id,
      level: alert.level,
      category: alert.category,
      message: alert.message
    });
    
    // Send notifications (placeholder for future implementation)
    this.sendNotification(alert);
    
    // Auto-resolve info level alerts after 5 minutes
    if (alert.level === 'info') {
      setTimeout(() => {
        this.resolveAlert(alert.id);
      }, 5 * 60 * 1000);
    }
  }
  
  /**
   * Send alert notifications
   */
  sendNotification(alert) {
    // Placeholder for notification implementation
    // Could integrate with:
    // - Email notifications
    // - Slack/Discord webhooks  
    // - SMS alerts
    // - PagerDuty
    // - Custom webhook endpoints
    
    log('info', 'alert.notification.sent', {
      alertId: alert.id,
      level: alert.level,
      method: 'placeholder'
    });
  }
  
  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      log('info', 'alert.acknowledged', { alertId });
      return true;
    }
    return false;
  }
  
  /**
   * Resolve an alert
   */
  resolveAlert(alertId) {
    const alertIndex = this.alerts.findIndex(a => a.id === alertId);
    if (alertIndex !== -1) {
      const alert = this.alerts[alertIndex];
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      
      // Remove from active alerts
      this.alerts.splice(alertIndex, 1);
      
      log('info', 'alert.resolved', { alertId });
      return true;
    }
    return false;
  }
  
  /**
   * Get current active alerts
   */
  getActiveAlerts() {
    return this.alerts.filter(a => !a.resolved);
  }
  
  /**
   * Get alert history
   */
  getAlertHistory(limit = 100) {
    return this.alertHistory.slice(-limit).reverse();
  }
  
  /**
   * Get alert statistics
   */
  getAlertStats() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentAlerts = this.alertHistory.filter(a => new Date(a.timestamp) > oneHourAgo);
    const dailyAlerts = this.alertHistory.filter(a => new Date(a.timestamp) > oneDayAgo);
    
    return {
      active: this.alerts.length,
      total: this.alertHistory.length,
      lastHour: recentAlerts.length,
      last24Hours: dailyAlerts.length,
      byLevel: {
        critical: this.alerts.filter(a => a.level === 'critical').length,
        warning: this.alerts.filter(a => a.level === 'warning').length,
        info: this.alerts.filter(a => a.level === 'info').length
      },
      byCategory: {
        security: this.alerts.filter(a => a.category === 'security').length,
        performance: this.alerts.filter(a => a.category === 'performance').length,
        system: this.alerts.filter(a => a.category === 'system').length,
        business: this.alerts.filter(a => a.category === 'business').length
      }
    };
  }
  
  /**
   * Update alerting thresholds
   */
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    log('info', 'alerting.thresholds.updated', { thresholds: this.thresholds });
  }
  
  /**
   * Start periodic monitoring
   */
  startMonitoring() {
    // Check thresholds every 30 seconds
    setInterval(() => {
      this.performHealthCheck();
    }, 30000);
    
    log('info', 'alerting.monitoring.started', { 
      checkInterval: '30s',
      thresholds: Object.keys(this.thresholds)
    });
  }
  
  /**
   * Perform periodic health check
   */
  async performHealthCheck() {
    try {
      // This would integrate with metrics collection
      // For now, it's a placeholder that could be called externally
      log('debug', 'alerting.health_check.performed', { timestamp: new Date().toISOString() });
    } catch (error) {
      log('error', 'alerting.health_check.failed', { error: error.message });
    }
  }
}

// Export singleton instance
export const alertingService = new AlertingService();
export default alertingService;