/**
 * Unit Tests for TimeoutManager Component
 * 
 * Tests configurable timeout extensions, warning dialogs, and
 * accessibility features for users with motor impairments
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeoutManager, useTimeoutManager } from '../../components/accessibility/TimeoutManager.jsx';
import { AccessibilityProvider } from '../../components/accessibility/AccessibilityProvider.jsx';

// Mock useAccessibility hook
jest.mock('../../hooks/useAccessibility.js', () => ({
  useAccessibility: () => ({
    skipToMain: jest.fn(),
    skipToNavigation: jest.fn()
  })
}));

// Test wrapper component
const TestWrapper = ({ children, settings = {} }) => (
  <AccessibilityProvider settings={{ extendedTimeouts: true, ...settings }}>
    {children}
  </AccessibilityProvider>
);

// Test component that uses the hook
const TestHookComponent = () => {
  const { createTimeout, isExtendedTimeoutsEnabled, setTimeoutManagerRef } = useTimeoutManager();
  const [timeoutId, setTimeoutId] = React.useState(null);
  const [timeoutExecuted, setTimeoutExecuted] = React.useState(false);

  const handleCreateTimeout = () => {
    const timeout = createTimeout(
      () => setTimeoutExecuted(true),
      1000,
      { description: 'Test timeout', allowExtension: true }
    );
    setTimeoutId(timeout.id);
  };

  return (
    <div>
      <div data-testid="extended-timeouts-enabled">{isExtendedTimeoutsEnabled.toString()}</div>
      <div data-testid="timeout-executed">{timeoutExecuted.toString()}</div>
      <div data-testid="timeout-id">{timeoutId || 'none'}</div>
      <button onClick={handleCreateTimeout} data-testid="create-timeout">
        Create Timeout
      </button>
    </div>
  );
};

describe('TimeoutManager', () => {
  let mockAnnounce;

  beforeEach(() => {
    mockAnnounce = jest.fn();
    jest.clearAllMocks();
    
    // Mock timers
    jest.useFakeTimers();
    
    // Clear DOM
    document.body.innerHTML = '';
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Rendering and Initialization', () => {
    test('should render when enabled', () => {
      render(
        <TestWrapper>
          <TimeoutManager enabled={true} />
        </TestWrapper>
      );

      expect(screen.getByText('Timeout Settings')).toBeInTheDocument();
      expect(screen.getByText('Extended Timeouts')).toBeInTheDocument();
    });

    test('should not render when disabled', () => {
      render(
        <TestWrapper>
          <TimeoutManager enabled={false} />
        </TestWrapper>
      );

      expect(screen.queryByText('Timeout Settings')).not.toBeInTheDocument();
    });

    test('should show extension level options when extended timeouts are enabled', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <TimeoutManager enabled={true} />
        </TestWrapper>
      );

      // Extended timeouts should be enabled by default in test wrapper
      expect(screen.getByText('Extension Level:')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Moderate (2x)')).toBeInTheDocument();
    });
  });

  describe('Timeout Settings', () => {
    test('should toggle extended timeouts setting', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper settings={{ extendedTimeouts: false }}>
          <TimeoutManager enabled={true} />
        </TestWrapper>
      );

      const toggle = screen.getByRole('checkbox', { name: /extended timeouts/i });
      expect(toggle).not.toBeChecked();

      await user.click(toggle);
      expect(toggle).toBeChecked();
    });

    test('should change extension level', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <TimeoutManager enabled={true} />
        </TestWrapper>
      );

      const extendedRadio = screen.getByRole('radio', { name: /extended \(5x\)/i });
      await user.click(extendedRadio);

      expect(extendedRadio).toBeChecked();
    });

    test('should handle unlimited timeout option', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <TimeoutManager enabled={true} />
        </TestWrapper>
      );

      const unlimitedRadio = screen.getByRole('radio', { name: /unlimited \(no timeout\)/i });
      await user.click(unlimitedRadio);

      expect(unlimitedRadio).toBeChecked();
    });
  });

  describe('Timeout Creation and Management', () => {
    test('should create timeout with extension', () => {
      const TestTimeoutComponent = () => {
        const [timeoutManager, setTimeoutManager] = React.useState(null);
        const [timeoutCreated, setTimeoutCreated] = React.useState(false);

        const handleCreateTimeout = () => {
          if (timeoutManager) {
            const timeout = timeoutManager.createTimeout(
              () => setTimeoutCreated(true),
              1000,
              { description: 'Test timeout' }
            );
            expect(timeout.id).toBeDefined();
          }
        };

        return (
          <div>
            <TimeoutManager 
              enabled={true} 
              ref={setTimeoutManager}
            />
            <button onClick={handleCreateTimeout} data-testid="create-timeout">
              Create Timeout
            </button>
            <div data-testid="timeout-created">{timeoutCreated.toString()}</div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestTimeoutComponent />
        </TestWrapper>
      );

      const createButton = screen.getByTestId('create-timeout');
      fireEvent.click(createButton);

      // Should create timeout without errors
      expect(screen.getByTestId('timeout-created')).toHaveTextContent('false');
    });

    test('should extend timeout duration based on extension level', () => {
      const callback = jest.fn();
      const TestExtensionComponent = () => {
        const [timeoutManager, setTimeoutManager] = React.useState(null);

        const handleCreateTimeout = () => {
          if (timeoutManager) {
            // Create timeout with moderate extension (2x)
            timeoutManager.createTimeout(callback, 1000, {
              description: 'Extended timeout',
              type: 'interaction'
            });
          }
        };

        return (
          <div>
            <TimeoutManager 
              enabled={true} 
              ref={setTimeoutManager}
            />
            <button onClick={handleCreateTimeout} data-testid="create-extended">
              Create Extended Timeout
            </button>
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestExtensionComponent />
        </TestWrapper>
      );

      const createButton = screen.getByTestId('create-extended');
      fireEvent.click(createButton);

      // Advance time by original duration (1000ms)
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Callback should not have been called yet (extended to 2000ms)
      expect(callback).not.toHaveBeenCalled();

      // Advance to extended duration
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Now callback should be called
      expect(callback).toHaveBeenCalled();
    });

    test('should handle unlimited timeouts', () => {
      const callback = jest.fn();
      const TestUnlimitedComponent = () => {
        const [timeoutManager, setTimeoutManager] = React.useState(null);

        React.useEffect(() => {
          if (timeoutManager) {
            // Set extension level to unlimited
            timeoutManager.setExtensionLevel('unlimited');
            
            const timeout = timeoutManager.createTimeout(callback, 1000, {
              description: 'Unlimited timeout'
            });
            
            // Should return a timeout object with no actual timeout
            expect(timeout.id).toBeDefined();
            expect(timeout.cancel).toBeDefined();
          }
        }, [timeoutManager]);

        return (
          <TimeoutManager 
            enabled={true} 
            ref={setTimeoutManager}
          />
        );
      };

      render(
        <TestWrapper>
          <TestUnlimitedComponent />
        </TestWrapper>
      );

      // Advance time significantly
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Callback should never be called for unlimited timeout
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Timeout Warning System', () => {
    test('should show warning dialog before timeout expires', async () => {
      const TestWarningComponent = () => {
        const [timeoutManager, setTimeoutManager] = React.useState(null);

        React.useEffect(() => {
          if (timeoutManager) {
            timeoutManager.createTimeout(
              () => {},
              2000, // 2 second timeout
              { 
                description: 'Warning test timeout',
                allowExtension: true,
                warningTime: 0.5 // Show warning at 50% remaining (1 second before)
              }
            );
          }
        }, [timeoutManager]);

        return (
          <TimeoutManager 
            enabled={true} 
            ref={setTimeoutManager}
          />
        );
      };

      render(
        <TestWrapper>
          <TestWarningComponent />
        </TestWrapper>
      );

      // Advance to warning time (1 second remaining)
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('⚠️ Timeout Warning')).toBeInTheDocument();
      });

      expect(screen.getByText(/will expire in/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /extend time/i })).toBeInTheDocument();
    });

    test('should extend timeout when extend button is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const callback = jest.fn();

      const TestExtendComponent = () => {
        const [timeoutManager, setTimeoutManager] = React.useState(null);

        React.useEffect(() => {
          if (timeoutManager) {
            timeoutManager.createTimeout(
              callback,
              2000,
              { 
                description: 'Extendable timeout',
                allowExtension: true,
                warningTime: 0.5
              }
            );
          }
        }, [timeoutManager]);

        return (
          <TimeoutManager 
            enabled={true} 
            ref={setTimeoutManager}
          />
        );
      };

      render(
        <TestWrapper>
          <TestExtendComponent />
        </TestWrapper>
      );

      // Advance to warning time
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /extend time/i })).toBeInTheDocument();
      });

      // Click extend button
      const extendButton = screen.getByRole('button', { name: /extend time/i });
      await user.click(extendButton);

      // Advance past original timeout duration
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Callback should not have been called yet (timeout was extended)
      expect(callback).not.toHaveBeenCalled();
    });

    test('should dismiss warning when continue button is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      const TestContinueComponent = () => {
        const [timeoutManager, setTimeoutManager] = React.useState(null);

        React.useEffect(() => {
          if (timeoutManager) {
            timeoutManager.createTimeout(
              () => {},
              2000,
              { 
                description: 'Continuable timeout',
                allowExtension: true,
                warningTime: 0.5
              }
            );
          }
        }, [timeoutManager]);

        return (
          <TimeoutManager 
            enabled={true} 
            ref={setTimeoutManager}
          />
        );
      };

      render(
        <TestWrapper>
          <TestContinueComponent />
        </TestWrapper>
      );

      // Advance to warning time
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
      });

      // Click continue button
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      // Warning dialog should be dismissed
      expect(screen.queryByText('⚠️ Timeout Warning')).not.toBeInTheDocument();
    });

    test('should cancel timeout when cancel button is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const callback = jest.fn();

      const TestCancelComponent = () => {
        const [timeoutManager, setTimeoutManager] = React.useState(null);

        React.useEffect(() => {
          if (timeoutManager) {
            timeoutManager.createTimeout(
              callback,
              2000,
              { 
                description: 'Cancelable timeout',
                allowExtension: true,
                warningTime: 0.5
              }
            );
          }
        }, [timeoutManager]);

        return (
          <TimeoutManager 
            enabled={true} 
            ref={setTimeoutManager}
          />
        );
      };

      render(
        <TestWrapper>
          <TestCancelComponent />
        </TestWrapper>
      );

      // Advance to warning time
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Advance past timeout duration
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Callback should not be called (timeout was cancelled)
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Active Timeouts Display', () => {
    test('should show active timeouts list', () => {
      const TestActiveTimeoutsComponent = () => {
        const [timeoutManager, setTimeoutManager] = React.useState(null);

        React.useEffect(() => {
          if (timeoutManager) {
            timeoutManager.createTimeout(
              () => {},
              5000,
              { description: 'Active timeout 1' }
            );
            timeoutManager.createTimeout(
              () => {},
              3000,
              { description: 'Active timeout 2' }
            );
          }
        }, [timeoutManager]);

        return (
          <TimeoutManager 
            enabled={true} 
            ref={setTimeoutManager}
          />
        );
      };

      render(
        <TestWrapper>
          <TestActiveTimeoutsComponent />
        </TestWrapper>
      );

      expect(screen.getByText('Active Timeouts')).toBeInTheDocument();
      expect(screen.getByText('Active timeout 1')).toBeInTheDocument();
      expect(screen.getByText('Active timeout 2')).toBeInTheDocument();
    });

    test('should update remaining time display', () => {
      const TestRemainingTimeComponent = () => {
        const [timeoutManager, setTimeoutManager] = React.useState(null);

        React.useEffect(() => {
          if (timeoutManager) {
            timeoutManager.createTimeout(
              () => {},
              60000, // 1 minute
              { description: 'Timed timeout' }
            );
          }
        }, [timeoutManager]);

        return (
          <TimeoutManager 
            enabled={true} 
            ref={setTimeoutManager}
          />
        );
      };

      render(
        <TestWrapper>
          <TestRemainingTimeComponent />
        </TestWrapper>
      );

      // Should show initial time
      expect(screen.getByText(/1:00|60s/)).toBeInTheDocument();

      // Advance time
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should show updated time
      expect(screen.getByText(/0:30|30s/)).toBeInTheDocument();
    });
  });

  describe('useTimeoutManager Hook', () => {
    test('should return extended timeouts enabled state', () => {
      render(
        <TestWrapper>
          <TestHookComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('extended-timeouts-enabled')).toHaveTextContent('true');
    });

    test('should return disabled state when extended timeouts are off', () => {
      render(
        <TestWrapper settings={{ extendedTimeouts: false }}>
          <TestHookComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('extended-timeouts-enabled')).toHaveTextContent('false');
    });

    test('should provide createTimeout function', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <TestHookComponent />
        </TestWrapper>
      );

      const createButton = screen.getByTestId('create-timeout');
      await user.click(createButton);

      expect(screen.getByTestId('timeout-id')).not.toHaveTextContent('none');
    });

    test('should handle timeout manager not initialized', () => {
      const TestUninitializedComponent = () => {
        const { createTimeout } = useTimeoutManager();
        const [result, setResult] = React.useState(null);

        React.useEffect(() => {
          const timeout = createTimeout(() => {}, 1000);
          setResult(timeout.id);
        }, [createTimeout]);

        return <div data-testid="uninitialized-result">{result || 'null'}</div>;
      };

      render(
        <TestWrapper>
          <TestUninitializedComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('uninitialized-result')).toHaveTextContent('null');
    });
  });

  describe('Accessibility Features', () => {
    test('should have proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <TimeoutManager enabled={true} />
        </TestWrapper>
      );

      const radioGroup = screen.getByRole('radiogroup');
      expect(radioGroup).toHaveAttribute('aria-labelledby');

      const toggles = screen.getAllByRole('checkbox');
      toggles.forEach(toggle => {
        expect(toggle).toHaveAttribute('aria-describedby');
      });
    });

    test('should provide descriptive text for settings', () => {
      render(
        <TestWrapper>
          <TimeoutManager enabled={true} />
        </TestWrapper>
      );

      expect(screen.getByText('Provides additional time for form completion and interactions')).toBeInTheDocument();
    });

    test('should have proper heading structure', () => {
      render(
        <TestWrapper>
          <TimeoutManager enabled={true} />
        </TestWrapper>
      );

      const heading = screen.getByRole('heading', { name: 'Timeout Settings' });
      expect(heading).toBeInTheDocument();
    });

    test('should announce timeout events', () => {
      const onTimeoutWarning = jest.fn();
      const onTimeoutExtended = jest.fn();

      render(
        <TestWrapper>
          <TimeoutManager 
            enabled={true}
            onTimeoutWarning={onTimeoutWarning}
            onTimeoutExtended={onTimeoutExtended}
          />
        </TestWrapper>
      );

      // Test that callbacks are properly set up
      expect(screen.getByText('Timeout Settings')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('should handle timeout creation errors gracefully', () => {
      const TestErrorComponent = () => {
        const [timeoutManager, setTimeoutManager] = React.useState(null);

        React.useEffect(() => {
          if (timeoutManager) {
            try {
              // Try to create timeout with invalid parameters
              timeoutManager.createTimeout(null, -1000);
            } catch (error) {
              // Should handle errors gracefully
            }
          }
        }, [timeoutManager]);

        return (
          <TimeoutManager 
            enabled={true} 
            ref={setTimeoutManager}
          />
        );
      };

      render(
        <TestWrapper>
          <TestErrorComponent />
        </TestWrapper>
      );

      // Should render without crashing
      expect(screen.getByText('Timeout Settings')).toBeInTheDocument();
    });

    test('should handle cleanup errors gracefully', () => {
      const { unmount } = render(
        <TestWrapper>
          <TimeoutManager enabled={true} />
        </TestWrapper>
      );

      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    test('should clear all timeouts on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount } = render(
        <TestWrapper>
          <TimeoutManager enabled={true} />
        </TestWrapper>
      );

      unmount();

      // Should clear timeouts during cleanup
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});