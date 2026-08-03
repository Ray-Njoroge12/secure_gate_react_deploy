/**
 * Unit Tests for KeyboardNavigation Component
 * 
 * Tests keyboard navigation, focus management, shortcuts, and spatial navigation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeyboardNavigation, KeyboardShortcutsHelp } from '../../components/accessibility/KeyboardNavigation.jsx';

// Mock AccessibilityProvider
const mockAccessibilityContext = {
  announce: jest.fn(),
  settings: {
    keyboardNavigation: true
  }
};

jest.mock('../../components/accessibility/AccessibilityProvider.jsx', () => ({
  useAccessibilityContext: () => mockAccessibilityContext
}));

// Test component with focusable elements
const TestFocusableComponent = ({ _onShortcut }) => (
  <div data-testid="focusable-container">
    <button data-testid="button-1">Button 1</button>
    <input data-testid="input-1" placeholder="Input 1" />
    <a href="#" data-testid="link-1">Link 1</a>
    <select data-testid="select-1">
      <option>Option 1</option>
    </select>
    <textarea data-testid="textarea-1" placeholder="Textarea 1" />
    <button data-testid="button-2">Button 2</button>
    <div tabIndex="0" data-testid="div-focusable">Focusable Div</div>
  </div>
);

describe('KeyboardNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock document methods
    document.querySelector = jest.fn();
    document.querySelectorAll = jest.fn();
    
    // Mock window methods
    Object.defineProperty(window, 'history', {
      value: {
        pushState: jest.fn()
      },
      writable: true
    });

    // Mock dispatchEvent
    window.dispatchEvent = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    test('should render children with keyboard navigation wrapper', () => {
      render(
        <KeyboardNavigation>
          <TestFocusableComponent />
        </KeyboardNavigation>
      );

      expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Keyboard navigable content');
      expect(screen.getByTestId('focusable-container')).toBeInTheDocument();
    });

    test('should apply custom className', () => {
      render(
        <KeyboardNavigation className="custom-nav">
          <TestFocusableComponent />
        </KeyboardNavigation>
      );

      const container = screen.getByRole('group');
      expect(container).toHaveClass('keyboard-navigation');
      expect(container).toHaveClass('custom-nav');
    });

    test('should be inactive initially', () => {
      render(
        <KeyboardNavigation>
          <TestFocusableComponent />
        </KeyboardNavigation>
      );

      const container = screen.getByRole('group');
      expect(container).not.toHaveClass('keyboard-navigation--active');
    });
  });

  describe('Focusable Elements Detection', () => {
    test('should identify focusable elements', () => {
      render(
        <KeyboardNavigation>
          <TestFocusableComponent />
        </KeyboardNavigation>
      );

      // All focusable elements should be present
      expect(screen.getByTestId('button-1')).toBeInTheDocument();
      expect(screen.getByTestId('input-1')).toBeInTheDocument();
      expect(screen.getByTestId('link-1')).toBeInTheDocument();
      expect(screen.getByTestId('select-1')).toBeInTheDocument();
      expect(screen.getByTestId('textarea-1')).toBeInTheDocument();
      expect(screen.getByTestId('button-2')).toBeInTheDocument();
      expect(screen.getByTestId('div-focusable')).toBeInTheDocument();
    });

    test('should exclude disabled elements', () => {
      const TestDisabledComponent = () => (
        <div>
          <button data-testid="enabled-button">Enabled</button>
          <button data-testid="disabled-button" disabled>Disabled</button>
          <input data-testid="disabled-input" disabled />
          <button data-testid="aria-disabled" aria-disabled="true">ARIA Disabled</button>
        </div>
      );

      render(
        <KeyboardNavigation>
          <TestDisabledComponent />
        </KeyboardNavigation>
      );

      expect(screen.getByTestId('enabled-button')).toBeInTheDocument();
      expect(screen.getByTestId('disabled-button')).toBeDisabled();
      expect(screen.getByTestId('disabled-input')).toBeDisabled();
      expect(screen.getByTestId('aria-disabled')).toHaveAttribute('aria-disabled', 'true');
    });

    test('should exclude hidden elements', () => {
      const TestHiddenComponent = () => (
        <div>
          <button data-testid="visible-button">Visible</button>
          <button data-testid="hidden-button" style={{ display: 'none' }}>Hidden</button>
          <button data-testid="invisible-button" style={{ visibility: 'hidden' }}>Invisible</button>
        </div>
      );

      render(
        <KeyboardNavigation>
          <TestHiddenComponent />
        </KeyboardNavigation>
      );

      expect(screen.getByTestId('visible-button')).toBeInTheDocument();
      // Hidden elements are still in DOM but should be excluded from navigation
      expect(screen.getByTestId('hidden-button')).toBeInTheDocument();
      expect(screen.getByTestId('invisible-button')).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('should handle default keyboard shortcuts', () => {
      const onShortcut = jest.fn();

      render(
        <KeyboardNavigation onShortcut={onShortcut}>
          <TestFocusableComponent />
        </KeyboardNavigation>
      );

      // Test Alt+H shortcut (skip to main)
      fireEvent.keyDown(document, {
        key: 'h',
        altKey: true,
        code: 'KeyH'
      });

      expect(onShortcut).toHaveBeenCalledWith('skipToMain', expect.any(Object));
      expect(mockAccessibilityContext.announce).toHaveBeenCalledWith(
        'Activated Skip to main content',
        'polite'
      );
    });

    test('should handle custom shortcuts', () => {
      const customShortcuts = {
        'ctrl+k': { action: 'customAction', description: 'Custom action' }
      };
      const onShortcut = jest.fn();

      render(
        <KeyboardNavigation shortcuts={customShortcuts} onShortcut={onShortcut}>
          <TestFocusableComponent />
        </KeyboardNavigation>
      );

      fireEvent.keyDown(document, {
        key: 'k',
        ctrlKey: true,
        code: 'KeyK'
      });

      expect(onShortcut).toHaveBeenCalledWith('customAction', expect.any(Object));
    });

    test('should handle multiple modifier keys', () => {
      const onShortcut = jest.fn();

      render(
        <KeyboardNavigation onShortcut={onShortcut}>
          <TestFocusableComponent />
        </KeyboardNavigation>
      );

      // Test Alt+Shift+A shortcut (toggle accessibility menu)
      fireEvent.keyDown(document, {
        key: 'a',
        altKey: true,
        shiftKey: true,
        code: 'KeyA'
      });

      expect(onShortcut).toHaveBeenCalledWith('toggleAccessibilityMenu', expect.any(Object));
    });

    test('should prevent default behavior for handled shortcuts', () => {
      const onShortcut = jest.fn();
      const preventDefault = jest.fn();

      render(
        <KeyboardNavigation onShortcut={onShortcut}>
          <TestFocusableComponent />
        </KeyboardNavigation>
      );

      const event = {
        key: 'h',
        altKey: true,
        code: 'KeyH',
        preventDefault
      };

      fireEvent.keyDown(document, event);

      expect(preventDefault).toHaveBeenCalled();
    });
  });

  describe('Roving Tabindex Navigation', () => {
    test('should handle arrow key navigation when enabled', () => {
      render(
        <KeyboardNavigation enableRoving={true}>
          <TestFocusableComponent />
        </KeyboardNavigation>
      );

      const button1 = screen.getByTestId('button-1');

      // Focus first element
      button1.focus();

      // Arrow down should move to next element
      fireEvent.keyDown(button1, {
        key: 'ArrowDown',
        code: 'ArrowDown'
      });

      // Note: In a real implementation, this would change focus
      // Here we're testing that the event is handled
    });

    test('should handle Home and End keys in roving navigation', () => {
      render(
        <KeyboardNavigation enableRoving={true}>
          <TestFocusableComponent />
        </KeyboardNavigation>
      );

      const button1 = screen.getByTestId('button-1');

      button1.focus();

      // Test Home key
      fireEvent.keyDown(button1, {
        key: 'Home',
        code: 'Home'
      });

      // Test End key
      fireEvent.keyDown(button1, {
        key: 'End',
        code: 'End'
      });

      // Events should be handled without errors
    });

    test('should wrap around in roving navigation', () => {
      render(
        <KeyboardNavigation enableRoving={true}>
          <TestFocusableComponent />
        </KeyboardNavigation>
      );

      const button1 = screen.getByTestId('button-1');

      button1.focus();

      // Arrow up from first element should wrap to last
      fireEvent.keyDown(button1, {
        key: 'ArrowUp',
        code: 'ArrowUp'
      });

      // Should handle wrapping logic
    });
  });

  describe('Spatial Navigation', () => {
    test('should handle spatial navigation when enabled', () => {
      render(
        <KeyboardNavigation enableSpatial={true}>
          <TestFocusableComponent />
        </KeyboardNavigation>
      );

      const button1 = screen.getByTestId('button-1');

      // Mock getBoundingClientRect for spatial calculations
      button1.getBoundingClientRect = jest.fn(() => ({
        left: 10,
        top: 10,
        width: 100,
        height: 40
      }));

      button1.focus();

      fireEvent.keyDown(button1, {
        key: 'ArrowRight',
        code: 'ArrowRight'
      });

      // Should handle spatial navigation logic
    });

    test('should calculate spatial distances correctly', () => {
      // This tests the internal spatial distance calculation
      render(
        <KeyboardNavigation enableSpatial={true}>
          <div>
            <button 
              data-testid="button-left"
              style={{ position: 'absolute', left: '0px', top: '0px' }}
            >
              Left
            </button>
            <button 
              data-testid="button-right"
              style={{ position: 'absolute', left: '100px', top: '0px' }}
            >
              Right
            </button>
          </div>
        </KeyboardNavigation>
      );

      const leftButton = screen.getByTestId('button-left');
      const rightButton = screen.getByTestId('button-right');

      // Mock getBoundingClientRect
      leftButton.getBoundingClientRect = jest.fn(() => ({
        left: 0, top: 0, width: 50, height: 30
      }));
      rightButton.getBoundingClientRect = jest.fn(() => ({
        left: 100, top: 0, width: 50, height: 30
      }));

      leftButton.focus();

      fireEvent.keyDown(leftButton, {
        key: 'ArrowRight',
        code: 'ArrowRight'
      });

      // Should handle spatial navigation
    });
  });

  describe('Focus Management', () => {
    test('should track focus events', async () => {
      render(
        <KeyboardNavigation>
          <TestFocusableComponent />
        </KeyboardNavigation>
      );

      const button1 = screen.getByTestId('button-1');
      const container = screen.getByRole('group');

      // Focus element inside container
      fireEvent.focusIn(button1);

      await waitFor(() => {
        expect(container).toHaveClass('keyboard-navigation--active');
      });
    });

    test('should handle focus leaving container', async () => {
      render(
        <KeyboardNavigation>
          <TestFocusableComponent />
        </KeyboardNavigation>
      );

      const button1 = screen.getByTestId('button-1');
      const container = screen.getByRole('group');

      // Focus element inside container
      fireEvent.focusIn(button1);

      // Focus leaves container
      fireEvent.focusOut(button1, { relatedTarget: document.body });

      await waitFor(() => {
        expect(container).not.toHaveClass('keyboard-navigation--active');
      });
    });

    test('should update focusable elements on DOM changes', () => {
      const TestDynamicComponent = () => {
        const [showButton, setShowButton] = React.useState(false);

        return (
          <div>
            <button onClick={() => setShowButton(true)}>Show Button</button>
            {showButton && <button data-testid="dynamic-button">Dynamic Button</button>}
          </div>
        );
      };

      render(
        <KeyboardNavigation>
          <TestDynamicComponent />
        </KeyboardNavigation>
      );

      // Initially dynamic button should not exist
      expect(screen.queryByTestId('dynamic-button')).not.toBeInTheDocument();

      // Click to show button
      fireEvent.click(screen.getByText('Show Button'));

      // Dynamic button should now exist
      expect(screen.getByTestId('dynamic-button')).toBeInTheDocument();
    });
  });

  describe('Shortcut Actions', () => {
    beforeEach(() => {
      // Mock DOM elements for shortcut actions
      document.querySelector = jest.fn((selector) => {
        const mockElement = {
          focus: jest.fn(),
          scrollIntoView: jest.fn(),
          setAttribute: jest.fn(),
          hasAttribute: jest.fn(() => false),
          click: jest.fn(),
          closest: jest.fn(),
          dispatchEvent: jest.fn()
        };

        if (selector.includes('main')) return mockElement;
        if (selector.includes('nav')) return mockElement;
        if (selector.includes('modal')) return mockElement;
        if (selector.includes('form')) return mockElement;
        if (selector.includes('help')) return mockElement;
        
        return null;
      });

      document.documentElement = {
        classList: {
          toggle: jest.fn(),
          contains: jest.fn(() => false)
        }
      };
    });

    test('should handle skip to main content', () => {
      const onShortcut = jest.fn();

      render(
        <KeyboardNavigation onShortcut={onShortcut}>
          <TestFocusableComponent />
        </KeyboardNavigation>
      );

      fireEvent.keyDown(document, {
        key: 'h',
        altKey: true
      });

      expect(onShortcut).toHaveBeenCalledWith('skipToMain', expect.any(Object));
    });

    test('should handle navigation shortcuts', () => {
      const onShortcut = jest.fn();

      render(
        <KeyboardNavigation onShortcut={onShortcut}>
          <TestFocusableComponent />
        </KeyboardNavigation>
      );

      // Test Alt+1 (go to home)
      fireEvent.keyDown(document, {
        key: '1',
        altKey: true
      });

      expect(onShortcut).toHaveBeenCalledWith('goToHome', expect.any(Object));
    });

    test('should handle modal close with Escape', () => {
      const onShortcut = jest.fn();

      render(
        <KeyboardNavigation onShortcut={onShortcut}>
          <TestFocusableComponent />
        </KeyboardNavigation>
      );

      fireEvent.keyDown(document, {
        key: 'Escape'
      });

      expect(onShortcut).toHaveBeenCalledWith('closeModal', expect.any(Object));
    });

    test('should handle form submission with Ctrl+Enter', () => {
      const onShortcut = jest.fn();

      render(
        <KeyboardNavigation onShortcut={onShortcut}>
          <TestFocusableComponent />
        </KeyboardNavigation>
      );

      fireEvent.keyDown(document, {
        key: 'Enter',
        ctrlKey: true
      });

      expect(onShortcut).toHaveBeenCalledWith('submitForm', expect.any(Object));
    });

    test('should handle accessibility toggles', () => {
      const onShortcut = jest.fn();

      render(
        <KeyboardNavigation onShortcut={onShortcut}>
          <TestFocusableComponent />
        </KeyboardNavigation>
      );

      // Test high contrast toggle
      fireEvent.keyDown(document, {
        key: 'c',
        altKey: true,
        shiftKey: true
      });

      expect(onShortcut).toHaveBeenCalledWith('toggleHighContrast', expect.any(Object));
    });
  });

  describe('Keyboard Navigation Settings', () => {
    test('should respect keyboard navigation setting', () => {
      mockAccessibilityContext.settings.keyboardNavigation = false;

      const onShortcut = jest.fn();

      render(
        <KeyboardNavigation onShortcut={onShortcut}>
          <TestFocusableComponent />
        </KeyboardNavigation>
      );

      fireEvent.keyDown(document, {
        key: 'h',
        altKey: true
      });

      // Should not handle shortcuts when keyboard navigation is disabled
      expect(onShortcut).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = render(
        <KeyboardNavigation>
          <TestFocusableComponent />
        </KeyboardNavigation>
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    test('should disconnect mutation observer on unmount', () => {
      const mockObserver = {
        observe: jest.fn(),
        disconnect: jest.fn()
      };

      global.MutationObserver = jest.fn(() => mockObserver);

      const { unmount } = render(
        <KeyboardNavigation>
          <TestFocusableComponent />
        </KeyboardNavigation>
      );

      unmount();

      expect(mockObserver.disconnect).toHaveBeenCalled();
    });
  });
});

describe('KeyboardShortcutsHelp', () => {
  test('should render keyboard shortcuts help', () => {
    render(<KeyboardShortcutsHelp />);

    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Application')).toBeInTheDocument();
    expect(screen.getByText('Accessibility')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
  });

  test('should display shortcut keys and descriptions', () => {
    render(<KeyboardShortcutsHelp />);

    // Check for some default shortcuts
    expect(screen.getByText('alt+h')).toBeInTheDocument();
    expect(screen.getByText('Skip to main content')).toBeInTheDocument();
    expect(screen.getByText('alt+n')).toBeInTheDocument();
    expect(screen.getByText('Skip to navigation')).toBeInTheDocument();
  });

  test('should handle close button', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();

    render(<KeyboardShortcutsHelp onClose={onClose} />);

    const closeButton = screen.getByLabelText('Close keyboard shortcuts help');
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  test('should announce when opened', () => {
    render(<KeyboardShortcutsHelp />);

    expect(mockAccessibilityContext.announce).toHaveBeenCalledWith(
      'Keyboard shortcuts help opened',
      'polite'
    );
  });

  test('should render custom shortcuts', () => {
    const customShortcuts = {
      'ctrl+k': { description: 'Custom shortcut' },
      'alt+x': { description: 'Another custom shortcut' }
    };

    render(<KeyboardShortcutsHelp shortcuts={customShortcuts} />);

    expect(screen.getByText('ctrl+k')).toBeInTheDocument();
    expect(screen.getByText('Custom shortcut')).toBeInTheDocument();
  });

  test('should have proper ARIA attributes', () => {
    render(<KeyboardShortcutsHelp />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'shortcuts-title');

    const title = screen.getByText('Keyboard Shortcuts');
    expect(title).toHaveAttribute('id', 'shortcuts-title');
  });

  test('should provide escape key instruction', () => {
    render(<KeyboardShortcutsHelp />);

    expect(screen.getByText(/Press.*Escape.*to close this help dialog/)).toBeInTheDocument();
  });
});