import { respondError } from './respond.js';

/**
 * Handle database transaction errors with consistent response format
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 * @param {string} operation - Operation description for logging
 * @param {number} statusCode - HTTP status code (default: 500)
 * @returns {Object} Error response
 */
export function handleTransactionError(res, error, operation = 'Database operation', statusCode = 500) {
  console.error(`${operation} failed:`, error.message);

  // Don't expose internal database errors to client
  const message = process.env.NODE_ENV === 'development'
    ? `${operation} failed: ${error.message}`
    : `${operation} failed`;

  return respondError(res, statusCode, message);
}

/**
 * Handle validation errors with consistent response format
 * @param {Object} res - Express response object
 * @param {string} message - Validation error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @returns {Object} Error response
 */
export function handleValidationError(res, message, statusCode = 400) {
  return respondError(res, statusCode, message);
}

/**
 * Handle not found errors with consistent response format
 * @param {Object} res - Express response object
 * @param {string} resource - Resource type that was not found
 * @returns {Object} Error response
 */
export function handleNotFoundError(res, resource = 'Resource') {
  return respondError(res, 404, `${resource} not found`);
}

/**
 * Handle forbidden errors with consistent response format
 * @param {Object} res - Express response object
 * @param {string} message - Forbidden error message
 * @returns {Object} Error response
 */
export function handleForbiddenError(res, message = 'Access denied') {
  return respondError(res, 403, message);
}

/**
 * Handle conflict errors with consistent response format
 * @param {Object} res - Express response object
 * @param {string} message - Conflict error message
 * @returns {Object} Error response
 */
export function handleConflictError(res, message = 'Conflict occurred') {
  return respondError(res, 409, message);
}

export default {
  handleTransactionError,
  handleValidationError,
  handleNotFoundError,
  handleForbiddenError,
  handleConflictError
};
