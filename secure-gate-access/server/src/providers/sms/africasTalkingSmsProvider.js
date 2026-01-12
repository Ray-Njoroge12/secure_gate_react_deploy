import AfricasTalking from 'africastalking';
import notificationMetricsService from '../../services/notificationMetricsService.js';
import { SmsProvider } from '../notificationProviderInterfaces.js';

class AfricasTalkingSmsProvider extends SmsProvider {
  constructor() {
    super('africas_talking');
    this.client = null;

    if (process.env.AT_USERNAME && process.env.AT_API_KEY) {
      try {
        const africasTalking = AfricasTalking({
          apiKey: process.env.AT_API_KEY,
          username: process.env.AT_USERNAME
        });
        this.client = africasTalking.SMS;
      } catch (error) {
        console.error("Failed to initialize Africa's Talking client:", error.message);
        notificationMetricsService.recordProviderInitFailure('africas_talking', error.message);
      }
    }
  }

  isConfigured() {
    return Boolean(this.client);
  }

  async send({ to, message, from }) {
    if (!this.client) {
      return { success: false, error: 'africas_talking_not_configured' };
    }

    const smsOptions = {
      to: [to],
      message
    };

    if (from && from.trim() !== '') {
      smsOptions.from = from;
    }

    try {
      const result = await this.client.send(smsOptions);
      const recipient = result?.SMSMessageData?.Recipients?.[0];
      if (recipient?.status && recipient.status !== 'Success') {
        throw new Error(recipient.statusCode || recipient.status);
      }

      return {
        success: true,
        messageId: recipient?.messageId || null,
        metadata: recipient || result
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  parseDeliveryCallback(payload) {
    if (!payload) {
      return null;
    }

    const {
      id,
      status,
      phoneNumber,
      failureReason,
      retryCount,
      networkCode
    } = payload;

    let deliveryStatus;
    switch (status) {
      case 'Success':
        deliveryStatus = 'delivered';
        break;
      case 'Failed':
        deliveryStatus = 'failed';
        break;
      case 'Sent':
        deliveryStatus = 'sent';
        break;
      default:
        deliveryStatus = status ? status.toLowerCase() : 'unknown';
    }

    return {
      messageId: id,
      status: deliveryStatus,
      provider: this.getName(),
      metadata: {
        phoneNumber,
        failureReason,
        retryCount,
        networkCode,
        rawStatus: status
      }
    };
  }
}

export default AfricasTalkingSmsProvider;
