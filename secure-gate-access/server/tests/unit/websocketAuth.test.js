/**
 * Unit Tests for WebSocket Authentication Middleware
 * 
 * Tests for WebSocket authentication, authorization, and rate limiting including:
 * - Socket authentication via JWT token
 * - Room-based authorization
 * - Connection rate limiting
 * - Socket event auditing
 * 
 * Priority: P0 (Critical Security Component)
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies before imports
const mockVerifyAccessToken = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({
  tokenService: {
    verifyAccessToken: mockVerifyAccessToken
  }
}));

jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: jest.fn()
  }
}));

// Import after mocking
const websocketAuthModule = await import('../../src/middleware/websocketAuth.js');
const { 
  authenticateSocket, 
  authorizeRoom, 
  SocketRateLimiter,
  socketRateLimiter,
  rateLimitSocket,
  auditSocketConnection 
} = websocketAuthModule;

describe('WebSocket Authentication Middleware', () => {
  let mockSocket;
  let mockNext;

  // Test user data
  const testDecodedToken = {
    userId: 'user-123',
    role: 'user',  // 'user' role has dashboard access
    email: 'test@example.com'
  };

  const validToken = 'valid-jwt-token';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock socket
    mockSocket = {
      id: 'socket-abc123',
      handshake: {
        auth: {},
        headers: {},
        address: '192.168.1.100'
      },
      on: jest.fn()
    };

    // Create mock next function
    mockNext = jest.fn();

    // Default mock implementations
    mockVerifyAccessToken.mockResolvedValue(testDecodedToken);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =========================================
  // authenticateSocket Tests
  // =========================================
  describe('authenticateSocket', () => {
    describe('Token Extraction', () => {
      it('should extract token from socket.handshake.auth.token', async () => {
        mockSocket.handshake.auth.token = validToken;

        await authenticateSocket(mockSocket, mockNext);

        expect(mockVerifyAccessToken).toHaveBeenCalledWith(validToken);
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should extract token from Authorization header', async () => {
        mockSocket.handshake.headers.authorization = `Bearer ${validToken}`;

        await authenticateSocket(mockSocket, mockNext);

        expect(mockVerifyAccessToken).toHaveBeenCalledWith(validToken);
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should prefer auth.token over Authorization header', async () => {
        mockSocket.handshake.auth.token = 'auth-token';
        mockSocket.handshake.headers.authorization = 'Bearer header-token';

        await authenticateSocket(mockSocket, mockNext);

        expect(mockVerifyAccessToken).toHaveBeenCalledWith('auth-token');
      });

      it('should reject connection without token', async () => {
        await authenticateSocket(mockSocket, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        expect(mockNext.mock.calls[0][0].message).toBe('Authentication required');
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'WebSocket connection attempt without token',
          expect.objectContaining({
            socketId: 'socket-abc123',
            ip: '192.168.1.100'
          })
        );
      });
    });

    describe('Token Verification', () => {
      it('should attach user info to socket on successful authentication', async () => {
        mockSocket.handshake.auth.token = validToken;

        await authenticateSocket(mockSocket, mockNext);

        expect(mockSocket.userId).toBe('user-123');
        expect(mockSocket.userRole).toBe('user');
        expect(mockSocket.userEmail).toBe('test@example.com');
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should log successful authentication', async () => {
        mockSocket.handshake.auth.token = validToken;

        await authenticateSocket(mockSocket, mockNext);

        expect(mockLoggerInfo).toHaveBeenCalledWith(
          'WebSocket connection authenticated',
          expect.objectContaining({
            socketId: 'socket-abc123',
            userId: 'user-123',
            role: 'user',
            ip: '192.168.1.100'
          })
        );
      });

      it('should handle expired token error', async () => {
        mockSocket.handshake.auth.token = validToken;
        mockVerifyAccessToken.mockRejectedValue(new Error('Token expired'));

        await authenticateSocket(mockSocket, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        expect(mockNext.mock.calls[0][0].message).toBe('Token expired');
      });

      it('should handle invalid token error', async () => {
        mockSocket.handshake.auth.token = validToken;
        mockVerifyAccessToken.mockRejectedValue(new Error('Invalid token signature'));

        await authenticateSocket(mockSocket, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        expect(mockNext.mock.calls[0][0].message).toBe('Invalid token');
      });

      it('should handle generic authentication error', async () => {
        mockSocket.handshake.auth.token = validToken;
        mockVerifyAccessToken.mockRejectedValue(new Error('Some other error'));

        await authenticateSocket(mockSocket, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        expect(mockNext.mock.calls[0][0].message).toBe('Authentication failed');
      });

      it('should log failed authentication attempts', async () => {
        mockSocket.handshake.auth.token = validToken;
        mockVerifyAccessToken.mockRejectedValue(new Error('Verification failed'));

        await authenticateSocket(mockSocket, mockNext);

        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'WebSocket authentication failed',
          expect.objectContaining({
            socketId: 'socket-abc123',
            error: 'Verification failed',
            ip: '192.168.1.100'
          })
        );
      });
    });
  });

  // =========================================
  // authorizeRoom Tests
  // =========================================
  describe('authorizeRoom', () => {
    beforeEach(() => {
      mockSocket.userId = 'user-123';
    });

    describe('Dashboard Room Access', () => {
      it('should allow admin to access dashboard', () => {
        mockSocket.userRole = 'admin';
        expect(authorizeRoom(mockSocket, 'dashboard')).toBe(true);
      });

      it('should allow guard to access dashboard', () => {
        mockSocket.userRole = 'guard';
        expect(authorizeRoom(mockSocket, 'dashboard')).toBe(true);
      });

      it('should allow user to access dashboard', () => {
        mockSocket.userRole = 'user';
        expect(authorizeRoom(mockSocket, 'dashboard')).toBe(true);
      });

      it('should deny visitor from dashboard', () => {
        mockSocket.userRole = 'visitor';
        expect(authorizeRoom(mockSocket, 'dashboard')).toBe(false);
      });
    });

    describe('Admin Room Access', () => {
      it('should allow admin to access admin room', () => {
        mockSocket.userRole = 'admin';
        expect(authorizeRoom(mockSocket, 'admin')).toBe(true);
      });

      it('should deny guard from admin room', () => {
        mockSocket.userRole = 'guard';
        expect(authorizeRoom(mockSocket, 'admin')).toBe(false);
      });

      it('should deny user from admin room', () => {
        mockSocket.userRole = 'user';
        expect(authorizeRoom(mockSocket, 'admin')).toBe(false);
      });
    });

    describe('Guards Room Access', () => {
      it('should allow admin to access guards room', () => {
        mockSocket.userRole = 'admin';
        expect(authorizeRoom(mockSocket, 'guards')).toBe(true);
      });

      it('should allow guard to access guards room', () => {
        mockSocket.userRole = 'guard';
        expect(authorizeRoom(mockSocket, 'guards')).toBe(true);
      });

      it('should deny user from guards room', () => {
        mockSocket.userRole = 'user';
        expect(authorizeRoom(mockSocket, 'guards')).toBe(false);
      });
    });

    describe('Visitors Room Access', () => {
      it('should allow admin to access visitors room', () => {
        mockSocket.userRole = 'admin';
        expect(authorizeRoom(mockSocket, 'visitors')).toBe(true);
      });

      it('should allow guard to access visitors room', () => {
        mockSocket.userRole = 'guard';
        expect(authorizeRoom(mockSocket, 'visitors')).toBe(true);
      });

      it('should allow visitor to access visitors room', () => {
        mockSocket.userRole = 'visitor';
        expect(authorizeRoom(mockSocket, 'visitors')).toBe(true);
      });

      it('should deny user from visitors room', () => {
        mockSocket.userRole = 'user';
        expect(authorizeRoom(mockSocket, 'visitors')).toBe(false);
      });
    });

    describe('System Room Access', () => {
      it('should allow admin to access system room', () => {
        mockSocket.userRole = 'admin';
        expect(authorizeRoom(mockSocket, 'system')).toBe(true);
      });

      it('should deny guard from system room', () => {
        mockSocket.userRole = 'guard';
        expect(authorizeRoom(mockSocket, 'system')).toBe(false);
      });

      it('should deny user from system room', () => {
        mockSocket.userRole = 'user';
        expect(authorizeRoom(mockSocket, 'system')).toBe(false);
      });
    });

    describe('Unknown Room Access', () => {
      it('should deny access to unknown rooms', () => {
        mockSocket.userRole = 'admin';
        expect(authorizeRoom(mockSocket, 'unknown-room')).toBe(false);
      });
    });

    describe('Logging', () => {
      it('should log authorized room access', () => {
        mockSocket.userRole = 'admin';
        authorizeRoom(mockSocket, 'admin');

        expect(mockLoggerInfo).toHaveBeenCalledWith(
          'Room access authorized',
          expect.objectContaining({
            socketId: 'socket-abc123',
            userId: 'user-123',
            userRole: 'admin',
            room: 'admin'
          })
        );
      });

      it('should log unauthorized room access attempts', () => {
        mockSocket.userRole = 'user';
        authorizeRoom(mockSocket, 'admin');

        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'Unauthorized room access attempt',
          expect.objectContaining({
            socketId: 'socket-abc123',
            userId: 'user-123',
            userRole: 'user',
            attemptedRoom: 'admin'
          })
        );
      });
    });
  });

  // =========================================
  // SocketRateLimiter Tests
  // =========================================
  describe('SocketRateLimiter', () => {
    let rateLimiter;

    beforeEach(() => {
      rateLimiter = new SocketRateLimiter();
    });

    describe('checkLimit', () => {
      it('should allow connections under the limit', () => {
        const userId = 'user-123';
        
        expect(rateLimiter.checkLimit(userId)).toBe(true);
        expect(rateLimiter.checkLimit(userId)).toBe(true);
        expect(rateLimiter.checkLimit(userId)).toBe(true);
      });

      it('should track connection count per user', () => {
        const userId = 'user-123';
        
        rateLimiter.checkLimit(userId);
        rateLimiter.checkLimit(userId);
        rateLimiter.checkLimit(userId);

        const connections = rateLimiter.connections.get(userId);
        expect(connections.count).toBe(3);
      });

      it('should deny connections at the limit', () => {
        const userId = 'user-123';
        
        // Fill up to max connections (5)
        for (let i = 0; i < 5; i++) {
          expect(rateLimiter.checkLimit(userId)).toBe(true);
        }
        
        // 6th connection should be denied
        expect(rateLimiter.checkLimit(userId)).toBe(false);
      });

      it('should track connections separately per user', () => {
        const user1 = 'user-1';
        const user2 = 'user-2';
        
        // User 1 has 3 connections
        rateLimiter.checkLimit(user1);
        rateLimiter.checkLimit(user1);
        rateLimiter.checkLimit(user1);
        
        // User 2 should still be able to connect
        expect(rateLimiter.checkLimit(user2)).toBe(true);
        
        const user1Connections = rateLimiter.connections.get(user1);
        const user2Connections = rateLimiter.connections.get(user2);
        
        expect(user1Connections.count).toBe(3);
        expect(user2Connections.count).toBe(1);
      });

      it('should reset counter after interval', () => {
        const userId = 'user-123';
        
        // Fill up connections
        for (let i = 0; i < 5; i++) {
          rateLimiter.checkLimit(userId);
        }
        
        // Simulate time passing (more than reset interval)
        const connections = rateLimiter.connections.get(userId);
        connections.lastReset = Date.now() - 70000; // 70 seconds ago
        rateLimiter.connections.set(userId, connections);
        
        // Should allow new connections after reset
        expect(rateLimiter.checkLimit(userId)).toBe(true);
        
        const updatedConnections = rateLimiter.connections.get(userId);
        expect(updatedConnections.count).toBe(1);
      });

      it('should log rate limit exceeded', () => {
        const userId = 'user-123';
        
        // Fill up to max
        for (let i = 0; i < 5; i++) {
          rateLimiter.checkLimit(userId);
        }
        
        // Clear logger mock to check next call
        mockLoggerWarn.mockClear();
        
        // Attempt to exceed limit
        rateLimiter.checkLimit(userId);
        
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'WebSocket connection rate limit exceeded',
          expect.objectContaining({
            userId,
            currentConnections: 5,
            maxConnections: 5
          })
        );
      });
    });

    describe('releaseConnection', () => {
      it('should decrement connection count', () => {
        const userId = 'user-123';
        
        rateLimiter.checkLimit(userId);
        rateLimiter.checkLimit(userId);
        rateLimiter.checkLimit(userId);
        
        expect(rateLimiter.connections.get(userId).count).toBe(3);
        
        rateLimiter.releaseConnection(userId);
        
        expect(rateLimiter.connections.get(userId).count).toBe(2);
      });

      it('should not go below zero', () => {
        const userId = 'user-123';
        
        rateLimiter.checkLimit(userId);
        expect(rateLimiter.connections.get(userId).count).toBe(1);
        
        rateLimiter.releaseConnection(userId);
        expect(rateLimiter.connections.get(userId).count).toBe(0);
        
        // Try to release again
        rateLimiter.releaseConnection(userId);
        expect(rateLimiter.connections.get(userId).count).toBe(0);
      });

      it('should handle release for non-existent user gracefully', () => {
        const userId = 'non-existent-user';
        
        // Should not throw
        expect(() => rateLimiter.releaseConnection(userId)).not.toThrow();
      });
    });

    describe('Configuration', () => {
      it('should have correct default maxConnections', () => {
        expect(rateLimiter.maxConnections).toBe(5);
      });

      it('should have correct default resetInterval', () => {
        expect(rateLimiter.resetInterval).toBe(60000);
      });
    });
  });

  // =========================================
  // rateLimitSocket Middleware Tests
  // =========================================
  describe('rateLimitSocket', () => {
    beforeEach(() => {
      // Clear the global rate limiter
      socketRateLimiter.connections.clear();
    });

    it('should reject socket without userId', () => {
      delete mockSocket.userId;

      rateLimitSocket(mockSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('User ID required for rate limiting');
    });

    it('should allow socket with valid userId under limit', () => {
      mockSocket.userId = 'user-123';

      rateLimitSocket(mockSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject socket when rate limit exceeded', () => {
      mockSocket.userId = 'user-123';

      // Fill up connections
      for (let i = 0; i < 5; i++) {
        socketRateLimiter.checkLimit(mockSocket.userId);
      }

      rateLimitSocket(mockSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('Connection rate limit exceeded');
    });

    it('should register disconnect handler to release connection', () => {
      mockSocket.userId = 'user-123';

      rateLimitSocket(mockSocket, mockNext);

      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should release connection on disconnect', () => {
      mockSocket.userId = 'user-123';

      rateLimitSocket(mockSocket, mockNext);

      // Get the disconnect handler
      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];

      // Initial connection count
      const initialCount = socketRateLimiter.connections.get(mockSocket.userId).count;

      // Trigger disconnect
      disconnectHandler();

      // Connection count should decrease
      const finalCount = socketRateLimiter.connections.get(mockSocket.userId).count;
      expect(finalCount).toBe(initialCount - 1);
    });
  });

  // =========================================
  // auditSocketConnection Tests
  // =========================================
  describe('auditSocketConnection', () => {
    beforeEach(() => {
      mockSocket.userId = 'user-123';
      mockSocket.userRole = 'resident';
      mockSocket.userEmail = 'test@example.com';
      mockSocket.handshake.headers['user-agent'] = 'Mozilla/5.0';
    });

    it('should log connection establishment', () => {
      auditSocketConnection(mockSocket, mockNext);

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'WebSocket connection established',
        expect.objectContaining({
          socketId: 'socket-abc123',
          userId: 'user-123',
          userRole: 'resident',
          userEmail: 't***@example.com',
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0'
        })
      );
    });

    it('should call next middleware', () => {
      auditSocketConnection(mockSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should register disconnect handler for audit logging', () => {
      auditSocketConnection(mockSocket, mockNext);

      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should log disconnect events', () => {
      auditSocketConnection(mockSocket, mockNext);

      // Get the disconnect handler
      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];

      // Clear logger mock
      mockLoggerInfo.mockClear();

      // Trigger disconnect with reason
      disconnectHandler('client namespace disconnect');

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'WebSocket connection closed',
        expect.objectContaining({
          socketId: 'socket-abc123',
          userId: 'user-123',
          reason: 'client namespace disconnect'
        })
      );
    });
  });

  // =========================================
  // Integration Scenarios
  // =========================================
  describe('Integration Scenarios', () => {
    it('should handle full authentication and room authorization flow', async () => {
      // Step 1: Authenticate
      mockSocket.handshake.auth.token = validToken;
      await authenticateSocket(mockSocket, mockNext);

      expect(mockSocket.userId).toBe('user-123');
      expect(mockSocket.userRole).toBe('user');

      // Step 2: Authorize room (user should access dashboard but not admin)
      expect(authorizeRoom(mockSocket, 'dashboard')).toBe(true);
      expect(authorizeRoom(mockSocket, 'admin')).toBe(false);
    });

    it('should handle admin with full access flow', async () => {
      const adminToken = {
        userId: 'admin-123',
        role: 'admin',
        email: 'admin@example.com'
      };
      mockVerifyAccessToken.mockResolvedValue(adminToken);

      mockSocket.handshake.auth.token = validToken;
      await authenticateSocket(mockSocket, mockNext);

      expect(mockSocket.userRole).toBe('admin');

      // Admin should access all rooms
      expect(authorizeRoom(mockSocket, 'dashboard')).toBe(true);
      expect(authorizeRoom(mockSocket, 'admin')).toBe(true);
      expect(authorizeRoom(mockSocket, 'guards')).toBe(true);
      expect(authorizeRoom(mockSocket, 'visitors')).toBe(true);
      expect(authorizeRoom(mockSocket, 'system')).toBe(true);
    });

    it('should handle guard with partial access flow', async () => {
      const guardToken = {
        userId: 'guard-123',
        role: 'guard',
        email: 'guard@example.com'
      };
      mockVerifyAccessToken.mockResolvedValue(guardToken);

      mockSocket.handshake.auth.token = validToken;
      await authenticateSocket(mockSocket, mockNext);

      expect(mockSocket.userRole).toBe('guard');

      // Guard should access dashboard, guards, visitors but not admin or system
      expect(authorizeRoom(mockSocket, 'dashboard')).toBe(true);
      expect(authorizeRoom(mockSocket, 'guards')).toBe(true);
      expect(authorizeRoom(mockSocket, 'visitors')).toBe(true);
      expect(authorizeRoom(mockSocket, 'admin')).toBe(false);
      expect(authorizeRoom(mockSocket, 'system')).toBe(false);
    });
  });
});
