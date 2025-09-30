// client/src/utils/performanceOptimization.js
import React, { lazy, memo, useMemo, useCallback, useState, useRef, useEffect } from 'react';

// Lazy-loaded components for code splitting
export const LazyGuardDashboard = lazy(() => 
  import('../pages/guard/GuardDashboard.jsx')
);

export const LazyResidentDashboard = lazy(() => 
  import('../pages/Dashboard.js')
);

export const LazyReports = lazy(() => 
  import('../pages/Reports.js')
);

export const LazyVisitorHistory = lazy(() => 
  import('../pages/guard/VisitorHistory.jsx')
);

export const LazySettings = lazy(() => 
  import('../pages/guard/Settings.jsx')
);

export const LazyBulkInvite = lazy(() => 
  import('../pages/ResidentInvites.jsx')
);

// Performance monitoring utilities
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = [];
  }

  // Measure component render time
  measureRender(componentName, renderFn) {
    const start = performance.now();
    const result = renderFn();
    const end = performance.now();
    
    this.recordMetric('render', componentName, end - start);
    return result;
  }

  // Measure async operations
  async measureAsync(operationName, asyncFn) {
    const start = performance.now();
    try {
      const result = await asyncFn();
      const end = performance.now();
      this.recordMetric('async', operationName, end - start);
      return result;
    } catch (error) {
      const end = performance.now();
      this.recordMetric('async_error', operationName, end - start);
      throw error;
    }
  }

  // Record performance metric
  recordMetric(type, name, duration) {
    const key = `${type}_${name}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    this.metrics.get(key).push({
      duration,
      timestamp: Date.now()
    });

    // Keep only last 100 measurements
    const measurements = this.metrics.get(key);
    if (measurements.length > 100) {
      measurements.splice(0, measurements.length - 100);
    }
  }

  // Get performance statistics
  getStats(type, name) {
    const key = `${type}_${name}`;
    const measurements = this.metrics.get(key) || [];
    
    if (measurements.length === 0) return null;

    const durations = measurements.map(m => m.duration);
    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    
    return {
      count: durations.length,
      average: avg,
      min,
      max,
      latest: durations[durations.length - 1]
    };
  }

  // Get all metrics
  getAllStats() {
    const stats = {};
    for (const [key] of this.metrics) {
      const [type, name] = key.split('_');
      stats[key] = this.getStats(type, name);
    }
    return stats;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// High-order component for performance measurement
export function withPerformanceMonitoring(WrappedComponent, componentName) {
  const MemoizedComponent = memo(WrappedComponent);
  
  return function PerformanceMonitoredComponent(props) {
    return performanceMonitor.measureRender(
      componentName, 
      () => <MemoizedComponent {...props} />
    );
  };
}

// Hook for expensive computations with memoization
export function useExpensiveComputation(computeFn, dependencies, name = 'computation') {
  return useMemo(() => {
    return performanceMonitor.measureRender(name, computeFn);
  }, dependencies);
}

// Hook for optimized event handlers
export function useOptimizedCallbacks(handlers) {
  const stableCallbacks = {};
  
  for (const [key, handler] of Object.entries(handlers)) {
    stableCallbacks[key] = useCallback(handler, []);
  }
  
  return stableCallbacks;
}

// Image lazy loading hook
export function useLazyImage(src, options = {}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: options.threshold || 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [options.threshold]);

  const imgProps = {
    ref: imgRef,
    src: isInView ? src : undefined,
    onLoad: () => setIsLoaded(true),
    style: {
      opacity: isLoaded ? 1 : 0,
      transition: 'opacity 0.3s ease-in-out',
      ...options.style
    }
  };

  return { imgProps, isLoaded, isInView };
}

// Virtual scrolling for large lists
export function useVirtualScrolling(items, itemHeight, containerHeight) {
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(0);
  
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2; // Buffer

  useEffect(() => {
    setEndIndex(Math.min(startIndex + visibleCount, items.length));
  }, [startIndex, visibleCount, items.length]);

  const handleScroll = useCallback((scrollTop) => {
    const newStartIndex = Math.floor(scrollTop / itemHeight);
    setStartIndex(Math.max(0, newStartIndex));
  }, [itemHeight]);

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll
  };
}

// Bundle size monitoring
export function getBundleAnalytics() {
  const resourceTiming = performance.getEntriesByType('resource');
  
  const jsFiles = resourceTiming.filter(entry => 
    entry.name.includes('.js') && !entry.name.includes('hot-update')
  );
  
  const cssFiles = resourceTiming.filter(entry => 
    entry.name.includes('.css')
  );
  
  const totalJSSize = jsFiles.reduce((sum, file) => sum + (file.transferSize || 0), 0);
  const totalCSSSize = cssFiles.reduce((sum, file) => sum + (file.transferSize || 0), 0);
  
  return {
    jsFiles: jsFiles.length,
    cssFiles: cssFiles.length,
    totalJSSize: Math.round(totalJSSize / 1024), // KB
    totalCSSSize: Math.round(totalCSSSize / 1024), // KB
    totalSize: Math.round((totalJSSize + totalCSSSize) / 1024), // KB
    resourceTiming
  };
}

// Memory usage monitoring
export function getMemoryUsage() {
  if (performance.memory) {
    return {
      used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
      total: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) // MB
    };
  }
  return null;
}

// React DevTools profiler integration
export function ProfiledComponent({ id, children, onRender }) {
  return (
    <React.Profiler id={id} onRender={onRender}>
      {children}
    </React.Profiler>
  );
}

// Performance debugging hook
export function usePerformanceDebug(componentName, enabled = false) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());

  useEffect(() => {
    if (enabled) {
      renderCount.current += 1;
      const now = Date.now();
      const timeSinceLastRender = now - lastRenderTime.current;
      
      console.log(`[${componentName}] Render #${renderCount.current}, Time since last: ${timeSinceLastRender}ms`);
      
      lastRenderTime.current = now;
    }
  });

  return {
    renderCount: renderCount.current,
    timeSinceLastRender: Date.now() - lastRenderTime.current
  };
}