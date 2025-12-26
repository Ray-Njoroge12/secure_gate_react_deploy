/**
 * Rollback Alerting Service for Secure Gate Access Control System
 * 
 * Provides alerting capabilities for rollback events and compliance violations
 * Features:
 * - Rollback event notifications
 * - Critical alert management
 * - Alert escalation
 * - Alert history tracking
 */

import loggingService from './loggingService.js';
import centralizedLoggingService from './centralizedLoggingService.js';
import notificationService from './notificationService.js';

class RollbackAlertingService {
  constructor() {
    this.config = {
      alerting: {
        enabled: true,
        channels: ['email', 'sms', 'slack'],
        escalation: {
          enabled: true,
          levels: ['team', 'manager', 'director', 'executive'],
          timeout_minutes: 15
        }
      }
    };
    this.alertHistory = new Map();
    this.activeAlerts = new Map();
  }

  /**
   * Send a rollback alert
   */
  async sendRollbackAlert(details) {
    try {
      const alertId = `ALERT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const alert = {
        id: alertId,
        type: 'rollback',
        severity: details.severity || 'high',
        message: details.message,
        timestamp: new Date().toISOString(),
        metadata: details.metadata || {},
        status: 'active'
      };

      this.activeAlerts.set(alertId, alert);
      this.alertHistory.set(alertId, { ...alert, history: [] });

      await this.dispatchAlert(alert);

      loggingService.logAudit('ROLLBACK_ALERT_SENT', {
        alertId,
        severity: alert.severity,
        message: alert.message
      });

      return {
        success: true,
        alertId,
        message: 'Rollback alert sent successfully'
      };
    } catch (error) {
      loggingService.logError('ROLLBACK_ALERT_FAILED', {
        error: error.message,
        details
      });
      throw error;
    }
  }

  /**
   * Send a critical alert
   */
  async sendCriticalAlert(details) {
    try {
      const alertId = `CRITICAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const alert = {
        id: alertId,
        type: 'critical',
        severity: 'critical',
        message: details.message,
        timestamp: new Date().toISOString(),
        metadata: details.metadata || {},
        status: 'active',
        escalation: {
          level: 0,
          escalatedAt: null
        }
      };

      this.activeAlerts.set(alertId, alert);
      this.alertHistory.set(alertId, { ...alert, history: [] });

      await this.dispatchAlert(alert);

      // Start escalation timer for critical alerts
      this.startEscalation(alertId);

      loggingService.logAudit('CRITICAL_ALERT_SENT', {
        alertId,
        message: alert.message
      });

      return {
        success: true,
        alertId,
        message: 'Critical alert sent successfully'
      };
    } catch (error) {
      loggingService.logError('CRITICAL_ALERT_FAILED', {
        error: error.message,
        details
      });
      throw error;
    }
  }

