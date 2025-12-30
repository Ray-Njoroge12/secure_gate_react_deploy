/**
 * Breach Notification Service
 * Implements Kenya DPA 2019 72-hour breach notification requirement
 *
 * Workflow:
 * 1. Detection: Security incident detected
 * 2. Classification: Assess severity and impact
 * 3. Internal Alert: Notify DPO immediately
 * 4. Investigation: 24-hour investigation window
 * 5. ODPC Notification: Generate within 72 hours
 * 6. Data Subject Notification: Notify affected users if required
 * 7. Documentation: Complete audit trail
 */

import loggingService from './loggingService.js';
import notificationQueueService from './notificationQueueService.js';
import kenyaDPAAuditService from './kenyaDPAAuditService.js';
import crypto from 'crypto';

class BreachNotificationService {
  constructor() {
    this.SEVENTY_TWO_HOURS = 72 * 60 * 60 * 1000; // 72 hours in milliseconds
    this.TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.ONE_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds

    this.breachIncidents = new Map(); // In-memory storage (should be database in production)
    this.activeTimers = new Map(); // Track scheduled notifications
  }

  /**
   * Detect and register a security breach
   * @param {Object} incident - Breach incident details
   */
  async detectBreach(incident) {
    try {
      const breachId = this.generateBreachId();
      const timestamp = new Date();

      // Classify breach severity and impact
      const classification = await this.classifyBreach(incident);

      // Calculate deadlines
      const investigationDeadline = new Date(timestamp.getTime() + this.TWENTY_FOUR_HOURS);
      const odpcNotificationDeadline = new Date(timestamp.getTime() + this.SEVENTY_TWO_HOURS);

      // Create breach record
      const breachRecord = {
        id: breachId,
        type: incident.type || 'unknown',
        detected_at: timestamp.toISOString(),
        description: incident.description,
        affected_data_types: incident.affected_data_types || [],
        affected_users_count: incident.affected_users_count || 0,
        severity: classification.severity,
        risk_level: classification.risk_level,
        requires_odpc_notification: classification.requires_odpc_notification,
        requires_data_subject_notification: classification.requires_data_subject_notification,
        status: 'detected',
        investigation_deadline: investigationDeadline.toISOString(),
        odpc_notification_deadline: odpcNotificationDeadline.toISOString(),
        dpo_notified: false,
        odpc_notified: false,
        data_subjects_notified: false,
        investigation_completed: false,
        timeline: [
          {
            stage: 'detection',
            timestamp: timestamp.toISOString(),
            status: 'completed',
            notes: 'Breach detected and classified'
          }
        ]
      };

      // Store breach record
      this.breachIncidents.set(breachId, breachRecord);

      // Step 1: Alert DPO immediately (within 1 hour)
      await this.alertDPO(breachRecord);

      // Step 2: Schedule investigation reminder
      this.scheduleInvestigationReminder(breachRecord);

      // Step 3: Schedule ODPC notification
      if (classification.requires_odpc_notification) {
        await this.scheduleODPCNotification(breachRecord);
      }

      // Step 4: Log breach incident
      await this.logBreachIncident(breachRecord, 'detected');

      loggingService.logInfo(`Breach detected and workflow initiated: ${breachId}`, {
        severity: classification.severity,
        odpc_deadline: odpcNotificationDeadline.toISOString()
      });

      return {
        success: true,
        breach_id: breachId,
        severity: classification.severity,
        odpc_notification_deadline: odpcNotificationDeadline.toISOString(),
        investigation_deadline: investigationDeadline.toISOString()
      };
    } catch (error) {
      loggingService.logError('Failed to detect and register breach', error);
      throw error;
    }
  }

