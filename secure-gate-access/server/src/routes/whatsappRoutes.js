/**
 * WhatsApp Routes
 * Routes for WhatsApp Business API integration
 * Handles Meta webhook verification and message handling
 */

import express from 'express';
import * as crypto from 'crypto';
import { asyncHandler, AppError } from '../middleware/standardizedErrorHandler.js';
import { errorResponse, successResponse } from '../utils/responseFormatter.js';
import { authenticateToken, authorize } from '../middleware/authMiddleware.js';
import * as whatsappService from '../services/whatsappService.js';
import notificationMetricsService from '../services/notificationMetricsService.js';
import { dbManager as db } from '../database/db.enhanced.js';

const router = express.Router();

// WhatsApp verify token (set in environment variables)
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'secure_gate_whatsapp_token';

/**
 * Webhook verification endpoint for Meta
 * GET /api/whatsapp/webhook
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  // Check if mode and token are present
  if (mode && token) {
    // Check if mode is 'subscribe' and token matches
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[WhatsApp] Webhook verified successfully');
      return res.status(200).send(challenge);
    }
  }
  
  // Verification failed
  console.warn('[WhatsApp] Webhook verification failed');
  return errorResponse(res, 'Webhook verification failed', 'FORBIDDEN', 403, null, req);
});

/**
 * Webhook message handler
 * POST /api/whatsapp/webhook
 */
router.post('/webhook', asyncHandler(async (req, res) => {
  const body = req.body;
  
  // Validate signature if configured
  if (process.env.WHATSAPP_APP_SECRET) {
    const signature = req.headers['x-hub-signature-256'];
    if (signature) {
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', process.env.WHATSAPP_APP_SECRET)
        .update(JSON.stringify(body))
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.warn('[WhatsApp] Invalid signature');
        notificationMetricsService.recordWebhookSignatureFailure('whatsapp', 'invalid_signature', {
          headerSignature: signature
        });
        return errorResponse(res, 'Invalid signature', 'FORBIDDEN', 403, null, req);
      }
    }
  }
  
  // Check if this is a WhatsApp status update
  if (body.object === 'whatsapp_business_account') {
    if (body.entry && body.entry.length > 0) {
      for (const entry of body.entry) {
        const changes = entry.changes || [];
        
        for (const change of changes) {
          if (change.field === 'messages') {
            const value = change.value;
            
            // Handle incoming messages
            if (value.messages && value.messages.length > 0) {
              for (const message of value.messages) {
                await handleIncomingMessage(message, value.contacts);
              }
            }
            
            // Handle message status updates
            if (value.statuses && value.statuses.length > 0) {
              for (const status of value.statuses) {
                await handleMessageStatus(status);
              }
            }
          }
        }
      }
    }
    
    // Always return 200 to acknowledge receipt
    return res.sendStatus(200);
  }
  
  // Not a WhatsApp webhook
  return errorResponse(res, 'Webhook not found', 'NOT_FOUND', 404, null, req);
}));

/**
 * Send WhatsApp message (authenticated)
 * POST /api/whatsapp/send
 */
router.post('/send', authenticateToken, authorize(['admin', 'resident']), asyncHandler(async (req, res) => {
  const { to, message, template_name, template_params } = req.body;
  
  if (!to) {
    throw new AppError('Recipient phone number is required', 400);
  }
  
  if (!message && !template_name) {
    throw new AppError('Message or template name is required', 400);
  }

  // Use the WhatsApp service
  let result;
  if (template_name) {
    result = await whatsappService.sendTemplateMessage(to, template_name, 'en', template_params || []);
  } else {
    result = await whatsappService.sendTextMessage(to, message);
  }

  if (!result.success) {
    throw new AppError(result.error || 'Failed to send message', 500);
  }

  await recordOutboundNotification({
    to: result.to || to,
    messageId: result.messageId,
    templateName: template_name,
    metadata: {
      type: template_name ? 'template' : 'text'
    },
    body: message,
    notificationType: template_name ? 'whatsapp_template' : 'whatsapp_text'
  });
  
  return successResponse(res, {
    status: 'sent',
    messageId: result.messageId,
    to: result.to,
    message_type: template_name ? 'template' : 'text'
  }, 'Message sent successfully');
}));

/**
 * Send visitor pass notification
 * POST /api/whatsapp/notify/visitor-pass
 */
