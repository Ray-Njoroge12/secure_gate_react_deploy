/**
 * Penetration Testing Routes for Secure Gate Access Control System
 * 
 * Provides API endpoints for penetration testing and compliance reporting
 */

import express from 'express';
import penetrationTestingService from '../services/penetrationTestingService.js';
import internalThreatService from '../services/internalThreatService.js';
import apiMobileSecurityService from '../services/apiMobileSecurityService.js';
import penetrationComplianceService from '../services/penetrationComplianceService.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import loggingService from '../utils/loggingService.js';

const router = express.Router();

/**
 * @route POST /api/penetration/external-attack
 * @description Execute external attack simulation
 * @access Admin
 */
router.post('/external-attack', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { target, method, duration } = req.body;
    
    if (!target || !method) {
      return res.status(400).json({ 
        success: false, 
        message: 'Target and method are required' 
      });
    }
    
    const test = await penetrationTestingService.executeExternalAttackSimulation(target, method, duration);
    
    res.status(200).json({
      success: true,
      message: 'External attack simulation started',
      data: {
        test_id: test.id,
        target: test.target,
        method: test.method,
        status: test.status
      }
    });
    
  } catch (error) {
    loggingService.logError('External attack simulation failed', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute external attack simulation',
      error: error.message
    });
  }
});

/**
 * @route POST /api/penetration/webapp-security
 * @description Execute web application security testing
 * @access Admin
 */
router.post('/webapp-security', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { endpoint, method, duration } = req.body;
    
    if (!endpoint || !method) {
      return res.status(400).json({ 
        success: false, 
        message: 'Endpoint and method are required' 
      });
    }
    
    const test = await penetrationTestingService.executeWebAppSecurityTesting(endpoint, method, duration);
    
    res.status(200).json({
      success: true,
      message: 'Web application security testing started',
      data: {
        test_id: test.id,
        endpoint: test.endpoint,
        method: test.method,
        status: test.status
      }
    });
    
  } catch (error) {
    loggingService.logError('Web application security testing failed', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute web application security testing',
      error: error.message
    });
  }
});

/**
 * @route POST /api/penetration/privilege-escalation
 * @description Execute privilege escalation simulation
 * @access Admin
 */
router.post('/privilege-escalation', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { userId, method, duration } = req.body;
    
    if (!userId || !method) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID and method are required' 
      });
    }
    
    const threat = await internalThreatService.executePrivilegeEscalation(userId, method, duration);
    
    res.status(200).json({
      success: true,
      message: 'Privilege escalation simulation started',
      data: {
        threat_id: threat.id,
        userId: threat.userId,
        method: threat.method,
        status: threat.status
      }
    });
    
  } catch (error) {
    loggingService.logError('Privilege escalation simulation failed', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute privilege escalation simulation',
      error: error.message
    });
  }
});

/**
 * @route POST /api/penetration/lateral-movement
 * @description Execute lateral movement simulation
 * @access Admin
 */
router.post('/lateral-movement', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { sourceHost, targetHost, method, duration } = req.body;
    
    if (!sourceHost || !targetHost || !method) {
      return res.status(400).json({ 
        success: false, 
        message: 'Source host, target host, and method are required' 
      });
    }
    
    const threat = await internalThreatService.executeLateralMovement(sourceHost, targetHost, method, duration);
    
    res.status(200).json({
      success: true,
      message: 'Lateral movement simulation started',
      data: {
        threat_id: threat.id,
        sourceHost: threat.sourceHost,
        targetHost: threat.targetHost,
        method: threat.method,
        status: threat.status
      }
    });
    
  } catch (error) {
    loggingService.logError('Lateral movement simulation failed', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute lateral movement simulation',
      error: error.message
    });
  }
});

/**
 * @route POST /api/penetration/data-exfiltration
 * @description Execute data exfiltration simulation
 * @access Admin
 */
router.post('/data-exfiltration', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { userId, dataType, method, duration } = req.body;
    
    if (!userId || !dataType || !method) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID, data type, and method are required' 
      });
    }
    
    const threat = await internalThreatService.executeDataExfiltration(userId, dataType, method, duration);
    
    res.status(200).json({
      success: true,
      message: 'Data exfiltration simulation started',
      data: {
        threat_id: threat.id,
        userId: threat.userId,
        dataType: threat.dataType,
        method: threat.method,
        status: threat.status
      }
    });
    
  } catch (error) {
    loggingService.logError('Data exfiltration simulation failed', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute data exfiltration simulation',
      error: error.message
    });
  }
});

/**
 * @route POST /api/penetration/mitm-attack
 * @description Execute MITM attack simulation
 * @access Admin
 */
