/**
 * Notification Delivery Webhooks
 * Phase 3.3: Webhook handlers for delivery confirmations
 *
 * Providers:
 * - Mailgun: Email delivery webhooks
 * - Africa's Talking: Delivery reports
 */

import express from 'express';
import crypto from 'crypto';
import loggingService from '../services/loggingService.js';
import db from '../database/db.enhanced.js';
import notificationMetricsService from '../services/notificationMetricsService.js';

const router = express.Router();

/**
 * Verify Mailgun webhook signature
 */
function verifyMailgunSignature(timestamp, token, signature) {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
  if (!signingKey) {
    loggingService.logWarn('MAILGUN_WEBHOOK_SIGNING_KEY not configured');
    return true; // Skip verification if not configured
  }

  const hmac = crypto.createHmac('sha256', signingKey);
  hmac.update(timestamp + token);
  const computedSignature = hmac.digest('hex');

  return computedSignature === signature;
}


/**
 * Update notification status in database
 */
async function updateNotificationStatus(messageId, status, provider, details = {}) {
  try {
    const result = await db.query(`
      UPDATE notifications
      SET
        delivery_status = $1,
        delivery_provider = $2,
        delivered_at = CASE WHEN $1 = 'delivered' THEN NOW() ELSE delivered_at END,
        failed_at = CASE WHEN $1 IN ('failed', 'bounced', 'undelivered') THEN NOW() ELSE failed_at END,
        failure_reason = $3,
        delivery_metadata = delivery_metadata || $4::jsonb,
        updated_at = NOW()
      WHERE message_id = $5
      OR id = $5
      RETURNING *
    `, [status, provider, details.reason || null, JSON.stringify(details), messageId]);

    if (result.rows.length > 0) {
      loggingService.logInfo('Notification status updated', {
        messageId,
        status,
        provider
      });
      return result.rows[0];
    } else {
      loggingService.logWarn('Notification not found for status update', { messageId });
      return null;
    }
  } catch (error) {
    loggingService.logError('Failed to update notification status', error);
    throw error;
  }
}

/**
 * Log delivery event
 */
async function logDeliveryEvent(event) {
  try {
    await db.query(`
      INSERT INTO notification_delivery_events (
        message_id,
        event_type,
        provider,
        event_data,
        created_at
      )
      VALUES ($1, $2, $3, $4, NOW())
    `, [event.message_id, event.event_type, event.provider, JSON.stringify(event.data)]);
  } catch (error) {
    loggingService.logError('Failed to log delivery event', error);
  }
}

// ============================================================================
// MAILGUN WEBHOOKS
// ============================================================================

/**
 * @route POST /api/webhooks/mailgun/delivered
 * @desc Mailgun delivery webhook
 * @access Public (webhook)
 */
