/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SkipLinks from '../../components/accessibility/SkipLinks.jsx';

// Mock DOM elements for skip targets
const mockTargets = {
  '#main-content': { focus: jest.fn(), scrollIntoView: jest.fn(), hasAttribute: jest.fn(() => false), setAttribute: jest.fn(), getAttribute: jest.fn(() => 'Main content'), textContent: 'Main content' },
  '#navigation': { focus: jest.fn(), scrollIntoView: jest.fn(), hasAttribute: jest.fn(() => false), setAttribute: jest.fn(), getAttribute: jest.fn(() => 'Navigation'), textContent: 'Navigation' },
  '#search': { focus: jest.fn(), scrollIntoView: jest.fn(), hasAttribute: jest.fn(() => false), setAttribute: jest.fn(), getAttribute: jest.fn(() => 'Search'), textContent: 'Search' },
  '#footer': { focus: jest.fn(), scrollIntoView: jest.fn(), hasAttribute: jest.fn(() => false), setAttribute: jest.fn(), getAttribute: jest.fn(() => 'Footer'), textContent: 'Footer' }
};

// Mock querySelector
const originalQuerySelector = document.querySelector;
beforeEach(() => {
  document.querySelector = jest.fn((selector) => mockTargets[selector] || null);
  
  // Reset all mocks
  Object.values(mockTargets).forEach(target => {
    target.focus.mockClear();
    target.scrollIntoView.mockClear();
    target.hasAttribute.mockClear();
    target.setAttribute.mockClear();
    target.getAttribute.mockClear();
  });
});

afterEach(() => {
  document.querySelector = originalQuerySelector;
  
  // Clean up any live regions
  const liveRegion = document.getElementById('skip-links-announcements');
  if (liveRegion) {
    liveRegion.remove();
  }
});

