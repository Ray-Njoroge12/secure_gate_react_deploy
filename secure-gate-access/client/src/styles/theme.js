// client/src/styles/theme.js
export const theme = {
  // Brand Colors
  colors: {
    primary: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',  // Main brand color
      600: '#16a34a',  // Primary button background
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    secondary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',  // Secondary elements
      800: '#1e293b',  // Dark backgrounds
      900: '#0f172a',
    },
    accent: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',  // Links and info
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    success: {
      50: '#f0fdf4',
      500: '#22c55e',
      600: '#15803d',  // Darker for WCAG AA compliance
      700: '#166534',
      800: '#14532d',
      900: '#0f5132',
    },
    warning: {
      50: '#fffbeb',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
    },
    error: {
      50: '#fef2f2',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    }
  },

  // Typography
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Consolas', 'monospace']
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    }
  },

  // Spacing & Layout
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
    '2xl': '4rem',
    '3xl': '6rem',
  },

  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px',
  },

  // Shadows
  boxShadow: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    base: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    md: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    lg: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  },

  // Animation & Transitions
  animation: {
    duration: {
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
    },
    easing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    }
  }
};

// Brand configuration
export const brandConfig = {
  name: 'SecureGate',
  tagline: 'Estate Access Management System',
  logo: {
    text: 'SecureGate',
    icon: '🏛️', // Can be replaced with actual SVG/image
    full: 'SecureGate Access Control'
  },
  
  // Estate-specific branding (configurable)
  estate: {
    name: 'Greenwood Estate', // Default - can be configured
    logo: null, // Configurable estate logo
    colors: {
      primary: '#22c55e', // Can be overridden per estate
      secondary: '#1e293b'
    }
  },

  // Contact & Support
  support: {
    email: 'support@securegate.com',
    phone: '+1-555-GATE-001',
    website: 'https://securegate.com'
  }
};

// Component-specific styling tokens
export const componentTokens = {
  button: {
    height: {
      sm: '2.5rem',
      md: '3rem',
      lg: '3.5rem'
    },
    padding: {
      sm: '0.5rem 1rem',
      md: '0.75rem 1.5rem',
      lg: '1rem 2rem'
    }
  },
  
  input: {
    height: {
      sm: '2.5rem',
      md: '3rem',
      lg: '3.5rem'
    },
    borderWidth: '1px',
    focusRingWidth: '2px'
  },

  card: {
    padding: {
      sm: '1rem',
      md: '1.5rem',
      lg: '2rem'
    },
    borderRadius: 'lg'
  },

  qrCode: {
    containerPadding: '1.5rem',
    borderRadius: 'lg',
    shadow: 'md'
  }
};

// Accessibility standards
export const a11y = {
  // WCAG 2.1 AA compliant color contrasts
  colorContrast: {
    normal: 4.5,
    large: 3,
    minimum: 7 // AAA standard
  },
  
  // Touch target minimums
  touchTarget: {
    minimum: '44px',
    recommended: '48px'
  },
  
  // Focus indicators
  focus: {
    outlineWidth: '2px',
    outlineOffset: '2px',
    outlineStyle: 'solid'
  }
};

// Dark mode support (future enhancement)
export const darkTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    background: theme.colors.secondary[900],
    surface: theme.colors.secondary[800],
    text: {
      primary: theme.colors.neutral[50],
      secondary: theme.colors.neutral[300],
      tertiary: theme.colors.neutral[500]
    }
  }
};

// Utility functions for theme usage
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
export const getShadow = (size) => theme.boxShadow[size];
export const getBorderRadius = (size) => theme.borderRadius[size];

// CSS custom properties generator for theme
export const generateCSSCustomProperties = (themeObj = theme) => {
  const cssProps = {};
  
  // Generate color variables
  Object.entries(themeObj.colors).forEach(([colorName, shades]) => {
    if (typeof shades === 'object') {
      Object.entries(shades).forEach(([shade, value]) => {
        cssProps[`--color-${colorName}-${shade}`] = value;
      });
    } else {
      cssProps[`--color-${colorName}`] = shades;
    }
  });
  
  // Generate spacing variables
  Object.entries(themeObj.spacing).forEach(([size, value]) => {
    cssProps[`--spacing-${size}`] = value;
  });
  
  // Generate typography variables
  Object.entries(themeObj.typography.fontSize).forEach(([size, value]) => {
    cssProps[`--text-${size}`] = Array.isArray(value) ? value[0] : value;
  });
  
  return cssProps;
};