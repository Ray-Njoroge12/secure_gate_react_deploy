/**
 * MFA Routes - Multi-Factor Authentication Endpoints
 * 
 * IMPLEMENTATION STATUS: ✅ FIXED (February 5, 2026)
 * ====================================================
 * 
 * CRITICAL FIX APPLIED:
 * - Migration 061 adds mfa_enabled, mfa_secret, backup_codes, mfa_methods to users table
 * - userService.js updated to include all MFA fields in queries
 * - Emergency restore script available: npm run mfa:restore
 * - Verification script available: npm run mfa:verify
 * 
 * ENDPOINTS:
 * ==========
 * POST   /api/mfa/setup                  - Initialize MFA setup (requires auth)
 * POST   /api/mfa/verify-setup           - Verify and enable MFA (requires auth)
 * POST   /api/mfa/verify                 - Verify MFA during login (public with session)
 * POST   /api/mfa/disable                - Disable MFA (requires auth + password)
 * GET    /api/mfa/status                 - Get MFA status (requires auth)
 * POST   /api/mfa/regenerate-backup-codes - Generate new backup codes (requires auth + MFA code)
 * POST   /api/mfa/verify-operation       - Verify MFA for sensitive operations (requires auth + MFA code)
 * 
 * FLOW DIAGRAM:
 * =============
 * 1. User Login (admin/guard)
 *    └─> authRoutes.js checks user.mfa_enabled
 *        ├─> If false: Normal login
 *        └─> If true: Return requiresMFA=true + mfaSessionId
 *            └─> Frontend redirects to /mfa/verify
 *                └─> POST /api/mfa/verify with mfaSessionId + code
 *                    ├─> Success: Returns full access token
 *                    └─> Failure: Returns error
 * 
 * 2. MFA Setup (new user)
 *    └─> POST /api/mfa/setup
 *        └─> Returns QR code + manual key
 *            └─> User scans QR code in authenticator app
 *                └─> POST /api/mfa/verify-setup with code
 *                    ├─> Success: Enables MFA + returns backup codes
 *                    └─> Failure: MFA not enabled
 * 
 * SECURITY NOTES:
 * ===============
 * - MFA secrets are encrypted before storage
 * - Backup codes are hashed (one-time use)
 * - MFA sessions expire after 5 minutes
 * - Rate limiting applied to prevent brute force
 * - MFA required for admin/guard/super_admin roles
 * 
 * TROUBLESHOOTING:
 * ================
 * - Users locked out? Run: npm run mfa:restore
 * - MFA not working? Run: npm run mfa:verify
 * - Missing columns? Run: npm run mfa:migrate
 */

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { AppError, asyncHandler } from '../middleware/standardizedErrorHandler.js';
import { strictRateLimit } from '../middleware/rateLimitMiddleware.js';
import mfaService from '../services/mfaService.js';
import { userService } from '../services/userService.js';

const router = express.Router();

/**
 * @route   POST /api/mfa/setup
 * @desc    Initialize MFA setup for user (generate TOTP secret and QR code)
 * @access  Private
 */
router.post('/setup', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userEmail = req.user.email;

  // Generate TOTP secret
  const { secret, qrCodeUrl, manualEntryKey } = await mfaService.generateTOTPSecret(userId, userEmail);

  // Generate QR code data URL
  const qrCodeDataURL = await mfaService.generateQRCode(qrCodeUrl);

  res.json({
    success: true,
    message: 'MFA setup initialized',
    data: {
      qrCode: qrCodeDataURL,
      manualEntryKey,
      instructions: 'Scan the QR code with Google Authenticator or enter the manual key'
    }
  });
}));

/**
 * @route   POST /api/mfa/verify-setup
 * @desc    Verify and enable MFA for user
 * @access  Private
 */
router.post('/verify-setup', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { token } = req.body;

  if (!token) {
    throw new AppError('MFA token is required', 400, 'VALIDATION_ERROR');
  }

  // Verify TOTP token
  const verified = await mfaService.verifyTOTPToken(userId, token);

  if (!verified) {
    throw new AppError('Invalid MFA token', 401, 'INVALID_MFA_TOKEN');
  }

  // Enable MFA for user
  await userService.updateUser(userId, { mfa_enabled: true });

  // Generate backup codes
  const backupCodes = await mfaService.generateBackupCodes(userId);

  res.json({
    success: true,
    message: 'MFA enabled successfully',
    data: {
      backupCodes,
      warning: 'Save these backup codes in a safe place. You will not be able to see them again.'
    }
  });
}));

