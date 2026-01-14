/**
 * Guard Management Routes
 * Phase 2.5: Complete guard management API endpoints
 */

import express from 'express';
import guardManagementService from '../services/guardManagementService.js';
import { authenticateToken, requireEstate } from '../middleware/authMiddleware.js';
import { requireRolePolicy } from '../middleware/rolePolicy.js';

const router = express.Router();

/**
 * @route GET /api/guards
 * @desc Get all guards with performance data
 * @access Admin only
 */
router.get('/', authenticateToken, requireEstate, requireRolePolicy('adminOnly'), async (req, res) => {
  try {
    const guards = await guardManagementService.getGuards(req.user.estate_id);

    res.json({
      success: true,
      data: guards
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve guards',
      error: error.message
    });
  }
});

/**
 * @route GET /api/guards/dashboard
 * @desc Get guard dashboard data
 * @access Guard role
 */
router.get('/dashboard', authenticateToken, requireEstate, requireRolePolicy('guardOnly'), async (req, res) => {
  try {
    const guardId = req.user.id;
    const estateId = req.user.estate_id;

    const dashboard = await guardManagementService.getGuardDashboard(guardId, estateId);

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard',
      error: error.message
    });
  }
});

/**
 * @route POST /api/guards/shifts
 * @desc Create a new shift
 * @access Admin only
 */
router.post('/shifts', authenticateToken, requireEstate, requireRolePolicy('adminOnly'), async (req, res) => {
  try {
    const { guard_id, shift_type, start_time, end_time, post_location, notes } = req.body;

    if (!guard_id || !shift_type || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: guard_id, shift_type, start_time, end_time'
      });
    }

    const shift = await guardManagementService.createShift({
      guard_id,
      shift_type,
      start_time,
      end_time,
      post_location,
      notes,
      estate_id: req.user.estate_id
    });

    res.status(201).json({
      success: true,
      message: 'Shift created successfully',
      data: shift
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create shift',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/guards/shifts/:shiftId
 * @desc Update a scheduled shift
 * @access Admin only
 */
router.put('/shifts/:shiftId', authenticateToken, requireEstate, requireRolePolicy('adminOnly'), async (req, res) => {
  try {
    const { shiftId } = req.params;
    const {
      guard_id,
      shift_type,
      start_time,
      end_time,
      post_location,
      notes,
      status
    } = req.body;

    if ((start_time && !end_time) || (!start_time && end_time)) {
      return res.status(400).json({
        success: false,
        message: 'start_time and end_time must be provided together'
      });
    }

    const shift = await guardManagementService.updateShift(shiftId, {
      guard_id,
      shift_type,
      start_time,
      end_time,
      post_location,
      notes,
      status
    }, req.user.estate_id);

    res.json({
      success: true,
      message: 'Shift updated successfully',
      data: shift
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update shift',
      error: error.message
    });
  }
});

/**
 * @route GET /api/guards/shifts
 * @desc Get shifts for a date range
 * @access Admin, Guard
 */
router.get('/shifts', authenticateToken, requireEstate, requireRolePolicy('adminOrGuard'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'start_date and end_date are required'
      });
    }

    const shifts = await guardManagementService.getShifts(
      start_date,
      end_date,
      req.user.estate_id
    );

    res.json({
      success: true,
      data: shifts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve shifts',
      error: error.message
    });
  }
});

/**
 * @route POST /api/guards/shifts/:shiftId/start
 * @desc Start a shift (check-in)
 * @access Guard only
 */
router.post('/shifts/:shiftId/start', authenticateToken, requireEstate, requireRolePolicy('guardOnly'), async (req, res) => {
  try {
    const { shiftId } = req.params;
    const guardId = req.user.id;

    const shift = await guardManagementService.startShift(shiftId, guardId, req.user.estate_id);

    res.json({
      success: true,
      message: 'Shift started successfully',
      data: shift
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to start shift',
      error: error.message
    });
  }
});

