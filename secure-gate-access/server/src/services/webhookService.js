/**
 * Webhook Service
 * Handles reliable webhook delivery with retry logic and comprehensive failure handling
 */

import axios from 'axios';
import crypto from 'crypto';
import { EventEmitter } from 'events';

class WebhookService extends EventEmitter {
  constructor() {
    super();
    this.webhooks = new Map();
    this.deliveryQueue = [];
    this.deliveryHistory = [];
    this.retryQueue = [];
    this.isProcessing = false;
    
    // Configuration
    this.config = {
      maxRetries: 5,
      retryDelays: [1000, 2000, 5000, 10000, 30000], // Progressive delays
      timeout: 30000, // 30 seconds
      maxConcurrent: 10,
      historyLimit: 1000
    };

    // Start processing queues
    this.startProcessing();
  }

  /**
   * Register a webhook endpoint
   */
  registerWebhook(config) {
    const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const webhook = {
      id: webhookId,
      url: config.url,
      events: config.events || ['*'], // Events to listen for
      secret: config.secret || this.generateSecret(),
      active: config.active !== false,
      
      // Delivery settings
      retryPolicy: {
        maxRetries: config.maxRetries || this.config.maxRetries,
        retryDelays: config.retryDelays || this.config.retryDelays
      },
      
      // Security settings
      verifySSL: config.verifySSL !== false,
      headers: config.headers || {},
      
      // Metadata
      name: config.name || `Webhook ${webhookId}`,
      description: config.description || '',
      createdAt: new Date().toISOString(),
      createdBy: config.createdBy,
      
      // Statistics
      stats: {
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        lastDelivery: null,
        lastSuccess: null,
        lastFailure: null
      }
    };

    this.webhooks.set(webhookId, webhook);
    
    this.emit('webhook_registered', { webhookId, webhook });
    
    return webhook;
  }

  /**
   * Send webhook event
   */
  async sendWebhook(eventType, payload, options = {}) {
    const event = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      payload,
      timestamp: new Date().toISOString(),
      source: options.source || 'secure-gate-api',
      version: options.version || '1.0'
    };

    // Find matching webhooks
    const matchingWebhooks = this.getMatchingWebhooks(eventType);
    
    if (matchingWebhooks.length === 0) {
      return { event, deliveries: [] };
    }

    // Queue deliveries
    const deliveries = [];
    for (const webhook of matchingWebhooks) {
      const delivery = await this.queueDelivery(webhook, event, options);
      deliveries.push(delivery);
    }

