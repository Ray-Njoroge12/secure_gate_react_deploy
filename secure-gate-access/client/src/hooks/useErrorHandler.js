import { useCallback, useRef } from 'react';
import logger from 'utils/logger';

import errorQueueService from '../services/errorQueueService';
import { handleApiError } from '../utils/errorMapper';

/**
 * Standardized Error Handling Hook
 * Provides consistent error handling across the application
 */
export const useErrorHandler = (options = {}) => {
  const {
    context = 'Unknown',
    showToUser = true,
    logToConsole = true,
    reportToService = false,
    defaultType = 'error',
    autoClose = true,
    autoCloseDelay = 5000,
    position = 'top-right',
    showRecoveryActions = true
  } = options;

  const errorIdRef = useRef(null);

  /**
   * Handle error with standardized processing
   * @param {Error|string} error - Error object or message
   * @param {Object} errorOptions - Additional error options
   * @returns {string} Error ID
   */
  const handleError = useCallback((error, errorOptions = {}) => {
    let errorMessage;
    let errorType = defaultType;

    // Process error based on type
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error instanceof Error) {
      errorMessage = handleApiError(error, context);
      errorType = categorizeErrorType(error);
    } else if (error?.message) {
      errorMessage = error.message;
      errorType = error.type || defaultType;
    } else {
      errorMessage = 'An unexpected error occurred';
    }

    // Log error if enabled
    if (logToConsole) {
      logger.error(`[${context}] Error occurred`, error, {
        context,
        errorMessage,
        errorType,
        ...errorOptions
      });
    }

    // Report to service if enabled
    if (reportToService && process.env.NODE_ENV === 'production') {
      // reportErrorToService(error, context, errorOptions);
    }

    // Add to error queue if showToUser is enabled
    if (showToUser) {
      const errorId = errorQueueService.addError({
        message: errorMessage,
        type: errorType,
        title: errorOptions.title || getDefaultTitle(errorType),
        persistent: errorOptions.persistent || false,
        autoClose: errorOptions.autoClose !== undefined ? errorOptions.autoClose : autoClose,
        autoCloseDelay: errorOptions.autoCloseDelay || autoCloseDelay,
        position: errorOptions.position || position,
        showRecoveryActions: errorOptions.showRecoveryActions !== undefined ? errorOptions.showRecoveryActions : showRecoveryActions,
        onRetry: errorOptions.onRetry || null,
        onHelp: errorOptions.onHelp || null,
        onClose: errorOptions.onClose || null
      });

      errorIdRef.current = errorId;
      return errorId;
    }

    return null;
  }, [context, showToUser, logToConsole, reportToService, defaultType, autoClose, autoCloseDelay, position, showRecoveryActions]);

  /**
   * Handle success message
   * @param {string} message - Success message
   * @param {Object} successOptions - Additional success options
   * @returns {string} Success ID
   */
  const handleSuccess = useCallback((message, successOptions = {}) => {
    const successId = errorQueueService.addError({
      message,
      type: 'success',
      title: successOptions.title || 'Success',
      persistent: successOptions.persistent || false,
      autoClose: successOptions.autoClose !== undefined ? successOptions.autoClose : true,
      autoCloseDelay: successOptions.autoCloseDelay || 3000,
      position: successOptions.position || position,
      showRecoveryActions: false,
      ...successOptions
    });

    return successId;
  }, [position]);

  /**
   * Handle warning message
   * @param {string} message - Warning message
   * @param {Object} warningOptions - Additional warning options
   * @returns {string} Warning ID
   */
  const handleWarning = useCallback((message, warningOptions = {}) => {
    const warningId = errorQueueService.addError({
      message,
      type: 'warning',
      title: warningOptions.title || 'Warning',
      persistent: warningOptions.persistent || false,
      autoClose: warningOptions.autoClose !== undefined ? warningOptions.autoClose : true,
      autoCloseDelay: warningOptions.autoCloseDelay || 4000,
      position: warningOptions.position || position,
      showRecoveryActions: warningOptions.showRecoveryActions !== undefined ? warningOptions.showRecoveryActions : true,
      ...warningOptions
    });

    return warningId;
  }, [position]);

  /**
   * Handle info message
   * @param {string} message - Info message
   * @param {Object} infoOptions - Additional info options
   * @returns {string} Info ID
   */
  const handleInfo = useCallback((message, infoOptions = {}) => {
    const infoId = errorQueueService.addError({
      message,
      type: 'info',
      title: infoOptions.title || 'Information',
      persistent: infoOptions.persistent || false,
      autoClose: infoOptions.autoClose !== undefined ? infoOptions.autoClose : true,
      autoCloseDelay: infoOptions.autoCloseDelay || 3000,
      position: infoOptions.position || position,
      showRecoveryActions: false,
      ...infoOptions
    });

    return infoId;
  }, [position]);

  /**
   * Clear specific error
   * @param {string} errorId - Error ID to clear
   */
  const clearError = useCallback((errorId) => {
    errorQueueService.removeError(errorId);
  }, []);

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback(() => {
    errorQueueService.clearAll();
  }, []);

  /**
   * Clear errors by type
   * @param {string} type - Error type to clear
   */
  const clearErrorsByType = useCallback((type) => {
    errorQueueService.clearByType(type);
  }, []);

  /**
   * Get all errors
   * @returns {Array} Array of error objects
   */
  const getErrors = useCallback(() => {
    return errorQueueService.getErrors();
  }, []);

  /**
   * Get errors by type
   * @param {string} type - Error type
   * @returns {Array} Array of error objects
   */
  const getErrorsByType = useCallback((type) => {
    return errorQueueService.getErrorsByType(type);
  }, []);

  /**
   * Check if there are any errors
   * @returns {boolean} True if there are errors
   */
  const hasErrors = useCallback(() => {
    return errorQueueService.getErrorCount() > 0;
  }, []);

  /**
   * Check if there are errors of specific type
   * @param {string} type - Error type
   * @returns {boolean} True if there are errors of this type
   */
  const hasErrorsOfType = useCallback((type) => {
    return errorQueueService.getErrorCountByType(type) > 0;
  }, []);

  return {
    handleError,
    handleSuccess,
    handleWarning,
    handleInfo,
    clearError,
    clearAllErrors,
    clearErrorsByType,
    getErrors,
    getErrorsByType,
    hasErrors,
    hasErrorsOfType,
    errorId: errorIdRef.current
  };
};

/**
 * Categorize error type based on error object
 * @param {Error} error - Error object
 * @returns {string} Error type
 */
const categorizeErrorType = (error) => {
  if (error?.response?.status) {
    const status = error.response.status;
    if (status >= 400 && status < 500) {
      if (status === 401) return 'error';
      if (status === 403) return 'error';
      if (status === 404) return 'warning';
      if (status === 422) return 'warning';
      return 'error';
    }
    if (status >= 500) return 'error';
  }

  if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
    return 'error';
  }

  if (error?.message?.includes('validation') || error?.message?.includes('invalid')) {
    return 'warning';
  }

  return 'error';
};

/**
 * Get default title based on error type
 * @param {string} type - Error type
 * @returns {string} Default title
 */
const getDefaultTitle = (type) => {
  const titles = {
    error: 'Error',
    warning: 'Warning',
    info: 'Information',
    success: 'Success'
  };
  return titles[type] || 'Error';
};

export default useErrorHandler;