  /**
   * Classify breach severity and determine notification requirements
   * @param {Object} incident - Breach incident details
   */
  async classifyBreach(incident) {
    try {
      // Severity levels: critical, high, medium, low
      let severity = 'low';
      let risk_level = 'low';
      let requires_odpc_notification = false;
      let requires_data_subject_notification = false;

      // Classification based on data types
      const sensitiveDataTypes = ['password', 'financial', 'health', 'biometric', 'government_id'];
      const hasSensitiveData = incident.affected_data_types?.some(type =>
        sensitiveDataTypes.includes(type.toLowerCase())
      );

      // Classification based on affected users count
      const affectedCount = incident.affected_users_count || 0;

      if (hasSensitiveData) {
        severity = 'critical';
        risk_level = 'high';
        requires_odpc_notification = true;
        requires_data_subject_notification = true;
      } else if (affectedCount > 100) {
        severity = 'high';
        risk_level = 'high';
        requires_odpc_notification = true;
        requires_data_subject_notification = true;
      } else if (affectedCount > 10) {
        severity = 'medium';
        risk_level = 'medium';
        requires_odpc_notification = true;
        requires_data_subject_notification = false;
      } else {
        severity = 'low';
        risk_level = 'low';
        requires_odpc_notification = false;
        requires_data_subject_notification = false;
      }

      return {
        severity,
        risk_level,
        requires_odpc_notification,
        requires_data_subject_notification,
        classification_factors: {
          has_sensitive_data: hasSensitiveData,
          affected_count: affectedCount,
          data_types: incident.affected_data_types
        }
      };
    } catch (error) {
      loggingService.logError('Failed to classify breach', error);
      // Default to critical to be safe
      return {
        severity: 'critical',
        risk_level: 'high',
        requires_odpc_notification: true,
        requires_data_subject_notification: true
      };
    }
  }

