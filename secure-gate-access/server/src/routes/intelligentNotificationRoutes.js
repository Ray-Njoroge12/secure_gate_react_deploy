/**
 * @file intelligentNotificationRoutes.js
 * @description Routes for intelligent notification management system
 * Features:
 * - Queue management
 * - User behavior analytics
 * - Notification preferences
 * - System monitoring
 */

import express from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { requireRolePolicy } from '../middleware/rolePolicy.js';
import { dbManager as db } from '../database/db.enhanced.js';
import logger from '../config/logger.js';
import intelligentNotificationManager from '../services/intelligentNotificationManager.js';

const router = express.Router();

/**
 * @route POST /api/intelligent-notifications/queue
 * @desc Queue a new intelligent notification
 * @access Private (authenticated)
 */
router.post('/queue', authenticateToken, async (req, res) => {
  try {
    const {
      type,
      title,
      message,
      recipientId,
      estateId,
      isUrgent = false,
      includeEmail = false,
      metadata = {}
    } = req.body;

    // Validation
    if (!type || !title || !message || !recipientId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, title, message, recipientId'
      });
    }

    // Create notification object
    const notification = {
      type,
      title,
      message,
      recipientId,
      estateId: estateId || req.user.estate_id,
      isUrgent,
      includeEmail,
      metadata,
      createdBy: req.user.id
    };

    // Queue the notification
    const notificationId = await intelligentNotificationManager.queueNotification(notification);

    logger.info('Notification queued via API', {
      notificationId,
      type,
      recipientId,
      createdBy: req.user.id
    });

    return res.status(201).json({
      success: true,
      data: {
        notificationId,
        message: 'Notification queued successfully'
      }
    });
  } catch (error) {
    logger.error('Failed to queue notification via API', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to queue notification'
    });
  }
});

/**
 * @route GET /api/intelligent-notifications/queue/status
 * @desc Get notification queue status
 * @access Private (admin only)
 */
router.get('/queue/status', authenticateToken, requireRolePolicy('adminOnly'), async (req, res) => {
  try {
    const status = intelligentNotificationManager.getQueueStatus();
    
    return res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get queue status', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get queue status'
    });
  }
});

/**
 * @route POST /api/intelligent-notifications/queue/clear
 * @desc Clear notification queue (maintenance)
 * @access Private (admin only)
 */
router.post('/queue/clear', authenticateToken, requireRolePolicy('adminOnly'), async (req, res) => {
  try {
    intelligentNotificationManager.clearQueue();
    
    logger.info('Notification queue cleared by admin', { adminId: req.user.id });
    
    return res.json({
      success: true,
      message: 'Notification queue cleared'
    });
  } catch (error) {
    logger.error('Failed to clear queue', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to clear queue'
    });
  }
});

