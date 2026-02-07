/**
 * Skip Links Component
 * 
 * Provides keyboard navigation shortcuts for screen readers and keyboard users
 * Implements WCAG 2.1 AA bypass blocks requirement
 */

import React from 'react';
import './SkipLinks.css';

const SKIP_LINKS = [
  {
    href: '#main-content',
    label: 'Skip to main content',
    key: 'Alt+M'
  },
  {
    href: '#navigation',
    label: 'Skip to navigation',
    key: 'Alt+N'
  }
];

/**
 * Skip Links Component
 */
export const SkipLinks = ({ 
  links = SKIP_LINKS,
  className = '',
  showKeyboardShortcuts = true 
}) => {
  const handleSkipClick = (href, event) => {
    event.preventDefault();
    
    const target = document.querySelector(href);
    if (target) {
      // Make target focusable if it isn't already
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
      
      // Focus and scroll to target
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Announce to screen readers
      const announcement = `Skipped to ${target.getAttribute('aria-label') || target.textContent || href.slice(1)}`;
      announceToScreenReader(announcement);
    }
  };

  return (
    <nav 
      className={`skip-links ${className}`}
      aria-label="Skip navigation links"
      role="navigation"
    >
      <ul className="skip-links__list">
        {links.map((link, index) => (
          <li key={index} className="skip-links__item">
            <a
              href={link.href}
              className="skip-links__link"
              onClick={(e) => handleSkipClick(link.href, e)}
              title={showKeyboardShortcuts && link.key ? `Keyboard shortcut: ${link.key}` : undefined}
            >
              {link.label}
              {showKeyboardShortcuts && link.key && (
                <span className="skip-links__shortcut" aria-hidden="true">
                  ({link.key})
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

/**
 * Announce message to screen readers
 */
function announceToScreenReader(message) {
  const liveRegion = document.getElementById('skip-links-announcements') || createLiveRegion();
  
  // Clear and set new message
  liveRegion.textContent = '';
  setTimeout(() => {
    liveRegion.textContent = message;
  }, 100);
}

/**
 * Create live region for announcements
 */
function createLiveRegion() {
  const region = document.createElement('div');
  region.id = 'skip-links-announcements';
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  region.className = 'sr-only';
  document.body.appendChild(region);
  return region;
}

export default SkipLinks;