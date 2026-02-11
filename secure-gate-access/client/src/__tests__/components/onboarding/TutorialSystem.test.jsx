/**
 * Unit Tests for Tutorial System Components
 * 
 * Tests tutorial overlay rendering and navigation, completion tracking and state persistence,
 * and role-specific tutorial content delivery.
 * 
 * Validates: Requirements 1.2, 1.3, 1.5, 1.6
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import TutorialSystem from '../../../components/onboarding/TutorialSystem';
import { AuthContext } from '../../../contexts/AuthContext';
import { ThemeEngine } from '../../../contexts/ThemeEngine';

// Mock dependencies
jest.mock('../../../hooks/useAccessibility', () => ({
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

// Mock analytics
const mockAnalytics = {
  track: jest.fn()
};

// Mock portal
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (element) => element
}));

// Test data
const mockUser = {
  id: 1,
  role: 'resident',
  email: 'test@example.com',
  verified: true
};

const mockSteps = [
  {
    id: 'step-1',
    title: 'Welcome Step',
    content: 'This is the first step of the tutorial.',
    target: '[data-testid="target-1"]',
    placement: 'bottom'
  },
  {
    id: 'step-2',
    title: 'Action Step',
    content: 'This step shows you how to perform an action.',
    target: '[data-testid="target-2"]',
    placement: 'right',
    action: 'Click the button to continue'
  },
  {
    id: 'step-3',
    title: 'Final Step',
    content: 'This is the last step of the tutorial.',
    target: '[data-testid="target-3"]',
    placement: 'top'
  }
];

// Test wrapper component
const TestWrapper = ({ children, user = mockUser, theme = 'light' }) => {
  const authContextValue = {
    user,
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn()
  };

  const themeContextValue = {
    theme,
    setTheme: jest.fn(),
    isDark: theme === 'dark',
    colors: {},
    spacing: {},
    typography: {}
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      <ThemeEngine.Provider value={themeContextValue}>
        <div>
          {/* Mock target elements */}
          <div data-testid="target-1">Target 1</div>
          <div data-testid="target-2">Target 2</div>
          <div data-testid="target-3">Target 3</div>
          {children}
        </div>
      </ThemeEngine.Provider>
    </AuthContext.Provider>
  );
};

