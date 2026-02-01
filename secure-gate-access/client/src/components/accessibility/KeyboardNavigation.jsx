/**
 * Keyboard Navigation Component
 * 
 * Provides comprehensive keyboard navigation support with logical tab order
 * Implements WCAG 2.1 AA keyboard accessibility requirements
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useAccessibilityContext } from './AccessibilityProvider.jsx';

/**
 * Keyboard shortcuts configuration
 */
const DEFAULT_SHORTCUTS = {
  // Global navigation
  'alt+h': { action: 'skipToMain', description: 'Skip to main content' },
  'alt+n': { action: 'skipToNavigation', description: 'Skip to navigation' },
  'alt+s': { action: 'skipToSearch', description: 'Skip to search' },
  'alt+f': { action: 'skipToFooter', description: 'Skip to footer' },
  
  // Application shortcuts
  'alt+1': { action: 'goToHome', description: 'Go to home page' },
  'alt+2': { action: 'goToDashboard', description: 'Go to dashboard' },
  'alt+3': { action: 'goToVisitors', description: 'Go to visitors' },
  'alt+4': { action: 'goToSettings', description: 'Go to settings' },
  
  // Modal and dialog shortcuts
  'escape': { action: 'closeModal', description: 'Close modal or dialog' },
  'ctrl+enter': { action: 'submitForm', description: 'Submit current form' },
  
  // Accessibility shortcuts
  'alt+shift+a': { action: 'toggleAccessibilityMenu', description: 'Toggle accessibility menu' },
  'alt+shift+c': { action: 'toggleHighContrast', description: 'Toggle high contrast mode' },
  'alt+shift+m': { action: 'toggleReducedMotion', description: 'Toggle reduced motion' },
  
  // Help and information
  'f1': { action: 'showHelp', description: 'Show help information' },
  'alt+shift+h': { action: 'showKeyboardShortcuts', description: 'Show keyboard shortcuts' }
};

/**
 * Focusable element selectors
 */
const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
  '[role="button"]:not([disabled])',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[contenteditable="true"]',
  'details > summary',
  'audio[controls]',
  'video[controls]'
].join(', ');

/**
 * Keyboard Navigation Manager Component
 */
