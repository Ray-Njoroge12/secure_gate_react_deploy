/**
 * Data Retention Scheduler
 * Runs periodic retention jobs using node-cron
 * 
 * Default schedule: Daily at 2 AM
 * Configurable via RETENTION_CRON_SCHEDULE environment variable
 */

import cron from 'node-cron';
import retentionService from '../services/retentionService.js';
import logger from '../config/logger.js';

class RetentionScheduler {
  constructor() {
    this.task = null;
    this.isRunning = false;
    // Default: Run daily at 2 AM
    this.schedule = process.env.RETENTION_CRON_SCHEDULE || '0 2 * * *';
  }

  /**
   * Start the retention scheduler
   */
  start() {
    if (this.task) {
      logger.warn('[RetentionScheduler] Scheduler already running');
      return;
    }

    // Validate cron expression
    if (!cron.validate(this.schedule)) {
      logger.error(`[RetentionScheduler] Invalid cron schedule: ${this.schedule}`);
      throw new Error(`Invalid cron schedule: ${this.schedule}`);
    }

    this.task = cron.schedule(this.schedule, async () => {
      await this.runJob();
    });

    logger.info(`[RetentionScheduler] Started with schedule: ${this.schedule}`);
  }

  /**
   * Stop the retention scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('[RetentionScheduler] Stopped');
    }
  }

  /**
   * Run retention job immediately
   */
  async runJob() {
    if (this.isRunning) {
      logger.warn('[RetentionScheduler] Job already running, skipping');
      return;
    }

    this.isRunning = true;
    
    try {
      logger.info('[RetentionScheduler] Starting scheduled retention job');
      const results = await retentionService.runRetentionJob();
      logger.info('[RetentionScheduler] Scheduled retention job completed', results);
      return results;
    } catch (error) {
      logger.error('[RetentionScheduler] Scheduled retention job failed', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      enabled: !!this.task,
      schedule: this.schedule,
      isRunning: this.isRunning
    };
  }
}

export default new RetentionScheduler();
