/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable class-based dark mode (controlled by data-theme attribute)
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors (Primary)
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
        
        // Primary Colors (alias for brand)
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
        
        // Secondary Colors (Neutral)
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
        
        // Neutral Colors (Slate)
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
        
        // Accent Colors (Blue)
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
        
        // Application-specific color mappings
        background: {
          primary: '#0f172a',    // Main app background
          secondary: '#1e293b',  // Panel/card backgrounds
          tertiary: '#334155',   // Elevated surfaces
          inverse: '#f8fafc',    // Light backgrounds
        },
        
        text: {
          primary: '#f8fafc',    // Primary text
          secondary: '#cbd5e1',  // Secondary text
          tertiary: '#94a3b8',   // Tertiary text
          inverse: '#0f172a',    // Text on light backgrounds
          muted: '#64748b',      // Muted text
          disabled: '#475569',   // Disabled text
        },
        
        border: {
          primary: '#334155',    // Primary borders
          secondary: '#475569',  // Secondary borders
          focus: '#10b981',      // Focus borders
          error: '#ef4444',      // Error borders
          success: '#10b981',    // Success borders
        },
        
        // Status colors
        status: {
          online: '#10b981',
          offline: '#64748b',
          pending: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      },
      
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"Fira Code"', '"JetBrains Mono"', '"SF Mono"', 'Consolas', 'monospace'],
      },
      
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
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
      
      spacing: {
        // 4px base unit
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
        '32': '128px',
        '40': '160px',
        '48': '192px',
        '56': '224px',
        '64': '256px',
      },
      
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        'full': '9999px',
      },
      
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
      },
      
      zIndex: {
        'hide': -1,
        'auto': 'auto',
        'base': 0,
        'docked': 10,
        'dropdown': 1000,
        'sticky': 1100,
        'banner': 1200,
        'overlay': 1300,
        'modal': 1400,
        'popover': 1500,
        'skipLink': 1600,
        'toast': 1700,
        'tooltip': 1800,
      },
      
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
      },
      
      transitionTimingFunction: {
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      
      screens: {
        'xs': '0px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [
    // Custom utilities for design system
    function({ addUtilities }) {
      const newUtilities = {
        '.touch-target': {
          'min-height': '44px',
          'min-width': '44px',
        },
        '.focus-ring': {
          'outline': '2px solid #10b981',
          'outline-offset': '2px',
        },
        '.text-balance': {
          'text-wrap': 'balance',
        },
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        '.shadow-brand': {
          'box-shadow': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
        '.rounded-smooth': {
          'border-radius': '8px',
        },
        '.bg-app': {
          'background-color': '#0f172a',
        },
        '.bg-panel': {
          'background-color': '#1e293b',
        },
        '.text-app': {
          'color': '#e2e8f0',
        },
        '.text-muted': {
          'color': '#94a3b8',
        },
        '.border-app': {
          'border-color': '#334155',
        },
        '.bg-accent': {
          'background-color': '#10b981',
        },
        '.text-accent': {
          'color': '#10b981',
        },
        '.border-accent': {
          'border-color': '#10b981',
        },
        '.bg-danger': {
          'background-color': '#ef4444',
        },
        '.text-danger': {
          'color': '#ef4444',
        },
        '.border-danger': {
          'border-color': '#ef4444',
        },
        '.bg-line': {
          'background-color': '#334155',
        },
        '.text-line': {
          'color': '#334155',
        },
        '.border-line': {
          'border-color': '#334155',
        },
        // Design System Utilities
        '.bg-app': {
          'background-color': 'var(--color-background-primary)',
        },
        '.bg-panel': {
          'background-color': 'var(--color-background-secondary)',
        },
        '.bg-elevated': {
          'background-color': 'var(--color-background-tertiary)',
        },
        '.text-app': {
          'color': 'var(--color-text-primary)',
        },
        '.text-muted': {
          'color': 'var(--color-text-muted)',
        },
        '.text-disabled': {
          'color': 'var(--color-text-disabled)',
        },
        '.border-app': {
          'border-color': 'var(--color-border-primary)',
        },
        '.border-focus': {
          'border-color': 'var(--color-border-focus)',
        },
        '.focus-ring': {
          'outline': '2px solid var(--color-border-focus)',
          'outline-offset': '2px',
        },
        '.touch-target': {
          'min-height': '44px',
          'min-width': '44px',
        },
        '.text-balance': {
          'text-wrap': 'balance',
        },
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        '.shadow-brand': {
          'box-shadow': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
        '.rounded-smooth': {
          'border-radius': '8px',
        },
        // Status utilities
        '.status-online': {
          'color': 'var(--color-status-online)',
        },
        '.status-offline': {
          'color': 'var(--color-status-offline)',
        },
        '.status-pending': {
          'color': 'var(--color-status-pending)',
        },
        '.status-error': {
          'color': 'var(--color-status-error)',
        },
        '.status-info': {
          'color': 'var(--color-status-info)',
        },
        // Animation utilities
        '.animate-fade-in': {
          'animation': 'fadeIn 200ms ease-out',
        },
        '.animate-slide-in': {
          'animation': 'slideIn 200ms ease-out',
        },
        '.animate-scale-in': {
          'animation': 'scaleIn 150ms ease-out',
        },
        // Layout utilities
        '.container-app': {
          'max-width': '1200px',
          'margin': '0 auto',
          'padding': '0 16px',
        },
        '.grid-responsive': {
          'display': 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
          'gap': '16px',
        },
      };
      
      addUtilities(newUtilities);
    },
  ],
  // Add keyframes for animations
  keyframes: {
    fadeIn: {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
    slideIn: {
      '0%': { transform: 'translateY(-10px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    scaleIn: {
      '0%': { transform: 'scale(0.95)', opacity: '0' },
      '100%': { transform: 'scale(1)', opacity: '1' },
    },
  },
};