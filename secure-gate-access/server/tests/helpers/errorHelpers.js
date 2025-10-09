/**
 * Error Assertion Helpers
 * Testing error scenarios, messages, and formats
 */

/**
 * Error type constants
 */
export const ERROR_TYPES = {
  VALIDATION: 'ValidationError',
  AUTHENTICATION: 'AuthenticationError',
  AUTHORIZATION: 'AuthorizationError',
  NOT_FOUND: 'NotFoundError',
  CONFLICT: 'ConflictError',
  RATE_LIMIT: 'RateLimitError',
  SERVER: 'ServerError',
  DATABASE: 'DatabaseError'
};

/**
 * HTTP status codes for errors
 */
export const ERROR_STATUS_CODES = {
  [ERROR_TYPES.VALIDATION]: 400,
  [ERROR_TYPES.AUTHENTICATION]: 401,
  [ERROR_TYPES.AUTHORIZATION]: 403,
  [ERROR_TYPES.NOT_FOUND]: 404,
  [ERROR_TYPES.CONFLICT]: 409,
  [ERROR_TYPES.RATE_LIMIT]: 429,
  [ERROR_TYPES.SERVER]: 500,
  [ERROR_TYPES.DATABASE]: 500
};

/**
 * Check if error has expected structure
 * @param {Error|Object} error - Error to check
 * @param {Object} expectedStructure - Expected error structure
 * @returns {boolean} Error matches structure
 */
export function hasErrorStructure(error, expectedStructure = {}) {
  const requiredFields = expectedStructure.required || ['message', 'status'];
  const optionalFields = expectedStructure.optional || [];
  
  // Check required fields
  const hasRequired = requiredFields.every(field => 
    Object.prototype.hasOwnProperty.call(error, field)
  );

  if (!hasRequired) return false;

  // Check field types if specified
  if (expectedStructure.types) {
    const typesMatch = Object.keys(expectedStructure.types).every(field => {
      if (!Object.prototype.hasOwnProperty.call(error, field)) return true;
      return typeof error[field] === expectedStructure.types[field];
    });
    if (!typesMatch) return false;
  }

  return true;
}

/**
 * Assert error has specific message
 * @param {Error} error - Error object
 * @param {string|RegExp} expectedMessage - Expected message or pattern
 * @throws {Error} If message doesn't match
 */
export function assertErrorMessage(error, expectedMessage) {
  if (!error) {
    throw new Error('Expected an error but got none');
  }

  if (typeof expectedMessage === 'string') {
    if (error.message !== expectedMessage) {
      throw new Error(
        `Expected error message: "${expectedMessage}"\n` +
        `Actual error message: "${error.message}"`
      );
    }
  } else if (expectedMessage instanceof RegExp) {
    if (!expectedMessage.test(error.message)) {
      throw new Error(
        `Expected error message to match: ${expectedMessage}\n` +
        `Actual error message: "${error.message}"`
      );
    }
  }
}

/**
 * Assert error has specific status code
 * @param {Error} error - Error object
 * @param {number} expectedStatus - Expected status code
 * @throws {Error} If status doesn't match
 */
export function assertErrorStatus(error, expectedStatus) {
  if (!error) {
    throw new Error('Expected an error but got none');
  }

  const actualStatus = error.status || error.statusCode || error.response?.status;
  
  if (actualStatus !== expectedStatus) {
    throw new Error(
      `Expected error status: ${expectedStatus}\n` +
      `Actual error status: ${actualStatus}`
    );
  }
}

/**
 * Assert error type
 * @param {Error} error - Error object
 * @param {string} expectedType - Expected error type
 * @throws {Error} If type doesn't match
 */
export function assertErrorType(error, expectedType) {
  if (!error) {
    throw new Error('Expected an error but got none');
  }

  const actualType = error.constructor.name || error.name || error.type;
  
  if (actualType !== expectedType) {
    throw new Error(
      `Expected error type: ${expectedType}\n` +
      `Actual error type: ${actualType}`
    );
  }
}

/**
 * Assert error contains specific fields
 * @param {Error} error - Error object
 * @param {Array<string>} fields - Expected fields
 * @throws {Error} If fields are missing
 */
