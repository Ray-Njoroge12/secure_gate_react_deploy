// /client/src/contexts/ThemeContext.jsx
// Dark Mode Theme Context for SecureGate Access Control System
// Created: November 26, 2025

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(undefined);

// Theme options
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

// Local storage key
const STORAGE_KEY = 'securegate-theme';

/**
 * ThemeProvider Component
 * Provides theme state and controls to the entire application
 */
export const ThemeProvider = ({ children }) => {
  // Initialize theme from localStorage or system preference
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return THEMES.LIGHT;
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && Object.values(THEMES).includes(saved)) {
      return saved;
    }
    return THEMES.SYSTEM;
  });

  // Resolved theme (what's actually applied - light or dark)
  const [resolvedTheme, setResolvedTheme] = useState(() => {
    if (typeof window === 'undefined') return THEMES.LIGHT;
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === THEMES.DARK) return THEMES.DARK;
    if (saved === THEMES.LIGHT) return THEMES.LIGHT;
    
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? THEMES.DARK 
      : THEMES.LIGHT;
  });

  // Update document attributes and meta theme color
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove old theme class and add new one (for CSS variables)
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    root.setAttribute('data-theme', resolvedTheme);
    
    // Also update body class for Tailwind dark mode support
    if (resolvedTheme === THEMES.DARK) {
      document.body.classList.add('dark');
      root.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
      root.classList.remove('dark');
    }
    
    // Update meta theme-color for mobile browsers
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    metaTheme.content = resolvedTheme === THEMES.DARK ? '#0F172A' : '#F9FAFB';
    
    // Update body background for smooth transition
    document.body.style.backgroundColor = resolvedTheme === THEMES.DARK 
      ? '#0F172A' 
      : '#F9FAFB';
  }, [resolvedTheme]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      if (theme === THEMES.SYSTEM) {
        setResolvedTheme(e.matches ? THEMES.DARK : THEMES.LIGHT);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Resolve theme when preference changes
  useEffect(() => {
    if (theme === THEMES.SYSTEM) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setResolvedTheme(prefersDark ? THEMES.DARK : THEMES.LIGHT);
    } else {
      setResolvedTheme(theme);
    }
  }, [theme]);

  // Set theme function
  const setTheme = useCallback((newTheme) => {
    if (!Object.values(THEMES).includes(newTheme)) {
      console.warn(`Invalid theme: ${newTheme}`);
      return;
    }
    
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  }, []);

  // Toggle between light and dark (ignores system)
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  // Convenience booleans
  const isDark = resolvedTheme === THEMES.DARK;
  const isLight = resolvedTheme === THEMES.LIGHT;
  const isSystem = theme === THEMES.SYSTEM;

  const value = {
    theme,           // User preference (light, dark, or system)
    resolvedTheme,   // Actual applied theme (light or dark)
    setTheme,        // Function to change theme
    toggleTheme,     // Toggle between light/dark
    isDark,          // Boolean: is dark mode active?
    isLight,         // Boolean: is light mode active?
    isSystem,        // Boolean: is following system preference?
    THEMES           // Theme constants for reference
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
