/**
 * Rollback Alerting Service for Secure Gate Access Control System
 * 
 * Provides comprehensive alerting for rollback failures and system events
 * Features:
 * - Rollback failure alerts
 * - Multi-channel alerting (PagerDuty, Slack, Email)
 * - Alert escalation and routing
 * - Alert suppression and deduplication
 * - Alert history and analytics
 */

import loggingService from './loggingService.js';
import notificationService from './notificationService.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

class RollbackAlertingService {
  constructor() {
    this.config = {
      alerts: {
        rollback_failure: {
          severity: 'critical',
          channels: ['pagerduty', 'slack', 'email'],
          details_included: [
            'failed_action',
            'rollback_attempt_result',
            'next_steps'
          ],
          escalation: {
            enabled: true,
            levels: [
              { level: 1, delay: 0, channels: ['pagerduty', 'slack'] },
              { level: 2, delay: 300000, channels: ['pagerduty', 'email', 'slack'] }, // 5 minutes
              { level: 3, delay: 900000, channels: ['pagerduty', 'email', 'phone'] } // 15 minutes
            ]
          },
          suppression: {
            enabled: true,
            window: 300000, // 5 minutes
            max_alerts: 3
          }
        },
        system_failure: {
          severity: 'critical',
          channels: ['pagerduty', 'slack'],
          details_included: [
            'system_component',
            'failure_reason',
            'impact_assessment',
            'recovery_actions'
          ]
        },
        compliance_violation: {
          severity: 'high',
          channels: ['slack', 'email'],
          details_included: [
            'violation_type',
            'compliance_framework',
            'affected_data',
            'remediation_steps'
          ]
        }
      },
      channels: {
        pagerduty: {
          enabled: true,
          api_key: process.env.PAGERDUTY_API_KEY,
          service_key: process.env.PAGERDUTY_SERVICE_KEY,
          escalation_policy: process.env.PAGERDUTY_ESCALATION_POLICY,
          timeout: 30000
        },
        slack: {
          enabled: true,
          webhook_url: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_CHANNEL || '#alerts',
          username: 'Secure Gate Alerts',
          icon_emoji: ':warning:',
          timeout: 30000
        },
        email: {
          enabled: true,
          smtp_host: process.env.SMTP_HOST,
          smtp_port: process.env.SMTP_PORT || 587,
          smtp_user: process.env.SMTP_USER,
          smtp_pass: process.env.SMTP_PASS,
          from: process.env.EMAIL_FROM || 'alerts@securegate.com',
          to: process.env.EMAIL_TO || 'admin@securegate.com',
          timeout: 30000
        },
        phone: {
          enabled: true,
          twilio_sid: process.env.TWILIO_SID,
          twilio_token: process.env.TWILIO_TOKEN,
          from_number: process.env.TWILIO_FROM,
          to_numbers: process.env.TWILIO_TO ? process.env.TWILIO_TO.split(',') : [],
          timeout: 30000
        }
      },
      routing: {
        enabled: true,
        rules: [
          {
            condition: 'severity === "critical"',
            channels: ['pagerduty', 'slack', 'email'],
            escalation: true
          },
          {
            condition: 'severity === "high"',
            channels: ['slack', 'email'],
            escalation: false
          },
          {
            condition: 'severity === "medium"',
            channels: ['slack'],
            escalation: false
          },
          {
            condition: 'severity === "low"',
            channels: ['slack'],
            escalation: false
          }
        ]
      },
      analytics: {
        enabled: true,
        retention_days: 30,
        metrics: [
          'alert_count',
          'alert_resolution_time',
          'channel_performance',
          'escalation_frequency'
        ]
      }
    };
    
    this.alertHistory = [];
    this.activeAlerts = new Map();
    this.suppressionMap = new Map();
    this.escalationTimers = new Map();
    this.isRunning = false;
    
    this.initializeService();
  }

  /**
   * Initialize rollback alerting service
   */
  async initializeService() {
    try {
      loggingService.logInfo('Rollback alerting service initialized', {
        channels: Object.keys(this.config.channels).filter(k => this.config.channels[k].enabled),
        routingEnabled: this.config.routing.enabled,
        analyticsEnabled: this.config.analytics.enabled
      });
      
      // Start alert processing
      this.startAlertProcessing();
      
    } catch (error) {
      loggingService.logError('Failed to initialize rollback alerting service', error);
      throw error;
    }
  }

