/**
 * Rollback Job for Secure Gate Access Control System
 * 
 * Provides scheduled jobs for rollback operations and maintenance
 */

import cron from 'node-cron';
import rollbackService from '../services/rollbackService.js';
import centralizedLoggingService from '../services/centralizedLoggingService.js';
import auditTraceabilityService from '../services/auditTraceabilityService.js';
import rollbackAlertingService from '../services/rollbackAlertingService.js';
import loggingService from '../utils/loggingService.js';

const scheduleRollbackJobs = () => {
  // Schedule snapshot cleanup (daily at 2 AM)
  cron.schedule('0 2 * * *', async () => {
    try {
      loggingService.logInfo('Running snapshot cleanup job...');
      
      // Clean up old snapshots
      const snapshots = rollbackService.snapshots;
      const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
      
      let cleanedCount = 0;
      for (const [id, snapshot] of snapshots.entries()) {
        if (new Date(snapshot.timestamp).getTime() < cutoffTime) {
          snapshots.delete(id);
          cleanedCount++;
        }
      }
      
      loggingService.logInfo(`Snapshot cleanup completed. Cleaned ${cleanedCount} snapshots.`);
      
      // Log audit event
      await auditTraceabilityService.logAuditEvent({
        actor: 'system',
        action: 'snapshot_cleanup',
        status: 'success',
        metadata: {
          cleaned_count: cleanedCount,
          remaining_snapshots: snapshots.size
        }
      });
      
    } catch (error) {
      loggingService.logError('Snapshot cleanup job failed', error);
      
      // Send alert
      await rollbackAlertingService.sendSystemFailureAlert({
        system_component: 'snapshot_cleanup',
        failure_reason: error.message,
        impact_assessment: 'Old snapshots may accumulate',
        recovery_actions: 'Manual cleanup required'
      });
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule rollback history cleanup (weekly on Sunday at 3 AM)
  cron.schedule('0 3 * * 0', async () => {
    try {
      loggingService.logInfo('Running rollback history cleanup job...');
      
      // Clean up old rollback history
      const history = rollbackService.getRollbackHistory();
      const cutoffTime = Date.now() - (90 * 24 * 60 * 60 * 1000); // 90 days
      
      const cleanedHistory = history.filter(rollback => 
        new Date(rollback.startedAt).getTime() > cutoffTime
      );
      
      // Update history (in a real implementation, this would be persisted)
      rollbackService.rollbackHistory = cleanedHistory;
      
      const cleanedCount = history.length - cleanedHistory.length;
      
      loggingService.logInfo(`Rollback history cleanup completed. Cleaned ${cleanedCount} entries.`);
      
      // Log audit event
      await auditTraceabilityService.logAuditEvent({
        actor: 'system',
        action: 'rollback_history_cleanup',
        status: 'success',
        metadata: {
          cleaned_count: cleanedCount,
          remaining_entries: cleanedHistory.length
        }
      });
      
    } catch (error) {
      loggingService.logError('Rollback history cleanup job failed', error);
      
      // Send alert
      await rollbackAlertingService.sendSystemFailureAlert({
        system_component: 'rollback_history_cleanup',
        failure_reason: error.message,
        impact_assessment: 'Rollback history may grow large',
        recovery_actions: 'Manual cleanup required'
      });
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule audit trail maintenance (daily at 4 AM)
  cron.schedule('0 4 * * *', async () => {
    try {
      loggingService.logInfo('Running audit trail maintenance job...');
      
      // Run audit trail maintenance
      await auditTraceabilityService.maintainAuditTrail();
      
      loggingService.logInfo('Audit trail maintenance completed.');
      
    } catch (error) {
      loggingService.logError('Audit trail maintenance job failed', error);
      
      // Send alert
      await rollbackAlertingService.sendSystemFailureAlert({
        system_component: 'audit_trail_maintenance',
        failure_reason: error.message,
        impact_assessment: 'Audit trail may grow large',
        recovery_actions: 'Manual maintenance required'
      });
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule compliance report generation (monthly on 1st at 5 AM)
  cron.schedule('0 5 1 * *', async () => {
    try {
      loggingService.logInfo('Running compliance report generation job...');
      
      // Generate compliance reports
      await auditTraceabilityService.generateComplianceReports();
      
      loggingService.logInfo('Compliance report generation completed.');
      
    } catch (error) {
      loggingService.logError('Compliance report generation job failed', error);
      
      // Send alert
      await rollbackAlertingService.sendComplianceViolationAlert({
        violation_type: 'report_generation_failure',
        compliance_framework: 'all',
        affected_data: 'compliance_reports',
        remediation_steps: 'Manual report generation required'
      });
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule trace cleanup (daily at 6 AM)
  cron.schedule('0 6 * * *', async () => {
    try {
      loggingService.logInfo('Running trace cleanup job...');
      
      // Clean up old traces
      await centralizedLoggingService.cleanupOldTraces();
      
      loggingService.logInfo('Trace cleanup completed.');
      
    } catch (error) {
      loggingService.logError('Trace cleanup job failed', error);
      
      // Send alert
      await rollbackAlertingService.sendSystemFailureAlert({
        system_component: 'trace_cleanup',
        failure_reason: error.message,
        impact_assessment: 'Trace data may accumulate',
        recovery_actions: 'Manual cleanup required'
      });
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule rollback health check (every 5 minutes)
  cron.schedule('*/5 * * * *', async () => {
    try {
      // Check rollback service health
      const status = rollbackService.getStatus();
      
      if (!status.initialized) {
        throw new Error('Rollback service not initialized');
      }
      
      // Check for stuck rollbacks
      const activeRollbacks = rollbackService.getActiveRollbacks();
      const now = Date.now();
      const timeout = 30 * 60 * 1000; // 30 minutes
      
      for (const rollback of activeRollbacks) {
        const startTime = new Date(rollback.startedAt).getTime();
        if (now - startTime > timeout) {
          // Rollback is stuck
          await rollbackAlertingService.sendSystemFailureAlert({
            system_component: 'rollback_service',
            failure_reason: `Rollback ${rollback.id} is stuck`,
            impact_assessment: 'Rollback operations may be delayed',
            recovery_actions: 'Manual intervention required'
          });
        }
      }
      
    } catch (error) {
      loggingService.logError('Rollback health check failed', error);
      
      // Send alert
      await rollbackAlertingService.sendSystemFailureAlert({
        system_component: 'rollback_health_check',
        failure_reason: error.message,
        impact_assessment: 'Rollback service health unknown',
        recovery_actions: 'Manual health check required'
      });
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule alert cleanup (daily at 7 AM)
  cron.schedule('0 7 * * *', async () => {
    try {
      loggingService.logInfo('Running alert cleanup job...');
      
      // Clean up old alerts
      await rollbackAlertingService.cleanupAlertHistory();
      
      loggingService.logInfo('Alert cleanup completed.');
      
    } catch (error) {
      loggingService.logError('Alert cleanup job failed', error);
      
      // Send alert
      await rollbackAlertingService.sendSystemFailureAlert({
        system_component: 'alert_cleanup',
        failure_reason: error.message,
        impact_assessment: 'Alert history may grow large',
        recovery_actions: 'Manual cleanup required'
      });
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  loggingService.logInfo('Rollback jobs scheduled successfully');
};

export { scheduleRollbackJobs };
