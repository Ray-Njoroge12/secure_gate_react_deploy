/**
 * @file intelligentNotificationService.test.js
 * @description Unit tests for intelligent notification service
 */

import { jest } from '@jest/globals';

// Mock apiClient before importing the service
jest.mock('../../utils/apiClient');

// Mock logger
jest.mock('../../utils/logger');

import intelligentNotificationService from '../../services/intelligentNotificationService';
import apiClient from '../../utils/apiClient';
import logger from '../../utils/logger';

// Cast to jest mocks
const mockApiClient = apiClient;
const mockLogger = logger;

describe('IntelligentNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset service state
    intelligentNotificationService.listeners = [];
    intelligentNotificationService.behaviorQueue = [];
    intelligentNotificationService.preferences = null;
    intelligentNotificationService.analytics = null;
    intelligentNotificationService.isOnline = true;

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    // Mock Notification API
    global.Notification = {
      permission: 'granted',
      requestPermission: jest.fn(() => Promise.resolve('granted'))
    };

    // Mock window methods
    global.window = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };

    global.document = {
      addEventListener: jest.fn(),
      hidden: false
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Notification Queueing', () => {
    test('queues notification successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { notificationId: 'test-123' }
        }
      };
      
      mockApiClient.post.mockResolvedValue(mockResponse);

      const notification = {
        type: 'VISITOR_ARRIVAL',
        title: 'Test Notification',
        message: 'Test message',
        recipientId: 'user-123'
      };

      const result = await intelligentNotificationService.queueNotification(notification);

      expect(mockApiClient.post).toHaveBeenCalledWith('/intelligent-notifications/queue', notification);
      expect(result).toBe('test-123');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Notification queued successfully',
        expect.objectContaining({
          notificationId: 'test-123',
          type: 'VISITOR_ARRIVAL'
        })
      );
    });

    test('handles queue notification failure', async () => {
      const error = new Error('Queue failed');
      mockApiClient.post.mockRejectedValue(error);

      const notification = {
        type: 'VISITOR_ARRIVAL',
        title: 'Test Notification',
        message: 'Test message',
        recipientId: 'user-123'
      };

      await expect(intelligentNotificationService.queueNotification(notification))
        .rejects.toThrow('Queue failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to queue notification', error);
    });

    test('handles API error response', async () => {
      const mockResponse = {
        data: {
          success: false,
          error: 'Invalid notification type'
        }
      };
      
      mockApiClient.post.mockResolvedValue(mockResponse);

      const notification = {
        type: 'INVALID_TYPE',
        title: 'Test Notification',
        message: 'Test message',
        recipientId: 'user-123'
      };

      await expect(intelligentNotificationService.queueNotification(notification))
        .rejects.toThrow('Invalid notification type');
    });
  });

  describe('Preferences Management', () => {
    test('gets preferences successfully', async () => {
      const mockPreferences = {
        preferences: {
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00'
        },
        behavior: [
          {
            notificationType: 'VISITOR_ARRIVAL',
            relevanceScore: 0.8
          }
        ]
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockPreferences
        }
      };
      
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await intelligentNotificationService.getPreferences();

      expect(mockApiClient.get).toHaveBeenCalledWith('/intelligent-notifications/preferences');
      expect(result).toEqual(mockPreferences);
      expect(intelligentNotificationService.preferences).toEqual(mockPreferences);
    });

    test('updates preferences successfully', async () => {
      const updatedPreferences = {
        emailEnabled: false,
        smsEnabled: true,
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00'
      };

      const mockResponse = {
        data: {
          success: true,
          data: updatedPreferences
        }
      };
      
      mockApiClient.put.mockResolvedValue(mockResponse);

      const result = await intelligentNotificationService.updatePreferences(updatedPreferences);

      expect(mockApiClient.put).toHaveBeenCalledWith('/intelligent-notifications/preferences', updatedPreferences);
      expect(result).toEqual(updatedPreferences);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Notification preferences updated',
        expect.objectContaining({
          quietHours: '23:00-07:00'
        })
      );
    });

    test('handles preferences update failure', async () => {
      const error = new Error('Update failed');
      mockApiClient.put.mockRejectedValue(error);

      const preferences = { emailEnabled: false };

      await expect(intelligentNotificationService.updatePreferences(preferences))
        .rejects.toThrow('Update failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to update notification preferences', error);
    });
  });

  describe('Behavior Tracking', () => {
    test('tracks behavior locally', () => {
      intelligentNotificationService.trackBehavior('notif-123', 'VISITOR_ARRIVAL', 'clicked');

      expect(intelligentNotificationService.behaviorQueue).toHaveLength(1);
      expect(intelligentNotificationService.behaviorQueue[0]).toMatchObject({
        notificationId: 'notif-123',
        notificationType: 'VISITOR_ARRIVAL',
        action: 'clicked'
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Behavior tracked',
        expect.objectContaining({
          notificationId: 'notif-123',
          action: 'clicked'
        })
      );
    });

    test('syncs behavior queue when online', async () => {
      mockApiClient.post.mockResolvedValue({ data: { success: true } });

      // Add behavior to queue
      intelligentNotificationService.trackBehavior('notif-123', 'VISITOR_ARRIVAL', 'clicked');
      intelligentNotificationService.trackBehavior('notif-456', 'SECURITY_ALERT', 'dismissed');

      await intelligentNotificationService.syncBehaviorQueue();

      expect(mockApiClient.post).toHaveBeenCalledTimes(2);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/intelligent-notifications/behavior/track',
        expect.objectContaining({
          notificationId: 'notif-123',
          action: 'clicked'
        })
      );

      expect(intelligentNotificationService.behaviorQueue).toHaveLength(0);
      expect(mockLogger.debug).toHaveBeenCalledWith('Behavior queue synced', { count: 2 });
    });

    test('handles behavior sync failure', async () => {
      const error = new Error('Sync failed');
      mockApiClient.post.mockRejectedValue(error);

      // Add behavior to queue
      intelligentNotificationService.trackBehavior('notif-123', 'VISITOR_ARRIVAL', 'clicked');

      await intelligentNotificationService.syncBehaviorQueue();

      // Should re-add failed items to queue
      expect(intelligentNotificationService.behaviorQueue).toHaveLength(1);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to sync behavior queue', error);
    });

    test('does not sync when offline', async () => {
      intelligentNotificationService.isOnline = false;

      intelligentNotificationService.trackBehavior('notif-123', 'VISITOR_ARRIVAL', 'clicked');
      await intelligentNotificationService.syncBehaviorQueue();

      expect(mockApiClient.post).not.toHaveBeenCalled();
      expect(intelligentNotificationService.behaviorQueue).toHaveLength(1);
    });
  });

  describe('Analytics and Insights', () => {
    test('gets analytics successfully', async () => {
      const mockAnalytics = {
        summary: { totalNotifications: 100 },
        engagement: [{ notificationType: 'VISITOR_ARRIVAL', engagementRate: '75.0' }]
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockAnalytics
        }
      };
      
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await intelligentNotificationService.getAnalytics(30);

      expect(mockApiClient.get).toHaveBeenCalledWith('/intelligent-notifications/analytics?days=30');
      expect(result).toEqual(mockAnalytics);
      expect(intelligentNotificationService.analytics).toEqual(mockAnalytics);
    });

    test('gets insights successfully', async () => {
      const mockInsights = {
        recommendations: [
          {
            type: 'engagement',
            priority: 'high',
            title: 'Low Engagement',
            description: 'Some notifications have low engagement'
          }
        ]
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockInsights
        }
      };
      
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await intelligentNotificationService.getInsights(7);

      expect(mockApiClient.get).toHaveBeenCalledWith('/intelligent-notifications/insights?days=7');
      expect(result).toEqual(mockInsights);
    });

    test('handles analytics failure', async () => {
      const error = new Error('Analytics failed');
      mockApiClient.get.mockRejectedValue(error);

      await expect(intelligentNotificationService.getAnalytics())
        .rejects.toThrow('Analytics failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get notification analytics', error);
    });
  });

  describe('Quiet Hours Logic', () => {
    beforeEach(() => {
      intelligentNotificationService.preferences = {
        preferences: {
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00'
        }
      };
    });

    test('detects quiet time correctly for overnight hours', () => {
      // Mock current time as 2:00 AM (within quiet hours)
      const mockDate = new Date();
      mockDate.setHours(2, 0, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const isQuiet = intelligentNotificationService.isQuietTime();
      expect(isQuiet).toBe(true);

      global.Date.mockRestore();
    });

    test('detects non-quiet time correctly', () => {
      // Mock current time as 10:00 AM (outside quiet hours)
      const mockDate = new Date();
      mockDate.setHours(10, 0, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const isQuiet = intelligentNotificationService.isQuietTime();
      expect(isQuiet).toBe(false);

      global.Date.mockRestore();
    });

    test('handles same-day quiet hours', () => {
      intelligentNotificationService.preferences.preferences = {
        quietHoursStart: '12:00',
        quietHoursEnd: '14:00'
      };

      // Mock current time as 13:00 (within same-day quiet hours)
      const mockDate = new Date();
      mockDate.setHours(13, 0, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const isQuiet = intelligentNotificationService.isQuietTime();
      expect(isQuiet).toBe(true);

      global.Date.mockRestore();
    });

    test('returns false when no quiet hours set', () => {
      intelligentNotificationService.preferences = {
        preferences: {
          quietHoursStart: null,
          quietHoursEnd: null
        }
      };

      const isQuiet = intelligentNotificationService.isQuietTime();
      expect(isQuiet).toBe(false);
    });
  });

  describe('Relevance Score Calculation', () => {
    beforeEach(() => {
      intelligentNotificationService.preferences = {
        behavior: [
          {
            notificationType: 'VISITOR_ARRIVAL',
            relevanceScore: 0.8
          },
          {
            notificationType: 'SECURITY_ALERT',
            relevanceScore: 0.9
          }
        ]
      };
    });

    test('returns correct relevance score for known type', () => {
      const score = intelligentNotificationService.getRelevanceScore('VISITOR_ARRIVAL');
      expect(score).toBe(0.8);
    });

    test('returns default relevance score for unknown type', () => {
      const score = intelligentNotificationService.getRelevanceScore('UNKNOWN_TYPE');
      expect(score).toBe(1.0);
    });

    test('returns default when no behavior data', () => {
      intelligentNotificationService.preferences = null;
      
      const score = intelligentNotificationService.getRelevanceScore('VISITOR_ARRIVAL');
      expect(score).toBe(1.0);
    });
  });

  describe('Channel Recommendations', () => {
    beforeEach(() => {
      intelligentNotificationService.preferences = {
        preferences: {
          pushEnabled: true,
          emailEnabled: true,
          smsEnabled: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00'
        },
        behavior: [
          {
            notificationType: 'VISITOR_ARRIVAL',
            relevanceScore: 0.8
          }
        ]
      };
    });

    test('recommends all channels for high relevance during normal hours', () => {
      // Mock current time as 10:00 AM (not quiet time)
      const mockDate = new Date();
      mockDate.setHours(10, 0, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const channels = intelligentNotificationService.getRecommendedChannels('VISITOR_ARRIVAL');
      
      expect(channels).toContain('push');
      expect(channels).toContain('email');
      expect(channels).toContain('sms');
      expect(channels).toContain('in_app');

      global.Date.mockRestore();
    });

    test('recommends only in-app during quiet hours for low relevance', () => {
      // Mock current time as 2:00 AM (quiet time)
      const mockDate = new Date();
      mockDate.setHours(2, 0, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      // Set low relevance
      intelligentNotificationService.preferences.behavior[0].relevanceScore = 0.5;

      const channels = intelligentNotificationService.getRecommendedChannels('VISITOR_ARRIVAL');
      
      expect(channels).toEqual(['in_app']);

      global.Date.mockRestore();
    });

    test('includes high-relevance channels during quiet hours', () => {
      // Mock current time as 2:00 AM (quiet time)
      const mockDate = new Date();
      mockDate.setHours(2, 0, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      // Set high relevance
      intelligentNotificationService.preferences.behavior[0].relevanceScore = 0.9;

      const channels = intelligentNotificationService.getRecommendedChannels('VISITOR_ARRIVAL');
      
      expect(channels).toContain('push');
      expect(channels).toContain('in_app');

      global.Date.mockRestore();
    });

    test('returns default channels when no preferences', () => {
      intelligentNotificationService.preferences = null;

      const channels = intelligentNotificationService.getRecommendedChannels('VISITOR_ARRIVAL');
      
      expect(channels).toEqual(['push', 'in_app']);
    });
  });

  describe('Notification Display Logic', () => {
    beforeEach(() => {
      intelligentNotificationService.preferences = {
        preferences: {
          notifyOnCheckin: true,
          notifyOnApproval: true,
          notifySecurityAlerts: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00'
        },
        behavior: [
          {
            notificationType: 'VISITOR_ARRIVAL',
            relevanceScore: 0.8
          }
        ]
      };
    });

    test('shows notification when all conditions are met', () => {
      const notification = {
        type: 'VISITOR_ARRIVAL',
        priority: 3
      };

      // Mock current time as 10:00 AM (not quiet time)
      const mockDate = new Date();
      mockDate.setHours(10, 0, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const shouldShow = intelligentNotificationService.shouldShowNotification(notification);
      expect(shouldShow).toBe(true);

      global.Date.mockRestore();
    });

    test('hides notification when type is disabled', () => {
      intelligentNotificationService.preferences.preferences.notifyOnCheckin = false;

      const notification = {
        type: 'VISITOR_ARRIVAL',
        priority: 3
      };

      const shouldShow = intelligentNotificationService.shouldShowNotification(notification);
      expect(shouldShow).toBe(false);
    });

    test('shows emergency notifications during quiet hours', () => {
      const notification = {
        type: 'SECURITY_ALERT',
        priority: 5 // Emergency
      };

      // Mock current time as 2:00 AM (quiet time)
      const mockDate = new Date();
      mockDate.setHours(2, 0, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const shouldShow = intelligentNotificationService.shouldShowNotification(notification);
      expect(shouldShow).toBe(true);

      global.Date.mockRestore();
    });

    test('hides low-priority notifications during quiet hours', () => {
      const notification = {
        type: 'VISITOR_ARRIVAL',
        priority: 2 // Normal priority
      };

      // Mock current time as 2:00 AM (quiet time)
      const mockDate = new Date();
      mockDate.setHours(2, 0, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const shouldShow = intelligentNotificationService.shouldShowNotification(notification);
      expect(shouldShow).toBe(false);

      global.Date.mockRestore();
    });

    test('hides notifications with very low relevance', () => {
      intelligentNotificationService.preferences.behavior[0].relevanceScore = 0.1;

      const notification = {
        type: 'VISITOR_ARRIVAL',
        priority: 3
      };

      const shouldShow = intelligentNotificationService.shouldShowNotification(notification);
      expect(shouldShow).toBe(false);
    });

    test('shows notification when no preferences available', () => {
      intelligentNotificationService.preferences = null;

      const notification = {
        type: 'VISITOR_ARRIVAL',
        priority: 3
      };

      const shouldShow = intelligentNotificationService.shouldShowNotification(notification);
      expect(shouldShow).toBe(true);
    });
  });

  describe('Event Subscription', () => {
    test('subscribes and unsubscribes to events', () => {
      const callback = jest.fn();
      
      const unsubscribe = intelligentNotificationService.subscribe(callback);
      
      expect(intelligentNotificationService.listeners).toContain(callback);
      
      unsubscribe();
      
      expect(intelligentNotificationService.listeners).not.toContain(callback);
    });

    test('emits events to all listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      intelligentNotificationService.subscribe(callback1);
      intelligentNotificationService.subscribe(callback2);
      
      const eventData = { test: 'data' };
      intelligentNotificationService.emit('test_event', eventData);
      
      expect(callback1).toHaveBeenCalledWith('test_event', eventData);
      expect(callback2).toHaveBeenCalledWith('test_event', eventData);
    });

    test('handles listener errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Listener error');
      });
      const goodCallback = jest.fn();
      
      intelligentNotificationService.subscribe(errorCallback);
      intelligentNotificationService.subscribe(goodCallback);
      
      intelligentNotificationService.emit('test_event', {});
      
      expect(errorCallback).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Error in notification listener', expect.any(Error));
    });
  });

  describe('Cache Management', () => {
    test('returns cached preferences', () => {
      const preferences = { test: 'preferences' };
      intelligentNotificationService.preferences = preferences;
      
      const cached = intelligentNotificationService.getCachedPreferences();
      expect(cached).toBe(preferences);
    });

    test('returns cached analytics', () => {
      const analytics = { test: 'analytics' };
      intelligentNotificationService.analytics = analytics;
      
      const cached = intelligentNotificationService.getCachedAnalytics();
      expect(cached).toBe(analytics);
    });

    test('clears cache', () => {
      intelligentNotificationService.preferences = { test: 'preferences' };
      intelligentNotificationService.analytics = { test: 'analytics' };
      
      intelligentNotificationService.clearCache();
      
      expect(intelligentNotificationService.preferences).toBeNull();
      expect(intelligentNotificationService.analytics).toBeNull();
    });
  });

  describe('Notification History and Export', () => {
    test('gets notification history with filters', async () => {
      const mockHistory = {
        notifications: [
          {
            id: 'notif-1',
            type: 'VISITOR_ARRIVAL',
            title: 'Visitor Arrived',
            status: 'sent',
            createdAt: '2025-01-29T10:00:00Z'
          }
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 100
        }
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockHistory
        }
      };
      
      mockApiClient.post.mockResolvedValue(mockResponse);

      const filters = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        type: 'VISITOR_ARRIVAL',
        status: 'sent'
      };

      const result = await intelligentNotificationService.getNotificationHistory(filters);

      expect(mockApiClient.post).toHaveBeenCalledWith('/intelligent-notifications/history', {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        search: undefined,
        type: 'VISITOR_ARRIVAL',
        status: 'sent',
        channel: 'all',
        limit: 100,
        offset: 0
      });
      expect(result).toEqual(mockHistory);
    });

    test('exports notification history as CSV', async () => {
      const csvData = 'id,type,title,status\nnotif-1,VISITOR_ARRIVAL,Visitor Arrived,sent';
      
      mockApiClient.get.mockResolvedValue({ data: csvData });

      const filters = { type: 'VISITOR_ARRIVAL' };
      const result = await intelligentNotificationService.exportNotificationHistory(filters, 'csv');

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/intelligent-notifications/export'),
        { responseType: 'text' }
      );
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('text/csv');
    });

    test('exports notification history as JSON', async () => {
      const jsonData = { notifications: [] };
      
      mockApiClient.get.mockResolvedValue({ data: jsonData });

      const result = await intelligentNotificationService.exportNotificationHistory({}, 'json');

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/intelligent-notifications/export'),
        { responseType: 'json' }
      );
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/json');
    });
  });

  describe('Behavior Learning and Relevance', () => {
    test('updates behavior learning successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { totalUpdated: 5 }
        }
      };
      
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await intelligentNotificationService.updateBehaviorLearning(true);

      expect(mockApiClient.post).toHaveBeenCalledWith('/intelligent-notifications/behavior/learn', {
        forceRecalculation: true
      });
      expect(result.totalUpdated).toBe(5);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Behavior learning updated',
        expect.objectContaining({
          updatedCount: 5
        })
      );
    });

    test('gets relevance score for notification type', async () => {
      const mockRelevance = {
        notificationType: 'VISITOR_ARRIVAL',
        relevanceScore: 0.85,
        behaviorData: {
          deliveredCount: 10,
          clickedCount: 8,
          dismissedCount: 1
        }
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockRelevance
        }
      };
      
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await intelligentNotificationService.getRelevanceScore('VISITOR_ARRIVAL');

      expect(mockApiClient.get).toHaveBeenCalledWith('/intelligent-notifications/relevance/VISITOR_ARRIVAL');
      expect(result).toEqual(mockRelevance);
    });
  });

  describe('System Administration (Admin Only)', () => {
    test('gets system health status', async () => {
      const mockHealth = {
        queueStatus: { totalQueued: 5 },
        processingStatus: { isProcessing: true },
        channelHealth: {
          push: 'healthy',
          email: 'healthy',
          sms: 'degraded'
        }
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockHealth
        }
      };
      
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await intelligentNotificationService.getSystemHealth();

      expect(mockApiClient.get).toHaveBeenCalledWith('/intelligent-notifications/system/health');
      expect(result).toEqual(mockHealth);
    });

    test('gets queue status', async () => {
      const mockQueueStatus = {
        totalQueued: 10,
        byPriority: {
          5: 2, // Emergency
          4: 1, // Critical
          3: 4, // High
          2: 2, // Normal
          1: 1  // Low
        },
        isProcessing: true
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockQueueStatus
        }
      };
      
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await intelligentNotificationService.getQueueStatus();

      expect(mockApiClient.get).toHaveBeenCalledWith('/intelligent-notifications/queue/status');
      expect(result).toEqual(mockQueueStatus);
    });

    test('clears notification queue', async () => {
      const mockResponse = {
        data: {
          success: true
        }
      };
      
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await intelligentNotificationService.clearQueue();

      expect(mockApiClient.post).toHaveBeenCalledWith('/intelligent-notifications/queue/clear');
      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Notification queue cleared');
    });
  });

  describe('Browser Notification Integration', () => {
    beforeEach(() => {
      // Mock Notification constructor
      global.Notification = jest.fn().mockImplementation((title, options) => ({
        title,
        ...options,
        onclick: null,
        close: jest.fn()
      }));
      
      global.Notification.permission = 'granted';
      global.Notification.requestPermission = jest.fn(() => Promise.resolve('granted'));
    });

    test('requests notification permission successfully', async () => {
      global.Notification.permission = 'default';
      global.Notification.requestPermission = jest.fn(() => Promise.resolve('granted'));

      const permission = await intelligentNotificationService.requestPermission();

      expect(permission).toBe('granted');
      expect(global.Notification.requestPermission).toHaveBeenCalled();
    });

    test('returns existing permission when already granted', async () => {
      global.Notification.permission = 'granted';

      const permission = await intelligentNotificationService.requestPermission();

      expect(permission).toBe('granted');
      expect(global.Notification.requestPermission).not.toHaveBeenCalled();
    });

    test('returns denied when permission is denied', async () => {
      global.Notification.permission = 'denied';

      const permission = await intelligentNotificationService.requestPermission();

      expect(permission).toBe('denied');
    });

    test('returns unsupported when Notification API not available', async () => {
      delete global.Notification;

      const permission = await intelligentNotificationService.requestPermission();

      expect(permission).toBe('unsupported');
    });

    test('shows browser notification for incoming notification', async () => {
      const notification = {
        id: 'test-123',
        type: 'VISITOR_ARRIVAL',
        title: 'Visitor Arrived',
        message: 'John Doe has arrived',
        priority: 3,
        metadata: { actionUrl: '/visitors/123' }
      };

      // Set up preferences to show notification
      intelligentNotificationService.preferences = {
        preferences: { notifyOnCheckin: true },
        behavior: [{ notificationType: 'VISITOR_ARRIVAL', relevanceScore: 0.8 }]
      };

      const mockBrowserNotification = {
        onclick: null,
        close: jest.fn()
      };
      
      global.Notification.mockReturnValue(mockBrowserNotification);

      await intelligentNotificationService.showBrowserNotification(notification);

      expect(global.Notification).toHaveBeenCalledWith('Visitor Arrived', {
        body: 'John Doe has arrived',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'test-123',
        requireInteraction: false,
        silent: false
      });
    });

    test('handles incoming notification and tracks behavior', () => {
      const notification = {
        id: 'test-123',
        type: 'VISITOR_ARRIVAL',
        title: 'Visitor Arrived',
        message: 'John Doe has arrived',
        priority: 3
      };

      // Set up preferences to show notification
      intelligentNotificationService.preferences = {
        preferences: { notifyOnCheckin: true },
        behavior: [{ notificationType: 'VISITOR_ARRIVAL', relevanceScore: 0.8 }]
      };

      const emitSpy = jest.spyOn(intelligentNotificationService, 'emit');
      const showBrowserNotificationSpy = jest.spyOn(intelligentNotificationService, 'showBrowserNotification').mockImplementation();

      intelligentNotificationService.handleIncomingNotification(notification);

      expect(intelligentNotificationService.behaviorQueue).toHaveLength(1);
      expect(intelligentNotificationService.behaviorQueue[0]).toMatchObject({
        notificationId: 'test-123',
        notificationType: 'VISITOR_ARRIVAL',
        action: 'delivered'
      });

      expect(emitSpy).toHaveBeenCalledWith('notification_received', notification);
      expect(showBrowserNotificationSpy).toHaveBeenCalledWith(notification);
    });
  });

  describe('Test Notifications', () => {
    test('sends test notification successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { notificationId: 'test-456' }
        }
      };
      
      mockApiClient.post.mockResolvedValue(mockResponse);

      const testData = {
        title: 'Custom Test',
        message: 'Custom test message'
      };

      const result = await intelligentNotificationService.sendTestNotification(testData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/intelligent-notifications/test', testData);
      expect(result).toBe('test-456');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Test notification sent',
        expect.objectContaining({
          notificationId: 'test-456'
        })
      );
    });

    test('handles test notification failure', async () => {
      const error = new Error('Test failed');
      mockApiClient.post.mockRejectedValue(error);

      await expect(intelligentNotificationService.sendTestNotification())
        .rejects.toThrow('Test failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to send test notification', error);
    });
  });
});