  /**
   * Start alert processing
   */
  startAlertProcessing() {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    
    // Start cleanup intervals
    setInterval(async () => {
      try {
        await this.cleanupAlertHistory();
      } catch (error) {
        loggingService.logError('Alert history cleanup failed', error);
      }
    }, 24 * 60 * 60 * 1000); // Daily
    
    setInterval(async () => {
      try {
        await this.processEscalations();
      } catch (error) {
        loggingService.logError('Escalation processing failed', error);
      }
    }, 60000); // Every minute
    
    loggingService.logInfo('Rollback alert processing started');
  }

  /**
   * Send rollback failure alert
   */
  async sendRollbackFailureAlert(alertData) {
    try {
      const alert = await this.createAlert({
        type: 'rollback_failure',
        severity: 'critical',
        title: 'Rollback Failure Alert',
        message: `Rollback failed for action: ${alertData.failed_action}`,
        data: {
          failed_action: alertData.failed_action,
          rollback_attempt_result: alertData.rollback_attempt_result,
          next_steps: alertData.next_steps,
          rollback_id: alertData.rollback_id,
          snapshot_id: alertData.snapshot_id,
          error_message: alertData.error_message,
          timestamp: new Date().toISOString()
        }
      });
      
      // Check suppression
      if (await this.isAlertSuppressed(alert)) {
        loggingService.logInfo('Alert suppressed due to suppression rules', {
          alertId: alert.id,
          type: alert.type
        });
        return alert;
      }
      
      // Route alert
      await this.routeAlert(alert);
      
      // Store alert
      this.alertHistory.push(alert);
      this.activeAlerts.set(alert.id, alert);
      
      // Set up escalation if configured
      if (alert.escalation && alert.escalation.enabled) {
        await this.setupEscalation(alert);
      }
      
      loggingService.logInfo('Rollback failure alert sent', {
        alertId: alert.id,
        channels: alert.channels,
        severity: alert.severity
      });
      
      return alert;
      
    } catch (error) {
      loggingService.logError('Failed to send rollback failure alert', error);
      throw error;
    }
  }

  /**
   * Send system failure alert
   */
  async sendSystemFailureAlert(alertData) {
    try {
      const alert = await this.createAlert({
        type: 'system_failure',
        severity: 'critical',
        title: 'System Failure Alert',
        message: `System failure detected: ${alertData.system_component}`,
        data: {
          system_component: alertData.system_component,
          failure_reason: alertData.failure_reason,
          impact_assessment: alertData.impact_assessment,
          recovery_actions: alertData.recovery_actions,
          timestamp: new Date().toISOString()
        }
      });
      
      // Check suppression
      if (await this.isAlertSuppressed(alert)) {
        loggingService.logInfo('Alert suppressed due to suppression rules', {
          alertId: alert.id,
          type: alert.type
        });
        return alert;
      }
      
      // Route alert
      await this.routeAlert(alert);
      
      // Store alert
      this.alertHistory.push(alert);
      this.activeAlerts.set(alert.id, alert);
      
      loggingService.logInfo('System failure alert sent', {
        alertId: alert.id,
        channels: alert.channels,
        severity: alert.severity
      });
      
      return alert;
      
    } catch (error) {
      loggingService.logError('Failed to send system failure alert', error);
      throw error;
    }
  }

  /**
   * Send compliance violation alert
   */
  async sendComplianceViolationAlert(alertData) {
    try {
      const alert = await this.createAlert({
        type: 'compliance_violation',
        severity: 'high',
        title: 'Compliance Violation Alert',
        message: `Compliance violation detected: ${alertData.violation_type}`,
        data: {
          violation_type: alertData.violation_type,
          compliance_framework: alertData.compliance_framework,
          affected_data: alertData.affected_data,
          remediation_steps: alertData.remediation_steps,
          timestamp: new Date().toISOString()
        }
      });
      
      // Check suppression
      if (await this.isAlertSuppressed(alert)) {
        loggingService.logInfo('Alert suppressed due to suppression rules', {
          alertId: alert.id,
          type: alert.type
        });
        return alert;
      }
      
      // Route alert
      await this.routeAlert(alert);
      
      // Store alert
      this.alertHistory.push(alert);
      this.activeAlerts.set(alert.id, alert);
      
      loggingService.logInfo('Compliance violation alert sent', {
        alertId: alert.id,
        channels: alert.channels,
        severity: alert.severity
      });
      
      return alert;
      
    } catch (error) {
      loggingService.logError('Failed to send compliance violation alert', error);
      throw error;
    }
  }

