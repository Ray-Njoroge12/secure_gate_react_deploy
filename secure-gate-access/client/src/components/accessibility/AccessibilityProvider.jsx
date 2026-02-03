/**
 * Accessibility Provider Component
 * 
 * Provides comprehensive WCAG 2.1 AA compliance features including:
 * - Keyboard navigation management
 * - Screen reader support
 * - High contrast themes
 * - Text scaling support
 * - Focus management
 * - Live regions for announcements
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAccessibility } from '../../hooks/useAccessibility.js';

const AccessibilityContext = createContext(undefined);

/**
 * Accessibility settings and preferences
 */
const DEFAULT_ACCESSIBILITY_SETTINGS = {
  // Visual preferences
  highContrast: false,
  reducedMotion: false,
  textScaling: 100, // percentage (100% = normal, 200% = maximum)

  // Navigation preferences
  keyboardNavigation: true,
  skipLinks: true,
  focusIndicators: true,

  // Screen reader preferences
  screenReaderSupport: true,
  announcements: true,
  liveRegions: true,

  // Interaction preferences
  extendedTimeouts: false,
  alternativeInputs: false,
  voiceCommands: false,

  // Motor impairment support
  dwellClickingEnabled: false,
  dwellClickingTime: 1000, // milliseconds
  switchInputEnabled: false,
  switchScanningSpeed: 1500, // milliseconds
  headTrackingEnabled: false,
  timeoutExtensionLevel: 'moderate', // none, moderate, extended, unlimited

  // Content preferences
  simplifiedUI: false,
  descriptiveText: true,
  errorDescriptions: true
};

/**
 * WCAG 2.1 AA Compliance Manager
 */
class WCAGComplianceManager {
  constructor() {
    this.contrastRatio = 4.5; // WCAG AA minimum
    this.touchTargetSize = 44; // pixels
    this.textScaleMax = 200; // percentage
    this.timeoutExtension = 20; // seconds
  }

  /**
   * Check if color contrast meets WCAG AA standards
   */
  checkColorContrast(foreground, background) {
    const luminance1 = this.getLuminance(foreground);
    const luminance2 = this.getLuminance(background);

    const brightest = Math.max(luminance1, luminance2);
    const darkest = Math.min(luminance1, luminance2);

    return (brightest + 0.05) / (darkest + 0.05);
  }

  /**
   * Calculate relative luminance of a color
   */
  getLuminance(color) {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Convert hex color to RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Validate touch target size
   */
  validateTouchTarget(element) {
    const rect = element.getBoundingClientRect();
    return rect.width >= this.touchTargetSize && rect.height >= this.touchTargetSize;
  }

  /**
   * Apply text scaling
   */
  applyTextScaling(percentage) {
    const scaleFactor = Math.min(percentage / 100, this.textScaleMax / 100);
    document.documentElement.style.setProperty('--text-scale-factor', scaleFactor);
    document.documentElement.style.fontSize = `${16 * scaleFactor}px`;
  }
}

/**
 * Keyboard Navigation Manager
 */
class KeyboardNavigationManager {
  constructor() {
    this.focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '[role="link"]',
      '[role="menuitem"]',
      '[role="tab"]'
    ].join(', ');

    this.shortcuts = new Map();
    this.focusHistory = [];
  }

  /**
   * Get all focusable elements in container
   */
  getFocusableElements(container = document) {
    return Array.from(container.querySelectorAll(this.focusableSelectors))
      .filter(el => this.isVisible(el) && !this.isDisabled(el));
  }

  /**
   * Check if element is visible
   */
  isVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0';
  }

  /**
   * Check if element is disabled
   */
  isDisabled(element) {
    return element.disabled ||
      element.getAttribute('aria-disabled') === 'true' ||
      element.getAttribute('disabled') !== null;
  }

  /**
   * Create focus trap for modal dialogs
   */
  createFocusTrap(container) {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return null;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }

  /**
   * Register keyboard shortcut
   */
  registerShortcut(keys, callback, description) {
    const keyString = Array.isArray(keys) ? keys.join('+') : keys;
    this.shortcuts.set(keyString.toLowerCase(), { callback, description });
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyDown(event) {
    const keys = [];
    if (event.ctrlKey) keys.push('ctrl');
    if (event.altKey) keys.push('alt');
    if (event.shiftKey) keys.push('shift');
    if (event.metaKey) keys.push('meta');
    if (event.key) {
      keys.push(event.key.toLowerCase());
    }

    const keyString = keys.join('+');
    const shortcut = this.shortcuts.get(keyString);

    if (shortcut) {
      event.preventDefault();
      shortcut.callback(event);
    }
  }
}

/**
 * Alternative Input Methods Manager
 */
class AlternativeInputMethodsManager {
  constructor() {
    this.activeMethod = 'standard';
    this.dwellTimer = null;
    this.switchScanner = null;
    this.isInitialized = false;
  }