/**
 * @route GET /api/intelligent-notifications/preferences
 * @desc Get user notification preferences with intelligent features
 * @access Private (authenticated)
 */
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get basic preferences
    const prefsQuery = `
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
        quiet_hours_end,
        language,
        created_at,
        updated_at
      FROM notification_preferences
      WHERE user_id = $1
    `;
    
    const prefsResult = await db.query(prefsQuery, [userId]);
    
    // Get user behavior data
    const behaviorQuery = `
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
    
    const behaviorResult = await db.query(behaviorQuery, [userId]);
    
    // Get notification statistics
    const statsQuery = `
      SELECT 
        notification_type,
        COUNT(*) as total_count,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
        COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) as read_count
      FROM notification_log
      WHERE recipient_id = $1 AND recipient_type = 'user'
        AND sent_at >= NOW() - INTERVAL '30 days'
      GROUP BY notification_type
      ORDER BY total_count DESC
    `;
    
    const statsResult = await db.query(statsQuery, [userId]);
    
    // Default preferences if none exist
    const preferences = prefsResult.rows[0] || {
      email_enabled: true,
      sms_enabled: false,
      push_enabled: true,
      notify_on_invite: true,
      notify_on_approval: true,
      notify_on_rejection: true,
      notify_on_checkin: true,
      notify_on_checkout: true,
      notify_on_reminder: true,
      notify_security_alerts: true,
      quiet_hours_start: null,
      quiet_hours_end: null,
      language: 'en'
    };
    
    // Transform to camelCase and add intelligent features
    const response = {
      preferences: {
        emailEnabled: preferences.email_enabled,
        smsEnabled: preferences.sms_enabled,
        pushEnabled: preferences.push_enabled,
        notifyOnInvite: preferences.notify_on_invite,
        notifyOnApproval: preferences.notify_on_approval,
        notifyOnRejection: preferences.notify_on_rejection,
        notifyOnCheckin: preferences.notify_on_checkin,
        notifyOnCheckout: preferences.notify_on_checkout,
        notifyOnReminder: preferences.notify_on_reminder,
        notifySecurityAlerts: preferences.notify_security_alerts,
        quietHoursStart: preferences.quiet_hours_start,
        quietHoursEnd: preferences.quiet_hours_end,
        language: preferences.language
      },
      behavior: behaviorResult.rows.map(row => ({
        notificationType: row.notification_type,
        deliveredCount: row.delivered_count,
        dismissedCount: row.dismissed_count,
        clickedCount: row.clicked_count,
        relevanceScore: parseFloat(row.relevance_score),
        lastUpdated: row.updated_at
      })),
      statistics: statsResult.rows.map(row => ({
        notificationType: row.notification_type,
        totalCount: parseInt(row.total_count),
        sentCount: parseInt(row.sent_count),
        failedCount: parseInt(row.failed_count),
        readCount: parseInt(row.read_count),
        deliveryRate: row.total_count > 0 ? (row.sent_count / row.total_count * 100).toFixed(1) : 0,
        readRate: row.sent_count > 0 ? (row.read_count / row.sent_count * 100).toFixed(1) : 0
      }))
    };
    
    return res.json({
      success: true,
      data: response
    });
  } catch (error) {
    logger.error('Failed to get intelligent notification preferences', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load preferences'
    });
  }
});

/**
 * @route PUT /api/intelligent-notifications/preferences
 * @desc Update notification preferences with intelligent features
 * @access Private (authenticated)
 */
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      emailEnabled,
      smsEnabled,
      pushEnabled,
      notifyOnInvite,
      notifyOnApproval,
      notifyOnRejection,
      notifyOnCheckin,
      notifyOnCheckout,
      notifyOnReminder,
      notifySecurityAlerts,
      quietHoursStart,
      quietHoursEnd,
      language = 'en'
    } = req.body;

    // Validate quiet hours format
    if (quietHoursStart && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(quietHoursStart)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quiet hours start format. Use HH:MM format.'
      });
    }

    if (quietHoursEnd && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(quietHoursEnd)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quiet hours end format. Use HH:MM format.'
      });
    }

    const query = `
      INSERT INTO notification_preferences (
        user_id,
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
        quiet_hours_end,
        language,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        email_enabled = EXCLUDED.email_enabled,
        sms_enabled = EXCLUDED.sms_enabled,
        push_enabled = EXCLUDED.push_enabled,
        notify_on_invite = EXCLUDED.notify_on_invite,
        notify_on_approval = EXCLUDED.notify_on_approval,
        notify_on_rejection = EXCLUDED.notify_on_rejection,
        notify_on_checkin = EXCLUDED.notify_on_checkin,
        notify_on_checkout = EXCLUDED.notify_on_checkout,
        notify_on_reminder = EXCLUDED.notify_on_reminder,
        notify_security_alerts = EXCLUDED.notify_security_alerts,
        quiet_hours_start = EXCLUDED.quiet_hours_start,
        quiet_hours_end = EXCLUDED.quiet_hours_end,
        language = EXCLUDED.language,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      userId,
      emailEnabled ?? true,
      smsEnabled ?? false,
      pushEnabled ?? true,
      notifyOnInvite ?? true,
      notifyOnApproval ?? true,
      notifyOnRejection ?? true,
      notifyOnCheckin ?? true,
      notifyOnCheckout ?? true,
      notifyOnReminder ?? true,
      notifySecurityAlerts ?? true,
      quietHoursStart,
      quietHoursEnd,
      language
    ];

    const result = await db.query(query, values);

    logger.info('Notification preferences updated', {
      userId,
      quietHours: quietHoursStart && quietHoursEnd ? `${quietHoursStart}-${quietHoursEnd}` : 'disabled'
    });

    return res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: {
        preferences: {
          emailEnabled: result.rows[0].email_enabled,
          smsEnabled: result.rows[0].sms_enabled,
          pushEnabled: result.rows[0].push_enabled,
          notifyOnInvite: result.rows[0].notify_on_invite,
          notifyOnApproval: result.rows[0].notify_on_approval,
          notifyOnRejection: result.rows[0].notify_on_rejection,
          notifyOnCheckin: result.rows[0].notify_on_checkin,
          notifyOnCheckout: result.rows[0].notify_on_checkout,
          notifyOnReminder: result.rows[0].notify_on_reminder,
          notifySecurityAlerts: result.rows[0].notify_security_alerts,
          quietHoursStart: result.rows[0].quiet_hours_start,
          quietHoursEnd: result.rows[0].quiet_hours_end,
          language: result.rows[0].language
        }
      }
    });
  } catch (error) {
    logger.error('Failed to update notification preferences', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

/**
 * @route POST /api/intelligent-notifications/behavior/track
 * @desc Track user notification behavior (dismissed, clicked, etc.)
 * @access Private (authenticated)
 */
router.post('/behavior/track', authenticateToken, async (req, res) => {
  try {
    const { notificationId, notificationType, action } = req.body;
    const userId = req.user.id;

    // Validation
    if (!notificationType || !action) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: notificationType, action'
      });
    }

    const validActions = ['delivered', 'dismissed', 'clicked', 'read'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: `Invalid action. Must be one of: ${validActions.join(', ')}`
      });
    }

    // Record behavior in the intelligent notification manager
    await intelligentNotificationManager.recordUserBehavior(userId, notificationType, action);

    // Also track in notification interactions table if notificationId provided
    if (notificationId) {
      const trackQuery = `
        INSERT INTO notification_interactions (user_id, notification_id, action, timestamp)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id, notification_id, action) DO NOTHING
      `;
      
      await db.query(trackQuery, [userId, notificationId, action]);
    }

    logger.debug('Notification behavior tracked', {
      userId,
      notificationType,
      action,
      notificationId
    });

    return res.json({
      success: true,
      message: 'Behavior tracked successfully'
    });
  } catch (error) {
    logger.error('Failed to track notification behavior', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to track behavior'
    });
  }
});