  /**
   * Create alert
   */
  async createAlert(alertData) {
    try {
      const alert = {
        id: this.generateAlertId(),
        type: alertData.type,
        severity: alertData.severity,
        title: alertData.title,
        message: alertData.message,
        data: alertData.data,
        channels: [],
        status: 'pending',
        created_at: new Date().toISOString(),
        sent_at: null,
        resolved_at: null,
        escalation: this.getEscalationConfig(alertData.type),
        suppression_key: this.generateSuppressionKey(alertData)
      };
      
      return alert;
      
    } catch (error) {
      loggingService.logError('Failed to create alert', error);
      throw error;
    }
  }

  /**
   * Get escalation configuration
   */
  getEscalationConfig(alertType) {
    const alertConfig = this.config.alerts[alertType];
    if (alertConfig && alertConfig.escalation && alertConfig.escalation.enabled) {
      return {
        enabled: true,
        levels: alertConfig.escalation.levels,
        current_level: 1,
        next_escalation: Date.now() + alertConfig.escalation.levels[0].delay
      };
    }
    return { enabled: false };
  }

  /**
   * Generate suppression key
   */
  generateSuppressionKey(alertData) {
    const key = `${alertData.type}-${alertData.severity}-${JSON.stringify(alertData.data)}`;
    return crypto.createHash('md5').update(key).digest('hex');
  }

  /**
   * Check if alert is suppressed
   */
  async isAlertSuppressed(alert) {
    try {
      const suppressionKey = alert.suppression_key;
      const suppressionConfig = this.config.alerts[alert.type].suppression;
      
      if (!suppressionConfig.enabled) {
        return false;
      }
      
      const now = Date.now();
      const suppressionWindow = suppressionConfig.window;
      const maxAlerts = suppressionConfig.max_alerts;
      
      // Get recent alerts with same suppression key
      const recentAlerts = this.alertHistory.filter(a => 
        a.suppression_key === suppressionKey &&
        (now - new Date(a.created_at).getTime()) < suppressionWindow
      );
      
      if (recentAlerts.length >= maxAlerts) {
        return true;
      }
      
      return false;
      
    } catch (error) {
      loggingService.logError('Failed to check alert suppression', error);
      return false;
    }
  }

  /**
   * Route alert
   */
  async routeAlert(alert) {
    try {
      if (!this.config.routing.enabled) {
        // Use default channels from alert config
        const alertConfig = this.config.alerts[alert.type];
        alert.channels = alertConfig.channels;
        await this.sendToChannels(alert);
        return;
      }
      
      // Apply routing rules
      for (const rule of this.config.routing.rules) {
        if (this.evaluateCondition(rule.condition, alert)) {
          alert.channels = rule.channels;
          alert.escalation.enabled = rule.escalation;
          break;
        }
      }
      
      // Send to channels
      await this.sendToChannels(alert);
      
    } catch (error) {
      loggingService.logError('Failed to route alert', error);
    }
  }

  /**
   * Evaluate routing condition
   */
  evaluateCondition(condition, alert) {
    try {
      // Simple condition evaluation (in production, use a proper expression evaluator)
      if (condition.includes('severity === "critical"')) {
        return alert.severity === 'critical';
      }
      if (condition.includes('severity === "high"')) {
        return alert.severity === 'high';
      }
      if (condition.includes('severity === "medium"')) {
        return alert.severity === 'medium';
      }
      if (condition.includes('severity === "low"')) {
        return alert.severity === 'low';
      }
      return false;
    } catch (error) {
      loggingService.logError('Failed to evaluate routing condition', error);
      return false;
    }
  }

