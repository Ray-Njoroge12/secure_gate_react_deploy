import { dbManager } from '../database/db.enhanced.js';
import { auditLog } from '../services/auditService.js';
import { tokenService, passwordService, accountSecurity } from '../services/tokenService.js';
import auditLogger from '../services/auditLogger.js';
import { ErrorHelper } from '../middleware/errorHandler.js';
import { ResponseUtil, sanitizeUser } from '../utils/responseUtils.js';
import { errorResponse } from '../utils/responseFormatter.js';
import sessionSecurityService from '../services/sessionSecurityService.js';
import loggingService from '../services/loggingService.js';

export async function registerUser(req, res) {
  const body = req?.body || {};
  const email = body.email;
  const username = body.username;
  const password = body.password;
  const role = (body.role || '').toString().toLowerCase();

  if (!email) throw ErrorHelper.requiredField('email');
  if (!password) throw ErrorHelper.requiredField('password');
  if (!username) throw ErrorHelper.requiredField('username');
  if (!role) throw ErrorHelper.requiredField('role');

  const strengthResult = passwordService.checkPasswordStrength(password);
  if (strengthResult?.strength && strengthResult.strength !== 'strong') {
    throw ErrorHelper.invalidFormat('password', strengthResult.message || 'Password is too weak', {
      strength: strengthResult.strength
    });
  }

  const existing = await dbManager.query('SELECT 1 FROM users WHERE email = $1 LIMIT 1', [email]);
  if (existing?.rowCount > 0) {
    throw ErrorHelper.alreadyExists('User', email);
  }

  const passwordHash = await passwordService.hashPassword(password);
  const notifyEmail = body.notify_email !== undefined ? body.notify_email : true;
  const notifySms = body.notify_sms !== undefined ? body.notify_sms : false;

  const insert = await dbManager.query(
    `INSERT INTO users (email, username, role, password_hash, phone, area, house, notify_email, notify_sms)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [email, username, role, passwordHash, body.phone || null, body.area || null, body.house || null, notifyEmail, notifySms]
  );

  const user = insert?.rows?.[0];
  if (user?.id) {
    await auditLog('USER_REGISTERED', user.id, { email: user.email, role: user.role });
  }

  const safeUser = sanitizeUser(user);
  return ResponseUtil.created(res, safeUser, 'User registered successfully', { requiresVerification: true });
}

export async function loginUser(req, res) {
  try {
    const body = req?.body || {};
    const email = body.email;
    const password = body.password;

    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'Email and password required' });
    }

    const result = await dbManager.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
    const user = result?.rows?.[0];

    if (!user) {
      loggingService.logSecurity('warn', 'Login attempt for non-existent email', {
        email,
        reason: 'user_not_found'
      });
      auditLogger.logLoginAttempt(false, null, req.ip, req.get('User-Agent'), req.sessionID, {
        email,
        reason: 'user_not_found'
      });
      return errorResponse(res, 'Invalid credentials', 'INVALID_CREDENTIALS', 401, null, req);
    }

    if (accountSecurity.isAccountLocked(user.id)) {
      const lockoutInfo = accountSecurity.getLockoutInfo(user.id);
      auditLogger.logAccountLockout(
        user.id,
        req.ip,
        'login_attempt_while_locked',
        lockoutInfo?.attemptCount
      );

      const remainingTimeMinutes = lockoutInfo?.remainingTime
        ? Math.ceil(lockoutInfo.remainingTime / 60000)
        : 0;

      return res.status(423).json({
        status: 'error',
        message: 'Account temporarily locked',
        lockedUntil: lockoutInfo?.lockedUntil,
        remainingTime: remainingTimeMinutes
      });
    }

    let isValidPassword = false;
    try {
      if (typeof user.password_hash === 'string' && user.password_hash.startsWith('$2')) {
        const bcrypt = await import('bcryptjs');
        const compareFn = bcrypt?.default?.compare || bcrypt?.compare;
        isValidPassword = await compareFn(password, user.password_hash);
      } else {
        isValidPassword = await passwordService.verifyPassword(password, user.password_hash);
      }
    } catch (err) {
      loggingService.logError('Password verification error during login', err, { email, userId: user.id });
      return res.status(500).json({ status: 'error', message: 'Authentication system error' });
    }

    if (!isValidPassword) {
      const attemptInfo = accountSecurity.recordFailedAttempt(user.id, req.ip);
      auditLogger.logLoginAttempt(false, user.id, req.ip, req.get('User-Agent'), req.sessionID, {
        reason: 'invalid_password',
        attemptCount: attemptInfo?.totalAttempts,
        remainingAttempts: attemptInfo?.remainingAttempts
      });

      if (attemptInfo?.isLocked) {
        auditLogger.logAccountLockout(user.id, req.ip, 'too_many_failed_attempts', attemptInfo?.totalAttempts);
        return errorResponse(res, 'Too many failed attempts. Account temporarily locked.', 'ACCOUNT_LOCKED', 401, null, req);
      }

      let message = 'Invalid credentials';
      if (typeof attemptInfo?.remainingAttempts === 'number' && attemptInfo.remainingAttempts <= 1) {
        message = `${message}. ${attemptInfo.remainingAttempts} attempts remaining before lockout`;
      }

      return errorResponse(res, message, 'INVALID_CREDENTIALS', 401, null, req);
    }

    accountSecurity.clearFailedAttempts(user.id);

    try {
      await sessionSecurityService.initializeSession(req, {
        id: user.id,
        email: user.email,
        role: user.role,
        estate_id: user.estate_id
      });
    } catch (err) {
      loggingService.logSecurity('warn', 'Session initialization failed during login', {
        userId: user.id,
        error: err?.message
      });
    }

    const tokens = tokenService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      estate_id: user.estate_id
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/api/auth/refresh'
    });

    auditLogger.logLoginAttempt(true, user.id, req.ip, req.get('User-Agent'), req.sessionID, {
      role: user.role,
      tokenId: tokens.tokenId,
      loginMethod: 'password'
    });

    return res.json({
      success: true,
      accessToken: tokens.accessToken,
      role: user.role,
      user: sanitizeUser(user)
    });
  } catch (err) {
    loggingService.logError('Unexpected login error', err, { email: req?.body?.email });
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
}

export async function refreshToken(req, res) {
  const refresh = req?.cookies?.refreshToken;
  if (!refresh) {
    return errorResponse(res, 'Refresh token not provided', 'REFRESH_TOKEN_MISSING', 401, null, req);
  }

  let decoded;
  try {
    decoded = tokenService.verifyRefreshToken(refresh);
  } catch (err) {
    return errorResponse(res, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN', 401, null, req);
  }

  try {
    const userResult = await dbManager.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [decoded.userId]);
    const user = userResult?.rows?.[0];

    if (!user) {
      return errorResponse(res, 'User not found', 'AUTH_USER_NOT_FOUND', 401, null, req);
    }

    const tokens = tokenService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      estate_id: user.estate_id
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      path: '/api/auth/refresh'
    });

    auditLogger.logSecurityEvent(
      'user.token.refresh',
      { oldTokenId: decoded.tokenId, newTokenId: tokens.tokenId },
      { userId: user.id }
    );

    return res.json({
      success: true,
      accessToken: tokens.accessToken,
      role: user.role
    });
  } catch (err) {
    loggingService.logError('Token refresh error', err, { userId: decoded?.userId });
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
}

export async function logoutUser(req, res) {
  try {
    let sessionDestroyed = false;
    try {
      await sessionSecurityService.destroySession(req, 'user_logout');
      sessionDestroyed = true;
    } catch (err) {
      loggingService.logSecurity('warn', 'Session destruction failed during logout', {
        userId: req?.user?.id,
        error: err?.message
      });
    }

    const refresh = req?.cookies?.refreshToken;
    const authHeader = req?.headers?.authorization || '';
    const access = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

    let tokensRevoked = false;
    try {
      if (refresh) tokenService.revokeToken(refresh);
      if (access) tokenService.revokeToken(access);
      tokensRevoked = true;
    } catch (err) {
      loggingService.logError('Logout error', err, { userId: req?.user?.id });
      return res.status(500).json({ status: 'error', message: 'Server error' });
    }

    if (refresh) {
      res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    }

    auditLogger.logSecurityEvent(
      'user.logout',
      {
        hasRefreshToken: Boolean(refresh),
        hasAccessToken: Boolean(access),
        tokensRevoked,
        sessionDestroyed
      },
      { userId: req?.user?.id }
    );

    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    loggingService.logError('Logout error', err, { userId: req?.user?.id });
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
}

export async function updateProfile(req, res) {
  const body = req?.body || {};
  const email = body.email;
  if (!email) throw ErrorHelper.requiredField('email');

  const existing = await dbManager.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
  const currentUser = existing?.rows?.[0];
  if (!currentUser) throw ErrorHelper.notFound('User', email);

  await dbManager.query(
    `UPDATE users SET name = $2, phone = $3, profile_pic = $4, notify_email = $5, notify_sms = $6 WHERE email = $1`,
    [
      email,
      body.name ?? currentUser.name ?? null,
      body.phone ?? currentUser.phone ?? null,
      body.profilePic ?? currentUser.profile_pic ?? null,
      body.notify_email ?? currentUser.notify_email ?? null,
      body.notify_sms ?? currentUser.notify_sms ?? null
    ]
  );

  const updated = await dbManager.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
  const updatedUser = updated?.rows?.[0];

  return ResponseUtil.updated(res, sanitizeUser(updatedUser), 'Profile updated successfully');
}