router.post('/notify/visitor-pass', authenticateToken, authorize(['admin', 'resident']), asyncHandler(async (req, res) => {
  const { visitorPhone, visitorName, residentName, unitNumber, validFrom, validUntil, passCode } = req.body;
  
  if (!visitorPhone || !visitorName) {
    throw new AppError('Visitor phone and name are required', 400);
  }

  const result = await whatsappService.sendVisitorInvite(visitorPhone, {
    visitorName,
    residentName: residentName || req.user.name,
    unitNumber: unitNumber || req.user.unit_number,
    validFrom,
    validUntil,
    passCode
  });

  if (!result.success) {
    throw new AppError(result.error || 'Failed to send notification', 500);
  }

  await recordOutboundNotification({
    to: visitorPhone,
    messageId: result.messageId,
    templateName: 'visitor_pass',
    metadata: {
      visitorName,
      residentName: residentName || req.user.name
    },
    notificationType: 'whatsapp_visitor_pass'
  });
  
  return successResponse(res, result, 'Visitor pass notification sent');
}));

/**
 * Send approval request to resident
 * POST /api/whatsapp/notify/approval-request
 */
router.post('/notify/approval-request', authenticateToken, authorize(['admin', 'guard']), asyncHandler(async (req, res) => {
  const { residentPhone, visitorName, visitorPhone, purpose, arrivalTime } = req.body;
  
  if (!residentPhone || !visitorName) {
    throw new AppError('Resident phone and visitor name are required', 400);
  }

  const result = await whatsappService.sendApprovalRequest(residentPhone, {
    visitorName,
    visitorPhone,
    purpose,
    arrivalTime: arrivalTime || new Date().toLocaleTimeString()
  });

  if (!result.success) {
    throw new AppError(result.error || 'Failed to send approval request', 500);
  }

  await recordOutboundNotification({
    to: residentPhone,
    messageId: result.messageId,
    templateName: 'approval_request',
    metadata: {
      visitorName,
      visitorPhone,
      purpose
    },
    notificationType: 'whatsapp_approval_request'
  });
  
  return successResponse(res, result, 'Approval request sent');
}));

/**
 * Get WhatsApp connection status
 * GET /api/whatsapp/status
 */
router.get('/status', asyncHandler(async (req, res) => {
  const isConfigured = whatsappService.isConfigured();
  
  return successResponse(res, {
    configured: isConfigured,
    phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID ? '***' + process.env.WHATSAPP_PHONE_NUMBER_ID.slice(-4) : null,
    business_account_id: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ? '***' + process.env.WHATSAPP_BUSINESS_ACCOUNT_ID.slice(-4) : null,
    webhook_configured: !!VERIFY_TOKEN
  }, 'WhatsApp status retrieved');
}));

/**
 * Handle incoming WhatsApp message
 */
