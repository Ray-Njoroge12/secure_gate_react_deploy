/**
 * Tutorial Test Data Factories
 * 
 * Factory functions for generating consistent test data for onboarding tutorial tests.
 * Provides reusable generators with proper constraints and validation.
 */

import fc from 'fast-check';

import { GENERATION_CONSTRAINTS, ROLE_FEATURE_REQUIREMENTS, ROLE_ESSENTIAL_ACTIONS } from '../constants/tutorial-test-config.js';

/**
 * User role generator with all supported roles
 */
export const userRoleGenerator = fc.constantFrom(...GENERATION_CONSTRAINTS.ROLES);

/**
 * User data generator with realistic constraints
 */
export const userGenerator = fc.record({
  id: fc.integer({ 
    min: GENERATION_CONSTRAINTS.USER_ID.min, 
    max: GENERATION_CONSTRAINTS.USER_ID.max 
  }),
  role: userRoleGenerator,
  email: fc.emailAddress(),
  username: fc.string({
    minLength: GENERATION_CONSTRAINTS.USERNAME.minLength,
    maxLength: GENERATION_CONSTRAINTS.USERNAME.maxLength
  }).filter((value) => value.trim().length >= GENERATION_CONSTRAINTS.USERNAME.minLength),
  verified: fc.boolean(),
  estate_id: fc.integer({ 
    min: GENERATION_CONSTRAINTS.ESTATE_ID.min, 
    max: GENERATION_CONSTRAINTS.ESTATE_ID.max 
  })
});

/**
 * Onboarding context generator for different scenarios
 */
export const onboardingContextGenerator = fc.record({
  isNewUser: fc.boolean(),
  hasCompletedOnboarding: fc.boolean(),
  preferredLanguage: fc.constantFrom(...GENERATION_CONSTRAINTS.LANGUAGES),
  deviceType: fc.constantFrom(...GENERATION_CONSTRAINTS.DEVICE_TYPES),
  accessibilityNeeds: fc.record({
    screenReader: fc.boolean(),
    highContrast: fc.boolean(),
    reducedMotion: fc.boolean(),
    keyboardOnly: fc.boolean()
  })
});

/**
 * Create a user with specific role for targeted testing
 */
export const createUserWithRole = (role) => ({
  id: 1,
  role,
  email: `${role}@test.com`,
  username: `test_${role}`,
  verified: true,
  estate_id: 1
});

/**
 * Create test user with random valid data
 */
export const createRandomUser = () => {
  const roles = GENERATION_CONSTRAINTS.ROLES;
  const role = roles[Math.floor(Math.random() * roles.length)];
  
  return {
    id: Math.floor(Math.random() * GENERATION_CONSTRAINTS.USER_ID.max) + 1,
    role,
    email: `test_${Date.now()}@example.com`,
    username: `user_${Date.now()}`,
    verified: Math.random() > 0.5,
    estate_id: Math.floor(Math.random() * GENERATION_CONSTRAINTS.ESTATE_ID.max) + 1
  };
};

/**
 * Create onboarding context with specific accessibility needs
 */
export const createAccessibilityContext = (needs = {}) => ({
  isNewUser: true,
  hasCompletedOnboarding: false,
  preferredLanguage: 'en',
  deviceType: 'desktop',
  accessibilityNeeds: {
    screenReader: false,
    highContrast: false,
    reducedMotion: false,
    keyboardOnly: false,
    ...needs
  }
});

/**
 * Create mobile-specific onboarding context
 */
export const createMobileContext = () => ({
  isNewUser: true,
  hasCompletedOnboarding: false,
  preferredLanguage: 'en',
  deviceType: 'mobile',
  accessibilityNeeds: {
    screenReader: false,
    highContrast: false,
    reducedMotion: false,
    keyboardOnly: false
  }
});

/**
 * Get required features for a specific role
 */
