/**
 * Configuration Validator
 * 
 * Runtime validation system for test configuration objects.
 * Ensures configuration integrity and provides detailed error reporting.
 */

// Import deep freeze utility
import { deepFreeze, createImmutableConfig, isDeeplyFrozen } from './immutable-utils.js';

// Configuration schema definitions
const CONFIG_SCHEMAS = {
  TEST_EXECUTION: {
    type: 'object',
    required: ['PROPERTY_RUNS', 'TEST_RUNS', 'TIMEOUTS', 'RETRY_ATTEMPTS'],
    properties: {
      PROPERTY_RUNS: {
        type: 'object',
        required: ['OFFLINE_CAPABILITIES', 'CACHED_DATA_ACCESS', 'ACTION_QUEUING'],
        properties: {
          OFFLINE_CAPABILITIES: { type: 'number', minimum: 1, maximum: 1000 },
          CACHED_DATA_ACCESS: { type: 'number', minimum: 1, maximum: 1000 },
          ACTION_QUEUING: { type: 'number', minimum: 1, maximum: 1000 },
          SYNC_PROCESSING: { type: 'number', minimum: 1, maximum: 1000 },
          PREFERENCES_PRESERVATION: { type: 'number', minimum: 1, maximum: 1000 },
          ERROR_RESILIENCE: { type: 'number', minimum: 1, maximum: 1000 },
          PERFORMANCE_VALIDATION: { type: 'number', minimum: 1, maximum: 1000 },
          SECURITY_VALIDATION: { type: 'number', minimum: 1, maximum: 1000 },
          CONCURRENT_OPERATIONS: { type: 'number', minimum: 1, maximum: 1000 }
        }
      },
      TEST_RUNS: {
        type: 'object',
        required: ['quick', 'standard', 'comprehensive'],
        properties: {
          quick: { type: 'number', minimum: 1, maximum: 100 },
          standard: { type: 'number', minimum: 1, maximum: 500 },
          comprehensive: { type: 'number', minimum: 1, maximum: 1000 },
          performance: { type: 'number', minimum: 1, maximum: 100 },
          security: { type: 'number', minimum: 1, maximum: 500 },
          stress: { type: 'number', minimum: 1, maximum: 2000 }
        }
      },
      TIMEOUTS: {
        type: 'object',
        required: ['sync', 'network', 'cleanup', 'storage'],
        properties: {
          sync: { type: 'number', minimum: 100, maximum: 60000 },
          network: { type: 'number', minimum: 100, maximum: 30000 },
          cleanup: { type: 'number', minimum: 100, maximum: 10000 },
          storage: { type: 'number', minimum: 100, maximum: 30000 },
          test: { type: 'number', minimum: 1000, maximum: 300000 },
          setup: { type: 'number', minimum: 1000, maximum: 60000 },
          teardown: { type: 'number', minimum: 1000, maximum: 30000 }
        }
      },
      RETRY_ATTEMPTS: {
        type: 'object',
        required: ['sync', 'network', 'storage'],
        properties: {
          sync: { type: 'number', minimum: 0, maximum: 10 },
          network: { type: 'number', minimum: 0, maximum: 10 },
          storage: { type: 'number', minimum: 0, maximum: 10 },
          test: { type: 'number', minimum: 0, maximum: 5 }
        }
      }
    }
  },

  NETWORK_CONDITIONS: {
    type: 'object',
    patternProperties: {
      '^[A-Z_]+$': {
        type: 'object',
        required: ['isOnline', 'connectionType', 'latency', 'reliability', 'bandwidth'],
        properties: {
          isOnline: { type: 'boolean' },
          connectionType: { 
            type: 'string', 
            enum: ['wifi', '4g', '3g', '2g', 'ethernet', 'none'] 
          },
          latency: { type: 'number', minimum: 0, maximum: 10000 },
          reliability: { type: 'number', minimum: 0, maximum: 1 },
          bandwidth: { type: 'number', minimum: 0, maximum: 1000000 },
          jitter: { type: 'number', minimum: 0, maximum: 1000 },
          packetLoss: { type: 'number', minimum: 0, maximum: 1 }
        }
      }
    }
  },

  VALIDATION_RULES: {
    type: 'object',
    patternProperties: {
      '^[A-Z_]+$': {
        type: 'object',
        required: ['requiredFields', 'optionalFields', 'constraints'],
        properties: {
          requiredFields: {
            type: 'array',
            items: { type: 'string', minLength: 1 }
          },
          optionalFields: {
            type: 'array',
            items: { type: 'string', minLength: 1 }
          },
          constraints: {
            type: 'object',
            patternProperties: {
              '^[a-zA-Z_]+$': {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['string', 'number', 'boolean', 'object', 'array'] },
                  minLength: { type: 'number', minimum: 0 },
                  maxLength: { type: 'number', minimum: 0 },
                  min: { type: 'number' },
                  max: { type: 'number' },
                  pattern: { type: 'object' }, // RegExp objects
                  enum: { type: 'array' },
                  optional: { type: 'boolean' }
                }
              }
            }
          }
        }
      }
    }
  },

  PERFORMANCE_THRESHOLDS: {
    type: 'object',
    patternProperties: {
      '^[A-Z_]+$': {
        type: 'object',
        patternProperties: {
          '^[A-Z_]+$': { type: 'number', minimum: 0 }
        }
      }
    }
  },

  ERROR_SCENARIOS: {
    type: 'object',
    patternProperties: {
      '^[A-Z_]+$': {
        type: 'object',
        required: ['type', 'name', 'message', 'code', 'recoverable', 'severity', 'category'],
        properties: {
          type: { type: 'string', minLength: 1 },
          name: { type: 'string', minLength: 1 },
          message: { type: 'string', minLength: 1 },
          code: { type: 'string', minLength: 1 },
          recoverable: { type: 'boolean' },
          severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
          category: { type: 'string', enum: ['STORAGE', 'NETWORK', 'SYNC', 'AUTH', 'VALIDATION', 'SYSTEM', 'APPLICATION'] },
          retryable: { type: 'boolean' },
          maxRetries: { type: 'number', minimum: 0, maximum: 10 },
          retryDelay: { type: 'number', minimum: 0, maximum: 60000 },
          userMessage: { type: 'string', minLength: 1 },
          technicalDetails: { type: 'string', minLength: 1 },
          suggestedActions: {
            type: 'array',
            items: { type: 'string', minLength: 1 }
          }
        }
      }
    }
  }
};

