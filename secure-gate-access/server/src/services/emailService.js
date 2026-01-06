/**
 * Email Service - Multi-Provider Implementation
 * Supports both Mailgun (production) and SMTP (local testing with MailHog)
 */

import Mailgun from 'mailgun.js';
import formData from 'form-data';
import nodemailer from 'nodemailer';
import logger from '../config/logger.js';
import { emailTemplates } from '../templates/email-templates.js';

class EmailService {
  constructor() {
    this.mailgun = null;
    this.mg = null;
    this.transporter = null;
    this.provider = null;
    this.initialized = false;
    this.fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@localhost';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Secure Gate Access';
    
    this.initialize();
  }

  initialize() {
    try {
      const emailProvider = (process.env.EMAIL_PROVIDER || 'mailgun').toLowerCase();
      
      if (emailProvider === 'smtp') {
        // Initialize SMTP (for MailHog or other SMTP servers)
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'localhost',
          port: parseInt(process.env.SMTP_PORT || '1025'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: process.env.SMTP_USER ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          } : null,
          // Disable TLS for MailHog
          tls: {
            rejectUnauthorized: false
          }
        });
        
        this.provider = 'smtp';
        this.initialized = true;
        logger.info(`Email service initialized with SMTP (${process.env.SMTP_HOST}:${process.env.SMTP_PORT})`);
        
      } else if (emailProvider === 'mailgun') {
        // Initialize Mailgun
        const apiKey = process.env.MAILGUN_API_KEY;
        const domain = process.env.MAILGUN_DOMAIN;

        if (!apiKey || !domain) {
          logger.warn('Mailgun credentials not found. Email service will operate in stub mode.');
          this.initialized = false;
          return;
        }

        this.mailgun = new Mailgun(formData);
        this.mg = this.mailgun.client({
          username: 'api',
          key: apiKey,
          url: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net'
        });

        this.domain = domain;
        this.provider = 'mailgun';
        this.initialized = true;
        logger.info('Email service initialized successfully with Mailgun');
        
      } else {
        logger.warn(`Unknown email provider: ${emailProvider}. Email service will operate in stub mode.`);
        this.initialized = false;
      }

    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      this.initialized = false;
    }
  }

  async sendOTP(email, otp, username = '') {
    const subject = 'Your Secure Gate Access Verification Code';
    const html = emailTemplates.otpEmail({
      username: username || email.split('@')[0],
      otp: otp,
      siteName: 'Secure Gate Access',
      expiresIn: '10 minutes'
    });

    return await this.send(email, subject, html);
  }

  async sendWelcomeEmail(email, username, temporaryPassword = null) {
    const subject = 'Welcome to Secure Gate Access';
    const html = emailTemplates.welcomeEmail({
      username: username,
      siteName: 'Secure Gate Access',
      loginUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      temporaryPassword: temporaryPassword
    });

    return await this.send(email, subject, html);
  }

  async sendPasswordResetEmail(email, username, resetToken) {
    const subject = 'Reset Your Secure Gate Access Password';
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const html = emailTemplates.passwordResetEmail({
      username: username,
      resetUrl: resetUrl,
      siteName: 'Secure Gate Access',
      expiresIn: '1 hour'
    });

    return await this.send(email, subject, html);
  }

  async sendRegistrationConfirmation(email, username, verificationToken) {
    const subject = 'Confirm Your Secure Gate Access Registration';
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    
    const html = emailTemplates.registrationConfirmationEmail({
      username: username,
      verificationUrl: verificationUrl,
      siteName: 'Secure Gate Access',
      expiresIn: '24 hours'
    });

    return await this.send(email, subject, html);
  }

  async send(to, subject, htmlContent, textContent = null) {
    // Stub mode fallback
    if (!this.initialized) {
      logger.warn(`[EMAIL STUB] Would send email to ${to}: ${subject}`);
      return { 
        success: true, 
        stubMode: true,
        message: 'Email service in stub mode - no actual email sent'
      };
    }

    try {
      if (this.provider === 'smtp') {
        // Send via SMTP (MailHog or other SMTP server)
        const mailOptions = {
          from: `${this.fromName} <${this.fromEmail}>`,
          to: to,
          subject: subject,
          html: htmlContent,
          text: textContent || htmlContent.replace(/<[^>]*>/g, '') // Strip HTML for text version
        };

        const info = await this.transporter.sendMail(mailOptions);
        
        logger.info(`Email sent successfully via SMTP to ${to}`, {
          messageId: info.messageId,
          subject: subject,
          response: info.response
        });

        return {
          success: true,
          messageId: info.messageId,
          message: 'Email sent successfully via SMTP',
          provider: 'smtp'
        };
        
      } else if (this.provider === 'mailgun') {
        // Send via Mailgun
        const messageData = {
          from: `${this.fromName} <${this.fromEmail}>`,
          to: to,
          subject: subject,
          html: htmlContent
        };

        if (textContent) {
          messageData.text = textContent;
        }

        const response = await this.mg.messages.create(this.domain, messageData);
        
        logger.info(`Email sent successfully via Mailgun to ${to}`, {
          messageId: response.id,
          subject: subject
        });

        return {
          success: true,
          messageId: response.id,
          message: 'Email sent successfully via Mailgun',
          provider: 'mailgun'
        };
      }

    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, {
        error: error.message,
        subject: subject,
        stack: error.stack,
        provider: this.provider
      });

      return {
        success: false,
        error: error.message,
        message: 'Failed to send email',
        provider: this.provider
      };
    }
  }

  // Health check method
  async isHealthy() {
    if (!this.initialized) {
      return { healthy: false, reason: 'Email service not initialized' };
    }

    try {
      if (this.provider === 'smtp') {
        // Verify SMTP connection
        await this.transporter.verify();
        return { 
          healthy: true, 
          provider: 'SMTP',
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT
        };
      } else if (this.provider === 'mailgun') {
        // Test Mailgun domain validation
        await this.mg.domains.get(this.domain);
        return { healthy: true, provider: 'Mailgun', domain: this.domain };
      }
    } catch (error) {
      return { 
        healthy: false, 
        reason: `Cannot connect to ${this.provider} service`,
        error: error.message 
      };
    }
  }
}

export default new EmailService();
