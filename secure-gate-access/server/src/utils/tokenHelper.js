import nodemailer from 'nodemailer';
import { EventEmitter } from 'events';

// Shared in-process event bus for visitor lifecycle events
export const eventBus = new EventEmitter();

// Lightweight metrics
export const metrics = {
  otps_issued: 0,
  checkins: 0,
  checkouts: 0,
  revokes: 0,
  sse_clients: 0,
  // Phase 9: SSE emission accounting (per-event, not per-client)
  sse_emitted_total: 0,
  sse_by_severity: { info: 0, warning: 0, error: 0 },
  // Phase 7 extensions
  otps_failed: 0,
  otp_invalid_attempts: 0,
  otp_attempts_exceeded: 0,
  otp_resend_requests: 0,
  otp_resend_rate_limited: 0,
  checkin_denied: 0,
  self_checkin_denied: 0,
};

// Structured JSON logger (PII-safe if meta sanitized by callers)
export function log(level, message, meta = {}) {
  try {
    const payload = { level, message, ...meta, timestamp: new Date().toISOString() };
    // Do not stringify potentially large objects in meta unless necessary
    // Ensure no OTP values are included by callers
    console.log(JSON.stringify(payload));
  } catch {
    // fallback
    console.log(`[${level}] ${message}`);
  }
}

export async function sendEmailOtp(email, otp) {
  try {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.FROM_EMAIL || 'no-reply@secure-gate.local';
    if (!host || !user || !pass) {
      log('warn', 'SMTP not configured');
      return true; // dev/stub success
    }
    const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    const info = await transporter.sendMail({ from, to: email, subject: 'Your Secure Gate OTP', text: `Your OTP is ${otp}. It expires in 15 minutes.`, html: `<p>Your OTP is <b>${otp}</b>. It expires in 15 minutes.</p>` });
    return !!info?.messageId;
  } catch (e) {
    log('error', 'sendEmailOtp error', { error: e.message });
    return false;
  }
}

export async function sendSmsOtp(phone, otp) {
  try {
    if (!phone) return false;
    const provider = process.env.SMS_PROVIDER || '';
    if (provider.toLowerCase() === 'twilio') {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const auth = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_FROM_NUMBER;
      if (!sid || !auth || !from) {
        log('warn', 'Twilio env incomplete, SMS fallback');
      } else {
        const { default: twilio } = await import('twilio');
        const client = twilio(sid, auth);
        const msg = await client.messages.create({ body: `Your Secure Gate OTP is ${otp}`, from, to: phone });
        return !!msg?.sid;
      }
    }
    // Default: log-only for dev
    log('warn', 'SMS provider not configured');
    return true;
  } catch (e) {
    log('error', 'sendSmsOtp error', { error: e.message });
    return false;
  }
}

// PII masking helper
export function maskPII(value) {
  try {
    if (!value || typeof value !== 'string') return '';
    if (value.includes('@')) return `${value[0]}***${value.slice(-1)}`;
    const digits = value.replace(/\D+/g, '');
    if (digits.length >= 4) return `${digits.slice(0,2)}***${digits.slice(-2)}`;
    return '***';
  } catch { return '***'; }
}

// Generic email helper (reuses SMTP env), safe for arbitrary messages
export async function sendEmail(to, subject, text) {
  try {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.FROM_EMAIL || 'no-reply@secure-gate.local';
    if (!host || !user || !pass) {
      log('warn', 'SMTP not configured');
      return true;
    }
    const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    const info = await transporter.sendMail({ from, to, subject, text });
    return !!info?.messageId;
  } catch (e) {
    log('error', 'sendEmail error', { error: e.message });
    return false;
  }
}

// Generic SMS helper using Twilio if configured (falls back to log-only)
export async function sendSms(to, text) {
  try {
    if (!to) return false;
    const provider = (process.env.SMS_PROVIDER || '').toLowerCase();
    if (provider === 'twilio') {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const auth = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_FROM_NUMBER;
      if (sid && auth && from) {
        const { default: twilio } = await import('twilio');
        const client = twilio(sid, auth);
        const msg = await client.messages.create({ body: text, from, to });
        return !!msg?.sid;
      }
    }
    log('warn', 'SMS provider not configured');
    return true;
  } catch (e) {
    log('error', 'sendSms error', { error: e.message });
    return false;
  }
}

// Host notification strategy via env NOTIFY_STRATEGY=email|sms|none
export async function notifyHost(hostContact, event) {
  try {
    let strategy = (process.env.NOTIFY_STRATEGY || 'none').toLowerCase();
    if (!['email','sms','none'].includes(strategy)) {
      log('warn', 'Unknown NOTIFY_STRATEGY, defaulting to none', { strategy });
      strategy = 'none';
    }
    if (!hostContact) return true;
    const subject = `Visitor update: ${event?.event_type || 'event'}`;
    const text = `Event: ${event?.event_type}\nVisitor: ${event?.target?.id || ''}\nStatus: ${event?.metadata?.status || ''}\nTime: ${event?.timestamp}`;
    if (strategy === 'email') {
      return await sendEmail(hostContact, subject, text);
    }
    if (strategy === 'sms') {
      return await sendSms(hostContact, text);
    }
    return true;
  } catch (e) {
    log('error', 'notifyHost error', { error: e.message });
    return false;
  }
}

// Optional: notify admin for security/ops alerts
export async function notifyAdmin(text) {
  try {
    const email = process.env.ADMIN_EMAIL || '';
    const phone = process.env.ADMIN_PHONE || '';
    if (email) await sendEmail(email, 'Secure Gate Alert', text);
    else if (phone) await sendSms(phone, text);
    else log('warn', 'No ADMIN_EMAIL/ADMIN_PHONE configured for notifyAdmin');
  } catch (e) {
    log('error', 'notifyAdmin error', { error: e.message });
  }
}

// --- Phase 7 helpers: lightweight counters and alert gating ---
const lastAlerts = {
  otps_failed: 0,
  checkin_denied: 0,
  self_checkin_denied: 0,
  otp_resend_rate_limited: 0,
};

function threshold(envName, fallback) {
  const v = Number(process.env[envName] || fallback);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export async function maybeAlert(metricKey) {
  try {
    const thresholds = {
      otps_failed: threshold('OTP_FAIL_ALERT_THRESHOLD', 20),
      checkin_denied: threshold('CHECKIN_DENIED_ALERT_THRESHOLD', 20),
      self_checkin_denied: threshold('SELF_CHECKIN_DENIED_ALERT_THRESHOLD', 20),
      otp_resend_rate_limited: threshold('RESEND_RATELIMIT_ALERT_THRESHOLD', 20),
    };
    const current = metrics[metricKey] || 0;
    const last = lastAlerts[metricKey] || 0;
    if (current >= last + thresholds[metricKey]) {
      lastAlerts[metricKey] = current;
      if ((process.env.ALERTS_ENABLED || 'false') === 'true') {
        await notifyAdmin(`Alert: ${metricKey} reached ${current}`);
      }
    }
  } catch {}
}





