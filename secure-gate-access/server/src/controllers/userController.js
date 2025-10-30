import { dbManager } from '../database/db.enhanced.js';
import { auditLog } from '../services/auditService.js';
import { tokenService, passwordService, accountSecurity } from '../services/tokenService.js';
import auditLogger from '../services/auditLogger.js';
import { ErrorHelper, asyncHandler } from '../middleware/errorHandler.js';
import { ResponseUtil, sanitizeUser } from '../utils/responseUtils.js';
import sessionSecurityService from '../services/sessionSecurityService.js';
import loggingService from '../services/loggingService.js';
import { encryptUserData, decryptUserData } from '../utils/encryptionHelper.js';
// bcrypt will be imported dynamically

/**
 * User Controller
 * Handles user authentication, registration, and profile management
 * Provides secure user operations with comprehensive logging and error handling
 */

// Update user profile (PostgreSQL version) - Updated with standardized error handling
export const updateProfile = asyncHandler(async (req, res) => {
  const { email, name, phone, profilePic, notify_email, notify_sms } = req.body;

  // Validation: prevent both notify_email and notify_sms being false if no fallback
  if (notify_email === false && notify_sms === false) {
    // UI fallback will allow OTP/QR view when notifications are disabled
  }

  // Input validation
  if (!email) {
    throw ErrorHelper.requiredField('email');
  }

  // Check if user exists
  const existingRes = await dbManager.query(
    'SELECT id, email, email_encrypted, role, name, phone, phone_encrypted, profile_pic, notify_email, notify_sms, created_at FROM users WHERE email = $1',
    [email]
  );

  if (existingRes.rowCount === 0) {
    throw ErrorHelper.notFound('User', email);
  }

  const existing = await decryptUserData(existingRes.rows[0]);

  // Prepare updated data with encryption
  const updateData = {
    phone: phone || existing.phone || null
  };
  
  const encrypted = await encryptUserData(updateData);

  // Update user profile with encrypted fields
  await dbManager.query(
    `UPDATE users SET 
      name = $1, 
      phone = $2, 
      phone_encrypted = $3,
      profile_pic = $4, 
      notify_email = $5, 
      notify_sms = $6,
      encryption_version = $7,
      encrypted_at = NOW()
    WHERE email = $8`,
    [
      name || existing.name || null,
      updateData.phone,
      encrypted.phone_encrypted,
      profilePic || existing.profile_pic || null,
      notify_email !== undefined ? notify_email : existing.notify_email,
      notify_sms !== undefined ? notify_sms : existing.notify_sms,
      'v1',
      email
    ]
  );

  // Get updated user data
  const updatedRes = await dbManager.query(
    'SELECT id, email, email_encrypted, role, name, phone, phone_encrypted, profile_pic, notify_email, notify_sms, created_at FROM users WHERE email = $1',
    [email]
  );

  const decryptedUser = await decryptUserData(updatedRes.rows[0]);
  return ResponseUtil.updated(res, sanitizeUser(decryptedUser), 'Profile updated successfully');
});

