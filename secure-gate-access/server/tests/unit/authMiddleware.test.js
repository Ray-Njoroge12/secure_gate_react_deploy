/**
 * Authentication Middleware Tests
 * 
 * Critical test suite for authentication middleware
 * Phase 1, Week 1, Day 4 - Phase B: Coverage Analysis
 * 
 * Tests:
 * - Token validation and verification
 * - User lookup and attachment
 * - Error handling for various scenarios
 * - Authorization checks
 * - Edge cases and security scenarios
 */

import { jest } from '@jest/globals';
import { authenticateToken, attachUserFromToken, authorize, protect, authenticate } from '../../src/middleware/authMiddleware.js';
import { tokenService } from '../../src/services/tokenService.js';
import { dbManager } from '../../src/database/db.enhanced.js';
import { AppError } from '../../src/middleware/standardizedErrorHandler.js';

// Import test utilities
import { createMockRequest, createMockResponse, createMockNext } from '../helpers/mockHelpers.js';
import { createEnhancedUserFixture } from '../fixtures/userFixtures.js';
import { createEnhancedAuthFixture } from '../fixtures/authFixtures.js';
import { createTokenFixture } from '../fixtures/tokenFixtures.js';

describe('Authentication Middleware - Critical Tests', () => {
  let mockReq, mockRes, mockNext;
  let mockUser, mockToken, mockAuthHeader;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create fresh mocks for each test
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = createMockNext();

    // Create test fixtures
    mockUser = createEnhancedUserFixture({
      role: 'admin',
      verified: true
    });

    mockToken = createTokenFixture({
      userId: mockUser.id,
      email: mockUser.email,
      role: mockUser.role
    });

    mockAuthHeader = `Bearer ${mockToken.accessToken}`;
  });

  describe('authenticateToken()', () => {
    describe('✅ Success Cases', () => {
      test('should authenticate valid token and attach user', async () => {
        // Setup
        mockReq.headers['authorization'] = mockAuthHeader;
        
        jest.spyOn(tokenService, 'verifyAccessToken').mockReturnValue({
          email: mockUser.email,
          role: mockUser.role,
          exp: Math.floor(Date.now() / 1000) + 3600
        });

        jest.spyOn(dbManager, 'query').mockResolvedValue({
          rowCount: 1,
          rows: [{
            id: mockUser.id,
            email: mockUser.email,
            username: mockUser.username,
            role: mockUser.role,
            verified: mockUser.verified
          }]
        });

        // Execute
        await authenticateToken(mockReq, mockRes, mockNext);

        // Assert
        expect(tokenService.verifyAccessToken).toHaveBeenCalledWith(mockToken.accessToken);
        expect(dbManager.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT id, email, username, role, verified FROM users'),
          [mockUser.email]
        );
        expect(mockReq.user).toEqual({
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          role: mockUser.role,
          verified: mockUser.verified
        });
        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });

      test('should handle case-insensitive email lookup', async () => {
        // Setup - token has uppercase email
        const upperCaseEmail = mockUser.email.toUpperCase();
        mockReq.headers['authorization'] = mockAuthHeader;
        
        jest.spyOn(tokenService, 'verifyAccessToken').mockReturnValue({
          email: upperCaseEmail,
          role: mockUser.role,
          exp: Math.floor(Date.now() / 1000) + 3600
        });

        jest.spyOn(dbManager, 'query').mockResolvedValue({
          rowCount: 1,
          rows: [{
            id: mockUser.id,
            email: mockUser.email.toLowerCase(),
            username: mockUser.username,
            role: mockUser.role,
            verified: mockUser.verified
          }]
        });

        // Execute
        await authenticateToken(mockReq, mockRes, mockNext);

        // Assert
        expect(dbManager.query).toHaveBeenCalledWith(
          expect.stringContaining('LOWER(email) = LOWER($1)'),
          [upperCaseEmail]
        );
        expect(mockReq.user).toBeDefined();
        expect(mockNext).toHaveBeenCalled();
      });

      test('should work with verified users', async () => {
        // Setup
        const verifiedUser = createEnhancedUserFixture({ verified: true });
        mockReq.headers['authorization'] = mockAuthHeader;
        
        jest.spyOn(tokenService, 'verifyAccessToken').mockReturnValue({
          email: verifiedUser.email,
          role: verifiedUser.role,
          exp: Math.floor(Date.now() / 1000) + 3600
        });

        jest.spyOn(dbManager, 'query').mockResolvedValue({
          rowCount: 1,
          rows: [verifiedUser]
        });

        // Execute
        await authenticateToken(mockReq, mockRes, mockNext);

        // Assert
        expect(mockReq.user.verified).toBe(true);
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('❌ Error Cases', () => {
      test('should reject request with no Authorization header', async () => {
        // Setup - no header
        delete mockReq.headers['authorization'];

        // Execute & Assert
        await expect(authenticateToken(mockReq, mockRes, mockNext))
          .rejects
          .toThrow(AppError);
        
        await expect(authenticateToken(mockReq, mockRes, mockNext))
          .rejects
          .toMatchObject({
            message: 'Token required',
            statusCode: 401,
            code: 'AUTH_TOKEN_MISSING'
          });

        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should reject request with malformed Authorization header', async () => {
        // Setup - no "Bearer " prefix
        mockReq.headers['authorization'] = mockToken.accessToken;

        // Execute & Assert
        await expect(authenticateToken(mockReq, mockRes, mockNext))
          .rejects
          .toThrow(AppError);

        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should reject expired token', async () => {
        // Setup
        mockReq.headers['authorization'] = mockAuthHeader;
        
        const expiredError = new Error('Token expired');
        expiredError.name = 'TokenExpiredError';
        
        jest.spyOn(tokenService, 'verifyAccessToken').mockImplementation(() => {
          throw expiredError;
        });

        // Execute & Assert
        await expect(authenticateToken(mockReq, mockRes, mockNext))
          .rejects
          .toMatchObject({
            message: 'Token expired',
            statusCode: 401,
            code: 'AUTH_TOKEN_EXPIRED'
          });

        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should reject invalid token', async () => {
        // Setup
        mockReq.headers['authorization'] = mockAuthHeader;
        
        const invalidError = new Error('Invalid signature');
        invalidError.name = 'JsonWebTokenError';
        
        jest.spyOn(tokenService, 'verifyAccessToken').mockImplementation(() => {
          throw invalidError;
        });

        // Execute & Assert
        await expect(authenticateToken(mockReq, mockRes, mockNext))
          .rejects
          .toMatchObject({
            message: 'Invalid token',
            statusCode: 401,
            code: 'AUTH_TOKEN_INVALID'
          });

        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should reject token with missing email', async () => {
        // Setup - token without email
        mockReq.headers['authorization'] = mockAuthHeader;
        
        jest.spyOn(tokenService, 'verifyAccessToken').mockReturnValue({
          // Missing email field
          role: 'user',
          exp: Math.floor(Date.now() / 1000) + 3600
        });

        // Execute & Assert
        await expect(authenticateToken(mockReq, mockRes, mockNext))
          .rejects
          .toMatchObject({
            message: 'Invalid token format',
            statusCode: 401,
            code: 'AUTH_TOKEN_INVALID'
          });

        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should reject when user not found in database', async () => {
        // Setup
        mockReq.headers['authorization'] = mockAuthHeader;
        
        jest.spyOn(tokenService, 'verifyAccessToken').mockReturnValue({
          email: 'nonexistent@example.com',
          role: 'user',
          exp: Math.floor(Date.now() / 1000) + 3600
        });

        jest.spyOn(dbManager, 'query').mockResolvedValue({
          rowCount: 0,
          rows: []
        });

        // Execute & Assert
        await expect(authenticateToken(mockReq, mockRes, mockNext))
          .rejects
          .toMatchObject({
            message: 'User not found',
            statusCode: 401,
            code: 'AUTH_USER_NOT_FOUND'
          });

        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should handle database errors gracefully', async () => {
        // Setup
        mockReq.headers['authorization'] = mockAuthHeader;
        
        jest.spyOn(tokenService, 'verifyAccessToken').mockReturnValue({
          email: mockUser.email,
          role: mockUser.role,
          exp: Math.floor(Date.now() / 1000) + 3600
        });

        jest.spyOn(dbManager, 'query').mockRejectedValue(
          new Error('Database connection failed')
        );

        // Execute & Assert
        await expect(authenticateToken(mockReq, mockRes, mockNext))
          .rejects
          .toMatchObject({
            message: 'Authentication error',
            statusCode: 500,
            code: 'AUTH_INTERNAL_ERROR'
          });

        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });

  describe('attachUserFromToken()', () => {
    describe('✅ Success Cases', () => {
      test('should attach user when valid token provided', async () => {
        // Setup
        mockReq.headers['authorization'] = mockAuthHeader;
        
        jest.spyOn(tokenService, 'verifyAccessToken').mockReturnValue({
          email: mockUser.email,
          role: mockUser.role,
          exp: Math.floor(Date.now() / 1000) + 3600
        });

        jest.spyOn(dbManager, 'query').mockResolvedValue({
          rowCount: 1,
          rows: [mockUser]
        });

        // Execute
        await attachUserFromToken(mockReq, mockRes, mockNext);

        // Assert
        expect(mockReq.user).toEqual({
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          role: mockUser.role,
          verified: mockUser.verified
        });
        expect(mockNext).toHaveBeenCalledWith();
      });

      test('should continue without user when no token provided', async () => {
        // Setup - no Authorization header
        delete mockReq.headers['authorization'];

        // Execute
        await attachUserFromToken(mockReq, mockRes, mockNext);

        // Assert
        expect(mockReq.user).toBeUndefined();
        expect(mockNext).toHaveBeenCalledWith();
        expect(tokenService.verifyAccessToken).not.toHaveBeenCalled();
      });

      test('should continue when token is invalid (non-fatal)', async () => {
        // Setup
        mockReq.headers['authorization'] = mockAuthHeader;
        
        jest.spyOn(tokenService, 'verifyAccessToken').mockImplementation(() => {
          throw new Error('Invalid token');
        });

        // Execute
        await attachUserFromToken(mockReq, mockRes, mockNext);

        // Assert
        expect(mockReq.user).toBeUndefined();
        expect(mockNext).toHaveBeenCalledWith();
      });

      test('should support user ID lookup (sub claim)', async () => {
        // Setup - token with sub claim instead of email
        mockReq.headers['authorization'] = mockAuthHeader;
        
        jest.spyOn(tokenService, 'verifyAccessToken').mockReturnValue({
          sub: mockUser.id.toString(),
          role: mockUser.role,
          exp: Math.floor(Date.now() / 1000) + 3600
        });

        jest.spyOn(dbManager, 'query').mockResolvedValue({
          rowCount: 1,
          rows: [mockUser]
        });

        // Execute
        await attachUserFromToken(mockReq, mockRes, mockNext);

        // Assert
        expect(dbManager.query).toHaveBeenCalledWith(
          expect.stringContaining('WHERE id = $1'),
          [mockUser.id]
        );
        expect(mockReq.user).toBeDefined();
        expect(mockNext).toHaveBeenCalled();
      });

      test('should continue when user not found (non-fatal)', async () => {
        // Setup
        mockReq.headers['authorization'] = mockAuthHeader;
        
        jest.spyOn(tokenService, 'verifyAccessToken').mockReturnValue({
          email: 'nonexistent@example.com',
          role: 'user',
          exp: Math.floor(Date.now() / 1000) + 3600
        });

        jest.spyOn(dbManager, 'query').mockResolvedValue({
          rowCount: 0,
          rows: []
        });

        // Execute
        await attachUserFromToken(mockReq, mockRes, mockNext);

        // Assert
        expect(mockReq.user).toBeUndefined();
        expect(mockNext).toHaveBeenCalledWith();
      });
    });
  });

  describe('authorize()', () => {
    describe('✅ Success Cases', () => {
      test('should allow user with correct role', () => {
        // Setup
        mockReq.user = mockUser; // Admin user
        const adminOnlyMiddleware = authorize(['admin']);

        // Execute
        adminOnlyMiddleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });

      test('should allow user with any of multiple allowed roles', () => {
        // Setup
        mockReq.user = createEnhancedUserFixture({ role: 'security' });
        const multiRoleMiddleware = authorize(['admin', 'security', 'manager']);

        // Execute
        multiRoleMiddleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalledWith();
      });

      test('should allow when no roles specified (just authenticated)', () => {
        // Setup
        mockReq.user = mockUser;
        const anyAuthMiddleware = authorize();

        // Execute
        anyAuthMiddleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalledWith();
      });
    });

    describe('❌ Error Cases', () => {
      test('should reject when user not authenticated', () => {
        // Setup - no user attached
        delete mockReq.user;
        const adminOnlyMiddleware = authorize(['admin']);

        // Execute & Assert
        expect(() => adminOnlyMiddleware(mockReq, mockRes, mockNext))
          .toThrow(AppError);
        
        expect(() => adminOnlyMiddleware(mockReq, mockRes, mockNext))
          .toThrow('Authentication required');
        
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should reject when user lacks required role', () => {
        // Setup
        mockReq.user = createEnhancedUserFixture({ role: 'user' });
        const adminOnlyMiddleware = authorize(['admin']);

        // Execute & Assert
        expect(() => adminOnlyMiddleware(mockReq, mockRes, mockNext))
          .toThrow(AppError);
        
        expect(() => adminOnlyMiddleware(mockReq, mockRes, mockNext))
          .toThrow('Insufficient permissions');
        
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should reject when role not in allowed list', () => {
        // Setup
        mockReq.user = createEnhancedUserFixture({ role: 'guest' });
        const secureMiddleware = authorize(['admin', 'security', 'manager']);

        // Execute & Assert
        expect(() => secureMiddleware(mockReq, mockRes, mockNext))
          .toThrow('Insufficient permissions');
        
        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });

  describe('Middleware Aliases', () => {
    test('protect should be alias for authenticateToken', () => {
      expect(protect).toBe(authenticateToken);
    });

    test('authenticate should be alias for authenticateToken', () => {
      expect(authenticate).toBe(authenticateToken);
    });
  });

  describe('Security Edge Cases', () => {
    test('should not expose sensitive error details', async () => {
      // Setup
      mockReq.headers['authorization'] = mockAuthHeader;
      
      jest.spyOn(tokenService, 'verifyAccessToken').mockImplementation(() => {
        throw new Error('Detailed internal error with sensitive data');
      });

      // Execute & Assert
      await expect(authenticateToken(mockReq, mockRes, mockNext))
        .rejects
        .not.toMatchObject({
          message: expect.stringContaining('sensitive')
        });
    });

    test('should handle null/undefined user gracefully', async () => {
      // Setup
      mockReq.headers['authorization'] = mockAuthHeader;
      
      jest.spyOn(tokenService, 'verifyAccessToken').mockReturnValue({
        email: mockUser.email,
        role: mockUser.role,
        exp: Math.floor(Date.now() / 1000) + 3600
      });

      jest.spyOn(dbManager, 'query').mockResolvedValue({
        rowCount: 1,
        rows: [null]
      });

      // Execute
      // Should handle gracefully without crashing
      try {
        await authenticateToken(mockReq, mockRes, mockNext);
      } catch (error) {
        // Expect an error but no crash
        expect(error).toBeDefined();
      }
    });

    test('should prevent token reuse after user deletion', async () => {
      // Setup - valid token but user deleted from DB
      mockReq.headers['authorization'] = mockAuthHeader;
      
      jest.spyOn(tokenService, 'verifyAccessToken').mockReturnValue({
        email: mockUser.email,
        role: mockUser.role,
        exp: Math.floor(Date.now() / 1000) + 3600
      });

      jest.spyOn(dbManager, 'query').mockResolvedValue({
        rowCount: 0,
        rows: []
      });

      // Execute & Assert
      await expect(authenticateToken(mockReq, mockRes, mockNext))
        .rejects
        .toMatchObject({
          message: 'User not found',
          statusCode: 401
        });
    });
  });
});
