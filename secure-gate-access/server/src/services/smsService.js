import AfricasTalking from 'africastalking';

/**
 * SMS Service (Africa's Talking)
 */
class SMSService {
  constructor() {
    this.client = null;
    this.isConfigured = false;
    this.initialize();
  }

  initialize() {
    const username = process.env.AT_USERNAME;
    const apiKey = process.env.AT_API_KEY;
    if (!username || !apiKey) {
      this.isConfigured = false;
      return;
    }

    try {
      const africasTalking = AfricasTalking({ username, apiKey });
      this.client = africasTalking.SMS;
      this.isConfigured = true;
    } catch (error) {
      console.error('Failed to initialize Africa\'s Talking SMS client:', error.message);
      this.isConfigured = false;
    }
  }

  async sendOTP(phone, otp) {
    const message = `Your Secure Gate Access verification code is ${otp}.`;
    return this.send(phone, message);
  }

  async send(phone, message) {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'africas_talking_not_configured'
      };
    }

    const smsOptions = {
      to: [phone],
      message
    };

    if (process.env.AT_SENDER_ID && process.env.AT_SENDER_ID.trim() !== '') {
      smsOptions.from = process.env.AT_SENDER_ID;
    }

    try {
      const result = await this.client.send(smsOptions);
      const recipient = result?.SMSMessageData?.Recipients?.[0];
      if (!recipient || recipient.status !== 'Success') {
        return {
          success: false,
          error: recipient?.status || 'africas_talking_failed',
          response: result
        };
      }

      return {
        success: true,
        messageId: recipient.messageId,
        response: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new SMSService();
