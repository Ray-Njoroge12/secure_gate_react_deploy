import nodemailer from 'nodemailer';
import notificationMetricsService from '../../services/notificationMetricsService.js';
import { EmailProvider } from '../notificationProviderInterfaces.js';

class SmtpEmailProvider extends EmailProvider {
  constructor() {
    super('smtp');
    this.transporter = null;

    const smtpConfig = {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true'
        || Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        : undefined
    };

    try {
      this.transporter = nodemailer.createTransport(smtpConfig);
    } catch (error) {
      console.error('Failed to create email transporter:', error.message);
      notificationMetricsService.recordProviderInitFailure('smtp', error.message, {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT
      });
    }
  }

  isConfigured() {
    return Boolean(this.transporter && process.env.SMTP_HOST);
  }

  async send({ to, subject, html, from }) {
    if (!this.transporter || !process.env.SMTP_HOST) {
      return { success: false, error: 'smtp_not_configured' };
    }

    try {
      const response = await this.transporter.sendMail({
        from: from || process.env.FROM_EMAIL || process.env.EMAIL_FROM,
        to,
        subject,
        html
      });

      return {
        success: true,
        messageId: response?.messageId,
        metadata: { to }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  parseWebhook() {
    return null;
  }
}

export default SmtpEmailProvider;
