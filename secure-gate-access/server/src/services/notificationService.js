import whatsappService from './whatsappService.js';
import messagingGateway from './messagingGateway.js';
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
/**
 * Send email using configured provider (Unified via MessagingGateway)
 */
async function sendEmail(to, subject, html, text = null) {
  const result = await messagingGateway.send(
    { email: to },
    'GENERIC_EMAIL',
    { subject, html, text },
    { channels: ['email'] }
  );
  return result.success;
}

/**
 * Send visitor invitation email (Unified via MessagingGateway)
 */
export async function sendVisitorInviteEmail(visitorData, residentData, inviteLink, qrCode = null) {
  const result = await messagingGateway.send(
    { email: visitorData.email, name: visitorData.name },
    'VISITOR_INVITE',
    { resident: residentData, inviteLink, qrCode, visitDate: visitorData.dateOfVisit, visitTime: visitorData.time, purpose: visitorData.purpose, inviteCode: visitorData.inviteCode },
    { channels: ['email'] }
  );
  return result.success;
}

/**
 * Send OTP verification email (Unified via MessagingGateway)
 */
export async function sendOtpVerificationEmail(visitorData, otpCode, expiryMinutes = 15) {
  const result = await messagingGateway.send(
    { email: visitorData.email, name: visitorData.name },
    'OTP_VERIFICATION',
    { otpCode, expiryMinutes },
    { channels: ['email'] }
  );
  return result.success;
}

/**
 * Send visitor invitation SMS/WhatsApp
 * Supports: africastalking, whatsapp
 */
/**
 * Send visitor invitation SMS/WhatsApp (Unified via MessagingGateway)
 */
export async function sendVisitorInviteSms(visitorData, residentData, inviteLink) {
  // Feature flag check
  if (process.env.ENABLE_SMS_NOTIFICATIONS !== 'true' && process.env.ENABLE_WHATSAPP_NOTIFICATIONS !== 'true') {
    return false;
  }

  const result = await messagingGateway.send(
    { phone: visitorData.phone, name: visitorData.name },
    'VISITOR_INVITE',
    { resident: residentData, inviteLink },
    { channels: ['whatsapp', 'sms'] }
  );

  return result.success;
}

/**
 * Send OTP verification SMS/WhatsApp
 * Supports: africastalking, whatsapp
 */
/**
 * Send OTP verification SMS/WhatsApp (Unified via MessagingGateway)
 */
export async function sendOtpVerificationSms(visitorData, otpCode, expiryMinutes = 15) {
  // Feature flag check
  if (process.env.ENABLE_SMS_NOTIFICATIONS !== 'true' && process.env.ENABLE_WHATSAPP_NOTIFICATIONS !== 'true') {
    return false;
  }

  const result = await messagingGateway.send(
    { phone: visitorData.phone, name: visitorData.name },
    'OTP_VERIFICATION',
    { otpCode, expiryMinutes },
    { channels: ['whatsapp', 'sms'] }
  );

  return result.success;
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

// Legacy functions for backward compatibility (Now use MessagingGateway)
export async function sendInviteEmail(to, subject, html) {
  const result = await messagingGateway.send(
    { email: to },
    'GENERIC_EMAIL',
    { subject, html },
    { channels: ['email'] }
  );
  return result.success;
}

export async function sendSms(to, text) {
  const result = await messagingGateway.send(
    { phone: to },
    'GENERIC_SMS',
    { message: text },
    { channels: ['sms'] }
  );
  return result.success;
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