  /**
   * Send a compliance alert
   */
  async sendComplianceAlert(details) {
    try {
      const alertId = `COMPLIANCE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const alert = {
        id: alertId,
        type: 'compliance',
        severity: details.severity || 'high',
        framework: details.framework,
        message: details.message,
        timestamp: new Date().toISOString(),
        metadata: details.metadata || {},
        status: 'active'
      };

      this.activeAlerts.set(alertId, alert);
      this.alertHistory.set(alertId, { ...alert, history: [] });

      await this.dispatchAlert(alert);

      loggingService.logAudit('COMPLIANCE_ALERT_SENT', {
        alertId,
        framework: alert.framework,
        severity: alert.severity,
        message: alert.message
      });

      return {
        success: true,
        alertId,
        message: 'Compliance alert sent successfully'
      };
    } catch (error) {
      loggingService.logError('COMPLIANCE_ALERT_FAILED', {
        error: error.message,
        details
      });
      throw error;
    }
  }

  /**
   * Dispatch alert to configured channels
   */
  async dispatchAlert(alert) {
    const channels = this.config.alerting.channels;
    
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            await notificationService.sendEmail({
              template: 'alert',
              data: alert
            });
            break;
          case 'sms':
            await notificationService.sendSMS({
              message: `[${alert.severity.toUpperCase()}] ${alert.message}`
            });
            break;
          case 'slack':
            await notificationService.sendSlackNotification({
              channel: '#alerts',
              message: alert.message,
              severity: alert.severity
            });
            break;
        }
      } catch (error) {
        loggingService.logError('ALERT_DISPATCH_FAILED', {
          alertId: alert.id,
          channel,
          error: error.message
        });
      }
    }
  }

  /**
   * Start escalation process for critical alerts
   */
  startEscalation(alertId) {
    if (!this.config.alerting.escalation.enabled) {
      return;
    }

    const timeout = this.config.alerting.escalation.timeout_minutes * 60 * 1000;
    
    setTimeout(async () => {
      const alert = this.activeAlerts.get(alertId);
      if (alert && alert.status === 'active') {
        await this.escalateAlert(alertId);
      }
    }, timeout);
  }

  /**
   * Escalate an alert to the next level
   */
  async escalateAlert(alertId) {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return { success: false, message: 'Alert not found' };
    }

    const levels = this.config.alerting.escalation.levels;
    const currentLevel = alert.escalation?.level || 0;
    
    if (currentLevel >= levels.length - 1) {
      return { success: false, message: 'Maximum escalation level reached' };
    }

    alert.escalation = {
      level: currentLevel + 1,
      escalatedAt: new Date().toISOString()
    };

    this.activeAlerts.set(alertId, alert);

    const history = this.alertHistory.get(alertId);
    if (history) {
      history.history.push({
        action: 'escalated',
        level: levels[currentLevel + 1],
        timestamp: new Date().toISOString()
      });
    }

    await this.dispatchAlert({
      ...alert,
      message: `[ESCALATED to ${levels[currentLevel + 1]}] ${alert.message}`
    });

    loggingService.logAudit('ALERT_ESCALATED', {
      alertId,
      newLevel: levels[currentLevel + 1]
    });

    return {
      success: true,
      alertId,
      newLevel: levels[currentLevel + 1],
      message: 'Alert escalated successfully'
    };
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId, acknowledgedBy) {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return { success: false, message: 'Alert not found' };
    }

    alert.status = 'acknowledged';
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date().toISOString();

    this.activeAlerts.set(alertId, alert);

    const history = this.alertHistory.get(alertId);
    if (history) {
      history.history.push({
        action: 'acknowledged',
        by: acknowledgedBy,
        timestamp: new Date().toISOString()
      });
    }

    loggingService.logAudit('ALERT_ACKNOWLEDGED', {
      alertId,
      acknowledgedBy
    });

    return {
      success: true,
      alertId,
      message: 'Alert acknowledged successfully'
    };
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId, resolution) {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return { success: false, message: 'Alert not found' };
    }

    alert.status = 'resolved';
    alert.resolution = resolution;
    alert.resolvedAt = new Date().toISOString();

    this.activeAlerts.delete(alertId);

    const history = this.alertHistory.get(alertId);
    if (history) {
      history.history.push({
        action: 'resolved',
        resolution,
        timestamp: new Date().toISOString()
      });
      history.status = 'resolved';
      this.alertHistory.set(alertId, history);
    }

    loggingService.logAudit('ALERT_RESOLVED', {
      alertId,
      resolution
    });

    return {
      success: true,
      alertId,
      message: 'Alert resolved successfully'
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(filters = {}) {
    let alerts = Array.from(this.alertHistory.values());

    if (filters.type) {
      alerts = alerts.filter(a => a.type === filters.type);
    }
    if (filters.severity) {
      alerts = alerts.filter(a => a.severity === filters.severity);
    }
    if (filters.status) {
      alerts = alerts.filter(a => a.status === filters.status);
    }
    if (filters.startDate) {
      alerts = alerts.filter(a => new Date(a.timestamp) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      alerts = alerts.filter(a => new Date(a.timestamp) <= new Date(filters.endDate));
    }

    return alerts;
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId) {
    return this.alertHistory.get(alertId) || null;
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(period = '30d') {
    const now = new Date();
    let startDate;

    switch (period) {
      case '24h':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
      default:
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }

    const alerts = this.getAlertHistory({ startDate: startDate.toISOString() });

    const stats = {
      period,
      total: alerts.length,
      byType: {},
      bySeverity: {},
      byStatus: {},
      averageResolutionTime: 0
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    for (const alert of alerts) {
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
      stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
      stats.byStatus[alert.status] = (stats.byStatus[alert.status] || 0) + 1;

      if (alert.status === 'resolved' && alert.resolvedAt) {
        const resolutionTime = new Date(alert.resolvedAt) - new Date(alert.timestamp);
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }
    }

    if (resolvedCount > 0) {
      stats.averageResolutionTime = Math.round(totalResolutionTime / resolvedCount / 1000 / 60); // in minutes
    }

    return stats;
  }
}

export default new RollbackAlertingService();
