/**
 * Test Utilities
 * Core testing utilities for the Secure Gate backend
 * Provides common setup, teardown, and helper functions
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * Setup test environment
 * Initializes test configuration and environment variables
 */
export const setupTestEnvironment = () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Disable external notifications in tests
  process.env.ENABLE_EMAIL_NOTIFICATIONS = 'false';
  process.env.ENABLE_SMS_NOTIFICATIONS = 'false';
  process.env.OTP_DEBUG_ECHO = 'true';
  
  // Use test database
  if (!process.env.TEST_PGDATABASE) {
    process.env.TEST_PGDATABASE = 'secure_gate_test';
  }
  
  // Override database name for tests
  process.env.PGDATABASE = process.env.TEST_PGDATABASE;
  
  return {
    env: process.env.NODE_ENV,
    database: process.env.PGDATABASE,
    testMode: true
  };
};

/**
 * Teardown test environment
 * Cleans up after tests complete
 */
export const teardownTestEnvironment = async () => {
  // Reset environment
  delete process.env.TEST_MODE;
  
  // Allow time for connections to close
  await sleep(100);
};

/**
 * Create test context
 * Creates a new test context with isolated state
 */
export const createTestContext = () => {
  return {
    testId: generateTestId(),
    startTime: Date.now(),
    metadata: {},
    cleanup: []
  };
};

/**
 * Wait for condition with timeout
 * @param {Function} condition - Function that returns true when condition is met
 * @param {number} timeout - Maximum time to wait in milliseconds
 * @param {number} interval - Check interval in milliseconds
 */
export const waitForCondition = async (condition, timeout = 5000, interval = 100) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await sleep(interval);
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
};

/**
 * Async expectation helper
 * Wraps async operations for easier testing
 */
export const expectAsync = async (fn) => {
  try {
    const result = await fn();
    return {
      success: true,
      result,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      result: null,
      error
    };
  }
};

/**
 * Mock environment variables temporarily
 * @param {Object} vars - Environment variables to mock
 * @param {Function} fn - Function to execute with mocked vars
 */
export const withMockedEnv = async (vars, fn) => {
  const originalVars = {};
  
  // Save original values
  for (const [key, value] of Object.entries(vars)) {
    originalVars[key] = process.env[key];
    process.env[key] = value;
  }
  
  try {
    return await fn();
  } finally {
    // Restore original values
    for (const [key, value] of Object.entries(originalVars)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
};

/**
 * Sleep helper
 * @param {number} ms - Milliseconds to sleep
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate unique test ID
 */
export const generateTestId = () => {
  return `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
};

/**
 * Retry helper for flaky tests
 * @param {Function} fn - Function to retry
 * @param {number} maxAttempts - Maximum retry attempts
 * @param {number} delay - Delay between retries in ms
 */
export const retry = async (fn, maxAttempts = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
};

/**
 * Measure execution time
 * @param {Function} fn - Function to measure
 */
export const measureTime = async (fn) => {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  
  return { result, duration };
};

/**
 * Create timeout promise
 * @param {number} ms - Timeout in milliseconds
 * @param {string} message - Timeout error message
 */
export const timeout = (ms, message = 'Operation timed out') => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
};

/**
 * Race with timeout
 * @param {Promise} promise - Promise to race
 * @param {number} ms - Timeout in milliseconds
 */
export const withTimeout = (promise, ms) => {
  return Promise.race([
    promise,
    timeout(ms)
  ]);
};

/**
 * Clean test email for uniqueness
 * @param {string} baseEmail - Base email address
 */
export const cleanTestEmail = (baseEmail = 'test@example.com') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const [local, domain] = baseEmail.split('@');
  return `${local}+${timestamp}_${random}@${domain}`;
};

/**
 * Clean test phone for uniqueness
 * @param {string} basePhone - Base phone number
 */
export const cleanTestPhone = (basePhone = '+254712345678') => {
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return basePhone.slice(0, -6) + random;
};

/**
 * Assert response structure
 * @param {Object} response - Response object to validate
 * @param {Object} expectedStructure - Expected structure
 */
export const assertResponseStructure = (response, expectedStructure) => {
  for (const [key, type] of Object.entries(expectedStructure)) {
    if (!(key in response)) {
      throw new Error(`Missing key in response: ${key}`);
    }
    
    if (type && typeof response[key] !== type) {
      throw new Error(`Invalid type for ${key}: expected ${type}, got ${typeof response[key]}`);
    }
  }
};

/**
 * Create test logger (silent in test mode)
 */
export const createTestLogger = () => {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {}
  };
};

// Export all utilities
export default {
  setupTestEnvironment,
  teardownTestEnvironment,
  createTestContext,
  waitForCondition,
  expectAsync,
  withMockedEnv,
  sleep,
  generateTestId,
  retry,
  measureTime,
  timeout,
  withTimeout,
  cleanTestEmail,
  cleanTestPhone,
  assertResponseStructure,
  createTestLogger
};