  /**
   * Send to channels
   */
  async sendToChannels(alert) {
    try {
      const promises = alert.channels.map(channel => this.sendToChannel(alert, channel));
      await Promise.allSettled(promises);
      
      alert.status = 'sent';
      alert.sent_at = new Date().toISOString();
      
    } catch (error) {
      loggingService.logError('Failed to send to channels', error);
    }
  }

  /**
   * Send to specific channel
   */
  async sendToChannel(alert, channel) {
    try {
      const channelConfig = this.config.channels[channel];
      if (!channelConfig || !channelConfig.enabled) {
        loggingService.logWarn(`Channel ${channel} is disabled or not configured`);
        return;
      }
      
      switch (channel) {
        case 'pagerduty':
          await this.sendToPagerDuty(alert, channelConfig);
          break;
        case 'slack':
          await this.sendToSlack(alert, channelConfig);
          break;
        case 'email':
          await this.sendToEmail(alert, channelConfig);
          break;
        case 'phone':
          await this.sendToPhone(alert, channelConfig);
          break;
        default:
          loggingService.logWarn(`Unknown channel: ${channel}`);
      }
      
    } catch (error) {
      loggingService.logError(`Failed to send to channel ${channel}`, error);
    }
  }

  /**
   * Send to PagerDuty
   */
  async sendToPagerDuty(alert, config) {
    try {
      const payload = {
        routing_key: config.service_key,
        event_action: 'trigger',
        dedup_key: alert.id,
        payload: {
          summary: alert.title,
          source: 'secure-gate-access',
          severity: alert.severity,
          custom_details: alert.data
        }
      };
      
      const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token token=${config.api_key}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`PagerDuty request failed: ${response.status} ${response.statusText}`);
      }
      
