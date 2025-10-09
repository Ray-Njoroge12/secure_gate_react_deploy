/**
 * Unit Tests for Error Handler Middleware
 * 
 * Coverage:
 * - AppError class
 * - ErrorHelper utilities
 * - Error codes
 * - Global error handler middleware
 * - Request ID middleware
 * - Async handler wrapper
 * - 404 handler
 * - Error response formatting
 * - Security logging
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AppError,
  ErrorHelper,
  ERROR_CODES,
  globalErrorHandler,
  requestIdMiddleware,
  asyncHandler,
  notFoundHandler
} from '../../src/middleware/errorHandler.js';

describe('Error Handler - ERROR_CODES', () => {
  it('should define all authentication error codes', () => {
    expect(ERROR_CODES.AUTH_TOKEN_MISSING).toBe('AUTH_TOKEN_MISSING');
    expect(ERROR_CODES.AUTH_TOKEN_INVALID).toBe('AUTH_TOKEN_INVALID');
    expect(ERROR_CODES.AUTH_TOKEN_EXPIRED).toBe('AUTH_TOKEN_EXPIRED');
    expect(ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS).toBe('AUTH_INSUFFICIENT_PERMISSIONS');
    expect(ERROR_CODES.AUTH_INVALID_CREDENTIALS).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('should define all validation error codes', () => {
    expect(ERROR_CODES.VALIDATION_REQUIRED_FIELD).toBe('VALIDATION_REQUIRED_FIELD');
    expect(ERROR_CODES.VALIDATION_INVALID_FORMAT).toBe('VALIDATION_INVALID_FORMAT');
    expect(ERROR_CODES.VALIDATION_CONSTRAINT_VIOLATION).toBe('VALIDATION_CONSTRAINT_VIOLATION');
  });

  it('should define all business logic error codes', () => {
    expect(ERROR_CODES.RESOURCE_NOT_FOUND).toBe('RESOURCE_NOT_FOUND');
    expect(ERROR_CODES.RESOURCE_ALREADY_EXISTS).toBe('RESOURCE_ALREADY_EXISTS');
    expect(ERROR_CODES.OPERATION_NOT_ALLOWED).toBe('OPERATION_NOT_ALLOWED');
    expect(ERROR_CODES.BUSINESS_RULE_VIOLATION).toBe('BUSINESS_RULE_VIOLATION');
  });

  it('should define all system error codes', () => {
    expect(ERROR_CODES.DATABASE_ERROR).toBe('DATABASE_ERROR');
    expect(ERROR_CODES.EXTERNAL_SERVICE_ERROR).toBe('EXTERNAL_SERVICE_ERROR');
    expect(ERROR_CODES.INTERNAL_SERVER_ERROR).toBe('INTERNAL_SERVER_ERROR');
    expect(ERROR_CODES.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
  });
});

describe('Error Handler - AppError Class', () => {
  describe('Constructor', () => {
    it('should create AppError with all parameters', () => {
      const error = new AppError(
        'Test error',
        ERROR_CODES.DATABASE_ERROR,
        500,
        { table: 'users' }
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ERROR_CODES.DATABASE_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ table: 'users' });
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('AppError');
      expect(error.timestamp).toBeDefined();
      expect(error.stack).toBeDefined();
    });

    it('should create AppError with default values', () => {
      const error = new AppError('Default error');

      expect(error.message).toBe('Default error');
      expect(error.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.details).toBe(null);
      expect(error.isOperational).toBe(true);
    });

    it('should create AppError with minimal parameters', () => {
      const error = new AppError('Minimal error', ERROR_CODES.VALIDATION_INVALID_FORMAT);

      expect(error.message).toBe('Minimal error');
      expect(error.code).toBe(ERROR_CODES.VALIDATION_INVALID_FORMAT);
      expect(error.statusCode).toBe(500); // default
      expect(error.details).toBe(null);
    });

    it('should capture stack trace', () => {
      const error = new AppError('Stack test');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
      expect(error.stack).toContain('Stack test');
    });

    it('should set timestamp as ISO string', () => {
      const before = new Date().toISOString();
      const error = new AppError('Timestamp test');
      const after = new Date().toISOString();

      expect(error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(error.timestamp >= before && error.timestamp <= after).toBe(true);
    });
  });
});

describe('Error Handler - ErrorHelper Authentication', () => {
  describe('tokenMissing', () => {
    it('should create token missing error', () => {
      const error = ErrorHelper.tokenMissing();

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Authentication token required');
      expect(error.code).toBe(ERROR_CODES.AUTH_TOKEN_MISSING);
      expect(error.statusCode).toBe(401);
    });

    it('should include details if provided', () => {
      const details = { header: 'Authorization' };
      const error = ErrorHelper.tokenMissing(details);

      expect(error.details).toEqual(details);
    });
  });

  describe('tokenInvalid', () => {
    it('should create invalid token error', () => {
      const error = ErrorHelper.tokenInvalid();

      expect(error.message).toBe('Invalid authentication token');
      expect(error.code).toBe(ERROR_CODES.AUTH_TOKEN_INVALID);
      expect(error.statusCode).toBe(401);
    });

    it('should include details if provided', () => {
      const details = { reason: 'malformed' };
      const error = ErrorHelper.tokenInvalid(details);

      expect(error.details).toEqual(details);
    });
  });

  describe('tokenExpired', () => {
    it('should create expired token error', () => {
      const error = ErrorHelper.tokenExpired();

      expect(error.message).toBe('Authentication token expired');
      expect(error.code).toBe(ERROR_CODES.AUTH_TOKEN_EXPIRED);
      expect(error.statusCode).toBe(401);
    });

    it('should include expiration details', () => {
      const details = { expiredAt: '2024-01-01' };
      const error = ErrorHelper.tokenExpired(details);

      expect(error.details).toEqual(details);
    });
  });

  describe('forbidden', () => {
    it('should create forbidden error with default message', () => {
      const error = ErrorHelper.forbidden();

      expect(error.message).toBe('Insufficient permissions');
      expect(error.code).toBe(ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS);
      expect(error.statusCode).toBe(403);
    });

    it('should accept custom message', () => {
      const error = ErrorHelper.forbidden('Admin access required');

      expect(error.message).toBe('Admin access required');
      expect(error.statusCode).toBe(403);
    });

    it('should include permission details', () => {
      const details = { required: ['admin'], has: ['user'] };
      const error = ErrorHelper.forbidden('Custom message', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('invalidCredentials', () => {
    it('should create invalid credentials error', () => {
      const error = ErrorHelper.invalidCredentials();

      expect(error.message).toBe('Invalid credentials');
      expect(error.code).toBe(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
      expect(error.statusCode).toBe(401);
    });

    it('should include credential details', () => {
      const details = { username: 'test@example.com' };
      const error = ErrorHelper.invalidCredentials(details);

      expect(error.details).toEqual(details);
    });
  });

  describe('unauthorized', () => {
    it('should create unauthorized error with defaults', () => {
      const error = ErrorHelper.unauthorized();

      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(401);
    });

    it('should accept custom code and message', () => {
      const error = ErrorHelper.unauthorized(
        ERROR_CODES.AUTH_TOKEN_EXPIRED,
        'Session expired'
      );

      expect(error.code).toBe(ERROR_CODES.AUTH_TOKEN_EXPIRED);
      expect(error.message).toBe('Session expired');
      expect(error.statusCode).toBe(401);
    });
  });
});

describe('Error Handler - ErrorHelper Validation', () => {
  describe('badRequest', () => {
    it('should create bad request error with defaults', () => {
      const error = ErrorHelper.badRequest();

      expect(error.message).toBe('Bad request');
      expect(error.statusCode).toBe(400);
    });

    it('should accept custom code and message', () => {
      const error = ErrorHelper.badRequest(
        ERROR_CODES.VALIDATION_INVALID_FORMAT,
        'Invalid input'
      );

      expect(error.code).toBe(ERROR_CODES.VALIDATION_INVALID_FORMAT);
      expect(error.message).toBe('Invalid input');
    });
  });

  describe('requiredField', () => {
    it('should create required field error', () => {
      const error = ErrorHelper.requiredField('email');

      expect(error.message).toBe('email is required');
      expect(error.code).toBe(ERROR_CODES.VALIDATION_REQUIRED_FIELD);
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should include additional details', () => {
      const error = ErrorHelper.requiredField('password', { minLength: 8 });

      expect(error.details).toEqual({ field: 'password', minLength: 8 });
    });
  });

  describe('invalidFormat', () => {
    it('should create invalid format error', () => {
      const error = ErrorHelper.invalidFormat('phoneNumber');

      expect(error.message).toBe('Invalid format for phoneNumber');
      expect(error.code).toBe(ERROR_CODES.VALIDATION_INVALID_FORMAT);
      expect(error.statusCode).toBe(400);
      expect(error.details.field).toBe('phoneNumber');
    });

    it('should include expected format', () => {
      const error = ErrorHelper.invalidFormat('date', 'YYYY-MM-DD');

      expect(error.details).toEqual({ field: 'date', expectedFormat: 'YYYY-MM-DD' });
    });

    it('should include additional details', () => {
      const error = ErrorHelper.invalidFormat('email', 'email@domain.com', { provided: 'invalid' });

      expect(error.details).toEqual({
        field: 'email',
        expectedFormat: 'email@domain.com',
        provided: 'invalid'
      });
    });
  });

  describe('constraintViolation', () => {
    it('should create constraint violation error', () => {
      const error = ErrorHelper.constraintViolation('Value must be positive');

      expect(error.message).toBe('Value must be positive');
      expect(error.code).toBe(ERROR_CODES.VALIDATION_CONSTRAINT_VIOLATION);
      expect(error.statusCode).toBe(400);
    });

    it('should include constraint details', () => {
      const details = { constraint: 'unique', field: 'email' };
      const error = ErrorHelper.constraintViolation('Email already exists', details);

      expect(error.details).toEqual(details);
    });
  });
});

describe('Error Handler - ErrorHelper Business Logic', () => {
  describe('notFound', () => {
    it('should create not found error with defaults', () => {
      const error = ErrorHelper.notFound();

      expect(error.message).toBe('Resource not found');
      expect(error.code).toBe(ERROR_CODES.RESOURCE_NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.details).toEqual({ resource: 'Resource', id: null });
    });

    it('should accept custom resource name', () => {
      const error = ErrorHelper.notFound('User');

      expect(error.message).toBe('User not found');
      expect(error.details.resource).toBe('User');
    });

    it('should include resource ID', () => {
      const error = ErrorHelper.notFound('Document', 'doc-123');

      expect(error.message).toBe('Document not found');
      expect(error.details).toEqual({ resource: 'Document', id: 'doc-123' });
    });

    it('should include additional details', () => {
      const error = ErrorHelper.notFound('Order', 'order-456', { userId: 'user-1' });

      expect(error.details).toEqual({
        resource: 'Order',
        id: 'order-456',
        userId: 'user-1'
      });
    });
  });

  describe('alreadyExists', () => {
    it('should create already exists error', () => {
      const error = ErrorHelper.alreadyExists('User', 'user@example.com');

      expect(error.message).toBe('User already exists');
      expect(error.code).toBe(ERROR_CODES.RESOURCE_ALREADY_EXISTS);
      expect(error.statusCode).toBe(409);
      expect(error.details).toEqual({ resource: 'User', identifier: 'user@example.com' });
    });

    it('should include additional details', () => {
      const error = ErrorHelper.alreadyExists('Account', 'acc-123', { field: 'email' });

      expect(error.details).toEqual({
        resource: 'Account',
        identifier: 'acc-123',
        field: 'email'
      });
    });
  });

  describe('operationNotAllowed', () => {
    it('should create operation not allowed error', () => {
      const error = ErrorHelper.operationNotAllowed('delete');

      expect(error.message).toBe("Operation 'delete' not allowed");
      expect(error.code).toBe(ERROR_CODES.OPERATION_NOT_ALLOWED);
      expect(error.statusCode).toBe(403);
      expect(error.details).toEqual({ operation: 'delete', reason: null });
    });

    it('should include reason', () => {
      const error = ErrorHelper.operationNotAllowed('update', 'Resource is locked');

      expect(error.details).toEqual({
        operation: 'update',
        reason: 'Resource is locked'
      });
    });

    it('should include additional details', () => {
      const error = ErrorHelper.operationNotAllowed('share', 'Insufficient permissions', {
        required: 'owner'
      });

      expect(error.details).toEqual({
        operation: 'share',
        reason: 'Insufficient permissions',
        required: 'owner'
      });
    });
  });

  describe('businessRule', () => {
    it('should create business rule violation error', () => {
      const error = ErrorHelper.businessRule('Maximum file size exceeded');

      expect(error.message).toBe('Maximum file size exceeded');
      expect(error.code).toBe(ERROR_CODES.BUSINESS_RULE_VIOLATION);
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ rule: null });
    });

    it('should include rule name', () => {
      const error = ErrorHelper.businessRule('Limit exceeded', 'max_uploads');

      expect(error.details).toEqual({ rule: 'max_uploads' });
    });

    it('should include additional details', () => {
      const error = ErrorHelper.businessRule('Quota exceeded', 'storage_limit', {
        limit: 1000,
        current: 1200
      });

      expect(error.details).toEqual({
        rule: 'storage_limit',
        limit: 1000,
        current: 1200
      });
    });
  });
});

describe('Error Handler - ErrorHelper System Errors', () => {
  describe('database', () => {
    it('should create database error with defaults', () => {
      const error = ErrorHelper.database();

      expect(error.message).toBe('Database operation failed');
      expect(error.code).toBe(ERROR_CODES.DATABASE_ERROR);
      expect(error.statusCode).toBe(500);
    });

    it('should accept custom message', () => {
      const error = ErrorHelper.database('Connection timeout');

      expect(error.message).toBe('Connection timeout');
    });

    it('should include original error', () => {
      const originalError = new Error('Connection refused');
      const error = ErrorHelper.database('DB Error', originalError);

      expect(error.details).toEqual({ originalError: 'Connection refused' });
    });

    it('should include additional details', () => {
      const error = ErrorHelper.database('Query failed', null, { query: 'SELECT *' });

      expect(error.details).toEqual({ originalError: undefined, query: 'SELECT *' });
    });
  });

  describe('externalService', () => {
    it('should create external service error', () => {
      const error = ErrorHelper.externalService('PaymentAPI');

      expect(error.message).toBe('External service error');
      expect(error.code).toBe(ERROR_CODES.EXTERNAL_SERVICE_ERROR);
      expect(error.statusCode).toBe(502);
      expect(error.details).toEqual({ service: 'PaymentAPI' });
    });

    it('should accept custom message', () => {
      const error = ErrorHelper.externalService('EmailService', 'SMTP timeout');

      expect(error.message).toBe('SMTP timeout');
      expect(error.details).toEqual({ service: 'EmailService' });
    });

    it('should include additional details', () => {
      const error = ErrorHelper.externalService('S3', 'Upload failed', { bucket: 'uploads' });

      expect(error.details).toEqual({ service: 'S3', bucket: 'uploads' });
    });
  });

  describe('internal', () => {
    it('should create internal server error', () => {
      const error = ErrorHelper.internal();

      expect(error.message).toBe('Internal server error');
      expect(error.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
      expect(error.statusCode).toBe(500);
    });

    it('should accept custom message', () => {
      const error = ErrorHelper.internal('Unexpected condition');

      expect(error.message).toBe('Unexpected condition');
    });

    it('should include details', () => {
      const error = ErrorHelper.internal('Error', { component: 'processor' });

      expect(error.details).toEqual({ component: 'processor' });
    });
  });

  describe('rateLimit', () => {
    it('should create rate limit error', () => {
      const error = ErrorHelper.rateLimit(100, 60000);

      expect(error.message).toBe('Rate limit exceeded');
      expect(error.code).toBe(ERROR_CODES.RATE_LIMIT_EXCEEDED);
      expect(error.statusCode).toBe(429);
      expect(error.details).toEqual({ limit: 100, windowMs: 60000 });
    });

    it('should include additional details', () => {
      const error = ErrorHelper.rateLimit(50, 3600000, { endpoint: '/api/login' });

      expect(error.details).toEqual({
        limit: 50,
        windowMs: 3600000,
        endpoint: '/api/login'
      });
    });
  });
});

describe('Error Handler - requestIdMiddleware', () => {
  it('should generate and set request ID if not present', () => {
    const req = { headers: {} };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toBeDefined();
    expect(typeof req.requestId).toBe('string');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.requestId);
    expect(next).toHaveBeenCalled();
  });

  it('should use existing x-request-id from headers', () => {
    const existingId = 'existing-request-id-123';
    const req = { headers: { 'x-request-id': existingId } };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toBe(existingId);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', existingId);
    expect(next).toHaveBeenCalled();
  });

  it('should set response header with request ID', () => {
    const req = { headers: {} };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    requestIdMiddleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledTimes(1);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
  });
});

describe('Error Handler - globalErrorHandler', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      requestId: 'test-request-id',
      originalUrl: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
      user: { id: 'user-123' }
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    next = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AppError Handling', () => {
    it('should handle AppError correctly', () => {
      const error = new AppError('Test error', ERROR_CODES.VALIDATION_INVALID_FORMAT, 400);

      globalErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_INVALID_FORMAT,
          message: 'Test error',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should include details in non-production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new AppError('Error with details', ERROR_CODES.DATABASE_ERROR, 500, {
        table: 'users'
      });

      globalErrorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: { table: 'users' }
          })
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new AppError('Error', ERROR_CODES.DATABASE_ERROR, 500, {
        sensitive: 'data'
      });

      globalErrorHandler(error, req, res, next);

      const callArgs = res.json.mock.calls[0][0];
      expect(callArgs.error.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('ValidationError Handling', () => {
    it('should handle ValidationError', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';

      globalErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_INVALID_FORMAT,
          message: 'Validation failed',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
          details: 'Validation failed'
        }
      });
    });

    it('should include validation details if present', () => {
      const error = new Error('Validation error');
      error.name = 'ValidationError';
      error.details = { field: 'email', issue: 'invalid format' };

      globalErrorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: { field: 'email', issue: 'invalid format' }
          })
        })
      );
    });
  });

  describe('PostgreSQL Error Handling', () => {
    it('should handle unique constraint violation (23505)', () => {
      const error = new Error('Duplicate key');
      error.code = '23505';

      globalErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: ERROR_CODES.RESOURCE_ALREADY_EXISTS,
          message: 'Resource already exists',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle other constraint violations (23xxx)', () => {
      const error = new Error('Constraint violation');
      error.code = '23502'; // NOT NULL violation

      globalErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_CONSTRAINT_VIOLATION,
          message: 'Data constraint violation',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('Unexpected Error Handling', () => {
    it('should handle unexpected errors', () => {
      const error = new Error('Unexpected error');

      globalErrorHandler(error, req, res, next);

      expect(console.error).toHaveBeenCalledWith(
        'Unexpected error:',
        expect.objectContaining({
          error: 'Unexpected error',
          requestId: 'test-request-id',
          url: '/api/test',
          method: 'GET',
          user: 'user-123'
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should include error details in non-production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Development error');
      error.stack = 'Error stack trace';

      globalErrorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: {
              message: 'Development error',
              stack: 'Error stack trace'
            }
          })
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should not expose error details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Production error');

      globalErrorHandler(error, req, res, next);

      const callArgs = res.json.mock.calls[0][0];
      expect(callArgs.error.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Security Logging', () => {
    it('should log authentication errors (401)', () => {
      const error = ErrorHelper.tokenInvalid();

      globalErrorHandler(error, req, res, next);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY]')
      );
    });

    it('should log authorization errors (403)', () => {
      const error = ErrorHelper.forbidden();

      globalErrorHandler(error, req, res, next);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY]')
      );
    });

    it('should log system errors (500+)', () => {
      const error = ErrorHelper.database();

      globalErrorHandler(error, req, res, next);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[SYSTEM ERROR]')
      );
    });
  });

  describe('Request ID Generation', () => {
    it('should generate request ID if not present', () => {
      delete req.requestId;
      const error = new Error('Test');

      globalErrorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: expect.any(String)
          })
        })
      );
    });

    it('should use existing request ID', () => {
      req.requestId = 'existing-id';
      const error = new Error('Test');

      globalErrorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: 'existing-id'
          })
        })
      );
    });
  });

  describe('User Context', () => {
    it('should handle anonymous users', () => {
      delete req.user;
      const error = new Error('Anonymous error');

      globalErrorHandler(error, req, res, next);

      expect(console.error).toHaveBeenCalledWith(
        'Unexpected error:',
        expect.objectContaining({
          user: 'anonymous'
        })
      );
    });

    it('should include authenticated user ID', () => {
      req.user = { id: 'user-456' };
      const error = new Error('User error');

      globalErrorHandler(error, req, res, next);

      expect(console.error).toHaveBeenCalledWith(
        'Unexpected error:',
        expect.objectContaining({
          user: 'user-456'
        })
      );
    });
  });
});

describe('Error Handler - asyncHandler', () => {
  it('should wrap async function and handle success', async () => {
    const asyncFn = vi.fn().mockResolvedValue('success');
    const wrapped = asyncHandler(asyncFn);
    const req = {};
    const res = {};
    const next = vi.fn();

    await wrapped(req, res, next);

    expect(asyncFn).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('should catch async errors and pass to next', async () => {
    const error = new Error('Async error');
    const asyncFn = vi.fn().mockRejectedValue(error);
    const wrapped = asyncHandler(asyncFn);
    const req = {};
    const res = {};
    const next = vi.fn();

    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should handle AppError thrown in async function', async () => {
    const error = ErrorHelper.notFound('User', 'user-123');
    const asyncFn = vi.fn().mockRejectedValue(error);
    const wrapped = asyncHandler(asyncFn);
    const req = {};
    const res = {};
    const next = vi.fn();

    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should handle sync function that returns Promise', async () => {
    const syncFn = () => Promise.resolve('result');
    const wrapped = asyncHandler(syncFn);
    const req = {};
    const res = {};
    const next = vi.fn();

    await wrapped(req, res, next);

    expect(next).not.toHaveBeenCalled();
  });
});

describe('Error Handler - notFoundHandler', () => {
  it('should create 404 error for unmatched routes', () => {
    const req = {
      originalUrl: '/api/unknown',
      method: 'GET'
    };
    const res = {};
    const next = vi.fn();

    notFoundHandler(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe(ERROR_CODES.RESOURCE_NOT_FOUND);
    expect(error.message).toBe('Endpoint not found');
  });

  it('should include request details in error', () => {
    const req = {
      originalUrl: '/api/nonexistent',
      method: 'POST'
    };
    const res = {};
    const next = vi.fn();

    notFoundHandler(req, res, next);

    const error = next.mock.calls[0][0];
    expect(error.details).toEqual({
      resource: 'Endpoint',
      id: '/api/nonexistent',
      method: 'POST',
      available_endpoints: 'Check API documentation'
    });
  });

  it('should handle various HTTP methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    const res = {};

    methods.forEach(method => {
      const req = { originalUrl: '/test', method };
      const next = vi.fn();

      notFoundHandler(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.details.method).toBe(method);
    });
  });
});

describe('Error Handler - Default Export', () => {
  it('should export all error handling utilities', async () => {
    const errorHandlerModule = await import('../../src/middleware/errorHandler.js');

    expect(errorHandlerModule.default).toBeDefined();
    expect(errorHandlerModule.default.AppError).toBe(AppError);
    expect(errorHandlerModule.default.ErrorHelper).toBe(ErrorHelper);
    expect(errorHandlerModule.default.ERROR_CODES).toBe(ERROR_CODES);
    expect(errorHandlerModule.default.globalErrorHandler).toBe(globalErrorHandler);
    expect(errorHandlerModule.default.requestIdMiddleware).toBe(requestIdMiddleware);
    expect(errorHandlerModule.default.asyncHandler).toBe(asyncHandler);
    expect(errorHandlerModule.default.notFoundHandler).toBe(notFoundHandler);
  });
});
