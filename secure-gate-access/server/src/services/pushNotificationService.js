import webpush from 'web-push';
import { dbManager as db } from '../database/db.enhanced.js';
import logger from '../config/logger.js';
import notificationMetricsService from './notificationMetricsService.js';

const isTestEnvironment = (process.env.NODE_ENV || '').toLowerCase() === 'test';

const shouldWarnAboutMissingPushConfiguration = () => (
    Boolean(process.env.VAPID_PUBLIC_KEY)
    || Boolean(process.env.VAPID_PRIVATE_KEY)
    || Boolean(process.env.VAPID_EMAIL)
);

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@example.com';

let isConfigured = false;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    try {
        webpush.setVapidDetails(
            VAPID_EMAIL,
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY
        );
        isConfigured = true;
        logger.info('Push notification service configured');
    } catch (error) {
        logger.error('Failed to configure web-push:', error);
    }
} else {
    if (!isTestEnvironment && shouldWarnAboutMissingPushConfiguration()) {
        logger.warn('Push notification service NOT configured (missing keys)');
    }
}

/**
 * Send push notification to a specific user
 * @param {number} userId - User ID to send to
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 */
export async function sendPushNotification(userId, title, body, data = {}) {
    if (!isConfigured) {
        notificationMetricsService.recordNotificationResult({
            channel: 'push',
            success: false,
            error: 'service_not_configured'
        });
        return { success: false, error: 'Push service not configured' };
    }

    // Get user subscriptions
    const result = await db.query(
        `SELECT u.username, ps.endpoint, ps.keys 
     FROM push_subscriptions ps
     JOIN users u ON u.id = ps.user_id
     JOIN notification_preferences np ON np.user_id = u.id
     WHERE ps.user_id = $1 AND np.push_enabled = true`,
        [userId]
    );

    if (result.rows.length === 0) {
        return { success: false, error: 'No active push subscriptions found for user' };
    }

    const payload = JSON.stringify({
        title,
        body,
        icon: '/assets/icons/icon-192x192.png',
        data: {
            ...data,
            timestamp: Date.now()
        }
    });

    const promises = result.rows.map(async (sub) => {
        const subscription = {
            endpoint: sub.endpoint,
            keys: sub.keys // database stores JSON keys object directly or as string? Check usage. 
            // Looking at lines 466 of notificationRoutes.js: JSON.stringify(keys).
            // So we need to parse it if pg returns string, or let it be if pg returns jsonb (if column is json). 
            // Assuming text/json column, let's parse if string.
        };

        // keys is likely stored as JSONB or string. 
        if (typeof subscription.keys === 'string') {
            try { subscription.keys = JSON.parse(subscription.keys); } catch (e) { }
        }

        try {
            await webpush.sendNotification(subscription, payload);
            return { success: true };
        } catch (error) {
            if (error.statusCode === 410 || error.statusCode === 404) {
                // Subscription expired or invalid
                await db.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
                return { success: false, error: 'subscription_expired' };
            }
            logger.error(`Push send error for user ${userId}:`, error);
            return { success: false, error: error.message };
        }
    });

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;

    notificationMetricsService.recordNotificationResult({
        channel: 'push',
        success: successCount > 0,
        metadata: { userId, attempts: results.length, successes: successCount }
    });

    return {
        success: successCount > 0,
        sent: successCount,
        total: results.length
    };
}

export default {
    sendPushNotification,
    isConfigured: () => isConfigured
};
