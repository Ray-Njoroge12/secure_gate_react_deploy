import express from 'express';
import { asyncHandler } from '../../middleware/enhancedErrorHandler.js';
import { successResponse, createdResponse } from '../../utils/responseUtils.js';
import { authenticateToken as authenticate, authorize } from '../../middleware/authMiddleware.js';
import { AppError } from '../../middleware/enhancedErrorHandler.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Visitors v2
 *   description: Enhanced visitor management endpoints (API v2)
 */

/**
 * @swagger
 * /api/v2/visitors:
 *   get:
 *     summary: Get all visitors (v2 - Enhanced)
 *     tags: [Visitors v2]
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
 *           maximum: 100
 *         description: Number of visitors per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or phone
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, completed]
 *         description: Filter by status
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [name, phone, created_at, visit_date]
 *           default: created_at
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Visitors retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, authorize(['admin', 'guard']), asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { 
    page = 1, 
    limit = 10, 
    search, 
    status, 
    sort = 'created_at', 
    order = 'desc' 
  } = req.query;
  
  // Validate pagination
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;
  
  // Build query with enhanced filtering
  let query = 'SELECT * FROM visitors';
  const conditions = [];
  const params = [];
  let paramCount = 0;
  
  if (search) {
    conditions.push(`(name ILIKE $${++paramCount} OR phone ILIKE $${++paramCount})`);
    params.push(`%${search}%`, `%${search}%`);
  }
  
  if (status) {
    conditions.push(`status = $${++paramCount}`);
    params.push(status);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  // Add sorting
  const allowedSortFields = ['name', 'phone', 'created_at', 'visit_date'];
  const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
  query += ` ORDER BY ${sortField} ${sortOrder}`;
  
  // Add pagination
  query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
  params.push(limitNum, offset);
  
  const result = await db.query(query, params);
  
  // Get total count
  let countQuery = 'SELECT COUNT(*) FROM visitors';
  if (conditions.length > 0) {
    countQuery += ' WHERE ' + conditions.join(' AND ');
  }
  const countResult = await db.query(countQuery, params.slice(0, -2));
  const total = parseInt(countResult.rows[0].count);
  
  const responseTime = Date.now() - startTime;
  
  successResponse(res, {
    visitors: result.rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    },
    filters: {
      applied: { search, status, sort, order },
      available: {
        statuses: ['pending', 'approved', 'rejected', 'completed'],
        sortFields: allowedSortFields
      }
    }
  }, 'Visitors retrieved successfully', {
    api_version: 'v2',
    response_time: responseTime
  });
}));

export default router;
