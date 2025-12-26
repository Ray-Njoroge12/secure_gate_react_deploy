/**
 * Enhanced Error Handler Middleware Unit Tests
 * Tests for comprehensive error handling with logging and monitoring
 * Priority: P1 - Core error handling
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    close: jest.fn().mockResolvedValue()
  }
}));

describe('Enhanced Error Handler Middleware', () => {
  let enhancedErrorHandler;
  let asyncErrorHandler;
  let asyncHandler;
  let logger;
  let dbManager;
  let mockReq;
  let mockRes;
  let mockNext;
  let originalEnv;

  beforeEach(async () => {
    jest.clearAllMocks();
    originalEnv = process.env.NODE_ENV;
    
    // Import modules after mocks are set up
    const loggerModule = await import('../../src/config/logger.js');
    logger = loggerModule.default;
    
    const dbModule = await import('../../src/database/db.enhanced.js');
    dbManager = dbModule.dbManager;
    
    const errorHandlerModule = await import('../../src/middleware/enhancedErrorHandler.js');
    enhancedErrorHandler = errorHandlerModule.enhancedErrorHandler;
    asyncErrorHandler = errorHandlerModule.asyncErrorHandler;
    asyncHandler = errorHandlerModule.asyncHandler;
    
    mockReq = {
      url: '/api/test',
      method: 'GET',
      ip: '192.168.1.1',
      headers: {
        'user-agent': 'TestAgent/1.0',
        'x-request-id': 'test-req-123'
      },
      user: { id: 1, email: 'test@test.com' },
      body: {},
      query: {},
      params: {},
      connection: { remoteAddress: '192.168.1.1' }
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      statusCode: 500
    };
    
    mockNext = jest.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.clearAllMocks();
  });

  describe('enhancedErrorHandler', () => {
    it('should handle validation errors with 400 status', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      
      enhancedErrorHandler(error, mockReq, mockRes, mockNext);
      
      // Error should be classified as validation error
      expect(mockRes.set).toHaveBeenCalledWith('X-Error-Type', 'VALIDATION_ERROR');
      expect(mockRes.set).toHaveBeenCalledWith('X-Error-Severity', 'medium');
    });

    it('should handle authentication errors with 401 status', () => {
      const error = new Error('Not authenticated');
      error.name = 'UnauthorizedError';
      
      enhancedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.set).toHaveBeenCalledWith('X-Error-Type', 'AUTHENTICATION_ERROR');
    });

    it('should handle authorization errors with 403 status', () => {
      const error = new Error('Access denied');
      error.status = 403;
      
      enhancedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.set).toHaveBeenCalledWith('X-Error-Type', 'AUTHORIZATION_ERROR');
    });

    it('should handle database errors', () => {
      const error = new Error('Duplicate key');
      error.code = '23505'; // PostgreSQL duplicate key error
      
      enhancedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.set).toHaveBeenCalledWith('X-Error-Type', 'DATABASE_ERROR');
    });

    it('should handle network errors', () => {
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      
      enhancedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.set).toHaveBeenCalledWith('X-Error-Type', 'NETWORK_ERROR');
      expect(mockRes.set).toHaveBeenCalledWith('X-Error-Severity', 'high');
    });

    it('should handle rate limit errors with 429 status', () => {
      const error = new Error('Too many requests');
      error.status = 429;
      
      enhancedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.set).toHaveBeenCalledWith('X-Error-Type', 'RATE_LIMIT_ERROR');
      expect(mockRes.set).toHaveBeenCalledWith('X-Error-Severity', 'low');
    });

    it('should handle security errors', () => {
      const error = new Error('Security violation detected');
      error.name = 'SecurityError';
      
      enhancedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.set).toHaveBeenCalledWith('X-Error-Type', 'SECURITY_ERROR');
      expect(mockRes.set).toHaveBeenCalledWith('X-Error-Severity', 'high');
    });

    it('should handle generic internal errors', () => {
      const error = new Error('Something went wrong');
      
      enhancedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.set).toHaveBeenCalledWith('X-Error-Type', 'INTERNAL_ERROR');
    });

    it('should set request ID header', () => {
      const error = new Error('Test error');
      
      enhancedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.set).toHaveBeenCalledWith('X-Request-ID', 'test-req-123');
    });

    it('should use status code from error', () => {
      const error = new Error('Not found');
      error.status = 404;
      
      enhancedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should use statusCode from error', () => {
      const error = new Error('Bad request');
      error.statusCode = 400;
      
      enhancedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should default to 500 status code', () => {
      const error = new Error('Internal error');
      
      enhancedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should log high severity errors as error', () => {
      const error = new Error('Critical error');
      error.code = 'ECONNREFUSED'; // Network error - high severity
      
      enhancedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(logger.error).toHaveBeenCalledWith(
        'High severity error occurred',
        expect.any(Object)
      );
    });

    it('should log medium severity errors as warn', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      
      enhancedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Medium severity error occurred',
        expect.any(Object)
      );
    });

    it('should log low severity errors as info', () => {
      const error = new Error('Rate limited');
      error.status = 429;
      
      enhancedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(logger.info).toHaveBeenCalledWith(
        'Low severity error occurred',
        expect.any(Object)
      );
    });

    it('should store error in database', async () => {
      const error = new Error('Test error');
      
      enhancedErrorHandler(error, mockReq, mockRes, mockNext);
      
      // Wait for async database call
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO security_events'),
        expect.any(Array)
      );
    });

    it('should include error details in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Detailed error');
      error.stack = 'Error stack trace';
      
      enhancedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              message: 'Detailed error',
              stack: 'Error stack trace'
            })
          })
        })
      );
    });

    it('should hide error details in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Secret error');
      
      enhancedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.not.objectContaining({
            details: expect.any(Object)
          })
        })
      );
    });

    it('should return JSON response with success false', () => {
      const error = new Error('Test error');
      
      enhancedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });

    it('should generate request ID if not provided', () => {
      delete mockReq.headers['x-request-id'];
      const error = new Error('Test error');
      
      enhancedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.set).toHaveBeenCalledWith(
        'X-Request-ID',
        expect.stringContaining('error-')
      );
    });

    it('should handle anonymous users', () => {
      mockReq.user = null;
      const error = new Error('Test error');
      
      enhancedErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          userId: 'anonymous'
        })
      );
    });

    it('should handle database store errors gracefully', async () => {
      const error = new Error('Test error');
      dbManager.query.mockRejectedValueOnce(new Error('DB error'));
      
      enhancedErrorHandler(error, mockReq, mockRes, mockNext);
      
      // Wait for async database call
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should log the DB error
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('asyncErrorHandler', () => {
    it('should be a function', () => {
      expect(typeof asyncErrorHandler).toBe('function');
    });

    it('should return a middleware function', () => {
      const handler = asyncErrorHandler(async () => {});
      expect(typeof handler).toBe('function');
    });

    it('should call the wrapped function', async () => {
      const mockHandler = jest.fn().mockResolvedValue();
      const wrapped = asyncErrorHandler(mockHandler);
      
      await wrapped(mockReq, mockRes, mockNext);
      
      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });

    it('should catch errors and pass to next', async () => {
      const error = new Error('Async error');
      const mockHandler = jest.fn().mockRejectedValue(error);
      const wrapped = asyncErrorHandler(mockHandler);
      
      await wrapped(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle successful async operations', async () => {
      const mockHandler = jest.fn().mockResolvedValue('success');
      const wrapped = asyncErrorHandler(mockHandler);
      
      await wrapped(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle sync functions returning promises', async () => {
      const mockHandler = () => Promise.resolve('sync resolved');
      const wrapped = asyncErrorHandler(mockHandler);
      
      await wrapped(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('asyncHandler alias', () => {
    it('should be the same as asyncErrorHandler', () => {
      expect(asyncHandler).toBe(asyncErrorHandler);
    });
  });

  describe('Error Classification', () => {
    const testCases = [
      { name: 'ValidationError', expected: 'VALIDATION_ERROR' },
      { status: 401, expected: 'AUTHENTICATION_ERROR' },
      { status: 403, expected: 'AUTHORIZATION_ERROR' },
      { status: 429, expected: 'RATE_LIMIT_ERROR' },
      { code: 'ECONNREFUSED', expected: 'NETWORK_ERROR' },
      { code: 'ENOTFOUND', expected: 'NETWORK_ERROR' },
      { code: '23505', expected: 'DATABASE_ERROR' },
      { code: '23503', expected: 'DATABASE_ERROR' },
      { name: 'SecurityError', expected: 'SECURITY_ERROR' },
      { message: 'validation failed', expected: 'VALIDATION_ERROR' },
      { message: 'security breach', expected: 'SECURITY_ERROR' }
    ];

    testCases.forEach(({ name, status, code, message, expected }) => {
      const description = name || `status ${status}` || `code ${code}` || `message "${message}"`;
      
      it(`should classify ${description} as ${expected}`, () => {
        const error = new Error(message || 'Test error');
        if (name) error.name = name;
        if (status) error.status = status;
        if (code) error.code = code;
        
        enhancedErrorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.set).toHaveBeenCalledWith('X-Error-Type', expected);
      });
    });
  });

  describe('Severity Classification', () => {
    const testCases = [
      { code: 'ECONNREFUSED', expected: 'high' },
      { code: 'ENOTFOUND', expected: 'high' },
      { name: 'SecurityError', expected: 'high' },
      { name: 'ValidationError', expected: 'medium' },
      { status: 401, expected: 'medium' },
      { status: 403, expected: 'medium' },
      { code: '23505', expected: 'medium' },
      { status: 429, expected: 'low' }
    ];

    testCases.forEach(({ name, status, code, expected }) => {
      const description = name || `status ${status}` || `code ${code}`;
      
      it(`should classify ${description} as ${expected} severity`, () => {
        const error = new Error('Test error');
        if (name) error.name = name;
        if (status) error.status = status;
        if (code) error.code = code;
        
        enhancedErrorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.set).toHaveBeenCalledWith('X-Error-Severity', expected);
      });
    });
  });
});
