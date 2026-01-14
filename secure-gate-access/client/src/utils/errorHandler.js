// client/src/utils/errorHandler.js
import { useState, useCallback } from 'react';
import logger from './logger';
import { navigateToLogin } from './authNavigation';
import { navigateTo } from './appNavigation';

/**
 * Enhanced error handling utilities for the Secure Gate Access System
 * Provides consistent error processing, user-friendly messages, and recovery actions
 */

// Error types for categorization
export const ERROR_TYPES = {
  NETWORK: 'network',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization', 
  VALIDATION: 'validation',
  SERVER: 'server',
  CLIENT: 'client',
  UNKNOWN: 'unknown'
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Categorize error based on response status and content
 */
export function categorizeError(error, response = null) {
  if (!navigator.onLine) {
    return ERROR_TYPES.NETWORK;
  }
  
  if (response?.status === 401 || error?.message?.includes('unauthorized')) {
    return ERROR_TYPES.AUTHENTICATION;
  }
  
  if (response?.status === 403 || error?.message?.includes('forbidden')) {
    return ERROR_TYPES.AUTHORIZATION;
  }
  
  if (response?.status >= 400 && response?.status < 500) {
    return ERROR_TYPES.VALIDATION;
  }
  
  if (response?.status >= 500) {
    return ERROR_TYPES.SERVER;
  }
  
  if (error?.name === 'TypeError' || error?.name === 'ReferenceError') {
    return ERROR_TYPES.CLIENT;
  }
  
  return ERROR_TYPES.UNKNOWN;
}

/**
 * Get user-friendly error messages based on error type and context
 */
export function getUserFriendlyMessage(error, context = '') {
  const errorType = categorizeError(error, error.response);
  
  const messages = {
    [ERROR_TYPES.NETWORK]: {
      title: 'Connection Problem',
      message: 'Please check your internet connection and try again.',
      action: 'Retry'
    },
    [ERROR_TYPES.AUTHENTICATION]: {
      title: 'Session Expired',
      message: 'Your session has expired. Please log in again.',
      action: 'Login'
    },
    [ERROR_TYPES.AUTHORIZATION]: {
      title: 'Access Denied',
      message: 'You don\'t have permission to perform this action.',
      action: 'Go Back'
    },
    [ERROR_TYPES.VALIDATION]: {
      title: 'Invalid Information',
      message: error?.response?.data?.message || 'Please check your input and try again.',
      action: 'Fix Input'
    },
    [ERROR_TYPES.SERVER]: {
      title: 'Server Error',
      message: 'Our servers are experiencing issues. Please try again in a few moments.',
      action: 'Retry Later'
    },
    [ERROR_TYPES.CLIENT]: {
      title: 'Application Error',
      message: 'Something went wrong in the application. Please refresh the page.',
      action: 'Refresh'
    },
    [ERROR_TYPES.UNKNOWN]: {
      title: 'Unexpected Error',
      message: 'An unexpected error occurred. Please try again or contact support.',
      action: 'Try Again'
    }
  };
  
  const errorInfo = messages[errorType];
  
  // Add context-specific modifications
  if (context) {
    switch (context) {
      case 'login':
        if (errorType === ERROR_TYPES.VALIDATION) {
          errorInfo.message = 'Invalid email or password. Please try again.';
        }
        break;
      case 'qr_scan':
        if (errorType === ERROR_TYPES.VALIDATION) {
          errorInfo.title = 'Invalid QR Code';
          errorInfo.message = 'The QR code is invalid or has expired.';
        }
        break;
      case 'invite_complete':
        if (errorType === ERROR_TYPES.VALIDATION) {
          errorInfo.title = 'Invitation Error';
          errorInfo.message = 'This invitation may have expired or is invalid.';
        }
        break;
    }
  }
  
  return errorInfo;
}

/**
 * Get error severity based on type and impact
 */
export function getErrorSeverity(errorType, context = '') {
  switch (errorType) {
    case ERROR_TYPES.AUTHENTICATION:
    case ERROR_TYPES.AUTHORIZATION:
      return ERROR_SEVERITY.HIGH;
    case ERROR_TYPES.SERVER:
      return context === 'critical_operation' ? ERROR_SEVERITY.CRITICAL : ERROR_SEVERITY.HIGH;
    case ERROR_TYPES.NETWORK:
      return ERROR_SEVERITY.MEDIUM;
    case ERROR_TYPES.VALIDATION:
      return ERROR_SEVERITY.LOW;
    case ERROR_TYPES.CLIENT:
      return ERROR_SEVERITY.CRITICAL;
    default:
      return ERROR_SEVERITY.MEDIUM;
  }
}

/**
 * Enhanced error handler that processes errors and returns structured error info
 */
export function handleError(error, context = '', options = {}) {
  const {
    showToUser = true,
    logToConsole = true,
    reportToService = false
  } = options;
  
  // Extract relevant information
  const errorId = Date.now().toString(36);
  const timestamp = new Date().toISOString();
  const errorType = categorizeError(error, error.response);
  const severity = getErrorSeverity(errorType, context);
  const userMessage = getUserFriendlyMessage(error, context);
  
  // Create structured error object
  const errorInfo = {
    id: errorId,
    timestamp,
    type: errorType,
    severity,
    context,
    originalError: error,
    message: userMessage,
    technical: {
      name: error?.name,
      message: error?.message,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data,
      stack: error?.stack
    }
  };
  
  // Log to console in development
  if (logToConsole && process.env.NODE_ENV === 'development') {
    logger.error(`Error [${errorType}] - ${severity.toUpperCase()}`, error, {
      context,
      userMessage,
      errorInfo
    });
  }
  
  // Report to error service in production
  if (reportToService && process.env.NODE_ENV === 'production') {
    // reportErrorToService(errorInfo);
  }
  
  return errorInfo;
}

/**
 * Get suggested recovery actions based on error type
 */
export function getRecoveryActions(errorType, context = '') {
  const actions = {
    [ERROR_TYPES.NETWORK]: [
      { label: 'Check Connection', action: () => window.location.reload() },
      { label: 'Retry', action: 'retry' },
      { label: 'Go Offline', action: 'offline_mode' }
    ],
    [ERROR_TYPES.AUTHENTICATION]: [
      { label: 'Login Again', action: () => navigateToLogin() },
      { label: 'Clear Cache', action: () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      }}
    ],
    [ERROR_TYPES.AUTHORIZATION]: [
      { label: 'Go Back', action: () => window.history.back() },
      { label: 'Home', action: () => navigateTo('/dashboard') }
    ],
    [ERROR_TYPES.VALIDATION]: [
      { label: 'Try Again', action: 'retry' },
      { label: 'Reset Form', action: 'reset_form' }
    ],
    [ERROR_TYPES.SERVER]: [
      { label: 'Retry', action: 'retry' },
      { label: 'Contact Support', action: () => window.location.href = 'mailto:support@securegate.com' }
    ],
    [ERROR_TYPES.CLIENT]: [
      { label: 'Refresh Page', action: () => window.location.reload() },
      { label: 'Clear Cache', action: () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      }}
    ]
  };
  
  return actions[errorType] || actions[ERROR_TYPES.UNKNOWN] || [];
}

/**
 * Enhanced error boundary HOC
 */
export function withErrorBoundary(Component, errorBoundaryProps = {}) {
  return function WrappedComponent(props) {
    const { ErrorBoundary } = require('../components/ui');
    
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Hook for handling async operations with error handling
 */
export function useAsyncOperation(operation, dependencies = []) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  
  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      const result = await operation(...args);
      setData(result);
      return result;
    } catch (err) {
      const errorInfo = handleError(err, 'async_operation');
      setError(errorInfo);
      throw errorInfo;
    } finally {
      setLoading(false);
    }
  }, dependencies);
  
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);
  
  return { loading, error, data, execute, reset };
}

export default {
  handleError,
  getUserFriendlyMessage,
  getRecoveryActions,
  categorizeError,
  getErrorSeverity,
  withErrorBoundary,
  useAsyncOperation,
  ERROR_TYPES,
  ERROR_SEVERITY
};
