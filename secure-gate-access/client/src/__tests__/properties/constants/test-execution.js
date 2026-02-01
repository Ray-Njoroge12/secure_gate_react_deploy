/**
 * Test Execution Configuration
 * 
 * Centralized configuration for test execution parameters, timeouts, and run counts.
 * This module focuses specifically on test execution behavior and performance.
 */

// Environment detection
const getEnvironment = () => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV || 'development';
  }
  return 'development';
};

const isCI = () => {
  return typeof process !== 'undefined' && process.env && (
    process.env.CI === 'true' || 
    process.env.CONTINUOUS_INTEGRATION === 'true' ||
    process.env.GITHUB_ACTIONS === 'true'
  );
};

// Base configuration
const BASE_CONFIG = {
  // Property test run counts - base values
  PROPERTY_RUNS: {
    OFFLINE_CAPABILITIES: 20,
    CACHED_DATA_ACCESS: 25,
    ACTION_QUEUING: 20,
    SYNC_PROCESSING: 15,
    PREFERENCES_PRESERVATION: 20,
    ERROR_RESILIENCE: 10,
    PERFORMANCE_VALIDATION: 5,
    SECURITY_VALIDATION: 15,
    CONCURRENT_OPERATIONS: 10
  },

  // Test execution parameters
  TEST_RUNS: { 
    quick: 5,
    standard: 20, 
    comprehensive: 50,
    performance: 5,
    security: 15,
    stress: 100
  },

  // Timeout configurations (milliseconds)
  TIMEOUTS: {
    sync: 5000,
    network: 3000,
    cleanup: 1000,
    storage: 2000,
    test: 30000,
    setup: 10000,
    teardown: 5000
  },

  // Retry configurations
  RETRY_ATTEMPTS: {
    sync: 3,
    network: 2,
    storage: 2,
    test: 1
  },

  // Mock delays for realistic testing (milliseconds)
  MOCK_DELAYS: {
    sync: 100,
    network: 50,
    storage: 25,
    ui: 10,
    animation: 200
  },

  // Data generation constraints
  GENERATION_LIMITS: {
    VISITOR_ID_RANGE: { min: 1, max: 1000 },
    NAME_LENGTH: { min: 1, max: 50 },
    PHONE_LENGTH: { min: 10, max: 15 },
    PURPOSE_LENGTH: { min: 1, max: 100 },
    ARRAY_SIZES: { min: 1, max: 5 },
    BULK_ARRAY_SIZES: { min: 1, max: 3 },
    LARGE_ARRAY_SIZES: { min: 10, max: 20 }
  }
};

