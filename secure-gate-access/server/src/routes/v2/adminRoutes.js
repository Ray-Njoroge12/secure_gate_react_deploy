import express from 'express';
import { asyncHandler } from '../../middleware/enhancedErrorHandler.js';
import { successResponse, createdResponse } from '../../utils/responseUtils.js';
import { authenticateToken as authenticate, authorize } from '../../middleware/authMiddleware.js';
import { AppError } from '../../middleware/enhancedErrorHandler.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin v2
 *   description: Enhanced admin endpoints (API v2)
 */

/**
 * @swagger
 * /api/v2/admin/users:
 *   get:
 *     summary: Get all users (v2 - Enhanced)
 *     tags: [Admin v2]
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
 *         description: Number of users per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [resident, guard, admin]
 *         description: Filter by role
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [name, email, created_at, last_login]
 *           default: created_at
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, locked]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                           phone:
 *                             type: string
 *                           role:
 *                             type: string
 *                           status:
 *                             type: string
 *                           preferences:
 *                             type: object
 *                           last_login:
 *                             type: string
 *                             format: date-time
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *                     filters:
 *                       type: object
 *                       properties:
 *                         applied:
 *                           type: object
 *                         available:
 *                           type: object
 *                 meta:
 *                   type: object
 *                   properties:
 *                     api_version:
 *                       type: string
 *                       example: v2
 *                     response_time:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/users', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { 
    page = 1, 
    limit = 10, 
    role, 
    search, 
    sort = 'created_at', 
    order = 'desc',
    status 
  } = req.query;
  
  // Validate pagination
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;
  
  // Validate sort field
  const allowedSortFields = ['name', 'email', 'created_at', 'last_login'];
  const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
  
  // Build query
  let query = `
    SELECT 
      id, name, email, phone, role, 
      preferences, last_login, created_at, updated_at,
      failed_login_attempts, account_locked_until,
      CASE 
        WHEN account_locked_until > NOW() THEN 'locked'
        WHEN last_login IS NULL THEN 'inactive'
        ELSE 'active'
      END as status
    FROM users
  `;
  
  const conditions = [];
  const params = [];
  let paramCount = 0;
  
  // Add filters
  if (role) {
    conditions.push(`role = $${++paramCount}`);
    params.push(role);
  }
  
  if (search) {
    conditions.push(`(name ILIKE $${++paramCount} OR email ILIKE $${++paramCount})`);
    params.push(`%${search}%`, `%${search}%`);
  }
  
  if (status) {
    if (status === 'locked') {
      conditions.push(`account_locked_until > NOW()`);
    } else if (status === 'inactive') {
      conditions.push(`last_login IS NULL`);
    } else if (status === 'active') {
      conditions.push(`last_login IS NOT NULL AND (account_locked_until IS NULL OR account_locked_until <= NOW())`);
    }
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  // Add sorting
  query += ` ORDER BY ${sortField} ${sortOrder}`;
  
  // Add pagination
  query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
  params.push(limitNum, offset);
  
  const result = await db.query(query, params);
  
  // Get total count with same filters
  let countQuery = 'SELECT COUNT(*) FROM users';
  if (conditions.length > 0) {
    countQuery += ' WHERE ' + conditions.join(' AND ');
  }
  const countResult = await db.query(countQuery, params.slice(0, -2)); // Remove limit and offset params
  const total = parseInt(countResult.rows[0].count);
  
  // Process users data
  const users = result.rows.map(user => ({
    ...user,
    preferences: JSON.parse(user.preferences || '{}'),
    failed_login_attempts: undefined, // Remove sensitive data
    account_locked_until: undefined
  }));
  
  const responseTime = Date.now() - startTime;
  
  successResponse(res, {
    users,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    },
    filters: {
      applied: { role, search, sort, order, status },
      available: {
        roles: ['resident', 'guard', 'admin'],
        statuses: ['active', 'inactive', 'locked'],
        sortFields: allowedSortFields
      }
    }
  }, 'Users retrieved successfully', {
    api_version: 'v2',
    response_time: responseTime
  });
}));

/**
 * @swagger
 * /api/v2/admin/users/{id}:
 *   get:
 *     summary: Get user by ID (v2 - Enhanced)
 *     tags: [Admin v2]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/users/:id', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await db.query(`
    SELECT 
      id, name, email, phone, role, 
      preferences, last_login, created_at, updated_at,
      failed_login_attempts, account_locked_until,
      CASE 
        WHEN account_locked_until > NOW() THEN 'locked'
        WHEN last_login IS NULL THEN 'inactive'
        ELSE 'active'
      END as status
    FROM users WHERE id = $1
  `, [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  
  const user = result.rows[0];
  
  successResponse(res, {
    user: {
      ...user,
      preferences: JSON.parse(user.preferences || '{}'),
      failed_login_attempts: undefined,
      account_locked_until: undefined
    }
  }, 'User retrieved successfully');
}));

/**
 * @swagger
 * /api/v2/admin/users/{id}/lock:
 *   post:
 *     summary: Lock user account (v2)
 *     tags: [Admin v2]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               duration:
 *                 type: integer
 *                 default: 30
 *                 description: Lock duration in minutes
 *               reason:
 *                 type: string
 *                 description: Reason for locking
 *     responses:
 *       200:
 *         description: User account locked successfully
 *       404:
 *         description: User not found
 */
