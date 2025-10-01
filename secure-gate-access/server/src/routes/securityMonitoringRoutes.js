/**
 * Security Monitoring Routes for Secure Gate Access Control System
 * 
 * Provides API endpoints for continuous security monitoring and threat intelligence
 * Features:
 * - SIEM integration endpoints
 * - Threat intelligence feed endpoints
 * - Real-time alerting endpoints
 * - Automated incident response endpoints
 * - Continuous vulnerability scanning endpoints
 */

import express from 'express';
import siemIntegrationService from '../services/siemIntegrationService.js';
import threatIntelligenceService from '../services/threatIntelligenceService.js';
import realtimeAlertingService from '../services/realtimeAlertingService.js';
import automatedIncidentResponseService from '../services/automatedIncidentResponseService.js';
import continuousVulnerabilityScanningService from '../services/continuousVulnerabilityScanningService.js';
import centralizedLoggingService from '../services/centralizedLoggingService.js';
import loggingService from '../services/loggingService.js';

const router = express.Router();

// Middleware to apply centralized logging
router.use((req, res, next) => {
  const traceId = centralizedLoggingService.generateTraceId();
  centralizedLoggingService.setTraceId(traceId);
  req.traceId = traceId;
  next();
});

/**
 * @route POST /api/security-monitoring/siem/send-log
 * @description Send log to SIEM
 * @access Admin
 */
