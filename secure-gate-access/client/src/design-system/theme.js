/**
 * Theme Configuration
 * 
 * Theme configuration that combines design tokens with application-specific
 * theming, brand configuration, and component-specific styling.
 */

import { tokens } from './tokens';

// Brand Configuration
export const brandConfig = {
  name: 'SecureGate',
  tagline: 'Estate Access Management System',
  version: '1.0.0',
  
  logo: {
    text: 'SecureGate',
    icon: '🏛️', // Can be replaced with actual SVG/image
    full: 'SecureGate Access Control',
    mark: 'SG', // Short form for compact spaces
  },
  
  // Estate-specific branding (configurable per deployment)
  estate: {
    name: 'Greenwood Estate', // Default - can be configured
    logo: null, // Configurable estate logo
    colors: {
      primary: tokens.colors.brand[500],
      secondary: tokens.colors.slate[800],
    },
    contact: {
      phone: '+1-555-GATE-001',
      email: 'gate@greenwoodestate.com',
      address: '123 Estate Drive, Greenwood, CA 90210',
    },
  },
  
  // Support & Contact
  support: {
    email: 'support@securegate.com',
    phone: '+1-555-GATE-001',
    website: 'https://securegate.com',
    documentation: 'https://docs.securegate.com',
  },
};

// Application Theme
export const theme = {
  // Core design tokens
  ...tokens,
  
  // Application-specific color mappings
  colors: {
    ...tokens.colors,
    
    // Semantic color mappings for the application
    background: {
      primary: tokens.colors.slate[900],    // Main app background
      secondary: tokens.colors.slate[800],  // Panel/card backgrounds
      tertiary: tokens.colors.slate[700],   // Elevated surfaces
      inverse: tokens.colors.slate[50],     // Light backgrounds
    },
    
    text: {
      primary: tokens.colors.slate[50],     // Primary text
      secondary: tokens.colors.slate[300],  // Secondary text
      tertiary: tokens.colors.slate[400],   // Tertiary text
      inverse: tokens.colors.slate[900],    // Text on light backgrounds
      muted: tokens.colors.slate[500],      // Muted text
      disabled: tokens.colors.slate[600],   // Disabled text
    },
    
    border: {
      primary: tokens.colors.slate[700],    // Primary borders
      secondary: tokens.colors.slate[600],  // Secondary borders
      focus: tokens.colors.brand[500],      // Focus borders
      error: tokens.colors.error[500],      // Error borders
      success: tokens.colors.success[500],  // Success borders
    },
    
    // Status colors with proper contrast
    status: {
      online: tokens.colors.success[500],
      offline: tokens.colors.slate[500],
      pending: tokens.colors.warning[500],
      error: tokens.colors.error[500],
      info: tokens.colors.info[500],
    },
  },
  
  // Component-specific theming
  components: {
    button: {
      primary: {
        background: tokens.colors.brand[500],
        backgroundHover: tokens.colors.brand[600],
        backgroundActive: tokens.colors.brand[700],
        text: tokens.colors.slate[50],
        border: tokens.colors.brand[500],
      },
      secondary: {
        background: 'transparent',
        backgroundHover: tokens.colors.slate[700],
        backgroundActive: tokens.colors.slate[600],
        text: tokens.colors.slate[300],
        border: tokens.colors.slate[600],
      },
      danger: {
        background: tokens.colors.error[500],
        backgroundHover: tokens.colors.error[600],
        backgroundActive: tokens.colors.error[700],
        text: tokens.colors.slate[50],
        border: tokens.colors.error[500],
      },
    },
    
    input: {
      background: tokens.colors.slate[800],
      backgroundFocus: tokens.colors.slate[700],
      text: tokens.colors.slate[50],
      placeholder: tokens.colors.slate[400],
      border: tokens.colors.slate[600],
      borderFocus: tokens.colors.brand[500],
      borderError: tokens.colors.error[500],
    },
    
    card: {
      background: tokens.colors.slate[800],
      border: tokens.colors.slate[700],
      shadow: tokens.shadows.md,
    },
    
    modal: {
      background: tokens.colors.slate[800],
      backdrop: 'rgba(0, 0, 0, 0.5)',
      border: tokens.colors.slate[700],
      shadow: tokens.shadows.xl,
    },
    
    sidebar: {
      background: tokens.colors.slate[900],
      border: tokens.colors.slate[700],
      text: tokens.colors.slate[300],
      textActive: tokens.colors.slate[50],
      textHover: tokens.colors.slate[200],
    },
    
    topbar: {
      background: tokens.colors.slate[900],
      border: tokens.colors.slate[700],
      text: tokens.colors.slate[300],
      shadow: tokens.shadows.sm,
    },
  },
  
  // Layout configuration
  layout: {
    sidebar: {
      width: {
        sm: '240px',
        md: '256px',
        lg: '280px',
      },
      collapsedWidth: '64px',
    },
    
    topbar: {
      height: '64px',
    },
    
    content: {
      maxWidth: '1200px',
      padding: tokens.spacing[6],
    },
  },
  
  // Animation presets
  animations: {
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
      duration: tokens.transitions.duration.normal,
      easing: tokens.transitions.easing['ease-out'],
    },
    
    slideIn: {
      from: { transform: 'translateY(-10px)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 },
      duration: tokens.transitions.duration.normal,
      easing: tokens.transitions.easing['ease-out'],
    },
    
    scaleIn: {
      from: { transform: 'scale(0.95)', opacity: 0 },
      to: { transform: 'scale(1)', opacity: 1 },
      duration: tokens.transitions.duration.fast,
      easing: tokens.transitions.easing['bounce-out'],
    },
  },
};

