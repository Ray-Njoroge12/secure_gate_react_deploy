/**
 * Resident Routes
 * Routes for resident-specific features including favorites, visitor management
 */

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRolePolicy } from '../middleware/rolePolicy.js';
import auditLoggerFactory from '../middleware/auditLogger.js';
import { asyncHandler, AppError } from '../middleware/standardizedErrorHandler.js';
import { successResponse } from '../utils/responseFormatter.js';
import { dbManager } from '../database/db.enhanced.js';
import requireEstateContext from '../middleware/estateContextMiddleware.js';

const router = express.Router();
const attachRequestAudit = auditLoggerFactory();

/**
 * Get resident profile
 * GET /api/resident/profile
 */
router.get('/profile', authenticateToken, requireEstateContext, requireRolePolicy('adminOrResident'), asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const result = await dbManager.query(
    `SELECT id, first_name, last_name, username, email, phone, area, house as unit_number, role, estate_id, created_at, updated_at 
     FROM users WHERE id = $1 AND estate_id = $2`,
    [userId, req.user.estate_id]
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
router.put('/profile', authenticateToken, requireEstateContext, requireRolePolicy('adminOrResident'), attachRequestAudit, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { first_name, last_name, email, phone, area, unit_number } = req.body;

  const result = await dbManager.query(
    `UPDATE users 
     SET first_name = COALESCE($1, first_name), 
         last_name = COALESCE($2, last_name),
         email = COALESCE($3, email),
         phone = COALESCE($4, phone),
         area = COALESCE($5, area), 
         house = COALESCE($6, house),
         updated_at = NOW()
     WHERE id = $7 AND estate_id = $8
     RETURNING id, first_name, last_name, username, email, phone, area, house as unit_number, role, estate_id`,
    [first_name, last_name, email, phone, area, unit_number, userId, req.user.estate_id]
  );

  return successResponse(res, result.rows[0], 'Profile updated successfully');
}));

/**
 * Get favorite visitors
 * GET /api/resident/favorites
 */
router.get('/favorites', authenticateToken, requireEstateContext, requireRolePolicy('adminOrResident'), asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const result = await dbManager.query(
    `SELECT fv.id, fv.resident_id, fv.visitor_id, fv.nickname, fv.relationship, fv.notes, fv.created_at,
            v.name as visitor_name,
            v.phone as visitor_phone,
            v.email as visitor_email,
            (SELECT COUNT(*) FROM visitors WHERE resident_id = fv.resident_id
             AND (phone = v.phone OR email = v.email)) as visit_count,
            (SELECT MAX(created_at) FROM visitors WHERE resident_id = fv.resident_id
             AND (phone = v.phone OR email = v.email)) as last_visit
     FROM favorite_visitors fv
     LEFT JOIN visitors v ON fv.visitor_id = v.id AND v.estate_id = $2
     WHERE fv.resident_id = $1
     ORDER BY fv.created_at DESC`,
    [userId, req.user.estate_id]
  );

  return successResponse(res, { favorites: result.rows }, 'Favorite visitors retrieved');
}));

/**
 * Add visitor to favorites
 * POST /api/resident/favorites
 */
router.post('/favorites', authenticateToken, requireEstateContext, requireRolePolicy('adminOrResident'), attachRequestAudit, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { visitor_id, visitor_name, visitor_phone, visitor_email, relationship, notes, nickname } = req.body;

  let targetVisitorId = visitor_id;

  // If visitor_id is explicitly provided, verify it exists and belongs to the current estate
  if (targetVisitorId) {
    const verification = await dbManager.query(
      `SELECT id FROM visitors WHERE id = $1 AND estate_id = $2`,
      [targetVisitorId, req.user.estate_id]
    );
    if (verification.rows.length === 0) {
      throw new AppError('Visitor not found or invalid estate context', 404);
    }
  }

  // Logic to find or create visitor if visitor_id is NOT provided
  if (!targetVisitorId) {
    if (!visitor_name || (!visitor_phone && !visitor_email)) {
      throw new AppError('Visitor Name and either Phone or Email are required', 400);
    }

    // Check if visitor exists by phone or email in the current estate
    // Priority: Phone -> Email
    const existing = await dbManager.query(
      `SELECT id FROM visitors 
       WHERE ((phone IS NOT NULL AND phone = $1) OR (email IS NOT NULL AND email = $2)) 
       AND estate_id = $3 
       LIMIT 1`,
      [visitor_phone || null, visitor_email || null, req.user.estate_id]
    );

    if (existing.rows.length > 0) {
      targetVisitorId = existing.rows[0].id;
    } else {
      // Create new visitor record (Profile only, status PENDING, no visit date yet)
      const newVisitor = await dbManager.query(
        `INSERT INTO visitors (
          name, phone, email, resident_id, host_id, estate_id, 
          created_by, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', NOW())
        RETURNING id`,
        [
          visitor_name.trim(),
          visitor_phone ? visitor_phone.trim() : null,
          visitor_email ? visitor_email.trim().toLowerCase() : null,
          userId,
          userId,
          req.user.estate_id,
          req.user.email
        ]
      );
      targetVisitorId = newVisitor.rows[0].id;
    }
  }

  if (!targetVisitorId) {
    throw new AppError('Failed to identify visitor', 500);
  }

  // Upsert into favorite_visitors
  const result = await dbManager.query(
    `INSERT INTO favorite_visitors (resident_id, visitor_id, nickname, relationship, notes, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (resident_id, visitor_id) 
     DO UPDATE SET 
        nickname = EXCLUDED.nickname,
        relationship = EXCLUDED.relationship,
        notes = EXCLUDED.notes
     RETURNING *`,
    [
      userId,
      targetVisitorId,
      nickname || visitor_name || 'My Favorite',
      relationship || 'Guest',
      notes || ''
    ]
  );

  return successResponse(res, result.rows[0], 'Visitor added to favorites', 201);
}));

/**
 * Remove visitor from favorites
 * DELETE /api/resident/favorites/:id
 */
router.delete('/favorites/:id', authenticateToken, requireEstateContext, requireRolePolicy('adminOrResident'), attachRequestAudit, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  await dbManager.query(
    'DELETE FROM favorite_visitors WHERE id = $1 AND resident_id = $2',
    [id, userId]
  );

  return successResponse(res, null, 'Visitor removed from favorites');
}));

/**
 * Get resident statistics
 * GET /api/resident/stats
 */
router.get('/stats', authenticateToken, requireEstateContext, requireRolePolicy('adminOrResident'), asyncHandler(async (req, res) => {
  const userEmail = req.user.email;

  const [visitorsCount, pendingCount, checkInsToday] = await Promise.all([
    dbManager.query(
      'SELECT COUNT(*) as count FROM visitors WHERE created_by = $1 AND estate_id = $2',
      [userEmail, req.user.estate_id]
    ),
    dbManager.query(
      "SELECT COUNT(*) as count FROM visitors WHERE created_by = $1 AND status = 'pending' AND estate_id = $2",
      [userEmail, req.user.estate_id]
    ),
    dbManager.query(
      `SELECT COUNT(*) as count FROM visitors 
       WHERE created_by = $1 AND DATE(check_in_time) = CURRENT_DATE AND estate_id = $2`,
      [userEmail, req.user.estate_id]
    )
  ]);

  return successResponse(res, {
    total_visitors: parseInt(visitorsCount.rows[0].count),
    pending_visitors: parseInt(pendingCount.rows[0].count),
    check_ins_today: parseInt(checkInsToday.rows[0].count)
  }, 'Resident statistics retrieved');
}));

export default router;
