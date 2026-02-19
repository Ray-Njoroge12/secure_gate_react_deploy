/**
 * Notification Queue Service
 *
 * Implements reliable email and SMS delivery with retry logic using Bull queues
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Dead letter queue for permanent failures
 * - Delivery status tracking
 * - Admin dashboard integration
 * - Graceful degradation when Redis unavailable
 */

import Queue from 'bull';
import nodemailer from 'nodemailer';
import AfricasTalking from 'africastalking';
import Mailgun from 'mailgun.js';
import FormData from 'form-data';
import loggingService from './loggingService.js';
import { dbManager } from '../database/db.enhanced.js';

class NotificationQueueService {
  constructor() {
    this.emailQueue = null;
    this.smsQueue = null;
    this.deadLetterQueue = null;
    this.isInitialized = false;

    // Delivery statistics
    this.stats = {
      email: { sent: 0, failed: 0, retried: 0, pending: 0 },
      sms: { sent: 0, failed: 0, retried: 0, pending: 0 }
    };

    if ((process.env.NODE_ENV || '').toLowerCase() === 'test' || process.env.CACHE_ENABLED !== 'true') {
      loggingService.logInfo('Notification queues disabled (CACHE_ENABLED != true)');
      return;
    }

    // Initialize queues
    this.initializeQueues();
  }

