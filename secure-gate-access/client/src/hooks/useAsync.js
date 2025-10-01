import { useState, useEffect, useCallback, useRef } from 'react';
import { handleApiError } from '../utils/errorMapper';

/**
 * Custom hook for managing async operations with loading states and error handling
 * @param {Function} asyncFunction - The async function to execute
 * @param {boolean} immediate - Whether to execute immediately on mount
 * @returns {Object} Async operation state and controls
 */
export const useAsync = (asyncFunction, immediate = false) => {
  const [status, setStatus] = useState('idle'); // 'idle' | 'pending' | 'success' | 'error'
  const [value, setValue] = useState(null);
  const [error, setError] = useState(null);

  // Use useRef to store the latest function to avoid stale closures
  const asyncFunctionRef = useRef(asyncFunction);
  asyncFunctionRef.current = asyncFunction;

  const execute = useCallback(async (...args) => {
    setStatus('pending');
    setValue(null);
    setError(null);

    try {
      const result = await asyncFunctionRef.current(...args);
      setValue(result);
      setStatus('success');
      return result;
    } catch (err) {
      const errorMessage = handleApiError(err, 'Async operation');
      setError(errorMessage);
      setStatus('error');
      throw err; // Re-throw to allow caller to handle if needed
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setValue(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    execute,
    reset,
    status,
    value,
    error,
    isIdle: status === 'idle',
    isPending: status === 'pending',
    isSuccess: status === 'success',
    isError: status === 'error'
  };
};

/**
 * Custom hook for managing multiple async operations
 * @param {Object} asyncFunctions - Object with named async functions
 * @returns {Object} Object with async operation states and controls for each function
 */
export const useAsyncMultiple = (asyncFunctions) => {
  const results = {};

  Object.keys(asyncFunctions).forEach(key => {
    results[key] = useAsync(asyncFunctions[key]);
  });

  return results;
};

/**
 * Custom hook for polling async operations at regular intervals
 * @param {Function} asyncFunction - The async function to poll
 * @param {number} interval - Polling interval in milliseconds
 * @param {boolean} enabled - Whether polling is enabled
 * @returns {Object} Polling state and controls
 */
export const useAsyncPolling = (asyncFunction, interval = 5000, enabled = true) => {
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef(null);
  const asyncOperation = useAsync(asyncFunction, false);

  const startPolling = useCallback(() => {
    if (!enabled || isPolling) return;

    setIsPolling(true);
    asyncOperation.execute();

    intervalRef.current = setInterval(() => {
      asyncOperation.execute();
    }, interval);
  }, [asyncOperation, interval, enabled, isPolling]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return stopPolling;
  }, [enabled, startPolling, stopPolling]);

  return {
    ...asyncOperation,
    isPolling,
    startPolling,
    stopPolling
  };
};

/**
 * Custom hook for retrying failed async operations
 * @param {Function} asyncFunction - The async function to execute
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} retryDelay - Delay between retries in milliseconds
 * @returns {Object} Retry state and controls
 */
export const useAsyncRetry = (asyncFunction, maxRetries = 3, retryDelay = 1000) => {
  const [retryCount, setRetryCount] = useState(0);
  const asyncOperation = useAsync(asyncFunction, false);

  const executeWithRetry = useCallback(async (...args) => {
    setRetryCount(0);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await asyncOperation.execute(...args);
        setRetryCount(0); // Reset on success
        return result;
      } catch (error) {
        if (attempt < maxRetries) {
          setRetryCount(attempt + 1);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          throw error; // Re-throw after max retries
        }
      }
    }
  }, [asyncOperation, maxRetries, retryDelay]);

  return {
    ...asyncOperation,
    execute: executeWithRetry,
    retryCount,
    maxRetries
  };
};

export default useAsync;
