/**
 * @fileoverview Performance Alerting Service
 * @description Handles performance alerts, escalation procedures, and notifications
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import EventEmitter from 'events';
import loggingService from './loggingService.js';
import emailService from './emailService.js';

/**
 * Performance Alerting Service
 * Implements escalation procedures and multi-channel notifications
 */
class PerformanceAlertingService extends EventEmitter {
  constructor() {
    super();
    
    this.alertChannels = {
      email: true,
      sms: process.env.SMS_ALERTS_ENABLED === 'true',
      webhook: process.env.WEBHOOK_ALERTS_ENABLED === 'true',
      slack: process.env.SLACK_ALERTS_ENABLED === 'true'
    };
    
    // Escalation configuration
    this.escalationConfig = {
      critical: {
        immediate: ['email', 'sms'],
        escalationDelay: 5 * 60 * 1000, // 5 minutes
        escalationChannels: ['email', 'sms', 'webhook', 'slack'],
        maxEscalations: 3,
        escalationInterval: 15 * 60 * 1000 // 15 minutes between escalations
      },
      warning: {
        immediate: ['email'],
        escalationDelay: 15 * 60 * 1000, // 15 minutes
        escalationChannels: ['email', 'webhook'],
        maxEscalations: 2,
        escalationInterval: 30 * 60 * 1000 // 30 minutes between escalations
      },
      info: {
        immediate: ['email'],
        escalationDelay: 60 * 60 * 1000, // 1 hour
        escalationChannels: ['email'],
        maxEscalations: 1,
        escalationInterval: 60 * 60 * 1000 // 1 hour between escalations
      }
    };
    
    // Alert recipients configuration
    this.recipients = {
      critical: [
        { type: 'email', address: process.env.CRITICAL_ALERT_EMAIL || 'admin@secure-gate.app' },
        { type: 'sms', number: process.env.CRITICAL_ALERT_SMS },
        { type: 'webhook', url: process.env.CRITICAL_ALERT_WEBHOOK }
      ],
      warning: [
        { type: 'email', address: process.env.WARNING_ALERT_EMAIL || 'admin@secure-gate.app' },
        { type: 'webhook', url: process.env.WARNING_ALERT_WEBHOOK }
      ],
      info: [
        { type: 'email', address: process.env.INFO_ALERT_EMAIL || 'admin@secure-gate.app' }
      ]
    };
    
    // Active escalations tracking
    this.activeEscalations = new Map();
    
    // Alert history for rate limiting and analysis
    this.alertHistory = [];
    this.maxHistorySize = 1000;
    
    // Rate limiting configuration
    this.rateLimiting = {
      enabled: true,
      maxAlertsPerHour: 50,
      maxSameAlertsPer15Min: 3,
      cooldownPeriod: 5 * 60 * 1000 // 5 minutes
    };
    
    this.initializeService();
  }

  /**
   * Initialize the alerting service
   */
  initializeService() {
    loggingService.logInfo('[PERFORMANCE ALERTS] Service initialized', {
      channels: this.alertChannels,
      escalationConfig: Object.keys(this.escalationConfig),
      rateLimiting: this.rateLimiting.enabled,
      emailSenderAvailable: Boolean(this.resolveEmailSender())
    });
  }

  /**
   * Resolve the best available email sender function for alerts.
   * Supports both send(to, subject, html, text) and sendEmail({...}) contracts.
   */
  resolveEmailSender() {
    if (typeof emailService.send === 'function') {
      return async (to, subject, htmlContent, textContent, _severity) => emailService.send(
        to,
        subject,
        htmlContent,
        textContent
      );
    }

    if (typeof emailService.sendEmail === 'function') {
      return async (to, subject, htmlContent, textContent, severity) => emailService.sendEmail({
        to,
        subject,
        text: textContent,
        html: htmlContent,
        priority: severity === 'critical' ? 'high' : 'normal'
      });
    }

    return null;
  }

  getRecipientLabel(recipient = {}) {
    return recipient.address || recipient.number || recipient.url || 'unknown-recipient';
  }

  /**
   * Process a performance alert
   */
  async processAlert(alert) {
    try {
      // Check rate limiting
      if (this.isRateLimited(alert)) {
        loggingService.logWarning('[PERFORMANCE ALERTS] Alert rate limited', {
          alertType: alert.type,
          severity: alert.severity
        });
        return;
      }
      
      // Add to history
      this.addToHistory(alert);
      
      // Get escalation configuration for this severity
      const config = this.escalationConfig[alert.severity] || this.escalationConfig.info;
      
      // Send immediate notifications
      await this.sendImmediateNotifications(alert, config.immediate);
      
      // Setup escalation if not acknowledged
      this.setupEscalation(alert, config);
      
      loggingService.logInfo('[PERFORMANCE ALERTS] Alert processed', {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        immediateChannels: config.immediate
      });
      
    } catch (error) {
      loggingService.logError('[PERFORMANCE ALERTS] Error processing alert', error, {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity
      });
    }
  }

