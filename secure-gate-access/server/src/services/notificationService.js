import whatsappService from './whatsappService.js';
import notificationMetricsService from './notificationMetricsService.js';
import { getEmailProvider, getSmsProvider } from '../providers/notificationProviderFactory.js';
import loggingService from './loggingService.js';
import {
  visitorInviteTemplate,
  bulkInviteTemplate,
  otpVerificationTemplate
} from '../templates/email-templates.js';
import {
  visitorInviteSmsTemplate,
  bulkInviteSmsTemplate,
  otpVerificationSmsTemplate,
  qrCodeReadySmsTemplate,
  checkinReminderSmsTemplate
} from '../templates/sms-templates.js';

// Simple in-memory metrics counter (no external dependencies)
const metrics = {};

// Site configuration
const SITE_NAME = process.env.SITE_NAME || 'Secure Gate Access';
const SITE_URL = process.env.SITE_URL || 'http://localhost';
const REDACTED_VALUE = 'redacted';

const maskEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return REDACTED_VALUE;
  }
  const [localPart, domain] = email.split('@');
  if (!domain) {
    return REDACTED_VALUE;
  }
  const firstChar = localPart ? localPart[0] : '';
  return `${firstChar || REDACTED_VALUE}***@${domain}`;
};

const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return REDACTED_VALUE;
  }
  const tail = phone.slice(-4);
  return `***${tail || ''}`;
};

// Email provider selection
/**
 * Send email using configured provider (SMTP or Mailgun API)
 */
async function sendEmail(to, subject, html, text = null) {
  const provider = getEmailProvider();
  const providerName = provider?.getName?.() || process.env.EMAIL_PROVIDER || 'smtp';
  // Feature flag checks
  if (process.env.ENABLE_EXTERNAL_NOTIFICATIONS !== 'true') {
    if (process.env.NODE_ENV !== 'test') {
      console.log('External notifications are disabled via ENABLE_EXTERNAL_NOTIFICATIONS flag');
    }
    notificationMetricsService.recordNotificationResult({
      channel: 'email',
      provider: providerName,
      success: false,
      error: 'external_notifications_disabled'
    });
    return false;
  }

  if (process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'true') {
    if (process.env.NODE_ENV !== 'test') {
      console.log('Email notifications are disabled via ENABLE_EMAIL_NOTIFICATIONS flag');
    }
    notificationMetricsService.recordNotificationResult({
      channel: 'email',
      provider: providerName,
      success: false,
      error: 'email_notifications_disabled'
    });
    return false;
  }

  if (!provider?.isConfigured?.()) {
    console.warn('No email service configured');
    notificationMetricsService.recordNotificationResult({
      channel: 'email',
      provider: providerName,
      success: false,
      error: 'email_provider_not_configured'
    });
    return false;
  }

  const result = await provider.send({ to, subject, html, text });

  if (result.success) {
    loggingService.logInfo('Email sent via provider', {
      provider: providerName,
      recipient: maskEmail(to),
      messageId: result.messageId
    });
    notificationMetricsService.recordNotificationResult({
      channel: 'email',
      provider: providerName,
      success: true,
      metadata: { messageId: result.messageId, to }
    });
    return result;
  }

  console.error(`${providerName} email sending failed:`, result.error);
  notificationMetricsService.recordNotificationResult({
    channel: 'email',
    provider: providerName,
    success: false,
    error: result.error
  });
  return result;
}

/**
 * Send visitor invitation email
 */
