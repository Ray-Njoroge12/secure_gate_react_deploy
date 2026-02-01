/**
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAccessibility, useFocusManagement, useKeyboardShortcuts } from '../../hooks/useAccessibility.js';

// Mock accessibility audit functions
jest.mock('../../utils/accessibilityAudit', () => ({
  auditThemeAccessibility: jest.fn(() => ({
    score: 95,
    issues: [],
    recommendations: []
  })),
  runAccessibilityChecks: jest.fn()
}));

// Mock matchMedia
const mockMatchMedia = (matches = false) => ({
  matches,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  addListener: jest.fn(), // Deprecated but still used
  removeListener: jest.fn() // Deprecated but still used
});

beforeEach(() => {
  // Reset DOM
  document.body.innerHTML = '';
  
  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => {
      if (query.includes('prefers-contrast: high')) {
        return mockMatchMedia(false);
      }
      if (query.includes('prefers-reduced-motion: reduce')) {
        return mockMatchMedia(false);
      }
      return mockMatchMedia(false);
    })
  });

  // Mock navigator
  Object.defineProperty(window.navigator, 'userAgent', {
    writable: true,
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });

  // Clear any existing live regions
  const existingRegion = document.getElementById('accessibility-live-region');
  if (existingRegion) {
    existingRegion.remove();
  }
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('useAccessibility Hook', () => {
  describe('Initialization', () => {
    test('initializes with default state', () => {
      const { result } = renderHook(() => useAccessibility());
      
      expect(result.current.accessibilityState).toEqual({
        isHighContrast: false,
        isReducedMotion: false,
        isKeyboardUser: false,
        isScreenReader: false,
        focusVisible: false,
        currentFocus: null,
        announcements: []
      });
      
      expect(result.current.auditResults).toBeNull();
      expect(typeof result.current.runAudit).toBe('function');
      expect(typeof result.current.announce).toBe('function');
    });

    test('handles options parameter safely', () => {
      // Test with null options
      const { result: result1 } = renderHook(() => useAccessibility(null));
      expect(result1.current.accessibilityState).toBeDefined();
      
      // Test with undefined options
      const { result: result2 } = renderHook(() => useAccessibility(undefined));
      expect(result2.current.accessibilityState).toBeDefined();
      
      // Test with invalid options
      const { result: result3 } = renderHook(() => useAccessibility('invalid'));
      expect(result3.current.accessibilityState).toBeDefined();
    });

    test('applies custom options', () => {
      const options = {
        enableLiveChecks: false,
        enableKeyboardNavigation: false,
        enableScreenReader: false
      };
      
      const { result } = renderHook(() => useAccessibility(options));
      
      // Should still initialize properly
      expect(result.current.accessibilityState).toBeDefined();
    });
  });

  describe('User Preference Detection', () => {
    test('detects high contrast preference', async () => {
      window.matchMedia.mockImplementation((query) => {
        if (query.includes('prefers-contrast: high')) {
          return mockMatchMedia(true);
        }
        return mockMatchMedia(false);
      });

      const { result } = renderHook(() => useAccessibility());
      
      await waitFor(() => {
        expect(result.current.accessibilityState.isHighContrast).toBe(true);
      });
    });

    test('detects reduced motion preference', async () => {
      window.matchMedia.mockImplementation((query) => {
        if (query.includes('prefers-reduced-motion: reduce')) {
          return mockMatchMedia(true);
        }
        return mockMatchMedia(false);
      });

      const { result } = renderHook(() => useAccessibility());
      
      await waitFor(() => {
        expect(result.current.accessibilityState.isReducedMotion).toBe(true);
      });
    });

    test('detects screen reader from user agent', async () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 NVDA/2021.1'
      });

      const { result } = renderHook(() => useAccessibility());
      
      await waitFor(() => {
        expect(result.current.accessibilityState.isScreenReader).toBe(true);
      });
    });

    test('detects screen reader from DOM elements', async () => {
      // Add aria-live element to DOM
      const liveElement = document.createElement('div');
      liveElement.setAttribute('aria-live', 'polite');
      document.body.appendChild(liveElement);

      const { result } = renderHook(() => useAccessibility());
      
      await waitFor(() => {
        expect(result.current.accessibilityState.isScreenReader).toBe(true);
      });
    });

    test('handles missing matchMedia gracefully', async () => {
      delete window.matchMedia;

      const { result } = renderHook(() => useAccessibility());
      
      // Should not crash and should have default values
      expect(result.current.accessibilityState.isHighContrast).toBe(false);
      expect(result.current.accessibilityState.isReducedMotion).toBe(false);
    });
  });

  describe('Keyboard Navigation Detection', () => {
    test('detects keyboard usage on Tab key', async () => {
      const { result } = renderHook(() => useAccessibility());
      
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Tab' });
        document.dispatchEvent(event);
      });
      
      expect(result.current.accessibilityState.isKeyboardUser).toBe(true);
    });

    test('resets keyboard user on mouse interaction', async () => {
      const { result } = renderHook(() => useAccessibility());
      
      // First set keyboard user
      act(() => {
        const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
        document.dispatchEvent(tabEvent);
      });
      
      expect(result.current.accessibilityState.isKeyboardUser).toBe(true);
      
      // Then simulate mouse interaction
      act(() => {
        const mouseEvent = new MouseEvent('mousedown');
        document.dispatchEvent(mouseEvent);
      });
      
      expect(result.current.accessibilityState.isKeyboardUser).toBe(false);
    });

    test('ignores keyboard detection when disabled', () => {
      const { result } = renderHook(() => useAccessibility({ enableKeyboardNavigation: false }));
      
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Tab' });
        document.dispatchEvent(event);
      });
      
      expect(result.current.accessibilityState.isKeyboardUser).toBe(false);
    });
  });

  describe('Focus Management', () => {
    test('tracks focus changes', async () => {
      const { result } = renderHook(() => useAccessibility());
      
      const button = document.createElement('button');
      document.body.appendChild(button);
      
      act(() => {
        button.focus();
        const event = new FocusEvent('focusin', { target: button });
        document.dispatchEvent(event);
      });
      
      expect(result.current.accessibilityState.currentFocus).toBe(button);
      expect(result.current.accessibilityState.focusVisible).toBe(true);
    });

    test('resets focus visibility on focus out', async () => {
      const { result } = renderHook(() => useAccessibility());
      
      const button = document.createElement('button');
      document.body.appendChild(button);
      
      // Focus in
      act(() => {
        const focusInEvent = new FocusEvent('focusin', { target: button });
        document.dispatchEvent(focusInEvent);
      });
      
      expect(result.current.accessibilityState.focusVisible).toBe(true);
      
      // Focus out
      act(() => {
        const focusOutEvent = new FocusEvent('focusout');
        document.dispatchEvent(focusOutEvent);
      });
      
      expect(result.current.accessibilityState.focusVisible).toBe(false);
    });

    test('maintains focus history', async () => {
      const { result } = renderHook(() => useAccessibility());
      
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      document.body.appendChild(button1);
      document.body.appendChild(button2);
      
      act(() => {
        const event1 = new FocusEvent('focusin', { target: button1 });
        document.dispatchEvent(event1);
      });
      
      act(() => {
        const event2 = new FocusEvent('focusin', { target: button2 });
        document.dispatchEvent(event2);
      });
      
      expect(result.current.focusHistory).toContain(button1);
      expect(result.current.focusHistory).toContain(button2);
    });

    test('limits focus history to 10 items', async () => {
      const { result } = renderHook(() => useAccessibility());
      
      // Create 15 buttons and focus them
      for (let i = 0; i < 15; i++) {
        const button = document.createElement('button');
        document.body.appendChild(button);
        
        act(() => {
          const event = new FocusEvent('focusin', { target: button });
          document.dispatchEvent(event);
        });
      }
      
      expect(result.current.focusHistory.length).toBe(10);
    });
  });

  describe('Announcements', () => {
    test('creates live region for announcements', async () => {
      const { result } = renderHook(() => useAccessibility());
      
      act(() => {
        result.current.announce('Test message');
      });
      
      await waitFor(() => {
        const liveRegion = document.getElementById('accessibility-live-region');
        expect(liveRegion).toBeInTheDocument();
        expect(liveRegion).toHaveAttribute('aria-live', 'polite');
        expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
      });
    });

    test('announces message to screen reader', async () => {
      const { result } = renderHook(() => useAccessibility());
      
      act(() => {
        result.current.announce('Test announcement');
      });
      
      await waitFor(() => {
        const liveRegion = document.getElementById('accessibility-live-region');
        expect(liveRegion.textContent).toBe('Test announcement');
      });
    });

    test('supports different priority levels', async () => {
      const { result } = renderHook(() => useAccessibility());
      
      act(() => {
        result.current.announce('Urgent message', 'assertive');
      });
      
      await waitFor(() => {
        const liveRegion = document.getElementById('accessibility-live-region');
        expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
      });
    });

    test('tracks announcements in state', async () => {
      const { result } = renderHook(() => useAccessibility());
      
      act(() => {
        result.current.announce('First message');
      });
      
      act(() => {
        result.current.announce('Second message');
      });
      
      expect(result.current.accessibilityState.announcements).toHaveLength(2);
      expect(result.current.accessibilityState.announcements[0].message).toBe('First message');
      expect(result.current.accessibilityState.announcements[1].message).toBe('Second message');
    });

    test('cleans up old announcements', async () => {
      jest.useFakeTimers();
      
      const { result } = renderHook(() => useAccessibility());
      
      act(() => {
        result.current.announce('Test message');
      });
      
      expect(result.current.accessibilityState.announcements).toHaveLength(1);
      
      // Fast forward 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      await waitFor(() => {
        expect(result.current.accessibilityState.announcements).toHaveLength(0);
      });
      
      jest.useRealTimers();
    });

    test('does not announce when screen reader support disabled', () => {
      const { result } = renderHook(() => useAccessibility({ enableScreenReader: false }));
      
      act(() => {
        result.current.announce('Test message');
      });
      
      expect(result.current.accessibilityState.announcements).toHaveLength(0);
      
      const liveRegion = document.getElementById('accessibility-live-region');
      expect(liveRegion).not.toBeInTheDocument();
    });
  });

  describe('Skip Navigation', () => {
    test('skipToMain focuses main element', () => {
      const { result } = renderHook(() => useAccessibility());
      
      const main = document.createElement('main');
      main.focus = jest.fn();
      main.scrollIntoView = jest.fn();
      document.body.appendChild(main);
      
      act(() => {
        result.current.skipToMain();
      });
      
      expect(main.focus).toHaveBeenCalled();
      expect(main.scrollIntoView).toHaveBeenCalled();
    });

    test('skipToNavigation focuses nav element', () => {
      const { result } = renderHook(() => useAccessibility());
      
      const nav = document.createElement('nav');
      nav.focus = jest.fn();
      nav.scrollIntoView = jest.fn();
      document.body.appendChild(nav);
      
      act(() => {
        result.current.skipToNavigation();
      });
      
      expect(nav.focus).toHaveBeenCalled();
      expect(nav.scrollIntoView).toHaveBeenCalled();
    });

    test('handles missing elements gracefully', () => {
      const { result } = renderHook(() => useAccessibility());
      
      // Should not throw when elements don't exist
      expect(() => {
        act(() => {
          result.current.skipToMain();
          result.current.skipToNavigation();
        });
      }).not.toThrow();
    });
  });

  describe('Accessible Classes and Styles', () => {
    test('getAccessibleClasses returns appropriate classes', () => {
      const { result } = renderHook(() => useAccessibility());
      
      // Simulate high contrast and keyboard user
      act(() => {
        const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
        document.dispatchEvent(tabEvent);
      });
      
      // Mock high contrast
      result.current.accessibilityState.isHighContrast = true;
      result.current.accessibilityState.focusVisible = true;
      
      const classes = result.current.getAccessibleClasses('base-class');
      
      expect(classes).toContain('base-class');
      expect(classes).toContain('high-contrast');
      expect(classes).toContain('keyboard-user');
      expect(classes).toContain('focus-visible');
    });

    test('getAccessibleStyles returns appropriate styles', () => {
      const { result } = renderHook(() => useAccessibility());
      
      // Mock reduced motion and high contrast
      result.current.accessibilityState.isReducedMotion = true;
      result.current.accessibilityState.isHighContrast = true;
      
      const styles = result.current.getAccessibleStyles({ color: 'blue' });
      
      expect(styles.color).toBe('blue');
      expect(styles.transition).toBe('none');
      expect(styles.animation).toBe('none');
      expect(styles.filter).toBe('contrast(150%)');
    });
  });

  describe('Focus Trap', () => {
    test('createFocusTrap sets up focus management', () => {
      const { result } = renderHook(() => useAccessibility());
      
      const container = document.createElement('div');
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      
      button1.focus = jest.fn();
      container.appendChild(button1);
      container.appendChild(button2);
      document.body.appendChild(container);
      
      const cleanup = result.current.createFocusTrap(container);
      
      expect(button1.focus).toHaveBeenCalled();
      expect(typeof cleanup).toBe('function');
    });

    test('createFocusTrap handles empty container', () => {
      const { result } = renderHook(() => useAccessibility());
      
      const container = document.createElement('div');
      document.body.appendChild(container);
      
      const cleanup = result.current.createFocusTrap(container);
      
      expect(typeof cleanup).toBe('function');
    });

    test('createFocusTrap handles null container', () => {
      const { result } = renderHook(() => useAccessibility());
      
      const cleanup = result.current.createFocusTrap(null);
      
      expect(cleanup).toBeNull();
    });
  });

  describe('Audit Functionality', () => {
    test('runAudit executes accessibility audit', () => {
      const { auditThemeAccessibility } = require('../../utils/accessibilityAudit');
      const { result } = renderHook(() => useAccessibility());
      
      const auditResults = result.current.runAudit();
      
      expect(auditThemeAccessibility).toHaveBeenCalled();
      expect(auditResults).toEqual({
        score: 95,
        issues: [],
        recommendations: []
      });
      expect(result.current.auditResults).toEqual(auditResults);
    });
  });

  describe('Cleanup', () => {
    test('removes event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      
      const { unmount } = renderHook(() => useAccessibility());
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('focusin', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('focusout', expect.any(Function));
    });
  });
});

describe('useFocusManagement Hook', () => {
  test('returns container ref', () => {
    const { result } = renderHook(() => useFocusManagement());
    
    expect(result.current.containerRef).toBeDefined();
    expect(result.current.containerRef.current).toBeNull();
  });

  test('sets up focus trap when enabled', () => {
    const { result } = renderHook(() => useFocusManagement({ trapFocus: true }));
    
    const container = document.createElement('div');
    const button = document.createElement('button');
    button.focus = jest.fn();
    container.appendChild(button);
    
    act(() => {
      result.current.containerRef.current = container;
    });
    
    expect(button.focus).toHaveBeenCalled();
  });

  test('restores focus on unmount when enabled', () => {
    const button = document.createElement('button');
    button.focus = jest.fn();
    document.body.appendChild(button);
    button.focus();
    
    const { unmount } = renderHook(() => useFocusManagement({ restoreFocus: true }));
    
    unmount();
    
    expect(button.focus).toHaveBeenCalled();
  });
});

describe('useKeyboardShortcuts Hook', () => {
  test('registers keyboard shortcuts', () => {
    const mockCallback = jest.fn();
    const shortcuts = {
      'ctrl+s': mockCallback
    };
    
    renderHook(() => useKeyboardShortcuts(shortcuts));
    
    act(() => {
      const event = new KeyboardEvent('keydown', { 
        key: 's', 
        ctrlKey: true 
      });
      document.dispatchEvent(event);
    });
    
    expect(mockCallback).toHaveBeenCalled();
  });

  test('prevents default behavior for registered shortcuts', () => {
    const mockCallback = jest.fn();
    const shortcuts = {
      'ctrl+s': mockCallback
    };
    
    renderHook(() => useKeyboardShortcuts(shortcuts));
    
    const event = new KeyboardEvent('keydown', { 
      key: 's', 
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
    
    act(() => {
      document.dispatchEvent(event);
    });
    
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  test('handles multiple modifiers', () => {
    const mockCallback = jest.fn();
    const shortcuts = {
      'ctrl+shift+s': mockCallback
    };
    
    renderHook(() => useKeyboardShortcuts(shortcuts));
    
    act(() => {
      const event = new KeyboardEvent('keydown', { 
        key: 's', 
        ctrlKey: true,
        shiftKey: true
      });
      document.dispatchEvent(event);
    });
    
    expect(mockCallback).toHaveBeenCalled();
  });

  test('removes event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    
    const { unmount } = renderHook(() => useKeyboardShortcuts({}));
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});