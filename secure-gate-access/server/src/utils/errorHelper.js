/**
 * Error handling utilities for controllers
 */

import { respondError } from './respond.js';

/**
 * Handle transaction errors
 */
export function handleTransactionError(res, error, context = 'Transaction') {
  console.error(`[${context}] Transaction error:`, error.message);
  return respondError(res, 500, `${context} failed: ${error.message}`);
}

/**
 * Handle validation errors
 */
export function handleValidationError(res, message) {
  return respondError(res, 400, message);
}

/**
 * Handle not found errors
 */
export function handleNotFoundError(res, entity = 'Resource') {
  return respondError(res, 404, `${entity} not found`);
}

/**
 * Handle forbidden errors
 */
export function handleForbiddenError(res, message = 'Access denied') {
  return respondError(res, 403, message);
}

export default {
  handleTransactionError,
  handleValidationError,
  handleNotFoundError,
  handleForbiddenError
};