/**
 * @route POST /api/guards/shifts/:shiftId/end
 * @desc End a shift (check-out)
 * @access Guard only
 */
router.post('/shifts/:shiftId/end', authenticateToken, requireEstate, requireRolePolicy('guardOnly'), async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { handover_notes } = req.body;
    const guardId = req.user.id;

    const shift = await guardManagementService.endShift(shiftId, guardId, handover_notes, req.user.estate_id);

    res.json({
      success: true,
      message: 'Shift ended successfully',
      data: shift
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to end shift',
      error: error.message
    });
  }
});

/**
 * @route POST /api/guards/handover
 * @desc Create handover note
 * @access Guard only
 */
router.post('/handover', authenticateToken, requireEstate, requireRolePolicy('guardOnly'), async (req, res) => {
  try {
    const { shift_id, to_guard_id, notes, incidents_summary, equipment_status } = req.body;

    if (!shift_id || !notes) {
      return res.status(400).json({
        success: false,
        message: 'shift_id and notes are required'
      });
    }

    const handover = await guardManagementService.createHandoverNote({
      shift_id,
      from_guard_id: req.user.id,
      to_guard_id,
      notes,
      incidents_summary,
      equipment_status,
      estate_id: req.user.estate_id
    });

    res.status(201).json({
      success: true,
      message: 'Handover note created successfully',
      data: handover
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create handover note',
      error: error.message
    });
  }
});

/**
 * @route GET /api/guards/handover/:shiftId
 * @desc Get handover notes for a shift
 * @access Guard, Admin
 */
router.get('/handover/:shiftId', authenticateToken, requireEstate, requireRolePolicy('adminOrGuard'), async (req, res) => {
  try {
    const { shiftId } = req.params;
    const notes = await guardManagementService.getHandoverNotes(shiftId, req.user.estate_id);

    res.json({
      success: true,
      data: notes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve handover notes',
      error: error.message
    });
  }
});

/**
 * @route POST /api/guards/performance
 * @desc Record performance metric
 * @access Admin only
 */
router.post('/performance', authenticateToken, requireEstate, requireRolePolicy('adminOnly'), async (req, res) => {
  try {
    const { guard_id, shift_id, metric_type, rating, notes } = req.body;

    if (!guard_id || !metric_type || rating === undefined) {
      return res.status(400).json({
        success: false,
        message: 'guard_id, metric_type, and rating are required'
      });
    }

    const metric = await guardManagementService.recordPerformanceMetric({
      guard_id,
      shift_id,
      metric_type,
      rating,
      notes,
      recorded_by: req.user.id,
      estate_id: req.user.estate_id
    });

    res.status(201).json({
      success: true,
      message: 'Performance metric recorded',
      data: metric
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to record performance metric',
      error: error.message
    });
  }
});

/**
 * @route GET /api/guards/:guardId/performance
 * @desc Get performance metrics for a guard
 * @access Admin, Guard (own metrics)
 */
router.get('/:guardId/performance', authenticateToken, requireEstate, requireRolePolicy('adminOrGuard'), async (req, res) => {
  try {
    const { guardId } = req.params;
    const { start_date, end_date } = req.query;

    // Guards can only view their own metrics
    if (req.user.role === 'guard' && req.user.id !== parseInt(guardId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own performance metrics'
      });
    }

    const metrics = await guardManagementService.getPerformanceMetrics(
      guardId,
      start_date || null,
      end_date || null,
      req.user.estate_id
    );

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve performance metrics',
      error: error.message
    });
  }
});

/**
 * @route POST /api/guards/equipment/checkout
 * @desc Checkout equipment
 * @access Guard, Admin
 */
