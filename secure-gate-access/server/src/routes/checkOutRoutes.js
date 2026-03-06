/**
 * Check-Out Routes
 * Routes for visitor check-out operations
 * SECURITY: All queries filter by estate_id
 */

import express from 'express';
import { authenticateToken, authorize } from '../middleware/authMiddleware.js';
import { attachRequestAudit } from '../middleware/auditLogging.js';
import { asyncHandler, AppError, ERROR_CODES } from '../middleware/standardizedErrorHandler.js';
import { successResponse } from '../utils/responseFormatter.js';
import { dbManager } from '../database/db.enhanced.js';
import { PASS_STATUS } from '../constants/statuses.js';
import { minimizeData } from '../middleware/dataMinimization.js';

const router = express.Router();

/**
 * Check out visitor by QR code
 * POST /api/check-out/qr
 */
router.post('/qr', authenticateToken, authorize(['guard', 'admin', 'super_admin']), attachRequestAudit, asyncHandler(async (req, res) => {
  const { qrCode, notes } = req.body;
  const guardId = req.user.id;

  // GUARD-003 FIX: Validate that user is actually a guard or admin
  if (!['guard', 'admin', 'super_admin'].includes(req.user.role)) {
    throw new AppError('Only guards and admins can perform check-out operations', 403, 'UNAUTHORIZED_ROLE');
  }

  if (!qrCode) {
    throw new AppError('QR code is required', 400, ERROR_CODES.VALIDATION_REQUIRED_FIELD, { field: 'qrCode' });
  }

  // SECURITY: Require estate context
  if (!req.user.estate_id) {
    throw new AppError('Estate context required', 400, 'ESTATE_REQUIRED');
  }

  let parsedQrData = null;
  try {
    parsedQrData = JSON.parse(qrCode);
  } catch {
    parsedQrData = { token: qrCode };
  }

  // Find visitor by QR code - filtered by estate
  const visitorQuery = await dbManager.query(
    'SELECT * FROM visitors WHERE (qr_code::text = $1 OR visitor_token = $1) AND estate_id = $2',
    [parsedQrData.token || qrCode, req.user.estate_id]
  );

  if (visitorQuery.rows.length === 0) {
    throw new AppError('Invalid QR code', 404, ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  const visitorData = visitorQuery.rows[0];

  // Validate visitor status
  if (visitorData.status !== PASS_STATUS.ON_PREMISE) {
    throw new AppError('Visitor is not currently checked in', 400, ERROR_CODES.BUSINESS_RULE_VIOLATION);
  }

  // Perform check-out with estate_id filter
  const result = await dbManager.query(
    `UPDATE visitors 
     SET status = $1, 
         check_out_time = NOW(), 
         check_out_guard_id = $2,
         check_out_notes = $3,
         updated_at = NOW()
     WHERE id = $4 AND estate_id = $5
     RETURNING *`,
    [PASS_STATUS.CHECKED_OUT, guardId, notes, visitorData.id, req.user.estate_id]
  );

  // Log access
  await dbManager.query(
    `INSERT INTO access_logs (entity_type, entity_id, action, user_id, message, log_time)
     VALUES ('visitor', $1, 'check_out_qr', $2, $3, NOW())`,
    [String(visitorData.id), guardId, notes]
  );

  return successResponse(res, result.rows[0], 'Visitor checked out via QR code');
}));

/**
 * Check out a visitor by ID
 * POST /api/check-out/:visitorId
 */
router.post('/:visitorId', authenticateToken, authorize(['guard', 'admin', 'super_admin']), attachRequestAudit, asyncHandler(async (req, res) => {
  const { visitorId } = req.params;
  const guardId = req.user.id;
  const { notes } = req.body;

  // SECURITY: Require estate context
  if (!req.user.estate_id) {
    throw new AppError('Estate context required', 400);
  }

  // Verify visitor exists in this estate
  const visitor = await dbManager.query(
    'SELECT * FROM visitors WHERE id = $1 AND estate_id = $2',
    [visitorId, req.user.estate_id]
  );

  if (visitor.rows.length === 0) {
    throw new AppError('Visitor not found', 404);
  }

  const visitorData = visitor.rows[0];

  // Check if visitor is checked in
  if (visitorData.status !== PASS_STATUS.ON_PREMISE) {
    throw new AppError('Visitor is not currently checked in', 400);
  }

  // Perform check-out with estate_id filter
  const result = await dbManager.query(
    `UPDATE visitors 
     SET status = $1, 
         check_out_time = NOW(), 
         check_out_guard_id = $2,
         check_out_notes = $3,
         updated_at = NOW()
     WHERE id = $4 AND estate_id = $5
     RETURNING *`,
    [PASS_STATUS.CHECKED_OUT, guardId, notes, visitorId, req.user.estate_id]
  );

  // Log access
  await dbManager.query(
    `INSERT INTO access_logs (entity_type, entity_id, action, user_id, message, log_time)
     VALUES ('visitor', $1, 'check_out', $2, $3, NOW())`,
    [String(visitorId), guardId, notes]
  );

  return successResponse(res, result.rows[0], 'Visitor checked out successfully');
}));

/**
 * Get today's check-outs
 * GET /api/check-out/today
 */
router.get('/today', authenticateToken, authorize(['guard', 'admin', 'super_admin']), minimizeData('check-out'), asyncHandler(async (req, res) => {
  // SECURITY: Filter by estate_id
  const result = await dbManager.query(
    `SELECT v.*, u.username as resident_name
     FROM visitors v
     LEFT JOIN users u ON v.created_by = u.email
     WHERE DATE(v.check_out_time) = CURRENT_DATE
     AND v.estate_id = $1
     ORDER BY v.check_out_time DESC`,
    [req.user.estate_id]
  );

  return successResponse(res, result.rows, 'Today\'s check-outs retrieved');
}));

/**
 * Get currently checked-in visitors (for check-out)
 * GET /api/check-out/active
 */
router.get('/active', authenticateToken, authorize(['guard', 'admin', 'super_admin']), minimizeData('check-out'), asyncHandler(async (req, res) => {
  // SECURITY: Filter by estate_id
  const result = await dbManager.query(
    `SELECT v.*, u.username as resident_name
     FROM visitors v
     LEFT JOIN users u ON v.created_by = u.email
     WHERE v.status = $1
     AND v.estate_id = $2
     ORDER BY v.check_in_time DESC`,
    [PASS_STATUS.ON_PREMISE, req.user.estate_id]
  );

  return successResponse(res, result.rows, 'Active visitors retrieved');
}));

export default router;
