/**
 * Unit Tests for AlternativeInputMethods Component
 * 
 * Tests dwell clicking, switch input, voice commands, and other
 * alternative input methods for users with motor impairments
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlternativeInputMethods, useAlternativeInputMethods } from '../../components/accessibility/AlternativeInputMethods.jsx';
import { AccessibilityProvider } from '../../components/accessibility/AccessibilityProvider.jsx';

// Mock useAccessibility hook
jest.mock('../../hooks/useAccessibility.js', () => ({
  useAccessibility: () => ({
    skipToMain: jest.fn(),
    skipToNavigation: jest.fn()
  })
}));

// Mock navigator.mediaDevices for camera access testing
const mockGetUserMedia = jest.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia
  },
  writable: true
});

// Mock navigator.getGamepads for switch input testing
Object.defineProperty(navigator, 'getGamepads', {
  value: jest.fn(() => []),
  writable: true
});

// Test wrapper component
const TestWrapper = ({ children, settings = {} }) => (
  <AccessibilityProvider settings={{ alternativeInputs: true, ...settings }}>
    {children}
  </AccessibilityProvider>
);

// Test component that uses the hook
const TestHookComponent = () => {
  const { isEnabled, supportedMethods } = useAlternativeInputMethods();
  
  return (
    <div>
      <div data-testid="is-enabled">{isEnabled.toString()}</div>
      <div data-testid="supported-methods">{supportedMethods.join(',')}</div>
    </div>
  );
};

describe('AlternativeInputMethods', () => {
  let mockAnnounce;

  beforeEach(() => {
    mockAnnounce = jest.fn();
    
    // Reset mocks
    mockGetUserMedia.mockReset();
    jest.clearAllMocks();
    
    // Mock DOM methods
    Element.prototype.scrollIntoView = jest.fn();
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 100,
      height: 50
    }));
    
    // Clear DOM
    document.body.innerHTML = '';
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering and Initialization', () => {
    test('should render when enabled', () => {
      render(
        <TestWrapper>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      expect(screen.getByText('Alternative Input Methods')).toBeInTheDocument();
      expect(screen.getByText('Standard Input')).toBeInTheDocument();
      expect(screen.getByText('Dwell Clicking')).toBeInTheDocument();
      expect(screen.getByText('Switch Input')).toBeInTheDocument();
    });

    test('should not render when disabled', () => {
      render(
        <TestWrapper settings={{ alternativeInputs: false }}>
          <AlternativeInputMethods enabled={false} />
        </TestWrapper>
      );

      expect(screen.queryByText('Alternative Input Methods')).not.toBeInTheDocument();
    });

    test('should check available input methods on mount', async () => {
      mockGetUserMedia.mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }]
      });

      render(
        <TestWrapper>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({ video: true });
      });
    });

    test('should handle camera access denial gracefully', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Camera access denied'));

      render(
        <TestWrapper>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });

      // Should still render without errors
      expect(screen.getByText('Alternative Input Methods')).toBeInTheDocument();
    });
  });

  describe('Input Method Selection', () => {
    test('should start with standard input method', () => {
      render(
        <TestWrapper>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      const standardButton = screen.getByRole('button', { name: /standard input/i });
      expect(standardButton).toHaveAttribute('aria-pressed', 'true');
    });

    test('should change input method when clicked', async () => {
      const user = userEvent.setup();
      const onInputMethodChange = jest.fn();

      render(
        <TestWrapper>
          <AlternativeInputMethods 
            enabled={true} 
            onInputMethodChange={onInputMethodChange}
          />
        </TestWrapper>
      );

      const dwellButton = screen.getByRole('button', { name: /dwell clicking/i });
      await user.click(dwellButton);

      expect(dwellButton).toHaveAttribute('aria-pressed', 'true');
      expect(onInputMethodChange).toHaveBeenCalledWith('dwell');
    });

    test('should show unavailable methods as disabled', () => {
      render(
        <TestWrapper>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      const eyeTrackingButton = screen.getByRole('button', { name: /eye tracking/i });
      expect(eyeTrackingButton).toBeDisabled();
      expect(screen.getByText('Not Available')).toBeInTheDocument();
    });

    test('should prevent selection of unavailable methods', async () => {
      const user = userEvent.setup();
      const onInputMethodChange = jest.fn();

      render(
        <TestWrapper>
          <AlternativeInputMethods 
            enabled={true} 
            onInputMethodChange={onInputMethodChange}
          />
        </TestWrapper>
      );

      const eyeTrackingButton = screen.getByRole('button', { name: /eye tracking/i });
      await user.click(eyeTrackingButton);

      expect(onInputMethodChange).not.toHaveBeenCalled();
    });
  });

  describe('Dwell Clicking', () => {
    test('should show dwell time settings when dwell clicking is selected', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      const dwellButton = screen.getByRole('button', { name: /dwell clicking/i });
      await user.click(dwellButton);

      expect(screen.getByText(/Dwell Time:/)).toBeInTheDocument();
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    test('should update dwell time when slider changes', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      // Select dwell clicking
      const dwellButton = screen.getByRole('button', { name: /dwell clicking/i });
      await user.click(dwellButton);

      // Change dwell time
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '2000' } });

      expect(screen.getByText('Dwell Time: 2000ms')).toBeInTheDocument();
    });

    test('should set up dwell clicking event listeners', async () => {
      const user = userEvent.setup();
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      render(
        <TestWrapper>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      const dwellButton = screen.getByRole('button', { name: /dwell clicking/i });
      await user.click(dwellButton);

      // Should set up mouse event listeners for dwell clicking
      expect(addEventListenerSpy).toHaveBeenCalledWith('mouseenter', expect.any(Function), true);
      expect(addEventListenerSpy).toHaveBeenCalledWith('mouseleave', expect.any(Function), true);
    });
  });

  describe('Switch Input', () => {
    test('should set up switch input when selected', async () => {
      const user = userEvent.setup();
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      render(
        <TestWrapper>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      const switchButton = screen.getByRole('button', { name: /switch input/i });
      await user.click(switchButton);

      // Should set up keyboard event listener for switch input
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    test('should handle keyboard navigation in switch mode', async () => {
      const user = userEvent.setup();

      // Create test buttons for switch navigation
      document.body.innerHTML = `
        <button id="test-button-1">Button 1</button>
        <button id="test-button-2">Button 2</button>
      `;

      render(
        <TestWrapper>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      const switchButton = screen.getByRole('button', { name: /switch input/i });
      await user.click(switchButton);

      // Simulate arrow key navigation
      fireEvent.keyDown(document, { code: 'ArrowDown' });
      fireEvent.keyDown(document, { code: 'Space' });

      // Should handle the key events without errors
      expect(screen.getByText('Alternative Input Methods')).toBeInTheDocument();
    });
  });

  describe('Voice Commands Integration', () => {
    test('should show voice commands option when available', () => {
      render(
        <TestWrapper settings={{ voiceCommands: true }}>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      expect(screen.getByText('Voice Control')).toBeInTheDocument();
    });

    test('should not show voice commands when disabled', () => {
      render(
        <TestWrapper settings={{ voiceCommands: false }}>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      const voiceButton = screen.queryByRole('button', { name: /voice control/i });
      expect(voiceButton).toBeDisabled();
    });
  });

  describe('Calibration', () => {
    test('should handle calibration process', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      const calibrateButton = screen.getByRole('button', { name: /calibrate/i });
      await user.click(calibrateButton);

      expect(screen.getByText('Calibrating...')).toBeInTheDocument();

      // Wait for calibration to complete
      await waitFor(() => {
        expect(screen.getByText('Calibrate')).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    test('should disable calibrate button during calibration', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      const calibrateButton = screen.getByRole('button', { name: /calibrate/i });
      await user.click(calibrateButton);

      expect(calibrateButton).toBeDisabled();
    });
  });

  describe('Status Display', () => {
    test('should show current method status', () => {
      render(
        <TestWrapper>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveTextContent('Current method: Standard Input');
    });

    test('should update status when method changes', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      const dwellButton = screen.getByRole('button', { name: /dwell clicking/i });
      await user.click(dwellButton);

      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveTextContent('Current method: Dwell Clicking');
    });

    test('should show calibration status', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      const calibrateButton = screen.getByRole('button', { name: /calibrate/i });
      await user.click(calibrateButton);

      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveTextContent('(Calibrating...)');
    });
  });

  describe('Accessibility Features', () => {
    test('should have proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      const dwellButton = screen.getByRole('button', { name: /dwell clicking/i });
      expect(dwellButton).toHaveAttribute('aria-pressed');
      expect(dwellButton).toHaveAttribute('aria-describedby');
    });

    test('should provide descriptive text for each method', () => {
      render(
        <TestWrapper>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      expect(screen.getByText('Click by hovering for a set time')).toBeInTheDocument();
      expect(screen.getByText('Single or dual switch navigation')).toBeInTheDocument();
      expect(screen.getByText('Eye gaze control (requires compatible hardware)')).toBeInTheDocument();
    });

    test('should have proper heading structure', () => {
      render(
        <TestWrapper>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      const heading = screen.getByRole('heading', { name: 'Alternative Input Methods' });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('useAlternativeInputMethods Hook', () => {
    test('should return enabled state', () => {
      render(
        <TestWrapper>
          <TestHookComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('is-enabled')).toHaveTextContent('true');
    });

    test('should return supported methods', () => {
      render(
        <TestWrapper>
          <TestHookComponent />
        </TestWrapper>
      );

      const supportedMethods = screen.getByTestId('supported-methods').textContent;
      expect(supportedMethods).toContain('standard');
      expect(supportedMethods).toContain('dwell');
      expect(supportedMethods).toContain('switch');
    });

    test('should reflect disabled state', () => {
      render(
        <TestWrapper settings={{ alternativeInputs: false }}>
          <TestHookComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('is-enabled')).toHaveTextContent('false');
    });
  });

  describe('Cleanup', () => {
    test('should cleanup event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = render(
        <TestWrapper>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalled();
    });

    test('should clear timers on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount } = render(
        <TestWrapper>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      unmount();

      // Should not throw errors during cleanup
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(0); // No active timers to clear
    });
  });

  describe('Error Handling', () => {
    test('should handle errors during input method setup', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock an error during setup
      mockGetUserMedia.mockRejectedValue(new Error('Setup failed'));

      render(
        <TestWrapper>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      const dwellButton = screen.getByRole('button', { name: /dwell clicking/i });
      await user.click(dwellButton);

      // Should handle errors gracefully
      expect(screen.getByText('Alternative Input Methods')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    test('should handle missing DOM elements gracefully', async () => {
      const user = userEvent.setup();

      // Mock querySelector to return null
      const originalQuerySelector = document.querySelector;
      document.querySelector = jest.fn(() => null);

      render(
        <TestWrapper>
          <AlternativeInputMethods enabled={true} />
        </TestWrapper>
      );

      const switchButton = screen.getByRole('button', { name: /switch input/i });
      await user.click(switchButton);

      // Should not throw errors
      expect(screen.getByText('Alternative Input Methods')).toBeInTheDocument();

      document.querySelector = originalQuerySelector;
    });
  });
});