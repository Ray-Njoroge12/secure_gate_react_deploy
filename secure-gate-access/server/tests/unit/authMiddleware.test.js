/**
 * Unit Tests for Auth Middleware
 * Priority: P0 (Critical Security Component)
 * 
 * Tests authentication, authorization, and role-based access control.
 * 
 * Note: authenticateToken is wrapped with asyncHandler which returns immediately
 * and runs the async function in the background. We need to wait for promises to settle.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies before imports
const mockQuery = jest.fn();
const mockVerifyAccessToken = jest.fn();

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: {
    query: mockQuery
  }
}));

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({
  tokenService: {
    verifyAccessToken: mockVerifyAccessToken
  }
}));

// Import after mocking
const authMiddlewareModule = await import('../../src/middleware/authMiddleware.js');
const { AppError } = await import('../../src/middleware/standardizedErrorHandler.js');

const { 
  authenticateToken, 
  attachUserFromToken, 
  authorize, 
  requireRole 
} = authMiddlewareModule;

// Helper to wait for microtasks to complete (asyncHandler uses Promise.resolve)
const flushPromises = () => new Promise(resolve => setImmediate(resolve));

// Helper to check if an error is an AppError-like object
const isAppError = (error) => {
  return error && 
    typeof error.statusCode === 'number' && 
    typeof error.code === 'string' && 
    typeof error.message === 'string';
};

describe('Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  const testUser = {
    id: 1,
    email: 'test@example.com',
    username: 'testuser',
    role: 'resident',
    verified: true,
    estate_id: 22
  };

  const validToken = 'valid-jwt-token';

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      headers: {},
      cookies: {},
      method: 'GET',
      originalUrl: '/api/test'
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    mockVerifyAccessToken.mockResolvedValue({ email: testUser.email });
    mockQuery.mockResolvedValue({ rows: [testUser], rowCount: 1 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('authenticateToken', () => {
    describe('Token Extraction', () => {
      it('should extract token from Authorization header and call next()', async () => {
        mockReq.headers['authorization'] = `Bearer ${validToken}`;

        authenticateToken(mockReq, mockRes, mockNext);
        await flushPromises();

        expect(mockVerifyAccessToken).toHaveBeenCalledWith(validToken);
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.user).toBeDefined();
        expect(mockReq.user.id).toBe(testUser.id);
      });

      it('should extract token from httpOnly cookie', async () => {
        mockReq.cookies = { accessToken: validToken };

        authenticateToken(mockReq, mockRes, mockNext);
        await flushPromises();

        expect(mockVerifyAccessToken).toHaveBeenCalledWith(validToken);
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.user).toBeDefined();
      });

      it('should prefer header token over cookie token', async () => {
        const headerToken = 'header-token';
        const cookieToken = 'cookie-token';
        mockReq.headers['authorization'] = `Bearer ${headerToken}`;
        mockReq.cookies = { accessToken: cookieToken };

        authenticateToken(mockReq, mockRes, mockNext);
        await flushPromises();

        expect(mockVerifyAccessToken).toHaveBeenCalledWith(headerToken);
      });

      it('should pass error to next when no token provided', async () => {
        authenticateToken(mockReq, mockRes, mockNext);
        await flushPromises();

        expect(mockNext).toHaveBeenCalled();
        const error = mockNext.mock.calls[0][0];
        expect(error).toBeDefined();
        expect(error.statusCode).toBe(401);
        // Check message contains relevant info
        expect(error.message.toLowerCase()).toContain('token');
      });

      it('should pass error to next for malformed Authorization header', async () => {
        mockReq.headers['authorization'] = 'InvalidFormat';

        authenticateToken(mockReq, mockRes, mockNext);
        await flushPromises();

        expect(mockNext).toHaveBeenCalled();
        const error = mockNext.mock.calls[0][0];
        expect(error).toBeDefined();
        expect(error.statusCode).toBe(401);
      });

      it('should pass error to next for empty Bearer token', async () => {
        mockReq.headers['authorization'] = 'Bearer ';
        mockVerifyAccessToken.mockRejectedValue(new Error('Invalid token'));

        authenticateToken(mockReq, mockRes, mockNext);
        await flushPromises();

        expect(mockNext).toHaveBeenCalled();
        const error = mockNext.mock.calls[0][0];
        expect(error).toBeDefined();
        expect(error.statusCode).toBe(401);
      });
    });

    describe('Token Verification', () => {
      beforeEach(() => {
        mockReq.headers['authorization'] = `Bearer ${validToken}`;
      });

      it('should verify token and attach user to request', async () => {
        authenticateToken(mockReq, mockRes, mockNext);
        await flushPromises();

        expect(mockNext).toHaveBeenCalled();
        // For success, next is called without arguments
        expect(mockNext.mock.calls[0]).toEqual([]);
        expect(mockReq.user).toEqual({
          id: testUser.id,
          email: testUser.email,
          username: testUser.username,
          role: testUser.role,
          estate_id: testUser.estate_id
        });
      });

      it('should pass error to next for expired token', async () => {
        const expiredError = new Error('Token expired');
        expiredError.name = 'TokenExpiredError';
        mockVerifyAccessToken.mockRejectedValue(expiredError);

        authenticateToken(mockReq, mockRes, mockNext);
        await flushPromises();

        expect(mockNext).toHaveBeenCalled();
        const error = mockNext.mock.calls[0][0];
        expect(error).toBeDefined();
        expect(error.statusCode).toBe(401);
        expect(error.message.toLowerCase()).toContain('expired');
      });

      it('should pass error to next for invalid token', async () => {
        const invalidError = new Error('Invalid token');
        invalidError.name = 'JsonWebTokenError';
        mockVerifyAccessToken.mockRejectedValue(invalidError);

        authenticateToken(mockReq, mockRes, mockNext);
        await flushPromises();

        expect(mockNext).toHaveBeenCalled();
        const error = mockNext.mock.calls[0][0];
        expect(error).toBeDefined();
        expect(error.statusCode).toBe(401);
        expect(error.message.toLowerCase()).toContain('invalid');
      });

      it('should pass error to next for token without email', async () => {
        mockVerifyAccessToken.mockResolvedValue({ userId: 123 });

        authenticateToken(mockReq, mockRes, mockNext);
        await flushPromises();

        expect(mockNext).toHaveBeenCalled();
        const error = mockNext.mock.calls[0][0];
        expect(error).toBeDefined();
        expect(error.statusCode).toBe(401);
      });
    });

    describe('User Lookup', () => {
      beforeEach(() => {
        mockReq.headers['authorization'] = `Bearer ${validToken}`;
      });

      it('should look up user by email from token', async () => {
        authenticateToken(mockReq, mockRes, mockNext);
        await flushPromises();

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('SELECT'),
          [testUser.email]
        );
        expect(mockReq.user.estate_id).toBe(testUser.estate_id);
      });

      it('should pass error to next when user not found', async () => {
        mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

        authenticateToken(mockReq, mockRes, mockNext);
        await flushPromises();

        expect(mockNext).toHaveBeenCalled();
        const error = mockNext.mock.calls[0][0];
        expect(error).toBeDefined();
        expect(error.statusCode).toBe(401);
        expect(error.message.toLowerCase()).toContain('not found');
      });

      it('should pass error to next on database errors', async () => {
        mockQuery.mockRejectedValue(new Error('Database error'));

        authenticateToken(mockReq, mockRes, mockNext);
        await flushPromises();

        expect(mockNext).toHaveBeenCalled();
        const error = mockNext.mock.calls[0][0];
        expect(error).toBeDefined();
        expect(error.statusCode).toBe(500);
      });
    });
  });

  describe('attachUserFromToken', () => {
    it('should attach user when valid token in header', async () => {
      mockReq.headers['authorization'] = `Bearer ${validToken}`;

      await attachUserFromToken(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.id).toBe(testUser.id);
      expect(mockReq.user.estate_id).toBe(testUser.estate_id);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should attach user when valid token in cookie', async () => {
      mockReq.cookies = { accessToken: validToken };

      await attachUserFromToken(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without error when no token (optional auth)', async () => {
      await attachUserFromToken(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without user when token is invalid', async () => {
      mockReq.headers['authorization'] = `Bearer ${validToken}`;
      mockVerifyAccessToken.mockRejectedValue(new Error('Invalid token'));

      await attachUserFromToken(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without user when user not found', async () => {
      mockReq.headers['authorization'] = `Bearer ${validToken}`;
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      await attachUserFromToken(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should support user ID lookup from sub claim', async () => {
      mockReq.headers['authorization'] = `Bearer ${validToken}`;
      mockVerifyAccessToken.mockResolvedValue({ sub: '123' });
      mockQuery.mockResolvedValue({ rows: [testUser], rowCount: 1 });

      await attachUserFromToken(mockReq, mockRes, mockNext);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('id ='),
        [123]
      );
      expect(mockReq.user).toBeDefined();
    });
  });

  describe('authorize', () => {
    beforeEach(() => {
      mockReq.user = testUser;
    });

    it('should allow access for matching role (single role as array)', () => {
      const middleware = authorize(['resident']);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access for any of multiple roles', () => {
      const middleware = authorize(['admin', 'guard', 'resident']);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw error for unauthorized role', () => {
      const middleware = authorize(['admin']);

      expect(() => middleware(mockReq, mockRes, mockNext)).toThrow(AppError);
    });

    it('should throw error when user not authenticated', () => {
      mockReq.user = null;
      const middleware = authorize(['resident']);

      expect(() => middleware(mockReq, mockRes, mockNext)).toThrow(AppError);
    });

    it('should allow access when no roles specified', () => {
      const middleware = authorize(null);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      mockReq.user = testUser;
    });

    it('should allow access for exact role match', () => {
      const middleware = requireRole('resident');

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access when role is in allowed list (spread params)', () => {
      const middleware = requireRole('admin', 'guard', 'resident');

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw error for mismatched role', () => {
      const middleware = requireRole('admin');

      expect(() => middleware(mockReq, mockRes, mockNext)).toThrow(AppError);
    });

    it('should throw error when user not authenticated', () => {
      mockReq.user = undefined;
      const middleware = requireRole('resident');

      expect(() => middleware(mockReq, mockRes, mockNext)).toThrow(AppError);
    });

    it('should use strict role comparison (case-sensitive)', () => {
      const middleware = requireRole('Resident');

      expect(() => middleware(mockReq, mockRes, mockNext)).toThrow(AppError);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete authentication flow', async () => {
      mockReq.headers['authorization'] = `Bearer ${validToken}`;

      authenticateToken(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();

      mockNext.mockClear();

      const authMiddleware = authorize(['resident']);
      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject authentication with expired token', async () => {
      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      mockVerifyAccessToken.mockRejectedValue(expiredError);

      mockReq.headers['authorization'] = 'Bearer expired-token';

      authenticateToken(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeDefined();
      expect(error.statusCode).toBe(401);
      expect(error.message.toLowerCase()).toContain('expired');
    });

    it('should handle guard role accessing guard endpoints', () => {
      mockReq.user = { ...testUser, role: 'guard' };
      
      const middleware = authorize(['guard', 'admin']);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny resident access to admin endpoints', () => {
      mockReq.user = testUser;
      const middleware = authorize(['admin']);

      expect(() => middleware(mockReq, mockRes, mockNext)).toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should produce error with statusCode when no token', async () => {
      authenticateToken(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeDefined();
      expect(typeof error.statusCode).toBe('number');
      expect(typeof error.message).toBe('string');
    });

    it('should not leak sensitive information in errors', async () => {
      mockReq.headers['authorization'] = `Bearer ${validToken}`;
      mockVerifyAccessToken.mockRejectedValue(new Error('Detailed JWT error with secret key info'));

      authenticateToken(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error.message).not.toContain('secret');
      expect(error.message).not.toContain('key');
    });

    it('should handle database connection errors gracefully', async () => {
      mockReq.headers['authorization'] = `Bearer ${validToken}`;
      mockQuery.mockRejectedValue(new Error('ECONNREFUSED'));

      authenticateToken(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeDefined();
      expect(error.statusCode).toBe(500);
    });

    it('should handle null headers gracefully', async () => {
      mockReq.headers = null;
      mockReq.cookies = undefined;

      authenticateToken(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeDefined();
    });
  });

  describe('Security', () => {
    it('should not accept token in query parameter', async () => {
      mockReq.query = { token: validToken };

      authenticateToken(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeDefined();
      expect(error.statusCode).toBe(401);
    });

    it('should accept token from auth header regardless of prefix', async () => {
      mockReq.headers['authorization'] = `Basic ${validToken}`;
      mockVerifyAccessToken.mockResolvedValue({ email: testUser.email });

      authenticateToken(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockVerifyAccessToken).toHaveBeenCalledWith(validToken);
    });

    it('should handle very long token strings', async () => {
      const longToken = 'a'.repeat(10000);
      mockReq.headers['authorization'] = `Bearer ${longToken}`;
      mockVerifyAccessToken.mockRejectedValue(new Error('Invalid token'));

      authenticateToken(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeDefined();
      expect(error.statusCode).toBe(401);
    });

    it('should handle token with special characters', async () => {
      const specialToken = 'token<script>alert(1)</script>';
      mockReq.headers['authorization'] = `Bearer ${specialToken}`;
      mockVerifyAccessToken.mockRejectedValue(new Error('Invalid token'));

      authenticateToken(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeDefined();
      expect(error.statusCode).toBe(401);
    });
  });

  describe('Module Exports', () => {
    it('should export authenticateToken as default', () => {
      expect(authMiddlewareModule.default).toBe(authenticateToken);
    });

    it('should export protect as alias for authenticateToken', () => {
      expect(authMiddlewareModule.protect).toBe(authenticateToken);
    });

    it('should export authenticate as alias for authenticateToken', () => {
      expect(authMiddlewareModule.authenticate).toBe(authenticateToken);
    });
  });
});
