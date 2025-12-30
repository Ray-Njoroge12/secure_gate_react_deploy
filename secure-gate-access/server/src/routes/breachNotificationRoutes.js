/**
 * Breach Notification Routes
 * API endpoints for Kenya DPA 72-hour breach notification workflow
 */

import express from 'express';
import breachNotificationService from '../services/breachNotificationService.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route POST /api/admin/breach/detect
 * @desc Register a new security breach
 * @access Admin only
 */
router.post('/detect', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { type, description, affected_data_types, affected_users_count } = req.body;

    // Validate required fields
    if (!type || !description) {
      return res.status(400).json({
        success: false,
        message: 'Breach type and description are required'
      });
    }

    const result = await breachNotificationService.detectBreach({
      type,
      description,
      affected_data_types: affected_data_types || [],
      affected_users_count: affected_users_count || 0
    });

    res.status(201).json({
      success: true,
      message: 'Breach detected and notification workflow initiated',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to register breach',
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/breach/:breachId
 * @desc Get breach incident details
 * @access Admin only
 */
router.get('/:breachId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { breachId } = req.params;
    const breach = breachNotificationService.getBreachIncident(breachId);

    if (!breach) {
      return res.status(404).json({
        success: false,
        message: 'Breach incident not found'
      });
    }

    res.json({
      success: true,
      data: breach
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve breach incident',
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/breach
 * @desc Get all breach incidents
 * @access Admin only
 */
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const breaches = breachNotificationService.getAllBreachIncidents();

    res.json({
      success: true,
      data: {
        breaches,
        count: breaches.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve breach incidents',
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/breach/statistics
 * @desc Get breach statistics
 * @access Admin only
 */
router.get('/stats/summary', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const statistics = breachNotificationService.getBreachStatistics();

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve breach statistics',
      error: error.message
    });
  }
});

/**
 * @route POST /api/admin/breach/:breachId/complete-investigation
 * @desc Complete breach investigation
 * @access Admin only
 */
router.post('/:breachId/complete-investigation', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { breachId } = req.params;
    const { summary, mitigation_measures, root_cause } = req.body;

    if (!summary || !mitigation_measures) {
      return res.status(400).json({
        success: false,
        message: 'Investigation summary and mitigation measures are required'
      });
    }

    const result = await breachNotificationService.completeInvestigation(breachId, {
      summary,
      mitigation_measures,
      root_cause: root_cause || 'Under investigation'
    });

    res.json({
      success: true,
      message: 'Investigation completed successfully',
      data: result.breach
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to complete investigation',
      error: error.message
    });
  }
});

/**
 * @route POST /api/admin/breach/:breachId/notify-data-subjects
 * @desc Notify affected data subjects
 * @access Admin only
 */
router.post('/:breachId/notify-data-subjects', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { breachId } = req.params;
    const { affected_users } = req.body;

    if (!affected_users || !Array.isArray(affected_users)) {
      return res.status(400).json({
        success: false,
        message: 'affected_users array is required'
      });
    }

    const result = await breachNotificationService.notifyDataSubjects(breachId, affected_users);

    res.json({
      success: true,
      message: `Notifications queued for ${result.notified_count} users`,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to notify data subjects',
      error: error.message
    });
  }
});

/**
 * @route POST /api/admin/breach/:breachId/send-odpc-notification
 * @desc Manually trigger ODPC notification
 * @access Admin only
 */
router.post('/:breachId/send-odpc-notification', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { breachId } = req.params;
    const breach = breachNotificationService.getBreachIncident(breachId);

    if (!breach) {
      return res.status(404).json({
        success: false,
        message: 'Breach incident not found'
      });
    }

    if (breach.odpc_notified) {
      return res.status(400).json({
        success: false,
        message: 'ODPC has already been notified for this breach'
      });
    }

    const result = await breachNotificationService.sendODPCNotification(breach);

    res.json({
      success: true,
      message: 'ODPC notification sent successfully',
      data: result.notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send ODPC notification',
      error: error.message
    });
  }
});

export default router;