  /**
   * Initialize alternative input methods
   */
  initialize(settings) {
    if (!settings.alternativeInputs) return;

    this.isInitialized = true;

    // Set up based on enabled methods
    if (settings.dwellClickingEnabled) {
      this.enableDwellClicking(settings.dwellClickingTime);
    }

    if (settings.switchInputEnabled) {
      this.enableSwitchInput(settings.switchScanningSpeed);
    }
  }

  /**
   * Enable dwell clicking
   */
  enableDwellClicking(dwellTime = 1000) {
    this.activeMethod = 'dwell';

    // Implementation would be handled by the AlternativeInputMethods component
    document.body.classList.add('dwell-clicking-enabled');
    document.body.style.setProperty('--dwell-time', `${dwellTime}ms`);
  }

  /**
   * Enable switch input
   */
  enableSwitchInput(scanningSpeed = 1500) {
    this.activeMethod = 'switch';

    // Implementation would be handled by the AlternativeInputMethods component
    document.body.classList.add('switch-input-enabled');
    document.body.style.setProperty('--switch-scanning-speed', `${scanningSpeed}ms`);
  }

  /**
   * Disable all alternative input methods
   */
  disable() {
    this.activeMethod = 'standard';
    document.body.classList.remove('dwell-clicking-enabled', 'switch-input-enabled');

    if (this.dwellTimer) {
      clearTimeout(this.dwellTimer);
      this.dwellTimer = null;
    }

    if (this.switchScanner) {
      clearInterval(this.switchScanner);
      this.switchScanner = null;
    }
  }

  /**
   * Check if alternative inputs are active
   */
  isActive() {
    return this.activeMethod !== 'standard';
  }
}

/**
 * Enhanced Timeout Manager
 */
class EnhancedTimeoutManager {
  constructor() {
    this.timeouts = new Map();
    this.extensions = {
      none: 1,
      moderate: 2,
      extended: 5,
      unlimited: 0
    };
    this.defaultExtensionLevel = 'moderate';
  }

  /**
   * Create timeout with accessibility extensions
   */
  createTimeout(callback, duration, options = {}) {
    const {
      type = 'interaction',
      allowExtension = true,
      extensionLevel = this.defaultExtensionLevel,
      description = 'Operation timeout',
      id = `timeout-${Date.now()}`
    } = options;

    // Calculate extended duration
    const multiplier = this.extensions[extensionLevel] || 1;
    const extendedDuration = multiplier === 0 ? null : duration * multiplier;

    // No timeout if unlimited
    if (extendedDuration === null) {
      return { id, cancel: () => { }, extend: () => { } };
    }

    const timeoutData = {
      id,
      type,
      description,
      originalDuration: duration,
      extendedDuration,
      callback,
      allowExtension,
      startTime: Date.now()
    };

    // Set timeout
    const timeoutId = setTimeout(() => {
      this.executeTimeout(timeoutData);
    }, extendedDuration);

    this.timeouts.set(id, { ...timeoutData, timeoutId });

    return {
      id,
      cancel: () => this.cancelTimeout(id),
      extend: (additionalTime) => this.extendTimeout(id, additionalTime)
    };
  }

  /**
   * Execute timeout
   */
  executeTimeout(timeoutData) {
    const { id, callback } = timeoutData;

    this.timeouts.delete(id);

    if (callback) {
      callback();
    }
  }

  /**
   * Cancel timeout
   */
  cancelTimeout(id) {
    const timeout = this.timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout.timeoutId);
      this.timeouts.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Extend timeout
   */
  extendTimeout(id, additionalTime = null) {
    const timeout = this.timeouts.get(id);
    if (!timeout || !timeout.allowExtension) {
      return false;
    }

    // Cancel existing timeout
    clearTimeout(timeout.timeoutId);

    // Calculate new duration
    const extensionTime = additionalTime || timeout.originalDuration;

    // Set new timeout
    const newTimeoutId = setTimeout(() => {
      this.executeTimeout(timeout);
    }, extensionTime);

    // Update timeout data
    timeout.timeoutId = newTimeoutId;
    timeout.startTime = Date.now();
    timeout.extendedDuration = extensionTime;

    this.timeouts.set(id, timeout);
    return true;
  }

  /**
   * Set default extension level
   */
  setExtensionLevel(level) {
    if (this.extensions.hasOwnProperty(level)) {
      this.defaultExtensionLevel = level;
    }
  }

  /**
   * Clear all timeouts
   */
  clearAll() {
    this.timeouts.forEach(timeout => {
      clearTimeout(timeout.timeoutId);
    });
    this.timeouts.clear();
  }
}
class ScreenReaderManager {
  constructor() {
    this.liveRegions = new Map();
    this.announcements = [];
  }

