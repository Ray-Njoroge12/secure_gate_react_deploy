/**
 * Tutorial Test Configuration Constants
 * 
 * Centralized configuration for onboarding tutorial property-based tests.
 * Extracted from hardcoded values to improve maintainability and consistency.
 */

// Test execution configuration
export const TEST_CONFIG = {
  // Property test run counts
  PROPERTY_RUNS: {
    ROLE_SPECIFIC_CONTENT: 50,
    ESSENTIAL_FEATURES: 25,
    TUTORIAL_LENGTH: 30,
    ACCESSIBILITY: 25,
    PROGRESS_TRACKING: 20,
    NEXT_STEPS: 20
  },

  // Performance thresholds
  PERFORMANCE: {
    FEATURE_COVERAGE_THRESHOLD: 0.8,  // 80% of required features
    ACTION_COVERAGE_THRESHOLD: 0.75,  // 75% of essential actions
    MIN_CONTENT_LENGTH: 50,           // Minimum meaningful content
    MAX_CONTENT_LENGTH: 2000,         // Maximum to avoid overwhelming
    MIN_TITLE_LENGTH: 1,              // Minimum title length
    MIN_MEANINGFUL_CONTENT: 10        // Minimum meaningful content
  },

  // Tutorial step count expectations by role
  STEP_COUNTS: {
    super_admin: { min: 3, max: 6 },
    admin: { min: 3, max: 6 },
    guard: { min: 3, max: 5 },
    resident: { min: 3, max: 5 }
  },

  // Accessibility requirements
  ACCESSIBILITY: {
    MIN_ARIA_ELEMENTS: 1,
    MIN_FOCUSABLE_ELEMENTS: 1,
    MIN_LIVE_REGIONS: 1,
    MIN_HEADINGS: 1,
    MAX_HEADING_LEVEL_JUMP: 1  // No skipping heading levels
  },

  // Cross-contamination tolerance
  CROSS_CONTAMINATION: {
    MAX_MISSING_FEATURES: 1,      // Allow 1 missing required feature
    MAX_IRRELEVANT_FEATURES: 1    // Allow minimal cross-role features
  }
};

// Role-specific feature requirements
export const ROLE_FEATURE_REQUIREMENTS = {
  super_admin: [
    'platform-overview',
    'estate-management', 
    'system-monitoring',
    'user-support'
  ],
  admin: [
    'estate-overview',
    'user-management',
    'visitor-oversight', 
    'reporting-analytics'
  ],
  guard: [
    'security-overview',
    'visitor-processing',
    'qr-scanning',
    'incident-management'
  ],
  resident: [
    'community-overview',
    'visitor-invitations',
    'guest-management',
    'community-features'
  ]
};

// Essential actions by role
export const ROLE_ESSENTIAL_ACTIONS = {
  super_admin: [
    'impersonateEstate',
    'systemMaintenance', 
    'globalAnnouncement',
    'supportEscalation'
  ],
  admin: [
    'approveUser',
    'createAnnouncement',
    'generateReport',
    'manageSettings'
  ],
  guard: [
    'scanQR',
    'manualCheckIn',
    'emergencyAlert',
    'incidentReport'
  ],
  resident: [
    'inviteGuest',
    'manageVisitors',
    'setPreferences',
    'viewAnnouncements'
  ]
};

// Role-specific title patterns for validation
export const ROLE_TITLE_PATTERNS = {
  super_admin: /platform|administration|system/,
  admin: /estate|administration|management/,
  guard: /security|guard|operations/,
  resident: /community|resident|welcome/
};

// DOM selectors for tutorial elements
export const SELECTORS = {
  STEPS: '[data-testid*="step-"], .step-container',
  ACTIONS: 'button[aria-label*="action"], .quick-action',
  FEATURES: '[data-testid*="feature-"], .feature-card',
  PROGRESS: '[role="progressbar"], .progress-indicator',
  NEXT_STEPS: '.next-steps, [data-testid*="next-steps"], .welcome-flow__next-steps',
  TITLE: 'h1',
  CONTINUE_BUTTON: 'button[aria-label*="Continue"]',
  
  // Accessibility selectors
  ARIA_ELEMENTS: '[aria-label]:not([aria-label=""]), [aria-labelledby]:not([aria-labelledby=""]), [role]',
  FOCUSABLE_ELEMENTS: 'button, [tabindex], input, select, textarea, a[href]',
  LIVE_REGIONS: '[aria-live]',
  HEADINGS: 'h1, h2, h3, h4, h5, h6'
};

// Analytics event names for tracking validation
export const ANALYTICS_EVENTS = {
  WELCOME_FLOW_STARTED: 'Welcome Flow Started',
  TUTORIAL_STEP_COMPLETED: 'Tutorial Step Completed'
};

// Test data generation constraints
export const GENERATION_CONSTRAINTS = {
  USER_ID: { min: 1, max: 10000 },
  ESTATE_ID: { min: 1, max: 100 },
  USERNAME: { minLength: 3, maxLength: 20 },
  
  // Supported values
  ROLES: ['super_admin', 'admin', 'guard', 'resident'],
  LANGUAGES: ['en', 'es', 'fr'],
  DEVICE_TYPES: ['mobile', 'tablet', 'desktop']
};

// Error messages for better test feedback
export const ERROR_MESSAGES = {
  FEATURE_COVERAGE: (actual, expected, role) => 
    `Feature coverage ${(actual * 100).toFixed(1)}% below threshold ${(expected * 100)}% for role ${role}`,
  
  ACTION_COVERAGE: (actual, expected, role) => 
    `Action coverage ${(actual * 100).toFixed(1)}% below threshold ${(expected * 100)}% for role ${role}`,
  
  STEP_COUNT: (actual, min, max, role) => 
    `Step count ${actual} outside expected range ${min}-${max} for role ${role}`,
  
  MISSING_FEATURES: (missing, role) => 
    `Missing required features for ${role}: ${missing.join(', ')}`,
  
  IRRELEVANT_FEATURES: (irrelevant, role) => 
    `Found irrelevant features for ${role}: ${irrelevant.join(', ')}`,
  
  ACCESSIBILITY_VIOLATION: (element, requirement) => 
    `Accessibility violation: ${element} does not meet ${requirement} requirement`
};

// Placeholder test to prevent "no tests" error
if (typeof describe !== 'undefined') {
  describe('Tutorial Test Config', () => {
    test('should export configuration constants', () => {
      expect(TEST_CONFIG).toBeDefined();
      expect(ROLE_FEATURE_REQUIREMENTS).toBeDefined();
      expect(SELECTORS).toBeDefined();
    });
  });
}
