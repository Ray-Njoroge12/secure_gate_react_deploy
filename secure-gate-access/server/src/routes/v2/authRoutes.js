import express from 'express';
import { asyncHandler } from '../../middleware/enhancedErrorHandler.js';
import { successResponse, createdResponse } from '../../utils/responseUtils.js';
import { authenticateToken as authenticate, authorize } from '../../middleware/authMiddleware.js';
import { AppError } from '../../middleware/enhancedErrorHandler.js';
import logger from '../../config/logger.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth v2
 *   description: Enhanced authentication endpoints (API v2)
 */

/**
 * @swagger
 * /api/v2/auth/register:
 *   post:
 *     summary: Register a new user (v2 - Enhanced)
 *     tags: [Auth v2]
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
 *               preferences:
 *                 type: object
 *                 properties:
 *                   notifications:
 *                     type: boolean
 *                     default: true
 *                   language:
 *                     type: string
 *                     default: en
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
 *                         preferences:
 *                           type: object
 *                         created_at:
 *                           type: string
 *                           format: date-time
 *                     token:
 *                       type: string
 *                     refresh_token:
 *                       type: string
 *                 meta:
 *                   type: object
 *                   properties:
 *                     api_version:
 *                       type: string
 *                       example: v2
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 *       500:
 *         description: Internal server error
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { 
    name, 
    email, 
    phone, 
    password, 
    role = 'resident',
    preferences = {}
  } = req.body;
  
  // Enhanced input validation
  const validationErrors = [];
  
  if (!name || name.trim().length < 2) {
    validationErrors.push({ field: 'name', message: 'Name must be at least 2 characters long' });
  }
  
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    validationErrors.push({ field: 'email', message: 'Valid email address is required' });
  }
  
  if (!phone || !/^\+?[\d\s\-\(\)]+$/.test(phone)) {
    validationErrors.push({ field: 'phone', message: 'Valid phone number is required' });
  }
  
  if (!password || password.length < 8) {
    validationErrors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
  } else {
    // Enhanced password validation
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      validationErrors.push({ 
        field: 'password', 
        message: 'Password must contain uppercase, lowercase, and numbers' 
      });
    }
  }
  
  if (validationErrors.length > 0) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', { errors: validationErrors });
  }
  
  // Check if user already exists
  const existingUser = await db.query(
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
  
  // Hash password with enhanced security
  const bcrypt = require('bcrypt');
  const saltRounds = 14; // Increased from v1
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  // Insert user with enhanced data
  const result = await db.query(
    `INSERT INTO users (name, email, phone, password_hash, role, preferences, created_at) 
     VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
     RETURNING id, name, email, phone, role, preferences, created_at`,
    [name, email, phone, hashedPassword, role, JSON.stringify(preferences)]
  );
  
  const newUser = result.rows[0];
  
  // Generate JWT tokens (access + refresh)
  const jwt = require('jsonwebtoken');
  const accessToken = jwt.sign(
    { 
      id: newUser.id, 
      email: newUser.email, 
      role: newUser.role,
      type: 'access'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '15m' }
  );
  
  const refreshToken = jwt.sign(
    { 
      id: newUser.id, 
      type: 'refresh' 
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
  
  // Store refresh token in database
  await db.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [newUser.id, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
  );
  
  // Log registration with enhanced details
  logger.info('User registration successful (v2)', {
    userId: newUser.id,
    email: newUser.email,
    role: newUser.role,
    apiVersion: 'v2',
    hasPreferences: Object.keys(preferences).length > 0
  });
  
  // Enhanced response format
  createdResponse(res, {
    user: {
      ...newUser,
      preferences: JSON.parse(newUser.preferences || '{}')
    },
    token: accessToken,
    refresh_token: refreshToken
  }, 'Registration successful', {
    api_version: 'v2',
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/v2/auth/login:
 *   post:
 *     summary: User login (v2 - Enhanced)
 *     tags: [Auth v2]
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
 *               remember_me:
 *                 type: boolean
 *                 default: false
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
 *                     refresh_token:
 *                       type: string
 *                 meta:
 *                   type: object
 *                   properties:
 *                     api_version:
 *                       type: string
 *                       example: v2
 *                     last_login:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Invalid credentials
 *       400:
 *         description: Validation error
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password, remember_me = false } = req.body;
  
  if (!email || !password) {
    throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
  }
  
  // Find user with enhanced query
  const result = await db.query(
    `SELECT id, name, email, phone, role, password_hash, preferences, last_login, 
            failed_login_attempts, account_locked_until
     FROM users WHERE email = $1`,
    [email]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }
  
  const user = result.rows[0];
  
  // Check if account is locked
  if (user.account_locked_until && new Date() < new Date(user.account_locked_until)) {
    throw new AppError('Account is temporarily locked due to multiple failed login attempts', 423, 'ACCOUNT_LOCKED');
  }
  
  // Verify password
  const bcrypt = require('bcrypt');
  const isMatch = await bcrypt.compare(password, user.password_hash);
  
  if (!isMatch) {
    // Increment failed login attempts
    const failedAttempts = (user.failed_login_attempts || 0) + 1;
    const lockUntil = failedAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null; // 30 minutes lock
    
    await db.query(
      'UPDATE users SET failed_login_attempts = $1, account_locked_until = $2 WHERE id = $3',
      [failedAttempts, lockUntil, user.id]
    );
    
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }
  
  // Reset failed login attempts on successful login
  await db.query(
    'UPDATE users SET failed_login_attempts = 0, account_locked_until = NULL, last_login = NOW() WHERE id = $1',
    [user.id]
  );
  
  // Generate JWT tokens
  const jwt = require('jsonwebtoken');
  const tokenExpiry = remember_me ? '30d' : (process.env.JWT_EXPIRY || '15m');
  
  const accessToken = jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      type: 'access'
    },
    process.env.JWT_SECRET,
    { expiresIn: tokenExpiry }
  );
  
  const refreshToken = jwt.sign(
    { 
      id: user.id, 
      type: 'refresh' 
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
  
  // Store refresh token
  await db.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
  );
  
  // Remove sensitive information
  delete user.password_hash;
  delete user.failed_login_attempts;
  delete user.account_locked_until;
  
  // Log login with enhanced details
  logger.info('User login successful (v2)', {
    userId: user.id,
    email: user.email,
    role: user.role,
    apiVersion: 'v2',
    rememberMe: remember_me,
    lastLogin: user.last_login
  });
  
  successResponse(res, {
    user: {
      ...user,
      preferences: JSON.parse(user.preferences || '{}')
    },
    token: accessToken,
    refresh_token: refreshToken
  }, 'Login successful', {
    api_version: 'v2',
    last_login: user.last_login
  });
}));

/**
 * @swagger
 * /api/v2/auth/refresh:
 *   post:
 *     summary: Refresh access token (v2)
 *     tags: [Auth v2]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refresh_token
 *             properties:
 *               refresh_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;
  
  if (!refresh_token) {
    throw new AppError('Refresh token is required', 400, 'VALIDATION_ERROR');
  }
  
  // Verify refresh token
  const jwt = require('jsonwebtoken');
  let decoded;
  
  try {
    decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }
  
  // Check if refresh token exists in database
  const result = await db.query(
    'SELECT user_id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
    [refresh_token]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Refresh token expired or invalid', 401, 'INVALID_REFRESH_TOKEN');
  }
  
  // Get user information
  const userResult = await db.query(
    'SELECT id, email, role FROM users WHERE id = $1',
    [decoded.id]
  );
  
  if (userResult.rows.length === 0) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  
  const user = userResult.rows[0];
  
  // Generate new access token
  const accessToken = jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      type: 'access'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '15m' }
  );
  
  successResponse(res, { token: accessToken }, 'Token refreshed successfully');
}));

/**
 * @swagger
 * /api/v2/auth/me:
 *   get:
 *     summary: Get current user profile (v2 - Enhanced)
 *     tags: [Auth v2]
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
  
  // Get additional user information
  const result = await db.query(
    'SELECT preferences, last_login, created_at FROM users WHERE id = $1',
    [user.id]
  );
  
  const userData = result.rows[0];
  
  // Remove sensitive information
  delete user.password_hash;
  
  successResponse(res, {
    user: {
      ...user,
      preferences: JSON.parse(userData.preferences || '{}'),
      last_login: userData.last_login,
      created_at: userData.created_at
    }
  }, 'User profile retrieved successfully');
}));

/**
 * @swagger
 * /api/v2/auth/logout:
 *   post:
 *     summary: User logout (v2 - Enhanced)
 *     tags: [Auth v2]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refresh_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;
  
  // Revoke refresh token if provided
  if (refresh_token) {
    await db.query(
      'DELETE FROM refresh_tokens WHERE token = $1 AND user_id = $2',
      [refresh_token, req.user.id]
    );
  }
  
  logger.info('User logout (v2)', {
    userId: req.user.id,
    email: req.user.email,
    apiVersion: 'v2',
    refreshTokenRevoked: !!refresh_token
  });
  
  successResponse(res, null, 'Logout successful');
}));

export default router;
