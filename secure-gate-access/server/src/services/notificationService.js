import nodemailer from 'nodemailer';
import Twilio from 'twilio';
import AfricasTalking from 'africastalking';
import Mailgun from 'mailgun.js';
import FormData from 'form-data';
import whatsappService from './whatsappService.js';
import notificationMetricsService from './notificationMetricsService.js';
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

// SMTP Configuration
const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || Number(process.env.SMTP_PORT) === 465,
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? { 
    user: process.env.SMTP_USER, 
    pass: process.env.SMTP_PASS 
  } : undefined,
};

let transporter = null;
try { 
  transporter = nodemailer.createTransport(smtpConfig); 
} catch (error) {
  console.error('Failed to create email transporter:', error.message);
  notificationMetricsService.recordProviderInitFailure('smtp', error.message, {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT
  });
}

// Twilio Configuration
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch (error) {
    console.error('Failed to initialize Twilio client:', error.message);
    notificationMetricsService.recordProviderInitFailure('twilio', error.message);
  }
}

// Africa's Talking Configuration
let atClient = null;
if (process.env.AT_USERNAME && process.env.AT_API_KEY) {
  try {
    const africasTalking = AfricasTalking({
      apiKey: process.env.AT_API_KEY,
      username: process.env.AT_USERNAME
    });
    atClient = africasTalking.SMS;
  } catch (error) {
    console.error('Failed to initialize Africa\'s Talking client:', error.message);
    notificationMetricsService.recordProviderInitFailure('africas_talking', error.message);
  }
}

// Mailgun Configuration
let mailgunClient = null;
if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
  try {
    const mailgun = new Mailgun(FormData);
    mailgunClient = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net'
    });
  } catch (error) {
    console.error('Failed to initialize Mailgun client:', error.message);
    notificationMetricsService.recordProviderInitFailure('mailgun', error.message);
  }
}

// Site configuration
const SITE_NAME = process.env.SITE_NAME || 'Secure Gate Access';
const SITE_URL = process.env.SITE_URL || 'http://localhost';

// Email provider selection
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'smtp'; // 'smtp' or 'mailgun'

/**
 * Send email using configured provider (SMTP or Mailgun API)
 */
async function sendEmail(to, subject, html, text = null) {
  // Feature flag checks
  if (process.env.ENABLE_EXTERNAL_NOTIFICATIONS !== 'true') {
    console.log('External notifications are disabled via ENABLE_EXTERNAL_NOTIFICATIONS flag');
    notificationMetricsService.recordNotificationResult({
      channel: 'email',
      provider: EMAIL_PROVIDER,
      success: false,
      error: 'external_notifications_disabled'
    });
    return false;
  }
  
  if (process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'true') {
    console.log('Email notifications are disabled via ENABLE_EMAIL_NOTIFICATIONS flag');
    notificationMetricsService.recordNotificationResult({
      channel: 'email',
      provider: EMAIL_PROVIDER,
      success: false,
      error: 'email_notifications_disabled'
    });
    return false;
  }

  if (EMAIL_PROVIDER === 'mailgun' && mailgunClient) {
    return await sendEmailViaMailgun(to, subject, html, text);
  } else if (transporter && process.env.SMTP_HOST) {
    return await sendEmailViaSMTP(to, subject, html);
  } else {
    console.warn('No email service configured');
    notificationMetricsService.recordNotificationResult({
      channel: 'email',
      provider: EMAIL_PROVIDER,
      success: false,
      error: 'email_provider_not_configured'
    });
    return false;
  }
}

/**
 * Send email via Mailgun API
 */
