/**
 * Check-In Routes
 * Routes for visitor check-in operations
 */

import express from 'express';
import { authenticateToken, authorize } from '../middleware/authMiddleware.js';
import requireEstateContext from '../middleware/estateContextMiddleware.js';
import { attachRequestAudit } from '../middleware/auditLogging.js';
import { asyncHandler, AppError } from '../middleware/standardizedErrorHandler.js';
import { successResponse } from '../utils/responseFormatter.js';
import { dbManager } from '../database/db.enhanced.js';
import { PASS_STATUS } from '../constants/statuses.js';
import { minimizeData } from '../middleware/dataMinimization.js';
import { strictRateLimit } from '../middleware/rateLimitMiddleware.js';
import { traceRoute } from '../middleware/traceMiddleware.js';

const router = express.Router();

// All check-in routes require authentication and estate context
router.use(authenticateToken);
router.use(requireEstateContext);

/**
 * Check in visitor by QR code
 * SEC-004: Enforces one-time QR code use
 * POST /api/check-in/qr
 */
router.post('/qr', authorize(['guard', 'admin', 'super_admin']), strictRateLimit(), attachRequestAudit, traceRoute('checkin.qr'), asyncHandler(async (req, res) => {
  const { qrCode, notes } = req.body;
  const guardId = req.user.id;

  // GUARD-003 FIX: Validate that user is actually a guard or admin
  if (!['guard', 'admin', 'super_admin'].includes(req.user.role)) {
    throw new AppError('Only guards and admins can perform check-in operations', 403, 'UNAUTHORIZED_ROLE');
  }

  if (!qrCode) {
    throw new AppError('QR code is required', 400);
  }

  // SEC-004: Check QR code in qr_codes table first (one-time use enforcement)
  let qrRecord = null;
  let parsedQrData = null;

  try {
    parsedQrData = JSON.parse(qrCode);
  } catch {
    // Not JSON, try as direct token
    parsedQrData = { token: qrCode };
  }

  if (parsedQrData.qrId) {
    // SEC-004: Atomic check-and-mark as used to prevent race conditions
    const qrResult = await dbManager.query(
      `UPDATE qr_codes 
       SET status = 'used',
           scan_count = COALESCE(scan_count, 0) + 1,
           first_used_at = COALESCE(first_used_at, NOW()),
           used_by_guard_id = $2
       WHERE qr_id = $1 
         AND status = 'active' 
         AND expires_at > NOW()
         AND estate_id = $3
       RETURNING *`,
      [parsedQrData.qrId, guardId, req.user.estate_id]
    );

    if (qrResult.rows.length === 0) {
      // Check why it failed
      const checkQr = await dbManager.query(
        'SELECT status, expires_at FROM qr_codes WHERE qr_id = $1 AND estate_id = $2',
        [parsedQrData.qrId, req.user.estate_id]
      );

      if (checkQr.rows.length === 0) {
        throw new AppError('Invalid QR code', 404);
      }

      const qrStatus = checkQr.rows[0];
      if (qrStatus.status === 'used') {
        throw new AppError('QR code has already been used', 403);
      }
      if (new Date(qrStatus.expires_at) < new Date()) {
        throw new AppError('QR code has expired', 410);
      }
      throw new AppError('QR code is not active', 403);
    }

    qrRecord = qrResult.rows[0];
  }

  // Find visitor by QR code or visitor_id from QR record
  let visitorQuery;
  if (qrRecord?.visitor_id) {
    console.log('DEBUG: Querying visitor by ID from QR record');
    visitorQuery = await dbManager.query(
      'SELECT * FROM visitors WHERE id = $1 AND estate_id = $2',
      [qrRecord.visitor_id, req.user.estate_id]
    );
  } else {
    console.log('DEBUG: Querying visitor by Token/Code');
    console.log('DEBUG: Token:', parsedQrData.token || qrCode);
    console.log('DEBUG: EstateID:', req.user.estate_id);
    visitorQuery = await dbManager.query(
      'SELECT * FROM visitors WHERE (qr_code::text = $1 OR visitor_token = $1) AND estate_id = $2',
      [parsedQrData.token || qrCode, req.user.estate_id]
    );
  }

  if (visitorQuery.rows.length === 0) {
    throw new AppError('Visitor not found for this QR code', 404);
  }

  const visitorData = visitorQuery.rows[0];

  // Validate visitor status
  if (visitorData.status === PASS_STATUS.ON_PREMISE) {
    throw new AppError('Visitor is already checked in', 400);
  }

  if (visitorData.status === PASS_STATUS.EXPIRED) {
    throw new AppError('Visitor pass has expired', 400);
  }

  // Perform check-in
  const result = await dbManager.query(
    `UPDATE visitors 
     SET status = $1, 
         check_in_time = NOW(), 
         check_in_guard_id = $2,
         check_in_notes = $3,
         updated_at = NOW()
     WHERE id = $4 AND estate_id = $5
     RETURNING *`,
    [PASS_STATUS.ON_PREMISE, guardId, notes, visitorData.id, req.user.estate_id]
  );

  // Log access
  await dbManager.query(
    `INSERT INTO access_logs (entity_type, entity_id, action, user_id, message, log_time, metadata)
     VALUES ('visitor', $1, 'check_in_qr', $2, $3, NOW(), $4)`,
    [String(visitorData.id), guardId, notes, JSON.stringify({ qr_id: qrRecord?.qr_id })]
  );

  return successResponse(res, result.rows[0], 'Visitor checked in via QR code');
}));

