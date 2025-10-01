/**
 * Disaster Recovery Job Scheduler for Secure Gate Access Control System
 * 
 * Provides automated DR drill scheduling and execution
 * Features:
 * - Quarterly DR drill scheduling
 * - Monthly database outage drills
 * - Ad-hoc drill execution
 * - Drill reporting automation
 */

import cron from 'node-cron';
import drDrillService from '../services/drDrillService.js';
import loggingService from '../services/loggingService.js';
import notificationService from '../services/notificationService.js';

class DRJobScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
    
    this.initializeScheduler();
  }

  /**
   * Initialize DR job scheduler
   */
  async initializeScheduler() {
    try {
      loggingService.logInfo('DR job scheduler initialized');
      
      // Schedule quarterly drills
      this.scheduleQuarterlyDrills();
      
      // Schedule monthly drills
      this.scheduleMonthlyDrills();
      
      // Start scheduler
      this.startScheduler();
      
    } catch (error) {
      loggingService.logError('Failed to initialize DR job scheduler', error);
      throw error;
    }
  }

  /**
   * Start DR job scheduler
   */
  startScheduler() {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    loggingService.logInfo('DR job scheduler started');
  }

  /**
   * Stop DR job scheduler
   */
  stopScheduler() {
    if (!this.isRunning) {
      return;
    }
    
    // Stop all scheduled jobs
    this.jobs.forEach((job, jobId) => {
      job.stop();
      loggingService.logInfo(`DR job stopped: ${jobId}`);
    });
    
    this.jobs.clear();
    this.isRunning = false;
    
    loggingService.logInfo('DR job scheduler stopped');
  }

  /**
   * Schedule quarterly DR drills
   */
  scheduleQuarterlyDrills() {
    const jobId = 'quarterly_dr_drills';
    
    // Schedule for 1st day of every quarter at 2 AM
    const job = cron.schedule('0 2 1 */3 *', async () => {
      try {
        loggingService.logInfo('Starting quarterly DR drills');
        
        const drillTypes = ['database_outage', 'redis_outage', 'vault_outage'];
        
        for (const drillType of drillTypes) {
          try {
            // Schedule drill
            const drill = await drDrillService.scheduleDrill(
              drillType,
              new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
              ['drp_team', 'admin']
            );
            
            loggingService.logInfo(`Quarterly drill scheduled: ${drillType}`, {
              drillId: drill.id
            });
            
            // Notify team
            await notificationService.sendSystemNotification({
              type: 'dr_drill_scheduled',
              title: 'Quarterly DR Drill Scheduled',
              message: `Quarterly DR drill '${drill.name}' has been scheduled`,
              severity: 'info',
              data: { drill }
            });
            
          } catch (error) {
            loggingService.logError(`Failed to schedule quarterly drill: ${drillType}`, error);
          }
        }
        
        loggingService.logInfo('Quarterly DR drills scheduled');
        
      } catch (error) {
        loggingService.logError('Quarterly DR drill scheduling failed', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });
    
    this.jobs.set(jobId, job);
    loggingService.logInfo(`Quarterly DR drills job scheduled: ${jobId}`);
  }

  /**
   * Schedule monthly DR drills
   */
  scheduleMonthlyDrills() {
    const jobId = 'monthly_dr_drills';
    
    // Schedule for 1st day of every month at 3 AM
    const job = cron.schedule('0 3 1 * *', async () => {
      try {
        loggingService.logInfo('Starting monthly DR drills');
        
        // Schedule database outage drill
        const drill = await drDrillService.scheduleDrill(
          'database_outage',
          new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          ['drp_team', 'admin']
        );
        
        loggingService.logInfo(`Monthly drill scheduled: database_outage`, {
          drillId: drill.id
        });
        
        // Notify team
        await notificationService.sendSystemNotification({
          type: 'dr_drill_scheduled',
          title: 'Monthly DR Drill Scheduled',
          message: `Monthly DR drill '${drill.name}' has been scheduled`,
          severity: 'info',
          data: { drill }
        });
        
        loggingService.logInfo('Monthly DR drill scheduled');
        
      } catch (error) {
        loggingService.logError('Monthly DR drill scheduling failed', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });
    
    this.jobs.set(jobId, job);
    loggingService.logInfo(`Monthly DR drills job scheduled: ${jobId}`);
  }

  /**
   * Schedule ad-hoc DR drill
   */
  async scheduleAdhocDrill(drillType, scheduledTime = null, participants = []) {
    try {
      const drill = await drDrillService.scheduleDrill(
        drillType,
        scheduledTime,
        participants
      );
      
      loggingService.logInfo(`Ad-hoc drill scheduled: ${drillType}`, {
        drillId: drill.id
      });
      
      return drill;
      
    } catch (error) {
      loggingService.logError(`Failed to schedule ad-hoc drill: ${drillType}`, error);
      throw error;
    }
  }

  /**
   * Execute scheduled drill
   */
  async executeScheduledDrill(drillId) {
    try {
      const drill = await drDrillService.executeDrill(drillId);
      
      loggingService.logInfo(`Scheduled drill executed: ${drillId}`, {
        type: drill.type,
        duration: drill.result?.duration,
        rtoCompliance: drill.result?.rtoCompliance,
        rpoCompliance: drill.result?.rpoCompliance
      });
      
      // Notify team of completion
      await notificationService.sendSystemNotification({
        type: 'dr_drill_completed',
        title: 'DR Drill Completed',
        message: `DR drill '${drill.name}' has been completed`,
        severity: 'info',
        data: { drill }
      });
      
      return drill;
      
    } catch (error) {
      loggingService.logError(`Failed to execute scheduled drill: ${drillId}`, error);
      throw error;
    }
  }

  /**
   * Schedule drill execution
   */
  scheduleDrillExecution(drillId, executionTime) {
    const jobId = `drill_execution_${drillId}`;
    
    const job = cron.schedule(executionTime, async () => {
      try {
        await this.executeScheduledDrill(drillId);
      } catch (error) {
        loggingService.logError(`Scheduled drill execution failed: ${drillId}`, error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });
    
    this.jobs.set(jobId, job);
    loggingService.logInfo(`Drill execution scheduled: ${drillId}`);
  }

  /**
   * Cancel scheduled drill
   */
  cancelScheduledDrill(drillId) {
    const jobId = `drill_execution_${drillId}`;
    const job = this.jobs.get(jobId);
    
    if (job) {
      job.stop();
      this.jobs.delete(jobId);
      loggingService.logInfo(`Scheduled drill cancelled: ${drillId}`);
    }
  }

  /**
   * Get job status
   */
  getJobStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      jobCount: this.jobs.size
    };
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      initialized: true,
      running: this.isRunning,
      jobs: this.getJobStatus()
    };
  }
}

// Create singleton instance
const drJobScheduler = new DRJobScheduler();

export default drJobScheduler;
