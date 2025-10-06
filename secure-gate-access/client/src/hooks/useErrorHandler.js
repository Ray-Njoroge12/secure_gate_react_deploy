import { useState, useCallback } from 'react';

/**
 * Custom hook for handling errors in functional components
 */
export const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleError = useCallback((error, errorInfo = {}) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    
    setError({
      message: error.message || 'An unexpected error occurred',
      stack: error.stack,
      ...errorInfo,
      timestamp: new Date().toISOString(),
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    // Log error to backend
    logErrorToBackend(error, errorInfo);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setIsRetrying(false);
  }, []);

  const retry = useCallback(async (retryFunction) => {
    if (!retryFunction || typeof retryFunction !== 'function') {
      console.warn('Retry function not provided or not a function');
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      await retryFunction();
      clearError();
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      handleError(retryError, { isRetry: true, retryCount: retryCount + 1 });
    } finally {
      setIsRetrying(false);
    }
  }, [handleError, clearError, retryCount]);

  const reset = useCallback(() => {
    setError(null);
    setIsRetrying(false);
    setRetryCount(0);
  }, []);

  return {
    error,
    isRetrying,
    retryCount,
    handleError,
    clearError,
    retry,
    reset,
    hasError: !!error
  };
};

/**
 * Hook for handling async operations with error boundaries
 */
export const useAsyncErrorHandler = () => {
  const { handleError, ...rest } = useErrorHandler();

  const executeAsync = useCallback(async (asyncFunction, options = {}) => {
    const { 
      onSuccess, 
      onError, 
      retryable = true,
      maxRetries = 3 
    } = options;

    try {
      const result = await asyncFunction();
      onSuccess?.(result);
      return result;
    } catch (error) {
      console.error('Async operation failed:', error);
      
      const errorInfo = {
        isAsync: true,
        retryable,
        maxRetries,
        ...options
      };

      handleError(error, errorInfo);
      onError?.(error);
      throw error;
    }
  }, [handleError]);

  return {
    ...rest,
    executeAsync
  };
};

/**
 * Hook for handling API errors specifically
 */
export const useApiErrorHandler = () => {
  const { handleError, ...rest } = useErrorHandler();

  const handleApiError = useCallback((error, requestInfo = {}) => {
    const apiError = {
      ...error,
      isApiError: true,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: requestInfo.url,
      method: requestInfo.method,
      headers: requestInfo.headers
    };

    handleError(apiError, requestInfo);
  }, [handleError]);

  const isNetworkError = useCallback((error) => {
    return !error.response && error.request;
  }, []);

  const isServerError = useCallback((error) => {
    return error.response?.status >= 500;
  }, []);

  const isClientError = useCallback((error) => {
    return error.response?.status >= 400 && error.response?.status < 500;
  }, []);

  const isAuthError = useCallback((error) => {
    return error.response?.status === 401 || error.response?.status === 403;
  }, []);

  return {
    ...rest,
    handleApiError,
    isNetworkError,
    isServerError,
    isClientError,
    isAuthError
  };
};

/**
 * Log error to backend
 */
const logErrorToBackend = async (error, errorInfo) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    ...errorInfo,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    userId: getCurrentUserId()
  };

  try {
    await fetch('/api/logs/error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(errorData)
    });
  } catch (logError) {
    console.error('Failed to log error to backend:', logError);
  }
};

/**
 * Get current user ID from localStorage
 */
const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.id || null;
  } catch {
    return null;
  }
};

/**
 * Get auth token from localStorage
 */
const getAuthToken = () => {
  try {
    return localStorage.getItem('token') || null;
  } catch {
    return null;
  }
};

export default useErrorHandler;