/**
 * Check in a visitor by ID
 * POST /api/check-in/:visitorId
 */
router.post('/:visitorId', authorize(['guard', 'admin', 'super_admin']), attachRequestAudit, traceRoute('checkin.byId'), asyncHandler(async (req, res) => {
  const { visitorId } = req.params;
  const guardId = req.user.id;
  const { notes, vehicle_plate } = req.body;

  // GUARD-003 FIX: Validate that user is actually a guard or admin
  if (!['guard', 'admin', 'super_admin'].includes(req.user.role)) {
    throw new AppError('Only guards and admins can perform check-in operations', 403, 'UNAUTHORIZED_ROLE');
  }

  // Verify visitor exists and is in valid state
  const visitor = await dbManager.query(
    'SELECT * FROM visitors WHERE id = $1 AND estate_id = $2',
    [visitorId, req.user.estate_id]
  );

  if (visitor.rows.length === 0) {
    throw new AppError('Visitor not found', 404);
  }

  const visitorData = visitor.rows[0];

  // Check if already checked in
  if (visitorData.status === PASS_STATUS.ON_PREMISE) {
    throw new AppError('Visitor is already checked in', 400);
  }

  // Check if visitor pass is still valid
  if (visitorData.status === PASS_STATUS.EXPIRED) {
    throw new AppError('Visitor pass has expired', 400);
  }

  // Perform check-in
  const result = await dbManager.query(
    `UPDATE visitors 
     SET status = $1, 
         check_in_time = NOW(), 
         check_in_guard_id = $2,
         check_in_notes = $3,
         vehicle_plate = COALESCE($4, vehicle_plate),
         updated_at = NOW()
     WHERE id = $5 AND estate_id = $6
     RETURNING *`,
    [PASS_STATUS.ON_PREMISE, guardId, notes, vehicle_plate, visitorId, req.user.estate_id]
  );

  // Log access
  await dbManager.query(
    `INSERT INTO access_logs (entity_type, entity_id, action, user_id, message, log_time)
     VALUES ('visitor', $1, 'check_in', $2, $3, NOW())`,
    [String(visitorId), guardId, notes]
  );

  return successResponse(res, result.rows[0], 'Visitor checked in successfully');
}));

/**
 * Get today's check-ins
 * GET /api/check-in/today
 */
router.get('/today', authorize(['guard', 'admin', 'super_admin']), minimizeData('check-in'), traceRoute('checkin.today'), asyncHandler(async (req, res) => {
  const result = await dbManager.query(
    `SELECT v.*, u.username as resident_name
     FROM visitors v
     LEFT JOIN users u ON v.created_by = u.email
     WHERE DATE(v.check_in_time) = CURRENT_DATE
     AND v.estate_id = $1
     AND (u.estate_id = $1 OR u.estate_id IS NULL)
     ORDER BY v.check_in_time DESC`,
    [req.user.estate_id]
  );

  return successResponse(res, result.rows, 'Today\'s check-ins retrieved');
}));

/**
 * Get check-in history
 * GET /api/check-in/history
 */
router.get('/history', authorize(['guard', 'admin', 'super_admin']), minimizeData('check-in'), traceRoute('checkin.history'), asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0, date } = req.query;

  let query = `
    SELECT v.*, u.username as resident_name
    FROM visitors v
    LEFT JOIN users u ON v.created_by = u.email
    WHERE v.check_in_time IS NOT NULL
    AND v.estate_id = $1
    AND (u.estate_id = $1 OR u.estate_id IS NULL)
  `;

  const params = [req.user.estate_id];

  if (date) {
    params.push(date);
    query += ` AND DATE(v.check_in_time) = $${params.length}`;
  }

  query += ` ORDER BY v.check_in_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parseInt(limit), parseInt(offset));

  const result = await dbManager.query(query, params);

  return successResponse(res, result.rows, 'Check-in history retrieved');
}));

export default router;
