/**
 * High Contrast Toggle Component
 * 
 * Provides high contrast theme toggle with 4.5:1 contrast ratios
 * Implements WCAG 2.1 AA color contrast requirements
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAccessibilityContext } from './AccessibilityProvider.jsx';
import Button from '../ui/Button';

/**
 * High contrast color schemes
 */
const HIGH_CONTRAST_THEMES = {
  LIGHT: {
    id: 'high-contrast-light',
    name: 'High Contrast Light',
    description: 'Black text on white background with high contrast colors',
    colors: {
      background: '#ffffff',
      foreground: '#000000',
      primary: '#0000ff',
      secondary: '#666666',
      success: '#008000',
      warning: '#ff8c00',
      error: '#ff0000',
      info: '#0000ff',
      border: '#000000',
      muted: '#f5f5f5',
      mutedForeground: '#333333'
    }
  },
  DARK: {
    id: 'high-contrast-dark',
    name: 'High Contrast Dark',
    description: 'White text on black background with high contrast colors',
    colors: {
      background: '#000000',
      foreground: '#ffffff',
      primary: '#00ffff',
      secondary: '#cccccc',
      success: '#00ff00',
      warning: '#ffff00',
      error: '#ff0000',
      info: '#00ffff',
      border: '#ffffff',
      muted: '#1a1a1a',
      mutedForeground: '#cccccc'
    }
  },
  YELLOW_BLACK: {
    id: 'high-contrast-yellow-black',
    name: 'High Contrast Yellow on Black',
    description: 'Yellow text on black background for maximum contrast',
    colors: {
      background: '#000000',
      foreground: '#ffff00',
      primary: '#00ffff',
      secondary: '#ffffff',
      success: '#00ff00',
      warning: '#ff8c00',
      error: '#ff0000',
      info: '#00ffff',
      border: '#ffff00',
      muted: '#1a1a00',
      mutedForeground: '#ffff99'
    }
  },
  BLUE_YELLOW: {
    id: 'high-contrast-blue-yellow',
    name: 'High Contrast Blue on Yellow',
    description: 'Blue text on yellow background for enhanced readability',
    colors: {
      background: '#ffff00',
      foreground: '#000080',
      primary: '#0000ff',
      secondary: '#000040',
      success: '#008000',
      warning: '#ff8c00',
      error: '#800000',
      info: '#0000ff',
      border: '#000080',
      muted: '#ffffcc',
      mutedForeground: '#000040'
    }
  }
};

/**
 * Color contrast calculation utilities
 */
