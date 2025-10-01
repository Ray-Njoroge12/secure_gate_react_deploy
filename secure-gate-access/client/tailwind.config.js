module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class', // Enable class-based dark mode as optional
  theme: {
    screens: {
      'xs': '360px',    // Mobile phones
      'sm': '640px',    // Large phones / small tablets
      'md': '768px',    // Tablets
      'lg': '1024px',   // Laptops
      'xl': '1280px',   // Desktops
      '2xl': '1536px',  // Large desktops
    },
    extend: {
      colors: {
        // Professional brand palette from original design
        brand: {
          50:  "#eef6ff",
          100: "#d9eaff",
          200: "#b8d7ff",
          300: "#8dbdff", 
          400: "#5a9aff",
          500: "#2f7cff",     // Primary brand color
          600: "#1f61db",
          700: "#194db1",
          800: "#173f8d",
          900: "#132f66",
        },
        success: { DEFAULT: "#16a34a" },
        warning: { DEFAULT: "#f59e0b" },
        danger:  { DEFAULT: "#dc2626" },
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#15803d', // Darker for better contrast (was #16a34a)
          700: '#166534',
          800: '#14532d',
          900: '#0f5132', // Even darker for highest contrast
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
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        // Additional semantic colors for specific components
        semantic: {
          green: '#22c55e',
          blue: '#3b82f6',
          slate: '#334155',
        }
      },
      spacing: {
        'touch': '44px',  // Minimum touch target size
        'safe-area-top': 'env(safe-area-inset-top)',
        'safe-area-bottom': 'env(safe-area-inset-bottom)',
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'smooth': '0.625rem', // 10px - Professional rounded corners
      },
      boxShadow: {
        'brand': '0 4px 6px -1px rgb(34 197 94 / 0.1), 0 2px 4px -2px rgb(34 197 94 / 0.1)',
        'card': '0 4px 16px rgba(0,0,0,0.06)', // Subtle professional shadow
      },
      maxWidth: {
        'screen-xs': '360px',
        'screen-sm': '640px',
        'screen-md': '768px',
      }
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
