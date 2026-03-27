// Custom hook for managing loading states with automatic cleanup
import { useState, useCallback, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';

export const useLoadingState = (initialState = false) => {
  const [loading, setLoading] = useState(initialState);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Loading...');
  const timeoutRef = useRef(null);

  // Start loading with optional message and progress
  const startLoading = useCallback((options = {}) => {
    setLoading(true);
    setError(null);
    setProgress(options.progress || 0);
    setMessage(options.message || 'Loading...');
  }, []);

  // Stop loading
  const stopLoading = useCallback(() => {
    setLoading(false);
    setProgress(0);
    setMessage('Loading...');
  }, []);

  // Set error and stop loading
  const setLoadingError = useCallback((errorMessage) => {
    setError(errorMessage);
    setLoading(false);
    // Don't reset progress when setting error - preserve it
  }, []);

  // Update progress
  const updateProgress = useCallback((newProgress, newMessage) => {
    setProgress(Math.min(100, Math.max(0, newProgress)));
    if (newMessage) {
      setMessage(newMessage);
    }
  }, []);

  // Update message
  const updateMessage = useCallback((newMessage) => {
    setMessage(newMessage);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Reset all states
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setProgress(0);
    setMessage('Loading...');
  }, []);

  // Auto-stop loading after timeout
  const startLoadingWithTimeout = useCallback((timeout = 30000, options = {}) => {
    startLoading(options);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setLoadingError('Loading timeout');
    }, timeout);
  }, [startLoading, setLoadingError]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    loading,
    error,
    progress,
    message,
    
    // Actions
    startLoading,
    stopLoading,
    setLoadingError,
    updateProgress,
    updateMessage,
    clearError,
    reset,
    startLoadingWithTimeout,
    
    // Computed
    isLoading: loading,
    hasError: !!error,
    isComplete: !loading && !error && progress === 100
  };
};

// Hook for async operations with loading states
export const useAsyncLoading = (asyncFunction, dependencies = []) => {
  const loadingState = useLoadingState();
  const [data, setData] = useState(null);

  const execute = useCallback(async (...args) => {
    try {
      // Set loading state synchronously using flushSync
      flushSync(() => {
        loadingState.startLoading();
      });
      const result = await asyncFunction(...args);
      setData(result);
      loadingState.stopLoading();
      return result;
    } catch (error) {
      loadingState.setLoadingError(error.message || 'An error occurred');
      throw error;
    }
  }, [asyncFunction, loadingState]);

  // Auto-execute on mount if dependencies change
  useEffect(() => {
    if (dependencies.length > 0) {
      execute();
    }
  }, [execute, dependencies]);

  return {
    ...loadingState,
    data,
    execute
  };
};

// Hook for multiple loading states
export const useMultipleLoadingStates = () => {
  const [states, setStates] = useState({});

  const setLoading = useCallback((key, loading, options = {}) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        loading,
        error: options.error || null,
        progress: options.progress || 0,
        message: options.message || 'Loading...',
        ...options
      }
    }));
  }, []);

  const getLoading = useCallback((key) => {
    return states[key] || { loading: false, error: null, progress: 0, message: 'Loading...' };
  }, [states]);

  const isLoading = useCallback((key) => {
    return getLoading(key).loading;
  }, [getLoading]);

  const isAnyLoading = useCallback(() => {
    return Object.values(states).some(state => state.loading);
  }, [states]);

  const clearAll = useCallback(() => {
    setStates({});
  }, []);

  const clear = useCallback((key) => {
    setStates(prev => {
      const newStates = { ...prev };
      delete newStates[key];
      return newStates;
    });
  }, []);

  return {
    states,
    setLoading,
    getLoading,
    isLoading,
    isAnyLoading,
    clearAll,
    clear
  };
};

export default useLoadingState;