/**
 * @route GET /api/intelligent-notifications/analytics
 * @desc Get notification analytics and insights
 * @access Private (authenticated)
 */
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    // Validate days parameter
    const daysParsed = Math.min(Math.max(parseInt(days) || 30, 1), 365);

    // Get notification delivery analytics
    const deliveryQuery = `
      SELECT 
        DATE(sent_at) as date,
        notification_type,
        channel,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM notification_log
      WHERE recipient_id = $1 AND recipient_type = 'user'
        AND sent_at >= NOW() - INTERVAL '${daysParsed} days'
      GROUP BY DATE(sent_at), notification_type, channel
      ORDER BY date DESC, notification_type, channel
    `;

    const deliveryResult = await db.query(deliveryQuery, [userId]);

    // Get user engagement analytics
    const engagementQuery = `
      SELECT 
        nb.notification_type,
        nb.delivered_count,
        nb.dismissed_count,
        nb.clicked_count,
        nb.relevance_score,
        COALESCE(ni.interaction_count, 0) as recent_interactions
      FROM user_notification_behavior nb
      LEFT JOIN (
        SELECT 
          nl.notification_type,
          COUNT(ni.id) as interaction_count
        FROM notification_log nl
        LEFT JOIN notification_interactions ni ON nl.id = ni.notification_id
        WHERE nl.recipient_id = $1 AND nl.sent_at >= NOW() - INTERVAL '${daysParsed} days'
        GROUP BY nl.notification_type
      ) ni ON nb.notification_type = ni.notification_type
      WHERE nb.user_id = $1
      ORDER BY nb.relevance_score DESC
    `;

    const engagementResult = await db.query(engagementQuery, [userId]);

    // Get quiet hours effectiveness
    const quietHoursQuery = `
      SELECT 
        EXTRACT(HOUR FROM sent_at) as hour,
        COUNT(*) as notifications_sent,
        COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) as notifications_read
      FROM notification_log
      WHERE recipient_id = $1 AND recipient_type = 'user'
        AND sent_at >= NOW() - INTERVAL '${daysParsed} days'
      GROUP BY EXTRACT(HOUR FROM sent_at)
      ORDER BY hour
    `;

    const quietHoursResult = await db.query(quietHoursQuery, [userId]);

    // Calculate summary statistics
    const totalNotifications = deliveryResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    const successfulNotifications = deliveryResult.rows.reduce((sum, row) => sum + parseInt(row.successful), 0);
    const failedNotifications = deliveryResult.rows.reduce((sum, row) => sum + parseInt(row.failed), 0);

    const response = {
      summary: {
        totalNotifications,
        successfulNotifications,
        failedNotifications,
        deliveryRate: totalNotifications > 0 ? ((successfulNotifications / totalNotifications) * 100).toFixed(1) : 0,
        period: `${daysParsed} days`
      },
      delivery: deliveryResult.rows.map(row => ({
        date: row.date,
        notificationType: row.notification_type,
        channel: row.channel,
        count: parseInt(row.count),
        successful: parseInt(row.successful),
        failed: parseInt(row.failed),
        successRate: row.count > 0 ? ((row.successful / row.count) * 100).toFixed(1) : 0
      })),
      engagement: engagementResult.rows.map(row => ({
        notificationType: row.notification_type,
        deliveredCount: row.delivered_count,
        dismissedCount: row.dismissed_count,
        clickedCount: row.clicked_count,
        relevanceScore: parseFloat(row.relevance_score),
        recentInteractions: parseInt(row.recent_interactions),
        engagementRate: row.delivered_count > 0 ? 
          ((row.clicked_count / row.delivered_count) * 100).toFixed(1) : 0
      })),
      hourlyDistribution: quietHoursResult.rows.map(row => ({
        hour: parseInt(row.hour),
        notificationsSent: parseInt(row.notifications_sent),
        notificationsRead: parseInt(row.notifications_read),
        readRate: row.notifications_sent > 0 ? 
          ((row.notifications_read / row.notifications_sent) * 100).toFixed(1) : 0
      }))
    };

    return res.json({
      success: true,
      data: response
    });
  } catch (error) {
    logger.error('Failed to get notification analytics', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load analytics'
    });
  }
});

