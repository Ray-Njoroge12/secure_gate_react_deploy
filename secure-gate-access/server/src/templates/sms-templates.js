// SMS templates for visitor notifications
import Handlebars from 'handlebars';

// Visitor Invitation SMS Template
const visitorInviteSmsTemplate = Handlebars.compile(`
🏠 {{siteName}} - Visitor Invitation

Hello {{visitorName}}!

You've been invited by {{residentName}} to visit {{siteName}}.

📅 Date: {{visitDate}}
🕐 Time: {{visitTime}}
📝 Purpose: {{purpose}}

Complete registration: {{inviteLink}}

Invite Code: {{inviteCode}}

This invitation expires on {{expiryDate}}.

Powered by Secure Gate Access
`);

// Bulk Invitation SMS Template
const bulkInviteSmsTemplate = Handlebars.compile(`
🎉 {{siteName}} - Event Invitation

You're invited to {{eventName}}!

📅 Date: {{eventDate}}
🕐 Time: {{eventTime}}
👥 Max Guests: {{maxGuests}}

Register here: {{inviteLink}}

Invite Code: {{inviteCode}}

This invitation expires on {{expiryDate}}.

Powered by Secure Gate Access
`);

// Pass Code (Entry Code) SMS Template
const otpVerificationSmsTemplate = Handlebars.compile(`
🔐 {{siteName}} - Pass Code

Hello {{visitorName}}!

Your Pass Code for gate entry is: {{otpCode}}

This code is valid for the duration of your visitor pass.

Do not share this code with anyone.

Powered by Secure Gate Access
`);

// QR Code Ready SMS Template
const qrCodeReadySmsTemplate = Handlebars.compile(`
✅ {{siteName}} - QR Code Ready

Hello {{visitorName}}!

Your QR code is ready for gate access.

📱 View QR Code: {{qrCodeLink}}

Visit Date: {{visitDate}} at {{visitTime}}

Show this QR code at the gate for quick entry.

Powered by Secure Gate Access
`);

// Check-in Reminder SMS Template
const checkinReminderSmsTemplate = Handlebars.compile(`
⏰ {{siteName}} - Visit Reminder

Hello {{visitorName}}!

Reminder: You have a visit scheduled for today.

📅 Date: {{visitDate}}
🕐 Time: {{visitTime}}
📍 Location: {{siteName}}

Your QR code: {{qrCodeLink}}

Powered by Secure Gate Access
`);

export {
    visitorInviteSmsTemplate,
    bulkInviteSmsTemplate,
    otpVerificationSmsTemplate,
    qrCodeReadySmsTemplate,
    checkinReminderSmsTemplate
};
