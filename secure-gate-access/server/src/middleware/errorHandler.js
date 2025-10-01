// Global error handling middleware and utilities
import { v4 as uuidv4 } from 'uuid';

/**
 * Standardized error codes for the application
 */
export const ERROR_CODES = {
  // Authentication & Authorization
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',

  // Validation
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_CONSTRAINT_VIOLATION: 'VALIDATION_CONSTRAINT_VIOLATION',

  // Business Logic
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',

  // System
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};

/**
 * Custom Application Error class
 */
export class AppError extends Error {
  constructor(message, code = ERROR_CODES.INTERNAL_SERVER_ERROR, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Marks as expected/handled error
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Helper functions for common error types
 */
export const ErrorHelper = {
  // Authentication errors
  tokenMissing: (details = null) =>
    new AppError('Authentication token required', ERROR_CODES.AUTH_TOKEN_MISSING, 401, details),

  tokenInvalid: (details = null) =>
    new AppError('Invalid authentication token', ERROR_CODES.AUTH_TOKEN_INVALID, 401, details),

  tokenExpired: (details = null) =>
    new AppError('Authentication token expired', ERROR_CODES.AUTH_TOKEN_EXPIRED, 401, details),

  forbidden: (message = 'Insufficient permissions', details = null) =>
    new AppError(message, ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS, 403, details),

  invalidCredentials: (details = null) =>
    new AppError('Invalid credentials', ERROR_CODES.AUTH_INVALID_CREDENTIALS, 401, details),

  unauthorized: (code = ERROR_CODES.INVALID_CREDENTIALS, message = 'Unauthorized', details = null) =>
    new AppError(message, code, 401, details),

  // Validation errors
  badRequest: (code = ERROR_CODES.VALIDATION_ERROR, message = 'Bad request', details = null) =>
    new AppError(message, code, 400, details),

  requiredField: (fieldName, details = null) =>
    new AppError(`${fieldName} is required`, ERROR_CODES.VALIDATION_REQUIRED_FIELD, 400, { field: fieldName, ...details }),

  invalidFormat: (fieldName, expectedFormat = null, details = null) =>
    new AppError(`Invalid format for ${fieldName}`, ERROR_CODES.VALIDATION_INVALID_FORMAT, 400,
      { field: fieldName, expectedFormat, ...details }),

  constraintViolation: (message, details = null) =>
    new AppError(message, ERROR_CODES.VALIDATION_CONSTRAINT_VIOLATION, 400, details),

  // Business logic errors
  notFound: (resource = 'Resource', id = null, details = null) =>
    new AppError(`${resource} not found`, ERROR_CODES.RESOURCE_NOT_FOUND, 404, { resource, id, ...details }),

  alreadyExists: (resource = 'Resource', identifier = null, details = null) =>
    new AppError(`${resource} already exists`, ERROR_CODES.RESOURCE_ALREADY_EXISTS, 409,
      { resource, identifier, ...details }),

  operationNotAllowed: (operation, reason = null, details = null) =>
    new AppError(`Operation '${operation}' not allowed`, ERROR_CODES.OPERATION_NOT_ALLOWED, 403,
      { operation, reason, ...details }),

  businessRule: (message, rule = null, details = null) =>
    new AppError(message, ERROR_CODES.BUSINESS_RULE_VIOLATION, 400, { rule, ...details }),

  // System errors
  database: (message = 'Database operation failed', originalError = null, details = null) =>
    new AppError(message, ERROR_CODES.DATABASE_ERROR, 500, { originalError: originalError?.message, ...details }),

  externalService: (service, message = 'External service error', details = null) =>
    new AppError(message, ERROR_CODES.EXTERNAL_SERVICE_ERROR, 502, { service, ...details }),

  internal: (message = 'Internal server error', details = null) =>
    new AppError(message, ERROR_CODES.INTERNAL_SERVER_ERROR, 500, details),

  rateLimit: (limit, windowMs, details = null) =>
    new AppError('Rate limit exceeded', ERROR_CODES.RATE_LIMIT_EXCEEDED, 429, { limit, windowMs, ...details })
};

/**
 * Request ID generator middleware
 */
export const requestIdMiddleware = (req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

/**
 * Global error handler middleware
 */
export const globalErrorHandler = (err, req, res, next) => {
  // Generate request ID if not present
  const requestId = req.requestId || uuidv4();

  // Default error response structure
  const errorResponse = {
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      requestId,
      timestamp: new Date().toISOString()
    }
  };

  let statusCode = 500;

  // Handle different error types
  if (err instanceof AppError) {
    // Operational/expected errors
    statusCode = err.statusCode;
    errorResponse.error.code = err.code;
    errorResponse.error.message = err.message;

    if (err.details && process.env.NODE_ENV !== 'production') {
      errorResponse.error.details = err.details;
    }
  } else if (err.name === 'ValidationError') {
    // Mongoose/Joi validation errors
    statusCode = 400;
    errorResponse.error.code = ERROR_CODES.VALIDATION_INVALID_FORMAT;
    errorResponse.error.message = 'Validation failed';
    errorResponse.error.details = err.details || err.message;
  } else if (err.code === '23505') {
    // PostgreSQL unique constraint violation
    statusCode = 409;
    errorResponse.error.code = ERROR_CODES.RESOURCE_ALREADY_EXISTS;
    errorResponse.error.message = 'Resource already exists';
  } else if (err.code?.startsWith('23')) {
    // Other PostgreSQL constraint violations
    statusCode = 400;
    errorResponse.error.code = ERROR_CODES.VALIDATION_CONSTRAINT_VIOLATION;
    errorResponse.error.message = 'Data constraint violation';
  } else {
    // Unexpected errors
    console.error('Unexpected error:', {
      error: err.message,
      stack: err.stack,
      requestId,
      url: req.originalUrl,
      method: req.method,
      user: req.user?.id || 'anonymous'
    });

    // Don't expose internal error details in production
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.error.details = {
        message: err.message,
        stack: err.stack
      };
    }
  }

  // Security logging for authentication/authorization errors
  if (statusCode === 401 || statusCode === 403) {
    console.log(`[SECURITY] ${errorResponse.error.code} - ${req.method} ${req.originalUrl} - IP: ${req.ip} - User: ${req.user?.id || 'anonymous'} - Request ID: ${requestId}`);
  }

  // Performance logging for errors that might indicate system issues
  if (statusCode >= 500) {
    console.error(`[SYSTEM ERROR] ${errorResponse.error.code} - ${req.method} ${req.originalUrl} - Request ID: ${requestId}`);
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper utility
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for unmatched routes
 */
export const notFoundHandler = (req, res, next) => {
  const error = ErrorHelper.notFound('Endpoint', req.originalUrl, {
    method: req.method,
    available_endpoints: 'Check API documentation'
  });
  next(error);
};

export default {
  AppError,
  ErrorHelper,
  ERROR_CODES,
  globalErrorHandler,
  requestIdMiddleware,
  asyncHandler,
  notFoundHandler
};