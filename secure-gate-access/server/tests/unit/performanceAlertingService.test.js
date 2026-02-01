/**
 * @fileoverview Unit Tests for Performance Alerting Service
 * @description Tests alerting logic, escalation procedures, and notification delivery
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import { jest } from '@jest/globals';
import { PerformanceAlertingService } from '../../src/services/performanceAlertingService.js';

// Mock dependencies
const mockLoggingService = {
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  logError: jest.fn()
};

const mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
};

// Mock fetch for webhook notifications
global.fetch = jest.fn();

// Mock modules
jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  default: mockLoggingService
}));

jest.unstable_mockModule('../../src/services/emailService.js', () => ({
  default: mockEmailService
}));

describe('PerformanceAlertingService', () => {
  let service;
  let originalSetTimeout;
  let timeoutCallbacks;

  beforeEach(() => {
    // Mock setTimeout for escalation testing
    timeoutCallbacks = new Map();
    let timeoutId = 0;
    
    originalSetTimeout = global.setTimeout;
    global.setTimeout = jest.fn((callback, delay) => {
      const id = ++timeoutId;
      timeoutCallbacks.set(id, { callback, delay });
      return id;
    });

    // Set test environment variables
    process.env.CRITICAL_ALERT_EMAIL = 'critical@test.com';
    process.env.WARNING_ALERT_EMAIL = 'warning@test.com';
    process.env.CRITICAL_ALERT_WEBHOOK = 'https://webhook.test.com/critical';
    process.env.SMS_ALERTS_ENABLED = 'true';
    process.env.WEBHOOK_ALERTS_ENABLED = 'true';

    // Clear mocks
    jest.clearAllMocks();
    global.fetch.mockClear();
    
    // Create service instance
    service = new PerformanceAlertingService();
  });

  afterEach(() => {
    // Restore setTimeout
    global.setTimeout = originalSetTimeout;
    
    jest.restoreAllMocks();
  });

  describe('Service Initialization', () => {
    test('should initialize with correct configuration', () => {
      expect(service.alertChannels.email).toBe(true);
      expect(service.alertChannels.sms).toBe(true);
      expect(service.alertChannels.webhook).toBe(true);
      expect(service.escalationConfig).toBeDefined();
      expect(service.recipients).toBeDefined();
    });

    test('should configure escalation rules correctly', () => {
      expect(service.escalationConfig.critical.immediate).toContain('email');
      expect(service.escalationConfig.critical.immediate).toContain('sms');
      expect(service.escalationConfig.critical.escalationDelay).toBe(5 * 60 * 1000);
      expect(service.escalationConfig.critical.maxEscalations).toBe(3);
    });

    test('should configure recipients correctly', () => {
      expect(service.recipients.critical).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'email', address: 'critical@test.com' }),
          expect.objectContaining({ type: 'webhook', url: 'https://webhook.test.com/critical' })
        ])
      );
    });

    test('should log initialization', () => {
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        '[PERFORMANCE ALERTS] Service initialized',
        expect.any(Object)
      );
    });
  });

  describe('Alert Processing', () => {
    const createTestAlert = (severity = 'critical', type = 'response_time') => ({
      id: `alert_${Date.now()}`,
      type,
      severity,
      message: `Test ${severity} alert`,
      currentValue: 2500,
      threshold: 2000,
      timestamp: Date.now(),
      acknowledged: false,
      resolved: false
    });

    test('should process critical alert immediately', async () => {
      const alert = createTestAlert('critical');
      
      await service.processAlert(alert);
      
      expect(service.alertHistory.length).toBe(1);
      expect(service.activeEscalations.size).toBe(1);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        '[PERFORMANCE ALERTS] Alert processed',
        expect.objectContaining({
          alertId: alert.id,
          severity: 'critical'
        })
      );
    });

    test('should process warning alert with different escalation', async () => {
      const alert = createTestAlert('warning');
      
      await service.processAlert(alert);
      
      expect(service.alertHistory.length).toBe(1);
      expect(service.activeEscalations.size).toBe(1);
    });

    test('should respect rate limiting', async () => {
      service.rateLimiting.enabled = true;
      service.rateLimiting.maxSameAlertsPer15Min = 2;
      
      const alert1 = createTestAlert('critical', 'cpu_usage');
      const alert2 = createTestAlert('critical', 'cpu_usage');
      const alert3 = createTestAlert('critical', 'cpu_usage');
      
      await service.processAlert(alert1);
      await service.processAlert(alert2);
      await service.processAlert(alert3); // Should be rate limited
      
      expect(mockLoggingService.logWarning).toHaveBeenCalledWith(
        '[PERFORMANCE ALERTS] Alert rate limited',
        expect.objectContaining({
          alertType: 'cpu_usage',
          severity: 'critical'
        })
      );
    });

    test('should handle processing errors gracefully', async () => {
      const alert = createTestAlert('critical');
      
      // Mock email service to throw error
      mockEmailService.sendEmail.mockRejectedValueOnce(new Error('Email service error'));
      
      await service.processAlert(alert);
      
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        '[PERFORMANCE ALERTS] Failed to send email notification',
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('Notification Delivery', () => {
    const testAlert = {
      id: 'test_alert_123',
      type: 'response_time',
      severity: 'critical',
      message: 'Critical response time exceeded',
      currentValue: 2500,
      threshold: 2000,
      timestamp: Date.now()
    };

    test('should send email notifications', async () => {
      const recipient = { type: 'email', address: 'test@example.com' };
      
      await service.sendNotification(testAlert, 'email', recipient);
      
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: expect.stringContaining('CRITICAL'),
          text: expect.stringContaining('Critical response time exceeded'),
          html: expect.stringContaining('Performance Alert'),
          priority: 'high'
        })
      );
    });

    test('should send webhook notifications', async () => {
      const recipient = { type: 'webhook', url: 'https://webhook.test.com/alerts' };
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      });
      
      await service.sendNotification(testAlert, 'webhook', recipient);
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://webhook.test.com/alerts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining(testAlert.id)
        })
      );
    });

    test('should handle webhook failures', async () => {
      const recipient = { type: 'webhook', url: 'https://webhook.test.com/alerts' };
      
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      
      await service.sendNotification(testAlert, 'webhook', recipient);
      
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        '[PERFORMANCE ALERTS] Webhook notification failed',
        expect.any(Error),
        expect.objectContaining({
          alertId: testAlert.id,
          url: 'https://webhook.test.com/alerts'
        })
      );
    });

    test('should log SMS notifications', async () => {
      const recipient = { type: 'sms', number: '+1234567890' };
      
      await service.sendNotification(testAlert, 'sms', recipient);
      
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        '[PERFORMANCE ALERTS] SMS notification would be sent',
        expect.objectContaining({
          alertId: testAlert.id,
          recipient: '+1234567890'
        })
      );
    });

    test('should log Slack notifications', async () => {
      const recipient = { type: 'slack', url: 'https://hooks.slack.com/test' };
      
      await service.sendNotification(testAlert, 'slack', recipient);
      
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        '[PERFORMANCE ALERTS] Slack notification would be sent',
        expect.objectContaining({
          alertId: testAlert.id,
          webhook: 'https://hooks.slack.com/test'
        })
      );
    });
  });

  describe('Escalation Logic', () => {
    const testAlert = {
      id: 'escalation_test_alert',
      type: 'memory_usage',
      severity: 'critical',
      message: 'Critical memory usage',
      currentValue: 95,
      threshold: 90,
      timestamp: Date.now()
    };

    test('should setup escalation for unacknowledged alerts', async () => {
      await service.processAlert(testAlert);
      
      expect(service.activeEscalations.size).toBe(1);
      expect(global.setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        service.escalationConfig.critical.escalationDelay
      );
    });

    test('should execute escalation when alert is not acknowledged', async () => {
      await service.processAlert(testAlert);
      
      const escalationId = `escalation_${testAlert.id}`;
      const escalation = service.activeEscalations.get(escalationId);
      
      expect(escalation).toBeDefined();
      expect(escalation.level).toBe(0);
      
      // Trigger escalation
      await service.checkEscalation(escalationId);
      
      expect(escalation.level).toBe(1);
      expect(mockLoggingService.logWarning).toHaveBeenCalledWith(
        '[PERFORMANCE ALERTS] Escalating alert',
        expect.objectContaining({
          alertId: testAlert.id,
          escalationLevel: 1
        })
      );
    });

    test('should stop escalation when alert is acknowledged', async () => {
      await service.processAlert(testAlert);
      
      const escalationId = `escalation_${testAlert.id}`;
      
      // Acknowledge the alert
      service.acknowledgeAlert(testAlert.id, 'test_user');
      
      // Try to escalate
      await service.checkEscalation(escalationId);
      
      expect(service.activeEscalations.has(escalationId)).toBe(false);
    });

    test('should reach maximum escalation level', async () => {
      await service.processAlert(testAlert);
      
      const escalationId = `escalation_${testAlert.id}`;
      const escalation = service.activeEscalations.get(escalationId);
      
      // Escalate to maximum level
      for (let i = 0; i < escalation.maxLevel; i++) {
        await service.checkEscalation(escalationId);
      }
      
      expect(escalation.level).toBe(escalation.maxLevel);
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        '[PERFORMANCE ALERTS] Maximum escalations reached',
        null,
        expect.objectContaining({
          alertId: testAlert.id
        })
      );
    });

    test('should send escalation notifications', async () => {
      await service.processAlert(testAlert);
      
      const escalationId = `escalation_${testAlert.id}`;
      const escalation = service.activeEscalations.get(escalationId);
      
      const sendSpy = jest.spyOn(service, 'sendImmediateNotifications');
      
      await service.sendEscalationNotifications(escalation);
      
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('ESCALATED'),
          escalationLevel: expect.any(Number)
        }),
        escalation.config.escalationChannels
      );
    });
  });

  describe('Rate Limiting', () => {
    test('should allow alerts within rate limits', () => {
      const alert = { type: 'cpu_usage', timestamp: Date.now() };
      
      const isLimited = service.isRateLimited(alert);
      
      expect(isLimited).toBe(false);
    });

    test('should rate limit when hourly threshold exceeded', () => {
      service.rateLimiting.maxAlertsPerHour = 2;
      
      // Add alerts to history
      const now = Date.now();
      service.alertHistory = [
        { timestamp: now - 30 * 60 * 1000 }, // 30 minutes ago
        { timestamp: now - 45 * 60 * 1000 }  // 45 minutes ago
      ];
      
      const alert = { type: 'cpu_usage', timestamp: now };
      
      const isLimited = service.isRateLimited(alert);
      
      expect(isLimited).toBe(true);
    });

    test('should rate limit same alert type within 15 minutes', () => {
      service.rateLimiting.maxSameAlertsPer15Min = 2;
      
      // Add same type alerts to history
      const now = Date.now();
      service.alertHistory = [
        { type: 'cpu_usage', timestamp: now - 5 * 60 * 1000 },  // 5 minutes ago
        { type: 'cpu_usage', timestamp: now - 10 * 60 * 1000 }  // 10 minutes ago
      ];
      
      const alert = { type: 'cpu_usage', timestamp: now };
      
      const isLimited = service.isRateLimited(alert);
      
      expect(isLimited).toBe(true);
    });

    test('should not rate limit when disabled', () => {
      service.rateLimiting.enabled = false;
      service.rateLimiting.maxAlertsPerHour = 0; // Would normally block all
      
      const alert = { type: 'cpu_usage', timestamp: Date.now() };
      
      const isLimited = service.isRateLimited(alert);
      
      expect(isLimited).toBe(false);
    });
  });

  describe('Message Formatting', () => {
    const testAlert = {
      id: 'format_test_alert',
      type: 'response_time',
      severity: 'critical',
      message: 'Response time exceeded threshold',
      currentValue: 2500,
      threshold: 2000,
      timestamp: Date.now()
    };

    test('should format alert message correctly', () => {
      const message = service.formatAlertMessage(testAlert);
      
      expect(message).toContain('Performance Alert: Response time exceeded threshold');
      expect(message).toContain('Current: 2500, Threshold: 2000');
      expect(message).toContain(`Alert ID: ${testAlert.id}`);
    });

    test('should format alert subject correctly', () => {
      const subject = service.formatAlertSubject(testAlert);
      
      expect(subject).toBe('[CRITICAL] Performance Alert: response_time');
    });

    test('should generate HTML email content', () => {
      const html = service.generateEmailHTML(testAlert);
      
      expect(html).toContain('Performance Alert');
      expect(html).toContain('CRITICAL');
      expect(html).toContain('Response time exceeded threshold');
      expect(html).toContain('2500');
      expect(html).toContain('2000');
      expect(html).toContain(testAlert.id);
    });

    test('should get correct Slack colors', () => {
      expect(service.getSlackColor('critical')).toBe('danger');
      expect(service.getSlackColor('warning')).toBe('warning');
      expect(service.getSlackColor('info')).toBe('good');
      expect(service.getSlackColor('unknown')).toBe('good');
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should provide alerting statistics', () => {
      // Add some test data
      service.alertHistory = [
        { timestamp: Date.now() - 30 * 60 * 1000 }, // 30 minutes ago
        { timestamp: Date.now() - 2 * 60 * 60 * 1000 }, // 2 hours ago
        { timestamp: Date.now() - 25 * 60 * 60 * 1000 }  // 25 hours ago
      ];
      
      service.activeEscalations.set('test1', {});
      service.activeEscalations.set('test2', {});
      
      const stats = service.getStatistics();
      
      expect(stats.activeEscalations).toBe(2);
      expect(stats.alertHistory.total).toBe(3);
      expect(stats.alertHistory.lastHour).toBe(1);
      expect(stats.alertHistory.lastDay).toBe(2);
      expect(stats.rateLimiting).toBeDefined();
      expect(stats.channels).toBeDefined();
      expect(stats.escalationConfig).toBeDefined();
    });

    test('should add alerts to history correctly', () => {
      const alert = {
        id: 'history_test',
        type: 'memory_usage',
        severity: 'warning',
        timestamp: Date.now()
      };
      
      service.addToHistory(alert);
      
      expect(service.alertHistory.length).toBe(1);
      expect(service.alertHistory[0]).toMatchObject({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        timestamp: alert.timestamp
      });
    });

    test('should limit history size', () => {
      const maxSize = service.maxHistorySize;
      
      // Add more than max size
      for (let i = 0; i < maxSize + 10; i++) {
        service.addToHistory({
          id: `alert_${i}`,
          type: 'test',
          severity: 'info',
          timestamp: Date.now() + i
        });
      }
      
      expect(service.alertHistory.length).toBe(maxSize);
    });
  });

  describe('Error Handling', () => {
    test('should handle email notification errors', async () => {
      const alert = {
        id: 'error_test',
        type: 'test',
        severity: 'critical',
        message: 'Test error handling',
        timestamp: Date.now()
      };
      
      mockEmailService.sendEmail.mockRejectedValueOnce(new Error('SMTP error'));
      
      await service.processAlert(alert);
      
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        '[PERFORMANCE ALERTS] Failed to send email notification',
        expect.any(Error),
        expect.any(Object)
      );
    });

    test('should handle webhook timeout errors', async () => {
      const recipient = { type: 'webhook', url: 'https://slow-webhook.test.com' };
      const alert = { id: 'webhook_timeout_test', severity: 'critical', timestamp: Date.now() };
      
      global.fetch.mockRejectedValueOnce(new Error('Request timeout'));
      
      await service.sendNotification(alert, 'webhook', recipient);
      
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        '[PERFORMANCE ALERTS] Webhook notification failed',
        expect.any(Error),
        expect.any(Object)
      );
    });

    test('should handle malformed alert data', async () => {
      const malformedAlert = {
        // Missing required fields
        severity: 'critical'
      };
      
      await service.processAlert(malformedAlert);
      
      // Should not crash and should handle gracefully
      expect(service.alertHistory.length).toBe(1);
    });
  });
});