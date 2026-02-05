/**
 * Standardized Error Handler Middleware
 * 
 * This module provides a centralized error handling system that ensures
 * all API responses follow a consistent format for both errors and success.
 * 
 * Error Format:
 * {
 *   "success": false,
 *   "message": "User-friendly message",
 *   "error": {
 *     "code": "ERROR_CODE",
 *     "details": {}
 *   },
 *   "timestamp": "2025-10-03T10:30:00Z"
 * }
 * 
 * Success Format:
 * {
 *   "success": true,
 *   "message": "Operation successful",
 *   "data": {},
 *   "timestamp": "2025-10-03T10:30:00Z"
 * }
 */

import { v4 as uuidv4 } from 'uuid';
import loggingService from '../services/loggingService.js';

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
  VALIDATION_ERROR: 'VALIDATION_ERROR',

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
 * Custom error class for operational errors
 */
export class AppError extends Error {
  constructor(message, statusCode, errorCode = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Helper functions for common error types
 */
export const ErrorHelper = {
  // Authentication errors
  tokenMissing: (details = null) =>
    new AppError('Authentication token required', 401, ERROR_CODES.AUTH_TOKEN_MISSING, details),

  tokenInvalid: (details = null) =>
    new AppError('Invalid authentication token', 401, ERROR_CODES.AUTH_TOKEN_INVALID, details),

  tokenExpired: (details = null) =>
    new AppError('Authentication token expired', 401, ERROR_CODES.AUTH_TOKEN_EXPIRED, details),

  forbidden: (message = 'Insufficient permissions', details = null) =>
    new AppError(message, 403, ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS, details),

  invalidCredentials: (details = null) =>
    new AppError('Invalid credentials', 401, ERROR_CODES.AUTH_INVALID_CREDENTIALS, details),

  unauthorized: (code = ERROR_CODES.AUTH_INVALID_CREDENTIALS, message = 'Unauthorized', details = null) =>
    new AppError(message, 401, code, details),

  // Validation errors
  badRequest: (code = ERROR_CODES.VALIDATION_ERROR, message = 'Bad request', details = null) =>
    new AppError(message, 400, code, details),

  requiredField: (fieldName, details = null) =>
    new AppError(`${fieldName} is required`, 400, ERROR_CODES.VALIDATION_REQUIRED_FIELD, { field: fieldName, ...details }),

  invalidFormat: (fieldName, expectedFormat = null, details = null) =>
    new AppError(`Invalid format for ${fieldName}`, 400, ERROR_CODES.VALIDATION_INVALID_FORMAT,
      { field: fieldName, expectedFormat, ...details }),

  constraintViolation: (message, details = null) =>
    new AppError(message, 400, ERROR_CODES.VALIDATION_CONSTRAINT_VIOLATION, details),

  // Business logic errors
  notFound: (resource = 'Resource', id = null, details = null) =>
    new AppError(`${resource} not found`, 404, ERROR_CODES.RESOURCE_NOT_FOUND, { resource, id, ...details }),

  alreadyExists: (resource = 'Resource', identifier = null, details = null) =>
    new AppError(`${resource} already exists`, 409, ERROR_CODES.RESOURCE_ALREADY_EXISTS,
      { resource, identifier, ...details }),

  operationNotAllowed: (operation, reason = null, details = null) =>
    new AppError(`Operation '${operation}' not allowed`, 403, ERROR_CODES.OPERATION_NOT_ALLOWED,
      { operation, reason, ...details }),

  businessRule: (message, rule = null, details = null) =>
    new AppError(message, 400, ERROR_CODES.BUSINESS_RULE_VIOLATION, { rule, ...details }),

  // System errors
  database: (message = 'Database operation failed', originalError = null, details = null) =>
    new AppError(message, 500, ERROR_CODES.DATABASE_ERROR, { originalError: originalError?.message, ...details }),

  externalService: (service, message = 'External service error', details = null) =>
    new AppError(message, 502, ERROR_CODES.EXTERNAL_SERVICE_ERROR, { service, ...details }),

  internal: (message = 'Internal server error', details = null) =>
    new AppError(message, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, details),

  rateLimit: (limit, windowMs, details = null) =>
    new AppError('Rate limit exceeded', 429, ERROR_CODES.RATE_LIMIT_EXCEEDED, { limit, windowMs, ...details })
};

/**
 * Request ID generator middleware
 */
export const requestIdMiddleware = (req, res, next) => {
  const existingCorrelationId = req.correlationId || req.requestId || req.id;
  const headerRequestId = req.headers['x-request-id'];
  const headerCorrelationId = req.headers['x-correlation-id'];
  const requestId = existingCorrelationId || headerCorrelationId || headerRequestId || uuidv4();

  req.requestId = requestId;
  req.correlationId = requestId;
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Correlation-ID', requestId);
  next();
};

export const buildErrorResponse = ({ message, errorCode = 'INTERNAL_ERROR', details = null, req = null }) => {
  const errorResponse = {
    success: false,
    message,
    error: {
      code: errorCode
    },
    timestamp: new Date().toISOString()
  };

  if (details) {
    errorResponse.error.details = details;
  }

  if (req?.requestId) {
    errorResponse.error.requestId = req.requestId;
  }

  return errorResponse;
};

/**
 * Global error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errorCode = err.errorCode || 'INTERNAL_ERROR';
  
  // Handle specific database errors
  if (err.code === '23505') { // PostgreSQL unique constraint
    statusCode = 409;
    errorCode = 'DUPLICATE_ENTRY';
    message = 'This record already exists';
  }
  
  if (err.code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    errorCode = 'INVALID_REFERENCE';
    message = 'Referenced record does not exist';
  }
  
  if (err.code === '22P02') { // PostgreSQL invalid text representation
    statusCode = 400;
    errorCode = 'INVALID_INPUT';
    message = 'Invalid data format';
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token expired';
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation failed';
  }
  
  // Handle multer errors (file upload)
  if (err.name === 'MulterError') {
    statusCode = 400;
    errorCode = 'FILE_UPLOAD_ERROR';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large';
    } else {
      message = 'File upload failed';
    }
  }
  
  // Log error (but not operational errors in production)
  // In development and test, log detailed error information
  const shouldLogError = !err.isOperational ||
                        (process.env.NODE_ENV === 'development' && statusCode >= 500) ||
                        (process.env.NODE_ENV === 'test' && statusCode >= 500);

  if (shouldLogError) {
    console.error('❌ Error:', {
      message: err.message,
      code: err.code,
      statusCode,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      user: req.user?.id,
      requestId: req.requestId
    });
    
  }

  const securityCodes = new Set([
    'AUTH_TOKEN_EXPIRED',
    'AUTH_TOKEN_INVALID',
    'AUTH_TOKEN_MISSING',
    'AUTH_USER_NOT_FOUND',
    'AUTH_REQUIRED',
    'AUTH_FORBIDDEN',
    'ESTATE_REQUIRED',
    'ESTATE_INVALID',
    'CSRF_TOKEN_MISSING',
    'CSRF_VALIDATION_FAILED'
  ]);

  if (securityCodes.has(errorCode)) {
    loggingService.logSecurity('warn', 'Security error response', {
      code: errorCode,
      statusCode,
      path: req.originalUrl,
      method: req.method,
      userId: req.user?.id ?? null,
      estateId: req.user?.estate_id ?? null,
      requestId: req.requestId
    });
  }
  
  // Build error response
  const errorResponse = buildErrorResponse({
    message,
    errorCode,
    req
  });
  
  // SECURITY FIX: Never expose stack traces in API responses
  // Stack traces are logged to console, not sent to client
  // Only include safe, operational details if provided
  if (err.details && err.isOperational) {
    // Remove any sensitive information from details
    const safeDetails = { ...err.details };
    delete safeDetails.stack;
    delete safeDetails.originalError;
    if (Object.keys(safeDetails).length > 0) {
      errorResponse.error.details = safeDetails;
    }
  }
  
  // Send JSON response (never HTML)
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 handler (for unmatched routes)
 */
export const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    'NOT_FOUND'
  );
  next(error);
};

/**
 * Async wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default {
  AppError,
  ErrorHelper,
  ERROR_CODES,
  buildErrorResponse,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  requestIdMiddleware
};