export function assertErrorFields(error, fields) {
  if (!error) {
    throw new Error('Expected an error but got none');
  }

  const missingFields = fields.filter(field =>
    !Object.prototype.hasOwnProperty.call(error, field)
  );

  if (missingFields.length > 0) {
    throw new Error(
      `Error missing expected fields: ${missingFields.join(', ')}\n` +
      `Available fields: ${Object.keys(error).join(', ')}`
    );
  }
}

/**
 * Assert API error response
 * @param {Object} response - HTTP response
 * @param {Object} expectations - Expected error properties
 * @throws {Error} If expectations not met
 */
export function assertAPIError(response, expectations = {}) {
  const {
    status,
    message,
    code,
    type,
    fields
  } = expectations;

  // Check status
  if (status !== undefined) {
    if (response.status !== status) {
      throw new Error(
        `Expected status ${status}, got ${response.status}`
      );
    }
  }

  const errorBody = response.body || response.data || response.error || {};

  // Check message
  if (message !== undefined) {
    const actualMessage = errorBody.message || errorBody.error;
    if (typeof message === 'string' && actualMessage !== message) {
      throw new Error(
        `Expected message "${message}", got "${actualMessage}"`
      );
    } else if (message instanceof RegExp && !message.test(actualMessage)) {
      throw new Error(
        `Expected message to match ${message}, got "${actualMessage}"`
      );
    }
  }

  // Check error code
  if (code !== undefined && errorBody.code !== code) {
    throw new Error(
      `Expected error code ${code}, got ${errorBody.code}`
    );
  }

  // Check error type
  if (type !== undefined && errorBody.type !== type) {
    throw new Error(
      `Expected error type ${type}, got ${errorBody.type}`
    );
  }

  // Check fields
  if (fields !== undefined) {
    assertErrorFields(errorBody, fields);
  }
}

/**
 * Generate expected error response
 * @param {string} type - Error type
 * @param {string} message - Error message
 * @param {Object} additional - Additional fields
 * @returns {Object} Expected error response
 */
export function generateExpectedError(type, message, additional = {}) {
  return {
    error: message,
    message,
    type,
    status: ERROR_STATUS_CODES[type] || 500,
    timestamp: expect.any(String),
    ...additional
  };
}

/**
 * Create error test case
 * @param {Object} config - Test case configuration
 * @returns {Object} Error test case
 */
export function createErrorTestCase(config) {
  const {
    description,
    input,
    errorType,
    expectedStatus,
    expectedMessage,
    expectedFields = ['error', 'message', 'status']
  } = config;

  return {
    description: description || `should return ${expectedStatus} error`,
    input,
    expected: {
      error: true,
      status: expectedStatus,
      message: expectedMessage,
      type: errorType,
      fields: expectedFields
    }
  };
}

/**
 * Generate validation error test cases
 * @param {string} field - Field name
 * @param {Array} invalidValues - Invalid values to test
 * @returns {Array} Test cases
 */
export function generateValidationErrorCases(field, invalidValues) {
  return invalidValues.map(value => ({
    description: `should reject ${field} = ${JSON.stringify(value)}`,
    input: { [field]: value },
    expected: {
      status: 400,
      type: ERROR_TYPES.VALIDATION,
      messagePattern: new RegExp(field, 'i')
    }
  }));
}

/**
 * Generate authentication error test cases
 * @returns {Array} Authentication error test cases
 */
export function generateAuthErrorCases() {
  return [
    {
      description: 'should reject missing token',
      headers: {},
      expected: {
        status: 401,
        type: ERROR_TYPES.AUTHENTICATION,
        message: /token|unauthorized/i
      }
    },
    {
      description: 'should reject invalid token',
      headers: { Authorization: 'Bearer invalid.token.here' },
      expected: {
        status: 401,
        type: ERROR_TYPES.AUTHENTICATION,
        message: /invalid|token/i
      }
    },
    {
      description: 'should reject expired token',
      headers: { Authorization: 'Bearer expired-token' },
      expected: {
        status: 401,
        type: ERROR_TYPES.AUTHENTICATION,
        message: /expired|token/i
      }
    },
    {
      description: 'should reject malformed token',
      headers: { Authorization: 'InvalidFormat' },
      expected: {
        status: 401,
        type: ERROR_TYPES.AUTHENTICATION,
        message: /token|format/i
      }
    }
  ];
}

