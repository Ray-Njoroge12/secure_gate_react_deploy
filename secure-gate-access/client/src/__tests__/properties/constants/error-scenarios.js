/**
 * Error Scenarios Configuration
 * 
 * Centralized configuration for error simulation and testing scenarios.
 * This module focuses on error handling patterns and recovery mechanisms.
 */

// Import deep freeze utility
import { deepFreeze } from './immutable-utils.js';

// Base error scenario definitions
export const ERROR_SCENARIOS = deepFreeze({
  // Storage-related errors
  STORAGE_QUOTA_EXCEEDED: {
    type: 'QuotaExceededError',
    name: 'QuotaExceededError',
    message: 'Storage quota exceeded',
    code: 'QUOTA_EXCEEDED',
    recoverable: true,
    severity: 'HIGH',
    category: 'STORAGE',
    retryable: false,
    userMessage: 'Storage space is full. Please clear some data and try again.',
    technicalDetails: 'Local storage quota has been exceeded',
    suggestedActions: [
      'Clear browser cache',
      'Remove old offline data',
      'Contact administrator for storage increase'
    ]
  },

  STORAGE_ACCESS_DENIED: {
    type: 'SecurityError',
    name: 'SecurityError',
    message: 'Storage access denied',
    code: 'STORAGE_ACCESS_DENIED',
    recoverable: false,
    severity: 'HIGH',
    category: 'STORAGE',
    retryable: false,
    userMessage: 'Unable to access local storage. Please check browser settings.',
    technicalDetails: 'Browser security policy prevents storage access',
    suggestedActions: [
      'Check browser privacy settings',
      'Disable private/incognito mode',
      'Allow storage for this site'
    ]
  },

  STORAGE_CORRUPTION: {
    type: 'DataError',
    name: 'DataError',
    message: 'Storage data corruption detected',
    code: 'STORAGE_CORRUPTION',
    recoverable: true,
    severity: 'CRITICAL',
    category: 'STORAGE',
    retryable: false,
    userMessage: 'Data corruption detected. Your data will be restored from backup.',
    technicalDetails: 'Local storage data integrity check failed',
    suggestedActions: [
      'Clear corrupted data',
      'Restore from server backup',
      'Re-sync all data'
    ]
  },

  // Network-related errors
  NETWORK_TIMEOUT: {
    type: 'NetworkError',
    name: 'NetworkError',
    message: 'Network request timeout',
    code: 'NETWORK_TIMEOUT',
    recoverable: true,
    severity: 'MEDIUM',
    category: 'NETWORK',
    retryable: true,
    maxRetries: 3,
    retryDelay: 1000,
    userMessage: 'Network request timed out. Retrying...',
    technicalDetails: 'Request exceeded maximum timeout duration',
    suggestedActions: [
      'Check internet connection',
      'Try again in a moment',
      'Switch to offline mode if available'
    ]
  },

  NETWORK_UNAVAILABLE: {
    type: 'NetworkError',
    name: 'NetworkError',
    message: 'Network unavailable',
    code: 'NETWORK_UNAVAILABLE',
    recoverable: true,
    severity: 'HIGH',
    category: 'NETWORK',
    retryable: true,
    maxRetries: 5,
    retryDelay: 2000,
    userMessage: 'No internet connection. Working in offline mode.',
    technicalDetails: 'Network connectivity lost',
    suggestedActions: [
      'Check internet connection',
      'Use offline features',
      'Data will sync when connection is restored'
    ]
  },

  NETWORK_SERVER_ERROR: {
    type: 'ServerError',
    name: 'ServerError',
    message: 'Server error occurred',
    code: 'SERVER_ERROR',
    recoverable: true,
    severity: 'HIGH',
    category: 'NETWORK',
    retryable: true,
    maxRetries: 2,
    retryDelay: 5000,
    userMessage: 'Server is temporarily unavailable. Please try again.',
    technicalDetails: 'Server returned 5xx error response',
    suggestedActions: [
      'Wait a moment and try again',
      'Check system status page',
      'Contact support if problem persists'
    ]
  },

  // Synchronization errors
  SYNC_FAILURE: {
    type: 'SyncError',
    name: 'SyncError',
    message: 'Synchronization failed',
    code: 'SYNC_FAILURE',
    recoverable: true,
    severity: 'MEDIUM',
    category: 'SYNC',
    retryable: true,
    maxRetries: 3,
    retryDelay: 2000,
    userMessage: 'Failed to sync data. Will retry automatically.',
    technicalDetails: 'Data synchronization process failed',
    suggestedActions: [
      'Check internet connection',
      'Verify server status',
      'Manual sync will be attempted'
    ]
  },

  SYNC_CONFLICT: {
    type: 'ConflictError',
    name: 'ConflictError',
    message: 'Data conflict detected during sync',
    code: 'SYNC_CONFLICT',
    recoverable: true,
    severity: 'MEDIUM',
    category: 'SYNC',
    retryable: false,
    userMessage: 'Data conflict detected. Please review and resolve.',
    technicalDetails: 'Local and server data have conflicting changes',
    suggestedActions: [
      'Review conflicting changes',
      'Choose which version to keep',
      'Merge changes if possible'
    ]
  },

  SYNC_VERSION_MISMATCH: {
    type: 'VersionError',
    name: 'VersionError',
    message: 'Version mismatch during sync',
    code: 'VERSION_MISMATCH',
    recoverable: true,
    severity: 'HIGH',
    category: 'SYNC',
    retryable: false,
    userMessage: 'App version is outdated. Please refresh to update.',
    technicalDetails: 'Client version incompatible with server',
    suggestedActions: [
      'Refresh the application',
      'Clear browser cache',
      'Update to latest version'
    ]
  },

  // Authentication errors
  AUTH_TOKEN_EXPIRED: {
    type: 'AuthenticationError',
    name: 'AuthenticationError',
    message: 'Authentication token expired',
    code: 'TOKEN_EXPIRED',
    recoverable: true,
    severity: 'MEDIUM',
    category: 'AUTH',
    retryable: true,
    maxRetries: 1,
    retryDelay: 0,
    userMessage: 'Session expired. Please log in again.',
    technicalDetails: 'JWT token has expired and needs refresh',
    suggestedActions: [
      'Refresh authentication token',
      'Log in again if refresh fails',
      'Check system time settings'
    ]
  },

  AUTH_PERMISSION_DENIED: {
    type: 'AuthorizationError',
    name: 'AuthorizationError',
    message: 'Permission denied',
    code: 'PERMISSION_DENIED',
    recoverable: false,
    severity: 'HIGH',
    category: 'AUTH',
    retryable: false,
    userMessage: 'You do not have permission to perform this action.',
    technicalDetails: 'User lacks required permissions for operation',
    suggestedActions: [
      'Contact administrator for permissions',
      'Log in with appropriate account',
      'Check role assignments'
    ]
  },

  AUTH_ACCOUNT_LOCKED: {
    type: 'AuthenticationError',
    name: 'AuthenticationError',
    message: 'Account locked due to security policy',
    code: 'ACCOUNT_LOCKED',
    recoverable: true,
    severity: 'HIGH',
    category: 'AUTH',
    retryable: false,
    userMessage: 'Account is locked. Please contact administrator.',
    technicalDetails: 'Account locked due to security policy violation',
    suggestedActions: [
      'Contact system administrator',
      'Wait for automatic unlock',
      'Verify account status'
    ]
  },

  // Validation errors
  VALIDATION_FAILED: {
    type: 'ValidationError',
    name: 'ValidationError',
    message: 'Data validation failed',
    code: 'VALIDATION_FAILED',
    recoverable: true,
    severity: 'LOW',
    category: 'VALIDATION',
    retryable: false,
    userMessage: 'Please check your input and try again.',
    technicalDetails: 'Input data does not meet validation requirements',
    suggestedActions: [
      'Check required fields',
      'Verify data format',
      'Review validation messages'
    ]
  },

  VALIDATION_BUSINESS_RULE: {
    type: 'BusinessRuleError',
    name: 'BusinessRuleError',
    message: 'Business rule validation failed',
    code: 'BUSINESS_RULE_VIOLATION',
    recoverable: true,
    severity: 'MEDIUM',
    category: 'VALIDATION',
    retryable: false,
    userMessage: 'This action violates business rules.',
    technicalDetails: 'Operation violates configured business rules',
    suggestedActions: [
      'Review business rules',
      'Modify request to comply',
      'Contact administrator for exceptions'
    ]
  },

  // System errors
  SYSTEM_MAINTENANCE: {
    type: 'MaintenanceError',
    name: 'MaintenanceError',
    message: 'System is under maintenance',
    code: 'SYSTEM_MAINTENANCE',
    recoverable: true,
    severity: 'HIGH',
    category: 'SYSTEM',
    retryable: true,
    maxRetries: 0,
    retryDelay: 60000,
    userMessage: 'System is under maintenance. Please try again later.',
    technicalDetails: 'System is in maintenance mode',
    suggestedActions: [
      'Wait for maintenance to complete',
      'Check system status page',
      'Use offline features if available'
    ]
  },

  SYSTEM_OVERLOAD: {
    type: 'SystemError',
    name: 'SystemError',
    message: 'System is overloaded',
    code: 'SYSTEM_OVERLOAD',
    recoverable: true,
    severity: 'HIGH',
    category: 'SYSTEM',
    retryable: true,
    maxRetries: 3,
    retryDelay: 10000,
    userMessage: 'System is busy. Please try again in a moment.',
    technicalDetails: 'System resources are at capacity',
    suggestedActions: [
      'Wait and try again',
      'Use system during off-peak hours',
      'Contact support if problem persists'
    ]
  },

  // Application errors
  APP_CRASH: {
    type: 'ApplicationError',
    name: 'ApplicationError',
    message: 'Application crashed unexpectedly',
    code: 'APP_CRASH',
    recoverable: true,
    severity: 'CRITICAL',
    category: 'APPLICATION',
    retryable: false,
    userMessage: 'Application crashed. Reloading...',
    technicalDetails: 'Unhandled exception caused application crash',
    suggestedActions: [
      'Reload the application',
      'Clear browser cache',
      'Report the issue to support'
    ]
  },

  APP_MEMORY_LEAK: {
    type: 'MemoryError',
    name: 'MemoryError',
    message: 'Memory usage exceeded limits',
    code: 'MEMORY_LEAK',
    recoverable: true,
    severity: 'HIGH',
    category: 'APPLICATION',
    retryable: false,
    userMessage: 'Application is using too much memory. Reloading...',
    technicalDetails: 'Memory usage exceeded safe thresholds',
    suggestedActions: [
      'Reload the application',
      'Close other browser tabs',
      'Restart browser if needed'
    ]
  }
});

