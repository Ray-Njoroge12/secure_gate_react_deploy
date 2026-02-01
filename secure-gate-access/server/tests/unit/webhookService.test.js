/**
 * Unit Tests for Webhook Service
 * Tests webhook delivery, retry logic, and comprehensive error handling
 */

import { jest } from '@jest/globals';
import crypto from 'crypto';
import { webhookService } from '../../src/services/webhookService.js';

// Mock dependencies
const mockHttpClient = {
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};

const mockDb = {
  query: jest.fn(),
  transaction: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

const mockQueue = {
  add: jest.fn(),
  process: jest.fn(),
  on: jest.fn()
};

jest.mock('axios', () => ({
  create: () => mockHttpClient
}));

jest.mock('../../src/database/db.enhanced.js', () => ({
  dbManager: mockDb
}));

jest.mock('../../src/services/loggingService.js', () => ({
  loggingService: mockLogger
}));

jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => mockQueue);
});

describe('Webhook Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset webhook service state
    webhookService.webhooks.clear();
    webhookService.deliveryAttempts.clear();
    webhookService.failedDeliveries.clear();
  });

  describe('Webhook Registration', () => {
    test('should register webhook successfully', async () => {
      const webhookData = {
        url: 'https://example.com/webhook',
        events: ['visitor.checked_in', 'visitor.checked_out'],
        secret: 'webhook_secret_123',
        active: true,
        retryPolicy: {
          maxAttempts: 3,
          backoffMultiplier: 2,
          initialDelay: 1000
        }
      };

      mockDb.query.mockResolvedValue({
        rows: [{ id: 1, ...webhookData, created_at: new Date().toISOString() }],
        rowCount: 1
      });

      const result = await webhookService.registerWebhook(1, 1, webhookData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO webhooks'),
        expect.arrayContaining([
          1, // userId
          1, // estateId
          webhookData.url,
          JSON.stringify(webhookData.events),
          webhookData.secret,
          webhookData.active,
          JSON.stringify(webhookData.retryPolicy)
        ])
      );

      expect(result).toMatchObject({
        id: 1,
        url: webhookData.url,
        events: webhookData.events,
        active: webhookData.active
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Webhook registered successfully',
        expect.objectContaining({
          webhookId: 1,
          url: webhookData.url,
          events: webhookData.events
        })
      );
    });

    test('should validate webhook URL format', async () => {
      const invalidWebhookData = {
        url: 'invalid-url',
        events: ['visitor.checked_in'],
        secret: 'secret'
      };

      await expect(
        webhookService.registerWebhook(1, 1, invalidWebhookData)
      ).rejects.toThrow('Invalid webhook URL format');

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    test('should validate supported events', async () => {
      const invalidWebhookData = {
        url: 'https://example.com/webhook',
        events: ['invalid.event'],
        secret: 'secret'
      };

      await expect(
        webhookService.registerWebhook(1, 1, invalidWebhookData)
      ).rejects.toThrow('Unsupported event type: invalid.event');

      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });

  describe('Webhook Delivery', () => {
    test('should deliver webhook successfully', async () => {
      const webhook = {
        id: 1,
        url: 'https://example.com/webhook',
        secret: 'webhook_secret_123',
        events: ['visitor.checked_in'],
        active: true,
        retryPolicy: {
          maxAttempts: 3,
          backoffMultiplier: 2,
          initialDelay: 1000
        }
      };

      const eventData = {
        event: 'visitor.checked_in',
        data: {
          visitorId: 123,
          name: 'John Doe',
          timestamp: new Date().toISOString()
        },
        estateId: 1
      };

      mockHttpClient.post.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { received: true }
      });

      mockDb.query.mockResolvedValue({ rowCount: 1 });

      const result = await webhookService.deliverWebhook(webhook, eventData);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        webhook.url,
        expect.objectContaining({
          event: eventData.event,
          data: eventData.data,
          timestamp: expect.any(String),
          webhook_id: webhook.id
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Signature': expect.any(String),
            'X-Webhook-Event': eventData.event,
            'X-Webhook-ID': expect.any(String)
          }),
          timeout: 30000
        })
      );

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.responseTime).toBeGreaterThan(0);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Webhook delivered successfully',
        expect.objectContaining({
          webhookId: webhook.id,
          event: eventData.event,
          statusCode: 200,
          responseTime: expect.any(Number)
        })
      );
    });

    test('should generate correct webhook signature', () => {
      const payload = { test: 'data' };
      const secret = 'webhook_secret_123';
      
      const signature = webhookService.generateSignature(payload, secret);
      
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      expect(signature).toBe(`sha256=${expectedSignature}`);
    });

    test('should handle webhook delivery failure with retry', async () => {
      const webhook = {
        id: 1,
        url: 'https://example.com/webhook',
        secret: 'webhook_secret_123',
        events: ['visitor.checked_in'],
        active: true,
        retryPolicy: {
          maxAttempts: 3,
          backoffMultiplier: 2,
          initialDelay: 1000
        }
      };

      const eventData = {
        event: 'visitor.checked_in',
        data: { visitorId: 123 },
        estateId: 1
      };

      // First attempt fails
      mockHttpClient.post.mockRejectedValueOnce(new Error('Connection timeout'));
      
      // Second attempt succeeds
      mockHttpClient.post.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        data: { received: true }
      });

      mockDb.query.mockResolvedValue({ rowCount: 1 });

      const result = await webhookService.deliverWebhookWithRetry(webhook, eventData);

      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Webhook delivery failed, retrying',
        expect.objectContaining({
          webhookId: webhook.id,
          attempt: 1,
          error: 'Connection timeout'
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Webhook delivered successfully after retry',
        expect.objectContaining({
          webhookId: webhook.id,
          attempts: 2
        })
      );
    });

    test('should handle permanent webhook failure', async () => {
      const webhook = {
        id: 1,
        url: 'https://example.com/webhook',
        secret: 'webhook_secret_123',
        events: ['visitor.checked_in'],
        active: true,
        retryPolicy: {
          maxAttempts: 3,
          backoffMultiplier: 2,
          initialDelay: 100 // Reduced for testing
        }
      };

      const eventData = {
        event: 'visitor.checked_in',
        data: { visitorId: 123 },
        estateId: 1
      };

      // All attempts fail
      mockHttpClient.post.mockRejectedValue(new Error('Service unavailable'));
      mockDb.query.mockResolvedValue({ rowCount: 1 });

      const result = await webhookService.deliverWebhookWithRetry(webhook, eventData);

      expect(mockHttpClient.post).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
      expect(result.finalError).toBe('Service unavailable');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Webhook delivery failed permanently',
        expect.objectContaining({
          webhookId: webhook.id,
          attempts: 3,
          error: 'Service unavailable'
        })
      );
    });

    test('should respect retry backoff timing', async () => {
      const webhook = {
        id: 1,
        url: 'https://example.com/webhook',
        secret: 'webhook_secret_123',
        retryPolicy: {
          maxAttempts: 3,
          backoffMultiplier: 2,
          initialDelay: 100
        }
      };

      const eventData = {
        event: 'visitor.checked_in',
        data: { visitorId: 123 }
      };

      mockHttpClient.post.mockRejectedValue(new Error('Temporary failure'));
      mockDb.query.mockResolvedValue({ rowCount: 1 });

      const startTime = Date.now();
      await webhookService.deliverWebhookWithRetry(webhook, eventData);
      const endTime = Date.now();

      // Should have waited at least: 100ms + 200ms = 300ms between retries
      expect(endTime - startTime).toBeGreaterThan(250);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(3);
    });
  });

  describe('Event Broadcasting', () => {
    test('should broadcast event to matching webhooks', async () => {
      const webhooks = [
        {
          id: 1,
          url: 'https://webhook1.com',
          events: ['visitor.checked_in', 'visitor.checked_out'],
          active: true,
          secret: 'secret1'
        },
        {
          id: 2,
          url: 'https://webhook2.com',
          events: ['visitor.checked_in'],
          active: true,
          secret: 'secret2'
        },
        {
          id: 3,
          url: 'https://webhook3.com',
          events: ['user.created'],
          active: true,
          secret: 'secret3'
        }
      ];

      mockDb.query.mockResolvedValue({
        rows: webhooks,
        rowCount: webhooks.length
      });

      mockHttpClient.post.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: { received: true }
      });

      const eventData = {
        event: 'visitor.checked_in',
        data: { visitorId: 123 },
        estateId: 1
      };

      const results = await webhookService.broadcastEvent(eventData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM webhooks'),
        [1, true] // estateId, active
      );

      // Should deliver to webhooks 1 and 2 (both listen for visitor.checked_in)
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
      expect(results.delivered).toBe(2);
      expect(results.failed).toBe(0);
      expect(results.webhookResults).toHaveLength(2);
    });

    test('should handle mixed success and failure in broadcast', async () => {
      const webhooks = [
        {
          id: 1,
          url: 'https://webhook1.com',
          events: ['visitor.checked_in'],
          active: true,
          secret: 'secret1'
        },
        {
          id: 2,
          url: 'https://webhook2.com',
          events: ['visitor.checked_in'],
          active: true,
          secret: 'secret2'
        }
      ];

      mockDb.query.mockResolvedValue({
        rows: webhooks,
        rowCount: webhooks.length
      });

      // First webhook succeeds, second fails
      mockHttpClient.post
        .mockResolvedValueOnce({
          status: 200,
          statusText: 'OK',
          data: { received: true }
        })
        .mockRejectedValueOnce(new Error('Connection refused'));

      const eventData = {
        event: 'visitor.checked_in',
        data: { visitorId: 123 },
        estateId: 1
      };

      const results = await webhookService.broadcastEvent(eventData);

      expect(results.delivered).toBe(1);
      expect(results.failed).toBe(1);
      expect(results.webhookResults).toHaveLength(2);
      expect(results.webhookResults[0].success).toBe(true);
      expect(results.webhookResults[1].success).toBe(false);
    });
  });

  describe('Webhook Management', () => {
    test('should update webhook configuration', async () => {
      const updateData = {
        url: 'https://new-webhook.com',
        events: ['visitor.checked_in', 'user.created'],
        active: false
      };

      mockDb.query.mockResolvedValue({
        rows: [{ id: 1, ...updateData, updated_at: new Date().toISOString() }],
        rowCount: 1
      });

      const result = await webhookService.updateWebhook(1, 1, 1, updateData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE webhooks SET'),
        expect.arrayContaining([
          updateData.url,
          JSON.stringify(updateData.events),
          updateData.active,
          1, // webhookId
          1, // userId
          1  // estateId
        ])
      );

      expect(result).toMatchObject({
        id: 1,
        url: updateData.url,
        events: updateData.events,
        active: updateData.active
      });
    });

    test('should delete webhook', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 1 });

      const result = await webhookService.deleteWebhook(1, 1, 1);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM webhooks'),
        [1, 1, 1] // webhookId, userId, estateId
      );

      expect(result).toBe(true);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Webhook deleted successfully',
        expect.objectContaining({
          webhookId: 1,
          userId: 1,
          estateId: 1
        })
      );
    });

    test('should get webhook delivery logs', async () => {
      const mockLogs = [
        {
          id: 1,
          webhook_id: 1,
          event: 'visitor.checked_in',
          status_code: 200,
          success: true,
          attempts: 1,
          response_time: 150,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          webhook_id: 1,
          event: 'visitor.checked_out',
          status_code: 500,
          success: false,
          attempts: 3,
          error_message: 'Internal server error',
          created_at: new Date().toISOString()
        }
      ];

      mockDb.query.mockResolvedValue({
        rows: mockLogs,
        rowCount: mockLogs.length
      });

      const result = await webhookService.getWebhookLogs(1, 1, {
        limit: 50,
        offset: 0,
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM webhook_delivery_logs'),
        expect.arrayContaining([1, 1, '2025-01-01', '2025-01-31', 50, 0])
      );

      expect(result.logs).toEqual(mockLogs);
      expect(result.total).toBe(mockLogs.length);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle database connection errors', async () => {
      mockDb.query.mockRejectedValue(new Error('Database connection lost'));

      await expect(
        webhookService.registerWebhook(1, 1, {
          url: 'https://example.com/webhook',
          events: ['visitor.checked_in'],
          secret: 'secret'
        })
      ).rejects.toThrow('Database connection lost');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database error in webhook service',
        expect.objectContaining({
          error: 'Database connection lost'
        })
      );
    });

    test('should handle invalid webhook response format', async () => {
      const webhook = {
        id: 1,
        url: 'https://example.com/webhook',
        secret: 'secret',
        events: ['visitor.checked_in'],
        active: true
      };

      // Return invalid response (not JSON)
      mockHttpClient.post.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: 'Invalid response format',
        headers: { 'content-type': 'text/plain' }
      });

      mockDb.query.mockResolvedValue({ rowCount: 1 });

      const result = await webhookService.deliverWebhook(webhook, {
        event: 'visitor.checked_in',
        data: { visitorId: 123 }
      });

      expect(result.success).toBe(true); // Still successful if status is 200
      expect(result.statusCode).toBe(200);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Webhook returned non-JSON response',
        expect.objectContaining({
          webhookId: webhook.id,
          contentType: 'text/plain'
        })
      );
    });

    test('should handle webhook URL timeout', async () => {
      const webhook = {
        id: 1,
        url: 'https://slow-webhook.com',
        secret: 'secret',
        events: ['visitor.checked_in'],
        active: true
      };

      mockHttpClient.post.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      });

      mockDb.query.mockResolvedValue({ rowCount: 1 });

      const result = await webhookService.deliverWebhook(webhook, {
        event: 'visitor.checked_in',
        data: { visitorId: 123 }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Webhook delivery timeout',
        expect.objectContaining({
          webhookId: webhook.id,
          timeout: 30000
        })
      );
    });
  });
});