import nodemailer from 'nodemailer';
import Twilio from 'twilio';

let metrics = {};
try {
  const m = await import('../utils/metrics.js');
  metrics = m.metrics || {};
} catch {}

const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || Number(process.env.SMTP_PORT) === 465,
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
};

let transporter = null;
try { transporter = nodemailer.createTransport(smtpConfig); } catch {}

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export async function sendInviteEmail(to, subject, html) {
  if (!transporter || !process.env.SMTP_HOST) return false;
  try {
    await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.FROM_EMAIL, to, subject, html });
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
    await twilioClient.messages.create({ body: text, from: process.env.TWILIO_FROM, to });
    metrics.notifications_sms_sent = (metrics.notifications_sms_sent || 0) + 1;
    return true;
  } catch (err) {
    metrics.notifications_sms_failed = (metrics.notifications_sms_failed || 0) + 1;
    console.error('sendSms failed', err?.message || err);
    return false;
  }
}

export default { sendInviteEmail, sendSms };