// Error recovery strategies
export const RECOVERY_STRATEGIES = deepFreeze({
  AUTOMATIC_RETRY: {
    name: 'Automatic Retry',
    description: 'Automatically retry the operation with exponential backoff',
    applicable: ['NETWORK_TIMEOUT', 'SYNC_FAILURE', 'SYSTEM_OVERLOAD'],
    implementation: {
      maxRetries: 3,
      baseDelay: 1000,
      backoffMultiplier: 2,
      maxDelay: 30000,
      jitter: true
    }
  },

  GRACEFUL_DEGRADATION: {
    name: 'Graceful Degradation',
    description: 'Provide limited functionality when full features are unavailable',
    applicable: ['NETWORK_UNAVAILABLE', 'SYSTEM_MAINTENANCE'],
    implementation: {
      offlineMode: true,
      cachedData: true,
      limitedFeatures: true,
      userNotification: true
    }
  },

  USER_INTERVENTION: {
    name: 'User Intervention',
    description: 'Require user action to resolve the error',
    applicable: ['SYNC_CONFLICT', 'VALIDATION_FAILED', 'AUTH_PERMISSION_DENIED'],
    implementation: {
      userPrompt: true,
      actionRequired: true,
      guidanceProvided: true,
      fallbackOptions: true
    }
  },

  SYSTEM_RECOVERY: {
    name: 'System Recovery',
    description: 'Perform system-level recovery operations',
    applicable: ['STORAGE_CORRUPTION', 'APP_CRASH', 'APP_MEMORY_LEAK'],
    implementation: {
      dataBackup: true,
      systemReload: true,
      stateReset: true,
      errorReporting: true
    }
  },

  ESCALATION: {
    name: 'Escalation',
    description: 'Escalate to higher-level support or systems',
    applicable: ['AUTH_ACCOUNT_LOCKED', 'SYSTEM_OVERLOAD', 'STORAGE_ACCESS_DENIED'],
    implementation: {
      supportNotification: true,
      adminAlert: true,
      incidentCreation: true,
      userGuidance: true
    }
  }
});

