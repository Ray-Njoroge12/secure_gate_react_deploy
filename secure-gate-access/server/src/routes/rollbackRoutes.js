/**
 * Rollback Routes for Secure Gate Access Control System
 * 
 * Provides API endpoints for rollback operations and management
 */

import express from 'express';
import rollbackService from '../services/rollbackService.js';
import centralizedLoggingService from '../services/centralizedLoggingService.js';
import auditTraceabilityService from '../services/auditTraceabilityService.js';
import rollbackAlertingService from '../services/rollbackAlertingService.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import loggingService from '../utils/loggingService.js';

const router = express.Router();

/**
 * @route POST /api/rollback/snapshot
 * @description Create a snapshot before action
 * @access Admin
 */
router.post('/snapshot', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { action, metadata } = req.body;
    
    if (!action) {
      return res.status(400).json({ 
        success: false, 
        message: 'Action is required' 
      });
    }
    
    const snapshot = await rollbackService.createSnapshot(action, metadata);
    
    // Log audit event
    await auditTraceabilityService.logAuditEvent({
      trace_id: snapshot.id,
      actor: req.user.id,
      action: 'create_snapshot',
      status: 'success',
      metadata: {
        snapshot_id: snapshot.id,
        action: action,
        components: snapshot.components.length
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Snapshot created successfully',
      data: {
        snapshot_id: snapshot.id,
        action: snapshot.action,
        timestamp: snapshot.timestamp,
        components: snapshot.components.length
      }
    });
    
  } catch (error) {
    loggingService.logError('Failed to create snapshot', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create snapshot',
      error: error.message
    });
  }
});

/**
 * @route POST /api/rollback/execute
 * @description Execute rollback
 * @access Admin
 */
router.post('/execute', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { action, snapshot_id, reason } = req.body;
    
    if (!action || !snapshot_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Action and snapshot_id are required' 
      });
    }
    
    const rollback = await rollbackService.executeRollback(action, snapshot_id, reason);
    
    // Log audit event
    await auditTraceabilityService.logAuditEvent({
      trace_id: rollback.id,
      actor: req.user.id,
      action: 'execute_rollback',
      status: rollback.status,
      rollback_status: rollback.status,
      metadata: {
        rollback_id: rollback.id,
        action: action,
        snapshot_id: snapshot_id,
        reason: reason
      }
    });
    
    // Send alert if rollback failed
    if (rollback.status === 'failed') {
      await rollbackAlertingService.sendRollbackFailureAlert({
        failed_action: action,
        rollback_attempt_result: rollback.result,
        next_steps: 'Manual intervention required',
        rollback_id: rollback.id,
        snapshot_id: snapshot_id,
        error_message: rollback.result.error
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Rollback executed',
      data: {
        rollback_id: rollback.id,
        status: rollback.status,
        result: rollback.result
      }
    });
    
  } catch (error) {
    loggingService.logError('Failed to execute rollback', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute rollback',
      error: error.message
    });
  }
});

/**
 * @route GET /api/rollback/status
 * @description Get rollback service status
 * @access Admin
 */
router.get('/status', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const status = rollbackService.getStatus();
    
    res.status(200).json({
      success: true,
      data: status
    });
    
  } catch (error) {
    loggingService.logError('Failed to get rollback status', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get rollback status',
      error: error.message
    });
  }
});

/**
 * @route GET /api/rollback/history
 * @description Get rollback history
 * @access Admin
 */
router.get('/history', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const history = rollbackService.getRollbackHistory();
    
    res.status(200).json({
      success: true,
      data: history
    });
    
  } catch (error) {
    loggingService.logError('Failed to get rollback history', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get rollback history',
      error: error.message
    });
  }
});

/**
 * @route GET /api/rollback/active
 * @description Get active rollbacks
 * @access Admin
 */
router.get('/active', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const activeRollbacks = rollbackService.getActiveRollbacks();
    
    res.status(200).json({
      success: true,
      data: activeRollbacks
    });
    
  } catch (error) {
    loggingService.logError('Failed to get active rollbacks', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active rollbacks',
      error: error.message
    });
  }
});

/**
 * @route GET /api/rollback/:id
 * @description Get specific rollback by ID
 * @access Admin
 */
router.get('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const rollback = rollbackService.getRollback(id);
    
    if (!rollback) {
      return res.status(404).json({
        success: false,
        message: 'Rollback not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: rollback
    });
    
  } catch (error) {
    loggingService.logError('Failed to get rollback', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get rollback',
      error: error.message
    });
  }
});

