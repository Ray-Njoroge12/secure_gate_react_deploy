/**
 * WhatsApp Business API Service
 * @description Handles WhatsApp message sending via Meta's Cloud API
 * 
 * Setup Instructions:
 * 1. Create a Meta Business Account at https://business.facebook.com
 * 2. Create a WhatsApp Business App at https://developers.facebook.com
 * 3. Get your Phone Number ID and Access Token from the WhatsApp settings
 * 4. Configure webhook for incoming messages (optional)
 * 
 * Environment Variables Required:
 * - WHATSAPP_PHONE_NUMBER_ID: Your WhatsApp Business phone number ID
 * - WHATSAPP_ACCESS_TOKEN: Your permanent access token
 * - WHATSAPP_BUSINESS_ACCOUNT_ID: Your WhatsApp Business Account ID
 * - WHATSAPP_VERIFY_TOKEN: Webhook verification token (for incoming messages)
 */

import loggingService from './loggingService.js';

// Configuration
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const WHATSAPP_API_BASE = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

// Environment variables
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

// Template names (must be pre-approved in WhatsApp Business Manager)
const TEMPLATES = {
  VISITOR_INVITE: 'visitor_invitation',
  OTP_VERIFICATION: 'otp_verification',
  CHECK_IN_NOTIFICATION: 'checkin_notification',
  CHECK_OUT_NOTIFICATION: 'checkout_notification',
  APPROVAL_REQUEST: 'approval_request',
  WELCOME: 'welcome_message'
};

/**
 * Check if WhatsApp service is configured
 */
export function isConfigured() {
  return !!(PHONE_NUMBER_ID && ACCESS_TOKEN);
}

/**
 * Format phone number for WhatsApp
 * WhatsApp requires format: country code + number (no + sign, no spaces)
 * Example: 254712345678
 */
function formatPhoneNumber(phone) {
  if (!phone) return null;

  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // Handle Kenyan numbers
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    // Local Kenyan format: 0712345678 -> 254712345678
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') && cleaned.length === 9) {
    // Short format: 712345678 -> 254712345678
    cleaned = '254' + cleaned;
  } else if (cleaned.startsWith('254')) {
    // Already has country code
    // Keep as is
  } else if (cleaned.startsWith('1') && cleaned.length === 10) {
    // US format - add country code
    cleaned = '1' + cleaned;
  }

  return cleaned;
}

/**
 * Send a text message via WhatsApp
 */
