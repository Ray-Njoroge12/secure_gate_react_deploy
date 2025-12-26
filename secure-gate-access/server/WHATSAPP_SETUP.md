# WhatsApp Business API Setup Guide for SecureGate

This guide walks you through setting up WhatsApp Business API integration for the SecureGate system to enable automated visitor notifications.

## Overview

The WhatsApp integration enables:
- 📩 Sending visitor pass notifications
- ✅ Sending approval/denial notifications  
- 🔔 Real-time check-in/check-out alerts
- 📱 Rideshare arrival notifications
- 📅 Recurring pass reminders

## Prerequisites

1. A **Meta Business Account** (previously Facebook Business)
2. A **phone number** dedicated for WhatsApp Business (cannot be used on regular WhatsApp)
3. A **verified business** on Meta Business Suite

## Step 1: Create Meta Business Account

1. Go to [business.facebook.com](https://business.facebook.com)
2. Click "Create Account"
3. Enter your business details
4. Verify your business (may take 24-48 hours)

## Step 2: Create WhatsApp Business App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click "My Apps" → "Create App"
3. Select "Business" as app type
4. Enter app name: "SecureGate WhatsApp"
5. Select your Business Account
6. Click "Create App"

## Step 3: Set Up WhatsApp in Your App

1. In your app dashboard, find "Add Products"
2. Click "Set Up" on WhatsApp
3. Select your Business Account
4. You'll get a **test phone number** for development

## Step 4: Get Your API Credentials

### Phone Number ID
1. Go to WhatsApp → API Setup
2. Copy the **Phone Number ID** (e.g., `123456789012345`)

### Access Token
1. In API Setup, click "Generate Access Token"
2. For production, create a **System User**:
   - Go to Business Settings → Users → System Users
   - Create a new System User
   - Generate a permanent token with `whatsapp_business_messaging` permission

### Business Account ID
1. Go to Business Settings → Business Info
2. Copy your **Business Account ID**

### App Secret
1. Go to App Settings → Basic
2. Copy your **App Secret**

## Step 5: Configure Environment Variables

Add these to your `.env` file:

```bash
# WhatsApp Business API Configuration
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765
WHATSAPP_APP_SECRET=abcdef1234567890
WHATSAPP_VERIFY_TOKEN=secure_gate_webhook_token_2024
```

## Step 6: Set Up Webhook (Optional - for incoming messages)

To receive visitor responses (APPROVE/DENY), configure webhooks:

1. In your app, go to WhatsApp → Configuration
2. Set **Callback URL**: `https://yourdomain.com/api/whatsapp/webhook`
3. Set **Verify Token**: Same as `WHATSAPP_VERIFY_TOKEN` in your `.env`
4. Subscribe to: `messages`, `message_status_updates`

### For Local Development

Use ngrok to expose your local server:

```bash
# Install ngrok
brew install ngrok

# Expose port 3001
ngrok http 3001

# Use the ngrok URL as your webhook callback
# e.g., https://abc123.ngrok.io/api/whatsapp/webhook
```

## Step 7: Create Message Templates

WhatsApp requires pre-approved templates for proactive messages.

### Create Templates in Meta Business Suite

1. Go to [business.facebook.com/wa/manage/message-templates](https://business.facebook.com/wa/manage/message-templates)
2. Click "Create Template"

### Recommended Templates

#### 1. Visitor Pass Notification (`visitor_pass_notification`)

**Category:** Utility  
**Language:** English

**Header:** 🏠 Visitor Pass  
**Body:**
```
Hello {{1}},

You have been invited to visit:
📍 Unit: {{2}}
👤 Host: {{3}}

📅 Valid: {{4}} - {{5}}
🔑 Pass Code: {{6}}

Please present this code at the security gate.
```
**Footer:** SecureGate Access Control

#### 2. Approval Request (`approval_request`)

**Category:** Utility  
**Language:** English

**Body:**
```
🔔 Visitor Approval Request

A visitor is requesting access:
👤 Name: {{1}}
📱 Phone: {{2}}
📝 Purpose: {{3}}
🕐 Arrival: {{4}}

Reply APPROVE or DENY to respond.
```

#### 3. Check-In Notification (`check_in_notification`)

**Category:** Utility  
**Language:** English

**Body:**
```
✅ Visitor Checked In

{{1}} has checked in to visit you.
🕐 Time: {{2}}

They should arrive at your unit shortly.
```

## Step 8: Test the Integration

### Test API Status

```bash
curl http://localhost:3001/api/whatsapp/status
```

Expected response:
```json
{
  "success": true,
  "data": {
    "configured": true,
    "phone_number_id": "***2345",
    "business_account_id": "***8765",
    "webhook_configured": true
  }
}
```

### Send Test Message

```bash
curl -X POST http://localhost:3001/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "to": "254712345678",
    "message": "Test message from SecureGate"
  }'
```

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/whatsapp/webhook` | Meta webhook verification |
| POST | `/api/whatsapp/webhook` | Receive incoming messages |
| GET | `/api/whatsapp/status` | Get service status |

### Authenticated Endpoints (require JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/whatsapp/send` | Send text or template message |
| POST | `/api/whatsapp/notify/visitor-pass` | Send visitor pass notification |
| POST | `/api/whatsapp/notify/approval-request` | Send approval request to resident |

## Troubleshooting

### "WhatsApp not configured"

- Verify all environment variables are set
- Restart the server after adding env vars

### "Invalid phone number"

- Ensure phone number is in E.164 format
- Kenya format: `254712345678` (no +, no spaces)

### "Template not approved"

- Template must be approved by Meta (takes 24-48 hours)
- Check template status in Business Manager

### Webhook not receiving messages

- Verify callback URL is HTTPS
- Check verify token matches
- Ensure firewall allows Meta IPs

## Production Considerations

1. **Use a permanent access token** from a System User, not temporary tokens
2. **Register your phone number** for production use
3. **Verify your business** to remove test restrictions
4. **Set up webhook security** with app secret verification
5. **Monitor API limits** (1000 messages/24hr for tier 1)

## Cost

- WhatsApp Business API: Free for first 1000 conversations/month
- After that, pricing varies by country (Kenya: ~$0.05/conversation)
- Template messages: Same pricing as regular messages

## Support

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Meta Business Help Center](https://www.facebook.com/business/help)