router.post('/equipment/checkout', authenticateToken, requireEstate, requireRolePolicy('adminOrGuard'), async (req, res) => {
  try {
    const { guard_id, shift_id, equipment_type, equipment_id, notes } = req.body;
    const isAdmin = req.user.role === 'admin';
    const guardId = isAdmin ? guard_id : req.user.id;

    if (!equipment_type || !equipment_id) {
      return res.status(400).json({
        success: false,
        message: 'equipment_type and equipment_id are required'
      });
    }

    if (isAdmin && !guardId) {
      return res.status(400).json({
        success: false,
        message: 'guard_id is required when admin checks out equipment'
      });
    }

    const checkout = await guardManagementService.checkoutEquipment({
      guard_id: guardId,
      shift_id,
      equipment_type,
      equipment_id,
      notes,
      estate_id: req.user.estate_id
    });

    res.status(201).json({
      success: true,
      message: 'Equipment checked out successfully',
      data: checkout
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to checkout equipment',
      error: error.message
    });
  }
});

/**
 * @route POST /api/guards/equipment/:checkoutId/return
 * @desc Return equipment
 * @access Guard, Admin
 */
router.post('/equipment/:checkoutId/return', authenticateToken, requireEstate, requireRolePolicy('adminOrGuard'), async (req, res) => {
  try {
    const { checkoutId } = req.params;
    const { guard_id, condition, notes } = req.body;
    const isAdmin = req.user.role === 'admin';
    const guardId = isAdmin ? guard_id : req.user.id;

    if (isAdmin && !guardId) {
      return res.status(400).json({
        success: false,
        message: 'guard_id is required when admin returns equipment'
      });
    }

    const returned = await guardManagementService.returnEquipment(
      checkoutId,
      guardId,
      condition || 'good',
      notes,
      req.user.estate_id
    );

    res.json({
      success: true,
      message: 'Equipment returned successfully',
      data: returned
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to return equipment',
      error: error.message
    });
  }
});

/**
 * @route GET /api/guards/equipment
 * @desc Get equipment checkout status
 * @access Guard, Admin
 */
router.get('/equipment', authenticateToken, requireEstate, requireRolePolicy('adminOrGuard'), async (req, res) => {
  try {
    const { guard_id, status } = req.query;
    const guardId = req.user.role === 'guard' ? req.user.id : (guard_id || null);

    const checkouts = await guardManagementService.getEquipmentCheckouts(guardId, status || null, req.user.estate_id);

    res.json({
      success: true,
      data: checkouts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve equipment checkouts',
      error: error.message
    });
  }
});

/**
 * @route POST /api/guards/:guardId/training
 * @desc Add training record
 * @access Admin only
 */
router.post('/:guardId/training', authenticateToken, requireEstate, requireRolePolicy('adminOnly'), async (req, res) => {
  try {
    const { guardId } = req.params;
    const {
      training_type,
      training_name,
      completion_date,
      expiry_date,
      certificate_number,
      notes
    } = req.body;

    if (!training_type || !training_name || !completion_date) {
      return res.status(400).json({
        success: false,
        message: 'training_type, training_name, and completion_date are required'
      });
    }

    const training = await guardManagementService.addTrainingRecord({
      guard_id: guardId,
      training_type,
      training_name,
      completion_date,
      expiry_date,
      certificate_number,
      notes,
      estate_id: req.user.estate_id
    });

    res.status(201).json({
      success: true,
      message: 'Training record added successfully',
      data: training
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add training record',
      error: error.message
    });
  }
});

/**
 * @route GET /api/guards/:guardId/training
 * @desc Get training records
 * @access Guard (own), Admin (all)
 */
router.get('/:guardId/training', authenticateToken, requireEstate, requireRolePolicy('adminOrGuard'), async (req, res) => {
  try {
    const { guardId } = req.params;

    // Guards can only view their own training
    if (req.user.role === 'guard' && req.user.id !== parseInt(guardId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own training records'
      });
    }

    const training = await guardManagementService.getTrainingRecords(guardId, req.user.estate_id);

    res.json({
      success: true,
      data: training
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve training records',
      error: error.message
    });
  }
});

export default router;
