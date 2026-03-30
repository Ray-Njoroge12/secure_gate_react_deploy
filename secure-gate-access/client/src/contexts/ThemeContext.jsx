// /client/src/contexts/ThemeContext.jsx
// Dark Mode Theme Context for SecureGate Access Control System
// Created: November 26, 2025

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext.js';

const ThemeContext = createContext(undefined);

// Theme options
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
  HIGH_CONTRAST: 'high-contrast',
  HIGH_CONTRAST_DARK: 'high-contrast-dark'
};

// Theme density options
export const THEME_DENSITY = {
  COMPACT: 'compact',
  COMFORTABLE: 'comfortable', 
  SPACIOUS: 'spacious'
};

// Role-based theme preferences
export const ROLE_THEME_DEFAULTS = {
  super_admin: { theme: THEMES.SYSTEM, density: THEME_DENSITY.COMFORTABLE },
  admin: { theme: THEMES.SYSTEM, density: THEME_DENSITY.COMFORTABLE },
  guard: { theme: THEMES.DARK, density: THEME_DENSITY.COMPACT }, // Dark for night shifts
  resident: { theme: THEMES.SYSTEM, density: THEME_DENSITY.COMFORTABLE },
  visitor: { theme: THEMES.LIGHT, density: THEME_DENSITY.COMFORTABLE }
};

// Local storage keys
const STORAGE_KEY = 'securegate-theme';
const DENSITY_STORAGE_KEY = 'securegate-theme-density';
const CUSTOM_COLORS_STORAGE_KEY = 'securegate-custom-colors';

const getMediaQuery = (query) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }

  return window.matchMedia(query);
};

const getSystemPreferences = () => ({
  prefersDark: getMediaQuery('(prefers-color-scheme: dark)')?.matches ?? false,
  prefersHighContrast: getMediaQuery('(prefers-contrast: high)')?.matches ?? false,
  prefersReducedMotion: getMediaQuery('(prefers-reduced-motion: reduce)')?.matches ?? false,
});

const resolveSystemTheme = () => {
  const { prefersDark, prefersHighContrast } = getSystemPreferences();

  if (prefersHighContrast) {
    return prefersDark ? THEMES.HIGH_CONTRAST_DARK : THEMES.HIGH_CONTRAST;
  }

  return prefersDark ? THEMES.DARK : THEMES.LIGHT;
};

/**
 * ThemeProvider Component
 * Provides theme state and controls to the entire application
 * Enhanced with accessibility themes, density options, and role-based defaults
 */
