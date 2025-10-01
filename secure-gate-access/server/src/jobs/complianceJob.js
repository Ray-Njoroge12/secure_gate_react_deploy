/**
 * Compliance Job Scheduler for Secure Gate Access Control System
 * 
 * Provides scheduled compliance audits and certifications
 * Features:
 * - Monthly Kenya DPA compliance audits
 * - Quarterly ISO 27001 certification assessments
 * - Weekly OWASP Top 10 validations
 * - Monthly GDPR compliance validations
 * - Monthly final compliance report generation
 */

import cron from 'node-cron';
import kenyaDPAAuditService from '../services/kenyaDPAAuditService.js';
import iso27001CertificationService from '../services/iso27001CertificationService.js';
import owaspValidationService from '../services/owaspValidationService.js';
import gdprComplianceService from '../services/gdprComplianceService.js';
import finalComplianceReportingService from '../services/finalComplianceReportingService.js';
import centralizedLoggingService from '../services/centralizedLoggingService.js';
import loggingService from '../services/loggingService.js';

const scheduleComplianceJobs = () => {
  // Schedule monthly Kenya DPA compliance audit (1st of every month at 2 AM UTC)
  cron.schedule('0 2 1 * *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled Kenya DPA compliance audit...', { trace_id: traceId });
    
    try {
      const result = await kenyaDPAAuditService.executeComplianceAudit();
      loggingService.logInfo('Scheduled Kenya DPA compliance audit completed', {
        trace_id: traceId,
        audit_id: result.id,
        compliance_score: result.compliance_score,
        launch_ready: result.launch_ready
      });
    } catch (error) {
      loggingService.logError('Scheduled Kenya DPA compliance audit failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule quarterly ISO 27001 certification assessment (1st of every quarter at 3 AM UTC)
  cron.schedule('0 3 1 1,4,7,10 *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled ISO 27001 certification assessment...', { trace_id: traceId });
    
    try {
      const result = await iso27001CertificationService.executeCertificationReadinessAssessment();
      loggingService.logInfo('Scheduled ISO 27001 certification assessment completed', {
        trace_id: traceId,
        assessment_id: result.id,
        certification_readiness_score: result.certification_readiness_score,
        certification_ready: result.certification_ready
      });
    } catch (error) {
      loggingService.logError('Scheduled ISO 27001 certification assessment failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule weekly OWASP Top 10 validation (Every Sunday at 4 AM UTC)
  cron.schedule('0 4 * * 0', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled OWASP Top 10 validation...', { trace_id: traceId });
    
    try {
      const result = await owaspValidationService.executeOWASPValidation();
      loggingService.logInfo('Scheduled OWASP Top 10 validation completed', {
        trace_id: traceId,
        validation_id: result.id,
        validation_score: result.validation_score,
        deployment_ready: result.deployment_ready
      });
    } catch (error) {
      loggingService.logError('Scheduled OWASP Top 10 validation failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule monthly GDPR compliance validation (15th of every month at 5 AM UTC)
  cron.schedule('0 5 15 * *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled GDPR compliance validation...', { trace_id: traceId });
    
    try {
      const result = await gdprComplianceService.executeGDPRComplianceValidation();
      loggingService.logInfo('Scheduled GDPR compliance validation completed', {
        trace_id: traceId,
        validation_id: result.id,
        compliance_score: result.compliance_score,
        launch_ready: result.launch_ready
      });
    } catch (error) {
      loggingService.logError('Scheduled GDPR compliance validation failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule monthly final compliance report generation (Last day of every month at 6 AM UTC)
  cron.schedule('0 6 L * *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled final compliance report generation...', { trace_id: traceId });
    
    try {
      const result = await finalComplianceReportingService.generateFinalComplianceReport();
      loggingService.logInfo('Scheduled final compliance report generation completed', {
        trace_id: traceId,
        report_id: result.id,
        status: result.status,
        sections: Object.keys(result.sections || {}).length
      });
    } catch (error) {
      loggingService.logError('Scheduled final compliance report generation failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule daily compliance status check (Every day at 7 AM UTC)
  cron.schedule('0 7 * * *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled compliance status check...', { trace_id: traceId });
    
    try {
      const kenyaDPAStatus = kenyaDPAAuditService.getStatus();
      const iso27001Status = iso27001CertificationService.getStatus();
      const owaspStatus = owaspValidationService.getStatus();
      const gdprStatus = gdprComplianceService.getStatus();
      const reportingStatus = finalComplianceReportingService.getStatus();
      
      const overallStatus = {
        kenya_dpa: kenyaDPAStatus.running,
        iso27001: iso27001Status.running,
        owasp: owaspStatus.running,
        gdpr: gdprStatus.running,
        reporting: reportingStatus.running,
        all_services_running: kenyaDPAStatus.running && iso27001Status.running && owaspStatus.running && gdprStatus.running && reportingStatus.running
      };
      
      loggingService.logInfo('Scheduled compliance status check completed', {
        trace_id: traceId,
        overall_status: overallStatus
      });
      
      // Send alert if any service is not running
      if (!overallStatus.all_services_running) {
        loggingService.logError('One or more compliance services are not running', {
          trace_id: traceId,
          status: overallStatus
        });
      }
      
    } catch (error) {
      loggingService.logError('Scheduled compliance status check failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule weekly compliance metrics collection (Every Monday at 8 AM UTC)
  cron.schedule('0 8 * * 1', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled compliance metrics collection...', { trace_id: traceId });
    
    try {
      const kenyaDPAResults = kenyaDPAAuditService.getAuditResults();
      const iso27001Results = iso27001CertificationService.getCertificationResults();
      const owaspResults = owaspValidationService.getValidationResults();
      const gdprResults = gdprComplianceService.getComplianceResults();
      const reportingResults = finalComplianceReportingService.getReports();
      
      const metrics = {
        kenya_dpa: {
          total_audits: kenyaDPAResults.length,
          latest_compliance_score: kenyaDPAResults.length > 0 ? kenyaDPAResults[kenyaDPAResults.length - 1].compliance_score : 0,
          latest_launch_ready: kenyaDPAResults.length > 0 ? kenyaDPAResults[kenyaDPAResults.length - 1].launch_ready : false
        },
        iso27001: {
          total_assessments: iso27001Results.length,
          latest_certification_score: iso27001Results.length > 0 ? iso27001Results[iso27001Results.length - 1].certification_readiness_score : 0,
          latest_certification_ready: iso27001Results.length > 0 ? iso27001Results[iso27001Results.length - 1].certification_ready : false
        },
        owasp: {
          total_validations: owaspResults.length,
          latest_validation_score: owaspResults.length > 0 ? owaspResults[owaspResults.length - 1].validation_score : 0,
          latest_deployment_ready: owaspResults.length > 0 ? owaspResults[owaspResults.length - 1].deployment_ready : false
        },
        gdpr: {
          total_validations: gdprResults.length,
          latest_compliance_score: gdprResults.length > 0 ? gdprResults[gdprResults.length - 1].compliance_score : 0,
          latest_launch_ready: gdprResults.length > 0 ? gdprResults[gdprResults.length - 1].launch_ready : false
        },
        reporting: {
          total_reports: reportingResults.length,
          latest_report_status: reportingResults.length > 0 ? reportingResults[reportingResults.length - 1].status : 'none'
        }
      };
      
      loggingService.logInfo('Scheduled compliance metrics collection completed', {
        trace_id: traceId,
        metrics
      });
      
    } catch (error) {
      loggingService.logError('Scheduled compliance metrics collection failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule monthly compliance cleanup (1st of every month at 9 AM UTC)
  cron.schedule('0 9 1 * *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled compliance cleanup...', { trace_id: traceId });
    
    try {
      // Clean up old audit results (keep last 12 months)
      const kenyaDPAResults = kenyaDPAAuditService.getAuditResults();
      const iso27001Results = iso27001CertificationService.getCertificationResults();
      const owaspResults = owaspValidationService.getValidationResults();
      const gdprResults = gdprComplianceService.getComplianceResults();
      const reportingResults = finalComplianceReportingService.getReports();
      
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 12);
      
      const cleanupStats = {
        kenya_dpa_audits_cleaned: kenyaDPAResults.filter(r => new Date(r.startTime) < cutoffDate).length,
        iso27001_assessments_cleaned: iso27001Results.filter(r => new Date(r.startTime) < cutoffDate).length,
        owasp_validations_cleaned: owaspResults.filter(r => new Date(r.startTime) < cutoffDate).length,
        gdpr_validations_cleaned: gdprResults.filter(r => new Date(r.startTime) < cutoffDate).length,
        reports_cleaned: reportingResults.filter(r => new Date(r.startTime) < cutoffDate).length
      };
      
      loggingService.logInfo('Scheduled compliance cleanup completed', {
        trace_id: traceId,
        cleanup_stats: cleanupStats
      });
      
    } catch (error) {
      loggingService.logError('Scheduled compliance cleanup failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  loggingService.logInfo('Compliance jobs scheduled successfully', {
    jobs: [
      'Monthly Kenya DPA compliance audit (1st of month, 2 AM UTC)',
      'Quarterly ISO 27001 certification assessment (1st of quarter, 3 AM UTC)',
      'Weekly OWASP Top 10 validation (Sundays, 4 AM UTC)',
      'Monthly GDPR compliance validation (15th of month, 5 AM UTC)',
      'Monthly final compliance report generation (Last day of month, 6 AM UTC)',
      'Daily compliance status check (Every day, 7 AM UTC)',
      'Weekly compliance metrics collection (Mondays, 8 AM UTC)',
      'Monthly compliance cleanup (1st of month, 9 AM UTC)'
    ]
  });
};

export { scheduleComplianceJobs };