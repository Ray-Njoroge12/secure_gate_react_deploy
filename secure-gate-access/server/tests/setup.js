/**
 * Global Test Setup
 * Runs before all tests to configure the test environment
 * 
 * This file is automatically loaded by Jest via setupFilesAfterEnv
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME || 'secure_gate_test';

// Note: jest.setTimeout is called automatically by Jest config testTimeout
// No need to call jest.setTimeout here

// Configure global test utilities
global.testUtils = {
  /**
   * Delay execution for testing async operations
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate a random test ID
   * @returns {string}
   */
  randomId: () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

  /**
   * Get current timestamp for tests
   * @returns {Date}
   */
  now: () => new Date(),
};

// Suppress console output during tests (optional - uncomment to enable)
// const originalConsole = global.console;
// global.console = {
//   ...originalConsole,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: originalConsole.warn,
//   error: originalConsole.error,
// };

// Global test hooks
// Note: beforeAll/afterAll are available in test files via Jest globals

// Export for use in tests (using ES modules)
export const testUtils = global.testUtils;
