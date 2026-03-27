/**
 * Tutorial Test Utilities
 * 
 * Reusable utility functions for onboarding tutorial property-based tests.
 * Provides consistent DOM queries, assertions, and test helpers.
 */

import { render } from '@testing-library/react';

import WelcomeFlow from '../../../components/onboarding/WelcomeFlow';
import { AuthContext } from '../../../contexts/AuthContext';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { ThemeEngineProvider } from '../../../contexts/ThemeEngine';
import { 
  SELECTORS, 
  ROLE_TITLE_PATTERNS, 
  ERROR_MESSAGES,
  TEST_CONFIG 
} from '../constants/tutorial-test-config.js';
import { createMockAnalytics, createTestWrapperProps } from '../factories/tutorial-test-factories.js';

/**
 * Test wrapper component for consistent rendering
 */
export const TestWrapper = ({ children, user, theme = 'light' }) => {
  const { authContextValue } = createTestWrapperProps(user, theme);

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

/**
 * Render WelcomeFlow with consistent setup
 */
export const renderWelcomeFlow = (user, context = {}) => {
  // Create mock function only if Jest is available
  const mockOnComplete = typeof jest !== 'undefined' ? jest.fn() : () => {};
  
  // Set up global analytics mock
  global.window = global.window || {};
  global.window.analytics = createMockAnalytics();
  // Ensure matchMedia exists for ThemeContext in non-jsdom or mocked environments
  const ensureMatchMedia = () => {
    const matchMediaImpl = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {}, // deprecated
      removeListener: () => {}, // deprecated
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    });

    if (typeof global.window.matchMedia !== 'function') {
      global.window.matchMedia = typeof jest !== 'undefined'
        ? jest.fn().mockImplementation(matchMediaImpl)
        : matchMediaImpl;
      return;
    }

    try {
      const probe = global.window.matchMedia('(prefers-color-scheme: dark)');
      if (!probe || typeof probe.matches !== 'boolean') {
        global.window.matchMedia = typeof jest !== 'undefined'
          ? jest.fn().mockImplementation(matchMediaImpl)
          : matchMediaImpl;
      }
    } catch {
      global.window.matchMedia = typeof jest !== 'undefined'
        ? jest.fn().mockImplementation(matchMediaImpl)
        : matchMediaImpl;
    }
  };
  ensureMatchMedia();

  const result = render(
    <TestWrapper user={user}>
      <WelcomeFlow
        role={user.role}
        onComplete={mockOnComplete}
        isNewUser={context.isNewUser || true}
      />
    </TestWrapper>
  );

  return {
    ...result,
    mockOnComplete,
    mockAnalytics: global.window.analytics
  };
};

/**
 * Extract tutorial content from rendered component
 */
export const extractTutorialContent = (container) => {
  const stepElements = container.querySelectorAll(SELECTORS.STEPS);
  const actionElements = container.querySelectorAll(SELECTORS.ACTIONS);
  const featureElements = container.querySelectorAll(SELECTORS.FEATURES);
  
  return {
    steps: Array.from(stepElements).map(el => ({
      id: el.getAttribute('data-testid') || el.className,
      title: el.querySelector('h2, h3, h4')?.textContent || '',
      content: el.textContent || ''
    })),
    actions: Array.from(actionElements).map(el => ({
      id: el.getAttribute('aria-label') || el.textContent,
      type: el.getAttribute('data-action-type') || 'unknown'
    })),
    features: Array.from(featureElements).map(el => ({
      id: el.getAttribute('data-testid') || el.className,
      title: el.querySelector('h5, h6')?.textContent || '',
      description: el.querySelector('p')?.textContent || ''
    }))
  };
};

/**
 * Check role relevance of tutorial content
 */
export const checkRoleRelevance = (tutorialContent, userRole, requiredFeatures, essentialActions) => {
  // Check if all required features are covered
  const coveredFeatures = requiredFeatures.filter(feature => 
    tutorialContent.steps.some(step => 
      step.id.includes(feature) || 
      step.title.toLowerCase().includes(feature.replace('-', ' ')) ||
      step.content.toLowerCase().includes(feature.replace('-', ' '))
    )
  );

  // Check if essential actions are mentioned or demonstrated
  const mentionedActions = essentialActions.filter(action =>
    tutorialContent.actions.some(tutorialAction =>
      tutorialAction.id.toLowerCase().includes(action.toLowerCase()) ||
      tutorialAction.type.includes(action)
    ) ||
    tutorialContent.steps.some(step =>
      step.content.toLowerCase().includes(action.toLowerCase())
    )
  );

  return {
    featureCoverage: coveredFeatures.length / requiredFeatures.length,
    actionCoverage: mentionedActions.length / essentialActions.length,
    coveredFeatures,
    mentionedActions,
    requiredFeatures,
    essentialActions
  };
};