  /**
   * Create live region for announcements
   */
  createLiveRegion(id, priority = 'polite') {
    let region = document.getElementById(id);

    if (!region) {
      region = document.createElement('div');
      region.id = id;
      region.setAttribute('aria-live', priority);
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      document.body.appendChild(region);
    }

    this.liveRegions.set(id, region);
    return region;
  }

  /**
   * Announce message to screen readers
   */
  announce(message, priority = 'polite') {
    const regionId = `live-region-${priority}`;
    let region = this.liveRegions.get(regionId);

    if (!region) {
      region = this.createLiveRegion(regionId, priority);
    }

    // Clear previous content and set new message
    region.textContent = '';
    setTimeout(() => {
      region.textContent = message;
    }, 100);

    // Track announcement
    this.announcements.push({
      message,
      priority,
      timestamp: new Date(),
      id: Date.now()
    });

    // Clean up old announcements
    if (this.announcements.length > 10) {
      this.announcements = this.announcements.slice(-10);
    }
  }

  /**
   * Enhance element with ARIA attributes
   */
  enhanceElement(element, options = {}) {
    const {
      label,
      description,
      role,
      expanded,
      selected,
      checked,
      invalid,
      required,
      live
    } = options;

    if (label) {
      element.setAttribute('aria-label', label);
    }

    if (description) {
      const descId = `desc-${Date.now()}`;
      const descElement = document.createElement('div');
      descElement.id = descId;
      descElement.className = 'sr-only';
      descElement.textContent = description;
      element.parentNode.insertBefore(descElement, element.nextSibling);
      element.setAttribute('aria-describedby', descId);
    }

    if (role) {
      element.setAttribute('role', role);
    }

    if (expanded !== undefined) {
      element.setAttribute('aria-expanded', expanded.toString());
    }

    if (selected !== undefined) {
      element.setAttribute('aria-selected', selected.toString());
    }

    if (checked !== undefined) {
      element.setAttribute('aria-checked', checked.toString());
    }

    if (invalid !== undefined) {
      element.setAttribute('aria-invalid', invalid.toString());
    }

    if (required !== undefined) {
      element.setAttribute('aria-required', required.toString());
    }

    if (live) {
      element.setAttribute('aria-live', live);
    }
  }
}

/**
 * Accessibility Provider Component
 */
