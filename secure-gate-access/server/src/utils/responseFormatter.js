/**
 * Standardized Response Formatter
 * 
 * This module provides utilities for creating consistent API responses
 * across all endpoints, ensuring frontend compatibility and clear error messages.
 */

/**
 * Standardized success response helpers
 */
export const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

export const createdResponse = (res, data, message = 'Resource created successfully') => {
  successResponse(res, data, message, 201);
};

export const noContentResponse = (res, message = 'Operation successful') => {
  res.status(204).send();
};

/**
 * Standardized error response helpers
 */
export const errorResponse = (res, message, errorCode, statusCode = 400, details = null) => {
  const response = {
    success: false,
    message,
    error: {
      code: errorCode
    },
    timestamp: new Date().toISOString()
  };

  // Add details only in development
  if (details && process.env.NODE_ENV === 'development') {
    response.error.details = details;
  }

  res.status(statusCode).json(response);
};

export const validationErrorResponse = (res, message, details = null) => {
  errorResponse(res, message, 'VALIDATION_ERROR', 400, details);
};

export const notFoundResponse = (res, message = 'Resource not found') => {
  errorResponse(res, message, 'NOT_FOUND', 404);
};

export const unauthorizedResponse = (res, message = 'Unauthorized') => {
  errorResponse(res, message, 'UNAUTHORIZED', 401);
};

export const forbiddenResponse = (res, message = 'Forbidden') => {
  errorResponse(res, message, 'FORBIDDEN', 403);
};

export const conflictResponse = (res, message = 'Resource already exists') => {
  errorResponse(res, message, 'CONFLICT', 409);
};

export const internalErrorResponse = (res, message = 'Internal server error') => {
  errorResponse(res, message, 'INTERNAL_ERROR', 500);
};

export default {
  successResponse,
  createdResponse,
  noContentResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  conflictResponse,
  internalErrorResponse
};
