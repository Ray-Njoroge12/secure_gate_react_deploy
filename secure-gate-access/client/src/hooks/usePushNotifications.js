/**
 * @fileoverview Push Notifications Hook
 * @description React hook for managing push notification subscriptions
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import pushNotificationService from '../services/pushNotificationService';

/**
 * usePushNotifications Hook
 * 
 * Manages push notification permissions and subscriptions
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.onNotification - Callback when notification received
 * @param {boolean} options.autoSubscribe - Auto-subscribe when permission granted
 * @returns {Object} Push notification state and controls
 */
export function usePushNotifications(options = {}) {
  const { onNotification, autoSubscribe = false } = options;
  
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const managerRef = useRef(null);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Check support
        const supported = pushNotificationService.isSupported;
        setIsSupported(supported);

        if (!supported) {
          setIsLoading(false);
          return;
        }

        // Get current permission
        const currentPermission = pushNotificationService.getPermissionStatus();
        setPermission(currentPermission);

        // Check subscription status
        const status = pushNotificationService.getStatus();
        setIsSubscribed(status.isSubscribed);

        // Auto-subscribe if enabled and permission granted
        if (autoSubscribe && currentPermission === 'granted' && !status.isSubscribed) {
          await pushNotificationService.subscribe();
          const newStatus = pushNotificationService.getStatus();
          setIsSubscribed(newStatus.isSubscribed);
        }
      } catch (err) {
        console.error('Error initializing push notifications:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [onNotification, autoSubscribe]);

  /**
   * Request notification permission
   */
  const requestPermission = useCallback(async () => {
    if (!isSupported) return 'unsupported';
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await pushNotificationService.requestPermission();
      setPermission(result);
      return result;
    } catch (err) {
      setError(err.message);
      return 'denied';
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  /**
   * Subscribe to push notifications
   */
  const subscribe = useCallback(async () => {
    if (!isSupported) return null;
    
    setIsLoading(true);
    setError(null);

    try {
      const subscription = await pushNotificationService.subscribe();
      const status = pushNotificationService.getStatus();
      setIsSubscribed(status.isSubscribed);
      setPermission(pushNotificationService.getPermissionStatus());
      return subscription;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async () => {
    if (!isSupported) return false;
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await pushNotificationService.unsubscribe();
      const status = pushNotificationService.getStatus();
      setIsSubscribed(status.isSubscribed);
      return result;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  /**
   * Show a local notification
   */
  const showNotification = useCallback(async (title, options = {}) => {
    if (!isSupported) return null;
    
    try {
      return await pushNotificationService.showLocalNotification(title, options);
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [isSupported]);

  return {
    // State
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    
    // Computed
    canSubscribe: isSupported && permission !== 'denied',
    needsPermission: isSupported && permission === 'default',
    
    // Actions
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification
  };
}

export default usePushNotifications;
