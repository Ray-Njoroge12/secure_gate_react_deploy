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
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { getEmailProvider, getSmsProvider } from '../providers/notificationProviderFactory.js';

const router = express.Router();

/**
 * Verify Mailgun webhook signature
 */
function safeCompareSignature(expected, provided) {
  if (!expected || !provided) {
    return false;
  }
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

function logWebhookAuthFailure(provider, reason, req, details = {}) {
  const ip = req?.ip || req?.headers['x-forwarded-for'] || req?.connection?.remoteAddress;
  loggingService.logSecurity('warn', 'Webhook authentication failed', {
    provider,
    reason,
    ip,
    ...details
  });
  loggingService.logAudit('Webhook authentication failed', 'webhook_auth_failed', null, {
    provider,
    reason,
    ip,
    ...details
  });
  notificationMetricsService.recordWebhookSignatureFailure(provider, reason, {
    ip,
    ...details
  });
}

function verifyMailgunSignature(timestamp, token, signature) {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
  if (!signingKey) {
    loggingService.logWarn('MAILGUN_WEBHOOK_SIGNING_KEY not configured');
    return { valid: false, reason: 'missing_signing_key' };
  }

  const hmac = crypto.createHmac('sha256', signingKey);
  hmac.update(timestamp + token);
  const computedSignature = hmac.digest('hex');

  if (!safeCompareSignature(computedSignature, signature)) {
    return { valid: false, reason: 'invalid_signature' };
  }

  return { valid: true };
}

function normalizeIp(ip) {
  if (!ip) {
    return null;
  }
  const normalized = ip.split(',')[0].trim();
  return normalized.startsWith('::ffff:') ? normalized.replace('::ffff:', '') : normalized;
}

function isIpAllowed(req, allowlist) {
  if (!allowlist || allowlist.length === 0) {
    return true;
  }
  const requestIp = normalizeIp(req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress);
  return allowlist.includes(requestIp);
}

function verifyAfricasTalkingAuth(req) {
  const allowlist = process.env.AFRICAS_TALKING_WEBHOOK_ALLOWED_IPS
    ? process.env.AFRICAS_TALKING_WEBHOOK_ALLOWED_IPS.split(',').map(ip => ip.trim()).filter(Boolean)
    : [];

  if (!isIpAllowed(req, allowlist)) {
    return { valid: false, reason: 'ip_not_allowed', details: { allowlist } };
  }

  const signatureHeader = req.headers['x-at-signature']
    || req.headers['x-africastalking-signature']
    || req.headers['x-africas-talking-signature'];
  const signingSecret = process.env.AFRICAS_TALKING_WEBHOOK_SIGNING_SECRET;
  const apiKeyHeader = req.headers['x-africas-talking-api-key']
    || req.headers['x-africastalking-api-key']
    || req.headers['x-at-api-key']
    || req.headers['x-api-key'];
  const apiKeys = [
    process.env.AFRICAS_TALKING_WEBHOOK_API_KEY,
    process.env.AT_WEBHOOK_API_KEY,
    process.env.AT_API_KEY,
    process.env.AFRICASTALKING_API_KEY
  ].filter(Boolean);

  const payloadString = JSON.stringify(req.body || {});
  if (signingSecret && signatureHeader) {
    const computedHex = crypto.createHmac('sha256', signingSecret).update(payloadString).digest('hex');
    const computedBase64 = crypto.createHmac('sha256', signingSecret).update(payloadString).digest('base64');
    if (safeCompareSignature(computedHex, signatureHeader) || safeCompareSignature(computedBase64, signatureHeader)) {
      return { valid: true };
    }
  }

  if (apiKeyHeader && apiKeys.some(key => safeCompareSignature(key, apiKeyHeader))) {
    return { valid: true };
  }

  return { valid: false, reason: 'missing_or_invalid_auth' };
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
    const mailgunProvider = getEmailProvider('mailgun');
    const parsedEvent = mailgunProvider?.parseWebhook?.(req.body);

    // Verify signature
    const mailgunVerification = verifyMailgunSignature(timestamp, token, signature);
    if (!mailgunVerification.valid) {
      logWebhookAuthFailure('mailgun', mailgunVerification.reason, req, { timestamp });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const messageId = parsedEvent?.messageId;
    const status = parsedEvent?.status || 'delivered';
    const eventData = parsedEvent?.metadata || {};

    if (!messageId) {
      return res.status(400).json({ error: 'Missing message ID' });
    }

    await updateNotificationStatus(messageId, status, 'mailgun', eventData);

    await logDeliveryEvent({
      message_id: messageId,
      event_type: status,
      provider: 'mailgun',
      data: eventData
    });
    notificationMetricsService.recordDeliveryEvent({
      provider: 'mailgun',
      status,
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
    const mailgunProvider = getEmailProvider('mailgun');
    const parsedEvent = mailgunProvider?.parseWebhook?.(req.body);

    // Verify signature
    const mailgunVerification = verifyMailgunSignature(timestamp, token, signature);
    if (!mailgunVerification.valid) {
      logWebhookAuthFailure('mailgun', mailgunVerification.reason, req, { timestamp });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const messageId = parsedEvent?.messageId;
    const status = parsedEvent?.status || 'failed';
    const eventData = parsedEvent?.metadata || {};
    const reason = parsedEvent?.reason || eventData['delivery-status']?.message || 'Unknown error';

    if (!messageId) {
      return res.status(400).json({ error: 'Missing message ID' });
    }

    await updateNotificationStatus(messageId, status, 'mailgun', {
      ...eventData,
      reason
    });

    await logDeliveryEvent({
      message_id: messageId,
      event_type: status,
      provider: 'mailgun',
      data: eventData
    });
    notificationMetricsService.recordDeliveryEvent({
      provider: 'mailgun',
      status,
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
    const mailgunProvider = getEmailProvider('mailgun');
    const parsedEvent = mailgunProvider?.parseWebhook?.(req.body);

    // Verify signature
    const mailgunVerification = verifyMailgunSignature(timestamp, token, signature);
    if (!mailgunVerification.valid) {
      logWebhookAuthFailure('mailgun', mailgunVerification.reason, req, { timestamp });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const messageId = parsedEvent?.messageId;
    const status = parsedEvent?.status || 'bounced';
    const eventData = parsedEvent?.metadata || {};
    const reason = parsedEvent?.reason || eventData['delivery-status']?.description || 'Bounced';

    if (!messageId) {
      return res.status(400).json({ error: 'Missing message ID' });
    }

    await updateNotificationStatus(messageId, status, 'mailgun', {
      ...eventData,
      reason
    });

    await logDeliveryEvent({
      message_id: messageId,
      event_type: status,
      provider: 'mailgun',
      data: eventData
    });
    notificationMetricsService.recordDeliveryEvent({
      provider: 'mailgun',
      status,
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
    const africaVerification = verifyAfricasTalkingAuth(req);
    if (!africaVerification.valid) {
      logWebhookAuthFailure('africas_talking', africaVerification.reason, req, africaVerification.details || {});
      return res.status(401).send('Unauthorized');
    }

    const smsProvider = getSmsProvider('africastalking');
    const parsedEvent = smsProvider?.parseDeliveryCallback?.(req.body);

    const messageId = parsedEvent?.messageId;
    const deliveryStatus = parsedEvent?.status;
    const metadata = parsedEvent?.metadata || {};

    if (!messageId || !deliveryStatus) {
      return res.status(400).send('Invalid delivery payload');
    }

    await updateNotificationStatus(messageId, deliveryStatus, 'africas_talking', {
      phone_number: metadata.phoneNumber,
      failure_reason: metadata.failureReason,
      retry_count: metadata.retryCount,
      network_code: metadata.networkCode,
      status: metadata.rawStatus
    });

    await logDeliveryEvent({
      message_id: messageId,
      event_type: deliveryStatus,
      provider: 'africas_talking',
      data: req.body
    });
    notificationMetricsService.recordDeliveryEvent({
      provider: 'africas_talking',
      status: deliveryStatus,
      messageId,
      metadata: { phoneNumber: metadata.phoneNumber, status: metadata.rawStatus }
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
router.get('/delivery/stats', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
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
