/**
 * @fileoverview Enhanced error handling utilities for Secure Gate Access
 * @description Standardized error handling, retry mechanisms, and error formatting
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import { handleApiError } from './errorMapper';
import logger from './logger';

/**
 * Error types and their configurations
 */
export const ERROR_TYPES = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  NOT_FOUND: 'not_found',
  SERVER: 'server',
  CLIENT: 'client',
  UNKNOWN: 'unknown'
};

/**
 * Error severity levels
 */
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Retry configuration for different error types
 */
export const RETRY_CONFIG = {
  [ERROR_TYPES.NETWORK]: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  },
  [ERROR_TYPES.SERVER]: {
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 15000,
    backoffMultiplier: 2
  },
  [ERROR_TYPES.AUTHENTICATION]: {
    maxRetries: 1,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 1.5
  },
  [ERROR_TYPES.VALIDATION]: {
    maxRetries: 0,
    baseDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 1
  }
};

/**
 * Enhanced error handler with retry mechanisms
 */
export class EnhancedErrorHandler {
  constructor(options = {}) {
    this.defaultRetryConfig = options.retryConfig || RETRY_CONFIG;
    this.logger = options.logger || logger;
    this.onRetry = options.onRetry || null;
    this.onMaxRetriesReached = options.onMaxRetriesReached || null;
  }

  /**
   * Handle error with retry logic
   * @param {Function} operation - Function to retry
   * @param {Object} errorContext - Error context information
   * @param {Object} retryOptions - Retry configuration
   * @returns {Promise} Promise that resolves with operation result or rejects with final error
   */
  async handleWithRetry(operation, errorContext = {}, retryOptions = {}) {
    const errorType = this.categorizeError(errorContext.error);
    const config = { ...this.defaultRetryConfig[errorType], ...retryOptions };
    
    let lastError = errorContext.error;
    let attempt = 0;

    while (attempt <= config.maxRetries) {
      try {
        if (attempt > 0) {
          const delay = this.calculateDelay(attempt, config);
          await this.delay(delay);
          
          if (this.onRetry) {
            this.onRetry(attempt, lastError, errorContext);
          }
        }

        const result = await operation();
        return result;
      } catch (error) {
        lastError = error;
        attempt++;

        if (attempt > config.maxRetries) {
          if (this.onMaxRetriesReached) {
            this.onMaxRetriesReached(lastError, errorContext, attempt - 1);
          }
          throw lastError;
        }

        // Don't retry certain error types
        if (this.shouldNotRetry(error)) {
          throw error;
        }
      }
    }

    throw lastError;
  }

  /**
   * Categorize error type
   * @param {Error} error - Error object
   * @returns {string} Error type
   */
  categorizeError(error) {
    if (!error) return ERROR_TYPES.UNKNOWN;

    // Network errors
    if (error.name === 'NetworkError' || 
        error.message?.includes('network') ||
        error.message?.includes('fetch') ||
        error.code === 'NETWORK_ERROR') {
      return ERROR_TYPES.NETWORK;
    }

    // HTTP status based categorization
    if (error.response?.status) {
      const status = error.response.status;
      
      if (status === 401) return ERROR_TYPES.AUTHENTICATION;
      if (status === 403) return ERROR_TYPES.AUTHORIZATION;
      if (status === 404) return ERROR_TYPES.NOT_FOUND;
      if (status >= 400 && status < 500) return ERROR_TYPES.CLIENT;
      if (status >= 500) return ERROR_TYPES.SERVER;
    }

    // Validation errors
    if (error.name === 'ValidationError' ||
        error.message?.includes('validation') ||
        error.message?.includes('invalid') ||
        error.message?.includes('required')) {
      return ERROR_TYPES.VALIDATION;
    }

    return ERROR_TYPES.UNKNOWN;
  }

  /**
   * Determine if error should not be retried
   * @param {Error} error - Error object
   * @returns {boolean} True if error should not be retried
   */
  shouldNotRetry(error) {
    // Don't retry validation errors
    if (this.categorizeError(error) === ERROR_TYPES.VALIDATION) {
      return true;
    }

    // Don't retry authentication errors (except network issues)
    if (error.response?.status === 401 && this.categorizeError(error) !== ERROR_TYPES.NETWORK) {
      return true;
    }

    // Don't retry authorization errors
    if (error.response?.status === 403) {
      return true;
    }

    // Don't retry client errors (4xx except 408, 429)
    if (error.response?.status >= 400 && error.response.status < 500) {
      const retryableClientErrors = [408, 429]; // Request timeout, Too many requests
      return !retryableClientErrors.includes(error.response.status);
    }

    return false;
  }

