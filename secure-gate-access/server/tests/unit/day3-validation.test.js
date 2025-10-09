/**
 * Day 3 Utilities Validation Test
 * Ensures all new utilities can be imported and basic functionality works
 */

import { describe, it, expect } from '@jest/globals';

describe('Day 3 Utilities Validation', () => {
  describe('Enhanced Fixtures', () => {
    it('should import users.enhanced.js', async () => {
      const usersEnhanced = await import('../fixtures/users.enhanced.js');
      expect(usersEnhanced).toBeDefined();
      expect(usersEnhanced.createBulkUsers).toBeInstanceOf(Function);
      expect(usersEnhanced.createUserWithVisitors).toBeInstanceOf(Function);
    });

    it('should import visitors.enhanced.js', async () => {
      const visitorsEnhanced = await import('../fixtures/visitors.enhanced.js');
      expect(visitorsEnhanced).toBeDefined();
      expect(visitorsEnhanced.createVisitorLifecycle).toBeInstanceOf(Function);
      expect(visitorsEnhanced.createRecurringVisitor).toBeInstanceOf(Function);
    });

    it('should import passes.enhanced.js', async () => {
      const passesEnhanced = await import('../fixtures/passes.enhanced.js');
      expect(passesEnhanced).toBeDefined();
      expect(passesEnhanced.createPassLifecycle).toBeInstanceOf(Function);
      expect(passesEnhanced.createMultiUsePass).toBeInstanceOf(Function);
    });

    it('should import relationships.js', async () => {
      const relationships = await import('../fixtures/relationships.js');
      expect(relationships).toBeDefined();
      expect(relationships.createResidentVisitorRelationship).toBeInstanceOf(Function);
    });
  });

  describe('Advanced Mock Data', () => {
    it('should import mockData.enhanced.js', async () => {
      const mockDataEnhanced = await import('../helpers/mockData.enhanced.js');
      expect(mockDataEnhanced).toBeDefined();
      expect(mockDataEnhanced.generateKenyanName).toBeInstanceOf(Function);
      expect(mockDataEnhanced.generateKenyanPhone).toBeInstanceOf(Function);
      expect(mockDataEnhanced.generateKenyanAddress).toBeInstanceOf(Function);
    });

    it('should generate valid Kenyan phone number', async () => {
      const { generateKenyanPhone } = await import('../helpers/mockData.enhanced.js');
      const phone = generateKenyanPhone();
      expect(phone).toMatch(/^\+254[17]\d{8}$/);
    });

    it('should import bulkDataGenerator.js', async () => {
      const bulkGenerator = await import('../helpers/bulkDataGenerator.js');
      expect(bulkGenerator).toBeDefined();
      expect(bulkGenerator.createBulkTestData).toBeInstanceOf(Function);
    });

    it('should import edgeCaseData.js', async () => {
      const edgeCaseData = await import('../helpers/edgeCaseData.js');
      expect(edgeCaseData).toBeDefined();
      expect(edgeCaseData.getInvalidEmailPatterns).toBeInstanceOf(Function);
      expect(edgeCaseData.getBoundaryStrings).toBeInstanceOf(Function);
    });

    it('should provide invalid email patterns', async () => {
      const { getInvalidEmailPatterns } = await import('../helpers/edgeCaseData.js');
      const patterns = getInvalidEmailPatterns();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });
  });

  describe('Specialized Helpers', () => {
    it('should import performanceHelpers.js', async () => {
      const perfHelpers = await import('../helpers/performanceHelpers.js');
      expect(perfHelpers).toBeDefined();
      expect(perfHelpers.measureResponseTime).toBeInstanceOf(Function);
      expect(perfHelpers.measureMemoryUsage).toBeInstanceOf(Function);
    });

    it('should measure response time', async () => {
      const { measureResponseTime } = await import('../helpers/performanceHelpers.js');
      const { duration, result } = await measureResponseTime(async () => {
        return 'test';
      });
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(result).toBe('test');
    });

    it('should import securityHelpers.js', async () => {
      const secHelpers = await import('../helpers/securityHelpers.js');
      expect(secHelpers).toBeDefined();
      expect(secHelpers.createTestToken).toBeInstanceOf(Function);
      expect(secHelpers.createExpiredToken).toBeInstanceOf(Function);
    });

    it('should create valid JWT token', async () => {
      const { createTestToken } = await import('../helpers/securityHelpers.js');
      const token = createTestToken({ userId: 1, role: 'admin' });
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should import validationHelpers.js', async () => {
      const valHelpers = await import('../helpers/validationHelpers.js');
      expect(valHelpers).toBeDefined();
      expect(valHelpers.deepEqual).toBeInstanceOf(Function);
      expect(valHelpers.assertSchema).toBeInstanceOf(Function);
    });

    it('should perform deep equality check', async () => {
      const { deepEqual } = await import('../helpers/validationHelpers.js');
      const obj1 = { name: 'test', nested: { value: 1 } };
      const obj2 = { name: 'test', nested: { value: 1 } };
      expect(deepEqual(obj1, obj2)).toBe(true);
    });

    it('should import errorHelpers.js', async () => {
      const errHelpers = await import('../helpers/errorHelpers.js');
      expect(errHelpers).toBeDefined();
      expect(errHelpers.hasErrorStructure).toBeInstanceOf(Function);
      expect(errHelpers.ERROR_TYPES).toBeDefined();
    });

    it('should validate error structure', async () => {
      const { hasErrorStructure, ERROR_TYPES } = await import('../helpers/errorHelpers.js');
      const error = { message: 'Test error', status: 400 };
      expect(hasErrorStructure(error)).toBe(true);
      expect(ERROR_TYPES.VALIDATION).toBe('ValidationError');
    });
  });

  describe('Integration Test', () => {
    it('should create user with enhanced fixture and validate', async () => {
      const { createTestUser } = await import('../fixtures/users.enhanced.js');
      const { deepEqual } = await import('../helpers/validationHelpers.js');
      
      const user1 = createTestUser({ role: 'admin' });
      const user2 = createTestUser({ role: 'admin' });
      
      expect(user1).toHaveProperty('email');
      expect(user1).toHaveProperty('role', 'admin');
      expect(deepEqual(user1.role, user2.role)).toBe(true);
    });

    it('should generate bulk data and measure performance', async () => {
      const { createBulkTestData } = await import('../helpers/bulkDataGenerator.js');
      const { measureResponseTime } = await import('../helpers/performanceHelpers.js');
      
      const { duration, result } = await measureResponseTime(async () => {
        return await createBulkTestData('users', 10);
      });
      
      expect(result).toBeDefined();
      expect(result.count).toBe(10);
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should test security with enhanced utilities', async () => {
      const { createTestToken, createExpiredToken } = await import('../helpers/securityHelpers.js');
      const { hasErrorStructure } = await import('../helpers/errorHelpers.js');
      
      const validToken = createTestToken({ userId: 1 });
      const expiredToken = createExpiredToken({ userId: 1 });
      
      expect(validToken).toBeDefined();
      expect(expiredToken).toBeDefined();
      expect(validToken).not.toBe(expiredToken);
      
      // Simulate error response
      const error = { message: 'Token expired', status: 401 };
      expect(hasErrorStructure(error)).toBe(true);
    });
  });

  describe('Documentation Validation', () => {
    it('should have TESTING_GUIDE.md file', async () => {
      const fs = await import('fs/promises');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const guidePath = path.join(__dirname, 'TESTING_GUIDE.md');
      
      const exists = await fs.access(guidePath)
        .then(() => true)
        .catch(() => false);
      
      expect(exists).toBe(true);
    });
  });
});

