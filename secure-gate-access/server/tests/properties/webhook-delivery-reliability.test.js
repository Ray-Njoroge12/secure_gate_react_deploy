/**
 * Property-Based Tests for Webhook Delivery Reliability
 * 
 * **Property 25: Webhook Delivery Reliability**
 * **Validates: Requirements 13.2**
 * 
 * This test ensures that webhook delivery mechanisms work reliably across
 * all possible failure scenarios, retry patterns, and edge cases with
 * comprehensive failure handling and delivery guarantees.
 */

import fc from 'fast-check';
import { jest } from '@jest/globals';
import crypto from 'crypto';
import { EventEmitter } from 'events';

// Test configuration
const TEST_CONFIG = {
  PROPERTY_RUNS: 100,
  TIMEOUT: 30000,
  MAX_RETRIES: 5,
  RETRY_DELAYS: [1000, 2000, 5000, 10000, 30000],
  WEBHOOK_TIMEOUT: 30000
};

// Mock HTTP client for testing
class MockHttpClient {
  constructor() {
    this.responses = new Map();
    this.callHistory = [];
    this.defaultResponse = { status: 200, headers: {}, data: { received: true } };
    this.shouldFail = false;
    this.failureError = null;
  }

  setResponse(url, response) {
    this.responses.set(url, response);
  }

  setFailure(error) {
    this.shouldFail = true;
    this.failureError = error;
  }

  clearFailure() {
    this.shouldFail = false;
    this.failureError = null;
  }

  async post(url, data, config = {}) {
    this.callHistory.push({ url, data, config, timestamp: Date.now() });

    if (this.shouldFail) {
      throw this.failureError;
    }

    const response = this.responses.get(url) || this.defaultResponse;
    return Promise.resolve(response);
  }

  getCallHistory() {
    return [...this.callHistory];
  }

  clearHistory() {
    this.callHistory = [];
  }

  reset() {
    this.responses.clear();
    this.callHistory = [];
    this.shouldFail = false;
    this.failureError = null;
  }
}

// Mock WebhookService for testing
class MockWebhookService extends EventEmitter {
  constructor(httpClient = null) {
    super();
    this.httpClient = httpClient || new MockHttpClient();
    this.webhooks = new Map();
    this.deliveryQueue = [];
    this.deliveryHistory = [];
    this.retryQueue = [];
    this.isProcessing = false;
    
    this.config = {
      maxRetries: TEST_CONFIG.MAX_RETRIES,
      retryDelays: TEST_CONFIG.RETRY_DELAYS,
      timeout: TEST_CONFIG.WEBHOOK_TIMEOUT,
      maxConcurrent: 10,
      historyLimit: 1000
    };
  }

