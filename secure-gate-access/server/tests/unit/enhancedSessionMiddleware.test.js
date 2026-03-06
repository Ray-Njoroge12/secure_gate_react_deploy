/**
 * Unit Tests for Enhanced Session Middleware
 * 
 * Tests for session security, initialization, and management including:
 * - Session initialization (Redis and memory fallback)
 * - Session security validation
 * - Concurrent session management
 * - Privilege escalation protection
 * - Public endpoint handling
 * - Session invalidation
 * 
 * Priority: P0 (Critical Security Component)
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies before imports
const mockSessionSecurityService = {
  setRedisService: jest.fn(),
  validateSession: jest.fn(),
  regenerateSession: jest.fn(),
  initializeSession: jest.fn(),
  getUserActiveSessions: jest.fn(),
  terminateUserSession: jest.fn(),
  destroySession: jest.fn()
};

const mockLoggingService = {
  logSecurity: jest.fn()
};

const mockSession = jest.fn();
mockSession.MemoryStore = jest.fn(() => mockMemoryStore);
const mockRedisStore = jest.fn();
const mockMemoryStore = jest.fn();
const mockCryptoRandomBytes = jest.fn();

jest.unstable_mockModule('express-session', () => ({
  default: mockSession
}));

jest.unstable_mockModule('connect-redis', () => ({
  RedisStore: mockRedisStore
}));


jest.unstable_mockModule('crypto', () => ({
  randomBytes: mockCryptoRandomBytes,
  default: {
    randomBytes: mockCryptoRandomBytes
  }
}));

jest.unstable_mockModule('../../src/services/sessionSecurityService.js', () => ({
  default: mockSessionSecurityService
}));

jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  default: mockLoggingService
}));

// Import after mocking
const enhancedSessionMiddlewareModule = await import('../../src/middleware/enhancedSessionMiddleware.js');
const enhancedSessionManager = enhancedSessionMiddlewareModule.default;

describe('Enhanced Session Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  // Test user data
  const testUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'resident'
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset session manager state
    enhancedSessionManager.sessionStore = null;
    enhancedSessionManager.sessionConfig = null;
    enhancedSessionManager.redisService = null;

    // Create mock request
    mockReq = {
      path: '/api/protected',
      method: 'GET',
      sessionID: 'session-abc123',
      session: {
        sessionSecurity: {
          userId: testUser.id,
          userRole: testUser.role
        }
      },
      user: testUser,
      correlationId: 'corr-123'
    };

    // Create mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn()
    };

    // Create mock next function
    mockNext = jest.fn();

    // Default mock implementations
    mockSession.mockReturnValue('session-middleware');
    mockCryptoRandomBytes.mockReturnValue({
      toString: jest.fn().mockReturnValue('random-bytes-hex')
    });

    // Default session security service mocks
    mockSessionSecurityService.validateSession.mockResolvedValue({
      valid: true,
      sessionData: { userId: testUser.id },
      warningNeeded: false
    });
    mockSessionSecurityService.regenerateSession.mockResolvedValue();
    mockSessionSecurityService.initializeSession.mockResolvedValue();
    mockSessionSecurityService.getUserActiveSessions.mockResolvedValue([]);
    mockSessionSecurityService.terminateUserSession.mockResolvedValue();
    mockSessionSecurityService.destroySession.mockResolvedValue();

    // Set environment variables
    process.env.SESSION_SECRET = 'test-secret-key';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET_BACKUP;
    delete process.env.SESSION_NAME;
    delete process.env.SESSION_TIMEOUT_MS;
    delete process.env.SESSION_DOMAIN;
  });

  // =========================================
  // setRedisService Tests
  // =========================================
  describe('setRedisService', () => {
    it('should set redis service on session manager', () => {
      const mockRedisService = { client: {}, isConnected: true };

      enhancedSessionManager.setRedisService(mockRedisService);

      expect(enhancedSessionManager.redisService).toBe(mockRedisService);
      expect(mockSessionSecurityService.setRedisService).toHaveBeenCalledWith(mockRedisService);
    });
  });

  // =========================================
  // getSessionSecrets Tests
  // =========================================
  describe('getSessionSecrets', () => {
    it('should return primary secret when no backup is set', () => {
      process.env.SESSION_SECRET = 'primary-secret';
      delete process.env.SESSION_SECRET_BACKUP;

      const result = enhancedSessionManager.getSessionSecrets();

      expect(result).toBe('primary-secret');
    });

    it('should return array of secrets when backup is set', () => {
      process.env.SESSION_SECRET = 'primary-secret';
      process.env.SESSION_SECRET_BACKUP = 'backup-secret';

      const result = enhancedSessionManager.getSessionSecrets();

      expect(result).toEqual(['primary-secret', 'backup-secret']);
    });

    it('should throw error when SESSION_SECRET is not set', () => {
      delete process.env.SESSION_SECRET;

      expect(() => enhancedSessionManager.getSessionSecrets()).toThrow(
        'SESSION_SECRET environment variable is required'
      );
    });
  });

  // =========================================
  // initialize Tests
  // =========================================
  describe('initialize', () => {
    it('should initialize with Redis store when Redis is connected', async () => {
      const mockRedis = {
        client: {},
        isConnected: true,
        usingFallback: false
      };
      enhancedSessionManager.setRedisService(mockRedis);

      await enhancedSessionManager.initialize();

      expect(mockRedisStore).toHaveBeenCalledWith(
        expect.objectContaining({
          client: mockRedis.client,
          prefix: 'session:',
          ttl: 7200
        })
      );
      expect(mockLoggingService.logSecurity).toHaveBeenCalledWith(
        'Enhanced session store initialized with Redis backend',
        {}
      );
    });

    it('should initialize with memory store when Redis is not connected', async () => {
      enhancedSessionManager.redisService = null;

      await enhancedSessionManager.initialize();

      expect(mockLoggingService.logSecurity).toHaveBeenCalledWith(
        'Enhanced session store initialized with memory fallback',
        {}
      );
    });

    it('should initialize with memory store when Redis is using fallback', async () => {
      const mockRedis = {
        client: {},
        isConnected: true,
        usingFallback: true
      };
      enhancedSessionManager.setRedisService(mockRedis);

      await enhancedSessionManager.initialize();

      expect(mockLoggingService.logSecurity).toHaveBeenCalledWith(
        'Enhanced session store initialized with memory fallback',
        {}
      );
    });

    it('should configure session with correct cookie settings in production', async () => {
      process.env.NODE_ENV = 'production';

      await enhancedSessionManager.initialize();

      expect(enhancedSessionManager.sessionConfig.cookie.secure).toBe(true);
      expect(enhancedSessionManager.sessionConfig.cookie.httpOnly).toBe(true);
      expect(enhancedSessionManager.sessionConfig.cookie.sameSite).toBe('strict');
    });

    it('should configure session with non-secure cookie in development', async () => {
      process.env.NODE_ENV = 'development';

      await enhancedSessionManager.initialize();

      expect(enhancedSessionManager.sessionConfig.cookie.secure).toBe(false);
    });

    it('should use custom session name if provided', async () => {
      process.env.SESSION_NAME = 'custom-session';

      await enhancedSessionManager.initialize();

      expect(enhancedSessionManager.sessionConfig.name).toBe('custom-session');
    });

    it('should use custom session timeout if provided', async () => {
      process.env.SESSION_TIMEOUT_MS = '3600000';

      await enhancedSessionManager.initialize();

      expect(enhancedSessionManager.sessionConfig.cookie.maxAge).toBe(3600000);
    });

    it('should generate cryptographically secure session IDs', async () => {
      await enhancedSessionManager.initialize();

      const genid = enhancedSessionManager.sessionConfig.genid;
      const sessionId = genid();

      expect(sessionId).toContain('-');
      expect(mockCryptoRandomBytes).toHaveBeenCalled();
    });

    it('should log and throw error on initialization failure', async () => {
      mockSession.mockImplementation(() => {
        throw new Error('Session init failed');
      });

      await expect(enhancedSessionManager.initialize()).rejects.toThrow('Session init failed');
      expect(mockLoggingService.logSecurity).toHaveBeenCalledWith(
        'Enhanced session initialization failed',
        { error: 'Session init failed' }
      );
    });
  });

  // =========================================
  // isPublicEndpoint Tests
  // =========================================
  describe('isPublicEndpoint', () => {
    it('should identify health endpoint as public', () => {
      expect(enhancedSessionManager.isPublicEndpoint('/health')).toBe(true);
    });

    it('should identify login endpoint as public', () => {
      expect(enhancedSessionManager.isPublicEndpoint('/api/auth/login')).toBe(true);
    });

    it('should identify register endpoint as public', () => {
      expect(enhancedSessionManager.isPublicEndpoint('/api/auth/register')).toBe(true);
    });

    it('should identify refresh endpoint as public', () => {
      expect(enhancedSessionManager.isPublicEndpoint('/api/auth/refresh')).toBe(true);
    });

    it('should identify forgot-password endpoint as public', () => {
      expect(enhancedSessionManager.isPublicEndpoint('/api/auth/forgot-password')).toBe(true);
    });

    it('should identify reset-password endpoint as public', () => {
      expect(enhancedSessionManager.isPublicEndpoint('/api/auth/reset-password')).toBe(true);
    });

    it('should identify static paths as public', () => {
      expect(enhancedSessionManager.isPublicEndpoint('/static/js/main.js')).toBe(true);
    });

    it('should identify favicon as public', () => {
      expect(enhancedSessionManager.isPublicEndpoint('/favicon.ico')).toBe(true);
    });

    it('should identify protected endpoints as non-public', () => {
      expect(enhancedSessionManager.isPublicEndpoint('/api/users/profile')).toBe(false);
      expect(enhancedSessionManager.isPublicEndpoint('/api/visitors/list')).toBe(false);
      expect(enhancedSessionManager.isPublicEndpoint('/api/admin/settings')).toBe(false);
    });
  });

  // =========================================
  // requiresPrivilegeElevation Tests
  // =========================================
  describe('requiresPrivilegeElevation', () => {
    it('should require elevation for admin paths', () => {
      expect(enhancedSessionManager.requiresPrivilegeElevation({ path: '/api/admin/users' })).toBe(true);
    });

    it('should require elevation for user admin paths', () => {
      expect(enhancedSessionManager.requiresPrivilegeElevation({ path: '/api/users/admin' })).toBe(true);
    });

    it('should require elevation for security settings', () => {
      expect(enhancedSessionManager.requiresPrivilegeElevation({ path: '/api/settings/security' })).toBe(true);
    });

    it('should require elevation for monitoring admin', () => {
      expect(enhancedSessionManager.requiresPrivilegeElevation({ path: '/api/monitoring/admin' })).toBe(true);
    });

    it('should require elevation for logs admin', () => {
      expect(enhancedSessionManager.requiresPrivilegeElevation({ path: '/api/logs/admin' })).toBe(true);
    });

    it('should not require elevation for regular paths', () => {
      expect(enhancedSessionManager.requiresPrivilegeElevation({ path: '/api/visitors' })).toBe(false);
      expect(enhancedSessionManager.requiresPrivilegeElevation({ path: '/api/users/profile' })).toBe(false);
    });
  });

  // =========================================
  // hasRequiredPrivileges Tests
  // =========================================
  describe('hasRequiredPrivileges', () => {
    it('should grant superadmin access to all paths', () => {
      expect(enhancedSessionManager.hasRequiredPrivileges('superadmin', '/api/admin', 'GET')).toBe(true);
      expect(enhancedSessionManager.hasRequiredPrivileges('superadmin', '/api/settings/security', 'POST')).toBe(true);
    });

    it('should grant admin access to admin paths', () => {
      expect(enhancedSessionManager.hasRequiredPrivileges('admin', '/api/admin/users', 'GET')).toBe(true);
      expect(enhancedSessionManager.hasRequiredPrivileges('admin', '/api/settings/security', 'POST')).toBe(true);
    });

    it('should deny guard access to admin paths', () => {
      expect(enhancedSessionManager.hasRequiredPrivileges('guard', '/api/admin', 'GET')).toBe(false);
      expect(enhancedSessionManager.hasRequiredPrivileges('guard', '/api/settings/security', 'POST')).toBe(false);
    });

    it('should deny resident access to admin paths', () => {
      expect(enhancedSessionManager.hasRequiredPrivileges('resident', '/api/admin', 'GET')).toBe(false);
    });

    it('should deny guest access to admin paths', () => {
      expect(enhancedSessionManager.hasRequiredPrivileges('guest', '/api/admin', 'GET')).toBe(false);
    });

    it('should allow access to unprotected paths', () => {
      expect(enhancedSessionManager.hasRequiredPrivileges('guest', '/api/visitors', 'GET')).toBe(true);
      expect(enhancedSessionManager.hasRequiredPrivileges('resident', '/api/profile', 'GET')).toBe(true);
    });
  });

  // =========================================
  // sessionSecurityMiddleware Tests
  // =========================================
  describe('sessionSecurityMiddleware', () => {
    let middleware;

    beforeEach(() => {
      middleware = enhancedSessionManager.sessionSecurityMiddleware();
    });

    it('should skip validation for public endpoints', async () => {
      mockReq.path = '/api/auth/login';

      await middleware(mockReq, mockRes, mockNext);

      expect(mockSessionSecurityService.validateSession).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should validate session for protected endpoints', async () => {
      mockReq.path = '/api/protected';

      await middleware(mockReq, mockRes, mockNext);

      expect(mockSessionSecurityService.validateSession).toHaveBeenCalledWith(mockReq);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle invalid session', async () => {
      mockSessionSecurityService.validateSession.mockResolvedValue({
        valid: false,
        reason: 'session_timeout'
      });

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Session expired',
          requiresReauth: true
        })
      );
    });

    it('should set warning headers when warning needed', async () => {
      mockSessionSecurityService.validateSession.mockResolvedValue({
        valid: true,
        sessionData: { userId: testUser.id },
        warningNeeded: true,
        timeUntilExpiry: 300
      });

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith('X-Session-Warning', 'true');
      expect(mockRes.set).toHaveBeenCalledWith('X-Session-Time-Remaining', '300');
    });

    it('should update session data on valid session', async () => {
      const sessionData = { userId: testUser.id, lastActivity: Date.now() };
      mockSessionSecurityService.validateSession.mockResolvedValue({
        valid: true,
        sessionData,
        warningNeeded: false
      });

      await middleware(mockReq, mockRes, mockNext);

      expect(mockReq.session.sessionSecurity).toBe(sessionData);
    });

    it('should skip validation when no session exists', async () => {
      delete mockReq.sessionID;
      delete mockReq.session;

      await middleware(mockReq, mockRes, mockNext);

      expect(mockSessionSecurityService.validateSession).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle errors gracefully and continue', async () => {
      mockSessionSecurityService.validateSession.mockRejectedValue(new Error('Validation error'));

      await middleware(mockReq, mockRes, mockNext);

      expect(mockLoggingService.logSecurity).toHaveBeenCalledWith(
        'Session security middleware error',
        expect.objectContaining({
          error: 'Validation error',
          path: '/api/protected'
        })
      );
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  // =========================================
  // loginSessionMiddleware Tests
  // =========================================
  describe('loginSessionMiddleware', () => {
    let middleware;

    beforeEach(() => {
      middleware = enhancedSessionManager.loginSessionMiddleware();
    });

    it('should skip for unauthenticated users', async () => {
      delete mockReq.user;

      await middleware(mockReq, mockRes, mockNext);

      expect(mockSessionSecurityService.regenerateSession).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should skip if session already initialized for user', async () => {
      mockReq.session.sessionSecurity.userId = testUser.id;

      await middleware(mockReq, mockRes, mockNext);

      expect(mockSessionSecurityService.regenerateSession).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should regenerate session and initialize for new login', async () => {
      mockReq.session.sessionSecurity.userId = 'different-user';

      await middleware(mockReq, mockRes, mockNext);

      expect(mockSessionSecurityService.regenerateSession).toHaveBeenCalledWith(mockReq, 'login');
      expect(mockSessionSecurityService.initializeSession).toHaveBeenCalledWith(mockReq, testUser);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle timeout during session operations', async () => {
      mockSessionSecurityService.regenerateSession.mockImplementation(() =>
        new Promise((resolve) => setTimeout(resolve, 10000))
      );

      // Should not hang - timeout protection should kick in
      const startTime = Date.now();
      await middleware(mockReq, mockRes, mockNext);
      const duration = Date.now() - startTime;

      // Should complete within reasonable time (timeout + buffer)
      expect(duration).toBeLessThan(6000);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle errors and continue', async () => {
      mockSessionSecurityService.regenerateSession.mockRejectedValue(new Error('Regen failed'));
      mockReq.session.sessionSecurity.userId = 'different-user';

      await middleware(mockReq, mockRes, mockNext);

      expect(mockLoggingService.logSecurity).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  // =========================================
  // concurrentSessionMiddleware Tests
  // =========================================
  describe('concurrentSessionMiddleware', () => {
    let middleware;

    beforeEach(() => {
      middleware = enhancedSessionManager.concurrentSessionMiddleware(3);
    });

    it('should skip for unauthenticated users', async () => {
      delete mockReq.user;

      await middleware(mockReq, mockRes, mockNext);

      expect(mockSessionSecurityService.getUserActiveSessions).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should skip when no session ID', async () => {
      delete mockReq.sessionID;

      await middleware(mockReq, mockRes, mockNext);

      expect(mockSessionSecurityService.getUserActiveSessions).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow when under session limit', async () => {
      mockSessionSecurityService.getUserActiveSessions.mockResolvedValue([
        { sessionId: 'session-1', lastActivity: new Date() }
      ]);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockSessionSecurityService.terminateUserSession).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should terminate oldest session when limit exceeded', async () => {
      const oldSession = { sessionId: 'old-session', lastActivity: new Date('2024-01-01') };
      const newSession1 = { sessionId: 'new-session-1', lastActivity: new Date('2024-06-01') };
      const newSession2 = { sessionId: 'new-session-2', lastActivity: new Date('2024-06-02') };

      mockSessionSecurityService.getUserActiveSessions.mockResolvedValue([
        oldSession,
        newSession1,
        newSession2
      ]);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockSessionSecurityService.terminateUserSession).toHaveBeenCalledWith(
        testUser.id,
        testUser.id,
        'old-session',
        'concurrent_limit_exceeded'
      );
    });

    it('should not terminate current session even if oldest', async () => {
      const currentSession = { sessionId: 'session-abc123', lastActivity: new Date('2024-01-01') };
      const otherSession1 = { sessionId: 'other-session-1', lastActivity: new Date('2024-06-01') };
      const otherSession2 = { sessionId: 'other-session-2', lastActivity: new Date('2024-06-02') };

      mockSessionSecurityService.getUserActiveSessions.mockResolvedValue([
        currentSession,
        otherSession1,
        otherSession2
      ]);

      await middleware(mockReq, mockRes, mockNext);

      // Should not terminate because oldest is current session
      expect(mockSessionSecurityService.terminateUserSession).not.toHaveBeenCalled();
    });

    it('should handle errors and continue', async () => {
      mockSessionSecurityService.getUserActiveSessions.mockRejectedValue(new Error('DB error'));

      await middleware(mockReq, mockRes, mockNext);

      expect(mockLoggingService.logSecurity).toHaveBeenCalledWith(
        'Concurrent session middleware error',
        expect.objectContaining({
          error: 'DB error'
        })
      );
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  // =========================================
  // privilegeEscalationMiddleware Tests
  // =========================================
  describe('privilegeEscalationMiddleware', () => {
    let middleware;

    beforeEach(() => {
      middleware = enhancedSessionManager.privilegeEscalationMiddleware();
    });

    it('should skip when no session data', async () => {
      delete mockReq.session;

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should skip for non-privileged paths', async () => {
      mockReq.path = '/api/visitors';

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow admin access to admin paths', async () => {
      mockReq.path = '/api/admin/users';
      mockReq.user.role = 'admin';
      mockReq.session.sessionSecurity.userRole = 'admin';

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny non-admin access to admin paths', async () => {
      mockReq.path = '/api/admin/users';
      mockReq.user.role = 'resident';
      mockReq.session.sessionSecurity.userRole = 'resident';

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Insufficient privileges for this operation'
      }));
    });

    it('should regenerate session on privilege verification', async () => {
      mockReq.path = '/api/admin/users';
      mockReq.user.role = 'admin';
      mockReq.session.sessionSecurity.userRole = 'admin';
      mockReq.session.sessionSecurity.privilegeLevel = 'resident'; // Different level

      await middleware(mockReq, mockRes, mockNext);

      expect(mockSessionSecurityService.regenerateSession).toHaveBeenCalledWith(mockReq, 'privilege_verification');
    });

    it('should log insufficient privileges', async () => {
      mockReq.path = '/api/admin/users';
      mockReq.method = 'POST';
      mockReq.user.role = 'guard';
      mockReq.session.sessionSecurity.userRole = 'guard';

      await middleware(mockReq, mockRes, mockNext);

      expect(mockLoggingService.logSecurity).toHaveBeenCalledWith(
        'Insufficient privileges for operation',
        expect.objectContaining({
          userId: testUser.id,
          userRole: 'guard',
          path: '/api/admin/users',
          method: 'POST'
        })
      );
    });

    it('should handle errors and return 500', async () => {
      mockReq.path = '/api/admin/users';
      mockReq.user.role = 'admin';
      mockReq.session.sessionSecurity.userRole = 'admin';
      mockReq.session.sessionSecurity.privilegeLevel = 'resident';
      mockSessionSecurityService.regenerateSession.mockRejectedValue(new Error('Regen failed'));

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Privilege validation error'
      });
    });
  });

  // =========================================
  // handleInvalidSession Tests
  // =========================================
  describe('handleInvalidSession', () => {
    it('should return 401 for session_timeout', async () => {
      await enhancedSessionManager.handleInvalidSession(mockReq, mockRes, 'session_timeout');

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Session expired',
          reason: 'session_timeout',
          requiresReauth: true
        })
      );
    });

    it('should return 403 for fingerprint_mismatch', async () => {
      await enhancedSessionManager.handleInvalidSession(mockReq, mockRes, 'fingerprint_mismatch');

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Session security violation detected',
          reason: 'fingerprint_mismatch'
        })
      );
    });

    it('should return 401 for no_session', async () => {
      await enhancedSessionManager.handleInvalidSession(mockReq, mockRes, 'no_session');

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No active session'
        })
      );
    });

    it('should return 401 for unknown reason', async () => {
      await enhancedSessionManager.handleInvalidSession(mockReq, mockRes, 'unknown_reason');

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Session validation failed'
        })
      );
    });

    it('should destroy invalid session', async () => {
      await enhancedSessionManager.handleInvalidSession(mockReq, mockRes, 'session_timeout');

      expect(mockSessionSecurityService.destroySession).toHaveBeenCalledWith(
        mockReq,
        'invalid_session_session_timeout'
      );
    });

    it('should log invalid session handling', async () => {
      await enhancedSessionManager.handleInvalidSession(mockReq, mockRes, 'session_timeout');

      expect(mockLoggingService.logSecurity).toHaveBeenCalledWith(
        'Invalid session handled',
        expect.objectContaining({
          sessionId: 'session-abc123',
          userId: testUser.id,
          reason: 'session_timeout'
        })
      );
    });

    it('should handle errors during session destruction', async () => {
      mockSessionSecurityService.destroySession.mockRejectedValue(new Error('Destroy failed'));

      await enhancedSessionManager.handleInvalidSession(mockReq, mockRes, 'session_timeout');

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Session handling error'
      });
    });
  });

  // =========================================
  // Integration Scenarios
  // =========================================
  describe('Integration Scenarios', () => {
    it('should handle complete session lifecycle for new login', async () => {
      // User not logged in, then logs in
      mockReq.session.sessionSecurity = {};
      mockReq.user = testUser;

      const loginMiddleware = enhancedSessionManager.loginSessionMiddleware();
      await loginMiddleware(mockReq, mockRes, mockNext);

      expect(mockSessionSecurityService.regenerateSession).toHaveBeenCalledWith(mockReq, 'login');
      expect(mockSessionSecurityService.initializeSession).toHaveBeenCalledWith(mockReq, testUser);
    });

    it('should enforce concurrent session limits during active use', async () => {
      // User has max sessions
      const sessions = [
        { sessionId: 'session-1', lastActivity: new Date('2024-01-01') },
        { sessionId: 'session-2', lastActivity: new Date('2024-06-01') },
        { sessionId: 'session-3', lastActivity: new Date('2024-06-02') }
      ];
      mockSessionSecurityService.getUserActiveSessions.mockResolvedValue(sessions);

      const concurrentMiddleware = enhancedSessionManager.concurrentSessionMiddleware(3);
      await concurrentMiddleware(mockReq, mockRes, mockNext);

      expect(mockSessionSecurityService.terminateUserSession).toHaveBeenCalledWith(
        testUser.id,
        testUser.id,
        'session-1',
        'concurrent_limit_exceeded'
      );
    });

    it('should block privilege escalation attempts', async () => {
      mockReq.path = '/api/admin/settings';
      mockReq.user.role = 'resident';
      mockReq.session.sessionSecurity.userRole = 'resident';

      const privilegeMiddleware = enhancedSessionManager.privilegeEscalationMiddleware();
      await privilegeMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockLoggingService.logSecurity).toHaveBeenCalledWith(
        'Insufficient privileges for operation',
        expect.any(Object)
      );
    });
  });
});
