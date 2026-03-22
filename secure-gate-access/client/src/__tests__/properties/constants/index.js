/**
 * Test Configuration Index
 * 
 * Centralized entry point for all test configuration modules.
 * Provides a unified interface for accessing configuration with validation and environment support.
 */

// Import individual configuration modules
import { 
  TEST_EXECUTION_CONFIG, 
  PROPERTY_RUNS, 
  TEST_RUNS, 
  TIMEOUTS, 
  RETRY_ATTEMPTS, 
  MOCK_DELAYS, 
  GENERATION_LIMITS,
  getEnvironment,
  isCI
} from './test-execution.js';

import { 
  NETWORK_CONDITIONS, 
  NETWORK_TRANSITIONS, 
  NETWORK_QUALITY_THRESHOLDS,
  CONNECTION_CAPABILITIES,
  categorizeNetworkQuality,
  getConnectionCapabilities,
  simulateNetworkTransition,
  createCustomNetworkCondition
} from './network-conditions.js';

import { 
  VALIDATION_RULES, 
  BUSINESS_RULES, 
  SANITIZATION_RULES,
  validateData,
  sanitizeData,
  validateBusinessRules
} from './validation-rules.js';

import { 
  SECURITY_PATTERNS,
  detectSecurityThreats,
  generateSecurityTestCases,
  validateSecurityConfig
} from './security-patterns.js';

import { 
  PERFORMANCE_CONFIG,
  evaluatePerformance,
  generatePerformanceTestScenarios,
  calculateBudgetCompliance
} from './performance-benchmarks.js';

import { 
  ERROR_CONFIG,
  ERROR_SCENARIOS,
  createError,
  getRecoveryStrategy,
  simulateErrorCondition,
  validateErrorHandling
} from './error-scenarios.js';

import { ConfigValidator } from './config-validator.js';
import { deepFreeze } from './immutable-utils.js';

// Environment detection and configuration
const CURRENT_ENVIRONMENT = getEnvironment();
const IS_CI_ENVIRONMENT = isCI();

// Consolidated configuration object
export const TEST_CONFIG = deepFreeze({
  // Environment information
  ENVIRONMENT: {
    current: CURRENT_ENVIRONMENT,
    isCI: IS_CI_ENVIRONMENT,
    isDevelopment: CURRENT_ENVIRONMENT === 'development',
    isTest: CURRENT_ENVIRONMENT === 'test',
    isProduction: CURRENT_ENVIRONMENT === 'production'
  },

  // Test execution configuration
  EXECUTION: TEST_EXECUTION_CONFIG,
  
  // Individual execution components for convenience
  PROPERTY_RUNS,
  TEST_RUNS,
  TIMEOUTS,
  RETRY_ATTEMPTS,
  MOCK_DELAYS,
  GENERATION_LIMITS,

  // Network simulation configuration
  NETWORK: {
    CONDITIONS: NETWORK_CONDITIONS,
    TRANSITIONS: NETWORK_TRANSITIONS,
    QUALITY_THRESHOLDS: NETWORK_QUALITY_THRESHOLDS,
    CONNECTION_CAPABILITIES: CONNECTION_CAPABILITIES
  },

  // Data validation configuration
  VALIDATION: {
    RULES: VALIDATION_RULES,
    BUSINESS_RULES: BUSINESS_RULES,
    SANITIZATION_RULES: SANITIZATION_RULES
  },

  // Security testing configuration
  SECURITY: SECURITY_PATTERNS,

  // Performance testing configuration
  PERFORMANCE: PERFORMANCE_CONFIG,

  // Error simulation configuration
  ERRORS: ERROR_CONFIG
});

// Configuration utilities
export const ConfigUtils = deepFreeze({
  // Environment utilities
  getEnvironment,
  isCI,
  
  // Network utilities
  categorizeNetworkQuality,
  getConnectionCapabilities,
  simulateNetworkTransition,
  createCustomNetworkCondition,
  
  // Validation utilities
  validateData,
  sanitizeData,
  validateBusinessRules,
  
  // Security utilities
  detectSecurityThreats,
  generateSecurityTestCases,
  validateSecurityConfig,
  
  // Performance utilities
  evaluatePerformance,
  generatePerformanceTestScenarios,
  calculateBudgetCompliance,
  
  // Error utilities
  createError,
  getRecoveryStrategy,
  simulateErrorCondition,
  validateErrorHandling,
  
  // Configuration validation
  validateConfig: ConfigValidator.validate,
  validateAllConfigs: ConfigValidator.validateAll,
  checkImmutability: ConfigValidator.checkImmutability,
  validateEnvironmentOverrides: ConfigValidator.validateEnvironmentOverrides
});

