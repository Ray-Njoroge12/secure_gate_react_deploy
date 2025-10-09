/**
 * Design System Utilities
 * 
 * Utility functions and helpers for working with the design system,
 * including theme access, responsive utilities, and common patterns.
 */

import { tokens } from './tokens';

// Theme access utilities
export const getThemeValue = (path, theme = tokens) => {
  const keys = path.split('.');
  let value = theme;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  
  return value;
};

export const getColor = (colorPath, theme = tokens) => {
  return getThemeValue(`colors.${colorPath}`, theme);
};

export const getSpacing = (size, theme = tokens) => {
  return getThemeValue(`spacing.${size}`, theme);
};

export const getShadow = (size, theme = tokens) => {
  return getThemeValue(`shadows.${size}`, theme);
};

export const getBorderRadius = (size, theme = tokens) => {
  return getThemeValue(`borderRadius.${size}`, theme);
};

export const getBreakpoint = (size, theme = tokens) => {
  return getThemeValue(`breakpoints.${size}`, theme);
};

export const getFontSize = (size, theme = tokens) => {
  return getThemeValue(`typography.fontSize.${size}`, theme);
};

export const getFontWeight = (weight, theme = tokens) => {
  return getThemeValue(`typography.fontWeight.${weight}`, theme);
};

// Responsive utilities
export const createResponsiveValue = (values) => {
  if (typeof values === 'object' && values !== null) {
    return {
      base: values.base || values.sm || values.md || values.lg || values.xl,
      sm: values.sm || values.base,
      md: values.md || values.sm || values.base,
      lg: values.lg || values.md || values.sm || values.base,
      xl: values.xl || values.lg || values.md || values.sm || values.base,
    };
  }
  return values;
};

export const getResponsiveValue = (values, breakpoint = 'base') => {
  if (typeof values === 'object' && values !== null) {
    return values[breakpoint] || values.base || values;
  }
  return values;
};

// Color utilities
export const createColorScale = (baseColor, steps = 9) => {
  // This is a simplified color scale generator
  // In a real implementation, you'd use a proper color manipulation library
  const scale = {};
  for (let i = 0; i < steps; i++) {
    const step = (i + 1) * 100;
    scale[step] = baseColor; // Simplified - would need actual color manipulation
  }
  return scale;
};

export const getContrastColor = (backgroundColor) => {
  // Simple contrast calculation - in production, use a proper color library
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? tokens.colors.slate[900] : tokens.colors.slate[50];
};

// Spacing utilities
export const createSpacingScale = (baseUnit = 4, steps = 16) => {
  const scale = {};
  for (let i = 0; i <= steps; i++) {
    scale[i] = `${i * baseUnit}px`;
  }
  return scale;
};

export const getSpacingValue = (multiplier = 1, baseUnit = 4) => {
  return `${multiplier * baseUnit}px`;
};

// Typography utilities
export const createTypographyScale = (baseSize = 16, ratio = 1.25) => {
  const scale = {};
  const sizes = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'];
  
  sizes.forEach((size, index) => {
    const multiplier = Math.pow(ratio, index - 2); // base is index 2
    const fontSize = baseSize * multiplier;
    scale[size] = [`${fontSize}px`, { lineHeight: '1.5' }];
  });
  
  return scale;
};

export const getLineHeight = (fontSize, lineHeightRatio = 1.5) => {
  const size = typeof fontSize === 'string' ? parseInt(fontSize) : fontSize;
  return `${Math.round(size * lineHeightRatio)}px`;
};

// Animation utilities
export const createTransition = (properties = 'all', duration = '200ms', easing = 'ease-in-out') => {
  if (Array.isArray(properties)) {
    return properties.map(prop => `${prop} ${duration} ${easing}`).join(', ');
  }
  return `${properties} ${duration} ${easing}`;
};

export const createAnimation = (name, keyframes, duration = '200ms', easing = 'ease-in-out', delay = '0ms') => {
  return {
    animationName: name,
    animationDuration: duration,
    animationTimingFunction: easing,
    animationDelay: delay,
    animationFillMode: 'both',
    keyframes: keyframes,
  };
};

// Layout utilities
export const createContainer = (maxWidth = '1200px', padding = '0 16px') => {
  return {
    maxWidth,
    margin: '0 auto',
    padding,
  };
};

