// Design Tokens for Secure Gate Access
// Centralized design system values for consistent theming

export const colors = {
  // Primary Brand Colors
  brand: {
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
  
  // Neutral Colors
  slate: {
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
};

export const typography = {
  fontFamily: {
    sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
    mono: ['"Fira Code"', '"JetBrains Mono"', '"SF Mono"', 'Consolas', 'monospace'],
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
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
};

export const spacing = {
  // Base unit: 4px
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
  40: '160px',
  48: '192px',
  56: '224px',
  64: '256px',
};

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

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
};

export const breakpoints = {
  xs: '0px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

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

export const transitions = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },
  
  easing: {
    'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
    'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
    'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  properties: {
    all: 'all',
    colors: 'color, background-color, border-color, text-decoration-color, fill, stroke',
    opacity: 'opacity',
    shadow: 'box-shadow',
    transform: 'transform',
  },
};

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

export const accessibility = {
  colorContrast: {
    normal: 4.5,
    large: 3.0,
    ui: 3.0,
  },
  
  touchTargets: {
    minSize: '44px',
    minSpacing: '8px',
  },
  
  focusRing: {
    width: '2px',
    offset: '2px',
    color: 'brand.500',
  },
  
  motion: {
    reduce: 'prefers-reduced-motion: reduce',
    respect: 'prefers-reduced-motion: no-preference',
  },
};

// Theme object for easy consumption
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
};

// CSS Custom Properties for dynamic theming
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

export default theme;