// Backward-compatible offline capability list used by legacy property tests.
export const ESSENTIAL_CAPABILITIES = [
  'View cached visitor data',
  'Queue visitor actions for sync',
  'Access basic navigation',
  'View user preferences',
  'Emergency contact information'
];

/**
 * Gets configuration for a specific test category with environment overrides
 * @param {string} category - Configuration category (EXECUTION, NETWORK, etc.)
 * @param {Object} overrides - Optional configuration overrides
 * @returns {Object} Category-specific configuration
 */
export function getTestConfig(category, overrides = {}) {
  const categoryConfig = TEST_CONFIG[category.toUpperCase()];
  
  if (!categoryConfig) {
    throw new Error(`Unknown configuration category: ${category}`);
  }

  // Apply overrides if provided
  if (Object.keys(overrides).length > 0) {
    return {
      ...categoryConfig,
      ...overrides
    };
  }

  return categoryConfig;
}

/**
 * Validates the entire test configuration
 * @returns {Object} Validation result for all configurations
 */
export function validateTestConfiguration() {
  const configsToValidate = {
    TEST_EXECUTION: TEST_EXECUTION_CONFIG,
    NETWORK_CONDITIONS: NETWORK_CONDITIONS,
    VALIDATION_RULES: VALIDATION_RULES,
    PERFORMANCE_THRESHOLDS: PERFORMANCE_CONFIG.PERFORMANCE_THRESHOLDS,
    ERROR_SCENARIOS: ERROR_CONFIG.ERROR_SCENARIOS
  };

  const validationResult = ConfigValidator.validateAll(configsToValidate);
  
  // Add immutability checks
  const immutabilityResults = {};
  for (const [configName, config] of Object.entries(configsToValidate)) {
    immutabilityResults[configName] = ConfigValidator.checkImmutability(config);
  }

  return {
    ...validationResult,
    immutability: immutabilityResults,
    environment: {
      current: CURRENT_ENVIRONMENT,
      isCI: IS_CI_ENVIRONMENT,
      configurationSource: IS_CI_ENVIRONMENT ? 'CI overrides' : CURRENT_ENVIRONMENT
    }
  };
}

/**
 * Creates a test configuration builder for custom scenarios
 * @param {string} baseEnvironment - Base environment to start from
 * @returns {Object} Configuration builder instance
 */
export function createConfigBuilder(baseEnvironment = CURRENT_ENVIRONMENT) {
  const builder = {
    environment: baseEnvironment,
    overrides: {},
    
    // Set test execution overrides
    setTestRuns(runs) {
      this.overrides.TEST_RUNS = { ...TEST_RUNS, ...runs };
      return this;
    },
    
    setTimeouts(timeouts) {
      this.overrides.TIMEOUTS = { ...TIMEOUTS, ...timeouts };
      return this;
    },
    
    setPropertyRuns(runs) {
      this.overrides.PROPERTY_RUNS = { ...PROPERTY_RUNS, ...runs };
      return this;
    },
    
    // Set network condition overrides
    setNetworkConditions(conditions) {
      this.overrides.NETWORK_CONDITIONS = { ...NETWORK_CONDITIONS, ...conditions };
      return this;
    },
    
    // Set performance threshold overrides
    setPerformanceThresholds(thresholds) {
      this.overrides.PERFORMANCE_THRESHOLDS = { 
        ...PERFORMANCE_CONFIG.PERFORMANCE_THRESHOLDS, 
        ...thresholds 
      };
      return this;
    },
    
    // Build final configuration
    build() {
      const baseConfig = getTestConfig('EXECUTION');
      const finalConfig = {
        ...baseConfig,
        ...this.overrides,
        metadata: {
          environment: this.environment,
          createdAt: new Date().toISOString(),
          overridesApplied: Object.keys(this.overrides)
        }
      };
      
      // Validate the built configuration
      const validation = ConfigValidator.validate(finalConfig, 'TEST_EXECUTION');
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }
      
      return deepFreeze(finalConfig);
    }
  };
  
  return builder;
}

/**
 * Gets optimized configuration for different test scenarios
 * @param {string} scenario - Test scenario (unit, integration, e2e, performance, security)
 * @returns {Object} Optimized configuration for the scenario
 */
