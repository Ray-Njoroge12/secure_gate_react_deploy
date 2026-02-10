/**
 * Guard Management Routes
 * Phase 2.5: Complete guard management API endpoints
 */

import express from 'express';
import guardManagementService from '../services/guardManagementService.js';
import { userService } from '../services/userService.js';
import { authenticateToken, requireEstate } from '../middleware/authMiddleware.js';
import { requireRolePolicy } from '../middleware/rolePolicy.js';
import { errorResponse } from '../utils/responseFormatter.js';

const router = express.Router();

/**
 * @route GET /api/guards
 * @desc Get all guards with performance data
 * @access Admin only
 */
router.get('/', authenticateToken, requireEstate, requireRolePolicy('adminOnly'), async (req, res) => {
  try {
    const guards = await guardManagementService.getGuards(req.user.estate_id);

    // FIX P1-8: Include fields needed for admin management UI
    // Map fields for frontend compatibility (account_status → status, is_active compatibility)
    const sanitizedGuards = guards.map(g => ({
      id: g.id,
      username: g.username,
      email: g.email, // Required for admin contact
      phone: g.phone || g.phone_number, // Required for admin contact
      role: g.role,
      // FIX: Provide both account_status and status for compatibility
      account_status: g.account_status || (g.is_active ? 'active' : 'inactive'),
      status: g.account_status || (g.is_active ? 'active' : 'inactive'),
      last_login: g.last_login,
      metrics: {
        total_shifts: parseInt(g.total_shifts || 0),
        completed_shifts: parseInt(g.completed_shifts || 0),
        incidents_handled: parseInt(g.incidents_handled || 0),
        avg_rating: parseFloat(g.avg_rating || 0).toFixed(1)
      }
    }));

    res.json({
      success: true,
      data: sanitizedGuards
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
 * @route POST /api/guards
 * @desc Create a new guard
 * @access Admin only
 */
router.post('/', authenticateToken, requireEstate, requireRolePolicy('adminOnly'), async (req, res) => {
  try {
    const { username, first_name, last_name, email, password, phone } = req.body;

    if (!username || !email || !password || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: username, first_name, last_name, email, password'
      });
    }

    const newGuard = await userService.createUser({
      username,
      first_name,
      last_name,
      email,
      password,
      phone,
      role: 'guard',
      estate_id: req.user.estate_id,
      account_status: 'active' // Guards created by admin are active by default
    });

    res.status(201).json({
      success: true,
      message: 'Guard created successfully',
      data: newGuard
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to create guard',
      error: error.code
    });
  }
});

/**
 * @route PUT /api/guards/:id
 * @desc Update a guard
 * @access Admin only
 */
router.put('/:id', authenticateToken, requireEstate, requireRolePolicy('adminOnly'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verify guard exists and belongs to estate
    const existingGuard = await userService.getUserById(id);
    if (!existingGuard || existingGuard.estate_id !== req.user.estate_id || existingGuard.role !== 'guard') {
      return res.status(404).json({
        success: false,
        message: 'Guard not found'
      });
    }

    // Prevent updating critical fields via this endpoint if needed, but userService.updateUser limits fields
    const updatedGuard = await userService.updateUser(id, updates);

    res.json({
      success: true,
      message: 'Guard updated successfully',
      data: updatedGuard
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to update guard'
    });
  }
});

/**
 * @route DELETE /api/guards/:id
 * @desc Delete a guard
 * @access Admin only
 */
router.delete('/:id', authenticateToken, requireEstate, requireRolePolicy('adminOnly'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verify guard exists and belongs to estate
    const existingGuard = await userService.getUserById(id);
    if (!existingGuard || existingGuard.estate_id !== req.user.estate_id || existingGuard.role !== 'guard') {
      return res.status(404).json({
        success: false,
        message: 'Guard not found'
      });
    }

    await userService.deleteUser(id);

    res.json({
      success: true,
      message: 'Guard deleted successfully'
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to delete guard'
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
      return errorResponse(res, 'You can only view your own performance metrics', 'FORBIDDEN', 403, null, req);
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
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
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
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
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
      return errorResponse(res, 'You can only view your own training records', 'FORBIDDEN', 403, null, req);
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

/**
 * @route GET /api/guards/offline-policy
 * @desc Get offline cache policy configuration for guard devices
 * @access Guard, Admin
 */
router.get('/offline-policy', authenticateToken, requireEstate, requireRolePolicy('adminOrGuard'), async (req, res) => {
  try {
    // Get estate-specific offline policy or use defaults
    // In the future, this could be configurable per estate
    const defaultPolicy = {
      visitorRetentionHours: 8,       // Keep visitor data for 8 hours
      cacheRetentionHours: 24,        // Keep API cache for 24 hours
      inactivityMinutes: 30,          // Purge on 30 min inactivity
      walkInRetentionHours: 24,       // Keep walk-in data for 24 hours
      qrCacheRetentionHours: 12,      // Keep QR cache for 12 hours
      maxCachedVisitors: 200,         // Max visitors to cache
      syncIntervalMinutes: 15,        // Auto-sync every 15 minutes when online
      offlineCheckInEnabled: true,    // Allow offline check-ins
      offlineWalkInEnabled: true      // Allow offline walk-in registration
    };
    
    // TODO: Fetch from estate_settings table when implemented
    // const estateSettings = await getEstateSettings(req.user.estate_id);
    // const policy = { ...defaultPolicy, ...estateSettings.offlinePolicy };
    
    res.json({
      success: true,
      data: defaultPolicy
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve offline policy',
      error: error.message
    });
  }
});

/**
 * @route GET /api/guards/qr-cache
 * @desc Get today's expected visitors for QR code offline validation
 * @access Guard only
 */
router.get('/qr-cache', authenticateToken, requireEstate, requireRolePolicy('guardOnly'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's expected visitors with minimal data for offline QR validation
    const query = `
      SELECT 
        v.id as visitor_id,
        v.qr_code,
        v.name,
        v.phone,
        v.status,
        v.date_of_visit as valid_date,
        v.time_of_visit as valid_time,
        u.username as host_name,
        u.unit_number as host_unit
      FROM visitors v
      LEFT JOIN users u ON v.user_id = u.id
      WHERE v.estate_id = $1
        AND v.date_of_visit = $2
        AND v.status IN ('APPROVED', 'VERIFIED', 'OTP_SENT', 'PENDING')
      ORDER BY v.time_of_visit ASC
      LIMIT 500
    `;
    
    const { dbManager } = await import('../database/db.enhanced.js');
    const result = await dbManager.query(query, [req.user.estate_id, today]);
    
    // Transform for offline cache with valid_until timestamp
    const qrCacheData = result.rows.map(row => {
      // Calculate valid_until as end of visit date + 2 hours buffer
      const visitDate = new Date(row.valid_date);
      visitDate.setHours(23, 59, 59, 999);
      visitDate.setHours(visitDate.getHours() + 2); // 2 hour buffer after midnight
      
      return {
        qr_code: row.qr_code,
        visitor_id: row.visitor_id,
        name: row.name,
        phone: row.phone ? row.phone.slice(-4) : null, // Only last 4 digits for privacy
        status: row.status,
        host_name: row.host_name,
        host_unit: row.host_unit,
        valid_until: visitDate.toISOString()
      };
    });
    
    res.json({
      success: true,
      data: {
        visitors: qrCacheData,
        count: qrCacheData.length,
        cacheDate: today,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() // 12 hours
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve QR cache data',
      error: error.message
    });
  }
});

/**
 * @route POST /api/guards/sync-offline-actions
 * @desc Sync offline check-ins and walk-ins
 * @access Guard only
 */
router.post('/sync-offline-actions', authenticateToken, requireEstate, requireRolePolicy('guardOnly'), async (req, res) => {
  try {
    const { checkIns = [], walkIns = [] } = req.body;
    const results = {
      checkIns: { synced: 0, failed: 0, errors: [] },
      walkIns: { synced: 0, failed: 0, errors: [] }
    };
    
    const { dbManager } = await import('../database/db.enhanced.js');
    
    // Process offline check-ins
    for (const checkIn of checkIns) {
      try {
        // Validate the check-in
        const visitorCheck = await dbManager.query(
          'SELECT id, status FROM visitors WHERE id = $1 AND estate_id = $2',
          [checkIn.visitor_id, req.user.estate_id]
        );
        
        if (visitorCheck.rows.length === 0) {
          results.checkIns.errors.push({
            localId: checkIn.localId,
            error: 'Visitor not found'
          });
          results.checkIns.failed++;
          continue;
        }
        
        const action = checkIn.action || 'check-in';
        const newStatus = action === 'check-in' ? 'ON_PREMISE' : 'CHECKED_OUT';
        const timeField = action === 'check-in' ? 'check_in' : 'check_out';
        
        // Use the offline timestamp if provided
        const actionTime = checkIn.timestamp 
          ? new Date(checkIn.timestamp).toISOString()
          : new Date().toISOString();
        
        await dbManager.query(
          `UPDATE visitors SET status = $1, ${timeField} = $2, updated_at = NOW() WHERE id = $3`,
          [newStatus, actionTime, checkIn.visitor_id]
        );
        
        results.checkIns.synced++;
      } catch (error) {
        results.checkIns.errors.push({
          localId: checkIn.localId,
          error: error.message
        });
        results.checkIns.failed++;
      }
    }
    
    // Process offline walk-ins
    for (const walkIn of walkIns) {
      try {
        // Check for duplicate by phone + date
        const duplicateCheck = await dbManager.query(
          `SELECT id FROM visitors 
           WHERE phone = $1 AND date_of_visit = $2 AND estate_id = $3`,
          [walkIn.phone, walkIn.dateOfVisit, req.user.estate_id]
        );
        
        if (duplicateCheck.rows.length > 0) {
          results.walkIns.errors.push({
            localId: walkIn.localId,
            error: 'Duplicate registration',
            existingId: duplicateCheck.rows[0].id
          });
          results.walkIns.failed++;
          continue;
        }
        
        // Find the resident by house number
        const residentQuery = await dbManager.query(
          `SELECT id FROM users 
           WHERE unit_number = $1 AND estate_id = $2 AND role = 'resident'`,
          [walkIn.houseNumber, req.user.estate_id]
        );
        
        const residentId = residentQuery.rows[0]?.id || null;
        
        // Insert the walk-in visitor
        const insertResult = await dbManager.query(
          `INSERT INTO visitors (
            name, phone, purpose, user_id, estate_id, 
            date_of_visit, time_of_visit, status, is_walk_in,
            vehicle_plate, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          RETURNING id`,
          [
            walkIn.name,
            walkIn.phone,
            walkIn.purpose || 'Walk-in visit',
            residentId,
            req.user.estate_id,
            walkIn.dateOfVisit,
            walkIn.timeOfVisit,
            'PENDING',
            true,
            walkIn.vehiclePlate || null
          ]
        );
        
        results.walkIns.synced++;
      } catch (error) {
        results.walkIns.errors.push({
          localId: walkIn.localId,
          error: error.message
        });
        results.walkIns.failed++;
      }
    }
    
    res.json({
      success: true,
      message: 'Offline actions synced',
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to sync offline actions',
      error: error.message
    });
  }
});

export default router;
