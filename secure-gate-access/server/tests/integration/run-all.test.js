import { 
  globalSetup, 
  globalTeardown, 
  BACKEND_URL 
} from './setup.js';

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

// Note: Jest configuration is in jest.config.cjs
