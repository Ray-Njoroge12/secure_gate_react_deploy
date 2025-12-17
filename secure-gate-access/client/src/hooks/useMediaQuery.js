/**
 * @fileoverview useMediaQuery Hook
 * @description Responsive media query hook for dynamic layout changes
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Predefined breakpoints matching Tailwind CSS
 */
export const BREAKPOINTS = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
  
  // Mobile-first queries
  mobile: '(max-width: 639px)',
  tablet: '(min-width: 640px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
  
  // Orientation
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
  
  // Preferences
  darkMode: '(prefers-color-scheme: dark)',
  lightMode: '(prefers-color-scheme: light)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  highContrast: '(prefers-contrast: high)',
  
  // Touch capability
  touch: '(hover: none) and (pointer: coarse)',
  mouse: '(hover: hover) and (pointer: fine)',
};

/**
 * Hook to check if a media query matches
 * 
 * @param {string} query - CSS media query string or BREAKPOINTS key
 * @returns {boolean} - Whether the query matches
 * 
 * @example
 * // Using predefined breakpoint
 * const isMobile = useMediaQuery('mobile');
 * const isDesktop = useMediaQuery('desktop');
 * 
 * @example
 * // Using custom query
 * const isLargeScreen = useMediaQuery('(min-width: 1200px)');
 * 
 * @example
 * // Checking user preferences
 * const prefersReducedMotion = useMediaQuery('reducedMotion');
 * const prefersDarkMode = useMediaQuery('darkMode');
 */
export function useMediaQuery(query) {
  // Resolve predefined breakpoint or use custom query
  const mediaQuery = BREAKPOINTS[query] || query;

  const [matches, setMatches] = useState(() => {
    // SSR safety
    if (typeof window === 'undefined') return false;
    return window.matchMedia(mediaQuery).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueryList = window.matchMedia(mediaQuery);
    
    // Set initial value
    setMatches(mediaQueryList.matches);

    // Handler for changes
    const handler = (event) => {
      setMatches(event.matches);
    };

    // Modern API (addEventListener)
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handler);
      return () => mediaQueryList.removeEventListener('change', handler);
    } else {
      // Legacy API (addListener) for older browsers
      mediaQueryList.addListener(handler);
      return () => mediaQueryList.removeListener(handler);
    }
  }, [mediaQuery]);

  return matches;
}

/**
 * Hook to get current breakpoint name
 * 
 * @returns {string} - Current breakpoint ('sm', 'md', 'lg', 'xl', '2xl', or 'xs')
 * 
 * @example
 * const breakpoint = useBreakpoint();
 * // Returns 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
 */
export function useBreakpoint() {
  const is2xl = useMediaQuery('2xl');
  const isXl = useMediaQuery('xl');
  const isLg = useMediaQuery('lg');
  const isMd = useMediaQuery('md');
  const isSm = useMediaQuery('sm');

  if (is2xl) return '2xl';
  if (isXl) return 'xl';
  if (isLg) return 'lg';
  if (isMd) return 'md';
  if (isSm) return 'sm';
  return 'xs';
}

/**
 * Hook to check if device is mobile
 * 
 * @returns {boolean} - True if viewport is mobile-sized
 */
export function useIsMobile() {
  return useMediaQuery('mobile');
}

/**
 * Hook to check if device is tablet
 * 
 * @returns {boolean} - True if viewport is tablet-sized
 */
export function useIsTablet() {
  return useMediaQuery('tablet');
}

/**
 * Hook to check if device is desktop
 * 
 * @returns {boolean} - True if viewport is desktop-sized
 */
export function useIsDesktop() {
  return useMediaQuery('desktop');
}

/**
 * Hook to check user accessibility preferences
 * 
 * @returns {Object} - Accessibility preferences
 */
export function useAccessibilityPreferences() {
  const prefersReducedMotion = useMediaQuery('reducedMotion');
  const prefersHighContrast = useMediaQuery('highContrast');
  const prefersDarkMode = useMediaQuery('darkMode');
  const isTouch = useMediaQuery('touch');

  return {
    prefersReducedMotion,
    prefersHighContrast,
    prefersDarkMode,
    isTouch,
  };
}

/**
 * Hook to get responsive value based on breakpoint
 * 
 * @param {Object} values - Object with breakpoint keys and values
 * @returns {*} - Value for current breakpoint
 * 
 * @example
 * const columns = useResponsiveValue({
 *   xs: 1,
 *   sm: 2,
 *   md: 3,
 *   lg: 4,
 *   xl: 5,
 * });
 */
export function useResponsiveValue(values) {
  const breakpoint = useBreakpoint();
  
  // Find the value for current or nearest smaller breakpoint
  const breakpointOrder = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  
  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }
  
  // Fallback to first defined value
  return Object.values(values)[0];
}

export default useMediaQuery;