class ContrastCalculator {
  /**
   * Calculate relative luminance of a color
   */
  static getLuminance(color) {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Calculate contrast ratio between two colors
   */
  static getContrastRatio(color1, color2) {
    const luminance1 = this.getLuminance(color1);
    const luminance2 = this.getLuminance(color2);
    
    const brightest = Math.max(luminance1, luminance2);
    const darkest = Math.min(luminance1, luminance2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  }

  /**
   * Convert hex color to RGB
   */
  static hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Check if contrast ratio meets WCAG AA standards
   */
  static meetsWCAGAA(foreground, background, isLargeText = false) {
    const ratio = this.getContrastRatio(foreground, background);
    const minRatio = isLargeText ? 3 : 4.5;
    return ratio >= minRatio;
  }

  /**
   * Check if contrast ratio meets WCAG AAA standards
   */
  static meetsWCAGAAA(foreground, background, isLargeText = false) {
    const ratio = this.getContrastRatio(foreground, background);
    const minRatio = isLargeText ? 4.5 : 7;
    return ratio >= minRatio;
  }
}

/**
 * High Contrast Toggle Component
 */
export const HighContrastToggle = ({ 
  className = '',
  showThemeSelector = true,
  showContrastInfo = true,
  position = 'inline' // 'inline', 'floating', 'fixed'
}) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(HIGH_CONTRAST_THEMES.LIGHT);
  const [showSelector, setShowSelector] = useState(false);
  const [contrastRatios, setContrastRatios] = useState({});
  
  const { settings, updateSetting, announce } = useAccessibilityContext();

  /**
   * Apply high contrast theme
   */
  const applyTheme = useCallback((theme) => {
    const root = document.documentElement;
    
    // Remove existing high contrast classes
    Object.values(HIGH_CONTRAST_THEMES).forEach(t => {
      root.classList.remove(t.id);
    });
    
    if (isEnabled) {
      // Add new theme class
      root.classList.add(theme.id);
      
      // Apply CSS custom properties
      Object.entries(theme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--hc-${key}`, value);
        root.style.setProperty(`--color-${key}`, value);
      });
      
      // Calculate and store contrast ratios
      const ratios = {
        textBackground: ContrastCalculator.getContrastRatio(theme.colors.foreground, theme.colors.background),
        primaryBackground: ContrastCalculator.getContrastRatio(theme.colors.primary, theme.colors.background),
        successBackground: ContrastCalculator.getContrastRatio(theme.colors.success, theme.colors.background),
        warningBackground: ContrastCalculator.getContrastRatio(theme.colors.warning, theme.colors.background),
        errorBackground: ContrastCalculator.getContrastRatio(theme.colors.error, theme.colors.background)
      };
      
      setContrastRatios(ratios);
      
      // Announce theme change
      announce(`High contrast theme changed to ${theme.name}. Contrast ratio: ${ratios.textBackground.toFixed(1)}:1`, 'polite');
    } else {
      // Remove all custom properties
      Object.keys(theme.colors).forEach(key => {
        root.style.removeProperty(`--hc-${key}`);
        root.style.removeProperty(`--color-${key}`);
      });
      
      setContrastRatios({});
      announce('High contrast mode disabled', 'polite');
    }
  }, [isEnabled, announce]);

  /**
   * Toggle high contrast mode
   */
  const toggleHighContrast = useCallback(() => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    updateSetting('highContrast', newState);
    
    if (newState) {
      document.documentElement.classList.add('high-contrast');
      applyTheme(currentTheme);
    } else {
      document.documentElement.classList.remove('high-contrast');
      applyTheme(currentTheme); // This will remove the theme
    }
  }, [isEnabled, currentTheme, updateSetting, applyTheme]);

  /**
   * Change high contrast theme
   */
  const changeTheme = useCallback((themeId) => {
    const theme = Object.values(HIGH_CONTRAST_THEMES).find(t => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
      if (isEnabled) {
        applyTheme(theme);
      }
      
      // Save preference
      localStorage.setItem('high-contrast-theme', themeId);
    }
  }, [isEnabled, applyTheme]);

  /**
   * Detect system high contrast preference
   */
  useEffect(() => {
    // Check for system high contrast preference
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const systemPreference = highContrastQuery.matches;
    
    if (systemPreference && !isEnabled) {
      setIsEnabled(true);
      updateSetting('highContrast', true);
      document.documentElement.classList.add('high-contrast');
    }
    
    // Listen for changes
    const handleChange = (e) => {
      if (e.matches && !isEnabled) {
        setIsEnabled(true);
        updateSetting('highContrast', true);
        document.documentElement.classList.add('high-contrast');
        applyTheme(currentTheme);
      }
    };
    
    if (highContrastQuery.addEventListener) {
      highContrastQuery.addEventListener('change', handleChange);
    }
    
    return () => {
      if (highContrastQuery.removeEventListener) {
        highContrastQuery.removeEventListener('change', handleChange);
      }
    };
  }, [isEnabled, currentTheme, updateSetting, applyTheme]);

  /**
   * Load saved preferences
   */
  useEffect(() => {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('high-contrast-theme');
    if (savedTheme) {
      const theme = Object.values(HIGH_CONTRAST_THEMES).find(t => t.id === savedTheme);
      if (theme) {
        setCurrentTheme(theme);
      }
    }
    
    // Load saved high contrast state
    const savedState = settings.highContrast;
    if (savedState !== isEnabled) {
      setIsEnabled(savedState);
      if (savedState) {
        document.documentElement.classList.add('high-contrast');
        applyTheme(currentTheme);
      }
    }
  }, [settings.highContrast]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleHighContrast();
    } else if (event.key === 'Escape' && showSelector) {
      setShowSelector(false);
    }
  }, [toggleHighContrast, showSelector]);

  /**
   * Get contrast status for display
   */
  const getContrastStatus = useCallback((ratio) => {
    if (ratio >= 7) return { level: 'AAA', color: 'success' };
    if (ratio >= 4.5) return { level: 'AA', color: 'success' };
    if (ratio >= 3) return { level: 'AA Large', color: 'warning' };
    return { level: 'Fail', color: 'error' };
  }, []);

  const containerClasses = [
    'high-contrast-toggle',
    position === 'floating' && 'high-contrast-toggle--floating',
    position === 'fixed' && 'high-contrast-toggle--fixed',
    isEnabled && 'high-contrast-toggle--enabled',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {/* Main toggle button */}
      <Button
        className="high-contrast-toggle__button"
        onClick={toggleHighContrast}
        onKeyDown={handleKeyDown}
        aria-pressed={isEnabled}
        aria-describedby="high-contrast-description"
        title={`${isEnabled ? 'Disable' : 'Enable'} high contrast mode`}
      >
        <span className="high-contrast-toggle__icon" aria-hidden="true">
          {isEnabled ? '🌓' : '🌑'}
        </span>
        <span className="high-contrast-toggle__label">
          High Contrast {isEnabled ? 'On' : 'Off'}
        </span>
      </Button>

      {/* Description */}
      <div id="high-contrast-description" className="high-contrast-toggle__description sr-only">
        {isEnabled 
          ? `High contrast mode is enabled using ${currentTheme.name}. ${currentTheme.description}`
          : 'High contrast mode is disabled. Click to enable for better visibility.'
        }
      </div>

      {/* Theme selector */}
      {showThemeSelector && isEnabled && (
        <div className="high-contrast-toggle__selector">
          <Button
            className="high-contrast-toggle__selector-button"
            onClick={() => setShowSelector(!showSelector)}
            aria-expanded={showSelector}
            aria-haspopup="true"
            aria-label="Select high contrast theme"
          >
            <span>{currentTheme.name}</span>
            <span className="high-contrast-toggle__selector-arrow" aria-hidden="true">
              {showSelector ? '▲' : '▼'}
            </span>
          </Button>

          {showSelector && (
            <div 
              className="high-contrast-toggle__selector-menu"
              role="menu"
              aria-label="High contrast theme options"
            >
              {Object.values(HIGH_CONTRAST_THEMES).map(theme => (
                <Button
                  key={theme.id}
                  className={`high-contrast-toggle__theme-option ${
                    currentTheme.id === theme.id ? 'high-contrast-toggle__theme-option--selected' : ''
                  }`}
                  onClick={() => {
                    changeTheme(theme.id);
                    setShowSelector(false);
                  }}
                  role="menuitem"
                  aria-selected={currentTheme.id === theme.id}
                >
                  <div className="high-contrast-toggle__theme-preview">
                    <div 
                      className="high-contrast-toggle__theme-preview-bg"
                      style={{ backgroundColor: theme.colors.background }}
                    >
                      <div 
                        className="high-contrast-toggle__theme-preview-text"
                        style={{ color: theme.colors.foreground }}
                      >
                        Aa
                      </div>
                    </div>
                  </div>
                  <div className="high-contrast-toggle__theme-info">
                    <div className="high-contrast-toggle__theme-name">
                      {theme.name}
                    </div>
                    <div className="high-contrast-toggle__theme-description">
                      {theme.description}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contrast information */}
      {showContrastInfo && isEnabled && Object.keys(contrastRatios).length > 0 && (
        <div className="high-contrast-toggle__info">
          <h4 className="high-contrast-toggle__info-title">Contrast Ratios</h4>
          <div className="high-contrast-toggle__info-grid">
            {Object.entries(contrastRatios).map(([key, ratio]) => {
              const status = getContrastStatus(ratio);
              return (
                <div key={key} className="high-contrast-toggle__info-item">
                  <span className="high-contrast-toggle__info-label">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                  </span>
                  <span 
                    className={`high-contrast-toggle__info-value high-contrast-toggle__info-value--${status.color}`}
                  >
                    {ratio.toFixed(1)}:1 ({status.level})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * High Contrast Status Indicator
 */
export const HighContrastStatus = ({ className = '' }) => {
  const { settings } = useAccessibilityContext();
  
  if (!settings.highContrast) return null;
  
  return (
    <div className={`high-contrast-status ${className}`} role="status" aria-live="polite">
      <span className="high-contrast-status__icon" aria-hidden="true">🌓</span>
      <span className="high-contrast-status__text">High Contrast Mode Active</span>
    </div>
  );
};

/**
 * Hook for high contrast utilities
 */
export const useHighContrast = () => {
  const { settings, updateSetting } = useAccessibilityContext();
  
  const toggle = useCallback(() => {
    updateSetting('highContrast', !settings.highContrast);
  }, [settings.highContrast, updateSetting]);
  
  const enable = useCallback(() => {
    updateSetting('highContrast', true);
  }, [updateSetting]);
  
  const disable = useCallback(() => {
    updateSetting('highContrast', false);
  }, [updateSetting]);
  
  const checkContrast = useCallback((foreground, background, isLargeText = false) => {
    return ContrastCalculator.meetsWCAGAA(foreground, background, isLargeText);
  }, []);
  
  const getContrastRatio = useCallback((foreground, background) => {
    return ContrastCalculator.getContrastRatio(foreground, background);
  }, []);
  
  return {
    isEnabled: settings.highContrast,
    toggle,
    enable,
    disable,
    checkContrast,
    getContrastRatio,
    themes: HIGH_CONTRAST_THEMES
  };
};

export { HIGH_CONTRAST_THEMES, ContrastCalculator };
export default HighContrastToggle;