    return { event, deliveries };
  }

  /**
   * Queue webhook delivery
   */
  async queueDelivery(webhook, event, options = {}) {
    const delivery = {
      id: `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      webhookId: webhook.id,
      eventId: event.id,
      event,
      webhook: {
        id: webhook.id,
        url: webhook.url,
        secret: webhook.secret
      },
      
      // Delivery tracking
      status: 'queued',
      attempts: 0,
      maxAttempts: webhook.retryPolicy.maxRetries + 1,
      queuedAt: new Date().toISOString(),
      
      // Options
      priority: options.priority || 'normal',
      delay: options.delay || 0
    };

    this.deliveryQueue.push(delivery);
    
    // Sort queue by priority and timestamp
    this.deliveryQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return new Date(a.queuedAt) - new Date(b.queuedAt);
    });

    this.emit('delivery_queued', delivery);
    
    return delivery;
  }

  /**
   * Process delivery queues
   */
  startProcessing() {
    setInterval(() => {
      if (!this.isProcessing) {
        this.processDeliveryQueue();
      }
    }, 1000);

    // Process retry queue less frequently
    setInterval(() => {
      this.processRetryQueue();
    }, 5000);
  }

  /**
   * Process main delivery queue
   */
  async processDeliveryQueue() {
    if (this.isProcessing || this.deliveryQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const concurrentDeliveries = this.deliveryQueue
        .splice(0, this.config.maxConcurrent)
        .filter(delivery => {
          // Check if delivery should be delayed
          if (delivery.delay > 0) {
            const shouldDelay = Date.now() < (new Date(delivery.queuedAt).getTime() + delivery.delay);
            if (shouldDelay) {
              this.deliveryQueue.push(delivery); // Re-queue
              return false;
            }
          }
          return true;
        });

      if (concurrentDeliveries.length > 0) {
        await Promise.allSettled(
          concurrentDeliveries.map(delivery => this.executeDelivery(delivery))
        );
      }

    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process retry queue
   */
  async processRetryQueue() {
    const now = Date.now();
    const readyRetries = this.retryQueue.filter(retry => retry.retryAt <= now);
    
    if (readyRetries.length === 0) {
      return;
    }

    // Remove processed retries from queue
    this.retryQueue = this.retryQueue.filter(retry => retry.retryAt > now);

    // Add back to main delivery queue
    readyRetries.forEach(retry => {
      this.deliveryQueue.push(retry.delivery);
    });
  }

  /**
   * Execute webhook delivery
   */
  async executeDelivery(delivery) {
    const webhook = this.webhooks.get(delivery.webhookId);
    if (!webhook || !webhook.active) {
      delivery.status = 'cancelled';
      delivery.error = 'Webhook not found or inactive';
      this.recordDelivery(delivery);
      return delivery;
    }

    delivery.status = 'delivering';
    delivery.attempts++;
    delivery.attemptedAt = new Date().toISOString();

    try {
      // Prepare payload
      const payload = {
        id: delivery.eventId,
        type: delivery.event.type,
        data: delivery.event.payload,
        timestamp: delivery.event.timestamp,
        delivery_id: delivery.id
      };

      // Generate signature
      const signature = this.generateSignature(payload, webhook.secret);

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'SecureGate-Webhooks/1.0',
        'X-Webhook-Signature': signature,
        'X-Webhook-Delivery': delivery.id,
        'X-Webhook-Event': delivery.event.type,
        ...webhook.headers
      };

      // Make HTTP request
      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: this.config.timeout,
        validateStatus: (status) => status >= 200 && status < 300,
        httpsAgent: webhook.verifySSL ? undefined : new (require('https').Agent)({
          rejectUnauthorized: false
        })
      });

      // Success
      delivery.status = 'delivered';
      delivery.deliveredAt = new Date().toISOString();
      delivery.responseStatus = response.status;
      delivery.responseHeaders = response.headers;

      // Update webhook stats
      webhook.stats.totalDeliveries++;
      webhook.stats.successfulDeliveries++;
      webhook.stats.lastDelivery = delivery.deliveredAt;
      webhook.stats.lastSuccess = delivery.deliveredAt;

      this.emit('delivery_success', delivery);

    } catch (error) {
      // Failure
      delivery.status = 'failed';
      delivery.failedAt = new Date().toISOString();
      delivery.error = error.message;
      delivery.responseStatus = error.response?.status;
      delivery.responseData = error.response?.data;

      // Update webhook stats
      webhook.stats.totalDeliveries++;
      webhook.stats.failedDeliveries++;
      webhook.stats.lastDelivery = delivery.failedAt;
      webhook.stats.lastFailure = delivery.failedAt;

      // Check if should retry
      if (delivery.attempts < delivery.maxAttempts) {
        this.scheduleRetry(delivery, webhook);
      } else {
        this.emit('delivery_failed', delivery);
      }
    }

    this.recordDelivery(delivery);
    return delivery;
  }

  /**
   * Schedule delivery retry
   */
  scheduleRetry(delivery, webhook) {
    const retryIndex = Math.min(delivery.attempts - 1, webhook.retryPolicy.retryDelays.length - 1);
    const retryDelay = webhook.retryPolicy.retryDelays[retryIndex];
    const retryAt = Date.now() + retryDelay;

    delivery.status = 'retry_scheduled';
    delivery.nextRetryAt = new Date(retryAt).toISOString();

    this.retryQueue.push({
      delivery,
      retryAt,
      retryDelay
    });

    this.emit('delivery_retry_scheduled', { delivery, retryAt, retryDelay });
  }

  /**
   * Record delivery in history
   */
  recordDelivery(delivery) {
    this.deliveryHistory.push({
      ...delivery,
      recordedAt: new Date().toISOString()
    });

    // Limit history size
    if (this.deliveryHistory.length > this.config.historyLimit) {
      this.deliveryHistory = this.deliveryHistory.slice(-this.config.historyLimit);
    }
  }

  /**
   * Get matching webhooks for event type
   */
  getMatchingWebhooks(eventType) {
    return Array.from(this.webhooks.values()).filter(webhook => {
      if (!webhook.active) return false;
      
      return webhook.events.includes('*') || 
             webhook.events.includes(eventType) ||
             webhook.events.some(pattern => this.matchesPattern(eventType, pattern));
    });
  }

  /**
   * Check if event type matches pattern
   */
  matchesPattern(eventType, pattern) {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(eventType);
    }
    return eventType === pattern;
  }

  /**
   * Generate webhook signature
   */
  generateSignature(payload, secret) {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload, signature, secret) {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Generate webhook secret
   */
  generateSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get webhook by ID
   */
  getWebhook(webhookId) {
    return this.webhooks.get(webhookId);
  }

  /**
   * Update webhook
   */
  updateWebhook(webhookId, updates) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      return null;
    }

    const updatedWebhook = {
      ...webhook,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.webhooks.set(webhookId, updatedWebhook);
    this.emit('webhook_updated', { webhookId, webhook: updatedWebhook });
    
    return updatedWebhook;
  }

  /**
   * Delete webhook
   */
  deleteWebhook(webhookId) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      return false;
    }

    this.webhooks.delete(webhookId);
    this.emit('webhook_deleted', { webhookId, webhook });
    
    return true;
  }

  /**
   * Get delivery history
   */
  getDeliveryHistory(filters = {}) {
    let history = [...this.deliveryHistory];

    if (filters.webhookId) {
      history = history.filter(d => d.webhookId === filters.webhookId);
    }

    if (filters.status) {
      history = history.filter(d => d.status === filters.status);
    }

    if (filters.eventType) {
      history = history.filter(d => d.event.type === filters.eventType);
    }

    if (filters.limit) {
      history = history.slice(-filters.limit);
    }

    return history.reverse(); // Most recent first
  }

  /**
   * Get webhook statistics
   */
  getWebhookStats(webhookId = null) {
    if (webhookId) {
      const webhook = this.webhooks.get(webhookId);
      return webhook ? webhook.stats : null;
    }

    // Aggregate stats for all webhooks
    const totalStats = {
      totalWebhooks: this.webhooks.size,
      activeWebhooks: 0,
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      queuedDeliveries: this.deliveryQueue.length,
      retryQueueSize: this.retryQueue.length
    };

    for (const webhook of this.webhooks.values()) {
      if (webhook.active) {
        totalStats.activeWebhooks++;
      }
      totalStats.totalDeliveries += webhook.stats.totalDeliveries;
      totalStats.successfulDeliveries += webhook.stats.successfulDeliveries;
      totalStats.failedDeliveries += webhook.stats.failedDeliveries;
    }

    totalStats.successRate = totalStats.totalDeliveries > 0 ?
      Math.round((totalStats.successfulDeliveries / totalStats.totalDeliveries) * 100) : 0;

    return totalStats;
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(webhookId) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const testEvent = {
      type: 'webhook.test',
      payload: {
        message: 'This is a test webhook delivery',
        timestamp: new Date().toISOString(),
        webhook_id: webhookId
      }
    };

    return await this.sendWebhook(testEvent.type, testEvent.payload, {
      priority: 'high',
      source: 'webhook_test'
    });
  }

  /**
   * Get all webhooks
   */
  getAllWebhooks() {
    return Array.from(this.webhooks.values());
  }

  /**
   * Pause webhook
   */
  pauseWebhook(webhookId) {
    return this.updateWebhook(webhookId, { active: false });
  }

  /**
   * Resume webhook
   */
  resumeWebhook(webhookId) {
    return this.updateWebhook(webhookId, { active: true });
  }
}

export default new WebhookService();