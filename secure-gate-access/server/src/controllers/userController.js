import { dbManager } from '../database/db.enhanced.js';
import { auditLog } from '../services/auditService.js';
import { tokenService, passwordService, accountSecurity } from '../services/tokenService.js';
import { successResponse } from '../utils/responseFormatter.js';
import { ErrorHelper } from '../middleware/standardizedErrorHandler.js';
import { ResponseUtil, sanitizeUser } from '../utils/responseUtils.js';
import { errorResponse } from '../utils/responseFormatter.js';
import sessionSecurityService from '../services/sessionSecurityService.js';
import loggingService from '../services/loggingService.js';
import { maskEmail } from '../utils/redaction.js';

export async function registerUser(req, res) {
  const body = req?.body || {};
  const email = body.email;
  const username = body.username;
  const password = body.password;

  // Security: Only allow role selection if requester is an Admin
  // Otherwise default to 'resident' for public registration
  let role = 'resident';
  if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin') && body.role) {
    role = body.role.toString().toLowerCase();
  } else if (body.role && body.role === 'guard') {
    // Allow requesting guard role? Probably not for public. 
    // Let's force resident for now unless we want a specific 'guard' signup flow.
    // Current requirement is Resident function analysis.
    role = 'resident';
  }

  if (!email) throw ErrorHelper.requiredField('email');
  if (!password) throw ErrorHelper.requiredField('password');
  if (!username) throw ErrorHelper.requiredField('username');
  // role is auto-assigned now, so we don't need to throw error if missing


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
    `INSERT INTO users (email, username, role, password_hash, phone, area, house, notify_email, notify_sms, account_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, 'pending')
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
      loggingService.logSecurity('warn', 'auth.login.failed', {
        email: maskEmail(email),
        reason: 'user_not_found',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return errorResponse(res, 'Invalid credentials', 'INVALID_CREDENTIALS', 401, null, req);
    }

    if (accountSecurity.isAccountLocked(user.id)) {
      const lockoutInfo = accountSecurity.getLockoutInfo(user.id);
      loggingService.logSecurity('warn', 'auth.account.locked_access_attempt', {
        userId: user.id,
        ip: req.ip,
        reason: 'login_attempt_while_locked',
        attemptCount: lockoutInfo?.attemptCount
      });

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

    // Check account status (pending/suspended checks)
    if (user.account_status === 'pending') {
      return errorResponse(res, 'Your account is pending admin approval.', 'ACCOUNT_PENDING', 403, null, req);
    }
    if (user.account_status === 'suspended' || user.account_status === 'rejected') {
      return errorResponse(res, 'Your account has been suspended or rejected.', 'ACCOUNT_SUSPENDED', 403, null, req);
    }

    let isValidPassword = false;
    try {
      isValidPassword = await passwordService.verifyPassword(password, user.password_hash);
    } catch (err) {
      loggingService.logError('Password verification error during login', err, {
        email: maskEmail(email),
        userId: user.id
      });
      return res.status(500).json({ status: 'error', message: 'Authentication system error' });
    }

    if (!isValidPassword) {
      const attemptInfo = accountSecurity.recordFailedAttempt(user.id, req.ip);
      loggingService.logSecurity('warn', 'auth.login.failed', {
        userId: user.id,
        reason: 'invalid_password',
        attemptCount: attemptInfo?.totalAttempts,
        remainingAttempts: attemptInfo?.remainingAttempts,
        ip: req.ip
      });

      if (attemptInfo?.isLocked) {
        loggingService.logSecurity('warn', 'auth.account.locked', {
          userId: user.id,
          ip: req.ip,
          reason: 'too_many_failed_attempts',
          attemptCount: attemptInfo?.totalAttempts
        });
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

    loggingService.logSecurity('info', 'auth.login.success', {
      userId: user.id,
      role: user.role,
      ip: req.ip,
      loginMethod: 'password'
    });

    return res.json({
      success: true,
      accessToken: tokens.accessToken,
      role: user.role,
      user: sanitizeUser(user)
    });
  } catch (err) {
    loggingService.logError('Unexpected login error', err, {
      email: maskEmail(req?.body?.email)
    });
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

    loggingService.logSecurity('info', 'auth.token.refreshed', {
      userId: user.id,
      oldTokenId: decoded.tokenId,
      newTokenId: tokens.tokenId
    });

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

    loggingService.logSecurity('info', 'auth.logout', {
      userId: req?.user?.id,
      hasRefreshToken: Boolean(refresh),
      hasAccessToken: Boolean(access),
      tokensRevoked,
      sessionDestroyed
    });

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

  // SECURITY: Use ID from token, not just email from body
  const userId = req.user.id;
  const estateId = req.user.estate_id;

  const existing = await dbManager.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
  const currentUser = existing?.rows?.[0];
  if (!currentUser) throw ErrorHelper.notFound('User', userId);

  // Allow email update but check uniqueness if changed? 
  // For now assuming email in body is what we update, or what we use to look up?
  // The original code used email from body to lookup. 
  // Correct logic: Update the USER identified by Token.
  // We can update email if provided.

  await dbManager.query(
    `UPDATE users SET first_name = $2, last_name = $3, phone = $4, profile_pic = $5, notify_email = $6, notify_sms = $7, house = $9
     WHERE id = $1 AND estate_id = $8`,
    [
      userId,
      body.first_name ?? currentUser.first_name ?? null,
      body.last_name ?? currentUser.last_name ?? null,
      body.phone ?? currentUser.phone ?? null,
      body.profilePic ?? currentUser.profile_pic ?? null,
      body.notify_email ?? currentUser.notify_email ?? null,
      body.notify_sms ?? currentUser.notify_sms ?? null,
      estateId,
      body.house ?? currentUser.house ?? null
    ]
  );

  const updated = await dbManager.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
  const updatedUser = updated?.rows?.[0];

  return ResponseUtil.updated(res, sanitizeUser(updatedUser), 'Profile updated successfully');
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw ErrorHelper.validation('Current and new password are required');
  }

  const userId = req.user.id;

  // 1. Fetch user to get current password hash
  const result = await dbManager.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
  const user = result?.rows?.[0];

  if (!user) {
    throw ErrorHelper.notFound('User', userId);
  }

  // 2. Verify current password
  let isValidPassword = false;
  isValidPassword = await passwordService.verifyPassword(currentPassword, user.password_hash);

  if (!isValidPassword) {
    // Audit log failed attempt?
    loggingService.logSecurity('warn', 'auth.password.change_failed', { userId, reason: 'invalid_current_password' });
    return errorResponse(res, 'Invalid current password', 'INVALID_CREDENTIALS', 401, null, req);
  }

  // 3. Validate new password strength
  const strengthResult = passwordService.checkPasswordStrength(newPassword);
  if (strengthResult?.strength && strengthResult.strength !== 'strong') {
    throw ErrorHelper.invalidFormat('newPassword', strengthResult.message || 'Password is too weak', {
      strength: strengthResult.strength
    });
  }

  // 4. Hash new password
  const newPasswordHash = await passwordService.hashPassword(newPassword);

  // 5. Update database
  await dbManager.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [newPasswordHash, userId]
  );

  // 6. Security logging
  loggingService.logSecurity('info', 'auth.password.changed', { userId });
  loggingService.info('User changed password successfully', { userId });

  // 7. Revoke all other sessions/tokens? 
  // Optional but good practice. For now, we'll keep it simple as per request, 
  // but let's at least mention it or maybe revoke refresh tokens if we want strict security.
  // For this 'fresh' user context, simple update is likely the goal.

  return successResponse(res, { success: true }, 'Password changed successfully');
}
