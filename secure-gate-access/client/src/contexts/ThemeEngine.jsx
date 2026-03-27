/**
 * Enhanced Theme Engine
 * 
 * Provides advanced theming capabilities including:
 * - Dynamic theme switching with accessibility support
 * - Estate-specific branding and custom colors
 * - Role-based theme defaults
 * - CSS custom property management
 * - Theme persistence and synchronization
 */

import React, { createContext, useContext, useEffect, useCallback } from 'react';

import { tokens } from '../design-system/tokens.js';

import { useAuth } from './AuthContext.js';
import { useTheme } from './ThemeContext.jsx';

const ThemeEngineContext = createContext(undefined);

/**
 * CSS Custom Property Manager
 */
class CSSPropertyManager {
  constructor() {
    this.root = document.documentElement;
    this.appliedProperties = new Map();
  }

  /**
   * Set a CSS custom property
   */
  setProperty(name, value) {
    const propertyName = name.startsWith('--') ? name : `--${name}`;
    this.root.style.setProperty(propertyName, value);
    this.appliedProperties.set(propertyName, value);
  }

  /**
   * Get a CSS custom property value
   */
  getProperty(name) {
    const propertyName = name.startsWith('--') ? name : `--${name}`;
    return getComputedStyle(this.root).getPropertyValue(propertyName);
  }

  /**
   * Remove a CSS custom property
   */
  removeProperty(name) {
    const propertyName = name.startsWith('--') ? name : `--${name}`;
    this.root.style.removeProperty(propertyName);
    this.appliedProperties.delete(propertyName);
  }

  /**
   * Apply a set of properties
   */
  applyProperties(properties) {
    Object.entries(properties).forEach(([name, value]) => {
      this.setProperty(name, value);
    });
  }

  /**
   * Clear all applied properties
   */
  clearProperties() {
    this.appliedProperties.forEach((_, name) => {
      this.root.style.removeProperty(name);
    });
    this.appliedProperties.clear();
  }

  /**
   * Get all applied properties
   */
  getAppliedProperties() {
    return Object.fromEntries(this.appliedProperties);
  }
}

/**
 * Theme Engine Provider
 */