/**
 * Generate authorization error test cases
 * @param {string} requiredRole - Required role for access
 * @param {Array<string>} unauthorizedRoles - Roles that should be denied
 * @returns {Array} Authorization error test cases
 */
export function generateAuthzErrorCases(requiredRole, unauthorizedRoles) {
  return unauthorizedRoles.map(role => ({
    description: `should reject ${role} accessing ${requiredRole}-only resource`,
    role,
    expected: {
      status: 403,
      type: ERROR_TYPES.AUTHORIZATION,
      message: /forbidden|permission|access/i
    }
  }));
}

/**
 * Check if error is retryable
 * @param {Error} error - Error to check
 * @returns {boolean} Error is retryable
 */
export function isRetryableError(error) {
  const retryableStatuses = [408, 429, 500, 502, 503, 504];
  const status = error.status || error.statusCode || error.response?.status;
  return retryableStatuses.includes(status);
}

/**
 * Check if error is client error (4xx)
 * @param {Error} error - Error to check
 * @returns {boolean} Error is client error
 */
export function isClientError(error) {
  const status = error.status || error.statusCode || error.response?.status;
  return status >= 400 && status < 500;
}

/**
 * Check if error is server error (5xx)
 * @param {Error} error - Error to check
 * @returns {boolean} Error is server error
 */
export function isServerError(error) {
  const status = error.status || error.statusCode || error.response?.status;
  return status >= 500 && status < 600;
}

/**
 * Extract error details from various error formats
 * @param {*} error - Error in any format
 * @returns {Object} Normalized error details
 */
export function extractErrorDetails(error) {
  if (!error) return null;

  return {
    message: error.message || error.error || error.msg || 'Unknown error',
    status: error.status || error.statusCode || error.response?.status || 500,
    code: error.code || error.errorCode || 'UNKNOWN',
    type: error.type || error.name || error.constructor?.name || 'Error',
    stack: error.stack || null,
    details: error.details || error.data || null,
    original: error
  };
}

/**
 * Format error for logging
 * @param {Error} error - Error to format
 * @returns {string} Formatted error string
 */
export function formatErrorForLogging(error) {
  const details = extractErrorDetails(error);
  
  return [
    `Error: ${details.message}`,
    `Status: ${details.status}`,
    `Type: ${details.type}`,
    `Code: ${details.code}`,
    details.stack ? `Stack: ${details.stack.split('\n').slice(0, 3).join('\n')}` : '',
    details.details ? `Details: ${JSON.stringify(details.details)}` : ''
  ].filter(Boolean).join('\n');
}

/**
 * Custom error matchers for Jest
 */

/**
 * Expect to throw error with message
 * @param {Function} fn - Function to test
 * @param {string|RegExp} message - Expected message
 * @returns {boolean} Function threw error with message
 */
export async function expectToThrowWithMessage(fn, message) {
  try {
    await fn();
    return false;
  } catch (error) {
    if (typeof message === 'string') {
      return error.message === message;
    } else if (message instanceof RegExp) {
      return message.test(error.message);
    }
    return false;
  }
}

/**
 * Expect to throw error with status
 * @param {Function} fn - Function to test
 * @param {number} status - Expected status
 * @returns {boolean} Function threw error with status
 */
export async function expectToThrowWithStatus(fn, status) {
  try {
    await fn();
    return false;
  } catch (error) {
    const actualStatus = error.status || error.statusCode || error.response?.status;
    return actualStatus === status;
  }
}

// Export all helpers
export default {
  ERROR_TYPES,
  ERROR_STATUS_CODES,
  
  // Structure checking
  hasErrorStructure,
  
  // Assertions
  assertErrorMessage,
  assertErrorStatus,
  assertErrorType,
  assertErrorFields,
  assertAPIError,
  
  // Generators
  generateExpectedError,
  createErrorTestCase,
  generateValidationErrorCases,
  generateAuthErrorCases,
  generateAuthzErrorCases,
  
  // Error classification
  isRetryableError,
  isClientError,
  isServerError,
  
  // Error processing
  extractErrorDetails,
  formatErrorForLogging,
  
  // Custom matchers
  expectToThrowWithMessage,
  expectToThrowWithStatus
};
