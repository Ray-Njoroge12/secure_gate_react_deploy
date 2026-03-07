import AfricasTalking from 'africastalking';
import localMessageStore from './localMessageStore.js';

const isTestEnvironment = (process.env.NODE_ENV || '').toLowerCase() === 'test';

const shouldWarnAboutMissingAfricasTalkingCredentials = () => {
  const configuredProvider = (process.env.SMS_PROVIDER || '').trim().toLowerCase();

  return configuredProvider === 'africastalking'
    || Boolean(process.env.AT_USERNAME)
    || Boolean(process.env.AT_API_KEY);
};

/**
 * SMS Service (Africa's Talking + Local Simulation)
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

    // Check if explicitly using local provider
    if (process.env.SMS_PROVIDER === 'local') {
      if (!isTestEnvironment) {
        console.log('📱 SMS Service initialized in LOCAL SIMULATION mode');
      }
      this.isConfigured = false;
      return;
    }

    if (!username || !apiKey) {
      if (!isTestEnvironment && shouldWarnAboutMissingAfricasTalkingCredentials()) {
        console.log('ℹ️  Africa\'s Talking credentials missing - defaulting to LOCAL SIMULATION mode');
      }
      this.isConfigured = false;
      return;
    }

    try {
      const africasTalking = AfricasTalking({ username, apiKey });
      this.client = africasTalking.SMS;
      this.isConfigured = true;
      console.log('✅ SMS Service initialized with Africa\'s Talking');
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
    // Local Simulation Mode
    if (!this.isConfigured || process.env.NODE_ENV === 'development') {
      try {
        await localMessageStore.save('sms', phone, message, { provider: 'local' });
        console.log(`[SMS SIMULATION] To: ${phone} | Message: ${message}`);

        return {
          success: true,
          messageId: `sim_${Date.now()}`,
          simulation: true,
          message: 'Message captured locally'
        };
      } catch (error) {
        console.error('Failed to save local SMS:', error);
        // Fallback to simpler logging if store fails
        return { success: true, simulation: true };
      }
    }

    // Production Mode (Africa's Talking)
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