  /**
   * Send immediate notifications for an alert
   */
  async sendImmediateNotifications(alert, channels) {
    const recipients = this.recipients[alert.severity] || this.recipients.info;
    const deliveryTrace = [];
    
    for (const channel of channels) {
      if (!this.alertChannels[channel]) {
        deliveryTrace.push({ channel, status: 'skipped', reason: 'channel_disabled' });
        continue; // Channel disabled
      }
      
      const channelRecipients = recipients.filter(r => r.type === channel);

      if (channelRecipients.length === 0) {
        deliveryTrace.push({ channel, status: 'skipped', reason: 'no_recipients' });
      }
      
      for (const recipient of channelRecipients) {
        const startedAt = Date.now();
        const recipientLabel = this.getRecipientLabel(recipient);

        try {
          const result = await this.sendNotification(alert, channel, recipient);
          const durationMs = Date.now() - startedAt;

          if (result?.success === false) {
            deliveryTrace.push({
              channel,
              recipient: recipientLabel,
              status: 'failed',
              durationMs,
              error: result.error || 'channel_result_unsuccessful'
            });

            loggingService.logError(`[PERFORMANCE ALERTS] Failed to send ${channel} notification`, null, {
              alertId: alert.id,
              recipient: recipientLabel,
              reason: result.error || 'channel_result_unsuccessful',
              durationMs
            });
            continue;
          }

          deliveryTrace.push({
            channel,
            recipient: recipientLabel,
            status: 'sent',
            durationMs
          });
        } catch (error) {
          const durationMs = Date.now() - startedAt;
          deliveryTrace.push({
            channel,
            recipient: recipientLabel,
            status: 'failed',
            durationMs,
            error: error.message
          });

          loggingService.logError(`[PERFORMANCE ALERTS] Failed to send ${channel} notification`, error, {
            alertId: alert.id,
            recipient: recipientLabel,
            durationMs
          });
        }
      }
    }

    const attempted = deliveryTrace.filter(item => item.status !== 'skipped').length;
    const failed = deliveryTrace.filter(item => item.status === 'failed');

    if (failed.length > 0) {
      loggingService.logWarning('[PERFORMANCE ALERTS] Immediate notification summary', {
        alertId: alert.id,
        attempted,
        failed: failed.length,
        channels,
        failures: failed.slice(0, 5)
      });
    }
  }

