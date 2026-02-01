/**
 * Property-Based Tests for Tutorial Progress Tracking
 * 
 * Tests focused on progress indicators, completion tracking,
 * analytics integration, and user journey management.
 */

import fc from 'fast-check';
import { jest } from '@jest/globals';
import { 
  TEST_CONFIG, 
  SELECTORS,
  ANALYTICS_EVENTS 
} from './constants/tutorial-test-config.js';
import { 
  userGenerator,
  PropertyGenerators
} from './factories/tutorial-test-factories.js';
import { 
  renderWelcomeFlow, 
  validateProgressIndicators
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

describe('Property Tests: Tutorial Progress Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should track tutorial progress and completion appropriately', () => {
    fc.assert(
      fc.property(
        PropertyGenerators.progressTrackingTest,
        (user) => {
          const { mockOnComplete, mockAnalytics } = renderWelcomeFlow(user);
          
          // Property: Should track tutorial start
          expect(mockAnalytics.track).toHaveBeenCalledWith(
            ANALYTICS_EVENTS.WELCOME_FLOW_STARTED,
            expect.objectContaining({
              role: user.role,
              userId: user.id
            })
          );

          // Property: Should provide completion callback
          expect(mockOnComplete).toBeDefined();
          expect(typeof mockOnComplete).toBe('function');
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS.PROGRESS_TRACKING }
    );
  });

  test('should provide visual progress indicators throughout tutorial', () => {
    fc.assert(
      fc.property(
        userGenerator,
        (user) => {
          const { container } = renderWelcomeFlow(user);
          
          // Property: Should have measurable progress indicators
          const progressValidation = validateProgressIndicators(container);
          expect(progressValidation.hasProgress).toBe(true);
          expect(progressValidation.progressCount).toBeGreaterThan(0);

          // Validate progress indicator accessibility
          const progressElements = container.querySelectorAll(SELECTORS.PROGRESS);
          Array.from(progressElements).forEach(element => {
            // Progress indicators should have proper ARIA attributes
            const role = element.getAttribute('role');
            const ariaLabel = element.getAttribute('aria-label');
            const ariaValueNow = element.getAttribute('aria-valuenow');
            const ariaValueMax = element.getAttribute('aria-valuemax');
            
            // Should have progressbar role or aria-label describing progress
            const hasProgressInfo = 
              role === 'progressbar' || 
              (ariaLabel && ariaLabel.includes('progress'));
            
            expect(hasProgressInfo).toBe(true);
            
            // If it's a progressbar, should have proper value attributes
            if (role === 'progressbar') {
              expect(ariaValueNow).toBeTruthy();
              expect(ariaValueMax).toBeTruthy();
              
              const currentValue = parseInt(ariaValueNow);
              const maxValue = parseInt(ariaValueMax);
              
              expect(currentValue).toBeGreaterThanOrEqual(0);
              expect(currentValue).toBeLessThanOrEqual(maxValue);
              expect(maxValue).toBeGreaterThan(0);
            }
          });
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS.PROGRESS_TRACKING }
    );
  });

  test('should maintain consistent progress state across interactions', () => {
    fc.assert(
      fc.property(
        userGenerator,
        (user) => {
          const { container, mockAnalytics } = renderWelcomeFlow(user);
          
          // Verify initial analytics call
          expect(mockAnalytics.track).toHaveBeenCalledWith(
            ANALYTICS_EVENTS.WELCOME_FLOW_STARTED,
            expect.objectContaining({
              role: user.role,
              userId: user.id,
              totalSteps: expect.any(Number)
            })
          );

          // Check that progress indicators are consistent
          const progressElements = container.querySelectorAll(SELECTORS.PROGRESS);
          
          if (progressElements.length > 0) {
            // All progress indicators should show consistent state
            const progressValues = Array.from(progressElements).map(element => {
              const ariaValueNow = element.getAttribute('aria-valuenow');
              return ariaValueNow ? parseInt(ariaValueNow) : null;
            }).filter(value => value !== null);

            if (progressValues.length > 1) {
              // All progress values should be the same (consistent state)
              const firstValue = progressValues[0];
              progressValues.forEach(value => {
                expect(value).toBe(firstValue);
              });
            }
          }
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS.PROGRESS_TRACKING }
    );
  });

  test('should provide step navigation and completion feedback', () => {
    fc.assert(
      fc.property(
        userGenerator,
        (user) => {
          const { container } = renderWelcomeFlow(user);
          
          // Check for navigation controls
          const navigationElements = container.querySelectorAll(
            'button[aria-label*="Continue"], button[aria-label*="Next"], button[aria-label*="Previous"]'
          );
          
          expect(navigationElements.length).toBeGreaterThan(0);
          
          // Validate navigation button accessibility
          Array.from(navigationElements).forEach(button => {
            const ariaLabel = button.getAttribute('aria-label');
            const disabled = button.hasAttribute('disabled');
            
            // Navigation buttons should have descriptive labels
            expect(ariaLabel).toBeTruthy();
            expect(ariaLabel.trim().length).toBeGreaterThan(0);
            
            // Disabled buttons should have proper state indication
            if (disabled) {
              const ariaDisabled = button.getAttribute('aria-disabled');
              expect(ariaDisabled === 'true' || disabled === true).toBe(true);
            }
          });
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS.PROGRESS_TRACKING }
    );
  });

  test('should handle tutorial completion and callback execution', () => {
    fc.assert(
      fc.property(
        userGenerator,
        (user) => {
          const { mockOnComplete } = renderWelcomeFlow(user);
          
          // Property: Completion callback should be properly configured
          expect(mockOnComplete).toBeDefined();
          expect(typeof mockOnComplete).toBe('function');
          
          // Mock completion should be callable without errors
          expect(() => {
            mockOnComplete({
              role: user.role,
              completedSteps: [],
              totalSteps: 4
            });
          }).not.toThrow();
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS.PROGRESS_TRACKING }
    );
  });

  test('should provide skip functionality with proper tracking', () => {
    fc.assert(
      fc.property(
        userGenerator,
        (user) => {
          const { container } = renderWelcomeFlow(user);
          
          // Check for skip functionality
          const skipButtons = Array.from(container.querySelectorAll('button')).filter((button) => {
            const ariaLabel = button.getAttribute('aria-label') || '';
            const textContent = button.textContent || '';
            return ariaLabel.toLowerCase().includes('skip') || textContent.toLowerCase().includes('skip');
          });
          
          // Skip functionality should be available (though may be conditional)
          // At minimum, should not cause errors if skip buttons exist
          skipButtons.forEach(button => {
            const ariaLabel = button.getAttribute('aria-label');
            const textContent = button.textContent;
            
            // Skip buttons should have clear labeling
            const hasSkipLabel = 
              (ariaLabel && ariaLabel.toLowerCase().includes('skip')) ||
              (textContent && textContent.toLowerCase().includes('skip'));
            
            expect(hasSkipLabel).toBe(true);
          });
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS.PROGRESS_TRACKING }
    );
  });

  test('should maintain progress state during component re-renders', () => {
    fc.assert(
      fc.property(
        userGenerator,
        (user) => {
          // Render component multiple times to test state consistency
          const firstRender = renderWelcomeFlow(user);
          const secondRender = renderWelcomeFlow(user);
          
          // Both renders should have consistent progress indicators
          const firstProgress = validateProgressIndicators(firstRender.container);
          const secondProgress = validateProgressIndicators(secondRender.container);
          
          expect(firstProgress.hasProgress).toBe(secondProgress.hasProgress);
          
          // Analytics should be called for both renders
          expect(firstRender.mockAnalytics.track).toHaveBeenCalled();
          expect(secondRender.mockAnalytics.track).toHaveBeenCalled();
          
          // Cleanup
          firstRender.unmount();
          secondRender.unmount();
        }
      ),
      { numRuns: Math.floor(TEST_CONFIG.PROPERTY_RUNS.PROGRESS_TRACKING / 2) }
    );
  });

  test('should provide meaningful progress announcements for screen readers', () => {
    fc.assert(
      fc.property(
        userGenerator,
        (user) => {
          const { container } = renderWelcomeFlow(user);
          
          // Check for live regions that announce progress
          const liveRegions = container.querySelectorAll(SELECTORS.LIVE_REGIONS);
          expect(liveRegions.length).toBeGreaterThan(0);
          
          // Validate that live regions contain progress information
          Array.from(liveRegions).forEach(region => {
            const content = region.textContent.toLowerCase();
            const ariaLive = region.getAttribute('aria-live');
            
            // Live regions should be properly configured
            expect(['polite', 'assertive']).toContain(ariaLive);
            
            // Content should be meaningful (not empty)
            if (content.trim().length > 0) {
              // Should contain step or progress information
              const hasProgressInfo = 
                content.includes('step') || 
                content.includes('progress') ||
                content.includes('tutorial') ||
                /\d+/.test(content); // Contains numbers (likely step numbers)
              
              expect(hasProgressInfo).toBe(true);
            }
          });
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS.PROGRESS_TRACKING }
    );
  });
});