/**
 * @route POST /api/intelligent-notifications/test
 * @desc Send a test notification through the intelligent system
 * @access Private (authenticated)
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { type = 'TEST', title = 'Test Notification', message = 'This is a test notification from the intelligent notification system.' } = req.body;
    
    const notification = {
      type,
      title,
      message,
      recipientId: req.user.id,
      estateId: req.user.estate_id,
      isUrgent: false,
      includeEmail: false,
      metadata: {
        isTest: true,
        createdBy: req.user.id
      }
    };

    const notificationId = await intelligentNotificationManager.queueNotification(notification);

    logger.info('Test notification queued', {
      notificationId,
      userId: req.user.id
    });

    return res.json({
      success: true,
      data: {
        notificationId,
        message: 'Test notification queued successfully'
      }
    });
  } catch (error) {
    logger.error('Failed to send test notification', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
});

/**
 * @route GET /api/intelligent-notifications/system/health
 * @desc Get intelligent notification system health status
 * @access Private (admin only)
 */
router.get('/system/health', authenticateToken, requireRolePolicy('adminOnly'), async (req, res) => {
  try {
    const queueStatus = intelligentNotificationManager.getQueueStatus();
    
    // Get recent system performance
    const performanceQuery = `
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful_notifications,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_notifications,
        AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) as avg_processing_time
      FROM notification_log
      WHERE sent_at >= NOW() - INTERVAL '1 hour'
    `;
    
    const performanceResult = await db.query(performanceQuery);
    const performance = performanceResult.rows[0];
    
    // Get channel health
    const channelQuery = `
      SELECT 
        channel,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM notification_log
      WHERE sent_at >= NOW() - INTERVAL '24 hours'
      GROUP BY channel
      ORDER BY total DESC
    `;
    
    const channelResult = await db.query(channelQuery);
    
    const health = {
      status: queueStatus.totalQueued < 1000 ? 'healthy' : 'warning',
      queue: queueStatus,
      performance: {
        totalNotifications: parseInt(performance.total_notifications) || 0,
        successfulNotifications: parseInt(performance.successful_notifications) || 0,
        failedNotifications: parseInt(performance.failed_notifications) || 0,
        successRate: performance.total_notifications > 0 ? 
          ((performance.successful_notifications / performance.total_notifications) * 100).toFixed(1) : 100,
        avgProcessingTime: parseFloat(performance.avg_processing_time) || 0
      },
      channels: channelResult.rows.map(row => ({
        channel: row.channel,
        total: parseInt(row.total),
        successful: parseInt(row.successful),
        failed: parseInt(row.failed),
        successRate: row.total > 0 ? ((row.successful / row.total) * 100).toFixed(1) : 0
      })),
      timestamp: new Date().toISOString()
    };
    
    return res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Failed to get system health', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get system health'
    });
  }
});

export default router;
/**
 * @route POST /api/intelligent-notifications/history
 * @desc Get notification history with filtering and search
 * @access Private (authenticated)
 */