export function getScenarioConfig(scenario) {
  const scenarioConfigs = {
    unit: {
      TEST_RUNS: { ...TEST_RUNS, standard: 10, comprehensive: 25 },
      TIMEOUTS: { ...TIMEOUTS, test: 5000, setup: 2000 },
      PROPERTY_RUNS: Object.fromEntries(
        Object.entries(PROPERTY_RUNS).map(([key, value]) => [key, Math.max(5, Math.floor(value / 2))])
      )
    },
    
    integration: {
      TEST_RUNS: { ...TEST_RUNS, standard: 15, comprehensive: 40 },
      TIMEOUTS: { ...TIMEOUTS, test: 15000, setup: 5000, network: 5000 },
      PROPERTY_RUNS: Object.fromEntries(
        Object.entries(PROPERTY_RUNS).map(([key, value]) => [key, Math.floor(value * 0.75)])
      )
    },
    
    e2e: {
      TEST_RUNS: { ...TEST_RUNS, standard: 5, comprehensive: 15 },
      TIMEOUTS: { ...TIMEOUTS, test: 60000, setup: 15000, network: 10000 },
      PROPERTY_RUNS: Object.fromEntries(
        Object.entries(PROPERTY_RUNS).map(([key, value]) => [key, Math.max(3, Math.floor(value / 4))])
      )
    },
    
    performance: {
      TEST_RUNS: { ...TEST_RUNS, performance: 10, stress: 50 },
      TIMEOUTS: { ...TIMEOUTS, test: 30000, setup: 10000 },
      PROPERTY_RUNS: {
        ...PROPERTY_RUNS,
        PERFORMANCE_VALIDATION: PROPERTY_RUNS.PERFORMANCE_VALIDATION * 2,
        CONCURRENT_OPERATIONS: PROPERTY_RUNS.CONCURRENT_OPERATIONS * 2
      }
    },
    
    security: {
      TEST_RUNS: { ...TEST_RUNS, security: 25 },
      TIMEOUTS: { ...TIMEOUTS, test: 20000 },
      PROPERTY_RUNS: {
        ...PROPERTY_RUNS,
        SECURITY_VALIDATION: PROPERTY_RUNS.SECURITY_VALIDATION * 2,
        ERROR_RESILIENCE: PROPERTY_RUNS.ERROR_RESILIENCE * 2
      }
    }
  };

  const config = scenarioConfigs[scenario.toLowerCase()];
  if (!config) {
    throw new Error(`Unknown test scenario: ${scenario}`);
  }

  return {
    ...TEST_CONFIG,
    ...config,
    scenario: scenario.toLowerCase(),
    optimizedFor: scenario.toLowerCase()
  };
}

// Export individual configuration sections for backward compatibility
export {
  // Test execution
  TEST_EXECUTION_CONFIG,
  PROPERTY_RUNS,
  TEST_RUNS,
  TIMEOUTS,
  RETRY_ATTEMPTS,
  MOCK_DELAYS,
  GENERATION_LIMITS,
  
  // Network conditions
  NETWORK_CONDITIONS,
  NETWORK_TRANSITIONS,
  NETWORK_QUALITY_THRESHOLDS,
  CONNECTION_CAPABILITIES,
  
  // Validation rules
  VALIDATION_RULES,
  BUSINESS_RULES,
  SANITIZATION_RULES,
  
  // Security patterns
  SECURITY_PATTERNS,
  
  // Performance configuration
  PERFORMANCE_CONFIG,
  
  // Error scenarios
  ERROR_CONFIG,
  ERROR_SCENARIOS,
  
  // Utilities
  ConfigValidator
};

// Export utility functions
export {
  // Environment
  getEnvironment,
  isCI,
  
  // Network
  categorizeNetworkQuality,
  getConnectionCapabilities,
  simulateNetworkTransition,
  createCustomNetworkCondition,
  
  // Validation
  validateData,
  sanitizeData,
  validateBusinessRules,
  
  // Security
  detectSecurityThreats,
  generateSecurityTestCases,
  validateSecurityConfig,
  
  // Performance
  evaluatePerformance,
  generatePerformanceTestScenarios,
  calculateBudgetCompliance,
  
  // Errors
  createError,
  getRecoveryStrategy,
  simulateErrorCondition,
  validateErrorHandling
};

// Default export - main configuration object
export default TEST_CONFIG;

if (typeof describe !== 'undefined') {
  describe('Test Config Index', () => {
    test('exports consolidated configuration', () => {
      expect(TEST_CONFIG).toBeDefined();
      expect(ConfigUtils).toBeDefined();
    });
  });
}
