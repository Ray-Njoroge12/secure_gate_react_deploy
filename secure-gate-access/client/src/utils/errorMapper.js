// client/src/utils/errorMapper.js
// Maps HTTP status codes and error messages to user-friendly text
import logger from './logger';

export const validateResponse = (res, payload = null) => {
  const status = res?.status ?? 0;
  const ok = typeof res?.ok === 'boolean' ? res.ok : status >= 200 && status < 300;

  if (payload && typeof payload === 'object' && payload.success === false) {
    return {
      ok: false,
      status,
      message: payload.message || payload.error || 'Request failed',
      payload
    };
  }

  return {
    ok,
    status,
    message: payload?.message || null,
    payload
  };
};

export const mapErrorMessage = (error) => {
  if (!error) return 'An unexpected error occurred. Please try again.';

  if (typeof error.userMessage === 'string' && error.userMessage.trim()) {
    return error.userMessage;
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
};

/**
 * Maps HTTP status codes to user-friendly messages
 * @param {number} status - HTTP status code
 * @param {Object} payload - Optional error payload from server
 * @returns {string} User-friendly error message
 */
export const mapStatusToMessage = (status, payload = null) => {
  const errorMessages = {
    400: 'Invalid request. Please check your input and try again.',
    401: 'Authentication required. Please login to continue.',
    403: 'Access denied. You don\'t have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'No slots remaining or conflict with existing data.',
    410: 'Invitation has expired and is no longer valid.',
    422: 'Invalid input. Please check your data and try again.',
    429: 'Too many attempts. Please try again later.',
    500: 'Server error. Please try again later.',
    502: 'Service temporarily unavailable. Please try again later.',
    503: 'Service temporarily unavailable. Please try again later.',
    504: 'Request timeout. Please try again later.'
  };

  // Check for specific error messages from server
  if (payload?.message) {
    const message = payload.message.toLowerCase();
    
    // Map common server messages to friendly text
    if (message.includes('expired')) return 'This invitation has expired.';
    if (message.includes('not found')) return 'The requested item was not found.';
    if (message.includes('unauthorized')) return 'Please login to continue.';
    if (message.includes('forbidden')) return 'You don\'t have permission for this action.';
    if (message.includes('duplicate')) return 'This item already exists.';
    if (message.includes('invalid otp')) return 'Invalid verification code. Please try again.';
    if (message.includes('rate limit')) return 'Too many attempts. Please wait before trying again.';
    
    // Return the custom message if it doesn't match any patterns
    return payload.message;
  }

  return errorMessages[status] || 'An unexpected error occurred. Please try again.';
};

/**
 * Enhanced error handler that logs details and returns user message
 * @param {Error} error - Error object from API call
 * @param {string} context - Context where error occurred (for logging)
 * @returns {string} User-friendly error message
 */
export const handleApiError = (error, context = 'API call') => {
  // Handle null/undefined errors
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  // Log detailed error for debugging
  logger.error(`${context} error`, error, {
    context,
    status: error.status,
    response: error.response
  });

  // Return user-friendly message
  if (error.status) {
    return mapStatusToMessage(error.status, error.response?.payload);
  }

  // Handle network/fetch errors
  if (error.message?.includes('fetch') || error.message?.includes('Network')) {
    return 'Network error. Please check your connection and try again.';
  }

  // Handle timeout errors
  if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
    return 'Request timeout. Please try again.';
  }

  return 'An unexpected error occurred. Please try again.';
};

/**
 * Success message mapper for positive actions
 * @param {string} action - The action that succeeded
 * @returns {string} User-friendly success message
 */
export const mapSuccessMessage = (action) => {
  const successMessages = {
    'visitor_created': 'Visitor registered successfully!',
    'invite_sent': 'Invitation sent to visitor.',
    'invite_completed': 'Welcome! Your visit has been confirmed.',
    'otp_verified': 'Verification successful!',
    'pass_generated': 'Pass generated successfully.',
    'bulk_invite_created': 'Bulk invitation created successfully.',
    'checkin_success': 'Check-in recorded successfully.',
    'checkout_success': 'Check-out recorded successfully.'
  };

  return successMessages[action] || 'Operation completed successfully!';
};

/**
 * Validation error formatter
 * @param {Object} errors - Validation errors object
 * @returns {string} Formatted error message
 */
export const formatValidationErrors = (errors) => {
  if (!errors || typeof errors !== 'object') {
    return 'Please fix the errors and try again.';
  }

  const errorList = Object.entries(errors)
    .map(([field, message]) => `${field}: ${message}`)
    .join(', ');

  return errorList || 'Please fix the errors and try again.';
};