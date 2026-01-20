// server/src/utils/tokenHelper.js
/**
 * Token Helper Utilities
 * Core utility providing event bus, metrics tracking, logging, and PII masking
 */

import EventEmitter from 'events';
import * as crypto from 'crypto';

// Event bus for visitor lifecycle events
class VisitorEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  emitVisitorEvent(eventType, data) {
    this.emit(eventType, {
      timestamp: new Date().toISOString(),
      ...data
    });
  }
}

export const visitorEventBus = new VisitorEventBus();

// Metrics tracking
class MetricsTracker {
  constructor() {
    this.counters = {
      otpSent: 0,
      otpVerified: 0,
      otpFailed: 0,
      checkIns: 0,
      checkOuts: 0,
      visitorInvites: 0,
      authFailures: 0,
      rateLimitExceeded: 0
    };
    this.gauges = {};
    this.histograms = {};
  }

  increment(name, value = 1, labels = {}) {
    if (!this.counters[name]) {
      this.counters[name] = 0;
    }
    this.counters[name] += value;
    return this.counters[name];
  }

  decrement(name, value = 1, labels = {}) {
    if (!this.counters[name]) {
      this.counters[name] = 0;
    }
    this.counters[name] -= value;
    return this.counters[name];
  }

  gauge(name, value, labels = {}) {
    this.gauges[name] = { value, labels, timestamp: Date.now() };
    return value;
  }

  histogram(name, value, labels = {}) {
    if (!this.histograms[name]) {
      this.histograms[name] = [];
    }
    this.histograms[name].push({ value, labels, timestamp: Date.now() });
    // Keep only last 1000 entries
    if (this.histograms[name].length > 1000) {
      this.histograms[name] = this.histograms[name].slice(-1000);
    }
    return value;
  }

  getMetrics() {
    return {
      counters: { ...this.counters },
      gauges: { ...this.gauges },
      histograms: Object.fromEntries(
        Object.entries(this.histograms).map(([k, v]) => [k, v.length])
      )
    };
  }

  reset() {
    Object.keys(this.counters).forEach(key => {
      this.counters[key] = 0;
    });
    this.gauges = {};
    this.histograms = {};
  }
}

export const metrics = new MetricsTracker();

// Logging helper
export const log = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta
  };

  if (process.env.NODE_ENV !== 'test') {
    switch (level) {
      case 'error':
        console.error(JSON.stringify(logEntry));
        break;
      case 'warn':
        console.warn(JSON.stringify(logEntry));
        break;
      case 'info':
        console.info(JSON.stringify(logEntry));
        break;
      case 'debug':
        if (process.env.DEBUG === 'true') {
          console.debug(JSON.stringify(logEntry));
        }
        break;
      default:
        console.log(JSON.stringify(logEntry));
    }
  }

  return logEntry;
};

// PII Masking utilities
export const maskPII = {
  email: (email) => {
    if (!email || typeof email !== 'string') return '***';
    const [local, domain] = email.split('@');
    if (!domain) return '***@***';
    const maskedLocal = local.length > 2 
      ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
      : '***';
    return `${maskedLocal}@${domain}`;
  },

  phone: (phone) => {
    if (!phone || typeof phone !== 'string') return '***';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 4) return '***';
    return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
  },

  name: (name) => {
    if (!name || typeof name !== 'string') return '***';
    if (name.length <= 2) return '***';
    return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
  },

  idNumber: (id) => {
    if (!id || typeof id !== 'string') return '***';
    if (id.length < 4) return '***';
    return '*'.repeat(id.length - 4) + id.slice(-4);
  }
};

// OTP helpers
// SECURITY FIX: Use crypto.randomInt() instead of Math.random() for cryptographic security
export const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, 10)];
  }
  return otp;
};

export const validateOTPFormat = (otp) => {
  return /^\d{4,8}$/.test(otp);
};

// Token generation helper
// SECURITY FIX: Use crypto.randomInt() instead of Math.random() for cryptographic security
export const generateSecureToken = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars[crypto.randomInt(0, chars.length)];
  }
  return token;
};

export default {
  visitorEventBus,
  metrics,
  log,
  maskPII,
  generateOTP,
  validateOTPFormat,
  generateSecureToken
};
