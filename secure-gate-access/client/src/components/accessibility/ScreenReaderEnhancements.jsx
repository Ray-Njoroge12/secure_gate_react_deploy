/**
 * Screen Reader Enhancements Component
 * 
 * Provides comprehensive screen reader support with ARIA labels, roles, and live regions
 * Implements WCAG 2.1 AA screen reader accessibility requirements
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useAccessibilityContext } from './AccessibilityProvider.jsx';

/**
 * ARIA role mappings for common UI patterns
 */
const ARIA_ROLE_MAPPINGS = {
  // Navigation patterns
  'navigation': 'navigation',
  'menu': 'menu',
  'menubar': 'menubar',
  'menuitem': 'menuitem',
  'breadcrumb': 'navigation',
  
  // Content patterns
  'main': 'main',
  'article': 'article',
  'section': 'region',
  'aside': 'complementary',
  'header': 'banner',
  'footer': 'contentinfo',
  
  // Interactive patterns
  'button': 'button',
  'link': 'link',
  'tab': 'tab',
  'tabpanel': 'tabpanel',
  'dialog': 'dialog',
  'alertdialog': 'alertdialog',
  
  // Form patterns
  'form': 'form',
  'search': 'search',
  'textbox': 'textbox',
  'combobox': 'combobox',
  'listbox': 'listbox',
  'option': 'option',
  
  // Status patterns
  'alert': 'alert',
  'status': 'status',
  'log': 'log',
  'marquee': 'marquee',
  'timer': 'timer'
};

/**
 * Live region priorities
 */
const LIVE_REGION_PRIORITIES = {
  OFF: 'off',
  POLITE: 'polite',
  ASSERTIVE: 'assertive'
};

/**
 * Screen Reader Enhancements Component
 */
