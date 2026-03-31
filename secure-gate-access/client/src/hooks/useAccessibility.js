// client/src/hooks/useAccessibility.js
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import { auditThemeAccessibility, runAccessibilityChecks } from '../utils/accessibilityAudit';

/**
 * Enhanced accessibility hook for comprehensive WCAG 2.1 AA compliance
 */
export const useAccessibility = (options = {}) => {
  // Ensure options is always an object and has the expected structure
  const safeOptions = options && typeof options === 'object' ? options : {};
  const {
    enableLiveChecks = true,
    enableKeyboardNavigation = true,
    enableScreenReader = true,
    enableHighContrast = false,
    enableReducedMotion = false
  } = safeOptions;

  const [accessibilityState, setAccessibilityState] = useState({
    isHighContrast: enableHighContrast,
    isReducedMotion: enableReducedMotion,
    isKeyboardUser: false,
    isScreenReader: false,
    focusVisible: false,
    currentFocus: null,
    announcements: []
  });

  const [auditResults, setAuditResults] = useState(null);
  const focusHistory = useRef([]);

  // Detect user preferences
  useEffect(() => {
    const detectPreferences = () => {
      // High contrast detection
      const highContrastQuery = window.matchMedia && window.matchMedia('(prefers-contrast: high)');
      const isHighContrast = highContrastQuery ? highContrastQuery.matches : false;

      // Reduced motion detection
      const reducedMotionQuery = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
      const isReducedMotion = reducedMotionQuery ? reducedMotionQuery.matches : false;

      // Screen reader detection (basic)
      const isScreenReader =
        window.navigator.userAgent.includes('NVDA') ||
        window.navigator.userAgent.includes('JAWS') ||
        window.navigator.userAgent.includes('VoiceOver') ||
        document.querySelector('[aria-live]') !== null;

      setAccessibilityState(prev => ({
        ...prev,
        isHighContrast,
        isReducedMotion,
        isScreenReader
      }));
    };

    detectPreferences();

    // Listen for preference changes
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleHighContrastChange = (e) => {
      setAccessibilityState(prev => ({ ...prev, isHighContrast: e.matches }));
    };

    const handleReducedMotionChange = (e) => {
      setAccessibilityState(prev => ({ ...prev, isReducedMotion: e.matches }));
    };

    if (highContrastQuery && highContrastQuery.addEventListener) {
      highContrastQuery.addEventListener('change', handleHighContrastChange);
    }
    if (reducedMotionQuery && reducedMotionQuery.addEventListener) {
      reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    }

    return () => {
      if (highContrastQuery && highContrastQuery.removeEventListener) {
        highContrastQuery.removeEventListener('change', handleHighContrastChange);
      }
      if (reducedMotionQuery && reducedMotionQuery.removeEventListener) {
        reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      }
    };
  }, []);

  // Keyboard navigation detection
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        setAccessibilityState(prev => ({ ...prev, isKeyboardUser: true }));
      }
    };

    const handleMouseDown = () => {
      setAccessibilityState(prev => ({ ...prev, isKeyboardUser: false }));
    };

    if (enableKeyboardNavigation) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleMouseDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [enableKeyboardNavigation]);

  // Focus management
  useEffect(() => {
    const handleFocusIn = (e) => {
      const focusableElement = e.target;
      setAccessibilityState(prev => ({
        ...prev,
        currentFocus: focusableElement,
        focusVisible: true
      }));

      // Track focus history
      focusHistory.current.push(focusableElement);
      if (focusHistory.current.length > 10) {
        focusHistory.current.shift();
      }
    };

    const handleFocusOut = () => {
      setAccessibilityState(prev => ({
        ...prev,
        focusVisible: false
      }));
    };

    if (enableKeyboardNavigation) {
      document.addEventListener('focusin', handleFocusIn);
      document.addEventListener('focusout', handleFocusOut);
    }

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, [enableKeyboardNavigation]);

  // Live accessibility checks
  useEffect(() => {
    if (enableLiveChecks && process.env.NODE_ENV === 'development') {
      const timer = setTimeout(() => {
        runAccessibilityChecks();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [enableLiveChecks]);

  // Run comprehensive audit
  const runAudit = useCallback(() => {
    const results = auditThemeAccessibility();
    setAuditResults(results);
    return results;
  }, []);

  // Announce to screen readers
  const announce = useCallback((message, priority = 'polite') => {
    if (!enableScreenReader) return;

    const announcement = {
      id: Date.now(),
      message,
      priority,
      timestamp: new Date()
    };

    setAccessibilityState(prev => ({
      ...prev,
      announcements: [...prev.announcements, announcement]
    }));

    // Create or update live region
    let liveRegion = document.getElementById('accessibility-live-region');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'accessibility-live-region';
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
    }

    liveRegion.textContent = message;

    // Clean up old announcements
    setTimeout(() => {
      setAccessibilityState(prev => ({
        ...prev,
        announcements: prev.announcements.filter(a => a.id !== announcement.id)
      }));
    }, 5000);
  }, [enableScreenReader]);

  // Skip to main content
  const skipToMain = useCallback(() => {
    const main = document.querySelector('main, [role="main"]');
    if (main) {
      main.focus();
      main.scrollIntoView();
      announce('Skipped to main content');
    }
  }, [announce]);

  // Skip to navigation
  const skipToNavigation = useCallback(() => {
    const nav = document.querySelector('nav, [role="navigation"]');
    if (nav) {
      nav.focus();
      nav.scrollIntoView();
      announce('Skipped to navigation');
    }
  }, [announce]);

  // Get accessible class names based on state
  const getAccessibleClasses = useCallback((baseClasses = '') => {
    const classes = [baseClasses];

    if (accessibilityState.isHighContrast) {
      classes.push('high-contrast');
    }

    if (accessibilityState.isReducedMotion) {
      classes.push('reduced-motion');
    }

    if (accessibilityState.isKeyboardUser) {
      classes.push('keyboard-user');
    }

    if (accessibilityState.focusVisible) {
      classes.push('focus-visible');
    }

    return classes.filter(Boolean).join(' ');
  }, [accessibilityState]);

  // Get accessible styles
  const getAccessibleStyles = useCallback((baseStyles = {}) => {
    const styles = { ...baseStyles };

    if (accessibilityState.isReducedMotion) {
      styles.transition = 'none';
      styles.animation = 'none';
    }

    if (accessibilityState.isHighContrast) {
      styles.filter = 'contrast(150%)';
    }

    return styles;
  }, [accessibilityState]);

  // Focus trap for modals
  const createFocusTrap = useCallback((container) => {
    if (!container) return null;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // ARIA live region for announcements
  const LiveRegion = useCallback(() => (
    <div
      id="accessibility-live-region"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  ), []);

  return useMemo(() => ({
    accessibilityState,
    auditResults,
    runAudit,
    announce,
    skipToMain,
    skipToNavigation,
    getAccessibleClasses,
    getAccessibleStyles,
    createFocusTrap,
    LiveRegion,
    focusHistory: focusHistory.current
  }), [
    accessibilityState,
    auditResults,
    runAudit,
    announce,
    skipToMain,
    skipToNavigation,
    getAccessibleClasses,
    getAccessibleStyles,
    createFocusTrap,
    LiveRegion
  ]);
};

/**
 * Hook for managing focus within a component
 */
export const useFocusManagement = (options = {}) => {
  const {
    trapFocus = false,
    restoreFocus = true,
    initialFocus = null
  } = options;

  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (trapFocus && containerRef.current) {
      const focusableElements = containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length > 0) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleKeyDown = (e) => {
          if (e.key === 'Tab') {
            if (e.shiftKey) {
              if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
              }
            } else {
              if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
              }
            }
          }
        };

        containerRef.current.addEventListener('keydown', handleKeyDown);

        // Focus initial element
        if (initialFocus) {
          const element = containerRef.current.querySelector(initialFocus);
          element?.focus();
        } else {
          firstElement.focus();
        }

        return () => {
          containerRef.current.removeEventListener('keydown', handleKeyDown);
        };
      }
    }
  }, [trapFocus, initialFocus]);

  // Restore focus on unmount
  useEffect(() => {
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement;

      return () => {
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [restoreFocus]);

  return { containerRef };
};

/**
 * Hook for keyboard shortcuts
 */
export const useKeyboardShortcuts = (shortcuts = {}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      const modifiers = {
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        meta: e.metaKey
      };

      const shortcutKey = Object.entries(modifiers)
        .filter(([, pressed]) => pressed)
        .map(([key]) => key)
        .concat([key])
        .join('+');

      if (shortcuts[shortcutKey]) {
        e.preventDefault();
        shortcuts[shortcutKey](e);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

export default useAccessibility;




