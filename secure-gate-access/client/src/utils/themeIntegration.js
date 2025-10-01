// client/src/utils/themeIntegration.js
// Theme integration utilities for consistent styling across components

import { theme } from '../styles/theme.js';

/**
 * Generate consistent component styles based on theme
 */
export const componentStyles = {
  // Button variants with theme colors
  button: {
    base: 'inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    
    variants: {
      primary: `bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white focus:ring-primary-500 shadow-brand`,
      secondary: `bg-secondary-600 hover:bg-secondary-700 active:bg-secondary-800 text-white focus:ring-secondary-500`,
      accent: `bg-accent-600 hover:bg-accent-700 active:bg-accent-800 text-white focus:ring-accent-500`,
      outline: `border-2 border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white focus:ring-primary-500`,
      ghost: `text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900 focus:ring-secondary-500`,
      danger: `bg-red-600 hover:bg-red-700 active:bg-red-800 text-white focus:ring-red-500`
    },
    
    sizes: {
      xs: 'px-2 py-1 text-xs min-h-[32px]',
      sm: 'px-3 py-2 text-sm min-h-[36px]',
      md: 'px-4 py-2 text-sm min-h-[40px]',
      lg: 'px-6 py-3 text-base min-h-[44px]',
      xl: 'px-8 py-4 text-lg min-h-[48px]'
    }
  },

  // Input field styles
  input: {
    base: 'block w-full rounded-md border-secondary-300 bg-secondary-50 text-secondary-900 placeholder-secondary-500 focus:border-primary-500 focus:ring-primary-500 sm:text-sm transition-colors duration-200',
    dark: 'bg-secondary-800 border-secondary-700 text-secondary-200 placeholder-secondary-400 focus:border-primary-400 focus:ring-primary-400',
    error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
    success: 'border-primary-500 focus:border-primary-500 focus:ring-primary-500'
  },

  // Card component styles
  card: {
    base: 'bg-secondary-800 rounded-lg border border-secondary-700 shadow-brand overflow-hidden',
    header: 'px-6 py-4 border-b border-secondary-700 bg-secondary-750',
    content: 'p-6',
    footer: 'px-6 py-4 border-t border-secondary-700 bg-secondary-750'
  },

  // Badge/Status indicator styles
  badge: {
    base: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
    variants: {
      success: 'bg-primary-100 text-primary-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      info: 'bg-accent-100 text-accent-800',
      neutral: 'bg-secondary-100 text-secondary-800'
    }
  },

  // Toast/notification styles
  toast: {
    base: 'fixed top-4 right-4 max-w-sm p-4 rounded-lg shadow-brand border z-50 transform transition-all duration-300',
    variants: {
      success: 'bg-primary-900 border-primary-700 text-primary-100',
      error: 'bg-red-900 border-red-700 text-red-100',
      warning: 'bg-yellow-900 border-yellow-700 text-yellow-100',
      info: 'bg-accent-900 border-accent-700 text-accent-100'
    }
  },

  // Table styles
  table: {
    wrapper: 'overflow-hidden shadow-brand ring-1 ring-secondary-700 rounded-lg',
    table: 'min-w-full divide-y divide-secondary-700',
    thead: 'bg-secondary-750',
    th: 'px-6 py-3 text-left text-xs font-medium text-secondary-300 uppercase tracking-wider',
    tbody: 'bg-secondary-800 divide-y divide-secondary-700',
    tr: 'hover:bg-secondary-750 transition-colors duration-150',
    td: 'px-6 py-4 whitespace-nowrap text-sm text-secondary-200'
  },

  // Modal/Dialog styles
  modal: {
    backdrop: 'fixed inset-0 bg-black bg-opacity-75 transition-opacity z-40',
    container: 'fixed inset-0 z-50 overflow-y-auto',
    wrapper: 'flex min-h-full items-center justify-center p-4',
    content: 'bg-secondary-800 rounded-lg shadow-brand border border-secondary-700 max-w-md w-full',
    header: 'px-6 py-4 border-b border-secondary-700',
    body: 'p-6',
    footer: 'px-6 py-4 border-t border-secondary-700 flex justify-end space-x-3'
  }
};

