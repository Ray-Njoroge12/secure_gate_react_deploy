/**
 * Comprehensive Test Suite for userController
 * Tests user authentication, registration, and session management
 * 
 * Coverage Areas:
 * - User registration with password validation
 * - User login with security features
 * - Token refresh mechanism
 * - User logout and session cleanup
 * - Profile updates
 * - Account lockout mechanisms
 * - Audit logging
 * - Session security
 * - Error handling
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockDbManager = {
  query: jest.fn()
};

const mockAuditLog = jest.fn();
const mockAuditLogger = {
  logLoginAttempt: jest.fn(),
  logAccountLockout: jest.fn(),
  logSecurityEvent: jest.fn()
};

const mockTokenService = {
  generateTokens: jest.fn(),
  verifyRefreshToken: jest.fn(),
  revokeToken: jest.fn()
};

const mockPasswordService = {
  checkPasswordStrength: jest.fn(),
  hashPassword: jest.fn(),
  verifyPassword: jest.fn()
};

const mockAccountSecurity = {
  isAccountLocked: jest.fn(),
  getLockoutInfo: jest.fn(),
  recordFailedAttempt: jest.fn(),
  clearFailedAttempts: jest.fn()
};

const mockSessionSecurityService = {
  initializeSession: jest.fn(),
  destroySession: jest.fn()
};

const mockLoggingService = {
  logSecurity: jest.fn(),
  logError: jest.fn()
};

const mockErrorHelper = {
  requiredField: jest.fn((field) => new Error(`${field} is required`)),
  notFound: jest.fn((type, id) => new Error(`${type} not found: ${id}`)),
  alreadyExists: jest.fn((type, id) => new Error(`${type} already exists: ${id}`)),
  invalidFormat: jest.fn((field, msg, extra) => {
    const err = new Error(msg);
    err.extra = extra;
    return err;
  })
};

const mockAsyncHandler = (fn) => fn;

const mockResponseUtil = {
  updated: jest.fn((res, data, message) => {
    return res.json({ success: true, data, message });
  }),
  created: jest.fn((res, data, message, extra) => {
    return res.status(201).json({ success: true, data, message, ...extra });
  })
};

const mockSanitizeUser = jest.fn((user) => {
  if (!user) return undefined;
  const { password_hash, ...clean } = user;
  return clean;
});

// Mock modules before importing controller
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: mockDbManager
}));

jest.unstable_mockModule('../../src/services/auditService.js', () => ({
  auditLog: jest.fn().mockResolvedValue(undefined),
  default: { auditLog: jest.fn().mockResolvedValue(undefined) }
}));

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({
  tokenService: mockTokenService,
  passwordService: mockPasswordService,
  accountSecurity: mockAccountSecurity
}));

jest.unstable_mockModule('../../src/middleware/standardizedErrorHandler.js', () => ({
  ErrorHelper: mockErrorHelper,
  asyncHandler: mockAsyncHandler
}));

jest.unstable_mockModule('../../src/utils/responseUtils.js', () => ({
  ResponseUtil: mockResponseUtil,
  sanitizeUser: mockSanitizeUser
}));

jest.unstable_mockModule('../../src/services/sessionSecurityService.js', () => ({
  default: mockSessionSecurityService
}));

jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  default: mockLoggingService
}));

// Import controller after mocks
const {
  updateProfile,
  registerUser,
  loginUser,
  refreshToken,
  logoutUser
} = await import('../../src/controllers/userController.js');

describe('userController', () => {
  let mockReq, mockRes;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    // Re-implement mockSanitizeUser after clearAllMocks
    mockSanitizeUser.mockImplementation((user) => {
      if (!user) return undefined;
      const { password_hash, ...clean } = user;
      return clean;
    });

    // Setup mock request
    mockReq = {
      body: {},
      params: {},
      headers: {},
      cookies: {},
      ip: '192.168.1.100',
      sessionID: 'session-123',
      get: jest.fn((header) => {
        if (header === 'User-Agent') return 'Mozilla/5.0';
        return null;
      }),
      user: null,
      session: {},
      correlationId: 'corr-123'
    };

    // Setup mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis()
    };
  });

  // =====================================================
  // USER REGISTRATION TESTS
  // =====================================================

  describe('registerUser()', () => {
    beforeEach(() => {
      mockReq.body = {
        email: 'newuser@example.com',
        username: 'newuser',
        role: 'resident',
        password: 'StrongP@ssw0rd!',
        phone: '+1234567890',
        area: 'Building A',
        house: '101'
      };
    });

    describe('Success Cases', () => {
      test('should register a new user successfully', async () => {
        mockPasswordService.checkPasswordStrength.mockReturnValue({
          strength: 'strong',
          message: 'Password is strong'
        });

        mockPasswordService.hashPassword.mockResolvedValue('$argon2id$hashed_password');

        mockDbManager.query
          .mockResolvedValueOnce({ rowCount: 0 }) // Check existing user
          .mockResolvedValueOnce({ // Insert new user
            rows: [{
              id: 1,
              email: 'newuser@example.com',
              username: 'newuser',
              role: 'resident',
              phone: '+1234567890',
              area: 'Building A',
              house: '101',
              notify_email: true,
              notify_sms: false,
              verified: false,
              created_at: new Date()
            }]
          });

        await registerUser(mockReq, mockRes);

        // Verify password strength check
        expect(mockPasswordService.checkPasswordStrength).toHaveBeenCalledWith('StrongP@ssw0rd!');

        // Verify password hashing
        expect(mockPasswordService.hashPassword).toHaveBeenCalledWith('StrongP@ssw0rd!');

        // Verify database queries
        expect(mockDbManager.query).toHaveBeenCalledTimes(2);

        // Verify audit logging
        expect(mockAuditLog).toHaveBeenCalledWith(
          'USER_REGISTERED',
          1,
          expect.objectContaining({
            email: 'newuser@example.com',
            role: 'resident'
          })
        );

        // Verify response
        expect(mockResponseUtil.created).toHaveBeenCalledWith(
          mockRes,
          expect.objectContaining({
            email: 'newuser@example.com',
            username: 'newuser'
          }),
          'User registered successfully',
          { requiresVerification: true }
        );
      });

      test('should normalize role to lowercase', async () => {
        mockReq.body.role = 'RESIDENT';

        mockPasswordService.checkPasswordStrength.mockReturnValue({
          strength: 'strong',
          message: 'Password is strong'
        });

        mockPasswordService.hashPassword.mockResolvedValue('$argon2id$hashed');

        mockDbManager.query
          .mockResolvedValueOnce({ rowCount: 0 })
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              email: 'newuser@example.com',
              username: 'newuser',
              role: 'resident',
              verified: false,
              created_at: new Date()
            }]
          });

        await registerUser(mockReq, mockRes);

        // Verify role was normalized
        const insertCall = mockDbManager.query.mock.calls[1];
        expect(insertCall[1]).toContain('resident');
      });

      test('should set default notification preferences', async () => {
        delete mockReq.body.notify_email;
        delete mockReq.body.notify_sms;

        mockPasswordService.checkPasswordStrength.mockReturnValue({
          strength: 'strong',
          message: 'Password is strong'
        });

        mockPasswordService.hashPassword.mockResolvedValue('$argon2id$hashed');

        mockDbManager.query
          .mockResolvedValueOnce({ rowCount: 0 })
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              email: 'newuser@example.com',
              notify_email: true,
              notify_sms: false,
              verified: false,
              created_at: new Date()
            }]
          });

        await registerUser(mockReq, mockRes);

        // Verify default notification settings were used
        const insertCall = mockDbManager.query.mock.calls[1];
        expect(insertCall[1]).toContain(true); // notify_email default
        expect(insertCall[1]).toContain(false); // notify_sms default
      });
    });

    describe('Validation Errors', () => {
      test('should reject registration with missing required fields', async () => {
        delete mockReq.body.email;
        delete mockReq.body.password;

        mockErrorHelper.requiredField.mockImplementation((field) => {
          const err = new Error(`${field} is required`);
          throw err;
        });

        await expect(registerUser(mockReq, mockRes)).rejects.toThrow();
      });

      test('should reject registration with weak password', async () => {
        mockReq.body.password = 'weak';

        mockPasswordService.checkPasswordStrength.mockReturnValue({
          strength: 'weak',
          message: 'Password must be at least 8 characters'
        });

        mockErrorHelper.invalidFormat.mockImplementation((field, msg, extra) => {
          const err = new Error(msg);
          err.extra = extra;
          throw err;
        });

        await expect(registerUser(mockReq, mockRes)).rejects.toThrow();
      });

      test('should reject registration with existing email', async () => {
        mockPasswordService.checkPasswordStrength.mockReturnValue({
          strength: 'strong',
          message: 'Password is strong'
        });

        mockDbManager.query.mockResolvedValueOnce({ rowCount: 1 }); // Email exists

        mockErrorHelper.alreadyExists.mockImplementation((type, id) => {
          throw new Error(`${type} already exists: ${id}`);
        });

        await expect(registerUser(mockReq, mockRes)).rejects.toThrow();
      });
    });

    describe('Password Security', () => {
      test('should hash password with Argon2', async () => {
        mockPasswordService.checkPasswordStrength.mockReturnValue({
          strength: 'strong',
          message: 'Password is strong'
        });

        mockPasswordService.hashPassword.mockResolvedValue('$argon2id$v=19$m=65536,t=3,p=4$...');

        mockDbManager.query
          .mockResolvedValueOnce({ rowCount: 0 })
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              email: 'newuser@example.com',
              verified: false,
              created_at: new Date()
            }]
          });

        await registerUser(mockReq, mockRes);

        expect(mockPasswordService.hashPassword).toHaveBeenCalledWith('StrongP@ssw0rd!');

        const insertCall = mockDbManager.query.mock.calls[1];
        expect(insertCall[1]).toContain('$argon2id$v=19$m=65536,t=3,p=4$...');
      });

      test('should not return password hash in response', async () => {
        mockPasswordService.checkPasswordStrength.mockReturnValue({
          strength: 'strong',
          message: 'Password is strong'
        });

        mockPasswordService.hashPassword.mockResolvedValue('$argon2id$hashed');

        mockDbManager.query
          .mockResolvedValueOnce({ rowCount: 0 })
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              email: 'newuser@example.com',
              password_hash: '$argon2id$hashed',
              verified: false,
              created_at: new Date()
            }]
          });

        await registerUser(mockReq, mockRes);

        expect(mockSanitizeUser).toHaveBeenCalled();
        expect(mockResponseUtil.created).toHaveBeenCalledWith(
          mockRes,
          expect.not.objectContaining({
            password_hash: expect.anything()
          }),
          expect.any(String),
          expect.any(Object)
        );
      });
    });
  });

  // =====================================================
  // USER LOGIN TESTS
  // =====================================================

  describe('loginUser()', () => {
    beforeEach(() => {
      mockReq.body = {
        email: 'user@example.com',
        password: 'UserP@ssw0rd!'
      };
    });

    describe('Success Cases', () => {
      test('should login user successfully with Argon2 password', async () => {
        const mockUser = {
          id: 1,
          email: 'user@example.com',
          username: 'testuser',
          role: 'resident',
          password_hash: '$argon2id$v=19$m=65536,t=3,p=4$hashed',
          phone: '+1234567890',
          area: 'Building A',
          house: '101',
          verified: true,
          estate_id: 12
        };

        mockDbManager.query.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });
        mockAccountSecurity.isAccountLocked.mockReturnValue(false);
        mockPasswordService.verifyPassword.mockResolvedValue(true);
        mockAccountSecurity.clearFailedAttempts.mockReturnValue(true);

        mockSessionSecurityService.initializeSession.mockResolvedValue(true);

        mockTokenService.generateTokens.mockReturnValue({
          accessToken: 'access_token_xyz',
          refreshToken: 'refresh_token_abc',
          tokenType: 'Bearer',
          expiresIn: 900,
          tokenId: 'token-id-123'
        });

        await loginUser(mockReq, mockRes);

        // Verify password verification
        expect(mockPasswordService.verifyPassword).toHaveBeenCalledWith(
          'UserP@ssw0rd!',
          '$argon2id$v=19$m=65536,t=3,p=4$hashed'
        );

        // Verify failed attempts cleared
        expect(mockAccountSecurity.clearFailedAttempts).toHaveBeenCalledWith(1);

        // Verify session initialized
        expect(mockSessionSecurityService.initializeSession).toHaveBeenCalledWith(
          mockReq,
          expect.objectContaining({
            id: 1,
            email: 'user@example.com',
            role: 'resident',
            estate_id: 12
          })
        );

        // Verify tokens generated
        expect(mockTokenService.generateTokens).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 1,
            email: 'user@example.com',
            role: 'resident',
            estate_id: 12
          })
        );

        // Verify refresh token cookie set
        expect(mockRes.cookie).toHaveBeenCalledWith(
          'refreshToken',
          'refresh_token_abc',
          expect.objectContaining({
            httpOnly: true,
            sameSite: 'lax',
            path: '/api/auth/refresh'
          })
        );

        // Verify audit logging
        expect(mockAuditLogger.logLoginAttempt).toHaveBeenCalledWith(
          true,
          1,
          '192.168.1.100',
          'Mozilla/5.0',
          'session-123',
          expect.objectContaining({
            role: 'resident',
            tokenId: 'token-id-123',
            loginMethod: 'password'
          })
        );

        // Verify successful response
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            accessToken: 'access_token_xyz',
            role: 'resident',
            user: expect.not.objectContaining({
              password_hash: expect.anything()
            })
          })
        );
      });

    });

    describe('Authentication Failures', () => {
      test('should reject login with missing credentials', async () => {
        delete mockReq.body.password;

        await loginUser(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'error',
            message: 'Email and password required'
          })
        );
      });

      test('should reject login for non-existent user', async () => {
        mockDbManager.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        await loginUser(mockReq, mockRes);

        // Should log security event
        expect(mockLoggingService.logSecurity).toHaveBeenCalledWith(
          'warn',
          'Login attempt for non-existent email',
          expect.objectContaining({
            email: 'u***@example.com',
            reason: 'user_not_found'
          })
        );

        // Should log audit event
        expect(mockAuditLogger.logLoginAttempt).toHaveBeenCalledWith(
          false,
          null,
          '192.168.1.100',
          'Mozilla/5.0',
          'session-123',
          expect.objectContaining({
            email: 'user@example.com',
            reason: 'user_not_found'
          })
        );

        // Should return error
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Invalid credentials',
            error: expect.objectContaining({
              code: 'INVALID_CREDENTIALS'
            })
          })
        );
      });

      test('should reject login with incorrect password', async () => {
        const mockUser = {
          id: 1,
          email: 'user@example.com',
          password_hash: '$argon2id$hashed',
          role: 'resident',
          verified: true
        };

        mockDbManager.query.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });
        mockAccountSecurity.isAccountLocked.mockReturnValue(false);
        mockPasswordService.verifyPassword.mockResolvedValue(false);

        mockAccountSecurity.recordFailedAttempt.mockReturnValue({
          totalAttempts: 1,
          remainingAttempts: 4,
          isLocked: false
        });

        await loginUser(mockReq, mockRes);

        // Should record failed attempt
        expect(mockAccountSecurity.recordFailedAttempt).toHaveBeenCalledWith(1, '192.168.1.100');

        // Should log failed attempt
        expect(mockAuditLogger.logLoginAttempt).toHaveBeenCalledWith(
          false,
          1,
          '192.168.1.100',
          'Mozilla/5.0',
          'session-123',
          expect.objectContaining({
            reason: 'invalid_password',
            attemptCount: 1,
            remainingAttempts: 4
          })
        );

        // Should return error
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Invalid credentials',
            error: expect.objectContaining({
              code: 'INVALID_CREDENTIALS'
            })
          })
        );
      });
    });

    describe('Account Lockout', () => {
      test('should reject login for locked account', async () => {
        const mockUser = {
          id: 1,
          email: 'user@example.com',
          password_hash: '$argon2id$hashed',
          role: 'resident',
          verified: true
        };

        mockDbManager.query.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });
        mockAccountSecurity.isAccountLocked.mockReturnValue(true);
        mockAccountSecurity.getLockoutInfo.mockReturnValue({
          attemptCount: 5,
          lockedUntil: new Date(Date.now() + 900000),
          remainingTime: 900000
        });

        await loginUser(mockReq, mockRes);

        // Should log lockout attempt
        expect(mockAuditLogger.logAccountLockout).toHaveBeenCalledWith(
          1,
          '192.168.1.100',
          'login_attempt_while_locked',
          5
        );

        // Should return lockout error
        expect(mockRes.status).toHaveBeenCalledWith(423);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'error',
            message: 'Account temporarily locked',
            lockedUntil: expect.any(Date),
            remainingTime: 15 // minutes
          })
        );
      });

      test('should lockout account after too many failed attempts', async () => {
        const mockUser = {
          id: 1,
          email: 'user@example.com',
          password_hash: '$argon2id$hashed',
          role: 'resident',
          verified: true
        };

        mockDbManager.query.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });
        mockAccountSecurity.isAccountLocked.mockReturnValue(false);
        mockPasswordService.verifyPassword.mockResolvedValue(false);

        mockAccountSecurity.recordFailedAttempt.mockReturnValue({
          totalAttempts: 5,
          remainingAttempts: 0,
          isLocked: true
        });

        await loginUser(mockReq, mockRes);

        // Should log account lockout
        expect(mockAuditLogger.logAccountLockout).toHaveBeenCalledWith(
          1,
          '192.168.1.100',
          'too_many_failed_attempts',
          5
        );

        // Should return lockout message
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Too many failed attempts. Account temporarily locked.'
          })
        );
      });

      test('should warn user when approaching lockout', async () => {
        const mockUser = {
          id: 1,
          email: 'user@example.com',
          password_hash: '$argon2id$hashed',
          role: 'resident',
          verified: true
        };

        mockDbManager.query.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });
        mockAccountSecurity.isAccountLocked.mockReturnValue(false);
        mockPasswordService.verifyPassword.mockResolvedValue(false);

        mockAccountSecurity.recordFailedAttempt.mockReturnValue({
          totalAttempts: 4,
          remainingAttempts: 1,
          isLocked: false
        });

        await loginUser(mockReq, mockRes);

        // Should include warning message
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('1 attempts remaining before lockout')
          })
        );
      });
    });

    describe('Error Handling', () => {
      test('should handle database errors', async () => {
        mockDbManager.query.mockRejectedValueOnce(new Error('Database connection failed'));

        await loginUser(mockReq, mockRes);

        expect(mockLoggingService.logError).toHaveBeenCalledWith(
          'Unexpected login error',
          expect.any(Error),
          expect.any(Object)
        );

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'error',
            message: 'Server error'
          })
        );
      });

      test('should handle password verification errors', async () => {
        const mockUser = {
          id: 1,
          email: 'user@example.com',
          password_hash: '$argon2id$hashed',
          role: 'resident',
          verified: true
        };

        mockDbManager.query.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });
        mockAccountSecurity.isAccountLocked.mockReturnValue(false);
        mockPasswordService.verifyPassword.mockRejectedValueOnce(new Error('Verification error'));

        await loginUser(mockReq, mockRes);

        expect(mockLoggingService.logError).toHaveBeenCalledWith(
          'Password verification error during login',
          expect.any(Error),
          expect.any(Object)
        );

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Authentication system error'
          })
        );
      });

      test('should continue login if session initialization fails', async () => {
        const mockUser = {
          id: 1,
          email: 'user@example.com',
          password_hash: '$argon2id$hashed',
          role: 'resident',
          verified: true
        };

        mockDbManager.query.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });
        mockAccountSecurity.isAccountLocked.mockReturnValue(false);
        mockPasswordService.verifyPassword.mockResolvedValue(true);
        mockAccountSecurity.clearFailedAttempts.mockReturnValue(true);

        mockSessionSecurityService.initializeSession.mockRejectedValueOnce(
          new Error('Session init failed')
        );

        mockTokenService.generateTokens.mockReturnValue({
          accessToken: 'access_token_xyz',
          refreshToken: 'refresh_token_abc',
          tokenType: 'Bearer',
          expiresIn: 900,
          tokenId: 'token-id-123'
        });

        await loginUser(mockReq, mockRes);

        // Should log session error
        expect(mockLoggingService.logSecurity).toHaveBeenCalled();

        // But should still complete login
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            accessToken: 'access_token_xyz'
          })
        );
      });
    });
  });

  // =====================================================
  // TOKEN REFRESH TESTS
  // =====================================================

  describe('refreshToken()', () => {
    beforeEach(() => {
      mockReq.cookies.refreshToken = 'valid_refresh_token';
    });

    describe('Success Cases', () => {
      test('should refresh tokens successfully', async () => {
        mockTokenService.verifyRefreshToken.mockReturnValue({
          userId: 1,
          tokenId: 'old-token-id'
        });

        mockDbManager.query.mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: 'user@example.com',
            username: 'testuser',
            role: 'resident',
            verified: true,
            estate_id: 55
          }],
          rowCount: 1
        });

        mockTokenService.generateTokens.mockReturnValue({
          accessToken: 'new_access_token',
          refreshToken: 'new_refresh_token',
          tokenType: 'Bearer',
          expiresIn: 900,
          tokenId: 'new-token-id'
        });

        await refreshToken(mockReq, mockRes);

        // Verify token verification
        expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith('valid_refresh_token');

        // Verify new tokens generated
        expect(mockTokenService.generateTokens).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 1,
            email: 'user@example.com',
            role: 'resident',
            estate_id: 55
          })
        );

        // Verify new refresh token cookie set
        expect(mockRes.cookie).toHaveBeenCalledWith(
          'refreshToken',
          'new_refresh_token',
          expect.objectContaining({
            httpOnly: true,
            path: '/api/auth/refresh'
          })
        );

        // Verify audit logging
        expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
          'user.token.refresh',
          expect.objectContaining({
            oldTokenId: 'old-token-id',
            newTokenId: 'new-token-id'
          }),
          expect.any(Object)
        );

        // Verify response
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            accessToken: 'new_access_token'
          })
        );
      });
    });

    describe('Validation Errors', () => {
      test('should reject refresh without token', async () => {
        delete mockReq.cookies.refreshToken;

        await refreshToken(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Refresh token not provided',
            error: expect.objectContaining({
              code: 'REFRESH_TOKEN_MISSING'
            })
          })
        );
      });

      test('should reject invalid refresh token', async () => {
        mockTokenService.verifyRefreshToken.mockImplementation(() => {
          throw new Error('Invalid token');
        });

        await refreshToken(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Invalid or expired refresh token'
          })
        );
      });

      test('should reject refresh for non-existent user', async () => {
        mockTokenService.verifyRefreshToken.mockReturnValue({
          userId: 999,
          tokenId: 'token-id'
        });

        mockDbManager.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        await refreshToken(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'User not found'
          })
        );
      });
    });

    describe('Error Handling', () => {
      test('should handle database errors', async () => {
        mockTokenService.verifyRefreshToken.mockReturnValue({
          userId: 1,
          tokenId: 'token-id'
        });

        mockDbManager.query.mockRejectedValueOnce(new Error('Database error'));

        await refreshToken(mockReq, mockRes);

        expect(mockLoggingService.logError).toHaveBeenCalledWith(
          'Token refresh error',
          expect.any(Error),
          expect.any(Object)
        );

        expect(mockRes.status).toHaveBeenCalledWith(500);
      });
    });
  });

  // =====================================================
  // LOGOUT TESTS
  // =====================================================

  describe('logoutUser()', () => {
    beforeEach(() => {
      mockReq.cookies.refreshToken = 'refresh_token_abc';
      mockReq.headers['authorization'] = 'Bearer access_token_xyz';
      mockReq.user = {
        id: 1,
        email: 'user@example.com',
        role: 'resident'
      };
      mockReq.session = { destroy: jest.fn() };
      mockReq.sessionID = 'session-123';
    });

    describe('Success Cases', () => {
      test('should logout user successfully', async () => {
        mockSessionSecurityService.destroySession.mockResolvedValue(true);

        await logoutUser(mockReq, mockRes);

        // Verify session destroyed
        expect(mockSessionSecurityService.destroySession).toHaveBeenCalledWith(
          mockReq,
          'user_logout'
        );

        // Verify tokens revoked
        expect(mockTokenService.revokeToken).toHaveBeenCalledWith('refresh_token_abc');
        expect(mockTokenService.revokeToken).toHaveBeenCalledWith('access_token_xyz');

        // Verify cookie cleared
        expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken', {
          path: '/api/auth/refresh'
        });

        // Verify audit logging
        expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
          'user.logout',
          expect.objectContaining({
            hasRefreshToken: true,
            hasAccessToken: true,
            tokensRevoked: true,
            sessionDestroyed: true
          }),
          expect.any(Object)
        );

        // Verify response
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Logged out successfully'
          })
        );
      });

      test('should logout without refresh token', async () => {
        delete mockReq.cookies.refreshToken;

        mockSessionSecurityService.destroySession.mockResolvedValue(true);

        await logoutUser(mockReq, mockRes);

        // Should only revoke access token
        expect(mockTokenService.revokeToken).toHaveBeenCalledTimes(1);
        expect(mockTokenService.revokeToken).toHaveBeenCalledWith('access_token_xyz');

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true
          })
        );
      });

      test('should continue logout if session destruction fails', async () => {
        mockSessionSecurityService.destroySession.mockRejectedValueOnce(
          new Error('Session destruction failed')
        );

        await logoutUser(mockReq, mockRes);

        // Should log error
        expect(mockLoggingService.logSecurity).toHaveBeenCalled();

        // But should still complete logout
        expect(mockTokenService.revokeToken).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true
          })
        );
      });
    });

    describe('Error Handling', () => {
      test('should handle logout errors', async () => {
        mockSessionSecurityService.destroySession.mockRejectedValueOnce(
          new Error('Logout error')
        );
        mockTokenService.revokeToken.mockImplementation(() => {
          throw new Error('Token revocation error');
        });

        await logoutUser(mockReq, mockRes);

        expect(mockLoggingService.logError).toHaveBeenCalledWith(
          'Logout error',
          expect.any(Error),
          expect.any(Object)
        );

        expect(mockRes.status).toHaveBeenCalledWith(500);
      });
    });
  });

  // =====================================================
  // UPDATE PROFILE TESTS
  // =====================================================

  describe('updateProfile()', () => {
    beforeEach(() => {
      mockReq.body = {
        email: 'user@example.com',
        first_name: 'Updated',
        last_name: 'Name',
        phone: '+9876543210',
        profilePic: 'https://example.com/pic.jpg',
        notify_email: true,
        notify_sms: true
      };
      mockReq.user = { id: 1, estate_id: 12 };
    });

    describe('Success Cases', () => {
      test('should update user profile successfully', async () => {
        const existingUser = {
          id: 1,
          email: 'user@example.com',
          role: 'resident',
          first_name: 'Old',
          last_name: 'Name',
          phone: '+1234567890',
          profile_pic: null,
          notify_email: false,
          notify_sms: false,
          created_at: new Date()
        };

        const updatedUser = {
          ...existingUser,
          first_name: 'Updated',
          last_name: 'Name',
          phone: '+9876543210',
          profile_pic: 'https://example.com/pic.jpg',
          notify_email: true,
          notify_sms: true
        };

        mockDbManager.query
          .mockResolvedValueOnce({ rows: [existingUser], rowCount: 1 }) // SELECT existing
          .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE
          .mockResolvedValueOnce({ rows: [updatedUser], rowCount: 1 }); // SELECT updated

        await updateProfile(mockReq, mockRes);

        // Verify database queries
        expect(mockDbManager.query).toHaveBeenCalledTimes(3);

        // Verify UPDATE query
        const updateCall = mockDbManager.query.mock.calls[1];
        expect(updateCall[0]).toContain('UPDATE users SET');
        expect(updateCall[1]).toContain('Updated');
        expect(updateCall[1]).toContain('Name');
        expect(updateCall[1]).toContain('+9876543210');

        // Verify response
        expect(mockResponseUtil.updated).toHaveBeenCalledWith(
          mockRes,
          expect.objectContaining({
            first_name: 'Updated',
            phone: '+9876543210'
          }),
          'Profile updated successfully'
        );
      });

      test('should allow disabling both notification methods', async () => {
        mockReq.body.notify_email = false;
        mockReq.body.notify_sms = false;

        const existingUser = {
          id: 1,
          email: 'user@example.com',
          role: 'resident',
          notify_email: true,
          notify_sms: true,
          created_at: new Date()
        };

        mockDbManager.query
          .mockResolvedValueOnce({ rows: [existingUser], rowCount: 1 })
          .mockResolvedValueOnce({ rowCount: 1 })
          .mockResolvedValueOnce({ rows: [{ ...existingUser, notify_email: false, notify_sms: false }], rowCount: 1 });

        // Should not throw
        await updateProfile(mockReq, mockRes);

        expect(mockResponseUtil.updated).toHaveBeenCalled();
      });
    });

    describe('Validation Errors', () => {
      test('should reject update without email', async () => {
        delete mockReq.body.email;

        mockErrorHelper.requiredField.mockImplementation(() => {
          throw new Error('email is required');
        });

        await expect(updateProfile(mockReq, mockRes)).rejects.toThrow();
      });

      test('should reject update for non-existent user', async () => {
        mockDbManager.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        mockErrorHelper.notFound.mockImplementation(() => {
          throw new Error('User not found');
        });

        await expect(updateProfile(mockReq, mockRes)).rejects.toThrow();
      });
    });
  });
});
