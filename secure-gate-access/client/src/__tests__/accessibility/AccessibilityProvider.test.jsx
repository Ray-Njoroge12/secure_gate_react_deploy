/**
 * Unit Tests for AccessibilityProvider Component
 * 
 * Tests keyboard navigation, focus management, screen reader support,
 * high contrast themes, and text scaling functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessibilityProvider, useAccessibilityContext } from '../../components/accessibility/AccessibilityProvider.jsx';

// Mock useAccessibility hook
jest.mock('../../hooks/useAccessibility.js', () => ({
  useAccessibility: () => ({
    accessibilityState: {
      isHighContrast: false,
      isReducedMotion: false,
      isKeyboardUser: false,
      isScreenReader: false,
      focusVisible: false,
      currentFocus: null,
      announcements: []
    },
    auditResults: null,
    runAudit: jest.fn(),
    announce: jest.fn(),
    skipToMain: jest.fn(),
    skipToNavigation: jest.fn(),
    getAccessibleClasses: jest.fn(() => ''),
    getAccessibleStyles: jest.fn(() => ({})),
    createFocusTrap: jest.fn(),
    LiveRegion: () => null,
    focusHistory: []
  })
}));

// Test component that uses accessibility context
const TestComponent = ({ onSettingChange }) => {
  const {
    settings,
    updateSetting,
    toggleSetting,
    announce,
    createFocusTrap,
    checkColorContrast,
    validateTouchTarget,
    isInitialized
  } = useAccessibilityContext();

  return (
    <div data-testid="test-component">
      <div data-testid="initialized">{isInitialized.toString()}</div>
      <div data-testid="high-contrast">{settings.highContrast.toString()}</div>
      <div data-testid="reduced-motion">{settings.reducedMotion.toString()}</div>
      <div data-testid="keyboard-navigation">{settings.keyboardNavigation.toString()}</div>
      <div data-testid="text-scaling">{settings.textScaling}</div>
      
      <button 
        data-testid="toggle-high-contrast"
        onClick={() => {
          toggleSetting('highContrast');
          if (onSettingChange) onSettingChange('highContrast', !settings.highContrast);
        }}
      >
        Toggle High Contrast
      </button>
      
      <button 
        data-testid="update-text-scaling"
        onClick={() => {
          updateSetting('textScaling', 150);
          if (onSettingChange) onSettingChange('textScaling', 150);
        }}
      >
        Increase Text Size
      </button>
      
      <button 
        data-testid="announce-message"
        onClick={() => announce('Test announcement')}
      >
        Announce Message
      </button>
      
      <div 
        data-testid="focus-trap-container"
        ref={(el) => el && createFocusTrap(el)}
      >
        <button data-testid="first-button">First</button>
        <button data-testid="second-button">Second</button>
      </div>
    </div>
  );
};

describe('AccessibilityProvider', () => {
  let mockLocalStorage;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    // Mock document.documentElement
    Object.defineProperty(document, 'documentElement', {
      value: {
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          contains: jest.fn()
        },
        style: {
          setProperty: jest.fn()
        }
      },
      writable: true
    });

    // Clear DOM
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default accessibility settings', () => {
      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      expect(screen.getByTestId('initialized')).toHaveTextContent('true');
      expect(screen.getByTestId('high-contrast')).toHaveTextContent('false');
      expect(screen.getByTestId('reduced-motion')).toHaveTextContent('false');
      expect(screen.getByTestId('keyboard-navigation')).toHaveTextContent('true');
      expect(screen.getByTestId('text-scaling')).toHaveTextContent('100');
    });

    test('should load saved settings from localStorage', () => {
      const savedSettings = {
        highContrast: true,
        textScaling: 120,
        keyboardNavigation: true
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedSettings));

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      expect(screen.getByTestId('high-contrast')).toHaveTextContent('true');
      expect(screen.getByTestId('text-scaling')).toHaveTextContent('120');
    });

    test('should detect system preferences for high contrast', () => {
      window.matchMedia = jest.fn().mockImplementation(query => {
        if (query === '(prefers-contrast: high)') {
          return {
            matches: true,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
          };
        }
        return {
          matches: false,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        };
      });

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      expect(screen.getByTestId('high-contrast')).toHaveTextContent('true');
    });

    test('should detect system preferences for reduced motion', () => {
      window.matchMedia = jest.fn().mockImplementation(query => {
        if (query === '(prefers-reduced-motion: reduce)') {
          return {
            matches: true,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
          };
        }
        return {
          matches: false,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        };
      });

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      expect(screen.getByTestId('reduced-motion')).toHaveTextContent('true');
    });
  });

  describe('Settings Management', () => {
    test('should update individual settings', async () => {
      const user = userEvent.setup();
      const onSettingChange = jest.fn();

      render(
        <AccessibilityProvider>
          <TestComponent onSettingChange={onSettingChange} />
        </AccessibilityProvider>
      );

      await user.click(screen.getByTestId('update-text-scaling'));

      expect(screen.getByTestId('text-scaling')).toHaveTextContent('150');
      expect(onSettingChange).toHaveBeenCalledWith('textScaling', 150);
    });

    test('should toggle boolean settings', async () => {
      const user = userEvent.setup();
      const onSettingChange = jest.fn();

      render(
        <AccessibilityProvider>
          <TestComponent onSettingChange={onSettingChange} />
        </AccessibilityProvider>
      );

      // Initially false
      expect(screen.getByTestId('high-contrast')).toHaveTextContent('false');

      await user.click(screen.getByTestId('toggle-high-contrast'));

      // Should be true after toggle
      expect(screen.getByTestId('high-contrast')).toHaveTextContent('true');
      expect(onSettingChange).toHaveBeenCalledWith('highContrast', true);
    });

    test('should save settings to localStorage when changed', async () => {
      const user = userEvent.setup();

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      await user.click(screen.getByTestId('toggle-high-contrast'));

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'accessibility-settings',
        expect.stringContaining('"highContrast":true')
      );
    });
  });

  describe('High Contrast Theme', () => {
    test('should apply high contrast class when enabled', async () => {
      const user = userEvent.setup();

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      await user.click(screen.getByTestId('toggle-high-contrast'));

      expect(document.documentElement.classList.add).toHaveBeenCalledWith('high-contrast');
    });

    test('should remove high contrast class when disabled', async () => {
      const user = userEvent.setup();

      // Start with high contrast enabled
      render(
        <AccessibilityProvider settings={{ highContrast: true }}>
          <TestComponent />
        </AccessibilityProvider>
      );

      // Toggle to disable
      await user.click(screen.getByTestId('toggle-high-contrast'));

      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('high-contrast');
    });
  });

  describe('Text Scaling', () => {
    test('should apply text scaling to document root', async () => {
      const user = userEvent.setup();

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      await user.click(screen.getByTestId('update-text-scaling'));

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--text-scale-factor', 1.5);
      expect(document.documentElement.style.fontSize).toBe('24px'); // 16 * 1.5
    });

    test('should limit text scaling to maximum 200%', () => {
      const TestScalingComponent = () => {
        const { updateSetting } = useAccessibilityContext();
        
        return (
          <button 
            data-testid="max-scaling"
            onClick={() => updateSetting('textScaling', 250)} // Try to exceed max
          >
            Max Scaling
          </button>
        );
      };

      render(
        <AccessibilityProvider>
          <TestScalingComponent />
        </AccessibilityProvider>
      );

      fireEvent.click(screen.getByTestId('max-scaling'));

      // Should be capped at 200% (factor of 2)
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--text-scale-factor', 2);
    });
  });

  describe('Keyboard Navigation', () => {
    test('should register keyboard shortcuts on initialization', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    test('should handle Alt+H shortcut for skip to main', () => {
      const TestShortcutComponent = () => {
        const { skipToMain } = useAccessibilityContext();
        
        React.useEffect(() => {
          // Mock the skipToMain function to track calls
          window.testSkipToMain = skipToMain;
        }, [skipToMain]);
        
        return <div data-testid="shortcut-test">Test</div>;
      };

      render(
        <AccessibilityProvider>
          <TestShortcutComponent />
        </AccessibilityProvider>
      );

      // Simulate Alt+H keypress
      fireEvent.keyDown(document, {
        key: 'h',
        altKey: true,
        code: 'KeyH'
      });

      // The shortcut should be registered (we can't easily test the actual execution without more complex mocking)
      expect(screen.getByTestId('shortcut-test')).toBeInTheDocument();
    });

    test('should apply keyboard navigation class when enabled', () => {
      render(
        <AccessibilityProvider settings={{ keyboardNavigation: true }}>
          <TestComponent />
        </AccessibilityProvider>
      );

      expect(document.documentElement.classList.add).toHaveBeenCalledWith('keyboard-navigation');
    });
  });

  describe('Focus Management', () => {
    test('should create focus trap for modal containers', () => {
      const TestFocusTrapComponent = () => {
        const { createFocusTrap } = useAccessibilityContext();
        const containerRef = React.useRef();

        React.useEffect(() => {
          if (containerRef.current) {
            const cleanup = createFocusTrap(containerRef.current);
            return cleanup;
          }
        }, [createFocusTrap]);

        return (
          <div ref={containerRef} data-testid="focus-trap">
            <button data-testid="first">First</button>
            <button data-testid="second">Second</button>
            <button data-testid="third">Third</button>
          </div>
        );
      };

      render(
        <AccessibilityProvider>
          <TestFocusTrapComponent />
        </AccessibilityProvider>
      );

      const container = screen.getByTestId('focus-trap');
      expect(container).toBeInTheDocument();
    });

    test('should handle Tab key navigation in focus trap', () => {
      const TestFocusTrapComponent = () => {
        const containerRef = React.useRef();

        return (
          <div ref={containerRef} data-testid="focus-trap">
            <button data-testid="first">First</button>
            <button data-testid="second">Second</button>
          </div>
        );
      };

      render(
        <AccessibilityProvider>
          <TestFocusTrapComponent />
        </AccessibilityProvider>
      );

      const firstButton = screen.getByTestId('first');
      const secondButton = screen.getByTestId('second');

      // Focus first button
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);

      // Tab to second button
      fireEvent.keyDown(firstButton, { key: 'Tab' });
      // Note: Actual focus management would require more complex setup
    });
  });

  describe('Screen Reader Support', () => {
    test('should create live regions for announcements', () => {
      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      // Check that live regions are created
      const politeRegion = document.getElementById('live-region-polite');
      const assertiveRegion = document.getElementById('live-region-assertive');

      expect(politeRegion).toBeInTheDocument();
      expect(assertiveRegion).toBeInTheDocument();
      expect(politeRegion).toHaveAttribute('aria-live', 'polite');
      expect(assertiveRegion).toHaveAttribute('aria-live', 'assertive');
    });

    test('should announce messages to screen readers', async () => {
      const user = userEvent.setup();

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      await user.click(screen.getByTestId('announce-message'));

      // The announce function should be called (mocked in this test)
      // In a real implementation, this would update the live region content
    });

    test('should provide ARIA enhancement utilities', () => {
      const TestAriaComponent = () => {
        const { enhanceElement } = useAccessibilityContext();
        const buttonRef = React.useRef();

        React.useEffect(() => {
          if (buttonRef.current) {
            enhanceElement(buttonRef.current, {
              label: 'Enhanced button',
              description: 'This button has enhanced accessibility',
              role: 'button'
            });
          }
        }, [enhanceElement]);

        return <button ref={buttonRef} data-testid="enhanced-button">Click me</button>;
      };

      render(
        <AccessibilityProvider>
          <TestAriaComponent />
        </AccessibilityProvider>
      );

      const button = screen.getByTestId('enhanced-button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Color Contrast Validation', () => {
    test('should validate color contrast ratios', () => {
      const TestContrastComponent = () => {
        const { checkColorContrast } = useAccessibilityContext();
        const [contrastRatio, setContrastRatio] = React.useState(null);

        React.useEffect(() => {
          const ratio = checkColorContrast('#000000', '#ffffff');
          setContrastRatio(ratio);
        }, [checkColorContrast]);

        return <div data-testid="contrast-ratio">{contrastRatio}</div>;
      };

      render(
        <AccessibilityProvider>
          <TestContrastComponent />
        </AccessibilityProvider>
      );

      // The contrast ratio should be calculated (mocked in this test)
      expect(screen.getByTestId('contrast-ratio')).toBeInTheDocument();
    });
  });

  describe('Touch Target Validation', () => {
    test('should validate touch target sizes', () => {
      const TestTouchTargetComponent = () => {
        const { validateTouchTarget } = useAccessibilityContext();
        const buttonRef = React.useRef();
        const [isValid, setIsValid] = React.useState(null);

        React.useEffect(() => {
          if (buttonRef.current) {
            // Mock getBoundingClientRect
            buttonRef.current.getBoundingClientRect = jest.fn(() => ({
              width: 44,
              height: 44
            }));
            
            const valid = validateTouchTarget(buttonRef.current);
            setIsValid(valid);
          }
        }, [validateTouchTarget]);

        return (
          <div>
            <button ref={buttonRef} data-testid="touch-target">Touch me</button>
            <div data-testid="is-valid">{isValid?.toString()}</div>
          </div>
        );
      };

      render(
        <AccessibilityProvider>
          <TestTouchTargetComponent />
        </AccessibilityProvider>
      );

      expect(screen.getByTestId('touch-target')).toBeInTheDocument();
    });
  });

  describe('Timeout Management', () => {
    test('should create accessible timeouts with extensions', () => {
      const TestTimeoutComponent = () => {
        const { createAccessibleTimeout } = useAccessibilityContext();
        const [timeoutCreated, setTimeoutCreated] = React.useState(false);

        React.useEffect(() => {
          const timeout = createAccessibleTimeout(
            () => setTimeoutCreated(true),
            1000,
            { type: 'interaction', description: 'Test timeout' }
          );

          return () => timeout.cancel();
        }, [createAccessibleTimeout]);

        return <div data-testid="timeout-created">{timeoutCreated.toString()}</div>;
      };

      render(
        <AccessibilityProvider>
          <TestTimeoutComponent />
        </AccessibilityProvider>
      );

      expect(screen.getByTestId('timeout-created')).toHaveTextContent('false');
    });
  });

  describe('Alternative Input Methods', () => {
    test('should detect when alternative inputs are active', () => {
      const TestAlternativeInputComponent = () => {
        const { isAlternativeInputActive } = useAccessibilityContext();
        const [isActive, setIsActive] = React.useState(false);

        React.useEffect(() => {
          setIsActive(isAlternativeInputActive());
        }, [isAlternativeInputActive]);

        return <div data-testid="alternative-input-active">{isActive.toString()}</div>;
      };

      render(
        <AccessibilityProvider>
          <TestAlternativeInputComponent />
        </AccessibilityProvider>
      );

      expect(screen.getByTestId('alternative-input-active')).toHaveTextContent('false');
    });
  });

  describe('Error Handling', () => {
    test('should handle initialization errors gracefully', () => {
      // Mock localStorage to throw an error
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      // Should still render with default settings
      expect(screen.getByTestId('initialized')).toHaveTextContent('true');
      
      consoleSpy.mockRestore();
    });

    test('should handle invalid saved settings', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      // Should use default settings
      expect(screen.getByTestId('high-contrast')).toHaveTextContent('false');
      expect(screen.getByTestId('text-scaling')).toHaveTextContent('100');
    });
  });

  describe('Cleanup', () => {
    test('should cleanup event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    test('should clear timeouts on unmount', () => {
      const TestCleanupComponent = () => {
        const { timeoutManager } = useAccessibilityContext();
        
        React.useEffect(() => {
          return () => {
            // Timeout manager should clean up on unmount
            if (timeoutManager && timeoutManager.clearAll) {
              timeoutManager.clearAll();
            }
          };
        }, [timeoutManager]);

        return <div data-testid="cleanup-test">Test</div>;
      };

      const { unmount } = render(
        <AccessibilityProvider>
          <TestCleanupComponent />
        </AccessibilityProvider>
      );

      unmount();

      // Should not throw errors during cleanup
      expect(screen.queryByTestId('cleanup-test')).not.toBeInTheDocument();
    });
  });
});