router.post('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      startDate,
      endDate,
      search,
      type,
      status,
      channel,
      limit = 100,
      offset = 0
    } = req.body;

    // Build dynamic query
    let query = `
      SELECT 
        nl.id,
        nl.notification_type as type,
        nl.subject as title,
        nl.body as message,
        nl.status,
        nl.channel as channels,
        nl.metadata,
        nl.sent_at as "createdAt",
        ni.timestamp as "readAt",
        COALESCE(
          CASE 
            WHEN nl.metadata->>'priority' IS NOT NULL 
            THEN (nl.metadata->>'priority')::integer 
            ELSE 2 
          END, 2
        ) as priority
      FROM notification_log nl
      LEFT JOIN notification_interactions ni ON nl.id = ni.notification_id AND ni.action = 'read'
      WHERE nl.recipient_id = $1 AND nl.recipient_type = 'user'
    `;

    const params = [userId];
    let paramIndex = 2;

    // Date filtering
    if (startDate) {
      query += ` AND nl.sent_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND nl.sent_at <= $${paramIndex}`;
      params.push(endDate + ' 23:59:59'); // Include full end date
      paramIndex++;
    }

    // Search filtering
    if (search) {
      query += ` AND (nl.subject ILIKE $${paramIndex} OR nl.body ILIKE $${paramIndex} OR nl.notification_type ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Type filtering
    if (type && type !== 'all') {
      query += ` AND nl.notification_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    // Status filtering
    if (status && status !== 'all') {
      query += ` AND nl.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Channel filtering
    if (channel && channel !== 'all') {
      query += ` AND nl.channel LIKE $${paramIndex}`;
      params.push(`%${channel}%`);
      paramIndex++;
    }

    // Add ordering and pagination
    query += ` ORDER BY nl.sent_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Transform channels from string to array
    const notifications = result.rows.map(row => ({
      ...row,
      channels: row.channels ? row.channels.split(',').map(c => c.trim()) : []
    }));

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM notification_log nl
      WHERE nl.recipient_id = $1 AND nl.recipient_type = 'user'
    `;

    const countParams = [userId];
    let countParamIndex = 2;

    // Apply same filters to count query
    if (startDate) {
      countQuery += ` AND nl.sent_at >= $${countParamIndex}`;
      countParams.push(startDate);
      countParamIndex++;
    }

    if (endDate) {
      countQuery += ` AND nl.sent_at <= $${countParamIndex}`;
      countParams.push(endDate + ' 23:59:59');
      countParamIndex++;
    }

    if (search) {
      countQuery += ` AND (nl.subject ILIKE $${countParamIndex} OR nl.body ILIKE $${countParamIndex} OR nl.notification_type ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    if (type && type !== 'all') {
      countQuery += ` AND nl.notification_type = $${countParamIndex}`;
      countParams.push(type);
      countParamIndex++;
    }

    if (status && status !== 'all') {
      countQuery += ` AND nl.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (channel && channel !== 'all') {
      countQuery += ` AND nl.channel LIKE $${countParamIndex}`;
      countParams.push(`%${channel}%`);
      countParamIndex++;
    }

    const countResult = await db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].total);

    logger.info('Notification history retrieved', {
      userId,
      count: notifications.length,
      totalCount,
      filters: { startDate, endDate, search, type, status, channel }
    });

    return res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + notifications.length < totalCount
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get notification history', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load notification history'
    });
  }
});

/**
 * @route GET /api/intelligent-notifications/export
 * @desc Export notification history to CSV
 * @access Private (authenticated)
 */
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      startDate,
      endDate,
      type,
      status,
      format = 'csv'
    } = req.query;

    // Build query for export (no pagination)
    let query = `
      SELECT 
        nl.sent_at as date,
        nl.notification_type as type,
        nl.subject as title,
        nl.body as message,
        nl.status,
        nl.channel as channels,
        COALESCE(
          CASE 
            WHEN nl.metadata->>'priority' IS NOT NULL 
            THEN (nl.metadata->>'priority')::integer 
            ELSE 2 
          END, 2
        ) as priority,
        ni.timestamp as read_at
      FROM notification_log nl
      LEFT JOIN notification_interactions ni ON nl.id = ni.notification_id AND ni.action = 'read'
      WHERE nl.recipient_id = $1 AND nl.recipient_type = 'user'
    `;

    const params = [userId];
    let paramIndex = 2;

    // Apply filters
    if (startDate) {
      query += ` AND nl.sent_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND nl.sent_at <= $${paramIndex}`;
      params.push(endDate + ' 23:59:59');
      paramIndex++;
    }

    if (type && type !== 'all') {
      query += ` AND nl.notification_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (status && status !== 'all') {
      query += ` AND nl.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY nl.sent_at DESC LIMIT 10000`; // Reasonable export limit

    const result = await db.query(query, params);

    if (format === 'csv') {
      // Generate CSV
      const headers = ['Date', 'Type', 'Title', 'Message', 'Status', 'Channels', 'Priority', 'Read At'];
      const csvRows = [headers.join(',')];

      result.rows.forEach(row => {
        const csvRow = [
          `"${row.date}"`,
          `"${row.type}"`,
          `"${(row.title || '').replace(/"/g, '""')}"`,
          `"${(row.message || '').replace(/"/g, '""')}"`,
          `"${row.status}"`,
          `"${row.channels || ''}"`,
          `"${row.priority}"`,
          `"${row.read_at || ''}"`
        ];
        csvRows.push(csvRow.join(','));
      });

      const csvContent = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="notification-history-${new Date().toISOString().split('T')[0]}.csv"`);
      
      logger.info('Notification history exported', {
        userId,
        count: result.rows.length,
        format
      });

      return res.send(csvContent);
    } else {
      // JSON export
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="notification-history-${new Date().toISOString().split('T')[0]}.json"`);
      
      return res.json({
        exportDate: new Date().toISOString(),
        totalRecords: result.rows.length,
        filters: { startDate, endDate, type, status },
        data: result.rows
      });
    }
  } catch (error) {
    logger.error('Failed to export notification history', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to export notification history'
    });
  }
});

