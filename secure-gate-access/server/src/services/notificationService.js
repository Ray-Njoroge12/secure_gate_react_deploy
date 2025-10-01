import nodemailer from 'nodemailer';
import Twilio from 'twilio';
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

let metrics = {};
try {
  const m = await import('../utils/metrics.js');
  metrics = m.metrics || {};
} catch {}

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
}

// Twilio Configuration
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch (error) {
    console.error('Failed to initialize Twilio client:', error.message);
  }
}

// Site configuration
const SITE_NAME = process.env.SITE_NAME || 'Secure Gate Access';
const SITE_URL = process.env.SITE_URL || 'http://localhost';

/**
 * Send visitor invitation email
 */
export async function sendVisitorInviteEmail(visitorData, residentData, inviteLink, qrCode = null) {
  if (!transporter || !process.env.SMTP_HOST) {
    console.warn('Email service not configured');
    return false;
  }

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

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: visitorData.email,
      subject: subject,
      html: html
    });

    metrics.notifications_email_sent = (metrics.notifications_email_sent || 0) + 1;
    console.log(`Visitor invitation email sent to ${visitorData.email}`);
    return true;
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
  if (!transporter || !process.env.SMTP_HOST) {
    console.warn('Email service not configured');
    return false;
  }

  try {
    const emailData = {
      siteName: SITE_NAME,
      visitorName: visitorData.name,
      otpCode: otpCode,
      expiryMinutes: expiryMinutes
    };

    const html = otpVerificationTemplate(emailData);
    const subject = `🔐 Verification Code - ${SITE_NAME}`;

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: visitorData.email,
      subject: subject,
      html: html
    });

    metrics.notifications_email_sent = (metrics.notifications_email_sent || 0) + 1;
    console.log(`OTP verification email sent to ${visitorData.email}`);
    return true;
  } catch (err) {
    metrics.notifications_email_failed = (metrics.notifications_email_failed || 0) + 1;
    console.error('sendOtpVerificationEmail failed:', err?.message || err);
    return false;
  }
}

/**
 * Send visitor invitation SMS
 */
export async function sendVisitorInviteSms(visitorData, residentData, inviteLink) {
  if (!twilioClient || !process.env.TWILIO_FROM) {
    console.warn('SMS service not configured');
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

    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_FROM,
      to: visitorData.phone
    });

    metrics.notifications_sms_sent = (metrics.notifications_sms_sent || 0) + 1;
    console.log(`Visitor invitation SMS sent to ${visitorData.phone}`);
    return true;
  } catch (err) {
    metrics.notifications_sms_failed = (metrics.notifications_sms_failed || 0) + 1;
    console.error('sendVisitorInviteSms failed:', err?.message || err);
    return false;
  }
}

/**
 * Send OTP verification SMS
 */
export async function sendOtpVerificationSms(visitorData, otpCode, expiryMinutes = 15) {
  if (!twilioClient || !process.env.TWILIO_FROM) {
    console.warn('SMS service not configured');
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

    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_FROM,
      to: visitorData.phone
    });

    metrics.notifications_sms_sent = (metrics.notifications_sms_sent || 0) + 1;
    console.log(`OTP verification SMS sent to ${visitorData.phone}`);
    return true;
  } catch (err) {
    metrics.notifications_sms_failed = (metrics.notifications_sms_failed || 0) + 1;
    console.error('sendOtpVerificationSms failed:', err?.message || err);
    return false;
  }
}

// Legacy functions for backward compatibility
export async function sendInviteEmail(to, subject, html) {
  if (!transporter || !process.env.SMTP_HOST) return false;
  try {
    await transporter.sendMail({ 
      from: process.env.FROM_EMAIL, 
      to, 
      subject, 
      html 
    });
    metrics.notifications_email_sent = (metrics.notifications_email_sent || 0) + 1;
    return true;
  } catch (err) {
    metrics.notifications_email_failed = (metrics.notifications_email_failed || 0) + 1;
    console.error('sendInviteEmail failed', err?.message || err);
    return false;
  }
}

export async function sendSms(to, text) {
  if (!twilioClient || !process.env.TWILIO_FROM) return false;
  try {
    await twilioClient.messages.create({ 
      body: text, 
      from: process.env.TWILIO_FROM, 
      to 
    });
    metrics.notifications_sms_sent = (metrics.notifications_sms_sent || 0) + 1;
    return true;
  } catch (err) {
    metrics.notifications_sms_failed = (metrics.notifications_sms_failed || 0) + 1;
    console.error('sendSms failed', err?.message || err);
    return false;
  }
}

export default { 
  sendInviteEmail, 
  sendSms,
  sendVisitorInviteEmail,
  sendOtpVerificationEmail,
  sendVisitorInviteSms,
  sendOtpVerificationSms
};