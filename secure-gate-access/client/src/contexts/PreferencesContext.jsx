/**
 * @fileoverview User Preferences Context
 * @description Manages user accessibility preferences (high contrast, font size)
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * Font size options
 */
export const FONT_SIZES = {
  small: { label: 'Small', value: 14, className: 'text-sm' },
  medium: { label: 'Medium', value: 16, className: 'text-base' },
  large: { label: 'Large', value: 18, className: 'text-lg' },
  xlarge: { label: 'Extra Large', value: 20, className: 'text-xl' },
};

/**
 * Default preferences
 */
const DEFAULT_PREFERENCES = {
  highContrast: false,
  fontSize: 'medium',
  reducedMotion: false, // Synced with system preference
};

/**
 * Preferences Context
 */
const PreferencesContext = createContext(null);

/**
 * Preferences Provider Component
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 */
export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(() => {
    // Load from localStorage on initial render
    try {
      const saved = localStorage.getItem('userPreferences');
      if (saved) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load preferences from localStorage');
    }
    return DEFAULT_PREFERENCES;
  });

  // Sync reduced motion with system preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    setPreferences(prev => ({
      ...prev,
      reducedMotion: mediaQuery.matches,
    }));

    const handler = (e) => {
      setPreferences(prev => ({
        ...prev,
        reducedMotion: e.matches,
      }));
    };

    mediaQuery.addEventListener?.('change', handler) || mediaQuery.addListener?.(handler);
    return () => {
      mediaQuery.removeEventListener?.('change', handler) || mediaQuery.removeListener?.(handler);
    };
  }, []);

  // Apply preferences to document
  useEffect(() => {
    const html = document.documentElement;

    // High contrast mode
    if (preferences.highContrast) {
      html.classList.add('high-contrast');
      html.setAttribute('data-high-contrast', 'true');
    } else {
      html.classList.remove('high-contrast');
      html.removeAttribute('data-high-contrast');
    }

    // Font size
    const fontConfig = FONT_SIZES[preferences.fontSize] || FONT_SIZES.medium;
    html.style.fontSize = `${fontConfig.value}px`;
    html.setAttribute('data-font-size', preferences.fontSize);

    // Reduced motion
    if (preferences.reducedMotion) {
      html.classList.add('reduce-motion');
    } else {
      html.classList.remove('reduce-motion');
    }
  }, [preferences]);

  // Save to localStorage when preferences change
  useEffect(() => {
    try {
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
    } catch (e) {
      console.warn('Failed to save preferences to localStorage');
    }
  }, [preferences]);

  /**
   * Toggle high contrast mode
   */
  const toggleHighContrast = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      highContrast: !prev.highContrast,
    }));
  }, []);

  /**
   * Set font size
   * @param {string} size - Font size key ('small', 'medium', 'large', 'xlarge')
   */
  const setFontSize = useCallback((size) => {
    if (FONT_SIZES[size]) {
      setPreferences(prev => ({
        ...prev,
        fontSize: size,
      }));
    }
  }, []);

  /**
   * Reset all preferences to defaults
   */
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  const value = {
    preferences,
    highContrast: preferences.highContrast,
    fontSize: preferences.fontSize,
    reducedMotion: preferences.reducedMotion,
    toggleHighContrast,
    setFontSize,
    resetPreferences,
    fontSizeOptions: FONT_SIZES,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

/**
 * Hook to access preferences
 * 
 * @returns {Object} Preferences context value
 * 
 * @example
 * const { highContrast, toggleHighContrast, fontSize, setFontSize } = usePreferences();
 */
export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}

export default PreferencesContext;
