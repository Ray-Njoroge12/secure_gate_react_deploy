/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // Color System - Consolidated from design system
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
      
      // Typography System
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
      
      // Spacing System (4px base unit)
      spacing: {
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
      
      // Border Radius System
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        'full': '9999px',
      },
      
      // Shadow System
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        'brand': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
      
      // Z-Index System
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
      
      // Transition System
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
      
      // Responsive Breakpoints
      screens: {
        'xs': '0px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      
      // Animation System
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-in': 'slideIn 200ms ease-out',
        'scale-in': 'scaleIn 150ms ease-out',
        'fade-in-up': 'fadeInUp 300ms ease-out',
        'slide-in-up': 'slideInUp 400ms ease-out',
        'qr-display': 'qrDisplayFadeIn 500ms ease-out',
        'success-bounce': 'successBounce 600ms ease-out',
        'error-shake': 'shake 500ms ease-in-out',
        'loading-pulse': 'pulse 1.5s ease-in-out infinite',
        'page-enter': 'pageEnter 300ms ease-out',
        'page-exit': 'pageExit 300ms ease-in',
      },
      
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
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        qrDisplayFadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        successBounce: {
          '0%, 20%, 60%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-10px)' },
          '80%': { transform: 'translateY(-5px)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        pageEnter: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pageExit: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [
    // Custom utilities for design system
    function({ addUtilities, addComponents, theme }) {
      const newUtilities = {
        // Touch Target Utilities
        '.touch-target': {
          'min-height': '44px',
          'min-width': '44px',
        },
        '.touch-target-sm': {
          'min-height': '40px',
          'min-width': '40px',
        },
        '.touch-target-lg': {
          'min-height': '48px',
          'min-width': '48px',
        },
        
        // Focus Ring Utilities
        '.focus-ring': {
          'outline': '2px solid var(--color-border-focus)',
          'outline-offset': '2px',
        },
        '.focus-ring-brand': {
          'outline': '2px solid #10b981',
          'outline-offset': '2px',
        },
        '.focus-ring-error': {
          'outline': '2px solid #ef4444',
          'outline-offset': '2px',
        },
        
        // Text Utilities
        '.text-balance': {
          'text-wrap': 'balance',
        },
        '.text-pretty': {
          'text-wrap': 'pretty',
        },
        
        // Scrollbar Utilities
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          'scrollbar-color': '#cbd5e1 #f1f5f9',
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#1e293b',
            'border-radius': '3px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#475569',
            'border-radius': '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#64748b',
          },
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
        
        // Status Utilities
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
        
        // Layout Utilities
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
        
        // Gradient Utilities
        '.gradient-bg': {
          'background': 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        },
        '.sidebar-gradient': {
          'background': 'linear-gradient(180deg, #071022 0%, #081426 100%)',
        },
        
        // Animation Utilities
        '.animate-fade-in': {
          'animation': 'fadeIn 200ms ease-out',
        },
        '.animate-slide-in': {
          'animation': 'slideIn 200ms ease-out',
        },
        '.animate-scale-in': {
          'animation': 'scaleIn 150ms ease-out',
        },
        '.animate-fade-in-up': {
          'animation': 'fadeInUp 300ms ease-out',
        },
        '.animate-slide-in-up': {
          'animation': 'slideInUp 400ms ease-out',
        },
        '.animate-qr-display': {
          'animation': 'qrDisplayFadeIn 500ms ease-out',
        },
        '.animate-success-bounce': {
          'animation': 'successBounce 600ms ease-out',
        },
        '.animate-error-shake': {
          'animation': 'shake 500ms ease-in-out',
        },
        '.animate-loading-pulse': {
          'animation': 'pulse 1.5s ease-in-out infinite',
        },
        
        // Page Transition Utilities
        '.page-transitioning': {
          'overflow-x': 'hidden',
        },
        '.page-enter': {
          'opacity': '0',
          'transform': 'translateY(20px)',
        },
        '.page-enter-active': {
          'opacity': '1',
          'transform': 'translateY(0)',
          'transition': 'opacity 300ms ease-out, transform 300ms ease-out',
        },
        '.page-exit': {
          'opacity': '1',
          'transform': 'translateY(0)',
        },
        '.page-exit-active': {
          'opacity': '0',
          'transform': 'translateY(-20px)',
          'transition': 'opacity 300ms ease-in, transform 300ms ease-in',
        },
        
        // Mobile Page Transitions
        '.mobile-page-enter': {
          'transform': 'translateX(100%)',
        },
        '.mobile-page-enter-active': {
          'transform': 'translateX(0)',
        },
        '.mobile-page-exit': {
          'transform': 'translateX(0)',
        },
        '.mobile-page-exit-active': {
          'transform': 'translateX(-100%)',
        },
        
        // Navigation Utilities
        '.navlink': {
          'transition': 'all 0.2s ease-in-out',
        },
        '.navlink:hover': {
          'transform': 'translateX(4px)',
        },
        
        // Form Utilities
        '.form-fade-in': {
          'animation': 'fadeIn 0.3s ease-out',
        },
        
        // Button Utilities
        '.btn-animate': {
          'transition': 'all 0.2s ease-in-out',
        },
        '.btn-animate:active': {
          'transform': 'scale(0.98)',
        },
        
        // Accessibility Utilities
        '.sr-only': {
          'position': 'absolute',
          'width': '1px',
          'height': '1px',
          'padding': '0',
          'margin': '-1px',
          'overflow': 'hidden',
          'clip': 'rect(0, 0, 0, 0)',
          'white-space': 'nowrap',
          'border': '0',
        },
        '.focus\\:not-sr-only:focus': {
          'position': 'static',
          'width': 'auto',
          'height': 'auto',
          'padding': '0.5rem 1rem',
          'margin': '0',
          'overflow': 'visible',
          'clip': 'auto',
          'white-space': 'normal',
        },
      };
      
      addUtilities(newUtilities);
      
      // Add component styles
      const components = {
        // Focus styles for better accessibility
        '*:focus': {
          'outline': '2px solid var(--color-border-focus)',
          'outline-offset': '2px',
        },
        'button:focus, input:focus, select:focus, textarea:focus': {
          'outline': '2px solid var(--color-border-focus)',
          'outline-offset': '2px',
        },
        
        // Smooth scroll behavior
        'html': {
          'scroll-behavior': 'smooth',
        },
        
        // Base styles
        'body': {
          'font-family': 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          'background': 'var(--color-background-primary)',
          'color': 'var(--color-text-primary)',
          '-webkit-font-smoothing': 'antialiased',
          '-moz-osx-font-smoothing': 'grayscale',
        },
      };
      
      addComponents(components);
    },
  ],
};




