/**
 * @fileoverview Focus management utilities for Secure Gate Access
 * @description Comprehensive focus management for keyboard navigation and accessibility
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

/**
 * Focus management utilities for keyboard navigation
 */
export class FocusManager {
  constructor() {
    this.focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      'area[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');
    
    this.focusableElements = [];
    this.previousFocus = null;
    this.focusHistory = [];
  }

  /**
   * Get all focusable elements within a container
   * @param {HTMLElement} container - Container element to search within
   * @returns {HTMLElement[]} Array of focusable elements
   */
  getFocusableElements(container = document) {
    const elements = Array.from(container.querySelectorAll(this.focusableSelectors));
    return elements.filter(element => this.isElementVisible(element));
  }

  /**
   * Check if an element is visible and focusable
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} True if element is visible and focusable
   */
  isElementVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      !element.hasAttribute('aria-hidden') &&
      element.offsetWidth > 0 &&
      element.offsetHeight > 0
    );
  }

  /**
   * Set focus to the first focusable element in a container
   * @param {HTMLElement} container - Container to focus within
   * @returns {boolean} True if focus was set successfully
   */
  focusFirst(container = document) {
    const elements = this.getFocusableElements(container);
    if (elements.length > 0) {
      elements[0].focus();
      return true;
    }
    return false;
  }

  /**
   * Set focus to the last focusable element in a container
   * @param {HTMLElement} container - Container to focus within
   * @returns {boolean} True if focus was set successfully
   */
  focusLast(container = document) {
    const elements = this.getFocusableElements(container);
    if (elements.length > 0) {
      elements[elements.length - 1].focus();
      return true;
    }
    return false;
  }

  /**
   * Move focus to the next focusable element
   * @param {HTMLElement} currentElement - Currently focused element
   * @param {HTMLElement} container - Container to search within
   * @returns {boolean} True if focus was moved successfully
   */
  focusNext(currentElement, container = document) {
    const elements = this.getFocusableElements(container);
    const currentIndex = elements.indexOf(currentElement);
    
    if (currentIndex === -1) {
      return this.focusFirst(container);
    }
    
    const nextIndex = (currentIndex + 1) % elements.length;
    elements[nextIndex].focus();
    return true;
  }

  /**
   * Move focus to the previous focusable element
   * @param {HTMLElement} currentElement - Currently focused element
   * @param {HTMLElement} container - Container to search within
   * @returns {boolean} True if focus was moved successfully
   */
  focusPrevious(currentElement, container = document) {
    const elements = this.getFocusableElements(container);
    const currentIndex = elements.indexOf(currentElement);
    
    if (currentIndex === -1) {
      return this.focusLast(container);
    }
    
    const previousIndex = currentIndex === 0 ? elements.length - 1 : currentIndex - 1;
    elements[previousIndex].focus();
    return true;
  }

  /**
   * Save the currently focused element
   */
  saveFocus() {
    this.previousFocus = document.activeElement;
    if (this.previousFocus) {
      this.focusHistory.push(this.previousFocus);
    }
  }

  /**
   * Restore focus to the previously focused element
   * @returns {boolean} True if focus was restored successfully
   */
  restoreFocus() {
    if (this.previousFocus && this.isElementVisible(this.previousFocus)) {
      this.previousFocus.focus();
      return true;
    }
    
    // Try to restore from history
    while (this.focusHistory.length > 0) {
      const element = this.focusHistory.pop();
      if (this.isElementVisible(element)) {
        element.focus();
        return true;
      }
    }
    
    return false;
  }

  /**
   * Clear focus history
   */
  clearHistory() {
    this.focusHistory = [];
    this.previousFocus = null;
  }
}

/**
 * Global focus manager instance
 */
export const focusManager = new FocusManager();

/**
 * Focus trap implementation for modals and dialogs
 * @param {HTMLElement} container - Container to trap focus within
 * @param {HTMLElement} firstFocus - First element to focus (optional)
 * @param {HTMLElement} lastFocus - Last element to focus (optional)
 * @returns {Function} Cleanup function to remove focus trap
 */