export const ThemeEngineProvider = ({ children }) => {
  const themeContext = useTheme();
  const { user } = useAuth() || {};
  
  const cssManager = React.useMemo(() => new CSSPropertyManager(), []);

  // Apply design tokens as CSS custom properties
  const applyDesignTokens = useCallback(() => {
    // Apply color tokens
    Object.entries(tokens.colors).forEach(([category, colors]) => {
      if (typeof colors === 'object' && colors !== null) {
        Object.entries(colors).forEach(([shade, value]) => {
          cssManager.setProperty(`color-${category}-${shade}`, value);
        });
      }
    });

    // Apply spacing tokens
    Object.entries(tokens.spacing).forEach(([key, value]) => {
      cssManager.setProperty(`spacing-${key}`, value);
    });

    // Apply typography tokens
    Object.entries(tokens.typography.fontSize).forEach(([size, [value, config]]) => {
      cssManager.setProperty(`font-size-${size}`, value);
      if (config?.lineHeight) {
        cssManager.setProperty(`line-height-${size}`, config.lineHeight);
      }
    });

    // Apply border radius tokens
    Object.entries(tokens.borderRadius).forEach(([key, value]) => {
      cssManager.setProperty(`border-radius-${key}`, value);
    });

    // Apply shadow tokens
    Object.entries(tokens.shadows).forEach(([key, value]) => {
      cssManager.setProperty(`shadow-${key}`, value);
    });

    // Apply z-index tokens
    Object.entries(tokens.zIndex).forEach(([key, value]) => {
      cssManager.setProperty(`z-index-${key}`, value);
    });
  }, [cssManager]);

  // Apply theme-specific properties
  const applyThemeProperties = useCallback(() => {
    const { resolvedTheme, density, customColors } = themeContext;

    // Theme-specific color mappings
    const themeColors = {
      light: {
        'color-background': tokens.colors.slate[50],
        'color-foreground': tokens.colors.slate[900],
        'color-muted': tokens.colors.slate[500],
        'color-border': tokens.colors.slate[200],
        'color-input': tokens.colors.slate[50],
        'color-card': '#ffffff',
        'color-popover': '#ffffff',
        'color-primary': tokens.colors.brand[500],
        'color-primary-foreground': '#ffffff',
        'color-secondary': tokens.colors.slate[100],
        'color-secondary-foreground': tokens.colors.slate[900],
        'color-accent': tokens.colors.slate[100],
        'color-accent-foreground': tokens.colors.slate[900],
        'color-destructive': tokens.colors.error[500],
        'color-destructive-foreground': '#ffffff',
        'color-ring': tokens.colors.brand[500],
      },
      dark: {
        'color-background': tokens.colors.slate[900],
        'color-foreground': tokens.colors.slate[50],
        'color-muted': tokens.colors.slate[400],
        'color-border': tokens.colors.slate[700],
        'color-input': tokens.colors.slate[800],
        'color-card': tokens.colors.slate[800],
        'color-popover': tokens.colors.slate[800],
        'color-primary': tokens.colors.brand[400],
        'color-primary-foreground': tokens.colors.slate[900],
        'color-secondary': tokens.colors.slate[800],
        'color-secondary-foreground': tokens.colors.slate[50],
        'color-accent': tokens.colors.slate[800],
        'color-accent-foreground': tokens.colors.slate[50],
        'color-destructive': tokens.colors.error[400],
        'color-destructive-foreground': tokens.colors.slate[900],
        'color-ring': tokens.colors.brand[400],
      },
      'high-contrast': {
        'color-background': '#ffffff',
        'color-foreground': '#000000',
        'color-muted': '#666666',
        'color-border': '#000000',
        'color-input': '#ffffff',
        'color-card': '#ffffff',
        'color-popover': '#ffffff',
        'color-primary': '#0000ff',
        'color-primary-foreground': '#ffffff',
        'color-secondary': '#f0f0f0',
        'color-secondary-foreground': '#000000',
        'color-accent': '#f0f0f0',
        'color-accent-foreground': '#000000',
        'color-destructive': '#ff0000',
        'color-destructive-foreground': '#ffffff',
        'color-ring': '#0000ff',
      },
      'high-contrast-dark': {
        'color-background': '#000000',
        'color-foreground': '#ffffff',
        'color-muted': '#cccccc',
        'color-border': '#ffffff',
        'color-input': '#000000',
        'color-card': '#000000',
        'color-popover': '#000000',
        'color-primary': '#00ffff',
        'color-primary-foreground': '#000000',
        'color-secondary': '#333333',
        'color-secondary-foreground': '#ffffff',
        'color-accent': '#333333',
        'color-accent-foreground': '#ffffff',
        'color-destructive': '#ff0000',
        'color-destructive-foreground': '#ffffff',
        'color-ring': '#00ffff',
      }
    };

    // Apply theme colors
    const currentThemeColors = themeColors[resolvedTheme] || themeColors.light;
    cssManager.applyProperties(currentThemeColors);

    // Apply density-specific properties
    const densityProperties = {
      compact: {
        'spacing-unit': '0.25rem',
        'component-padding': '0.5rem',
        'component-margin': '0.25rem',
        'text-size-multiplier': '0.9',
        'component-height': '2rem',
        'input-height': '2rem',
        'button-height': '2rem',
      },
      comfortable: {
        'spacing-unit': '0.5rem',
        'component-padding': '1rem',
        'component-margin': '0.5rem',
        'text-size-multiplier': '1',
        'component-height': '2.5rem',
        'input-height': '2.5rem',
        'button-height': '2.5rem',
      },
      spacious: {
        'spacing-unit': '0.75rem',
        'component-padding': '1.5rem',
        'component-margin': '0.75rem',
        'text-size-multiplier': '1.1',
        'component-height': '3rem',
        'input-height': '3rem',
        'button-height': '3rem',
      }
    };

    const currentDensityProperties = densityProperties[density] || densityProperties.comfortable;
    cssManager.applyProperties(currentDensityProperties);

    // Apply custom colors (estate branding)
    if (customColors && Object.keys(customColors).length > 0) {
      cssManager.applyProperties(customColors);
    }
  }, [themeContext, cssManager]);

  // Apply estate-specific branding
  const applyEstateBranding = useCallback((estateConfig) => {
    if (!estateConfig) return;

    const brandingProperties = {};

    // Primary brand color
    if (estateConfig.primaryColor) {
      brandingProperties['color-primary'] = estateConfig.primaryColor;
      brandingProperties['color-ring'] = estateConfig.primaryColor;
    }

    // Secondary brand color
    if (estateConfig.secondaryColor) {
      brandingProperties['color-secondary'] = estateConfig.secondaryColor;
    }

    // Accent color
    if (estateConfig.accentColor) {
      brandingProperties['color-accent'] = estateConfig.accentColor;
    }

    // Logo and branding
    if (estateConfig.logo) {
      brandingProperties['brand-logo-url'] = `url(${estateConfig.logo})`;
    }

    // Custom fonts
    if (estateConfig.fontFamily) {
      brandingProperties['font-family-brand'] = estateConfig.fontFamily;
    }

    cssManager.applyProperties(brandingProperties);
  }, [cssManager]);

  // Generate theme-aware CSS classes
  const generateThemeClasses = useCallback(() => {
    const { resolvedTheme, density, isHighContrast } = themeContext;
    
    const classes = [
      `theme-${resolvedTheme}`,
      `density-${density}`,
    ];

    if (isHighContrast) {
      classes.push('high-contrast-mode');
    }

    return classes.join(' ');
  }, [themeContext]);

  // Get theme-aware styles for components
  const getThemeStyles = useCallback((baseStyles = {}) => {
    const { isReducedMotionMode } = themeContext;
    
    const styles = { ...baseStyles };

    // Apply reduced motion preferences
    if (isReducedMotionMode) {
      styles.transition = 'none';
      styles.animation = 'none';
      styles.transform = 'none';
    }

    return styles;
  }, [themeContext]);

  // Create theme-aware component props
  const createThemeProps = useCallback((_componentType = 'default') => {
    const { resolvedTheme, density, isHighContrast } = themeContext;
    
    return {
      'data-theme': resolvedTheme,
      'data-density': density,
      'data-high-contrast': isHighContrast,
      className: generateThemeClasses(),
    };
  }, [themeContext, generateThemeClasses]);

  // Initialize theme engine
  useEffect(() => {
    applyDesignTokens();
    applyThemeProperties();
  }, [applyDesignTokens, applyThemeProperties]);

  // Apply estate branding when user changes
  useEffect(() => {
    if (user?.estate?.branding) {
      applyEstateBranding(user.estate.branding);
    }
  }, [user?.estate?.branding, applyEstateBranding]);

  const value = {
    // CSS Property Management
    cssManager,
    applyDesignTokens,
    applyThemeProperties,
    applyEstateBranding,
    
    // Theme Utilities
    generateThemeClasses,
    getThemeStyles,
    createThemeProps,
    
    // Theme Context (re-exported for convenience)
    ...themeContext,
  };

  return (
    <ThemeEngineContext.Provider value={value}>
      {children}
    </ThemeEngineContext.Provider>
  );
};

