import express from 'express';
import { randomBytes } from 'crypto';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { tokenService } from '../services/tokenService.js';
import { getCookieOptions } from '../utils/cookies.js';
import { userService } from '../services/userService.js';
import attachRequestAudit from '../middleware/auditLogger.js';
import loggingService from '../services/loggingService.js';
import { AppError, asyncHandler } from '../middleware/standardizedErrorHandler.js';
import { successResponse, createdResponse, validationErrorResponse, unauthorizedResponse, internalErrorResponse } from '../utils/responseFormatter.js';
import { validatePasswordResetRequest, validatePasswordReset, validateRegistration, validateLogin, validateRefreshRequest } from '../validation/authValidation.js';
import emailService from '../services/emailService.js';

const router = express.Router();

// Rate limiting for authentication endpoints (more aggressive)
// Skip in development/test mode to allow testing
const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 100 : 5, // Higher limit in dev, strict in production
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development mode or for health endpoints
    if (isDev) return true;
    return req.path === '/health' || req.path === '/api/health';
  }
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 300 : 60,
  message: 'Too many refresh attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (isDev) return true;
    return req.path === '/health' || req.path === '/api/health';
  }
});

const getClientPlatform = (req) => {
  const header = req.headers['x-client-platform'] || req.headers['x-client-type'];
  if (typeof header === 'string') {
    const normalized = header.trim().toLowerCase();
    if (normalized === 'mobile' || normalized === 'api') return 'mobile';
    if (normalized === 'web') return 'web';
  }
  return 'web';
};

