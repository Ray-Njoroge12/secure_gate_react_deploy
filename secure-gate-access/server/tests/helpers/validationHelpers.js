/**
 * Validation & Assertion Helpers
 * Deep comparison, schema validation, and custom matchers
 */

/**
 * Deep object comparison
 * @param {*} obj1 - First object
 * @param {*} obj2 - Second object
 * @param {Object} options - Comparison options
 * @returns {boolean} Objects are equal
 */
export function deepEqual(obj1, obj2, options = {}) {
  const { ignoreKeys = [], ignoreFunctions = true, ignoreUndefined = false } = options;

  // Handle null/undefined
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (obj1 !== obj1 && obj2 !== obj2) return true; // NaN === NaN

  // Handle primitives
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return obj1 === obj2;
  }

  // Handle arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false;
    return obj1.every((item, index) => deepEqual(item, obj2[index], options));
  }

  // Handle dates
  if (obj1 instanceof Date && obj2 instanceof Date) {
    return obj1.getTime() === obj2.getTime();
  }

  // Handle objects
  const keys1 = Object.keys(obj1).filter(key => !ignoreKeys.includes(key));
  const keys2 = Object.keys(obj2).filter(key => !ignoreKeys.includes(key));

  if (keys1.length !== keys2.length) return false;

  return keys1.every(key => {
    const val1 = obj1[key];
    const val2 = obj2[key];

    if (ignoreFunctions && typeof val1 === 'function') return true;
    if (ignoreUndefined && val1 === undefined) return true;

    return deepEqual(val1, val2, options);
  });
}

/**
 * Partial object match
 * @param {Object} object - Object to check
 * @param {Object} subset - Expected subset
 * @returns {boolean} Object contains subset
 */
export function containsSubset(object, subset) {
  if (typeof subset !== 'object' || subset === null) {
    return object === subset;
  }

  if (Array.isArray(subset)) {
    if (!Array.isArray(object)) return false;
    return subset.every((item, index) => containsSubset(object[index], item));
  }

  return Object.keys(subset).every(key => {
    return Object.prototype.hasOwnProperty.call(object, key) &&
           containsSubset(object[key], subset[key]);
  });
}

/**
 * Schema validation
 * @param {Object} data - Data to validate
 * @param {Object} schema - Schema definition
 * @returns {Object} Validation result
 */