/**
 * Validate tutorial content structure and quality
 */
export const validateTutorialStructure = (tutorialContent, userRole) => {
  const results = {
    isValid: true,
    errors: []
  };

  // Check step count
  const expectedStepCount = TEST_CONFIG.STEP_COUNTS[userRole];
  if (expectedStepCount) {
    const stepCount = tutorialContent.steps.length;
    if (stepCount === 0) {
      results.isValid = false;
      results.errors.push(
        ERROR_MESSAGES.STEP_COUNT(stepCount, expectedStepCount.min, expectedStepCount.max, userRole)
      );
    } else if (stepCount > 1 && (stepCount < expectedStepCount.min || stepCount > expectedStepCount.max)) {
      results.isValid = false;
      results.errors.push(
        ERROR_MESSAGES.STEP_COUNT(stepCount, expectedStepCount.min, expectedStepCount.max, userRole)
      );
    }
  }

  // Check content quality
  tutorialContent.steps.forEach((step, index) => {
    if (step.title.length < TEST_CONFIG.PERFORMANCE.MIN_TITLE_LENGTH) {
      results.isValid = false;
      results.errors.push(`Step ${index + 1} has empty or too short title`);
    }

    if (step.content.length < TEST_CONFIG.PERFORMANCE.MIN_MEANINGFUL_CONTENT) {
      results.isValid = false;
      results.errors.push(`Step ${index + 1} has insufficient content (${step.content.length} chars)`);
    }

    if (step.content.length > TEST_CONFIG.PERFORMANCE.MAX_CONTENT_LENGTH) {
      results.isValid = false;
      results.errors.push(`Step ${index + 1} has excessive content (${step.content.length} chars)`);
    }
  });

  return results;
};

/**
 * Check accessibility compliance
 */
export const checkAccessibilityCompliance = (container) => {
  const results = {
    isCompliant: true,
    violations: []
  };

  // Check for ARIA elements
  const ariaElements = container.querySelectorAll(SELECTORS.ARIA_ELEMENTS);
  if (ariaElements.length < TEST_CONFIG.ACCESSIBILITY.MIN_ARIA_ELEMENTS) {
    results.isCompliant = false;
    results.violations.push(
      ERROR_MESSAGES.ACCESSIBILITY_VIOLATION('ARIA elements', 'minimum count')
    );
  }

  // Check for focusable elements
  const focusableElements = container.querySelectorAll(SELECTORS.FOCUSABLE_ELEMENTS);
  if (focusableElements.length < TEST_CONFIG.ACCESSIBILITY.MIN_FOCUSABLE_ELEMENTS) {
    results.isCompliant = false;
    results.violations.push(
      ERROR_MESSAGES.ACCESSIBILITY_VIOLATION('focusable elements', 'minimum count')
    );
  }

  // Check for live regions
  const liveRegions = container.querySelectorAll(SELECTORS.LIVE_REGIONS);
  if (liveRegions.length < TEST_CONFIG.ACCESSIBILITY.MIN_LIVE_REGIONS) {
    results.isCompliant = false;
    results.violations.push(
      ERROR_MESSAGES.ACCESSIBILITY_VIOLATION('live regions', 'screen reader support')
    );
  }

  // Check heading hierarchy
  const headings = container.querySelectorAll(SELECTORS.HEADINGS);
  if (headings.length < TEST_CONFIG.ACCESSIBILITY.MIN_HEADINGS) {
    results.isCompliant = false;
    results.violations.push(
      ERROR_MESSAGES.ACCESSIBILITY_VIOLATION('headings', 'proper structure')
    );
  } else {
    // Validate heading hierarchy
    let lastLevel = 0;
    Array.from(headings).forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      if (level - lastLevel > TEST_CONFIG.ACCESSIBILITY.MAX_HEADING_LEVEL_JUMP) {
        results.isCompliant = false;
        results.violations.push(
          `Heading hierarchy violation at position ${index + 1}: jumped from h${lastLevel} to h${level}`
        );
      }
      lastLevel = Math.min(level, lastLevel + 1);
    });
  }

  return results;
};

/**
 * Validate role-appropriate title
 */
export const validateRoleTitle = (container, userRole) => {
  const titleElement = container.querySelector(SELECTORS.TITLE);
  if (!titleElement) {
    return { isValid: false, error: 'No title element found' };
  }

  const title = titleElement.textContent.toLowerCase();
  const expectedPattern = ROLE_TITLE_PATTERNS[userRole];
  
  if (!expectedPattern || !expectedPattern.test(title)) {
    return { 
      isValid: false, 
      error: `Title "${title}" does not match expected pattern for role ${userRole}` 
    };
  }

  return { isValid: true };
};

/**
 * Check for cross-role contamination
 */
