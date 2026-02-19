/**
 * Guard Routes
 * Routes for guard-specific operations
 * SECURITY: All queries filter by estate_id
 */

import express from 'express';
import { dbManager } from '../database/db.enhanced.js';
import { authenticateToken, authorize } from '../middleware/authMiddleware.js';
import auditLoggerFactory from '../middleware/auditLogger.js';
import { asyncHandler, AppError } from '../middleware/standardizedErrorHandler.js';
import { successResponse } from '../utils/responseFormatter.js';
import { minimizeData } from '../middleware/dataMinimization.js';
import { PASS_STATUS } from '../constants/statuses.js';

const router = express.Router();
const attachRequestAudit = auditLoggerFactory();

/**
 * Get visitor history (past check-ins and check-outs)
 * GET /api/guard/visitor-history
 * 
 * Returns all visitors that have been checked out or are currently on premise
 * Filtered by the guard's estate for security
 */
router.get('/visitor-history',
  authenticateToken,
  authorize(['guard', 'admin', 'super_admin']),
  minimizeData('visitor'),
  attachRequestAudit,
  asyncHandler(async (req, res) => {
    // SECURITY: Require estate context
    if (!req.user.estate_id) {
      throw new AppError('Estate context required', 400);
    }

    // Get visitors that have been checked out (completed visits)
    // Also include status ON_PREMISE for current visitors
    const result = await dbManager.query(`
      SELECT 
        v.id,
        v.name as visitor_name,
        v.phone,
        v.email,
        v.status,
        v.check_in_time,
        v.check_out_time,
        v.created_at,
        u.username as resident_name,
        u.unit_number as resident_unit
      FROM visitors v
      LEFT JOIN users u ON v.host_id = u.id
      WHERE v.estate_id = $1
        AND v.status IN ($2, $3)
      ORDER BY 
        COALESCE(v.check_out_time, v.check_in_time, v.created_at) DESC
      LIMIT 100
    `, [req.user.estate_id, PASS_STATUS.CHECKED_OUT, PASS_STATUS.ON_PREMISE]);

    await req.audit?.('visitor.history.view', 'visitor', null, {
      outcome: 'success',
      message: 'Viewed visitor history',
      count: result.rows.length
    });

    return successResponse(res, result.rows, 'Visitor history retrieved');
  })
);

/**
 * Get all residents for the guard's estate
 * GET /api/guard/residents
 * 
 * Used for delivery registration and visitor check-in
 * Returns minimal resident details
 */
router.get('/residents',
  authenticateToken,
  authorize(['guard', 'admin', 'super_admin']),
  minimizeData('user'),
  attachRequestAudit,
  asyncHandler(async (req, res) => {
    // SECURITY: Require estate context
    if (!req.user.estate_id) {
      throw new AppError('Estate context required', 400);
    }

    const result = await dbManager.query(`
            SELECT id, username, unit_number, phone
            FROM users 
            WHERE role = 'resident' 
            AND estate_id = $1
            AND account_status = 'active'
            ORDER BY unit_number ASC, username ASC
        `, [req.user.estate_id]);

    return successResponse(res, result.rows, 'Residents retrieved successfully');
  })
);

export default router;
