import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { AppError, asyncHandler } from '../middleware/standardizedErrorHandler.js';
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
  await userService.updateUser(userId, { mfaEnabled: true });

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
 * @access  Public (but requires valid userId from login)
 */
router.post('/verify', asyncHandler(async (req, res) => {
  const { userId, token, useBackupCode } = req.body;

  if (!userId || !token) {
    throw new AppError('User ID and token are required', 400, 'VALIDATION_ERROR');
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

  // MFA verified - now issue tokens
  const user = await userService.getUserById(userId);
  
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Generate tokens
  const { tokenService } = await import('../services/tokenService.js');
  const { accessToken, refreshToken, refreshJti, expiresIn } = tokenService.generateTokens(user);
  const refreshInfo = tokenService.getTokenInfo(refreshToken);
  const refreshExpiresAt = refreshInfo?.exp ? new Date(refreshInfo.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await tokenService.storeRefreshToken(refreshJti, user.id, refreshToken, refreshExpiresAt, {
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip
  });
  
  // Set httpOnly cookies for security (cross-site compatible for Netlify + Render)
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: true, // Required for sameSite: 'none'
    sameSite: 'none', // Required for cross-site cookies
    maxAge: 15 * 60 * 1000 // 15 minutes
  });
  
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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
  const { password } = req.body;

  if (!password) {
    throw new AppError('Password is required to disable MFA', 400, 'VALIDATION_ERROR');
  }

  // Verify password
  const user = await userService.getUserById(userId);
  const isPasswordValid = await userService.verifyPassword(password, user.password);

  if (!isPasswordValid) {
    throw new AppError('Invalid password', 401, 'INVALID_CREDENTIALS');
  }

  // Disable MFA
  await userService.updateUser(userId, { mfaEnabled: false });

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
      mfaEnabled: user.mfaEnabled || false,
      mfaRequired: user.role === 'admin' // MFA required for admins
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

export default router;
