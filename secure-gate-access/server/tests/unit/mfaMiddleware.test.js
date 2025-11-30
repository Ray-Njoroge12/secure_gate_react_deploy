import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import mfaMiddleware from '../../src/middleware/mfaMiddleware.js';
import mfaService from '../../src/services/mfaService.js';
import loggingService from '../../src/services/loggingService.js';
import rateLimitService from '../../src/services/rateLimitService.js';

// Mock dependencies
jest.mock('../../src/services/mfaService.js');
jest.mock('../../src/services/loggingService.js');
jest.mock('../../src/services/rateLimitService.js');

describe('MFA Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      user: {},
      headers: {},
      session: {},
      ip: '127.0.0.1',
      get: jest.fn()
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('requireMFA', () => {
    it('should call next if user has valid MFA token', async () => {
      req.user = { id: 'user123', mfaEnabled: true };
      req.headers['x-mfa-token'] = 'valid-token';
      
      TokenService.verifyMFAToken.mockResolvedValue({ 
        userId: 'user123', 
        mfaVerified: true 
      });

      await mfaMiddleware.requireMFA(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 if MFA is enabled but no token provided', async () => {
      req.user = { id: 'user123', mfaEnabled: true };
      req.headers['x-mfa-token'] = undefined;

      await mfaMiddleware.requireMFA(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'MFA verification required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if MFA token is invalid', async () => {
      req.user = { id: 'user123', mfaEnabled: true };
      req.headers['x-mfa-token'] = 'invalid-token';
      
      TokenService.verifyMFAToken.mockRejectedValue(new Error('Invalid token'));

      await mfaMiddleware.requireMFA(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid MFA token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next if user does not have MFA enabled', async () => {
      req.user = { id: 'user123', mfaEnabled: false };

      await mfaMiddleware.requireMFA(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle missing user object', async () => {
      req.user = undefined;

      await mfaMiddleware.requireMFA(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should verify token matches user ID', async () => {
      req.user = { id: 'user123', mfaEnabled: true };
      req.headers['x-mfa-token'] = 'valid-token';
      
      TokenService.verifyMFAToken.mockResolvedValue({ 
        userId: 'differentUser', 
        mfaVerified: true 
      });

      await mfaMiddleware.requireMFA(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'MFA token mismatch'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('verifyMFACode', () => {
    it('should verify valid TOTP code', async () => {
      req.user = { id: 'user123' };
      req.body = { code: '123456', type: 'totp' };
      
      MFAService.verifyTOTP.mockResolvedValue({ valid: true });

      await mfaMiddleware.verifyMFACode(req, res, next);

      expect(MFAService.verifyTOTP).toHaveBeenCalledWith('user123', '123456');
      expect(req.mfaVerified).toBe(true);
      expect(next).toHaveBeenCalled();
    });

    it('should verify valid backup code', async () => {
      req.user = { id: 'user123' };
      req.body = { code: 'BACKUP-CODE-12345', type: 'backup' };
      
      MFAService.verifyBackupCode.mockResolvedValue({ valid: true });

      await mfaMiddleware.verifyMFACode(req, res, next);

      expect(MFAService.verifyBackupCode).toHaveBeenCalledWith('user123', 'BACKUP-CODE-12345');
      expect(req.mfaVerified).toBe(true);
      expect(next).toHaveBeenCalled();
    });

    it('should verify valid OTP code', async () => {
      req.user = { id: 'user123' };
      req.body = { code: '123456', type: 'otp' };
      
      MFAService.verifyOTP.mockResolvedValue({ valid: true });

      await mfaMiddleware.verifyMFACode(req, res, next);

      expect(MFAService.verifyOTP).toHaveBeenCalledWith('user123', '123456');
      expect(req.mfaVerified).toBe(true);
      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid MFA code', async () => {
      req.user = { id: 'user123' };
      req.body = { code: '000000', type: 'totp' };
      
      MFAService.verifyTOTP.mockResolvedValue({ valid: false });

      await mfaMiddleware.verifyMFACode(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid MFA code'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle missing code', async () => {
      req.user = { id: 'user123' };
      req.body = { type: 'totp' };

      await mfaMiddleware.verifyMFACode(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'MFA code is required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle missing type', async () => {
      req.user = { id: 'user123' };
      req.body = { code: '123456' };

      await mfaMiddleware.verifyMFACode(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'MFA type is required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle invalid MFA type', async () => {
      req.user = { id: 'user123' };
      req.body = { code: '123456', type: 'invalid' };

      await mfaMiddleware.verifyMFACode(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid MFA type'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle verification errors', async () => {
      req.user = { id: 'user123' };
      req.body = { code: '123456', type: 'totp' };
      
      MFAService.verifyTOTP.mockRejectedValue(new Error('Verification failed'));

      await mfaMiddleware.verifyMFACode(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'MFA verification failed'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('checkMFAStatus', () => {
    it('should return MFA status for user with MFA enabled', async () => {
      req.user = { id: 'user123' };
      
      User.findById.mockResolvedValue({
        id: 'user123',
        mfaEnabled: true,
        mfaMethods: ['totp', 'backup']
      });

      await mfaMiddleware.checkMFAStatus(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        mfaEnabled: true,
        mfaMethods: ['totp', 'backup']
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return MFA status for user without MFA', async () => {
      req.user = { id: 'user123' };
      
      User.findById.mockResolvedValue({
        id: 'user123',
        mfaEnabled: false,
        mfaMethods: []
      });

      await mfaMiddleware.checkMFAStatus(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        mfaEnabled: false,
        mfaMethods: []
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      req.user = { id: 'user123' };
      
      User.findById.mockResolvedValue(null);

      await mfaMiddleware.checkMFAStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      req.user = { id: 'user123' };
      
      User.findById.mockRejectedValue(new Error('Database error'));

      await mfaMiddleware.checkMFAStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to check MFA status'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('rateLimitMFA', () => {
    it('should allow requests within rate limit', async () => {
      req.user = { id: 'user123' };
      req.body = { code: '123456' };

      await mfaMiddleware.rateLimitMFA(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block excessive MFA attempts', async () => {
      req.user = { id: 'user123' };
      req.body = { code: '123456' };

      // Simulate multiple attempts
      for (let i = 0; i < 5; i++) {
        await mfaMiddleware.rateLimitMFA(req, res, next);
      }

      // Clear next mock for final check
      next.mockClear();
      
      // This should be blocked
      await mfaMiddleware.rateLimitMFA(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Too many MFA attempts')
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reset rate limit after timeout', async () => {
      jest.useFakeTimers();
      
      req.user = { id: 'user123' };
      req.body = { code: '123456' };

      // Make multiple attempts
      for (let i = 0; i < 5; i++) {
        await mfaMiddleware.rateLimitMFA(req, res, next);
      }

      // Fast-forward time
      jest.advanceTimersByTime(16 * 60 * 1000); // 16 minutes

      next.mockClear();
      res.status.mockClear();
      
      // This should be allowed after timeout
      await mfaMiddleware.rateLimitMFA(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('requireMFASetup', () => {
    it('should allow access if MFA is set up', async () => {
      req.user = { id: 'user123' };
      
      User.findById.mockResolvedValue({
        id: 'user123',
        mfaEnabled: true
      });

      await mfaMiddleware.requireMFASetup(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block access if MFA is not set up', async () => {
      req.user = { id: 'user123' };
      
      User.findById.mockResolvedValue({
        id: 'user123',
        mfaEnabled: false
      });

      await mfaMiddleware.requireMFASetup(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'MFA setup required',
        requireSetup: true
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      req.user = { id: 'user123' };
      
      User.findById.mockResolvedValue(null);

      await mfaMiddleware.requireMFASetup(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateMFASession', () => {
    it('should validate active MFA session', async () => {
      req.user = { id: 'user123' };
      req.session = {
        mfaVerified: true,
        mfaVerifiedAt: Date.now() - 5 * 60 * 1000 // 5 minutes ago
      };

      await mfaMiddleware.validateMFASession(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject expired MFA session', async () => {
      req.user = { id: 'user123' };
      req.session = {
        mfaVerified: true,
        mfaVerifiedAt: Date.now() - 16 * 60 * 1000 // 16 minutes ago (expired)
      };

      await mfaMiddleware.validateMFASession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'MFA session expired',
        requireMFA: true
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject missing MFA session', async () => {
      req.user = { id: 'user123' };
      req.session = {};

      await mfaMiddleware.validateMFASession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'MFA verification required',
        requireMFA: true
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('attachMFAToken', () => {
    it('should attach MFA token to response header', async () => {
      req.user = { id: 'user123' };
      
      TokenService.generateMFAToken.mockResolvedValue('mfa-token-123');

      await mfaMiddleware.attachMFAToken(req, res, next);

      expect(TokenService.generateMFAToken).toHaveBeenCalledWith('user123');
      expect(res.setHeader).toHaveBeenCalledWith('X-MFA-Token', 'mfa-token-123');
      expect(next).toHaveBeenCalled();
    });

    it('should handle token generation errors', async () => {
      req.user = { id: 'user123' };
      
      TokenService.generateMFAToken.mockRejectedValue(new Error('Token generation failed'));

      await mfaMiddleware.attachMFAToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to generate MFA token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle missing user', async () => {
      req.user = undefined;

      await mfaMiddleware.attachMFAToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
