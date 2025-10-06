const { 
  makeAuthenticatedRequest, 
  createTestUser, 
  createTestAdmin,
  BACKEND_URL 
} = require('./setup');

describe('AdminService Integration Tests', () => {
  let adminToken;
  let adminUser;
  let testResident;
  let testGuard;
  
  beforeAll(async () => {
    // Create admin user
    adminUser = await createTestAdmin();
    adminToken = adminUser.token;
    
    // Create test resident
    testResident = await createTestUser({
      role: 'resident',
      username: `resident_${Date.now()}`,
      email: `resident_${Date.now()}@test.com`
    });
    
    // Create test guard
    testGuard = await createTestUser({
      role: 'guard',
      username: `guard_${Date.now()}`,
      email: `guard_${Date.now()}@test.com`
    });
  }, 30000);

  describe('Resident Management', () => {
    test('should get all residents (admin only)', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/admin/residents', null, adminToken);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeInstanceOf(Array);
      expect(response.data.message).toContain('residents');
    });

    test('should create new resident (admin only)', async () => {
      const residentData = {
        name: 'John Doe',
        email: `newresident_${Date.now()}@test.com`,
        phone: '+254712345678',
        unit: 'A101'
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/admin/residents', residentData, adminToken);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('id');
      expect(response.data.data.email).toBe(residentData.email);
    });

    test('should update resident (admin only)', async () => {
      // First create a resident
      const createResponse = await makeAuthenticatedRequest('POST', '/api/admin/residents', {
        name: 'Jane Doe',
        email: `updateresident_${Date.now()}@test.com`,
        phone: '+254712345679',
        unit: 'A102'
      }, adminToken);
      
      const residentId = createResponse.data.data.id;
      
      // Update the resident
      const updateData = {
        name: 'Jane Smith',
        phone: '+254712345680',
        unit: 'A103'
      };
      
      const response = await makeAuthenticatedRequest('PUT', `/api/admin/residents/${residentId}`, updateData, adminToken);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.name).toBe(updateData.name);
      expect(response.data.data.unit).toBe(updateData.unit);
    });

    test('should delete resident (admin only)', async () => {
      // First create a resident
      const createResponse = await makeAuthenticatedRequest('POST', '/api/admin/residents', {
        name: 'Delete Me',
        email: `deleteresident_${Date.now()}@test.com`,
        phone: '+254712345681',
        unit: 'A104'
      }, adminToken);
      
      const residentId = createResponse.data.data.id;
      
      // Delete the resident
      const response = await makeAuthenticatedRequest('DELETE', `/api/admin/residents/${residentId}`, null, adminToken);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.id).toBe(residentId);
    });

    test('should reject resident creation with duplicate email', async () => {
      const residentData = {
        name: 'Duplicate Email',
        email: `duplicate_${Date.now()}@test.com`,
        phone: '+254712345682',
        unit: 'A105'
      };
      
      // Create first resident
      await makeAuthenticatedRequest('POST', '/api/admin/residents', residentData, adminToken);
      
      // Try to create duplicate
      const response = await makeAuthenticatedRequest('POST', '/api/admin/residents', residentData, adminToken);
      
      expect(response.status).toBe(409);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('DUPLICATE_ENTRY');
    });

    test('should reject resident creation with missing required fields', async () => {
      const response = await makeAuthenticatedRequest('POST', '/api/admin/residents', {
        name: 'Missing Fields'
        // Missing email and unit
      }, adminToken);
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('VALIDATION_ERROR');
    });

    test('should reject resident operations without admin token', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/admin/residents');
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('AUTH_TOKEN_MISSING');
    });

    test('should reject resident operations with invalid token', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/admin/residents', null, 'invalid-token');
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('AUTH_TOKEN_INVALID');
    });

    test('should reject resident operations with non-admin token', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/admin/residents', null, testResident.token);
      
      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
    });
  });

  describe('Guard Management', () => {
    test('should get all guards (admin only)', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/admin/guards', null, adminToken);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeInstanceOf(Array);
    });

    test('should create new guard (admin only)', async () => {
      const guardData = {
        name: 'Guard Smith',
        email: `guard_${Date.now()}@test.com`,
        phone: '+254712345683',
        badge_number: `BG${Date.now()}`
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/admin/guards', guardData, adminToken);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('id');
      expect(response.data.data.email).toBe(guardData.email);
    });

    test('should update guard (admin only)', async () => {
      // First create a guard
      const createResponse = await makeAuthenticatedRequest('POST', '/api/admin/guards', {
        name: 'Update Guard',
        email: `updateguard_${Date.now()}@test.com`,
        phone: '+254712345684',
        badge_number: `BG${Date.now()}`
      }, adminToken);
      
      const guardId = createResponse.data.data.id;
      
      // Update the guard
      const updateData = {
        name: 'Updated Guard',
        phone: '+254712345685'
      };
      
      const response = await makeAuthenticatedRequest('PUT', `/api/admin/guards/${guardId}`, updateData, adminToken);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.name).toBe(updateData.name);
    });

    test('should delete guard (admin only)', async () => {
      // First create a guard
      const createResponse = await makeAuthenticatedRequest('POST', '/api/admin/guards', {
        name: 'Delete Guard',
        email: `deleteguard_${Date.now()}@test.com`,
        phone: '+254712345686',
        badge_number: `BG${Date.now()}`
      }, adminToken);
      
      const guardId = createResponse.data.data.id;
      
      // Delete the guard
      const response = await makeAuthenticatedRequest('DELETE', `/api/admin/guards/${guardId}`, null, adminToken);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.id).toBe(guardId);
    });
  });

  describe('Dashboard and Metrics', () => {
    test('should get admin dashboard data', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/admin/dashboard', null, adminToken);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('totalResidents');
      expect(response.data.data).toHaveProperty('totalGuards');
      expect(response.data.data).toHaveProperty('totalVisitors');
    });

    test('should get system metrics', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/admin/metrics', null, adminToken);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('system');
      expect(response.data.data).toHaveProperty('database');
    });

    test('should get audit logs', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/admin/audit-logs', null, adminToken);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeInstanceOf(Array);
    });

    test('should get visitor reports', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/admin/visitor-reports', null, adminToken);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeInstanceOf(Array);
    });
  });

  describe('Bulk Operations', () => {
    test('should handle bulk resident import', async () => {
      const bulkData = {
        residents: [
          {
            name: 'Bulk Resident 1',
            email: `bulk1_${Date.now()}@test.com`,
            phone: '+254712345687',
            unit: 'B101'
          },
          {
            name: 'Bulk Resident 2',
            email: `bulk2_${Date.now()}@test.com`,
            phone: '+254712345688',
            unit: 'B102'
          }
        ]
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/admin/residents/bulk', bulkData, adminToken);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('created');
      expect(response.data.data.created).toBe(2);
    });

    test('should handle bulk guard import', async () => {
      const bulkData = {
        guards: [
          {
            name: 'Bulk Guard 1',
            email: `bulkguard1_${Date.now()}@test.com`,
            phone: '+254712345689',
            badge_number: `BG${Date.now()}1`
          },
          {
            name: 'Bulk Guard 2',
            email: `bulkguard2_${Date.now()}@test.com`,
            phone: '+254712345690',
            badge_number: `BG${Date.now()}2`
          }
        ]
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/admin/guards/bulk', bulkData, adminToken);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('created');
      expect(response.data.data.created).toBe(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent resident update', async () => {
      const response = await makeAuthenticatedRequest('PUT', '/api/admin/residents/99999', {
        name: 'Non-existent'
      }, adminToken);
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('NOT_FOUND');
    });

    test('should handle non-existent guard deletion', async () => {
      const response = await makeAuthenticatedRequest('DELETE', '/api/admin/guards/99999', null, adminToken);
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('NOT_FOUND');
    });

    test('should handle malformed JSON in requests', async () => {
      const response = await makeAuthenticatedRequest('POST', '/api/admin/residents', 'invalid json', adminToken);
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });
  });
});