export const getRequiredFeaturesForRole = (role) => {
  return ROLE_FEATURE_REQUIREMENTS[role] || [];
};

/**
 * Get essential actions for a specific role
 */
export const getEssentialActionsForRole = (role) => {
  return ROLE_ESSENTIAL_ACTIONS[role] || [];
};

/**
 * Get features from other roles (for cross-contamination testing)
 */
export const getOtherRoleFeatures = (excludeRole) => {
  return Object.entries(ROLE_FEATURE_REQUIREMENTS)
    .filter(([role]) => role !== excludeRole)
    .flatMap(([, features]) => features);
};

/**
 * Create mock analytics object for testing
 * Note: This function should only be called within Jest test environment
 */
export const createMockAnalytics = () => {
  // Check if we're in a Jest environment
  if (typeof jest === 'undefined') {
    return {
      track: () => {}
    };
  }
  
  return {
    track: jest.fn()
  };
};

/**
 * Create test wrapper props with defaults
 * Note: This function should only be called within Jest test environment
 */
export const createTestWrapperProps = (user, theme = 'light') => {
  // Create mock functions only if Jest is available
  const createMockFn = () => typeof jest !== 'undefined' ? jest.fn() : () => {};
  
  return {
    user,
    theme,
    authContextValue: {
      user,
      isAuthenticated: true,
      login: createMockFn(),
      logout: createMockFn(),
      register: createMockFn()
    },
    themeContextValue: {
      theme,
      setTheme: createMockFn(),
      isDark: theme === 'dark',
      colors: {},
      spacing: {},
      typography: {}
    }
  };
};

/**
 * Create welcome flow props with defaults
 * Note: This function should only be called within Jest test environment
 */
export const createWelcomeFlowProps = (user, context = {}) => {
  const createMockFn = () => typeof jest !== 'undefined' ? jest.fn() : () => {};
  
  return {
    role: user.role,
    onComplete: createMockFn(),
    isNewUser: context.isNewUser || true,
    ...context
  };
};

/**
 * Generate test scenarios for comprehensive coverage
 */
export const generateTestScenarios = () => {
  const scenarios = [];
  
  // Generate scenarios for each role
  GENERATION_CONSTRAINTS.ROLES.forEach(role => {
    scenarios.push({
      name: `${role} role basic scenario`,
      user: createUserWithRole(role),
      context: createMobileContext()
    });
    
    scenarios.push({
      name: `${role} role with accessibility needs`,
      user: createUserWithRole(role),
      context: createAccessibilityContext({ screenReader: true, keyboardOnly: true })
    });
  });
  
  // Generate cross-device scenarios
  GENERATION_CONSTRAINTS.DEVICE_TYPES.forEach(deviceType => {
    scenarios.push({
      name: `resident role on ${deviceType}`,
      user: createUserWithRole('resident'),
      context: { ...createMobileContext(), deviceType }
    });
  });
  
  return scenarios;
};

/**
 * Property test generators for specific test cases
 */
export const PropertyGenerators = {
  // Generator for role-specific content testing
  roleContentTest: [userGenerator, onboardingContextGenerator],
  
  // Generator for essential features testing
  essentialFeaturesTest: userRoleGenerator,
  
  // Generator for tutorial length testing
  tutorialLengthTest: userGenerator,
  
  // Generator for accessibility testing
  accessibilityTest: [userGenerator, onboardingContextGenerator],
  
  // Generator for progress tracking testing
  progressTrackingTest: userGenerator,
  
  // Generator for next steps testing
  nextStepsTest: userRoleGenerator
};

// Placeholder test to prevent "no tests" error
if (typeof describe !== 'undefined') {
  describe('Tutorial Test Factories', () => {
    test('should export factory functions', () => {
      expect(userGenerator).toBeDefined();
      expect(createUserWithRole).toBeDefined();
      expect(getRequiredFeaturesForRole).toBeDefined();
    });
  });
}