router.post('/mitm-attack', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { target, method, duration } = req.body;
    
    if (!target || !method) {
      return res.status(400).json({ 
        success: false, 
        message: 'Target and method are required' 
      });
    }
    
    const attack = await apiMobileSecurityService.executeMITMAttack(target, method, duration);
    
    res.status(200).json({
      success: true,
      message: 'MITM attack simulation started',
      data: {
        attack_id: attack.id,
        target: attack.target,
        method: attack.method,
        status: attack.status
      }
    });
    
  } catch (error) {
    loggingService.logError('MITM attack simulation failed', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute MITM attack simulation',
      error: error.message
    });
  }
});

/**
 * @route POST /api/penetration/replay-attack
 * @description Execute replay attack simulation
 * @access Admin
 */
router.post('/replay-attack', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { target, method, duration } = req.body;
    
    if (!target || !method) {
      return res.status(400).json({ 
        success: false, 
        message: 'Target and method are required' 
      });
    }
    
    const attack = await apiMobileSecurityService.executeReplayAttack(target, method, duration);
    
    res.status(200).json({
      success: true,
      message: 'Replay attack simulation started',
      data: {
        attack_id: attack.id,
        target: attack.target,
        method: attack.method,
        status: attack.status
      }
    });
    
  } catch (error) {
    loggingService.logError('Replay attack simulation failed', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute replay attack simulation',
      error: error.message
    });
  }
});

/**
 * @route POST /api/penetration/rate-limit-bypass
 * @description Execute rate-limit bypass testing
 * @access Admin
 */
router.post('/rate-limit-bypass', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { target, method, duration } = req.body;
    
    if (!target || !method) {
      return res.status(400).json({ 
        success: false, 
        message: 'Target and method are required' 
      });
    }
    
    const attack = await apiMobileSecurityService.executeRateLimitBypass(target, method, duration);
    
    res.status(200).json({
      success: true,
      message: 'Rate-limit bypass testing started',
      data: {
        attack_id: attack.id,
        target: attack.target,
        method: attack.method,
        status: attack.status
      }
    });
    
  } catch (error) {
    loggingService.logError('Rate-limit bypass testing failed', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute rate-limit bypass testing',
      error: error.message
    });
  }
});

/**
 * @route GET /api/penetration/tests
 * @description Get all active penetration tests
 * @access Admin
 */
router.get('/tests', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { type } = req.query;
    
    let tests = [];
    
    if (!type || type === 'external') {
      tests = tests.concat(penetrationTestingService.getActiveTests());
    }
    
    if (!type || type === 'internal') {
      tests = tests.concat(internalThreatService.getActiveThreats());
    }
    
    if (!type || type === 'api') {
      tests = tests.concat(apiMobileSecurityService.getActiveAttacks());
    }
    
    res.status(200).json({
      success: true,
      data: tests
    });
    
  } catch (error) {
    loggingService.logError('Failed to get penetration tests', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get penetration tests',
      error: error.message
    });
  }
});

/**
 * @route GET /api/penetration/tests/history
 * @description Get penetration test history
 * @access Admin
 */
router.get('/tests/history', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { type, limit } = req.query;
    
    let history = [];
    
    if (!type || type === 'external') {
      history = history.concat(penetrationTestingService.getTestHistory());
    }
    
    if (!type || type === 'internal') {
      history = history.concat(internalThreatService.getThreatHistory());
    }
    
    if (!type || type === 'api') {
      history = history.concat(apiMobileSecurityService.getAttackHistory());
    }
    
    // Sort by timestamp (newest first)
    history.sort((a, b) => new Date(b.timestamp || b.startTime) - new Date(a.timestamp || a.startTime));
    
    // Apply limit
    if (limit) {
      history = history.slice(0, parseInt(limit));
    }
    
    res.status(200).json({
      success: true,
      data: history
    });
    
  } catch (error) {
    loggingService.logError('Failed to get penetration test history', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get penetration test history',
      error: error.message
    });
  }
});

/**
 * @route GET /api/penetration/vulnerabilities
 * @description Get all detected vulnerabilities
 * @access Admin
 */
router.get('/vulnerabilities', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { severity, standard } = req.query;
    
    let vulnerabilities = [];
    
    // Get vulnerabilities from all services
    vulnerabilities = vulnerabilities.concat(penetrationTestingService.getVulnerabilities());
    vulnerabilities = vulnerabilities.concat(internalThreatService.getDetectedThreats());
    vulnerabilities = vulnerabilities.concat(apiMobileSecurityService.getDetectedAttacks());
    
    // Filter by severity
    if (severity) {
      vulnerabilities = vulnerabilities.filter(v => v.severity === severity);
    }
    
    // Filter by standard
    if (standard) {
      vulnerabilities = vulnerabilities.filter(v => 
        penetrationComplianceService.isVulnerabilityRelevantToStandard(v, standard)
      );
    }
    
    res.status(200).json({
      success: true,
      data: vulnerabilities
    });
    
  } catch (error) {
    loggingService.logError('Failed to get vulnerabilities', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get vulnerabilities',
      error: error.message
    });
  }
});

