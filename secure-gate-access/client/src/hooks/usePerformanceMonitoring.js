// client/src/hooks/usePerformanceMonitoring.js
import { useEffect, useRef } from 'react';
import logger from '../utils/logger';

/**
 * Hook to monitor component performance
 * @param {string} componentName - Name of the component being monitored
 * @param {Object} options - Monitoring options
 * @returns {Object} - Performance utilities
 */
export function usePerformanceMonitoring(componentName, options = {}) {
  const { 
    logMounts = true, 
    logUpdates = false,
    measureRenders = process.env.NODE_ENV === 'development' 
  } = options;

  const mountTime = useRef(null);
  const renderCount = useRef(0);
  const lastRenderTime = useRef(null);

  useEffect(() => {
    // Component mount
    mountTime.current = performance.now();
    renderCount.current++;

    if (logMounts && measureRenders) {
      logger.debug(`[Performance] ${componentName} mounted`);
      performance.mark(`${componentName}-mount`);
    }

    return () => {
      // Component unmount
      if (logMounts && measureRenders && mountTime.current) {
        const lifetime = performance.now() - mountTime.current;
        logger.debug(`[Performance] ${componentName} unmounted after ${lifetime.toFixed(2)}ms, ${renderCount.current} renders`);
      }
    };
  }, [componentName, logMounts, measureRenders]);

  useEffect(() => {
    // Component update
    if (logUpdates && measureRenders && renderCount.current > 1) {
      const now = performance.now();
      const timeSinceLastRender = lastRenderTime.current ? now - lastRenderTime.current : 0;
      logger.debug(`[Performance] ${componentName} updated (render #${renderCount.current}, ${timeSinceLastRender.toFixed(2)}ms since last render)`);
      lastRenderTime.current = now;
    }
  });

  // Measure async operations
  const measureAsync = async (operationName, asyncFn) => {
    if (!measureRenders) {
      return asyncFn();
    }

    const start = performance.now();
    const markName = `${componentName}-${operationName}`;
    
    try {
      performance.mark(`${markName}-start`);
      const result = await asyncFn();
      performance.mark(`${markName}-end`);
      
      const duration = performance.now() - start;
      
      try {
        performance.measure(markName, `${markName}-start`, `${markName}-end`);
      } catch (e) {
        // Marks may not exist, ignore
      }
      
      if (duration > 1000) {
        logger.warn(`[Performance] ${componentName}.${operationName} took ${duration.toFixed(2)}ms (slow)`);
      } else {
        logger.debug(`[Performance] ${componentName}.${operationName} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      logger.error(`[Performance] ${componentName}.${operationName} failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  };

  // Get performance entries
  const getMetrics = () => {
    if (!measureRenders) return null;

    const entries = performance.getEntriesByName(`${componentName}-mount`);
    return {
      renderCount: renderCount.current,
      lifetime: mountTime.current ? performance.now() - mountTime.current : 0,
      performanceEntries: entries
    };
  };

  return {
    measureAsync,
    getMetrics,
    renderCount: renderCount.current
  };
}

/**
 * Measure Web Vitals (CLS, LCP, FID, etc.)
 */
export function measureWebVitals(callback) {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  // Only load web-vitals in production
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(callback);
    getFID(callback);
    getFCP(callback);
    getLCP(callback);
    getTTFB(callback);
  }).catch(err => {
    logger.error('Failed to load web-vitals', err);
  });
}

export default usePerformanceMonitoring;