const getBearerToken = (req) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer') return null;
  return token;
};

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
// BUG-001 FIX: Rate limiter re-enabled for production security
router.post('/register', authLimiter, validateRegistration, attachRequestAudit(), asyncHandler(async (req, res) => {
  const { username, email, password, role } = req.body;
  
  // BUG-006 FIX: Using proper logging service instead of console.log
  loggingService.info('Registration request received', {
    username,
    email,
    role,
    requestId: req.requestId
  });
  
  // Validate required fields
  if (!username || !email || !password || !role) {
    loggingService.warn('Registration validation failed - missing fields', {
      hasUsername: !!username,
      hasEmail: !!email,
      hasPassword: !!password,
      hasRole: !!role,
      requestId: req.requestId
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
  loggingService.info('Attempting to create user', { username, email, role, requestId: req.requestId });
  const user = await userService.createUser({
    username,
    email,
    password,
    role
  });

  loggingService.info('User created successfully', {
    userId: user.id,
    username: user.username,
    role: user.role,
    requestId: req.requestId
  });

  // Send email verification
  try {
    loggingService.info('Sending verification email', { 
      email: user.email, 
      hasToken: !!user.verification_token,
      requestId: req.requestId
    });
    
    const emailResult = await emailService.sendRegistrationConfirmation(
      user.email, 
      user.username,
      user.verification_token
    );
    
    loggingService.info('Verification email sent successfully', { 
      messageId: emailResult?.id || 'unknown',
      requestId: req.requestId
    });
  } catch (emailError) {
    loggingService.error('Failed to send verification email', {
      error: emailError.message,
      email: user.email,
      requestId: req.requestId
    });
    // Don't fail registration if email fails - user can request resend
  }

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
// BUG-001 FIX: Rate limiter re-enabled for production security
router.post('/login', authLimiter, validateLogin, attachRequestAudit(), asyncHandler(async (req, res) => {
  // Accept either username or email field for login
  const { username, email, password, estate_id: estateId } = req.body;
  const userIdentifier = username || email;
  
  if (!userIdentifier || !password) {
    throw new AppError('Username/email and password required', 400, 'VALIDATION_ERROR', {
      missing: { userIdentifier: !userIdentifier, password: !password }
    });
  }

  // Authenticate user
  let user;
  try {
    user = await userService.authenticateUser(userIdentifier, password, estateId);
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

  const platform = getClientPlatform(req);
  const isWebClient = platform === 'web';

  const { accessToken, refreshToken, refreshJti, expiresIn, tokenType } = tokenService.generateTokens(user);
  const refreshInfo = tokenService.getTokenInfo(refreshToken);
  const refreshExpiresAt = refreshInfo?.exp ? new Date(refreshInfo.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await tokenService.storeRefreshToken(
    refreshJti,
    user.id,
    refreshToken,
    refreshExpiresAt,
    {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    }
  );

  // BUG-008 FIX: Set tokens as httpOnly cookies instead of returning in body
  const cookieOptions = getCookieOptions();
  
  // Set access token cookie
  // For cross-site (Netlify frontend + Render backend), use sameSite: 'none' + secure: true
  if (isWebClient) {
    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  successResponse(res, {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      estate_id: user.estate_id
    },
    ...(isWebClient
      ? { session: { type: 'cookie' } }
      : { accessToken, refreshToken, tokenType, expiresIn })
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
router.post('/refresh', refreshLimiter, validateRefreshRequest, attachRequestAudit(), asyncHandler(async (req, res) => {
  const platform = getClientPlatform(req);
  const isWebClient = platform === 'web';
  const refreshToken = isWebClient ? req.cookies?.refreshToken : (getBearerToken(req) || req.body?.refreshToken);

  if (!refreshToken) {
    throw new AppError('Refresh token required', 400, 'VALIDATION_ERROR', {
      field: 'refreshToken'
    });
  }

  const decoded = await tokenService.verifyRefreshToken(refreshToken);
  const userId = Number(decoded.sub || decoded.userId);
  const user = await userService.getUserById(userId);
  
  if (!user) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
  }

  const storedToken = await tokenService.getRefreshTokenRecord(refreshToken);
  if (!storedToken || storedToken.is_revoked) {
    throw new AppError('Refresh token has been revoked', 401, 'INVALID_TOKEN');
  }

  if (storedToken.user_id !== user.id) {
    throw new AppError('Refresh token mismatch', 401, 'INVALID_TOKEN');
  }

  if (storedToken.expires_at && new Date(storedToken.expires_at) <= new Date()) {
    throw new AppError('Refresh token expired', 401, 'INVALID_TOKEN');
  }

  await tokenService.revokeRefreshToken(refreshToken);

  const { accessToken, refreshToken: nextRefreshToken, refreshJti, expiresIn, tokenType } = tokenService.generateTokens(user);
  const refreshInfo = tokenService.getTokenInfo(nextRefreshToken);
  const refreshExpiresAt = refreshInfo?.exp ? new Date(refreshInfo.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await tokenService.storeRefreshToken(
    refreshJti,
    user.id,
    nextRefreshToken,
    refreshExpiresAt,
    {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    }
  );

  const cookieOptions = getCookieOptions();

  if (isWebClient) {
    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', nextRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  successResponse(res, {
    ...(isWebClient
      ? { session: { type: 'cookie' } }
      : { accessToken, refreshToken: nextRefreshToken, tokenType, expiresIn })
  }, 'Token refreshed successfully');
}));

/**
 * @swagger
 * /api/auth/csrf-token:
 *   get:
 *     summary: Get CSRF token
 *     description: Returns the current CSRF token for the session
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: CSRF token retrieved successfully
 */
router.get('/csrf-token', asyncHandler(async (req, res) => {
  if (!req.session) {
    throw new AppError('Session not initialized', 500, 'NO_SESSION');
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = randomBytes(32).toString('hex');
  }

  res.setHeader('X-CSRF-Token', req.session.csrfToken);

  successResponse(res, { csrfToken: req.session.csrfToken }, 'CSRF token issued');
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
router.post('/logout', authenticateToken, attachRequestAudit(), asyncHandler(async (req, res) => {
  // BUG-008 FIX: Clear httpOnly cookies on logout
  const cookieOptions = getCookieOptions();
  const accessToken = getBearerToken(req) || req.cookies?.accessToken;
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (accessToken) {
    await tokenService.revokeToken(accessToken);
  }
  if (refreshToken) {
    await tokenService.revokeRefreshToken(refreshToken);
  }
  
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);

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
router.get('/profile', authenticateToken, attachRequestAudit(), asyncHandler(async (req, res) => {
  const user = req.user;
  successResponse(res, {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      estate_id: user.estate_id
    }
  }, 'Profile retrieved successfully');
}));

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     description: Returns the currently authenticated user based on httpOnly cookie session
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User data retrieved successfully
 *       401:
 *         description: Not authenticated
 */
// BUG-004 FIX: Add /me endpoint for session validation (used by AuthContext)
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new AppError('Not authenticated', 401, 'NOT_AUTHENTICATED');
  }
  successResponse(res, {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      estate_id: user.estate_id
    }
  }, 'User retrieved successfully');
}));

// Password reset request - non-enumerating endpoint
router.post(
  '/forgot-password',
  authLimiter,
  attachRequestAudit(),
  validatePasswordResetRequest,
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    // Always return a generic success message to avoid email enumeration
    const genericMessage = 'If this email exists in our system, a password reset link has been sent.';

    try {
      const result = await userService.requestPasswordReset(email);

      // Only attempt to send an email when we have a concrete user and token
      if (result && result.user && result.resetToken) {
        try {
          await emailService.sendPasswordResetEmail(
            result.user.email,
            result.user.username,
            result.resetToken
          );
        } catch (emailError) {
          // Log email failures but do not change the generic client response
          loggingService.error('Password reset email send failed', {
            error: emailError.message,
            requestId: req.requestId
          });
        }
      }

      successResponse(res, {}, genericMessage);
    } catch (error) {
      // Log internal error but avoid leaking details to the client
      loggingService.error('Password reset request failed', {
        error: error.message,
        requestId: req.requestId
      });

      successResponse(res, {}, genericMessage);
    }
  })
);

// Password reset using token
router.post(
  '/reset-password',
  authLimiter,
  attachRequestAudit(),
  validatePasswordReset,
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    try {
      await userService.resetPasswordWithToken(token, password);

      successResponse(res, {}, 'Password reset successful. You can now log in with your new password.');
    } catch (error) {
      // Log details server-side, return safe error to client
      loggingService.error('Password reset with token failed', {
        error: error.message,
        requestId: req.requestId
      });

      throw new AppError('Invalid or expired reset token, or password does not meet security requirements.', 400, 'PASSWORD_RESET_FAILED');
    }
  })
);

export default router;
