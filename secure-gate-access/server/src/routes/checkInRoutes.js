/**
 * Check-In Routes
 * Routes for visitor check-in operations
 */

import express from 'express';
import { authenticateToken, authorize, requireEstate } from '../middleware/authMiddleware.js';
import auditLoggerFactory from '../middleware/auditLogger.js';
import { asyncHandler, AppError } from '../middleware/standardizedErrorHandler.js';
import { successResponse } from '../utils/responseFormatter.js';
import { dbManager } from '../database/db.enhanced.js';
import { PASS_STATUS } from '../constants/statuses.js';
import QRCodeService from '../services/qrCodeService.js';
import { validateVisitorTransition } from '../services/visitorStateService.js';
import { buildRequestHash, getIdempotencyKey, resolveIdempotency, storeIdempotencyResponse } from '../services/idempotencyService.js';

const router = express.Router();
const attachRequestAudit = auditLoggerFactory();

router.use(authenticateToken, requireEstate);

/**
 * Check in visitor by QR code
 * SEC-004: Enforces one-time QR code use
 * POST /api/check-in/qr
 */
router.post('/qr', authenticateToken, authorize(['guard', 'admin']), attachRequestAudit, asyncHandler(async (req, res) => {
  const { qrCode, notes } = req.body;
  const guardId = req.user.id;
  const idempotencyKey = getIdempotencyKey(req);
  const requestHash = idempotencyKey
    ? buildRequestHash({ method: req.method, path: req.originalUrl, body: req.body, userId: guardId })
    : null;

  if (idempotencyKey) {
    const idempotencyResult = await resolveIdempotency({
      key: idempotencyKey,
      scope: 'check-in-qr',
      requestHash
    });
    if (idempotencyResult.conflict) {
      throw new AppError('Idempotency key reuse with different request payload', 409);
    }
    if (idempotencyResult.hit) {
      return res.status(idempotencyResult.response.statusCode).json(idempotencyResult.response.body);
    }
  }
  
  if (!qrCode) {
    throw new AppError('QR code is required', 400);
  }
  
  const qrValidation = await QRCodeService.consumeQRCode(qrCode, { guardId });
  if (!qrValidation.success) {
    throw new AppError(qrValidation.error, qrValidation.code || 400);
  }

  const visitorData = qrValidation.data.visitor;
  if (visitorData.estate_id && req.user.estate_id && visitorData.estate_id !== req.user.estate_id) {
    throw new AppError('Invalid QR code', 404);
  }
  
  // Validate visitor status
  const transition = validateVisitorTransition(visitorData.status, PASS_STATUS.ON_PREMISE);
  if (!transition.valid) {
    throw new AppError(transition.reason, 422);
  }
  
  // Perform check-in
  const result = await dbManager.query(
    `UPDATE visitors 
     SET status = $1, 
         check_in_time = NOW(), 
         check_in_guard_id = $2,
         check_in_notes = $3,
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [PASS_STATUS.ON_PREMISE, guardId, notes, visitorData.id]
  );
  
  // Log access
  await dbManager.query(
    `INSERT INTO access_logs (visitor_id, action, performed_by, notes, log_time, metadata)
     VALUES ($1, 'check_in_qr', $2, $3, NOW(), $4)`,
    [visitorData.id, guardId, notes, JSON.stringify({ qr_id: qrValidation.data.qrId })]
  );
  
  const responseBody = {
    success: true,
    message: 'Visitor checked in via QR code',
    data: result.rows[0],
    timestamp: new Date().toISOString()
  };

  if (idempotencyKey) {
    await storeIdempotencyResponse({
      key: idempotencyKey,
      scope: 'check-in-qr',
      requestHash,
      responseCode: 200,
      responseBody
    });
  }

  return res.status(200).json(responseBody);
}));

/**
 * Check in a visitor by ID
 * POST /api/check-in/:visitorId
 */
router.post('/:visitorId', authenticateToken, authorize(['guard', 'admin']), attachRequestAudit, asyncHandler(async (req, res) => {
  const { visitorId } = req.params;
  const guardId = req.user.id;
  const { notes, vehicle_plate } = req.body;
  const idempotencyKey = getIdempotencyKey(req);
  const requestHash = idempotencyKey
    ? buildRequestHash({ method: req.method, path: req.originalUrl, body: req.body, userId: guardId })
    : null;

  if (idempotencyKey) {
    const idempotencyResult = await resolveIdempotency({
      key: idempotencyKey,
      scope: 'check-in',
      requestHash
    });
    if (idempotencyResult.conflict) {
      throw new AppError('Idempotency key reuse with different request payload', 409);
    }
    if (idempotencyResult.hit) {
      return res.status(idempotencyResult.response.statusCode).json(idempotencyResult.response.body);
    }
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
  
  const transition = validateVisitorTransition(visitorData.status, PASS_STATUS.ON_PREMISE);
  if (!transition.valid) {
    throw new AppError(transition.reason, 422);
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
     WHERE id = $5
     RETURNING *`,
    [PASS_STATUS.ON_PREMISE, guardId, notes, vehicle_plate, visitorId]
  );
  
  // Log access
  await dbManager.query(
    `INSERT INTO access_logs (visitor_id, action, performed_by, notes, log_time)
     VALUES ($1, 'check_in', $2, $3, NOW())`,
    [visitorId, guardId, notes]
  );
  
  const responseBody = {
    success: true,
    message: 'Visitor checked in successfully',
    data: result.rows[0],
    timestamp: new Date().toISOString()
  };

  if (idempotencyKey) {
    await storeIdempotencyResponse({
      key: idempotencyKey,
      scope: 'check-in',
      requestHash,
      responseCode: 200,
      responseBody
    });
  }

  return res.status(200).json(responseBody);
}));

/**
 * Get today's check-ins
 * GET /api/check-in/today
 */
router.get('/today', authorize(['guard', 'admin']), asyncHandler(async (req, res) => {
  const estateId = req.user.estate_id;
  const result = await dbManager.query(
    `SELECT v.*, u.username as resident_name
     FROM visitors v
     LEFT JOIN users u ON v.created_by = u.email
     WHERE DATE(v.check_in_time) = CURRENT_DATE
       AND v.estate_id = $1
     ORDER BY v.check_in_time DESC`
    ,
    [estateId]
  );
  
  return successResponse(res, result.rows, 'Today\'s check-ins retrieved');
}));

/**
 * Get check-in history
 * GET /api/check-in/history
 */
router.get('/history', authorize(['guard', 'admin']), asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0, date } = req.query;
  const estateId = req.user.estate_id;
  
  let query = `
    SELECT v.*, u.username as resident_name
    FROM visitors v
    LEFT JOIN users u ON v.created_by = u.email
    WHERE v.check_in_time IS NOT NULL
      AND v.estate_id = $1
  `;
  
  const params = [estateId];
  
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