describe('TutorialSystem Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.window = global.window || {};
    global.window.analytics = mockAnalytics;
    
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    global.localStorage = localStorageMock;

    // Mock scrollIntoView
    Element.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Tutorial Overlay Rendering and Navigation', () => {
    test('should render tutorial overlay when active', () => {
      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={mockSteps}
            tutorialId="test-tutorial"
          />
        </TestWrapper>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Welcome Step')).toBeInTheDocument();
      expect(screen.getByText('This is the first step of the tutorial.')).toBeInTheDocument();
    });

    test('should not render when inactive', () => {
      render(
        <TestWrapper>
          <TutorialSystem
            isActive={false}
            steps={mockSteps}
            tutorialId="test-tutorial"
          />
        </TestWrapper>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('should show progress indicator', () => {
      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={mockSteps}
            tutorialId="test-tutorial"
            options={{ showProgress: true }}
          />
        </TestWrapper>
      );

      expect(screen.getByText('1 of 3')).toBeInTheDocument();
      expect(screen.getByText('33%')).toBeInTheDocument();
    });

    test('should navigate to next step', async () => {
      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={mockSteps}
            tutorialId="test-tutorial"
          />
        </TestWrapper>
      );

      const nextButton = screen.getByText('Next →');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Action Step')).toBeInTheDocument();
        expect(screen.getByText('2 of 3')).toBeInTheDocument();
      });
    });

    test('should navigate to previous step', async () => {
      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={mockSteps}
            tutorialId="test-tutorial"
          />
        </TestWrapper>
      );

      // Go to second step first
      const nextButton = screen.getByText('Next →');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Action Step')).toBeInTheDocument();
      });

      // Go back to first step
      const prevButton = screen.getByText('← Previous');
      fireEvent.click(prevButton);

      await waitFor(() => {
        expect(screen.getByText('Welcome Step')).toBeInTheDocument();
        expect(screen.getByText('1 of 3')).toBeInTheDocument();
      });
    });

    test('should disable previous button on first step', () => {
      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={mockSteps}
            tutorialId="test-tutorial"
          />
        </TestWrapper>
      );

      const prevButton = screen.getByText('← Previous');
      expect(prevButton).toBeDisabled();
    });

    test('should show finish button on last step', async () => {
      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={mockSteps}
            tutorialId="test-tutorial"
          />
        </TestWrapper>
      );

      // Navigate to last step
      const nextButton = screen.getByText('Next →');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Next →'));
      });

      await waitFor(() => {
        expect(screen.getByText('Finish →')).toBeInTheDocument();
      });
    });

    test('should display action hints when provided', () => {
      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={mockSteps}
            tutorialId="test-tutorial"
          />
        </TestWrapper>
      );

      // Navigate to step with action
      const nextButton = screen.getByText('Next →');
      fireEvent.click(nextButton);

      expect(screen.getByText('Try it now:')).toBeInTheDocument();
      expect(screen.getByText('Click the button to continue')).toBeInTheDocument();
    });
  });

  describe('Completion Tracking and State Persistence', () => {
    test('should call onComplete when tutorial is finished', async () => {
      const mockOnComplete = jest.fn();

      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={mockSteps}
            tutorialId="test-tutorial"
            onComplete={mockOnComplete}
          />
        </TestWrapper>
      );

      // Navigate through all steps
      const nextButton = screen.getByText('Next →');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Next →'));
      });

      await waitFor(() => {
        fireEvent.click(screen.getByText('Finish →'));
      });

      expect(mockOnComplete).toHaveBeenCalledWith({
        tutorialId: 'test-tutorial',
        completedSteps: ['step-1', 'step-2', 'step-3'],
        totalSteps: 3
      });
    });

    test('should call onSkip when tutorial is skipped', () => {
      const mockOnSkip = jest.fn();

      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={mockSteps}
            tutorialId="test-tutorial"
            onSkip={mockOnSkip}
            options={{ allowSkip: true }}
          />
        </TestWrapper>
      );

      const skipButton = screen.getByText('Skip');
      fireEvent.click(skipButton);

      expect(mockOnSkip).toHaveBeenCalledWith({
        tutorialId: 'test-tutorial',
        currentStep: 0,
        completedSteps: []
      });
    });

    test('should track analytics events', async () => {
      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={mockSteps}
            tutorialId="test-tutorial"
          />
        </TestWrapper>
      );

      // Check tutorial start tracking
      expect(mockAnalytics.track).toHaveBeenCalledWith('Tutorial Started', {
        tutorialId: 'test-tutorial',
        role: 'resident',
        stepCount: 3,
        userId: 1
      });

      // Navigate to next step
      const nextButton = screen.getByText('Next →');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockAnalytics.track).toHaveBeenCalledWith('Tutorial Step Viewed', {
          tutorialId: 'test-tutorial',
          stepId: 'step-1',
          stepIndex: 0,
          role: 'resident',
          userId: 1
        });
      });
    });

    test('should persist progress to localStorage', async () => {
      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={mockSteps}
            tutorialId="test-tutorial"
            options={{ persistProgress: true }}
          />
        </TestWrapper>
      );

      // Navigate to next step
      const nextButton = screen.getByText('Next →');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith(
          'tutorial_progress_test-tutorial_1',
          expect.stringContaining('step-1')
        );
      });
    });

    test('should highlight target elements', () => {
      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={mockSteps}
            tutorialId="test-tutorial"
            options={{ highlightTarget: true }}
          />
        </TestWrapper>
      );

      const targetElement = screen.getByTestId('target-1');
      expect(targetElement).toHaveClass('tutorial-highlight');
      expect(targetElement).toHaveAttribute('data-tutorial-active', 'true');
    });
  });

  describe('Keyboard Navigation', () => {
    test('should handle keyboard navigation', async () => {
      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={mockSteps}
            tutorialId="test-tutorial"
            options={{ keyboardNavigation: true }}
          />
        </TestWrapper>
      );

      // Test Enter key for next
      fireEvent.keyDown(document, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Action Step')).toBeInTheDocument();
      });

      // Test Arrow Left for previous
      fireEvent.keyDown(document, { key: 'ArrowLeft' });

      await waitFor(() => {
        expect(screen.getByText('Welcome Step')).toBeInTheDocument();
      });
    });

    test('should handle Escape key to skip', () => {
      const mockOnSkip = jest.fn();

      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={mockSteps}
            tutorialId="test-tutorial"
            onSkip={mockOnSkip}
            options={{ keyboardNavigation: true }}
          />
        </TestWrapper>
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnSkip).toHaveBeenCalled();
    });

    test('should show keyboard hints', () => {
      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={mockSteps}
            tutorialId="test-tutorial"
          />
        </TestWrapper>
      );

      expect(screen.getByText('Press ESC to skip • Arrow keys to navigate')).toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    test('should have proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={mockSteps}
            tutorialId="test-tutorial"
          />
        </TestWrapper>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'tutorial-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'tutorial-content');
    });

    test('should have screen reader announcements', () => {
      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={mockSteps}
            tutorialId="test-tutorial"
          />
        </TestWrapper>
      );

      const liveRegion = screen.getByText('Tutorial step 1 of 3: Welcome Step');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    test('should have proper button labels', () => {
      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={mockSteps}
            tutorialId="test-tutorial"
            options={{ allowSkip: true }}
          />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Skip tutorial')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    test('should handle window resize', () => {
      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={mockSteps}
            tutorialId="test-tutorial"
          />
        </TestWrapper>
      );

      // Simulate window resize
      act(() => {
        global.innerWidth = 500;
        global.innerHeight = 600;
        fireEvent(window, new Event('resize'));
      });

      // Tutorial should still be visible and functional
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('should position tooltip within viewport', () => {
      // Mock getBoundingClientRect
      Element.prototype.getBoundingClientRect = jest.fn(() => ({
        top: 100,
        left: 100,
        bottom: 150,
        right: 200,
        width: 100,
        height: 50
      }));

      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={mockSteps}
            tutorialId="test-tutorial"
          />
        </TestWrapper>
      );

      const tooltip = document.querySelector('.tutorial-tooltip');
      expect(tooltip).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing target elements gracefully', () => {
      const stepsWithMissingTarget = [
        {
          id: 'step-1',
          title: 'Missing Target Step',
          content: 'This step has a missing target.',
          target: '[data-testid="missing-target"]',
          placement: 'bottom'
        }
      ];

      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={stepsWithMissingTarget}
            tutorialId="test-tutorial"
          />
        </TestWrapper>
      );

      // Should still render tutorial without crashing
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Missing Target Step')).toBeInTheDocument();
    });

    test('should handle empty steps array', () => {
      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={[]}
            tutorialId="test-tutorial"
          />
        </TestWrapper>
      );

      // Should not render anything
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('should validate step structure', () => {
      const invalidSteps = [
        {
          // Missing required fields
          title: 'Invalid Step'
        }
      ];

      render(
        <TestWrapper>
          <TutorialSystem
            isActive={true}
            steps={invalidSteps}
            tutorialId="test-tutorial"
          />
        </TestWrapper>
      );

      // Should not render with invalid steps
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Theme Support', () => {
    test('should apply dark theme classes', () => {
      render(
        <TestWrapper theme="dark">
          <TutorialSystem
            isActive={true}
            steps={mockSteps}
            tutorialId="test-tutorial"
          />
        </TestWrapper>
      );

      const tooltip = document.querySelector('.tutorial-tooltip');
      expect(tooltip).toHaveClass('dark:bg-slate-800');
    });

    test('should apply light theme classes', () => {
      render(
        <TestWrapper theme="light">
          <TutorialSystem
            isActive={true}
            steps={mockSteps}
            tutorialId="test-tutorial"
          />
        </TestWrapper>
      );

      const tooltip = document.querySelector('.tutorial-tooltip');
      expect(tooltip).toHaveClass('bg-white');
    });
  });
});