import express from 'express';
import { asyncHandler } from '../../middleware/enhancedErrorHandler.js';
import { successResponse, createdResponse } from '../../utils/responseUtils.js';
import { authenticateToken as authenticate, authorize } from '../../middleware/authMiddleware.js';
import { AppError } from '../../middleware/enhancedErrorHandler.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin v1
 *   description: Admin endpoints (API v1)
 */

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all users (v1)
 *     tags: [Admin v1]
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
 *         description: Number of users per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [resident, guard, admin]
 *         description: Filter by role
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/users', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, role } = req.query;
  const offset = (page - 1) * limit;
  
  let query = 'SELECT id, name, email, phone, role, created_at FROM users';
  const params = [];
  
  if (role) {
    query += ' WHERE role = $1';
    params.push(role);
  }
  
  query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(parseInt(limit), parseInt(offset));
  
  const result = await db.query(query, params);
  
  // Get total count
  let countQuery = 'SELECT COUNT(*) FROM users';
  if (role) {
    countQuery += ' WHERE role = $1';
  }
  const countResult = await db.query(countQuery, role ? [role] : []);
  const total = parseInt(countResult.rows[0].count);
  
  successResponse(res, {
    users: result.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  }, 'Users retrieved successfully');
}));

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   get:
 *     summary: Get user by ID (v1)
 *     tags: [Admin v1]
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
  
  const result = await db.query(
    'SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1',
    [id]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  
  successResponse(res, { user: result.rows[0] }, 'User retrieved successfully');
}));

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   put:
 *     summary: Update user (v1)
 *     tags: [Admin v1]
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [resident, guard, admin]
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 */
router.put('/users/:id', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, role } = req.body;
  
  // Check if user exists
  const existingUser = await db.query('SELECT id FROM users WHERE id = $1', [id]);
  if (existingUser.rows.length === 0) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  
  // Check if email is already taken by another user
  if (email) {
    const emailCheck = await db.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, id]
    );
    if (emailCheck.rows.length > 0) {
      throw new AppError('Email already taken', 409, 'EMAIL_TAKEN');
    }
  }
  
  // Update user
  const result = await db.query(
    `UPDATE users SET 
     name = COALESCE($1, name),
     email = COALESCE($2, email),
     phone = COALESCE($3, phone),
     role = COALESCE($4, role),
     updated_at = NOW()
     WHERE id = $5
     RETURNING id, name, email, phone, role, created_at, updated_at`,
    [name, email, phone, role, id]
  );
  
  successResponse(res, { user: result.rows[0] }, 'User updated successfully');
}));

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   delete:
 *     summary: Delete user (v1)
 *     tags: [Admin v1]
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
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 */
router.delete('/users/:id', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if user exists
  const existingUser = await db.query('SELECT id FROM users WHERE id = $1', [id]);
  if (existingUser.rows.length === 0) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  
  // Prevent admin from deleting themselves
  if (id === req.user.id) {
    throw new AppError('Cannot delete your own account', 400, 'CANNOT_DELETE_SELF');
  }
  
  // Delete user
  await db.query('DELETE FROM users WHERE id = $1', [id]);
  
  successResponse(res, { id }, 'User deleted successfully');
}));

export default router;