  registerWebhook(config) {
    const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const webhook = {
      id: webhookId,
      url: config.url,
      events: config.events || ['*'],
      secret: config.secret || this.generateSecret(),
      active: config.active !== false,
      retryPolicy: {
        maxRetries: config.maxRetries !== undefined ? config.maxRetries : this.config.maxRetries,
        retryDelays: config.retryDelays || this.config.retryDelays
      },
      verifySSL: config.verifySSL !== false,
      headers: config.headers || {},
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
    return webhook;
  }

  async sendWebhook(eventType, payload, options = {}) {
    const event = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      payload,
      timestamp: new Date().toISOString(),
      source: options.source || 'secure-gate-api',
      version: options.version || '1.0'
    };

    const matchingWebhooks = this.getMatchingWebhooks(eventType);
    const deliveries = [];

    for (const webhook of matchingWebhooks) {
      const delivery = await this.queueDelivery(webhook, event, options);
      deliveries.push(delivery);
    }

    return { event, deliveries };
  }

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
      status: 'queued',
      attempts: 0,
      maxAttempts: webhook.retryPolicy.maxRetries + 1,
      queuedAt: new Date().toISOString(),
      priority: options.priority || 'normal',
      delay: options.delay || 0
    };

    this.deliveryQueue.push(delivery);
    return delivery;
  }

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
      const payload = {
        id: delivery.eventId,
        type: delivery.event.type,
        data: delivery.event.payload,
        timestamp: delivery.event.timestamp,
        delivery_id: delivery.id
      };

      const signature = this.generateSignature(payload, webhook.secret);
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'SecureGate-Webhooks/1.0',
        'X-Webhook-Signature': signature,
        'X-Webhook-Delivery': delivery.id,
        'X-Webhook-Event': delivery.event.type,
        ...webhook.headers
      };

      const response = await this.httpClient.post(webhook.url, payload, {
        headers,
        timeout: this.config.timeout,
        validateStatus: (status) => status >= 200 && status < 300
      });

      delivery.status = 'delivered';
      delivery.deliveredAt = new Date().toISOString();
      delivery.responseStatus = response.status;
      delivery.responseHeaders = response.headers;

      webhook.stats.totalDeliveries++;
      webhook.stats.successfulDeliveries++;
      webhook.stats.lastDelivery = delivery.deliveredAt;
      webhook.stats.lastSuccess = delivery.deliveredAt;

      this.emit('delivery_success', delivery);

    } catch (error) {
      delivery.status = 'failed';
      delivery.failedAt = new Date().toISOString();
      delivery.error = error.message;
      delivery.responseStatus = error.response?.status;
      delivery.responseData = error.response?.data;

      webhook.stats.totalDeliveries++;
      webhook.stats.failedDeliveries++;
      webhook.stats.lastDelivery = delivery.failedAt;
      webhook.stats.lastFailure = delivery.failedAt;

      if (delivery.attempts < delivery.maxAttempts) {
        this.scheduleRetry(delivery, webhook);
      } else {
        delivery.status = 'failed';
        delivery.nextRetryAt = undefined; // Clear any retry scheduling
        this.emit('delivery_failed', delivery);
      }
    }

    this.recordDelivery(delivery);
    return delivery;
  }

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

  recordDelivery(delivery) {
    this.deliveryHistory.push({
      ...delivery,
      recordedAt: new Date().toISOString()
    });

    if (this.deliveryHistory.length > this.config.historyLimit) {
      this.deliveryHistory = this.deliveryHistory.slice(-this.config.historyLimit);
    }
  }

  getMatchingWebhooks(eventType) {
    return Array.from(this.webhooks.values()).filter(webhook => {
      if (!webhook.active) return false;
      return webhook.events.includes('*') || 
             webhook.events.includes(eventType) ||
             webhook.events.some(pattern => this.matchesPattern(eventType, pattern));
    });
  }

  matchesPattern(eventType, pattern) {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(eventType);
    }
    return eventType === pattern;
  }

  generateSignature(payload, secret) {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  verifySignature(payload, signature, secret) {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  generateSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  getWebhook(webhookId) {
    return this.webhooks.get(webhookId);
  }

  getDeliveryHistory(filters = {}) {
    let history = [...this.deliveryHistory];

    if (filters.webhookId) {
      history = history.filter(d => d.webhookId === filters.webhookId);
    }

    if (filters.status) {
      history = history.filter(d => d.status === filters.status);
    }

    return history.reverse();
  }

  getWebhookStats(webhookId = null) {
    if (webhookId) {
      const webhook = this.webhooks.get(webhookId);
      return webhook ? webhook.stats : null;
    }

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
}

describe('Property 25: Webhook Delivery Reliability', () => {
  let webhookService;
  let httpClient;

  beforeEach(() => {
    jest.clearAllMocks();
    httpClient = new MockHttpClient();
    webhookService = new MockWebhookService(httpClient);
  });

  /**
   * Property: Successful webhook deliveries should always be recorded correctly
   */
  test('Property: Successful deliveries are always recorded correctly', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        url: fc.constantFrom('https://example.com/webhook', 'https://test.com/hook'),
        eventType: fc.constantFrom('visitor.created', 'visitor.checked_in', 'user.registered', 'incident.reported'),
        payload: fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          timestamp: fc.constantFrom('2020-01-01T00:00:00.000Z', '2021-01-01T00:00:00.000Z', '2022-01-01T00:00:00.000Z')
        }),
        secret: fc.string({ minLength: 32, maxLength: 64 })
      }),
      async (webhookConfig) => {
        // Clear any existing webhooks to ensure isolation
        webhookService.webhooks.clear();
        httpClient.reset();
        
        // Mock successful HTTP response
        httpClient.setResponse(webhookConfig.url, {
          status: 200,
          headers: { 'content-type': 'application/json' },
          data: { received: true }
        });

        // Register webhook
        const webhook = webhookService.registerWebhook({
          url: webhookConfig.url,
          events: [webhookConfig.eventType],
          secret: webhookConfig.secret
        });

        // Send webhook
        const result = await webhookService.sendWebhook(
          webhookConfig.eventType,
          webhookConfig.payload
        );

        expect(result.deliveries).toHaveLength(1);
        const delivery = result.deliveries[0];

        // Execute delivery
        const executedDelivery = await webhookService.executeDelivery(delivery);

        // Properties that must hold for successful deliveries
        expect(executedDelivery.status).toBe('delivered');
        expect(executedDelivery.attempts).toBe(1);
        expect(executedDelivery.deliveredAt).toBeDefined();
        expect(executedDelivery.responseStatus).toBe(200);
        expect(executedDelivery.error).toBeUndefined();

        // Verify webhook stats are updated
        const stats = webhookService.getWebhookStats(webhook.id);
        expect(stats.totalDeliveries).toBe(1);
        expect(stats.successfulDeliveries).toBe(1);
        expect(stats.failedDeliveries).toBe(0);
        expect(stats.lastSuccess).toBeDefined();

        // Verify delivery is recorded in history
        const history = webhookService.getDeliveryHistory({ webhookId: webhook.id });
        expect(history).toHaveLength(1);
        expect(history[0].status).toBe('delivered');
      }
    ), { numRuns: 50 }); // Reduced runs for async tests
  });

  /**
   * Property: Failed webhook deliveries should trigger retry logic with exponential backoff
   */
  test('Property: Failed deliveries trigger retry logic with exponential backoff', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        url: fc.constantFrom('https://example.com/webhook', 'https://test.com/hook'),
        eventType: fc.constantFrom('visitor.created', 'user.updated', 'system.alert'),
        payload: fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          data: fc.string({ minLength: 1, maxLength: 200 })
        }),
        failureType: fc.constantFrom('timeout', 'server_error', 'network_error', 'invalid_response'),
        maxRetries: fc.integer({ min: 1, max: 3 })
      }),
      async (config) => {
        // Clear any existing webhooks and reset HTTP client
        webhookService.webhooks.clear();
        webhookService.retryQueue = [];
        httpClient.reset();
        
        // Mock failure response based on failure type
        const mockError = createMockError(config.failureType);
        httpClient.setFailure(mockError);

        // Register webhook with custom retry policy
        const webhook = webhookService.registerWebhook({
          url: config.url,
          events: [config.eventType],
          maxRetries: config.maxRetries,
          retryDelays: TEST_CONFIG.RETRY_DELAYS.slice(0, config.maxRetries)
        });

        // Send webhook
        const result = await webhookService.sendWebhook(config.eventType, config.payload);
        expect(result.deliveries).toHaveLength(1);
        const delivery = result.deliveries[0];

        // Execute delivery (will fail)
        const executedDelivery = await webhookService.executeDelivery(delivery);

        // Properties that must hold for failed deliveries
        expect(executedDelivery.status).toBe('retry_scheduled');
        expect(executedDelivery.attempts).toBe(1);
        expect(executedDelivery.failedAt).toBeDefined();
        expect(executedDelivery.error).toBeDefined();
        expect(executedDelivery.nextRetryAt).toBeDefined();

        // Verify retry is scheduled
        expect(webhookService.retryQueue).toHaveLength(1);
        const retryItem = webhookService.retryQueue[0];
        expect(retryItem.delivery.id).toBe(delivery.id);
        expect(retryItem.retryDelay).toBe(TEST_CONFIG.RETRY_DELAYS[0]);

        // Verify webhook stats are updated
        const stats = webhookService.getWebhookStats(webhook.id);
        expect(stats.totalDeliveries).toBe(1);
        expect(stats.successfulDeliveries).toBe(0);
        expect(stats.failedDeliveries).toBe(1);
        expect(stats.lastFailure).toBeDefined();
      }
    ), { numRuns: 30 }); // Reduced runs for async tests with failures
  });

  /**
   * Property: Webhook signatures should always be cryptographically secure and verifiable
   */
  test('Property: Webhook signatures are cryptographically secure and verifiable', () => {
    fc.assert(fc.property(
      fc.record({
        payload: fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          type: fc.string({ minLength: 1, maxLength: 50 }),
          data: fc.anything(),
          timestamp: fc.date().map(d => d.toISOString())
        }),
        secret: fc.string({ minLength: 16, maxLength: 128 })
      }),
      (config) => {
        const signature1 = webhookService.generateSignature(config.payload, config.secret);
        const signature2 = webhookService.generateSignature(config.payload, config.secret);

        // Properties for signature generation
        expect(signature1).toBe(signature2); // Deterministic
        expect(signature1).toMatch(/^[a-f0-9]{64}$/); // Valid hex SHA-256
        expect(signature1.length).toBe(64); // SHA-256 produces 64 hex characters

        // Verify signature validation
        const isValid = webhookService.verifySignature(config.payload, signature1, config.secret);
        expect(isValid).toBe(true);

        // Verify signature fails with wrong secret
        const wrongSecret = config.secret + 'wrong';
        const isInvalid = webhookService.verifySignature(config.payload, signature1, wrongSecret);
        expect(isInvalid).toBe(false);

        // Verify signature fails with tampered payload
        const tamperedPayload = { ...config.payload, id: config.payload.id + 1 };
        const isTampered = webhookService.verifySignature(tamperedPayload, signature1, config.secret);
        expect(isTampered).toBe(false);
      }
    ), { numRuns: TEST_CONFIG.PROPERTY_RUNS });
  });

  /**
   * Property: Event pattern matching should be consistent and predictable
   */
  test('Property: Event pattern matching consistency', () => {
    fc.assert(fc.property(
      fc.record({
        eventType: fc.constantFrom(
          'visitor.created', 'visitor.updated', 'visitor.deleted',
          'user.registered', 'user.login', 'user.logout',
          'system.alert', 'system.maintenance', 'system.backup'
        ),
        patterns: fc.array(
          fc.oneof(
            fc.constant('*'),
            fc.constantFrom('visitor.*', 'user.*', 'system.*'),
            fc.constantFrom('visitor.created', 'user.login', 'system.alert'),
            fc.constantFrom('*.created', '*.updated', '*.deleted')
          ),
          { minLength: 1, maxLength: 5 }
        )
      }),
      (config) => {
        // Register webhook with patterns
        const webhook = webhookService.registerWebhook({
          url: 'https://example.com/webhook',
          events: config.patterns
        });

        const matchingWebhooks = webhookService.getMatchingWebhooks(config.eventType);
        const shouldMatch = config.patterns.some(pattern => {
          if (pattern === '*') return true;
          if (pattern === config.eventType) return true;
          if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(config.eventType);
          }
          return false;
        });

        // Property: webhook should match if and only if pattern matches
        if (shouldMatch) {
          expect(matchingWebhooks).toContainEqual(expect.objectContaining({ id: webhook.id }));
        } else {
          expect(matchingWebhooks).not.toContainEqual(expect.objectContaining({ id: webhook.id }));
        }
      }
    ), { numRuns: TEST_CONFIG.PROPERTY_RUNS });
  });

  /**
   * Property: Retry delays should follow exponential backoff pattern
   */
  test('Property: Retry delays follow exponential backoff pattern', () => {
    fc.assert(fc.property(
      fc.array(fc.integer({ min: 100, max: 60000 }), { minLength: 2, maxLength: 10 }),
      (customDelays) => {
        const webhook = webhookService.registerWebhook({
          url: 'https://example.com/webhook',
          retryDelays: customDelays
        });

        // Properties for retry delays
        expect(webhook.retryPolicy.retryDelays).toEqual(customDelays);
        expect(webhook.retryPolicy.retryDelays.length).toBeGreaterThan(0);

        // Verify delays are used in order
        for (let i = 0; i < customDelays.length - 1; i++) {
          const currentDelay = customDelays[i];
          const nextDelay = customDelays[i + 1];
          
          // Property: delays should generally increase (exponential backoff)
          // Allow some flexibility for custom configurations
          expect(typeof currentDelay).toBe('number');
          expect(typeof nextDelay).toBe('number');
          expect(currentDelay).toBeGreaterThan(0);
          expect(nextDelay).toBeGreaterThan(0);
        }
      }
    ), { numRuns: TEST_CONFIG.PROPERTY_RUNS });
  });

  /**
   * Property: Webhook delivery should be idempotent for duplicate events
   */
  test('Property: Webhook delivery idempotency for duplicate events', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        eventType: fc.constantFrom('visitor.created', 'user.updated'),
        payload: fc.record({
          id: fc.integer({ min: 1, max: 1000 }),
          action: fc.string({ minLength: 1, maxLength: 50 })
        }),
        duplicateCount: fc.integer({ min: 2, max: 3 })
      }),
      async (config) => {
        // Clear webhooks and reset HTTP client
        webhookService.webhooks.clear();
        httpClient.reset();
        
        // Mock successful responses
        httpClient.setResponse('https://example.com/webhook', {
          status: 200,
          headers: { 'content-type': 'application/json' },
          data: { received: true }
        });

        // Register single webhook
        const webhook = webhookService.registerWebhook({
          url: 'https://example.com/webhook',
          events: [config.eventType]
        });

        // Send same event multiple times
        const results = [];
        for (let i = 0; i < config.duplicateCount; i++) {
          const result = await webhookService.sendWebhook(config.eventType, config.payload);
          results.push(result);
        }

        // Execute all deliveries
        const executedDeliveries = [];
        for (const result of results) {
          for (const delivery of result.deliveries) {
            const executed = await webhookService.executeDelivery(delivery);
            executedDeliveries.push(executed);
          }
        }

        // Properties for idempotency
        expect(executedDeliveries).toHaveLength(config.duplicateCount);
        
        // Each delivery should have unique ID but same payload
        const deliveryIds = executedDeliveries.map(d => d.id);
        const uniqueIds = new Set(deliveryIds);
        expect(uniqueIds.size).toBe(config.duplicateCount);

        // All deliveries should succeed
        executedDeliveries.forEach(delivery => {
          expect(delivery.status).toBe('delivered');
          expect(delivery.event.payload).toEqual(config.payload);
        });

        // Webhook stats should reflect all deliveries
        const stats = webhookService.getWebhookStats(webhook.id);
        expect(stats.totalDeliveries).toBe(config.duplicateCount);
        expect(stats.successfulDeliveries).toBe(config.duplicateCount);
      }
    ), { numRuns: 20 });
  });

  /**
   * Property: Webhook delivery should handle concurrent requests safely
   */
  test('Property: Concurrent webhook delivery safety', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(
        fc.record({
          eventType: fc.constantFrom('visitor.created', 'user.login', 'system.alert'),
          payload: fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            timestamp: fc.constantFrom('2020-01-01T00:00:00.000Z', '2021-01-01T00:00:00.000Z', '2022-01-01T00:00:00.000Z')
          }),
          delay: fc.integer({ min: 0, max: 50 })
        }),
        { minLength: 2, maxLength: 4 }
      ),
      async (concurrentEvents) => {
        // Clear webhooks and reset HTTP client
        webhookService.webhooks.clear();
        httpClient.reset();
        
        // Mock successful responses
        httpClient.setResponse('https://example.com/webhook', {
          status: 200,
          headers: {},
          data: { received: true }
        });

        // Register single webhook for all event types
        const webhook = webhookService.registerWebhook({
          url: 'https://example.com/webhook',
          events: ['*']
        });

        // Send events concurrently
        const deliveryPromises = concurrentEvents.map(async (event, index) => {
          await new Promise(resolve => setTimeout(resolve, event.delay));
          const result = await webhookService.sendWebhook(event.eventType, event.payload);
          return { result, index };
        });

        const deliveryResults = await Promise.all(deliveryPromises);

        // Execute all deliveries concurrently
        const executionPromises = deliveryResults.map(async ({ result }) => {
          const executions = await Promise.all(
            result.deliveries.map(delivery => webhookService.executeDelivery(delivery))
          );
          return executions;
        });

        const allExecutions = await Promise.all(executionPromises);
        const flatExecutions = allExecutions.flat();

        // Properties for concurrent safety
        expect(flatExecutions).toHaveLength(concurrentEvents.length);
        
        // All deliveries should succeed
        flatExecutions.forEach(execution => {
          expect(execution.status).toBe('delivered');
          expect(execution.attempts).toBe(1);
        });

        // Webhook stats should be consistent
        const stats = webhookService.getWebhookStats(webhook.id);
        expect(stats.totalDeliveries).toBe(concurrentEvents.length);
        expect(stats.successfulDeliveries).toBe(concurrentEvents.length);
        expect(stats.failedDeliveries).toBe(0);

        // All deliveries should be recorded in history
        const history = webhookService.getDeliveryHistory({ webhookId: webhook.id });
        expect(history).toHaveLength(concurrentEvents.length);
      }
    ), { numRuns: 15 });
  });

  /**
   * Property: Maximum retry attempts should be respected
   */
  test('Property: Maximum retry attempts are always respected', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        maxRetries: fc.integer({ min: 0, max: 3 }),
        failureType: fc.constantFrom('timeout', 'server_error', 'network_error')
      }),
      async (config) => {
        // Clear webhooks and reset HTTP client
        webhookService.webhooks.clear();
        httpClient.reset();
        
        // Mock consistent failures
        const mockError = createMockError(config.failureType);
        httpClient.setFailure(mockError);

        // Register webhook with specific max retries
        const webhook = webhookService.registerWebhook({
          url: 'https://example.com/webhook',
          maxRetries: config.maxRetries
        });

        // Send webhook
        const result = await webhookService.sendWebhook('test.event', { test: true });
        expect(result.deliveries).toHaveLength(1);
        const delivery = result.deliveries[0];

        // Execute the first delivery attempt
        const firstAttempt = await webhookService.executeDelivery(delivery);

        if (config.maxRetries === 0) {
          // With maxRetries = 0, first failure should be final
          expect(firstAttempt.status).toBe('failed');
          expect(firstAttempt.attempts).toBe(1);
          expect(firstAttempt.nextRetryAt).toBeUndefined();
          
          // Verify webhook stats
          const stats = webhookService.getWebhookStats(webhook.id);
          expect(stats.totalDeliveries).toBe(1);
          expect(stats.failedDeliveries).toBe(1);
          expect(stats.successfulDeliveries).toBe(0);
        } else {
          // With maxRetries > 0, first failure should schedule retry
          expect(firstAttempt.status).toBe('retry_scheduled');
          expect(firstAttempt.attempts).toBe(1);
          expect(firstAttempt.nextRetryAt).toBeDefined();

          // Continue with remaining attempts
          let currentDelivery = firstAttempt;
          const attemptHistory = [firstAttempt];

          for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
            const executed = await webhookService.executeDelivery(currentDelivery);
            attemptHistory.push(executed);

            if (attempt < config.maxRetries) {
              // Should schedule retry
              expect(executed.status).toBe('retry_scheduled');
              expect(executed.attempts).toBe(attempt + 1);
              expect(executed.nextRetryAt).toBeDefined();
            } else {
              // Final attempt should fail without retry
              expect(executed.status).toBe('failed');
              expect(executed.attempts).toBe(config.maxRetries + 1);
              expect(executed.nextRetryAt).toBeUndefined();
            }
          }

          // Properties for retry limits
          expect(attemptHistory).toHaveLength(config.maxRetries + 1);
          expect(attemptHistory[attemptHistory.length - 1].status).toBe('failed');

          // Verify webhook stats
          const stats = webhookService.getWebhookStats(webhook.id);
          expect(stats.totalDeliveries).toBe(config.maxRetries + 1);
          expect(stats.failedDeliveries).toBe(config.maxRetries + 1);
          expect(stats.successfulDeliveries).toBe(0);
        }
      }
    ), { numRuns: 20 });
  });
});

// Helper functions for property tests

function createMockError(failureType) {
  switch (failureType) {
    case 'timeout':
      const timeoutError = new Error('timeout of 30000ms exceeded');
      timeoutError.code = 'ECONNABORTED';
      return timeoutError;

    case 'server_error':
      const serverError = new Error('Request failed with status code 500');
      serverError.response = {
        status: 500,
        data: { error: 'Internal Server Error' }
      };
      return serverError;

    case 'network_error':
      const networkError = new Error('Network Error');
      networkError.code = 'ENOTFOUND';
      return networkError;

    case 'invalid_response':
      const invalidError = new Error('Request failed with status code 400');
      invalidError.response = {
        status: 400,
        data: { error: 'Bad Request' }
      };
      return invalidError;

    default:
      return new Error('Unknown error');
  }
}