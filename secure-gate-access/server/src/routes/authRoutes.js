import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken, attachUserFromToken } from '../middleware/authMiddleware.js';
import { tokenService } from '../services/tokenService.js';
import { userService } from '../services/userService.js';
import attachRequestAudit from '../middleware/auditLogger.js';
import loggingService from '../services/loggingService.js';
import { AppError, asyncHandler } from '../middleware/standardizedErrorHandler.js';
import { successResponse, createdResponse, validationErrorResponse, unauthorizedResponse, internalErrorResponse } from '../utils/responseFormatter.js';

const router = express.Router();

// Rate limiting for authentication endpoints (more aggressive)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health endpoints
    return req.path === '/health' || req.path === '/api/health';
  }
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with the provided credentials
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - role
 *             properties:
 *               username:
 *                 type: string
 *                 description: Unique username
 *                 example: john_doe
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: User password (minimum 8 characters)
 *                 example: SecurePass123!
 *               role:
 *                 type: string
 *                 enum: [admin, resident, guard]
 *                 description: User role
 *                 example: resident
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *             example:
 *               success: true
 *               message: User registered successfully
 *               data:
 *                 user:
 *                   id: 1
 *                   username: john_doe
 *                   email: john@example.com
 *                   role: resident
 *               timestamp: "2025-01-01T00:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: User already exists
 *               error:
 *                 code: DUPLICATE_ENTRY
 *               timestamp: "2025-01-01T00:00:00.000Z"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// User registration
// TEMPORARY FIX: Rate limiter and audit disabled for debugging
router.post('/register', /* authLimiter, attachRequestAudit, */ asyncHandler(async (req, res) => {
  const { username, email, password, role } = req.body;
  
  // Add detailed logging for debugging
  console.log('📝 Registration request:', {
    username,
    email,
    role,
    passwordLength: password ? password.length : 0,
    requestId: req.requestId
  });
  
  // Validate required fields
  if (!username || !email || !password || !role) {
    console.log('❌ Validation failed - missing fields:', {
      username: !!username,
      email: !!email,
      password: !!password,
      role: !!role
    });
    throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR', {
      missing: { username: !username, email: !email, password: !password, role: !role }
    });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError('Invalid email format', 400, 'VALIDATION_ERROR', {
      field: 'email',
      value: email
    });
  }

  // Password strength validation
  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters long', 400, 'VALIDATION_ERROR', {
      field: 'password',
      minLength: 8
    });
  }

  // Create user
  console.log('🔄 Attempting to create user...');
  const user = await userService.createUser({
    username,
    email,
    password,
    role
  });

  console.log('✅ User created successfully:', {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  });

  // Success response using standardized format
  createdResponse(res, {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  }, 'User registered successfully');
}));

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user
 *     description: Login with username and password to receive access and refresh tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username or email
 *                 example: john_doe
 *               password:
 *                 type: string
 *                 description: User password
 *                 example: SecurePass123!
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *                         accessToken:
 *                           type: string
 *                           description: JWT access token
 *                         refreshToken:
 *                           type: string
 *                           description: JWT refresh token
 *             example:
 *               success: true
 *               message: Login successful
 *               data:
 *                 user:
 *                   id: 1
 *                   username: john_doe
 *                   email: john@example.com
 *                   role: resident
 *                 accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               timestamp: "2025-01-01T00:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: Invalid credentials
 *               error:
 *                 code: INVALID_CREDENTIALS
 *               timestamp: "2025-01-01T00:00:00.000Z"
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
// User login
// TEMPORARY FIX: Rate limiter and audit disabled for debugging
router.post('/login', /* authLimiter, attachRequestAudit, */ asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    throw new AppError('Username and password required', 400, 'VALIDATION_ERROR', {
      missing: { username: !username, password: !password }
    });
  }

  // Authenticate user
  let user;
  try {
    user = await userService.authenticateUser(username, password);
  } catch (authError) {
    // Handle authentication errors (invalid credentials, account locked, etc.)
    if (authError.message.includes('Invalid credentials') || 
        authError.message.includes('Account is locked')) {
      throw new AppError(authError.message, 401, 'INVALID_CREDENTIALS');
    }
    // Re-throw unexpected errors to be caught by outer catch block
    throw authError;
  }
  
  if (!user) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Generate tokens
  const accessToken = tokenService.generateAccessToken(user);
  const refreshToken = tokenService.generateRefreshToken(user);

  // Success response using standardized format
  successResponse(res, {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    accessToken,
    refreshToken
  }, 'Login successful');
}));

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Generate a new access token using a valid refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                           description: New JWT access token
 *             example:
 *               success: true
 *               message: Token refreshed successfully
 *               data:
 *                 accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               timestamp: "2025-01-01T00:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: Invalid refresh token
 *               error:
 *                 code: INVALID_TOKEN
 *               timestamp: "2025-01-01T00:00:00.000Z"
 */
// Token refresh
router.post('/refresh', attachRequestAudit, asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    throw new AppError('Refresh token required', 400, 'VALIDATION_ERROR', {
      field: 'refreshToken'
    });
  }

  // Verify refresh token
  const decoded = tokenService.verifyRefreshToken(refreshToken);
  const user = await userService.getUserById(decoded.userId);
  
  if (!user) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
  }

  // Generate new access token
  const newAccessToken = tokenService.generateAccessToken(user);

  // Success response using standardized format
  successResponse(res, {
    accessToken: newAccessToken
  }, 'Token refreshed successfully');
}));

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Logout the current user and invalidate their session
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               success: true
 *               message: Logout successful
 *               data: {}
 *               timestamp: "2025-01-01T00:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// User logout
router.post('/logout', authenticateToken, attachRequestAudit, asyncHandler(async (req, res) => {
  // In a real implementation, you would invalidate the token
  // For now, we'll just return success
  successResponse(res, {}, 'Logout successful');
}));

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get user profile
 *     description: Retrieve the current user's profile information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *             example:
 *               success: true
 *               message: Profile retrieved successfully
 *               data:
 *                 user:
 *                   id: 1
 *                   username: john_doe
 *                   email: john@example.com
 *                   role: resident
 *               timestamp: "2025-01-01T00:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// Get current user profile
router.get('/profile', authenticateToken, attachRequestAudit, asyncHandler(async (req, res) => {
  const user = req.user;
  successResponse(res, {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  }, 'Profile retrieved successfully');
}));

export default router;