router.post('/users/:id/lock', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { duration = 30, reason = 'Administrative action' } = req.body;
  
  // Check if user exists
  const existingUser = await db.query('SELECT id, name, email FROM users WHERE id = $1', [id]);
  if (existingUser.rows.length === 0) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  
  // Prevent admin from locking themselves
  if (id === req.user.id) {
    throw new AppError('Cannot lock your own account', 400, 'CANNOT_LOCK_SELF');
  }
  
  const lockUntil = new Date(Date.now() + duration * 60 * 1000);
  
  await db.query(
    'UPDATE users SET account_locked_until = $1, failed_login_attempts = 5 WHERE id = $2',
    [lockUntil, id]
  );
  
  // Log the action
  logger.info('User account locked', {
    userId: id,
    lockedBy: req.user.id,
    duration,
    reason,
    lockUntil,
    apiVersion: 'v2'
  });
  
  successResponse(res, {
    user_id: id,
    locked_until: lockUntil,
    duration_minutes: duration,
    reason
  }, 'User account locked successfully');
}));

/**
 * @swagger
 * /api/v2/admin/users/{id}/unlock:
 *   post:
 *     summary: Unlock user account (v2)
 *     tags: [Admin v2]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User account unlocked successfully
 *       404:
 *         description: User not found
 */
router.post('/users/:id/unlock', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if user exists
  const existingUser = await db.query('SELECT id, name, email FROM users WHERE id = $1', [id]);
  if (existingUser.rows.length === 0) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  
  await db.query(
    'UPDATE users SET account_locked_until = NULL, failed_login_attempts = 0 WHERE id = $1',
    [id]
  );
  
  // Log the action
  logger.info('User account unlocked', {
    userId: id,
    unlockedBy: req.user.id,
    apiVersion: 'v2'
  });
  
  successResponse(res, { user_id: id }, 'User account unlocked successfully');
}));

/**
 * @swagger
 * /api/v2/admin/stats:
 *   get:
 *     summary: Get admin dashboard statistics (v2)
 *     tags: [Admin v2]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/stats', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  // Get user statistics
  const userStats = await db.query(`
    SELECT 
      role,
      COUNT(*) as count,
      COUNT(CASE WHEN last_login > NOW() - INTERVAL '7 days' THEN 1 END) as active_last_7_days,
      COUNT(CASE WHEN account_locked_until > NOW() THEN 1 END) as locked
    FROM users 
    GROUP BY role
  `);
  
  // Get total users
  const totalUsers = await db.query('SELECT COUNT(*) as count FROM users');
  
  // Get recent activity
  const recentActivity = await db.query(`
    SELECT 
      'user_registration' as type,
      created_at as timestamp,
      name as description
    FROM users 
    WHERE created_at > NOW() - INTERVAL '7 days'
    UNION ALL
    SELECT 
      'user_login' as type,
      last_login as timestamp,
      name as description
    FROM users 
    WHERE last_login > NOW() - INTERVAL '7 days'
    ORDER BY timestamp DESC
    LIMIT 20
  `);
  
  const responseTime = Date.now() - startTime;
  
  successResponse(res, {
    users: {
      total: parseInt(totalUsers.rows[0].count),
      by_role: userStats.rows,
      active_last_7_days: userStats.rows.reduce((sum, row) => sum + parseInt(row.active_last_7_days), 0),
      locked: userStats.rows.reduce((sum, row) => sum + parseInt(row.locked), 0)
    },
    recent_activity: recentActivity.rows
  }, 'Statistics retrieved successfully', {
    api_version: 'v2',
    response_time: responseTime
  });
}));

export default router;