export const KeyboardNavigation = ({ 
  children, 
  shortcuts = {},
  enableRoving = false,
  enableSpatial = false,
  onShortcut = null,
  className = ''
}) => {
  const containerRef = useRef(null);
  const [currentFocusIndex, setCurrentFocusIndex] = useState(-1);
  const [focusableElements, setFocusableElements] = useState([]);
  const [isActive, setIsActive] = useState(false);
  
  const { announce, settings } = useAccessibilityContext();
  
  // Combine default shortcuts with custom shortcuts
  const allShortcuts = { ...DEFAULT_SHORTCUTS, ...shortcuts };

  /**
   * Get all focusable elements in the container
   */
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    
    const elements = Array.from(
      containerRef.current.querySelectorAll(FOCUSABLE_SELECTORS)
    ).filter(element => {
      // Check if element is visible and not disabled
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        rect.width > 0 &&
        rect.height > 0 &&
        !element.disabled &&
        element.getAttribute('aria-disabled') !== 'true'
      );
    });
    
    return elements;
  }, []);

  /**
   * Update focusable elements list
   */
  const updateFocusableElements = useCallback(() => {
    const elements = getFocusableElements();
    setFocusableElements(elements);
    
    // Update current focus index
    const activeElement = document.activeElement;
    const index = elements.indexOf(activeElement);
    setCurrentFocusIndex(index);
  }, [getFocusableElements]);

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback((event) => {
    if (!settings.keyboardNavigation) return;

    const key = event.key.toLowerCase();
    const modifiers = [];
    
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.altKey) modifiers.push('alt');
    if (event.shiftKey) modifiers.push('shift');
    if (event.metaKey) modifiers.push('meta');
    
    const shortcutKey = [...modifiers, key].join('+');
    const shortcut = allShortcuts[shortcutKey];
    
    if (shortcut) {
      event.preventDefault();
      handleShortcutAction(shortcut.action, event);
      
      // Announce shortcut activation
      announce(`Activated ${shortcut.description}`, 'polite');
      
      // Call custom shortcut handler
      if (onShortcut) {
        onShortcut(shortcut.action, event);
      }
      
      return;
    }

    // Handle roving tabindex navigation
    if (enableRoving && containerRef.current?.contains(event.target)) {
      handleRovingNavigation(event);
    }
    
    // Handle spatial navigation
    if (enableSpatial && containerRef.current?.contains(event.target)) {
      handleSpatialNavigation(event);
    }
  }, [settings.keyboardNavigation, allShortcuts, onShortcut, announce, enableRoving, enableSpatial]);

  /**
   * Handle shortcut actions
   */
  const handleShortcutAction = useCallback((action, event) => {
    switch (action) {
      case 'skipToMain':
        skipToElement('main, [role="main"], #main-content');
        break;
      case 'skipToNavigation':
        skipToElement('nav, [role="navigation"], #navigation');
        break;
      case 'skipToSearch':
        skipToElement('[role="search"], #search, input[type="search"]');
        break;
      case 'skipToFooter':
        skipToElement('footer, [role="contentinfo"], #footer');
        break;
      case 'goToHome':
        navigateToPage('/');
        break;
      case 'goToDashboard':
        navigateToPage('/dashboard');
        break;
      case 'goToVisitors':
        navigateToPage('/visitors');
        break;
      case 'goToSettings':
        navigateToPage('/settings');
        break;
      case 'closeModal':
        closeCurrentModal();
        break;
      case 'submitForm':
        submitCurrentForm();
        break;
      case 'toggleAccessibilityMenu':
        toggleAccessibilityMenu();
        break;
      case 'toggleHighContrast':
        toggleHighContrast();
        break;
      case 'toggleReducedMotion':
        toggleReducedMotion();
        break;
      case 'showHelp':
        showHelp();
        break;
      case 'showKeyboardShortcuts':
        showKeyboardShortcuts();
        break;
      default:
        console.warn(`Unknown keyboard shortcut action: ${action}`);
    }
  }, []);

  /**
   * Skip to specific element
   */
  const skipToElement = useCallback((selector) => {
    const element = document.querySelector(selector);
    if (element) {
      // Make element focusable if it isn't already
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '-1');
      }
      
      element.focus();
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      announce(`Skipped to ${element.getAttribute('aria-label') || element.textContent || selector}`);
    }
  }, [announce]);

  /**
   * Navigate to page
   */
  const navigateToPage = useCallback((path) => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, []);

  /**
   * Close current modal
   */
  const closeCurrentModal = useCallback(() => {
    const modal = document.querySelector('[role="dialog"], .modal');
    if (modal) {
      const closeButton = modal.querySelector('[aria-label*="close"], .close-button, .modal-close');
      if (closeButton) {
        closeButton.click();
      } else {
        // Dispatch escape key event to modal
        modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      }
    }
  }, []);

  /**
   * Submit current form
   */
  const submitCurrentForm = useCallback(() => {
    const activeElement = document.activeElement;
    const form = activeElement?.closest('form');
    if (form) {
      const submitButton = form.querySelector('[type="submit"], button:not([type])');
      if (submitButton) {
        submitButton.click();
      } else {
        form.submit();
      }
    }
  }, []);

  /**
   * Toggle accessibility menu
   */
  const toggleAccessibilityMenu = useCallback(() => {
    const menu = document.querySelector('.accessibility-menu, [aria-label*="accessibility"]');
    if (menu) {
      menu.click();
    }
  }, []);

  /**
   * Toggle high contrast mode
   */
  const toggleHighContrast = useCallback(() => {
    document.documentElement.classList.toggle('high-contrast');
    const isEnabled = document.documentElement.classList.contains('high-contrast');
    announce(`High contrast mode ${isEnabled ? 'enabled' : 'disabled'}`);
  }, [announce]);

  /**
   * Toggle reduced motion
   */
  const toggleReducedMotion = useCallback(() => {
    document.documentElement.classList.toggle('reduced-motion');
    const isEnabled = document.documentElement.classList.contains('reduced-motion');
    announce(`Reduced motion ${isEnabled ? 'enabled' : 'disabled'}`);
  }, [announce]);

  /**
   * Show help
   */
  const showHelp = useCallback(() => {
    const helpButton = document.querySelector('[aria-label*="help"], .help-button');
    if (helpButton) {
      helpButton.click();
    }
  }, []);

  /**
   * Show keyboard shortcuts
   */
  const showKeyboardShortcuts = useCallback(() => {
    const shortcuts = Object.entries(allShortcuts)
      .map(([key, { description }]) => `${key}: ${description}`)
      .join('\n');
    
    announce(`Keyboard shortcuts: ${shortcuts}`, 'polite');
  }, [allShortcuts, announce]);

  /**
   * Handle roving tabindex navigation
   */
  const handleRovingNavigation = useCallback((event) => {
    const { key } = event;
    
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
      return;
    }
    
    event.preventDefault();
    
    const elements = getFocusableElements();
    if (elements.length === 0) return;
    
    let newIndex = currentFocusIndex;
    
    switch (key) {
      case 'ArrowDown':
      case 'ArrowRight':
        newIndex = (currentFocusIndex + 1) % elements.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        newIndex = currentFocusIndex <= 0 ? elements.length - 1 : currentFocusIndex - 1;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = elements.length - 1;
        break;
    }
    
    if (newIndex !== currentFocusIndex && elements[newIndex]) {
      elements[newIndex].focus();
      setCurrentFocusIndex(newIndex);
    }
  }, [currentFocusIndex, getFocusableElements]);

  /**
   * Handle spatial navigation
   */
  const handleSpatialNavigation = useCallback((event) => {
    const { key } = event;
    
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      return;
    }
    
    const currentElement = document.activeElement;
    if (!currentElement) return;
    
    const elements = getFocusableElements();
    const currentRect = currentElement.getBoundingClientRect();
    
    let bestElement = null;
    let bestDistance = Infinity;
    
    elements.forEach(element => {
      if (element === currentElement) return;
      
      const rect = element.getBoundingClientRect();
      const distance = calculateSpatialDistance(currentRect, rect, key);
      
      if (distance < bestDistance && isInDirection(currentRect, rect, key)) {
        bestDistance = distance;
        bestElement = element;
      }
    });
    
    if (bestElement) {
      event.preventDefault();
      bestElement.focus();
    }
  }, [getFocusableElements]);

  /**
   * Calculate spatial distance between elements
   */
  const calculateSpatialDistance = useCallback((rect1, rect2, direction) => {
    const dx = rect2.left + rect2.width / 2 - (rect1.left + rect1.width / 2);
    const dy = rect2.top + rect2.height / 2 - (rect1.top + rect1.height / 2);
    
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  /**
   * Check if element is in the specified direction
   */
  const isInDirection = useCallback((fromRect, toRect, direction) => {
    const threshold = 10; // pixels
    
    switch (direction) {
      case 'ArrowUp':
        return toRect.bottom <= fromRect.top + threshold;
      case 'ArrowDown':
        return toRect.top >= fromRect.bottom - threshold;
      case 'ArrowLeft':
        return toRect.right <= fromRect.left + threshold;
      case 'ArrowRight':
        return toRect.left >= fromRect.right - threshold;
      default:
        return false;
    }
  }, []);

  /**
   * Handle focus events
   */
  const handleFocus = useCallback((event) => {
    if (containerRef.current?.contains(event.target)) {
      setIsActive(true);
      updateFocusableElements();
    }
  }, [updateFocusableElements]);

  /**
   * Handle blur events
   */
  const handleBlur = useCallback((event) => {
    if (!containerRef.current?.contains(event.relatedTarget)) {
      setIsActive(false);
    }
  }, []);

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Update focusable elements on DOM changes
    const observer = new MutationObserver(updateFocusableElements);
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'tabindex', 'aria-disabled']
    });

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    container.addEventListener('focusin', handleFocus);
    container.addEventListener('focusout', handleBlur);

    // Initial update
    updateFocusableElements();

    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('focusin', handleFocus);
      container.removeEventListener('focusout', handleBlur);
    };
  }, [handleKeyDown, handleFocus, handleBlur, updateFocusableElements]);

  return (
    <div
      ref={containerRef}
      className={`keyboard-navigation ${isActive ? 'keyboard-navigation--active' : ''} ${className}`}
      role="group"
      aria-label="Keyboard navigable content"
    >
      {children}
    </div>
  );
};