async function handleIncomingMessage(message, contacts) {
  try {
    const from = message.from;
    const messageId = message.id;
    const timestamp = message.timestamp;
    const type = message.type;

    const contact = contacts?.find?.(c => c.wa_id === from) || contacts?.[0];
    const textBody = message.text?.body
      || message.button?.text
      || message.interactive?.button_reply?.title
      || message.interactive?.list_reply?.title
      || null;

    const normalizedText = textBody ? textBody.trim().toLowerCase() : null;
    const command = normalizedText && (normalizedText.startsWith('approve') || normalizedText.startsWith('deny'))
      ? normalizedText.split(/\s+/)[0]
      : null;

    console.log(`[WhatsApp] Received ${type} message from ${from}:`, message);

    await db.query(
      `INSERT INTO notifications (
        type,
        recipient,
        message_id,
        status,
        delivery_status,
        delivery_provider,
        delivery_metadata,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [
        'whatsapp',
        from,
        messageId,
        'received',
        'received',
        'whatsapp',
        JSON.stringify({
          direction: 'incoming',
          timestamp,
          type,
          text: textBody,
          command,
          contact,
          context: message.context || null,
          raw: message
        })
      ]
    );

    await recordNotificationLog({
      recipientType: 'external',
      recipientId: null,
      recipientPhone: from,
      notificationType: 'whatsapp_inbound',
      channel: 'whatsapp',
      body: textBody,
      status: 'received',
      provider: 'whatsapp',
      providerMessageId: messageId,
      metadata: {
        direction: 'incoming',
        timestamp,
        type,
        command,
        contact,
        context: message.context || null
      }
    });

    if (message.context?.id) {
      await db.query(
        `UPDATE notification_log
         SET metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb,
             updated_at = NOW()
         WHERE provider_message_id = $2`,
        [
          JSON.stringify({
            whatsappReply: {
              messageId,
              from,
              type,
              text: textBody,
              command,
              timestamp
            }
          }),
          message.context.id
        ]
      );
    }
    
  } catch (error) {
    console.error('[WhatsApp] Error handling incoming message:', error);
  }
}

/**
 * Handle message status update
 */
async function handleMessageStatus(status) {
  try {
    const messageId = status.id;
    const recipientId = status.recipient_id;
    const statusType = status.status; // sent, delivered, read, failed
    
    console.log(`[WhatsApp] Message ${messageId} status: ${statusType}`);
    notificationMetricsService.recordDeliveryEvent({
      provider: 'whatsapp',
      status: statusType,
      messageId,
      metadata: { recipientId, errors: status.errors }
    });

    const metadata = {
      whatsappStatus: {
        recipientId,
        errors: status.errors,
        timestamp: status.timestamp
      }
    };

    await db.query(
      `UPDATE notifications
       SET
         delivery_status = $1::text,
         delivery_provider = 'whatsapp',
         delivered_at = CASE WHEN $1::text = 'delivered' THEN NOW() ELSE delivered_at END,
         failed_at = CASE WHEN $1::text IN ('failed', 'bounced', 'undelivered') THEN NOW() ELSE failed_at END,
         failure_reason = $2::text,
         delivery_metadata = COALESCE(delivery_metadata, '{}'::jsonb) || $3::jsonb,
         updated_at = NOW()
       WHERE message_id = $4`,
      [
        statusType,
        status.errors?.[0]?.title || status.errors?.[0]?.message || null,
        JSON.stringify(metadata),
        messageId
      ]
    );

    await db.query(
      `UPDATE notification_log
       SET
         status = $1,
         read_at = CASE WHEN $1 = 'read' THEN NOW() ELSE read_at END,
         metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
         updated_at = NOW()
       WHERE provider_message_id = $3`,
      [statusType, JSON.stringify(metadata), messageId]
    );
    
  } catch (error) {
    console.error('[WhatsApp] Error handling status update:', error);
  }
}

async function recordOutboundNotification({
  to,
  messageId,
  templateName,
  metadata = {},
  body = null,
  notificationType = null
}) {
  if (!messageId) {
    return;
  }

  try {
    await db.query(
      `INSERT INTO notifications (
        type,
        recipient,
        message_id,
        status,
        delivery_status,
        delivery_provider,
        delivery_metadata,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [
        'whatsapp',
        to,
        messageId,
        'sent',
        'sent',
        'whatsapp',
        JSON.stringify({
          direction: 'outgoing',
          templateName,
          ...metadata
        })
      ]
    );

    await recordNotificationLog({
      recipientType: 'external',
      recipientId: null,
      recipientPhone: to,
      notificationType: notificationType || templateName || 'whatsapp_outbound',
      channel: 'whatsapp',
      body,
      status: 'sent',
      provider: 'whatsapp',
      providerMessageId: messageId,
      metadata: {
        direction: 'outgoing',
        templateName,
        body,
        ...metadata
      }
    });
  } catch (error) {
    console.warn('[WhatsApp] Failed to record outbound notification:', error.message);
  }
}

async function recordNotificationLog({
  recipientType,
  recipientId,
  recipientPhone,
  notificationType,
  channel,
  body,
  status,
  provider,
  providerMessageId,
  metadata = {}
}) {
  try {
    const sentAt = status === 'sent' ? new Date() : null;
    await db.query(
      `INSERT INTO notification_log (
        recipient_type,
        recipient_id,
        recipient_phone,
        notification_type,
        channel,
        language,
        subject,
        body,
        template_name,
        template_variables,
        user_id,
        status,
        provider,
        provider_message_id,
        metadata,
        sent_at,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16,
        NOW(),
        NOW()
      )`,
      [
        recipientType,
        recipientId,
        recipientPhone,
        notificationType,
        channel,
        'en',
        null,
        body,
        notificationType,
        JSON.stringify(metadata),
        recipientId,
        status,
        provider,
        providerMessageId || null,
        JSON.stringify(metadata),
        sentAt
      ]
    );
  } catch (error) {
    console.warn('[WhatsApp] Failed to write notification_log:', error.message);
  }
}

export default router;
