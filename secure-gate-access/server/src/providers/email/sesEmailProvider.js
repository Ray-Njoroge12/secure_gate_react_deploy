import nodemailer from 'nodemailer';
import notificationMetricsService from '../../services/notificationMetricsService.js';
import { EmailProvider } from '../notificationProviderInterfaces.js';

class SesEmailProvider extends EmailProvider {
  constructor() {
    super('ses');
    this.transporter = null;

    const smtpConfig = {
      host: process.env.SES_SMTP_HOST || process.env.SMTP_HOST,
      port: Number(process.env.SES_SMTP_PORT || process.env.SMTP_PORT || 587),
      secure: String(process.env.SES_SMTP_SECURE || '').toLowerCase() === 'true'
        || Number(process.env.SES_SMTP_PORT) === 465,
      auth: process.env.SES_SMTP_USER && process.env.SES_SMTP_PASS
        ? {
            user: process.env.SES_SMTP_USER,
            pass: process.env.SES_SMTP_PASS
          }
        : undefined
    };

    try {
      this.transporter = nodemailer.createTransport(smtpConfig);
    } catch (error) {
      console.error('Failed to initialize SES SMTP client:', error.message);
      notificationMetricsService.recordProviderInitFailure('ses', error.message);
    }
  }

  isConfigured() {
    return Boolean(this.transporter && (process.env.SES_SMTP_HOST || process.env.SMTP_HOST));
  }

  async send({ to, subject, html, text, from }) {
    if (!this.transporter) {
      return { success: false, error: 'ses_not_configured' };
    }

    const source = from || process.env.EMAIL_FROM || process.env.FROM_EMAIL;
    if (!source) {
      return { success: false, error: 'ses_missing_source' };
    }

    try {
      const response = await this.transporter.sendMail({
        from: source,
        to,
        subject,
        html,
        ...(text ? { text } : {})
      });
      return {
        success: true,
        messageId: response?.messageId,
        metadata: response
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  parseWebhook(payload) {
    if (!payload) {
      return null;
    }

    let snsMessage = payload;
    if (payload?.Message) {
      try {
        snsMessage = JSON.parse(payload.Message);
      } catch (error) {
        return null;
      }
    }
    if (!snsMessage) {
      return null;
    }

    const eventType = snsMessage.eventType || snsMessage.notificationType || snsMessage.event_type;
    const mail = snsMessage.mail || {};
    const messageId = mail.messageId || snsMessage.messageId;

    let status;
    switch (eventType) {
      case 'Delivery':
        status = 'delivered';
        break;
      case 'Bounce':
        status = 'bounced';
        break;
      case 'Complaint':
        status = 'failed';
        break;
      default:
        status = eventType ? eventType.toLowerCase() : 'unknown';
    }

    return {
      messageId,
      status,
      provider: this.getName(),
      metadata: snsMessage
    };
  }
}

export default SesEmailProvider;