export function validateSchema(data, schema) {
  const errors = [];

  Object.keys(schema).forEach(key => {
    const rule = schema[key];
    const value = data[key];

    // Required check
    if (rule.required && (value === undefined || value === null)) {
      errors.push(`${key} is required`);
      return;
    }

    // Skip other checks if value is undefined and not required
    if (value === undefined || value === null) return;

    // Type check
    if (rule.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rule.type) {
        errors.push(`${key} must be of type ${rule.type}, got ${actualType}`);
      }
    }

    // Min/Max for numbers
    if (rule.type === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`${key} must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push(`${key} must be at most ${rule.max}`);
      }
    }

    // Min/Max length for strings and arrays
    if (rule.type === 'string' || rule.type === 'array') {
      const length = value.length;
      if (rule.minLength !== undefined && length < rule.minLength) {
        errors.push(`${key} must have at least ${rule.minLength} characters/items`);
      }
      if (rule.maxLength !== undefined && length > rule.maxLength) {
        errors.push(`${key} must have at most ${rule.maxLength} characters/items`);
      }
    }

    // Pattern matching for strings
    if (rule.type === 'string' && rule.pattern) {
      const regex = new RegExp(rule.pattern);
      if (!regex.test(value)) {
        errors.push(`${key} does not match required pattern`);
      }
    }

    // Enum check
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${key} must be one of: ${rule.enum.join(', ')}`);
    }

    // Custom validator
    if (rule.validate && typeof rule.validate === 'function') {
      const customError = rule.validate(value);
      if (customError) {
        errors.push(`${key}: ${customError}`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Array comparison helpers
 */

/**
 * Compare arrays regardless of order
 * @param {Array} arr1 - First array
 * @param {Array} arr2 - Second array
 * @returns {boolean} Arrays contain same elements
 */
export function arraysEqualUnordered(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();
  return deepEqual(sorted1, sorted2);
}

/**
 * Check if array contains all elements
 * @param {Array} array - Array to check
 * @param {Array} elements - Elements to find
 * @returns {boolean} Array contains all elements
 */
export function arrayContainsAll(array, elements) {
  return elements.every(element =>
    array.some(item => deepEqual(item, element))
  );
}

/**
 * Check if array contains any element
 * @param {Array} array - Array to check
 * @param {Array} elements - Elements to find
 * @returns {boolean} Array contains any element
 */
export function arrayContainsAny(array, elements) {
  return elements.some(element =>
    array.some(item => deepEqual(item, element))
  );
}

/**
 * Date/Time assertions
 */

/**
 * Check if date is recent (within threshold)
 * @param {Date|string} date - Date to check
 * @param {number} thresholdMs - Threshold in milliseconds
 * @returns {boolean} Date is recent
 */
export function isRecentDate(date, thresholdMs = 5000) {
  const dateObj = new Date(date);
  const now = new Date();
  return Math.abs(now - dateObj) <= thresholdMs;
}

/**
 * Check if date is in future
 * @param {Date|string} date - Date to check
 * @returns {boolean} Date is in future
 */
export function isFutureDate(date) {
  return new Date(date) > new Date();
}

/**
 * Check if date is in past
 * @param {Date|string} date - Date to check
 * @returns {boolean} Date is in past
 */
export function isPastDate(date) {
  return new Date(date) < new Date();
}

/**
 * Check if dates are on same day
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {boolean} Dates are on same day
 */
export function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

/**
 * Custom matchers for Jest
 */

/**
 * Expect object to match schema
 * @param {Object} received - Received object
 * @param {Object} schema - Expected schema
 * @returns {Object} Jest matcher result
 */
export function toMatchSchema(received, schema) {
  const result = validateSchema(received, schema);
  
  return {
    pass: result.valid,
    message: () =>
      result.valid
        ? `Expected object not to match schema`
        : `Expected object to match schema:\n${result.errors.join('\n')}`
  };
}

/**
 * Expect array to contain object matching
 * @param {Array} received - Received array
 * @param {Object} expected - Expected object properties
 * @returns {Object} Jest matcher result
 */
export function toContainObjectMatching(received, expected) {
  const pass = received.some(item => containsSubset(item, expected));
  
  return {
    pass,
    message: () =>
      pass
        ? `Expected array not to contain object matching ${JSON.stringify(expected)}`
        : `Expected array to contain object matching ${JSON.stringify(expected)}`
  };
}

/**
 * Expect response to have status and body
 * @param {Object} received - HTTP response
 * @param {number} status - Expected status code
 * @param {Object} body - Expected body properties
 * @returns {Object} Jest matcher result
 */
export function toHaveStatusAndBody(received, status, body = {}) {
  const statusMatches = received.status === status;
  const bodyMatches = body ? containsSubset(received.body || received.data, body) : true;
  const pass = statusMatches && bodyMatches;
  
  return {
    pass,
    message: () => {
      if (!statusMatches) {
        return `Expected status ${status}, got ${received.status}`;
      }
      if (!bodyMatches) {
        return `Expected body to contain ${JSON.stringify(body)}`;
      }
      return `Expected response not to match`;
    }
  };
}

/**
 * String validation helpers
 */

/**
 * Check if string is valid email
 * @param {string} str - String to check
 * @returns {boolean} Is valid email
 */
export function isValidEmail(str) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str);
}

/**
 * Check if string is valid phone number
 * @param {string} str - String to check
 * @param {string} format - Phone format ('kenyan', 'international')
 * @returns {boolean} Is valid phone
 */
export function isValidPhone(str, format = 'kenyan') {
  if (format === 'kenyan') {
    // Kenyan format: +254... or 07..., 01...
    return /^(\+254|0)[17]\d{8}$/.test(str.replace(/[\s-]/g, ''));
  }
  // Basic international format
  return /^\+?\d{10,15}$/.test(str.replace(/[\s-]/g, ''));
}

/**
 * Check if string is valid URL
 * @param {string} str - String to check
 * @returns {boolean} Is valid URL
 */
export function isValidURL(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Number validation helpers
 */

/**
 * Check if number is in range
 * @param {number} num - Number to check
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} Is in range
 */
export function isInRange(num, min, max) {
  return num >= min && num <= max;
}

/**
 * Check if number is positive
 * @param {number} num - Number to check
 * @returns {boolean} Is positive
 */
export function isPositive(num) {
  return num > 0;
}

/**
 * Check if number is integer
 * @param {number} num - Number to check
 * @returns {boolean} Is integer
 */
export function isInteger(num) {
  return Number.isInteger(num);
}

/**
 * Assert helpers (throw errors)
 */

/**
 * Assert deep equal
 * @param {*} actual - Actual value
 * @param {*} expected - Expected value
 * @param {string} message - Error message
 * @throws {Error} If not equal
 */
export function assertEqual(actual, expected, message = 'Values not equal') {
  if (!deepEqual(actual, expected)) {
    throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
}

/**
 * Assert contains subset
 * @param {Object} object - Object to check
 * @param {Object} subset - Expected subset
 * @param {string} message - Error message
 * @throws {Error} If does not contain subset
 */
export function assertContains(object, subset, message = 'Object does not contain subset') {
  if (!containsSubset(object, subset)) {
    throw new Error(`${message}\nExpected subset: ${JSON.stringify(subset)}\nActual: ${JSON.stringify(object)}`);
  }
}

/**
 * Assert valid schema
 * @param {Object} data - Data to validate
 * @param {Object} schema - Schema definition
 * @throws {Error} If schema validation fails
 */
export function assertValidSchema(data, schema) {
  const result = validateSchema(data, schema);
  if (!result.valid) {
    throw new Error(`Schema validation failed:\n${result.errors.join('\n')}`);
  }
}

/**
 * Assert schema
 * @param {Object} data - Data to validate
 * @param {Object} schema - Schema definition
 * @returns {Object} Schema validation result
 */
export function assertSchema(data, schema) {
  return validateSchema(data, schema);
}

// Export all helpers
export default {
  // Object comparison
  deepEqual,
  containsSubset,
  validateSchema,
  
  // Array helpers
  arraysEqualUnordered,
  arrayContainsAll,
  arrayContainsAny,
  
  // Date helpers
  isRecentDate,
  isFutureDate,
  isPastDate,
  isSameDay,
  
  // Custom matchers
  toMatchSchema,
  toContainObjectMatching,
  toHaveStatusAndBody,
  
  // String validation
  isValidEmail,
  isValidPhone,
  isValidURL,
  
  // Number validation
  isInRange,
  isPositive,
  isInteger,
  
  // Assert helpers
  assertEqual,
  assertContains,
  assertValidSchema,
  assertSchema
};