// Register user with enhanced password security - Updated with standardized error handling
export const registerUser = asyncHandler(async (req, res) => {
  const { email, username, role, password, phone, area, house, notify_email, notify_sms } = req.body;
  
  // Normalize role to lowercase
  const normalizedRole = role ? role.toLowerCase() : 'resident';

  // Input validation
  const requiredFields = ['email', 'username', 'role', 'password'];
  const missingFields = requiredFields.filter(field => !req.body[field]);
  if (missingFields.length > 0) {
    throw ErrorHelper.requiredField(missingFields.join(', '));
  }

  // Enhanced password strength validation
  const passwordCheck = passwordService.checkPasswordStrength(password);
  if (passwordCheck.strength === 'weak') {
    throw ErrorHelper.invalidFormat('password', 'Strong password required', {
      requirements: passwordCheck.message,
      strength: passwordCheck.strength
    });
  }

  // Check if email already exists
  const exists = await dbManager.query('SELECT id FROM users WHERE email=$1', [email]);
  if (exists.rowCount > 0) {
    throw ErrorHelper.alreadyExists('User', email);
  }

  // Hash password using Argon2
  const hash = await passwordService.hashPassword(password);

  // Encrypt personal data
  const encrypted = await encryptUserData({ email, phone });

  // Create user with secure password hash and encrypted data
  const result = await dbManager.query(
    `INSERT INTO users (
      email, email_encrypted,
      username, role, password_hash, verified, 
      phone, phone_encrypted,
      area, house, notify_email, notify_sms,
      encryption_version, encrypted_at
    )
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
		 RETURNING id, email, email_encrypted, username, role, phone, phone_encrypted, area, house, notify_email, notify_sms, verified, created_at`,
    [
      email, encrypted.email_encrypted,
      username, normalizedRole, hash, false,
      phone || null, encrypted.phone_encrypted,
      area || null, house || null,
		  notify_email !== undefined ? notify_email : true,
		  notify_sms !== undefined ? notify_sms : false,
      'v1'
    ]
  );

  const newUser = await decryptUserData(result.rows[0]);

  // Log security event
  await auditLog('USER_REGISTERED', newUser.id, {
    email: email,
    role: normalizedRole,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  return ResponseUtil.created(res, sanitizeUser(newUser), 'User registered successfully', {
    requiresVerification: true
  });
});

// Enhanced login with security features
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'Email and password required' });
    }

    // Get user from database (include encrypted fields)
    const result = await dbManager.query(
      'SELECT id, email, email_encrypted, username, role, password_hash, phone, phone_encrypted, area, house, verified FROM users WHERE email=$1',
      [email]
    );

    if (result.rowCount === 0) {
      // Record failed attempt for non-existent user (prevent enumeration)
      loggingService.logSecurity('warn', 'Login attempt for non-existent email', {
        email: email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'user_not_found',
        correlationId: req.correlationId
      });

      // Enhanced audit logging
      await auditLogger.logLoginAttempt(
        false,
        null,
        req.ip,
        req.get('User-Agent'),
        req.sessionID,
        { email: email, reason: 'user_not_found' }
      );

      // Legacy audit log for backwards compatibility
      await auditLog('LOGIN_FAILED', null, {
        email: email,
        reason: 'user_not_found',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check if account is locked
    if (accountSecurity.isAccountLocked(user.id)) {
      const lockInfo = accountSecurity.getLockoutInfo(user.id);

      // Enhanced audit logging for account lockout
      await auditLogger.logAccountLockout(
        user.id,
        req.ip,
        'login_attempt_while_locked',
        lockInfo.attemptCount
      );

      // Legacy audit log
      await auditLog('LOGIN_BLOCKED', user.id, {
        reason: 'account_locked',
        lockoutInfo: lockInfo,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(423).json({
        status: 'error',
        message: 'Account temporarily locked',
        lockedUntil: lockInfo.lockedUntil,
        remainingTime: Math.ceil(lockInfo.remainingTime / 1000 / 60) // minutes
      });
    }

    // Verify password (supports both bcrypt and argon2)
    let valid = false;
    try {
      if (user.password_hash.startsWith('$argon2')) {
        valid = await passwordService.verifyPassword(password, user.password_hash);
      } else {
        // Legacy bcrypt support
        const bcrypt = await import('bcryptjs');
        valid = await bcrypt.default.compare(password, user.password_hash);
      }
    } catch (error) {
      loggingService.logError('Password verification error during login', error, {
        email: email,
        userId: user.id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        correlationId: req.correlationId
      });
      return res.status(500).json({ status: 'error', message: 'Authentication system error' });
    }

    if (!valid) {
      // Record failed attempt
      const failInfo = accountSecurity.recordFailedAttempt(user.id, req.ip);

      // Enhanced audit logging for failed login
      await auditLogger.logLoginAttempt(
        false,
        user.id,
        req.ip,
        req.get('User-Agent'),
        req.sessionID,
        {
          reason: 'invalid_password',
          attemptCount: failInfo.totalAttempts,
          remainingAttempts: failInfo.remainingAttempts,
          isLocked: failInfo.isLocked
        }
      );

      // Legacy audit log
      await auditLog('LOGIN_FAILED', user.id, {
        reason: 'invalid_password',
        failedAttempts: failInfo,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Log account lockout if it just occurred
      if (failInfo.isLocked) {
        await auditLogger.logAccountLockout(
          user.id,
          req.ip,
          'too_many_failed_attempts',
          failInfo.totalAttempts
        );
      }

      let message = 'Invalid credentials';
      if (failInfo.isLocked) {
        message = 'Too many failed attempts. Account temporarily locked.';
      } else if (failInfo.remainingAttempts <= 2) {
        message = `Invalid credentials. ${failInfo.remainingAttempts} attempts remaining before lockout.`;
      }

      return res.status(401).json({
        status: 'error',
        message,
        remainingAttempts: failInfo.remainingAttempts
      });
    }

    // Successful login - clear failed attempts
    accountSecurity.clearFailedAttempts(user.id);

    // Initialize secure session with session security service
    try {
      await sessionSecurityService.initializeSession(req, {
        id: user.id,
        email: user.email,
        role: user.role
      });
    } catch (sessionError) {
      loggingService.logSecurity('Session initialization failed during login', {
        error: sessionError.message,
        userId: user.id,
        correlationId: req.correlationId
      });
      // Continue with login but log the issue
    }

    // Generate secure token pair
    const tokens = tokenService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Enhanced audit logging for successful login
    await auditLogger.logLoginAttempt(
      true,
      user.id,
      req.ip,
      req.get('User-Agent'),
      req.sessionID,
      {
        role: user.role,
        tokenId: tokens.tokenId,
        loginMethod: 'password',
        sessionSecurityEnabled: true
      }
    );

    // Legacy audit log
    await auditLog('LOGIN_SUCCESS', user.id, {
      role: user.role,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      tokenId: tokens.tokenId
    });

    // Set secure refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth/refresh'
    });

    // Decrypt user data before returning
    const decryptedUser = await decryptUserData(user);
    
    // Remove sensitive data
    delete decryptedUser.password_hash;

    res.json({
      success: true,
      accessToken: tokens.accessToken,
      tokenType: tokens.tokenType,
      expiresIn: tokens.expiresIn,
      role: decryptedUser.role,
      user: decryptedUser
    });

  } catch (err) {
    loggingService.logError('Unexpected login error', err, {
      email: email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      correlationId: req.correlationId
    });
    const ref = Date.now().toString(36);
    res.status(500).json({ status: 'error', message: 'Server error', details: { ref } });
  }
};

// Refresh access token using refresh token
export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token not provided'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = tokenService.verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired refresh token'
      });
    }

    // Get current user data (including encrypted fields)
    const result = await dbManager.query(
      'SELECT id, email, email_encrypted, username, role, phone, phone_encrypted, verified FROM users WHERE id=$1',
      [decoded.userId]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const user = await decryptUserData(result.rows[0]);

    // Generate new token pair (invalidates old refresh token)
    const tokens = tokenService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Set new refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth/refresh'
    });

    // Enhanced audit logging for token refresh
    await auditLogger.logSecurityEvent('user.token.refresh', {
      oldTokenId: decoded.tokenId,
      newTokenId: tokens.tokenId,
      tokenType: 'jwt_refresh'
    }, {
      userId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID
    });

    // Log token refresh
    await auditLog('TOKEN_REFRESHED', user.id, {
      oldTokenId: decoded.tokenId,
      newTokenId: tokens.tokenId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      accessToken: tokens.accessToken,
      tokenType: tokens.tokenType,
      expiresIn: tokens.expiresIn
    });

  } catch (err) {
    loggingService.logError('Token refresh error', err, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      correlationId: req.correlationId
    });
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// Logout and revoke tokens
export const logoutUser = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    const authHeader = req.headers['authorization'];
    const accessToken = authHeader && authHeader.split(' ')[1];

    // Destroy secure session first
    try {
      if (req.session && req.sessionID) {
        await sessionSecurityService.destroySession(req, 'user_logout');
      }
    } catch (sessionError) {
      loggingService.logSecurity('Session destruction failed during logout', {
        error: sessionError.message,
        userId: req.user?.id,
        correlationId: req.correlationId
      });
      // Continue with logout even if session destruction fails
    }

    // Revoke tokens if they exist
    if (refreshToken) {
      tokenService.revokeToken(refreshToken);
    }
    if (accessToken) {
      tokenService.revokeToken(accessToken);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });

    // Enhanced audit logging for logout
    if (req.user) {
      await auditLogger.logSecurityEvent('user.logout', {
        hasRefreshToken: !!refreshToken,
        hasAccessToken: !!accessToken,
        tokensRevoked: true,
        sessionDestroyed: true
      }, {
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID
      });
    }

    // Log logout
    if (req.user) {
      await auditLog('LOGOUT', req.user.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    res.json({ success: true, message: 'Logged out successfully' });

  } catch (err) {
    loggingService.logError('Logout error', err, {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      correlationId: req.correlationId
    });
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

export default { updateProfile, registerUser, loginUser, refreshToken, logoutUser };