router.post('/siem/send-log', async (req, res) => {
  try {
    const { logData, provider } = req.body;
    
    if (!logData) {
      return res.status(400).json({
        message: 'Log data is required',
        trace_id: req.traceId
      });
    }
    
    loggingService.logInfo('API: SIEM log send requested', { trace_id: req.traceId });
    
    await siemIntegrationService.sendLogToSIEM(logData, provider);
    
    res.status(200).json({
      message: 'Log sent to SIEM successfully',
      provider: provider || 'default',
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to send log to SIEM', error);
    res.status(500).json({
      message: 'Failed to send log to SIEM',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route GET /api/security-monitoring/siem/status
 * @description Get SIEM integration status
 * @access Admin
 */
router.get('/siem/status', async (req, res) => {
  try {
    const status = siemIntegrationService.getSIEMStatus();
    
    res.status(200).json({
      message: 'SIEM status retrieved',
      data: status,
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to get SIEM status', error);
    res.status(500).json({
      message: 'Failed to get SIEM status',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route GET /api/security-monitoring/siem/alerts
 * @description Get SIEM alerts
 * @access Admin
 */
router.get('/siem/alerts', async (req, res) => {
  try {
    const alerts = siemIntegrationService.getAlerts();
    
    res.status(200).json({
      message: 'SIEM alerts retrieved',
      data: {
        alerts,
        total: alerts.length
      },
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to get SIEM alerts', error);
    res.status(500).json({
      message: 'Failed to get SIEM alerts',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route POST /api/security-monitoring/threat-intelligence/check-entity
 * @description Check if entity is malicious
 * @access Admin
 */
router.post('/threat-intelligence/check-entity', async (req, res) => {
  try {
    const { entity, entityType } = req.body;
    
    if (!entity || !entityType) {
      return res.status(400).json({
        message: 'Entity and entityType are required',
        trace_id: req.traceId
      });
    }
    
    loggingService.logInfo('API: Threat intelligence check requested', { 
      entity, 
      entityType, 
      trace_id: req.traceId 
    });
    
    const result = await threatIntelligenceService.checkEntity(entity, entityType);
    
    res.status(200).json({
      message: 'Entity threat check completed',
      data: result,
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to check entity threat', error);
    res.status(500).json({
      message: 'Failed to check entity threat',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route GET /api/security-monitoring/threat-intelligence/status
 * @description Get threat intelligence status
 * @access Admin
 */
router.get('/threat-intelligence/status', async (req, res) => {
  try {
    const status = threatIntelligenceService.getThreatIntelligenceStatus();
    
    res.status(200).json({
      message: 'Threat intelligence status retrieved',
      data: status,
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to get threat intelligence status', error);
    res.status(500).json({
      message: 'Failed to get threat intelligence status',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route GET /api/security-monitoring/threat-intelligence/blocked-entities
 * @description Get blocked entities
 * @access Admin
 */
router.get('/threat-intelligence/blocked-entities', async (req, res) => {
  try {
    const blockedEntities = threatIntelligenceService.getBlockedEntities();
    
    res.status(200).json({
      message: 'Blocked entities retrieved',
      data: blockedEntities,
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to get blocked entities', error);
    res.status(500).json({
      message: 'Failed to get blocked entities',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route POST /api/security-monitoring/alerts/send
 * @description Send real-time alert
 * @access Admin
 */
router.post('/alerts/send', async (req, res) => {
  try {
    const { alertData } = req.body;
    
    if (!alertData) {
      return res.status(400).json({
        message: 'Alert data is required',
        trace_id: req.traceId
      });
    }
    
    loggingService.logInfo('API: Real-time alert send requested', { trace_id: req.traceId });
    
    const alert = await realtimeAlertingService.sendAlert(alertData);
    
    res.status(200).json({
      message: 'Alert sent successfully',
      data: {
        alert_id: alert.id,
        status: alert.status,
        channels_sent: alert.channels_sent,
        channels_failed: alert.channels_failed
      },
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to send alert', error);
    res.status(500).json({
      message: 'Failed to send alert',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route GET /api/security-monitoring/alerts/status
 * @description Get alerting status
 * @access Admin
 */
router.get('/alerts/status', async (req, res) => {
  try {
    const status = realtimeAlertingService.getAlertingStatus();
    
    res.status(200).json({
      message: 'Alerting status retrieved',
      data: status,
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to get alerting status', error);
    res.status(500).json({
      message: 'Failed to get alerting status',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route GET /api/security-monitoring/alerts
 * @description Get all alerts
 * @access Admin
 */
router.get('/alerts', async (req, res) => {
  try {
    const alerts = realtimeAlertingService.getAlerts();
    
    res.status(200).json({
      message: 'Alerts retrieved',
      data: {
        alerts,
        total: alerts.length
      },
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to get alerts', error);
    res.status(500).json({
      message: 'Failed to get alerts',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route POST /api/security-monitoring/incident-response/process-incident
 * @description Process incident with automated response
 * @access Admin
 */
router.post('/incident-response/process-incident', async (req, res) => {
  try {
    const { incidentData } = req.body;
    
    if (!incidentData) {
      return res.status(400).json({
        message: 'Incident data is required',
        trace_id: req.traceId
      });
    }
    
    loggingService.logInfo('API: Incident processing requested', { trace_id: req.traceId });
    
    const incident = await automatedIncidentResponseService.processIncident(incidentData);
    
    res.status(200).json({
      message: 'Incident processed successfully',
      data: {
        incident_id: incident.id,
        status: incident.status,
        playbook_id: incident.playbook_id,
        actions_executed: incident.actions_executed.length,
        actions_failed: incident.actions_failed.length
      },
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to process incident', error);
    res.status(500).json({
      message: 'Failed to process incident',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route GET /api/security-monitoring/incident-response/status
 * @description Get incident response status
 * @access Admin
 */
router.get('/incident-response/status', async (req, res) => {
  try {
    const status = automatedIncidentResponseService.getIncidentResponseStatus();
    
    res.status(200).json({
      message: 'Incident response status retrieved',
      data: status,
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to get incident response status', error);
    res.status(500).json({
      message: 'Failed to get incident response status',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route GET /api/security-monitoring/incident-response/incidents
 * @description Get all incidents
 * @access Admin
 */
router.get('/incident-response/incidents', async (req, res) => {
  try {
    const incidents = automatedIncidentResponseService.getIncidents();
    
    res.status(200).json({
      message: 'Incidents retrieved',
      data: {
        incidents,
        total: incidents.length
      },
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to get incidents', error);
    res.status(500).json({
      message: 'Failed to get incidents',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route POST /api/security-monitoring/vulnerability-scanning/execute-scan
 * @description Execute vulnerability scan
 * @access Admin
 */
router.post('/vulnerability-scanning/execute-scan', async (req, res) => {
  try {
    const { scanType } = req.body;
    
    if (!scanType) {
      return res.status(400).json({
        message: 'Scan type is required',
        trace_id: req.traceId
      });
    }
    
    loggingService.logInfo('API: Vulnerability scan execution requested', { 
      scanType, 
      trace_id: req.traceId 
    });
    
    const scan = await continuousVulnerabilityScanningService.executeScan(scanType);
    
    res.status(200).json({
      message: 'Vulnerability scan executed successfully',
      data: {
        scan_id: scan.id,
        status: scan.status,
        vulnerabilities_found: scan.vulnerabilities_found,
        duration: scan.duration
      },
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to execute vulnerability scan', error);
    res.status(500).json({
      message: 'Failed to execute vulnerability scan',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route GET /api/security-monitoring/vulnerability-scanning/status
 * @description Get vulnerability scanning status
 * @access Admin
 */
router.get('/vulnerability-scanning/status', async (req, res) => {
  try {
    const status = continuousVulnerabilityScanningService.getVulnerabilityScanningStatus();
    
    res.status(200).json({
      message: 'Vulnerability scanning status retrieved',
      data: status,
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to get vulnerability scanning status', error);
    res.status(500).json({
      message: 'Failed to get vulnerability scanning status',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route GET /api/security-monitoring/vulnerability-scanning/vulnerabilities
 * @description Get all vulnerabilities
 * @access Admin
 */
router.get('/vulnerability-scanning/vulnerabilities', async (req, res) => {
  try {
    const vulnerabilities = continuousVulnerabilityScanningService.getVulnerabilities();
    const misconfigurations = continuousVulnerabilityScanningService.getMisconfigurations();
    const outdatedDependencies = continuousVulnerabilityScanningService.getOutdatedDependencies();
    const openPorts = continuousVulnerabilityScanningService.getOpenPorts();
    const cveVulnerabilities = continuousVulnerabilityScanningService.getCVEVulnerabilities();
    
    res.status(200).json({
      message: 'Vulnerabilities retrieved',
      data: {
        vulnerabilities,
        misconfigurations,
        outdated_dependencies: outdatedDependencies,
        open_ports: openPorts,
        cve_vulnerabilities: cveVulnerabilities,
        summary: {
          total_vulnerabilities: vulnerabilities.length,
          total_misconfigurations: misconfigurations.length,
          total_outdated_dependencies: outdatedDependencies.length,
          total_open_ports: openPorts.length,
          total_cve_vulnerabilities: cveVulnerabilities.length
        }
      },
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to get vulnerabilities', error);
    res.status(500).json({
      message: 'Failed to get vulnerabilities',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

/**
 * @route GET /api/security-monitoring/overall-status
 * @description Get overall security monitoring status
 * @access Admin
 */
router.get('/overall-status', async (req, res) => {
  try {
    const siemStatus = siemIntegrationService.getSIEMStatus();
    const threatIntelStatus = threatIntelligenceService.getThreatIntelligenceStatus();
    const alertingStatus = realtimeAlertingService.getAlertingStatus();
    const incidentResponseStatus = automatedIncidentResponseService.getIncidentResponseStatus();
    const vulnerabilityScanningStatus = continuousVulnerabilityScanningService.getVulnerabilityScanningStatus();
    
    const overallStatus = {
      siem: {
        running: siemStatus.running,
        connections: Object.keys(siemStatus.connections).length,
        alerts: siemStatus.alerts
      },
      threat_intelligence: {
        running: threatIntelStatus.running,
        threat_data: threatIntelStatus.threat_data,
        blocked_entities: threatIntelStatus.blocked_entities
      },
      alerting: {
        running: alertingStatus.running,
        alerts: alertingStatus.alerts,
        channel_status: alertingStatus.channel_status
      },
      incident_response: {
        running: incidentResponseStatus.running,
        auto_response: incidentResponseStatus.auto_response,
        incidents: incidentResponseStatus.incidents
      },
      vulnerability_scanning: {
        running: vulnerabilityScanningStatus.running,
        scans: vulnerabilityScanningStatus.scans,
        vulnerabilities: vulnerabilityScanningStatus.vulnerabilities
      },
      overall: {
        all_services_running: siemStatus.running && threatIntelStatus.running && 
                             alertingStatus.running && incidentResponseStatus.running && 
                             vulnerabilityScanningStatus.running,
        total_alerts: siemStatus.alerts + alertingStatus.alerts,
        total_incidents: incidentResponseStatus.incidents,
        total_vulnerabilities: vulnerabilityScanningStatus.vulnerabilities
      }
    };
    
    res.status(200).json({
      message: 'Overall security monitoring status retrieved',
      data: overallStatus,
      trace_id: req.traceId
    });
    
  } catch (error) {
    loggingService.logError('API: Failed to get overall security monitoring status', error);
    res.status(500).json({
      message: 'Failed to get overall security monitoring status',
      error: error.message,
      trace_id: req.traceId
    });
  }
});

export default router;
