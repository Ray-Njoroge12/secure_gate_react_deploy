import express from 'express';
import { asyncHandler } from '../../middleware/enhancedErrorHandler.js';
import { successResponse, createdResponse } from '../../utils/responseUtils.js';
import { authenticateToken as authenticate, authorize } from '../../middleware/authMiddleware.js';
import { AppError } from '../../middleware/enhancedErrorHandler.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Visitors v1
 *   description: Visitor management endpoints (API v1)
 */

/**
 * @swagger
 * /api/v1/visitors:
 *   get:
 *     summary: Get all visitors (v1)
 *     tags: [Visitors v1]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of visitors per page
 *     responses:
 *       200:
 *         description: Visitors retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, authorize(['admin', 'guard']), asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  
  const result = await db.query(
    'SELECT * FROM visitors ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [parseInt(limit), parseInt(offset)]
  );
  
  const countResult = await db.query('SELECT COUNT(*) FROM visitors');
  const total = parseInt(countResult.rows[0].count);
  
  successResponse(res, {
    visitors: result.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  }, 'Visitors retrieved successfully');
}));

export default router;