  /**
   * Calculate delay for retry attempt
   * @param {number} attempt - Current attempt number
   * @param {Object} config - Retry configuration
   * @returns {number} Delay in milliseconds
   */
  calculateDelay(attempt, config) {
    const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    return Math.min(delay, config.maxDelay);
  }

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create standardized error object
 * @param {Error|string} error - Original error
 * @param {Object} context - Error context
 * @param {Object} options - Error options
 * @returns {Object} Standardized error object
 */
export function createStandardError(error, context = {}, options = {}) {
  const errorType = categorizeErrorType(error);
  const severity = determineErrorSeverity(error, errorType);
  
  return {
    id: options.id || generateErrorId(),
    message: extractErrorMessage(error),
    type: errorType,
    severity,
    context: {
      component: context.component || 'Unknown',
      action: context.action || 'Unknown',
      timestamp: new Date().toISOString(),
      ...context
    },
    originalError: error,
    userMessage: options.userMessage || getUserFriendlyMessage(error, errorType),
    technicalDetails: options.technicalDetails || extractTechnicalDetails(error),
    recoveryActions: getRecoveryActions(errorType, error),
    retryable: isRetryable(error, errorType),
    ...options
  };
}

/**
 * Categorize error type
 * @param {Error|string} error - Error object or message
 * @returns {string} Error type
 */
function categorizeErrorType(error) {
  if (typeof error === 'string') {
    return ERROR_TYPES.UNKNOWN;
  }

  if (error?.response?.status) {
    const status = error.response.status;
    if (status === 401) return ERROR_TYPES.AUTHENTICATION;
    if (status === 403) return ERROR_TYPES.AUTHORIZATION;
    if (status === 404) return ERROR_TYPES.NOT_FOUND;
    if (status >= 400 && status < 500) return ERROR_TYPES.CLIENT;
    if (status >= 500) return ERROR_TYPES.SERVER;
  }

  if (error?.name === 'NetworkError' || error?.message?.includes('network')) {
    return ERROR_TYPES.NETWORK;
  }

  if (error?.name === 'ValidationError' || error?.message?.includes('validation')) {
    return ERROR_TYPES.VALIDATION;
  }

  return ERROR_TYPES.UNKNOWN;
}

/**
 * Determine error severity
 * @param {Error} error - Error object
 * @param {string} errorType - Error type
 * @returns {string} Error severity
 */
function determineErrorSeverity(error, errorType) {
  // Critical errors
  if (errorType === ERROR_TYPES.AUTHENTICATION || 
      errorType === ERROR_TYPES.SERVER ||
      error?.response?.status >= 500) {
    return ERROR_SEVERITY.CRITICAL;
  }

  // High severity errors
  if (errorType === ERROR_TYPES.AUTHORIZATION ||
      error?.response?.status === 404) {
    return ERROR_SEVERITY.HIGH;
  }

  // Medium severity errors
  if (errorType === ERROR_TYPES.CLIENT ||
      errorType === ERROR_TYPES.VALIDATION) {
    return ERROR_SEVERITY.MEDIUM;
  }

  // Low severity errors
  if (errorType === ERROR_TYPES.NETWORK) {
    return ERROR_SEVERITY.LOW;
  }

  return ERROR_SEVERITY.MEDIUM;
}

/**
 * Extract error message
 * @param {Error|string} error - Error object or message
 * @returns {string} Error message
 */
function extractErrorMessage(error) {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.message) {
    return error.message;
  }

  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Get user-friendly error message
 * @param {Error} error - Error object
 * @param {string} errorType - Error type
 * @returns {string} User-friendly message
 */
function getUserFriendlyMessage(error, errorType) {
  const messages = {
    [ERROR_TYPES.NETWORK]: 'Unable to connect to the server. Please check your internet connection and try again.',
    [ERROR_TYPES.AUTHENTICATION]: 'Your session has expired. Please log in again.',
    [ERROR_TYPES.AUTHORIZATION]: 'You do not have permission to perform this action.',
    [ERROR_TYPES.NOT_FOUND]: 'The requested resource was not found.',
    [ERROR_TYPES.VALIDATION]: 'Please check your input and try again.',
    [ERROR_TYPES.SERVER]: 'The server is experiencing issues. Please try again later.',
    [ERROR_TYPES.CLIENT]: 'There was an issue with your request. Please try again.',
    [ERROR_TYPES.UNKNOWN]: 'An unexpected error occurred. Please try again.'
  };

  return messages[errorType] || messages[ERROR_TYPES.UNKNOWN];
}

/**
 * Extract technical details from error
 * @param {Error} error - Error object
 * @returns {Object} Technical details
 */
function extractTechnicalDetails(error) {
  const details = {
    name: error?.name,
    stack: error?.stack,
    timestamp: new Date().toISOString()
  };

  if (error?.response) {
    details.response = {
      status: error.response.status,
      statusText: error.response.statusText,
      data: error.response.data,
      headers: error.response.headers
    };
  }

  if (error?.config) {
    details.request = {
      url: error.config.url,
      method: error.config.method,
      headers: error.config.headers
    };
  }

  return details;
}

/**
 * Get recovery actions for error type
 * @param {string} errorType - Error type
 * @param {Error} error - Error object
 * @returns {Array} Recovery actions
 */
function getRecoveryActions(errorType, error) {
  const actions = [];

  switch (errorType) {
    case ERROR_TYPES.NETWORK:
      actions.push({
        label: 'Retry',
        action: 'retry',
        primary: true
      });
      actions.push({
        label: 'Check Connection',
        action: 'check_connection',
        primary: false
      });
      break;

    case ERROR_TYPES.AUTHENTICATION:
      actions.push({
        label: 'Login Again',
        action: 'login',
        primary: true
      });
      break;

    case ERROR_TYPES.SERVER:
      actions.push({
        label: 'Retry',
        action: 'retry',
        primary: true
      });
      actions.push({
        label: 'Report Issue',
        action: 'report',
        primary: false
      });
      break;

    case ERROR_TYPES.VALIDATION:
      actions.push({
        label: 'Fix Input',
        action: 'fix_input',
        primary: true
      });
      break;

    default:
      actions.push({
        label: 'Retry',
        action: 'retry',
        primary: true
      });
  }

  return actions;
}

/**
 * Check if error is retryable
 * @param {Error} error - Error object
 * @param {string} errorType - Error type
 * @returns {boolean} True if error is retryable
 */
function isRetryable(error, errorType) {
  const retryableTypes = [ERROR_TYPES.NETWORK, ERROR_TYPES.SERVER];
  return retryableTypes.includes(errorType);
}

/**
 * Generate unique error ID
 * @returns {string} Error ID
 */
function generateErrorId() {
  return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create error handler instance
 * @param {Object} options - Handler options
 * @returns {EnhancedErrorHandler} Error handler instance
 */
export function createErrorHandler(options = {}) {
  return new EnhancedErrorHandler(options);
}

/**
 * Default error handler instance
 */
export const defaultErrorHandler = createErrorHandler();

/**
 * Helper function to determine if an error should not be retried
 * @param {Error} error - Error object
 * @returns {boolean} True if error should not be retried
 */
function shouldNotRetry(error) {
  // Don't retry validation errors
  if (error.name === 'ValidationError' || error.message?.includes('validation')) {
    return true;
  }
  
  // Don't retry authentication errors (401)
  if (error.response?.status === 401) {
    return true;
  }
  
  // Don't retry client errors (400-499) except for 408, 429, 500-599
  if (error.response?.status >= 400 && error.response?.status < 500) {
    const retryableClientErrors = [408, 429]; // Request timeout, Too many requests
    if (!retryableClientErrors.includes(error.response.status)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Retry operation with exponential backoff
 * @param {Function} operation - Function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Promise that resolves with operation result
 */
export async function retryOperation(operation, options = {}) {
  const config = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    ...options
  };

  let lastError;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if error should not be retried
      if (shouldNotRetry(error)) {
        throw error;
      }
      
      if (attempt === config.maxRetries) {
        throw error;
      }

      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Format error for logging
 * @param {Error} error - Error object
 * @param {Object} context - Error context
 * @returns {Object} Formatted error for logging
 */
export function formatErrorForLogging(error, context = {}) {
  return {
    message: error.message,
    name: error.name,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };
}