/**
 * @route GET /api/penetration/mitigations
 * @description Get all applied mitigations
 * @access Admin
 */
router.get('/mitigations', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { type, success } = req.query;
    
    let mitigations = [];
    
    // Get mitigations from all services
    mitigations = mitigations.concat(penetrationTestingService.getMitigations());
    mitigations = mitigations.concat(internalThreatService.getMitigations());
    mitigations = mitigations.concat(apiMobileSecurityService.getMitigations());
    
    // Filter by type
    if (type) {
      mitigations = mitigations.filter(m => m.type === type || m.scenario === type);
    }
    
    // Filter by success
    if (success !== undefined) {
      const isSuccess = success === 'true';
      mitigations = mitigations.filter(m => m.success === isSuccess);
    }
    
    res.status(200).json({
      success: true,
      data: mitigations
    });
    
  } catch (error) {
    loggingService.logError('Failed to get mitigations', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get mitigations',
      error: error.message
    });
  }
});

/**
 * @route GET /api/penetration/compliance/score
 * @description Get compliance scores for all standards
 * @access Admin
 */
router.get('/compliance/score', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const scores = await penetrationComplianceService.calculateComplianceScores();
    
    res.status(200).json({
      success: true,
      data: scores
    });
    
  } catch (error) {
    loggingService.logError('Failed to get compliance scores', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get compliance scores',
      error: error.message
    });
  }
});

/**
 * @route GET /api/penetration/compliance/score/:standard
 * @description Get compliance score for specific standard
 * @access Admin
 */
router.get('/compliance/score/:standard', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { standard } = req.params;
    
    const score = await penetrationComplianceService.calculateStandardComplianceScore(standard);
    
    res.status(200).json({
      success: true,
      data: {
        standard: standard,
        score: score
      }
    });
    
  } catch (error) {
    loggingService.logError(`Failed to get compliance score for ${req.params.standard}`, error);
    res.status(500).json({
      success: false,
      message: `Failed to get compliance score for ${req.params.standard}`,
      error: error.message
    });
  }
});

/**
 * @route POST /api/penetration/compliance/report
 * @description Generate compliance report
 * @access Admin
 */
router.post('/compliance/report', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { standard, period } = req.body;
    
    if (!standard) {
      return res.status(400).json({ 
        success: false, 
        message: 'Standard is required' 
      });
    }
    
    const report = await penetrationComplianceService.generateComplianceReport(standard, period);
    
    res.status(200).json({
      success: true,
      message: 'Compliance report generated successfully',
      data: report
    });
    
  } catch (error) {
    loggingService.logError('Failed to generate compliance report', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate compliance report',
      error: error.message
    });
  }
});

/**
 * @route GET /api/penetration/compliance/reports
 * @description Get all compliance reports
 * @access Admin
 */
router.get('/compliance/reports', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { standard, limit } = req.query;
    
    let reports = penetrationComplianceService.getComplianceReports();
    
    // Filter by standard
    if (standard) {
      reports = reports.filter(r => r.standard === standard);
    }
    
    // Apply limit
    if (limit) {
      reports = reports.slice(0, parseInt(limit));
    }
    
    res.status(200).json({
      success: true,
      data: reports
    });
    
  } catch (error) {
    loggingService.logError('Failed to get compliance reports', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get compliance reports',
      error: error.message
    });
  }
});

/**
 * @route GET /api/penetration/metrics
 * @description Get penetration testing metrics
 * @access Admin
 */
router.get('/metrics', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { timeframe } = req.query;
    
    const metrics = {
      penetration: penetrationTestingService.getStatus(),
      internal: internalThreatService.getStatus(),
      api: apiMobileSecurityService.getStatus(),
      compliance: penetrationComplianceService.getStatus()
    };
    
    res.status(200).json({
      success: true,
      data: metrics
    });
    
  } catch (error) {
    loggingService.logError('Failed to get penetration testing metrics', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get penetration testing metrics',
      error: error.message
    });
  }
});

/**
 * @route GET /api/penetration/status
 * @description Get penetration testing service status
 * @access Admin
 */
router.get('/status', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const status = {
      penetration: penetrationTestingService.getStatus(),
      internal: internalThreatService.getStatus(),
      api: apiMobileSecurityService.getStatus(),
      compliance: penetrationComplianceService.getStatus()
    };
    
    res.status(200).json({
      success: true,
      data: status
    });
    
  } catch (error) {
    loggingService.logError('Failed to get penetration testing status', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get penetration testing status',
      error: error.message
    });
  }
});

export default router;
