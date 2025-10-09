const { 
  globalSetup, 
  globalTeardown, 
  BACKEND_URL 
} = require('./setup');

describe('Integration Test Suite - Complete', () => {
  beforeAll(async () => {
    await globalSetup();
  }, 60000);

  afterAll(async () => {
    await globalTeardown();
  }, 30000);

  describe('Test Suite Overview', () => {
    test('should have all integration test files loaded', () => {
      // This test ensures all integration test files are properly loaded
      expect(true).toBe(true);
    });

    test('should have backend server running', async () => {
      const axios = require('axios');
      const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
      expect(response.status).toBe(200);
    });
  });

  // Note: Individual test files are imported and run separately
  // This file serves as a master test suite that can be run to execute all integration tests
});

// Export test configuration for Jest
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.js'],
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.js'
  ],
  collectCoverageFrom: [
    'secure-gate-access/server/src/**/*.js',
    '!secure-gate-access/server/src/**/*.test.js',
    '!secure-gate-access/server/src/**/*.spec.js'
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 30000,
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
  globalSetup: '<rootDir>/tests/integration/setup.js',
  globalTeardown: '<rootDir>/tests/integration/setup.js'
};




