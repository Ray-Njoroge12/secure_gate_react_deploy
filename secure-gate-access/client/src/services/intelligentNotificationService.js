/**
 * @file intelligentNotificationService.js
 * @description Client-side service for intelligent notification management
 * Features:
 * - Queue notifications with smart routing
 * - Manage user preferences with quiet hours
 * - Track user behavior and engagement
 * - Real-time notification handling
 * - Analytics and insights
 */

import apiClient from '../utils/apiClient';
import logger from '../utils/logger';

class IntelligentNotificationService {
  constructor() {
    this.listeners = [];
    this.behaviorQueue = [];
    this.preferences = null;
    this.analytics = null;
    this.isOnline = navigator.onLine;
    
    // Notification types
    this.TYPES = {
      VISITOR_ARRIVAL: 'VISITOR_ARRIVAL',
      VISITOR_APPROVED: 'VISITOR_APPROVED',
      VISITOR_REJECTED: 'VISITOR_REJECTED',
      VISITOR_EMERGENCY: 'VISITOR_EMERGENCY',
      SECURITY_ALERT: 'SECURITY_ALERT',
      SYSTEM_MAINTENANCE: 'SYSTEM_MAINTENANCE',
      REMINDER: 'REMINDER',
      TEST: 'TEST'
    };
    
    // Behavior actions
    this.ACTIONS = {
      DELIVERED: 'delivered',
      DISMISSED: 'dismissed',
      CLICKED: 'clicked',
      READ: 'read'
    };
    
    this.initializeEventListeners();
    this.startBehaviorSync();
  }

