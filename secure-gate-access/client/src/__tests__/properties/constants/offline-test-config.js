/**
 * Offline Functionality Test Configuration Constants
 * 
 * DEPRECATED: This file now uses the new modular configuration system.
 * The monolithic configuration has been replaced with focused, maintainable modules.
 * 
 * @deprecated Use the modular configuration system from './index.js' instead
 * @see ./index.js for the new centralized configuration access
 * @see ./test-execution.js for test execution parameters
 * @see ./network-conditions.js for network simulation configurations
 * @see ./validation-rules.js for data validation rules
 * @see ./security-patterns.js for security testing patterns
 * @see ./performance-benchmarks.js for performance thresholds
 * @see ./error-scenarios.js for error simulation configurations
 */

// Import from the new modular configuration system
import { 
  TEST_CONFIG as MODULAR_TEST_CONFIG,
  ConfigUtils,
  getTestConfig,
  getScenarioConfig
} from './index.js';

// Re-export the main configuration for backward compatibility
export const TEST_CONFIG = MODULAR_TEST_CONFIG.EXECUTION;

// Re-export individual sections for backward compatibility
export const NETWORK_CONDITIONS = MODULAR_TEST_CONFIG.NETWORK.CONDITIONS;
export const VALIDATION_RULES = MODULAR_TEST_CONFIG.VALIDATION.RULES;
export const SECURITY_PATTERNS = MODULAR_TEST_CONFIG.SECURITY;
export const PERFORMANCE_BENCHMARKS = MODULAR_TEST_CONFIG.PERFORMANCE.PERFORMANCE_BENCHMARKS;
export const ERROR_SCENARIOS = MODULAR_TEST_CONFIG.ERRORS.ERROR_SCENARIOS;

// Legacy aliases for backward compatibility
export const PROPERTY_RUNS = MODULAR_TEST_CONFIG.PROPERTY_RUNS;
export const TEST_RUNS = MODULAR_TEST_CONFIG.TEST_RUNS;
export const TIMEOUTS = MODULAR_TEST_CONFIG.TIMEOUTS;
export const RETRY_ATTEMPTS = MODULAR_TEST_CONFIG.RETRY_ATTEMPTS;
export const MOCK_DELAYS = MODULAR_TEST_CONFIG.MOCK_DELAYS;
export const GENERATION_LIMITS = MODULAR_TEST_CONFIG.GENERATION_LIMITS;

// Essential offline capabilities that must always be available
export const ESSENTIAL_CAPABILITIES = [
  'View cached visitor data',
  'Queue visitor actions for sync',
  'Access basic navigation',
  'View user preferences',
  'Emergency contact information'
];

// Optional capabilities that enhance offline experience
export const OPTIONAL_CAPABILITIES = [
  'Offline form submission',
  'Local data storage',
  'Background sync',
  'Push notifications',
  'Service worker updates'
];

// Visitor status transitions for testing
export const VISITOR_STATUS_TRANSITIONS = {
  'PENDING': ['APPROVED', 'REVOKED'],
  'APPROVED': ['ON_PREMISE', 'REVOKED'],
  'ON_PREMISE': ['CHECKED_OUT'],
  'CHECKED_OUT': [],
  'REVOKED': []
};

// Action types for queue testing
export const ACTION_TYPES = {
  VISITOR_ACTION: 'visitor_action',
  USER_PREFERENCES: 'user_preferences',
  INCIDENT_REPORT: 'incident_report',
  SYSTEM_UPDATE: 'system_update'
};

// Error messages for better test feedback
export const ERROR_MESSAGES = {
  CAPABILITY_MISSING: (capability) => 
    `Essential capability '${capability}' is missing from offline capabilities`,
  
  CACHE_STRUCTURE_INVALID: (field) => 
    `Cached data structure is invalid: missing or invalid '${field}' field`,
  
  SYNC_RESULT_INVALID: (field, expected, actual) => 
    `Sync result invalid: ${field} expected ${expected}, got ${actual}`,
  
  PERFORMANCE_THRESHOLD_EXCEEDED: (operation, time, threshold) => 
    `Performance threshold exceeded: ${operation} took ${time}ms, threshold is ${threshold}ms`,
  
  SECURITY_VIOLATION: (pattern, data) => 
    `Security violation detected: ${pattern} found in data: ${data}`,
  
  STORAGE_QUOTA_WARNING: (used, total) => 
    `Storage quota warning: ${used}/${total} bytes used (${((used/total)*100).toFixed(1)}%)`,
  
  NETWORK_STATE_MISMATCH: (expected, actual) => 
    `Network state mismatch: expected ${expected}, got ${actual}`
};