// Error categorization for handling
export const ERROR_CATEGORIES = deepFreeze({
  TRANSIENT: {
    description: 'Temporary errors that may resolve themselves',
    examples: ['NETWORK_TIMEOUT', 'SYSTEM_OVERLOAD', 'SYNC_FAILURE'],
    defaultStrategy: 'AUTOMATIC_RETRY',
    userImpact: 'LOW',
    urgency: 'LOW'
  },

  PERSISTENT: {
    description: 'Errors that require intervention to resolve',
    examples: ['VALIDATION_FAILED', 'AUTH_PERMISSION_DENIED', 'SYNC_CONFLICT'],
    defaultStrategy: 'USER_INTERVENTION',
    userImpact: 'MEDIUM',
    urgency: 'MEDIUM'
  },

  CRITICAL: {
    description: 'Severe errors that significantly impact functionality',
    examples: ['STORAGE_CORRUPTION', 'APP_CRASH', 'AUTH_ACCOUNT_LOCKED'],
    defaultStrategy: 'SYSTEM_RECOVERY',
    userImpact: 'HIGH',
    urgency: 'HIGH'
  },

  INFRASTRUCTURE: {
    description: 'Errors related to underlying infrastructure',
    examples: ['NETWORK_UNAVAILABLE', 'SYSTEM_MAINTENANCE', 'STORAGE_QUOTA_EXCEEDED'],
    defaultStrategy: 'GRACEFUL_DEGRADATION',
    userImpact: 'MEDIUM',
    urgency: 'MEDIUM'
  }
});

