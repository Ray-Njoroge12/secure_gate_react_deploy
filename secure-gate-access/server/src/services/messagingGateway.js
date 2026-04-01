import whatsappService from './whatsappService.js';
import { getEmailProvider, getSmsProvider } from '../providers/notificationProviderFactory.js';
import notificationMetricsService from './notificationMetricsService.js';
import loggingService from './loggingService.js';
import {
    visitorInviteTemplate,
    otpVerificationTemplate
} from '../templates/email-templates.js';
import {
    visitorInviteSmsTemplate,
    otpVerificationSmsTemplate
} from '../templates/sms-templates.js';

/**
 * MessagingGateway
 * @description Unified gateway for all outbound communication (WhatsApp, SMS, Email).
 * Handles automatic fallback across channels and integrates with metrics/logging.
 */
class MessagingGateway {
    constructor() {
        this.siteName = process.env.SITE_NAME || 'Secure Gate Access';
        this.siteUrl = process.env.SITE_URL || 'http://localhost';
    }

    /**
     * Primary send method with fallback support
     */
    async send(recipient, templateName, data, options = {}) {
        const channels = options.forceChannel
            ? [options.forceChannel]
            : (options.channels || ['whatsapp', 'sms', 'email']);

        let lastError = null;
        let successfulChannel = null;
        const attempts = [];
        const recipientRef = recipient.phone || recipient.email || 'unknown-recipient';

        // Ensure site metadata is in data
        const enhancedData = {
            siteName: this.siteName,
            siteUrl: this.siteUrl,
            ...data
        };

        for (const channel of channels) {
            const startedAt = Date.now();
            try {
                const result = await this.attemptSend(channel, recipient, templateName, enhancedData);
                if (result && result.success) {
                    successfulChannel = channel;
                    attempts.push({
                        channel,
                        status: 'sent',
                        durationMs: Date.now() - startedAt
                    });
                    break;
                }

                lastError = result?.error || 'Unknown error';
                attempts.push({
                    channel,
                    status: 'failed',
                    durationMs: Date.now() - startedAt,
                    error: lastError
                });

                loggingService.logWarning('MessagingGateway: Channel attempt failed', {
                    channel,
                    recipient: recipientRef,
                    template: templateName,
                    reason: lastError
                });
            } catch (err) {
                lastError = err.message;
                attempts.push({
                    channel,
                    status: 'failed',
                    durationMs: Date.now() - startedAt,
                    error: lastError
                });

                loggingService.logWarning(`MessagingGateway: Channel ${channel} failed`, {
                    error: err.message,
                    recipient: recipientRef,
                    template: templateName
                });
            }
        }

        if (!successfulChannel) {
            loggingService.logError('MessagingGateway: All channels failed', null, {
                recipient: recipientRef,
                channels,
                lastError,
                template: templateName,
                attempts
            });

            return { success: false, error: 'All channels failed', lastError, attempts };
        }

        const hadFallback = attempts.some(attempt => attempt.status === 'failed');
        if (hadFallback) {
            loggingService.logInfo('MessagingGateway: Delivered via fallback channel', {
                recipient: recipientRef,
                template: templateName,
                successfulChannel,
                attempts
            });
        }

        return { success: true, channel: successfulChannel, attempts };
    }

    /**
     * Internal method to attempt sending on a specific channel
     */
    async attemptSend(channel, recipient, templateName, data) {
        // Feature flag checks
        if (channel === 'email' && process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'true') return { success: false, error: 'email_disabled' };
        if (channel === 'sms' && process.env.ENABLE_SMS_NOTIFICATIONS !== 'true') return { success: false, error: 'sms_disabled' };
        if (channel === 'whatsapp' && process.env.ENABLE_WHATSAPP_NOTIFICATIONS !== 'true') return { success: false, error: 'whatsapp_disabled' };

        switch (channel.toLowerCase()) {
            case 'whatsapp':
                return await this.sendViaWhatsApp(recipient, templateName, data);
            case 'sms':
                return await this.sendViaSms(recipient, templateName, data);
            case 'email':
                return await this.sendViaEmail(recipient, templateName, data);
            default:
                return { success: false, error: `Unsupported channel: ${channel}` };
        }
    }

