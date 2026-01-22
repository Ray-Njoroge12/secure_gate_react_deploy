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
import { successResponse, createdResponse, validationErrorResponse, unauthorizedResponse, internalErrorResponse, errorResponse } from '../utils/responseFormatter.js';
import { validatePasswordResetRequest, validatePasswordReset, validateRegistration, validateLogin, validateRefreshRequest } from '../validation/authValidation.js';
import emailService from '../services/emailService.js';
import { maskEmail } from '../utils/redaction.js';

const router = express.Router();

// Rate limiting for authentication endpoints (more aggressive)
// Skip in development/test mode to allow testing
const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
const authLimiterMax = Number.parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10);
const refreshLimiterMax = Number.parseInt(process.env.REFRESH_RATE_LIMIT_MAX, 10);
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number.isFinite(authLimiterMax) ? authLimiterMax : (isDev ? 100 : 5), // Higher limit in dev, strict in production
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    loggingService.warn('Login rate limit exceeded', {
      event: 'auth.login.rate_limit',
      ip: req.ip,
      userAgent: req.get('user-agent'),
      request_id: req.requestId,
      route: req.originalUrl,
      method: req.method,
      status: options.statusCode,
      user_id: req.user?.id ?? null,
      estate_id: req.user?.estate_id ?? null
    });
    errorResponse(res, options.message, 'AUTH_RATE_LIMIT', options.statusCode, null, req);
  },
  skip: (req) => {
    // Skip rate limiting in development mode or for health endpoints
    if (isDev) return true;
    return req.path === '/health' || req.path === '/api/health';
  }
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number.isFinite(refreshLimiterMax) ? refreshLimiterMax : (isDev ? 300 : 60),
  message: 'Too many refresh attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    loggingService.warn('Refresh rate limit exceeded', {
      event: 'auth.refresh.rate_limit',
      ip: req.ip,
      userAgent: req.get('user-agent'),
      request_id: req.requestId,
      route: req.originalUrl,
      method: req.method,
      status: options.statusCode,
      user_id: req.user?.id ?? null,
      estate_id: req.user?.estate_id ?? null
    });
    errorResponse(res, options.message, 'REFRESH_RATE_LIMIT', options.statusCode, null, req);
  },
  skip: (req) => {
    if (isDev) return true;
    return req.path === '/health' || req.path === '/api/health';
  }
});

const refreshReuseWindowMs = Number.parseInt(process.env.REFRESH_REUSE_WINDOW_MS, 10);
const refreshReuseWindow = Number.isFinite(refreshReuseWindowMs) ? refreshReuseWindowMs : 30000;

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
// AUTH-008 UPDATE: Registration now PUBLIC for residents (admin approval required via pending status)
import { requireRole } from '../middleware/roleMiddleware.js';

