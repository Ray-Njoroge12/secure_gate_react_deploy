/**
 * @fileoverview Keyboard navigation tests for Secure Gate Access
 * @description Comprehensive tests for keyboard navigation and focus management
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { ErrorProvider } from '../../contexts/ErrorContext';
import { LoadingProvider } from '../../contexts/LoadingContext';
import { SearchProvider } from '../../contexts/SearchContext';
import { Modal, Dropdown, KeyboardShortcuts } from '../../components/ui';
import Sidebar from '../../components/Sidebar';
import { FocusManager, createFocusTrap, createRovingTabindex } from '../../utils/focusManagement';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Test wrapper with all providers
const TestWrapper = ({ children }) => (
  <MemoryRouter>
    <ErrorProvider>
      <LoadingProvider>
        <SearchProvider>
          {children}
        </SearchProvider>
      </LoadingProvider>
    </ErrorProvider>
  </MemoryRouter>
);

describe('Keyboard Navigation and Focus Management', () => {
  describe('FocusManager', () => {
    let focusManager;

    beforeEach(() => {
      focusManager = new FocusManager();
    });

    it('should identify focusable elements correctly', () => {
      document.body.innerHTML = `
        <div>
          <button>Click me</button>
          <input type="text" />
          <a href="#test">Link</a>
          <div tabindex="0">Focusable div</div>
          <button disabled>Disabled button</button>
          <div style="display: none;">Hidden</div>
        </div>
      `;

      const focusableElements = focusManager.getFocusableElements();
      expect(focusableElements).toHaveLength(4);
      expect(focusableElements[0].textContent).toBe('Click me');
      expect(focusableElements[1].tagName).toBe('INPUT');
      expect(focusableElements[2].textContent).toBe('Link');
      expect(focusableElements[3].textContent).toBe('Focusable div');
    });

    it('should focus first element', () => {
      document.body.innerHTML = `
        <div>
          <button>First</button>
          <button>Second</button>
        </div>
      `;

      const result = focusManager.focusFirst();
      expect(result).toBe(true);
      expect(document.activeElement.textContent).toBe('First');
    });

    it('should focus last element', () => {
      document.body.innerHTML = `
        <div>
          <button>First</button>
          <button>Last</button>
        </div>
      `;

      const result = focusManager.focusLast();
      expect(result).toBe(true);
      expect(document.activeElement.textContent).toBe('Last');
    });

    it('should navigate to next element', () => {
      document.body.innerHTML = `
        <div>
          <button>First</button>
          <button>Second</button>
          <button>Third</button>
        </div>
      `;

      const firstButton = document.querySelector('button');
      firstButton.focus();
      
      const result = focusManager.focusNext(firstButton);
      expect(result).toBe(true);
      expect(document.activeElement.textContent).toBe('Second');
    });

    it('should navigate to previous element', () => {
      document.body.innerHTML = `
        <div>
          <button>First</button>
          <button>Second</button>
          <button>Third</button>
        </div>
      `;

      const secondButton = document.querySelectorAll('button')[1];
      secondButton.focus();
      
      const result = focusManager.focusPrevious(secondButton);
      expect(result).toBe(true);
      expect(document.activeElement.textContent).toBe('First');
    });

    it('should save and restore focus', () => {
      document.body.innerHTML = `
        <div>
          <button>First</button>
          <button>Second</button>
        </div>
      `;

      const firstButton = document.querySelector('button');
      firstButton.focus();
      focusManager.saveFocus();

      const secondButton = document.querySelectorAll('button')[1];
      secondButton.focus();

      const result = focusManager.restoreFocus();
      expect(result).toBe(true);
      expect(document.activeElement.textContent).toBe('First');
    });
  });

  describe('Focus Trap', () => {
    it('should trap focus within container', () => {
      document.body.innerHTML = `
        <div id="container">
          <button>First</button>
          <button>Last</button>
        </div>
      `;

      const container = document.getElementById('container');
      const cleanup = createFocusTrap(container);

      // Focus should be on first element
      expect(document.activeElement.textContent).toBe('First');

      // Tab should cycle to last element
      fireEvent.keyDown(document.activeElement, { key: 'Tab' });
      expect(document.activeElement.textContent).toBe('Last');

      // Tab should cycle back to first element
      fireEvent.keyDown(document.activeElement, { key: 'Tab' });
      expect(document.activeElement.textContent).toBe('First');

      cleanup();
    });

    it('should handle Shift+Tab correctly', () => {
      document.body.innerHTML = `
        <div id="container">
          <button>First</button>
          <button>Last</button>
        </div>
      `;

      const container = document.getElementById('container');
      const cleanup = createFocusTrap(container);

      // Focus should be on first element
      expect(document.activeElement.textContent).toBe('First');

      // Shift+Tab should go to last element
      fireEvent.keyDown(document.activeElement, { key: 'Tab', shiftKey: true });
      expect(document.activeElement.textContent).toBe('Last');

      cleanup();
    });
  });

  describe('Roving Tabindex', () => {
    it('should implement roving tabindex correctly', () => {
      document.body.innerHTML = `
        <div id="container">
          <button tabindex="0">First</button>
          <button tabindex="-1">Second</button>
          <button tabindex="-1">Third</button>
        </div>
      `;

      const container = document.getElementById('container');
      const cleanup = createRovingTabindex(container);

      // First button should have tabindex="0"
      const firstButton = container.querySelectorAll('button')[0];
      expect(firstButton.getAttribute('tabindex')).toBe('0');

      // Arrow down should move focus and update tabindex
      fireEvent.keyDown(firstButton, { key: 'ArrowDown' });
      const secondButton = container.querySelectorAll('button')[1];
      expect(secondButton.getAttribute('tabindex')).toBe('0');
      expect(firstButton.getAttribute('tabindex')).toBe('-1');

      cleanup();
    });
  });

  describe('Modal Component', () => {
    it('should trap focus when open', () => {
      const handleClose = jest.fn();
      
      render(
        <TestWrapper>
          <Modal isOpen={true} onClose={handleClose} title="Test Modal">
            <button>Modal Button 1</button>
            <button>Modal Button 2</button>
          </Modal>
        </TestWrapper>
      );

      // Focus should be on title or first focusable element
      const title = screen.getByText('Test Modal');
      expect(title).toHaveAttribute('tabIndex', '-1');

      // Tab should cycle within modal
      fireEvent.keyDown(document.activeElement, { key: 'Tab' });
      // Focus should cycle through modal elements
    });

    it('should close on Escape key', () => {
      const handleClose = jest.fn();
      
      render(
        <TestWrapper>
          <Modal isOpen={true} onClose={handleClose} title="Test Modal">
            <p>Modal content</p>
          </Modal>
        </TestWrapper>
      );

      fireEvent.keyDown(document.body, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalled();
    });

    it('should restore focus when closed', () => {
      const handleClose = jest.fn();
      
      // Create a button to focus before opening modal
      document.body.innerHTML = '<button id="before-modal">Before Modal</button>';
      const beforeButton = document.getElementById('before-modal');
      beforeButton.focus();

      render(
        <TestWrapper>
          <Modal isOpen={true} onClose={handleClose} title="Test Modal">
            <p>Modal content</p>
          </Modal>
        </TestWrapper>
      );

      // Close modal
      handleClose();

      // Focus should be restored to the button that was focused before
      expect(document.activeElement).toBe(beforeButton);
    });

    it('passes accessibility audit', async () => {
      const { container } = render(
        <TestWrapper>
          <Modal isOpen={true} onClose={() => {}} title="Test Modal">
            <p>Modal content</p>
          </Modal>
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Dropdown Component', () => {
    const mockOptions = [
      { value: '1', label: 'Option 1' },
      { value: '2', label: 'Option 2' },
      { value: '3', label: 'Option 3' }
    ];

    it('should open on Enter key', () => {
      const handleChange = jest.fn();
      
      render(
        <TestWrapper>
          <Dropdown
            options={mockOptions}
            onChange={handleChange}
            placeholder="Select option"
          />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });
      
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('should navigate options with arrow keys', () => {
      const handleChange = jest.fn();
      
      render(
        <TestWrapper>
          <Dropdown
            options={mockOptions}
            onChange={handleChange}
            placeholder="Select option"
          />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      
      // Open dropdown
      fireEvent.keyDown(button, { key: 'Enter' });
      
      // Navigate with arrow keys
      fireEvent.keyDown(button, { key: 'ArrowDown' });
      fireEvent.keyDown(button, { key: 'ArrowDown' });
      
      // Select option
      fireEvent.keyDown(button, { key: 'Enter' });
      
      expect(handleChange).toHaveBeenCalledWith('3');
    });

    it('should close on Escape key', () => {
      const handleChange = jest.fn();
      
      render(
        <TestWrapper>
          <Dropdown
            options={mockOptions}
            onChange={handleChange}
            placeholder="Select option"
          />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      
      // Open dropdown
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      
      // Close with Escape
      fireEvent.keyDown(button, { key: 'Escape' });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('passes accessibility audit', async () => {
      const { container } = render(
        <TestWrapper>
          <Dropdown
            options={mockOptions}
            onChange={() => {}}
            placeholder="Select option"
          />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Sidebar Component', () => {
    it('should navigate with arrow keys', () => {
      render(
        <TestWrapper>
          <Sidebar role="resident" />
        </TestWrapper>
      );

      const firstLink = screen.getByRole('link', { name: /navigate to dashboard/i });
      firstLink.focus();

      // Arrow down should move to next link
      fireEvent.keyDown(firstLink, { key: 'ArrowDown' });
      // Focus should move to next navigation item
    });

    it('should close on Escape when open', () => {
      const handleClose = jest.fn();
      
      render(
        <TestWrapper>
          <Sidebar role="resident" isOpen={true} onClose={handleClose} />
        </TestWrapper>
      );

      fireEvent.keyDown(document.body, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalled();
    });

    it('passes accessibility audit', async () => {
      const { container } = render(
        <TestWrapper>
          <Sidebar role="resident" />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Shortcuts Component', () => {
    it('should open on F1 key', () => {
      render(
        <TestWrapper>
          <KeyboardShortcuts />
        </TestWrapper>
      );

      fireEvent.keyDown(document.body, { key: 'F1' });
      
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    it('should display registered shortcuts', () => {
      render(
        <TestWrapper>
          <KeyboardShortcuts showOnMount={true} />
        </TestWrapper>
      );

      expect(screen.getByText('Close modals and dialogs')).toBeInTheDocument();
      expect(screen.getByText('Focus search input')).toBeInTheDocument();
    });

    it('passes accessibility audit', async () => {
      const { container } = render(
        <TestWrapper>
          <KeyboardShortcuts showOnMount={true} />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Focus Management Integration', () => {
    it('should maintain focus order in forms', () => {
      render(
        <TestWrapper>
          <form>
            <input type="text" placeholder="First name" />
            <input type="text" placeholder="Last name" />
            <button type="submit">Submit</button>
          </form>
        </TestWrapper>
      );

      const firstName = screen.getByPlaceholderText('First name');
      const lastName = screen.getByPlaceholderText('Last name');
      const submitButton = screen.getByRole('button', { name: 'Submit' });

      // Tab through form elements
      firstName.focus();
      expect(document.activeElement).toBe(firstName);

      fireEvent.keyDown(firstName, { key: 'Tab' });
      expect(document.activeElement).toBe(lastName);

      fireEvent.keyDown(lastName, { key: 'Tab' });
      expect(document.activeElement).toBe(submitButton);
    });

    it('should handle focus restoration after modal interaction', async () => {
      const TestComponent = () => {
        const [modalOpen, setModalOpen] = React.useState(false);
        
        return (
          <div>
            <button onClick={() => setModalOpen(true)}>Open Modal</button>
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
              <button>Modal Button</button>
            </Modal>
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      const openButton = screen.getByText('Open Modal');
      openButton.focus();
      openButton.click();

      // Modal should be open
      expect(screen.getByText('Modal Button')).toBeInTheDocument();

      // Close modal
      const closeButton = screen.getByLabelText('Close modal');
      closeButton.click();

      // Focus should be restored to open button
      await waitFor(() => {
        expect(document.activeElement).toBe(openButton);
      });
    });
  });
});




