import loggingService from './loggingService.js';

const DELIVERY_FAILURE_STATUSES = new Set(['failed', 'bounced', 'undelivered']);
const DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000;

class NotificationMetricsService {
  constructor() {
    this.events = [];
    this.retentionMs = DEFAULT_RETENTION_MS;
  }

  recordEvent(event) {
    this.events.push(event);
    this.pruneEvents();
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

  recordNotificationResult({ channel, provider, success, error, metadata = {} }) {
    this.recordEvent({
      type: 'notification_result',
      timestamp: Date.now(),
      channel,
      provider,
      success,
      error,
      metadata
    });

    if (!success) {
      loggingService.logError('Notification delivery failed', {
        metric: 'notification_failure',
        channel,
        provider,
        error,
        metadata
      });
    }
  }

  recordProviderInitFailure(provider, error, metadata = {}) {
    this.recordEvent({
      type: 'provider_init_failure',
      timestamp: Date.now(),
      provider,
      error,
      metadata
    });

    loggingService.logWarning('Notification provider initialization failed', {
      metric: 'provider_init_failure',
      provider,
      error,
      metadata
    });
  }

  recordWebhookSignatureFailure(provider, error, metadata = {}) {
    this.recordEvent({
      type: 'webhook_signature_failure',
      timestamp: Date.now(),
      provider,
      error,
      metadata
    });

    loggingService.logWarning('Webhook signature verification failed', {
      metric: 'webhook_signature_failure',
      provider,
      error,
      metadata
    });
  }

  recordDeliveryEvent({ provider, status, messageId, metadata = {} }) {
    this.recordEvent({
      type: 'delivery_event',
      timestamp: Date.now(),
      provider,
      status,
      messageId,
      metadata
    });
  }

  getWindowMetrics(windowMs) {
    const cutoff = Date.now() - windowMs;
    const windowEvents = this.events.filter(event => event.timestamp >= cutoff);

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
