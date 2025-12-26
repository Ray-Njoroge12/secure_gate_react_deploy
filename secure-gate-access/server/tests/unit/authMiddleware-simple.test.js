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

describe('Auth Middleware Simple Test', () => {
  it('should load the middleware', () => {
    expect(authenticateToken).toBeDefined();
    expect(attachUserFromToken).toBeDefined();
  });
});
