import Twilio from 'twilio';
import AfricasTalking from 'africastalking';
import Mailgun from 'mailgun.js';
import FormData from 'form-data';
import whatsappService from './whatsappService.js';

async function checkMailgunHealth() {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  if (!apiKey || !domain) {
    return {
      provider: 'mailgun',
      healthy: false,
      reason: 'missing_credentials'
    };
  }

  try {
    const mailgun = new Mailgun(FormData);
    const client = mailgun.client({
      username: 'api',
      key: apiKey,
      url: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net'
    });
    await client.domains.get(domain);
    return {
      provider: 'mailgun',
      healthy: true,
      domain
    };
  } catch (error) {
    return {
      provider: 'mailgun',
      healthy: false,
      reason: 'api_error',
      error: error.message
    };
  }
}

async function checkAfricasTalkingHealth() {
  const apiKey = process.env.AT_API_KEY || process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AT_USERNAME || process.env.AFRICASTALKING_USERNAME;
  if (!apiKey || !username) {
    return {
      provider: 'africas_talking',
      healthy: false,
      reason: 'missing_credentials'
    };
  }

  try {
    const africasTalking = AfricasTalking({ apiKey, username });
    const application = africasTalking.APPLICATION;
    await application.fetchApplicationData();
    return {
      provider: 'africas_talking',
      healthy: true,
      username
    };
  } catch (error) {
    return {
      provider: 'africas_talking',
      healthy: false,
      reason: 'api_error',
      error: error.message
    };
  }
}

async function checkTwilioHealth() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    return {
      provider: 'twilio',
      healthy: false,
      reason: 'missing_credentials'
    };
  }

  try {
    const client = Twilio(accountSid, authToken);
    await client.api.accounts(accountSid).fetch();
    return {
      provider: 'twilio',
      healthy: true,
      accountSid: `***${accountSid.slice(-4)}`
    };
  } catch (error) {
    return {
      provider: 'twilio',
      healthy: false,
      reason: 'api_error',
      error: error.message
    };
  }
}

async function checkWhatsAppHealth() {
  if (!whatsappService.isConfigured()) {
    return {
      provider: 'whatsapp',
      healthy: false,
      reason: 'missing_credentials'
    };
  }

  try {
    const profile = await whatsappService.getBusinessProfile();
    if (!profile.success) {
      return {
        provider: 'whatsapp',
        healthy: false,
        reason: 'api_error',
        error: profile.error
      };
    }
    return {
      provider: 'whatsapp',
      healthy: true,
      businessProfile: profile.profile
    };
  } catch (error) {
    return {
      provider: 'whatsapp',
      healthy: false,
      reason: 'api_error',
      error: error.message
    };
  }
}

export async function getIntegrationHealth() {
  const checks = await Promise.all([
    checkTwilioHealth(),
    checkAfricasTalkingHealth(),
    checkMailgunHealth(),
    checkWhatsAppHealth()
  ]);

  const unhealthy = checks.filter(check => !check.healthy);

  return {
    status: unhealthy.length === 0 ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks
  };
}