describe('Export Verification', () => {
  it('should export all utilities from helpers/index.js', async () => {
    const helpers = await import('../helpers/index.js');
    
    // Basic helpers
    expect(helpers.createTestDB).toBeInstanceOf(Function);
    expect(helpers.makeAuthRequest).toBeInstanceOf(Function);
    
    // Enhanced mock data
    expect(helpers.generateKenyanName).toBeInstanceOf(Function);
    expect(helpers.generateKenyanPhone).toBeInstanceOf(Function);
    
    // Specialized helpers
    expect(helpers.measureResponseTime).toBeInstanceOf(Function);
    expect(helpers.createTestToken).toBeInstanceOf(Function);
    expect(helpers.deepEqual).toBeInstanceOf(Function);
    expect(helpers.hasErrorStructure).toBeInstanceOf(Function);
  });

  it('should export all fixtures from fixtures/index.js', async () => {
    const fixtures = await import('../fixtures/index.js');
    
    // Basic fixtures
    expect(fixtures.testUsers).toBeDefined();
    expect(fixtures.testVisitors).toBeDefined();
    expect(fixtures.testPasses).toBeDefined();
    
    // Enhanced fixtures
    expect(fixtures.createBulkUsers).toBeInstanceOf(Function);
    expect(fixtures.createVisitorLifecycle).toBeInstanceOf(Function);
    expect(fixtures.createPassLifecycle).toBeInstanceOf(Function);
  });
});

/**
 * This validation test ensures:
 * 1. All Day 3 utilities can be imported without errors
 * 2. Basic functionality of each utility works correctly
 * 3. Integration between utilities works as expected
 * 4. Documentation files are present
 * 5. Exports are properly configured
 * 
 * If all tests pass, Day 3 implementation is validated! ✅
 */
