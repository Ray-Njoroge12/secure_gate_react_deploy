/**
 * Design Tokens
 * 
 * Centralized design tokens that define the visual design language
 * of the SecureGate application. These tokens ensure consistency
 * across all components and interfaces.
 */

// Color Palette
export const colors = {
  // Primary Brand Colors (Green - Security/Trust)
  brand: {
    50: '#ecfdf5',   // Lightest green
    100: '#d1fae5',  // Very light green
    200: '#a7f3d0',  // Light green
    300: '#6ee7b7',  // Medium light green
    400: '#34d399',  // Medium green
    500: '#10b981',  // Primary brand color
    600: '#059669',  // Dark green
    700: '#047857',  // Darker green
    800: '#065f46',  // Very dark green
    900: '#064e3b',  // Darkest green
  },

  // Neutral Colors (Slate - Professional/Modern)
  slate: {
    50: '#f8fafc',   // Lightest slate
    100: '#f1f5f9',  // Very light slate
    200: '#e2e8f0',  // Light slate
    300: '#cbd5e1',  // Medium light slate
    400: '#94a3b8',  // Medium slate
    500: '#64748b',  // Base slate
    600: '#475569',  // Dark slate
    700: '#334155',  // Darker slate
    800: '#1e293b',  // Very dark slate
    900: '#0f172a',  // Darkest slate
  },

  // Semantic Colors
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
  },

  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },

  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },

  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },

  // Alias for compatibility
  primary: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },

  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  accent: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
};

// Typography System
export const typography = {
  fontFamily: {
    sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
    mono: ['"Fira Code"', '"JetBrains Mono"', '"SF Mono"', 'Consolas', 'monospace'],
  },

  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
    '5xl': ['3rem', { lineHeight: '1' }],         // 48px
    '6xl': ['3.75rem', { lineHeight: '1' }],      // 60px
  },

  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// Spacing System (4px base unit)
export const spacing = {
  0: '0px',
  px: '1px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  11: '44px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  28: '112px',
  32: '128px',
  36: '144px',
  40: '160px',
  44: '176px',
  48: '192px',
  52: '208px',
  56: '224px',
  60: '240px',
  64: '256px',
  72: '288px',
  80: '320px',
  96: '384px',
};

// Border Radius System
export const borderRadius = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  full: '9999px',
};

// Shadow System
export const shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  base: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  md: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  lg: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
};

// Breakpoint System
export const breakpoints = {
  xs: '0px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Z-Index System
export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
};

// Animation & Transition System
export const transitions = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  easing: {
    linear: 'linear',
    'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
    'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
    'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    'bounce-out': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },

  properties: {
    all: 'all',
    colors: 'color, background-color, border-color, text-decoration-color, fill, stroke',
    opacity: 'opacity',
    shadow: 'box-shadow',
    transform: 'transform',
  },
};

// Component Tokens
export const componentTokens = {
  button: {
    height: {
      sm: '44px',
      md: '48px',
      lg: '52px',
      xl: '56px',
    },
    padding: {
      sm: '8px 12px',
      md: '12px 16px',
      lg: '12px 20px',
      xl: '16px 24px',
    },
    borderRadius: '8px',
    fontWeight: '500',
    transition: 'all 200ms ease-in-out',
  },

  input: {
    height: {
      sm: '44px',
      md: '48px',
      lg: '52px',
    },
    padding: {
      sm: '8px 12px',
      md: '12px 12px',
      lg: '12px 16px',
    },
    borderRadius: '8px',
    borderWidth: '1px',
    focusRingWidth: '2px',
  },

  card: {
    padding: {
      sm: '16px',
      md: '20px',
      lg: '24px',
    },
    borderRadius: '12px',
    shadow: 'md',
  },

  modal: {
    maxWidth: {
      sm: '400px',
      md: '500px',
      lg: '700px',
      xl: '900px',
    },
    borderRadius: '16px',
    shadow: 'xl',
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },

  sidebar: {
    width: {
      sm: '240px',
      md: '256px',
      lg: '280px',
    },
    borderRadius: '0px',
    shadow: 'lg',
  },

  topbar: {
    height: '64px',
    padding: '0 16px',
    shadow: 'sm',
  },
};

// Accessibility Standards
export const accessibility = {
  colorContrast: {
    normal: 4.5,    // WCAG AA
    large: 3.0,     // WCAG AA for large text
    ui: 3.0,        // WCAG AA for UI components
    enhanced: 7.0,  // WCAG AAA
  },

  touchTargets: {
    minSize: '44px',     // iOS/Android minimum
    recommended: '48px', // Recommended size
    spacing: '8px',      // Minimum spacing between targets
  },

  focusRing: {
    width: '2px',
    offset: '2px',
    color: 'brand.500',
    style: 'solid',
  },

  motion: {
    reduce: 'prefers-reduced-motion: reduce',
    respect: 'prefers-reduced-motion: no-preference',
  },
};

// CSS Variables for dynamic theming
export const cssVariables = {
  '--color-brand-50': colors.brand[50],
  '--color-brand-100': colors.brand[100],
  '--color-brand-200': colors.brand[200],
  '--color-brand-300': colors.brand[300],
  '--color-brand-400': colors.brand[400],
  '--color-brand-500': colors.brand[500],
  '--color-brand-600': colors.brand[600],
  '--color-brand-700': colors.brand[700],
  '--color-brand-800': colors.brand[800],
  '--color-brand-900': colors.brand[900],

  '--color-slate-50': colors.slate[50],
  '--color-slate-100': colors.slate[100],
  '--color-slate-200': colors.slate[200],
  '--color-slate-300': colors.slate[300],
  '--color-slate-400': colors.slate[400],
  '--color-slate-500': colors.slate[500],
  '--color-slate-600': colors.slate[600],
  '--color-slate-700': colors.slate[700],
  '--color-slate-800': colors.slate[800],
  '--color-slate-900': colors.slate[900],

  '--spacing-1': spacing[1],
  '--spacing-2': spacing[2],
  '--spacing-3': spacing[3],
  '--spacing-4': spacing[4],
  '--spacing-5': spacing[5],
  '--spacing-6': spacing[6],
  '--spacing-8': spacing[8],
  '--spacing-10': spacing[10],
  '--spacing-12': spacing[12],
  '--spacing-16': spacing[16],
  '--spacing-20': spacing[20],

  '--radius-sm': borderRadius.sm,
  '--radius-md': borderRadius.md,
  '--radius-lg': borderRadius.lg,
  '--radius-xl': borderRadius.xl,

  '--shadow-sm': shadows.sm,
  '--shadow-md': shadows.md,
  '--shadow-lg': shadows.lg,
  '--shadow-xl': shadows.xl,

  '--transition-fast': transitions.duration.fast,
  '--transition-normal': transitions.duration.normal,
  '--transition-slow': transitions.duration.slow,

  '--ease-in': transitions.easing['ease-in'],
  '--ease-out': transitions.easing['ease-out'],
  '--ease-in-out': transitions.easing['ease-in-out'],
};

// Unified theme object
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  breakpoints,
  zIndex,
  transitions,
  componentTokens,
  accessibility,
  cssVariables,
};

// Export all tokens as a single object
export const tokens = theme;

export default theme;
