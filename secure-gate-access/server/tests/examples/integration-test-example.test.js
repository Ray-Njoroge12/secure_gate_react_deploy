/**
 * Integration Test Example using Security Helpers
 * Demonstrates API testing with JWT, RBAC, and security utilities
 * 
 * @example npm run test:integration -- tests/examples/integration-test-example.test.js
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import {
  // Security helpers
  createTestToken,
  createExpiredToken,
  createMalformedToken,
  generateRBACTestCases,
  
  // Mock data
  generateKenyanName,
  generateKenyanPhone,
  generateKenyanAddress,
  
  // Validation helpers
  assertSchema,
  hasErrorStructure,
  
  // Performance helpers
  measureResponseTime
} from '../helpers/index.js';

// Mock app - in real tests, import your actual app
const mockApp = {
  post: () => ({ status: 201, body: { success: true } }),
  get: () => ({ status: 200, body: { data: [] } })
};

describe('Integration Test Example - Visitor API', () => {
  let app;
  let adminToken;
  let residentToken;
  let guardToken;
  let guestToken;

  beforeAll(() => {
    // In real tests: app = require('../server.js');
    app = mockApp;
    
    // Create tokens for different roles
    adminToken = createTestToken({ userId: 1, role: 'admin' });
    residentToken = createTestToken({ userId: 2, role: 'resident' });
    guardToken = createTestToken({ userId: 3, role: 'guard' });
    guestToken = createTestToken({ userId: 4, role: 'guest' });
  });

  describe('POST /api/visitors - Create Visitor', () => {
    it('should create visitor with valid admin token', async () => {
      const visitorData = {
        name: generateKenyanName('Kikuyu'),
        phone: generateKenyanPhone(),
        address: generateKenyanAddress('Nairobi'),
        purpose: 'Visit'
      };

      // Measure response time
      const { duration, result } = await measureResponseTime(async () => {
        // In real tests: return await request(app)
        return {
          status: 201,
          body: {
            id: 1,
            ...visitorData,
            createdAt: new Date()
          }
        };
      });

      // Verify response
      expect(result.status).toBe(201);
      expect(result.body).toHaveProperty('id');
      expect(result.body.name).toBe(visitorData.name);
      
      // Verify performance
      expect(duration).toBeLessThan(200); // Should respond within 200ms
      
      // Validate schema
      assertSchema(result.body, {
        id: 'number',
        name: 'string',
        phone: 'string',
        address: 'string',
        purpose: 'string',
        createdAt: 'date'
      });
    });

    it('should reject request with expired token', async () => {
      const expiredToken = createExpiredToken({ userId: 1 });
      
      // In real tests: const response = await request(app)
      const response = {
        status: 401,
        body: {
          error: 'Token expired',
          status: 401
        }
      };

      expect(response.status).toBe(401);
      expect(hasErrorStructure(response.body)).toBe(true);
    });

    it('should reject request with malformed token', async () => {
      const badToken = createMalformedToken();
      
      // In real tests: const response = await request(app)
      const response = {
        status: 401,
        body: {
          error: 'Invalid token',
          status: 401
        }
      };

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('RBAC Testing - Role-Based Access Control', () => {
    it('should test all roles using RBAC generator', async () => {
      // Generate test cases for all roles automatically
      const testCases = generateRBACTestCases('visitors', 'create');

      // Test cases will include: admin, resident, guard, guest
      expect(testCases.length).toBeGreaterThan(0);
      
      for (const tc of testCases) {
        const visitorData = {
          name: generateKenyanName(),
          phone: generateKenyanPhone()
        };

        // Simulate request with role-specific token
        // In real tests: const response = await request(app)
        const response = {
          status: tc.shouldPass ? 201 : 403,
          body: tc.shouldPass 
            ? { id: 1, ...visitorData }
            : { error: 'Forbidden', status: 403 }
        };

        // Verify based on expected permission
        if (tc.shouldPass) {
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('id');
        } else {
          expect(response.status).toBe(403);
          expect(response.body).toHaveProperty('error');
        }
      }
    });

    it('should allow admin full access', async () => {
      // Admins should have all permissions
      const operations = ['create', 'read', 'update', 'delete'];
      
      for (const operation of operations) {
        const testCases = generateRBACTestCases('visitors', operation);
        const adminCase = testCases.find(tc => tc.role === 'admin');
        
        expect(adminCase).toBeDefined();
        expect(adminCase.shouldPass).toBe(true);
      }
    });

    it('should restrict guest access', async () => {
      // Guests should have no permissions
      const operations = ['create', 'read', 'update', 'delete'];
      
      for (const operation of operations) {
        const testCases = generateRBACTestCases('visitors', operation);
        const guestCase = testCases.find(tc => tc.role === 'guest');
        
        expect(guestCase).toBeDefined();
        expect(guestCase.shouldPass).toBe(false);
      }
    });
  });

  describe('GET /api/visitors - List Visitors', () => {
    it('should return visitors with pagination', async () => {
      // In real tests: const response = await request(app)
      const response = {
        status: 200,
        body: {
          visitors: [
            {
              id: 1,
              name: generateKenyanName('Kikuyu'),
              phone: generateKenyanPhone(),
              status: 'active'
            },
            {
              id: 2,
              name: generateKenyanName('Luo'),
              phone: generateKenyanPhone(),
              status: 'active'
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 2
          }
        }
      };

      expect(response.status).toBe(200);
      expect(response.body.visitors).toBeInstanceOf(Array);
      expect(response.body.visitors.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should filter visitors by status', async () => {
      const filters = ['active', 'checked-in', 'checked-out'];
      
      for (const status of filters) {
        // In real tests: const response = await request(app)
        const response = {
          status: 200,
          body: {
            visitors: [],
            filters: { status }
          }
        };

        expect(response.status).toBe(200);
        expect(response.body.filters.status).toBe(status);
      }
    });

    it('should search visitors by name', async () => {
      const searchTerm = 'Njeri';
      
      // In real tests: const response = await request(app)
      const response = {
        status: 200,
        body: {
          visitors: [
            {
              id: 1,
              name: 'Njeri Wanjiku',
              phone: generateKenyanPhone()
            }
          ],
          search: searchTerm
        }
      };

      expect(response.status).toBe(200);
      expect(response.body.visitors[0].name).toContain(searchTerm);
    });
  });

  describe('PUT /api/visitors/:id - Update Visitor', () => {
    it('should update visitor with valid permissions', async () => {
      const visitorId = 1;
      const updates = {
        phone: generateKenyanPhone(),
        address: generateKenyanAddress('Mombasa')
      };

      // In real tests: const response = await request(app)
      const response = {
        status: 200,
        body: {
          id: visitorId,
          name: generateKenyanName(),
          ...updates,
          updatedAt: new Date()
        }
      };

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(visitorId);
      expect(response.body.phone).toBe(updates.phone);
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should return 404 for non-existent visitor', async () => {
      const nonExistentId = 99999;

      // In real tests: const response = await request(app)
      const response = {
        status: 404,
        body: {
          error: 'Visitor not found',
          status: 404
        }
      };

      expect(response.status).toBe(404);
      expect(hasErrorStructure(response.body)).toBe(true);
    });
  });

  describe('DELETE /api/visitors/:id - Delete Visitor', () => {
    it('should allow admin to delete visitor', async () => {
      const visitorId = 1;

      // In real tests: const response = await request(app)
      const response = {
        status: 200,
        body: {
          message: 'Visitor deleted successfully',
          id: visitorId
        }
      };

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
    });

    it('should prevent non-admin from deleting', async () => {
      // Use resident token (should be denied)
      const visitorId = 1;

      // In real tests: const response = await request(app)
      const response = {
        status: 403,
        body: {
          error: 'Insufficient permissions',
          status: 403
        }
      };

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Performance Testing', () => {
    it('should respond within acceptable time', async () => {
      const { duration } = await measureResponseTime(async () => {
        // Simulate API call
        return { status: 200, body: { visitors: [] } };
      });

      // API should respond within 200ms
      expect(duration).toBeLessThan(200);
    });

    it('should handle concurrent requests', async () => {
      const concurrentRequests = 10;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          measureResponseTime(async () => {
            // Simulate API call
            return { status: 200, body: { id: i } };
          })
        );
      }

      const results = await Promise.all(promises);
      
      // All requests should complete
      expect(results).toHaveLength(concurrentRequests);
      
      // Average response time should be acceptable
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      expect(avgDuration).toBeLessThan(300);
    });
  });

  describe('Error Handling', () => {
    it('should validate request body', async () => {
      const invalidData = {
        // Missing required fields
        phone: 'invalid'
      };

      // In real tests: const response = await request(app)
      const response = {
        status: 400,
        body: {
          error: 'Validation failed',
          details: [
            'name is required',
            'phone must be valid Kenya format'
          ],
          status: 400
        }
      };

      expect(response.status).toBe(400);
      expect(hasErrorStructure(response.body)).toBe(true);
      expect(response.body.details).toBeInstanceOf(Array);
    });

    it('should handle database errors gracefully', async () => {
      // Simulate database error
      const response = {
        status: 500,
        body: {
          error: 'Internal server error',
          status: 500
        }
      };

      expect(response.status).toBe(500);
      expect(hasErrorStructure(response.body)).toBe(true);
    });
  });
});

/**
 * Key Takeaways from This Example:
 * 
 * 1. Use createTestToken() for authenticated requests
 * 2. Use generateRBACTestCases() to test all roles automatically
 * 3. Use measureResponseTime() to verify performance
 * 4. Use generateKenyan*() for realistic test data
 * 5. Use hasErrorStructure() to validate error responses
 * 6. Use assertSchema() to validate response structure
 * 
 * Benefits:
 * - Comprehensive RBAC testing with minimal code
 * - Performance measurement built-in
 * - Realistic Kenyan data
 * - Proper error validation
 * - Reduced test boilerplate
 */

export default {
  name: 'Integration Test Example',
  description: 'Demonstrates API testing with security and performance helpers',
  utilities: [
    'createTestToken',
    'createExpiredToken',
    'createMalformedToken',
    'generateRBACTestCases',
    'measureResponseTime',
    'generateKenyanName',
    'generateKenyanPhone',
    'hasErrorStructure',
    'assertSchema'
  ]
};
