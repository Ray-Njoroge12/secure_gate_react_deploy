// Loading context for managing global loading states
import React, { createContext, useContext, useState, useCallback } from 'react';
import Loading from '../components/ui/LoadingStates';

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const [loadingStates, setLoadingStates] = useState({});
  const [globalLoading, setGlobalLoading] = useState(false);
  const [loadingQueue, setLoadingQueue] = useState([]);

  // Set loading state for a specific key
  const setLoading = useCallback((key, loading, options = {}) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        loading,
        message: options.message || 'Loading...',
        progress: options.progress || null,
        variant: options.variant || 'spinner',
        overlay: options.overlay || false,
        ...options
      }
    }));
  }, []);

  // Get loading state for a specific key
  const getLoading = useCallback((key) => {
    return loadingStates[key] || { loading: false };
  }, [loadingStates]);

  // Check if any loading state is active
  const isLoading = useCallback((key) => {
    if (key) {
      return getLoading(key).loading;
    }
    return Object.values(loadingStates).some(state => state.loading) || globalLoading;
  }, [loadingStates, globalLoading, getLoading]);

  // Set global loading state
  const setGlobalLoadingState = useCallback((loading, options = {}) => {
    setGlobalLoading(loading);
    if (loading) {
      setLoadingStates(prev => ({
        ...prev,
        global: {
          loading,
          message: options.message || 'Loading...',
          progress: options.progress || null,
          variant: options.variant || 'spinner',
          overlay: options.overlay || true,
          ...options
        }
      }));
    } else {
      setLoadingStates(prev => {
        const newStates = { ...prev };
        delete newStates.global;
        return newStates;
      });
    }
  }, []);

  // Add to loading queue
  const addToQueue = useCallback((key, options = {}) => {
    setLoadingQueue(prev => [...prev, { key, options, timestamp: Date.now() }]);
    setLoading(key, true, options);
  }, [setLoading]);

  // Remove from loading queue
  const removeFromQueue = useCallback((key) => {
    setLoadingQueue(prev => prev.filter(item => item.key !== key));
    setLoading(key, false);
  }, [setLoading]);

  // Clear all loading states
  const clearAllLoading = useCallback(() => {
    setLoadingStates({});
    setGlobalLoading(false);
    setLoadingQueue([]);
  }, []);

  // Clear specific loading state
  const clearLoading = useCallback((key) => {
    setLoading(key, false);
    setLoadingQueue(prev => prev.filter(item => item.key !== key));
  }, [setLoading]);

  // Get loading message
  const getLoadingMessage = useCallback((key) => {
    const state = getLoading(key);
    return state.message || 'Loading...';
  }, [getLoading]);

  // Get loading progress
  const getLoadingProgress = useCallback((key) => {
    const state = getLoading(key);
    return state.progress || null;
  }, [getLoading]);

  // Get loading variant
  const getLoadingVariant = useCallback((key) => {
    const state = getLoading(key);
    return state.variant || 'spinner';
  }, [getLoading]);

  // Check if overlay should be shown
  const shouldShowOverlay = useCallback((key) => {
    const state = getLoading(key);
    return state.overlay || false;
  }, [getLoading]);

  // Get queue length
  const getQueueLength = useCallback(() => {
    return loadingQueue.length;
  }, [loadingQueue]);

  // Get next item in queue
  const getNextInQueue = useCallback(() => {
    return loadingQueue[0] || null;
  }, [loadingQueue]);

  const value = {
    // State
    loadingStates,
    globalLoading,
    loadingQueue,
    
    // Actions
    setLoading,
    getLoading,
    isLoading,
    setGlobalLoadingState,
    addToQueue,
    removeFromQueue,
    clearAllLoading,
    clearLoading,
    
    // Getters
    getLoadingMessage,
    getLoadingProgress,
    getLoadingVariant,
    shouldShowOverlay,
    getQueueLength,
    getNextInQueue
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {/* Global loading overlay */}
      {globalLoading && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 text-center">
            <Loading
              size="lg"
              variant={getLoadingVariant('global')}
              text={getLoadingMessage('global')}
              progress={getLoadingProgress('global')}
            />
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

// Higher-order component for loading states
export const withLoading = (WrappedComponent, loadingKey) => {
  return function WithLoadingComponent(props) {
    const { isLoading, getLoading } = useLoading();
    const loading = isLoading(loadingKey);
    const loadingState = getLoading(loadingKey);

    return (
      <Loading.Overlay loading={loading} message={loadingState.message}>
        <WrappedComponent {...props} />
      </Loading.Overlay>
    );
  };
};

// Hook for managing loading state with automatic cleanup
export const useLoadingState = (key, options = {}) => {
  const { setLoading, clearLoading } = useLoading();

  const startLoading = useCallback((loadingOptions = {}) => {
    setLoading(key, true, { ...options, ...loadingOptions });
  }, [key, options, setLoading]);

  const stopLoading = useCallback(() => {
    clearLoading(key);
  }, [key, clearLoading]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      clearLoading(key);
    };
  }, [key, clearLoading]);

  return {
    startLoading,
    stopLoading
  };
};

export { LoadingContext };
export default LoadingContext;