// Dark theme (current default)
export const darkTheme = theme;

// Light theme (future enhancement)
export const lightTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    background: {
      primary: tokens.colors.slate[50],
      secondary: tokens.colors.slate[100],
      tertiary: tokens.colors.slate[200],
      inverse: tokens.colors.slate[900],
    },
    text: {
      primary: tokens.colors.slate[900],
      secondary: tokens.colors.slate[700],
      tertiary: tokens.colors.slate[600],
      inverse: tokens.colors.slate[50],
      muted: tokens.colors.slate[500],
      disabled: tokens.colors.slate[400],
    },
    border: {
      primary: tokens.colors.slate[300],
      secondary: tokens.colors.slate[200],
      focus: tokens.colors.brand[500],
      error: tokens.colors.error[500],
      success: tokens.colors.success[500],
    },
  },
};

// Theme utilities
export const getColor = (colorPath) => {
  const parts = colorPath.split('.');
  let color = theme.colors;
  
  for (const part of parts) {
    color = color[part];
    if (!color) return null;
  }
  
  return color;
};

export const getSpacing = (size) => theme.spacing[size];
export const getShadow = (size) => theme.shadows[size];
export const getBorderRadius = (size) => theme.borderRadius[size];
export const getBreakpoint = (size) => theme.breakpoints[size];

// CSS Custom Properties generator
export const generateCSSCustomProperties = (themeObj = theme) => {
  const cssProps = {};
  
  // Generate color variables
  const generateColorVars = (colors, prefix = '') => {
    Object.entries(colors).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        generateColorVars(value, `${prefix}${key}-`);
      } else {
        cssProps[`--color-${prefix}${key}`] = value;
      }
    });
  };
  
  generateColorVars(themeObj.colors);
  
  // Generate spacing variables
  Object.entries(themeObj.spacing).forEach(([size, value]) => {
    cssProps[`--spacing-${size}`] = value;
  });
  
  // Generate typography variables
  Object.entries(themeObj.typography.fontSize).forEach(([size, value]) => {
    cssProps[`--text-${size}`] = Array.isArray(value) ? value[0] : value;
  });
  
  // Generate other design tokens
  Object.entries(themeObj.borderRadius).forEach(([size, value]) => {
    cssProps[`--radius-${size}`] = value;
  });
  
  Object.entries(themeObj.shadows).forEach(([size, value]) => {
    cssProps[`--shadow-${size}`] = value;
  });
  
  return cssProps;
};

export default theme;