  /**
   * Initialize Bull queues
   */
  async initializeQueues() {
    try {
      // Redis connection configuration
      const redisConfig = process.env.REDIS_URL || {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB) || 0,
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false
      };

      // Create email queue
      this.emailQueue = new Queue('email-notifications', {
        redis: redisConfig,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000 // Start with 2 seconds
          },
          removeOnComplete: {
            age: 86400, // Keep completed jobs for 24 hours
            count: 1000 // Keep last 1000 completed jobs
          },
          removeOnFail: false // Keep failed jobs for investigation
        }
      });

      // Create SMS queue
      this.smsQueue = new Queue('sms-notifications', {
        redis: redisConfig,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: {
            age: 86400,
            count: 1000
          },
          removeOnFail: false
        }
      });

      // Create dead letter queue for permanent failures
      this.deadLetterQueue = new Queue('notification-failures', {
        redis: redisConfig,
        defaultJobOptions: {
          removeOnComplete: {
            age: 604800, // Keep for 7 days
            count: 10000
          }
        }
      });

      // Set up queue processors
      this.setupEmailProcessor();
      this.setupSMSProcessor();
      this.setupEventListeners();

      this.isInitialized = true;
      loggingService.logInfo('Notification queue service initialized successfully');
    } catch (error) {
      loggingService.logError('Failed to initialize notification queues', error);
      loggingService.logWarn('Notifications will be sent directly without retry capability');
      this.isInitialized = false;
    }
  }

  /**
   * Set up email queue processor
   */
  setupEmailProcessor() {
    this.emailQueue.process(async (job) => {
      const { to, subject, html, text, provider } = job.data;

      loggingService.logInfo('Processing email job', {
        jobId: job.id,
        to: this.maskEmail(to),
        attempt: job.attemptsMade + 1
      });

      try {
        await this.sendEmailDirect(to, subject, html, text, provider);
        this.stats.email.sent++;

        return {
          success: true,
          to,
          sentAt: new Date().toISOString(),
          attempt: job.attemptsMade + 1
        };
      } catch (error) {
        this.stats.email.failed++;

        // If this is the last attempt, move to dead letter queue
        if (job.attemptsMade + 1 >= job.opts.attempts) {
          await this.addToDeadLetterQueue('email', job.data, error);
        }

        throw error; // Re-throw to trigger retry
      }
    });
  }

  /**
   * Set up SMS queue processor
   */
  setupSMSProcessor() {
    this.smsQueue.process(async (job) => {
      const { to, message, provider } = job.data;

      loggingService.logInfo('Processing SMS job', {
        jobId: job.id,
        to: this.maskPhone(to),
        attempt: job.attemptsMade + 1
      });

      try {
        await this.sendSMSDirect(to, message, provider);
        this.stats.sms.sent++;

        return {
          success: true,
          to,
          sentAt: new Date().toISOString(),
          attempt: job.attemptsMade + 1
        };
      } catch (error) {
        this.stats.sms.failed++;

        // If this is the last attempt, move to dead letter queue
        if (job.attemptsMade + 1 >= job.opts.attempts) {
          await this.addToDeadLetterQueue('sms', job.data, error);
        }

        throw error;
      }
    });
  }

  /**
   * Set up queue event listeners
   */
  setupEventListeners() {
    // Email queue events
    this.emailQueue.on('completed', (job, result) => {
      loggingService.logInfo('Email sent successfully', {
        jobId: job.id,
        to: this.maskEmail(result.to),
        attempts: result.attempt
      });
    });

    this.emailQueue.on('failed', (job, error) => {
      this.stats.email.retried++;
      loggingService.logWarn('Email delivery failed', {
        jobId: job.id,
        attempt: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        error: error.message
      });
    });

    // SMS queue events
    this.smsQueue.on('completed', (job, result) => {
      loggingService.logInfo('SMS sent successfully', {
        jobId: job.id,
        to: this.maskPhone(result.to),
        attempts: result.attempt
      });
    });

    this.smsQueue.on('failed', (job, error) => {
      this.stats.sms.retried++;
      loggingService.logWarn('SMS delivery failed', {
        jobId: job.id,
        attempt: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        error: error.message
      });
    });
  }

  /**
   * Queue email for delivery
   */
  async queueEmail(to, subject, html, text = null, options = {}) {
    if (!this.isInitialized) {
      // Fallback to direct sending if queue not available
      loggingService.logWarn('Queue not initialized, sending email directly');
      return await this.sendEmailDirect(to, subject, html, text, options.provider);
    }

    try {
      const job = await this.emailQueue.add({
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        provider: options.provider || process.env.EMAIL_PROVIDER || 'smtp',
        metadata: options.metadata || {}
      }, {
        priority: options.priority || 5,
        attempts: options.attempts || 3,
        backoff: options.backoff || { type: 'exponential', delay: 2000 }
      });

      this.stats.email.pending++;

      loggingService.logInfo('Email queued for delivery', {
        jobId: job.id,
        to: this.maskEmail(to)
      });

      return { success: true, jobId: job.id };
    } catch (error) {
      loggingService.logError('Failed to queue email', error);
      throw error;
    }
  }

  /**
   * Queue SMS for delivery
   */
  async queueSMS(to, message, options = {}) {
    if (!this.isInitialized) {
      // Fallback to direct sending if queue not available
      loggingService.logWarn('Queue not initialized, sending SMS directly');
      return await this.sendSMSDirect(to, message, options.provider);
    }

    try {
      const job = await this.smsQueue.add({
        to,
        message,
        provider: options.provider || process.env.SMS_PROVIDER || 'africastalking',
        metadata: options.metadata || {}
      }, {
        priority: options.priority || 5,
        attempts: options.attempts || 3,
        backoff: options.backoff || { type: 'exponential', delay: 2000 }
      });

      this.stats.sms.pending++;

      loggingService.logInfo('SMS queued for delivery', {
        jobId: job.id,
        to: this.maskPhone(to)
      });

      return { success: true, jobId: job.id };
    } catch (error) {
      loggingService.logError('Failed to queue SMS', error);
      throw error;
    }
  }

  /**
   * Send email directly (used by queue processor and fallback)
   */
  async sendEmailDirect(to, subject, html, text, provider = 'smtp') {
    if (provider === 'mailgun' && process.env.MAILGUN_API_KEY) {
      return await this.sendEmailViaMailgun(to, subject, html, text);
    } else {
      return await this.sendEmailViaSMTP(to, subject, html, text);
    }
  }

  /**
   * Send email via SMTP
   */
  async sendEmailViaSMTP(to, subject, html, text) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html
    });

    return info;
  }

  /**
   * Send email via Mailgun
   */
  async sendEmailViaMailgun(to, subject, html, text) {
    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net'
    });

    const result = await mg.messages.create(process.env.MAILGUN_DOMAIN, {
      from: process.env.MAILGUN_FROM || `SecureGate <noreply@${process.env.MAILGUN_DOMAIN}>`,
      to: [to],
      subject,
      text,
      html
    });

    return result;
  }

  /**
   * Send SMS directly (used by queue processor and fallback)
   */
  async sendSMSDirect(to, message, provider = 'africastalking') {
    if (provider === 'africastalking' && process.env.AT_API_KEY) {
      return await this.sendSMSViaAfricasTalking(to, message);
    }
    throw new Error('No SMS provider configured');
  }

  /**
   * Send SMS via Africa's Talking
   */
  async sendSMSViaAfricasTalking(to, message) {
    const africasTalking = AfricasTalking({
      apiKey: process.env.AT_API_KEY,
      username: process.env.AT_USERNAME
    });

    const sms = africasTalking.SMS;
    const result = await sms.send({
      to: [to],
      message,
      from: process.env.AT_SENDER_ID || 'SecureGate'
    });

    return result;
  }

  /**
   * Add failed notification to dead letter queue
   */
  async addToDeadLetterQueue(type, data, error) {
    try {
      await this.deadLetterQueue.add({
        type,
        data,
        error: {
          message: error.message,
          stack: error.stack
        },
        failedAt: new Date().toISOString()
      });

      loggingService.logError(`${type} notification permanently failed`, error, {
        recipient: type === 'email' ? this.maskEmail(data.to) : this.maskPhone(data.to)
      });
    } catch (dlqError) {
      loggingService.logError('Failed to add to dead letter queue', dlqError);
    }
  }

  /**
   * Get queue statistics (enhanced with DB logs)
   */
  async getStatistics() {
    let dbStats = {
      email: { sent: 0, failed: 0 },
      sms: { sent: 0, failed: 0 }
    };

    try {
      // Fetch today's stats from DB
      const result = await dbManager.query(`
        SELECT 
          channel, 
          status,
          COUNT(*) as count 
        FROM notification_log 
        WHERE created_at >= CURRENT_DATE
        GROUP BY channel, status
      `);

      result.rows.forEach(row => {
        if (row.channel === 'email') {
          if (row.status === 'sent') dbStats.email.sent += parseInt(row.count);
          if (row.status === 'failed') dbStats.email.failed += parseInt(row.count);
        } else if (row.channel === 'sms') {
          if (row.status === 'sent') dbStats.sms.sent += parseInt(row.count);
          if (row.status === 'failed') dbStats.sms.failed += parseInt(row.count);
        }
      });
    } catch (dbError) {
      loggingService.logError('Failed to fetch DB notification stats', dbError);
    }

    if (!this.isInitialized) {
      return {
        initialized: false,
        stats: {
          email: {
            ...this.stats.email,
            sent: this.stats.email.sent + dbStats.email.sent,
            failed: this.stats.email.failed + dbStats.email.failed
          },
          sms: {
            ...this.stats.sms,
            sent: this.stats.sms.sent + dbStats.sms.sent,
            failed: this.stats.sms.failed + dbStats.sms.failed
          }
        },
        // Flattened structure for AdminDashboard
        active: 0,
        completed: (this.stats.email.sent + dbStats.email.sent) + (this.stats.sms.sent + dbStats.sms.sent),
        failed: (this.stats.email.failed + dbStats.email.failed) + (this.stats.sms.failed + dbStats.sms.failed)
      };
    }

    try {
      const [emailCounts, smsCounts, dlqCounts] = await Promise.all([
        this.emailQueue.getJobCounts(),
        this.smsQueue.getJobCounts(),
        this.deadLetterQueue.getJobCounts()
      ]);

      const totalCompleted = emailCounts.completed + smsCounts.completed + dbStats.email.sent + dbStats.sms.sent;
      const totalFailed = emailCounts.failed + smsCounts.failed + dbStats.email.failed + dbStats.sms.failed;
      const totalActive = emailCounts.active + smsCounts.active + emailCounts.waiting + smsCounts.waiting;

      return {
        initialized: true,
        email: {
          ...this.stats.email,
          waiting: emailCounts.waiting,
          active: emailCounts.active,
          completed: emailCounts.completed + dbStats.email.sent,
          failed: emailCounts.failed + dbStats.email.failed,
          delayed: emailCounts.delayed
        },
        sms: {
          ...this.stats.sms,
          waiting: smsCounts.waiting,
          active: smsCounts.active,
          completed: smsCounts.completed + dbStats.sms.sent,
          failed: smsCounts.failed + dbStats.sms.failed,
          delayed: smsCounts.delayed
        },
        deadLetter: {
          total: dlqCounts.completed,
          waiting: dlqCounts.waiting
        },
        // Flattened structure for AdminDashboard
        active: totalActive,
        completed: totalCompleted,
        failed: totalFailed
      };
    } catch (error) {
      loggingService.logError('Failed to get queue statistics', error);
      return { initialized: true, error: error.message, stats: this.stats };
    }
  }

  /**
   * Get failed notifications from dead letter queue
   */
  async getFailedNotifications(limit = 50) {
    if (!this.isInitialized) {
      return [];
    }

    try {
      const jobs = await this.deadLetterQueue.getCompleted(0, limit);

      return jobs.map(job => ({
        id: job.id,
        type: job.data.type,
        recipient: job.data.type === 'email'
          ? this.maskEmail(job.data.data.to)
          : this.maskPhone(job.data.data.to),
        error: job.data.error.message,
        failedAt: job.data.failedAt,
        data: job.data.data
      }));
    } catch (error) {
      loggingService.logError('Failed to get failed notifications', error);
      return [];
    }
  }

  /**
   * Retry a failed notification
   */
  async retryFailedNotification(jobId) {
    if (!this.isInitialized) {
      throw new Error('Queue service not initialized');
    }

    try {
      const job = await this.deadLetterQueue.getJob(jobId);

      if (!job) {
        throw new Error('Job not found in dead letter queue');
      }

      const { type, data } = job.data;

      if (type === 'email') {
        await this.queueEmail(data.to, data.subject, data.html, data.text, {
          provider: data.provider
        });
      } else if (type === 'sms') {
        await this.queueSMS(data.to, data.message, {
          provider: data.provider
        });
      }

      // Remove from dead letter queue
      await job.remove();

      loggingService.logInfo('Failed notification requeued', {
        jobId,
        type
      });

      return { success: true, jobId };
    } catch (error) {
      loggingService.logError('Failed to retry notification', error);
      throw error;
    }
  }

  /**
   * Clean old completed jobs
   */
  async cleanOldJobs(olderThanMs = 86400000) { // 24 hours
    if (!this.isInitialized) {
      return;
    }

    try {
      await Promise.all([
        this.emailQueue.clean(olderThanMs, 'completed'),
        this.emailQueue.clean(olderThanMs, 'failed'),
        this.smsQueue.clean(olderThanMs, 'completed'),
        this.smsQueue.clean(olderThanMs, 'failed')
      ]);

      loggingService.logInfo('Old notification jobs cleaned');
    } catch (error) {
      loggingService.logError('Failed to clean old jobs', error);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (!this.isInitialized) {
      return;
    }

    try {
      await Promise.all([
        this.emailQueue.close(),
        this.smsQueue.close(),
        this.deadLetterQueue.close()
      ]);

      loggingService.logInfo('Notification queue service shut down gracefully');
    } catch (error) {
      loggingService.logError('Error during queue shutdown', error);
    }
  }

  /**
   * Mask email for logging
   */
  maskEmail(email) {
    if (!email) return 'N/A';
    const [local, domain] = email.split('@');
    if (!domain) return '***@***';
    const maskedLocal = local.length > 2
      ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
      : '***';
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Mask phone for logging
   */
  maskPhone(phone) {
    if (!phone) return 'N/A';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 4) return '***';
    return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
  }
}

// Create singleton instance
const notificationQueueService = new NotificationQueueService();

// Schedule periodic cleanup (run daily)
setInterval(() => {
  notificationQueueService.cleanOldJobs();
}, 86400000); // 24 hours

export default notificationQueueService;
