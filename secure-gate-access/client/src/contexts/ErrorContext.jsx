import React, { createContext, useContext, useReducer, useCallback } from 'react';
import PropTypes from 'prop-types';

// Error context
const ErrorContext = createContext();

// Error action types
const ERROR_ACTIONS = {
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_RETRYING: 'SET_RETRYING',
  INCREMENT_RETRY: 'INCREMENT_RETRY',
  RESET: 'RESET'
};

// Error reducer
const errorReducer = (state, action) => {
  switch (action.type) {
    case ERROR_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        hasError: true,
        retryCount: 0
      };
    
    case ERROR_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
        hasError: false,
        isRetrying: false
      };
    
    case ERROR_ACTIONS.SET_RETRYING:
      return {
        ...state,
        isRetrying: action.payload
      };
    
    case ERROR_ACTIONS.INCREMENT_RETRY:
      return {
        ...state,
        retryCount: state.retryCount + 1
      };
    
    case ERROR_ACTIONS.RESET:
      return {
        error: null,
        hasError: false,
        isRetrying: false,
        retryCount: 0
      };
    
    default:
      return state;
  }
};

// Initial state
const initialState = {
  error: null,
  hasError: false,
  isRetrying: false,
  retryCount: 0
};

// Error provider component
export const ErrorProvider = ({ children }) => {
  const [state, dispatch] = useReducer(errorReducer, initialState);

  const setError = useCallback((error, errorInfo = {}) => {
    const errorData = {
      message: error.message || 'An unexpected error occurred',
      stack: error.stack,
      ...errorInfo,
      timestamp: new Date().toISOString(),
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    dispatch({
      type: ERROR_ACTIONS.SET_ERROR,
      payload: errorData
    });

    // Log error to backend
    logErrorToBackend(error, errorInfo);
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: ERROR_ACTIONS.CLEAR_ERROR });
  }, []);

  const setRetrying = useCallback((isRetrying) => {
    dispatch({
      type: ERROR_ACTIONS.SET_RETRYING,
      payload: isRetrying
    });
  }, []);

  const incrementRetry = useCallback(() => {
    dispatch({ type: ERROR_ACTIONS.INCREMENT_RETRY });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: ERROR_ACTIONS.RESET });
  }, []);

  const retry = useCallback(async (retryFunction) => {
    if (!retryFunction || typeof retryFunction !== 'function') {
      console.warn('Retry function not provided or not a function');
      return;
    }

    setRetrying(true);
    incrementRetry();

    try {
      await retryFunction();
      clearError();
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      setError(retryError, { isRetry: true, retryCount: state.retryCount + 1 });
    } finally {
      setRetrying(false);
    }
  }, [setError, clearError, setRetrying, incrementRetry, state.retryCount]);

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

    setError(apiError, requestInfo);
  }, [setError]);

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

  const contextValue = {
    ...state,
    setError,
    clearError,
    setRetrying,
    incrementRetry,
    reset,
    retry,
    handleApiError,
    isNetworkError,
    isServerError,
    isClientError,
    isAuthError
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
    </ErrorContext.Provider>
  );
};

ErrorProvider.propTypes = {
  children: PropTypes.node.isRequired
};

// Hook to use error context
export const useError = () => {
  const context = useContext(ErrorContext);
  
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  
  return context;
};

// Higher-order component for error handling
export const withErrorHandling = (WrappedComponent) => {
  const WithErrorHandling = (props) => {
    const errorContext = useError();
    
    return (
      <WrappedComponent
        {...props}
        errorContext={errorContext}
      />
    );
  };

  WithErrorHandling.displayName = `withErrorHandling(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithErrorHandling;
};

// Log error to backend
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

// Get current user ID from localStorage
const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.id || null;
  } catch {
    return null;
  }
};

// Get auth token from localStorage
const getAuthToken = () => {
  try {
    return localStorage.getItem('token') || null;
  } catch {
    return null;
  }
};

export default ErrorContext;
