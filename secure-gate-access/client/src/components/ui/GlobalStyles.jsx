/**
 * @file GlobalStyles.jsx
 * @description Global UI styles and CSS-in-JS enhancements
 * Phase 4: UI/UX Improvements - Global Style System
 * 
 * Features:
 * - Smooth scroll behavior
 * - Focus management styles
 * - Animation definitions
 * - Print styles
 * - High contrast mode support
 * - Reduced motion support
 */

import React, { useEffect } from 'react';
import './GlobalStyles.css';

/**
 * GlobalStyles Component
 * Imports global CSS styles into the document
 */
const GlobalStyles = () => {
  // Ensure CSS is loaded
  useEffect(() => {
    // CSS is imported above, this effect ensures it's loaded
    return () => {
      // Cleanup if needed
    };
  }, []);

  return null; // No JSX needed, CSS is imported
};

/**
 * Skip to Main Content Link Component
 * Provides keyboard navigation to skip repeated content
 */
export const SkipLink = ({ mainContentId = 'main-content', children = 'Skip to main content' }) => {
  return (
    <a href={`#${mainContentId}`} className="skip-link">
      {children}
    </a>
  );
};

/**
 * Visible focus wrapper
 * Adds visible focus ring when focused via keyboard
 */
export const FocusRing = ({ children, className = '' }) => {
  return (
    <div className={`focus-within-ring ${className}`}>
      {children}
    </div>
  );
};

/**
 * Animation wrapper component
 */
export const Animated = ({ 
  animation = 'fade-in', 
  delay = 0, 
  duration, 
  children, 
  className = '' 
}) => {
  const style = {
    animationDelay: delay ? `${delay}ms` : undefined,
    animationDuration: duration ? `${duration}ms` : undefined,
  };

  return (
    <div className={`animate-${animation} ${className}`} style={style}>
      {children}
    </div>
  );
};

/**
 * Touch target wrapper - ensures 44px minimum touch target
 */
export const TouchTarget = ({ children, className = '', as: Component = 'div' }) => {
  return (
    <Component className={`touch-target ${className}`}>
      {children}
    </Component>
  );
};

export default GlobalStyles;