/**
 * Validates a configuration object against its schema
 * @param {Object} config - Configuration object to validate
 * @param {string} schemaName - Name of the schema to validate against
 * @returns {Object} Validation result
 */
export function validateConfig(config, schemaName) {
  const schema = CONFIG_SCHEMAS[schemaName];
  if (!schema) {
    return {
      valid: false,
      errors: [`Unknown schema: ${schemaName}`],
      warnings: []
    };
  }

  const result = {
    valid: true,
    errors: [],
    warnings: [],
    details: {}
  };

  try {
    validateObject(config, schema, '', result);
  } catch (error) {
    result.valid = false;
    result.errors.push(`Validation error: ${error.message}`);
  }

  result.valid = result.errors.length === 0;
  return result;
}

/**
 * Validates an object against a schema definition
 * @param {*} value - Value to validate
 * @param {Object} schema - Schema definition
 * @param {string} path - Current validation path
 * @param {Object} result - Validation result object
 */
function validateObject(value, schema, path, result) {
  const currentPath = path || 'root';

  // Type validation
  if (schema.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== schema.type) {
      result.errors.push(`${currentPath}: Expected ${schema.type}, got ${actualType}`);
      return;
    }
  }

  // Null/undefined checks
  if (value === null || value === undefined) {
    if (schema.required && schema.required.length > 0) {
      result.errors.push(`${currentPath}: Value is required but is ${value}`);
    }
    return;
  }

  // Object validation
  if (schema.type === 'object' && typeof value === 'object' && !Array.isArray(value)) {
    // Required properties
    if (schema.required) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in value)) {
          result.errors.push(`${currentPath}: Missing required property '${requiredProp}'`);
        }
      }
    }

    // Property validation
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (propName in value) {
          validateObject(value[propName], propSchema, `${currentPath}.${propName}`, result);
        }
      }
    }

    // Pattern properties validation
    if (schema.patternProperties) {
      for (const [propName, propValue] of Object.entries(value)) {
        let matched = false;
        
        for (const [pattern, patternSchema] of Object.entries(schema.patternProperties)) {
          const regex = new RegExp(pattern);
          if (regex.test(propName)) {
            validateObject(propValue, patternSchema, `${currentPath}.${propName}`, result);
            matched = true;
            break;
          }
        }
        
        if (!matched && !schema.properties?.[propName]) {
          result.warnings.push(`${currentPath}: Property '${propName}' does not match any pattern`);
        }
      }
    }
  }

  // Array validation
  if (schema.type === 'array' && Array.isArray(value)) {
    if (schema.items) {
      value.forEach((item, index) => {
        validateObject(item, schema.items, `${currentPath}[${index}]`, result);
      });
    }

    if (schema.minItems && value.length < schema.minItems) {
      result.errors.push(`${currentPath}: Array must have at least ${schema.minItems} items`);
    }

    if (schema.maxItems && value.length > schema.maxItems) {
      result.errors.push(`${currentPath}: Array must have at most ${schema.maxItems} items`);
    }
  }

  // String validation
  if (schema.type === 'string' && typeof value === 'string') {
    if (schema.minLength && value.length < schema.minLength) {
      result.errors.push(`${currentPath}: String must be at least ${schema.minLength} characters`);
    }

    if (schema.maxLength && value.length > schema.maxLength) {
      result.errors.push(`${currentPath}: String must be at most ${schema.maxLength} characters`);
    }

    if (schema.pattern && !schema.pattern.test(value)) {
      result.errors.push(`${currentPath}: String does not match required pattern`);
    }

    if (schema.enum && !schema.enum.includes(value)) {
      result.errors.push(`${currentPath}: Value must be one of: ${schema.enum.join(', ')}`);
    }
  }

  // Number validation
  if (schema.type === 'number' && typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      result.errors.push(`${currentPath}: Number must be at least ${schema.minimum}`);
    }

    if (schema.maximum !== undefined && value > schema.maximum) {
      result.errors.push(`${currentPath}: Number must be at most ${schema.maximum}`);
    }

    if (schema.multipleOf && value % schema.multipleOf !== 0) {
      result.errors.push(`${currentPath}: Number must be a multiple of ${schema.multipleOf}`);
    }
  }
}

