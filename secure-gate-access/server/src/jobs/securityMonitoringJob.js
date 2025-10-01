/**
 * Security Monitoring Job Scheduler for Secure Gate Access Control System
 * 
 * Provides scheduled security monitoring and threat intelligence operations
 * Features:
 * - Continuous SIEM monitoring
 * - Threat intelligence feed updates
 * - Real-time alerting monitoring
 * - Automated incident response monitoring
 * - Continuous vulnerability scanning
 */

import cron from 'node-cron';
import siemIntegrationService from '../services/siemIntegrationService.js';
import threatIntelligenceService from '../services/threatIntelligenceService.js';
import realtimeAlertingService from '../services/realtimeAlertingService.js';
import automatedIncidentResponseService from '../services/automatedIncidentResponseService.js';
import continuousVulnerabilityScanningService from '../services/continuousVulnerabilityScanningService.js';
import centralizedLoggingService from '../services/centralizedLoggingService.js';
import loggingService from '../services/loggingService.js';

const scheduleSecurityMonitoringJobs = () => {
  // Schedule SIEM monitoring every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled SIEM monitoring...', { trace_id: traceId });
    
    try {
      const status = siemIntegrationService.getSIEMStatus();
      const alerts = siemIntegrationService.getAlerts();
      
      loggingService.logInfo('Scheduled SIEM monitoring completed', {
        trace_id: traceId,
        running: status.running,
        connections: Object.keys(status.connections).length,
        alerts: alerts.length
      });
    } catch (error) {
      loggingService.logError('Scheduled SIEM monitoring failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule threat intelligence feed updates every hour
  cron.schedule('0 * * * *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled threat intelligence feed updates...', { trace_id: traceId });
    
    try {
      const status = threatIntelligenceService.getThreatIntelligenceStatus();
      const blockedEntities = threatIntelligenceService.getBlockedEntities();
      
      loggingService.logInfo('Scheduled threat intelligence feed updates completed', {
        trace_id: traceId,
        running: status.running,
        threat_data: status.threat_data,
        blocked_entities: status.blocked_entities
      });
    } catch (error) {
      loggingService.logError('Scheduled threat intelligence feed updates failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule real-time alerting monitoring every 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled real-time alerting monitoring...', { trace_id: traceId });
    
    try {
      const status = realtimeAlertingService.getAlertingStatus();
      const alerts = realtimeAlertingService.getAlerts();
      const escalations = realtimeAlertingService.getEscalations();
      
      loggingService.logInfo('Scheduled real-time alerting monitoring completed', {
        trace_id: traceId,
        running: status.running,
        alerts: alerts.length,
        escalations: escalations.length,
        channel_status: status.channel_status
      });
    } catch (error) {
      loggingService.logError('Scheduled real-time alerting monitoring failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule automated incident response monitoring every 3 minutes
  cron.schedule('*/3 * * * *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled automated incident response monitoring...', { trace_id: traceId });
    
    try {
      const status = automatedIncidentResponseService.getIncidentResponseStatus();
      const incidents = automatedIncidentResponseService.getIncidents();
      const playbooks = automatedIncidentResponseService.getPlaybooks();
      const actions = automatedIncidentResponseService.getActions();
      
      loggingService.logInfo('Scheduled automated incident response monitoring completed', {
        trace_id: traceId,
        running: status.running,
        auto_response: status.auto_response,
        incidents: incidents.length,
        playbooks: playbooks.length,
        actions: actions.length
      });
    } catch (error) {
      loggingService.logError('Scheduled automated incident response monitoring failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule continuous vulnerability scanning monitoring every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled continuous vulnerability scanning monitoring...', { trace_id: traceId });
    
    try {
      const status = continuousVulnerabilityScanningService.getVulnerabilityScanningStatus();
      const scans = continuousVulnerabilityScanningService.getScans();
      const vulnerabilities = continuousVulnerabilityScanningService.getVulnerabilities();
      
      loggingService.logInfo('Scheduled continuous vulnerability scanning monitoring completed', {
        trace_id: traceId,
        running: status.running,
        scans: scans.length,
        vulnerabilities: vulnerabilities.length,
        resource_usage: status.resource_usage,
        scan_frequency: status.scan_frequency
      });
    } catch (error) {
      loggingService.logError('Scheduled continuous vulnerability scanning monitoring failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule security monitoring health check every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled security monitoring health check...', { trace_id: traceId });
    
    try {
      const siemStatus = siemIntegrationService.getSIEMStatus();
      const threatIntelStatus = threatIntelligenceService.getThreatIntelligenceStatus();
      const alertingStatus = realtimeAlertingService.getAlertingStatus();
      const incidentResponseStatus = automatedIncidentResponseService.getIncidentResponseStatus();
      const vulnerabilityScanningStatus = continuousVulnerabilityScanningService.getVulnerabilityScanningStatus();
      
      const overallHealth = {
        siem: siemStatus.running,
        threat_intelligence: threatIntelStatus.running,
        alerting: alertingStatus.running,
        incident_response: incidentResponseStatus.running,
        vulnerability_scanning: vulnerabilityScanningStatus.running,
        all_services_running: siemStatus.running && threatIntelStatus.running && 
                             alertingStatus.running && incidentResponseStatus.running && 
                             vulnerabilityScanningStatus.running
      };
      
      loggingService.logInfo('Scheduled security monitoring health check completed', {
        trace_id: traceId,
        overall_health: overallHealth
      });
      
      // Send alert if any service is not running
      if (!overallHealth.all_services_running) {
        loggingService.logError('One or more security monitoring services are not running', {
          trace_id: traceId,
          health: overallHealth
        });
      }
      
    } catch (error) {
      loggingService.logError('Scheduled security monitoring health check failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule security monitoring metrics collection every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled security monitoring metrics collection...', { trace_id: traceId });
    
    try {
      const siemStatus = siemIntegrationService.getSIEMStatus();
      const threatIntelStatus = threatIntelligenceService.getThreatIntelligenceStatus();
      const alertingStatus = realtimeAlertingService.getAlertingStatus();
      const incidentResponseStatus = automatedIncidentResponseService.getIncidentResponseStatus();
      const vulnerabilityScanningStatus = continuousVulnerabilityScanningService.getVulnerabilityScanningStatus();
      
      const metrics = {
        siem: {
          alerts: siemStatus.alerts,
          correlation_rules: siemStatus.correlation_rules,
          connections: Object.keys(siemStatus.connections).length
        },
        threat_intelligence: {
          threat_data: threatIntelStatus.threat_data,
          blocked_entities: threatIntelStatus.blocked_entities,
          false_positives: threatIntelStatus.false_positives
        },
        alerting: {
          alerts: alertingStatus.alerts,
          alert_rules: alertingStatus.alert_rules,
          escalations: alertingStatus.escalations
        },
        incident_response: {
          incidents: incidentResponseStatus.incidents,
          playbooks: incidentResponseStatus.playbooks,
          actions: incidentResponseStatus.actions,
          escalations: incidentResponseStatus.escalations
        },
        vulnerability_scanning: {
          scans: vulnerabilityScanningStatus.scans,
          vulnerabilities: vulnerabilityScanningStatus.vulnerabilities,
          misconfigurations: vulnerabilityScanningStatus.misconfigurations,
          outdated_dependencies: vulnerabilityScanningStatus.outdated_dependencies,
          open_ports: vulnerabilityScanningStatus.open_ports,
          cve_vulnerabilities: vulnerabilityScanningStatus.cve_vulnerabilities
        }
      };
      
      loggingService.logInfo('Scheduled security monitoring metrics collection completed', {
        trace_id: traceId,
        metrics
      });
      
    } catch (error) {
      loggingService.logError('Scheduled security monitoring metrics collection failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  // Schedule security monitoring cleanup every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    const traceId = centralizedLoggingService.generateTraceId();
    centralizedLoggingService.setTraceId(traceId);
    
    loggingService.logInfo('Running scheduled security monitoring cleanup...', { trace_id: traceId });
    
    try {
      const siemAlerts = siemIntegrationService.getAlerts();
      const threatIntelFeedHistory = threatIntelligenceService.getFeedUpdateHistory();
      const alertingAlerts = realtimeAlertingService.getAlerts();
      const incidentResponseIncidents = automatedIncidentResponseService.getIncidents();
      const vulnerabilityScanningScans = continuousVulnerabilityScanningService.getScans();
      
      const cleanupStats = {
        siem_alerts_cleaned: siemAlerts.filter(a => new Date(a.timestamp) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
        threat_intel_feeds_cleaned: threatIntelFeedHistory.filter(f => new Date(f.timestamp) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
        alerting_alerts_cleaned: alertingAlerts.filter(a => new Date(a.timestamp) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
        incident_response_incidents_cleaned: incidentResponseIncidents.filter(i => new Date(i.timestamp) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
        vulnerability_scanning_scans_cleaned: vulnerabilityScanningScans.filter(s => new Date(s.start_time) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length
      };
      
      loggingService.logInfo('Scheduled security monitoring cleanup completed', {
        trace_id: traceId,
        cleanup_stats: cleanupStats
      });
      
    } catch (error) {
      loggingService.logError('Scheduled security monitoring cleanup failed', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  loggingService.logInfo('Security monitoring jobs scheduled successfully', {
    jobs: [
      'SIEM monitoring (every 5 minutes)',
      'Threat intelligence feed updates (every hour)',
      'Real-time alerting monitoring (every 2 minutes)',
      'Automated incident response monitoring (every 3 minutes)',
      'Continuous vulnerability scanning monitoring (every 10 minutes)',
      'Security monitoring health check (every 15 minutes)',
      'Security monitoring metrics collection (every 30 minutes)',
      'Security monitoring cleanup (every 6 hours)'
    ]
  });
};

export { scheduleSecurityMonitoringJobs };