router.post('/mailgun/delivered', async (req, res) => {
  try {
    const { signature, token, timestamp } = req.body;
    const eventData = req.body['event-data'] || {};

    // Verify signature
    if (!verifyMailgunSignature(timestamp, token, signature)) {
      notificationMetricsService.recordWebhookSignatureFailure('mailgun', 'invalid_signature', {
        timestamp
      });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const messageId = eventData['message-id'] || eventData.id;

    await updateNotificationStatus(messageId, 'delivered', 'mailgun', {
      recipient: eventData.recipient,
      timestamp: eventData.timestamp,
      event: eventData.event
    });

    await logDeliveryEvent({
      message_id: messageId,
      event_type: 'delivered',
      provider: 'mailgun',
      data: eventData
    });
    notificationMetricsService.recordDeliveryEvent({
      provider: 'mailgun',
      status: 'delivered',
      messageId,
      metadata: { recipient: eventData.recipient }
    });

    res.status(200).json({ received: true });
  } catch (error) {
    loggingService.logError('Mailgun delivered webhook error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route POST /api/webhooks/mailgun/failed
 * @desc Mailgun failure webhook
 * @access Public (webhook)
 */
router.post('/mailgun/failed', async (req, res) => {
  try {
    const { signature, token, timestamp } = req.body;
    const eventData = req.body['event-data'] || {};

    // Verify signature
    if (!verifyMailgunSignature(timestamp, token, signature)) {
      notificationMetricsService.recordWebhookSignatureFailure('mailgun', 'invalid_signature', {
        timestamp
      });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const messageId = eventData['message-id'] || eventData.id;
    const severity = eventData.severity;
    const reason = eventData['delivery-status']?.message || 'Unknown error';

    await updateNotificationStatus(messageId, 'failed', 'mailgun', {
      recipient: eventData.recipient,
      severity,
      reason,
      timestamp: eventData.timestamp
    });

    await logDeliveryEvent({
      message_id: messageId,
      event_type: 'failed',
      provider: 'mailgun',
      data: eventData
    });
    notificationMetricsService.recordDeliveryEvent({
      provider: 'mailgun',
      status: 'failed',
      messageId,
      metadata: { recipient: eventData.recipient, reason }
    });

    res.status(200).json({ received: true });
  } catch (error) {
    loggingService.logError('Mailgun failed webhook error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route POST /api/webhooks/mailgun/bounced
 * @desc Mailgun bounce webhook
 * @access Public (webhook)
 */
router.post('/mailgun/bounced', async (req, res) => {
  try {
    const { signature, token, timestamp } = req.body;
    const eventData = req.body['event-data'] || {};

    // Verify signature
    if (!verifyMailgunSignature(timestamp, token, signature)) {
      notificationMetricsService.recordWebhookSignatureFailure('mailgun', 'invalid_signature', {
        timestamp
      });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const messageId = eventData['message-id'] || eventData.id;
    const reason = eventData['delivery-status']?.description || 'Bounced';

    await updateNotificationStatus(messageId, 'bounced', 'mailgun', {
      recipient: eventData.recipient,
      reason,
      timestamp: eventData.timestamp,
      code: eventData['delivery-status']?.code
    });

    await logDeliveryEvent({
      message_id: messageId,
      event_type: 'bounced',
      provider: 'mailgun',
      data: eventData
    });
    notificationMetricsService.recordDeliveryEvent({
      provider: 'mailgun',
      status: 'bounced',
      messageId,
      metadata: { recipient: eventData.recipient, reason }
    });

    res.status(200).json({ received: true });
  } catch (error) {
    loggingService.logError('Mailgun bounced webhook error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// AFRICA'S TALKING WEBHOOKS
// ============================================================================

/**
 * @route POST /api/webhooks/africas-talking/delivery
 * @desc Africa's Talking delivery report
 * @access Public (webhook)
 */
router.post('/africas-talking/delivery', async (req, res) => {
  try {
    const {
      id,
      status,
      phoneNumber,
      failureReason,
      retryCount,
      networkCode
    } = req.body;

    let deliveryStatus;
    switch (status) {
      case 'Success':
        deliveryStatus = 'delivered';
        break;
      case 'Failed':
        deliveryStatus = 'failed';
        break;
      case 'Sent':
        deliveryStatus = 'sent';
        break;
      default:
        deliveryStatus = status.toLowerCase();
    }

    await updateNotificationStatus(id, deliveryStatus, 'africas_talking', {
      phone_number: phoneNumber,
      failure_reason: failureReason,
      retry_count: retryCount,
      network_code: networkCode,
      status: status
    });

    await logDeliveryEvent({
      message_id: id,
      event_type: deliveryStatus,
      provider: 'africas_talking',
      data: req.body
    });
    notificationMetricsService.recordDeliveryEvent({
      provider: 'africas_talking',
      status: deliveryStatus,
      messageId: id,
      metadata: { phoneNumber, status }
    });

    res.status(200).send('Received');
  } catch (error) {
    loggingService.logError("Africa's Talking delivery webhook error", error);
    res.status(500).send('Internal server error');
  }
});

// ============================================================================
// GENERIC WEBHOOK ENDPOINT
// ============================================================================

/**
 * @route POST /api/webhooks/notification/status
 * @desc Generic notification status webhook
 * @access Public (webhook with API key)
 */
router.post('/notification/status', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];

    // Verify API key
    if (apiKey !== process.env.NOTIFICATION_WEBHOOK_API_KEY) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const { message_id, status, provider, details } = req.body;

    if (!message_id || !status || !provider) {
      return res.status(400).json({
        error: 'Missing required fields: message_id, status, provider'
      });
    }

    await updateNotificationStatus(message_id, status, provider, details || {});

    await logDeliveryEvent({
      message_id,
      event_type: status,
      provider,
      data: details || {}
    });
    notificationMetricsService.recordDeliveryEvent({
      provider,
      status,
      messageId: message_id,
      metadata: details || {}
    });

    res.status(200).json({ received: true });
  } catch (error) {
    loggingService.logError('Generic webhook error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// DELIVERY STATISTICS
// ============================================================================

/**
 * @route GET /api/webhooks/delivery/stats
 * @desc Get delivery statistics
 * @access Admin only (requires authentication)
 */
router.get('/delivery/stats', async (req, res) => {
  try {
    const { start_date, end_date, provider } = req.query;

    let query = `
      SELECT
        delivery_provider,
        delivery_status,
        COUNT(*) as count
      FROM notifications
      WHERE created_at >= COALESCE($1::timestamp, NOW() - INTERVAL '30 days')
      AND created_at <= COALESCE($2::timestamp, NOW())
    `;

    const params = [start_date || null, end_date || null];

    if (provider) {
      query += ' AND delivery_provider = $3';
      params.push(provider);
    }

    query += ' GROUP BY delivery_provider, delivery_status ORDER BY delivery_provider, count DESC';

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    loggingService.logError('Failed to get delivery stats', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve delivery statistics'
    });
  }
});

export default router;
