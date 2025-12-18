/**
 * @file notificationController.js
 * @description Enhanced notification controller with template-based system
 * Phase V3: Visitor Notifications & Multi-Channel Communication
 * 
 * Features:
 * - Template-based notifications (database-driven)
 * - Multi-language support (EN/SW)
 * - Notification logging and tracking
 * - Preference management
 * - Queue-based async processing
 */

import { dbManager as db } from '../database/db.enhanced.js'; // Migrated from database-wrapper
import logger from '../config/logger.js';
import {
  sendInviteEmail,
  sendSms,
  sendVisitorInviteEmail,
  sendVisitorInviteSms
} from '../services/notificationService.js';

const dbManager = { query: (text, params) => db.query(text, params) };
// Alias for compatibility
const sendEmail = sendInviteEmail;
const sendSMS = sendSms;

/**
 * Send notification using template system
 * 
 * @param {Object} options - Notification options
 * @param {string} options.recipientType - 'visitor', 'resident', 'guard', 'admin'
 * @param {number} options.recipientId - Recipient ID
 * @param {string} options.channel - 'email' or 'sms'
 * @param {string} options.templateName - Template name from database
 * @param {Object} options.variables - Template variables to replace
 * @param {string} options.language - 'en' or 'sw'
 * @param {number} options.visitorId - Related visitor ID (optional)
 * @param {number} options.userId - Related user ID (optional)
 * 
 * @returns {Promise<Object>} Notification result with log ID
 */
