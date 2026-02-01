// Push Notification Service for PWA
class PushNotificationService {
  constructor() {
    this.registration = null;
    this.subscription = null;
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.isPermissionGranted = false;
    this.listeners = new Set();
    
    this.init();
  }

  async init() {
    if (!this.isSupported) {
      console.warn('Push notifications not supported');
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.ready;
      await this.checkExistingSubscription();
      this.setupMessageListener();
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  }

  // ==================== PERMISSION MANAGEMENT ====================

  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Push notifications not supported');
    }

    const permission = await Notification.requestPermission();
    this.isPermissionGranted = permission === 'granted';
    
    if (this.isPermissionGranted) {
      await this.subscribe();
    }
    
    return permission;
  }

  getPermissionStatus() {
    if (!this.isSupported) return 'unsupported';
    return Notification.permission;
  }

  // ==================== SUBSCRIPTION MANAGEMENT ====================

  async subscribe() {
    if (!this.isPermissionGranted || !this.registration) {
      throw new Error('Permission not granted or service worker not ready');
    }

    try {
      // Get VAPID public key from server
      const vapidKey = await this.getVapidKey();
      
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidKey)
      });

      // Send subscription to server
      await this.sendSubscriptionToServer(this.subscription);
      
      console.log('Push subscription successful');
      this.notifyListeners('subscribed', this.subscription);
      
      return this.subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  async unsubscribe() {
    if (!this.subscription) return;

    try {
      await this.subscription.unsubscribe();
      await this.removeSubscriptionFromServer();
      
      this.subscription = null;
      console.log('Push unsubscription successful');
      this.notifyListeners('unsubscribed');
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      throw error;
    }
  }

  async checkExistingSubscription() {
    if (!this.registration) return;

    try {
      this.subscription = await this.registration.pushManager.getSubscription();
      this.isPermissionGranted = Notification.permission === 'granted';
      
      if (this.subscription) {
        // Verify subscription is still valid on server
        const isValid = await this.verifySubscription(this.subscription);
        if (!isValid) {
          await this.subscription.unsubscribe();
          this.subscription = null;
        }
      }
    } catch (error) {
      console.error('Error checking existing subscription:', error);
    }
  }

  // ==================== SERVER COMMUNICATION ====================

  async getVapidKey() {
    try {
      const response = await fetch('/api/notifications/vapid-key', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to get VAPID key');
      }
      
      const data = await response.json();
      return data.publicKey;
    } catch (error) {
      console.error('Error getting VAPID key:', error);
      // Fallback to environment variable or default
      return process.env.REACT_APP_VAPID_PUBLIC_KEY || '';
    }
  }

  async sendSubscriptionToServer(subscription) {
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send subscription to server');
    }

    return response.json();
  }

  async removeSubscriptionFromServer() {
    if (!this.subscription) return;

    try {
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          endpoint: this.subscription.endpoint
        })
      });
    } catch (error) {
      console.error('Error removing subscription from server:', error);
    }
  }

  async verifySubscription(subscription) {
    try {
      const response = await fetch('/api/notifications/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error verifying subscription:', error);
      return false;
    }
  }

  // ==================== NOTIFICATION PREFERENCES ====================

  async updateNotificationPreferences(preferences) {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(preferences)
      });

      if (!response.ok) {
        throw new Error('Failed to update notification preferences');
      }

      this.notifyListeners('preferences_updated', preferences);
      return response.json();
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  async getNotificationPreferences() {
    try {
      const response = await fetch('/api/notifications/preferences', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to get notification preferences');
      }

      return response.json();
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  getDefaultPreferences() {
    return {
      visitor_arrival: true,
      visitor_checkin: true,
      security_alerts: true,
      approval_requests: true,
      system_updates: false,
      marketing: false,
      quiet_hours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };
  }

  // ==================== LOCAL NOTIFICATIONS ====================

  async showLocalNotification(title, options = {}) {
    if (!this.isPermissionGranted) {
      console.warn('Permission not granted for notifications');
      return;
    }

    const defaultOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [100, 50, 100],
      requireInteraction: false,
      tag: 'secure-gate-local',
      timestamp: Date.now()
    };

    const notificationOptions = { ...defaultOptions, ...options };

    try {
      if (this.registration) {
        // Use service worker to show notification
        await this.registration.showNotification(title, notificationOptions);
      } else {
        // Fallback to direct notification
        new Notification(title, notificationOptions);
      }
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  // ==================== DEEP LINKING ====================

  setupMessageListener() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data || {};
      
      if (type === 'NOTIFICATION_CLICKED') {
        this.handleNotificationClick(data);
      }
      
      if (type === 'NOTIFICATION_ACTION') {
        this.handleNotificationAction(data);
      }
    });
  }

  handleNotificationClick(data) {
    const { url, notificationId, type } = data || {};
    
    // Track notification click
    this.trackNotificationInteraction(notificationId, 'clicked');
    
    // Handle deep linking
    if (url) {
      this.navigateToUrl(url);
    }
    
    this.notifyListeners('notification_clicked', { type, data });
  }

  handleNotificationAction(data) {
    const { action, notificationId, type, payload } = data || {};
    
    // Track notification action
    this.trackNotificationInteraction(notificationId, action);
    
    // Handle specific actions
    switch (action) {
      case 'approve':
      case 'deny':
        this.handleVisitorAction(action, payload);
        break;
      case 'acknowledge':
        this.handleAlertAcknowledgment(payload);
        break;
      case 'view':
        this.navigateToUrl(payload.url);
        break;
      default:
        console.log('Unknown notification action:', action);
    }
    
    this.notifyListeners('notification_action', { action, type, payload });
  }

  async handleVisitorAction(action, payload) {
    try {
      const response = await fetch(`/api/visitors/${payload.visitorId}/quick-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          action,
          notificationId: payload.notificationId
        })
      });

      if (response.ok) {
        await this.showLocalNotification(
          action === 'approve' ? 'Visitor Approved' : 'Visitor Denied',
          {
            body: 'Action completed successfully',
            tag: 'action-confirmation'
          }
        );
      } else {
        throw new Error('Action failed');
      }
    } catch (error) {
      console.error('Error handling visitor action:', error);
      await this.showLocalNotification('Action Failed', {
        body: 'Please try again from the app',
        tag: 'action-error'
      });
    }
  }

  async handleAlertAcknowledgment(payload) {
    try {
      await fetch(`/api/incidents/${payload.alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  }

  navigateToUrl(url) {
    if (url.startsWith('/')) {
      // Internal navigation
      window.location.href = url;
    } else if (url.startsWith('http')) {
      // External URL
      window.open(url, '_blank');
    }
  }

  // ==================== ANALYTICS ====================

  async trackNotificationInteraction(notificationId, action) {
    if (!notificationId) return;

    try {
      await fetch('/api/notifications/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          notificationId,
          action,
          timestamp: Date.now(),
          userAgent: navigator.userAgent
        })
      });
    } catch (error) {
      // Silent fail for analytics
      console.debug('Failed to track notification interaction');
    }
  }

  // ==================== EVENT LISTENERS ====================

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in push notification listener:', error);
      }
    });
  }

  // ==================== UTILITIES ====================

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // ==================== STATUS METHODS ====================

  getStatus() {
    return {
      isSupported: this.isSupported,
      isPermissionGranted: this.isPermissionGranted,
      isSubscribed: !!this.subscription,
      permission: this.getPermissionStatus()
    };
  }

  async testNotification() {
    if (!this.isPermissionGranted) {
      throw new Error('Permission not granted');
    }

    await this.showLocalNotification('Test Notification', {
      body: 'This is a test notification from SecureGate',
      tag: 'test-notification',
      requireInteraction: true
    });
  }
}

// Create singleton instance
const pushNotificationService = new PushNotificationService();

export default pushNotificationService;