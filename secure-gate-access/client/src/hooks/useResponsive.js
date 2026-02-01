/**
 * useResponsive Hook
 * 
 * Provides responsive breakpoint information and device type detection
 * Based on the design system breakpoints and mobile-first approach
 */

import { useState, useEffect } from 'react';
import { breakpoints } from '../design-system/tokens.js';

/**
 * Convert breakpoint strings to numbers for comparison
 */
const breakpointValues = {
  xs: 0,
  sm: parseInt(breakpoints.sm),
  md: parseInt(breakpoints.md),
  lg: parseInt(breakpoints.lg),
  xl: parseInt(breakpoints.xl),
  '2xl': parseInt(breakpoints['2xl'])
};

/**
 * Get current breakpoint based on window width
 */
const getCurrentBreakpoint = (width) => {
  if (width >= breakpointValues['2xl']) return '2xl';
  if (width >= breakpointValues.xl) return 'xl';
  if (width >= breakpointValues.lg) return 'lg';
  if (width >= breakpointValues.md) return 'md';
  if (width >= breakpointValues.sm) return 'sm';
  return 'xs';
};

/**
 * Determine device type based on breakpoint and user agent
 */
const getDeviceType = (breakpoint, userAgent = '') => {
  // Check user agent for mobile/tablet indicators
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTabletUA = /iPad|Android(?!.*Mobile)/i.test(userAgent);
  
  // Combine breakpoint and user agent detection
  if (breakpoint === 'xs' || breakpoint === 'sm') {
    return isMobileUA || breakpoint === 'xs' ? 'mobile' : 'tablet';
  } else if (breakpoint === 'md') {
    return isTabletUA ? 'tablet' : 'desktop';
  } else {
    return 'desktop';
  }
};

/**
 * useResponsive Hook
 * 
 * @returns {Object} Responsive state and utilities
 */
export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState(() => {
    if (typeof window === 'undefined') {
      return { width: 1024, height: 768 }; // Default for SSR
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  });

  const [breakpoint, setBreakpoint] = useState(() => {
    if (typeof window === 'undefined') return 'lg';
    return getCurrentBreakpoint(window.innerWidth);
  });

  const [deviceType, setDeviceType] = useState(() => {
    if (typeof window === 'undefined') return 'desktop';
    return getDeviceType(getCurrentBreakpoint(window.innerWidth), navigator.userAgent);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const newSize = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      setWindowSize(newSize);
      
      const newBreakpoint = getCurrentBreakpoint(newSize.width);
      setBreakpoint(newBreakpoint);
      
      const newDeviceType = getDeviceType(newBreakpoint, navigator.userAgent);
      setDeviceType(newDeviceType);
    };

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Call handler right away so state gets updated with initial window size
    handleResize();

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Convenience booleans
  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';
  const isDesktop = deviceType === 'desktop';

  // Breakpoint booleans
  const isXs = breakpoint === 'xs';
  const isSm = breakpoint === 'sm';
  const isMd = breakpoint === 'md';
  const isLg = breakpoint === 'lg';
  const isXl = breakpoint === 'xl';
  const is2Xl = breakpoint === '2xl';

  // Utility functions
  const isBreakpointUp = (bp) => {
    const currentValue = breakpointValues[breakpoint];
    const targetValue = breakpointValues[bp];
    return currentValue >= targetValue;
  };

  const isBreakpointDown = (bp) => {
    const currentValue = breakpointValues[breakpoint];
    const targetValue = breakpointValues[bp];
    return currentValue < targetValue;
  };

  const isBreakpointBetween = (minBp, maxBp) => {
    const currentValue = breakpointValues[breakpoint];
    const minValue = breakpointValues[minBp];
    const maxValue = breakpointValues[maxBp];
    return currentValue >= minValue && currentValue < maxValue;
  };

  // Touch device detection
  const isTouchDevice = () => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  };

  // Orientation detection
  const isLandscape = windowSize.width > windowSize.height;
  const isPortrait = windowSize.height >= windowSize.width;

  return {
    // Window dimensions
    windowSize,
    width: windowSize.width,
    height: windowSize.height,
    
    // Current breakpoint
    breakpoint,
    
    // Device type
    deviceType,
    isMobile,
    isTablet,
    isDesktop,
    
    // Breakpoint booleans
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    is2Xl,
    
    // Utility functions
    isBreakpointUp,
    isBreakpointDown,
    isBreakpointBetween,
    
    // Device capabilities
    isTouchDevice: isTouchDevice(),
    
    // Orientation
    isLandscape,
    isPortrait,
    
    // Breakpoint values for reference
    breakpoints: breakpointValues
  };
};

export default useResponsive;