/**
 * Incident Response Routes for Secure Gate Access Control System
 * 
 * Provides REST API endpoints for incident response automation
 * Features:
 * - Incident detection and classification
 * - Automated triage and routing
 * - Response playbook execution
 * - Forensics and evidence collection
 * - Compliance reporting
 */

import express from 'express';
import incidentDetectionService from '../services/incidentDetectionService.js';
import incidentTriageService from '../services/incidentTriageService.js';
import responsePlaybookService from '../services/responsePlaybookService.js';
import forensicsService from '../services/forensicsService.js';
import complianceReportingService from '../services/complianceReportingService.js';
import loggingService from '../services/loggingService.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all incident routes
router.use(authenticateToken);

/**
 * @route GET /api/incidents
 * @desc Get all incidents
 * @access Private (Admin, Security, Ops)
 */
router.get('/', requireRole(['admin', 'security', 'ops']), async (req, res) => {
  try {
    const incidents = incidentDetectionService.getAllIncidents();
    
    res.json({
      success: true,
      data: incidents,
      count: incidents.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    loggingService.logError('Failed to get incidents', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get incidents',
      error: error.message
    });
  }
});

/**
 * @route GET /api/incidents/:id
 * @desc Get incident by ID
 * @access Private (Admin, Security, Ops)
 */
router.get('/:id', requireRole(['admin', 'security', 'ops']), async (req, res) => {
  try {
    const { id } = req.params;
    const incident = incidentDetectionService.getIncident(id);
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    res.json({
      success: true,
      data: incident
    });
    
  } catch (error) {
    loggingService.logError('Failed to get incident', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get incident',
      error: error.message
    });
  }
});

/**
 * @route GET /api/incidents/category/:category
 * @desc Get incidents by category
 * @access Private (Admin, Security, Ops)
 */
router.get('/category/:category', requireRole(['admin', 'security', 'ops']), async (req, res) => {
  try {
    const { category } = req.params;
    const incidents = incidentDetectionService.getIncidentsByCategory(category);
    
    res.json({
      success: true,
      data: incidents,
      count: incidents.length,
      category: category
    });
    
  } catch (error) {
    loggingService.logError('Failed to get incidents by category', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get incidents by category',
      error: error.message
    });
  }
});

/**
 * @route GET /api/incidents/severity/:severity
 * @desc Get incidents by severity
 * @access Private (Admin, Security, Ops)
 */
router.get('/severity/:severity', requireRole(['admin', 'security', 'ops']), async (req, res) => {
  try {
    const { severity } = req.params;
    const incidents = incidentDetectionService.getIncidentsBySeverity(severity);
    
    res.json({
      success: true,
      data: incidents,
      count: incidents.length,
      severity: severity
    });
    
  } catch (error) {
    loggingService.logError('Failed to get incidents by severity', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get incidents by severity',
      error: error.message
    });
  }
});

/**
 * @route POST /api/incidents/:id/resolve
 * @desc Resolve incident
 * @access Private (Admin, Security, Ops)
 */
router.post('/:id/resolve', requireRole(['admin', 'security', 'ops']), async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;
    
    if (!resolution) {
      return res.status(400).json({
        success: false,
        message: 'Resolution is required'
      });
    }
    
    await incidentTriageService.resolveIncident(id, resolution);
    
    res.json({
      success: true,
      message: 'Incident resolved successfully',
      data: {
        incidentId: id,
        resolution: resolution,
        resolvedAt: new Date()
      }
    });
    
  } catch (error) {
    loggingService.logError('Failed to resolve incident', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve incident',
      error: error.message
    });
  }
});

/**
 * @route POST /api/incidents/:id/execute-playbook
 * @desc Execute response playbook for incident
 * @access Private (Admin, Security, Ops)
 */
router.post('/:id/execute-playbook', requireRole(['admin', 'security', 'ops']), async (req, res) => {
  try {
    const { id } = req.params;
    const { playbookType = 'automatic' } = req.body;
    
    const incident = incidentDetectionService.getIncident(id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    const execution = await responsePlaybookService.executePlaybook(incident, playbookType);
    
    res.json({
      success: true,
      message: 'Playbook executed successfully',
      data: execution
    });
    
  } catch (error) {
    loggingService.logError('Failed to execute playbook', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute playbook',
      error: error.message
    });
  }
});

/**
 * @route POST /api/incidents/:id/containment
 * @desc Execute containment action for incident
 * @access Private (Admin, Security, Ops)
 */
router.post('/:id/containment', requireRole(['admin', 'security', 'ops']), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, parameters = {} } = req.body;
    
    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Containment action is required'
      });
    }
    
    const incident = incidentDetectionService.getIncident(id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    const execution = await responsePlaybookService.executeContainmentAction(incident, action, parameters);
    
    res.json({
      success: true,
      message: 'Containment action executed successfully',
      data: execution
    });
    
  } catch (error) {
    loggingService.logError('Failed to execute containment action', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute containment action',
      error: error.message
    });
  }
});

/**
 * @route POST /api/incidents/:id/collect-evidence
 * @desc Collect evidence for incident
 * @access Private (Admin, Security, Ops)
 */