describe('SkipLinks Component', () => {
  describe('Rendering', () => {
    test('renders default skip links', () => {
      render(<SkipLinks />);
      
      expect(screen.getByRole('navigation', { name: /skip navigation links/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /skip to main content/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /skip to navigation/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /skip to search/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /skip to footer/i })).toBeInTheDocument();
    });

    test('renders custom skip links', () => {
      const customLinks = [
        { href: '#custom-main', label: 'Skip to custom main', key: 'Alt+C' },
        { href: '#custom-nav', label: 'Skip to custom nav', key: 'Alt+N' }
      ];

      render(<SkipLinks links={customLinks} />);
      
      expect(screen.getByRole('link', { name: /skip to custom main/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /skip to custom nav/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /skip to footer/i })).not.toBeInTheDocument();
    });

    test('applies custom className', () => {
      const { container } = render(<SkipLinks className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('skip-links', 'custom-class');
    });

    test('shows keyboard shortcuts by default', () => {
      render(<SkipLinks />);
      
      const mainLink = screen.getByRole('link', { name: /skip to main content/i });
      expect(mainLink).toHaveAttribute('title', 'Keyboard shortcut: Alt+M');
      expect(screen.getByText('(Alt+M)')).toBeInTheDocument();
    });

    test('hides keyboard shortcuts when disabled', () => {
      render(<SkipLinks showKeyboardShortcuts={false} />);
      
      const mainLink = screen.getByRole('link', { name: /skip to main content/i });
      expect(mainLink).not.toHaveAttribute('title');
      expect(screen.queryByText('(Alt+M)')).not.toBeInTheDocument();
    });
  });

  describe('Navigation Functionality', () => {
    test('focuses and scrolls to target element on click', async () => {
      const user = userEvent.setup();
      render(<SkipLinks />);
      
      const mainLink = screen.getByRole('link', { name: /skip to main content/i });
      await user.click(mainLink);
      
      expect(mockTargets['#main-content'].focus).toHaveBeenCalled();
      expect(mockTargets['#main-content'].scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start'
      });
    });

    test('sets tabindex on target if not already focusable', async () => {
      const user = userEvent.setup();
      mockTargets['#main-content'].hasAttribute.mockReturnValue(false);
      
      render(<SkipLinks />);
      
      const mainLink = screen.getByRole('link', { name: /skip to main content/i });
      await user.click(mainLink);
      
      expect(mockTargets['#main-content'].hasAttribute).toHaveBeenCalledWith('tabindex');
      expect(mockTargets['#main-content'].setAttribute).toHaveBeenCalledWith('tabindex', '-1');
    });

    test('does not set tabindex if target already has it', async () => {
      const user = userEvent.setup();
      mockTargets['#main-content'].hasAttribute.mockReturnValue(true);
      
      render(<SkipLinks />);
      
      const mainLink = screen.getByRole('link', { name: /skip to main content/i });
      await user.click(mainLink);
      
      expect(mockTargets['#main-content'].setAttribute).not.toHaveBeenCalled();
    });

    test('prevents default link behavior', async () => {
      render(<SkipLinks />);
      
      const mainLink = screen.getByRole('link', { name: /skip to main content/i });
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      const preventDefaultSpy = jest.spyOn(clickEvent, 'preventDefault');
      
      fireEvent(mainLink, clickEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    test('handles missing target gracefully', async () => {
      const user = userEvent.setup();
      document.querySelector.mockReturnValue(null);
      
      render(<SkipLinks />);
      
      const mainLink = screen.getByRole('link', { name: /skip to main content/i });
      
      // Should not throw error
      expect(() => user.click(mainLink)).not.toThrow();
    });
  });

  describe('Screen Reader Announcements', () => {
    test('creates live region for announcements', async () => {
      const user = userEvent.setup();
      render(<SkipLinks />);
      
      const mainLink = screen.getByRole('link', { name: /skip to main content/i });
      await user.click(mainLink);
      
      await waitFor(() => {
        const liveRegion = document.getElementById('skip-links-announcements');
        expect(liveRegion).toBeInTheDocument();
        expect(liveRegion).toHaveAttribute('aria-live', 'polite');
        expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
        expect(liveRegion).toHaveClass('sr-only');
      });
    });

    test('announces skip action to screen readers', async () => {
      const user = userEvent.setup();
      mockTargets['#main-content'].getAttribute.mockReturnValue('Main content area');
      
      render(<SkipLinks />);
      
      const mainLink = screen.getByRole('link', { name: /skip to main content/i });
      await user.click(mainLink);
      
      await waitFor(() => {
        const liveRegion = document.getElementById('skip-links-announcements');
        expect(liveRegion.textContent).toBe('Skipped to Main content area');
      });
    });

    test('uses textContent as fallback for announcement', async () => {
      const user = userEvent.setup();
      mockTargets['#main-content'].getAttribute.mockReturnValue(null);
      
      render(<SkipLinks />);
      
      const mainLink = screen.getByRole('link', { name: /skip to main content/i });
      await user.click(mainLink);
      
      await waitFor(() => {
        const liveRegion = document.getElementById('skip-links-announcements');
        expect(liveRegion.textContent).toBe('Skipped to Main content');
      });
    });

    test('uses href as final fallback for announcement', async () => {
      const user = userEvent.setup();
      mockTargets['#main-content'].getAttribute.mockReturnValue(null);
      mockTargets['#main-content'].textContent = '';
      
      render(<SkipLinks />);
      
      const mainLink = screen.getByRole('link', { name: /skip to main content/i });
      await user.click(mainLink);
      
      await waitFor(() => {
        const liveRegion = document.getElementById('skip-links-announcements');
        expect(liveRegion.textContent).toBe('Skipped to main-content');
      });
    });

    test('reuses existing live region', async () => {
      const user = userEvent.setup();
      
      // Create existing live region
      const existingRegion = document.createElement('div');
      existingRegion.id = 'skip-links-announcements';
      document.body.appendChild(existingRegion);
      
      render(<SkipLinks />);
      
      const mainLink = screen.getByRole('link', { name: /skip to main content/i });
      await user.click(mainLink);
      
      // Should reuse existing region, not create new one
      const liveRegions = document.querySelectorAll('#skip-links-announcements');
      expect(liveRegions).toHaveLength(1);
      expect(liveRegions[0]).toBe(existingRegion);
    });
  });

  describe('Accessibility Features', () => {
    test('has proper ARIA attributes', () => {
      render(<SkipLinks />);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Skip navigation links');
      expect(nav).toHaveAttribute('role', 'navigation');
    });

    test('skip links have proper href attributes', () => {
      render(<SkipLinks />);
      
      expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveAttribute('href', '#main-content');
      expect(screen.getByRole('link', { name: /skip to navigation/i })).toHaveAttribute('href', '#navigation');
      expect(screen.getByRole('link', { name: /skip to search/i })).toHaveAttribute('href', '#search');
      expect(screen.getByRole('link', { name: /skip to footer/i })).toHaveAttribute('href', '#footer');
    });

    test('keyboard shortcuts are marked as decorative', () => {
      render(<SkipLinks />);
      
      const shortcut = screen.getByText('(Alt+M)');
      expect(shortcut).toHaveAttribute('aria-hidden', 'true');
    });

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<SkipLinks />);
      
      const firstLink = screen.getByRole('link', { name: /skip to main content/i });
      
      // Tab to first link
      await user.tab();
      expect(firstLink).toHaveFocus();
      
      // Enter should activate link
      await user.keyboard('{Enter}');
      expect(mockTargets['#main-content'].focus).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty links array', () => {
      render(<SkipLinks links={[]} />);
      
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    test('handles links without key property', () => {
      const linksWithoutKeys = [
        { href: '#main', label: 'Skip to main' }
      ];
      
      render(<SkipLinks links={linksWithoutKeys} />);
      
      const link = screen.getByRole('link', { name: /skip to main/i });
      expect(link).not.toHaveAttribute('title');
      expect(screen.queryByText(/Alt\+/)).not.toBeInTheDocument();
    });

    test('handles malformed href values', async () => {
      const user = userEvent.setup();
      const malformedLinks = [
        { href: 'invalid-href', label: 'Invalid link', key: 'Alt+I' }
      ];
      
      render(<SkipLinks links={malformedLinks} />);
      
      const link = screen.getByRole('link', { name: /invalid link/i });
      
      // Should not throw error when clicking invalid href
      expect(() => user.click(link)).not.toThrow();
    });

    test('clears live region content before setting new message', async () => {
      const user = userEvent.setup();
      render(<SkipLinks />);
      
      const mainLink = screen.getByRole('link', { name: /skip to main content/i });
      await user.click(mainLink);
      
      await waitFor(() => {
        const liveRegion = document.getElementById('skip-links-announcements');
        expect(liveRegion.textContent).toBe('Skipped to Main content');
      });
      
      // Click another link
      const navLink = screen.getByRole('link', { name: /skip to navigation/i });
      await user.click(navLink);
      
      await waitFor(() => {
        const liveRegion = document.getElementById('skip-links-announcements');
        expect(liveRegion.textContent).toBe('Skipped to Navigation');
      });
    });
  });
});