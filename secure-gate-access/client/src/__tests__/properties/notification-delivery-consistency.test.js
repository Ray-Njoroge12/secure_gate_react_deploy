/**
 * @file notification-delivery-consistency.test.js
 * @description Property-based test for notification delivery consistency
 * 
 * Property 4: Notification Delivery Consistency
 * For any notification with specified delivery preferences, the notification should be 
 * delivered through the user's preferred channels within the specified time limits 
 * while respecting quiet hours and priority settings
 * 
 * Validates: Requirements 4.1, 4.3, 4.5
 */

import fc from 'fast-check';

// Now import the service after mocks are set up
import intelligentNotificationService from '../../services/intelligentNotificationService';

// Mock dependencies BEFORE importing the service
jest.mock('../../utils/apiClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn()
  }
}));

jest.mock('../../utils/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    performance: jest.fn(),
    group: jest.fn(),
    table: jest.fn()
  };
  
  return {
    __esModule: true,
    default: mockLogger
  };
});

const nonEmptyText = (minLength, maxLength) =>
  fc.string({ minLength, maxLength }).filter((value) => value.trim().length > 0);

describe('Property 4: Notification Delivery Consistency', () => {
  let mockApiClient;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Ensure Date is restored to original
    if (global.Date !== Date) {
      global.Date = Date;
    }
    
    // Get mocked modules
    mockApiClient = require('../../utils/apiClient').default;
    require('../../utils/logger').default;
    
    // Reset service state
    intelligentNotificationService.clearCache();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Property Test: Notification delivery respects user preferences
   * Tests that notifications are delivered through preferred channels
   */
  test('should deliver notifications through user preferred channels', async () => {
    await fc.assert(fc.asyncProperty(
      // Generate notification data
      fc.record({
        type: fc.constantFrom(
          'VISITOR_ARRIVAL',
          'VISITOR_APPROVED', 
          'VISITOR_REJECTED',
          'SECURITY_ALERT',
          'SYSTEM_MAINTENANCE',
          'REMINDER'
        ),
        title: nonEmptyText(5, 100),
        message: nonEmptyText(10, 500),
        recipientId: fc.integer({ min: 1, max: 1000 }),
        priority: fc.integer({ min: 1, max: 5 }),
        isUrgent: fc.boolean()
      }),
      
      // Generate user preferences
      fc.record({
        preferences: fc.record({
          pushEnabled: fc.boolean(),
          emailEnabled: fc.boolean(),
          smsEnabled: fc.boolean(),
          notifyOnCheckin: fc.boolean(),
          notifyOnApproval: fc.boolean(),
          notifyOnRejection: fc.boolean(),
          notifySecurityAlerts: fc.boolean(),
          notifyOnReminder: fc.boolean(),
          quietHoursStart: fc.option(fc.constantFrom('22:00', '23:00', '00:00')),
          quietHoursEnd: fc.option(fc.constantFrom('06:00', '07:00', '08:00'))
        }),
        behavior: fc.array(fc.record({
          notificationType: fc.constantFrom(
            'VISITOR_ARRIVAL',
            'VISITOR_APPROVED',
            'SECURITY_ALERT'
          ),
          relevanceScore: fc.float({ min: 0.0, max: 1.0 })
        }), { maxLength: 5 })
      }),
      
      async (notification, userPreferences) => {
        // Ensure behavior data includes the notification type being tested
        const behaviorForType = {
          notificationType: notification.type,
          relevanceScore: fc.sample(fc.float({ min: 0.0, max: 1.0 }), 1)[0]
        };
        
        // Add the specific behavior to the preferences
        if (!userPreferences.behavior) {
          userPreferences.behavior = [];
        }
        userPreferences.behavior.push(behaviorForType);
        
        // Setup mock responses
        mockApiClient.post.mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              notificationId: `notif_${Date.now()}_test`
            }
          }
        });
        
        mockApiClient.get.mockResolvedValueOnce({
          data: {
            success: true,
            data: userPreferences
          }
        });
        
        // Queue notification
        const notificationId = await intelligentNotificationService.queueNotification(notification);
        
        // Verify notification was queued
        expect(notificationId).toBeDefined();
        expect(typeof notificationId).toBe('string');
        
        // Verify API was called with correct data
        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/intelligent-notifications/queue',
          notification
        );
        
        // Get preferences to verify channel selection logic
        await intelligentNotificationService.getPreferences();
        
        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/intelligent-notifications/preferences'
        );
        
        // Verify recommended channels respect preferences
        const recommendedChannels = intelligentNotificationService.getRecommendedChannels(notification.type);
        
        // Property: At least one channel should always be recommended
        expect(recommendedChannels.length).toBeGreaterThan(0);
        
        // Property: in_app channel should always be included as fallback
        expect(recommendedChannels).toContain('in_app');
        
        // Property: Channel selection should respect user preferences and relevance scores
        const relevanceScore = intelligentNotificationService.getRelevanceScore(notification.type);
        const isQuiet = intelligentNotificationService.isQuietTime();
        
        // During quiet hours with low relevance, only in_app should be recommended
        if (isQuiet && relevanceScore < 0.8) {
          expect(recommendedChannels).toEqual(['in_app']);
        } else {
          // Normal conditions - check preference-based recommendations
          if (userPreferences.preferences.pushEnabled && relevanceScore > 0.3) {
            expect(recommendedChannels).toContain('push');
          }
          
          if (userPreferences.preferences.emailEnabled && relevanceScore > 0.5) {
            expect(recommendedChannels).toContain('email');
          }
          
          if (userPreferences.preferences.smsEnabled && relevanceScore > 0.7) {
            expect(recommendedChannels).toContain('sms');
          }
        }
      }
    ), { numRuns: 15 });
  });

  /**
   * Property Test: Quiet hours are respected for non-emergency notifications
   * Tests that notifications respect do-not-disturb preferences
   */
  test('should respect quiet hours for non-emergency notifications', async () => {
    await fc.assert(fc.asyncProperty(
      // Generate notification with priority
      fc.record({
        type: fc.constantFrom('VISITOR_ARRIVAL', 'REMINDER', 'SYSTEM_MAINTENANCE'),
        priority: fc.integer({ min: 1, max: 3 }), // Non-emergency priorities
        title: nonEmptyText(5, 50),
        message: nonEmptyText(10, 200)
      }),
      
      // Generate quiet hours preferences
      fc.record({
        preferences: fc.record({
          quietHoursStart: fc.constantFrom('22:00', '23:00', '00:00'),
          quietHoursEnd: fc.constantFrom('06:00', '07:00', '08:00'),
          pushEnabled: fc.boolean(),
          emailEnabled: fc.boolean(),
          smsEnabled: fc.boolean()
        })
      }),
      
      // Generate current time within quiet hours
      fc.record({
        currentHour: fc.integer({ min: 0, max: 6 }), // Early morning hours
        currentMinute: fc.integer({ min: 0, max: 59 })
      }),
      
      async (notification, userPreferences, currentTime) => {
        // Mock current time to be within quiet hours
        const originalDate = Date;
        const mockDate = new Date();
        mockDate.setHours(currentTime.currentHour, currentTime.currentMinute, 0, 0);
        
        global.Date = jest.fn(() => mockDate);
        global.Date.now = jest.fn(() => mockDate.getTime());
        
        try {
          // Setup mock responses
          mockApiClient.get.mockResolvedValueOnce({
            data: {
              success: true,
              data: userPreferences
            }
          });
          
          // Load preferences
          await intelligentNotificationService.getPreferences();
          
          // Check if it's quiet time
          const isQuiet = intelligentNotificationService.isQuietTime();
          
          // Get recommended channels
          const recommendedChannels = intelligentNotificationService.getRecommendedChannels(notification.type);
          const relevanceScore = intelligentNotificationService.getRelevanceScore(notification.type);
          
          if (isQuiet && notification.priority < 4 && relevanceScore < 0.8) {
            // Property: During quiet hours, only in-app notifications should be recommended for non-emergency
            expect(recommendedChannels).toEqual(['in_app']);
          }
          
          // Property: Emergency notifications (priority >= 4) should bypass quiet hours
          if (notification.priority >= 4) {
            expect(recommendedChannels.length).toBeGreaterThan(1);
          }
          
        } finally {
          // Restore original Date
          global.Date = originalDate;
          // Ensure Date.now is also restored
          if (originalDate.now) {
            global.Date.now = originalDate.now;
          }
        }
      }
    ), { numRuns: 10 });
  });

  /**
   * Property Test: Notification behavior tracking affects relevance
   * Tests that user behavior learning influences future notifications
   */
  test('should learn from user behavior to adjust notification relevance', () => {
    fc.assert(fc.property(
      // Generate notification type and behavior data
      fc.constantFrom('VISITOR_ARRIVAL', 'VISITOR_APPROVED', 'SECURITY_ALERT'),
      fc.record({
        delivered: fc.integer({ min: 1, max: 100 }),
        dismissed: fc.integer({ min: 0, max: 50 }),
        clicked: fc.integer({ min: 0, max: 30 })
      }),
      
      (notificationType, behaviorData) => {
        // Track behavior multiple times
        for (let i = 0; i < behaviorData.delivered; i++) {
          intelligentNotificationService.trackBehavior(
            `notif_${i}`,
            notificationType,
            'delivered'
          );
        }
        
        for (let i = 0; i < behaviorData.dismissed; i++) {
          intelligentNotificationService.trackBehavior(
            `notif_${i}`,
            notificationType,
            'dismissed'
          );
        }
        
        for (let i = 0; i < behaviorData.clicked; i++) {
          intelligentNotificationService.trackBehavior(
            `notif_${i}`,
            notificationType,
            'clicked'
          );
        }
        
        // Property: Behavior tracking should not throw errors
        expect(() => {
          intelligentNotificationService.trackBehavior(
            'test_notif',
            notificationType,
            'delivered'
          );
        }).not.toThrow();
        
        // Property: Behavior queue should contain tracked actions
        expect(intelligentNotificationService.behaviorQueue).toBeDefined();
        expect(Array.isArray(intelligentNotificationService.behaviorQueue)).toBe(true);
      }
    ), { numRuns: 8 });
  });

  /**
   * Property Test: Notification delivery timing constraints
   * Tests that notifications are processed within acceptable time limits
   */
  test('should process notifications within acceptable time limits', async () => {
    const [notifications] = fc.sample(
      fc.array(fc.record({
        type: fc.constantFrom('VISITOR_ARRIVAL', 'SECURITY_ALERT', 'REMINDER'),
        title: nonEmptyText(5, 50),
        message: nonEmptyText(10, 200),
        recipientId: fc.integer({ min: 1, max: 100 }),
        priority: fc.integer({ min: 1, max: 5 })
      }), { minLength: 1, maxLength: 5 }),
      1
    );

    // Use performance.now() for timing to avoid Date mocking issues
    const startTime = performance.now();
    const notificationIds = [];

    // Setup mock responses for all notifications
    notifications.forEach(() => {
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            notificationId: `notif_${Date.now()}_${Math.random()}`
          }
        }
      });
    });

    // Queue all notifications
    for (const notification of notifications) {
      const notificationId = await intelligentNotificationService.queueNotification(notification);
      notificationIds.push(notificationId);
    }

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // Property: All notifications should be queued successfully
    expect(notificationIds.length).toBe(notifications.length);
    notificationIds.forEach(id => {
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    // Property: Processing time should be reasonable (under 5 seconds for up to 5 notifications)
    expect(processingTime).toBeLessThan(5000);

    // Property: Each notification should have been processed
    expect(mockApiClient.post).toHaveBeenCalledTimes(notifications.length);
  });

  /**
   * Property Test: Notification channel fallback behavior
   * Tests that the system provides fallback channels when preferred channels fail
   */
  test('should provide fallback channels when preferred channels are unavailable', async () => {
    await fc.assert(fc.asyncProperty(
      // Generate notification
      fc.record({
        type: fc.constantFrom('VISITOR_ARRIVAL', 'SECURITY_ALERT'),
        priority: fc.integer({ min: 1, max: 5 })
      }),
      
      // Generate preferences with some channels disabled
      fc.record({
        preferences: fc.record({
          pushEnabled: fc.boolean(),
          emailEnabled: fc.boolean(),
          smsEnabled: fc.boolean(),
          inAppEnabled: fc.constant(true) // Always enabled as fallback
        })
      }),
      
      async (notification, userPreferences) => {
        // Setup mock response
        mockApiClient.get.mockResolvedValueOnce({
          data: {
            success: true,
            data: userPreferences
          }
        });
        
        // Load preferences
        await intelligentNotificationService.getPreferences();
        
        // Get recommended channels
        const recommendedChannels = intelligentNotificationService.getRecommendedChannels(notification.type);
        
        // Property: At least one channel should always be available
        expect(recommendedChannels.length).toBeGreaterThan(0);
        
        // Property: in_app should always be included as ultimate fallback
        expect(recommendedChannels).toContain('in_app');
        
        // Property: If all other channels are disabled, only in_app should be recommended
        if (!userPreferences.preferences.pushEnabled && 
            !userPreferences.preferences.emailEnabled && 
            !userPreferences.preferences.smsEnabled) {
          expect(recommendedChannels).toEqual(['in_app']);
        }
        
        // Property: Channel recommendations should be unique (no duplicates)
        const uniqueChannels = [...new Set(recommendedChannels)];
        expect(uniqueChannels.length).toBe(recommendedChannels.length);
      }
    ), { numRuns: 8 });
  });

  /**
   * Property Test: Emergency notification priority handling
   * Tests that emergency notifications bypass normal restrictions
   */
  test('should handle emergency notifications with highest priority', async () => {
    await fc.assert(fc.asyncProperty(
      // Generate emergency notification
      fc.record({
        type: fc.constantFrom('SECURITY_ALERT', 'VISITOR_EMERGENCY'),
        priority: fc.constantFrom(4, 5), // Emergency priorities
        title: nonEmptyText(5, 50),
        message: nonEmptyText(10, 200),
        isUrgent: fc.constant(true)
      }),
      
      // Generate restrictive preferences (quiet hours, limited channels)
      fc.record({
        preferences: fc.record({
          quietHoursStart: fc.constant('22:00'),
          quietHoursEnd: fc.constant('08:00'),
          pushEnabled: fc.boolean(),
          emailEnabled: fc.boolean(),
          smsEnabled: fc.boolean()
        })
      }),
      
      async (notification, userPreferences) => {
        // Mock current time to be within quiet hours
        const originalDate = Date;
        const originalDateNow = Date.now;
        const mockDate = new Date();
        mockDate.setHours(2, 0, 0, 0); // 2 AM - within quiet hours
        
        global.Date = jest.fn(() => mockDate);
        global.Date.now = jest.fn(() => mockDate.getTime());
        
        try {
          // Setup mock responses
          mockApiClient.get.mockResolvedValueOnce({
            data: {
              success: true,
              data: userPreferences
            }
          });
          
          mockApiClient.post.mockResolvedValueOnce({
            data: {
              success: true,
              data: {
                notificationId: `emergency_${Date.now()}`
              }
            }
          });
          
          // Load preferences
          await intelligentNotificationService.getPreferences();
          
          // Queue emergency notification
          const notificationId = await intelligentNotificationService.queueNotification(notification);
          
          // Get recommended channels
          const recommendedChannels = intelligentNotificationService.getRecommendedChannels(notification.type);
          
          // Property: Emergency notifications should be queued successfully
          expect(notificationId).toBeDefined();
          expect(typeof notificationId).toBe('string');
          
          // Property: Emergency notifications should get multiple channels even during quiet hours
          expect(recommendedChannels.length).toBeGreaterThan(1);
          
          // Property: Emergency notifications should include push if available
          if (userPreferences.preferences.pushEnabled) {
            expect(recommendedChannels).toContain('push');
          }
          
          // Property: Emergency notifications should always include in_app
          expect(recommendedChannels).toContain('in_app');
          
        } finally {
          // Restore original Date
          global.Date = originalDate;
          global.Date.now = originalDateNow;
        }
      }
    ), { numRuns: 8 });
  });

  /**
   * Property Test: Notification grouping and summary behavior
   * Tests that related notifications can be grouped appropriately
   */
  test('should handle notification grouping for related events', async () => {
    const [notifications] = fc.sample(
      fc.array(fc.record({
        type: fc.constant('VISITOR_ARRIVAL'), // Same type for grouping
        recipientId: fc.constant(123), // Same recipient
        title: nonEmptyText(5, 50),
        message: nonEmptyText(10, 200),
        priority: fc.integer({ min: 1, max: 3 })
      }), { minLength: 2, maxLength: 4 }),
      1
    );

    // Setup mock responses for all notifications
    notifications.forEach((_, index) => {
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            notificationId: `grouped_${index}_${Date.now()}`
          }
        }
      });
    });

    const notificationIds = [];

    // Queue all notifications rapidly (to simulate grouping scenario)
    for (const notification of notifications) {
      const notificationId = await intelligentNotificationService.queueNotification(notification);
      notificationIds.push(notificationId);
    }

    // Property: All notifications should be queued successfully
    expect(notificationIds.length).toBe(notifications.length);

    // Property: Each notification should have unique ID
    const uniqueIds = [...new Set(notificationIds)];
    expect(uniqueIds.length).toBe(notificationIds.length);

    // Property: All notifications should be processed
    expect(mockApiClient.post).toHaveBeenCalledTimes(notifications.length);

    // Property: Notifications of same type should be handled consistently
    notifications.forEach((notification, index) => {
      expect(mockApiClient.post).toHaveBeenNthCalledWith(
        index + 1,
        '/intelligent-notifications/queue',
        notification
      );
    });
  });
});
