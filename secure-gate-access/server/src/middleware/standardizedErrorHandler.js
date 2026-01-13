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

import loggingService from '../services/loggingService.js';

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
  const errorResponse = {
    success: false,
    message,
    error: {
      code: errorCode
    },
    timestamp: new Date().toISOString()
  };
  
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
  
  // Add request ID if available
  if (req.requestId) {
    errorResponse.error.requestId = req.requestId;
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
  errorHandler,
  notFoundHandler,
  asyncHandler
};
