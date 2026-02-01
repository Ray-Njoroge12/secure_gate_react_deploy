/**
 * Enhanced Responsive Hook
 * 
 * Extends the base useResponsive hook with additional features:
 * - Container queries support
 * - Responsive component rendering
 * - Breakpoint-specific utilities
 * - Performance optimizations
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useResponsive } from './useResponsive.js';
import { tokens } from '../design-system/tokens.js';

/**
 * Container query observer for element-based responsive behavior
 */
class ContainerQueryObserver {
  constructor() {
    this.observers = new Map();
    this.callbacks = new Map();
  }

  observe(element, breakpoints, callback) {
    if (!element || !('ResizeObserver' in window)) {
      return () => {};
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        const currentBreakpoint = this.getBreakpointFromWidth(width, breakpoints);
        callback(currentBreakpoint, width);
      }
    });

    observer.observe(element);
    this.observers.set(element, observer);
    this.callbacks.set(element, callback);

    return () => {
      observer.disconnect();
      this.observers.delete(element);
      this.callbacks.delete(element);
    };
  }

  getBreakpointFromWidth(width, breakpoints) {
    const sortedBreakpoints = Object.entries(breakpoints)
      .map(([name, value]) => ({ name, value: parseInt(value) }))
      .sort((a, b) => b.value - a.value);

    for (const { name, value } of sortedBreakpoints) {
      if (width >= value) {
        return name;
      }
    }

    return sortedBreakpoints[sortedBreakpoints.length - 1]?.name || 'xs';
  }

  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.callbacks.clear();
  }
}

// Global container query observer instance
const containerQueryObserver = new ContainerQueryObserver();

/**
 * Enhanced responsive hook with container queries and utilities
 */