export const ThemeProvider = ({ children }) => {
  const { user } = useAuth() || {}; // Handle case where AuthContext might not be available
  
  // Initialize theme from localStorage, role defaults, or system preference
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return THEMES.LIGHT;
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && Object.values(THEMES).includes(saved)) {
      return saved;
    }
    
    // Use role-based default if user is available
    if (user?.role && ROLE_THEME_DEFAULTS[user.role]) {
      return ROLE_THEME_DEFAULTS[user.role].theme;
    }
    
    return THEMES.SYSTEM;
  });

  // Theme density state
  const [density, setDensityState] = useState(() => {
    if (typeof window === 'undefined') return THEME_DENSITY.COMFORTABLE;
    
    const saved = localStorage.getItem(DENSITY_STORAGE_KEY);
    if (saved && Object.values(THEME_DENSITY).includes(saved)) {
      return saved;
    }
    
    // Use role-based default if user is available
    if (user?.role && ROLE_THEME_DEFAULTS[user.role]) {
      return ROLE_THEME_DEFAULTS[user.role].density;
    }
    
    return THEME_DENSITY.COMFORTABLE;
  });

  // Custom color overrides for estate branding
  const [customColors, setCustomColorsState] = useState(() => {
    if (typeof window === 'undefined') return {};
    
    try {
      const saved = localStorage.getItem(CUSTOM_COLORS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Resolved theme (what's actually applied - light, dark, high-contrast, etc.)
  const [resolvedTheme, setResolvedTheme] = useState(() => {
    if (typeof window === 'undefined') return THEMES.LIGHT;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && Object.values(THEMES).includes(saved) && saved !== THEMES.SYSTEM) {
      return saved;
    }

    return resolveSystemTheme();
  });

  const [isReducedMotionMode, setIsReducedMotionMode] = useState(() => (
    typeof window === 'undefined' ? false : getSystemPreferences().prefersReducedMotion
  ));

  // Update document attributes and meta theme color
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove old theme classes and add new ones
    root.classList.remove('light', 'dark', 'high-contrast', 'high-contrast-dark');
    root.classList.add(resolvedTheme);
    root.setAttribute('data-theme', resolvedTheme);
    
    // Add density class
    root.classList.remove('compact', 'comfortable', 'spacious');
    root.classList.add(density);
    root.setAttribute('data-density', density);
    
    // Update body class for Tailwind dark mode support
    const isDarkTheme = resolvedTheme === THEMES.DARK || resolvedTheme === THEMES.HIGH_CONTRAST_DARK;
    if (isDarkTheme) {
      document.body.classList.add('dark');
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      document.body.classList.remove('dark');
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    
    // Apply custom colors if any
    if (Object.keys(customColors).length > 0) {
      Object.entries(customColors).forEach(([property, value]) => {
        root.style.setProperty(`--color-${property}`, value);
      });
    }
    
    // Update meta theme-color for mobile browsers
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    
    // Set theme color based on resolved theme
    const themeColors = {
      [THEMES.LIGHT]: '#F9FAFB',
      [THEMES.DARK]: '#0F172A',
      [THEMES.HIGH_CONTRAST]: '#FFFFFF',
      [THEMES.HIGH_CONTRAST_DARK]: '#000000'
    };
    metaTheme.content = themeColors[resolvedTheme] || themeColors[THEMES.LIGHT];
    
    // Update body background for smooth transition
    document.body.style.backgroundColor = themeColors[resolvedTheme] || themeColors[THEMES.LIGHT];
  }, [resolvedTheme, density, customColors]);

  // Listen for system preference changes
  useEffect(() => {
    const colorSchemeQuery = getMediaQuery('(prefers-color-scheme: dark)');
    const highContrastQuery = getMediaQuery('(prefers-contrast: high)');
    const reducedMotionQuery = getMediaQuery('(prefers-reduced-motion: reduce)');

    const handleThemeChange = () => {
      if (theme === THEMES.SYSTEM) {
        setResolvedTheme(resolveSystemTheme());
      }
    };

    const handleReducedMotionChange = (event) => {
      setIsReducedMotionMode(
        event.matches || document.documentElement.classList.contains('reduced-motion')
      );
    };

    colorSchemeQuery?.addEventListener?.('change', handleThemeChange);
    highContrastQuery?.addEventListener?.('change', handleThemeChange);
    reducedMotionQuery?.addEventListener?.('change', handleReducedMotionChange);

    return () => {
      colorSchemeQuery?.removeEventListener?.('change', handleThemeChange);
      highContrastQuery?.removeEventListener?.('change', handleThemeChange);
      reducedMotionQuery?.removeEventListener?.('change', handleReducedMotionChange);
    };
  }, [theme]);

  // Resolve theme when preference changes
  useEffect(() => {
    if (theme === THEMES.SYSTEM) {
      setResolvedTheme(resolveSystemTheme());
    } else {
      setResolvedTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const root = document.documentElement;
    const syncReducedMotionMode = () => {
      setIsReducedMotionMode(
        root.classList.contains('reduced-motion') || getSystemPreferences().prefersReducedMotion
      );
    };

    syncReducedMotionMode();

    const observer = new MutationObserver(syncReducedMotionMode);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  // Sync isReducedMotionMode → document root class so CSS and AccessibilityProvider
  // both respond to the same source of truth
  useEffect(() => {
    const root = document.documentElement;
    if (isReducedMotionMode) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
  }, [isReducedMotionMode]);

  // Set theme function
  const setTheme = useCallback((newTheme) => {
    if (!Object.values(THEMES).includes(newTheme)) {
      console.warn(`Invalid theme: ${newTheme}`);
      return;
    }
    
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  }, []);

  // Set density function
  const setDensity = useCallback((newDensity) => {
    if (!Object.values(THEME_DENSITY).includes(newDensity)) {
      console.warn(`Invalid density: ${newDensity}`);
      return;
    }
    
    setDensityState(newDensity);
    localStorage.setItem(DENSITY_STORAGE_KEY, newDensity);
  }, []);

  // Set custom colors function
  const setCustomColors = useCallback((colors) => {
    setCustomColorsState(colors);
    localStorage.setItem(CUSTOM_COLORS_STORAGE_KEY, JSON.stringify(colors));
  }, []);

  // Apply role-based theme defaults
  const applyRoleDefaults = useCallback((role) => {
    if (ROLE_THEME_DEFAULTS[role]) {
      const defaults = ROLE_THEME_DEFAULTS[role];
      setTheme(defaults.theme);
      setDensity(defaults.density);
    }
  }, [setTheme, setDensity]);

  // Toggle between light and dark (ignores system)
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  // Toggle high contrast mode
  const toggleHighContrast = useCallback(() => {
    const isHighContrast = resolvedTheme === THEMES.HIGH_CONTRAST || resolvedTheme === THEMES.HIGH_CONTRAST_DARK;
    
    if (isHighContrast) {
      // Switch back to regular theme
      const newTheme = resolvedTheme === THEMES.HIGH_CONTRAST_DARK ? THEMES.DARK : THEMES.LIGHT;
      setTheme(newTheme);
    } else {
      // Switch to high contrast version
      const newTheme = resolvedTheme === THEMES.DARK ? THEMES.HIGH_CONTRAST_DARK : THEMES.HIGH_CONTRAST;
      setTheme(newTheme);
    }
  }, [resolvedTheme, setTheme]);

  // Convenience booleans
  const isDark = resolvedTheme === THEMES.DARK || resolvedTheme === THEMES.HIGH_CONTRAST_DARK;
  const isLight = resolvedTheme === THEMES.LIGHT || resolvedTheme === THEMES.HIGH_CONTRAST;
  const isSystem = theme === THEMES.SYSTEM;
  const isHighContrast = resolvedTheme === THEMES.HIGH_CONTRAST || resolvedTheme === THEMES.HIGH_CONTRAST_DARK;
  const isCompact = density === THEME_DENSITY.COMPACT;
  const isComfortable = density === THEME_DENSITY.COMFORTABLE;
  const isSpacious = density === THEME_DENSITY.SPACIOUS;

  const value = {
    // Theme state
    theme,           // User preference (light, dark, system, etc.)
    resolvedTheme,   // Actual applied theme
    setTheme,        // Function to change theme
    toggleTheme,     // Toggle between light/dark
    toggleHighContrast, // Toggle high contrast mode
    
    // Density state
    density,         // Current density setting
    setDensity,      // Function to change density
    
    // Custom colors
    customColors,    // Custom color overrides
    setCustomColors, // Function to set custom colors
    
    // Role-based theming
    applyRoleDefaults, // Apply role-based defaults
    
    // Convenience booleans
    isDark,          // Boolean: is dark mode active?
    isLight,         // Boolean: is light mode active?
    isSystem,        // Boolean: is following system preference?
    isHighContrast,  // Boolean: is high contrast mode active?
    isReducedMotionMode, // Boolean: reduced motion is enabled via prefs or system
    isCompact,       // Boolean: is compact density active?
    isComfortable,   // Boolean: is comfortable density active?
    isSpacious,      // Boolean: is spacious density active?

    // Constants for reference
    THEMES,          // Theme constants
    THEME_DENSITY,   // Density constants
    ROLE_THEME_DEFAULTS // Role defaults
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * useTheme Hook
 * Access theme state and controls from any component
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

export default ThemeContext;