    /**
     * Channel implementation: WhatsApp
     */
    async sendViaWhatsApp(recipient, templateName, data) {
        if (!whatsappService.isConfigured()) return { success: false, error: 'whatsapp_not_configured' };
        if (!recipient.phone) return { success: false, error: 'missing_phone_number' };

        let result;
        switch (templateName) {
            case 'VISITOR_INVITE':
                result = await whatsappService.sendVisitorInvitation(recipient, data.resident || {}, data.inviteLink);
                break;
            case 'OTP_VERIFICATION':
                result = await whatsappService.sendOtpVerification(recipient, data.otpCode, data.expiryMinutes);
                break;
            default:
                if (data.message) {
                    result = await whatsappService.sendTextMessage(recipient.phone, data.message);
                } else {
                    return { success: false, error: `Template ${templateName} not mapped for WhatsApp` };
                }
        }

        if (result.success) {
            notificationMetricsService.recordNotificationResult({
                channel: 'whatsapp',
                provider: 'whatsapp',
                success: true,
                metadata: { to: recipient.phone, messageId: result.messageId }
            });
        }

        return result;
    }

    /**
     * Channel implementation: SMS
     */
    async sendViaSms(recipient, templateName, data) {
        const provider = getSmsProvider();
        if (!provider?.isConfigured?.()) return { success: false, error: 'sms_provider_not_configured' };
        if (!recipient.phone) return { success: false, error: 'missing_phone_number' };

        let message;
        switch (templateName) {
            case 'VISITOR_INVITE':
                message = visitorInviteSmsTemplate({
                    ...data,
                    visitorName: recipient.name,
                    residentName: data.resident?.name || data.resident?.email,
                    visitDate: new Date(data.visitDate).toLocaleDateString(),
                    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
                });
                break;
            case 'OTP_VERIFICATION':
                message = otpVerificationSmsTemplate({
                    ...data,
                    visitorName: recipient.name
                });
                break;
            default:
                message = data.message || `Notification from ${this.siteName}`;
        }

        const result = await provider.send({
            to: recipient.phone,
            message,
            from: process.env.AT_SENDER_ID
        });

        if (result.success) {
            notificationMetricsService.recordNotificationResult({
                channel: 'sms',
                provider: provider.getName?.() || 'unknown',
                success: true,
                metadata: { to: recipient.phone, messageId: result.messageId }
            });
        }

        return result;
    }

    /**
     * Channel implementation: Email
     */
    async sendViaEmail(recipient, templateName, data) {
        const provider = getEmailProvider();
        if (!provider?.isConfigured?.()) return { success: false, error: 'email_provider_not_configured' };
        if (!recipient.email) return { success: false, error: 'missing_email' };

        let html;
        let subject = data.subject || `Notification from ${this.siteName}`;

        switch (templateName) {
            case 'VISITOR_INVITE':
                html = visitorInviteTemplate({
                    ...data,
                    visitorName: recipient.name,
                    residentName: data.resident?.name || data.resident?.email,
                    residentEmail: data.resident?.email
                });
                subject = `🏠 Visitor Invitation - ${this.siteName}`;
                break;
            case 'OTP_VERIFICATION':
                html = otpVerificationTemplate({
                    ...data,
                    visitorName: recipient.name
                });
                subject = `🔐 Verification Code - ${this.siteName}`;
                break;
            default:
                html = data.html || `<p>${data.message || 'New notification'}</p>`;
        }

        const result = await provider.send({
            to: recipient.email,
            subject,
            html
        });

        if (result.success) {
            notificationMetricsService.recordNotificationResult({
                channel: 'email',
                provider: provider.getName?.() || 'smtp',
                success: true,
                metadata: { to: recipient.email, messageId: result.messageId }
            });
        }

        return result;
    }
}

const messagingGateway = new MessagingGateway();
export default messagingGateway;
export { MessagingGateway };
