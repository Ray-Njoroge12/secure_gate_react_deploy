/**
 * Emergency Panic Button Routes
 * Phase 1.1: Guard Panic Button API Endpoints
 * 
 * Privacy Features:
 * - Guards can only view their own emergency history
 * - Admins see aggregate stats, not individual patterns
 * - Location data access-controlled and time-limited
 * 
 * @module routes/emergencyRoutes
 */

import express from 'express';
import emergencyService from '../services/emergencyService.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import loggingService from '../services/loggingService.js';
import { errorResponse } from '../utils/responseFormatter.js';
import { maskEmail } from '../utils/redaction.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route POST /api/emergency/panic
 * @desc Trigger panic button alert
 * @access Guards only
 * 
 * Privacy: Captures GPS only at this moment, not continuously
 */
router.post('/panic', requireRole(['guard', 'resident']), async (req, res) => {
  try {
    const guardId = req.user.id;
    const { latitude, longitude, accuracy, gateId } = req.body;

    const result = await emergencyService.triggerPanicButton(
      guardId,
      { latitude, longitude, accuracy },
      gateId
    );

    // Emit real-time event to all connected admins/guards
    if (req.app.locals.io) {
      const guardName = result.guard.username || '';
      const safeGuardName = guardName.includes('@') ? maskEmail(guardName) : guardName;
      req.app.locals.io.emit('emergency:triggered', {
        emergencyId: result.emergency.id,
        guardName: safeGuardName,
        triggeredAt: result.emergency.triggered_at,
        hasLocation: !!(latitude && longitude),
        // Privacy: Don't broadcast exact coordinates
      });
    }

    res.status(201).json({
      success: true,
      message: 'Emergency alert triggered. Help is on the way.',
      data: {
        emergencyId: result.emergency.id,
        status: result.emergency.status,
        triggeredAt: result.emergency.triggered_at,
        recipientCount: result.recipients.length,
        canCancel: true,
        cancelWindow: 30 // seconds
      }
    });

  } catch (error) {
    loggingService.logError('PANIC_ROUTE_ERROR', { error: error.message });

    if (error.message.includes('cooldown')) {
      return errorResponse(res, error.message, 'RATE_LIMITED', 429, null, req);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to trigger emergency alert',
      error: error.message
    });
  }
});

/**
 * @route POST /api/emergency/:id/cancel
 * @desc Cancel panic alert within 30 seconds (guard who triggered only)
 * @access Guards only
 */