// Error simulation configurations for testing
export const ERROR_SIMULATION = deepFreeze({
  NETWORK_CONDITIONS: {
    INTERMITTENT_FAILURE: {
      failureRate: 0.3,
      pattern: 'random',
      duration: 5000,
      recovery: 'automatic'
    },
    PROGRESSIVE_DEGRADATION: {
      failureRate: 0.1,
      pattern: 'increasing',
      duration: 30000,
      recovery: 'manual'
    },
    COMPLETE_OUTAGE: {
      failureRate: 1.0,
      pattern: 'constant',
      duration: 60000,
      recovery: 'external'
    }
  },

  STORAGE_CONDITIONS: {
    QUOTA_PRESSURE: {
      availableSpace: 0.1, // 10% remaining
      growthRate: 0.05,    // 5% per operation
      threshold: 0.05      // 5% critical threshold
    },
    CORRUPTION_SIMULATION: {
      corruptionRate: 0.01,
      affectedFields: ['id', 'timestamp', 'data'],
      detectionDelay: 1000
    }
  },

  PERFORMANCE_CONDITIONS: {
    MEMORY_PRESSURE: {
      baseUsage: 50 * 1024 * 1024, // 50MB
      growthRate: 1024 * 1024,     // 1MB per operation
      threshold: 100 * 1024 * 1024  // 100MB threshold
    },
    CPU_THROTTLING: {
      throttleRate: 0.5,    // 50% CPU reduction
      duration: 10000,      // 10 seconds
      trigger: 'high_load'
    }
  }
});

/**
 * Creates an error object based on scenario configuration
 * @param {string} scenarioName - Name of the error scenario
 * @param {Object} overrides - Properties to override in the scenario
 * @returns {Error} Configured error object
 */
export function createError(scenarioName, overrides = {}) {
  const scenario = ERROR_SCENARIOS[scenarioName];
  if (!scenario) {
    throw new Error(`Unknown error scenario: ${scenarioName}`);
  }

  const errorConfig = { ...scenario, ...overrides };
  const error = new Error(errorConfig.message);
  
  // Add custom properties
  Object.assign(error, {
    name: errorConfig.name,
    code: errorConfig.code,
    type: errorConfig.type,
    recoverable: errorConfig.recoverable,
    severity: errorConfig.severity,
    category: errorConfig.category,
    retryable: errorConfig.retryable,
    maxRetries: errorConfig.maxRetries,
    retryDelay: errorConfig.retryDelay,
    userMessage: errorConfig.userMessage,
    technicalDetails: errorConfig.technicalDetails,
    suggestedActions: errorConfig.suggestedActions,
    timestamp: new Date().toISOString(),
    scenarioName
  });

  return error;
}

/**
 * Determines the appropriate recovery strategy for an error
 * @param {Error|string} error - Error object or scenario name
 * @returns {Object} Recovery strategy configuration
 */
