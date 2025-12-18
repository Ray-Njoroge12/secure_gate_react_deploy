/**
 * @file notificationRoutes.js
 * @description Routes for notification management
 * Phase V3: Visitor Notifications & Multi-Channel Communication
 */

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  getNotificationLogs,
  updateNotificationPreferences
} from '../controllers/notificationController.js';
import { dbManager as db } from '../database/db.enhanced.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * @route GET /api/notifications/preferences
 * @desc Get notification preferences for the current user
 * @access Private (authenticated)
 */
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
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
        quiet_hours_end,
        language
      FROM notification_preferences
      WHERE user_id = $1
    `;
    
    const result = await db.query(query, [userId]);
    
    // Return default preferences if none exist
    const preferences = result.rows[0] || {
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
    
    // Transform to camelCase for frontend
    const transformedPreferences = {
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
    };
    
    return res.json({
      success: true,
      data: transformedPreferences
    });
  } catch (error) {
    logger.error('Failed to get notification preferences:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load preferences'
    });
  }
});

/**
 * @route PUT /api/notifications/preferences
 * @desc Update notification preferences
 * @access Private (authenticated)
 */
router.put('/preferences', authenticateToken, updateNotificationPreferences);

/**
 * @route POST /api/notifications/push/subscribe
 * @desc Register push notification subscription
 * @access Private (authenticated)
 */
router.post('/push/subscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { subscription } = req.body;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription data'
      });
    }
    
    // Store subscription in database
    const query = `
      INSERT INTO push_subscriptions (user_id, endpoint, keys, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, endpoint)
      DO UPDATE SET 
        keys = EXCLUDED.keys,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `;
    
    const values = [
      userId,
      subscription.endpoint,
      JSON.stringify(subscription.keys || {})
    ];
    
    const result = await db.query(query, values);
    
    logger.info('Push subscription registered', { userId, subscriptionId: result.rows[0]?.id });
    
    return res.json({
      success: true,
      message: 'Push subscription registered'
    });
  } catch (error) {
    logger.error('Failed to register push subscription:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to register subscription'
    });
  }
});

/**
 * @route DELETE /api/notifications/push/unsubscribe
 * @desc Remove push notification subscription
 * @access Private (authenticated)
 */
router.delete('/push/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { endpoint } = req.body;
    
    const query = `
      DELETE FROM push_subscriptions
      WHERE user_id = $1 AND endpoint = $2
    `;
    
    await db.query(query, [userId, endpoint]);
    
    logger.info('Push subscription removed', { userId });
    
    return res.json({
      success: true,
      message: 'Push subscription removed'
    });
  } catch (error) {
    logger.error('Failed to remove push subscription:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to remove subscription'
    });
  }
});

/**
 * @route GET /api/notifications/:recipientType/:recipientId/logs
 * @desc Get notification logs for a recipient
 * @access Private (authenticated)
 */
router.get('/:recipientType/:recipientId/logs', authenticateToken, getNotificationLogs);

/**
 * @route POST /api/notifications/track
 * @desc Track notification interaction (dismissed, clicked, etc.)
 * @access Private (authenticated)
 */
router.post('/track', authenticateToken, async (req, res) => {
  try {
    const { notificationId, action, timestamp } = req.body;
    const userId = req.user.id;
    
    const query = `
      INSERT INTO notification_interactions (user_id, notification_id, action, timestamp)
      VALUES ($1, $2, $3, to_timestamp($4 / 1000.0))
      ON CONFLICT DO NOTHING
    `;
    
    await db.query(query, [userId, notificationId, action, timestamp]);
    
    return res.json({ success: true });
  } catch (error) {
    // Silent fail for tracking - not critical
    logger.debug('Failed to track notification:', error);
    return res.json({ success: true });
  }
});

/**
 * @route GET /api/notifications/recent
 * @desc Get recent notifications for the current user
 * @access Private (authenticated)
 */
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    
    const query = `
      SELECT 
        id,
        notification_type as type,
        channel,
        subject as title,
        body as message,
        status,
        sent_at,
        read_at,
        created_at
      FROM notification_logs
      WHERE (recipient_type = 'user' AND recipient_id = $1)
         OR user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    
    const result = await db.query(query, [userId, limit]);
    
    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Failed to get recent notifications:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load notifications'
    });
  }
});

/**
 * @route POST /api/notifications/:id/read
 * @desc Mark a notification as read
 * @access Private (authenticated)
 */
router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const query = `
      UPDATE notification_logs
      SET read_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND (user_id = $2 OR recipient_id = $2)
      RETURNING id
    `;
    
    const result = await db.query(query, [id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    logger.error('Failed to mark notification as read:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update notification'
    });
  }
});

/**
 * @route POST /api/notifications/read-all
 * @desc Mark all notifications as read
 * @access Private (authenticated)
 */
router.post('/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      UPDATE notification_logs
      SET read_at = CURRENT_TIMESTAMP
      WHERE (user_id = $1 OR recipient_id = $1)
        AND read_at IS NULL
    `;
    
    await db.query(query, [userId]);
    
    return res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    logger.error('Failed to mark all notifications as read:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update notifications'
    });
  }
});

export default router;
