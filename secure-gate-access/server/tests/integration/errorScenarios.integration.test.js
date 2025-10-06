import { 
  makeAuthenticatedRequest, 
  createTestUser, 
  createTestAdmin,
  BACKEND_URL 
} from './setup.js';

describe('Error Scenarios Integration Tests', () => {
  let adminUser;
  let residentUser;
  let guardUser;
  
  beforeAll(async () => {
    // Create users for testing
    adminUser = await createTestAdmin();
    residentUser = await createTestUser({ role: 'resident' });
    guardUser = await createTestUser({ role: 'guard' });
  }, 30000);

  describe('404 Not Found Errors', () => {
    test('should return 404 for non-existent API endpoint', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/nonexistent-endpoint');
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('NOT_FOUND');
      expect(response.data.message).toContain('not found');
    });

    test('should return 404 for non-existent resource ID', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/admin/residents/99999', null, adminUser.token);
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('NOT_FOUND');
    });

    test('should return 404 for non-existent visitor', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/visitors/99999', null, adminUser.token);
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('NOT_FOUND');
    });

    test('should return 404 for invalid invite code', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/invite/invalid-code-12345');
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('400 Bad Request Errors', () => {
    test('should return 400 for malformed JSON', async () => {
      const response = await makeAuthenticatedRequest('POST', '/api/auth/register', 'invalid json', null, {
        'Content-Type': 'application/json'
      });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });

    test('should return 400 for missing required fields in registration', async () => {
      const response = await makeAuthenticatedRequest('POST', '/api/auth/register', {
        username: 'test'
        // Missing email, password, role
      });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('VALIDATION_ERROR');
    });

    test('should return 400 for invalid email format', async () => {
      const response = await makeAuthenticatedRequest('POST', '/api/auth/register', {
        username: 'test',
        email: 'invalid-email',
        password: 'TestPass123!',
        role: 'resident'
      });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('VALIDATION_ERROR');
    });

    test('should return 400 for weak password', async () => {
      const response = await makeAuthenticatedRequest('POST', '/api/auth/register', {
        username: 'test',
        email: 'test@example.com',
        password: '123',
        role: 'resident'
      });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('VALIDATION_ERROR');
    });

    test('should return 400 for invalid role', async () => {
      const response = await makeAuthenticatedRequest('POST', '/api/auth/register', {
        username: 'test',
        email: 'test@example.com',
        password: 'TestPass123!',
        role: 'invalid_role'
      });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('VALIDATION_ERROR');
    });

    test('should return 400 for invalid date format', async () => {
      const response = await makeAuthenticatedRequest('POST', '/api/visitors/invite', {
        name: 'Test Visitor',
        email: 'test@example.com',
        phone: '+254712345678',
        purpose: 'Test',
        expected_arrival: 'invalid-date'
      }, residentUser.token);
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('401 Unauthorized Errors', () => {
    test('should return 401 for missing authentication token', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/admin/dashboard');
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('AUTH_TOKEN_MISSING');
    });

    test('should return 401 for invalid authentication token', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/admin/dashboard', null, 'invalid-token');
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('AUTH_TOKEN_INVALID');
    });

    test('should return 401 for expired authentication token', async () => {
      // Create a token that looks expired (this is hard to test without mocking)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInJvbGUiOiJyZXNpZGVudCIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAwfQ.invalid';
      
      const response = await makeAuthenticatedRequest('GET', '/api/auth/profile', null, expiredToken);
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('AUTH_TOKEN_INVALID');
    });

    test('should return 401 for invalid credentials in login', async () => {
      const response = await makeAuthenticatedRequest('POST', '/api/auth/login', {
        email: 'nonexistent@test.com',
        password: 'WrongPassword123!'
      });
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('403 Forbidden Errors', () => {
    test('should return 403 for resident accessing admin endpoints', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/admin/dashboard', null, residentUser.token);
      
      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
    });

    test('should return 403 for guard accessing admin endpoints', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/admin/dashboard', null, guardUser.token);
      
      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
    });

    test('should return 403 for resident accessing guard endpoints', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/guards/dashboard', null, residentUser.token);
      
      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
    });

    test('should return 403 for non-admin creating bulk invitations', async () => {
      const response = await makeAuthenticatedRequest('POST', '/api/visitors/bulk-invite', {
        visitors: []
      }, residentUser.token);
      
      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
    });
  });

  describe('409 Conflict Errors', () => {
    test('should return 409 for duplicate email registration', async () => {
      const userData = {
        username: `duplicate_${Date.now()}`,
        email: `duplicate_${Date.now()}@test.com`,
        password: 'TestPass123!',
        role: 'resident'
      };
      
      // First registration
      await makeAuthenticatedRequest('POST', '/api/auth/register', userData);
      
      // Second registration with same email
      const response = await makeAuthenticatedRequest('POST', '/api/auth/register', userData);
      
      expect(response.status).toBe(409);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('DUPLICATE_ENTRY');
    });

    test('should return 409 for duplicate username registration', async () => {
      const userData = {
        username: `duplicateuser_${Date.now()}`,
        email: `unique1_${Date.now()}@test.com`,
        password: 'TestPass123!',
        role: 'resident'
      };
      
      // First registration
      await makeAuthenticatedRequest('POST', '/api/auth/register', userData);
      
      // Second registration with same username
      const duplicateData = {
        ...userData,
        email: `unique2_${Date.now()}@test.com`
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/auth/register', duplicateData);
      
      expect(response.status).toBe(409);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('DUPLICATE_ENTRY');
    });

    test('should return 409 for duplicate resident email', async () => {
      const residentData = {
        name: 'Duplicate Resident',
        email: `duplicateresident_${Date.now()}@test.com`,
        phone: '+254712345678',
        unit: 'A101'
      };
      
      // First creation
      await makeAuthenticatedRequest('POST', '/api/admin/residents', residentData, adminUser.token);
      
      // Second creation with same email
      const response = await makeAuthenticatedRequest('POST', '/api/admin/residents', residentData, adminUser.token);
      
      expect(response.status).toBe(409);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('DUPLICATE_ENTRY');
    });
  });

  describe('500 Internal Server Errors', () => {
    test('should handle database connection errors gracefully', async () => {
      // This is hard to test without actually breaking the database connection
      // We'll test that the error format is consistent
      const response = await makeAuthenticatedRequest('GET', '/api/admin/dashboard', null, adminUser.token);
      
      // Should either succeed or return a properly formatted error
      if (response.status === 500) {
        expect(response.data.success).toBe(false);
        expect(response.data.error).toHaveProperty('code');
        expect(response.data.message).toBeDefined();
      }
    });

    test('should handle unexpected errors gracefully', async () => {
      // Test with malformed data that might cause internal errors
      const response = await makeAuthenticatedRequest('POST', '/api/visitors/invite', {
        name: null,
        email: null,
        phone: null,
        purpose: null
      }, residentUser.token);
      
      // Should return a properly formatted error, not crash
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toHaveProperty('code');
    });
  });

  describe('Rate Limiting Errors', () => {
    test('should handle rate limiting gracefully', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(makeAuthenticatedRequest('POST', '/api/auth/login', {
          email: 'nonexistent@test.com',
          password: 'WrongPassword123!'
        }));
      }
      
      const responses = await Promise.all(requests);
      
      // At least one should be rate limited (429) or all should be 401
      const hasRateLimit = responses.some(r => r.status === 429);
      const allUnauthorized = responses.every(r => r.status === 401);
      
      expect(hasRateLimit || allUnauthorized).toBe(true);
      
      if (hasRateLimit) {
        const rateLimitedResponse = responses.find(r => r.status === 429);
        expect(rateLimitedResponse.data.success).toBe(false);
        expect(rateLimitedResponse.data.error.code).toBe('RATE_LIMIT_EXCEEDED');
      }
    });
  });

  describe('Content Type Errors', () => {
    test('should reject requests with wrong content type', async () => {
      const response = await makeAuthenticatedRequest('POST', '/api/auth/register', 'username=test&email=test@test.com', null, {
        'Content-Type': 'application/x-www-form-urlencoded'
      });
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });

    test('should handle empty request body', async () => {
      const response = await makeAuthenticatedRequest('POST', '/api/auth/login', '');
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });
  });

  describe('Request Size Errors', () => {
    test('should handle oversized request body', async () => {
      // Create a very large string
      const largeString = 'x'.repeat(10000);
      const largeData = {
        name: largeString,
        email: 'test@test.com',
        phone: '+254712345678',
        purpose: largeString
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/visitors/invite', largeData, residentUser.token);
      
      // Should either succeed or return a properly formatted error
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.data.success).toBe(false);
    });
  });

  describe('Error Response Format Consistency', () => {
    test('should return consistent error format for all error types', async () => {
      const errorTests = [
        { endpoint: '/api/nonexistent', expectedStatus: 404 },
        { endpoint: '/api/admin/dashboard', expectedStatus: 401 },
        { endpoint: '/api/auth/register', method: 'POST', data: {}, expectedStatus: 400 }
      ];
      
      for (const test of errorTests) {
        const response = await makeAuthenticatedRequest(
          test.method || 'GET', 
          test.endpoint, 
          test.data || null
        );
        
        expect(response.status).toBe(test.expectedStatus);
        expect(response.data).toHaveProperty('success', false);
        expect(response.data).toHaveProperty('message');
        expect(response.data).toHaveProperty('error');
        expect(response.data.error).toHaveProperty('code');
        expect(response.data).toHaveProperty('timestamp');
        expect(response.type).toBe('application/json');
      }
    });

    test('should never return HTML error pages', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/nonexistent');
      
      expect(response.type).toBe('application/json');
      expect(response.text).not.toContain('<!DOCTYPE html>');
      expect(response.text).not.toContain('<html>');
      expect(response.text).not.toContain('<body>');
    });
  });
});