export async function sendTemplatedNotification(options) {
  const {
    recipientType,
    recipientId,
    channel,
    templateName,
    variables = {},
    language = 'en',
    visitorId = null,
    userId = null
  } = options;

  const startTime = Date.now();

  try {
    // 1. Get recipient contact info
    const recipient = await getRecipientContactInfo(recipientType, recipientId);
    
    if (!recipient) {
      throw new Error(`Recipient not found: ${recipientType} ${recipientId}`);
    }

    // Validate channel availability
    if (channel === 'email' && !recipient.email) {
      throw new Error('Recipient has no email address');
    }
    if (channel === 'sms' && !recipient.phone) {
      throw new Error('Recipient has no phone number');
    }

    // 2. Check notification preferences
    const preferences = await getNotificationPreferences(recipientType, recipientId);
    
    if (!preferences.isEnabled(channel, templateName)) {
      logger.info('Notification skipped due to preferences', {
        recipientType,
        recipientId,
        channel,
        templateName
      });
      
      return {
        success: false,
        reason: 'preferences',
        message: 'Recipient has disabled this notification type'
      };
    }

    // Use recipient's preferred language
    const preferredLanguage = preferences.language || language;

    // 3. Load template from database
    const template = await loadTemplate(templateName, channel, preferredLanguage);
    
    if (!template) {
      throw new Error(`Template not found: ${templateName} (${channel}, ${preferredLanguage})`);
    }

    // 4. Render template with variables
    const rendered = renderTemplate(template, variables);

    // 5. Create notification log entry (pending)
    const logEntry = await createNotificationLog({
      recipientType,
      recipientId,
      recipientEmail: recipient.email,
      recipientPhone: recipient.phone,
      notificationType: templateName,
      channel,
      language: preferredLanguage,
      subject: rendered.subject,
      body: rendered.body,
      templateName,
      templateVariables: variables,
      visitorId,
      userId,
      status: 'pending'
    });

    // 6. Send notification via appropriate channel
    let sendResult;
    let providerInfo = {};

    try {
      if (channel === 'email') {
        sendResult = await sendEmailNotification(
          recipient.email,
          rendered.subject,
          rendered.htmlBody || rendered.body,
          rendered.body
        );
        providerInfo.provider = process.env.EMAIL_PROVIDER || 'smtp';
      } else if (channel === 'sms') {
        sendResult = await sendSMSNotification(
          recipient.phone,
          rendered.body
        );
        providerInfo.provider = process.env.SMS_PROVIDER || 'twilio';
      }

      // 7. Update notification log with result
      await updateNotificationLog(logEntry.id, {
        status: sendResult.success ? 'sent' : 'failed',
        sentAt: sendResult.success ? new Date() : null,
        failedAt: sendResult.success ? null : new Date(),
        errorMessage: sendResult.error || null,
        provider: providerInfo.provider,
        providerMessageId: sendResult.messageId || null,
        providerResponse: sendResult.response || null
      });

      logger.info('Notification sent successfully', {
        logId: logEntry.id,
        recipientType,
        channel,
        templateName,
        duration: Date.now() - startTime
      });

      return {
        success: true,
        logId: logEntry.id,
        channel,
        messageId: sendResult.messageId
      };

    } catch (sendError) {
      // Update log with failure
      await updateNotificationLog(logEntry.id, {
        status: 'failed',
        failedAt: new Date(),
        errorMessage: sendError.message
      });

      throw sendError;
    }

  } catch (error) {
    logger.error('Failed to send templated notification', {
      error: error.message,
      recipientType,
      templateName,
      channel,
      duration: Date.now() - startTime
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get recipient contact information
 */
async function getRecipientContactInfo(recipientType, recipientId) {
  try {
    let query;
    
    if (recipientType === 'visitor') {
      query = 'SELECT id, name, email, phone FROM visitors WHERE id = $1';
    } else if (['resident', 'guard', 'admin'].includes(recipientType)) {
      query = 'SELECT id, name, email, phone FROM users WHERE id = $1';
    } else {
      throw new Error(`Invalid recipient type: ${recipientType}`);
    }

    const result = await dbManager.query(query, [recipientId]);
    
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Failed to get recipient contact info', { error: error.message });
    return null;
  }
}

/**
 * Get notification preferences for recipient
 */
async function getNotificationPreferences(recipientType, recipientId) {
  try {
    const query = `
      SELECT * FROM notification_preferences
      WHERE ${recipientType === 'visitor' ? 'visitor_id' : 'user_id'} = $1
      LIMIT 1
    `;

    const result = await dbManager.query(query, [recipientId]);
    
    if (result.rows.length === 0) {
      // Return default preferences
      return {
        emailEnabled: true,
        smsEnabled: true,
        language: 'en',
        isEnabled: (channel, notificationType) => true // All enabled by default
      };
    }

    const prefs = result.rows[0];
    
    return {
      ...prefs,
      isEnabled: (channel, notificationType) => {
        // Check channel preference
        if (channel === 'email' && !prefs.email_enabled) return false;
        if (channel === 'sms' && !prefs.sms_enabled) return false;

        // Check notification type preference
        const typeMap = {
          'visitor_invite_created': 'notify_on_invite',
          'visit_approved': 'notify_on_approval',
          'visit_rejected': 'notify_on_rejection',
          'visitor_checked_in': 'notify_on_checkin',
          'visitor_checked_out': 'notify_on_checkout',
          'visit_reminder': 'notify_on_reminder'
        };

        const prefKey = typeMap[notificationType];
        if (prefKey && prefs[prefKey] === false) return false;

        return true;
      }
    };
  } catch (error) {
    logger.error('Failed to get notification preferences', { error: error.message });
    // Return default (all enabled)
    return {
      emailEnabled: true,
      smsEnabled: true,
      language: 'en',
      isEnabled: () => true
    };
  }
}

/**
 * Load template from database
 */
async function loadTemplate(templateName, templateType, language) {
  try {
    const query = `
      SELECT * FROM notification_templates
      WHERE template_name = $1
        AND template_type = $2
        AND language = $3
        AND is_active = true
      ORDER BY version DESC
      LIMIT 1
    `;

    const result = await dbManager.query(query, [templateName, templateType, language]);
    
    if (result.rows.length === 0) {
      // Fallback to English if requested language not found
      if (language !== 'en') {
        return await loadTemplate(templateName, templateType, 'en');
      }
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Failed to load template', { error: error.message });
    return null;
  }
}

/**
 * Render template by replacing variables
 */
function renderTemplate(template, variables) {
  let subject = template.subject || '';
  let body = template.body || '';
  let htmlBody = template.html_body || null;

  // Replace all {{variable}} placeholders
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    const stringValue = value !== null && value !== undefined ? String(value) : '';
    
    subject = subject.replace(new RegExp(placeholder, 'g'), stringValue);
    body = body.replace(new RegExp(placeholder, 'g'), stringValue);
    if (htmlBody) {
      htmlBody = htmlBody.replace(new RegExp(placeholder, 'g'), stringValue);
    }
  }

  return {
    subject,
    body,
    htmlBody
  };
}

/**
 * Create notification log entry
 */
async function createNotificationLog(data) {
  try {
    const query = `
      INSERT INTO notification_log (
        recipient_type, recipient_id, recipient_email, recipient_phone,
        notification_type, channel, language, subject, body,
        template_name, template_variables, visitor_id, user_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `;

    const values = [
      data.recipientType,
      data.recipientId,
      data.recipientEmail,
      data.recipientPhone,
      data.notificationType,
      data.channel,
      data.language,
      data.subject,
      data.body,
      data.templateName,
      JSON.stringify(data.templateVariables),
      data.visitorId,
      data.userId,
      data.status
    ];

    const result = await dbManager.query(query, values);
    
    return { id: result.rows[0].id };
  } catch (error) {
    logger.error('Failed to create notification log', { error: error.message });
    throw error;
  }
}

/**
 * Update notification log entry
 */
async function updateNotificationLog(logId, updates) {
  try {
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const columnName = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      setClauses.push(`${columnName} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    values.push(logId);

    const query = `
      UPDATE notification_log
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
    `;

    await dbManager.query(query, values);
  } catch (error) {
    logger.error('Failed to update notification log', { error: error.message });
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(to, subject, html, text) {
  // Reuse existing email service
  try {
    const result = await sendEmail(to, subject, html, text);
    
    return {
      success: result,
      messageId: null, // TODO: Extract from sendEmail response
      response: null
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send SMS notification
 */
async function sendSMSNotification(to, message) {
  // Reuse existing SMS service
  try {
    const result = await sendSMS(to, message);
    
    return {
      success: result,
      messageId: null, // TODO: Extract from sendSMS response
      response: null
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Queue notification for async processing
 */
export async function queueNotification(notificationData) {
  try {
    const query = `
      INSERT INTO notification_queue (
        notification_type, channel, recipient_type, recipient_id,
        payload, priority, scheduled_for
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;

    const values = [
      notificationData.notificationType,
      notificationData.channel,
      notificationData.recipientType,
      notificationData.recipientId,
      JSON.stringify(notificationData.payload),
      notificationData.priority || 5,
      notificationData.scheduledFor || new Date()
    ];

    const result = await dbManager.query(query, values);
    
    logger.info('Notification queued', { queueId: result.rows[0].id });
    
    return { queueId: result.rows[0].id };
  } catch (error) {
    logger.error('Failed to queue notification', { error: error.message });
    throw error;
  }
}

/**
 * Get notification logs for a recipient
 */
export async function getNotificationLogs(req, res) {
  try {
    const { recipientType, recipientId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const query = `
      SELECT 
        id, notification_type, channel, language, subject,
        status, sent_at, delivered_at, failed_at, error_message,
        created_at
      FROM notification_log
      WHERE recipient_type = $1 AND recipient_id = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await dbManager.query(query, [
      recipientType,
      recipientId,
      limit,
      offset
    ]);

    return res.status(200).json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    logger.error('Failed to get notification logs', { error: error.message });
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch notification logs'
    });
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(req, res) {
  try {
    const { userId, visitorId } = req.body;
    const preferences = req.body.preferences;

    // Validate that exactly one of userId or visitorId is provided
    if ((userId && visitorId) || (!userId && !visitorId)) {
      return res.status(400).json({
        success: false,
        error: 'Provide either userId or visitorId, not both'
      });
    }

    // Upsert preferences
    const query = `
      INSERT INTO notification_preferences (
        user_id, visitor_id, email_enabled, sms_enabled,
        notify_on_invite, notify_on_approval, notify_on_rejection,
        notify_on_checkin, notify_on_checkout, notify_on_reminder,
        language
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (user_id, visitor_id)
      DO UPDATE SET
        email_enabled = EXCLUDED.email_enabled,
        sms_enabled = EXCLUDED.sms_enabled,
        notify_on_invite = EXCLUDED.notify_on_invite,
        notify_on_approval = EXCLUDED.notify_on_approval,
        notify_on_rejection = EXCLUDED.notify_on_rejection,
        notify_on_checkin = EXCLUDED.notify_on_checkin,
        notify_on_checkout = EXCLUDED.notify_on_checkout,
        notify_on_reminder = EXCLUDED.notify_on_reminder,
        language = EXCLUDED.language,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      userId || null,
      visitorId || null,
      preferences.emailEnabled !== undefined ? preferences.emailEnabled : true,
      preferences.smsEnabled !== undefined ? preferences.smsEnabled : true,
      preferences.notifyOnInvite !== undefined ? preferences.notifyOnInvite : true,
      preferences.notifyOnApproval !== undefined ? preferences.notifyOnApproval : true,
      preferences.notifyOnRejection !== undefined ? preferences.notifyOnRejection : true,
      preferences.notifyOnCheckin !== undefined ? preferences.notifyOnCheckin : true,
      preferences.notifyOnCheckout !== undefined ? preferences.notifyOnCheckout : true,
      preferences.notifyOnReminder !== undefined ? preferences.notifyOnReminder : true,
      preferences.language || 'en'
    ];

    const result = await dbManager.query(query, values);

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to update notification preferences', { error: error.message });
    
    return res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
}

export default {
  sendTemplatedNotification,
  queueNotification,
  getNotificationLogs,
  updateNotificationPreferences
};
