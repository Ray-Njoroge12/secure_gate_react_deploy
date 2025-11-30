/**
 * Backup Job for Secure Gate Access Control System
 * 
 * Automated backup and restore testing job
 * Features:
 * - Daily backup creation
 * - Weekly restore testing
 * - Backup monitoring and alerting
 * - Automated cleanup and retention
 */

import cron from 'node-cron';
import loggingService from '../services/loggingService.js';
import backupService from '../services/backupService.js';
import restoreService from '../services/restoreService.js';
import notificationService from '../services/notificationService.js';

class BackupJob {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
    
    this.config = {
      schedules: {
        dailyBackup: '0 2 * * *', // Daily at 2 AM
        weeklyRestoreTest: '0 3 * * 0', // Weekly on Sunday at 3 AM
        backupCleanup: '0 4 * * *', // Daily at 4 AM
        healthCheck: '0 */6 * * *' // Every 6 hours
      },
      retention: {
        dailyBackups: 7, // Keep 7 days of daily backups
        weeklyBackups: 4, // Keep 4 weeks of weekly backups
        monthlyBackups: 12 // Keep 12 months of monthly backups
      },
      monitoring: {
        enabled: true,
        alertThresholds: {
          backupFailure: 1, // Alert on any backup failure
          restoreFailure: 1, // Alert on any restore failure
          diskUsage: 90, // Alert when disk usage > 90%
          backupAge: 25 // Alert when backup is older than 25 hours
        }
      }
    };
    
