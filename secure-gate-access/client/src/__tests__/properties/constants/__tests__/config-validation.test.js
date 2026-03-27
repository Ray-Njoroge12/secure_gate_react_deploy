/**
 * Configuration Validation Test Suite
 * 
 * Comprehensive tests for the modular configuration system.
 * Tests configuration loading, validation, environment overrides, and immutability.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Import configuration modules
import { ConfigValidator } from '../config-validator.js';
import { ERROR_CONFIG } from '../error-scenarios.js';
import { 
  TEST_CONFIG, 
  ConfigUtils, 
  getTestConfig, 
  validateTestConfiguration,
  createConfigBuilder,
  getScenarioConfig
} from '../index.js';
import { NETWORK_CONDITIONS } from '../network-conditions.js';
import { PERFORMANCE_CONFIG } from '../performance-benchmarks.js';
import { SECURITY_PATTERNS } from '../security-patterns.js';
import { TEST_EXECUTION_CONFIG, getEnvironment, isCI } from '../test-execution.js';
import { VALIDATION_RULES } from '../validation-rules.js';

describe('Configuration System Validation', () => {
  let originalEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore original environment
    process.env.NODE_ENV = originalEnv;
  });

  describe('Configuration Loading', () => {
    test('should load all configuration modules without errors', () => {
      expect(TEST_CONFIG).toBeDefined();
      expect(TEST_CONFIG.EXECUTION).toBeDefined();
      expect(TEST_CONFIG.NETWORK).toBeDefined();
      expect(TEST_CONFIG.VALIDATION).toBeDefined();
      expect(TEST_CONFIG.SECURITY).toBeDefined();
      expect(TEST_CONFIG.PERFORMANCE).toBeDefined();
      expect(TEST_CONFIG.ERRORS).toBeDefined();
    });

    test('should have environment information', () => {
      expect(TEST_CONFIG.ENVIRONMENT).toBeDefined();
      expect(TEST_CONFIG.ENVIRONMENT.current).toBeDefined();
      expect(typeof TEST_CONFIG.ENVIRONMENT.isCI).toBe('boolean');
      expect(typeof TEST_CONFIG.ENVIRONMENT.isDevelopment).toBe('boolean');
      expect(typeof TEST_CONFIG.ENVIRONMENT.isTest).toBe('boolean');
      expect(typeof TEST_CONFIG.ENVIRONMENT.isProduction).toBe('boolean');
    });

    test('should provide access to individual configuration sections', () => {
      expect(TEST_CONFIG.PROPERTY_RUNS).toBeDefined();
      expect(TEST_CONFIG.TEST_RUNS).toBeDefined();
      expect(TEST_CONFIG.TIMEOUTS).toBeDefined();
      expect(TEST_CONFIG.RETRY_ATTEMPTS).toBeDefined();
      expect(TEST_CONFIG.MOCK_DELAYS).toBeDefined();
      expect(TEST_CONFIG.GENERATION_LIMITS).toBeDefined();
    });
  });

  describe('Configuration Validation', () => {
    test('should validate test execution configuration', () => {
      const result = ConfigValidator.validate(TEST_EXECUTION_CONFIG, 'TEST_EXECUTION');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      
      if (result.warnings.length > 0) {
        console.warn('Configuration warnings:', result.warnings);
      }
    });

    test('should validate network conditions configuration', () => {
      const result = ConfigValidator.validate(NETWORK_CONDITIONS, 'NETWORK_CONDITIONS');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate validation rules configuration', () => {
      const result = ConfigValidator.validate(VALIDATION_RULES, 'VALIDATION_RULES');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate performance thresholds configuration', () => {
      const result = ConfigValidator.validate(
        PERFORMANCE_CONFIG.PERFORMANCE_THRESHOLDS, 
        'PERFORMANCE_THRESHOLDS'
      );
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate error scenarios configuration', () => {
      const result = ConfigValidator.validate(ERROR_CONFIG.ERROR_SCENARIOS, 'ERROR_SCENARIOS');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate entire test configuration', () => {
      const result = validateTestConfiguration();
      
      expect(result.overall).toBe(true);
      expect(result.summary.invalid).toBe(0);
      
      // Check immutability with detailed logging
      for (const [configName, immutabilityResult] of Object.entries(result.immutability)) {
        if (!immutabilityResult.immutable) {
          console.error(`Immutability violations in ${configName}:`, immutabilityResult.violations);
        }
        expect(immutabilityResult.immutable).toBe(true);
        if (immutabilityResult.violations.length > 0) {
          console.warn(`Immutability violations in ${configName}:`, immutabilityResult.violations);
        }
      }
    });
  });

  describe('Environment-Specific Configuration', () => {
    test('should detect development environment correctly', () => {
      process.env.NODE_ENV = 'development';
      
      // Re-import to get updated environment
      const env = getEnvironment();
      expect(env).toBe('development');
    });

    test('should detect test environment correctly', () => {
      process.env.NODE_ENV = 'test';
      
      const env = getEnvironment();
      expect(env).toBe('test');
    });

    test('should detect CI environment correctly', () => {
      process.env.CI = 'true';
      
      const ci = isCI();
      expect(ci).toBe(true);
      
      delete process.env.CI;
    });

    test('should apply environment-specific overrides', () => {
      // Test that different environments have different configurations
      const devConfig = getTestConfig('EXECUTION');
      
      expect(devConfig.PROPERTY_RUNS).toBeDefined();
      expect(devConfig.TEST_RUNS).toBeDefined();
      expect(devConfig.TIMEOUTS).toBeDefined();
      
      // Verify that values are reasonable for the environment
      expect(devConfig.PROPERTY_RUNS.OFFLINE_CAPABILITIES).toBeGreaterThan(0);
      expect(devConfig.PROPERTY_RUNS.OFFLINE_CAPABILITIES).toBeLessThan(1000);
    });
  });

  describe('Configuration Builder', () => {
    test('should create configuration builder successfully', () => {
      const builder = createConfigBuilder('test');
      
      expect(builder).toBeDefined();
      expect(typeof builder.setTestRuns).toBe('function');
      expect(typeof builder.setTimeouts).toBe('function');
      expect(typeof builder.build).toBe('function');
    });

    test('should build configuration with overrides', () => {
      const customConfig = createConfigBuilder('test')
        .setTestRuns({ quick: 5, standard: 15 })
        .setTimeouts({ sync: 3000, network: 2000 })
        .setPropertyRuns({ OFFLINE_CAPABILITIES: 10 })
        .build();
      
      expect(customConfig.TEST_RUNS.quick).toBe(5);
      expect(customConfig.TEST_RUNS.standard).toBe(15);
      expect(customConfig.TIMEOUTS.sync).toBe(3000);
      expect(customConfig.TIMEOUTS.network).toBe(2000);
      expect(customConfig.PROPERTY_RUNS.OFFLINE_CAPABILITIES).toBe(10);
      
      // Verify metadata
      expect(customConfig.metadata).toBeDefined();
      expect(customConfig.metadata.environment).toBe('test');
      expect(customConfig.metadata.overridesApplied).toContain('TEST_RUNS');
      expect(customConfig.metadata.overridesApplied).toContain('TIMEOUTS');
    });

    test('should validate built configuration', () => {
      expect(() => {
        createConfigBuilder('test')
          .setTestRuns({ quick: -1 }) // Invalid value
          .build();
      }).toThrow('Invalid configuration');
    });
  });

  describe('Scenario-Specific Configuration', () => {
    test('should provide unit test configuration', () => {
      const unitConfig = getScenarioConfig('unit');
      
      expect(unitConfig.scenario).toBe('unit');
      expect(unitConfig.optimizedFor).toBe('unit');
      
      // Unit tests should have lower run counts for speed
      expect(unitConfig.TEST_RUNS.standard).toBeLessThan(TEST_CONFIG.TEST_RUNS.standard);
      expect(unitConfig.TIMEOUTS.test).toBeLessThan(TEST_CONFIG.TIMEOUTS.test);
    });

    test('should provide integration test configuration', () => {
      const integrationConfig = getScenarioConfig('integration');
      
      expect(integrationConfig.scenario).toBe('integration');
      expect(integrationConfig.TIMEOUTS.network).toBeGreaterThan(TEST_CONFIG.TIMEOUTS.network);
    });

    test('should provide e2e test configuration', () => {
      const e2eConfig = getScenarioConfig('e2e');
      
      expect(e2eConfig.scenario).toBe('e2e');
      
      // E2E tests should have longer timeouts
      expect(e2eConfig.TIMEOUTS.test).toBeGreaterThan(TEST_CONFIG.TIMEOUTS.test);
      expect(e2eConfig.TIMEOUTS.setup).toBeGreaterThan(TEST_CONFIG.TIMEOUTS.setup);
    });

    test('should provide performance test configuration', () => {
      const perfConfig = getScenarioConfig('performance');
      
      expect(perfConfig.scenario).toBe('performance');
      
      // Performance tests should have more performance-focused runs
      expect(perfConfig.PROPERTY_RUNS.PERFORMANCE_VALIDATION)
        .toBeGreaterThan(TEST_CONFIG.PROPERTY_RUNS.PERFORMANCE_VALIDATION);
    });

    test('should provide security test configuration', () => {
      const securityConfig = getScenarioConfig('security');
      
      expect(securityConfig.scenario).toBe('security');
      
      // Security tests should have more security-focused runs
      expect(securityConfig.PROPERTY_RUNS.SECURITY_VALIDATION)
        .toBeGreaterThan(TEST_CONFIG.PROPERTY_RUNS.SECURITY_VALIDATION);
    });

    test('should throw error for unknown scenario', () => {
      expect(() => {
        getScenarioConfig('unknown');
      }).toThrow('Unknown test scenario: unknown');
    });
  });

  describe('Configuration Immutability', () => {
    test('should prevent modification of main configuration', () => {
      expect(() => {
        TEST_CONFIG.PROPERTY_RUNS.OFFLINE_CAPABILITIES = 999;
      }).toThrow();
    });

    test('should prevent modification of nested configuration', () => {
      expect(() => {
        TEST_CONFIG.NETWORK.CONDITIONS.ONLINE_WIFI.latency = 999;
      }).toThrow();
    });

    test('should detect immutability violations', () => {
      const mutableConfig = {
        test: 'value',
        nested: {
          value: 123
        }
      };
      
      const result = ConfigValidator.checkImmutability(mutableConfig);
      expect(result.immutable).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Utilities', () => {
    test('should provide all expected utilities', () => {
      expect(ConfigUtils.getEnvironment).toBeDefined();
      expect(ConfigUtils.isCI).toBeDefined();
      expect(ConfigUtils.validateData).toBeDefined();
      expect(ConfigUtils.sanitizeData).toBeDefined();
      expect(ConfigUtils.detectSecurityThreats).toBeDefined();
      expect(ConfigUtils.evaluatePerformance).toBeDefined();
      expect(ConfigUtils.createError).toBeDefined();
      expect(ConfigUtils.validateConfig).toBeDefined();
    });

    test('should validate data using validation rules', () => {
      const visitorData = {
        id: '123',
        name: 'John Doe',
        status: 'PENDING',
        email: 'john@example.com'
      };
      
      const result = ConfigUtils.validateData(visitorData, VALIDATION_RULES.VISITOR);
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect security threats', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      
      const result = ConfigUtils.detectSecurityThreats(maliciousInput);
      expect(result.safe).toBe(false);
      expect(result.threats.length).toBeGreaterThan(0);
      expect(result.threats[0].type).toBe('XSS');
    });

    test('should create error objects', () => {
      const error = ConfigUtils.createError('NETWORK_TIMEOUT');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('NETWORK_TIMEOUT');
      expect(error.recoverable).toBe(true);
      expect(error.category).toBe('NETWORK');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid configuration category', () => {
      expect(() => {
        getTestConfig('INVALID_CATEGORY');
      }).toThrow('Unknown configuration category: INVALID_CATEGORY');
    });

    test('should handle validation errors gracefully', () => {
      const invalidConfig = {
        PROPERTY_RUNS: {
          OFFLINE_CAPABILITIES: -1 // Invalid negative value
        }
      };
      
      const result = ConfigValidator.validate(invalidConfig, 'TEST_EXECUTION');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle missing required fields', () => {
      const incompleteConfig = {
        PROPERTY_RUNS: {
          // Missing required fields
        }
      };
      
      const result = ConfigValidator.validate(incompleteConfig, 'TEST_EXECUTION');
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Missing required property'))).toBe(true);
    });
  });

  describe('Performance Considerations', () => {
    test('should load configuration quickly', () => {
      const startTime = performance.now();
      
      // Access various configuration sections
      const config = TEST_CONFIG;
      const execution = config.EXECUTION;
      const network = config.NETWORK;
      const validation = config.VALIDATION;
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      // Configuration loading should be very fast (< 10ms)
      expect(loadTime).toBeLessThan(10);
      
      // Verify configurations are accessible
      expect(execution).toBeDefined();
      expect(network).toBeDefined();
      expect(validation).toBeDefined();
    });

    test('should validate configuration efficiently', () => {
      const startTime = performance.now();
      
      const result = validateTestConfiguration();
      
      const endTime = performance.now();
      const validationTime = endTime - startTime;
      
      // Validation should complete reasonably quickly (< 100ms)
      expect(validationTime).toBeLessThan(100);
      expect(result.overall).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain backward compatibility with old imports', () => {
      // Test that old-style imports still work
      expect(TEST_EXECUTION_CONFIG).toBeDefined();
      expect(NETWORK_CONDITIONS).toBeDefined();
      expect(VALIDATION_RULES).toBeDefined();
      expect(SECURITY_PATTERNS).toBeDefined();
      expect(PERFORMANCE_CONFIG).toBeDefined();
      expect(ERROR_CONFIG).toBeDefined();
    });

    test('should provide individual configuration exports', () => {
      expect(TEST_CONFIG.PROPERTY_RUNS).toBeDefined();
      expect(TEST_CONFIG.TEST_RUNS).toBeDefined();
      expect(TEST_CONFIG.TIMEOUTS).toBeDefined();
      expect(TEST_CONFIG.RETRY_ATTEMPTS).toBeDefined();
      expect(TEST_CONFIG.MOCK_DELAYS).toBeDefined();
      expect(TEST_CONFIG.GENERATION_LIMITS).toBeDefined();
    });
  });
});

describe('Configuration Integration Tests', () => {
  test('should work with property-based tests', () => {
    // Simulate using configuration in a property-based test
    const testRuns = TEST_CONFIG.PROPERTY_RUNS.OFFLINE_CAPABILITIES;
    const timeout = TEST_CONFIG.TIMEOUTS.sync;
    
    expect(testRuns).toBeGreaterThan(0);
    expect(timeout).toBeGreaterThan(0);
    
    // Verify configuration values are reasonable
    expect(testRuns).toBeLessThan(1000); // Not too many runs
    expect(timeout).toBeLessThan(60000); // Not too long timeout
  });

  test('should work with network simulation', () => {
    const wifiCondition = TEST_CONFIG.NETWORK.CONDITIONS.ONLINE_WIFI;
    
    expect(wifiCondition.isOnline).toBe(true);
    expect(wifiCondition.connectionType).toBe('wifi');
    expect(wifiCondition.latency).toBeGreaterThan(0);
    expect(wifiCondition.reliability).toBeGreaterThan(0.9);
    expect(wifiCondition.bandwidth).toBeGreaterThan(1000);
  });

  test('should work with error simulation', () => {
    const networkError = ConfigUtils.createError('NETWORK_TIMEOUT');
    const strategy = ConfigUtils.getRecoveryStrategy(networkError);
    
    expect(networkError.recoverable).toBe(true);
    expect(networkError.retryable).toBe(true);
    expect(strategy.strategyName).toBe('AUTOMATIC_RETRY');
  });

  test('should work with performance evaluation', () => {
    const metrics = {
      IMMEDIATE: 50,
      QUICK: 150,
      STANDARD: 800
    };
    
    const result = ConfigUtils.evaluatePerformance(metrics, 'UI_RESPONSE', 'MID_RANGE');
    
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.category).toBe('UI_RESPONSE');
    expect(result.deviceType).toBe('MID_RANGE');
  });
});