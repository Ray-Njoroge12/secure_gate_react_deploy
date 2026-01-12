export class SmsProvider {
  constructor(name) {
    this.name = name;
  }

  getName() {
    return this.name;
  }

  isConfigured() {
    return true;
  }

  async send() {
    throw new Error('SmsProvider.send must be implemented');
  }

  parseDeliveryCallback() {
    throw new Error('SmsProvider.parseDeliveryCallback must be implemented');
  }
}

export class EmailProvider {
  constructor(name) {
    this.name = name;
  }

  getName() {
    return this.name;
  }

  isConfigured() {
    return true;
  }

  async send() {
    throw new Error('EmailProvider.send must be implemented');
  }

  parseWebhook() {
    throw new Error('EmailProvider.parseWebhook must be implemented');
  }
}