async function sendEmailViaMailgun(to, subject, html, text = null) {
  try {
    const data = await mailgunClient.messages.create(process.env.MAILGUN_DOMAIN, {
      from: process.env.EMAIL_FROM || `noreply@${process.env.MAILGUN_DOMAIN}`,
      to: [to],
      subject: subject,
      html: html,
      text: text || html.replace(/<[^>]*>/g, '') // Strip HTML tags for text version
    });
    
    console.log(`Email sent via Mailgun: ${data.id}`);
    notificationMetricsService.recordNotificationResult({
      channel: 'email',
      provider: 'mailgun',
      success: true,
      metadata: { messageId: data.id }
    });
    return true;
  } catch (error) {
    console.error('Mailgun email sending failed:', error.message);
    notificationMetricsService.recordNotificationResult({
      channel: 'email',
      provider: 'mailgun',
      success: false,
      error: error.message
    });
    return false;
  }
}

/**
 * Send email via SMTP (nodemailer)
 */
async function sendEmailViaSMTP(to, subject, html) {
  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.EMAIL_FROM,
      to: to,
      subject: subject,
      html: html
    });
    
    console.log(`Email sent via SMTP to ${to}`);
    notificationMetricsService.recordNotificationResult({
      channel: 'email',
      provider: 'smtp',
      success: true,
      metadata: { to }
    });
    return true;
  } catch (error) {
    console.error('SMTP email sending failed:', error.message);
    notificationMetricsService.recordNotificationResult({
      channel: 'email',
      provider: 'smtp',
      success: false,
      error: error.message
    });
    return false;
  }
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
      console.log(`Visitor invitation email sent to ${visitorData.email}`);
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
      console.log(`OTP verification email sent to ${visitorData.email}`);
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
 * Supports: twilio, africastalking, whatsapp
 */
