/**
 * WhatsApp Routes
 * Routes for WhatsApp Business API integration
 * Handles Meta webhook verification and message handling
 */

import express from 'express';
import crypto from 'crypto';
import { asyncHandler, AppError } from '../middleware/standardizedErrorHandler.js';
import { successResponse } from '../utils/responseFormatter.js';
import { authenticateToken, authorize } from '../middleware/authMiddleware.js';
import * as whatsappService from '../services/whatsappService.js';

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
  return res.sendStatus(403);
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
        return res.sendStatus(403);
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
  return res.sendStatus(404);
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
    
    console.log(`[WhatsApp] Received ${type} message from ${from}:`, message);
    
    // TODO: Implement message handling logic
    // - Check if this is a response to a visitor invite
    // - Process commands like "APPROVE" or "DENY"
    // - Store message in database
    
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
    
    // TODO: Update message status in database
    
  } catch (error) {
    console.error('[WhatsApp] Error handling status update:', error);
  }
}

export default router;
