/**
 * Check-Out Routes
 * Routes for visitor check-out operations
 */

import express from 'express';
import { authenticateToken, authorize, requireEstate } from '../middleware/authMiddleware.js';
import auditLoggerFactory from '../middleware/auditLogger.js';
import { asyncHandler, AppError } from '../middleware/standardizedErrorHandler.js';
import { successResponse } from '../utils/responseFormatter.js';
import { dbManager } from '../database/db.enhanced.js';
import { PASS_STATUS } from '../constants/statuses.js';

const router = express.Router();
const attachRequestAudit = auditLoggerFactory();

router.use(authenticateToken, requireEstate);

/**
 * Check out visitor by QR code
 * POST /api/check-out/qr
 */
router.post('/qr', authorize(['guard', 'admin']), attachRequestAudit, asyncHandler(async (req, res) => {
  const { qrCode, notes } = req.body;
  const guardId = req.user.id;
  const estateId = req.user.estate_id;
  
  if (!qrCode) {
    throw new AppError('QR code is required', 400);
  }
  
  // Find visitor by QR code
  const visitor = await dbManager.query(
    'SELECT * FROM visitors WHERE (qr_code = $1 OR token = $1) AND estate_id = $2',
    [qrCode, estateId]
  );
  
  if (visitor.rows.length === 0) {
    const visitorExists = await dbManager.query(
      'SELECT id FROM visitors WHERE qr_code = $1 OR token = $1',
      [qrCode]
    );

    if (visitorExists.rowCount > 0) {
      throw new AppError('Visitor not found in your estate', 403);
    }

    throw new AppError('Invalid QR code', 404);
  }
  
  const visitorData = visitor.rows[0];
  
  // Validate visitor status
  if (visitorData.status !== PASS_STATUS.CHECKED_IN) {
    throw new AppError('Visitor is not currently checked in', 400);
  }
  
  // Perform check-out
  const result = await dbManager.query(
    `UPDATE visitors 
     SET status = $1, 
         check_out_time = NOW(), 
         check_out_guard_id = $2,
         check_out_notes = $3,
         updated_at = NOW()
     WHERE id = $4
       AND estate_id = $5
     RETURNING *`,
    [PASS_STATUS.CHECKED_OUT, guardId, notes, visitorData.id, estateId]
  );
  
  // Log access
  await dbManager.query(
    `INSERT INTO access_logs (visitor_id, action, performed_by, notes, log_time)
     VALUES ($1, 'check_out_qr', $2, $3, NOW())`,
    [visitorData.id, guardId, notes]
  );
  
  return successResponse(res, result.rows[0], 'Visitor checked out via QR code');
}));

/**
 * Check out a visitor by ID
 * POST /api/check-out/:visitorId
 */
router.post('/:visitorId', authorize(['guard', 'admin']), attachRequestAudit, asyncHandler(async (req, res) => {
  const { visitorId } = req.params;
  const guardId = req.user.id;
  const estateId = req.user.estate_id;
  const { notes } = req.body;
  
  // Verify visitor exists
  const visitor = await dbManager.query(
    'SELECT * FROM visitors WHERE id = $1 AND estate_id = $2',
    [visitorId, estateId]
  );
  
  if (visitor.rows.length === 0) {
    const visitorExists = await dbManager.query(
      'SELECT id FROM visitors WHERE id = $1',
      [visitorId]
    );

    if (visitorExists.rowCount > 0) {
      throw new AppError('Visitor not found in your estate', 403);
    }

    throw new AppError('Visitor not found', 404);
  }
  
  const visitorData = visitor.rows[0];
  
  // Check if visitor is checked in
  if (visitorData.status !== PASS_STATUS.CHECKED_IN) {
    throw new AppError('Visitor is not currently checked in', 400);
  }
  
  // Perform check-out
  const result = await dbManager.query(
    `UPDATE visitors 
     SET status = $1, 
         check_out_time = NOW(), 
         check_out_guard_id = $2,
         check_out_notes = $3,
         updated_at = NOW()
     WHERE id = $4
       AND estate_id = $5
     RETURNING *`,
    [PASS_STATUS.CHECKED_OUT, guardId, notes, visitorId, estateId]
  );
  
  // Log access
  await dbManager.query(
    `INSERT INTO access_logs (visitor_id, action, performed_by, notes, log_time)
     VALUES ($1, 'check_out', $2, $3, NOW())`,
    [visitorId, guardId, notes]
  );
  
  return successResponse(res, result.rows[0], 'Visitor checked out successfully');
}));

/**
 * Get today's check-outs
 * GET /api/check-out/today
 */
router.get('/today', authorize(['guard', 'admin']), asyncHandler(async (req, res) => {
  const estateId = req.user.estate_id;
  const result = await dbManager.query(
    `SELECT v.*, u.username as resident_name
     FROM visitors v
     LEFT JOIN users u ON v.created_by = u.email
     WHERE DATE(v.check_out_time) = CURRENT_DATE
       AND v.estate_id = $1
     ORDER BY v.check_out_time DESC`
    ,
    [estateId]
  );
  
  return successResponse(res, result.rows, 'Today\'s check-outs retrieved');
}));

/**
 * Get currently checked-in visitors (for check-out)
 * GET /api/check-out/active
 */
router.get('/active', authorize(['guard', 'admin']), asyncHandler(async (req, res) => {
  const estateId = req.user.estate_id;
  const result = await dbManager.query(
    `SELECT v.*, u.username as resident_name
     FROM visitors v
     LEFT JOIN users u ON v.created_by = u.email
     WHERE v.status = $1
       AND v.estate_id = $2
     ORDER BY v.check_in_time DESC`,
    [PASS_STATUS.CHECKED_IN, estateId]
  );
  
  return successResponse(res, result.rows, 'Active visitors retrieved');
}));

export default router;
