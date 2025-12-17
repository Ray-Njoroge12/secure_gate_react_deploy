/**
 * WhatsApp Webhook Routes
 * @description Handles incoming WhatsApp messages and status updates
 */

import express from 'express';
import whatsappService from '../services/whatsappService.js';
import loggingService from '../services/loggingService.js';

const router = express.Router();

/**
 * Webhook Verification (GET)
 * Meta sends this request to verify your webhook endpoint
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  loggingService.info('WhatsApp webhook verification request', { mode, token: token?.substring(0, 10) });

  const result = whatsappService.verifyWebhook(mode, token, challenge);

  if (result.valid) {
    loggingService.info('WhatsApp webhook verified successfully');
    res.status(200).send(result.challenge);
  } else {
    loggingService.warn('WhatsApp webhook verification failed');
    res.sendStatus(403);
  }
});

/**
 * Webhook Messages (POST)
 * Receives incoming messages and status updates from WhatsApp
 */
router.post('/webhook', async (req, res) => {
  try {
    // Always respond with 200 OK to acknowledge receipt
    res.sendStatus(200);

    const processed = whatsappService.processWebhookMessage(req.body);

    if (!processed) {
      return;
    }

    if (processed.type === 'message') {
      loggingService.info('WhatsApp message received', {
        from: processed.from,
        type: processed.messageType,
        messageId: processed.messageId
      });

      // Mark message as read
      await whatsappService.markAsRead(processed.messageId);

      // Handle different message types
      await handleIncomingMessage(processed);
    } else if (processed.type === 'status') {
      loggingService.info('WhatsApp status update', {
        messageId: processed.messageId,
        status: processed.status
      });

      // Handle status updates (delivered, read, failed)
      await handleStatusUpdate(processed);
    }
  } catch (error) {
    loggingService.error('WhatsApp webhook error', { error: error.message });
    // Still return 200 to prevent retries
  }
});

/**
 * Handle incoming WhatsApp messages
 */
async function handleIncomingMessage(message) {
  const { from, text, interactive, messageType } = message;

  // Handle interactive button replies
  if (interactive && interactive.type === 'button_reply') {
    const buttonId = interactive.button_reply.id;
    
    if (buttonId.startsWith('approve_')) {
      const visitorId = buttonId.replace('approve_', '');
      // TODO: Process visitor approval
      await whatsappService.sendTextMessage(from, '✅ Visitor has been approved. They can now enter.');
    } else if (buttonId.startsWith('deny_')) {
      const visitorId = buttonId.replace('deny_', '');
      // TODO: Process visitor denial
      await whatsappService.sendTextMessage(from, '❌ Visitor has been denied entry.');
    }
    return;
  }

  // Handle text messages
  if (messageType === 'text' && text) {
    const lowerText = text.toLowerCase().trim();

    // Simple command handling
    if (lowerText === 'help' || lowerText === 'menu') {
      await sendHelpMessage(from);
    } else if (lowerText === 'status') {
      await sendStatusMessage(from);
    } else if (lowerText.startsWith('check ')) {
      const inviteCode = lowerText.replace('check ', '').trim().toUpperCase();
      await checkInviteStatus(from, inviteCode);
    } else {
      // Default response
      await whatsappService.sendTextMessage(from, 
        `Thank you for your message. 

For assistance, reply with:
• *HELP* - View available commands
• *STATUS* - Check your visitor status
• *CHECK [CODE]* - Check invitation status

_Secure Gate Access_`
      );
    }
  }
}

/**
 * Handle WhatsApp status updates
 */
async function handleStatusUpdate(status) {
  const { messageId, status: messageStatus, errors } = status;

  if (messageStatus === 'failed' && errors) {
    loggingService.error('WhatsApp message delivery failed', {
      messageId,
      errors
    });
    // TODO: Handle failed messages (retry, notify admin, etc.)
  }

  // Log delivery status for analytics
  // TODO: Update message status in database
}

/**
 * Send help message
 */
async function sendHelpMessage(to) {
  const helpText = `🏠 *Secure Gate Access - Help*

Available commands:

📋 *HELP* - Show this help message
📊 *STATUS* - Check your pending visitors
🔍 *CHECK [CODE]* - Check invitation status

For more assistance, contact the admin or visit our website.

_Secure Gate Access_`;

  await whatsappService.sendTextMessage(to, helpText);
}

/**
 * Send status message
 */
async function sendStatusMessage(to) {
  // TODO: Look up user by phone number and fetch their visitor status
  const statusText = `📊 *Your Status*

You currently have no pending visitors.

To invite a visitor, use the Secure Gate app or website.

_Secure Gate Access_`;

  await whatsappService.sendTextMessage(to, statusText);
}

/**
 * Check invite status
 */
async function checkInviteStatus(to, inviteCode) {
  // TODO: Look up invite code in database
  const statusText = `🔍 *Invitation Status*

Code: *${inviteCode}*

Status: Not found

Please verify the code and try again.

_Secure Gate Access_`;

  await whatsappService.sendTextMessage(to, statusText);
}

/**
 * Test endpoint to send a test message
 */
router.post('/test', async (req, res) => {
  const { phone, message } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, error: 'Phone number required' });
  }

  const result = await whatsappService.sendTextMessage(phone, message || 'Test message from Secure Gate Access');

  res.json(result);
});

/**
 * Get WhatsApp service status
 */
router.get('/status', (req, res) => {
  res.json({
    configured: whatsappService.isConfigured(),
    provider: 'whatsapp_cloud_api',
    features: [
      'text_messages',
      'template_messages',
      'interactive_buttons',
      'image_messages',
      'webhooks'
    ]
  });
});

export default router;
