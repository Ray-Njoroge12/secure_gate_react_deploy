/**
 * Check-In Routes
 * Routes for visitor check-in operations
 */

import express from 'express';
import { authenticateToken, authorize } from '../middleware/authMiddleware.js';
import auditLoggerFactory from '../middleware/auditLogger.js';
import { asyncHandler, AppError } from '../middleware/standardizedErrorHandler.js';
import { successResponse } from '../utils/responseFormatter.js';
import { dbManager } from '../database/db.enhanced.js';
import { PASS_STATUS } from '../constants/statuses.js';

const router = express.Router();
const attachRequestAudit = auditLoggerFactory();

/**
 * Check in a visitor by ID
 * POST /api/check-in/:visitorId
 */
router.post('/:visitorId', authenticateToken, authorize(['guard', 'admin']), attachRequestAudit, asyncHandler(async (req, res) => {
  const { visitorId } = req.params;
  const guardId = req.user.id;
  const { notes, vehicle_plate } = req.body;
  
  // Verify visitor exists and is in valid state
  const visitor = await dbManager.query(
    'SELECT * FROM visitors WHERE id = $1',
    [visitorId]
  );
  
  if (visitor.rows.length === 0) {
    throw new AppError('Visitor not found', 404);
  }
  
  const visitorData = visitor.rows[0];
  
  // Check if already checked in
  if (visitorData.status === PASS_STATUS.CHECKED_IN) {
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
     WHERE id = $5
     RETURNING *`,
    [PASS_STATUS.CHECKED_IN, guardId, notes, vehicle_plate, visitorId]
  );
  
  // Log access
  await dbManager.query(
    `INSERT INTO access_logs (visitor_id, action, performed_by, notes, log_time)
     VALUES ($1, 'check_in', $2, $3, NOW())`,
    [visitorId, guardId, notes]
  );
  
  return successResponse(res, result.rows[0], 'Visitor checked in successfully');
}));

/**
 * Check in visitor by QR code
 * SEC-004: Enforces one-time QR code use
 * POST /api/check-in/qr
 */
router.post('/qr', authenticateToken, authorize(['guard', 'admin']), attachRequestAudit, asyncHandler(async (req, res) => {
  const { qrCode, notes } = req.body;
  const guardId = req.user.id;
  
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
       RETURNING *`,
      [parsedQrData.qrId, guardId]
    );
    
    if (qrResult.rows.length === 0) {
      // Check why it failed
      const checkQr = await dbManager.query(
        'SELECT status, expires_at FROM qr_codes WHERE qr_id = $1',
        [parsedQrData.qrId]
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
    visitorQuery = await dbManager.query(
      'SELECT * FROM visitors WHERE id = $1',
      [qrRecord.visitor_id]
    );
  } else {
    visitorQuery = await dbManager.query(
      'SELECT * FROM visitors WHERE qr_code = $1 OR token = $1',
      [parsedQrData.token || qrCode]
    );
  }
  
  if (visitorQuery.rows.length === 0) {
    throw new AppError('Visitor not found for this QR code', 404);
  }
  
  const visitorData = visitorQuery.rows[0];
  
  // Validate visitor status
  if (visitorData.status === PASS_STATUS.CHECKED_IN) {
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
     WHERE id = $4
     RETURNING *`,
    [PASS_STATUS.CHECKED_IN, guardId, notes, visitorData.id]
  );
  
  // Log access
  await dbManager.query(
    `INSERT INTO access_logs (visitor_id, action, performed_by, notes, log_time, metadata)
     VALUES ($1, 'check_in_qr', $2, $3, NOW(), $4)`,
    [visitorData.id, guardId, notes, JSON.stringify({ qr_id: qrRecord?.qr_id })]
  );
  
  return successResponse(res, result.rows[0], 'Visitor checked in via QR code');
}));

/**
 * Get today's check-ins
 * GET /api/check-in/today
 */
router.get('/today', authenticateToken, authorize(['guard', 'admin']), asyncHandler(async (req, res) => {
  const result = await dbManager.query(
    `SELECT v.*, u.username as resident_name
     FROM visitors v
     LEFT JOIN users u ON v.created_by = u.email
     WHERE DATE(v.check_in_time) = CURRENT_DATE
     ORDER BY v.check_in_time DESC`
  );
  
  return successResponse(res, result.rows, 'Today\'s check-ins retrieved');
}));

/**
 * Get check-in history
 * GET /api/check-in/history
 */
router.get('/history', authenticateToken, authorize(['guard', 'admin']), asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0, date } = req.query;
  
  let query = `
    SELECT v.*, u.username as resident_name
    FROM visitors v
    LEFT JOIN users u ON v.created_by = u.email
    WHERE v.check_in_time IS NOT NULL
  `;
  
  const params = [];
  
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