router.post('/register', authLimiter, validateRegistration, attachRequestAudit(), asyncHandler(async (req, res) => {
  const { username, email, password, phone } = req.body;

  // BUG-006 FIX: Using proper logging service instead of console.log
  loggingService.info('Public registration request received', {
    event: 'auth.register.requested',
    username,
    email,
    phone: phone ? 'provided' : 'not_provided',
    request_id: req.requestId
  });

  // Validate required fields (simplified for public registration)
  if (!username || !email || !password) {
    loggingService.warn('Registration validation failed - missing fields', {
      event: 'auth.register.validation_failed',
      hasUsername: !!username,
      hasEmail: !!email,
      hasPassword: !!password,
      request_id: req.requestId
    });
    throw new AppError('Username, email, and password are required', 400, 'VALIDATION_ERROR', {
      missing: { username: !username, email: !email, password: !password }
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

  // Create user with default values for public registration
  loggingService.info('Creating pending user account', {
    event: 'auth.register.creating_user',
    username,
    email: maskEmail(email),
    role: 'resident',
    account_status: 'pending',
    request_id: req.requestId
  });
  const user = await userService.createUser({
    username,
    email,
    password,
    phone: phone || null,
    role: 'resident', // Default to resident for public registration
    account_status: 'pending', // Requires admin approval
    estate_id: null // Will be assigned during activation
  });

  loggingService.info('User created successfully - pending approval', {
    event: 'auth.register.success',
    userId: user.id,
    username: user.username,
    account_status: 'pending',
    request_id: req.requestId
  });

  // Send email verification
  try {
    loggingService.info('Sending verification email', {
      event: 'auth.register.email_send_requested',
      email: maskEmail(user.email),
      hasToken: !!user.verification_token,
      request_id: req.requestId
    });

    const emailResult = await emailService.sendRegistrationConfirmation(
      user.email,
      user.username,
      user.verification_token
    );

    loggingService.info('Verification email sent successfully', {
      event: 'auth.register.email_sent',
      messageId: emailResult?.id || 'unknown',
      request_id: req.requestId
    });
  } catch (emailError) {
    loggingService.error('Failed to send verification email', {
      event: 'auth.register.email_failed',
      error: emailError.message,
      email: maskEmail(user.email),
      request_id: req.requestId
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
 * /api/auth/check-email:
 *   get:
 *     summary: Check if email is available
 *     description: Check if an email address is already registered
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email address to check
 *     responses:
 *       200:
 *         description: Email availability status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                   description: Whether the email is already registered
 *             example:
 *               exists: false
 *       400:
 *         description: Invalid request
 */
router.get('/check-email', asyncHandler(async (req, res) => {
  const { email } = req.query;

  if (!email) {
    throw new AppError('Email parameter is required', 400, 'VALIDATION_ERROR', {
      field: 'email'
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError('Invalid email format', 400, 'VALIDATION_ERROR', {
      field: 'email'
    });
  }

  // Check if email exists in database
  const result = await userService.db.query(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
    [email.trim()]
  );

  const exists = result.rows.length > 0;

  // Return simple boolean response
  res.json({ exists });
}));

/**
 * @swagger
 * /api/auth/verify-email:
 *   get:
 *     summary: Verify email address
 *     description: Verify user email with token from verification email
 *     tags: [Authentication]
 */
router.get('/verify-email', asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    throw new AppError('Verification token is required', 400, 'VALIDATION_ERROR');
  }

  // Find user with this verification token
  const userResult = await userService.db.query(
    `SELECT id, username, email, verified, verification_expires 
     FROM users 
     WHERE verification_token = $1`,
    [token]
  );

  if (userResult.rows.length === 0) {
    throw new AppError('Invalid or expired verification token', 400, 'INVALID_TOKEN');
  }

  const user = userResult.rows[0];

  // Check if already verified
  if (user.verified) {
    return successResponse(res, {
      message: 'Email already verified'
    }, 'Email already verified');
  }

  // Check if token expired
  if (user.verification_expires && new Date(user.verification_expires) < new Date()) {
    throw new AppError('Verification token has expired', 400, 'TOKEN_EXPIRED');
  }

  // Update user to verified
  await userService.db.query(
    `UPDATE users 
     SET verified = true, 
         verification_token = NULL, 
         verification_expires = NULL,
         updated_at = NOW()
     WHERE id = $1`,
    [user.id]
  );

  loggingService.info('Email verified successfully', {
    userId: user.id,
    email: user.email
  });

  successResponse(res, {
    verified: true,
    email: user.email
  }, 'Email verified successfully');
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
      loggingService.warn('Login failed', {
        event: 'auth.login.failed',
        route: req.originalUrl,
        method: req.method,
        status: 401,
        request_id: req.requestId,
        user_id: null,
        estate_id: estateId ?? null,
        reason: authError.message.includes('Account is locked') ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS'
      });
      throw new AppError(authError.message, 401, 'INVALID_CREDENTIALS');
    }
    // Re-throw unexpected errors to be caught by outer catch block
    console.error('❌ Login Unexpected Error:', authError);
    throw authError;
  }

  if (!user) {
    loggingService.warn('Login failed', {
      event: 'auth.login.failed',
      route: req.originalUrl,
      method: req.method,
      status: 401,
      request_id: req.requestId,
      user_id: null,
      estate_id: estateId ?? null,
      reason: 'INVALID_CREDENTIALS'
    });
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

  loggingService.info('Login successful', {
    event: 'auth.login.success',
    route: req.originalUrl,
    method: req.method,
    status: 200,
    request_id: req.requestId,
    user_id: user.id,
    estate_id: user.estate_id ?? null,
    session_type: isWebClient ? 'cookie' : 'token',
    client_platform: platform
  });

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
    loggingService.warn('Refresh token missing', {
      event: 'auth.refresh.missing',
      route: req.originalUrl,
      method: req.method,
      status: 400,
      user_id: req.user?.id ?? null,
      estate_id: req.user?.estate_id ?? null,
      request_id: req.requestId
    });
    throw new AppError('Refresh token required', 400, 'VALIDATION_ERROR', {
      field: 'refreshToken'
    });
  }

  let decoded;
  try {
    decoded = await tokenService.verifyRefreshToken(refreshToken);
  } catch (error) {
    loggingService.warn('Refresh token verification failed', {
      event: 'auth.refresh.verification_failed',
      route: req.originalUrl,
      method: req.method,
      status: 401,
      request_id: req.requestId,
      user_id: req.user?.id ?? null,
      estate_id: req.user?.estate_id ?? null,
      error: error.name
    });
    throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
  }
  const userId = Number(decoded.sub || decoded.userId);
  const user = await userService.getUserById(userId);

  if (!user) {
    loggingService.warn('Refresh token user not found', {
      event: 'auth.refresh.user_not_found',
      route: req.originalUrl,
      method: req.method,
      status: 401,
      request_id: req.requestId,
      user_id: userId || null,
      estate_id: null
    });
    throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
  }

  const storedToken = await tokenService.getRefreshTokenRecord(refreshToken);
  if (!storedToken || storedToken.is_revoked) {
    const revokedAt = storedToken?.revoked_at ? new Date(storedToken.revoked_at) : null;
    const withinReuseWindow = Boolean(
      storedToken?.is_revoked
      && revokedAt
      && Date.now() - revokedAt.getTime() <= refreshReuseWindow
    );

    if (!storedToken || !withinReuseWindow) {
      loggingService.warn('Refresh token revoked or missing', {
        event: 'auth.refresh.revoked',
        route: req.originalUrl,
        method: req.method,
        status: 401,
        request_id: req.requestId,
        user_id: user.id,
        estate_id: user.estate_id ?? null
      });
      throw new AppError('Refresh token has been revoked', 401, 'INVALID_TOKEN');
    }

    loggingService.info('Refresh token reused within grace window', {
      event: 'auth.refresh.reused',
      route: req.originalUrl,
      method: req.method,
      status: 200,
      request_id: req.requestId,
      user_id: user.id,
      estate_id: user.estate_id ?? null,
      reuseWindowMs: refreshReuseWindow
    });
  }

  if (storedToken.user_id !== user.id) {
    loggingService.warn('Refresh token user mismatch', {
      event: 'auth.refresh.user_mismatch',
      route: req.originalUrl,
      method: req.method,
      status: 401,
      request_id: req.requestId,
      user_id: user.id,
      estate_id: user.estate_id ?? null
    });
    throw new AppError('Refresh token mismatch', 401, 'INVALID_TOKEN');
  }

  if (storedToken.expires_at && new Date(storedToken.expires_at) <= new Date()) {
    loggingService.warn('Refresh token expired', {
      event: 'auth.refresh.expired',
      route: req.originalUrl,
      method: req.method,
      status: 401,
      request_id: req.requestId,
      user_id: user.id,
      estate_id: user.estate_id ?? null
    });
    throw new AppError('Refresh token expired', 401, 'INVALID_TOKEN');
  }

  await tokenService.markRefreshTokenUsed(refreshToken);

  if (!storedToken.is_revoked) {
    await tokenService.revokeRefreshToken(refreshToken);
  }

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

  loggingService.info('Refresh token rotated', {
    event: 'auth.refresh.success',
    route: req.originalUrl,
    method: req.method,
    status: 200,
    request_id: req.requestId,
    user_id: user.id,
    estate_id: user.estate_id ?? null,
    session_type: isWebClient ? 'cookie' : 'token',
    client_platform: platform
  });

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
            event: 'auth.password_reset.email_failed',
            error: emailError.message,
            request_id: req.requestId
          });
        }
      }

      successResponse(res, {}, genericMessage);
    } catch (error) {
      // Log internal error but avoid leaking details to the client
      loggingService.error('Password reset request failed', {
        event: 'auth.password_reset.request_failed',
        error: error.message,
        request_id: req.requestId
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
        event: 'auth.password_reset.token_failed',
        error: error.message,
        request_id: req.requestId
      });

      throw new AppError('Invalid or expired reset token, or password does not meet security requirements.', 400, 'PASSWORD_RESET_FAILED');
    }
  })
);

export default router;