/**
 * Generate responsive classes for different breakpoints
 */
export const generateResponsiveClasses = (baseClasses, breakpointClasses = {}) => {
  let classes = baseClasses;
  
  Object.entries(breakpointClasses).forEach(([breakpoint, additionalClasses]) => {
    classes += ` ${breakpoint}:${additionalClasses}`;
  });
  
  return classes;
};

/**
 * Combine component variant styles
 */
export const combineStyles = (component, variant = 'primary', size = 'md', additional = '') => {
  const styles = componentStyles[component];
  if (!styles) return additional;
  
  let combined = styles.base;
  
  if (styles.variants && styles.variants[variant]) {
    combined += ` ${styles.variants[variant]}`;
  }
  
  if (styles.sizes && styles.sizes[size]) {
    combined += ` ${styles.sizes[size]}`;
  }
  
  if (additional) {
    combined += ` ${additional}`;
  }
  
  return combined;
};

/**
 * Get semantic colors for different states
 */
export const getSemanticColor = (state, shade = 500) => {
  const colorMap = {
    success: `primary-${shade}`,
    error: `red-${shade}`,
    warning: `yellow-${shade}`,
    info: `accent-${shade}`,
    neutral: `secondary-${shade}`
  };
  
  return colorMap[state] || colorMap.neutral;
};

/**
 * Generate focus ring styles
 */
export const getFocusRingStyles = (color = 'primary') => {
  return `focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${color}-500`;
};

/**
 * Generate hover transition styles
 */
export const getHoverTransition = (property = 'all') => {
  return `transition-${property} duration-200 ease-in-out`;
};

/**
 * Theme-aware class generator for dynamic styling
 */
export const themeClass = {
  // Text colors
  text: {
    primary: 'text-secondary-200',
    secondary: 'text-secondary-400',
    muted: 'text-secondary-500',
    brand: 'text-primary-500',
    accent: 'text-accent-500',
    success: 'text-primary-600',
    error: 'text-red-600',
    warning: 'text-yellow-600'
  },
  
  // Background colors
  bg: {
    primary: 'bg-secondary-900',
    secondary: 'bg-secondary-800',
    surface: 'bg-secondary-750',
    brand: 'bg-primary-600',
    accent: 'bg-accent-600',
    success: 'bg-primary-100',
    error: 'bg-red-100',
    warning: 'bg-yellow-100'
  },
  
  // Border colors
  border: {
    default: 'border-secondary-700',
    light: 'border-secondary-600',
    brand: 'border-primary-600',
    accent: 'border-accent-600',
    success: 'border-primary-600',
    error: 'border-red-600',
    warning: 'border-yellow-600'
  }
};

/**
 * Estate branding configuration utility
 */
export const getEstateBranding = (estateName = 'SecureGate') => {
  const brandConfig = theme.branding.estates[estateName.toLowerCase()] || theme.branding.estates.default;
  
  return {
    ...brandConfig,
    logoClasses: `h-8 w-auto ${brandConfig.logoFilter || ''}`,
    headerClasses: `bg-${brandConfig.primaryColor}-800 border-b border-${brandConfig.primaryColor}-700`,
    accentClasses: `text-${brandConfig.accentColor}-500 bg-${brandConfig.accentColor}-100`
  };
};

/**
 * Utility to check if current theme is dark mode
 */
export const isDarkMode = () => {
  // For now, we're always in dark mode, but this can be extended for theme switching
  return true;
};

/**
 * Generate status indicator styles
 */
export const getStatusStyles = (status) => {
  const statusMap = {
    online: 'bg-primary-500 text-primary-50',
    offline: 'bg-secondary-500 text-secondary-50',
    busy: 'bg-yellow-500 text-yellow-50',
    away: 'bg-orange-500 text-orange-50',
    error: 'bg-red-500 text-red-50'
  };
  
  return statusMap[status] || statusMap.offline;
};

export default {
  componentStyles,
  generateResponsiveClasses,
  combineStyles,
  getSemanticColor,
  getFocusRingStyles,
  getHoverTransition,
  themeClass,
  getEstateBranding,
  isDarkMode,
  getStatusStyles
};