  /**
   * Send notification via specific channel
   */
  async sendNotification(alert, channel, recipient) {
    const message = this.formatAlertMessage(alert);
    const subject = this.formatAlertSubject(alert);
    
    switch (channel) {
      case 'email':
        return this.sendEmailNotification(alert, recipient, subject, message);
        
      case 'sms':
        return this.sendSMSNotification(alert, recipient, message);
        
      case 'webhook':
        return this.sendWebhookNotification(alert, recipient);
        
      case 'slack':
        return this.sendSlackNotification(alert, recipient, message);
        
      default:
        loggingService.logWarning('[PERFORMANCE ALERTS] Unknown notification channel', {
          channel,
          alertId: alert.id
        });
        return { success: false, error: `unknown_channel:${channel}` };
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(alert, recipient, subject, message) {
    const sendEmail = this.resolveEmailSender();
    if (!sendEmail) {
      return {
        success: false,
        error: 'email_sender_unavailable'
      };
    }

    const htmlContent = this.generateEmailHTML(alert);

    await sendEmail(
      recipient.address,
      subject,
      htmlContent,
      message,
      alert.severity
    );
    
    loggingService.logInfo('[PERFORMANCE ALERTS] Email notification sent', {
      alertId: alert.id,
      recipient: recipient.address,
      severity: alert.severity
    });

    return { success: true };
  }

  /**
   * Send SMS notification
   */
  async sendSMSNotification(alert, recipient, message) {
    // This would integrate with your SMS service (e.g., AfricaTalking)
    // For now, we'll log the SMS that would be sent
    
    loggingService.logInfo('[PERFORMANCE ALERTS] SMS notification would be sent', {
      alertId: alert.id,
      recipient: recipient.number,
      message: message.substring(0, 160) // SMS length limit
    });
    
    // In a real implementation:
    // await smsService.sendSMS(recipient.number, message);
    return { success: true };
  }

  /**
   * Send webhook notification
   */
  async sendWebhookNotification(alert, recipient) {
    if (!recipient.url) return { success: false, error: 'missing_webhook_url' };
    
    const payload = {
      alert: {
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        currentValue: alert.currentValue,
        threshold: alert.threshold,
        timestamp: alert.timestamp
      },
      system: 'secure-gate-performance-monitor',
      timestamp: Date.now()
    };
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {

      const response = await fetch(recipient.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SecureGate-PerformanceMonitor/1.0'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
      }
      
      loggingService.logInfo('[PERFORMANCE ALERTS] Webhook notification sent', {
        alertId: alert.id,
        url: recipient.url,
        status: response.status
      });

      return { success: true };
      
    } catch (error) {
      const normalizedError = error?.name === 'AbortError'
        ? new Error('Webhook request timed out after 10000ms')
        : error;

      loggingService.logError('[PERFORMANCE ALERTS] Webhook notification failed', normalizedError, {
        alertId: alert.id,
        url: recipient.url
      });

      return {
        success: false,
        error: normalizedError?.message || 'webhook_send_failed'
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Send Slack notification
   */
  async sendSlackNotification(alert, recipient, message) {
    // This would integrate with Slack API
    // For now, we'll log the Slack message that would be sent
    
    const slackMessage = {
      text: `Performance Alert: ${alert.severity.toUpperCase()}`,
      attachments: [{
        color: this.getSlackColor(alert.severity),
        fields: [
          { title: 'Alert Type', value: alert.type, short: true },
          { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
          { title: 'Message', value: alert.message, short: false },
          { title: 'Current Value', value: alert.currentValue?.toString(), short: true },
          { title: 'Threshold', value: alert.threshold?.toString(), short: true }
        ],
        timestamp: Math.floor(alert.timestamp / 1000)
      }]
    };
    
    loggingService.logInfo('[PERFORMANCE ALERTS] Slack notification would be sent', {
      alertId: alert.id,
      webhook: recipient.url,
      message: slackMessage
    });
    
    // In a real implementation:
    // await slackService.sendMessage(recipient.url, slackMessage);
    return { success: true };
  }

  /**
   * Setup escalation for an alert
   */
  setupEscalation(alert, config) {
    const escalationId = `escalation_${alert.id}`;
    
    const escalation = {
      alertId: alert.id,
      alert,
      config,
      level: 0,
      maxLevel: config.maxEscalations,
      nextEscalation: Date.now() + config.escalationDelay,
      acknowledged: false
    };
    
    this.activeEscalations.set(escalationId, escalation);
    
    // Schedule first escalation check
    setTimeout(() => {
      this.checkEscalation(escalationId);
    }, config.escalationDelay);
  }

  /**
   * Check and execute escalation if needed
   */
  async checkEscalation(escalationId) {
    const escalation = this.activeEscalations.get(escalationId);
    
    if (!escalation || escalation.acknowledged) {
      this.activeEscalations.delete(escalationId);
      return;
    }
    
    const now = Date.now();
    
    if (now >= escalation.nextEscalation && escalation.level < escalation.maxLevel) {
      // Execute escalation
      escalation.level++;
      
      loggingService.logWarning('[PERFORMANCE ALERTS] Escalating alert', {
        alertId: escalation.alertId,
        escalationLevel: escalation.level,
        maxLevel: escalation.maxLevel
      });
      
      // Send escalation notifications
      await this.sendEscalationNotifications(escalation);
      
      // Schedule next escalation if not at max level
      if (escalation.level < escalation.maxLevel) {
        escalation.nextEscalation = now + escalation.config.escalationInterval;
        
        setTimeout(() => {
          this.checkEscalation(escalationId);
        }, escalation.config.escalationInterval);
      } else {
        // Max escalations reached
        loggingService.logError('[PERFORMANCE ALERTS] Maximum escalations reached', null, {
          alertId: escalation.alertId,
          escalationLevel: escalation.level
        });
        
        this.activeEscalations.delete(escalationId);
      }
    }
  }

  /**
   * Send escalation notifications
   */
  async sendEscalationNotifications(escalation) {
    const alert = {
      ...escalation.alert,
      message: `ESCALATED (Level ${escalation.level}): ${escalation.alert.message}`,
      escalationLevel: escalation.level
    };
    
    await this.sendImmediateNotifications(alert, escalation.config.escalationChannels);
  }

  /**
   * Acknowledge an alert and stop escalation
   */
  acknowledgeAlert(alertId, acknowledgedBy) {
    // Find and acknowledge escalation
    for (const [escalationId, escalation] of this.activeEscalations) {
      if (escalation.alertId === alertId) {
        escalation.acknowledged = true;
        escalation.acknowledgedBy = acknowledgedBy;
        escalation.acknowledgedAt = Date.now();
        
        loggingService.logInfo('[PERFORMANCE ALERTS] Alert acknowledged, stopping escalation', {
          alertId,
          acknowledgedBy,
          escalationLevel: escalation.level
        });
        
        this.activeEscalations.delete(escalationId);
        break;
      }
    }
  }

  /**
   * Check if alert is rate limited
   */
  isRateLimited(alert) {
    if (!this.rateLimiting.enabled) return false;
    
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const fifteenMinAgo = now - (15 * 60 * 1000);
    
    // Count alerts in the last hour
    const recentAlerts = this.alertHistory.filter(a => a.timestamp > oneHourAgo);
    if (recentAlerts.length >= this.rateLimiting.maxAlertsPerHour) {
      return true;
    }
    
    // Count same type alerts in the last 15 minutes
    const sameTypeAlerts = this.alertHistory.filter(a => 
      a.timestamp > fifteenMinAgo && a.type === alert.type
    );
    if (sameTypeAlerts.length >= this.rateLimiting.maxSameAlertsPer15Min) {
      return true;
    }
    
    return false;
  }

  /**
   * Add alert to history
   */
  addToHistory(alert) {
    this.alertHistory.push({
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      timestamp: alert.timestamp
    });
    
    // Trim history to max size
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory = this.alertHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Format alert message for notifications
   */
  formatAlertMessage(alert) {
    let message = `Performance Alert: ${alert.message}`;
    
    if (alert.currentValue && alert.threshold) {
      message += `\nCurrent: ${alert.currentValue}, Threshold: ${alert.threshold}`;
    }
    
    message += `\nTime: ${new Date(alert.timestamp).toLocaleString()}`;
    message += `\nAlert ID: ${alert.id}`;
    
    return message;
  }

  /**
   * Format alert subject for email
   */
  formatAlertSubject(alert) {
    return `[${alert.severity.toUpperCase()}] Performance Alert: ${alert.type}`;
  }

  /**
   * Generate HTML content for email
   */
  generateEmailHTML(alert) {
    const severityColor = {
      critical: '#dc2626',
      warning: '#d97706',
      info: '#2563eb'
    }[alert.severity] || '#6b7280';
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${severityColor}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Performance Alert</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">${alert.severity.toUpperCase()}</p>
        </div>
        
        <div style="padding: 20px; background: #f9fafb;">
          <h2 style="color: #1f2937; margin-top: 0;">Alert Details</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #374151;">Type:</td>
              <td style="padding: 8px; color: #1f2937;">${alert.type}</td>
            </tr>
            <tr style="background: #ffffff;">
              <td style="padding: 8px; font-weight: bold; color: #374151;">Message:</td>
              <td style="padding: 8px; color: #1f2937;">${alert.message}</td>
            </tr>
            ${alert.currentValue ? `
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #374151;">Current Value:</td>
              <td style="padding: 8px; color: #1f2937;">${alert.currentValue}</td>
            </tr>
            ` : ''}
            ${alert.threshold ? `
            <tr style="background: #ffffff;">
              <td style="padding: 8px; font-weight: bold; color: #374151;">Threshold:</td>
              <td style="padding: 8px; color: #1f2937;">${alert.threshold}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #374151;">Time:</td>
              <td style="padding: 8px; color: #1f2937;">${new Date(alert.timestamp).toLocaleString()}</td>
            </tr>
            <tr style="background: #ffffff;">
              <td style="padding: 8px; font-weight: bold; color: #374151;">Alert ID:</td>
              <td style="padding: 8px; color: #1f2937; font-family: monospace;">${alert.id}</td>
            </tr>
          </table>
        </div>
        
        <div style="padding: 20px; text-align: center; background: #ffffff; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            This is an automated alert from the Secure Gate Performance Monitoring System.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Get Slack color for alert severity
   */
  getSlackColor(severity) {
    const colors = {
      critical: 'danger',
      warning: 'warning',
      info: 'good'
    };
    return colors[severity] || 'good';
  }

  /**
   * Get alerting statistics
   */
  getStatistics() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    const lastHour = this.alertHistory.filter(a => a.timestamp > oneHourAgo);
    const lastDay = this.alertHistory.filter(a => a.timestamp > oneDayAgo);
    
    return {
      activeEscalations: this.activeEscalations.size,
      alertHistory: {
        total: this.alertHistory.length,
        lastHour: lastHour.length,
        lastDay: lastDay.length
      },
      rateLimiting: this.rateLimiting,
      channels: this.alertChannels,
      escalationConfig: this.escalationConfig
    };
  }
}

// Create singleton instance
const performanceAlertingService = new PerformanceAlertingService();

export default performanceAlertingService;
export { PerformanceAlertingService };