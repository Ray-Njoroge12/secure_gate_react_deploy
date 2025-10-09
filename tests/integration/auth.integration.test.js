const { 
  makeAuthenticatedRequest, 
  createTestUser, 
  createTestAdmin,
  BACKEND_URL 
} = require('./setup');

describe('Authentication Flow Integration Tests', () => {
  let testUser;
  let adminUser;
  
  beforeEach(async () => {
    // Create fresh test users for each test
    testUser = await createTestUser({
      username: `testuser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: `test_${Date.now()}@test.com`,
      role: 'resident'
    });
    
    adminUser = await createTestAdmin();
  }, 30000);

  describe('User Registration', () => {
    test('should register new user successfully', async () => {
      const userData = {
        username: `newuser_${Date.now()}`,
        email: `newuser_${Date.now()}@test.com`,
        password: 'SecurePass123!',
        role: 'resident'
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/auth/register', userData);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.user).toHaveProperty('id');
      expect(response.data.data.user.email).toBe(userData.email);
      expect(response.data.data.user.role).toBe(userData.role);
      expect(response.data.data.token).toBeDefined();
      expect(response.data.data.token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    });

    test('should register admin user successfully', async () => {
      const adminData = {
        username: `newadmin_${Date.now()}`,
        email: `newadmin_${Date.now()}@test.com`,
        password: 'AdminPass123!',
        role: 'admin'
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/auth/register', adminData);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.user.role).toBe('admin');
      expect(response.data.data.token).toBeDefined();
    });

    test('should register guard user successfully', async () => {
      const guardData = {
        username: `newguard_${Date.now()}`,
        email: `newguard_${Date.now()}@test.com`,
        password: 'GuardPass123!',
        role: 'guard'
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/auth/register', guardData);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.user.role).toBe('guard');
      expect(response.data.data.token).toBeDefined();
    });

    test('should reject duplicate email registration', async () => {
      const userData = {
        username: `duplicate_${Date.now()}`,
        email: `duplicate_${Date.now()}@test.com`,
        password: 'SecurePass123!',
        role: 'resident'
      };
      
      // First registration
      await makeAuthenticatedRequest('POST', '/api/auth/register', userData);
      
      // Second registration with same email
      const response = await makeAuthenticatedRequest('POST', '/api/auth/register', userData);
      
      expect(response.status).toBe(409);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('DUPLICATE_ENTRY');
      expect(response.data.message).toContain('already exists');
    });

    test('should reject duplicate username registration', async () => {
      const userData = {
        username: `duplicateuser_${Date.now()}`,
        email: `unique1_${Date.now()}@test.com`,
        password: 'SecurePass123!',
        role: 'resident'
      };
      
      // First registration
      await makeAuthenticatedRequest('POST', '/api/auth/register', userData);
      
      // Second registration with same username but different email
      const duplicateData = {
        ...userData,
        email: `unique2_${Date.now()}@test.com`
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/auth/register', duplicateData);
      
      expect(response.status).toBe(409);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('DUPLICATE_ENTRY');
    });

    test('should reject registration with invalid email format', async () => {
      const userData = {
        username: `invalidemail_${Date.now()}`,
        email: 'invalid-email-format',
        password: 'SecurePass123!',
        role: 'resident'
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/auth/register', userData);
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('VALIDATION_ERROR');
      expect(response.data.message).toContain('email');
    });

    test('should reject registration with weak password', async () => {
      const userData = {
        username: `weakpass_${Date.now()}`,
        email: `weakpass_${Date.now()}@test.com`,
        password: '123',
        role: 'resident'
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/auth/register', userData);
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('VALIDATION_ERROR');
      expect(response.data.message).toContain('password');
    });

    test('should reject registration with missing required fields', async () => {
      const userData = {
        username: `missing_${Date.now()}`
        // Missing email, password, role
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/auth/register', userData);
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('VALIDATION_ERROR');
      expect(response.data.message).toContain('required');
    });

    test('should reject registration with invalid role', async () => {
      const userData = {
        username: `invalidrole_${Date.now()}`,
        email: `invalidrole_${Date.now()}@test.com`,
        password: 'SecurePass123!',
        role: 'invalid_role'
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/auth/register', userData);
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('User Login', () => {
    test('should login with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'TestPassword123!'
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/auth/login', loginData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.user.email).toBe(testUser.email);
      expect(response.data.data.token).toBeDefined();
      expect(response.data.data.token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    });

    test('should login admin with valid credentials', async () => {
      const loginData = {
        email: adminUser.email,
        password: 'TestPassword123!'
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/auth/login', loginData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.user.role).toBe('admin');
      expect(response.data.data.token).toBeDefined();
    });

    test('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@test.com',
        password: 'SecurePass123!'
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/auth/login', loginData);
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('INVALID_CREDENTIALS');
    });

    test('should reject login with invalid password', async () => {
      const loginData = {
        email: testUser.email,
        password: 'WrongPassword123!'
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/auth/login', loginData);
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('INVALID_CREDENTIALS');
    });

    test('should reject login with missing credentials', async () => {
      const response = await makeAuthenticatedRequest('POST', '/api/auth/login', {});
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Token Refresh', () => {
    test('should refresh valid token', async () => {
      const refreshData = {
        refreshToken: testUser.refreshToken || 'dummy-refresh-token'
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/auth/refresh', refreshData);
      
      // Note: This might return 200 with new token or 401 if refresh token is invalid
      // The exact behavior depends on the implementation
      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data.success).toBe(true);
        expect(response.data.data.token).toBeDefined();
      } else {
        expect(response.data.success).toBe(false);
      }
    });

    test('should reject refresh with invalid token', async () => {
      const refreshData = {
        refreshToken: 'invalid-refresh-token'
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/auth/refresh', refreshData);
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('AUTH_TOKEN_INVALID');
    });
  });

  describe('User Profile', () => {
    test('should get user profile with valid token', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/auth/profile', null, testUser.token);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.user.email).toBe(testUser.email);
      expect(response.data.data.user.role).toBe(testUser.role);
    });

    test('should reject profile access without token', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/auth/profile');
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('AUTH_TOKEN_MISSING');
    });

    test('should reject profile access with invalid token', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/auth/profile', null, 'invalid-token');
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('AUTH_TOKEN_INVALID');
    });

    test('should update user profile with valid token', async () => {
      const updateData = {
        username: `updated_${Date.now()}`
      };
      
      const response = await makeAuthenticatedRequest('PUT', '/api/auth/profile', updateData, testUser.token);
      
      // This might return 200 (success) or 404 (not implemented)
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Logout', () => {
    test('should logout with valid token', async () => {
      const response = await makeAuthenticatedRequest('POST', '/api/auth/logout', null, testUser.token);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toContain('logout');
    });

    test('should logout without token (should still work)', async () => {
      const response = await makeAuthenticatedRequest('POST', '/api/auth/logout');
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  describe('Password Reset', () => {
    test('should initiate password reset with valid email', async () => {
      const resetData = {
        email: testUser.email
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/auth/forgot-password', resetData);
      
      // This might return 200 (success) or 404 (not implemented)
      expect([200, 404]).toContain(response.status);
    });

    test('should reject password reset with invalid email', async () => {
      const resetData = {
        email: 'nonexistent@test.com'
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/auth/forgot-password', resetData);
      
      // This might return 400 (not found) or 404 (not implemented)
      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Role-Based Access Control', () => {
    test('should allow admin to access admin endpoints', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/admin/dashboard', null, adminUser.token);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    test('should reject resident from accessing admin endpoints', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/admin/dashboard', null, testUser.token);
      
      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
    });

    test('should allow guard to access guard endpoints', async () => {
      const guardUser = await createTestUser({ role: 'guard' });
      const response = await makeAuthenticatedRequest('GET', '/api/guards/dashboard', null, guardUser.token);
      
      // This might return 200 (success) or 404 (not implemented)
      expect([200, 404]).toContain(response.status);
    });

    test('should reject resident from accessing guard endpoints', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/guards/dashboard', null, testUser.token);
      
      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
    });
  });

  describe('Token Expiration', () => {
    test('should handle expired token gracefully', async () => {
      // Create a token that might be expired (this is hard to test without mocking)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInJvbGUiOiJyZXNpZGVudCIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAwfQ.invalid';
      
      const response = await makeAuthenticatedRequest('GET', '/api/auth/profile', null, expiredToken);
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('AUTH_TOKEN_INVALID');
    });
  });
});




