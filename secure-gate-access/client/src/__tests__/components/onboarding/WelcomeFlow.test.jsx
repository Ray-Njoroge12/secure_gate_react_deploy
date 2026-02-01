/**
 * Unit Tests for WelcomeFlow Component
 * 
 * Tests role-specific welcome flows, progress tracking, and step navigation.
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 1.5, 1.6
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import WelcomeFlow from '../../../components/onboarding/WelcomeFlow';
import { AuthContext } from '../../../contexts/AuthContext';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { ThemeEngineProvider } from '../../../contexts/ThemeEngine';

// Create mock functions outside the factory
const mockRunAudit = jest.fn();
const mockAnnounce = jest.fn();
const mockSkipToMain = jest.fn();
const mockSkipToNavigation = jest.fn();
const mockGetAccessibleClasses = jest.fn(() => '');
const mockGetAccessibleStyles = jest.fn(() => ({}));
const mockCreateFocusTrap = jest.fn();

// Mock analytics
const mockAnalyticsTrack = jest.fn();
const mockAnalytics = {
  track: mockAnalyticsTrack
};

// Mock auth and theme functions
const mockLogin = jest.fn();
const mockLogout = jest.fn();
const mockRegister = jest.fn();
const mockSetTheme = jest.fn();

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
    runAudit: mockRunAudit,
    announce: mockAnnounce,
    skipToMain: mockSkipToMain,
    skipToNavigation: mockSkipToNavigation,
    getAccessibleClasses: mockGetAccessibleClasses,
    getAccessibleStyles: mockGetAccessibleStyles,
    createFocusTrap: mockCreateFocusTrap,
    LiveRegion: () => null,
    focusHistory: []
  })
}));

// Mock step components
jest.mock('../../../components/onboarding/steps/CommunityOverviewStep', () => {
  return function MockCommunityOverviewStep({ onStepComplete }) {
    return (
      <div data-testid="community-overview-step">
        <h3>Community Overview Step</h3>
        <button onClick={() => onStepComplete('community-overview')}>
          Complete Step
        </button>
      </div>
    );
  };
});

// Test data
const mockUsers = {
  resident: {
    id: 1,
    role: 'resident',
    email: 'resident@test.com',
    verified: true
  },
  guard: {
    id: 2,
    role: 'guard',
    email: 'guard@test.com',
    verified: true
  },
  admin: {
    id: 3,
    role: 'admin',
    email: 'admin@test.com',
    verified: true
  },
  super_admin: {
    id: 4,
    role: 'super_admin',
    email: 'superadmin@test.com',
    verified: true
  }
};

// Test wrapper component
const TestWrapper = ({ children, user = mockUsers.resident, theme = 'light' }) => {
  const authContextValue = {
    user,
    isAuthenticated: true,
    login: mockLogin,
    logout: mockLogout,
    register: mockRegister
  };

  const themeContextValue = {
    theme,
    setTheme: mockSetTheme,
    isDark: theme === 'dark',
    colors: {},
    spacing: {},
    typography: {}
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      <ThemeProvider>
        <ThemeEngineProvider>
          {children}
        </ThemeEngineProvider>
      </ThemeProvider>
    </AuthContext.Provider>
  );
};

describe('WelcomeFlow Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.window = global.window || {};
    global.window.analytics = mockAnalytics;
    
    // Mock window.matchMedia for ThemeContext
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Role-Specific Welcome Flows', () => {
    test('should render resident welcome flow', () => {
      render(
        <TestWrapper user={mockUsers.resident}>
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      expect(screen.getByText('Welcome to Your Secure Community')).toBeInTheDocument();
      expect(screen.getByText('Invite guests, manage visits, and stay connected with your community')).toBeInTheDocument();
    });

    test('should render guard welcome flow', () => {
      render(
        <TestWrapper user={mockUsers.guard}>
          <WelcomeFlow role="guard" />
        </TestWrapper>
      );

      expect(screen.getByText('Welcome to SecureGate Security Operations')).toBeInTheDocument();
      expect(screen.getByText('Process visitors, monitor security, and maintain estate safety')).toBeInTheDocument();
    });

    test('should render admin welcome flow', () => {
      render(
        <TestWrapper user={mockUsers.admin}>
          <WelcomeFlow role="admin" />
        </TestWrapper>
      );

      expect(screen.getByText('Welcome to Your Estate Administration')).toBeInTheDocument();
      expect(screen.getByText('Manage users, oversee security, and configure estate settings')).toBeInTheDocument();
    });

    test('should render super admin welcome flow', () => {
      render(
        <TestWrapper user={mockUsers.super_admin}>
          <WelcomeFlow role="super_admin" />
        </TestWrapper>
      );

      expect(screen.getByText('Welcome to SecureGate Platform Administration')).toBeInTheDocument();
      expect(screen.getByText('Manage estates, monitor system health, and oversee platform operations')).toBeInTheDocument();
    });

    test('should default to resident flow for unknown roles', () => {
      render(
        <TestWrapper user={{ ...mockUsers.resident, role: 'unknown' }}>
          <WelcomeFlow role="unknown" />
        </TestWrapper>
      );

      expect(screen.getByText('Welcome to Your Secure Community')).toBeInTheDocument();
    });

    test('should show correct number of steps for each role', () => {
      const roleStepCounts = {
        resident: 4,
        guard: 4,
        admin: 4,
        super_admin: 4
      };

      Object.entries(roleStepCounts).forEach(([role, expectedSteps]) => {
        const { unmount } = render(
          <TestWrapper user={mockUsers[role]}>
            <WelcomeFlow role={role} />
          </TestWrapper>
        );

        const progressText = screen.getByText(`1 of ${expectedSteps}`);
        expect(progressText).toBeInTheDocument();

        unmount();
      });
    });
  });

  describe('Progress Tracking and Navigation', () => {
    test('should show initial progress state', () => {
      render(
        <TestWrapper user={mockUsers.resident}>
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      expect(screen.getByText('1 of 4')).toBeInTheDocument();
      expect(screen.getByLabelText(/Welcome flow progress: 1 of 4 steps completed/)).toBeInTheDocument();
    });

    test('should disable previous button on first step', () => {
      render(
        <TestWrapper user={mockUsers.resident}>
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      const prevButton = screen.getByText('← Previous');
      expect(prevButton).toBeDisabled();
    });

    test('should enable continue button when step is completed', async () => {
      render(
        <TestWrapper user={mockUsers.resident}>
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      // Initially, continue button should be disabled
      const continueButton = screen.getByText('Continue →');
      expect(continueButton).toBeDisabled();

      // Complete the step
      const completeStepButton = screen.getByText('Complete Step');
      fireEvent.click(completeStepButton);

      await waitFor(() => {
        expect(continueButton).not.toBeDisabled();
      });
    });

    test('should advance to next step automatically after completion', async () => {
      render(
        <TestWrapper user={mockUsers.resident}>
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      // Complete the first step
      const completeStepButton = screen.getByText('Complete Step');
      fireEvent.click(completeStepButton);

      // Should auto-advance after 500ms
      await waitFor(() => {
        expect(screen.getByText('2 of 4')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    test('should navigate to previous step', async () => {
      render(
        <TestWrapper user={mockUsers.resident}>
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      // Complete first step and advance
      const completeStepButton = screen.getByText('Complete Step');
      fireEvent.click(completeStepButton);

      await waitFor(() => {
        expect(screen.getByText('2 of 4')).toBeInTheDocument();
      });

      // Go back to previous step
      const prevButton = screen.getByText('← Previous');
      fireEvent.click(prevButton);

      expect(screen.getByText('1 of 4')).toBeInTheDocument();
    });

    test('should show "Get Started" button on last step', async () => {
      render(
        <TestWrapper user={mockUsers.resident}>
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      // Navigate to last step (simulate completing all steps)
      for (let i = 0; i < 3; i++) {
        const completeStepButton = screen.getByText('Complete Step');
        fireEvent.click(completeStepButton);
        
        await waitFor(() => {
          // Wait for auto-advance
        }, { timeout: 1000 });
      }

      await waitFor(() => {
        expect(screen.getByText('Get Started')).toBeInTheDocument();
      });
    });

    test('should track analytics events', () => {
      render(
        <TestWrapper user={mockUsers.resident}>
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      expect(mockAnalytics.track).toHaveBeenCalledWith('Welcome Flow Started', {
        role: 'resident',
        isNewUser: false,
        totalSteps: 4,
        userId: 1
      });
    });

    test('should track step completion', async () => {
      render(
        <TestWrapper user={mockUsers.resident}>
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      const completeStepButton = screen.getByText('Complete Step');
      fireEvent.click(completeStepButton);

      await waitFor(() => {
        expect(mockAnalytics.track).toHaveBeenCalledWith('Welcome Step Completed', {
          stepId: 'community-overview',
          role: 'resident',
          completedSteps: 1,
          totalSteps: 4,
          userId: 1
        });
      });
    });
  });

  describe('Skip Functionality', () => {
    test('should show skip button', () => {
      render(
        <TestWrapper user={mockUsers.resident}>
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      expect(screen.getByText('Skip for now')).toBeInTheDocument();
    });

    test('should call onComplete when skipped', () => {
      const mockOnComplete = jest.fn();

      render(
        <TestWrapper user={mockUsers.resident}>
          <WelcomeFlow role="resident" onComplete={mockOnComplete} />
        </TestWrapper>
      );

      const skipButton = screen.getByText('Skip for now');
      fireEvent.click(skipButton);

      expect(mockOnComplete).toHaveBeenCalledWith({
        role: 'resident',
        skipped: true,
        completedSteps: []
      });
    });

    test('should track skip analytics', () => {
      render(
        <TestWrapper user={mockUsers.resident}>
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      const skipButton = screen.getByText('Skip for now');
      fireEvent.click(skipButton);

      expect(mockAnalytics.track).toHaveBeenCalledWith('Welcome Flow Skipped', {
        role: 'resident',
        currentStep: 0,
        completedSteps: 0,
        totalSteps: 4,
        userId: 1
      });
    });
  });

  describe('Completion Flow', () => {
    test('should call onComplete when flow is finished', async () => {
      const mockOnComplete = jest.fn();

      render(
        <TestWrapper user={mockUsers.resident}>
          <WelcomeFlow role="resident" onComplete={mockOnComplete} />
        </TestWrapper>
      );

      // Navigate to last step and complete
      for (let i = 0; i < 3; i++) {
        const completeStepButton = screen.getByText('Complete Step');
        fireEvent.click(completeStepButton);
        
        await waitFor(() => {
          // Wait for auto-advance
        }, { timeout: 1000 });
      }

      // Complete the last step
      const completeStepButton = screen.getByText('Complete Step');
      fireEvent.click(completeStepButton);

      const getStartedButton = await screen.findByText('Get Started');
      fireEvent.click(getStartedButton);

      expect(mockOnComplete).toHaveBeenCalledWith({
        role: 'resident',
        completedSteps: expect.arrayContaining(['community-overview']),
        progress: expect.any(Object)
      });
    });

    test('should show next steps on completion', async () => {
      render(
        <TestWrapper user={mockUsers.resident}>
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      // Navigate to last step
      for (let i = 0; i < 3; i++) {
        const completeStepButton = screen.getByText('Complete Step');
        fireEvent.click(completeStepButton);
        
        await waitFor(() => {
          // Wait for auto-advance
        }, { timeout: 1000 });
      }

      // Complete the last step
      const completeStepButton = screen.getByText('Complete Step');
      fireEvent.click(completeStepButton);

      await waitFor(() => {
        expect(screen.getByText('🎉 You\'re all set! Here\'s what you can do next:')).toBeInTheDocument();
        expect(screen.getByText('Create your first visitor invitation')).toBeInTheDocument();
      });
    });

    test('should track completion analytics', async () => {
      render(
        <TestWrapper user={mockUsers.resident}>
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      // Navigate to last step and complete
      for (let i = 0; i < 3; i++) {
        const completeStepButton = screen.getByText('Complete Step');
        fireEvent.click(completeStepButton);
        
        await waitFor(() => {
          // Wait for auto-advance
        }, { timeout: 1000 });
      }

      const completeStepButton = screen.getByText('Complete Step');
      fireEvent.click(completeStepButton);

      const getStartedButton = await screen.findByText('Get Started');
      fireEvent.click(getStartedButton);

      expect(mockAnalytics.track).toHaveBeenCalledWith('Welcome Flow Completed', {
        role: 'resident',
        completedSteps: expect.any(Number),
        totalSteps: 4,
        completionRate: expect.any(Number),
        userId: 1
      });
    });
  });

  describe('Accessibility Features', () => {
    test('should have proper ARIA attributes', () => {
      render(
        <TestWrapper user={mockUsers.resident}>
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('aria-labelledby', 'welcome-title');

      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toHaveAttribute('id', 'welcome-title');
    });

    test('should have screen reader announcements', () => {
      render(
        <TestWrapper user={mockUsers.resident}>
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      const liveRegion = document.querySelector('#welcome-flow-announcements');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    test('should have proper button labels', () => {
      render(
        <TestWrapper user={mockUsers.resident}>
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Go to previous step')).toBeInTheDocument();
      expect(screen.getByLabelText('Skip welcome flow')).toBeInTheDocument();
      expect(screen.getByLabelText('Continue to next step')).toBeInTheDocument();
    });

    test('should support keyboard navigation', () => {
      render(
        <TestWrapper user={mockUsers.resident}>
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      const continueButton = screen.getByText('Continue →');
      continueButton.focus();
      expect(document.activeElement).toBe(continueButton);
    });
  });

  describe('Theme Support', () => {
    test('should apply dark theme classes', () => {
      render(
        <TestWrapper user={mockUsers.resident} theme="dark">
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      const title = screen.getByText('Welcome to Your Secure Community');
      expect(title).toHaveClass('dark:text-white');
    });

    test('should apply light theme classes', () => {
      render(
        <TestWrapper user={mockUsers.resident} theme="light">
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      const title = screen.getByText('Welcome to Your Secure Community');
      expect(title).toHaveClass('text-gray-900');
    });
  });

  describe('Responsive Design', () => {
    test('should use adaptive components', () => {
      render(
        <TestWrapper user={mockUsers.resident}>
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      const welcomeFlow = document.querySelector('.welcome-flow');
      expect(welcomeFlow).toBeInTheDocument();
    });

    test('should have responsive container classes', () => {
      render(
        <TestWrapper user={mockUsers.resident}>
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      const container = document.querySelector('.welcome-flow__container');
      expect(container).toHaveClass('max-w-4xl', 'mx-auto', 'p-6');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing user gracefully', () => {
      render(
        <TestWrapper user={null}>
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      // Should still render without crashing
      expect(screen.getByText('Welcome to Your Secure Community')).toBeInTheDocument();
    });

    test('should handle missing analytics gracefully', () => {
      global.window.analytics = undefined;

      render(
        <TestWrapper user={mockUsers.resident}>
          <WelcomeFlow role="resident" />
        </TestWrapper>
      );

      // Should render without crashing
      expect(screen.getByText('Welcome to Your Secure Community')).toBeInTheDocument();
    });
  });
});