/**
 * @route   POST /api/mfa/verify
 * @desc    Verify MFA token during login and issue tokens
 * @access  Public (but requires valid mfaSessionId from login)
 */
router.post('/verify', strictRateLimit(), asyncHandler(async (req, res) => {
  const { mfaSessionId, token, useBackupCode } = req.body;

  if (!mfaSessionId || !token) {
    throw new AppError('MFA session ID and token are required', 400, 'VALIDATION_ERROR');
  }

  // Verify MFA session exists and is valid
  const sessionResult = await userService.db.query(
    `SELECT user_id, expires_at, status 
     FROM additional_auth_sessions 
     WHERE session_id = $1 AND operation = 'login_mfa' AND status = 'pending'`,
    [mfaSessionId]
  );

  if (sessionResult.rows.length === 0) {
    throw new AppError('Invalid or expired MFA session', 401, 'INVALID_MFA_SESSION');
  }

  const session = sessionResult.rows[0];
  const userId = session.user_id;

  // Check session expiry
  if (new Date() > new Date(session.expires_at)) {
    await userService.db.query(
      `UPDATE additional_auth_sessions SET status = 'expired' WHERE session_id = $1`,
      [mfaSessionId]
    );
    throw new AppError('MFA session expired, please login again', 401, 'MFA_SESSION_EXPIRED');
  }

  let verified = false;

  if (useBackupCode) {
    // Verify backup code
    verified = await mfaService.verifyBackupCode(userId, token);
  } else {
    // Verify TOTP token
    verified = await mfaService.verifyTOTPToken(userId, token);
  }

  if (!verified) {
    throw new AppError('Invalid MFA token', 401, 'INVALID_MFA_TOKEN');
  }

  // Mark session as completed
  await userService.db.query(
    `UPDATE additional_auth_sessions SET status = 'completed', completed_at = NOW() WHERE session_id = $1`,
    [mfaSessionId]
  );

  // MFA verified - now issue tokens
  const user = await userService.getUserById(userId);

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Generate tokens
  const { tokenService } = await import('../services/tokenService.js');
  const { getCookieOptions } = await import('../utils/cookies.js');
  const { accessToken, refreshToken, refreshJti, expiresIn } = tokenService.generateTokens(user);
  const refreshInfo = tokenService.getTokenInfo(refreshToken);
  const refreshExpiresAt = refreshInfo?.exp ? new Date(refreshInfo.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await tokenService.storeRefreshToken(refreshJti, user.id, refreshToken, refreshExpiresAt, {
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip
  });

  // Set httpOnly cookies for security (development-compatible)
  const cookieOptions = getCookieOptions();

  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth/refresh'
  });


  res.json({
    success: true,
    message: 'MFA verification successful - Login complete',
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        estate_id: user.estate_id
      }
      // Tokens are in httpOnly cookies
    }
  });
}));

/**
 * @route   POST /api/mfa/disable
 * @desc    Disable MFA for user
 * @access  Private
 */
router.post('/disable', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { password, token } = req.body;

  if (!password) {
    throw new AppError('Password is required to disable MFA', 400, 'VALIDATION_ERROR');
  }

  if (!token) {
    throw new AppError('Authenticator code or backup code is required to disable MFA', 400, 'TOTP_REQUIRED');
  }

  // Verify password
  const isPasswordValid = await userService.verifyPassword(userId, password);

  if (!isPasswordValid) {
    throw new AppError('Invalid password', 401, 'INVALID_PASSWORD');
  }

  // Verify TOTP token or backup code
  const isTokenValid = await mfaService.verifyTOTPToken(userId, token);
  const isBackupCode = !isTokenValid && await mfaService.verifyBackupCode(userId, token);

  if (!isTokenValid && !isBackupCode) {
    throw new AppError('Invalid authenticator code or backup code', 401, 'INVALID_TOTP');
  }

  // Disable MFA
  await userService.updateUser(userId, { mfa_enabled: false });

  // Delete MFA secrets and backup codes
  await mfaService.disableMFA(userId);

  res.json({
    success: true,
    message: 'MFA disabled successfully'
  });
}));

