/**
 * @fileoverview API Error Handler for Secure Gate Access
 * @description Centralized API error handling with retry mechanisms and user-friendly messages
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import { createStandardError, retryOperation, ERROR_TYPES } from './errorHandling';
import { handleApiError } from './errorMapper';
import { navigateToLogin } from './authNavigation';
import logger from './logger';

/**
 * API Error Handler Class
 * Handles API errors with retry logic and user-friendly messaging
 */
export class ApiErrorHandler {
  constructor(options = {}) {
    this.retryConfig = options.retryConfig || {};
    this.logger = options.logger || logger;
    this.onError = options.onError || null;
    this.onRetry = options.onRetry || null;
  }

  /**
   * Handle API error with retry logic
   * @param {Error} error - API error
   * @param {Object} context - Error context
   * @param {Object} options - Handler options
   * @returns {Promise} Promise that resolves with retry result or rejects with final error
   */
  async handleApiError(error, context = {}, options = {}) {
    const standardError = createStandardError(error, context, options);
    
    // Log the error
    this.logger.error('API Error occurred', {
      error: standardError,
      context,
      options
    });

    // Call error callback if provided
    if (this.onError) {
      this.onError(standardError, context);
    }

    // If error is retryable, attempt retry
    if (standardError.retryable && options.retry !== false) {
      return this.handleWithRetry(error, context, options);
    }

    // Return standardized error
    return standardError;
  }

  /**
   * Handle API error with retry logic
   * @param {Error} error - API error
   * @param {Object} context - Error context
   * @param {Object} options - Handler options
   * @returns {Promise} Promise that resolves with retry result or rejects with final error
   */
  async handleWithRetry(error, context = {}, options = {}) {
    const retryOptions = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      ...this.retryConfig,
      ...options.retryConfig
    };

    try {
      return await retryOperation(
        () => this.executeApiCall(context.apiCall, context),
        retryOptions
      );
    } catch (retryError) {
      // If retry fails, return the original standardized error
      return createStandardError(error, context, {
        ...options,
        retryAttempts: retryOptions.maxRetries,
        finalError: retryError
      });
    }
  }

  /**
   * Execute API call (placeholder - should be replaced with actual API call)
   * @param {Function} apiCall - API call function
   * @param {Object} context - Call context
   * @returns {Promise} API call result
   */
  async executeApiCall(apiCall, context) {
    if (!apiCall || typeof apiCall !== 'function') {
      throw new Error('API call function is required');
    }

    return await apiCall();
  }

  /**
   * Create user-friendly error message
   * @param {Error} error - API error
   * @param {Object} context - Error context
   * @returns {string} User-friendly message
   */
  createUserMessage(error, context = {}) {
    const errorType = this.categorizeErrorType(error);
    
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

    let message = messages[errorType] || messages[ERROR_TYPES.UNKNOWN];

    // Add context-specific information
    if (context.action) {
      message = `${context.action}: ${message}`;
    }

    return message;
  }

  /**
   * Categorize error type based on error object
   * @param {Error} error - Error object
   * @returns {string} Error type
   */
  categorizeErrorType(error) {
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
   * Get retry actions for error
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   * @returns {Array} Retry actions
   */
  getRetryActions(error, context = {}) {
    const errorType = this.categorizeErrorType(error);
    const actions = [];

    switch (errorType) {
      case ERROR_TYPES.NETWORK:
        actions.push({
          label: 'Retry',
          action: 'retry',
          primary: true,
          onClick: () => this.handleWithRetry(error, context)
        });
        actions.push({
          label: 'Check Connection',
          action: 'check_connection',
          primary: false,
          onClick: () => this.checkConnection()
        });
        break;

      case ERROR_TYPES.AUTHENTICATION:
        actions.push({
          label: 'Login Again',
          action: 'login',
          primary: true,
          onClick: () => this.redirectToLogin()
        });
        break;

      case ERROR_TYPES.SERVER:
        actions.push({
          label: 'Retry',
          action: 'retry',
          primary: true,
          onClick: () => this.handleWithRetry(error, context)
        });
        actions.push({
          label: 'Report Issue',
          action: 'report',
          primary: false,
          onClick: () => this.reportIssue(error, context)
        });
        break;

      case ERROR_TYPES.VALIDATION:
        actions.push({
          label: 'Fix Input',
          action: 'fix_input',
          primary: true,
          onClick: () => this.focusOnInput(context)
        });
        break;

      default:
        actions.push({
          label: 'Retry',
          action: 'retry',
          primary: true,
          onClick: () => this.handleWithRetry(error, context)
        });
    }

    return actions;
  }

  /**
   * Check internet connection
   */
  checkConnection() {
    if (navigator.onLine) {
      this.logger.info('Connection check: Online');
      return true;
    } else {
      this.logger.warn('Connection check: Offline');
      return false;
    }
  }

  /**
   * Redirect to login page
   */
  redirectToLogin() {
    navigateToLogin();
  }

  /**
   * Report issue to support
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   */
  reportIssue(error, context) {
    // In a real application, this would send the error to a support system
    this.logger.error('Issue reported', { error, context });
    
    // For now, just show an alert
    alert('Issue has been reported to our support team. Thank you for your feedback.');
  }

  /**
   * Focus on input field for validation errors
   * @param {Object} context - Error context
   */
  focusOnInput(context) {
    if (context.inputRef && context.inputRef.current) {
      context.inputRef.current.focus();
    } else if (context.fieldName) {
      const input = document.querySelector(`[name="${context.fieldName}"]`);
      if (input) {
        input.focus();
      }
    }
  }
}

/**
 * Create API error handler instance
 * @param {Object} options - Handler options
 * @returns {ApiErrorHandler} API error handler instance
 */
export function createApiErrorHandler(options = {}) {
  return new ApiErrorHandler(options);
}

/**
 * Default API error handler instance
 */
export const defaultApiErrorHandler = createApiErrorHandler();

/**
 * Handle API error with default handler
 * @param {Error} error - API error
 * @param {Object} context - Error context
 * @param {Object} options - Handler options
 * @returns {Promise} Promise that resolves with error handling result
 */
export async function handleApiErrorWithRetry(error, context = {}, options = {}) {
  return await defaultApiErrorHandler.handleApiError(error, context, options);
}

/**
 * Create error context for API calls
 * @param {string} action - Action being performed
 * @param {string} component - Component making the call
 * @param {Object} additionalContext - Additional context
 * @returns {Object} Error context
 */
export function createErrorContext(action, component, additionalContext = {}) {
  return {
    action,
    component,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    ...additionalContext
  };
}

/**
 * Wrap API call with error handling
 * @param {Function} apiCall - API call function
 * @param {Object} context - Error context
 * @param {Object} options - Handler options
 * @returns {Promise} Promise that resolves with API result or rejects with handled error
 */
export async function withErrorHandling(apiCall, context = {}, options = {}) {
  try {
    return await apiCall();
  } catch (error) {
    const handledError = await defaultApiErrorHandler.handleApiError(error, context, options);
    throw handledError;
  }
}

/**
 * Create retryable API call wrapper
 * @param {Function} apiCall - API call function
 * @param {Object} retryConfig - Retry configuration
 * @returns {Function} Wrapped API call with retry logic
 */
export function createRetryableApiCall(apiCall, retryConfig = {}) {
  return async (context = {}) => {
    return await retryOperation(
      () => apiCall(),
      {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        ...retryConfig
      }
    );
  };
}