export const createGrid = (columns = 12, gap = '16px') => {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap,
  };
};

export const createFlexbox = (direction = 'row', justify = 'flex-start', align = 'stretch', wrap = 'nowrap') => {
  return {
    display: 'flex',
    flexDirection: direction,
    justifyContent: justify,
    alignItems: align,
    flexWrap: wrap,
  };
};

// Accessibility utilities
export const createFocusRing = (color = tokens.colors.brand[500], width = '2px', offset = '2px') => {
  return {
    outline: 'none',
    boxShadow: `0 0 0 ${width} ${color}`,
    outlineOffset: offset,
  };
};

export const createScreenReaderOnly = () => {
  return {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  };
};

export const createReducedMotion = (prefersReducedMotion = true) => {
  return prefersReducedMotion ? {
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
      transition: 'none',
    },
  } : {};
};

// Component utilities
export const createComponentVariant = (baseStyles, variants) => {
  return (variant, props = {}) => {
    const variantStyles = variants[variant] || {};
    return {
      ...baseStyles,
      ...variantStyles,
      ...props,
    };
  };
};

export const createSizeVariant = (baseStyles, sizes) => {
  return (size, props = {}) => {
    const sizeStyles = sizes[size] || {};
    return {
      ...baseStyles,
      ...sizeStyles,
      ...props,
    };
  };
};

// CSS-in-JS utilities
export const createCSSVariables = (theme = tokens) => {
  const variables = {};
  
  // Color variables
  const addColorVariables = (colors, prefix = '') => {
    Object.entries(colors).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        addColorVariables(value, `${prefix}${key}-`);
      } else {
        variables[`--color-${prefix}${key}`] = value;
      }
    });
  };
  
  addColorVariables(theme.colors);
  
  // Spacing variables
  Object.entries(theme.spacing).forEach(([key, value]) => {
    variables[`--spacing-${key}`] = value;
  });
  
  // Typography variables
  Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
    variables[`--text-${key}`] = Array.isArray(value) ? value[0] : value;
  });
  
  // Other design tokens
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    variables[`--radius-${key}`] = value;
  });
  
  Object.entries(theme.shadows).forEach(([key, value]) => {
    variables[`--shadow-${key}`] = value;
  });
  
  return variables;
};

// Media query utilities
export const createMediaQuery = (breakpoint, theme = tokens) => {
  const breakpointValue = getBreakpoint(breakpoint, theme);
  return `@media (min-width: ${breakpointValue})`;
};

export const createMediaQueries = (theme = tokens) => {
  const queries = {};
  Object.keys(theme.breakpoints).forEach(breakpoint => {
    queries[breakpoint] = createMediaQuery(breakpoint, theme);
  });
  return queries;
};

// Validation utilities
export const isValidColor = (color) => {
  const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return colorRegex.test(color);
};

export const isValidSpacing = (spacing) => {
  const spacingRegex = /^\d+(\.\d+)?(px|rem|em|%)$/;
  return spacingRegex.test(spacing);
};

export const isValidBreakpoint = (breakpoint, theme = tokens) => {
  return breakpoint in theme.breakpoints;
};

// Export all utilities
export const utilities = {
  // Theme access
  getThemeValue,
  getColor,
  getSpacing,
  getShadow,
  getBorderRadius,
  getBreakpoint,
  getFontSize,
  getFontWeight,
  
  // Responsive
  createResponsiveValue,
  getResponsiveValue,
  
  // Color
  createColorScale,
  getContrastColor,
  
  // Spacing
  createSpacingScale,
  getSpacingValue,
  
  // Typography
  createTypographyScale,
  getLineHeight,
  
  // Animation
  createTransition,
  createAnimation,
  
  // Layout
  createContainer,
  createGrid,
  createFlexbox,
  
  // Accessibility
  createFocusRing,
  createScreenReaderOnly,
  createReducedMotion,
  
  // Components
  createComponentVariant,
  createSizeVariant,
  
  // CSS-in-JS
  createCSSVariables,
  createMediaQuery,
  createMediaQueries,
  
  // Validation
  isValidColor,
  isValidSpacing,
  isValidBreakpoint,
};

export default utilities;




