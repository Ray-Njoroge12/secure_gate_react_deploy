/**
 * Resident Routes
 * Routes for resident-specific features including favorites, visitor management
 */

import express from 'express';
import { authenticateToken, authorize } from '../middleware/authMiddleware.js';
import auditLoggerFactory from '../middleware/auditLogger.js';
import { asyncHandler, AppError } from '../middleware/standardizedErrorHandler.js';
import { successResponse } from '../utils/responseFormatter.js';
import { dbManager } from '../database/db.enhanced.js';

const router = express.Router();
const attachRequestAudit = auditLoggerFactory();

/**
 * Get resident profile
 * GET /api/resident/profile
 */
router.get('/profile', authenticateToken, authorize(['resident', 'admin']), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const result = await dbManager.query(
    `SELECT id, name, email, phone, unit_number, role, estate_id, created_at, updated_at 
     FROM users WHERE id = $1`,
    [userId]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Resident not found', 404);
  }
  
  return successResponse(res, result.rows[0], 'Resident profile retrieved');
}));

/**
 * Update resident profile
 * PUT /api/resident/profile
 */
router.put('/profile', authenticateToken, authorize(['resident', 'admin']), attachRequestAudit, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { name, phone, unit_number } = req.body;
  
  const result = await dbManager.query(
    `UPDATE users 
     SET name = COALESCE($1, name), 
         phone = COALESCE($2, phone), 
         unit_number = COALESCE($3, unit_number),
         updated_at = NOW()
     WHERE id = $4
     RETURNING id, name, email, phone, unit_number, role, estate_id`,
    [name, phone, unit_number, userId]
  );
  
  return successResponse(res, result.rows[0], 'Profile updated successfully');
}));

/**
 * Get favorite visitors
 * GET /api/resident/favorites
 */
router.get('/favorites', authenticateToken, authorize(['resident', 'admin']), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const result = await dbManager.query(
    `SELECT fv.*, v.name as visitor_name, v.phone as visitor_phone, v.email as visitor_email
     FROM favorite_visitors fv
     LEFT JOIN visitors v ON fv.visitor_id = v.id
     WHERE fv.resident_id = $1
     ORDER BY fv.created_at DESC`,
    [userId]
  );
  
  return successResponse(res, result.rows, 'Favorite visitors retrieved');
}));

/**
 * Add visitor to favorites
 * POST /api/resident/favorites
 */
router.post('/favorites', authenticateToken, authorize(['resident', 'admin']), attachRequestAudit, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { visitor_id, nickname } = req.body;
  
  if (!visitor_id) {
    throw new AppError('Visitor ID is required', 400);
  }
  
  const result = await dbManager.query(
    `INSERT INTO favorite_visitors (resident_id, visitor_id, nickname, created_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (resident_id, visitor_id) DO UPDATE SET nickname = EXCLUDED.nickname
     RETURNING *`,
    [userId, visitor_id, nickname]
  );
  
  return successResponse(res, result.rows[0], 'Visitor added to favorites', 201);
}));

/**
 * Remove visitor from favorites
 * DELETE /api/resident/favorites/:visitorId
 */
router.delete('/favorites/:visitorId', authenticateToken, authorize(['resident', 'admin']), attachRequestAudit, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { visitorId } = req.params;
  
  await dbManager.query(
    'DELETE FROM favorite_visitors WHERE resident_id = $1 AND visitor_id = $2',
    [userId, visitorId]
  );
  
  return successResponse(res, null, 'Visitor removed from favorites');
}));

/**
 * Get resident statistics
 * GET /api/resident/stats
 */
router.get('/stats', authenticateToken, authorize(['resident', 'admin']), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userEmail = req.user.email;
  
  const [visitorsCount, pendingCount, checkInsToday] = await Promise.all([
    dbManager.query(
      'SELECT COUNT(*) as count FROM visitors WHERE created_by = $1',
      [userEmail]
    ),
    dbManager.query(
      "SELECT COUNT(*) as count FROM visitors WHERE created_by = $1 AND status = 'pending'",
      [userEmail]
    ),
    dbManager.query(
      `SELECT COUNT(*) as count FROM visitors 
       WHERE created_by = $1 AND DATE(check_in_time) = CURRENT_DATE`,
      [userEmail]
    )
  ]);
  
  return successResponse(res, {
    total_visitors: parseInt(visitorsCount.rows[0].count),
    pending_visitors: parseInt(pendingCount.rows[0].count),
    check_ins_today: parseInt(checkInsToday.rows[0].count)
  }, 'Resident statistics retrieved');
}));

export default router;
