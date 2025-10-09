/**
 * Bundle optimization utilities for reducing bundle size and improving performance
 */

import { memo, useMemo, useCallback } from 'react';

import logger from './logger';
/**
 * Higher-order component for automatic memoization
 * @param {React.Component} Component - Component to wrap
 * @param {Object} options - Optimization options
 * @returns {React.Component} Memoized component
 */
export const withMemoization = (Component, options = {}) => {
  const {
    compareProps = null,
    displayName = Component.displayName || Component.name || 'MemoizedComponent'
  } = options;

  const MemoizedComponent = memo(Component, compareProps);
  MemoizedComponent.displayName = displayName;
  
  return MemoizedComponent;
};

/**
 * Hook for optimizing expensive calculations
 * @param {Function} factory - Function that returns the value
 * @param {Array} deps - Dependencies array
 * @returns {any} Memoized value
 */
export const useOptimizedMemo = (factory, deps) => {
  return useMemo(factory, deps);
};

/**
 * Hook for optimizing callback functions
 * @param {Function} callback - Callback function
 * @param {Array} deps - Dependencies array
 * @returns {Function} Memoized callback
 */
export const useOptimizedCallback = (callback, deps) => {
  return useCallback(callback, deps);
};

/**
 * Bundle size analyzer for development
 * @param {Object} bundleInfo - Bundle information
 * @returns {Object} Analysis results
 */
export const analyzeBundleSize = (bundleInfo) => {
  const analysis = {
    totalSize: 0,
    chunkSizes: {},
    recommendations: [],
    warnings: []
  };

  // Analyze main bundle
  if (bundleInfo.main) {
    analysis.totalSize += bundleInfo.main.size;
    analysis.chunkSizes.main = bundleInfo.main.size;
    
    if (bundleInfo.main.size > 200000) { // 200KB
      analysis.warnings.push('Main bundle is large (>200KB). Consider code splitting.');
    }
  }

  // Analyze vendor bundle
  if (bundleInfo.vendor) {
    analysis.totalSize += bundleInfo.vendor.size;
    analysis.chunkSizes.vendor = bundleInfo.vendor.size;
    
    if (bundleInfo.vendor.size > 500000) { // 500KB
      analysis.warnings.push('Vendor bundle is large (>500KB). Consider optimizing dependencies.');
    }
  }

  // Generate recommendations
  if (analysis.totalSize > 1000000) { // 1MB
    analysis.recommendations.push('Total bundle size is large. Consider implementing more aggressive code splitting.');
  }

  analysis.recommendations.push('Use dynamic imports for non-critical components.');
  analysis.recommendations.push('Implement tree shaking for unused code elimination.');
  analysis.recommendations.push('Consider using smaller alternative libraries where possible.');

  return analysis;
};

/**
 * Component performance profiler
 * @param {string} componentName - Name of the component
 * @param {Object} options - Profiling options
 * @returns {Object} Profiler utilities
 */
export const createComponentProfiler = (componentName, options = {}) => {
  const {
    trackRenders = true,
    trackProps = false,
    logToConsole = false
  } = options;

  let renderCount = 0;
  let lastRenderTime = 0;
  let propChanges = [];

  const profileRender = (props = {}) => {
    if (trackRenders) {
      renderCount++;
      const currentTime = performance.now();
      const renderTime = currentTime - lastRenderTime;
      lastRenderTime = currentTime;

      if (logToConsole) {
        logger.debug(`[PROFILER] ${componentName} render #${renderCount} (${renderTime.toFixed(2)}ms)`);
      }
    }

    if (trackProps) {
      propChanges.push({
        render: renderCount,
        props: { ...props },
        timestamp: Date.now()
      });
    }
  };

  const getProfileData = () => ({
    componentName,
    renderCount,
    propChanges: trackProps ? propChanges : null,
    lastRenderTime
  });

  const resetProfile = () => {
    renderCount = 0;
    lastRenderTime = 0;
    propChanges = [];
  };

  return {
    profileRender,
    getProfileData,
    resetProfile
  };
};

/**
 * Import optimization utilities
 */
export const importOptimizer = {
  /**
   * Create a lazy import with error handling
   * @param {Function} importFn - Dynamic import function
   * @param {Object} options - Options for the lazy import
   * @returns {Function} Lazy import function
   */
  createLazyImport: (importFn, options = {}) => {
    const {
      fallback = null,
      retryAttempts = 3,
      retryDelay = 1000
    } = options;

    return async () => {
      let lastError;
      
      for (let attempt = 1; attempt <= retryAttempts; attempt++) {
        try {
          return await importFn();
        } catch (error) {
          lastError = error;
          
          if (attempt < retryAttempts) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          }
        }
      }
      
      throw lastError;
    };
  },

  /**
   * Preload a component for better performance
   * @param {Function} importFn - Dynamic import function
   * @returns {Promise} Preload promise
   */
  preloadComponent: (importFn) => {
    return importFn();
  },

  /**
   * Create a component bundle for better code splitting
   * @param {Object} components - Components to bundle
   * @returns {Object} Bundled components
   */
  createComponentBundle: (components) => {
    return Object.keys(components).reduce((bundle, key) => {
      bundle[key] = withMemoization(components[key]);
      return bundle;
    }, {});
  }
};

/**
 * Performance monitoring utilities
 */
export const performanceMonitor = {
  /**
   * Measure component render time
   * @param {string} componentName - Name of the component
   * @param {Function} renderFn - Render function
   * @returns {any} Render result
   */
  measureRender: (componentName, renderFn) => {
    const start = performance.now();
    const result = renderFn();
    const end = performance.now();
    
    logger.debug(`[PERF] ${componentName} render time: ${(end - start).toFixed(2)}ms`);
    
    return result;
  },

  /**
   * Monitor memory usage
   * @returns {Object} Memory usage information
   */
  getMemoryUsage: () => {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  },

  /**
   * Monitor bundle loading performance
   * @returns {Promise<Object>} Loading performance data
   */
  getLoadingPerformance: async () => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      totalResources: resources.length,
      totalResourceSize: resources.reduce((total, resource) => total + resource.transferSize, 0)
    };
  }
};

export default {
  withMemoization,
  useOptimizedMemo,
  useOptimizedCallback,
  analyzeBundleSize,
  createComponentProfiler,
  importOptimizer,
  performanceMonitor
};