export const AccessibilityProvider = ({ children, settings = {} }) => {
  const [accessibilitySettings, setAccessibilitySettings] = useState({
    ...DEFAULT_ACCESSIBILITY_SETTINGS,
    ...settings
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const accessibility = useAccessibility();

  // Managers
  const wcagManager = useRef(new WCAGComplianceManager());
  const keyboardManager = useRef(new KeyboardNavigationManager());
  const screenReaderManager = useRef(new ScreenReaderManager());
  const alternativeInputManager = useRef(new AlternativeInputMethodsManager());
  const timeoutManager = useRef(new EnhancedTimeoutManager());

  // Initialize accessibility features
  useEffect(() => {
    const initialize = async () => {
      try {
        // Load saved settings from localStorage
        const savedSettings = localStorage.getItem('accessibility-settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setAccessibilitySettings(prev => ({ ...prev, ...parsed }));
        }

        // Detect system preferences
        const systemPrefs = {
          highContrast: window.matchMedia('(prefers-contrast: high)').matches,
          reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        };

        setAccessibilitySettings(prev => ({
          ...prev,
          ...systemPrefs
        }));

        // Initialize keyboard shortcuts
        keyboardManager.current.registerShortcut(['alt', 'h'], () => {
          accessibility.skipToMain();
        }, 'Skip to main content');

        keyboardManager.current.registerShortcut(['alt', 'n'], () => {
          accessibility.skipToNavigation();
        }, 'Skip to navigation');

        keyboardManager.current.registerShortcut(['alt', '1'], () => {
          const h1 = document.querySelector('h1');
          if (h1) {
            h1.focus();
            h1.scrollIntoView();
          }
        }, 'Go to main heading');

        // Set up keyboard event listener
        document.addEventListener('keydown', keyboardManager.current.handleKeyDown.bind(keyboardManager.current));

        // Initialize alternative input methods
        alternativeInputManager.current.initialize(accessibilitySettings);

        // Set timeout extension level
        timeoutManager.current.setExtensionLevel(accessibilitySettings.timeoutExtensionLevel);

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize accessibility features:', error);
      }
    };

    initialize();

    return () => {
      document.removeEventListener('keydown', keyboardManager.current.handleKeyDown.bind(keyboardManager.current));
      alternativeInputManager.current.disable();
      timeoutManager.current.clearAll();
    };
  }, [accessibility]);

  // Apply accessibility settings
  useEffect(() => {
    if (!isInitialized) return;

    const applySettings = () => {
      const root = document.documentElement;

      // High contrast theme
      if (accessibilitySettings.highContrast) {
        root.classList.add('high-contrast');
      } else {
        root.classList.remove('high-contrast');
      }

      // Reduced motion
      if (accessibilitySettings.reducedMotion) {
        root.classList.add('reduced-motion');
      } else {
        root.classList.remove('reduced-motion');
      }

      // Text scaling
      if (accessibilitySettings.textScaling !== 100) {
        wcagManager.current.applyTextScaling(accessibilitySettings.textScaling);
      }

      // Keyboard navigation
      if (accessibilitySettings.keyboardNavigation) {
        root.classList.add('keyboard-navigation');
      } else {
        root.classList.remove('keyboard-navigation');
      }

      // Focus indicators
      if (accessibilitySettings.focusIndicators) {
        root.classList.add('focus-indicators');
      } else {
        root.classList.remove('focus-indicators');
      }

      // Alternative input methods
      if (accessibilitySettings.alternativeInputs) {
        alternativeInputManager.current.initialize(accessibilitySettings);
      } else {
        alternativeInputManager.current.disable();
      }

      // Extended timeouts
      if (accessibilitySettings.extendedTimeouts) {
        timeoutManager.current.setExtensionLevel(accessibilitySettings.timeoutExtensionLevel);
        root.classList.add('extended-timeouts');
      } else {
        root.classList.remove('extended-timeouts');
      }

      // Save settings to localStorage
      localStorage.setItem('accessibility-settings', JSON.stringify(accessibilitySettings));
    };

    applySettings();
  }, [accessibilitySettings, isInitialized]);

  // Update accessibility setting
  const updateSetting = useCallback((key, value) => {
    setAccessibilitySettings(prev => ({
      ...prev,
      [key]: value
    }));

    // Announce change to screen readers
    screenReaderManager.current.announce(
      `Accessibility setting ${key} ${value ? 'enabled' : 'disabled'}`,
      'polite'
    );
  }, []);

  // Toggle accessibility setting
  const toggleSetting = useCallback((key) => {
    setAccessibilitySettings(prev => {
      const newValue = !prev[key];

      // Announce change to screen readers
      screenReaderManager.current.announce(
        `${key} ${newValue ? 'enabled' : 'disabled'}`,
        'polite'
      );

      return {
        ...prev,
        [key]: newValue
      };
    });
  }, []);

  // Create focus trap
  const createFocusTrap = useCallback((container) => {
    return keyboardManager.current.createFocusTrap(container);
  }, []);

  // Announce to screen readers
  const announce = useCallback((message, priority = 'polite') => {
    if (accessibilitySettings.announcements) {
      screenReaderManager.current.announce(message, priority);
    }
  }, [accessibilitySettings.announcements]);

  // Enhance element with ARIA
  const enhanceElement = useCallback((element, options) => {
    screenReaderManager.current.enhanceElement(element, options);
  }, []);

  // Check color contrast
  const checkColorContrast = useCallback((foreground, background) => {
    return wcagManager.current.checkColorContrast(foreground, background);
  }, []);

  // Validate touch target
  const validateTouchTarget = useCallback((element) => {
    return wcagManager.current.validateTouchTarget(element);
  }, []);

  // Create accessible timeout
  const createAccessibleTimeout = useCallback((callback, duration, options = {}) => {
    return timeoutManager.current.createTimeout(callback, duration, {
      extensionLevel: accessibilitySettings.timeoutExtensionLevel,
      allowExtension: accessibilitySettings.extendedTimeouts,
      ...options
    });
  }, [accessibilitySettings.extendedTimeouts, accessibilitySettings.timeoutExtensionLevel]);

  // Check if alternative inputs are active
  const isAlternativeInputActive = useCallback(() => {
    return alternativeInputManager.current.isActive();
  }, []);

  const contextValue = {
    // Settings
    settings: accessibilitySettings,
    updateSetting,
    toggleSetting,

    // Managers
    wcagManager: wcagManager.current,
    keyboardManager: keyboardManager.current,
    screenReaderManager: screenReaderManager.current,
    alternativeInputManager: alternativeInputManager.current,
    timeoutManager: timeoutManager.current,

    // Functions
    createFocusTrap,
    announce,
    enhanceElement,
    checkColorContrast,
    validateTouchTarget,
    createAccessibleTimeout,
    isAlternativeInputActive,

    // State
    isInitialized
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
      {/* Live regions for screen reader announcements */}
      <div id="live-region-polite" aria-live="polite" aria-atomic="true" className="sr-only" />
      <div id="live-region-assertive" aria-live="assertive" aria-atomic="true" className="sr-only" />
    </AccessibilityContext.Provider>
  );
};

/**
 * Hook to use accessibility context
 */
export const useAccessibilityContext = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibilityContext must be used within AccessibilityProvider');
  }
  return context;
};

export default AccessibilityProvider;