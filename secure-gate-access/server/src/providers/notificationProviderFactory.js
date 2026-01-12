import AfricasTalkingSmsProvider from './sms/africasTalkingSmsProvider.js';
import MailgunEmailProvider from './email/mailgunEmailProvider.js';
import SesEmailProvider from './email/sesEmailProvider.js';
import SmtpEmailProvider from './email/smtpEmailProvider.js';

let smsProviders = null;
let emailProviders = null;

function buildSmsProviders() {
  return {
    africastalking: new AfricasTalkingSmsProvider()
  };
}

function buildEmailProviders() {
  return {
    smtp: new SmtpEmailProvider(),
    mailgun: new MailgunEmailProvider(),
    ses: new SesEmailProvider()
  };
}

export function getSmsProvider(providerName = process.env.SMS_PROVIDER || 'africastalking') {
  if (!smsProviders) {
    smsProviders = buildSmsProviders();
  }

  const key = providerName?.toLowerCase() || 'africastalking';
  return smsProviders[key] || smsProviders.africastalking;
}

export function getEmailProvider(providerName = process.env.EMAIL_PROVIDER || 'smtp') {
  if (!emailProviders) {
    emailProviders = buildEmailProviders();
  }

  const key = providerName?.toLowerCase() || 'smtp';
  return emailProviders[key] || emailProviders.smtp;
}

export function resetNotificationProviders() {
  smsProviders = null;
  emailProviders = null;
}