router.post('/:id/collect-evidence', requireRole(['admin', 'security', 'ops']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const incident = incidentDetectionService.getIncident(id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    const collection = await forensicsService.collectEvidence(incident);
    
    res.json({
      success: true,
      message: 'Evidence collection initiated successfully',
      data: collection
    });
    
  } catch (error) {
    loggingService.logError('Failed to collect evidence', error);
    res.status(500).json({
      success: false,
      message: 'Failed to collect evidence',
      error: error.message
    });
  }
});

/**
 * @route GET /api/incidents/:id/evidence
 * @desc Get evidence for incident
 * @access Private (Admin, Security, Ops)
 */
router.get('/:id/evidence', requireRole(['admin', 'security', 'ops']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const collections = forensicsService.getCollectionsByIncident(id);
    
    res.json({
      success: true,
      data: collections,
      count: collections.length
    });
    
  } catch (error) {
    loggingService.logError('Failed to get evidence', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get evidence',
      error: error.message
    });
  }
});

/**
 * @route POST /api/incidents/:id/generate-report
 * @desc Generate incident report
 * @access Private (Admin, Security, Ops, Compliance)
 */
router.post('/:id/generate-report', requireRole(['admin', 'security', 'ops', 'compliance']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reportType = 'incident' } = req.body;
    
    const incident = incidentDetectionService.getIncident(id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    let report;
    if (reportType === 'incident') {
      report = await complianceReportingService.generateIncidentReport(incident);
    } else {
      report = await complianceReportingService.generateComplianceReport(incident, reportType);
    }
    
    res.json({
      success: true,
      message: 'Report generated successfully',
      data: report
    });
    
  } catch (error) {
    loggingService.logError('Failed to generate report', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
});

/**
 * @route GET /api/incidents/:id/reports
 * @desc Get reports for incident
 * @access Private (Admin, Security, Ops, Compliance)
 */
router.get('/:id/reports', requireRole(['admin', 'security', 'ops', 'compliance']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const reports = complianceReportingService.getReportsByIncident(id);
    
    res.json({
      success: true,
      data: reports,
      count: reports.length
    });
    
  } catch (error) {
    loggingService.logError('Failed to get reports', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reports',
      error: error.message
    });
  }
});

/**
 * @route GET /api/incidents/status/detection
 * @desc Get incident detection status
 * @access Private (Admin, Security, Ops)
 */
router.get('/status/detection', requireRole(['admin', 'security', 'ops']), async (req, res) => {
  try {
    const status = incidentDetectionService.getStatus();
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    loggingService.logError('Failed to get detection status', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get detection status',
      error: error.message
    });
  }
});

/**
 * @route GET /api/incidents/status/triage
 * @desc Get incident triage status
 * @access Private (Admin, Security, Ops)
 */
router.get('/status/triage', requireRole(['admin', 'security', 'ops']), async (req, res) => {
  try {
    const status = incidentTriageService.getStatus();
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    loggingService.logError('Failed to get triage status', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get triage status',
      error: error.message
    });
  }
});

/**
 * @route GET /api/incidents/status/playbooks
 * @desc Get response playbook status
 * @access Private (Admin, Security, Ops)
 */
router.get('/status/playbooks', requireRole(['admin', 'security', 'ops']), async (req, res) => {
  try {
    const status = responsePlaybookService.getStatus();
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    loggingService.logError('Failed to get playbook status', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get playbook status',
      error: error.message
    });
  }
});

/**
 * @route GET /api/incidents/status/forensics
 * @desc Get forensics status
 * @access Private (Admin, Security, Ops)
 */
router.get('/status/forensics', requireRole(['admin', 'security', 'ops']), async (req, res) => {
  try {
    const status = forensicsService.getStatus();
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    loggingService.logError('Failed to get forensics status', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get forensics status',
      error: error.message
    });
  }
});

/**
 * @route GET /api/incidents/status/reporting
 * @desc Get compliance reporting status
 * @access Private (Admin, Security, Ops, Compliance)
 */
router.get('/status/reporting', requireRole(['admin', 'security', 'ops', 'compliance']), async (req, res) => {
  try {
    const status = complianceReportingService.getStatus();
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    loggingService.logError('Failed to get reporting status', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reporting status',
      error: error.message
    });
  }
});

/**
 * @route POST /api/incidents/webhook
 * @desc Webhook endpoint for external incident notifications
 * @access Public (with authentication)
 */
router.post('/webhook', async (req, res) => {
  try {
    const { incident, source, timestamp } = req.body;
    
    if (!incident || !source) {
      return res.status(400).json({
        success: false,
        message: 'Incident and source are required'
      });
    }
    
    // Process external incident notification
    loggingService.logInfo('External incident notification received', {
      incident: incident,
      source: source,
      timestamp: timestamp
    });
    
    res.json({
      success: true,
      message: 'Incident notification processed'
    });
    
  } catch (error) {
    loggingService.logError('Failed to process webhook', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process webhook',
      error: error.message
    });
  }
});

export default router;
