/**
 * @file webhookService.js
 * @description Webhook HTTP delivery service
 * Handles webhook dispatch with signing, retry logic, and delivery tracking
 */

import crypto from 'crypto';
import fetch from 'node-fetch';
import { dbManager as db } from '../database/db.enhanced.js'; // Migrated from database-wrapper
import logger from '../utils/logger.js';

const pool = db.pool || db;

/**
 * Deliver webhook to configured endpoint
 * @param {number} webhookId - Webhook configuration ID
 * @param {object} eventData - Event payload
 * @returns {Promise<boolean>} Success status
 */
export async function deliverWebhook(webhookId, eventData) {
  // Feature flag check: ENABLE_WEBHOOKS
  if (process.env.ENABLE_WEBHOOKS !== 'true') {
    logger.info('Webhooks are disabled via ENABLE_WEBHOOKS flag');
    return false;
  }

  try {
    // Get webhook configuration
    const webhookResult = await pool.query(
      'SELECT * FROM webhooks WHERE id = $1 AND enabled = TRUE',
      [webhookId]
    );

    if (webhookResult.rows.length === 0) {
      logger.warn(`Webhook ${webhookId} not found or disabled`);
      return false;
    }

    const webhook = webhookResult.rows[0];

    // Check conditions if any
    if (webhook.conditions && !evaluateConditions(webhook.conditions, eventData)) {
      logger.info(`Webhook ${webhookId} conditions not met`);
      return false;
    }

    // Build payload
    const payload = {
      event_type: webhook.event_type,
      data: eventData,
      timestamp: new Date().toISOString(),
      webhook_id: webhookId
    };

    // Sign payload if secret provided
    let signature = null;
    if (webhook.secret) {
      signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(JSON.stringify(payload))
        .digest('hex');
    }

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'SecureGate-Webhooks/1.0',
      ...webhook.headers
    };

    if (signature) {
      headers['X-Webhook-Signature'] = signature;
    }

    // Send HTTP request with retry
    const maxRetries = webhook.retry_count || 3;
    let lastError = null;
    let response = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();

      try {
        response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          timeout: (webhook.timeout_seconds || 30) * 1000
        });

        const responseTime = Date.now() - startTime;
        const responseBody = await response.text();

        // Log delivery
        await logWebhookDelivery({
          webhookId,
          eventType: webhook.event_type,
          eventData,
          requestUrl: webhook.url,
          requestHeaders: headers,
          requestBody: JSON.stringify(payload),
          responseStatus: response.status,
          responseBody,
          responseTime,
          success: response.ok,
          attemptNumber: attempt
        });

        if (response.ok) {
          // Update webhook stats
          await pool.query(
            `UPDATE webhooks 
             SET success_count = success_count + 1,
                 last_triggered_at = CURRENT_TIMESTAMP,
                 last_success_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [webhookId]
          );

          logger.info(`Webhook ${webhookId} delivered successfully on attempt ${attempt}`);
          return true;
        }

        lastError = `HTTP ${response.status}: ${responseBody.substring(0, 200)}`;

      } catch (error) {
        lastError = error.message;
        logger.error(`Webhook ${webhookId} attempt ${attempt} failed:`, error);
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    // All retries failed
    await pool.query(
      `UPDATE webhooks 
       SET failure_count = failure_count + 1,
           last_triggered_at = CURRENT_TIMESTAMP,
           last_failure_at = CURRENT_TIMESTAMP,
           last_error = $1
       WHERE id = $2`,
      [lastError, webhookId]
    );

    logger.error(`Webhook ${webhookId} failed after ${maxRetries} attempts: ${lastError}`);
    return false;

  } catch (error) {
    logger.error(`Error delivering webhook ${webhookId}:`, error);
    return false;
  }
}

/**
 * Trigger all webhooks for a specific event
 * @param {string} eventType - Event type (e.g., 'visitor.created')
 * @param {object} eventData - Event payload
 * @param {number} siteId - Site ID (optional)
 * @returns {Promise<number>} Number of webhooks triggered
 */
export async function triggerWebhooks(eventType, eventData, siteId = null) {
  // Feature flag check: ENABLE_WEBHOOKS
  if (process.env.ENABLE_WEBHOOKS !== 'true') {
    logger.debug('Webhooks are disabled via ENABLE_WEBHOOKS flag');
    return 0;
  }

  try {
    // Get all matching webhooks
    const query = `
      SELECT id FROM webhooks
      WHERE event_type = $1
        AND enabled = TRUE
        AND (site_id = $2 OR $2 IS NULL)
    `;

    const result = await pool.query(query, [eventType, siteId]);
    const webhooks = result.rows;

    if (webhooks.length === 0) {
      logger.debug(`No webhooks configured for event ${eventType}`);
      return 0;
    }

    // Trigger all webhooks (fire and forget for performance)
    const promises = webhooks.map(webhook =>
      deliverWebhook(webhook.id, eventData).catch(err =>
        logger.error(`Failed to trigger webhook ${webhook.id}:`, err)
      )
    );

    await Promise.allSettled(promises);

    logger.info(`Triggered ${webhooks.length} webhooks for event ${eventType}`);
    return webhooks.length;

  } catch (error) {
    logger.error(`Error triggering webhooks for ${eventType}:`, error);
    return 0;
  }
}

/**
 * Log webhook delivery attempt
 */
async function logWebhookDelivery(delivery) {
  try {
    await pool.query(
      `INSERT INTO webhook_deliveries (
        webhook_id, event_type, event_data, request_url, request_headers,
        request_body, response_status, response_body, response_time_ms,
        success, error_message, attempt_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        delivery.webhookId,
        delivery.eventType,
        delivery.eventData,
        delivery.requestUrl,
        delivery.requestHeaders,
        delivery.requestBody,
        delivery.responseStatus,
        delivery.responseBody,
        delivery.responseTime,
        delivery.success,
        delivery.success ? null : delivery.responseBody,
        delivery.attemptNumber
      ]
    );
  } catch (error) {
    logger.error('Error logging webhook delivery:', error);
  }
}

/**
 * Evaluate webhook conditions
 */
function evaluateConditions(conditions, data) {
  try {
    // Simple condition evaluation (can be enhanced with complex logic)
    for (const [key, value] of Object.entries(conditions)) {
      if (data[key] !== value) {
        return false;
      }
    }
    return true;
  } catch (error) {
    logger.error('Error evaluating webhook conditions:', error);
    return false;
  }
}

/**
 * Test webhook endpoint
 */
export async function testWebhook(webhookId) {
  const testData = {
    test: true,
    message: 'This is a test webhook delivery',
    timestamp: new Date().toISOString()
  };

  return await deliverWebhook(webhookId, testData);
}

export default {
  deliverWebhook,
  triggerWebhooks,
  testWebhook
};
