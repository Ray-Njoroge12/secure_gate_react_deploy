/**
 * @file intelligentNotificationManager.js
 * @description Intelligent notification management system with priority queuing, smart routing, and user preferences
 * Features:
 * - Priority queue with smart routing
 * - User preference-based channel selection
 * - Notification grouping and summary capabilities
 * - Quiet hours and do-not-disturb functionality
 * - Learning from user behavior
 */

import { EventEmitter } from 'events';
import { dbManager as db } from '../database/db.enhanced.js';
import logger from '../config/logger.js';
import notificationService from './notificationService.js';
import websocketService from './websocketService.js';

class IntelligentNotificationManager extends EventEmitter {
  constructor() {
    super();
    this.priorityQueue = new Map(); // Priority-based notification queue
    this.groupingRules = new Map(); // Notification grouping rules
    this.userBehaviorData = new Map(); // User behavior learning data
    this.processingInterval = null;
    this.isProcessing = false;
    
    // Priority levels (higher number = higher priority)
    this.PRIORITIES = {
      EMERGENCY: 5,
      CRITICAL: 4,
      HIGH: 3,
      NORMAL: 2,
      LOW: 1
    };
    
    // Notification types and their default priorities
    this.NOTIFICATION_TYPES = {
      SECURITY_ALERT: this.PRIORITIES.EMERGENCY,
      VISITOR_EMERGENCY: this.PRIORITIES.CRITICAL,
      VISITOR_ARRIVAL: this.PRIORITIES.HIGH,
      VISITOR_APPROVED: this.PRIORITIES.NORMAL,
      VISITOR_REJECTED: this.PRIORITIES.NORMAL,
      SYSTEM_MAINTENANCE: this.PRIORITIES.LOW,
      REMINDER: this.PRIORITIES.LOW
    };
    
    // Channel types
    this.CHANNELS = {
      PUSH: 'push',
      EMAIL: 'email',
      SMS: 'sms',
      IN_APP: 'in_app',
      WEBSOCKET: 'websocket'
    };
    
    this.initializeGroupingRules();
    this.startProcessing();
  }

  /**
   * Initialize notification grouping rules
   */
  initializeGroupingRules() {
    // Group visitor notifications by estate and time window
    this.groupingRules.set('visitor_notifications', {
      types: ['VISITOR_ARRIVAL', 'VISITOR_APPROVED', 'VISITOR_REJECTED'],
      groupBy: ['estate_id', 'recipient_id'],
      timeWindow: 5 * 60 * 1000, // 5 minutes
      maxGroupSize: 5,
      summaryTemplate: 'visitor_summary'
    });
    
    // Group system notifications
    this.groupingRules.set('system_notifications', {
      types: ['SYSTEM_MAINTENANCE', 'REMINDER'],
      groupBy: ['estate_id', 'type'],
      timeWindow: 15 * 60 * 1000, // 15 minutes
      maxGroupSize: 10,
      summaryTemplate: 'system_summary'
    });
  }

  /**
   * Start the notification processing loop
   */
  startProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    // Process notifications every 10 seconds
    this.processingInterval = setInterval(() => {
      this.processNotificationQueue();
    }, 10000);
    
