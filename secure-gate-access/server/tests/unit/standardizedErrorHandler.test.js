/**
 * Unit Tests for Standardized Error Handler Middleware
 * 
 * Tests cover:
 * - AppError class functionality
 * - Error handler middleware for various error types
 * - Database error handling (PostgreSQL errors)
 * - JWT error handling
 * - Validation error handling
 * - Multer (file upload) error handling
 * - 404 Not Found handler
 * - Async handler wrapper
 * - Error response format consistency
 * - Security (no stack traces in responses)
 * - Error logging behavior
 */

import { jest } from '@jest/globals';

// Import the module directly (no complex mocks needed)
const {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler
} = await import('../../src/middleware/standardizedErrorHandler.js');

describe('Standardized Error Handler', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let consoleErrorSpy;
  let originalEnv;

  beforeAll(() => {
    originalEnv = process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  beforeEach(() => {
    mockReq = {
      originalUrl: '/api/test',
      method: 'POST',
      ip: '192.168.1.1',
      user: { id: 123 },
      requestId: 'req-12345'
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
    
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('AppError Class', () => {
    it('should create an operational error with all properties', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR', { field: 'value' });
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('TEST_ERROR');
      expect(error.details).toEqual({ field: 'value' });
      expect(error.isOperational).toBe(true);
    });

    it('should create error with default values', () => {
      const error = new AppError('Simple error', 500);
      
      expect(error.message).toBe('Simple error');
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBeNull();
      expect(error.details).toBeNull();
    });

    it('should extend Error class', () => {
      const error = new AppError('Test', 400);
      
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });

    it('should capture stack trace', () => {
      const error = new AppError('Test', 400);
      
      expect(error.stack).toBeDefined();
    });
  });

  describe('errorHandler Middleware', () => {
    describe('Basic Error Handling', () => {
      it('should handle AppError correctly', () => {
        const error = new AppError('Custom error', 400, 'CUSTOM_ERROR');
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Custom error',
            error: expect.objectContaining({
              code: 'CUSTOM_ERROR'
            })
          })
        );
      });

      it('should use default status 500 for generic errors', () => {
        const error = new Error('Generic error');
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(500);
      });

      it('should use default error code INTERNAL_ERROR', () => {
        const error = new Error('Generic error');
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: 'INTERNAL_ERROR'
            })
          })
        );
      });

      it('should include timestamp in response', () => {
        const error = new Error('Test');
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            timestamp: expect.any(String)
          })
        );
      });

      it('should include request ID if available', () => {
        const error = new Error('Test');
        mockReq.requestId = 'custom-req-id';
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              requestId: 'custom-req-id'
            })
          })
        );
      });
    });

    describe('PostgreSQL Database Errors', () => {
      it('should handle unique constraint violation (23505)', () => {
        const error = new Error('duplicate key value');
        error.code = '23505';
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(409);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'This record already exists',
            error: expect.objectContaining({
              code: 'DUPLICATE_ENTRY'
            })
          })
        );
      });

      it('should handle foreign key violation (23503)', () => {
        const error = new Error('foreign key constraint');
        error.code = '23503';
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Referenced record does not exist',
            error: expect.objectContaining({
              code: 'INVALID_REFERENCE'
            })
          })
        );
      });

      it('should handle invalid text representation (22P02)', () => {
        const error = new Error('invalid input syntax');
        error.code = '22P02';
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Invalid data format',
            error: expect.objectContaining({
              code: 'INVALID_INPUT'
            })
          })
        );
      });
    });

    describe('JWT Errors', () => {
      it('should handle JsonWebTokenError', () => {
        const error = new Error('jwt malformed');
        error.name = 'JsonWebTokenError';
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Invalid authentication token',
            error: expect.objectContaining({
              code: 'INVALID_TOKEN'
            })
          })
        );
      });

      it('should handle TokenExpiredError', () => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Authentication token expired',
            error: expect.objectContaining({
              code: 'TOKEN_EXPIRED'
            })
          })
        );
      });
    });

    describe('Validation Errors', () => {
      it('should handle ValidationError', () => {
        const error = new Error('Validation failed');
        error.name = 'ValidationError';
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Validation failed',
            error: expect.objectContaining({
              code: 'VALIDATION_ERROR'
            })
          })
        );
      });
    });

    describe('Multer File Upload Errors', () => {
      it('should handle MulterError - file size limit', () => {
        const error = new Error('File too large');
        error.name = 'MulterError';
        error.code = 'LIMIT_FILE_SIZE';
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'File too large',
            error: expect.objectContaining({
              code: 'FILE_UPLOAD_ERROR'
            })
          })
        );
      });

      it('should handle other MulterError types', () => {
        const error = new Error('Unexpected field');
        error.name = 'MulterError';
        error.code = 'LIMIT_UNEXPECTED_FILE';
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'File upload failed'
          })
        );
      });
    });

    describe('Error Details Handling', () => {
      it('should include safe details for operational errors', () => {
        const error = new AppError('Validation error', 400, 'VALIDATION', {
          field: 'email',
          reason: 'Invalid format'
        });
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              details: {
                field: 'email',
                reason: 'Invalid format'
              }
            })
          })
        );
      });

      it('should remove stack from details', () => {
        const error = new AppError('Error', 400, 'TEST', {
          field: 'test',
          stack: 'sensitive stack trace'
        });
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        const response = mockRes.json.mock.calls[0][0];
        expect(response.error.details).not.toHaveProperty('stack');
      });

      it('should remove originalError from details', () => {
        const error = new AppError('Error', 400, 'TEST', {
          field: 'test',
          originalError: new Error('internal')
        });
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        const response = mockRes.json.mock.calls[0][0];
        expect(response.error.details).not.toHaveProperty('originalError');
      });

      it('should not include details for non-operational errors', () => {
        const error = new Error('System error');
        error.details = { sensitive: 'data' };
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        const response = mockRes.json.mock.calls[0][0];
        expect(response.error.details).toBeUndefined();
      });
    });

    describe('Logging Behavior', () => {
      it('should log non-operational errors', () => {
        const error = new Error('System crash');
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should not log operational errors', () => {
        const error = new AppError('User input error', 400, 'INPUT_ERROR');
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });

      it('should log 5xx errors in development', () => {
        process.env.NODE_ENV = 'development';
        const error = new AppError('Server error', 500, 'SERVER');
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
    });

    describe('Security - No Stack Traces in Response', () => {
      it('should never expose stack traces in API response', () => {
        const error = new Error('System error');
        error.stack = 'at Function.execute (/app/src/...)\n...';
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        const response = mockRes.json.mock.calls[0][0];
        expect(JSON.stringify(response)).not.toContain('at Function');
        expect(response.stack).toBeUndefined();
        expect(response.error.stack).toBeUndefined();
      });

      it('should log stack traces to console, not to response', () => {
        const error = new Error('Error with stack');
        error.stack = 'Error: at someFunction (/app/file.js:10:5)';
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        // Stack should be logged
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            stack: expect.any(String)
          })
        );
        
        // Stack should not be in response
        const response = mockRes.json.mock.calls[0][0];
        expect(response.stack).toBeUndefined();
      });
    });

    describe('Response Format Consistency', () => {
      it('should always return JSON format', () => {
        const error = new Error('Any error');
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalled();
      });

      it('should always include success: false', () => {
        const error = new Error('Any error');
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false
          })
        );
      });

      it('should always include message', () => {
        const error = new Error('Error message');
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.any(String)
          })
        );
      });

      it('should always include error.code', () => {
        const error = new Error('Any error');
        
        errorHandler(error, mockReq, mockRes, mockNext);
        
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: expect.any(String)
            })
          })
        );
      });
    });
  });

  describe('notFoundHandler Middleware', () => {
    it('should create 404 error for unmatched routes', () => {
      mockReq.method = 'GET';
      mockReq.originalUrl = '/api/nonexistent';
      
      notFoundHandler(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          errorCode: 'NOT_FOUND'
        })
      );
    });

    it('should include method and path in error message', () => {
      mockReq.method = 'POST';
      mockReq.originalUrl = '/api/missing';
      
      notFoundHandler(mockReq, mockRes, mockNext);
      
      const error = mockNext.mock.calls[0][0];
      expect(error.message).toContain('POST');
      expect(error.message).toContain('/api/missing');
    });

    it('should create an AppError instance', () => {
      notFoundHandler(mockReq, mockRes, mockNext);
      
      const error = mockNext.mock.calls[0][0];
      expect(error instanceof AppError).toBe(true);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('asyncHandler Wrapper', () => {
    it('should pass successful async result', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = asyncHandler(asyncFn);
      
      await wrappedFn(mockReq, mockRes, mockNext);
      
      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });

    it('should catch and pass errors to next', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(asyncFn);
      
      await wrappedFn(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle sync functions that return promises', async () => {
      const syncFn = (req, res, next) => Promise.resolve('done');
      const wrappedFn = asyncHandler(syncFn);
      
      await wrappedFn(mockReq, mockRes, mockNext);
      
      // Should not call next with error
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle async functions that throw', async () => {
      const error = new Error('Async throw');
      const asyncFn = async () => {
        throw error;
      };
      const wrappedFn = asyncHandler(asyncFn);
      
      await wrappedFn(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should preserve function context', async () => {
      const asyncFn = async function() {
        return this;
      };
      const wrappedFn = asyncHandler(asyncFn);
      
      // Should not throw
      await wrappedFn(mockReq, mockRes, mockNext);
    });
  });

  describe('Edge Cases', () => {
    it('should handle error without message', () => {
      const error = new Error();
      error.message = '';
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error'
        })
      );
    });

    it('should handle null request properties', () => {
      const error = new Error('Test');
      const minimalReq = { originalUrl: '/test', method: 'GET' };
      
      errorHandler(error, minimalReq, mockRes, mockNext);
      
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should handle undefined requestId', () => {
      const error = new Error('Test');
      delete mockReq.requestId;
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      const response = mockRes.json.mock.calls[0][0];
      expect(response.error.requestId).toBeUndefined();
    });

    it('should handle error with empty details object', () => {
      const error = new AppError('Error', 400, 'TEST', {});
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      const response = mockRes.json.mock.calls[0][0];
      expect(response.error.details).toBeUndefined();
    });
  });

  describe('Default Export', () => {
    it('should export all handlers', async () => {
      const module = await import('../../src/middleware/standardizedErrorHandler.js');
      
      expect(module.default).toBeDefined();
      expect(module.default.AppError).toBe(AppError);
      expect(module.default.errorHandler).toBe(errorHandler);
      expect(module.default.notFoundHandler).toBe(notFoundHandler);
      expect(module.default.asyncHandler).toBe(asyncHandler);
    });
  });
});