export async function sendVisitorInviteEmail(visitorData, residentData, inviteLink, qrCode = null) {
  try {
    const emailData = {
      siteName: SITE_NAME,
      visitorName: visitorData.name,
      residentName: residentData.name || residentData.email,
      residentEmail: residentData.email,
      visitDate: new Date(visitorData.dateOfVisit).toLocaleDateString(),
      visitTime: visitorData.time,
      purpose: visitorData.purpose,
      inviteCode: visitorData.inviteCode,
      inviteLink: inviteLink,
      qrCode: qrCode,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
    };

    const html = visitorInviteTemplate(emailData);
    const subject = `🏠 Visitor Invitation - ${SITE_NAME}`;

    const result = await sendEmail(visitorData.email, subject, html);

    if (result) {
      metrics.notifications_email_sent = (metrics.notifications_email_sent || 0) + 1;
      loggingService.logInfo('Visitor invitation email sent', {
        visitorId: visitorData.id || null,
        residentId: residentData.id || null
      });
    } else {
      metrics.notifications_email_failed = (metrics.notifications_email_failed || 0) + 1;
    }

    return result;
  } catch (err) {
    metrics.notifications_email_failed = (metrics.notifications_email_failed || 0) + 1;
    console.error('sendVisitorInviteEmail failed:', err?.message || err);
    return false;
  }
}

/**
 * Send OTP verification email
 */
export async function sendOtpVerificationEmail(visitorData, otpCode, expiryMinutes = 15) {
  try {
    const emailData = {
      siteName: SITE_NAME,
      visitorName: visitorData.name,
      otpCode: otpCode,
      expiryMinutes: expiryMinutes
    };

    const html = otpVerificationTemplate(emailData);
    const subject = `🔐 Verification Code - ${SITE_NAME}`;

    const result = await sendEmail(visitorData.email, subject, html);

    if (result) {
      metrics.notifications_email_sent = (metrics.notifications_email_sent || 0) + 1;
      loggingService.logInfo('OTP verification email sent', {
        visitorId: visitorData.id || null
      });
    } else {
      metrics.notifications_email_failed = (metrics.notifications_email_failed || 0) + 1;
    }

    return result;
  } catch (err) {
    metrics.notifications_email_failed = (metrics.notifications_email_failed || 0) + 1;
    console.error('sendOtpVerificationEmail failed:', err?.message || err);
    return false;
  }
}

/**
 * Send visitor invitation SMS/WhatsApp
 * Supports: africastalking, whatsapp
 */