/**
 * @route POST /api/rollback/log
 * @description Log rollback event
 * @access Admin
 */
router.post('/log', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { trace_id, actor, action, status, rollback_status, metadata } = req.body;
    
    if (!trace_id || !actor || !action) {
      return res.status(400).json({ 
        success: false, 
        message: 'trace_id, actor, and action are required' 
      });
    }
    
    // Log to centralized logging
    await centralizedLoggingService.logEvent({
      trace_id,
      actor,
      action,
      status,
      rollback_status,
      metadata
    });
    
    // Log audit event
    await auditTraceabilityService.logAuditEvent({
      trace_id,
      actor,
      action,
      status,
      rollback_status,
      metadata
    });
    
    res.status(200).json({
      success: true,
      message: 'Rollback event logged successfully'
    });
    
  } catch (error) {
    loggingService.logError('Failed to log rollback event', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log rollback event',
      error: error.message
    });
  }
});

/**
 * @route GET /api/rollback/logs/query
 * @description Query rollback logs
 * @access Admin
 */
router.get('/logs/query', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { query, start_time, end_time, limit } = req.query;
    
    const logQuery = {
      query: query || '*',
      start_time: start_time || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      end_time: end_time || new Date().toISOString(),
      limit: parseInt(limit) || 100
    };
    
    const logs = await centralizedLoggingService.queryLogs(logQuery);
    
    res.status(200).json({
      success: true,
      data: logs
    });
    
  } catch (error) {
    loggingService.logError('Failed to query rollback logs', error);
    res.status(500).json({
      success: false,
      message: 'Failed to query rollback logs',
      error: error.message
    });
  }
});

/**
 * @route GET /api/rollback/traces
 * @description Get trace information
 * @access Admin
 */
router.get('/traces', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { trace_id, actor, action, status } = req.query;
    
    let traces = centralizedLoggingService.getAllTraces();
    
    if (trace_id) {
      const trace = centralizedLoggingService.getTraceInfo(trace_id);
      traces = trace ? [trace] : [];
    }
    
    if (actor) {
      traces = traces.filter(t => t.actor === actor);
    }
    
    if (action) {
      traces = traces.filter(t => t.action === action);
    }
    
    if (status) {
      traces = traces.filter(t => t.status === status);
    }
    
    res.status(200).json({
      success: true,
      data: traces
    });
    
  } catch (error) {
    loggingService.logError('Failed to get traces', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get traces',
      error: error.message
    });
  }
});

/**
 * @route GET /api/rollback/compliance
 * @description Get compliance information
 * @access Admin
 */
router.get('/compliance', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { framework } = req.query;
    
    let violations = auditTraceabilityService.getComplianceViolations();
    
    if (framework) {
      violations = violations.filter(v => v.framework === framework);
    }
    
    res.status(200).json({
      success: true,
      data: {
        violations: violations,
        frameworks: ['kenya_dpa', 'gdpr', 'iso27001']
      }
    });
    
  } catch (error) {
    loggingService.logError('Failed to get compliance information', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get compliance information',
      error: error.message
    });
  }
});

/**
 * @route GET /api/rollback/alerts
 * @description Get rollback alerts
 * @access Admin
 */
router.get('/alerts', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { status, type, severity } = req.query;
    
    let alerts = rollbackAlertingService.getAlertHistory();
    
    if (status) {
      alerts = alerts.filter(a => a.status === status);
    }
    
    if (type) {
      alerts = alerts.filter(a => a.type === type);
    }
    
    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }
    
    res.status(200).json({
      success: true,
      data: alerts
    });
    
  } catch (error) {
    loggingService.logError('Failed to get rollback alerts', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get rollback alerts',
      error: error.message
    });
  }
});

/**
 * @route POST /api/rollback/alerts/resolve
 * @description Resolve rollback alert
 * @access Admin
 */
router.post('/alerts/resolve', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { alert_id, resolution } = req.body;
    
    if (!alert_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'alert_id is required' 
      });
    }
    
    const alert = await rollbackAlertingService.resolveAlert(alert_id, resolution);
    
    res.status(200).json({
      success: true,
      message: 'Alert resolved successfully',
      data: alert
    });
    
  } catch (error) {
    loggingService.logError('Failed to resolve rollback alert', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve rollback alert',
      error: error.message
    });
  }
});

export default router;
