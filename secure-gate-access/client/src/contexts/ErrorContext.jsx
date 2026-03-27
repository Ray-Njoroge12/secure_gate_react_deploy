import React, { createContext, useContext } from 'react';
import logger from 'utils/logger';

import { useErrorHandler } from '../hooks/useErrorHandler';
import errorQueueService from '../services/errorQueueService';
import { createApiErrorHandler, createErrorContext } from '../utils/apiErrorHandler';
import { navigateToLogin } from '../utils/authNavigation';
import { ERROR_TYPES } from '../utils/errorHandling';

const ErrorContext = createContext();

/**
 * Error Context Provider
 * Provides standardized error handling across the application
 *
 * Error channel guidance:
 * - Field/form validation and authentication feedback should be shown inline in the local form.
 * - Session expiry should come from apiClient 401 interception via the `session-expired` event flow.
 * - Action failures requiring operator acknowledgement can use persistent/local toasts.
 * - Unexpected server errors (5xx) can use the global error queue handlers in this context.
 */
export const ErrorProvider = ({ children, options = {} }) => {
  const errorHandler = useErrorHandler(options);
  const apiErrorHandler = createApiErrorHandler({
    onError: (error, context) => {
      // Log error for debugging
      logger.error('API Error:', error, context);
    },
    onRetry: (attempt, _error, _context) => {
      // Show retry notification
      errorHandler.handleInfo(`Retrying... (Attempt ${attempt})`, {
        context: 'Retry',
        autoClose: true,
        autoCloseDelay: 2000
      });
    }
  });

  const contextValue = {
    ...errorHandler,
    // Additional context-specific methods
    showError: errorHandler.handleError,
    showSuccess: errorHandler.handleSuccess,
    showWarning: errorHandler.handleWarning,
    showInfo: errorHandler.handleInfo,
    // Queue management
    getErrorQueue: () => errorQueueService.getErrors(),
    clearErrorQueue: () => errorQueueService.clearAll(),
    // Enhanced API error handling
    handleApiError: async (error, context = 'API call', options = {}) => {
      const errorContext = createErrorContext(context, 'ErrorContext', options);
      return await apiErrorHandler.handleApiError(error, errorContext, options);
    },
    handleApiErrorWithRetry: async (error, context = 'API call', options = {}) => {
      const errorContext = createErrorContext(context, 'ErrorContext', options);
      return await apiErrorHandler.handleWithRetry(error, errorContext, options);
    },
    // Specialized error handlers
    handleValidationError: (errors, context = 'Validation') => {
      const errorMessages = Object.values(errors).join(', ');
      return errorHandler.handleWarning(errorMessages, { 
        context,
        title: 'Validation Error',
        showRecoveryActions: true,
        type: ERROR_TYPES.VALIDATION
      });
    },
    handleNetworkError: async (error, context = 'Network') => {
      const errorContext = createErrorContext(context, 'ErrorContext');
      const handledError = await apiErrorHandler.handleApiError(error, errorContext, {
        retry: true,
        retryConfig: {
          maxRetries: 3,
          baseDelay: 1000
        }
      });
      
      return errorHandler.handleError(handledError, {
        context,
        title: 'Connection Error',
        showRecoveryActions: true,
        onRetry: () => window.location.reload(),
        type: ERROR_TYPES.NETWORK
      });
    },
    handleAuthError: (error, context = 'Authentication') => {
      return errorHandler.handleError(error, {
        context,
        title: 'Authentication Error',
        showRecoveryActions: true,
        onRetry: () => navigateToLogin(),
        type: ERROR_TYPES.AUTHENTICATION,
        persistent: true
      });
    },
    handleServerError: async (error, context = 'Server') => {
      const errorContext = createErrorContext(context, 'ErrorContext');
      const handledError = await apiErrorHandler.handleApiError(error, errorContext, {
        retry: true,
        retryConfig: {
          maxRetries: 2,
          baseDelay: 2000
        }
      });
      
      return errorHandler.handleError(handledError, {
        context,
        title: 'Server Error',
        showRecoveryActions: true,
        type: ERROR_TYPES.SERVER
      });
    },
    // Utility methods
    createErrorContext: createErrorContext,
    getRetryActions: (error, context) => apiErrorHandler.getRetryActions(error, context)
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
    </ErrorContext.Provider>
  );
};

/**
 * Hook to use error context
 * @returns {Object} Error context value
 */
export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

export { ErrorContext };
export default ErrorContext;