export async function sendTextMessage(to, message) {
  if (!isConfigured()) {
    console.warn('WhatsApp service not configured');
    return { success: false, error: 'WhatsApp not configured' };
  }

  const formattedPhone = formatPhoneNumber(to);
  if (!formattedPhone) {
    return { success: false, error: 'Invalid phone number' };
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_BASE}/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'text',
          text: {
            preview_url: true,
            body: message
          }
        })
      }
    );

    const data = await response.json();

    if (response.ok && data.messages && data.messages[0]) {
      loggingService.info('WhatsApp message sent', {
        to: formattedPhone,
        messageId: data.messages[0].id
      });
      return {
        success: true,
        messageId: data.messages[0].id,
        status: data.messages[0].message_status
      };
    } else {
      loggingService.error('WhatsApp send failed', {
        error: data.error,
        to: formattedPhone
      });
      return {
        success: false,
        error: data.error?.message || 'Failed to send message',
        code: data.error?.code
      };
    }
  } catch (error) {
    loggingService.error('WhatsApp API error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Send a template message (for business-initiated conversations)
 * Templates must be pre-approved in WhatsApp Business Manager
 */
export async function sendTemplateMessage(to, templateName, languageCode = 'en', components = []) {
  if (!isConfigured()) {
    console.warn('WhatsApp service not configured');
    return { success: false, error: 'WhatsApp not configured' };
  }

  const formattedPhone = formatPhoneNumber(to);
  if (!formattedPhone) {
    return { success: false, error: 'Invalid phone number' };
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_BASE}/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode
            },
            components: components
          }
        })
      }
    );

    const data = await response.json();

    if (response.ok && data.messages && data.messages[0]) {
      loggingService.info('WhatsApp template message sent', {
        to: formattedPhone,
        template: templateName,
        messageId: data.messages[0].id
      });
      return {
        success: true,
        messageId: data.messages[0].id
      };
    } else {
      loggingService.error('WhatsApp template send failed', {
        error: data.error,
        template: templateName
      });
      return {
        success: false,
        error: data.error?.message || 'Failed to send template message',
        code: data.error?.code
      };
    }
  } catch (error) {
    loggingService.error('WhatsApp template API error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Send visitor invitation via WhatsApp
 */
export async function sendVisitorInvitation(visitorData, residentData, inviteLink) {
  const message = `🏠 *Visitor Invitation*

Hello ${visitorData.name}!

You have been invited to visit ${residentData.name || residentData.email}.

📅 *Date:* ${new Date(visitorData.dateOfVisit).toLocaleDateString()}
⏰ *Time:* ${visitorData.time || 'Not specified'}
📍 *Purpose:* ${visitorData.purpose || 'Visit'}

🔗 *View Your Invitation:*
${inviteLink}

Your invite code: *${visitorData.inviteCode}*

Present this code or QR code at the gate for entry.

_This invitation is valid for 7 days._`;

  return await sendTextMessage(visitorData.phone, message);
}

/**
 * Send OTP verification via WhatsApp
 */
export async function sendOtpVerification(visitorData, otpCode, expiryMinutes = 15) {
  const message = `🔐 *Verification Code*

Hello ${visitorData.name}!

Your verification code is: *${otpCode}*

This code will expire in ${expiryMinutes} minutes.

⚠️ Do not share this code with anyone.

_Secure Gate Access_`;

  return await sendTextMessage(visitorData.phone, message);
}

/**
 * Send check-in notification to resident
 */
export async function sendCheckInNotification(residentPhone, visitorName, checkInTime) {
  const message = `✅ *Visitor Checked In*

${visitorName} has checked in at ${checkInTime}.

_Secure Gate Access_`;

  return await sendTextMessage(residentPhone, message);
}

/**
 * Send check-out notification to resident
 */
export async function sendCheckOutNotification(residentPhone, visitorName, checkOutTime) {
  const message = `👋 *Visitor Checked Out*

${visitorName} has checked out at ${checkOutTime}.

_Secure Gate Access_`;

  return await sendTextMessage(residentPhone, message);
}

/**
 * Send approval request to resident for walk-in visitor
 */
export async function sendApprovalRequest(residentPhone, visitorData, approvalLink) {
  const message = `🚪 *Visitor Approval Required*

A visitor is at the gate requesting entry:

👤 *Name:* ${visitorData.name}
📱 *Phone:* ${visitorData.phone || 'Not provided'}
📋 *ID:* ${visitorData.idNumber || 'Not provided'}
📝 *Purpose:* ${visitorData.purpose || 'Not specified'}

To approve or deny this visitor, click:
${approvalLink}

⏰ This request expires in 30 minutes.

_Secure Gate Access_`;

  return await sendTextMessage(residentPhone, message);
}

/**
 * Send interactive message with buttons
 */
export async function sendInteractiveMessage(to, headerText, bodyText, buttons) {
  if (!isConfigured()) {
    console.warn('WhatsApp service not configured');
    return { success: false, error: 'WhatsApp not configured' };
  }

  const formattedPhone = formatPhoneNumber(to);
  if (!formattedPhone) {
    return { success: false, error: 'Invalid phone number' };
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_BASE}/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'interactive',
          interactive: {
            type: 'button',
            header: {
              type: 'text',
              text: headerText
            },
            body: {
              text: bodyText
            },
            action: {
              buttons: buttons.slice(0, 3).map((btn, index) => ({
                type: 'reply',
                reply: {
                  id: btn.id || `btn_${index}`,
                  title: btn.title.substring(0, 20) // Max 20 chars
                }
              }))
            }
          }
        })
      }
    );

    const data = await response.json();

    if (response.ok && data.messages && data.messages[0]) {
      return {
        success: true,
        messageId: data.messages[0].id
      };
    } else {
      return {
        success: false,
        error: data.error?.message || 'Failed to send interactive message'
      };
    }
  } catch (error) {
    loggingService.error('WhatsApp interactive API error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Send message with QR code image
 */
export async function sendQRCodeMessage(to, visitorData, qrCodeUrl) {
  if (!isConfigured()) {
    console.warn('WhatsApp service not configured');
    return { success: false, error: 'WhatsApp not configured' };
  }

  const formattedPhone = formatPhoneNumber(to);
  if (!formattedPhone) {
    return { success: false, error: 'Invalid phone number' };
  }

  try {
    // First send the QR code image
    const imageResponse = await fetch(
      `${WHATSAPP_API_BASE}/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'image',
          image: {
            link: qrCodeUrl,
            caption: `🎫 Your Entry Pass\n\nInvite Code: ${visitorData.inviteCode}\n\nShow this QR code at the gate for quick entry.`
          }
        })
      }
    );

    const data = await imageResponse.json();

    if (imageResponse.ok && data.messages && data.messages[0]) {
      return {
        success: true,
        messageId: data.messages[0].id
      };
    } else {
      return {
        success: false,
        error: data.error?.message || 'Failed to send QR code'
      };
    }
  } catch (error) {
    loggingService.error('WhatsApp QR send error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Mark message as read
 */
export async function markAsRead(messageId) {
  if (!isConfigured()) return { success: false };

  try {
    await fetch(
      `${WHATSAPP_API_BASE}/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        })
      }
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get WhatsApp Business Profile
 */
export async function getBusinessProfile() {
  if (!isConfigured()) {
    return { success: false, error: 'WhatsApp not configured' };
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_BASE}/${PHONE_NUMBER_ID}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        }
      }
    );

    const data = await response.json();
    return { success: true, profile: data.data?.[0] || data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Webhook verification handler
 */
export function verifyWebhook(mode, token, challenge) {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return { valid: true, challenge };
  }
  return { valid: false };
}

/**
 * Process incoming webhook message
 */
export function processWebhookMessage(body) {
  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) return null;

    // Handle incoming messages
    if (value.messages && value.messages[0]) {
      const message = value.messages[0];
      return {
        type: 'message',
        from: message.from,
        messageId: message.id,
        timestamp: message.timestamp,
        messageType: message.type,
        text: message.text?.body,
        interactive: message.interactive
      };
    }

    // Handle status updates
    if (value.statuses && value.statuses[0]) {
      const status = value.statuses[0];
      return {
        type: 'status',
        messageId: status.id,
        status: status.status, // sent, delivered, read, failed
        timestamp: status.timestamp,
        recipientId: status.recipient_id,
        errors: status.errors
      };
    }

    return null;
  } catch (error) {
    loggingService.error('Webhook processing error', { error: error.message });
    return null;
  }
}

// Default export
export default {
  isConfigured,
  sendTextMessage,
  sendTemplateMessage,
  sendVisitorInvitation,
  sendOtpVerification,
  sendCheckInNotification,
  sendCheckOutNotification,
  sendApprovalRequest,
  sendInteractiveMessage,
  sendQRCodeMessage,
  markAsRead,
  getBusinessProfile,
  verifyWebhook,
  processWebhookMessage,
  TEMPLATES
};