// Environment-specific overrides
const ENVIRONMENT_OVERRIDES = {
  development: {
    PROPERTY_RUNS: {
      OFFLINE_CAPABILITIES: 10,
      CACHED_DATA_ACCESS: 15,
      ACTION_QUEUING: 10,
      SYNC_PROCESSING: 8,
      PREFERENCES_PRESERVATION: 10,
      ERROR_RESILIENCE: 5,
      PERFORMANCE_VALIDATION: 3,
      SECURITY_VALIDATION: 8,
      CONCURRENT_OPERATIONS: 5
    },
    TEST_RUNS: {
      quick: 3,
      standard: 10,
      comprehensive: 25,
      performance: 3,
      security: 8,
      stress: 50
    },
    TIMEOUTS: {
      sync: 10000,
      network: 5000,
      cleanup: 2000,
      storage: 3000,
      test: 60000,
      setup: 15000,
      teardown: 10000
    }
  },

  test: {
    PROPERTY_RUNS: {
      OFFLINE_CAPABILITIES: 15,
      CACHED_DATA_ACCESS: 20,
      ACTION_QUEUING: 15,
      SYNC_PROCESSING: 12,
      PREFERENCES_PRESERVATION: 15,
      ERROR_RESILIENCE: 8,
      PERFORMANCE_VALIDATION: 4,
      SECURITY_VALIDATION: 12,
      CONCURRENT_OPERATIONS: 8
    },
    TEST_RUNS: {
      quick: 4,
      standard: 15,
      comprehensive: 35,
      performance: 4,
      security: 12,
      stress: 75
    }
  },

  ci: {
    PROPERTY_RUNS: {
      OFFLINE_CAPABILITIES: 30,
      CACHED_DATA_ACCESS: 40,
      ACTION_QUEUING: 30,
      SYNC_PROCESSING: 25,
      PREFERENCES_PRESERVATION: 30,
      ERROR_RESILIENCE: 15,
      PERFORMANCE_VALIDATION: 8,
      SECURITY_VALIDATION: 25,
      CONCURRENT_OPERATIONS: 15
    },
    TEST_RUNS: {
      quick: 8,
      standard: 30,
      comprehensive: 75,
      performance: 8,
      security: 25,
      stress: 150
    },
    TIMEOUTS: {
      sync: 15000,
      network: 10000,
      cleanup: 5000,
      storage: 8000,
      test: 120000,
      setup: 30000,
      teardown: 15000
    }
  },

  production: {
    // Production should use minimal test runs for smoke tests only
    PROPERTY_RUNS: {
      OFFLINE_CAPABILITIES: 5,
      CACHED_DATA_ACCESS: 5,
      ACTION_QUEUING: 5,
      SYNC_PROCESSING: 3,
      PREFERENCES_PRESERVATION: 5,
      ERROR_RESILIENCE: 3,
      PERFORMANCE_VALIDATION: 2,
      SECURITY_VALIDATION: 5,
      CONCURRENT_OPERATIONS: 3
    },
    TEST_RUNS: {
      quick: 2,
      standard: 5,
      comprehensive: 10,
      performance: 2,
      security: 5,
      stress: 20
    }
  }
};

/**
 * Merges configuration objects with environment-specific overrides
 * @param {Object} base - Base configuration object
 * @param {Object} override - Environment-specific overrides
 * @returns {Object} Merged configuration
 */
function mergeConfig(base, override) {
  const result = { ...base };
  
  for (const [key, value] of Object.entries(override)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = { ...result[key], ...value };
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Gets the appropriate configuration for the current environment
 * @returns {Object} Environment-specific test execution configuration
 */
function getTestExecutionConfig() {
  const environment = getEnvironment();
  const isCIEnvironment = isCI();
  
  // Use CI overrides if in CI environment, regardless of NODE_ENV
  const effectiveEnvironment = isCIEnvironment ? 'ci' : environment;
  
  const overrides = ENVIRONMENT_OVERRIDES[effectiveEnvironment] || {};
  return mergeConfig(BASE_CONFIG, overrides);
}

// Import deep freeze utility
import { deepFreeze } from './immutable-utils.js';

// Export the configuration with deep freezing
export const TEST_EXECUTION_CONFIG = deepFreeze(getTestExecutionConfig());

// Export individual sections for convenience with deep freezing
export const PROPERTY_RUNS = deepFreeze(TEST_EXECUTION_CONFIG.PROPERTY_RUNS);
export const TEST_RUNS = deepFreeze(TEST_EXECUTION_CONFIG.TEST_RUNS);
export const TIMEOUTS = deepFreeze(TEST_EXECUTION_CONFIG.TIMEOUTS);
export const RETRY_ATTEMPTS = deepFreeze(TEST_EXECUTION_CONFIG.RETRY_ATTEMPTS);
export const MOCK_DELAYS = deepFreeze(TEST_EXECUTION_CONFIG.MOCK_DELAYS);
export const GENERATION_LIMITS = deepFreeze(TEST_EXECUTION_CONFIG.GENERATION_LIMITS);

// Export utility functions
export { getEnvironment, isCI, mergeConfig, getTestExecutionConfig };

// Default export for convenience
export default TEST_EXECUTION_CONFIG;

if (typeof describe !== 'undefined') {
  describe('Test Execution Config', () => {
    test('exports execution configuration', () => {
      expect(TEST_EXECUTION_CONFIG).toBeDefined();
      expect(PROPERTY_RUNS).toBeDefined();
      expect(getEnvironment).toBeDefined();
    });
  });
}
