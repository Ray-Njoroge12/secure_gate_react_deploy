// client/src/utils/responsive.js
import { useState, useEffect } from 'react';

import logger from './logger';
// Responsive breakpoints matching Tailwind config
export const BREAKPOINTS = {
  xs: 360,  // Mobile phones
  sm: 640,  // Large phones / small tablets
  md: 768,  // Tablets
  lg: 1024, // Laptops
  xl: 1280, // Desktops
  '2xl': 1536, // Large desktops
};

// Hook to get current screen size
export function useScreenSize() {
  const [screenSize, setScreenSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }
    return { width: 1024, height: 768 }; // Default fallback
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateSize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', updateSize);
    updateSize(); // Initial call

    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return screenSize;
}

// Hook to check if screen is at or above a breakpoint
export function useBreakpoint(breakpoint) {
  const { width } = useScreenSize();
  const breakpointValue = BREAKPOINTS[breakpoint];
  
  if (!breakpointValue) {
    logger.warn(`Unknown breakpoint: ${breakpoint}`);
    return false;
  }
  
  return width >= breakpointValue;
}

// Hook to get current breakpoint
export function useCurrentBreakpoint() {
  const { width } = useScreenSize();
  
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

// Utility to get responsive classes based on screen size
// Note: This is a hook since it uses useCurrentBreakpoint
export function useResponsiveClasses(classMap) {
  const breakpoint = useCurrentBreakpoint();
  return classMap[breakpoint] || classMap.default || '';
}

// Touch-friendly sizing utilities
export const TOUCH_SIZES = {
  button: {
    xs: 'min-h-[44px] min-w-[44px] text-sm px-3 py-2',
    sm: 'min-h-[44px] min-w-[44px] text-sm px-4 py-2',
    md: 'min-h-[48px] min-w-[48px] text-base px-6 py-3',
    lg: 'min-h-[52px] min-w-[52px] text-lg px-8 py-4',
  },
  input: {
    xs: 'min-h-[44px] text-sm px-3 py-2',
    sm: 'min-h-[44px] text-sm px-4 py-3',
    md: 'min-h-[48px] text-base px-4 py-3',
    lg: 'min-h-[52px] text-lg px-6 py-4',
  },
  qr: {
    xs: 160,  // Small phones
    sm: 180,  // Large phones
    md: 200,  // Tablets
    lg: 220,  // Laptops and up
  }
};

// Safe area utilities for mobile devices
export function getSafeAreaClasses() {
  return 'pt-safe-area-top pb-safe-area-bottom';
}

// Viewport utilities
export function getViewportClasses(fullHeight = false) {
  const heightClass = fullHeight ? 'min-h-screen' : 'min-h-[calc(100vh-4rem)]';
  return `w-full ${heightClass}`;
}

// Container responsive classes
export function getContainerClasses() {
  return 'w-full max-w-screen-xs xs:max-w-screen-sm sm:max-w-screen-md md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';
}

// Card responsive classes
export function getCardClasses() {
  return 'w-full max-w-md mx-auto xs:max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl';
}

// Grid responsive classes
export function getGridClasses(columns = { xs: 1, sm: 2, md: 3, lg: 4 }) {
  return `grid gap-4 xs:gap-6 grid-cols-${columns.xs} sm:grid-cols-${columns.sm} md:grid-cols-${columns.md} lg:grid-cols-${columns.lg}`;
}