export async function sendVisitorInviteSms(visitorData, residentData, inviteLink) {
  const smsProvider = process.env.SMS_PROVIDER || 'twilio';
  
  // Feature flag check
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
        console.log(`Visitor invitation sent via WhatsApp to ${visitorData.phone}`);
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
  
  // Africa's Talking provider
  if (smsProvider === 'africastalking') {
    if (!atClient) {
      console.warn('Africa\'s Talking SMS not configured');
      notificationMetricsService.recordNotificationResult({
        channel: 'sms',
        provider: 'africas_talking',
        success: false,
        error: 'africas_talking_not_configured'
      });
      return false;
    }
  }
  
  // Twilio provider
  if (smsProvider === 'twilio' && (!twilioClient || !process.env.TWILIO_FROM)) {
    console.warn('Twilio SMS not configured');
    notificationMetricsService.recordNotificationResult({
      channel: 'sms',
      provider: 'twilio',
      success: false,
      error: 'twilio_not_configured'
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

    if (smsProvider === 'africastalking') {
      // Africa's Talking implementation
      const smsOptions = {
        to: [visitorData.phone],
        message: message
      };
      
      // Only add 'from' if sender ID is configured
      if (process.env.AT_SENDER_ID && process.env.AT_SENDER_ID.trim() !== '') {
        smsOptions.from = process.env.AT_SENDER_ID;
      }
      
      const result = await atClient.send(smsOptions);
      
      if (result.SMSMessageData.Recipients[0].status !== 'Success') {
        throw new Error(result.SMSMessageData.Recipients[0].statusCode);
      }
    } else {
      // Twilio implementation (existing)
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_FROM,
        to: visitorData.phone
      });
    }

    metrics.notifications_sms_sent = (metrics.notifications_sms_sent || 0) + 1;
    console.log(`Visitor invitation SMS sent via ${smsProvider} to ${visitorData.phone}`);
    notificationMetricsService.recordNotificationResult({
      channel: 'sms',
      provider: smsProvider,
      success: true,
      metadata: { to: visitorData.phone }
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
 * Supports: twilio, africastalking, whatsapp
 */
export async function sendOtpVerificationSms(visitorData, otpCode, expiryMinutes = 15) {
  const smsProvider = process.env.SMS_PROVIDER || 'twilio';
  
  // Feature flag check
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
        console.log(`OTP verification sent via WhatsApp to ${visitorData.phone}`);
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
  
  // Africa's Talking provider
  if (smsProvider === 'africastalking' && !atClient) {
    console.warn('Africa\'s Talking SMS not configured');
    notificationMetricsService.recordNotificationResult({
      channel: 'sms',
      provider: 'africas_talking',
      success: false,
      error: 'africas_talking_not_configured'
    });
    return false;
  }
  
  // Twilio provider
  if (smsProvider === 'twilio' && (!twilioClient || !process.env.TWILIO_FROM)) {
    console.warn('Twilio SMS not configured');
    notificationMetricsService.recordNotificationResult({
      channel: 'sms',
      provider: 'twilio',
      success: false,
      error: 'twilio_not_configured'
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

    if (smsProvider === 'africastalking') {
      // Africa's Talking implementation
      const smsOptions = {
        to: [visitorData.phone],
        message: message
      };
      
      // Only add 'from' if sender ID is configured
      if (process.env.AT_SENDER_ID && process.env.AT_SENDER_ID.trim() !== '') {
        smsOptions.from = process.env.AT_SENDER_ID;
      }
      
      const result = await atClient.send(smsOptions);
      
      if (result.SMSMessageData.Recipients[0].status !== 'Success') {
        throw new Error(result.SMSMessageData.Recipients[0].statusCode);
      }
    } else {
      // Twilio implementation (existing)
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_FROM,
        to: visitorData.phone
      });
    }

    metrics.notifications_sms_sent = (metrics.notifications_sms_sent || 0) + 1;
    console.log(`OTP verification SMS sent via ${smsProvider} to ${visitorData.phone}`);
    notificationMetricsService.recordNotificationResult({
      channel: 'sms',
      provider: smsProvider,
      success: true,
      metadata: { to: visitorData.phone }
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
      console.log(`Delivery notification email sent to ${residentData.email}`);
    }
    notificationMetricsService.recordNotificationResult({
      channel: 'email',
      provider: EMAIL_PROVIDER,
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
      provider: EMAIL_PROVIDER,
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

  const smsProvider = process.env.SMS_PROVIDER || 'twilio'; // default to twilio for backward compatibility
  
  if (smsProvider === 'africastalking' && !atClient) {
    console.warn('Africa\'s Talking SMS not configured');
    notificationMetricsService.recordNotificationResult({
      channel: 'sms',
      provider: 'africas_talking',
      success: false,
      error: 'africas_talking_not_configured'
    });
    return false;
  }
  
  if (smsProvider === 'twilio' && (!twilioClient || !process.env.TWILIO_FROM)) {
    console.warn('Twilio SMS not configured');
    notificationMetricsService.recordNotificationResult({
      channel: 'sms',
      provider: 'twilio',
      success: false,
      error: 'twilio_not_configured'
    });
    return false;
  }

  try {
    if (smsProvider === 'africastalking') {
      // Africa's Talking implementation
      const smsOptions = {
        to: [to],
        message: text
      };
      
      // Only add 'from' if sender ID is configured
      if (process.env.AT_SENDER_ID && process.env.AT_SENDER_ID.trim() !== '') {
        smsOptions.from = process.env.AT_SENDER_ID;
      }
      
      const result = await atClient.send(smsOptions);
      
      if (result.SMSMessageData.Recipients[0].status !== 'Success') {
        throw new Error(result.SMSMessageData.Recipients[0].statusCode);
      }
    } else {
      // Twilio implementation (existing)
      await twilioClient.messages.create({ 
        body: text, 
        from: process.env.TWILIO_FROM, 
        to 
      });
    }
    
    metrics.notifications_sms_sent = (metrics.notifications_sms_sent || 0) + 1;
    console.log(`SMS sent via ${smsProvider} to ${to}`);
    notificationMetricsService.recordNotificationResult({
      channel: 'sms',
      provider: smsProvider,
      success: true,
      metadata: { to }
    });
    return true;
  } catch (err) {
    metrics.notifications_sms_failed = (metrics.notifications_sms_failed || 0) + 1;
    console.error('sendSms failed', err?.message || err);
    notificationMetricsService.recordNotificationResult({
      channel: 'sms',
      provider: smsProvider,
      success: false,
      error: err?.message || String(err)
    });
    return false;
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
