/**
 * Property-Based Tests for Tutorial Accessibility
 * 
 * Tests focused on accessibility compliance, keyboard navigation,
 * screen reader support, and inclusive design patterns.
 */

import fc from 'fast-check';
import { jest } from '@jest/globals';
import { 
  TEST_CONFIG, 
  SELECTORS,
  ERROR_MESSAGES 
} from './constants/tutorial-test-config.js';
import { 
  userGenerator, 
  onboardingContextGenerator,
  createAccessibilityContext,
  PropertyGenerators
} from './factories/tutorial-test-factories.js';
import { 
  renderWelcomeFlow, 
  checkAccessibilityCompliance,
  AssertionHelpers
} from './utils/tutorial-test-utils.js';

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

describe('Property Tests: Tutorial Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should adapt tutorial presentation for accessibility needs', () => {
    fc.assert(
      fc.property(
        ...PropertyGenerators.accessibilityTest,
        (user, context) => {
          const { container } = renderWelcomeFlow(user, context);
          
          // Assert comprehensive accessibility compliance
          AssertionHelpers.assertAccessibilityCompliance(container);
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS.ACCESSIBILITY }
    );
  });

  test('should provide proper ARIA labels and roles for screen readers', () => {
    const [user] = fc.sample(userGenerator, 1);
    const accessibilityContext = createAccessibilityContext({ screenReader: true });
    const { container } = renderWelcomeFlow(user, accessibilityContext);

          // Property: Should have core ARIA landmarks and live regions for screen readers
          const mainRegion = container.querySelector('[role="main"]');
          const progressBar = container.querySelector('[role="progressbar"]');
          const liveRegions = container.querySelectorAll(SELECTORS.LIVE_REGIONS);

          expect(mainRegion || progressBar || liveRegions.length > 0).toBeTruthy();
          expect(liveRegions.length).toBeGreaterThanOrEqual(TEST_CONFIG.ACCESSIBILITY.MIN_LIVE_REGIONS);
  });

  test('should support keyboard navigation throughout tutorial', () => {
    fc.assert(
      fc.property(
        userGenerator,
        (user) => {
          const keyboardContext = createAccessibilityContext({ keyboardOnly: true });
          const { container } = renderWelcomeFlow(user, keyboardContext);
          
          // Property: Should have keyboard navigation support
          const focusableElements = container.querySelectorAll(SELECTORS.FOCUSABLE_ELEMENTS);
          expect(focusableElements.length).toBeGreaterThan(TEST_CONFIG.ACCESSIBILITY.MIN_FOCUSABLE_ELEMENTS);

          // Validate focusable elements have proper tabindex or are naturally focusable
          Array.from(focusableElements).forEach(element => {
            const tagName = element.tagName.toLowerCase();
            const tabIndex = element.getAttribute('tabindex');
            const isNaturallyFocusable = ['button', 'input', 'select', 'textarea', 'a'].includes(tagName);
            const hasValidTabIndex = tabIndex !== null && parseInt(tabIndex) >= -1;
            
            expect(isNaturallyFocusable || hasValidTabIndex).toBe(true);
          });
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS.ACCESSIBILITY }
    );
  });

  test('should maintain proper heading hierarchy for navigation', () => {
    fc.assert(
      fc.property(
        userGenerator,
        (user) => {
          const { container } = renderWelcomeFlow(user);
          
          // Property: Should have proper heading hierarchy
          const headings = container.querySelectorAll(SELECTORS.HEADINGS);
          expect(headings.length).toBeGreaterThan(TEST_CONFIG.ACCESSIBILITY.MIN_HEADINGS);
          
          // Check heading hierarchy (h1 should come before h2, etc.)
          let lastLevel = 0;
          Array.from(headings).forEach((heading, index) => {
            const level = parseInt(heading.tagName.charAt(1));
            
            // Should not skip heading levels
            const levelJump = level - lastLevel;
            expect(levelJump).toBeLessThanOrEqual(TEST_CONFIG.ACCESSIBILITY.MAX_HEADING_LEVEL_JUMP);
            
            // Headings should have meaningful content
            expect(heading.textContent.trim().length).toBeGreaterThan(0);
            
            lastLevel = Math.min(level, lastLevel + 1);
          });
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS.ACCESSIBILITY }
    );
  });

  test('should provide alternative text and descriptions for visual elements', () => {
    fc.assert(
      fc.property(
        userGenerator,
        (user) => {
          const { container } = renderWelcomeFlow(user);
          
          // Check for images and ensure they have alt text
          const images = container.querySelectorAll('img');
          Array.from(images).forEach(img => {
            const alt = img.getAttribute('alt');
            const ariaLabel = img.getAttribute('aria-label');
            const ariaLabelledBy = img.getAttribute('aria-labelledby');
            
            // Images should have alternative text through one of these methods
            const hasAltText = 
              (alt !== null) || 
              (ariaLabel && ariaLabel.trim().length > 0) ||
              (ariaLabelledBy && ariaLabelledBy.trim().length > 0);
            
            expect(hasAltText).toBe(true);
          });

          // Check for icons and ensure they have accessible names
          const icons = container.querySelectorAll('[class*="icon"], svg');
          Array.from(icons).forEach(icon => {
            const ariaLabel = icon.getAttribute('aria-label');
            const ariaHidden = icon.getAttribute('aria-hidden');
            const title = icon.querySelector('title');
            
            // Icons should either be hidden from screen readers or have accessible names
            const isAccessible = 
              ariaHidden === 'true' ||
              (ariaLabel && ariaLabel.trim().length > 0) ||
              title !== null;
            
            expect(isAccessible).toBe(true);
          });
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS.ACCESSIBILITY }
    );
  });

  test('should support high contrast and reduced motion preferences', () => {
    fc.assert(
      fc.property(
        userGenerator,
        (user) => {
          const highContrastContext = createAccessibilityContext({ 
            highContrast: true, 
            reducedMotion: true 
          });
          const { container } = renderWelcomeFlow(user, highContrastContext);
          
          // Verify the component renders without errors with accessibility preferences
          expect(container).toBeTruthy();
          
          // Check that essential elements are still present and accessible
          const ariaElements = container.querySelectorAll(SELECTORS.ARIA_ELEMENTS);
          expect(ariaElements.length).toBeGreaterThan(0);
          
          const focusableElements = container.querySelectorAll(SELECTORS.FOCUSABLE_ELEMENTS);
          expect(focusableElements.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS.ACCESSIBILITY }
    );
  });

  test('should provide meaningful error messages and validation feedback', () => {
    fc.assert(
      fc.property(
        userGenerator,
        (user) => {
          const { container } = renderWelcomeFlow(user);
          
          // Check for form elements and their error handling
          const formElements = container.querySelectorAll('input, select, textarea');
          Array.from(formElements).forEach(element => {
            const ariaDescribedBy = element.getAttribute('aria-describedby');
            const ariaInvalid = element.getAttribute('aria-invalid');
            
            // If element has validation, it should have proper ARIA attributes
            if (ariaInvalid === 'true') {
              expect(ariaDescribedBy).toBeTruthy();
              
              // The described element should exist
              if (ariaDescribedBy) {
                const describedElement = container.querySelector(`#${ariaDescribedBy}`);
                expect(describedElement).toBeTruthy();
                expect(describedElement.textContent.trim().length).toBeGreaterThan(0);
              }
            }
          });
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS.ACCESSIBILITY }
    );
  });

  test('should maintain accessibility during dynamic content updates', () => {
    fc.assert(
      fc.property(
        userGenerator,
        (user) => {
          const { container } = renderWelcomeFlow(user);
          
          // Check for live regions that announce dynamic changes
          const liveRegions = container.querySelectorAll(SELECTORS.LIVE_REGIONS);
          expect(liveRegions.length).toBeGreaterThan(0);
          
          // Validate live region configurations
          Array.from(liveRegions).forEach(region => {
            const ariaLive = region.getAttribute('aria-live');
            const ariaAtomic = region.getAttribute('aria-atomic');
            
            // Live regions should have proper politeness settings
            expect(['polite', 'assertive', 'off']).toContain(ariaLive);
            
            // If aria-atomic is set, it should be a boolean value
            if (ariaAtomic !== null) {
              expect(['true', 'false']).toContain(ariaAtomic);
            }
          });
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS.ACCESSIBILITY }
    );
  });
});