/**
 * @route GET /api/intelligent-notifications/insights
 * @desc Get advanced notification insights and recommendations
 * @access Private (authenticated)
 */
router.get('/insights', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    // Get user behavior insights
    const behaviorQuery = `
      SELECT 
        notification_type,
        delivered_count,
        dismissed_count,
        clicked_count,
        relevance_score
      FROM user_notification_behavior
      WHERE user_id = $1
      ORDER BY relevance_score DESC
    `;

    const behaviorResult = await db.query(behaviorQuery, [userId]);

    // Get delivery pattern insights
    const patternQuery = `
      SELECT 
        EXTRACT(HOUR FROM sent_at) as hour,
        EXTRACT(DOW FROM sent_at) as day_of_week,
        COUNT(*) as notification_count,
        COUNT(CASE WHEN ni.action = 'read' THEN 1 END) as read_count
      FROM notification_log nl
      LEFT JOIN notification_interactions ni ON nl.id = ni.notification_id AND ni.action = 'read'
      WHERE nl.recipient_id = $1 AND nl.sent_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY EXTRACT(HOUR FROM sent_at), EXTRACT(DOW FROM sent_at)
      ORDER BY notification_count DESC
    `;

    const patternResult = await db.query(patternQuery, [userId]);

    // Get channel effectiveness
    const channelQuery = `
      SELECT 
        channel,
        COUNT(*) as total_sent,
        COUNT(CASE WHEN ni.action = 'read' THEN 1 END) as total_read,
        COUNT(CASE WHEN ni.action = 'clicked' THEN 1 END) as total_clicked
      FROM notification_log nl
      LEFT JOIN notification_interactions ni ON nl.id = ni.notification_id
      WHERE nl.recipient_id = $1 AND nl.sent_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY channel
      ORDER BY total_sent DESC
    `;

    const channelResult = await db.query(channelQuery, [userId]);

    // Generate insights and recommendations
    const insights = {
      userBehavior: behaviorResult.rows.map(row => ({
        notificationType: row.notification_type,
        deliveredCount: row.delivered_count,
        dismissedCount: row.dismissed_count,
        clickedCount: row.clicked_count,
        relevanceScore: parseFloat(row.relevance_score),
        engagementRate: row.delivered_count > 0 ? 
          ((row.clicked_count / row.delivered_count) * 100).toFixed(1) : 0
      })),
      
      deliveryPatterns: patternResult.rows.map(row => ({
        hour: parseInt(row.hour),
        dayOfWeek: parseInt(row.day_of_week),
        notificationCount: parseInt(row.notification_count),
        readCount: parseInt(row.read_count),
        readRate: row.notification_count > 0 ? 
          ((row.read_count / row.notification_count) * 100).toFixed(1) : 0
      })),
      
      channelEffectiveness: channelResult.rows.map(row => ({
        channel: row.channel,
        totalSent: parseInt(row.total_sent),
        totalRead: parseInt(row.total_read),
        totalClicked: parseInt(row.total_clicked),
        readRate: row.total_sent > 0 ? 
          ((row.total_read / row.total_sent) * 100).toFixed(1) : 0,
        clickRate: row.total_sent > 0 ? 
          ((row.total_clicked / row.total_sent) * 100).toFixed(1) : 0
      })),
      
      recommendations: generateRecommendations(behaviorResult.rows, patternResult.rows, channelResult.rows)
    };

    logger.info('Notification insights generated', {
      userId,
      period: `${days} days`
    });

    return res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    logger.error('Failed to get notification insights', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load insights'
    });
  }
});

