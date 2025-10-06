import React, { createContext, useContext, useCallback } from 'react';
import { useErrorHandler } from '../hooks/useErrorHandler';
import errorQueueService from '../services/errorQueueService';

const ErrorContext = createContext();

/**
 * Error Context Provider
 * Provides standardized error handling across the application
 */
export const ErrorProvider = ({ children, options = {} }) => {
  const errorHandler = useErrorHandler(options);

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
    // Utility methods
    handleApiError: (error, context = 'API call') => {
      return errorHandler.handleError(error, { context });
    },
    handleValidationError: (errors, context = 'Validation') => {
      const errorMessages = Object.values(errors).join(', ');
      return errorHandler.handleWarning(errorMessages, { 
        context,
        title: 'Validation Error',
        showRecoveryActions: true
      });
    },
    handleNetworkError: (error, context = 'Network') => {
      return errorHandler.handleError(error, {
        context,
        title: 'Connection Error',
        showRecoveryActions: true,
        onRetry: () => window.location.reload()
      });
    },
    handleAuthError: (error, context = 'Authentication') => {
      return errorHandler.handleError(error, {
        context,
        title: 'Authentication Error',
        showRecoveryActions: true,
        onRetry: () => window.location.href = '/login'
      });
    }
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

export default ErrorContext;