/**
 * Validates multiple configurations at once
 * @param {Object} configs - Object containing multiple configurations
 * @returns {Object} Combined validation result
 */
export function validateAllConfigs(configs) {
  const results = {
    overall: true,
    configurations: {},
    summary: {
      total: 0,
      valid: 0,
      invalid: 0,
      warnings: 0
    }
  };

  for (const [configName, config] of Object.entries(configs)) {
    // Use the config name directly as schema name (should already match)
    const schemaName = configName;
    const validation = validateConfig(config, schemaName);
    
    results.configurations[configName] = validation;
    results.summary.total++;
    
    if (validation.valid) {
      results.summary.valid++;
    } else {
      results.summary.invalid++;
      results.overall = false;
    }
    
    results.summary.warnings += validation.warnings.length;
  }

  return results;
}

/**
 * Creates a configuration validator with custom rules
 * @param {Object} customSchemas - Custom schema definitions
 * @returns {Object} Validator instance with custom schemas
 */
export function createCustomValidator(customSchemas = {}) {
  const mergedSchemas = { ...CONFIG_SCHEMAS, ...customSchemas };
  
  return {
    validate: (config, schemaName) => {
      const schema = mergedSchemas[schemaName];
      if (!schema) {
        return {
          valid: false,
          errors: [`Unknown schema: ${schemaName}`],
          warnings: []
        };
      }
      
      const result = {
        valid: true,
        errors: [],
        warnings: [],
        details: {}
      };
      
      validateObject(config, schema, '', result);
      result.valid = result.errors.length === 0;
      return result;
    },
    
    addSchema: (name, schema) => {
      mergedSchemas[name] = schema;
    },
    
    getSchemas: () => ({ ...mergedSchemas }),
    
    validateAll: (configs) => validateAllConfigs(configs)
  };
}

/**
 * Performs deep immutability check on configuration objects
 * @param {Object} config - Configuration object to check
 * @param {string} path - Current path for error reporting
 * @returns {Object} Immutability check result
 */
export function checkImmutability(config, path = 'root') {
  const result = {
    immutable: true,
    violations: [],
    warnings: []
  };

  // Use the utility function from immutable-utils.js
  const deeplyFrozen = isDeeplyFrozen(config, path);
  
  if (!deeplyFrozen) {
    result.immutable = false;
    result.violations.push(`${path}: Object is not deeply frozen`);
  }

  try {
    // Try to modify the object
    const testKey = '__immutability_test__';
    config[testKey] = 'test';
    
    if (config[testKey] === 'test') {
      result.immutable = false;
      result.violations.push(`${path}: Object is mutable - can add properties`);
      delete config[testKey];
    }
  } catch (error) {
    // Good - object is frozen/sealed
  }

  return result;
}

/**
 * Validates environment-specific configuration overrides
 * @param {Object} baseConfig - Base configuration
 * @param {Object} envConfig - Environment-specific overrides
 * @param {string} environment - Environment name
 * @returns {Object} Override validation result
 */
export function validateEnvironmentOverrides(baseConfig, envConfig, environment) {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
    environment,
    overrides: {}
  };

  // Check that all override keys exist in base config
  function checkOverrides(base, override, path = '') {
    for (const [key, value] of Object.entries(override)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (!(key in base)) {
        result.warnings.push(`${currentPath}: Override key not found in base configuration`);
        continue;
      }

      // Type consistency check
      const baseType = typeof base[key];
      const overrideType = typeof value;
      
      if (baseType !== overrideType) {
        result.errors.push(
          `${currentPath}: Type mismatch - base is ${baseType}, override is ${overrideType}`
        );
        result.valid = false;
        continue;
      }

      // Recursive check for objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        checkOverrides(base[key], value, currentPath);
      }

      result.overrides[currentPath] = {
        baseValue: base[key],
        overrideValue: value,
        changed: base[key] !== value
      };
    }
  }

  checkOverrides(baseConfig, envConfig);
  return result;
}

// Export validation utilities
export const ConfigValidator = {
  validate: validateConfig,
  validateAll: validateAllConfigs,
  createCustom: createCustomValidator,
  checkImmutability,
  validateEnvironmentOverrides,
  deepFreeze,
  createImmutableConfig,
  schemas: CONFIG_SCHEMAS
};

// Default export
export default ConfigValidator;

if (typeof describe !== 'undefined') {
  describe('ConfigValidator', () => {
    test('exports validation helpers', () => {
      expect(ConfigValidator).toBeDefined();
      expect(ConfigValidator.validate).toBeDefined();
      expect(ConfigValidator.schemas).toBeDefined();
    });
  });
}
