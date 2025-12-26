/**
 * RoleMiddleware Unit Tests
 * 
 * Tests for role-based access control middleware.
 * Priority: P1 (Security Middleware)
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('RoleMiddleware', () => {
  let requireRole;
  let mockReq;
  let mockRes;
  let mockNext;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module = await import('../../src/middleware/roleMiddleware.js');
    requireRole = module.requireRole;
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    mockNext = jest.fn();
    
    mockReq = {
      user: {
        email: 'test@test.com',
        role: 'admin'
      }
    };
    
    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  describe('requireRole', () => {
    it('should be a function', () => {
      expect(typeof requireRole).toBe('function');
    });
    
    it('should return a middleware function', () => {
      const middleware = requireRole('admin');
      expect(typeof middleware).toBe('function');
    });
    
    it('should call next() when user has required role', () => {
      mockReq.user = { email: 'admin@test.com', role: 'admin' };
      
      const middleware = requireRole('admin');
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
    
    it('should allow access when user role is in allowed roles list', () => {
      mockReq.user = { email: 'guard@test.com', role: 'guard' };
      
      const middleware = requireRole('admin', 'guard', 'resident');
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should return 403 when user role is not in allowed roles', () => {
      mockReq.user = { email: 'resident@test.com', role: 'resident' };
      
      const middleware = requireRole('admin');
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Forbidden - insufficient role'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should return 401 when user has no role', () => {
      mockReq.user = { email: 'unknown@test.com', role: null };
      
      const middleware = requireRole('admin');
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized - no role'
      });
    });
    
    it('should return 401 when user object is undefined', () => {
      mockReq.user = undefined;
      
      const middleware = requireRole('admin');
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized - no role'
      });
    });
    
    it('should return 401 when user object is null', () => {
      mockReq.user = null;
      
      const middleware = requireRole('admin');
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
    
    it('should call next when no roles are specified and user has a role', () => {
      mockReq.user = { email: 'user@test.com', role: 'any_role' };
      
      const middleware = requireRole();
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should handle multiple allowed roles correctly', () => {
      // Test admin
      mockReq.user = { email: 'admin@test.com', role: 'admin' };
      let middleware = requireRole('admin', 'guard', 'resident');
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      
      // Reset
      jest.clearAllMocks();
      
      // Test guard
      mockReq.user = { email: 'guard@test.com', role: 'guard' };
      middleware = requireRole('admin', 'guard', 'resident');
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      
      // Reset
      jest.clearAllMocks();
      
      // Test resident
      mockReq.user = { email: 'resident@test.com', role: 'resident' };
      middleware = requireRole('admin', 'guard', 'resident');
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
    
    it('should deny access for unlisted role in multiple roles check', () => {
      mockReq.user = { email: 'visitor@test.com', role: 'visitor' };
      
      const middleware = requireRole('admin', 'guard');
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should handle exceptions gracefully', () => {
      // Make status throw an error to trigger catch block
      mockRes.status = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      mockRes.status.mockReturnThis = () => mockRes;
      
      // Create a new response with working methods for the error handling
      const errorRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      // This should trigger the catch block
      mockReq.user = { get role() { throw new Error('Property access error'); } };
      
      const middleware = requireRole('admin');
      middleware(mockReq, errorRes, mockNext);
      
      expect(errorRes.status).toHaveBeenCalledWith(500);
      expect(errorRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server error'
      });
    });
  });
  
  describe('Default Export', () => {
    it('should export requireRole as default', async () => {
      const module = await import('../../src/middleware/roleMiddleware.js');
      expect(module.default).toBe(module.requireRole);
    });
  });
});
