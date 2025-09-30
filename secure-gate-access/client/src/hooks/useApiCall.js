import { useState, useCallback } from 'react';
import { handleApiError } from '../utils/errorMapper';

/**
 * Custom hook for managing single API calls with consistent error handling and loading states
 * @param {Function} apiFunction - The API function to call
 * @param {Object} config - Configuration object
 * @param {Function} config.onSuccess - Optional callback for successful API call
 * @param {Function} config.onError - Optional callback for failed API call
 * @param {string} config.successAction - Action key for success message mapping
 * @returns {Object} API call state and execute function
 */
export const useApiCall = (apiFunction, {
  onSuccess = null,
  onError = null,
  successAction = null
} = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  // Execute the API call
  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError('');
    setData(null);

    try {
      const result = await apiFunction(...args);
      setData(result);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(result, ...args);
      }

      return result;
    } catch (err) {
      const errorMessage = handleApiError(err, 'API call');
      setError(errorMessage);

      // Call error callback if provided
      if (onError) {
        onError(err, ...args);
      }

      throw err; // Re-throw to allow caller to handle if needed
    } finally {
      setLoading(false);
    }
  }, [apiFunction, onSuccess, onError]);

  // Reset the state
  const reset = useCallback(() => {
    setLoading(false);
    setError('');
    setData(null);
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setError('');
  }, []);

  return {
    // State
    loading,
    error,
    data,

    // Actions
    execute,
    reset,
    clearError,

    // Computed
    isLoading: loading,
    hasError: !!error,
    hasData: !!data
  };
};

export default useApiCall;
