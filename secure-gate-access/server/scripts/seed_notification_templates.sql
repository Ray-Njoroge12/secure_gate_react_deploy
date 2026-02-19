-- Seed basic notification templates for Secure Gate Access
-- These templates are used by the Phase V3 Notification System (notificationController.js)
-- Cleanup existing templates to avoid duplicates during seeding
TRUNCATE TABLE notification_templates;
-- Visitor Invite (Email)
INSERT INTO notification_templates (
        name,
        channel,
        language,
        subject,
        body,
        html_body,
        is_active
    )
VALUES (
        'visitor_invite',
        'email',
        'en',
        '🏠 Visitor Invitation - {{siteName}}',
        'Hello {{visitorName}}! You have been invited to visit {{siteName}} by {{residentName}} on {{visitDate}} at {{visitTime}}. Purpose: {{purpose}}. Your invite code is {{inviteCode}}. Complete registration at: {{inviteLink}}',
        '<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;"><h2>Hello {{visitorName}}!</h2><p>You have been invited to visit <strong>{{siteName}}</strong> by {{residentName}}.</p><div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;"><h3>📋 Visit Details</h3><p><strong>Date:</strong> {{visitDate}}<br><strong>Time:</strong> {{visitTime}}<br><strong>Purpose:</strong> {{purpose}}<br><strong>Invite Code:</strong> <code>{{inviteCode}}</code></p></div><div style="text-align: center;"><a href="{{inviteLink}}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Complete Registration</a></div><p style="margin-top: 30px; font-size: 14px; color: #64748b;">This invitation is valid until {{expiryDate}}. Powered by Secure Gate.</p></div></body></html>',
        true
    );
-- Visitor Invite (SMS)
INSERT INTO notification_templates (name, channel, language, body, is_active)
VALUES (
        'visitor_invite',
        'sms',
        'en',
        'Hello {{visitorName}}! You are invited to {{siteName}} by {{residentName}} on {{visitDate}} at {{visitTime}}. Invite code: {{inviteCode}}. Register: {{inviteLink}}',
        true
    );
-- Visit Approved (Email)
INSERT INTO notification_templates (
        name,
        channel,
        language,
        subject,
        body,
        html_body,
        is_active
    )
VALUES (
        'visit_approved',
        'email',
        'en',
        '✅ Your visit to {{siteName}} has been approved!',
        'Great news {{visitorName}}! Your visit to {{siteName}} for {{visitDate}} has been approved. You can now use your QR code at the gate.',
        '<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; color: #333;"><h2>Visit Approved!</h2><p>Hello {{visitorName}}, your visit to <strong>{{siteName}}</strong> on {{visitDate}} has been approved.</p><p>Please have your QR code ready at the gate for quick entry.</p></body></html>',
        true
    );
-- Visit Approved (Push)
INSERT INTO notification_templates (
        name,
        channel,
        language,
        subject,
        body,
        is_active
    )
VALUES (
        'visit_approved',
        'push',
        'en',
        'Visit Approved!',
        'Your visit to {{siteName}} on {{visitDate}} has been approved.',
        true
    );
-- OTP Verification (Email)
INSERT INTO notification_templates (
        name,
        channel,
        language,
        subject,
        body,
        html_body,
        is_active
    )
VALUES (
        'otp_verification',
        'email',
        'en',
        '🔐 Verification Code - {{siteName}}',
        'Your verification code is: {{otpCode}}. It expires in {{expiryMinutes}} minutes.',
        '<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; text-align: center;"><h2>Verification Code</h2><p>Use the code below to complete your registration:</p><div style="font-size: 32px; font-weight: bold; background: #f1f5f9; padding: 20px; display: inline-block; border-radius: 8px; letter-spacing: 5px; color: #1e293b;">{{otpCode}}</div><p>Expires in {{expiryMinutes}} minutes.</p></body></html>',
        true
    );
-- OTP Verification (SMS)
INSERT INTO notification_templates (name, channel, language, body, is_active)
VALUES (
        'otp_verification',
        'sms',
        'en',
        'Your Secure Gate verification code is: {{otpCode}}. Valid for {{expiryMinutes}} minutes.',
        true
    );
-- Resident Alert: Visitor Arrival (Push)
INSERT INTO notification_templates (
        name,
        channel,
        language,
        subject,
        body,
        is_active
    )
VALUES (
        'visitor_checked_in',
        'push',
        'en',
        'Visitor Arrived!',
        '{{visitorName}} has just checked in at the gate.',
        true
    );
-- Resident Alert: Visitor Arrival (SMS)
INSERT INTO notification_templates (name, channel, language, body, is_active)
VALUES (
        'visitor_checked_in',
        'sms',
        'en',
        'Secure Gate: Your visitor {{visitorName}} has arrived at the gate.',
        true
    );
-- Security Alert (Push)
INSERT INTO notification_templates (
        name,
        channel,
        language,
        subject,
        body,
        is_active
    )
VALUES (
        'security_alert',
        'push',
        'en',
        '🚨 SECURITY ALERT',
        '{{alertMessage}}',
        true
    );