export function createFocusTrap(container, firstFocus = null, lastFocus = null) {
  if (!container) return () => {};

  const elements = focusManager.getFocusableElements(container);
  const firstElement = firstFocus || elements[0];
  const lastElement = lastFocus || elements[elements.length - 1];

  // Focus the first element
  if (firstElement) {
    firstElement.focus();
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Tab') {
      if (event.shiftKey) {
        // Shift + Tab: move to previous element
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: move to next element
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Roving tabindex implementation for component groups
 * @param {HTMLElement} container - Container with focusable children
 * @param {string} childSelector - Selector for focusable children
 * @returns {Function} Cleanup function to remove roving tabindex
 */
export function createRovingTabindex(container, childSelector = '[tabindex]') {
  if (!container) return () => {};

  const children = Array.from(container.querySelectorAll(childSelector));
  
  // Set initial tabindex values
  children.forEach((child, index) => {
    child.setAttribute('tabindex', index === 0 ? '0' : '-1');
  });

  const handleKeyDown = (event) => {
    const currentIndex = children.indexOf(document.activeElement);
    
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        nextIndex = (currentIndex + 1) % children.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        nextIndex = currentIndex === 0 ? children.length - 1 : currentIndex - 1;
        break;
      case 'Home':
        event.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        nextIndex = children.length - 1;
        break;
      default:
        return;
    }

    // Update tabindex values
    children.forEach((child, index) => {
      child.setAttribute('tabindex', index === nextIndex ? '0' : '-1');
    });

    // Focus the new element
    children[nextIndex].focus();
  };

  container.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
    // Reset tabindex values
    children.forEach(child => {
      child.setAttribute('tabindex', '0');
    });
  };
}

/**
 * Keyboard shortcut manager
 */
export class KeyboardShortcutManager {
  constructor() {
    this.shortcuts = new Map();
    this.isEnabled = true;
  }

  /**
   * Register a keyboard shortcut
   * @param {string} key - Key combination (e.g., 'ctrl+k', 'escape', 'f1')
   * @param {Function} handler - Function to call when shortcut is pressed
   * @param {Object} options - Additional options
   */
  register(key, handler, options = {}) {
    const shortcut = {
      key: key.toLowerCase(),
      handler,
      preventDefault: options.preventDefault !== false,
      stopPropagation: options.stopPropagation || false,
      description: options.description || '',
      element: options.element || document
    };

    this.shortcuts.set(shortcut.key, shortcut);
  }

  /**
   * Unregister a keyboard shortcut
   * @param {string} key - Key combination to unregister
   */
  unregister(key) {
    this.shortcuts.delete(key.toLowerCase());
  }

  /**
   * Handle keydown events
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyDown(event) {
    if (!this.isEnabled) return;

    const key = this.getKeyString(event);
    const shortcut = this.shortcuts.get(key);

    if (shortcut) {
      if (shortcut.preventDefault) {
        event.preventDefault();
      }
      if (shortcut.stopPropagation) {
        event.stopPropagation();
      }
      shortcut.handler(event);
    }
  }

  /**
   * Get key string from keyboard event
   * @param {KeyboardEvent} event - Keyboard event
   * @returns {string} Key combination string
   */
  getKeyString(event) {
    if (!event || !event.key) return '';

    const parts = [];
    
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    if (event.metaKey) parts.push('meta');
    
    parts.push(event.key.toLowerCase());
    
    return parts.join('+');
  }

  /**
   * Enable/disable keyboard shortcuts
   * @param {boolean} enabled - Whether shortcuts are enabled
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  /**
   * Get all registered shortcuts
   * @returns {Array} Array of shortcut objects
   */
  getAllShortcuts() {
    return Array.from(this.shortcuts.values());
  }
}

/**
 * Global keyboard shortcut manager
 */
export const keyboardShortcuts = new KeyboardShortcutManager();

/**
 * Initialize keyboard navigation for the application
 */
export function initializeKeyboardNavigation() {
  // Register global shortcuts
  keyboardShortcuts.register('escape', () => {
    // Close any open modals or dropdowns
    const modals = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
    modals.forEach(modal => {
      const closeButton = modal.querySelector('[aria-label*="close"], [aria-label*="Close"]');
      if (closeButton) {
        closeButton.click();
      }
    });
  }, { description: 'Close modals and dialogs' });

  keyboardShortcuts.register('ctrl+k', () => {
    // Open search or command palette
    const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]');
    if (searchInput) {
      searchInput.focus();
    }
  }, { description: 'Focus search input' });

  keyboardShortcuts.register('f1', () => {
    // Show keyboard shortcuts help
    const helpButton = document.querySelector('[aria-label*="help"], [aria-label*="Help"]');
    if (helpButton) {
      helpButton.click();
    }
  }, { description: 'Show help' });

  // Add event listener for keyboard shortcuts
  document.addEventListener('keydown', (event) => {
    keyboardShortcuts.handleKeyDown(event);
  });
}

/**
 * Focus visible utility - ensures focus indicators are visible
 */
export function ensureFocusVisible() {
  // Add focus-visible class to focused elements
  document.addEventListener('keydown', () => {
    document.body.classList.add('keyboard-navigation');
  });

  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-navigation');
  });

  // Add CSS for focus-visible
  const style = document.createElement('style');
  style.textContent = `
    .keyboard-navigation *:focus {
      outline: 2px solid #3b82f6 !important;
      outline-offset: 2px !important;
    }
    
    .keyboard-navigation *:focus:not(:focus-visible) {
      outline: none !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Initialize all keyboard navigation features
 */
export function initializeAllKeyboardFeatures() {
  initializeKeyboardNavigation();
  ensureFocusVisible();
}