export const checkCrossRoleContamination = (tutorialContent, userRole, otherRoleFeatures) => {
  const irrelevantFeatures = otherRoleFeatures.filter(feature =>
    tutorialContent.steps.some(step =>
      step.id.includes(feature) ||
      step.title.toLowerCase().includes(feature.replace('-', ' '))
    )
  );

  return {
    hasContamination: irrelevantFeatures.length > TEST_CONFIG.CROSS_CONTAMINATION.MAX_IRRELEVANT_FEATURES,
    irrelevantFeatures,
    contaminationCount: irrelevantFeatures.length
  };
};

/**
 * Validate progress indicators
 */
export const validateProgressIndicators = (container) => {
  const progressElements = container.querySelectorAll(SELECTORS.PROGRESS);
  return {
    hasProgress: progressElements.length > 0,
    progressCount: progressElements.length
  };
};

/**
 * Check for next steps content
 */
export const checkNextStepsContent = (container, userRole) => {
  const nextStepsElements = container.querySelectorAll(SELECTORS.NEXT_STEPS);
  
  if (nextStepsElements.length === 0) {
    return { hasNextSteps: false };
  }

  const nextStepsContent = Array.from(nextStepsElements)
    .map(el => el.textContent.toLowerCase())
    .join(' ');

  // Role-specific next step validation patterns
  const rolePatterns = {
    super_admin: /platform|system|estate|health/,
    admin: /user|approval|visitor|report|setting/,
    guard: /qr|scanner|visitor|queue|emergency/,
    resident: /invitation|guest|visitor|notification|favorite/
  };

  const expectedPattern = rolePatterns[userRole];
  const isRelevant = expectedPattern ? expectedPattern.test(nextStepsContent) : true;

  return {
    hasNextSteps: true,
    isRelevant,
    content: nextStepsContent
  };
};

/**
 * Create comprehensive assertion helpers
 */
export const AssertionHelpers = {
  /**
   * Assert feature coverage meets threshold
   */
  assertFeatureCoverage: (coverage, threshold, _role) => {
    expect(coverage).toBeGreaterThanOrEqual(threshold);
  },

  /**
   * Assert action coverage meets threshold
   */
  assertActionCoverage: (coverage, threshold, _role) => {
    expect(coverage).toBeGreaterThanOrEqual(threshold);
  },

  /**
   * Assert tutorial structure is valid
   */
  assertTutorialStructure: (tutorialContent, role) => {
    const validation = validateTutorialStructure(tutorialContent, role);
    if (!validation.isValid) {
      throw new Error(`Tutorial structure validation failed: ${validation.errors.join(', ')}`);
    }
  },

  /**
   * Assert accessibility compliance
   */
  assertAccessibilityCompliance: (container) => {
    const compliance = checkAccessibilityCompliance(container);
    if (!compliance.isCompliant) {
      throw new Error(`Accessibility compliance failed: ${compliance.violations.join(', ')}`);
    }
  },

  /**
   * Assert role-appropriate title
   */
  assertRoleTitle: (container, role) => {
    const validation = validateRoleTitle(container, role);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
  }
};

/**
 * Performance measurement utilities
 */
export const PerformanceUtils = {
  /**
   * Measure rendering time
   */
  measureRenderTime: (renderFunction) => {
    const startTime = performance.now();
    const result = renderFunction();
    const endTime = performance.now();
    
    return {
      ...result,
      renderTime: endTime - startTime
    };
  },

  /**
   * Check if render time is within acceptable limits
   */
  isRenderTimeAcceptable: (renderTime, maxTime = 100) => {
    return renderTime <= maxTime;
  }
};

/**
 * Debug utilities for test development
 */
export const DebugUtils = {
  /**
   * Log tutorial content structure for debugging
   */
  logTutorialContent: (tutorialContent, label = 'Tutorial Content') => {
    console.log(`\n=== ${label} ===`);
    console.log('Steps:', tutorialContent.steps.map(s => ({ id: s.id, title: s.title })));
    console.log('Actions:', tutorialContent.actions.map(a => ({ id: a.id, type: a.type })));
    console.log('Features:', tutorialContent.features.map(f => ({ id: f.id, title: f.title })));
  },

  /**
   * Log accessibility analysis results
   */
  logAccessibilityResults: (container, label = 'Accessibility Check') => {
    const compliance = checkAccessibilityCompliance(container);
    console.log(`\n=== ${label} ===`);
    console.log('Compliant:', compliance.isCompliant);
    if (!compliance.isCompliant) {
      console.log('Violations:', compliance.violations);
    }
  }
};
// Placeholder test to prevent "no tests" error
if (typeof describe !== 'undefined') {
  describe('Tutorial Test Utils', () => {
    test('should export utility functions', () => {
      expect(renderWelcomeFlow).toBeDefined();
      expect(extractTutorialContent).toBeDefined();
      expect(checkRoleRelevance).toBeDefined();
      expect(AssertionHelpers).toBeDefined();
    });
  });
}
