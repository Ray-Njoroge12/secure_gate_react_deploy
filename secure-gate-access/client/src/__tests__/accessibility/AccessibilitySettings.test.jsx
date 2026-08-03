/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccessibilitySettings from '../../components/accessibility/AccessibilitySettings.jsx';

// Mock AccessibilityProvider context
const mockAccessibilityContext = {
  settings: {
    highContrast: false,
    reducedMotion: false,
    textScaling: 100,
    keyboardNavigation: true,
    skipLinks: true,
    focusIndicators: true,
    screenReaderSupport: true,
    announcements: true,
    descriptiveText: true,
    extendedTimeouts: false,
    timeoutExtensionLevel: 'none',
    alternativeInputs: false,
    dwellClickingEnabled: false,
    dwellClickingTime: 1000,
    switchInputEnabled: false,
    switchScanningSpeed: 1000,
    voiceCommands: false
  },
  updateSetting: jest.fn(),
  toggleSetting: jest.fn(),
  announce: jest.fn(),
  checkColorContrast: jest.fn(() => 4.5)
};

jest.mock('../../components/accessibility/AccessibilityProvider.jsx', () => ({
  useAccessibilityContext: () => mockAccessibilityContext
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AccessibilitySettings Component', () => {
  describe('Rendering', () => {
    test('renders accessibility settings dialog', () => {
      render(<AccessibilitySettings />);
      
      expect(screen.getByRole('dialog', { name: /accessibility settings/i })).toBeInTheDocument();
      expect(screen.getByText('Accessibility Settings')).toBeInTheDocument();
    });

    test('renders all tab options', () => {
      render(<AccessibilitySettings />);
      
      expect(screen.getByRole('tab', { name: /visual/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /navigation/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /audio/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /interaction/i })).toBeInTheDocument();
    });

    test('applies custom className', () => {
      const { container } = render(<AccessibilitySettings className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('accessibility-settings', 'custom-class');
    });

    test('renders close button when onClose provided', () => {
      const mockOnClose = jest.fn();
      render(<AccessibilitySettings onClose={mockOnClose} />);
      
      const closeButton = screen.getByRole('button', { name: /close accessibility settings/i });
      expect(closeButton).toBeInTheDocument();
    });

    test('does not render close button when onClose not provided', () => {
      render(<AccessibilitySettings />);
      
      expect(screen.queryByRole('button', { name: /close accessibility settings/i })).not.toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    test('starts with visual tab active', () => {
      render(<AccessibilitySettings />);
      
      const visualTab = screen.getByRole('tab', { name: /visual/i });
      expect(visualTab).toHaveAttribute('aria-selected', 'true');
      expect(visualTab).toHaveClass('accessibility-settings__tab--active');
    });

    test('switches tabs on click', async () => {
      const user = userEvent.setup();
      render(<AccessibilitySettings />);
      
      const navigationTab = screen.getByRole('tab', { name: /navigation/i });
      await user.click(navigationTab);
      
      expect(navigationTab).toHaveAttribute('aria-selected', 'true');
      expect(navigationTab).toHaveClass('accessibility-settings__tab--active');
      
      expect(mockAccessibilityContext.announce).toHaveBeenCalledWith('Switched to Navigation settings');
    });

    test('shows correct panel content for each tab', async () => {
      const user = userEvent.setup();
      render(<AccessibilitySettings />);
      
      // Visual tab (default)
      expect(screen.getByText('Display Preferences')).toBeInTheDocument();
      
      // Navigation tab
      await user.click(screen.getByRole('tab', { name: /navigation/i }));
      expect(screen.getByText('Keyboard Navigation')).toBeInTheDocument();
      
      // Audio tab
      await user.click(screen.getByRole('tab', { name: /audio/i }));
      expect(screen.getByText('Screen Reader Support')).toBeInTheDocument();
      
      // Interaction tab
      await user.click(screen.getByRole('tab', { name: /interaction/i }));
      expect(screen.getByText('Input & Timing')).toBeInTheDocument();
    });

    test('has proper ARIA attributes for tabs', () => {
      render(<AccessibilitySettings />);
      
      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();
      
      const visualTab = screen.getByRole('tab', { name: /visual/i });
      expect(visualTab).toHaveAttribute('aria-controls', 'panel-visual');
      
      const visualPanel = screen.getByRole('tabpanel');
      expect(visualPanel).toHaveAttribute('id', 'panel-visual');
    });
  });

  describe('Visual Settings', () => {
    test('renders high contrast toggle', () => {
      render(<AccessibilitySettings />);
      
      const toggle = screen.getByRole('checkbox', { name: /high contrast mode/i });
      expect(toggle).toBeInTheDocument();
      expect(toggle).not.toBeChecked();
    });

    test('toggles high contrast setting', async () => {
      const user = userEvent.setup();
      render(<AccessibilitySettings />);
      
      const toggle = screen.getByRole('checkbox', { name: /high contrast mode/i });
      await user.click(toggle);
      
      expect(mockAccessibilityContext.toggleSetting).toHaveBeenCalledWith('highContrast');
    });

    test('renders reduced motion toggle', () => {
      render(<AccessibilitySettings />);
      
      const toggle = screen.getByRole('checkbox', { name: /reduce motion/i });
      expect(toggle).toBeInTheDocument();
      expect(toggle).not.toBeChecked();
    });

    test('renders text scaling slider', () => {
      render(<AccessibilitySettings />);
      
      const slider = screen.getByRole('slider', { name: /text size: 100%/i });
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveValue('100');
    });

    test('updates text scaling', async () => {
      const user = userEvent.setup();
      render(<AccessibilitySettings />);
      
      const slider = screen.getByRole('slider', { name: /text size: 100%/i });
      await user.clear(slider);
      await user.type(slider, '150');
      
      expect(mockAccessibilityContext.updateSetting).toHaveBeenCalledWith('textScaling', 150);
      expect(mockAccessibilityContext.announce).toHaveBeenCalledWith('Text scaling set to 150%');
    });

    test('shows color contrast tester when advanced enabled', () => {
      render(<AccessibilitySettings showAdvanced={true} />);
      
      expect(screen.getByText('Color Contrast Tester')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /test contrast/i })).toBeInTheDocument();
    });

    test('hides color contrast tester when advanced disabled', () => {
      render(<AccessibilitySettings showAdvanced={false} />);
      
      expect(screen.queryByText('Color Contrast Tester')).not.toBeInTheDocument();
    });

    test('tests color contrast', async () => {
      const user = userEvent.setup();
      mockAccessibilityContext.checkColorContrast.mockReturnValue(7.2);
      
      render(<AccessibilitySettings showAdvanced={true} />);
      
      const testButton = screen.getByRole('button', { name: /test contrast/i });
      await user.click(testButton);
      
      expect(mockAccessibilityContext.checkColorContrast).toHaveBeenCalledWith('#000000', '#ffffff');
      expect(mockAccessibilityContext.announce).toHaveBeenCalledWith(
        'Color contrast ratio is 7.20:1. Passes WCAG AA standards',
        'assertive'
      );
    });

    test('reports failing color contrast', async () => {
      const user = userEvent.setup();
      mockAccessibilityContext.checkColorContrast.mockReturnValue(2.1);
      
      render(<AccessibilitySettings showAdvanced={true} />);
      
      const testButton = screen.getByRole('button', { name: /test contrast/i });
      await user.click(testButton);
      
      expect(mockAccessibilityContext.announce).toHaveBeenCalledWith(
        'Color contrast ratio is 2.10:1. Fails WCAG AA standards',
        'assertive'
      );
    });
  });

  describe('Navigation Settings', () => {
    test('renders keyboard navigation settings', async () => {
      const user = userEvent.setup();
      render(<AccessibilitySettings />);
      
      await user.click(screen.getByRole('tab', { name: /navigation/i }));
      
      expect(screen.getByRole('checkbox', { name: /enhanced keyboard navigation/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /skip links/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /enhanced focus indicators/i })).toBeInTheDocument();
    });

    test('toggles keyboard navigation settings', async () => {
      const user = userEvent.setup();
      render(<AccessibilitySettings />);
      
      await user.click(screen.getByRole('tab', { name: /navigation/i }));
      
      const keyboardNavToggle = screen.getByRole('checkbox', { name: /enhanced keyboard navigation/i });
      await user.click(keyboardNavToggle);
      
      expect(mockAccessibilityContext.toggleSetting).toHaveBeenCalledWith('keyboardNavigation');
    });
  });

  describe('Audio Settings', () => {
    test('renders screen reader settings', async () => {
      const user = userEvent.setup();
      render(<AccessibilitySettings />);
      
      await user.click(screen.getByRole('tab', { name: /audio/i }));
      
      expect(screen.getByRole('checkbox', { name: /screen reader optimization/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /live announcements/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /descriptive text/i })).toBeInTheDocument();
    });

    test('toggles screen reader settings', async () => {
      const user = userEvent.setup();
      render(<AccessibilitySettings />);
      
      await user.click(screen.getByRole('tab', { name: /audio/i }));
      
      const screenReaderToggle = screen.getByRole('checkbox', { name: /screen reader optimization/i });
      await user.click(screenReaderToggle);
      
      expect(mockAccessibilityContext.toggleSetting).toHaveBeenCalledWith('screenReaderSupport');
    });
  });

  describe('Interaction Settings', () => {
    test('renders timeout settings', async () => {
      const user = userEvent.setup();
      render(<AccessibilitySettings />);
      
      await user.click(screen.getByRole('tab', { name: /interaction/i }));
      
      expect(screen.getByRole('checkbox', { name: /extended timeouts/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /alternative input methods/i })).toBeInTheDocument();
    });

    test('shows timeout extension level when extended timeouts enabled', async () => {
      const user = userEvent.setup();
      mockAccessibilityContext.settings.extendedTimeouts = true;
      
      render(<AccessibilitySettings />);
      
      await user.click(screen.getByRole('tab', { name: /interaction/i }));
      
      expect(screen.getByRole('combobox', { name: /timeout extension level/i })).toBeInTheDocument();
    });

    test('hides timeout extension level when extended timeouts disabled', async () => {
      const user = userEvent.setup();
      mockAccessibilityContext.settings.extendedTimeouts = false;
      
      render(<AccessibilitySettings />);
      
      await user.click(screen.getByRole('tab', { name: /interaction/i }));
      
      expect(screen.queryByRole('combobox', { name: /timeout extension level/i })).not.toBeInTheDocument();
    });

    test('updates timeout extension level', async () => {
      const user = userEvent.setup();
      mockAccessibilityContext.settings.extendedTimeouts = true;
      
      render(<AccessibilitySettings />);
      
      await user.click(screen.getByRole('tab', { name: /interaction/i }));
      
      const select = screen.getByRole('combobox', { name: /timeout extension level/i });
      await user.selectOptions(select, 'extended');
      
      expect(mockAccessibilityContext.updateSetting).toHaveBeenCalledWith('timeoutExtensionLevel', 'extended');
    });

    test('shows alternative input subsettings when enabled', async () => {
      const user = userEvent.setup();
      mockAccessibilityContext.settings.alternativeInputs = true;
      
      render(<AccessibilitySettings />);
      
      await user.click(screen.getByRole('tab', { name: /interaction/i }));
      
      expect(screen.getByRole('checkbox', { name: /dwell clicking/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /switch input/i })).toBeInTheDocument();
    });

    test('shows dwell time slider when dwell clicking enabled', async () => {
      const user = userEvent.setup();
      mockAccessibilityContext.settings.alternativeInputs = true;
      mockAccessibilityContext.settings.dwellClickingEnabled = true;
      
      render(<AccessibilitySettings />);
      
      await user.click(screen.getByRole('tab', { name: /interaction/i }));
      
      expect(screen.getByRole('slider', { name: /dwell time: 1000ms/i })).toBeInTheDocument();
    });

    test('shows switch scanning speed when switch input enabled', async () => {
      const user = userEvent.setup();
      mockAccessibilityContext.settings.alternativeInputs = true;
      mockAccessibilityContext.settings.switchInputEnabled = true;
      
      render(<AccessibilitySettings />);
      
      await user.click(screen.getByRole('tab', { name: /interaction/i }));
      
      expect(screen.getByRole('slider', { name: /scanning speed: 1000ms/i })).toBeInTheDocument();
    });

    test('shows voice commands when advanced enabled', async () => {
      const user = userEvent.setup();
      render(<AccessibilitySettings showAdvanced={true} />);
      
      await user.click(screen.getByRole('tab', { name: /interaction/i }));
      
      expect(screen.getByRole('checkbox', { name: /voice commands \(beta\)/i })).toBeInTheDocument();
    });

    test('hides voice commands when advanced disabled', async () => {
      const user = userEvent.setup();
      render(<AccessibilitySettings showAdvanced={false} />);
      
      await user.click(screen.getByRole('tab', { name: /interaction/i }));
      
      expect(screen.queryByRole('checkbox', { name: /voice commands \(beta\)/i })).not.toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    test('calls onClose when close button clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();
      
      render(<AccessibilitySettings onClose={mockOnClose} />);
      
      const closeButton = screen.getByRole('button', { name: /close accessibility settings/i });
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility Features', () => {
    test('has proper ARIA attributes', () => {
      render(<AccessibilitySettings />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'accessibility-settings-title');
      
      const title = screen.getByText('Accessibility Settings');
      expect(title).toHaveAttribute('id', 'accessibility-settings-title');
    });

    test('associates form controls with descriptions', () => {
      render(<AccessibilitySettings />);
      
      const highContrastToggle = screen.getByRole('checkbox', { name: /high contrast mode/i });
      expect(highContrastToggle).toHaveAttribute('aria-describedby', 'high-contrast-desc');
      
      const description = screen.getByText('Increases color contrast for better visibility');
      expect(description).toHaveAttribute('id', 'high-contrast-desc');
    });

    test('supports keyboard navigation between tabs', async () => {
      const user = userEvent.setup();
      render(<AccessibilitySettings />);
      
      const visualTab = screen.getByRole('tab', { name: /visual/i });
      const navigationTab = screen.getByRole('tab', { name: /navigation/i });
      
      // Focus first tab
      visualTab.focus();
      expect(visualTab).toHaveFocus();
      
      // Tab to next tab
      await user.tab();
      expect(navigationTab).toHaveFocus();
    });

    test('supports keyboard activation of tabs', async () => {
      const user = userEvent.setup();
      render(<AccessibilitySettings />);
      
      const navigationTab = screen.getByRole('tab', { name: /navigation/i });
      navigationTab.focus();
      
      await user.keyboard('{Enter}');
      
      expect(navigationTab).toHaveAttribute('aria-selected', 'true');
      expect(mockAccessibilityContext.announce).toHaveBeenCalledWith('Switched to Navigation settings');
    });
  });

  describe('Settings Persistence', () => {
    test('displays current setting values', () => {
      mockAccessibilityContext.settings.highContrast = true;
      mockAccessibilityContext.settings.textScaling = 150;
      
      render(<AccessibilitySettings />);
      
      const highContrastToggle = screen.getByRole('checkbox', { name: /high contrast mode/i });
      expect(highContrastToggle).toBeChecked();
      
      const textSlider = screen.getByRole('slider', { name: /text size: 150%/i });
      expect(textSlider).toHaveValue('150');
    });

    test('shows persistence information', () => {
      render(<AccessibilitySettings />);
      
      expect(screen.getByText('These settings are saved locally and will persist across sessions.')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles missing context gracefully', () => {
      // Mock missing context
      jest.doMock('../../components/accessibility/AccessibilityProvider.jsx', () => ({
        useAccessibilityContext: () => ({
          settings: {},
          updateSetting: jest.fn(),
          toggleSetting: jest.fn(),
          announce: jest.fn(),
          checkColorContrast: jest.fn(() => 1)
        })
      }));
      
      expect(() => render(<AccessibilitySettings />)).not.toThrow();
    });

    test('handles color input changes', async () => {
      const user = userEvent.setup();
      render(<AccessibilitySettings showAdvanced={true} />);
      
      const foregroundInput = screen.getByDisplayValue('#000000');
      await user.clear(foregroundInput);
      await user.type(foregroundInput, '#ff0000');
      
      // Should not throw error
      expect(foregroundInput).toHaveValue('#ff0000');
    });

    test('handles slider value changes', async () => {
      const user = userEvent.setup();
      mockAccessibilityContext.settings.dwellClickingEnabled = true;
      mockAccessibilityContext.settings.alternativeInputs = true;
      
      render(<AccessibilitySettings />);
      
      await user.click(screen.getByRole('tab', { name: /interaction/i }));
      
      const dwellSlider = screen.getByRole('slider', { name: /dwell time: 1000ms/i });
      fireEvent.change(dwellSlider, { target: { value: '2000' } });
      
      expect(mockAccessibilityContext.updateSetting).toHaveBeenCalledWith('dwellClickingTime', 2000);
    });
  });
});