/**
 * @route POST /api/intelligent-notifications/behavior/learn
 * @desc Update user behavior learning and recalculate relevance scores
 * @access Private (authenticated)
 */
router.post('/behavior/learn', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { forceRecalculation = false } = req.body;

    // Recalculate relevance scores for all notification types
    const behaviorQuery = `
      SELECT notification_type, delivered_count, dismissed_count, clicked_count
      FROM user_notification_behavior
      WHERE user_id = $1
    `;

    const behaviorResult = await db.query(behaviorQuery, [userId]);
    const updatedBehaviors = [];

    for (const behavior of behaviorResult.rows) {
      // Calculate new relevance score using the database function
      const relevanceQuery = `
        SELECT calculate_notification_relevance_score($1, $2) as new_score
      `;
      
      const relevanceResult = await db.query(relevanceQuery, [userId, behavior.notification_type]);
      const newScore = parseFloat(relevanceResult.rows[0].new_score);

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

    // Update the intelligent notification manager's cache
    await intelligentNotificationManager.refreshUserBehaviorCache(userId);

    logger.info('User behavior learning updated', {
      userId,
      updatedTypes: updatedBehaviors.length,
      forceRecalculation
    });

    return res.json({
      success: true,
      message: 'Behavior learning updated successfully',
      data: {
        updatedBehaviors,
        totalUpdated: updatedBehaviors.length
      }
    });
  } catch (error) {
    logger.error('Failed to update behavior learning', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update behavior learning'
    });
  }
});

/**
 * @route GET /api/intelligent-notifications/relevance/:notificationType
 * @desc Get relevance score for a specific notification type
 * @access Private (authenticated)
 */
router.get('/relevance/:notificationType', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationType } = req.params;

    // Get current relevance score
    const relevanceQuery = `
      SELECT calculate_notification_relevance_score($1, $2) as relevance_score
    `;

    const result = await db.query(relevanceQuery, [userId, notificationType]);
    const relevanceScore = parseFloat(result.rows[0].relevance_score);

    // Get behavior data for context
    const behaviorQuery = `
      SELECT * FROM user_notification_behavior
      WHERE user_id = $1 AND notification_type = $2
    `;

    const behaviorResult = await db.query(behaviorQuery, [userId, notificationType]);
    const behaviorData = behaviorResult.rows[0] || null;

    return res.json({
      success: true,
      data: {
        notificationType,
        relevanceScore,
        behaviorData: behaviorData ? {
          deliveredCount: behaviorData.delivered_count,
          dismissedCount: behaviorData.dismissed_count,
          clickedCount: behaviorData.clicked_count,
          lastUpdated: behaviorData.updated_at
        } : null
      }
    });
  } catch (error) {
    logger.error('Failed to get relevance score', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get relevance score'
    });
  }
});

/**
 * Generate personalized recommendations based on user behavior
 */