/**
 * Keyboard Shortcuts Help Component
 */
export const KeyboardShortcutsHelp = ({ shortcuts = DEFAULT_SHORTCUTS, onClose }) => {
  const { announce } = useAccessibilityContext();

  useEffect(() => {
    announce('Keyboard shortcuts help opened', 'polite');
  }, [announce]);

  const shortcutGroups = {
    'Navigation': ['alt+h', 'alt+n', 'alt+s', 'alt+f'],
    'Application': ['alt+1', 'alt+2', 'alt+3', 'alt+4'],
    'Accessibility': ['alt+shift+a', 'alt+shift+c', 'alt+shift+m'],
    'General': ['escape', 'ctrl+enter', 'f1', 'alt+shift+h']
  };

  return (
    <div className="keyboard-shortcuts-help" role="dialog" aria-labelledby="shortcuts-title">
      <div className="keyboard-shortcuts-help__header">
        <h2 id="shortcuts-title">Keyboard Shortcuts</h2>
        {onClose && (
          <button
            className="keyboard-shortcuts-help__close"
            onClick={onClose}
            aria-label="Close keyboard shortcuts help"
          >
            ✕
          </button>
        )}
      </div>
      
      <div className="keyboard-shortcuts-help__content">
        {Object.entries(shortcutGroups).map(([groupName, keys]) => (
          <div key={groupName} className="keyboard-shortcuts-help__group">
            <h3>{groupName}</h3>
            <dl className="keyboard-shortcuts-help__list">
              {keys.map(key => {
                const shortcut = shortcuts[key];
                if (!shortcut) return null;
                
                return (
                  <div key={key} className="keyboard-shortcuts-help__item">
                    <dt className="keyboard-shortcuts-help__key">
                      <kbd>{key}</kbd>
                    </dt>
                    <dd className="keyboard-shortcuts-help__description">
                      {shortcut.description}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ))}
      </div>
      
      <div className="keyboard-shortcuts-help__footer">
        <p>Press <kbd>Escape</kbd> to close this help dialog.</p>
      </div>
    </div>
  );
};

export default KeyboardNavigation;