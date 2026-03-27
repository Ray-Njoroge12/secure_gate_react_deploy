/**
 * Enhanced Loading States Hook
 * 
 * Provides comprehensive loading state management with:
 * - Contextual loading messages
 * - Progressive loading support
 * - Loading state persistence
 * - Performance monitoring
 * - User feedback optimization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import logger from 'utils/logger';

import { useLoading } from '../contexts/LoadingContext';

// Loading state types
export const LOADING_TYPES = {
  INITIAL: 'initial',
  REFRESH: 'refresh',
  SUBMIT: 'submit',
  UPLOAD: 'upload',
  DOWNLOAD: 'download',
  SEARCH: 'search',
  FILTER: 'filter',
  SAVE: 'save',
  DELETE: 'delete',
  EXPORT: 'export',
  IMPORT: 'import',
  SYNC: 'sync',
  VALIDATE: 'validate',
  PROCESS: 'process',
  GENERATE: 'generate',
  ANALYZE: 'analyze',
  CALCULATE: 'calculate',
  RENDER: 'render',
  TRANSFORM: 'transform',
  MIGRATE: 'migrate',
  BACKUP: 'backup',
  RESTORE: 'restore',
};

// Loading priorities
export const LOADING_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical',
};

// Contextual messages for different loading types
export const LOADING_MESSAGES = {
  [LOADING_TYPES.INITIAL]: 'Loading...',
  [LOADING_TYPES.REFRESH]: 'Refreshing data...',
  [LOADING_TYPES.SUBMIT]: 'Submitting...',
  [LOADING_TYPES.UPLOAD]: 'Uploading file...',
  [LOADING_TYPES.DOWNLOAD]: 'Downloading...',
  [LOADING_TYPES.SEARCH]: 'Searching...',
  [LOADING_TYPES.FILTER]: 'Filtering results...',
  [LOADING_TYPES.SAVE]: 'Saving changes...',
  [LOADING_TYPES.DELETE]: 'Deleting item...',
  [LOADING_TYPES.EXPORT]: 'Exporting data...',
  [LOADING_TYPES.IMPORT]: 'Importing data...',
  [LOADING_TYPES.SYNC]: 'Synchronizing...',
  [LOADING_TYPES.VALIDATE]: 'Validating...',
  [LOADING_TYPES.PROCESS]: 'Processing...',
  [LOADING_TYPES.GENERATE]: 'Generating...',
  [LOADING_TYPES.ANALYZE]: 'Analyzing...',
  [LOADING_TYPES.CALCULATE]: 'Calculating...',
  [LOADING_TYPES.RENDER]: 'Rendering...',
  [LOADING_TYPES.TRANSFORM]: 'Transforming data...',
  [LOADING_TYPES.MIGRATE]: 'Migrating...',
  [LOADING_TYPES.BACKUP]: 'Creating backup...',
  [LOADING_TYPES.RESTORE]: 'Restoring...',
};

// Loading state configuration
export const LOADING_CONFIG = {
  // Minimum loading time to show loading state (prevents flash)
  MIN_LOADING_TIME: 300,
  // Maximum loading time before showing additional feedback
  MAX_LOADING_TIME: 5000,
  // Time to show success message after completion
  SUCCESS_DISPLAY_TIME: 2000,
  // Time to show error message after failure
  ERROR_DISPLAY_TIME: 5000,
  // Progress update interval for long operations
  PROGRESS_UPDATE_INTERVAL: 100,
  // Auto-retry configuration
  AUTO_RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY: 1000,
    BACKOFF_MULTIPLIER: 2,
  },
};

// Enhanced loading states hook
export const useLoadingStates = (options = {}) => {
  const {
    type = LOADING_TYPES.INITIAL,
    priority = LOADING_PRIORITIES.NORMAL,
    message = null,
    showProgress = false,
    allowCancel = false,
    autoRetry = false,
    persistState = false,
    onComplete = null,
    onError = null,
    onCancel = null,
  } = options;

  const { isLoading, setLoading } = useLoading();
  const [loadingState, setLoadingState] = useState({
    isActive: false,
    type,
    priority,
    message: message || LOADING_MESSAGES[type],
    progress: 0,
    startTime: null,
    endTime: null,
    duration: 0,
    retryCount: 0,
    error: null,
    success: false,
    cancelled: false,
  });

  const progressIntervalRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  // Start loading
  const startLoading = useCallback((customMessage = null) => {
    const startTime = Date.now();
    const loadingMessage = customMessage || message || LOADING_MESSAGES[type];
    
    setLoadingState(prev => ({
      ...prev,
      isActive: true,
      type,
      priority,
      message: loadingMessage,
      progress: 0,
      startTime,
      endTime: null,
      duration: 0,
      retryCount: 0,
      error: null,
      success: false,
      cancelled: false,
    }));

    setLoading(type, true);

    // Set up progress monitoring for long operations
    if (showProgress) {
      progressIntervalRef.current = setInterval(() => {
        setLoadingState(prev => {
          const currentTime = Date.now();
          const duration = currentTime - prev.startTime;
          const progress = Math.min(100, (duration / LOADING_CONFIG.MAX_LOADING_TIME) * 100);
          
          return {
            ...prev,
            progress,
            duration,
          };
        });
      }, LOADING_CONFIG.PROGRESS_UPDATE_INTERVAL);
    }

    // Set up auto-retry if enabled
    if (autoRetry) {
      retryTimeoutRef.current = setTimeout(() => {
        setLoadingState(prev => ({
          ...prev,
          retryCount: prev.retryCount + 1,
        }));
      }, LOADING_CONFIG.AUTO_RETRY.DELAY);
    }
  }, [type, priority, message, showProgress, autoRetry, setLoading]);

  // Update progress
  const updateProgress = useCallback((progress, customMessage = null) => {
    setLoadingState(prev => ({
      ...prev,
      progress: Math.min(100, Math.max(0, progress)),
      message: customMessage || prev.message,
    }));
  }, []);

  // Complete loading successfully
  const completeLoading = useCallback((successMessage = null) => {
    const endTime = Date.now();
    const startTime = loadingState.startTime || endTime;
    const duration = endTime - startTime;

    setLoadingState(prev => ({
      ...prev,
      isActive: false,
      progress: 100,
      endTime,
      duration,
      success: true,
      error: null,
      message: successMessage || prev.message,
    }));

    setLoading(type, false);

    // Clear intervals
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Call completion callback
    if (onComplete) {
      onComplete({ duration, success: true });
    }

    // Auto-hide success message after delay
    if (successMessage) {
      setTimeout(() => {
        setLoadingState(prev => ({
          ...prev,
          success: false,
          message: LOADING_MESSAGES[type],
        }));
      }, LOADING_CONFIG.SUCCESS_DISPLAY_TIME);
    }
  }, [type, loadingState.startTime, setLoading, onComplete]);

  // Handle loading error
  const handleError = useCallback((error, errorMessage = null) => {
    const endTime = Date.now();
    const startTime = loadingState.startTime || endTime;
    const duration = endTime - startTime;

    setLoadingState(prev => ({
      ...prev,
      isActive: false,
      endTime,
      duration,
      error: error.message || error,
      success: false,
      message: errorMessage || `Error: ${error.message || error}`,
    }));

    setLoading(type, false);

    // Clear intervals
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Call error callback
    if (onError) {
      onError({ error, duration });
    }

    // Auto-hide error message after delay
    setTimeout(() => {
      setLoadingState(prev => ({
        ...prev,
        error: null,
        message: LOADING_MESSAGES[type],
      }));
    }, LOADING_CONFIG.ERROR_DISPLAY_TIME);
  }, [type, loadingState.startTime, setLoading, onError]);

  // Cancel loading
  const cancelLoading = useCallback(() => {
    const endTime = Date.now();
    const startTime = loadingState.startTime || endTime;
    const duration = endTime - startTime;

    setLoadingState(prev => ({
      ...prev,
      isActive: false,
      endTime,
      duration,
      cancelled: true,
      success: false,
      error: null,
    }));

    setLoading(type, false);

    // Clear intervals
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Call cancel callback
    if (onCancel) {
      onCancel({ duration });
    }
  }, [type, loadingState.startTime, setLoading, onCancel]);

  // Reset loading state
  const resetLoading = useCallback(() => {
    setLoadingState(prev => ({
      ...prev,
      isActive: false,
      progress: 0,
      startTime: null,
      endTime: null,
      duration: 0,
      retryCount: 0,
      error: null,
      success: false,
      cancelled: false,
      message: LOADING_MESSAGES[type],
    }));

    setLoading(type, false);

    // Clear intervals
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, [type, setLoading]);

  // Auto-retry logic
  const retry = useCallback(() => {
    if (loadingState.retryCount < LOADING_CONFIG.AUTO_RETRY.MAX_ATTEMPTS) {
      const newRetryCount = loadingState.retryCount + 1;
      const delay = LOADING_CONFIG.AUTO_RETRY.DELAY * 
        Math.pow(LOADING_CONFIG.AUTO_RETRY.BACKOFF_MULTIPLIER, loadingState.retryCount);
      
      setLoadingState(prev => ({
        ...prev,
        retryCount: newRetryCount,
      }));
      
      retryTimeoutRef.current = setTimeout(() => {
        startLoading(`Retrying... (${newRetryCount}/${LOADING_CONFIG.AUTO_RETRY.MAX_ATTEMPTS})`);
      }, delay);
    }
  }, [loadingState.retryCount, startLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Persist state to localStorage if enabled
  useEffect(() => {
    if (persistState && loadingState.isActive) {
      localStorage.setItem(`loading_${type}`, JSON.stringify(loadingState));
    } else if (persistState && !loadingState.isActive) {
      localStorage.removeItem(`loading_${type}`);
    }
  }, [loadingState, type, persistState]);

  // Load persisted state on mount
  useEffect(() => {
    if (persistState) {
      const persisted = localStorage.getItem(`loading_${type}`);
      if (persisted) {
        try {
          const parsed = JSON.parse(persisted);
          setLoadingState(prev => ({ ...prev, ...parsed }));
        } catch (error) {
          logger.warn('Failed to parse persisted loading state:', error);
        }
      }
    }
  }, [type, persistState]);

  return {
    // State
    loadingState,
    isActive: loadingState.isActive,
    progress: loadingState.progress,
    message: loadingState.message,
    error: loadingState.error,
    success: loadingState.success,
    cancelled: loadingState.cancelled,
    duration: loadingState.duration,
    retryCount: loadingState.retryCount,

    // Actions
    startLoading,
    updateProgress,
    completeLoading,
    handleError,
    cancelLoading,
    resetLoading,
    retry,

    // Utilities
    isLoading: isLoading(type),
    canCancel: allowCancel && loadingState.isActive,
    canRetry: !!(autoRetry && loadingState.error && loadingState.retryCount < LOADING_CONFIG.AUTO_RETRY.MAX_ATTEMPTS),
    isLongRunning: loadingState.isActive ? (Date.now() - loadingState.startTime) > LOADING_CONFIG.MAX_LOADING_TIME : loadingState.duration > LOADING_CONFIG.MAX_LOADING_TIME,
    isSuccess: loadingState.success,
    isError: !!loadingState.error,
    isCancelled: loadingState.cancelled,
  };
};

export default useLoadingStates;