// DOM selectors for offline functionality testing
export const SELECTORS = {
  OFFLINE_INDICATOR: '[data-testid="offline-indicator"]',
  SYNC_STATUS: '[data-testid="sync-status"]',
  CACHED_DATA: '[data-testid="cached-data"]',
  QUEUE_STATUS: '[data-testid="queue-status"]',
  ERROR_MESSAGE: '[data-testid="error-message"]',
  RETRY_BUTTON: '[data-testid="retry-button"]',
  CLEAR_CACHE_BUTTON: '[data-testid="clear-cache-button"]'
};

// Analytics events for offline functionality
export const ANALYTICS_EVENTS = {
  OFFLINE_MODE_ENTERED: 'Offline Mode Entered',
  OFFLINE_MODE_EXITED: 'Offline Mode Exited',
  SYNC_STARTED: 'Sync Started',
  SYNC_COMPLETED: 'Sync Completed',
  SYNC_FAILED: 'Sync Failed',
  CACHE_CLEARED: 'Cache Cleared',
  STORAGE_QUOTA_EXCEEDED: 'Storage Quota Exceeded'
};

// Utility functions for enhanced configuration access
export const ConfigurationUtils = {
  /**
   * Get configuration optimized for a specific test scenario
   * @param {string} scenario - Test scenario (unit, integration, e2e, performance, security)
   * @returns {Object} Optimized configuration
   */
  getScenarioConfig,
  
  /**
   * Get configuration for a specific category
   * @param {string} category - Configuration category
   * @param {Object} overrides - Optional overrides
   * @returns {Object} Category configuration
   */
  getTestConfig,
  
  /**
   * Access configuration utilities
   */
  utils: ConfigUtils,
  
  /**
   * Validate configuration data
   * @param {*} data - Data to validate
   * @param {Object} rules - Validation rules
   * @returns {Object} Validation result
   */
  validateData: ConfigUtils.validateData,
  
  /**
   * Detect security threats in data
   * @param {*} data - Data to check
   * @returns {Object} Security analysis result
   */
  detectSecurityThreats: ConfigUtils.detectSecurityThreats,
  
  /**
   * Evaluate performance metrics
   * @param {Object} metrics - Performance metrics
   * @param {string} category - Performance category
   * @param {string} deviceType - Device type
   * @returns {Object} Performance evaluation
   */
  evaluatePerformance: ConfigUtils.evaluatePerformance,
  
  /**
   * Create error objects for testing
   * @param {string} errorType - Type of error to create
   * @returns {Error} Error object with enhanced properties
   */
  createError: ConfigUtils.createError
};

// Migration guide for developers
export const MIGRATION_GUIDE = {
  message: `
    🔄 CONFIGURATION SYSTEM MIGRATION GUIDE
    
    The offline test configuration has been modernized with a modular architecture.
    
    OLD USAGE:
    import { TEST_CONFIG, NETWORK_CONDITIONS } from './constants/offline-test-config.js';
    
    NEW USAGE (RECOMMENDED):
    import { TEST_CONFIG, getTestConfig, getScenarioConfig } from './constants/index.js';
    
    BENEFITS:
    ✅ Modular, maintainable configuration
    ✅ Runtime validation and type checking
    ✅ Environment-specific overrides
    ✅ Immutability protection
    ✅ Enhanced error reporting
    ✅ Scenario-optimized configurations
    
    BACKWARD COMPATIBILITY:
    This file maintains backward compatibility, but consider migrating to the new system.
    
    For more information, see:
    - ./index.js - Main configuration entry point
    - ./config-validator.js - Configuration validation
    - ./__tests__/config-validation.test.js - Usage examples
  `,
  
  examples: {
    basic: `
      // Basic usage (backward compatible)
      import { TEST_CONFIG } from './constants/offline-test-config.js';
      const runs = TEST_CONFIG.PROPERTY_RUNS.OFFLINE_CAPABILITIES;
    `,
    
    enhanced: `
      // Enhanced usage (recommended)
      import { getScenarioConfig } from './constants/index.js';
      const config = getScenarioConfig('unit');
      const runs = config.PROPERTY_RUNS.OFFLINE_CAPABILITIES;
    `,
    
    validation: `
      // With validation
      import { ConfigurationUtils } from './constants/offline-test-config.js';
      const result = ConfigurationUtils.validateData(visitorData, VALIDATION_RULES.VISITOR);
    `,
    
    performance: `
      // Performance evaluation
      import { ConfigurationUtils } from './constants/offline-test-config.js';
      const result = ConfigurationUtils.evaluatePerformance(metrics, 'UI_RESPONSE', 'MID_RANGE');
    `
  }
};

// Export the complete modular configuration system
export default MODULAR_TEST_CONFIG;

if (typeof describe !== 'undefined') {
  describe('Offline Test Config', () => {
    test('exports offline configuration', () => {
      expect(TEST_CONFIG).toBeDefined();
      expect(NETWORK_CONDITIONS).toBeDefined();
      expect(ESSENTIAL_CAPABILITIES).toBeDefined();
    });
  });
}