export function getRecoveryStrategy(error) {
  const scenarioName = typeof error === 'string' ? error : error.scenarioName;
  const scenario = ERROR_SCENARIOS[scenarioName];
  
  if (!scenario) {
    return RECOVERY_STRATEGIES.ESCALATION;
  }

  // Find applicable recovery strategy
  for (const [strategyName, strategy] of Object.entries(RECOVERY_STRATEGIES)) {
    if (strategy.applicable.includes(scenarioName)) {
      return {
        ...strategy,
        strategyName,
        scenario: scenarioName
      };
    }
  }

  // Default to escalation if no specific strategy found
  return {
    ...RECOVERY_STRATEGIES.ESCALATION,
    strategyName: 'ESCALATION',
    scenario: scenarioName
  };
}

/**
 * Simulates error conditions for testing
 * @param {string} conditionType - Type of condition to simulate
 * @param {Object} config - Simulation configuration
 * @returns {Object} Simulation controller
 */
export function simulateErrorCondition(conditionType, config = {}) {
  const simulation = {
    type: conditionType,
    config,
    active: false,
    startTime: null,
    errors: [],
    
    start() {
      this.active = true;
      this.startTime = Date.now();
      console.log(`Started error simulation: ${conditionType}`);
    },
    
    stop() {
      this.active = false;
      console.log(`Stopped error simulation: ${conditionType}`);
    },
    
    shouldFail() {
      if (!this.active) return false;
      
      const elapsed = Date.now() - this.startTime;
      const simConfig = ERROR_SIMULATION[conditionType.toUpperCase()];
      
      if (!simConfig) return false;
      
      // Check if simulation should still be active
      if (config.duration && elapsed > config.duration) {
        this.stop();
        return false;
      }
      
      // Determine if this operation should fail
      const failureRate = config.failureRate || simConfig.failureRate || 0.1;
      return Math.random() < failureRate;
    },
    
    generateError() {
      const errorTypes = {
        NETWORK_CONDITIONS: 'NETWORK_TIMEOUT',
        STORAGE_CONDITIONS: 'STORAGE_QUOTA_EXCEEDED',
        PERFORMANCE_CONDITIONS: 'APP_MEMORY_LEAK'
      };
      
      const errorType = errorTypes[conditionType.toUpperCase()] || 'SYSTEM_OVERLOAD';
      const error = createError(errorType, { simulationId: this.startTime });
      this.errors.push(error);
      return error;
    }
  };
  
  return simulation;
}

/**
 * Validates error handling implementation
 * @param {Function} errorHandler - Error handling function to test
 * @param {Array} testScenarios - Array of error scenarios to test
 * @returns {Object} Validation results
 */
export function validateErrorHandling(errorHandler, testScenarios = []) {
  const results = {
    totalTests: testScenarios.length,
    passed: 0,
    failed: 0,
    errors: [],
    coverage: {}
  };

  for (const scenario of testScenarios) {
    try {
      const error = createError(scenario);
      const result = errorHandler(error);
      
      // Validate error handling result
      const isValid = result && 
                     typeof result === 'object' &&
                     'handled' in result &&
                     'strategy' in result;
      
      if (isValid) {
        results.passed++;
        results.coverage[scenario] = 'PASS';
      } else {
        results.failed++;
        results.coverage[scenario] = 'FAIL';
        results.errors.push(`Invalid handling result for ${scenario}`);
      }
    } catch (testError) {
      results.failed++;
      results.coverage[scenario] = 'ERROR';
      results.errors.push(`Error testing ${scenario}: ${testError.message}`);
    }
  }

  results.successRate = results.totalTests > 0 ? 
    (results.passed / results.totalTests) * 100 : 0;

  return results;
}

// Export frozen objects to prevent mutation
export const ERROR_CONFIG = deepFreeze({
  ERROR_SCENARIOS,
  RECOVERY_STRATEGIES,
  ERROR_CATEGORIES,
  ERROR_SIMULATION
});

// Default export
export default {
  ERROR_CONFIG,
  createError,
  getRecoveryStrategy,
  simulateErrorCondition,
  validateErrorHandling
};

if (typeof describe !== 'undefined') {
  describe('Error Scenarios', () => {
    test('exports error configuration', () => {
      expect(ERROR_CONFIG).toBeDefined();
      expect(createError).toBeDefined();
      expect(getRecoveryStrategy).toBeDefined();
    });
  });
}