function generateRecommendations(behaviorData, patternData, channelData) {
  const recommendations = [];

  // Analyze low engagement types with improved thresholds
  const lowEngagementTypes = behaviorData.filter(b => 
    b.delivered_count > 5 && (b.clicked_count / b.delivered_count) < 0.1
  );

  if (lowEngagementTypes.length > 0) {
    recommendations.push({
      type: 'engagement',
      priority: 'high',
      title: 'Low Engagement Notification Types',
      description: `Consider reducing frequency for: ${lowEngagementTypes.map(t => t.notification_type.replace(/_/g, ' ')).join(', ')}`,
      action: 'Adjust notification preferences to reduce noise and improve relevance'
    });
  }

  // Analyze high engagement types for positive reinforcement
  const highEngagementTypes = behaviorData.filter(b => 
    b.delivered_count > 3 && (b.clicked_count / b.delivered_count) > 0.5
  );

  if (highEngagementTypes.length > 0) {
    recommendations.push({
      type: 'engagement',
      priority: 'low',
      title: 'High Engagement Notification Types',
      description: `You actively engage with: ${highEngagementTypes.map(t => t.notification_type.replace(/_/g, ' ')).join(', ')}`,
      action: 'Consider enabling more detailed notifications for these types'
    });
  }

  // Analyze optimal delivery times with better insights
  const bestHours = patternData
    .filter(p => p.notification_count > 2)
    .sort((a, b) => parseFloat(b.read_rate) - parseFloat(a.read_rate))
    .slice(0, 3);

  if (bestHours.length > 0) {
    const timeRanges = bestHours.map(h => {
      const hour = parseInt(h.hour);
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      return `${hour}:00 (${timeOfDay})`;
    });

    recommendations.push({
      type: 'timing',
      priority: 'medium',
      title: 'Optimal Delivery Times',
      description: `You're most likely to read notifications at: ${timeRanges.join(', ')}`,
      action: 'Consider setting quiet hours outside these peak engagement times'
    });
  }

  // Analyze poor delivery times
  const worstHours = patternData
    .filter(p => p.notification_count > 2 && parseFloat(p.read_rate) < 20)
    .sort((a, b) => parseFloat(a.read_rate) - parseFloat(b.read_rate))
    .slice(0, 2);

  if (worstHours.length > 0) {
    recommendations.push({
      type: 'timing',
      priority: 'medium',
      title: 'Low Engagement Hours',
      description: `Notifications sent at ${worstHours.map(h => `${h.hour}:00`).join(', ')} have low read rates`,
      action: 'Consider setting these as quiet hours to reduce notification fatigue'
    });
  }

  // Analyze channel effectiveness with detailed insights
  const bestChannels = channelData
    .filter(c => c.total_sent > 3)
    .sort((a, b) => parseFloat(b.read_rate) - parseFloat(a.read_rate))
    .slice(0, 2);

  if (bestChannels.length > 0) {
    recommendations.push({
      type: 'channel',
      priority: 'medium',
      title: 'Most Effective Channels',
      description: `${bestChannels.map(c => c.channel.toUpperCase()).join(' and ')} have the highest read rates (${bestChannels.map(c => c.read_rate + '%').join(', ')})`,
      action: 'Focus important notifications on these high-performing channels'
    });
  }

  // Analyze underperforming channels
  const worstChannels = channelData
    .filter(c => c.total_sent > 5 && parseFloat(c.read_rate) < 30)
    .sort((a, b) => parseFloat(a.read_rate) - parseFloat(b.read_rate));

  if (worstChannels.length > 0) {
    recommendations.push({
      type: 'channel',
      priority: 'low',
      title: 'Underperforming Channels',
      description: `${worstChannels.map(c => c.channel.toUpperCase()).join(', ')} have low engagement rates`,
      action: 'Consider disabling or reducing frequency for these channels'
    });
  }

  // Check for notification overload with better thresholds
  const totalNotifications = behaviorData.reduce((sum, b) => sum + b.delivered_count, 0);
  const totalEngagement = behaviorData.reduce((sum, b) => sum + b.clicked_count, 0);
  const overallEngagementRate = totalNotifications > 0 ? (totalEngagement / totalNotifications) : 0;

  if (totalNotifications > 100) {
    recommendations.push({
      type: 'volume',
      priority: 'high',
      title: 'High Notification Volume',
      description: `You've received ${totalNotifications} notifications with ${(overallEngagementRate * 100).toFixed(1)}% engagement rate`,
      action: 'Consider enabling notification grouping or adjusting frequency settings to reduce fatigue'
    });
  }

  // Analyze notification diversity
  const activeTypes = behaviorData.filter(b => b.delivered_count > 0).length;
  if (activeTypes > 8) {
    recommendations.push({
      type: 'diversity',
      priority: 'medium',
      title: 'High Notification Diversity',
      description: `You receive ${activeTypes} different types of notifications`,
      action: 'Consider consolidating similar notification types or using summary notifications'
    });
  }

  // Learning opportunity recommendations
  if (behaviorData.length < 3) {
    recommendations.push({
      type: 'learning',
      priority: 'low',
      title: 'Building Your Notification Profile',
      description: 'We\'re still learning your notification preferences',
      action: 'Continue using the system to receive more personalized recommendations'
    });
  }

  return recommendations;
}