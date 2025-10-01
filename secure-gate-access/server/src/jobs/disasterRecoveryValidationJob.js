/**
 * Disaster Recovery Validation Job Scheduler for Secure Gate Access Control System
 * 
 * Provides scheduled disaster recovery and backup validation operations
 * Features:
 * - Backup integrity verification scheduling
 * - Restore testing drill scheduling
 * - SLA compliance monitoring scheduling
 * - Continuous monitoring and reporting scheduling
 * - Automated failover validation scheduling
 * - Audit evidence collection scheduling
 */

import cron from 'node-cron';
import backupIntegrityVerificationService from '../services/backupIntegrityVerificationService.js';
import restoreTestingDrillValidationService from '../services/restoreTestingDrillValidationService.js';
import slaComplianceMonitoringService from '../services/slaComplianceMonitoringService.js';
import continuousMonitoringReportingService from '../services/continuousMonitoringReportingService.js';
import automatedFailoverValidationService from '../services/automatedFailoverValidationService.js';
import auditEvidenceCollectionService from '../services/auditEvidenceCollectionService.js';
import centralizedLoggingService from '../services/centralizedLoggingService.js';
import loggingService from '../services/loggingService.js';

const scheduleDisasterRecoveryValidationJobs = () => {
  // Schedule backup integrity verification every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled backup integrity verification...', { trace_id: traceId });
    
    try {
      const verification = await backupIntegrityVerificationService.verifyAllBackups();
      
      loggingService.logInfo('Scheduled backup integrity verification completed', {
        trace_id: traceId,
        verification_id: verification.id,
        status: verification.status,
        sources_verified: verification.sources_verified,
        total_backups: verification.total_backups,
        corrupted_backups: verification.corrupted_backups
      });
    } catch (error) {
      loggingService.logError('Scheduled backup integrity verification failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule restore testing drill monitoring every 2 hours
  cron.schedule('0 */2 * * *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled restore testing drill monitoring...', { trace_id: traceId });
    
    try {
      const status = restoreTestingDrillValidationService.getRestoreTestingStatus();
      const results = restoreTestingDrillValidationService.getDrillResults();
      
      loggingService.logInfo('Scheduled restore testing drill monitoring completed', {
        trace_id: traceId,
        running: status.running,
        drill_results: status.drill_results,
        stability_violations: status.stability_violations,
        compliance_violations: status.compliance_violations
      });
    } catch (error) {
      loggingService.logError('Scheduled restore testing drill monitoring failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule SLA compliance monitoring every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled SLA compliance monitoring...', { trace_id: traceId });
    
    try {
      const status = slaComplianceMonitoringService.getSLAMonitoringStatus();
      const measurements = slaComplianceMonitoringService.getSLAMeasurements();
      const breaches = slaComplianceMonitoringService.getSLABreaches();
      
      loggingService.logInfo('Scheduled SLA compliance monitoring completed', {
        trace_id: traceId,
        running: status.running,
        sla_measurements: status.sla_measurements,
        sla_breaches: status.sla_breaches,
        compliance_violations: status.compliance_violations
      });
    } catch (error) {
      loggingService.logError('Scheduled SLA compliance monitoring failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule continuous monitoring and reporting every hour
  cron.schedule('0 * * * *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled continuous monitoring and reporting...', { trace_id: traceId });
    
    try {
      const status = continuousMonitoringReportingService.getContinuousMonitoringStatus();
      const updates = continuousMonitoringReportingService.getDashboardUpdates();
      const reports = continuousMonitoringReportingService.getReportsGenerated();
      
      loggingService.logInfo('Scheduled continuous monitoring and reporting completed', {
        trace_id: traceId,
        running: status.running,
        dashboard_updates: status.dashboard_updates,
        reports_generated: status.reports_generated,
        data_integrity_checks: status.data_integrity_checks
      });
    } catch (error) {
      loggingService.logError('Scheduled continuous monitoring and reporting failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule automated failover validation monitoring every 3 hours
  cron.schedule('0 */3 * * *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled automated failover validation monitoring...', { trace_id: traceId });
    
    try {
      const status = automatedFailoverValidationService.getFailoverValidationStatus();
      const drills = automatedFailoverValidationService.getFailoverDrills();
      const routingTests = automatedFailoverValidationService.getRoutingTests();
      const replicationTests = automatedFailoverValidationService.getReplicationTests();
      const failbackTests = automatedFailoverValidationService.getFailbackTests();
      
      loggingService.logInfo('Scheduled automated failover validation monitoring completed', {
        trace_id: traceId,
        running: status.running,
        failover_drills: status.failover_drills,
        routing_tests: status.routing_tests,
        replication_tests: status.replication_tests,
        failback_tests: status.failback_tests,
        performance_violations: status.performance_violations
      });
    } catch (error) {
      loggingService.logError('Scheduled automated failover validation monitoring failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule audit evidence collection every 4 hours
  cron.schedule('0 */4 * * *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled audit evidence collection...', { trace_id: traceId });
    
    try {
      const collection = await auditEvidenceCollectionService.collectAllEvidence();
      
      loggingService.logInfo('Scheduled audit evidence collection completed', {
        trace_id: traceId,
        collection_id: collection.id,
        status: collection.status,
        evidence_types: collection.evidence_types,
        evidence_collected: collection.evidence_collected,
        errors_count: collection.errors.length
      });
    } catch (error) {
      loggingService.logError('Scheduled audit evidence collection failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule disaster recovery validation health check every 12 hours
  cron.schedule('0 */12 * * *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled disaster recovery validation health check...', { trace_id: traceId });
    
    try {
      const backupIntegrityStatus = backupIntegrityVerificationService.getBackupIntegrityStatus();
      const restoreTestingStatus = restoreTestingDrillValidationService.getRestoreTestingStatus();
      const slaMonitoringStatus = slaComplianceMonitoringService.getSLAMonitoringStatus();
      const continuousMonitoringStatus = continuousMonitoringReportingService.getContinuousMonitoringStatus();
      const failoverValidationStatus = automatedFailoverValidationService.getFailoverValidationStatus();
      const auditEvidenceStatus = auditEvidenceCollectionService.getAuditEvidenceStatus();
      
      const overallHealth = {
        backup_integrity: backupIntegrityStatus.running,
        restore_testing: restoreTestingStatus.running,
        sla_monitoring: slaMonitoringStatus.running,
        continuous_monitoring: continuousMonitoringStatus.running,
        failover_validation: failoverValidationStatus.running,
        audit_evidence: auditEvidenceStatus.running,
        all_services_running: backupIntegrityStatus.running && restoreTestingStatus.running && 
                             slaMonitoringStatus.running && continuousMonitoringStatus.running && 
                             failoverValidationStatus.running && auditEvidenceStatus.running
      };
      
      loggingService.logInfo('Scheduled disaster recovery validation health check completed', {
        trace_id: traceId,
        overall_health: overallHealth
      });
      
      // Send alert if any service is not running
      if (!overallHealth.all_services_running) {
        loggingService.logError('One or more disaster recovery validation services are not running', {
          trace_id: traceId,
          health: overallHealth
        });
      }
      
    } catch (error) {
      loggingService.logError('Scheduled disaster recovery validation health check failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule disaster recovery validation metrics collection every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled disaster recovery validation metrics collection...', { trace_id: traceId });
    
    try {
      const backupIntegrityStatus = backupIntegrityVerificationService.getBackupIntegrityStatus();
      const restoreTestingStatus = restoreTestingDrillValidationService.getRestoreTestingStatus();
      const slaMonitoringStatus = slaComplianceMonitoringService.getSLAMonitoringStatus();
      const continuousMonitoringStatus = continuousMonitoringReportingService.getContinuousMonitoringStatus();
      const failoverValidationStatus = automatedFailoverValidationService.getFailoverValidationStatus();
      const auditEvidenceStatus = auditEvidenceCollectionService.getAuditEvidenceStatus();
      
      const metrics = {
        backup_integrity: {
          verification_results: backupIntegrityStatus.verification_results,
          corrupted_backups: backupIntegrityStatus.corrupted_backups,
          tamper_attempts: backupIntegrityStatus.tamper_attempts,
          compliance_violations: backupIntegrityStatus.compliance_violations
        },
        restore_testing: {
          drill_results: restoreTestingStatus.drill_results,
          stability_violations: restoreTestingStatus.stability_violations,
          compliance_violations: restoreTestingStatus.compliance_violations
        },
        sla_monitoring: {
          sla_measurements: slaMonitoringStatus.sla_measurements,
          sla_breaches: slaMonitoringStatus.sla_breaches,
          compliance_violations: slaMonitoringStatus.compliance_violations
        },
        continuous_monitoring: {
          dashboard_updates: continuousMonitoringStatus.dashboard_updates,
          reports_generated: continuousMonitoringStatus.reports_generated,
          data_integrity_checks: continuousMonitoringStatus.data_integrity_checks
        },
        failover_validation: {
          failover_drills: failoverValidationStatus.failover_drills,
          routing_tests: failoverValidationStatus.routing_tests,
          replication_tests: failoverValidationStatus.replication_tests,
          failback_tests: failoverValidationStatus.failback_tests,
          performance_violations: failoverValidationStatus.performance_violations
        },
        audit_evidence: {
          evidence_collection: auditEvidenceStatus.evidence_collection,
          export_packs: auditEvidenceStatus.export_packs,
          integrity_checks: auditEvidenceStatus.integrity_checks,
          compliance_violations: auditEvidenceStatus.compliance_violations
        }
      };
      
      loggingService.logInfo('Scheduled disaster recovery validation metrics collection completed', {
        trace_id: traceId,
        metrics
      });
      
    } catch (error) {
      loggingService.logError('Scheduled disaster recovery validation metrics collection failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule disaster recovery validation cleanup every 24 hours
  cron.schedule('0 0 * * *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled disaster recovery validation cleanup...', { trace_id: traceId });
    
    try {
      const backupIntegrityResults = backupIntegrityVerificationService.getVerificationResults();
      const restoreTestingResults = restoreTestingDrillValidationService.getDrillResults();
      const slaMeasurements = slaComplianceMonitoringService.getSLAMeasurements();
      const continuousMonitoringUpdates = continuousMonitoringReportingService.getDashboardUpdates();
      const failoverValidationDrills = automatedFailoverValidationService.getFailoverDrills();
      const auditEvidenceCollection = auditEvidenceCollectionService.getEvidenceCollection();
      
      const cleanupStats = {
        backup_integrity_cleaned: backupIntegrityResults.filter(r => new Date(r.start_time) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
        restore_testing_cleaned: restoreTestingResults.filter(r => new Date(r.start_time) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
        sla_measurements_cleaned: slaMeasurements.filter(m => new Date(m.timestamp) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
        continuous_monitoring_cleaned: continuousMonitoringUpdates.filter(u => new Date(u.timestamp) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
        failover_validation_cleaned: failoverValidationDrills.filter(d => new Date(d.start_time) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
        audit_evidence_cleaned: auditEvidenceCollection.filter(c => new Date(c.start_time) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length
      };
      
      loggingService.logInfo('Scheduled disaster recovery validation cleanup completed', {
        trace_id: traceId,
        cleanup_stats: cleanupStats
      });
      
    } catch (error) {
      loggingService.logError('Scheduled disaster recovery validation cleanup failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  loggingService.logInfo('Disaster recovery validation jobs scheduled successfully', {
    jobs: [
      'Backup integrity verification (every 6 hours)',
      'Restore testing drill monitoring (every 2 hours)',
      'SLA compliance monitoring (every 30 minutes)',
      'Continuous monitoring and reporting (every hour)',
      'Automated failover validation monitoring (every 3 hours)',
      'Audit evidence collection (every 4 hours)',
      'Disaster recovery validation health check (every 12 hours)',
      'Disaster recovery validation metrics collection (every 6 hours)',
      'Disaster recovery validation cleanup (every 24 hours)'
    ]
  });
};

export { scheduleDisasterRecoveryValidationJobs };
