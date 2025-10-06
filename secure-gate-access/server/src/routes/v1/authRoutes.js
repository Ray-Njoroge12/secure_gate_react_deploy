import express from 'express';
import { asyncHandler } from '../../middleware/enhancedErrorHandler.js';
import { successResponse, createdResponse } from '../../utils/responseUtils.js';
import { authenticateToken as authenticate, authorize } from '../../middleware/authMiddleware.js';
import { AppError } from '../../middleware/enhancedErrorHandler.js';
import logger from '../../config/logger.js';
import { dbManager } from '../../database/db.enhanced.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth v1
 *   description: Authentication endpoints (API v1)
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user (v1)
 *     tags: [Auth v1]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               phone:
 *                 type: string
 *                 example: +254712345678
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePass123!
 *               role:
 *                 type: string
 *                 enum: [resident, guard, admin]
 *                 default: resident
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Registration successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         role:
 *                           type: string
 *                     token:
 *                       type: string
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 *       500:
 *         description: Internal server error
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, phone, password, role = 'resident' } = req.body;
  
  // Input validation
  if (!name || !email || !phone || !password) {
    throw new AppError('All fields are required', 400, 'VALIDATION_ERROR', {
      missing: { name: !name, email: !email, phone: !phone, password: !password }
    });
  }
  
  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError('Invalid email format', 400, 'INVALID_EMAIL_FORMAT');
  }
  
  // Password strength validation
  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters long', 400, 'WEAK_PASSWORD');
  }
  
  // Check if user already exists
  const existingUser = await dbManager.query(
    'SELECT id, email, phone FROM users WHERE email = $1 OR phone = $2',
    [email, phone]
  );
  
  if (existingUser.rows.length > 0) {
    const conflict = existingUser.rows[0];
    throw new AppError(
      conflict.email === email ? 'Email already registered' : 'Phone number already registered',
      409,
      'DUPLICATE_USER',
      { field: conflict.email === email ? 'email' : 'phone' }
    );
  }
  
  // Hash password
  const bcrypt = require('bcrypt');
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  // Insert user
  const result = await dbManager.query(
    `INSERT INTO users (name, email, phone, password_hash, role, created_at) 
     VALUES ($1, $2, $3, $4, $5, NOW()) 
     RETURNING id, name, email, phone, role, created_at`,
    [name, email, phone, hashedPassword, role]
  );
  
  const newUser = result.rows[0];
  
  // Generate JWT token
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { 
      id: newUser.id, 
      email: newUser.email, 
      role: newUser.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '15m' }
  );
  
  // Log registration
  logger.info('User registration successful', {
    userId: newUser.id,
    email: newUser.email,
    role: newUser.role,
    apiVersion: 'v1'
  });
  
  createdResponse(res, { user: newUser, token }, 'Registration successful');
}));

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User login (v1)
 *     tags: [Auth v1]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: SecurePass123!
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                     token:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 *       400:
 *         description: Validation error
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
  }
  
  // Find user
  const result = await dbManager.query(
    'SELECT id, name, email, phone, role, password_hash FROM users WHERE email = $1',
    [email]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }
  
  const user = result.rows[0];
  
  // Verify password
  const bcrypt = require('bcrypt');
  const isMatch = await bcrypt.compare(password, user.password_hash);
  
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }
  
  // Generate JWT token
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '15m' }
  );
  
  // Remove password hash from response
  delete user.password_hash;
  
  // Log login
  logger.info('User login successful', {
    userId: user.id,
    email: user.email,
    role: user.role,
    apiVersion: 'v1'
  });
  
  successResponse(res, { user, token }, 'Login successful');
}));

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user profile (v1)
 *     tags: [Auth v1]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = req.user;
  
  // Remove sensitive information
  delete user.password_hash;
  
  successResponse(res, { user }, 'User profile retrieved successfully');
}));

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: User logout (v1)
 *     tags: [Auth v1]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  // In a real implementation, you might want to blacklist the token
  // For now, we'll just return success
  
  logger.info('User logout', {
    userId: req.user.id,
    email: req.user.email,
    apiVersion: 'v1'
  });
  
  successResponse(res, null, 'Logout successful');
}));

export default router;