export const ScreenReaderEnhancements = ({ 
  children,
  enableAutoLabeling = true,
  enableLiveRegions = true,
  enableRoleEnhancement = true,
  enableDescriptions = true,
  className = ''
}) => {
  const containerRef = useRef(null);
  const [liveRegions, setLiveRegions] = useState(new Map());
  const [announcements, setAnnouncements] = useState([]);
  const announcementQueue = useRef([]);
  const processingQueue = useRef(false);
  
  const { announce, settings, screenReaderManager } = useAccessibilityContext();

  /**
   * Auto-label elements that lack proper accessibility labels
   */
  const autoLabelElements = useCallback(() => {
    if (!enableAutoLabeling || !containerRef.current) return;

    const unlabeledElements = containerRef.current.querySelectorAll(
      'button:not([aria-label]):not([aria-labelledby]), ' +
      'input:not([aria-label]):not([aria-labelledby]):not([id]), ' +
      'select:not([aria-label]):not([aria-labelledby]):not([id]), ' +
      'textarea:not([aria-label]):not([aria-labelledby]):not([id]), ' +
      '[role="button"]:not([aria-label]):not([aria-labelledby]), ' +
      '[role="link"]:not([aria-label]):not([aria-labelledby]), ' +
      '[role="menuitem"]:not([aria-label]):not([aria-labelledby]), ' +
      '[role="tab"]:not([aria-label]):not([aria-labelledby])'
    );

    unlabeledElements.forEach(element => {
      const label = generateAccessibleLabel(element);
      if (label) {
        element.setAttribute('aria-label', label);
        
        // Add description if available
        if (enableDescriptions) {
          const description = generateAccessibleDescription(element);
          if (description) {
            const descId = `desc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const descElement = document.createElement('div');
            descElement.id = descId;
            descElement.className = 'sr-only';
            descElement.textContent = description;
            element.parentNode.insertBefore(descElement, element.nextSibling);
            element.setAttribute('aria-describedby', descId);
          }
        }
      }
    });
  }, [enableAutoLabeling, enableDescriptions]);

  /**
   * Generate accessible label for element
   */
  const generateAccessibleLabel = useCallback((element) => {
    // Try to get label from various sources
    const textContent = element.textContent?.trim();
    const title = element.getAttribute('title');
    const placeholder = element.getAttribute('placeholder');
    const value = element.value;
    const alt = element.getAttribute('alt');
    
    // For buttons, use text content or title
    if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
      return textContent || title || 'Button';
    }
    
    // For links, use text content or href
    if (element.tagName === 'A' || element.getAttribute('role') === 'link') {
      const href = element.getAttribute('href');
      return textContent || title || (href ? `Link to ${href}` : 'Link');
    }
    
    // For form inputs, use placeholder or type
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
      const type = element.getAttribute('type') || 'text';
      const name = element.getAttribute('name');
      return placeholder || title || name || `${type} input`;
    }
    
    // For images, use alt text or filename
    if (element.tagName === 'IMG') {
      return alt || title || 'Image';
    }
    
    // For other elements, use text content or role
    const role = element.getAttribute('role');
    return textContent || title || (role ? `${role} element` : 'Interactive element');
  }, []);

  /**
   * Generate accessible description for element
   */
  const generateAccessibleDescription = useCallback((element) => {
    const className = element.className;
    const dataAttributes = Array.from(element.attributes)
      .filter(attr => attr.name.startsWith('data-'))
      .map(attr => attr.value)
      .join(' ');
    
    // For form inputs, provide additional context
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
      const required = element.hasAttribute('required');
      const pattern = element.getAttribute('pattern');
      const minLength = element.getAttribute('minlength');
      const maxLength = element.getAttribute('maxlength');
      
      const descriptions = [];
      if (required) descriptions.push('Required field');
      if (pattern) descriptions.push('Must match specific format');
      if (minLength) descriptions.push(`Minimum ${minLength} characters`);
      if (maxLength) descriptions.push(`Maximum ${maxLength} characters`);
      
      return descriptions.join('. ');
    }
    
    // For buttons, provide action context
    if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
      const form = element.closest('form');
      const type = element.getAttribute('type');
      
      if (type === 'submit' && form) {
        return 'Submits the current form';
      } else if (type === 'reset' && form) {
        return 'Resets the current form';
      } else if (className.includes('close')) {
        return 'Closes the current dialog or modal';
      } else if (className.includes('delete') || className.includes('remove')) {
        return 'Deletes or removes the selected item';
      }
    }
    
    return null;
  }, []);

  /**
   * Enhance elements with appropriate ARIA roles
   */
  const enhanceElementRoles = useCallback(() => {
    if (!enableRoleEnhancement || !containerRef.current) return;

    // Enhance navigation elements
    const navElements = containerRef.current.querySelectorAll('nav:not([role])');
    navElements.forEach(el => el.setAttribute('role', 'navigation'));

    // Enhance main content
    const mainElements = containerRef.current.querySelectorAll('main:not([role])');
    mainElements.forEach(el => el.setAttribute('role', 'main'));

    // Enhance interactive elements without proper roles
    const interactiveElements = containerRef.current.querySelectorAll(
      '[onclick]:not([role]):not(button):not(a):not(input):not(select):not(textarea)'
    );
    interactiveElements.forEach(el => {
      if (!el.getAttribute('role')) {
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
      }
    });

    // Enhance list elements
    const listElements = containerRef.current.querySelectorAll('ul:not([role]), ol:not([role])');
    listElements.forEach(el => {
      if (!el.closest('[role="menu"]') && !el.closest('[role="menubar"]')) {
        el.setAttribute('role', 'list');
        const items = el.querySelectorAll('li:not([role])');
        items.forEach(item => item.setAttribute('role', 'listitem'));
      }
    });

    // Enhance heading hierarchy
    const headings = containerRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => {
      if (!heading.getAttribute('role')) {
        heading.setAttribute('role', 'heading');
        const level = parseInt(heading.tagName.charAt(1));
        heading.setAttribute('aria-level', level.toString());
      }
    });
  }, [enableRoleEnhancement]);

  /**
   * Create or update live region
   */
  const createLiveRegion = useCallback((id, priority = LIVE_REGION_PRIORITIES.POLITE, atomic = true) => {
    if (!enableLiveRegions) return null;

    let region = document.getElementById(id);
    
    if (!region) {
      region = document.createElement('div');
      region.id = id;
      region.className = 'sr-only live-region';
      region.setAttribute('aria-live', priority);
      region.setAttribute('aria-atomic', atomic.toString());
      region.setAttribute('aria-relevant', 'additions text');
      document.body.appendChild(region);
    }

    setLiveRegions(prev => new Map(prev.set(id, region)));
    return region;
  }, [enableLiveRegions]);

  /**
   * Announce message to screen readers
   */
  const announceToScreenReader = useCallback((message, priority = LIVE_REGION_PRIORITIES.POLITE, delay = 100) => {
    if (!enableLiveRegions || !message) return;

    const announcement = {
      id: Date.now(),
      message,
      priority,
      timestamp: new Date()
    };

    // Add to queue
    announcementQueue.current.push(announcement);
    
    // Process queue if not already processing
    if (!processingQueue.current) {
      processAnnouncementQueue();
    }

    // Update state for tracking
    setAnnouncements(prev => [...prev.slice(-9), announcement]);
  }, [enableLiveRegions]);

  /**
   * Process announcement queue
   */
  const processAnnouncementQueue = useCallback(() => {
    if (processingQueue.current || announcementQueue.current.length === 0) return;

    processingQueue.current = true;
    
    const processNext = () => {
      if (announcementQueue.current.length === 0) {
        processingQueue.current = false;
        return;
      }

      const announcement = announcementQueue.current.shift();
      const regionId = `live-region-${announcement.priority}`;
      const region = createLiveRegion(regionId, announcement.priority);
      
      if (region) {
        // Clear previous content
        region.textContent = '';
        
        // Set new content after a brief delay to ensure screen readers pick it up
        setTimeout(() => {
          region.textContent = announcement.message;
          
          // Process next announcement after delay
          setTimeout(processNext, 500);
        }, 100);
      } else {
        // If region creation failed, continue with next
        setTimeout(processNext, 100);
      }
    };

    processNext();
  }, [createLiveRegion]);

  /**
   * Enhance form accessibility
   */
  const enhanceFormAccessibility = useCallback(() => {
    if (!containerRef.current) return;

    const forms = containerRef.current.querySelectorAll('form');
    forms.forEach(form => {
      // Add form role if missing
      if (!form.getAttribute('role')) {
        form.setAttribute('role', 'form');
      }

      // Enhance form inputs
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        const id = input.id || `input-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        if (!input.id) input.id = id;

        // Find associated label
        let label = form.querySelector(`label[for="${id}"]`);
        if (!label) {
          // Look for parent label
          label = input.closest('label');
        }

        if (label && !input.getAttribute('aria-labelledby')) {
          const labelId = label.id || `label-${id}`;
          if (!label.id) label.id = labelId;
          input.setAttribute('aria-labelledby', labelId);
        }

        // Add required indicator
        if (input.hasAttribute('required') && !input.getAttribute('aria-required')) {
          input.setAttribute('aria-required', 'true');
        }

        // Add invalid state for validation
        if (input.validity && !input.validity.valid && !input.getAttribute('aria-invalid')) {
          input.setAttribute('aria-invalid', 'true');
        }
      });

      // Enhance fieldsets
      const fieldsets = form.querySelectorAll('fieldset');
      fieldsets.forEach(fieldset => {
        const legend = fieldset.querySelector('legend');
        if (legend && !fieldset.getAttribute('aria-labelledby')) {
          const legendId = legend.id || `legend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          if (!legend.id) legend.id = legendId;
          fieldset.setAttribute('aria-labelledby', legendId);
        }
      });
    });
  }, []);

  /**
   * Enhance table accessibility
   */
  const enhanceTableAccessibility = useCallback(() => {
    if (!containerRef.current) return;

    const tables = containerRef.current.querySelectorAll('table');
    tables.forEach(table => {
      // Add table role if missing
      if (!table.getAttribute('role')) {
        table.setAttribute('role', 'table');
      }

      // Enhance table headers
      const headers = table.querySelectorAll('th');
      headers.forEach((header, index) => {
        if (!header.getAttribute('role')) {
          header.setAttribute('role', 'columnheader');
        }
        if (!header.id) {
          header.id = `header-${Date.now()}-${index}`;
        }
      });

      // Enhance table cells
      const cells = table.querySelectorAll('td');
      cells.forEach(cell => {
        if (!cell.getAttribute('role')) {
          cell.setAttribute('role', 'cell');
        }

        // Associate with headers if not already done
        if (!cell.getAttribute('headers')) {
          const row = cell.closest('tr');
          const cellIndex = Array.from(row.children).indexOf(cell);
          const headerRow = table.querySelector('thead tr, tr:first-child');
          if (headerRow) {
            const header = headerRow.children[cellIndex];
            if (header && header.id) {
              cell.setAttribute('headers', header.id);
            }
          }
        }
      });

      // Add caption if missing but title exists
      const caption = table.querySelector('caption');
      const title = table.getAttribute('title') || table.getAttribute('aria-label');
      if (!caption && title) {
        const captionElement = document.createElement('caption');
        captionElement.textContent = title;
        captionElement.className = 'sr-only';
        table.insertBefore(captionElement, table.firstChild);
      }
    });
  }, []);

  /**
   * Monitor dynamic content changes
   */
  const monitorDynamicContent = useCallback(() => {
    if (!containerRef.current) return;

    const observer = new MutationObserver((mutations) => {
      let hasContentChanges = false;
      let hasStructuralChanges = false;

      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          hasStructuralChanges = true;
        } else if (mutation.type === 'characterData') {
          hasContentChanges = true;
        }
      });

      if (hasStructuralChanges) {
        // Re-enhance accessibility when structure changes
        setTimeout(() => {
          autoLabelElements();
          enhanceElementRoles();
          enhanceFormAccessibility();
          enhanceTableAccessibility();
        }, 100);
      }

      if (hasContentChanges) {
        // Announce content changes if in a live region
        const liveRegion = mutations[0].target.closest('[aria-live]');
        if (liveRegion && liveRegion.getAttribute('aria-live') !== 'off') {
          const newContent = mutations[0].target.textContent;
          if (newContent && newContent.trim()) {
            announceToScreenReader(newContent, liveRegion.getAttribute('aria-live'));
          }
        }
      }
    });

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-label', 'aria-labelledby', 'aria-describedby', 'role']
    });

    return () => observer.disconnect();
  }, [autoLabelElements, enhanceElementRoles, enhanceFormAccessibility, enhanceTableAccessibility, announceToScreenReader]);

  /**
   * Initialize screen reader enhancements
   */
  useEffect(() => {
    if (!settings.screenReaderSupport) return;

    const initializeEnhancements = () => {
      autoLabelElements();
      enhanceElementRoles();
      enhanceFormAccessibility();
      enhanceTableAccessibility();
      
      // Create default live regions
      createLiveRegion('live-region-polite', LIVE_REGION_PRIORITIES.POLITE);
      createLiveRegion('live-region-assertive', LIVE_REGION_PRIORITIES.ASSERTIVE);
    };

    // Initial enhancement
    initializeEnhancements();

    // Set up monitoring
    const cleanup = monitorDynamicContent();

    return cleanup;
  }, [
    settings.screenReaderSupport,
    autoLabelElements,
    enhanceElementRoles,
    enhanceFormAccessibility,
    enhanceTableAccessibility,
    createLiveRegion,
    monitorDynamicContent
  ]);

  /**
   * Expose methods for external use
   */
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.screenReaderEnhancements = {
        announce: announceToScreenReader,
        createLiveRegion,
        autoLabel: autoLabelElements,
        enhanceRoles: enhanceElementRoles,
        enhanceForms: enhanceFormAccessibility,
        enhanceTables: enhanceTableAccessibility
      };
    }
  }, [
    announceToScreenReader,
    createLiveRegion,
    autoLabelElements,
    enhanceElementRoles,
    enhanceFormAccessibility,
    enhanceTableAccessibility
  ]);

  return (
    <div
      ref={containerRef}
      className={`screen-reader-enhanced ${className}`}
      role="group"
      aria-label="Screen reader enhanced content"
    >
      {children}
      
      {/* Status region for announcements */}
      {enableLiveRegions && (
        <>
          <div
            id="sr-status-region"
            className="sr-only"
            aria-live="polite"
            aria-atomic="true"
            aria-relevant="additions text"
          />
          <div
            id="sr-alert-region"
            className="sr-only"
            aria-live="assertive"
            aria-atomic="true"
            aria-relevant="additions text"
          />
        </>
      )}
    </div>
  );
};

/**
 * Screen Reader Announcement Hook
 */
export const useScreenReaderAnnouncement = () => {
  const { announce } = useAccessibilityContext();
  
  const announcePolite = useCallback((message) => {
    announce(message, 'polite');
  }, [announce]);
  
  const announceAssertive = useCallback((message) => {
    announce(message, 'assertive');
  }, [announce]);
  
  const announceStatus = useCallback((message) => {
    const statusRegion = document.getElementById('sr-status-region');
    if (statusRegion) {
      statusRegion.textContent = message;
    }
  }, []);
  
  const announceAlert = useCallback((message) => {
    const alertRegion = document.getElementById('sr-alert-region');
    if (alertRegion) {
      alertRegion.textContent = message;
    }
  }, []);
  
  return {
    announcePolite,
    announceAssertive,
    announceStatus,
    announceAlert
  };
};

export default ScreenReaderEnhancements;