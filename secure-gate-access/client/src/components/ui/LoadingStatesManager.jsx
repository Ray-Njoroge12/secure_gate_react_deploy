/**
 * Loading States Manager
 * 
 * Centralized loading states management component that:
 * - Integrates all loading components
 * - Provides consistent loading patterns
 * - Manages loading state transitions
 * - Optimizes user experience
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LOADING_TYPES, LOADING_PRIORITIES } from '../../hooks/useLoadingStates';
import EnhancedLoading from './EnhancedLoading';
import AdvancedSkeleton from './AdvancedSkeleton';

// Loading context for managing global loading states
const LoadingContext = React.createContext();

export const useLoadingManager = () => {
  const context = React.useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoadingManager must be used within a LoadingStatesManager');
  }
  return context;
};

// Loading states manager component
const LoadingStatesManager = ({
  children,
  globalLoading = false,
  onGlobalLoadingChange = null,
  className = '',
  ...props
}) => {
  const [loadingStates, setLoadingStates] = useState({});
  const [globalState, setGlobalState] = useState({
    isLoading: globalLoading,
    message: 'Loading...',
    progress: 0,
    type: LOADING_TYPES.INITIAL,
    priority: LOADING_PRIORITIES.NORMAL,
  });

  const loadingTimeouts = useRef({});
  const loadingCallbacks = useRef({});

  // Start loading for a specific key
  const startLoading = useCallback((key, options = {}) => {
    const {
      type = LOADING_TYPES.INITIAL,
      priority = LOADING_PRIORITIES.NORMAL,
      message = null,
      progress = 0,
      timeout = null,
      onComplete = null,
      onError = null,
    } = options;

    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        isLoading: true,
        type,
        priority,
        message: message || `Loading ${key}...`,
        progress,
        startTime: Date.now(),
        error: null,
        success: false,
      },
    }));

    // Set timeout if specified
    if (timeout) {
      loadingTimeouts.current[key] = setTimeout(() => {
        completeLoading(key, { success: false, error: 'Timeout' });
      }, timeout);
    }

    // Store callbacks
    loadingCallbacks.current[key] = { onComplete, onError };
  }, []);

  // Update loading progress
  const updateLoading = useCallback((key, updates) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...updates,
      },
    }));
  }, []);

  // Complete loading for a specific key
  const completeLoading = useCallback((key, result = {}) => {
    const { success = true, error = null, message = null } = result;
    
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isLoading: false,
        success,
        error,
        message: message || (success ? 'Complete' : 'Error'),
        endTime: Date.now(),
      },
    }));

    // Clear timeout
    if (loadingTimeouts.current[key]) {
      clearTimeout(loadingTimeouts.current[key]);
      delete loadingTimeouts.current[key];
    }

    // Call completion callback
    const callbacks = loadingCallbacks.current[key];
    if (callbacks) {
      if (success && callbacks.onComplete) {
        callbacks.onComplete(result);
      } else if (!success && callbacks.onError) {
        callbacks.onError(error);
      }
      delete loadingCallbacks.current[key];
    }
  }, []);

  // Cancel loading for a specific key
  const cancelLoading = useCallback((key) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isLoading: false,
        cancelled: true,
        endTime: Date.now(),
      },
    }));

    // Clear timeout
    if (loadingTimeouts.current[key]) {
      clearTimeout(loadingTimeouts.current[key]);
      delete loadingTimeouts.current[key];
    }

    // Clear callbacks
    delete loadingCallbacks.current[key];
  }, []);

  // Get loading state for a specific key
  const getLoadingState = useCallback((key) => {
    return loadingStates[key] || {
      isLoading: false,
      type: LOADING_TYPES.INITIAL,
      priority: LOADING_PRIORITIES.NORMAL,
      message: 'Loading...',
      progress: 0,
      error: null,
      success: false,
      cancelled: false,
    };
  }, [loadingStates]);

  // Check if any loading is active
  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(state => state.isLoading);
  }, [loadingStates]);

  // Get highest priority loading state
  const getHighestPriorityLoading = useCallback(() => {
    const activeStates = Object.values(loadingStates).filter(state => state.isLoading);
    if (activeStates.length === 0) return null;

    const priorityOrder = [
      LOADING_PRIORITIES.CRITICAL,
      LOADING_PRIORITIES.HIGH,
      LOADING_PRIORITIES.NORMAL,
      LOADING_PRIORITIES.LOW,
    ];

    return activeStates.reduce((highest, current) => {
      const currentPriority = priorityOrder.indexOf(current.priority);
      const highestPriority = priorityOrder.indexOf(highest.priority);
      return currentPriority < highestPriority ? current : highest;
    });
  }, [loadingStates]);

  // Update global loading state
  useEffect(() => {
    const highestPriority = getHighestPriorityLoading();
    if (highestPriority) {
      setGlobalState({
        isLoading: true,
        message: highestPriority.message,
        progress: highestPriority.progress,
        type: highestPriority.type,
        priority: highestPriority.priority,
      });
    } else {
      setGlobalState(prev => ({
        ...prev,
        isLoading: false,
      }));
    }

    if (onGlobalLoadingChange) {
      onGlobalLoadingChange(!!highestPriority);
    }
  }, [loadingStates, getHighestPriorityLoading, onGlobalLoadingChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(loadingTimeouts.current).forEach(clearTimeout);
    };
  }, []);

  const contextValue = {
    loadingStates,
    globalState,
    startLoading,
    updateLoading,
    completeLoading,
    cancelLoading,
    getLoadingState,
    isAnyLoading,
    getHighestPriorityLoading,
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      <div className={className} {...props}>
        {children}
      </div>
    </LoadingContext.Provider>
  );
};

// Loading wrapper component
const LoadingWrapper = ({
  children,
  loadingKey,
  loadingType = LOADING_TYPES.INITIAL,
  loadingMessage = null,
  showSkeleton = true,
  skeletonVariant = 'default',
  className = '',
  ...props
}) => {
  const { getLoadingState } = useLoadingManager();
  const loadingState = getLoadingState(loadingKey);

  if (loadingState.isLoading) {
    if (showSkeleton) {
      return (
        <div className={className} {...props}>
          {renderSkeleton(skeletonVariant, loadingState)}
        </div>
      );
    }

    return (
      <div className={className} {...props}>
        <EnhancedLoading
          type={loadingType}
          message={loadingMessage || loadingState.message}
          progress={loadingState.progress}
          size="lg"
        />
      </div>
    );
  }

  return <div className={className} {...props}>{children}</div>;
};

// Render skeleton based on variant
const renderSkeleton = (variant, _loadingState) => {
  switch (variant) {
    case 'card':
      return <AdvancedSkeleton.Card lines={3} />;
    case 'table':
      return <AdvancedSkeleton.Table rows={5} columns={4} />;
    case 'form':
      return <AdvancedSkeleton.Form fields={4} />;
    case 'list':
      return <AdvancedSkeleton.List items={5} />;
    case 'dashboard':
      return <AdvancedSkeleton.Dashboard />;
    case 'chart':
      return <AdvancedSkeleton.Chart type="line" />;
    default:
      return <AdvancedSkeleton.Base height="4rem" width="100%" />;
  }
};

// Loading button component
const LoadingButton = ({
  children,
  loadingKey,
  loadingType = LOADING_TYPES.SUBMIT,
  loadingMessage = 'Submitting...',
  onClick = null,
  disabled = false,
  className = '',
  ...props
}) => {
  const { getLoadingState, startLoading, completeLoading } = useLoadingManager();
  const loadingState = getLoadingState(loadingKey);

  const handleClick = async (e) => {
    if (loadingState.isLoading || disabled) return;

    try {
      startLoading(loadingKey, {
        type: loadingType,
        message: loadingMessage,
      });

      if (onClick) {
        await onClick(e);
      }

      completeLoading(loadingKey, { success: true });
    } catch (error) {
      completeLoading(loadingKey, { success: false, error: error.message });
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loadingState.isLoading}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors
        ${disabled || loadingState.isLoading 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2'
        }
        ${className}
      `}
      {...props}
    >
      {loadingState.isLoading && (
        <EnhancedLoading
          type={loadingType}
          variant="spinner"
          size="sm"
          message={loadingMessage}
        />
      )}
      {loadingState.isLoading ? loadingMessage : children}
    </button>
  );
};

// Loading overlay component
const LoadingOverlay = ({
  children,
  loadingKey,
  loadingMessage = 'Loading...',
  showProgress = false,
  allowCancel = false,
  onCancel = null,
  className = '',
  ...props
}) => {
  const { getLoadingState, cancelLoading } = useLoadingManager();
  const loadingState = getLoadingState(loadingKey);

  if (!loadingState.isLoading) {
    return <div className={className} {...props}>{children}</div>;
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    cancelLoading(loadingKey);
  };

  return (
    <div className={`relative ${className}`} {...props}>
      {children}
      <div className="absolute inset-0 bg-black/50 dark:bg-slate-900/75 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 text-center max-w-sm mx-4">
          <EnhancedLoading
            type={loadingState.type}
            message={loadingMessage || loadingState.message}
            progress={showProgress ? loadingState.progress : null}
            size="lg"
            allowCancel={allowCancel}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  );
};

// Global loading indicator
const GlobalLoadingIndicator = ({
  className = '',
  ...props
}) => {
  const { globalState } = useLoadingManager();

  if (!globalState.isLoading) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`} {...props}>
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 shadow-lg">
        <EnhancedLoading
          type={globalState.type}
          message={globalState.message}
          progress={globalState.progress}
          size="md"
        />
      </div>
    </div>
  );
};

// Export components
LoadingStatesManager.Wrapper = LoadingWrapper;
LoadingStatesManager.Button = LoadingButton;
LoadingStatesManager.Overlay = LoadingOverlay;
LoadingStatesManager.GlobalIndicator = GlobalLoadingIndicator;

export default LoadingStatesManager;




