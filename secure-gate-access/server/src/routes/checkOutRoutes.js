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
import QRCodeService from '../services/qrCodeService.js';
import { validateVisitorTransition } from '../services/visitorStateService.js';
import { buildRequestHash, getIdempotencyKey, resolveIdempotency, storeIdempotencyResponse } from '../services/idempotencyService.js';

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
  const idempotencyKey = getIdempotencyKey(req);
  const requestHash = idempotencyKey
    ? buildRequestHash({ method: req.method, path: req.originalUrl, body: req.body, userId: guardId })
    : null;

  if (idempotencyKey) {
    const idempotencyResult = await resolveIdempotency({
      key: idempotencyKey,
      scope: 'check-out-qr',
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
  
  const qrValidation = await QRCodeService.validateQRCode(qrCode, { allowUsed: true });
  if (!qrValidation.valid) {
    throw new AppError(qrValidation.error, 400);
  }

  const visitorData = qrValidation.visitor;
  if (visitorData.estate_id !== estateId) {
    throw new AppError('Invalid QR code', 404);
  }
  
  // Validate visitor status
  const transition = validateVisitorTransition(visitorData.status, PASS_STATUS.CHECKED_OUT);
  if (!transition.valid) {
    throw new AppError(transition.reason, 422);
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
  
  const responseBody = {
    success: true,
    message: 'Visitor checked out via QR code',
    data: result.rows[0],
    timestamp: new Date().toISOString()
  };

  if (idempotencyKey) {
    await storeIdempotencyResponse({
      key: idempotencyKey,
      scope: 'check-out-qr',
      requestHash,
      responseCode: 200,
      responseBody
    });
  }

  return res.status(200).json(responseBody);
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
    [PASS_STATUS.ON_PREMISE, estateId]
  );
  
  return successResponse(res, result.rows, 'Active visitors retrieved');
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
  const idempotencyKey = getIdempotencyKey(req);
  const requestHash = idempotencyKey
    ? buildRequestHash({ method: req.method, path: req.originalUrl, body: req.body, userId: guardId })
    : null;

  if (idempotencyKey) {
    const idempotencyResult = await resolveIdempotency({
      key: idempotencyKey,
      scope: 'check-out',
      requestHash
    });
    if (idempotencyResult.conflict) {
      throw new AppError('Idempotency key reuse with different request payload', 409);
    }
    if (idempotencyResult.hit) {
      return res.status(idempotencyResult.response.statusCode).json(idempotencyResult.response.body);
    }
  }
  
  // Verify visitor exists
  const visitor = await dbManager.query(
    'SELECT * FROM visitors WHERE id = $1 AND estate_id = $2',
    [visitorId, estateId]
  );
  
  if (visitor.rows.length === 0) {
    throw new AppError('Visitor not found', 404);
  }
  
  const visitorData = visitor.rows[0];
  
  const transition = validateVisitorTransition(visitorData.status, PASS_STATUS.CHECKED_OUT);
  if (!transition.valid) {
    throw new AppError(transition.reason, 422);
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
  
  const responseBody = {
    success: true,
    message: 'Visitor checked out successfully',
    data: result.rows[0],
    timestamp: new Date().toISOString()
  };

  if (idempotencyKey) {
    await storeIdempotencyResponse({
      key: idempotencyKey,
      scope: 'check-out',
      requestHash,
      responseCode: 200,
      responseBody
    });
  }

  return res.status(200).json(responseBody);
}));

export default router;