export const useEnhancedResponsive = (options = {}) => {
  const {
    enableContainerQueries = false,
    containerBreakpoints = tokens.breakpoints,
    debounceMs = 100,
  } = options;

  const baseResponsive = useResponsive();
  const [containerBreakpoint, setContainerBreakpoint] = useState(null);
  const [containerWidth, setContainerWidth] = useState(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Debounced container query callback
  const debouncedCallback = useCallback((breakpoint, width) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setContainerBreakpoint(breakpoint);
      setContainerWidth(width);
    }, debounceMs);
  }, [debounceMs]);

  // Set up container query observer
  useEffect(() => {
    if (!enableContainerQueries || !containerRef.current) {
      return;
    }

    const cleanup = containerQueryObserver.observe(
      containerRef.current,
      containerBreakpoints,
      debouncedCallback
    );

    return cleanup;
  }, [enableContainerQueries, containerBreakpoints, debouncedCallback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Get responsive value based on current breakpoint
  const getResponsiveValue = useCallback((values) => {
    const breakpoint = containerBreakpoint || baseResponsive.breakpoint;
    
    if (typeof values === 'object' && values !== null) {
      // Try exact breakpoint match first
      if (values[breakpoint] !== undefined) {
        return values[breakpoint];
      }
      
      // Fall back to smaller breakpoints
      const breakpointOrder = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
      const currentIndex = breakpointOrder.indexOf(breakpoint);
      
      for (let i = currentIndex; i < breakpointOrder.length; i++) {
        const bp = breakpointOrder[i];
        if (values[bp] !== undefined) {
          return values[bp];
        }
      }
      
      // Return default if available
      return values.default;
    }
    
    return values;
  }, [containerBreakpoint, baseResponsive.breakpoint]);

  // Responsive utilities
  const utils = {
    // Get responsive value based on current breakpoint
    getResponsiveValue,

    // Check if current breakpoint matches condition
    matchesBreakpoint: useCallback((condition) => {
      const breakpoint = containerBreakpoint || baseResponsive.breakpoint;
      
      if (typeof condition === 'string') {
        return breakpoint === condition;
      }
      
      if (Array.isArray(condition)) {
        return condition.includes(breakpoint);
      }
      
      if (typeof condition === 'object') {
        const { min, max, only } = condition;
        
        if (only) {
          return breakpoint === only;
        }
        
        const breakpointValues = {
          xs: 0,
          sm: parseInt(tokens.breakpoints.sm),
          md: parseInt(tokens.breakpoints.md),
          lg: parseInt(tokens.breakpoints.lg),
          xl: parseInt(tokens.breakpoints.xl),
          '2xl': parseInt(tokens.breakpoints['2xl'])
        };
        
        const currentValue = breakpointValues[breakpoint];
        
        if (min && max) {
          return currentValue >= breakpointValues[min] && currentValue < breakpointValues[max];
        }
        
        if (min) {
          return currentValue >= breakpointValues[min];
        }
        
        if (max) {
          return currentValue < breakpointValues[max];
        }
      }
      
      return false;
    }, [containerBreakpoint, baseResponsive.breakpoint]),

    // Get responsive classes
    getResponsiveClasses: useCallback((classMap) => {
      const breakpoint = containerBreakpoint || baseResponsive.breakpoint;
      const classes = [];
      
      Object.entries(classMap).forEach(([bp, className]) => {
        if (bp === breakpoint || (bp === 'default' && !classMap[breakpoint])) {
          classes.push(className);
        }
      });
      
      return classes.join(' ');
    }, [containerBreakpoint, baseResponsive.breakpoint]),

    // Generate responsive CSS
    generateResponsiveCSS: useCallback((property, values) => {
      if (typeof values !== 'object' || values === null) {
        return { [property]: values };
      }
      
      const breakpoint = containerBreakpoint || baseResponsive.breakpoint;
      const value = getResponsiveValue(values);
      
      return value !== undefined ? { [property]: value } : {};
    }, [containerBreakpoint, baseResponsive.breakpoint, getResponsiveValue]),
  };

  // Enhanced responsive state
  const enhancedState = {
    ...baseResponsive,
    
    // Container query state
    containerBreakpoint,
    containerWidth,
    containerRef,
    hasContainerQueries: enableContainerQueries,
    
    // Current effective breakpoint (container or viewport)
    effectiveBreakpoint: containerBreakpoint || baseResponsive.breakpoint,
    
    // Utilities
    ...utils,
  };

  return enhancedState;
};

/**
 * Responsive component that renders different content based on breakpoints
 */
export const ResponsiveRender = ({ 
  breakpoints, 
  fallback = null,
  enableContainerQueries = false,
  children 
}) => {
  const responsive = useEnhancedResponsive({ enableContainerQueries });
  
  const content = responsive.getResponsiveValue(breakpoints) || fallback;
  
  if (typeof content === 'function') {
    return content(responsive);
  }
  
  if (React.isValidElement(content)) {
    return content;
  }
  
  if (typeof children === 'function') {
    return children(responsive);
  }
  
  return content || children || fallback;
};

/**
 * Hook for responsive CSS properties
 */
export const useResponsiveCSS = (cssMap, options = {}) => {
  const responsive = useEnhancedResponsive(options);
  
  const css = React.useMemo(() => {
    const result = {};
    
    Object.entries(cssMap).forEach(([property, values]) => {
      const responsiveCSS = responsive.generateResponsiveCSS(property, values);
      Object.assign(result, responsiveCSS);
    });
    
    return result;
  }, [cssMap, responsive]);
  
  return css;
};

/**
 * Hook for responsive component props
 */
export const useResponsiveProps = (propsMap, options = {}) => {
  const responsive = useEnhancedResponsive(options);
  
  const props = React.useMemo(() => {
    const result = {};
    
    Object.entries(propsMap).forEach(([propName, values]) => {
      const value = responsive.getResponsiveValue(values);
      if (value !== undefined) {
        result[propName] = value;
      }
    });
    
    return result;
  }, [propsMap, responsive]);
  
  return props;
};

/**
 * Responsive grid hook
 */
export const useResponsiveGrid = (gridConfig) => {
  const responsive = useEnhancedResponsive();
  
  const gridProps = React.useMemo(() => {
    const columns = responsive.getResponsiveValue(gridConfig.columns || { xs: 1, sm: 2, md: 3, lg: 4 });
    const gap = responsive.getResponsiveValue(gridConfig.gap || { xs: '1rem', md: '1.5rem' });
    const padding = responsive.getResponsiveValue(gridConfig.padding || { xs: '1rem', md: '2rem' });
    
    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap,
      padding,
    };
  }, [gridConfig, responsive]);
  
  return gridProps;
};

export default useEnhancedResponsive;