      loggingService.logInfo('Alert sent to PagerDuty', { alertId: alert.id });
      
    } catch (error) {
      loggingService.logError('Failed to send to PagerDuty', error);
      throw error;
    }
  }

  /**
   * Send to Slack
   */
  async sendToSlack(alert, config) {
    try {
      const payload = {
        channel: config.channel,
        username: config.username,
        icon_emoji: config.icon_emoji,
        text: alert.title,
        attachments: [{
          color: this.getSeverityColor(alert.severity),
          fields: [
            { title: 'Severity', value: alert.severity, short: true },
            { title: 'Type', value: alert.type, short: true },
            { title: 'Message', value: alert.message, short: false },
            { title: 'Data', value: JSON.stringify(alert.data, null, 2), short: false }
          ],
          timestamp: Math.floor(new Date(alert.created_at).getTime() / 1000)
        }]
      };
      
      const response = await fetch(config.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Slack request failed: ${response.status} ${response.statusText}`);
      }
      
      loggingService.logInfo('Alert sent to Slack', { alertId: alert.id });
      
    } catch (error) {
      loggingService.logError('Failed to send to Slack', error);
      throw error;
    }
  }

  /**
   * Send to Email
   */
  async sendToEmail(alert, config) {
    try {
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransporter({
        host: config.smtp_host,
        port: config.smtp_port,
        secure: false,
        auth: {
          user: config.smtp_user,
          pass: config.smtp_pass
        }
      });
      
      const mailOptions = {
        from: config.from,
        to: config.to,
        subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
        html: `
          <h2>${alert.title}</h2>
          <p><strong>Severity:</strong> ${alert.severity}</p>
          <p><strong>Type:</strong> ${alert.type}</p>
          <p><strong>Message:</strong> ${alert.message}</p>
          <h3>Details:</h3>
          <pre>${JSON.stringify(alert.data, null, 2)}</pre>
          <p><strong>Timestamp:</strong> ${alert.created_at}</p>
        `
      };
      
      await transporter.sendMail(mailOptions);
      
      loggingService.logInfo('Alert sent to Email', { alertId: alert.id });
      
    } catch (error) {
      loggingService.logError('Failed to send to Email', error);
      throw error;
    }
  }

  /**
   * Send to Phone
   */
  async sendToPhone(alert, config) {
    try {
      const twilio = require('twilio');
      const client = twilio(config.twilio_sid, config.twilio_token);
      
      for (const toNumber of config.to_numbers) {
        await client.calls.create({
          to: toNumber,
          from: config.from_number,
          url: `https://securegate.com/alert-voice/${alert.id}`
        });
      }
      
      loggingService.logInfo('Alert sent to Phone', { alertId: alert.id });
      
    } catch (error) {
      loggingService.logError('Failed to send to Phone', error);
      throw error;
    }
  }

  /**
   * Get severity color
   */
  getSeverityColor(severity) {
    const colors = {
      critical: 'danger',
      high: 'warning',
      medium: 'good',
      low: 'good'
    };
    return colors[severity] || 'good';
  }

  /**
   * Setup escalation
   */
  async setupEscalation(alert) {
    try {
      if (!alert.escalation.enabled) {
        return;
      }
      
      const escalationTimer = setTimeout(async () => {
        await this.escalateAlert(alert);
      }, alert.escalation.next_escalation - Date.now());
      
      this.escalationTimers.set(alert.id, escalationTimer);
      
    } catch (error) {
      loggingService.logError('Failed to setup escalation', error);
    }
  }

  /**
   * Escalate alert
   */
  async escalateAlert(alert) {
    try {
      if (!alert.escalation.enabled) {
        return;
      }
      
      const currentLevel = alert.escalation.current_level;
      const levels = alert.escalation.levels;
      
      if (currentLevel >= levels.length) {
        loggingService.logInfo('Alert escalation completed', { alertId: alert.id });
        return;
      }
      
      const nextLevel = levels[currentLevel];
      alert.escalation.current_level = currentLevel + 1;
      alert.escalation.next_escalation = Date.now() + nextLevel.delay;
      
      // Send to additional channels
      await this.sendToChannels(alert);
      
      // Setup next escalation
      await this.setupEscalation(alert);
      
      loggingService.logInfo('Alert escalated', {
        alertId: alert.id,
        level: alert.escalation.current_level
      });
      
    } catch (error) {
      loggingService.logError('Failed to escalate alert', error);
    }
  }

  /**
   * Process escalations
   */
  async processEscalations() {
    try {
      const now = Date.now();
      
      for (const [alertId, alert] of this.activeAlerts.entries()) {
        if (alert.escalation.enabled && alert.escalation.next_escalation <= now) {
          await this.escalateAlert(alert);
        }
      }
      
    } catch (error) {
      loggingService.logError('Failed to process escalations', error);
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId, resolution = '') {
    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`);
      }
      
      alert.status = 'resolved';
      alert.resolved_at = new Date().toISOString();
      alert.resolution = resolution;
      
      // Clear escalation timer
      const timer = this.escalationTimers.get(alertId);
      if (timer) {
        clearTimeout(timer);
        this.escalationTimers.delete(alertId);
      }
      
      // Remove from active alerts
      this.activeAlerts.delete(alertId);
      
      loggingService.logInfo('Alert resolved', {
        alertId: alertId,
        resolution: resolution
      });
      
      return alert;
      
    } catch (error) {
      loggingService.logError('Failed to resolve alert', error);
      throw error;
    }
  }

  /**
   * Cleanup alert history
   */
  async cleanupAlertHistory() {
    try {
      const cutoffTime = Date.now() - (this.config.analytics.retention_days * 24 * 60 * 60 * 1000);
      
      this.alertHistory = this.alertHistory.filter(alert => 
        new Date(alert.created_at).getTime() > cutoffTime
      );
      
      loggingService.logInfo('Alert history cleaned up', {
        remaining: this.alertHistory.length
      });
      
    } catch (error) {
      loggingService.logError('Failed to cleanup alert history', error);
    }
  }

  /**
   * Generate alert ID
   */
  generateAlertId() {
    return `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId) {
    return this.activeAlerts.get(alertId) || 
           this.alertHistory.find(a => a.id === alertId);
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
  getAlertHistory() {
    return this.alertHistory;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: true,
      running: this.isRunning,
      activeAlerts: this.activeAlerts.size,
      alertHistory: this.alertHistory.length,
      escalationTimers: this.escalationTimers.size,
      config: this.config
    };
  }
}

// Create singleton instance
const rollbackAlertingService = new RollbackAlertingService();

export default rollbackAlertingService;