/**
 * @route   GET /api/mfa/status
 * @desc    Get MFA status for user
 * @access  Private
 */
router.get('/status', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await userService.getUserById(userId);

  res.json({
    success: true,
    data: {
      mfaEnabled: user.mfa_enabled || false,
      mfaRequired: ['super_admin', 'admin', 'guard'].includes(user.role) // MFA required for super_admin, admins and guards
    }
  });
}));

/**
 * @route   POST /api/mfa/regenerate-backup-codes
 * @desc    Regenerate backup codes for user
 * @access  Private
 */
router.post('/regenerate-backup-codes', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { token } = req.body;

  if (!token) {
    throw new AppError('MFA token is required', 400, 'VALIDATION_ERROR');
  }

  // Verify TOTP token
  const verified = await mfaService.verifyTOTPToken(userId, token);

  if (!verified) {
    throw new AppError('Invalid MFA token', 401, 'INVALID_MFA_TOKEN');
  }

  // Generate new backup codes
  const backupCodes = await mfaService.generateBackupCodes(userId);

  res.json({
    success: true,
    message: 'Backup codes regenerated successfully',
    data: {
      backupCodes,
      warning: 'Save these new backup codes. Previous backup codes are now invalid.'
    }
  });
}));

/**
 * @route   POST /api/mfa/verify-operation
 * @desc    Verify MFA token for sensitive operations (guard/admin actions)
 * @access  Private
 */
router.post('/verify-operation', authenticateToken, strictRateLimit(), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { code, operation, operationDetails, reason } = req.body;

  if (!code) {
    throw new AppError('MFA code is required', 400, 'VALIDATION_ERROR');
  }

  if (!operation) {
    throw new AppError('Operation identifier is required', 400, 'VALIDATION_ERROR');
  }

  // Check if user has MFA enabled
  const user = await userService.getUserById(userId);
  if (!user.mfa_enabled) {
    throw new AppError('MFA is not enabled for this account', 400, 'MFA_NOT_ENABLED');
  }

  // Verify TOTP token
  const verified = await mfaService.verifyTOTPToken(userId, code);

  if (!verified) {
    // Log failed attempt
    const { auditLogService } = await import('../services/auditLogService.js');
    await auditLogService.log({
      userId,
      action: 'MFA_OPERATION_VERIFY_FAILED',
      resource: 'mfa',
      resourceId: operation,
      details: { operation, operationDetails },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    throw new AppError('Invalid MFA code', 401, 'INVALID_MFA_TOKEN');
  }

  // Generate a short-lived operation token (5 minutes)
  const { tokenService } = await import('../services/tokenService.js');
  const crypto = await import('crypto');
  const operationToken = crypto.randomBytes(32).toString('hex');

  // Store operation token (in memory/cache - expires in 5 minutes)
  // NOTE: This is ephemeral and not cluster-safe. For multi-instance deployments,
  // replace with a Redis-backed store (e.g. redisService.set with TTL).
  if (!global.operationTokens) {
    global.operationTokens = new Map();
  }

  const now = Date.now();
  global.operationTokens.set(operationToken, {
    userId,
    operation,
    operationDetails,
    reason,
    createdAt: now,
    expiresAt: now + 5 * 60 * 1000 // 5 minutes
  });

  // Clean up expired tokens and cap map size to prevent unbounded growth
  for (const [token, data] of global.operationTokens) {
    if (data.expiresAt < now) {
      global.operationTokens.delete(token);
    }
  }
  if (global.operationTokens.size > 1000) {
    // Safety valve: clear oldest entries if map grows unexpectedly large
    const oldest = [...global.operationTokens.entries()]
      .sort((a, b) => a[1].createdAt - b[1].createdAt)
      .slice(0, 500);
    for (const [token] of oldest) {
      global.operationTokens.delete(token);
    }
  }

  // Log successful verification
  const { auditLogService } = await import('../services/auditLogService.js');
  await auditLogService.log({
    userId,
    action: 'MFA_OPERATION_VERIFIED',
    resource: 'mfa',
    resourceId: operation,
    details: { operation, operationDetails, reason },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json({
    success: true,
    message: 'MFA verification successful',
    operationToken
  });
}));

export default router;
