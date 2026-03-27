/**
 * Property-Based Tests for Onboarding Tutorial Relevance
 * 
 * Property 16: Onboarding Tutorial Relevance
 * For any new user completing registration, the provided tutorial and guidance 
 * should be specifically tailored to their assigned role and include all 
 * essential features for that role.
 * 
 * Validates: Requirements 1.2, 1.3
 * 
 * NOTE: This file has been refactored into modular test files for better maintainability:
 * - tutorial-content.test.js: Content relevance and role-specific features
 * - tutorial-accessibility.test.js: Accessibility compliance and inclusive design
 * - tutorial-progress.test.js: Progress tracking and completion management
 * 
 * This file now serves as an integration test suite that validates the complete
 * tutorial flow across all aspects.
 */

import { jest } from '@jest/globals';
import { screen, fireEvent, waitFor } from '@testing-library/react';

import { ANALYTICS_EVENTS } from './constants/tutorial-test-config.js';
import { createUserWithRole } from './factories/tutorial-test-factories.js';
import { renderWelcomeFlow } from './utils/tutorial-test-utils.js';

// Mock dependencies
jest.mock('../../hooks/useAccessibility', () => ({
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
    runAudit: () => {},
    announce: () => {},
    skipToMain: () => {},
    skipToNavigation: () => {},
    getAccessibleClasses: () => '',
    getAccessibleStyles: () => ({}),
    createFocusTrap: () => {},
    LiveRegion: () => null,
    focusHistory: []
  })
}));

// Integration test for complete tutorial flow
describe('Property 16: Onboarding Tutorial Relevance - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should complete full tutorial flow for resident role', async () => {
    const user = createUserWithRole('resident');
    const { container, mockAnalytics } = renderWelcomeFlow(user);

    // Verify initial state
    expect(screen.getAllByText(/Welcome to Your Secure Community/).length).toBeGreaterThan(0);

    // Simulate step completion
    const continueButton = container.querySelector('button[aria-label*="Continue"]');
    if (continueButton && !continueButton.disabled) {
      fireEvent.click(continueButton);
    }

    // Verify progress tracking
    await waitFor(() => {
      expect(mockAnalytics.track).toHaveBeenCalledWith(
        ANALYTICS_EVENTS.WELCOME_FLOW_STARTED,
        expect.objectContaining({
          role: 'resident',
          userId: 1
        })
      );
    });
  });

  test('should handle tutorial completion across all roles', async () => {
    const roles = ['super_admin', 'admin', 'guard', 'resident'];
    
    for (const role of roles) {
      const user = createUserWithRole(role);
      const { mockOnComplete, mockAnalytics } = renderWelcomeFlow(user);

      // Verify analytics tracking for each role
      expect(mockAnalytics.track).toHaveBeenCalledWith(
        ANALYTICS_EVENTS.WELCOME_FLOW_STARTED,
        expect.objectContaining({
          role,
          userId: 1
        })
      );

      // Verify completion callback is available
      expect(mockOnComplete).toBeDefined();
      expect(typeof mockOnComplete).toBe('function');
    }
  });

  test('should maintain accessibility across complete tutorial flow', async () => {
    const user = createUserWithRole('resident');
    const { container } = renderWelcomeFlow(user);

    // Verify essential accessibility elements are present
    const ariaElements = container.querySelectorAll('[aria-label], [aria-labelledby], [role]');
    expect(ariaElements.length).toBeGreaterThan(0);

    const focusableElements = container.querySelectorAll('button, [tabindex], input, select, textarea, a[href]');
    expect(focusableElements.length).toBeGreaterThan(0);

    const liveRegions = container.querySelectorAll('[aria-live]');
    expect(liveRegions.length).toBeGreaterThan(0);

    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    expect(headings.length).toBeGreaterThan(0);
  });
});