router.post('/:id/cancel', requireRole(['guard', 'resident']), async (req, res) => {
  try {
    const emergencyId = parseInt(req.params.id);
    const guardId = req.user.id;

    const result = await emergencyService.cancelEmergency(emergencyId, guardId);

    // Notify others that alert was cancelled
    if (req.app.locals.io) {
      req.app.locals.io.emit('emergency:cancelled', {
        emergencyId,
        cancelledAt: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Emergency alert cancelled',
      data: {
        emergencyId: result.id,
        status: result.status
      }
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route POST /api/emergency/:id/acknowledge
 * @desc Acknowledge an emergency (admin or guard responding)
 * @access Admins and Guards
 */
router.post('/:id/acknowledge', requireRole(['admin', 'guard']), async (req, res) => {
  try {
    const emergencyId = parseInt(req.params.id);
    const responderId = req.user.id;

    const result = await emergencyService.acknowledgeEmergency(emergencyId, responderId);

    // Notify everyone that help is responding
    if (req.app.locals.io) {
      const acknowledgedBy = req.user.username || '';
      const safeAcknowledgedBy = acknowledgedBy.includes('@')
        ? maskEmail(acknowledgedBy)
        : acknowledgedBy;
      req.app.locals.io.emit('emergency:acknowledged', {
        emergencyId,
        acknowledgedBy: safeAcknowledgedBy,
        acknowledgedAt: result.acknowledged_at
      });
    }

    res.json({
      success: true,
      message: 'Emergency acknowledged. Responding...',
      data: {
        emergencyId: result.id,
        status: result.status,
        acknowledgedAt: result.acknowledged_at
      }
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route POST /api/emergency/:id/resolve
 * @desc Resolve an emergency (admin only)
 * @access Admins only
 */
router.post('/:id/resolve', requireRole(['admin']), async (req, res) => {
  try {
    const emergencyId = parseInt(req.params.id);
    const resolverId = req.user.id;
    const { notes, isFalseAlarm, falseAlarmReason } = req.body;

    const result = await emergencyService.resolveEmergency(
      emergencyId,
      resolverId,
      { notes, isFalseAlarm, falseAlarmReason }
    );

    // Notify everyone that emergency is resolved
    if (req.app.locals.io) {
      req.app.locals.io.emit('emergency:resolved', {
        emergencyId,
        resolvedAt: result.resolved_at,
        isFalseAlarm: result.is_false_alarm
      });
    }

    res.json({
      success: true,
      message: 'Emergency resolved',
      data: {
        emergencyId: result.id,
        status: result.status,
        resolvedAt: result.resolved_at
      }
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route GET /api/emergency/active
 * @desc Get all active emergencies
 * @access Admins and Guards
 */
router.get('/active', requireRole(['admin', 'guard']), async (req, res) => {
  try {
    const emergencies = await emergencyService.getActiveEmergencies(req.user.estate_id);

    // For guards, redact exact location coordinates
    const sanitizedEmergencies = emergencies.map(e => {
      if (req.user.role !== 'admin') {
        return {
          ...e,
          latitude: e.latitude ? '[Location available]' : null,
          longitude: e.longitude ? '[Location available]' : null,
          location_accuracy: null
        };
      }
      return e;
    });

    res.json({
      success: true,
      data: sanitizedEmergencies,
      count: sanitizedEmergencies.length
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active emergencies',
      error: error.message
    });
  }
});

/**
 * @route GET /api/emergency/my-history
 * @desc Get guard's own emergency history (privacy: only their own)
 * @access Guards only
 */
router.get('/my-history', requireRole(['guard']), async (req, res) => {
  try {
    const guardId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const history = await emergencyService.getGuardEmergencyHistory(guardId, limit);

    res.json({
      success: true,
      data: history,
      count: history.length,
      privacy_notice: 'This shows only your own emergency history. Location data is not included.'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch emergency history',
      error: error.message
    });
  }
});

/**
 * @route GET /api/emergency/:id
 * @desc Get emergency details
 * @access Admins or the guard who triggered
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const emergencyId = parseInt(req.params.id);
    const requesterId = req.user.id;

    const emergency = await emergencyService.getEmergencyDetails(emergencyId, requesterId);

    res.json({
      success: true,
      data: emergency
    });

  } catch (error) {
    if (error.message.includes('Access denied')) {
      return errorResponse(res, error.message, 'FORBIDDEN', 403, null, req);
    }

    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route GET /api/emergency/stats/aggregate
 * @desc Get aggregate emergency statistics (privacy-safe)
 * @access Admins only
 */
router.get('/stats/aggregate', requireRole(['admin']), async (req, res) => {
  try {
    const period = req.query.period || 'month';

    const stats = await emergencyService.getEmergencyStats(period, req.user.estate_id);

    res.json({
      success: true,
      data: stats,
      privacy_notice: 'These are aggregate statistics only. Individual guard patterns are not tracked.'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

/**
 * @route GET /api/emergency/privacy-info
 * @desc Get privacy information about panic button data handling
 * @access All authenticated users
 */
router.get('/privacy-info', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    data: {
      title: 'Panic Button Privacy Information',
      lastUpdated: '2025-11-27',
      policies: [
        {
          item: 'Location Capture',
          description: 'Your GPS location is captured ONLY at the moment you press the panic button. We do not continuously track your location.'
        },
        {
          item: 'Data Retention',
          description: 'Location data is automatically deleted 90 days after the emergency is resolved.'
        },
        {
          item: 'Access Control',
          description: 'Only you and administrators can view your emergency history. Other guards cannot see your records.'
        },
        {
          item: 'No Performance Tracking',
          description: 'Panic button usage is not used for performance reviews or disciplinary purposes. False alarms are handled without penalty.'
        },
        {
          item: 'Data Export',
          description: 'You can request a copy of your emergency history through the Privacy Dashboard.'
        }
      ]
    }
  });
});

export default router;
