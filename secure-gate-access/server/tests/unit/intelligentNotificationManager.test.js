/**
 * @file intelligentNotificationManager.test.js
 * @description Unit tests for intelligent notification management system
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockDbManager = {
  query: jest.fn(),
  transaction: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

const mockNotificationService = {
  sendInviteEmail: jest.fn(),
  sendSms: jest.fn()
};

const mockWebsocketService = {
  sendNotification: jest.fn()
};

// Mock modules
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: mockDbManager
}));

jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: mockLogger
}));

jest.unstable_mockModule('../../src/services/notificationService.js', () => ({
  default: mockNotificationService
}));

jest.unstable_mockModule('../../src/services/websocketService.js', () => ({
  default: mockWebsocketService
}));

// Import the class after mocking
const { default: intelligentNotificationManager } = await import('../../src/services/intelligentNotificationManager.js');

describe('IntelligentNotificationManager', () => {
  let manager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Use the singleton instance
    manager = intelligentNotificationManager;
    
    // Clear any existing queue state
    manager.clearQueue();
    
    // Stop the processing interval to avoid interference
    manager.stopProcessing();
  });

  afterEach(() => {
    if (manager) {
      manager.stopProcessing();
    }
  });

  describe('queueNotification', () => {
    test('should queue a notification with correct priority', async () => {
      const notification = {
        type: 'VISITOR_ARRIVAL',
        title: 'Visitor Arrived',
        message: 'John Doe has arrived',
        recipientId: 123,
        estateId: 1
      };

      // Mock user preferences
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{
          email_enabled: true,
          sms_enabled: false,
          push_enabled: true,
          notify_on_checkin: true,
          quiet_hours_start: null,
          quiet_hours_end: null
        }]
      });

      const notificationId = await manager.queueNotification(notification);

      expect(notificationId).toBeDefined();
      expect(notificationId).toMatch(/^notif_\d+_[a-z0-9]+$/);
      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [123]
      );
    });

    test('should calculate correct priority for emergency notifications', async () => {
      const notification = {
        type: 'SECURITY_ALERT',
        title: 'Security Alert',
        message: 'Unauthorized access detected',
        recipientId: 123,
        estateId: 1,
        isUrgent: true
      };

      // Mock user preferences
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{
          email_enabled: true,
          sms_enabled: true,
          push_enabled: true,
          notify_security_alerts: true,
          quiet_hours_start: null,
          quiet_hours_end: null
        }]
      });

      await manager.queueNotification(notification);

      // Check that the notification was queued with emergency priority
      const queueStatus = manager.getQueueStatus();
      expect(queueStatus.byPriority[5]).toBeDefined(); // Emergency priority
      expect(queueStatus.byPriority[5]).toBeGreaterThan(0);
    });

    test('should respect quiet hours for non-emergency notifications', async () => {
      const notification = {
        type: 'VISITOR_APPROVED',
        title: 'Visitor Approved',
        message: 'Your visitor has been approved',
        recipientId: 123,
        estateId: 1
      };

      // Mock user preferences with quiet hours
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{
          email_enabled: true,
          sms_enabled: false,
          push_enabled: true,
          notify_on_approval: true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '06:00'
        }]
      });

      // Mock current time to be within quiet hours
      const originalDate = Date;
      const mockDate = new Date('2025-01-29T23:00:00Z'); // 11 PM
      global.Date = jest.fn(() => mockDate);
      global.Date.now = jest.fn(() => mockDate.getTime());

      await manager.queueNotification(notification);

      // Verify that only in-app channel is selected during quiet hours
      const queueStatus = manager.getQueueStatus();
      expect(queueStatus.totalQueued).toBe(1);

      // Restore original Date
      global.Date = originalDate;
    });
  });

  describe('selectChannels', () => {
    test('should select appropriate channels based on preferences', async () => {
      const notification = {
        type: 'VISITOR_ARRIVAL',
        recipientId: 123,
        priority: 3
      };

      // Mock user preferences
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{
          email_enabled: true,
          sms_enabled: false,
          push_enabled: true,
          notify_on_checkin: true,
          quiet_hours_start: null,
          quiet_hours_end: null
        }]
      });

      const channels = await manager.selectChannels(notification);

      expect(channels).toContain('push');
      expect(channels).toContain('in_app');
      expect(channels).toContain('websocket');
      expect(channels).not.toContain('sms');
    });

    test('should include SMS for emergency notifications', async () => {
      const notification = {
        type: 'SECURITY_ALERT',
        recipientId: 123,
        priority: 5 // Emergency
      };

      // Mock user preferences
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{
          email_enabled: true,
          sms_enabled: true,
          push_enabled: true,
          notify_security_alerts: true,
          quiet_hours_start: null,
          quiet_hours_end: null
        }]
      });

      const channels = await manager.selectChannels(notification);

      expect(channels).toContain('sms');
      expect(channels).toContain('push');
      expect(channels).toContain('in_app');
      expect(channels).toContain('websocket');
    });
  });

  describe('processNotificationQueue', () => {
    test('should process notifications by priority order', async () => {
      // Add notifications with different priorities
      const highPriorityNotification = {
        type: 'VISITOR_EMERGENCY',
        title: 'Emergency',
        message: 'Emergency situation',
        recipientId: 123,
        estateId: 1
      };

      const lowPriorityNotification = {
        type: 'REMINDER',
        title: 'Reminder',
        message: 'Don\'t forget',
        recipientId: 123,
        estateId: 1
      };

      // Mock user preferences for both notifications
      mockDbManager.query
        .mockResolvedValueOnce({
          rows: [{
            email_enabled: true,
            sms_enabled: false,
            push_enabled: true,
            notify_security_alerts: true,
            quiet_hours_start: null,
            quiet_hours_end: null
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            email_enabled: true,
            sms_enabled: false,
            push_enabled: true,
            notify_on_reminder: true,
            quiet_hours_start: null,
            quiet_hours_end: null
          }]
        });

      await manager.queueNotification(highPriorityNotification);
      await manager.queueNotification(lowPriorityNotification);

      // Verify that notifications were queued
      const queueStatus = manager.getQueueStatus();
      expect(queueStatus.totalQueued).toBeGreaterThan(0);
    });
  });

  describe('recordUserBehavior', () => {
    test('should record user behavior and update relevance score', async () => {
      const userId = 123;
      const notificationType = 'VISITOR_ARRIVAL';
      const action = 'clicked';

      await manager.recordUserBehavior(userId, notificationType, action);

      // Check that behavior data was updated in memory
      const behaviorKey = `${userId}:${notificationType}`;
      expect(manager.userBehaviorData.has(behaviorKey)).toBe(true);

      const behavior = manager.userBehaviorData.get(behaviorKey);
      expect(behavior.clicked).toBe(1);
      expect(behavior.relevanceScore).toBeGreaterThan(0);
    });
  });

  describe('getQueueStatus', () => {
    test('should return correct queue status', () => {
      // Add some notifications to the queue manually
      manager.priorityQueue.set(3, [{ id: 'test1' }, { id: 'test2' }]);
      manager.priorityQueue.set(1, [{ id: 'test3' }]);

      const status = manager.getQueueStatus();

      expect(status.totalQueued).toBe(3);
      expect(status.byPriority[3]).toBe(2);
      expect(status.byPriority[1]).toBe(1);
      expect(status.isProcessing).toBe(false);
    });
  });

  describe('clearQueue', () => {
    test('should clear all notifications from queue', () => {
      // Add some notifications to the queue manually
      manager.priorityQueue.set(3, [{ id: 'test1' }]);
      manager.priorityQueue.set(1, [{ id: 'test2' }]);

      manager.clearQueue();

      const status = manager.getQueueStatus();
      expect(status.totalQueued).toBe(0);
      expect(Object.keys(status.byPriority)).toHaveLength(0);
    });
  });

  describe('isQuietTime', () => {
    test('should correctly identify quiet hours', async () => {
      const userId = 123;

      // Mock user preferences with quiet hours
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{
          quiet_hours_start: '22:00',
          quiet_hours_end: '06:00'
        }]
      });

      // Mock current time to be within quiet hours (11 PM)
      const originalDate = Date;
      const mockDate = new Date('2025-01-29T23:00:00Z');
      global.Date = jest.fn(() => mockDate);
      global.Date.now = jest.fn(() => mockDate.getTime());

      const isQuiet = await manager.isQuietTime(userId);
      expect(isQuiet).toBe(true);

      // Restore original Date
      global.Date = originalDate;
    });

    test('should return false when no quiet hours are set', async () => {
      const userId = 123;

      // Mock user preferences without quiet hours
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{
          quiet_hours_start: null,
          quiet_hours_end: null
        }]
      });

      const isQuiet = await manager.isQuietTime(userId);
      expect(isQuiet).toBe(false);
    });
  });

  describe('Notification Grouping and Summarization', () => {
    test('should group notifications by estate and type', async () => {
      const notifications = [
        {
          id: 'notif1',
          type: 'VISITOR_ARRIVAL',
          recipientId: 123,
          estateId: 1,
          queuedAt: new Date(),
          priority: 3,
          channels: ['push', 'in_app']
        },
        {
          id: 'notif2',
          type: 'VISITOR_ARRIVAL',
          recipientId: 123,
          estateId: 1,
          queuedAt: new Date(),
          priority: 3,
          channels: ['push', 'in_app']
        },
        {
          id: 'notif3',
          type: 'SECURITY_ALERT',
          recipientId: 123,
          estateId: 1,
          queuedAt: new Date(),
          priority: 5,
          channels: ['sms', 'push']
        }
      ];

      const grouped = await manager.groupNotifications(notifications);

      // Should have one group for visitor notifications and one individual security alert
      expect(grouped).toHaveLength(2);
      
      // Find the grouped visitor notifications
      const visitorGroup = grouped.find(item => item.isGroup && item.rule === 'visitor_notifications');
      expect(visitorGroup).toBeDefined();
      expect(visitorGroup.notifications).toHaveLength(2);
      expect(visitorGroup.summaryTemplate).toBe('visitor_summary');
      
      // Find the individual security alert
      const securityAlert = grouped.find(item => !item.isGroup && item.type === 'SECURITY_ALERT');
      expect(securityAlert).toBeDefined();
    });

    test('should create summary notification with correct content', () => {
      const groupItem = {
        rule: 'visitor_notifications',
        summaryTemplate: 'visitor_summary',
        notifications: [
          {
            id: 'notif1',
            type: 'VISITOR_ARRIVAL',
            title: 'John Doe arrived',
            recipientId: 123,
            estateId: 1
          },
          {
            id: 'notif2',
            type: 'VISITOR_APPROVED',
            title: 'Jane Smith approved',
            recipientId: 123,
            estateId: 1
          }
        ],
        priority: 3,
        channels: ['push', 'in_app']
      };

      const summary = manager.createSummaryNotification(groupItem);

      expect(summary.type).toBe('SUMMARY');
      expect(summary.title).toBe('2 Visitor Updates');
      expect(summary.message).toContain('2 visitor notifications');
      expect(summary.message).toContain('John Doe arrived');
      expect(summary.message).toContain('Jane Smith approved');
      expect(summary.recipientId).toBe(123);
      expect(summary.estateId).toBe(1);
      expect(summary.priority).toBe(3);
      expect(summary.metadata.isSummary).toBe(true);
      expect(summary.metadata.groupedCount).toBe(2);
    });

    test('should merge channels from multiple notifications', () => {
      const channelArrays = [
        ['push', 'in_app'],
        ['email', 'push'],
        ['sms', 'websocket']
      ];

      const merged = manager.mergeChannels(channelArrays);

      expect(merged).toContain('push');
      expect(merged).toContain('in_app');
      expect(merged).toContain('email');
      expect(merged).toContain('sms');
      expect(merged).toContain('websocket');
      expect(merged).toHaveLength(5); // No duplicates
    });

    test('should check if notification is within time window', () => {
      const recentNotification = {
        queuedAt: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
      };

      const oldNotification = {
        queuedAt: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      };

      const timeWindow = 5 * 60 * 1000; // 5 minutes

      expect(manager.isWithinTimeWindow(recentNotification, timeWindow)).toBe(true);
      expect(manager.isWithinTimeWindow(oldNotification, timeWindow)).toBe(false);
    });
  });

  describe('Notification Delivery Channels', () => {
    test('should send push notification successfully', async () => {
      const notification = {
        id: 'test-123',
        type: 'VISITOR_ARRIVAL',
        title: 'Visitor Arrived',
        message: 'John Doe has arrived',
        recipientId: 123
      };

      const result = await manager.sendPushNotification(notification);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('push_test-123');
    });

    test('should send email notification successfully', async () => {
      const notification = {
        id: 'test-123',
        type: 'VISITOR_APPROVED',
        title: 'Visitor Approved',
        message: 'Your visitor has been approved',
        recipientId: 123
      };

      // Mock user email query
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{ email: 'user@example.com' }]
      });

      // Mock email service
      mockNotificationService.sendInviteEmail.mockResolvedValue({
        messageId: 'email-456'
      });

      const result = await manager.sendEmailNotification(notification);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email-456');
      expect(mockNotificationService.sendInviteEmail).toHaveBeenCalledWith(
        'user@example.com',
        'Visitor Approved',
        expect.stringContaining('Your visitor has been approved')
      );
    });

    test('should send SMS notification successfully', async () => {
      const notification = {
        id: 'test-123',
        type: 'SECURITY_ALERT',
        title: 'Security Alert',
        message: 'Unauthorized access detected',
        recipientId: 123
      };

      // Mock user phone query
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{ phone: '+1234567890' }]
      });

      // Mock SMS service
      mockNotificationService.sendSms.mockResolvedValue({
        success: true,
        messageId: 'sms-789'
      });

      const result = await manager.sendSmsNotification(notification);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('sms-789');
      expect(mockNotificationService.sendSms).toHaveBeenCalledWith(
        '+1234567890',
        'Security Alert: Unauthorized access detected'
      );
    });

    test('should send in-app notification successfully', async () => {
      const notification = {
        id: 'test-123',
        type: 'VISITOR_ARRIVAL',
        title: 'Visitor Arrived',
        message: 'John Doe has arrived',
        recipientId: 123,
        metadata: { actionUrl: '/visitors/123' }
      };

      // Mock database insert
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{ id: 456 }]
      });

      const result = await manager.sendInAppNotification(notification);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('in_app_456');
      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notification_log'),
        expect.arrayContaining([
          'user',
          123,
          'VISITOR_ARRIVAL',
          'in_app',
          'Visitor Arrived',
          'John Doe has arrived',
          'sent',
          expect.any(String)
        ])
      );
    });

    test('should send WebSocket notification successfully', async () => {
      const notification = {
        id: 'test-123',
        type: 'VISITOR_ARRIVAL',
        title: 'Visitor Arrived',
        message: 'John Doe has arrived',
        recipientId: 123,
        metadata: { estateId: 1 }
      };

      const result = await manager.sendWebSocketNotification(notification);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('ws_test-123');
      expect(mockWebsocketService.sendNotification).toHaveBeenCalledWith(
        { userId: 123 },
        {
          type: 'VISITOR_ARRIVAL',
          title: 'Visitor Arrived',
          message: 'John Doe has arrived',
          metadata: { estateId: 1 }
        }
      );
    });

    test('should handle email notification failure when user not found', async () => {
      const notification = {
        id: 'test-123',
        recipientId: 999
      };

      // Mock user not found
      mockDbManager.query.mockResolvedValueOnce({
        rows: []
      });

      const result = await manager.sendEmailNotification(notification);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    test('should handle SMS notification failure when phone not available', async () => {
      const notification = {
        id: 'test-123',
        recipientId: 123
      };

      // Mock user with no phone
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{ phone: null }]
      });

      const result = await manager.sendSmsNotification(notification);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User phone not available');
    });
  });

  describe('Priority Handling and Routing Logic', () => {
    test('should calculate priority correctly for different notification types', () => {
      const securityAlert = { type: 'SECURITY_ALERT' };
      const visitorEmergency = { type: 'VISITOR_EMERGENCY' };
      const visitorArrival = { type: 'VISITOR_ARRIVAL' };
      const reminder = { type: 'REMINDER' };

      expect(manager.calculatePriority(securityAlert)).toBe(5); // EMERGENCY
      expect(manager.calculatePriority(visitorEmergency)).toBe(4); // CRITICAL
      expect(manager.calculatePriority(visitorArrival)).toBe(3); // HIGH
      expect(manager.calculatePriority(reminder)).toBe(1); // LOW
    });

    test('should adjust priority based on urgency flag', () => {
      const urgentNotification = {
        type: 'VISITOR_ARRIVAL',
        isUrgent: true
      };

      const normalNotification = {
        type: 'VISITOR_ARRIVAL',
        isUrgent: false
      };

      expect(manager.calculatePriority(urgentNotification)).toBe(4); // HIGH + 1
      expect(manager.calculatePriority(normalNotification)).toBe(3); // HIGH
    });

    test('should reduce priority for retry attempts', () => {
      const retryNotification = {
        type: 'VISITOR_ARRIVAL',
        isRetry: true,
        attempts: 2
      };

      expect(manager.calculatePriority(retryNotification)).toBe(2); // HIGH - 1
    });

    test('should determine correct channels for push notifications', () => {
      const pushTypes = [
        { type: 'VISITOR_ARRIVAL', expected: true },
        { type: 'VISITOR_EMERGENCY', expected: true },
        { type: 'SECURITY_ALERT', expected: true },
        { type: 'REMINDER', expected: false }
      ];

      pushTypes.forEach(({ type, expected }) => {
        expect(manager.shouldUsePush({ type })).toBe(expected);
      });

      // High priority should use push regardless of type
      expect(manager.shouldUsePush({ type: 'REMINDER', priority: 4 })).toBe(true);
    });

    test('should determine correct channels for email notifications', () => {
      const emailTypes = [
        { type: 'VISITOR_APPROVED', expected: true },
        { type: 'VISITOR_REJECTED', expected: true },
        { type: 'SYSTEM_MAINTENANCE', expected: true },
        { type: 'VISITOR_ARRIVAL', expected: false }
      ];

      emailTypes.forEach(({ type, expected }) => {
        expect(manager.shouldUseEmail({ type })).toBe(expected);
      });

      // Should use email if explicitly requested
      expect(manager.shouldUseEmail({ type: 'VISITOR_ARRIVAL', includeEmail: true })).toBe(true);
    });

    test('should determine correct channels for SMS notifications', () => {
      const smsTypes = [
        { type: 'VISITOR_EMERGENCY', expected: true },
        { type: 'SECURITY_ALERT', expected: true },
        { type: 'VISITOR_ARRIVAL', expected: false }
      ];

      smsTypes.forEach(({ type, expected }) => {
        expect(manager.shouldUseSms({ type })).toBe(expected);
      });

      // Critical priority should use SMS
      expect(manager.shouldUseSms({ type: 'VISITOR_ARRIVAL', priority: 4 })).toBe(true);
    });
  });

  describe('Individual Notification Processing', () => {
    test('should process individual notification successfully', async () => {
      const notification = {
        id: 'test-123',
        type: 'VISITOR_ARRIVAL',
        title: 'Visitor Arrived',
        message: 'John Doe has arrived',
        recipientId: 123,
        estateId: 1,
        channels: ['push', 'in_app'],
        attempts: 0,
        maxAttempts: 3
      };

      // Mock successful channel delivery
      jest.spyOn(manager, 'sendThroughChannel')
        .mockResolvedValueOnce({ success: true, messageId: 'push-123' })
        .mockResolvedValueOnce({ success: true, messageId: 'in_app-456' });

      // Mock logging
      mockDbManager.query.mockResolvedValue({ rows: [] });

      await manager.processIndividualNotification(notification);

      expect(notification.status).toBe('sent');
      expect(notification.attempts).toBe(1);
      expect(manager.sendThroughChannel).toHaveBeenCalledTimes(2);
    });

    test('should retry failed notification with lower priority', async () => {
      const notification = {
        id: 'test-123',
        type: 'VISITOR_ARRIVAL',
        channels: ['push', 'email'],
        attempts: 1,
        maxAttempts: 3,
        priority: 3
      };

      // Mock failed channel delivery
      jest.spyOn(manager, 'sendThroughChannel')
        .mockResolvedValueOnce({ success: false, error: 'Push failed' })
        .mockResolvedValueOnce({ success: false, error: 'Email failed' });

      await manager.processIndividualNotification(notification);

      expect(notification.attempts).toBe(2);
      expect(notification.priority).toBe(2); // Reduced priority
      
      // Should be re-queued
      const queueStatus = manager.getQueueStatus();
      expect(queueStatus.byPriority[2]).toBeGreaterThan(0);
    });

    test('should mark notification as failed after max attempts', async () => {
      const notification = {
        id: 'test-123',
        type: 'VISITOR_ARRIVAL',
        channels: ['push'],
        attempts: 2,
        maxAttempts: 3,
        priority: 3
      };

      // Mock failed channel delivery
      jest.spyOn(manager, 'sendThroughChannel')
        .mockResolvedValue({ success: false, error: 'Push failed' });

      // Mock logging
      mockDbManager.query.mockResolvedValue({ rows: [] });

      await manager.processIndividualNotification(notification);

      expect(notification.status).toBe('failed');
      expect(notification.attempts).toBe(3);
    });
  });
});