  /**
   * Initialize event listeners
   */
  initializeEventListeners() {
    // Online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncBehaviorQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
    
    // Page visibility for behavior tracking
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.syncBehaviorQueue();
      }
    });
    
    // Beforeunload for cleanup
    window.addEventListener('beforeunload', () => {
      this.syncBehaviorQueue();
    });
  }

  /**
   * Start periodic behavior synchronization
   */
  startBehaviorSync() {
    // Sync behavior data every 30 seconds
    setInterval(() => {
      if (this.isOnline && this.behaviorQueue.length > 0) {
        this.syncBehaviorQueue();
      }
    }, 30000);
  }

  /**
   * Queue a notification through the intelligent system
   * @param {Object} notification - Notification object
   * @returns {Promise<string>} - Notification ID
   */
  async queueNotification(notification) {
    try {
      const response = await apiClient.post('/intelligent-notifications/queue', notification);
      
      if (response.data.success) {
        logger.info('Notification queued successfully', {
          notificationId: response.data.data.notificationId,
          type: notification.type
        });
        
        return response.data.data.notificationId;
      } else {
        throw new Error(response.data.error || 'Failed to queue notification');
      }
    } catch (error) {
      logger.error('Failed to queue notification', error);
      throw error;
    }
  }

  /**
   * Get user notification preferences with intelligent features
   * @returns {Promise<Object>} - Preferences, behavior, and statistics
   */
  async getPreferences() {
    try {
      const response = await apiClient.get('/intelligent-notifications/preferences');
      
      if (response.data.success) {
        this.preferences = response.data.data;
        return this.preferences;
      } else {
        throw new Error(response.data.error || 'Failed to get preferences');
      }
    } catch (error) {
      logger.error('Failed to get notification preferences', error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   * @param {Object} preferences - Updated preferences
   * @returns {Promise<Object>} - Updated preferences
   */
  async updatePreferences(preferences) {
    try {
      const response = await apiClient.put('/intelligent-notifications/preferences', preferences);
      
      if (response.data.success) {
        this.preferences = response.data.data;
        
        logger.info('Notification preferences updated', {
          quietHours: preferences.quietHoursStart && preferences.quietHoursEnd ? 
            `${preferences.quietHoursStart}-${preferences.quietHoursEnd}` : 'disabled'
        });
        
        return this.preferences;
      } else {
        throw new Error(response.data.error || 'Failed to update preferences');
      }
    } catch (error) {
      logger.error('Failed to update notification preferences', error);
      throw error;
    }
  }

  /**
   * Track user behavior with a notification
   * @param {string} notificationId - Notification ID (optional)
   * @param {string} notificationType - Type of notification
   * @param {string} action - User action (delivered, dismissed, clicked, read)
   */
  trackBehavior(notificationId, notificationType, action) {
    try {
      const behaviorData = {
        notificationId,
        notificationType,
        action,
        timestamp: Date.now()
      };
      
      // Add to queue for batch processing
      this.behaviorQueue.push(behaviorData);
      
      // Sync immediately for critical actions
      if (action === this.ACTIONS.CLICKED || action === this.ACTIONS.DISMISSED) {
        this.syncBehaviorQueue();
      }
      
      logger.debug('Behavior tracked', behaviorData);
    } catch (error) {
      logger.error('Failed to track behavior', error);
    }
  }

  /**
   * Sync behavior queue to server
   */
  async syncBehaviorQueue() {
    if (!this.isOnline || this.behaviorQueue.length === 0) {
      return;
    }
    
    const queue = [...this.behaviorQueue];
    this.behaviorQueue = [];
    
    try {
      // Send behavior data in batches
      const batchSize = 10;
      for (let i = 0; i < queue.length; i += batchSize) {
        const batch = queue.slice(i, i + batchSize);
        
        for (const behaviorData of batch) {
          await apiClient.post('/intelligent-notifications/behavior/track', behaviorData);
        }
      }
      
      logger.debug('Behavior queue synced', { count: queue.length });
    } catch (error) {
      // Re-add failed items to queue
      this.behaviorQueue.unshift(...queue);
      logger.error('Failed to sync behavior queue', error);
    }
  }

  /**
   * Get notification analytics and insights
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Promise<Object>} - Analytics data
   */
  async getAnalytics(days = 30) {
    try {
      const response = await apiClient.get(`/intelligent-notifications/analytics?days=${days}`);
      
      if (response.data.success) {
        this.analytics = response.data.data;
        return this.analytics;
      } else {
        throw new Error(response.data.error || 'Failed to get analytics');
      }
    } catch (error) {
      logger.error('Failed to get notification analytics', error);
      throw error;
    }
  }

  /**
   * Get advanced notification insights and recommendations
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Promise<Object>} - Insights data
   */
  async getInsights(days = 30) {
    try {
      const response = await apiClient.get(`/intelligent-notifications/insights?days=${days}`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get insights');
      }
    } catch (error) {
      logger.error('Failed to get notification insights', error);
      throw error;
    }
  }

  /**
   * Update behavior learning and recalculate relevance scores
   * @param {boolean} forceRecalculation - Force recalculation of all scores
   * @returns {Promise<Object>} - Updated behavior data
   */
  async updateBehaviorLearning(forceRecalculation = false) {
    try {
      const response = await apiClient.post('/intelligent-notifications/behavior/learn', {
        forceRecalculation
      });
      
      if (response.data.success) {
        logger.info('Behavior learning updated', {
          updatedCount: response.data.data.totalUpdated
        });
        
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to update behavior learning');
      }
    } catch (error) {
      logger.error('Failed to update behavior learning', error);
      throw error;
    }
  }

  /**
   * Get relevance score for a specific notification type
   * @param {string} notificationType - Notification type
   * @returns {Promise<Object>} - Relevance data
   */
  async getRelevanceScore(notificationType) {
    try {
      const response = await apiClient.get(`/intelligent-notifications/relevance/${notificationType}`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get relevance score');
      }
    } catch (error) {
      logger.error('Failed to get relevance score', error);
      throw error;
    }
  }

  /**
   * Get notification history with advanced filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} - History data
   */
  async getNotificationHistory(filters = {}) {
    try {
      const response = await apiClient.post('/intelligent-notifications/history', {
        startDate: filters.startDate,
        endDate: filters.endDate,
        search: filters.search,
        type: filters.type || 'all',
        status: filters.status || 'all',
        channel: filters.channel || 'all',
        limit: filters.limit || 100,
        offset: filters.offset || 0
      });
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get notification history');
      }
    } catch (error) {
      logger.error('Failed to get notification history', error);
      throw error;
    }
  }

  /**
   * Export notification history to CSV or JSON
   * @param {Object} filters - Export filters
   * @param {string} format - Export format ('csv' or 'json')
   * @returns {Promise<Blob>} - Export file blob
   */
  async exportNotificationHistory(filters = {}, format = 'csv') {
    try {
      const queryParams = new URLSearchParams({
        startDate: filters.startDate || '',
        endDate: filters.endDate || '',
        type: filters.type || 'all',
        status: filters.status || 'all',
        format
      });

      const response = await apiClient.get(`/intelligent-notifications/export?${queryParams}`, {
        responseType: format === 'csv' ? 'text' : 'json'
      });

      if (format === 'csv') {
        return new Blob([response.data], { type: 'text/csv' });
      } else {
        return new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      }
    } catch (error) {
      logger.error('Failed to export notification history', error);
      throw error;
    }
  }

  /**
   * Send a test notification
   * @param {Object} testData - Test notification data
   * @returns {Promise<string>} - Notification ID
   */
  async sendTestNotification(testData = {}) {
    try {
      const response = await apiClient.post('/intelligent-notifications/test', testData);
      
      if (response.data.success) {
        logger.info('Test notification sent', {
          notificationId: response.data.data.notificationId
        });
        
        return response.data.data.notificationId;
      } else {
        throw new Error(response.data.error || 'Failed to send test notification');
      }
    } catch (error) {
      logger.error('Failed to send test notification', error);
      throw error;
    }
  }

  /**
   * Check if current time is within quiet hours
   * @returns {boolean} - True if it's quiet time
   */
  isQuietTime() {
    if (!this.preferences?.preferences?.quietHoursStart || !this.preferences?.preferences?.quietHoursEnd) {
      return false;
    }
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const startTime = this.parseTimeString(this.preferences.preferences.quietHoursStart);
    const endTime = this.parseTimeString(this.preferences.preferences.quietHoursEnd);
    
    if (startTime <= endTime) {
      // Same day quiet hours
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight quiet hours
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Parse time string to minutes since midnight
   * @param {string} timeString - Time in HH:MM format
   * @returns {number} - Minutes since midnight
   */
  parseTimeString(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Get notification relevance score for a type
   * @param {string} notificationType - Notification type
   * @returns {number} - Relevance score (0-1)
   */
  getRelevanceScore(notificationType) {
    if (!this.preferences?.behavior) {
      return 1.0; // Default relevance
    }
    
    const behavior = this.preferences.behavior.find(b => b.notificationType === notificationType);
    return behavior ? behavior.relevanceScore : 1.0;
  }

  /**
   * Get recommended notification channels based on user behavior
   * @param {string} notificationType - Notification type
   * @returns {Array} - Recommended channels
   */
  getRecommendedChannels(notificationType) {
    const preferences = this.preferences?.preferences;
    if (!preferences) {
      return ['push', 'in_app'];
    }
    
    const channels = [];
    const relevanceScore = this.getRelevanceScore(notificationType);
    const isQuiet = this.isQuietTime();
    
    // During quiet hours, only recommend in-app unless high relevance
    if (isQuiet && relevanceScore < 0.8) {
      return ['in_app'];
    }
    
    // Recommend channels based on preferences and relevance
    if (preferences.pushEnabled && relevanceScore > 0.3) {
      channels.push('push');
    }
    
    if (preferences.emailEnabled && relevanceScore > 0.5) {
      channels.push('email');
    }
    
    if (preferences.smsEnabled && relevanceScore > 0.7) {
      channels.push('sms');
    }
    
    // Always include in-app
    channels.push('in_app');
    
    return [...new Set(channels)];
  }

  /**
   * Subscribe to notification events
   * @param {Function} callback - Event callback
   */
  subscribe(callback) {
    this.listeners.push(callback);
    
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit notification event to listeners
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  emit(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        logger.error('Error in notification listener', error);
      }
    });
  }

  /**
   * Handle incoming notification (from WebSocket or other sources)
   * @param {Object} notification - Notification object
   */
  handleIncomingNotification(notification) {
    try {
      // Track delivery
      this.trackBehavior(
        notification.id,
        notification.type,
        this.ACTIONS.DELIVERED
      );
      
      // Check if notification should be shown based on preferences
      const shouldShow = this.shouldShowNotification(notification);
      
      if (shouldShow) {
        // Emit to listeners
        this.emit('notification_received', notification);
        
        // Show browser notification if supported and permitted
        this.showBrowserNotification(notification);
      }
      
      logger.debug('Incoming notification handled', {
        id: notification.id,
        type: notification.type,
        shown: shouldShow
      });
    } catch (error) {
      logger.error('Failed to handle incoming notification', error);
    }
  }

  /**
   * Check if notification should be shown based on preferences
   * @param {Object} notification - Notification object
   * @returns {boolean} - True if should be shown
   */
  shouldShowNotification(notification) {
    const preferences = this.preferences?.preferences;
    if (!preferences) {
      return true; // Show by default if no preferences
    }
    
    // Check type-specific preferences
    const typePreferences = {
      [this.TYPES.VISITOR_ARRIVAL]: preferences.notifyOnCheckin,
      [this.TYPES.VISITOR_APPROVED]: preferences.notifyOnApproval,
      [this.TYPES.VISITOR_REJECTED]: preferences.notifyOnRejection,
      [this.TYPES.SECURITY_ALERT]: preferences.notifySecurityAlerts,
      [this.TYPES.REMINDER]: preferences.notifyOnReminder
    };
    
    const typeEnabled = typePreferences[notification.type];
    if (typeEnabled === false) {
      return false;
    }
    
    // Check quiet hours (except for emergency notifications)
    const isEmergency = notification.priority >= 4; // CRITICAL or EMERGENCY
    if (this.isQuietTime() && !isEmergency) {
      return false;
    }
    
    // Check relevance score
    const relevanceScore = this.getRelevanceScore(notification.type);
    if (relevanceScore < 0.2) {
      return false; // Very low relevance
    }
    
    return true;
  }

  /**
   * Show browser notification
   * @param {Object} notification - Notification object
   */
  async showBrowserNotification(notification) {
    try {
      if (!('Notification' in window)) {
        return; // Browser doesn't support notifications
      }
      
      if (Notification.permission !== 'granted') {
        return; // Permission not granted
      }
      
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.priority >= 4, // High priority notifications require interaction
        silent: this.isQuietTime() && notification.priority < 4
      });
      
      // Track click behavior
      browserNotification.onclick = () => {
        this.trackBehavior(
          notification.id,
          notification.type,
          this.ACTIONS.CLICKED
        );
        
        // Handle notification click action
        if (notification.metadata?.actionUrl) {
          window.open(notification.metadata.actionUrl, '_blank');
        }
        
        browserNotification.close();
      };
      
      // Auto-close after delay
      setTimeout(() => {
        browserNotification.close();
      }, 10000); // 10 seconds
      
    } catch (error) {
      logger.error('Failed to show browser notification', error);
    }
  }

  /**
   * Request notification permission
   * @returns {Promise<string>} - Permission status
   */
  async requestPermission() {
    try {
      if (!('Notification' in window)) {
        return 'unsupported';
      }
      
      if (Notification.permission === 'granted') {
        return 'granted';
      }
      
      if (Notification.permission === 'denied') {
        return 'denied';
      }
      
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      logger.error('Failed to request notification permission', error);
      return 'error';
    }
  }

  /**
   * Get system health status (admin only)
   * @returns {Promise<Object>} - System health data
   */
  async getSystemHealth() {
    try {
      const response = await apiClient.get('/intelligent-notifications/system/health');
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get system health');
      }
    } catch (error) {
      logger.error('Failed to get system health', error);
      throw error;
    }
  }

  /**
   * Get notification queue status (admin only)
   * @returns {Promise<Object>} - Queue status
   */
  async getQueueStatus() {
    try {
      const response = await apiClient.get('/intelligent-notifications/queue/status');
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get queue status');
      }
    } catch (error) {
      logger.error('Failed to get queue status', error);
      throw error;
    }
  }

  /**
   * Clear notification queue (admin only)
   * @returns {Promise<boolean>} - Success status
   */
  async clearQueue() {
    try {
      const response = await apiClient.post('/intelligent-notifications/queue/clear');
      
      if (response.data.success) {
        logger.info('Notification queue cleared');
        return true;
      } else {
        throw new Error(response.data.error || 'Failed to clear queue');
      }
    } catch (error) {
      logger.error('Failed to clear queue', error);
      throw error;
    }
  }

  /**
   * Get cached preferences
   * @returns {Object|null} - Cached preferences
   */
  getCachedPreferences() {
    return this.preferences;
  }

  /**
   * Get cached analytics
   * @returns {Object|null} - Cached analytics
   */
  getCachedAnalytics() {
    return this.analytics;
  }

  /**
   * Clear cached data
   */
  clearCache() {
    this.preferences = null;
    this.analytics = null;
  }
}

// Create singleton instance
const intelligentNotificationService = new IntelligentNotificationService();

export default intelligentNotificationService;