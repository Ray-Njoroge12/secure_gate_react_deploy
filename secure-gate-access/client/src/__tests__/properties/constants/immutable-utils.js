/**
 * Immutability Utilities
 * 
 * Utility functions for creating immutable configuration objects.
 * Separated from config-validator.js to avoid circular dependencies.
 */

/**
 * Performs deep freezing of an object to make it immutable
 * @param {*} obj - Object to freeze
 * @returns {*} Deeply frozen object
 */
export function deepFreeze(obj) {
  // Handle null, undefined, and primitives
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    obj.forEach(item => deepFreeze(item));
    return Object.freeze(obj);
  }

  // Handle regular expressions (don't freeze them as they need to be mutable for testing)
  if (obj instanceof RegExp) {
    return obj;
  }

  // Handle dates
  if (obj instanceof Date) {
    return Object.freeze(obj);
  }

  // Handle regular objects
  Object.values(obj).forEach(value => deepFreeze(value));
  return Object.freeze(obj);
}

/**
 * Creates an immutable configuration object with deep freezing
 * @param {Object} config - Configuration object to make immutable
 * @returns {Object} Immutable configuration object
 */
export function createImmutableConfig(config) {
  // Create a deep copy to avoid mutating the original
  const copy = JSON.parse(JSON.stringify(config));
  return deepFreeze(copy);
}

/**
 * Checks if an object is deeply frozen
 * @param {*} obj - Object to check
 * @param {string} path - Current path for error reporting
 * @returns {boolean} True if object is deeply frozen
 */
export function isDeeplyFrozen(obj, path = 'root') {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return true;
  }

  // Handle regular expressions (they are intentionally not frozen for testing)
  if (obj instanceof RegExp) {
    return true;
  }

  // Handle dates
  if (obj instanceof Date) {
    return Object.isFrozen(obj);
  }

  // Check if current object is frozen
  if (!Object.isFrozen(obj)) {
    return false;
  }

  // Check arrays
  if (Array.isArray(obj)) {
    return obj.every((item, index) => isDeeplyFrozen(item, `${path}[${index}]`));
  }

  // Check regular objects
  return Object.entries(obj).every(([key, value]) => 
    isDeeplyFrozen(value, `${path}.${key}`)
  );
}

/**
 * Safely merges configuration objects without mutating originals
 * @param {Object} base - Base configuration object
 * @param {Object} override - Override configuration object
 * @returns {Object} Merged configuration object
 */
export function safeMergeConfig(base, override) {
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

// Default export
const immutableUtils = {
  deepFreeze,
  createImmutableConfig,
  isDeeplyFrozen,
  safeMergeConfig
};

export default immutableUtils;

if (typeof describe !== 'undefined') {
  describe('Immutable Utils', () => {
    test('exports immutability helpers', () => {
      expect(deepFreeze).toBeDefined();
      expect(createImmutableConfig).toBeDefined();
      expect(isDeeplyFrozen).toBeDefined();
    });
  });
}