    logger.info('Intelligent notification manager started');
  }

  /**
   * Stop the notification processing
   */
  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    logger.info('Intelligent notification manager stopped');
  }

  /**
   * Add a notification to the intelligent queue
   * @param {Object} notification - Notification object
   * @returns {Promise<string>} - Notification ID
   */
  async queueNotification(notification) {
    try {
      const notificationId = this.generateNotificationId();
      
      // Optimize notification based on learned behavior
      const optimizedNotification = await this.optimizeNotificationDelivery({
        ...notification,
        id: notificationId
      });
      
      const priority = this.calculatePriority(optimizedNotification);
      const channels = await this.selectChannels(optimizedNotification);
      
      const enrichedNotification = {
        ...optimizedNotification,
        priority,
        channels,
        queuedAt: new Date(),
        attempts: 0,
        maxAttempts: 3,
        status: 'queued'
      };
      
      // Add to priority queue
      if (!this.priorityQueue.has(priority)) {
        this.priorityQueue.set(priority, []);
      }
      
      this.priorityQueue.get(priority).push(enrichedNotification);
      
      // Log queuing with optimization details
      logger.info('Notification queued with optimization', {
        notificationId,
        type: notification.type,
        priority,
        channels: channels.join(','),
        recipientId: notification.recipientId,
        relevanceScore: optimizedNotification.metadata?.relevanceScore,
        wasOptimized: optimizedNotification.metadata?.optimized
      });
      
      // Emit event for monitoring
      this.emit('notification_queued', enrichedNotification);
      
      return notificationId;
    } catch (error) {
      logger.error('Failed to queue notification', error);
      throw error;
    }
  }

  /**
   * Calculate notification priority based on type and context
   * @param {Object} notification - Notification object
   * @returns {number} - Priority level
   */
  calculatePriority(notification) {
    let basePriority = this.NOTIFICATION_TYPES[notification.type] || this.PRIORITIES.NORMAL;
    
    // Adjust priority based on context
    if (notification.isUrgent) {
      basePriority = Math.min(basePriority + 1, this.PRIORITIES.EMERGENCY);
    }
    
    if (notification.isRetry && notification.attempts > 0) {
      basePriority = Math.max(basePriority - 1, this.PRIORITIES.LOW);
    }
    
    return basePriority;
  }

  /**
   * Select appropriate channels based on user preferences and notification context
   * @param {Object} notification - Notification object
   * @returns {Promise<Array>} - Array of selected channels
   */
  async selectChannels(notification) {
    try {
      const userPreferences = await this.getUserNotificationPreferences(notification.recipientId);
      const channels = [];
      
      // Check quiet hours
      const isQuietTime = await this.isQuietTime(notification.recipientId);
      const isEmergency = notification.priority >= this.PRIORITIES.CRITICAL;
      
      if (isQuietTime && !isEmergency) {
        // During quiet hours, only use in-app notifications unless it's an emergency
        if (userPreferences.inAppEnabled) {
          channels.push(this.CHANNELS.IN_APP);
        }
        return channels;
      }
      
      // Select channels based on preferences and notification type
      if (userPreferences.pushEnabled && this.shouldUsePush(notification)) {
        channels.push(this.CHANNELS.PUSH);
      }
      
      if (userPreferences.emailEnabled && this.shouldUseEmail(notification)) {
        channels.push(this.CHANNELS.EMAIL);
      }
      
      if (userPreferences.smsEnabled && this.shouldUseSms(notification)) {
        channels.push(this.CHANNELS.SMS);
      }
      
      // Always include in-app and websocket for real-time updates
      if (userPreferences.inAppEnabled) {
        channels.push(this.CHANNELS.IN_APP);
      }
      
      channels.push(this.CHANNELS.WEBSOCKET);
      
      // Ensure at least one channel is selected
      if (channels.length === 0) {
        channels.push(this.CHANNELS.IN_APP, this.CHANNELS.WEBSOCKET);
      }
      
      return [...new Set(channels)]; // Remove duplicates
    } catch (error) {
      logger.error('Failed to select channels', error);
      // Fallback to basic channels
      return [this.CHANNELS.IN_APP, this.CHANNELS.WEBSOCKET];
    }
  }

  /**
   * Get user notification preferences
   * @param {number} userId - User ID
   * @returns {Promise<Object>} - User preferences
   */
  async getUserNotificationPreferences(userId) {
    try {
      const query = `
        SELECT 
          email_enabled,
          sms_enabled,
          push_enabled,
          notify_on_invite,
          notify_on_approval,
          notify_on_rejection,
          notify_on_checkin,
          notify_on_checkout,
          notify_on_reminder,
          notify_security_alerts,
          quiet_hours_start,
          quiet_hours_end
        FROM notification_preferences
        WHERE user_id = $1
      `;
      
      const result = await db.query(query, [userId]);
      
      if (result.rows.length === 0) {
        // Return default preferences
        return {
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: true,
          inAppEnabled: true,
          notifyOnInvite: true,
          notifyOnApproval: true,
          notifyOnRejection: true,
          notifyOnCheckin: true,
          notifyOnCheckout: true,
          notifyOnReminder: true,
          notifySecurityAlerts: true,
          quietHoursStart: null,
          quietHoursEnd: null
        };
      }
      
      const prefs = result.rows[0];
      return {
        emailEnabled: prefs.email_enabled,
        smsEnabled: prefs.sms_enabled,
        pushEnabled: prefs.push_enabled,
        inAppEnabled: true, // Always enabled
        notifyOnInvite: prefs.notify_on_invite,
        notifyOnApproval: prefs.notify_on_approval,
        notifyOnRejection: prefs.notify_on_rejection,
        notifyOnCheckin: prefs.notify_on_checkin,
        notifyOnCheckout: prefs.notify_on_checkout,
        notifyOnReminder: prefs.notify_on_reminder,
        notifySecurityAlerts: prefs.notify_security_alerts,
        quietHoursStart: prefs.quiet_hours_start,
        quietHoursEnd: prefs.quiet_hours_end
      };
    } catch (error) {
      logger.error('Failed to get user notification preferences', error);
      // Return safe defaults
      return {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        inAppEnabled: true,
        notifyOnInvite: true,
        notifyOnApproval: true,
        notifyOnRejection: true,
        notifyOnCheckin: true,
        notifyOnCheckout: true,
        notifyOnReminder: true,
        notifySecurityAlerts: true,
        quietHoursStart: null,
        quietHoursEnd: null
      };
    }
  }

  /**
   * Check if current time is within user's quiet hours
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} - True if it's quiet time
   */
  async isQuietTime(userId) {
    try {
      const preferences = await this.getUserNotificationPreferences(userId);
      
      if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
        return false;
      }
      
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const startTime = this.parseTimeString(preferences.quietHoursStart);
      const endTime = this.parseTimeString(preferences.quietHoursEnd);
      
      if (startTime <= endTime) {
        // Same day quiet hours (e.g., 22:00 to 06:00 next day)
        return currentTime >= startTime && currentTime <= endTime;
      } else {
        // Overnight quiet hours (e.g., 22:00 to 06:00 next day)
        return currentTime >= startTime || currentTime <= endTime;
      }
    } catch (error) {
      logger.error('Failed to check quiet time', error);
      return false;
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
   * Determine if push notifications should be used for this notification
   * @param {Object} notification - Notification object
   * @returns {boolean} - True if push should be used
   */
  shouldUsePush(notification) {
    const pushTypes = [
      'VISITOR_ARRIVAL',
      'VISITOR_EMERGENCY',
      'SECURITY_ALERT'
    ];
    
    return pushTypes.includes(notification.type) || notification.priority >= this.PRIORITIES.HIGH;
  }

  /**
   * Determine if email should be used for this notification
   * @param {Object} notification - Notification object
   * @returns {boolean} - True if email should be used
   */
  shouldUseEmail(notification) {
    const emailTypes = [
      'VISITOR_APPROVED',
      'VISITOR_REJECTED',
      'SYSTEM_MAINTENANCE'
    ];
    
    return emailTypes.includes(notification.type) || !!notification.includeEmail;
  }

  /**
   * Determine if SMS should be used for this notification
   * @param {Object} notification - Notification object
   * @returns {boolean} - True if SMS should be used
   */
  shouldUseSms(notification) {
    const smsTypes = [
      'VISITOR_EMERGENCY',
      'SECURITY_ALERT'
    ];
    
    return smsTypes.includes(notification.type) || notification.priority >= this.PRIORITIES.CRITICAL;
  }

  /**
   * Process the notification queue
   */
  async processNotificationQueue() {
    if (this.isProcessing) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // Process notifications by priority (highest first)
      const priorities = Array.from(this.priorityQueue.keys()).sort((a, b) => b - a);
      
      for (const priority of priorities) {
        const notifications = this.priorityQueue.get(priority);
        
        if (!notifications || notifications.length === 0) {
          continue;
        }
        
        // Group notifications if applicable
        const groupedNotifications = await this.groupNotifications(notifications);
        
        // Process each group or individual notification
        for (const item of groupedNotifications) {
          if (item.isGroup) {
            await this.processSummaryNotification(item);
          } else {
            await this.processIndividualNotification(item);
          }
        }
        
        // Clear processed notifications
        this.priorityQueue.set(priority, []);
      }
    } catch (error) {
      logger.error('Error processing notification queue', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Group notifications based on grouping rules
   * @param {Array} notifications - Array of notifications
   * @returns {Promise<Array>} - Array of grouped or individual notifications
   */
  async groupNotifications(notifications) {
    const grouped = [];
    const ungrouped = [...notifications];
    
    for (const [ruleName, rule] of this.groupingRules) {
      const matchingNotifications = ungrouped.filter(n => 
        rule.types.includes(n.type) && 
        this.isWithinTimeWindow(n, rule.timeWindow)
      );
      
      if (matchingNotifications.length <= 1) {
        continue;
      }
      
      // Group by specified fields
      const groups = new Map();
      
      for (const notification of matchingNotifications) {
        const groupKey = rule.groupBy.map(field => notification[field]).join('|');
        
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        
        groups.get(groupKey).push(notification);
      }
      
      // Create summary notifications for groups
      for (const [groupKey, groupNotifications] of groups) {
        if (groupNotifications.length > 1 && groupNotifications.length <= rule.maxGroupSize) {
          grouped.push({
            isGroup: true,
            rule: ruleName,
            notifications: groupNotifications,
            summaryTemplate: rule.summaryTemplate,
            priority: Math.max(...groupNotifications.map(n => n.priority)),
            channels: this.mergeChannels(groupNotifications.map(n => n.channels))
          });
          
          // Remove grouped notifications from ungrouped
          groupNotifications.forEach(gn => {
            const index = ungrouped.indexOf(gn);
            if (index > -1) {
              ungrouped.splice(index, 1);
            }
          });
        }
      }
    }
    
    // Add remaining ungrouped notifications
    grouped.push(...ungrouped.map(n => ({ ...n, isGroup: false })));
    
    return grouped;
  }

  /**
   * Check if notification is within time window
   * @param {Object} notification - Notification object
   * @param {number} timeWindow - Time window in milliseconds
   * @returns {boolean} - True if within time window
   */
  isWithinTimeWindow(notification, timeWindow) {
    const now = new Date();
    const queuedAt = new Date(notification.queuedAt);
    return (now - queuedAt) <= timeWindow;
  }

  /**
   * Merge channels from multiple notifications
   * @param {Array} channelArrays - Array of channel arrays
   * @returns {Array} - Merged unique channels
   */
  mergeChannels(channelArrays) {
    const allChannels = channelArrays.flat();
    return [...new Set(allChannels)];
  }

  /**
   * Process a summary notification for grouped notifications
   * @param {Object} groupItem - Grouped notification item
   */
  async processSummaryNotification(groupItem) {
    try {
      const summaryNotification = this.createSummaryNotification(groupItem);
      
      // Send through selected channels
      for (const channel of groupItem.channels) {
        await this.sendThroughChannel(summaryNotification, channel);
      }
      
      // Log the summary notification
      await this.logNotification(summaryNotification, 'summary');
      
      // Mark individual notifications as processed
      for (const notification of groupItem.notifications) {
        notification.status = 'grouped';
        await this.logNotification(notification, 'grouped');
      }
      
      logger.info('Summary notification processed', {
        rule: groupItem.rule,
        count: groupItem.notifications.length,
        channels: groupItem.channels.join(',')
      });
      
    } catch (error) {
      logger.error('Failed to process summary notification', error);
      
      // Fallback: process individual notifications
      for (const notification of groupItem.notifications) {
        await this.processIndividualNotification(notification);
      }
    }
  }

  /**
   * Create a summary notification from grouped notifications
   * @param {Object} groupItem - Grouped notification item
   * @returns {Object} - Summary notification
   */
  createSummaryNotification(groupItem) {
    const notifications = groupItem.notifications;
    const count = notifications.length;
    
    // Get the first notification as template
    const template = notifications[0];
    
    let title, message;
    
    switch (groupItem.summaryTemplate) {
      case 'visitor_summary':
        title = `${count} Visitor Updates`;
        message = `You have ${count} visitor notifications: ${notifications.map(n => n.title || n.type).join(', ')}`;
        break;
        
      case 'system_summary':
        title = `${count} System Notifications`;
        message = `You have ${count} system updates: ${notifications.map(n => n.title || n.type).join(', ')}`;
        break;
        
      default:
        title = `${count} Notifications`;
        message = `You have ${count} notifications grouped together`;
    }
    
    return {
      id: this.generateNotificationId(),
      type: 'SUMMARY',
      title,
      message,
      recipientId: template.recipientId,
      estateId: template.estateId,
      priority: groupItem.priority,
      channels: groupItem.channels,
      metadata: {
        isSummary: true,
        groupedCount: count,
        groupRule: groupItem.rule,
        originalNotifications: notifications.map(n => n.id)
      },
      createdAt: new Date()
    };
  }

  /**
   * Process an individual notification
   * @param {Object} notification - Notification object
   */
  async processIndividualNotification(notification) {
    try {
      notification.attempts += 1;
      
      // Send through selected channels
      const results = [];
      
      for (const channel of notification.channels) {
        const result = await this.sendThroughChannel(notification, channel);
        results.push({ channel, success: result.success, error: result.error });
      }
      
      // Check if at least one channel succeeded
      const hasSuccess = results.some(r => r.success);
      
      if (hasSuccess) {
        notification.status = 'sent';
        await this.logNotification(notification, 'sent');
        
        // Learn from successful delivery
        await this.recordUserBehavior(notification.recipientId, notification.type, 'delivered');
        
        logger.info('Notification sent successfully', {
          notificationId: notification.id,
          type: notification.type,
          channels: results.filter(r => r.success).map(r => r.channel).join(',')
        });
      } else {
        // All channels failed
        if (notification.attempts >= notification.maxAttempts) {
          notification.status = 'failed';
          await this.logNotification(notification, 'failed');
          
          logger.error('Notification failed after max attempts', {
            notificationId: notification.id,
            type: notification.type,
            attempts: notification.attempts,
            errors: results.map(r => r.error).join(', ')
          });
        } else {
          // Retry later with lower priority
          notification.priority = Math.max(notification.priority - 1, this.PRIORITIES.LOW);
          
          if (!this.priorityQueue.has(notification.priority)) {
            this.priorityQueue.set(notification.priority, []);
          }
          
          this.priorityQueue.get(notification.priority).push(notification);
          
          logger.warn('Notification retry queued', {
            notificationId: notification.id,
            attempt: notification.attempts,
            newPriority: notification.priority
          });
        }
      }
      
    } catch (error) {
      logger.error('Failed to process individual notification', error);
      notification.status = 'error';
      await this.logNotification(notification, 'error');
    }
  }

  /**
   * Send notification through specific channel
   * @param {Object} notification - Notification object
   * @param {string} channel - Channel type
   * @returns {Promise<Object>} - Result object with success/error
   */
  async sendThroughChannel(notification, channel) {
    try {
      switch (channel) {
        case this.CHANNELS.PUSH:
          return await this.sendPushNotification(notification);
          
        case this.CHANNELS.EMAIL:
          return await this.sendEmailNotification(notification);
          
        case this.CHANNELS.SMS:
          return await this.sendSmsNotification(notification);
          
        case this.CHANNELS.IN_APP:
          return await this.sendInAppNotification(notification);
          
        case this.CHANNELS.WEBSOCKET:
          return await this.sendWebSocketNotification(notification);
          
        default:
          throw new Error(`Unknown channel: ${channel}`);
      }
    } catch (error) {
      logger.error(`Failed to send notification through ${channel}`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} - Result object
   */
  async sendPushNotification(notification) {
    // Implementation would integrate with push notification service
    // For now, return success
    return { success: true, messageId: `push_${notification.id}` };
  }

  /**
   * Send email notification
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} - Result object
   */
  async sendEmailNotification(notification) {
    try {
      // Get user email
      const userQuery = 'SELECT email FROM users WHERE id = $1';
      const userResult = await db.query(userQuery, [notification.recipientId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const email = userResult.rows[0].email;
      const subject = notification.title || 'Notification';
      const html = this.generateEmailHtml(notification);
      
      const result = await notificationService.sendInviteEmail(email, subject, html);
      
      return { success: !!result, messageId: result?.messageId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SMS notification
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} - Result object
   */
  async sendSmsNotification(notification) {
    try {
      // Get user phone
      const userQuery = 'SELECT phone FROM users WHERE id = $1';
      const userResult = await db.query(userQuery, [notification.recipientId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const phone = userResult.rows[0].phone;
      
      if (!phone) {
        throw new Error('User phone not available');
      }
      
      const message = `${notification.title}: ${notification.message}`;
      const result = await notificationService.sendSms(phone, message);
      
      return { success: !!result?.success, messageId: result?.messageId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send in-app notification
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} - Result object
   */
  async sendInAppNotification(notification) {
    try {
      // Store in database for in-app display
      const query = `
        INSERT INTO notification_log (
          recipient_type,
          recipient_id,
          notification_type,
          channel,
          subject,
          body,
          status,
          metadata,
          sent_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING id
      `;
      
      const values = [
        'user',
        notification.recipientId,
        notification.type,
        'in_app',
        notification.title,
        notification.message,
        'sent',
        JSON.stringify(notification.metadata || {})
      ];
      
      const result = await db.query(query, values);
      
      return { success: true, messageId: `in_app_${result.rows[0].id}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send WebSocket notification
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} - Result object
   */
  async sendWebSocketNotification(notification) {
    try {
      websocketService.sendNotification(
        { userId: notification.recipientId },
        {
          type: notification.type,
          title: notification.title,
          message: notification.message,
          metadata: notification.metadata
        }
      );
      
      return { success: true, messageId: `ws_${notification.id}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate HTML content for email notifications
   * @param {Object} notification - Notification object
   * @returns {string} - HTML content
   */
  generateEmailHtml(notification) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${notification.title}</h2>
        <p>${notification.message}</p>
        ${notification.metadata?.actionUrl ? `
          <p style="margin-top: 20px;">
            <a href="${notification.metadata.actionUrl}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              ${notification.metadata.actionText || 'View Details'}
            </a>
          </p>
        ` : ''}
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated notification from Secure Gate Access Control System.
        </p>
      </div>
    `;
  }

  /**
   * Log notification to database
   * @param {Object} notification - Notification object
   * @param {string} status - Notification status
   */
  async logNotification(notification, status) {
    try {
      const query = `
        INSERT INTO notification_log (
          recipient_type,
          recipient_id,
          notification_type,
          channel,
          subject,
          body,
          status,
          metadata,
          sent_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `;
      
      const values = [
        'user',
        notification.recipientId,
        notification.type,
        notification.channels?.join(',') || 'unknown',
        notification.title,
        notification.message,
        status,
        JSON.stringify({
          ...notification.metadata,
          priority: notification.priority,
          attempts: notification.attempts,
          queuedAt: notification.queuedAt
        })
      ];
      
      await db.query(query, values);
    } catch (error) {
      logger.error('Failed to log notification', error);
    }
  }

  /**
   * Record user behavior for learning
   * @param {number} userId - User ID
   * @param {string} notificationType - Notification type
   * @param {string} action - User action (delivered, dismissed, clicked)
   */
  async recordUserBehavior(userId, notificationType, action) {
    try {
      const key = `${userId}:${notificationType}`;
      
      if (!this.userBehaviorData.has(key)) {
        this.userBehaviorData.set(key, {
          delivered: 0,
          dismissed: 0,
          clicked: 0,
          relevanceScore: 1.0
        });
      }
      
      const behavior = this.userBehaviorData.get(key);
      behavior[action] = (behavior[action] || 0) + 1;
      
      // Calculate relevance score
      const total = behavior.delivered + behavior.dismissed + behavior.clicked;
      if (total > 0) {
        behavior.relevanceScore = (behavior.clicked * 2 + behavior.delivered) / (total * 2);
      }
      
      // Persist to database periodically (not on every call for performance)
      if (Math.random() < 0.1) { // 10% chance to persist
        await this.persistUserBehavior(userId, notificationType, behavior);
      }
      
    } catch (error) {
      logger.error('Failed to record user behavior', error);
    }
  }

  /**
   * Persist user behavior to database
   * @param {number} userId - User ID
   * @param {string} notificationType - Notification type
   * @param {Object} behavior - Behavior data
   */
  async persistUserBehavior(userId, notificationType, behavior) {
    try {
      const query = `
        INSERT INTO user_notification_behavior (
          user_id,
          notification_type,
          delivered_count,
          dismissed_count,
          clicked_count,
          relevance_score,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (user_id, notification_type)
        DO UPDATE SET
          delivered_count = EXCLUDED.delivered_count,
          dismissed_count = EXCLUDED.dismissed_count,
          clicked_count = EXCLUDED.clicked_count,
          relevance_score = EXCLUDED.relevance_score,
          updated_at = NOW()
      `;
      
      await db.query(query, [
        userId,
        notificationType,
        behavior.delivered,
        behavior.dismissed,
        behavior.clicked,
        behavior.relevanceScore
      ]);
    } catch (error) {
      logger.error('Failed to persist user behavior', error);
    }
  }

  /**
   * Refresh user behavior cache from database
   * @param {number} userId - User ID
   */
  async refreshUserBehaviorCache(userId) {
    try {
      const query = `
        SELECT notification_type, delivered_count, dismissed_count, clicked_count, relevance_score
        FROM user_notification_behavior
        WHERE user_id = $1
      `;
      
      const result = await db.query(query, [userId]);
      
      // Update in-memory cache
      for (const row of result.rows) {
        const key = `${userId}:${row.notification_type}`;
        this.userBehaviorData.set(key, {
          delivered: row.delivered_count,
          dismissed: row.dismissed_count,
          clicked: row.clicked_count,
          relevanceScore: parseFloat(row.relevance_score)
        });
      }
      
      logger.debug('User behavior cache refreshed', {
        userId,
        typesLoaded: result.rows.length
      });
    } catch (error) {
      logger.error('Failed to refresh user behavior cache', error);
    }
  }

  /**
   * Get user behavior learning insights
   * @param {number} userId - User ID
   * @returns {Promise<Object>} - Learning insights
   */
  async getUserBehaviorInsights(userId) {
    try {
      const query = `
        SELECT 
          notification_type,
          delivered_count,
          dismissed_count,
          clicked_count,
          relevance_score,
          updated_at,
          CASE 
            WHEN delivered_count > 0 THEN ROUND((clicked_count::DECIMAL / delivered_count::DECIMAL) * 100, 2)
            ELSE 0 
          END as engagement_rate,
          CASE 
            WHEN delivered_count > 0 THEN ROUND((dismissed_count::DECIMAL / delivered_count::DECIMAL) * 100, 2)
            ELSE 0 
          END as dismissal_rate
        FROM user_notification_behavior
        WHERE user_id = $1
        ORDER BY relevance_score DESC, delivered_count DESC
      `;
      
      const result = await db.query(query, [userId]);
      
      const insights = {
        totalTypes: result.rows.length,
        highEngagementTypes: result.rows.filter(r => parseFloat(r.engagement_rate) > 50),
        lowEngagementTypes: result.rows.filter(r => parseFloat(r.engagement_rate) < 10 && r.delivered_count > 5),
        mostRelevantTypes: result.rows.slice(0, 5),
        leastRelevantTypes: result.rows.slice(-3),
        overallStats: {
          totalDelivered: result.rows.reduce((sum, r) => sum + r.delivered_count, 0),
          totalClicked: result.rows.reduce((sum, r) => sum + r.clicked_count, 0),
          totalDismissed: result.rows.reduce((sum, r) => sum + r.dismissed_count, 0)
        }
      };
      
      // Calculate overall engagement rate
      if (insights.overallStats.totalDelivered > 0) {
        insights.overallStats.engagementRate = (
          (insights.overallStats.totalClicked / insights.overallStats.totalDelivered) * 100
        ).toFixed(2);
      } else {
        insights.overallStats.engagementRate = 0;
      }
      
      return insights;
    } catch (error) {
      logger.error('Failed to get user behavior insights', error);
      return null;
    }
  }

  /**
   * Optimize notification delivery based on learned behavior
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} - Optimized notification
   */
  async optimizeNotificationDelivery(notification) {
    try {
      const userId = notification.recipientId;
      const notificationType = notification.type;
      
      // Get current relevance score
      const relevanceQuery = `
        SELECT calculate_notification_relevance_score($1, $2) as relevance_score
      `;
      
      const relevanceResult = await db.query(relevanceQuery, [userId, notificationType]);
      const relevanceScore = parseFloat(relevanceResult.rows[0].relevance_score);
      
      // Get user behavior insights
      const insights = await this.getUserBehaviorInsights(userId);
      
      // Optimize based on relevance score
      const optimizedNotification = { ...notification };
      
      // Adjust priority based on relevance
      if (relevanceScore < 0.3) {
        // Low relevance - reduce priority and limit channels
        optimizedNotification.priority = Math.max(notification.priority - 1, this.PRIORITIES.LOW);
        optimizedNotification.channels = notification.channels.filter(c => 
          c === this.CHANNELS.IN_APP || c === this.CHANNELS.WEBSOCKET
        );
      } else if (relevanceScore > 0.8) {
        // High relevance - increase priority and use preferred channels
        optimizedNotification.priority = Math.min(notification.priority + 1, this.PRIORITIES.EMERGENCY);
      }
      
      // Add learning metadata
      optimizedNotification.metadata = {
        ...notification.metadata,
        relevanceScore,
        optimized: true,
        learningInsights: {
          totalTypes: insights?.totalTypes || 0,
          overallEngagementRate: insights?.overallStats?.engagementRate || 0
        }
      };
      
      logger.debug('Notification delivery optimized', {
        notificationId: notification.id,
        originalPriority: notification.priority,
        optimizedPriority: optimizedNotification.priority,
        relevanceScore,
        channelCount: optimizedNotification.channels.length
      });
      
      return optimizedNotification;
    } catch (error) {
      logger.error('Failed to optimize notification delivery', error);
      return notification; // Return original if optimization fails
    }
  }

  /**
   * Generate unique notification ID
   * @returns {string} - Unique notification ID
   */
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get notification queue status
   * @returns {Object} - Queue status
   */
  getQueueStatus() {
    const status = {
      totalQueued: 0,
      byPriority: {},
      isProcessing: this.isProcessing
    };
    
    for (const [priority, notifications] of this.priorityQueue) {
      status.byPriority[priority] = notifications.length;
      status.totalQueued += notifications.length;
    }
    
    return status;
  }

  /**
   * Clear notification queue (for testing/maintenance)
   */
  clearQueue() {
    this.priorityQueue.clear();
    logger.info('Notification queue cleared');
  }

  /**
   * Get user behavior learning data for analytics
   * @param {number} userId - User ID
   * @returns {Promise<Array>} - Behavior data array
   */
  async getUserBehaviorData(userId) {
    try {
      const query = `
        SELECT 
          notification_type,
          delivered_count,
          dismissed_count,
          clicked_count,
          relevance_score,
          updated_at
        FROM user_notification_behavior
        WHERE user_id = $1
        ORDER BY relevance_score DESC
      `;
      
      const result = await db.query(query, [userId]);
      return result.rows.map(row => ({
        notificationType: row.notification_type,
        deliveredCount: row.delivered_count,
        dismissedCount: row.dismissed_count,
        clickedCount: row.clicked_count,
        relevanceScore: parseFloat(row.relevance_score),
        lastUpdated: row.updated_at
      }));
    } catch (error) {
      logger.error('Failed to get user behavior data', error);
      return [];
    }
  }

  /**
   * Calculate and update relevance scores for all user notification types
   * @param {number} userId - User ID
   * @param {boolean} forceRecalculation - Force recalculation of all scores
   * @returns {Promise<Object>} - Update results
   */
  async updateUserBehaviorLearning(userId, forceRecalculation = false) {
    try {
      const behaviorQuery = `
        SELECT notification_type, delivered_count, dismissed_count, clicked_count, relevance_score
        FROM user_notification_behavior
        WHERE user_id = $1
      `;

      const behaviorResult = await db.query(behaviorQuery, [userId]);
      const updatedBehaviors = [];

      for (const behavior of behaviorResult.rows) {
        // Calculate new relevance score
        const total = behavior.delivered_count + behavior.dismissed_count + behavior.clicked_count;
        let newScore = 1.0; // Default score

        if (total > 0) {
          // Weight clicks more heavily than deliveries, penalize dismissals
          newScore = Math.max(0.1, Math.min(1.0, 
            (behavior.clicked_count * 2 + behavior.delivered_count - behavior.dismissed_count * 0.5) / (total * 2)
          ));
        }

        // Update the behavior record with new relevance score
        const updateQuery = `
          UPDATE user_notification_behavior
          SET relevance_score = $1, updated_at = NOW()
          WHERE user_id = $2 AND notification_type = $3
          RETURNING *
        `;

        const updateResult = await db.query(updateQuery, [newScore, userId, behavior.notification_type]);
        updatedBehaviors.push({
          notificationType: behavior.notification_type,
          oldScore: parseFloat(behavior.relevance_score || 1.0),
          newScore: newScore,
          updated: updateResult.rows[0]
        });
      }

      // Update the in-memory cache
      await this.refreshUserBehaviorCache(userId);

      logger.info('User behavior learning updated', {
        userId,
        updatedTypes: updatedBehaviors.length,
        forceRecalculation
      });

      return {
        updatedBehaviors,
        totalUpdated: updatedBehaviors.length
      };
    } catch (error) {
      logger.error('Failed to update user behavior learning', error);
      throw error;
    }
  }

  /**
   * Get relevance score for a specific notification type
   * @param {number} userId - User ID
   * @param {string} notificationType - Notification type
   * @returns {Promise<Object>} - Relevance data
   */
  async getNotificationRelevance(userId, notificationType) {
    try {
      // Get behavior data
      const behaviorQuery = `
        SELECT * FROM user_notification_behavior
        WHERE user_id = $1 AND notification_type = $2
      `;

      const behaviorResult = await db.query(behaviorQuery, [userId, notificationType]);
      let behaviorData = behaviorResult.rows[0];

      // If no behavior data exists, create default
      if (!behaviorData) {
        const insertQuery = `
          INSERT INTO user_notification_behavior (
            user_id, notification_type, delivered_count, dismissed_count, 
            clicked_count, relevance_score, created_at, updated_at
          )
          VALUES ($1, $2, 0, 0, 0, 1.0, NOW(), NOW())
          RETURNING *
        `;
        
        const insertResult = await db.query(insertQuery, [userId, notificationType]);
        behaviorData = insertResult.rows[0];
      }

      // Calculate current relevance score
      const total = behaviorData.delivered_count + behaviorData.dismissed_count + behaviorData.clicked_count;
      let relevanceScore = 1.0; // Default score

      if (total > 0) {
        relevanceScore = Math.max(0.1, Math.min(1.0, 
          (behaviorData.clicked_count * 2 + behaviorData.delivered_count - behaviorData.dismissed_count * 0.5) / (total * 2)
        ));
      }

      return {
        notificationType,
        relevanceScore,
        behaviorData: {
          deliveredCount: behaviorData.delivered_count,
          dismissedCount: behaviorData.dismissed_count,
          clickedCount: behaviorData.clicked_count,
          lastUpdated: behaviorData.updated_at
        }
      };
    } catch (error) {
      logger.error('Failed to get notification relevance', error);
      throw error;
    }
  }
}

// Create singleton instance
const intelligentNotificationManager = new IntelligentNotificationManager();

export default intelligentNotificationManager;