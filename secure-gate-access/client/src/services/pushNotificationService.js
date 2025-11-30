/**
 * @fileoverview Push Notification Service
 * @description Browser push notification service with service worker integration
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

// Check if push notifications are supported
export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

// Check current permission status
export const getNotificationPermission = () => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
};

// Register service worker for push notifications
export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
};

// Get push subscription
export const getPushSubscription = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error('Error getting push subscription:', error);
    return null;
  }
};

// Subscribe to push notifications
export const subscribeToPush = async (vapidPublicKey) => {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    console.log('Push subscription:', subscription);
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push:', error);
    return null;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPush = async () => {
  try {
    const subscription = await getPushSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      console.log('Unsubscribed from push notifications');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    return false;
  }
};

// Send subscription to server
export const sendSubscriptionToServer = async (subscription) => {
  try {
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ subscription })
    });

    if (!response.ok) {
      throw new Error('Failed to send subscription to server');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending subscription to server:', error);
    return null;
  }
};

// Show local notification (fallback when push not available)
export const showLocalNotification = async (title, options = {}) => {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }

  try {
    // Try using service worker first
    const registration = await navigator.serviceWorker?.ready;
    if (registration) {
      await registration.showNotification(title, {
        icon: '/logo192.png',
        badge: '/badge.png',
        vibrate: [200, 100, 200],
        tag: options.tag || 'securegate-notification',
        renotify: options.renotify || false,
        requireInteraction: options.requireInteraction || false,
        ...options
      });
      return true;
    }

    // Fallback to regular Notification API
    const notification = new Notification(title, {
      icon: '/logo192.png',
      ...options
    });

    if (options.onClick) {
      notification.onclick = options.onClick;
    }

    return notification;
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
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

/**
 * PushNotificationManager Class
 * Manages the complete push notification lifecycle
 */
export class PushNotificationManager {
  constructor(options = {}) {
    this.vapidPublicKey = options.vapidPublicKey || process.env.REACT_APP_VAPID_PUBLIC_KEY;
    this.onNotification = options.onNotification || null;
    this.subscription = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return true;
    if (!isPushSupported()) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      // Register service worker
      await registerServiceWorker();

      // Check existing subscription
      this.subscription = await getPushSubscription();

      // Set up message listener
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
            this.onNotification?.(event.data.payload);
          }
        });
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return false;
    }
  }

  async requestPermission() {
    return await requestNotificationPermission();
  }

  async subscribe() {
    if (!this.vapidPublicKey) {
      console.error('VAPID public key not configured');
      return null;
    }

    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      return null;
    }

    this.subscription = await subscribeToPush(this.vapidPublicKey);
    
    if (this.subscription) {
      await sendSubscriptionToServer(this.subscription);
    }

    return this.subscription;
  }

  async unsubscribe() {
    const result = await unsubscribeFromPush();
    if (result) {
      this.subscription = null;
    }
    return result;
  }

  isSubscribed() {
    return !!this.subscription;
  }

  async showNotification(title, options) {
    return await showLocalNotification(title, options);
  }
}

// Singleton instance
let pushManager = null;

export const getPushManager = (options = {}) => {
  if (!pushManager) {
    pushManager = new PushNotificationManager(options);
  }
  return pushManager;
};

export default PushNotificationManager;