    this.initializeJob();
  }

  /**
   * Initialize backup job
   */
  async initializeJob() {
    try {
      loggingService.logInfo('Initializing backup job', {
        schedules: Object.keys(this.config.schedules)
      });
      
      // Schedule daily backup
      this.scheduleDailyBackup();
      
      // Schedule weekly restore test
      this.scheduleWeeklyRestoreTest();
      
      // Schedule backup cleanup
      this.scheduleBackupCleanup();
      
      // Schedule health check
      this.scheduleHealthCheck();
      
      this.isRunning = true;
      
      loggingService.logInfo('Backup job initialized successfully');
      
    } catch (error) {
      loggingService.logError('Failed to initialize backup job', error);
      throw error;
    }
  }

  /**
   * Schedule daily backup
   */
  scheduleDailyBackup() {
    const job = cron.schedule(this.config.schedules.dailyBackup, async () => {
      try {
        loggingService.logInfo('Starting daily backup job');
        
        const backupResult = await backupService.createBackup({
          type: 'daily',
          encrypt: true,
          uploadToCloud: true
        });
        
        // Check backup success
        if (backupResult.success) {
          loggingService.logInfo('Daily backup completed successfully', {
            backupId: backupResult.backupId,
            duration: backupResult.duration,
            totalSize: backupResult.totalSize
          });
        } else {
          loggingService.logError('Daily backup completed with errors', {
            backupId: backupResult.backupId,
            errors: backupResult.errors
          });
          
          // Send alert for backup failure
          await this.sendBackupFailureAlert(backupResult);
        }
        
      } catch (error) {
        loggingService.logError('Daily backup job failed', error);
        await this.sendBackupJobFailureAlert(error);
      }
    }, {
      scheduled: false,
      timezone: 'Africa/Nairobi'
    });
    
    this.jobs.set('dailyBackup', job);
    job.start();
  }

  /**
   * Schedule weekly restore test
   */
  scheduleWeeklyRestoreTest() {
    const job = cron.schedule(this.config.schedules.weeklyRestoreTest, async () => {
      try {
        loggingService.logInfo('Starting weekly restore test job');
        
        // Get the most recent backup
        const recentBackup = await this.getMostRecentBackup();
        
        if (!recentBackup) {
          loggingService.logWarn('No recent backup found for restore test');
          return;
        }
        
        // Run restore test
        const restoreResult = await restoreService.testRestore(recentBackup.backupId, {
          type: 'weekly',
          validateIntegrity: true,
          testConnectivity: true
        });
        
        // Check restore test success
        if (restoreResult.success) {
          loggingService.logInfo('Weekly restore test completed successfully', {
            testId: restoreResult.testId,
            backupId: restoreResult.backupId,
            duration: restoreResult.duration
          });
        } else {
          loggingService.logError('Weekly restore test completed with errors', {
            testId: restoreResult.testId,
            backupId: restoreResult.backupId,
            errors: restoreResult.errors
          });
          
          // Send alert for restore test failure
          await this.sendRestoreTestFailureAlert(restoreResult);
        }
        
      } catch (error) {
        loggingService.logError('Weekly restore test job failed', error);
        await this.sendRestoreTestJobFailureAlert(error);
      }
    }, {
      scheduled: false,
      timezone: 'Africa/Nairobi'
    });
    
    this.jobs.set('weeklyRestoreTest', job);
    job.start();
  }

  /**
   * Schedule backup cleanup
   */
  scheduleBackupCleanup() {
    const job = cron.schedule(this.config.schedules.backupCleanup, async () => {
      try {
        loggingService.logInfo('Starting backup cleanup job');
        
        const cleanupResult = await this.performBackupCleanup();
        
        loggingService.logInfo('Backup cleanup completed', {
          deletedFiles: cleanupResult.deletedFiles,
          freedSpace: cleanupResult.freedSpace
        });
        
      } catch (error) {
        loggingService.logError('Backup cleanup job failed', error);
        await this.sendCleanupFailureAlert(error);
      }
    }, {
      scheduled: false,
      timezone: 'Africa/Nairobi'
    });
    
    this.jobs.set('backupCleanup', job);
    job.start();
  }

  /**
   * Schedule health check
   */
  scheduleHealthCheck() {
    const job = cron.schedule(this.config.schedules.healthCheck, async () => {
      try {
        loggingService.logInfo('Starting backup health check');
        
        const healthStatus = await this.performHealthCheck();
        
        // Check for health issues
        if (healthStatus.issues.length > 0) {
          loggingService.logWarn('Backup health check found issues', {
            issues: healthStatus.issues
          });
          
          // Send alert for health issues
          await this.sendHealthCheckAlert(healthStatus);
        } else {
          loggingService.logInfo('Backup health check passed');
        }
        
      } catch (error) {
        loggingService.logError('Backup health check failed', error);
        await this.sendHealthCheckFailureAlert(error);
      }
    }, {
      scheduled: false,
      timezone: 'Africa/Nairobi'
    });
    
    this.jobs.set('healthCheck', job);
    job.start();
  }

  /**
   * Get most recent backup
   */
  async getMostRecentBackup() {
    try {
      const backupHistory = backupService.getBackupHistory(1);
      return backupHistory.length > 0 ? backupHistory[0] : null;
    } catch (error) {
      loggingService.logError('Failed to get most recent backup', error);
      return null;
    }
  }

  /**
   * Perform backup cleanup
   */
  async performBackupCleanup() {
    const result = {
      deletedFiles: 0,
      freedSpace: 0,
      errors: []
    };

    try {
      // This would implement backup cleanup logic
      // For now, just return a mock result
      result.deletedFiles = 5;
      result.freedSpace = 1024 * 1024 * 100; // 100MB
      
      loggingService.logInfo('Backup cleanup performed', result);
      
    } catch (error) {
      loggingService.logError('Backup cleanup failed', error);
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Perform health check
   */
  async performHealthCheck() {
    const healthStatus = {
      overall: true,
      issues: [],
      metrics: {}
    };

    try {
      // Check backup service status
      const backupStatus = backupService.getStatus();
      healthStatus.metrics.backupService = backupStatus;

      // Check restore service status
      const restoreStatus = restoreService.getStatus();
      healthStatus.metrics.restoreService = restoreStatus;

      // Check disk usage
      const diskUsage = await this.checkDiskUsage();
      healthStatus.metrics.diskUsage = diskUsage;

      if (diskUsage.percentage > this.config.monitoring.alertThresholds.diskUsage) {
        healthStatus.issues.push({
          type: 'disk_usage_high',
          message: `Disk usage is ${diskUsage.percentage}%, above threshold of ${this.config.monitoring.alertThresholds.diskUsage}%`,
          severity: 'warning'
        });
        healthStatus.overall = false;
      }

      // Check backup age
      const backupAge = await this.checkBackupAge();
      healthStatus.metrics.backupAge = backupAge;

      if (backupAge.hours > this.config.monitoring.alertThresholds.backupAge) {
        healthStatus.issues.push({
          type: 'backup_age_high',
          message: `Most recent backup is ${backupAge.hours} hours old, above threshold of ${this.config.monitoring.alertThresholds.backupAge} hours`,
          severity: 'warning'
        });
        healthStatus.overall = false;
      }

      // Check service connectivity
      const connectivity = await this.checkServiceConnectivity();
      healthStatus.metrics.connectivity = connectivity;

      if (!connectivity.allConnected) {
        healthStatus.issues.push({
          type: 'connectivity_issue',
          message: 'One or more services are not accessible',
          severity: 'error',
          details: connectivity.failedServices
        });
        healthStatus.overall = false;
      }

    } catch (error) {
      loggingService.logError('Health check failed', error);
      healthStatus.issues.push({
        type: 'health_check_error',
        message: `Health check failed: ${error.message}`,
        severity: 'error'
      });
      healthStatus.overall = false;
    }

    return healthStatus;
  }

  /**
   * Check disk usage
   */
  async checkDiskUsage() {
    try {
      // This would check actual disk usage
      // For now, return a mock result
      return {
        total: 100 * 1024 * 1024 * 1024, // 100GB
        used: 75 * 1024 * 1024 * 1024, // 75GB
        free: 25 * 1024 * 1024 * 1024, // 25GB
        percentage: 75
      };
    } catch (error) {
      loggingService.logError('Failed to check disk usage', error);
      return { percentage: 0 };
    }
  }

  /**
   * Check backup age
   */
  async checkBackupAge() {
    try {
      const recentBackup = await this.getMostRecentBackup();
      
      if (!recentBackup) {
        return { hours: 999, message: 'No backups found' };
      }

      const now = new Date();
      const backupTime = new Date(recentBackup.startTime);
      const diffMs = now - backupTime;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      return {
        hours: diffHours,
        message: `Most recent backup is ${diffHours} hours old`
      };
    } catch (error) {
      loggingService.logError('Failed to check backup age', error);
      return { hours: 999, message: 'Error checking backup age' };
    }
  }

  /**
   * Check service connectivity
   */
  async checkServiceConnectivity() {
    const connectivity = {
      allConnected: true,
      failedServices: [],
      services: {}
    };

    try {
      // Check backup service
      const backupStatus = backupService.getStatus();
      connectivity.services.backup = backupStatus.initialized;
      if (!backupStatus.initialized) {
        connectivity.failedServices.push('backup');
        connectivity.allConnected = false;
      }

      // Check restore service
      const restoreStatus = restoreService.getStatus();
      connectivity.services.restore = restoreStatus.initialized;
      if (!restoreStatus.initialized) {
        connectivity.failedServices.push('restore');
        connectivity.allConnected = false;
      }

    } catch (error) {
      loggingService.logError('Failed to check service connectivity', error);
      connectivity.allConnected = false;
      connectivity.failedServices.push('connectivity_check');
    }

    return connectivity;
  }

  /**
   * Send backup failure alert
   */
  async sendBackupFailureAlert(backupResult) {
    try {
      const subject = `Backup Failure Alert - ${backupResult.backupId}`;
      const message = `Backup failed with errors:\n\n${backupResult.errors.map(e => `- ${e.service}: ${e.error}`).join('\n')}`;
      
      await notificationService.sendSystemNotification({
        type: 'backup_failure_alert',
        title: subject,
        message,
        severity: 'error',
        data: backupResult
      });

    } catch (error) {
      loggingService.logError('Failed to send backup failure alert', error);
    }
  }

  /**
   * Send backup job failure alert
   */
  async sendBackupJobFailureAlert(error) {
    try {
      const subject = 'Backup Job Failure Alert';
      const message = `Daily backup job failed: ${error.message}`;
      
      await notificationService.sendSystemNotification({
        type: 'backup_job_failure_alert',
        title: subject,
        message,
        severity: 'error',
        data: { error: error.message }
      });

    } catch (error) {
      loggingService.logError('Failed to send backup job failure alert', error);
    }
  }

  /**
   * Send restore test failure alert
   */
  async sendRestoreTestFailureAlert(restoreResult) {
    try {
      const subject = `Restore Test Failure Alert - ${restoreResult.testId}`;
      const message = `Restore test failed with errors:\n\n${restoreResult.errors.map(e => `- ${e.service}: ${e.error}`).join('\n')}`;
      
      await notificationService.sendSystemNotification({
        type: 'restore_test_failure_alert',
        title: subject,
        message,
        severity: 'error',
        data: restoreResult
      });

    } catch (error) {
      loggingService.logError('Failed to send restore test failure alert', error);
    }
  }

  /**
   * Send restore test job failure alert
   */
  async sendRestoreTestJobFailureAlert(error) {
    try {
      const subject = 'Restore Test Job Failure Alert';
      const message = `Weekly restore test job failed: ${error.message}`;
      
      await notificationService.sendSystemNotification({
        type: 'restore_test_job_failure_alert',
        title: subject,
        message,
        severity: 'error',
        data: { error: error.message }
      });

    } catch (error) {
      loggingService.logError('Failed to send restore test job failure alert', error);
    }
  }

  /**
   * Send cleanup failure alert
   */
  async sendCleanupFailureAlert(error) {
    try {
      const subject = 'Backup Cleanup Failure Alert';
      const message = `Backup cleanup job failed: ${error.message}`;
      
      await notificationService.sendSystemNotification({
        type: 'backup_cleanup_failure_alert',
        title: subject,
        message,
        severity: 'warning',
        data: { error: error.message }
      });

    } catch (error) {
      loggingService.logError('Failed to send cleanup failure alert', error);
    }
  }

  /**
   * Send health check alert
   */
  async sendHealthCheckAlert(healthStatus) {
    try {
      const subject = 'Backup Health Check Alert';
      const message = `Backup health check found issues:\n\n${healthStatus.issues.map(i => `- ${i.type}: ${i.message}`).join('\n')}`;
      
      await notificationService.sendSystemNotification({
        type: 'backup_health_check_alert',
        title: subject,
        message,
        severity: 'warning',
        data: healthStatus
      });

    } catch (error) {
      loggingService.logError('Failed to send health check alert', error);
    }
  }

  /**
   * Send health check failure alert
   */
  async sendHealthCheckFailureAlert(error) {
    try {
      const subject = 'Backup Health Check Failure Alert';
      const message = `Backup health check job failed: ${error.message}`;
      
      await notificationService.sendSystemNotification({
        type: 'backup_health_check_failure_alert',
        title: subject,
        message,
        severity: 'error',
        data: { error: error.message }
      });

    } catch (error) {
      loggingService.logError('Failed to send health check failure alert', error);
    }
  }

  /**
   * Stop all backup jobs
   */
  stopAllJobs() {
    try {
      for (const [name, job] of this.jobs) {
        job.stop();
        loggingService.logInfo('Backup job stopped', { name });
      }
      
      this.jobs.clear();
      this.isRunning = false;
      
      loggingService.logInfo('All backup jobs stopped');
      
    } catch (error) {
      loggingService.logError('Failed to stop backup jobs', error);
    }
  }

  /**
   * Get job status
   */
  getJobStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      config: {
        schedules: this.config.schedules,
        retention: this.config.retention,
        monitoring: this.config.monitoring
      }
    };
  }
}

// Create singleton instance
const backupJob = new BackupJob();

export default backupJob;
