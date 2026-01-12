import Mailgun from 'mailgun.js';
import FormData from 'form-data';
import notificationMetricsService from '../../services/notificationMetricsService.js';
import { EmailProvider } from '../notificationProviderInterfaces.js';

class MailgunEmailProvider extends EmailProvider {
  constructor() {
    super('mailgun');
    this.client = null;
    this.domain = process.env.MAILGUN_DOMAIN;

    if (process.env.MAILGUN_API_KEY && this.domain) {
      try {
        const mailgun = new Mailgun(FormData);
        this.client = mailgun.client({
          username: 'api',
          key: process.env.MAILGUN_API_KEY,
          url: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net'
        });
      } catch (error) {
        console.error('Failed to initialize Mailgun client:', error.message);
        notificationMetricsService.recordProviderInitFailure('mailgun', error.message);
      }
    }
  }

  isConfigured() {
    return Boolean(this.client && this.domain);
  }

  async send({ to, subject, html, text, from }) {
    if (!this.client || !this.domain) {
      return { success: false, error: 'mailgun_not_configured' };
    }

    try {
      const response = await this.client.messages.create(this.domain, {
        from: from || process.env.EMAIL_FROM || `noreply@${this.domain}`,
        to: [to],
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '')
      });

      return {
        success: true,
        messageId: response?.id,
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

    const eventData = payload['event-data'] || payload;
    const event = eventData.event || eventData['event'] || eventData['event_type'];
    let status = event;

    if (event === 'delivered') {
      status = 'delivered';
    } else if (event === 'failed') {
      status = 'failed';
    } else if (event === 'bounced') {
      status = 'bounced';
    }

    return {
      messageId: eventData['message-id'] || eventData.id,
      status,
      provider: this.getName(),
      metadata: eventData,
      reason: eventData['delivery-status']?.message || eventData['delivery-status']?.description
    };
  }
}

export default MailgunEmailProvider;
