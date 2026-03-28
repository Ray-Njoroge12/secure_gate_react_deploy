import React, { memo, useMemo, useCallback, useRef, useEffect } from 'react';

import logger from './logger';
// Higher-order component for performance optimization
export const withPerformanceOptimization = (WrappedComponent, options = {}) => {
  const {
    trackRenders = false,
    logPerformance = false
  } = options;

  const OptimizedComponent = memo((props) => {
    const renderCount = useRef(0);
    const lastRenderTime = useRef(performance.now());

    // Track renders
    useEffect(() => {
      if (trackRenders) {
        renderCount.current += 1;
        const now = performance.now();
        const renderTime = now - lastRenderTime.current;
        
        if (logPerformance) {
          logger.debug(`[PERF] ${WrappedComponent.displayName || WrappedComponent.name} render #${renderCount.current} in ${renderTime.toFixed(2)}ms`);
        }
        
        lastRenderTime.current = now;
      }
    });

    return <WrappedComponent {...props} />;
  });

  OptimizedComponent.displayName = `withPerformanceOptimization(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return OptimizedComponent;
};

// Hook for optimizing expensive calculations
export const useOptimizedValue = (factory, deps) => {
  return useMemo(factory, deps);
};

// Hook for optimizing event handlers
export const useOptimizedCallback = (callback, deps) => {
  return useCallback(callback, deps);
};

// Hook for optimizing refs
export const useOptimizedRef = (initialValue) => {
  return useRef(initialValue);
};

// Hook for debouncing values
export const useDebouncedValue = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Hook for throttling values
export const useThrottledValue = (value, delay) => {
  const [throttledValue, setThrottledValue] = React.useState(value);
  const lastUpdateTime = useRef(0);

  useEffect(() => {
    const now = performance.now();
    
    if (now - lastUpdateTime.current >= delay) {
      setThrottledValue(value);
      lastUpdateTime.current = now;
    }
  }, [value, delay]);

  return throttledValue;
};

// Hook for intersection observer (lazy loading)
export const useIntersectionObserver = (options = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '0px'
  } = options;

  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [hasIntersected, setHasIntersected] = React.useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isElementIntersecting = entry.isIntersecting;
        setIsIntersecting(isElementIntersecting);
        
        if (isElementIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, hasIntersected]);

  return { elementRef, isIntersecting, hasIntersected };
};

// Hook for virtual scrolling
export const useVirtualScrolling = (items, itemHeight, containerHeight, overscan = 5) => {
  const [scrollTop, setScrollTop] = React.useState(0);

  const visibleStart = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleEnd = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(visibleStart, visibleEnd + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleStart * itemHeight;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    visibleStart,
    visibleEnd
  };
};

// Hook for image lazy loading
export const useLazyImage = (src, options = {}) => {
  const {
    placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8vPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZTwvdGV4dD48L3N2Zz4=',
    fallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWY0NDQ0Ii8vPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+RXJyb3I8L3RleHQ+PC9zdmc+'
  } = options;

  const [imageState, setImageState] = React.useState({
    loading: true,
    error: false,
    loaded: false
  });

  const { elementRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    triggerOnce: true
  });

  useEffect(() => {
    if (!isIntersecting) return;

    const img = new Image();
    
    img.onload = () => {
      setImageState({
        loading: false,
        error: false,
        loaded: true
      });
    };

    img.onerror = () => {
      setImageState({
        loading: false,
        error: true,
        loaded: false
      });
    };

    img.src = src;
  }, [src, isIntersecting]);

  return {
    elementRef,
    imageState,
    imageSrc: imageState.error ? fallback : src,
    placeholder
  };
};

// Hook for performance monitoring
export const usePerformanceMonitor = (componentName, options = {}) => {
  const {
    trackRenders = true,
    logToConsole = false
  } = options;

  const renderCount = useRef(0);
  const lastProps = useRef(null);
  const performanceData = useRef({
    componentName,
    renderCount: 0,
    propChanges: [],
    lastRenderTime: null
  });

  // Track renders
  useEffect(() => {
    if (trackRenders) {
      renderCount.current += 1;
      performanceData.current.renderCount = renderCount.current;
      performanceData.current.lastRenderTime = performance.now();

      if (logToConsole) {
        logger.debug(`[PERF] ${componentName} render #${renderCount.current}`);
      }
    }
  });

  // Track prop changes
  const trackPropsChanges = useCallback((props) => {
    if (lastProps.current) {
      const propChanges = Object.keys(props).filter(key => 
        props[key] !== lastProps.current[key]
      );

      if (propChanges.length > 0) {
        performanceData.current.propChanges.push({
          render: renderCount.current,
          changedProps: propChanges,
          timestamp: performance.now()
        });
      }
    }

    lastProps.current = { ...props };
  }, []);

  return {
    renderCount: renderCount.current,
    performanceData: performanceData.current,
    trackProps: trackPropsChanges
  };
};

// Utility for creating optimized selectors
export const createOptimizedSelector = (selector, _equalityFn) => {
  let lastResult;
  let lastArgs;

  return (...args) => {
    if (lastArgs && args.length === lastArgs.length && args.every((arg, i) => arg === lastArgs[i])) {
      return lastResult;
    }

    lastArgs = args;
    lastResult = selector(...args);
    return lastResult;
  };
};

// Utility for creating optimized event handlers
export const createOptimizedEventHandler = (handler, deps) => {
  return useCallback(handler, deps);
};

// Utility for creating optimized refs
export const createOptimizedRef = (initialValue) => {
  return useRef(initialValue);
};

// Export all utilities
export default {
  withPerformanceOptimization,
  useOptimizedValue,
  useOptimizedCallback,
  useOptimizedRef,
  useDebouncedValue,
  useThrottledValue,
  useIntersectionObserver,
  useVirtualScrolling,
  useLazyImage,
  usePerformanceMonitor,
  createOptimizedSelector,
  createOptimizedEventHandler,
  createOptimizedRef
};