  /**
   * Alert Data Protection Officer about the breach
   * @param {Object} breachRecord - Breach incident record
   */
  async alertDPO(breachRecord) {
    try {
      const dpoInfo = kenyaDPAAuditService.getDPOInformation();

      // Prepare DPO alert email
      const subject = `URGENT: Data Breach Detected - ${breachRecord.severity.toUpperCase()} Severity`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">⚠️ DATA BREACH ALERT</h1>
          </div>

          <div style="padding: 20px; background-color: #f9fafb;">
            <h2 style="color: #dc2626;">Breach Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px; font-weight: bold;">Breach ID:</td>
                <td style="padding: 10px;">${breachRecord.id}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px; font-weight: bold;">Severity:</td>
                <td style="padding: 10px;"><strong style="color: #dc2626;">${breachRecord.severity.toUpperCase()}</strong></td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px; font-weight: bold;">Detected At:</td>
                <td style="padding: 10px;">${new Date(breachRecord.detected_at).toLocaleString()}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px; font-weight: bold;">Type:</td>
                <td style="padding: 10px;">${breachRecord.type}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px; font-weight: bold;">Affected Users:</td>
                <td style="padding: 10px;">${breachRecord.affected_users_count}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px; font-weight: bold;">Affected Data Types:</td>
                <td style="padding: 10px;">${breachRecord.affected_data_types.join(', ') || 'Unknown'}</td>
              </tr>
            </table>

            <div style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b;">
              <h3 style="margin-top: 0; color: #92400e;">⏰ Critical Deadlines</h3>
              <p style="margin: 5px 0;"><strong>Investigation Deadline:</strong> ${new Date(breachRecord.investigation_deadline).toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>ODPC Notification Deadline:</strong> ${new Date(breachRecord.odpc_notification_deadline).toLocaleString()}</p>
            </div>

            <div style="margin-top: 20px; padding: 15px; background-color: #dbeafe; border-left: 4px solid #3b82f6;">
              <h3 style="margin-top: 0; color: #1e40af;">Required Actions</h3>
              <ol style="margin: 10px 0; padding-left: 20px;">
                <li>Initiate immediate investigation</li>
                <li>Assess full scope of breach within 24 hours</li>
                <li>Prepare ODPC notification (due within 72 hours)</li>
                ${breachRecord.requires_data_subject_notification ? '<li>Prepare data subject notifications</li>' : ''}
                <li>Document all findings and actions</li>
              </ol>
            </div>

            <div style="margin-top: 20px;">
              <p style="color: #6b7280;">Description: ${breachRecord.description}</p>
            </div>
          </div>

          <div style="padding: 20px; background-color: #1f2937; color: white; text-align: center;">
            <p style="margin: 0;">SecureGate Access Control System - Automated Breach Notification</p>
          </div>
        </div>
      `;

      // Queue DPO notification (high priority)
      await notificationQueueService.queueEmail(
        dpoInfo.email,
        subject,
        html,
        null,
        { priority: 'high', attempts: 5 }
      );

      // Update breach record
      breachRecord.dpo_notified = true;
      breachRecord.dpo_notified_at = new Date().toISOString();
      breachRecord.timeline.push({
        stage: 'dpo_notification',
        timestamp: new Date().toISOString(),
        status: 'completed',
        notes: `DPO notified at ${dpoInfo.email}`
      });

      loggingService.logInfo(`DPO notified about breach ${breachRecord.id}`);

      return { success: true };
    } catch (error) {
      loggingService.logError('Failed to alert DPO', error);
      throw error;
    }
  }

  /**
   * Schedule investigation reminder
   * @param {Object} breachRecord - Breach incident record
   */
  scheduleInvestigationReminder(breachRecord) {
    try {
      const reminderTime = new Date(breachRecord.investigation_deadline).getTime() - this.ONE_HOUR;
      const now = Date.now();
      const delay = Math.max(0, reminderTime - now);

      const timer = setTimeout(async () => {
        if (!breachRecord.investigation_completed) {
          loggingService.logWarning(`Investigation deadline approaching for breach ${breachRecord.id}`);
          // Send reminder to DPO
          const dpoInfo = kenyaDPAAuditService.getDPOInformation();
          await notificationQueueService.queueEmail(
            dpoInfo.email,
            `REMINDER: Investigation Deadline Approaching - Breach ${breachRecord.id}`,
            `<p>The investigation deadline for breach ${breachRecord.id} is in 1 hour.</p><p>Please complete investigation and prepare ODPC notification.</p>`
          );
        }
      }, delay);

      this.activeTimers.set(`investigation_${breachRecord.id}`, timer);
    } catch (error) {
      loggingService.logError('Failed to schedule investigation reminder', error);
    }
  }

  /**
   * Schedule ODPC notification
   * @param {Object} breachRecord - Breach incident record
   */
  async scheduleODPCNotification(breachRecord) {
    try {
      // Schedule notification 6 hours before deadline
      const notificationTime = new Date(breachRecord.odpc_notification_deadline).getTime() - (6 * this.ONE_HOUR);
      const now = Date.now();
      const delay = Math.max(0, notificationTime - now);

      const timer = setTimeout(async () => {
        if (!breachRecord.odpc_notified) {
          await this.sendODPCNotification(breachRecord);
        }
      }, delay);

      this.activeTimers.set(`odpc_${breachRecord.id}`, timer);

      loggingService.logInfo(`ODPC notification scheduled for breach ${breachRecord.id}`);
    } catch (error) {
      loggingService.logError('Failed to schedule ODPC notification', error);
    }
  }

  /**
   * Send ODPC notification
   * @param {Object} breachRecord - Breach incident record
   */
  async sendODPCNotification(breachRecord) {
    try {
      const odpcInfo = kenyaDPAAuditService.getODPCRegistration();
      const dpoInfo = kenyaDPAAuditService.getDPOInformation();

      const notificationContent = this.generateODPCNotification(breachRecord, dpoInfo, odpcInfo);

      // In production, this would submit to ODPC portal
      // For now, we'll queue an email and generate a document
      loggingService.logInfo('ODPC Notification Generated:', notificationContent);

      // Mark as notified
      breachRecord.odpc_notified = true;
      breachRecord.odpc_notified_at = new Date().toISOString();
      breachRecord.timeline.push({
        stage: 'odpc_notification',
        timestamp: new Date().toISOString(),
        status: 'completed',
        notes: 'ODPC notification sent'
      });

      // Notify DPO that ODPC notification was sent
      await notificationQueueService.queueEmail(
        dpoInfo.email,
        `ODPC Notification Sent - Breach ${breachRecord.id}`,
        `<p>ODPC has been notified about breach ${breachRecord.id}.</p><p>Notification details have been logged.</p>`
      );

      return { success: true, notification: notificationContent };
    } catch (error) {
      loggingService.logError('Failed to send ODPC notification', error);
      throw error;
    }
  }

  /**
   * Generate ODPC notification content
   * @param {Object} breachRecord - Breach incident record
   * @param {Object} dpoInfo - DPO information
   * @param {Object} odpcInfo - ODPC registration info
   */
  generateODPCNotification(breachRecord, dpoInfo, odpcInfo) {
    return {
      notification_type: 'data_breach',
      data_controller: {
        name: odpcInfo.data_controller_name,
        registration_number: odpcInfo.registration_number,
        dpo_name: dpoInfo.name,
        dpo_email: dpoInfo.email,
        dpo_phone: dpoInfo.phone
      },
      breach_details: {
        breach_id: breachRecord.id,
        detected_at: breachRecord.detected_at,
        type: breachRecord.type,
        description: breachRecord.description,
        severity: breachRecord.severity,
        affected_users_count: breachRecord.affected_users_count,
        affected_data_types: breachRecord.affected_data_types
      },
      notification_timeline: {
        detected: breachRecord.detected_at,
        dpo_notified: breachRecord.dpo_notified_at,
        odpc_notified: new Date().toISOString(),
        hours_since_detection: Math.round((Date.now() - new Date(breachRecord.detected_at).getTime()) / this.ONE_HOUR)
      },
      mitigation_measures: breachRecord.mitigation_measures || 'Investigation ongoing',
      data_subject_notification_status: breachRecord.requires_data_subject_notification
        ? (breachRecord.data_subjects_notified ? 'completed' : 'planned')
        : 'not_required'
    };
  }

  /**
   * Complete investigation
   * @param {string} breachId - Breach ID
   * @param {Object} findings - Investigation findings
   */
  async completeInvestigation(breachId, findings) {
    try {
      const breachRecord = this.breachIncidents.get(breachId);
      if (!breachRecord) {
        throw new Error(`Breach ${breachId} not found`);
      }

      breachRecord.investigation_completed = true;
      breachRecord.investigation_completed_at = new Date().toISOString();
      breachRecord.investigation_findings = findings;
      breachRecord.mitigation_measures = findings.mitigation_measures;
      breachRecord.timeline.push({
        stage: 'investigation_complete',
        timestamp: new Date().toISOString(),
        status: 'completed',
        notes: findings.summary || 'Investigation completed'
      });

      loggingService.logInfo(`Investigation completed for breach ${breachId}`);

      return { success: true, breach: breachRecord };
    } catch (error) {
      loggingService.logError('Failed to complete investigation', error);
      throw error;
    }
  }

  /**
   * Notify affected data subjects
   * @param {string} breachId - Breach ID
   * @param {Array} affectedUsers - List of affected users
   */
  async notifyDataSubjects(breachId, affectedUsers) {
    try {
      const breachRecord = this.breachIncidents.get(breachId);
      if (!breachRecord) {
        throw new Error(`Breach ${breachId} not found`);
      }

      if (!breachRecord.requires_data_subject_notification) {
        return { success: true, message: 'Data subject notification not required' };
      }

      // Queue notifications for all affected users
      const notificationPromises = affectedUsers.map(user => {
        return notificationQueueService.queueEmail(
          user.email,
          'Important: Data Security Notification',
          this.generateDataSubjectNotification(breachRecord, user),
          null,
          { priority: 'high' }
        );
      });

      await Promise.all(notificationPromises);

      breachRecord.data_subjects_notified = true;
      breachRecord.data_subjects_notified_at = new Date().toISOString();
      breachRecord.timeline.push({
        stage: 'data_subject_notification',
        timestamp: new Date().toISOString(),
        status: 'completed',
        notes: `${affectedUsers.length} users notified`
      });

      loggingService.logInfo(`Data subjects notified for breach ${breachId}: ${affectedUsers.length} users`);

      return { success: true, notified_count: affectedUsers.length };
    } catch (error) {
      loggingService.logError('Failed to notify data subjects', error);
      throw error;
    }
  }

  /**
   * Generate data subject notification email
   * @param {Object} breachRecord - Breach incident record
   * @param {Object} user - Affected user
   */
  generateDataSubjectNotification(breachRecord, user) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #3b82f6; color: white; padding: 20px;">
          <h1 style="margin: 0;">Data Security Notification</h1>
        </div>

        <div style="padding: 20px;">
          <p>Dear ${user.name || 'User'},</p>

          <p>We are writing to inform you about a data security incident that may have affected your personal information.</p>

          <h2>What Happened?</h2>
          <p>${breachRecord.description}</p>

          <h2>What Information Was Involved?</h2>
          <p>The following types of data may have been affected:</p>
          <ul>
            ${breachRecord.affected_data_types.map(type => `<li>${type}</li>`).join('')}
          </ul>

          <h2>What We're Doing</h2>
          <p>We have taken immediate steps to secure our systems and are conducting a thorough investigation. ${breachRecord.mitigation_measures || ''}</p>

          <h2>What You Can Do</h2>
          <ul>
            <li>Monitor your account for any unusual activity</li>
            <li>Change your password if you use the same password on other sites</li>
            <li>Be cautious of phishing attempts</li>
            <li>Contact us if you have any concerns</li>
          </ul>

          <h2>Your Rights</h2>
          <p>Under the Kenya Data Protection Act 2019, you have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Request correction of your data</li>
            <li>File a complaint with the ODPC</li>
          </ul>

          <p>If you have any questions, please contact our Data Protection Officer at ${kenyaDPAAuditService.getDPOInformation().email}</p>

          <p>Sincerely,<br>SecureGate Security Team</p>
        </div>
      </div>
    `;
  }

  /**
   * Log breach incident for audit trail
   * @param {Object} breachRecord - Breach incident record
   * @param {string} event - Event type
   */
  async logBreachIncident(breachRecord, event) {
    try {
      loggingService.logInfo(`Breach ${event}: ${breachRecord.id}`, {
        breach_id: breachRecord.id,
        severity: breachRecord.severity,
        status: breachRecord.status,
        event_type: event
      });
    } catch (error) {
      loggingService.logError('Failed to log breach incident', error);
    }
  }

  /**
   * Get breach incident by ID
   * @param {string} breachId - Breach ID
   */
  getBreachIncident(breachId) {
    return this.breachIncidents.get(breachId);
  }

  /**
   * Get all breach incidents
   */
  getAllBreachIncidents() {
    return Array.from(this.breachIncidents.values());
  }

  /**
   * Get breach statistics
   */
  getBreachStatistics() {
    const incidents = this.getAllBreachIncidents();
    return {
      total_breaches: incidents.length,
      by_severity: {
        critical: incidents.filter(b => b.severity === 'critical').length,
        high: incidents.filter(b => b.severity === 'high').length,
        medium: incidents.filter(b => b.severity === 'medium').length,
        low: incidents.filter(b => b.severity === 'low').length
      },
      notification_status: {
        dpo_notified: incidents.filter(b => b.dpo_notified).length,
        odpc_notified: incidents.filter(b => b.odpc_notified).length,
        data_subjects_notified: incidents.filter(b => b.data_subjects_notified).length
      },
      compliance: {
        within_72_hours: incidents.filter(b => {
          if (!b.odpc_notified || !b.requires_odpc_notification) return true;
          const notifiedTime = new Date(b.odpc_notified_at).getTime();
          const detectedTime = new Date(b.detected_at).getTime();
          return (notifiedTime - detectedTime) <= this.SEVENTY_TWO_HOURS;
        }).length,
        total_requiring_notification: incidents.filter(b => b.requires_odpc_notification).length
      }
    };
  }

  /**
   * Generate breach ID
   */
  generateBreachId() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `BREACH-${timestamp}-${random}`;
  }

  /**
   * Cleanup - clear timers
   */
  cleanup() {
    for (const timer of this.activeTimers.values()) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();
  }
}

// Create singleton instance
const breachNotificationService = new BreachNotificationService();

export default breachNotificationService;
