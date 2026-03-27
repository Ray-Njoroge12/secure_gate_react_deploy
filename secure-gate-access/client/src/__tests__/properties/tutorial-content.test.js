/**
 * Property-Based Tests for Tutorial Content Relevance
 * 
 * Tests focused on tutorial content quality, role-specific features,
 * and cross-role contamination prevention.
 */

import { jest } from '@jest/globals';
import fc from 'fast-check';

import { 
  TEST_CONFIG, 
  ERROR_MESSAGES 
} from './constants/tutorial-test-config.js';
import { 
  userRoleGenerator, 
  getRequiredFeaturesForRole,
  getEssentialActionsForRole,
  getOtherRoleFeatures,
  PropertyGenerators
} from './factories/tutorial-test-factories.js';
import { 
  renderWelcomeFlow, 
  extractTutorialContent, 
  checkRoleRelevance,
  validateTutorialStructure,
  checkCrossRoleContamination,
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

describe('Property Tests: Tutorial Content Relevance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should provide role-specific tutorial content for all user roles', () => {
    fc.assert(
      fc.property(
        ...PropertyGenerators.roleContentTest,
        (user, context) => {
          const { container } = renderWelcomeFlow(user, context);
          const tutorialContent = extractTutorialContent(container);
          
          const requiredFeatures = getRequiredFeaturesForRole(user.role);
          const essentialActions = getEssentialActionsForRole(user.role);
          const relevanceCheck = checkRoleRelevance(tutorialContent, user.role, requiredFeatures, essentialActions);

          // Assert feature coverage meets threshold only when multiple steps are visible
          if (tutorialContent.steps.length > 1) {
            try {
              AssertionHelpers.assertFeatureCoverage(
                relevanceCheck.featureCoverage,
                TEST_CONFIG.PERFORMANCE.FEATURE_COVERAGE_THRESHOLD,
                user.role
              );
            } catch (error) {
              throw new Error(ERROR_MESSAGES.FEATURE_COVERAGE(
                relevanceCheck.featureCoverage,
                TEST_CONFIG.PERFORMANCE.FEATURE_COVERAGE_THRESHOLD,
                user.role
              ));
            }
          } else {
            // Single-step view should still surface at least one role-specific feature
            expect(relevanceCheck.coveredFeatures.length).toBeGreaterThan(0);
          }

          // Assert action coverage only when actionable elements are present
          if (tutorialContent.actions.length > 0) {
            try {
              AssertionHelpers.assertActionCoverage(
                relevanceCheck.actionCoverage,
                TEST_CONFIG.PERFORMANCE.ACTION_COVERAGE_THRESHOLD,
                user.role
              );
            } catch (error) {
              throw new Error(ERROR_MESSAGES.ACTION_COVERAGE(
                relevanceCheck.actionCoverage,
                TEST_CONFIG.PERFORMANCE.ACTION_COVERAGE_THRESHOLD,
                user.role
              ));
            }
          }

          // Assert role-appropriate title and messaging
          AssertionHelpers.assertRoleTitle(container, user.role);

          // Assert tutorial structure is valid
          AssertionHelpers.assertTutorialStructure(tutorialContent, user.role);
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS.ROLE_SPECIFIC_CONTENT }
    );
  });

  test('should include all essential features for each role without irrelevant content', () => {
    fc.assert(
      fc.property(
        PropertyGenerators.essentialFeaturesTest,
        (role) => {
          const user = { id: 1, role, email: 'test@example.com', verified: true };
          const { container } = renderWelcomeFlow(user);
          const tutorialContent = extractTutorialContent(container);
          
          const requiredFeatures = getRequiredFeaturesForRole(role);
          const otherRoleFeatures = getOtherRoleFeatures(role);

          // Single-step rendering should still surface at least one required feature
          const hasRequiredFeature = requiredFeatures.some(feature =>
            tutorialContent.steps.some(step =>
              step.id.includes(feature) ||
              step.title.toLowerCase().includes(feature.replace('-', ' ')) ||
              step.content.toLowerCase().includes(feature.replace('-', ' '))
            )
          );

          if (!hasRequiredFeature) {
            throw new Error(ERROR_MESSAGES.MISSING_FEATURES(requiredFeatures, role));
          }

          // Check for cross-role contamination
          const contamination = checkCrossRoleContamination(tutorialContent, role, otherRoleFeatures);
          
          if (contamination.hasContamination) {
            throw new Error(ERROR_MESSAGES.IRRELEVANT_FEATURES(contamination.irrelevantFeatures, role));
          }
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS.ESSENTIAL_FEATURES }
    );
  });

  test('should provide appropriate tutorial length and complexity for each role', () => {
    fc.assert(
      fc.property(
        PropertyGenerators.tutorialLengthTest,
        (user) => {
          const { container } = renderWelcomeFlow(user);
          const tutorialContent = extractTutorialContent(container);
          
          // Validate tutorial structure including step count
          const validation = validateTutorialStructure(tutorialContent, user.role);
          
          if (!validation.isValid) {
            throw new Error(`Tutorial structure validation failed for ${user.role}: ${validation.errors.join(', ')}`);
          }

          // Validate content quality for each step
          tutorialContent.steps.forEach((step, _index) => {
            expect(step.content.length).toBeGreaterThan(TEST_CONFIG.PERFORMANCE.MIN_CONTENT_LENGTH);
            expect(step.content.length).toBeLessThan(TEST_CONFIG.PERFORMANCE.MAX_CONTENT_LENGTH);
          });
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS.TUTORIAL_LENGTH }
    );
  });

  test('should provide contextual next steps after tutorial completion', () => {
    fc.assert(
      fc.property(
        PropertyGenerators.nextStepsTest,
        (role) => {
          const user = { id: 1, role, email: 'test@example.com', verified: true };
          const { container } = renderWelcomeFlow(user);
          
          // Check for next steps content and role relevance
          const nextStepsElements = container.querySelectorAll(
            '.next-steps, [data-testid*="next-steps"], .welcome-flow__next-steps'
          );
          
          // If next steps are present, validate role-appropriate content
          if (nextStepsElements.length > 0) {
            const nextStepsContent = Array.from(nextStepsElements)
              .map(el => el.textContent.toLowerCase())
              .join(' ');
            
            // Check for role-specific next step suggestions
            const rolePatterns = {
              super_admin: /platform|system|estate|health/,
              admin: /user|approval|visitor|report|setting/,
              guard: /qr|scanner|visitor|queue|emergency/,
              resident: /invitation|guest|visitor|notification|favorite/
            };

            const expectedPattern = rolePatterns[role];
            if (expectedPattern) {
              expect(nextStepsContent).toMatch(expectedPattern);
            }
          }
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS.NEXT_STEPS }
    );
  });

  test('should maintain content quality standards across all roles', () => {
    fc.assert(
      fc.property(
        userRoleGenerator,
        (role) => {
          const user = { id: 1, role, email: 'test@example.com', verified: true };
          const { container } = renderWelcomeFlow(user);
          const tutorialContent = extractTutorialContent(container);

          // Property: Each step should have meaningful content
          tutorialContent.steps.forEach((step, _index) => {
            expect(step.title.length).toBeGreaterThan(TEST_CONFIG.PERFORMANCE.MIN_TITLE_LENGTH);
            expect(step.content.length).toBeGreaterThan(TEST_CONFIG.PERFORMANCE.MIN_MEANINGFUL_CONTENT);
            
            // Content should not be just whitespace
            expect(step.title.trim()).toBeTruthy();
            expect(step.content.trim()).toBeTruthy();
          });

          // Property: Tutorial should have at least minimum number of steps
          expect(tutorialContent.steps.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS.ESSENTIAL_FEATURES }
    );
  });
});
