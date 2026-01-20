
import loggingService from './loggingService.js';
import RedisService from './redisService.js';
import { dbManager as db } from '../database/db.enhanced.js';
import { maskEmail, maskPhone } from '../utils/redaction.js';

const DELIVERY_FAILURE_STATUSES = new Set(['failed', 'bounced', 'undelivered']);
const DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000;
const METRICS_REDIS_KEY = 'notification:metrics:events';
const MAX_EVENTS = 2000;
const METRICS_DB_ENABLED = process.env.NOTIFICATION_METRICS_PERSIST !== 'false';
const INFO_ONLY_ERRORS = new Set([
  'external_notifications_disabled',
  'email_notifications_disabled',
  'sms_notifications_disabled'
]);
const WARNING_ONLY_ERRORS = new Set([
  'email_provider_not_configured',
  'sms_provider_not_configured',
  'whatsapp_not_configured'
]);

const shouldMaskAsEmail = (key) => key.includes('email');
const shouldMaskAsPhone = (key) => (
  key.includes('phone')
  || key.includes('msisdn')
  || key.includes('mobile')
);
const isRecipientKey = (key) => key === 'to' || key === 'recipient';
const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]';

const sanitizeMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object') {
    return metadata;
  }

  if (Array.isArray(metadata)) {
    return metadata.map(item => sanitizeMetadata(item));
  }

  if (!isPlainObject(metadata)) {
    return metadata;
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (Array.isArray(value)) {
      sanitized[key] = value.map(item => sanitizeMetadata(item));
      continue;
    }

    if (value && typeof value === 'object') {
      sanitized[key] = isPlainObject(value) ? sanitizeMetadata(value) : value;
      continue;
    }

    if (value == null) {
      sanitized[key] = value;
      continue;
    }

    const normalizedKey = String(key).toLowerCase();
    if (shouldMaskAsEmail(normalizedKey)) {
      sanitized[key] = typeof value === 'string' ? maskEmail(value) : value;
      continue;
    }

    if (shouldMaskAsPhone(normalizedKey)) {
      sanitized[key] = typeof value === 'string' ? maskPhone(value) : value;
      continue;
    }

    if (isRecipientKey(normalizedKey)) {
      if (typeof value === 'string' && value.includes('@')) {
        sanitized[key] = maskEmail(value);
      } else if (typeof value === 'string') {
        sanitized[key] = maskPhone(value);
      } else {
        sanitized[key] = value;
      }
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
};

class NotificationMetricsService {
  constructor() {
    this.events = [];
    this.retentionMs = DEFAULT_RETENTION_MS;
    this.redis = new RedisService();
    this.persistToDb = METRICS_DB_ENABLED;
    // Non-blocking initialization
    this.redis.initialize().catch(err =>
      console.warn('NotificationMetricsService Redis init failed:', err.message)
    );
  }

  async recordEvent(event) {
    // Keep in-memory for immediate access fallback
    this.events.push(event);
    this.pruneEvents();

    try {
      if (this.redis.isConnected && this.redis.client) {
        await this.redis.client.lPush(METRICS_REDIS_KEY, JSON.stringify(event));
        await this.redis.client.lTrim(METRICS_REDIS_KEY, 0, MAX_EVENTS - 1);
      }
    } catch (error) {
      console.warn('Failed to persist notification metric:', error.message);
    }

    if (this.persistToDb) {
      await this.persistEvent(event);
    }
  }

  async persistEvent(event) {
    try {
      await db.query(
        `INSERT INTO notification_metrics_events (event_type, event_timestamp, payload, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [event.type, event.timestamp, JSON.stringify(event)]
      );
    } catch (error) {
      console.warn('Failed to persist notification metric to DB:', error.message);
    }
  }

  pruneEvents() {
    const cutoff = Date.now() - this.retentionMs;
    if (this.events.length === 0) {
      return;
    }

    if (this.events[0].timestamp >= cutoff) {
      return;
    }

    this.events = this.events.filter(event => event.timestamp >= cutoff);
  }

  async recordNotificationResult({ channel, provider, success, error, metadata = {} }) {
    const sanitizedMetadata = sanitizeMetadata(metadata);
    await this.recordEvent({
      type: 'notification_result',
      timestamp: Date.now(),
      channel,
      provider,
      success,
      error,
      metadata: sanitizedMetadata
    });

    if (!success) {
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      const logMeta = {
        metric: 'notification_failure',
        channel,
        provider,
        error,
        metadata: sanitizedMetadata
      };

      if (INFO_ONLY_ERRORS.has(error)) {
        loggingService.logInfo('Notification delivery skipped', logMeta);
      } else if (WARNING_ONLY_ERRORS.has(error)) {
        loggingService.logWarning('Notification delivery skipped', logMeta);
      } else {
        loggingService.logError('Notification delivery failed', logMeta);
      }
    }
  }

  async recordProviderInitFailure(provider, error, metadata = {}) {
    const sanitizedMetadata = sanitizeMetadata(metadata);
    await this.recordEvent({
      type: 'provider_init_failure',
      timestamp: Date.now(),
      provider,
      error,
      metadata: sanitizedMetadata
    });

    loggingService.logWarning('Notification provider initialization failed', {
      metric: 'provider_init_failure',
      provider,
      error,
      metadata: sanitizedMetadata
    });
  }

  async recordWebhookSignatureFailure(provider, error, metadata = {}) {
    const sanitizedMetadata = sanitizeMetadata(metadata);
    await this.recordEvent({
      type: 'webhook_signature_failure',
      timestamp: Date.now(),
      provider,
      error,
      metadata: sanitizedMetadata
    });

    loggingService.logWarning('Webhook signature verification failed', {
      metric: 'webhook_signature_failure',
      provider,
      error,
      metadata: sanitizedMetadata
    });
  }

  async recordDeliveryEvent({ provider, status, messageId, metadata = {} }) {
    const sanitizedMetadata = sanitizeMetadata(metadata);
    await this.recordEvent({
      type: 'delivery_event',
      timestamp: Date.now(),
      provider,
      status,
      messageId,
      metadata: sanitizedMetadata
    });
  }

  async getWindowMetrics(windowMs) {
    let eventsToProcess = this.events;

    // Try to fetch from Redis if available
    if (this.redis.isConnected && this.redis.client) {
      try {
        const rawEvents = await this.redis.client.lRange(METRICS_REDIS_KEY, 0, -1);
        if (rawEvents && rawEvents.length > 0) {
          eventsToProcess = rawEvents.map(e => JSON.parse(e));
        }
      } catch (error) {
        console.warn('Failed to fetch metrics from Redis, using in-memory:', error.message);
      }
    } else if (this.persistToDb) {
      try {
        const cutoff = Date.now() - windowMs;
        const dbResult = await db.query(
          `SELECT payload FROM notification_metrics_events WHERE event_timestamp >= $1`,
          [cutoff]
        );
        if (dbResult.rows.length > 0) {
          eventsToProcess = dbResult.rows.map(row => (
            typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
          ));
        }
      } catch (error) {
        console.warn('Failed to fetch metrics from DB, using in-memory:', error.message);
      }
    }

    const cutoff = Date.now() - windowMs;
    const windowEvents = eventsToProcess.filter(event => event.timestamp >= cutoff);

    const metrics = {
      windowMs,
      notifications: {
        total: 0,
        failed: 0,
        success: 0,
        failureRate: 0,
        byChannel: {},
        byProvider: {}
      },
      providerInitFailures: {
        total: 0,
        byProvider: {}
      },
      webhookSignatureFailures: {
        total: 0,
        byProvider: {}
      },
      deliveries: {
        total: 0,
        failed: 0,
        failureRate: 0,
        byProvider: {}
      }
    };

    for (const event of windowEvents) {
      switch (event.type) {
        case 'notification_result':
          metrics.notifications.total += 1;
          if (event.success) {
            metrics.notifications.success += 1;
          } else {
            metrics.notifications.failed += 1;
          }

          this.incrementBucket(metrics.notifications.byChannel, event.channel, event.success);
          this.incrementBucket(metrics.notifications.byProvider, event.provider, event.success);
          break;
        case 'provider_init_failure':
          metrics.providerInitFailures.total += 1;
          this.incrementCount(metrics.providerInitFailures.byProvider, event.provider);
          break;
        case 'webhook_signature_failure':
          metrics.webhookSignatureFailures.total += 1;
          this.incrementCount(metrics.webhookSignatureFailures.byProvider, event.provider);
          break;
        case 'delivery_event':
          metrics.deliveries.total += 1;
          if (DELIVERY_FAILURE_STATUSES.has(event.status)) {
            metrics.deliveries.failed += 1;
          }
          this.incrementDeliveryBucket(metrics.deliveries.byProvider, event.provider, event.status);
          break;
        default:
          break;
      }
    }

    metrics.notifications.failureRate = metrics.notifications.total > 0
      ? metrics.notifications.failed / metrics.notifications.total
      : 0;
    metrics.deliveries.failureRate = metrics.deliveries.total > 0
      ? metrics.deliveries.failed / metrics.deliveries.total
      : 0;

    return metrics;
  }

  incrementCount(target, key) {
    if (!key) {
      return;
    }
    target[key] = (target[key] || 0) + 1;
  }

  incrementBucket(target, key, success) {
    if (!key) {
      return;
    }
    if (!target[key]) {
      target[key] = { total: 0, success: 0, failed: 0 };
    }
    target[key].total += 1;
    if (success) {
      target[key].success += 1;
    } else {
      target[key].failed += 1;
    }
  }

  incrementDeliveryBucket(target, key, status) {
    if (!key) {
      return;
    }
    if (!target[key]) {
      target[key] = { total: 0, failed: 0, delivered: 0, statuses: {} };
    }
    target[key].total += 1;
    if (DELIVERY_FAILURE_STATUSES.has(status)) {
      target[key].failed += 1;
    }
    if (status === 'delivered') {
      target[key].delivered += 1;
    }
    target[key].statuses[status] = (target[key].statuses[status] || 0) + 1;
  }
}

const notificationMetricsService = new NotificationMetricsService();

export default notificationMetricsService;
export { NotificationMetricsService };