/**
 * useThemeEngine Hook
 */
export const useThemeEngine = () => {
  const context = useContext(ThemeEngineContext);
  
  if (context === undefined) {
    throw new Error('useThemeEngine must be used within a ThemeEngineProvider');
  }
  
  return context;
};

/**
 * withTheme HOC - Injects theme props into components
 */
export const withTheme = (Component) => {
  const ThemedComponent = React.forwardRef((props, ref) => {
    const themeEngine = useThemeEngine();
    
    const themeProps = {
      ...themeEngine.createThemeProps(),
      themeEngine,
    };
    
    return <Component {...props} {...themeProps} ref={ref} />;
  });
  
  ThemedComponent.displayName = `withTheme(${Component.displayName || Component.name})`;
  
  return ThemedComponent;
};

/**
 * ThemeAware component - Automatically applies theme classes and styles
 */
export const ThemeAware = ({ 
  children, 
  as: Component = 'div', 
  className = '', 
  style = {},
  ...props 
}) => {
  const themeEngine = useThemeEngine();
  
  const themeProps = themeEngine.createThemeProps();
  const themeStyles = themeEngine.getThemeStyles(style);
  
  return (
    <Component
      {...props}
      {...themeProps}
      className={`${themeProps.className} ${className}`.trim()}
      style={themeStyles}
    >
      {children}
    </Component>
  );
};

export default ThemeEngineContext;