export async function sendVisitorInviteSms(visitorData, residentData, inviteLink) {
  const smsProvider = process.env.SMS_PROVIDER || 'africastalking';
  const smsProviderClient = getSmsProvider(smsProvider);

  // Feature flag check
  if (process.env.ENABLE_SMS_NOTIFICATIONS !== 'true') {
    if (process.env.NODE_ENV !== 'test') {
      console.log('SMS notifications are disabled via ENABLE_SMS_NOTIFICATIONS flag');
    }
    notificationMetricsService.recordNotificationResult({
      channel: 'sms',
      provider: smsProvider,
      success: false,
      error: 'sms_notifications_disabled'
    });
    return false;
  }

  // WhatsApp provider (recommended)
  if (smsProvider === 'whatsapp') {
    if (!whatsappService.isConfigured()) {
      console.warn('WhatsApp service not configured');
      notificationMetricsService.recordNotificationResult({
        channel: 'whatsapp',
        provider: 'whatsapp',
        success: false,
        error: 'whatsapp_not_configured'
      });
      return false;
    }

    try {
      const result = await whatsappService.sendVisitorInvitation(visitorData, residentData, inviteLink);
      if (result.success) {
        metrics.notifications_whatsapp_sent = (metrics.notifications_whatsapp_sent || 0) + 1;
        loggingService.logInfo('Visitor invitation sent via WhatsApp', {
          visitorId: visitorData.id || null,
          recipient: maskPhone(visitorData.phone),
          messageId: result.messageId
        });
        notificationMetricsService.recordNotificationResult({
          channel: 'whatsapp',
          provider: 'whatsapp',
          success: true,
          metadata: { messageId: result.messageId }
        });
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      metrics.notifications_whatsapp_failed = (metrics.notifications_whatsapp_failed || 0) + 1;
      console.error('WhatsApp send failed:', err?.message || err);
      notificationMetricsService.recordNotificationResult({
        channel: 'whatsapp',
        provider: 'whatsapp',
        success: false,
        error: err?.message || String(err)
      });
      return false;
    }
  }

  if (!smsProviderClient?.isConfigured?.()) {
    console.warn('SMS provider not configured');
    notificationMetricsService.recordNotificationResult({
      channel: 'sms',
      provider: smsProviderClient?.getName?.() || smsProvider,
      success: false,
      error: 'sms_provider_not_configured'
    });
    return false;
  }

  try {
    const smsData = {
      siteName: SITE_NAME,
      visitorName: visitorData.name,
      residentName: residentData.name || residentData.email,
      visitDate: new Date(visitorData.dateOfVisit).toLocaleDateString(),
      visitTime: visitorData.time,
      purpose: visitorData.purpose,
      inviteCode: visitorData.inviteCode,
      inviteLink: inviteLink,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
    };

    const message = visitorInviteSmsTemplate(smsData);

    const result = await smsProviderClient.send({
      to: visitorData.phone,
      message,
      from: process.env.AT_SENDER_ID
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    metrics.notifications_sms_sent = (metrics.notifications_sms_sent || 0) + 1;
    loggingService.logInfo('Visitor invitation SMS sent', {
      provider: smsProvider,
      visitorId: visitorData.id || null,
      recipient: maskPhone(visitorData.phone),
      messageId: result.messageId
    });
    notificationMetricsService.recordNotificationResult({
      channel: 'sms',
      provider: smsProvider,
      success: true,
      metadata: { to: visitorData.phone, messageId: result.messageId }
    });
    return true;
  } catch (err) {
    metrics.notifications_sms_failed = (metrics.notifications_sms_failed || 0) + 1;
    console.error('sendVisitorInviteSms failed:', err?.message || err);
    notificationMetricsService.recordNotificationResult({
      channel: 'sms',
      provider: smsProvider,
      success: false,
      error: err?.message || String(err)
    });
    return false;
  }
}

/**
 * Send OTP verification SMS/WhatsApp
 * Supports: africastalking, whatsapp
 */
export async function sendOtpVerificationSms(visitorData, otpCode, expiryMinutes = 15) {
  const smsProvider = process.env.SMS_PROVIDER || 'africastalking';
  const smsProviderClient = getSmsProvider(smsProvider);

  // Feature flag check
  if (process.env.ENABLE_SMS_NOTIFICATIONS !== 'true' && process.env.NODE_ENV !== 'development') {
    console.log('SMS notifications are disabled via ENABLE_SMS_NOTIFICATIONS flag');
    notificationMetricsService.recordNotificationResult({
      channel: 'sms',
      provider: smsProvider,
      success: false,
      error: 'sms_notifications_disabled'
    });
    return false;
  } else if (process.env.ENABLE_SMS_NOTIFICATIONS !== 'true' && process.env.NODE_ENV === 'development') {
    console.log('Development mode: Allowing SMS simulation despite disabled flag');
  }

  // WhatsApp provider (recommended)
  if (smsProvider === 'whatsapp') {
    if (!whatsappService.isConfigured()) {
      console.warn('WhatsApp service not configured');
      notificationMetricsService.recordNotificationResult({
        channel: 'whatsapp',
        provider: 'whatsapp',
        success: false,
        error: 'whatsapp_not_configured'
      });
      return false;
    }

    try {
      const result = await whatsappService.sendOtpVerification(visitorData, otpCode, expiryMinutes);
      if (result.success) {
        metrics.notifications_whatsapp_sent = (metrics.notifications_whatsapp_sent || 0) + 1;
        loggingService.logInfo('OTP verification sent via WhatsApp', {
          visitorId: visitorData.id || null,
          recipient: maskPhone(visitorData.phone),
          messageId: result.messageId
        });
        notificationMetricsService.recordNotificationResult({
          channel: 'whatsapp',
          provider: 'whatsapp',
          success: true,
          metadata: { messageId: result.messageId }
        });
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      metrics.notifications_whatsapp_failed = (metrics.notifications_whatsapp_failed || 0) + 1;
      console.error('WhatsApp OTP send failed:', err?.message || err);
      notificationMetricsService.recordNotificationResult({
        channel: 'whatsapp',
        provider: 'whatsapp',
        success: false,
        error: err?.message || String(err)
      });
      return false;
    }
  }

  if (!smsProviderClient?.isConfigured?.()) {
    console.warn('SMS provider not configured');
    notificationMetricsService.recordNotificationResult({
      channel: 'sms',
      provider: smsProviderClient?.getName?.() || smsProvider,
      success: false,
      error: 'sms_provider_not_configured'
    });
    return false;
  }

  try {
    const smsData = {
      siteName: SITE_NAME,
      visitorName: visitorData.name,
      otpCode: otpCode,
      expiryMinutes: expiryMinutes
    };

    const message = otpVerificationSmsTemplate(smsData);

    const result = await smsProviderClient.send({
      to: visitorData.phone,
      message,
      from: process.env.AT_SENDER_ID
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    metrics.notifications_sms_sent = (metrics.notifications_sms_sent || 0) + 1;
    loggingService.logInfo('OTP verification SMS sent', {
      provider: smsProvider,
      visitorId: visitorData.id || null,
      recipient: maskPhone(visitorData.phone),
      messageId: result.messageId
    });
    notificationMetricsService.recordNotificationResult({
      channel: 'sms',
      provider: smsProvider,
      success: true,
      metadata: { to: visitorData.phone, messageId: result.messageId }
    });
    return true;
  } catch (err) {
    metrics.notifications_sms_failed = (metrics.notifications_sms_failed || 0) + 1;
    console.error('sendOtpVerificationSms failed:', err?.message || err);
    notificationMetricsService.recordNotificationResult({
      channel: 'sms',
      provider: smsProvider,
      success: false,
      error: err?.message || String(err)
    });
    return false;
  }
}

/**
 * Send delivery registration notification to resident
 */
export async function sendDeliveryNotification(residentData, deliveryData) {
  try {
    const subject = `📦 New Delivery - ${SITE_NAME}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>📦 New Delivery Received</h2>
        <p>Hello ${residentData.name || 'Resident'},</p>
        <p>A package has been registered for you at the gate.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Carrier:</strong> ${deliveryData.carrierName}</p>
          <p><strong>Size:</strong> ${deliveryData.packageSize}</p>
          ${deliveryData.packageDescription ? `<p><strong>Description:</strong> ${deliveryData.packageDescription}</p>` : ''}
          <p><strong>Received:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p><strong>Action Required:</strong> Please log in to choose how you'd like to receive your package:</p>
        <ul>
          <li>🚶 <strong>Pickup at Gate</strong> - Collect it yourself</li>
          <li>🏠 <strong>Deliver to Residence</strong> - Have a guard bring it to you</li>
        </ul>
        <p style="margin-top: 20px;">
          <a href="${SITE_URL}/resident/deliveries" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View My Deliveries</a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message from ${SITE_NAME}.</p>
      </div>
    `;

    const result = await sendEmail(residentData.email, subject, html);

    if (result) {
      metrics.notifications_email_sent = (metrics.notifications_email_sent || 0) + 1;
      loggingService.logInfo('Delivery notification email sent', {
        residentId: residentData.id || null
      });
    }
    notificationMetricsService.recordNotificationResult({
      channel: 'email',
      provider: process.env.EMAIL_PROVIDER || 'smtp',
      success: Boolean(result),
      error: result ? null : 'delivery_notification_failed',
      metadata: { to: residentData.email }
    });

    return result;
  } catch (err) {
    metrics.notifications_email_failed = (metrics.notifications_email_failed || 0) + 1;
    console.error('sendDeliveryNotification failed:', err?.message || err);
    notificationMetricsService.recordNotificationResult({
      channel: 'email',
      provider: process.env.EMAIL_PROVIDER || 'smtp',
      success: false,
      error: err?.message || String(err)
    });
    return false;
  }
}

/**
 * Send handoff decision notification (in-app / WebSocket for guards)
 * This is a lightweight notification since guards are typically on-duty
 */
export async function sendHandoffDecisionNotification(deliveryData, preference) {
  try {
    const preferenceLabel = preference === 'pickup_at_gate' ? 'Pickup at Gate' : 'Deliver to Residence';
    console.log(`[Notification] Handoff decision for delivery #${deliveryData.id}: ${preferenceLabel}`);
    // In production, this would emit a WebSocket event to guard dashboards
    // For now, we log it and return success
    return { success: true, preference: preferenceLabel };
  } catch (err) {
    console.error('sendHandoffDecisionNotification failed:', err?.message || err);
    return { success: false, error: err?.message };
  }
}

// Legacy functions for backward compatibility
export async function sendInviteEmail(to, subject, html) {
  try {
    const result = await sendEmail(to, subject, html);

    if (result) {
      metrics.notifications_email_sent = (metrics.notifications_email_sent || 0) + 1;
    } else {
      metrics.notifications_email_failed = (metrics.notifications_email_failed || 0) + 1;
    }

    return result;
  } catch (err) {
    metrics.notifications_email_failed = (metrics.notifications_email_failed || 0) + 1;
    console.error('sendInviteEmail failed', err?.message || err);
    return false;
  }
}

export async function sendSms(to, text) {
  const smsProvider = process.env.SMS_PROVIDER || 'africastalking';
  const smsProviderClient = getSmsProvider(smsProvider);

  // Feature flag checks
  if (process.env.ENABLE_EXTERNAL_NOTIFICATIONS !== 'true') {
    console.log('External notifications are disabled via ENABLE_EXTERNAL_NOTIFICATIONS flag');
    notificationMetricsService.recordNotificationResult({
      channel: 'sms',
      provider: smsProvider,
      success: false,
      error: 'external_notifications_disabled'
    });
    return false;
  }

  if (process.env.ENABLE_SMS_NOTIFICATIONS !== 'true') {
    console.log('SMS notifications are disabled via ENABLE_SMS_NOTIFICATIONS flag');
    notificationMetricsService.recordNotificationResult({
      channel: 'sms',
      provider: smsProvider,
      success: false,
      error: 'sms_notifications_disabled'
    });
    return false;
  }

  if (!smsProviderClient?.isConfigured?.()) {
    console.warn('SMS provider not configured');
    notificationMetricsService.recordNotificationResult({
      channel: 'sms',
      provider: smsProviderClient?.getName?.() || smsProvider,
      success: false,
      error: 'sms_provider_not_configured'
    });
    return false;
  }

  try {
    const result = await smsProviderClient.send({
      to,
      message: text,
      from: process.env.AT_SENDER_ID
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    metrics.notifications_sms_sent = (metrics.notifications_sms_sent || 0) + 1;
    loggingService.logInfo('SMS sent via provider', {
      provider: smsProvider,
      recipient: maskPhone(to),
      messageId: result.messageId
    });
    notificationMetricsService.recordNotificationResult({
      channel: 'sms',
      provider: smsProvider,
      success: true,
      metadata: { to, messageId: result.messageId }
    });
    return result;
  } catch (err) {
    metrics.notifications_sms_failed = (metrics.notifications_sms_failed || 0) + 1;
    console.error('sendSms failed', err?.message || err);
    notificationMetricsService.recordNotificationResult({
      channel: 'sms',
      provider: smsProvider,
      success: false,
      error: err?.message || String(err)
    });
    return { success: false, error: err?.message || String(err) };
  }
}

export default {
  sendInviteEmail,
  sendSms,
  sendVisitorInviteEmail,
  sendOtpVerificationEmail,
  sendVisitorInviteSms,
  sendOtpVerificationSms,
  sendDeliveryNotification,
  sendHandoffDecisionNotification
};
