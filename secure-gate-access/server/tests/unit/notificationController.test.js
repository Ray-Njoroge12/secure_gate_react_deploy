/**
 * Notification Controller Unit Tests
 * Tests for notification creation, delivery, and management
 */

describe('Notification Controller', () => {
  describe('Notification Types', () => {
    const NOTIFICATION_TYPES = {
      VISITOR_INVITE: 'visitor_invite',
      VISITOR_ARRIVAL: 'visitor_arrival',
      VISITOR_CHECKIN: 'visitor_checkin',
      VISITOR_CHECKOUT: 'visitor_checkout',
      APPROVAL_REQUEST: 'approval_request',
      APPROVAL_RESULT: 'approval_result',
      INCIDENT_ALERT: 'incident_alert',
      SYSTEM_ALERT: 'system_alert',
      ANNOUNCEMENT: 'announcement'
    };

    test('should have visitor invite type', () => {
      expect(NOTIFICATION_TYPES.VISITOR_INVITE).toBe('visitor_invite');
    });

    test('should have visitor arrival type', () => {
      expect(NOTIFICATION_TYPES.VISITOR_ARRIVAL).toBe('visitor_arrival');
    });

    test('should have incident alert type', () => {
      expect(NOTIFICATION_TYPES.INCIDENT_ALERT).toBe('incident_alert');
    });
  });

  describe('Notification Creation', () => {
    const createNotification = (data) => {
      const defaults = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending',
        read: false,
        createdAt: new Date().toISOString(),
        deliveredAt: null,
        readAt: null
      };

      return {
        ...defaults,
        ...data,
        title: data.title?.substring(0, 100) || 'Notification',
        message: data.message?.substring(0, 500) || ''
      };
    };

    test('should create notification with unique ID', () => {
      const n1 = createNotification({ type: 'test' });
      const n2 = createNotification({ type: 'test' });
      expect(n1.id).not.toBe(n2.id);
    });

    test('should set status to pending', () => {
      const notification = createNotification({ type: 'test' });
      expect(notification.status).toBe('pending');
    });

    test('should truncate long titles', () => {
      const longTitle = 'a'.repeat(150);
      const notification = createNotification({ type: 'test', title: longTitle });
      expect(notification.title.length).toBe(100);
    });

    test('should truncate long messages', () => {
      const longMessage = 'a'.repeat(600);
      const notification = createNotification({ type: 'test', message: longMessage });
      expect(notification.message.length).toBe(500);
    });

    test('should initialize read as false', () => {
      const notification = createNotification({ type: 'test' });
      expect(notification.read).toBe(false);
    });
  });

  describe('Notification Validation', () => {
    const validateNotification = (data) => {
      const errors = [];

      if (!data.recipientId) {
        errors.push({ field: 'recipientId', message: 'Recipient is required' });
      }

      if (!data.type) {
        errors.push({ field: 'type', message: 'Notification type is required' });
      }

      if (!data.title || data.title.trim().length === 0) {
        errors.push({ field: 'title', message: 'Title is required' });
      }

      const validChannels = ['push', 'email', 'sms', 'in_app'];
      if (data.channels && !data.channels.every(c => validChannels.includes(c))) {
        errors.push({ field: 'channels', message: 'Invalid notification channel' });
      }

      return { isValid: errors.length === 0, errors };
    };

    test('should require recipientId', () => {
      const result = validateNotification({ type: 'test', title: 'Test' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'recipientId' })
      );
    });

    test('should require type', () => {
      const result = validateNotification({ recipientId: 'user-1', title: 'Test' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'type' })
      );
    });

    test('should validate channels', () => {
      const result = validateNotification({
        recipientId: 'user-1',
        type: 'test',
        title: 'Test',
        channels: ['invalid_channel']
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'channels' })
      );
    });

    test('should accept valid notification', () => {
      const result = validateNotification({
        recipientId: 'user-1',
        type: 'test',
        title: 'Test Notification',
        channels: ['push', 'email']
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe('Notification Delivery', () => {
    const deliveryResults = {};

    const deliverNotification = async (notification, channel) => {
      // Simulate delivery
      const success = Math.random() > 0.1; // 90% success rate
      
      deliveryResults[notification.id] = {
        channel,
        success,
        timestamp: new Date().toISOString(),
        error: success ? null : 'Delivery failed'
      };

      return success;
    };

    const markAsDelivered = (notification) => {
      return {
        ...notification,
        status: 'delivered',
        deliveredAt: new Date().toISOString()
      };
    };

    test('should update status on delivery', () => {
      const notification = { id: 'n1', status: 'pending' };
      const updated = markAsDelivered(notification);
      expect(updated.status).toBe('delivered');
      expect(updated.deliveredAt).toBeTruthy();
    });
  });

  describe('Notification Read Status', () => {
    const markAsRead = (notification) => {
      return {
        ...notification,
        read: true,
        readAt: new Date().toISOString()
      };
    };

    const markAllAsRead = (notifications, userId) => {
      return notifications.map(n => 
        n.recipientId === userId ? markAsRead(n) : n
      );
    };

    test('should mark notification as read', () => {
      const notification = { id: 'n1', read: false, readAt: null };
      const updated = markAsRead(notification);
      expect(updated.read).toBe(true);
      expect(updated.readAt).toBeTruthy();
    });

    test('should mark all user notifications as read', () => {
      const notifications = [
        { id: 'n1', recipientId: 'user-1', read: false },
        { id: 'n2', recipientId: 'user-1', read: false },
        { id: 'n3', recipientId: 'user-2', read: false }
      ];

      const updated = markAllAsRead(notifications, 'user-1');
      expect(updated.filter(n => n.read)).toHaveLength(2);
      expect(updated.find(n => n.id === 'n3').read).toBe(false);
    });
  });

  describe('Notification Filtering', () => {
    const notifications = [
      { id: 'n1', type: 'visitor_arrival', read: false, createdAt: '2024-01-15T10:00:00Z' },
      { id: 'n2', type: 'incident_alert', read: true, createdAt: '2024-01-15T09:00:00Z' },
      { id: 'n3', type: 'visitor_arrival', read: false, createdAt: '2024-01-14T10:00:00Z' },
      { id: 'n4', type: 'announcement', read: false, createdAt: '2024-01-13T10:00:00Z' }
    ];

    const filterNotifications = (items, filters) => {
      let result = [...items];

      if (filters.type) {
        result = result.filter(n => n.type === filters.type);
      }

      if (filters.read !== undefined) {
        result = result.filter(n => n.read === filters.read);
      }

      if (filters.startDate) {
        result = result.filter(n => new Date(n.createdAt) >= new Date(filters.startDate));
      }

      return result;
    };

    test('should filter by type', () => {
      const filtered = filterNotifications(notifications, { type: 'visitor_arrival' });
      expect(filtered).toHaveLength(2);
    });

    test('should filter by read status', () => {
      const filtered = filterNotifications(notifications, { read: false });
      expect(filtered).toHaveLength(3);
    });

    test('should filter by date', () => {
      const filtered = filterNotifications(notifications, { startDate: '2024-01-15' });
      expect(filtered).toHaveLength(2);
    });

    test('should combine filters', () => {
      const filtered = filterNotifications(notifications, { 
        type: 'visitor_arrival', 
        read: false 
      });
      expect(filtered).toHaveLength(2);
    });
  });

  describe('Notification Preferences', () => {
    const defaultPreferences = {
      email: true,
      push: true,
      sms: false,
      inApp: true,
      quietHoursStart: null,
      quietHoursEnd: null,
      disabledTypes: []
    };

    const shouldSendNotification = (notification, preferences) => {
      // Check if notification type is disabled
      if (preferences.disabledTypes.includes(notification.type)) {
        return false;
      }

      // Check quiet hours
      if (preferences.quietHoursStart && preferences.quietHoursEnd) {
        const now = new Date();
        const hour = now.getHours();
        const start = parseInt(preferences.quietHoursStart);
        const end = parseInt(preferences.quietHoursEnd);
        
        if (start < end) {
          if (hour >= start && hour < end) return false;
        } else {
          if (hour >= start || hour < end) return false;
        }
      }

      return true;
    };

    test('should allow notification with default preferences', () => {
      const notification = { type: 'visitor_arrival' };
      expect(shouldSendNotification(notification, defaultPreferences)).toBe(true);
    });

    test('should block disabled notification types', () => {
      const prefs = { ...defaultPreferences, disabledTypes: ['announcement'] };
      const notification = { type: 'announcement' };
      expect(shouldSendNotification(notification, prefs)).toBe(false);
    });
  });

  describe('Notification Templates', () => {
    const templates = {
      visitor_arrival: {
        title: 'Visitor Arrived',
        message: 'Your visitor {{visitorName}} has arrived at the gate.'
      },
      visitor_checkin: {
        title: 'Visitor Checked In',
        message: '{{visitorName}} has been checked in to visit {{residentName}}.'
      },
      approval_request: {
        title: 'Approval Required',
        message: '{{visitorName}} is requesting access. Please approve or deny.'
      }
    };

    const renderTemplate = (type, data) => {
      const template = templates[type];
      if (!template) return null;

      let title = template.title;
      let message = template.message;

      Object.entries(data).forEach(([key, value]) => {
        title = title.replace(`{{${key}}}`, value);
        message = message.replace(`{{${key}}}`, value);
      });

      return { title, message };
    };

    test('should render visitor arrival template', () => {
      const result = renderTemplate('visitor_arrival', { visitorName: 'John Doe' });
      expect(result.message).toBe('Your visitor John Doe has arrived at the gate.');
    });

    test('should render template with multiple variables', () => {
      const result = renderTemplate('visitor_checkin', { 
        visitorName: 'John Doe',
        residentName: 'Jane Smith'
      });
      expect(result.message).toContain('John Doe');
      expect(result.message).toContain('Jane Smith');
    });

    test('should return null for unknown template', () => {
      const result = renderTemplate('unknown_type', {});
      expect(result).toBeNull();
    });
  });

  describe('Notification Batching', () => {
    const batchNotifications = (notifications, maxBatchSize = 100) => {
      const batches = [];
      for (let i = 0; i < notifications.length; i += maxBatchSize) {
        batches.push(notifications.slice(i, i + maxBatchSize));
      }
      return batches;
    };

    test('should batch notifications correctly', () => {
      const notifications = Array.from({ length: 250 }, (_, i) => ({ id: `n${i}` }));
      const batches = batchNotifications(notifications);
      expect(batches).toHaveLength(3);
      expect(batches[0]).toHaveLength(100);
      expect(batches[2]).toHaveLength(50);
    });

    test('should handle empty array', () => {
      const batches = batchNotifications([]);
      expect(batches).toHaveLength(0);
    });

    test('should handle single notification', () => {
      const batches = batchNotifications([{ id: 'n1' }]);
      expect(batches).toHaveLength(1);
      expect(batches[0]).toHaveLength(1);
    });
  });

  describe('Notification Statistics', () => {
    const notifications = [
      { id: 'n1', type: 'visitor_arrival', status: 'delivered', read: true },
      { id: 'n2', type: 'visitor_arrival', status: 'delivered', read: false },
      { id: 'n3', type: 'incident_alert', status: 'failed', read: false },
      { id: 'n4', type: 'announcement', status: 'delivered', read: true },
      { id: 'n5', type: 'announcement', status: 'pending', read: false }
    ];

    const calculateStats = (items) => {
      const total = items.length;
      const delivered = items.filter(n => n.status === 'delivered').length;
      const failed = items.filter(n => n.status === 'failed').length;
      const read = items.filter(n => n.read).length;

      const byType = items.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {});

      return {
        total,
        delivered,
        failed,
        pending: total - delivered - failed,
        read,
        unread: total - read,
        deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(2) : '0.00',
        readRate: delivered > 0 ? ((read / delivered) * 100).toFixed(2) : '0.00',
        byType
      };
    };

    test('should count total notifications', () => {
      const stats = calculateStats(notifications);
      expect(stats.total).toBe(5);
    });

    test('should count delivered notifications', () => {
      const stats = calculateStats(notifications);
      expect(stats.delivered).toBe(3);
    });

    test('should calculate delivery rate', () => {
      const stats = calculateStats(notifications);
      expect(stats.deliveryRate).toBe('60.00');
    });

    test('should group by type', () => {
      const stats = calculateStats(notifications);
      expect(stats.byType.visitor_arrival).toBe(2);
      expect(stats.byType.announcement).toBe(2);
    });
  });
});
