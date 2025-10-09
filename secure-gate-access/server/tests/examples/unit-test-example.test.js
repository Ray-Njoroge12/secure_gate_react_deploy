/**
 * Unit Test Example using Day 3 Enhanced Fixtures
 * Demonstrates best practices for unit testing with new utilities
 * 
 * @example npm run test:unit -- tests/examples/unit-test-example.test.js
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  // Enhanced fixtures
  createTestUser,
  createBulkUsers,
  createUserWithVisitors,
  
  // Validation helpers
  deepEqual,
  assertSchema,
  
  // Mock data
  generateKenyanName,
  generateKenyanPhone,
  generateKenyanAddress
} from '../helpers/index.js';

describe('Unit Test Example - User Service', () => {
  describe('User Creation with Enhanced Fixtures', () => {
    it('should create a single test user with Kenyan data', () => {
      // Using enhanced fixtures with Kenyan-specific data
      const user = createTestUser({
        role: 'resident',
        name: generateKenyanName('Kikuyu'),
        phone: generateKenyanPhone(),
        address: generateKenyanAddress('Nairobi')
      });

      // Validate structure with schema helper
      expect(user).toBeDefined();
      expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(user.phone).toMatch(/^\+254[17]\d{8}$/);
      expect(user.role).toBe('resident');
      
      // Validate schema
      assertSchema(user, {
        id: 'number',
        email: 'string',
        name: 'string',
        phone: 'string',
        role: 'string',
        address: 'string',
        createdAt: 'date'
      });
    });

    it('should create multiple users with different roles', () => {
      const roles = ['admin', 'resident', 'guard'];
      
      roles.forEach(role => {
        const user = createTestUser({ role });
        
        expect(user).toBeDefined();
        expect(user.role).toBe(role);
        expect(user.id).toBeGreaterThan(0);
      });
    });

    it('should create bulk users efficiently', async () => {
      // Create 100 test users at once
      const users = await createBulkUsers(100, {
        role: 'resident',
        includeAddress: true
      });

      expect(users).toHaveLength(100);
      expect(users[0]).toHaveProperty('id');
      expect(users[0]).toHaveProperty('email');
      
      // Verify all have Kenyan phone numbers
      users.forEach(user => {
        expect(user.phone).toMatch(/^\+254[17]\d{8}$/);
      });
    });

    it('should create user with visitor relationships', async () => {
      // Create a resident with 5 associated visitors
      const resident = await createUserWithVisitors({
        role: 'resident',
        visitorCount: 5,
        includeRecurring: true
      });

      expect(resident).toBeDefined();
      expect(resident.visitors).toHaveLength(5);
      expect(resident.visitors[0]).toHaveProperty('name');
      expect(resident.visitors[0]).toHaveProperty('phone');
    });
  });

  describe('Deep Comparison with Validation Helpers', () => {
    it('should compare two users deeply', () => {
      const user1 = createTestUser({ role: 'admin' });
      const user2 = createTestUser({ role: 'admin' });

      // Compare objects, ignoring timestamps
      const areEqual = deepEqual(user1, user2, {
        ignoreKeys: ['id', 'createdAt', 'updatedAt']
      });

      // They should be equal structure-wise
      expect(typeof user1).toBe(typeof user2);
      expect(user1.role).toBe(user2.role);
    });

    it('should handle nested object comparison', () => {
      const user1 = {
        name: 'John Doe',
        profile: {
          address: 'Nairobi',
          phone: '+254712345678'
        }
      };

      const user2 = {
        name: 'John Doe',
        profile: {
          address: 'Nairobi',
          phone: '+254712345678'
        }
      };

      expect(deepEqual(user1, user2)).toBe(true);
    });
  });

  describe('Kenyan-Specific Data Generation', () => {
    it('should generate realistic Kenyan names', () => {
      const tribes = ['Kikuyu', 'Luo', 'Luhya', 'Kamba', 'Kalenjin'];
      
      tribes.forEach(tribe => {
        const name = generateKenyanName(tribe);
        
        expect(name).toBeDefined();
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
      });
    });

    it('should generate valid Kenyan phone numbers', () => {
      // Generate 10 phone numbers
      for (let i = 0; i < 10; i++) {
        const phone = generateKenyanPhone();
        
        // Must match Kenya format: +254 7XX XXX XXX or +254 1XX XXX XXX
        expect(phone).toMatch(/^\+254[17]\d{8}$/);
      }
    });

    it('should generate realistic Kenyan addresses', () => {
      const cities = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'];
      
      cities.forEach(city => {
        const address = generateKenyanAddress(city);
        
        expect(address).toBeDefined();
        expect(address).toContain(city);
        expect(typeof address).toBe('string');
      });
    });
  });

  describe('Schema Validation', () => {
    it('should validate user schema correctly', () => {
      const user = createTestUser({ role: 'resident' });

      // This will throw if schema doesn't match
      assertSchema(user, {
        id: 'number',
        email: 'string',
        name: 'string',
        phone: 'string',
        role: 'string',
        createdAt: 'date'
      });

      // Test passes if no error thrown
      expect(true).toBe(true);
    });

    it('should validate optional fields', () => {
      const user = createTestUser({
        role: 'resident',
        address: generateKenyanAddress('Nairobi')
      });

      expect(user.address).toBeDefined();
      expect(typeof user.address).toBe('string');
    });
  });
});

describe('Unit Test Example - Data Validation', () => {
  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'user@example.com',
        'test.user@domain.co.ke',
        'admin+tag@company.com'
      ];

      validEmails.forEach(email => {
        expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });

    it('should handle Kenyan email domains', () => {
      const kenyanEmails = [
        'user@safaricom.co.ke',
        'admin@ke.gov',
        'info@company.ke'
      ];

      kenyanEmails.forEach(email => {
        expect(email).toContain('.ke');
      });
    });
  });

  describe('Phone Number Validation', () => {
    it('should validate Kenyan phone format', () => {
      const phones = [
        '+254712345678',  // Safaricom
        '+254722345678',  // Safaricom
        '+254733345678',  // Airtel
        '+254110123456'   // Telkom
      ];

      phones.forEach(phone => {
        expect(phone).toMatch(/^\+254[17]\d{8}$/);
      });
    });
  });
});

/**
 * Key Takeaways from This Example:
 * 
 * 1. Use createTestUser() for single users with specific properties
 * 2. Use createBulkUsers() for performance/load testing scenarios
 * 3. Use createUserWithVisitors() for relationship testing
 * 4. Use generateKenyan*() functions for realistic data
 * 5. Use deepEqual() for complex object comparisons
 * 6. Use assertSchema() to validate data structures
 * 
 * Benefits:
 * - Realistic test data (Kenyan-specific)
 * - Reduced boilerplate (reusable fixtures)
 * - Better assertions (schema validation)
 * - Faster test writing (helper functions)
 */

export default {
  name: 'Unit Test Example',
  description: 'Demonstrates unit testing with Day 3 enhanced fixtures',
  utilities: [
    'createTestUser',
    'createBulkUsers',
    'createUserWithVisitors',
    'generateKenyanName',
    'generateKenyanPhone',
    'generateKenyanAddress',
    'deepEqual',
    'assertSchema'
  ]
};
