/**
 * Loading States Integration Component
 * 
 * Provides easy integration of loading states across the application:
 * - Page-level loading
 * - Component-level loading
 * - Global loading management
 * - Performance monitoring
 */

import React, { createContext, useContext, useCallback, useRef } from 'react';
import { useLoadingStates, LOADING_TYPES, LOADING_PRIORITIES } from '../../hooks/useLoadingStates';
import EnhancedLoading from './EnhancedLoading';
import AdvancedSkeleton from './AdvancedSkeleton';
import ProgressiveLoading from './ProgressiveLoading';

// Loading context for global state management
const LoadingContext = createContext();

const useLoadingIntegration = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoadingIntegration must be used within a LoadingStatesProvider');
  }
  return context;
};

// Loading states provider
const LoadingStatesProvider = ({ children }) => {
  const loadingStates = useRef({});
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

    loadingStates.current[key] = {
      isLoading: true,
      type,
      priority,
      message: message || `Loading ${key}...`,
      progress,
      startTime: Date.now(),
      error: null,
      success: false,
      cancelled: false,
    };

    // Store callbacks
    loadingCallbacks.current[key] = { onComplete, onError };

    // Set timeout if specified
    if (timeout) {
      setTimeout(() => {
        completeLoading(key, { success: false, error: 'Timeout' });
      }, timeout);
    }
  }, []);

  // Update loading state
  const updateLoading = useCallback((key, updates) => {
    if (loadingStates.current[key]) {
      loadingStates.current[key] = {
        ...loadingStates.current[key],
        ...updates,
      };
    }
  }, []);

  // Complete loading
  const completeLoading = useCallback((key, result = {}) => {
    const { success = true, error = null, message = null } = result;
    
    if (loadingStates.current[key]) {
      loadingStates.current[key] = {
        ...loadingStates.current[key],
        isLoading: false,
        success,
        error,
        message: message || (success ? 'Complete' : 'Error'),
        endTime: Date.now(),
      };

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
    }
  }, []);

  // Cancel loading
  const cancelLoading = useCallback((key) => {
    if (loadingStates.current[key]) {
      loadingStates.current[key] = {
        ...loadingStates.current[key],
        isLoading: false,
        cancelled: true,
        endTime: Date.now(),
      };
    }

    // Clear callbacks
    delete loadingCallbacks.current[key];
  }, []);

  // Get loading state
  const getLoadingState = useCallback((key) => {
    return loadingStates.current[key] || {
      isLoading: false,
      type: LOADING_TYPES.INITIAL,
      priority: LOADING_PRIORITIES.NORMAL,
      message: 'Loading...',
      progress: 0,
      error: null,
      success: false,
      cancelled: false,
    };
  }, []);

  // Check if any loading is active
  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates.current).some(state => state.isLoading);
  }, []);

  // Get highest priority loading
  const getHighestPriorityLoading = useCallback(() => {
    const activeStates = Object.values(loadingStates.current).filter(state => state.isLoading);
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
  }, []);

  const contextValue = {
    loadingStates: loadingStates.current,
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
      {children}
    </LoadingContext.Provider>
  );
};

// Page loading wrapper
const PageLoadingWrapper = ({
  children,
  loadingKey,
  loadingType = LOADING_TYPES.INITIAL,
  loadingMessage = null,
  showSkeleton = true,
  skeletonVariant = 'default',
  className = '',
  ...props
}) => {
  const { getLoadingState } = useLoadingIntegration();
  const loadingState = getLoadingState(loadingKey);

  if (loadingState.isLoading) {
    if (showSkeleton) {
      return (
        <div className={className} {...props}>
          {renderPageSkeleton(skeletonVariant, loadingState)}
        </div>
      );
    }

    return (
      <div className={className} {...props}>
        <div className="flex items-center justify-center min-h-[400px]">
          <EnhancedLoading
            type={loadingType}
            message={loadingMessage || loadingState.message}
            progress={loadingState.progress}
            size="lg"
          />
        </div>
      </div>
    );
  }

  return <div className={className} {...props}>{children}</div>;
};

// Component loading wrapper
const ComponentLoadingWrapper = ({
  children,
  loadingKey,
  loadingType = LOADING_TYPES.INITIAL,
  loadingMessage = null,
  showSkeleton = true,
  skeletonVariant = 'default',
  className = '',
  ...props
}) => {
  const { getLoadingState } = useLoadingIntegration();
  const loadingState = getLoadingState(loadingKey);

  if (loadingState.isLoading) {
    if (showSkeleton) {
      return (
        <div className={className} {...props}>
          {renderComponentSkeleton(skeletonVariant, loadingState)}
        </div>
      );
    }

    return (
      <div className={className} {...props}>
        <div className="flex items-center justify-center py-8">
          <EnhancedLoading
            type={loadingType}
            message={loadingMessage || loadingState.message}
            progress={loadingState.progress}
            size="md"
          />
        </div>
      </div>
    );
  }

  return <div className={className} {...props}>{children}</div>;
};

// Button loading wrapper
const ButtonLoadingWrapper = ({
  children,
  loadingKey,
  loadingType = LOADING_TYPES.SUBMIT,
  loadingMessage = 'Loading...',
  onClick = null,
  disabled = false,
  className = '',
  ...props
}) => {
  const { getLoadingState, startLoading, completeLoading } = useLoadingIntegration();
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

// Global loading indicator
const GlobalLoadingIndicator = ({
  className = '',
  ...props
}) => {
  const { getHighestPriorityLoading } = useLoadingIntegration();
  const loadingState = getHighestPriorityLoading();

  if (!loadingState) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`} {...props}>
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 shadow-lg">
        <EnhancedLoading
          type={loadingState.type}
          message={loadingState.message}
          progress={loadingState.progress}
          size="md"
        />
      </div>
    </div>
  );
};

// Render page skeleton
const renderPageSkeleton = (variant, loadingState) => {
  switch (variant) {
    case 'dashboard':
      return <AdvancedSkeleton.Dashboard />;
    case 'table':
      return <AdvancedSkeleton.Table rows={8} columns={5} showHeader />;
    case 'form':
      return <AdvancedSkeleton.Form fields={6} showSubmit />;
    case 'list':
      return <AdvancedSkeleton.List items={8} showAvatar />;
    case 'chart':
      return <AdvancedSkeleton.Chart type="line" height="300px" />;
    default:
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <AdvancedSkeleton.Base height="2rem" width="12rem" />
            <AdvancedSkeleton.Base height="1rem" width="20rem" />
          </div>
          <AdvancedSkeleton.Card lines={4} showActions />
        </div>
      );
  }
};

// Render component skeleton
const renderComponentSkeleton = (variant, loadingState) => {
  switch (variant) {
    case 'card':
      return <AdvancedSkeleton.Card lines={3} showAvatar />;
    case 'table':
      return <AdvancedSkeleton.Table rows={3} columns={4} />;
    case 'form':
      return <AdvancedSkeleton.Form fields={3} />;
    case 'list':
      return <AdvancedSkeleton.List items={3} />;
    case 'chart':
      return <AdvancedSkeleton.Chart type="bar" height="200px" />;
    default:
      return <AdvancedSkeleton.Base height="4rem" width="100%" />;
  }
};

// Export all components
export {
  useLoadingIntegration,
  LoadingStatesProvider,
  PageLoadingWrapper,
  ComponentLoadingWrapper,
  ButtonLoadingWrapper,
  GlobalLoadingIndicator,
};
