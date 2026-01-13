import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { AppError, asyncHandler } from '../middleware/standardizedErrorHandler.js';
import { successResponse } from '../utils/responseFormatter.js';
import { dbManager } from '../database/db.enhanced.js';

const router = express.Router();

// Get available estates for onboarding
router.get('/available', asyncHandler(async (req, res) => {
  const result = await dbManager.query(
    `SELECT id, name, slug, timezone
     FROM estates
     ORDER BY name ASC`
  );

  successResponse(res, {
    estates: result.rows
  }, 'Available estates retrieved successfully');
}));

// Select an estate for an estate-less account
router.post('/select', authenticateToken, asyncHandler(async (req, res) => {
  const { estateId } = req.body;

  if (!estateId || Number.isNaN(Number(estateId))) {
    throw new AppError('Valid estate ID is required', 400, 'VALIDATION_ERROR');
  }

  if (req.user?.estate_id) {
    throw new AppError('Estate already assigned to this account', 409, 'ESTATE_ALREADY_SET');
  }

  const estateCheck = await dbManager.query(
    'SELECT id, name FROM estates WHERE id = $1',
    [estateId]
  );

  if (estateCheck.rowCount === 0) {
    throw new AppError('Invalid estate selection', 400, 'ESTATE_INVALID');
  }

  const updateResult = await dbManager.query(
    `UPDATE users
     SET estate_id = $1, updated_at = NOW()
     WHERE id = $2 AND estate_id IS NULL
     RETURNING id, username, email, role, estate_id`,
    [estateId, req.user.id]
  );

  if (updateResult.rowCount === 0) {
    throw new AppError('Unable to update estate assignment', 409, 'ESTATE_ASSIGNMENT_FAILED');
  }

  successResponse(res, {
    user: updateResult.rows[0],
    estate: estateCheck.rows[0]
  }, 'Estate assignment updated successfully');
}));

export default router;
