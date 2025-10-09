/**
 * Role Middleware Tests
 * 
 * Critical test suite for role-based access control middleware
 * Phase 1, Week 1, Day 4 - Phase B: Coverage Analysis
 * 
 * Tests:
 * - Role-based authorization
 * - Multiple role handling
 * - Error scenarios
 * - Edge cases
 */

import { jest } from '@jest/globals';
import { requireRole } from '../../src/middleware/roleMiddleware.js';

// Import test utilities
import { createMockRequest, createMockResponse, createMockNext } from '../helpers/mockHelpers.js';
import { createEnhancedUserFixture } from '../fixtures/userFixtures.js';

describe('Role Middleware - Critical Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = createMockNext();
  });

  describe('requireRole()', () => {
    describe('✅ Success Cases', () => {
      test('should allow user with exact matching role', () => {
        // Setup
        mockReq.user = createEnhancedUserFixture({ role: 'admin' });
        const middleware = requireRole('admin');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockRes.status).not.toHaveBeenCalled();
        expect(mockRes.json).not.toHaveBeenCalled();
      });

      test('should allow user with one of multiple allowed roles', () => {
        // Setup
        mockReq.user = createEnhancedUserFixture({ role: 'security' });
        const middleware = requireRole('admin', 'security', 'manager');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalledWith();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      test('should allow admin role from allowed list', () => {
        // Setup
        mockReq.user = createEnhancedUserFixture({ role: 'admin' });
        const middleware = requireRole('admin', 'security');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
      });

      test('should allow manager role', () => {
        // Setup
        mockReq.user = createEnhancedUserFixture({ role: 'manager' });
        const middleware = requireRole('manager');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
      });

      test('should allow security role', () => {
        // Setup
        mockReq.user = createEnhancedUserFixture({ role: 'security' });
        const middleware = requireRole('security');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
      });

      test('should allow user role', () => {
        // Setup
        mockReq.user = createEnhancedUserFixture({ role: 'user' });
        const middleware = requireRole('user');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
      });

      test('should handle role at first position in list', () => {
        // Setup
        mockReq.user = createEnhancedUserFixture({ role: 'admin' });
        const middleware = requireRole('admin', 'manager', 'user');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
      });

      test('should handle role at middle position in list', () => {
        // Setup
        mockReq.user = createEnhancedUserFixture({ role: 'manager' });
        const middleware = requireRole('admin', 'manager', 'user');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
      });

      test('should handle role at last position in list', () => {
        // Setup
        mockReq.user = createEnhancedUserFixture({ role: 'user' });
        const middleware = requireRole('admin', 'manager', 'user');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('❌ Authorization Failures', () => {
      test('should reject when user has no role', () => {
        // Setup - user without role
        mockReq.user = { email: 'test@example.com' };
        const middleware = requireRole('admin');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: 'Unauthorized - no role'
        });
      });

      test('should reject when user role not in allowed list', () => {
        // Setup
        mockReq.user = createEnhancedUserFixture({ role: 'user' });
        const middleware = requireRole('admin', 'security');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: 'Forbidden - insufficient role'
        });
      });

      test('should reject guest role when admin required', () => {
        // Setup
        mockReq.user = createEnhancedUserFixture({ role: 'guest' });
        const middleware = requireRole('admin');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      test('should reject when role is null', () => {
        // Setup
        mockReq.user = { email: 'test@example.com', role: null };
        const middleware = requireRole('admin');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
      });

      test('should reject when role is undefined', () => {
        // Setup
        mockReq.user = { email: 'test@example.com', role: undefined };
        const middleware = requireRole('admin');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
      });

      test('should reject when role is empty string', () => {
        // Setup
        mockReq.user = { email: 'test@example.com', role: '' };
        const middleware = requireRole('admin');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
      });
    });

    describe('❌ Missing User Cases', () => {
      test('should reject when req.user is undefined', () => {
        // Setup - no user
        delete mockReq.user;
        const middleware = requireRole('admin');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: 'Unauthorized - no role'
        });
      });

      test('should reject when req.user is null', () => {
        // Setup
        mockReq.user = null;
        const middleware = requireRole('admin');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
      });
    });

    describe('🔐 Multiple Role Scenarios', () => {
      test('should work with 2 allowed roles', () => {
        // Setup
        mockReq.user = createEnhancedUserFixture({ role: 'security' });
        const middleware = requireRole('admin', 'security');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
      });

      test('should work with 5 allowed roles', () => {
        // Setup
        mockReq.user = createEnhancedUserFixture({ role: 'manager' });
        const middleware = requireRole('admin', 'security', 'manager', 'supervisor', 'lead');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
      });

      test('should reject when role not in large allowed list', () => {
        // Setup
        mockReq.user = createEnhancedUserFixture({ role: 'guest' });
        const middleware = requireRole('admin', 'security', 'manager', 'supervisor', 'lead');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });
    });

    describe('🛡️ Security Edge Cases', () => {
      test('should be case-sensitive with roles', () => {
        // Setup - role is lowercase but check is uppercase
        mockReq.user = createEnhancedUserFixture({ role: 'admin' });
        const middleware = requireRole('ADMIN'); // Uppercase

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert - should fail because of case mismatch
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      test('should reject role with extra whitespace', () => {
        // Setup
        mockReq.user = { email: 'test@example.com', role: ' admin ' };
        const middleware = requireRole('admin');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert - should fail because of whitespace
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      test('should handle role as non-string gracefully', () => {
        // Setup - role as number (edge case)
        mockReq.user = { email: 'test@example.com', role: 123 };
        const middleware = requireRole('admin');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should handle error in middleware execution', () => {
        // Setup - simulate error by making req.user a getter that throws
        Object.defineProperty(mockReq, 'user', {
          get() { throw new Error('Simulated error'); }
        });
        const middleware = requireRole('admin');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: 'Server error'
        });
      });
    });

    describe('📝 Logging & Debugging', () => {
      test('should handle user without email gracefully', () => {
        // Setup - user without email
        mockReq.user = { role: 'admin' };
        const middleware = requireRole('admin');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert - should still work
        expect(mockNext).toHaveBeenCalled();
      });

      test('should work with user having extra properties', () => {
        // Setup - user with additional properties
        mockReq.user = {
          id: 1,
          email: 'test@example.com',
          role: 'admin',
          username: 'testuser',
          verified: true,
          createdAt: new Date()
        };
        const middleware = requireRole('admin');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('🎭 Real-World Scenarios', () => {
      test('admin accessing admin-only resource', () => {
        // Setup
        mockReq.user = createEnhancedUserFixture({ role: 'admin' });
        const middleware = requireRole('admin');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
      });

      test('user accessing admin-only resource (should fail)', () => {
        // Setup
        mockReq.user = createEnhancedUserFixture({ role: 'user' });
        const middleware = requireRole('admin');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      test('manager accessing manager or admin resource', () => {
        // Setup
        mockReq.user = createEnhancedUserFixture({ role: 'manager' });
        const middleware = requireRole('admin', 'manager');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
      });

      test('security accessing security-only resource', () => {
        // Setup
        mockReq.user = createEnhancedUserFixture({ role: 'security' });
        const middleware = requireRole('security');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
      });

      test('user accessing multi-role resource (admin, manager, user)', () => {
        // Setup
        mockReq.user = createEnhancedUserFixture({ role: 'user' });
        const middleware = requireRole('admin', 'manager', 'user');

        // Execute
        middleware(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
      });
    });
  });
});
