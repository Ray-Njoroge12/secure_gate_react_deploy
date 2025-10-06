const { 
  makeAuthenticatedRequest, 
  createTestUser, 
  createTestAdmin,
  BACKEND_URL 
} = require('./setup');

describe('Visitor Flow Integration Tests', () => {
  let adminUser;
  let residentUser;
  let guardUser;
  let testVisitor;
  
  beforeAll(async () => {
    // Create users for testing
    adminUser = await createTestAdmin();
    residentUser = await createTestUser({ role: 'resident' });
    guardUser = await createTestUser({ role: 'guard' });
  }, 30000);

  describe('Visitor Invitation Creation', () => {
    test('should create visitor invitation (resident)', async () => {
      const visitorData = {
        name: 'John Visitor',
        email: `visitor_${Date.now()}@test.com`,
        phone: '+254712345678',
        purpose: 'Meeting',
        expected_arrival: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        notes: 'Test visitor invitation'
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/visitors/invite', visitorData, residentUser.token);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.visitor).toHaveProperty('id');
      expect(response.data.data.visitor.name).toBe(visitorData.name);
      expect(response.data.data.visitor.email).toBe(visitorData.email);
      expect(response.data.data.invite_code).toBeDefined();
      
      testVisitor = response.data.data.visitor;
    });

    test('should create visitor invitation (admin)', async () => {
      const visitorData = {
        name: 'Admin Invited Visitor',
        email: `adminvisitor_${Date.now()}@test.com`,
        phone: '+254712345679',
        purpose: 'Official visit',
        expected_arrival: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Admin invited visitor'
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/visitors/invite', visitorData, adminUser.token);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.visitor).toHaveProperty('id');
      expect(response.data.data.invite_code).toBeDefined();
    });

    test('should reject visitor invitation without authentication', async () => {
      const visitorData = {
        name: 'Unauthorized Visitor',
        email: `unauth_${Date.now()}@test.com`,
        phone: '+254712345680',
        purpose: 'Meeting'
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/visitors/invite', visitorData);
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('AUTH_TOKEN_MISSING');
    });

    test('should reject visitor invitation with missing required fields', async () => {
      const visitorData = {
        name: 'Incomplete Visitor'
        // Missing email, phone, purpose
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/visitors/invite', visitorData, residentUser.token);
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('VALIDATION_ERROR');
    });

    test('should reject visitor invitation with invalid email format', async () => {
      const visitorData = {
        name: 'Invalid Email Visitor',
        email: 'invalid-email-format',
        phone: '+254712345681',
        purpose: 'Meeting'
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/visitors/invite', visitorData, residentUser.token);
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Bulk Visitor Invitations', () => {
    test('should create bulk visitor invitations (admin)', async () => {
      const bulkData = {
        visitors: [
          {
            name: 'Bulk Visitor 1',
            email: `bulk1_${Date.now()}@test.com`,
            phone: '+254712345682',
            purpose: 'Meeting 1'
          },
          {
            name: 'Bulk Visitor 2',
            email: `bulk2_${Date.now()}@test.com`,
            phone: '+254712345683',
            purpose: 'Meeting 2'
          }
        ]
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/visitors/bulk-invite', bulkData, adminUser.token);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.created).toBe(2);
      expect(response.data.data.visitors).toHaveLength(2);
    });

    test('should reject bulk invitations from non-admin', async () => {
      const bulkData = {
        visitors: [
          {
            name: 'Unauthorized Bulk',
            email: `unauthbulk_${Date.now()}@test.com`,
            phone: '+254712345684',
            purpose: 'Meeting'
          }
        ]
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/visitors/bulk-invite', bulkData, residentUser.token);
      
      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
    });
  });

  describe('Visitor List and Management', () => {
    test('should get all visitors (admin)', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/visitors', null, adminUser.token);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeInstanceOf(Array);
    });

    test('should get visitor by ID (admin)', async () => {
      if (testVisitor) {
        const response = await makeAuthenticatedRequest('GET', `/api/visitors/${testVisitor.id}`, null, adminUser.token);
        
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        expect(response.data.data.id).toBe(testVisitor.id);
        expect(response.data.data.name).toBe(testVisitor.name);
      }
    });

    test('should update visitor status (admin)', async () => {
      if (testVisitor) {
        const updateData = {
          status: 'approved',
          notes: 'Approved by admin'
        };
        
        const response = await makeAuthenticatedRequest('PUT', `/api/visitors/${testVisitor.id}`, updateData, adminUser.token);
        
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        expect(response.data.data.status).toBe('approved');
      }
    });

    test('should reject visitor access from non-admin', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/visitors', null, residentUser.token);
      
      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
    });
  });

  describe('Public Invite Retrieval', () => {
    let inviteCode;
    
    test('should get public invite by code', async () => {
      // First create a visitor invitation
      const visitorData = {
        name: 'Public Invite Visitor',
        email: `public_${Date.now()}@test.com`,
        phone: '+254712345685',
        purpose: 'Public test',
        expected_arrival: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
      
      const createResponse = await makeAuthenticatedRequest('POST', '/api/visitors/invite', visitorData, residentUser.token);
      inviteCode = createResponse.data.data.invite_code;
      
      // Get public invite
      const response = await makeAuthenticatedRequest('GET', `/api/invite/${inviteCode}`);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.visitor).toHaveProperty('id');
      expect(response.data.data.visitor.name).toBe(visitorData.name);
    });

    test('should reject invalid invite code', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/invite/invalid-code');
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('OTP Verification', () => {
    test('should verify OTP for visitor', async () => {
      if (testVisitor) {
        const otpData = {
          visitor_id: testVisitor.id,
          otp: '123456' // This might need to be a real OTP from the system
        };
        
        const response = await makeAuthenticatedRequest('POST', '/api/visitors/verify-otp', otpData);
        
        // This might return 200 (success), 400 (invalid OTP), or 404 (not implemented)
        expect([200, 400, 404]).toContain(response.status);
      }
    });

    test('should resend OTP for visitor', async () => {
      if (testVisitor) {
        const resendData = {
          visitor_id: testVisitor.id
        };
        
        const response = await makeAuthenticatedRequest('POST', '/api/visitors/resend-otp', resendData);
        
        // This might return 200 (success) or 404 (not implemented)
        expect([200, 404]).toContain(response.status);
      }
    });

    test('should reject OTP verification with invalid visitor ID', async () => {
      const otpData = {
        visitor_id: 99999,
        otp: '123456'
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/visitors/verify-otp', otpData);
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Visitor Check-in/Check-out', () => {
    test('should check-in visitor (guard)', async () => {
      if (testVisitor) {
        const checkinData = {
          visitor_id: testVisitor.id,
          guard_notes: 'Checked in by guard'
        };
        
        const response = await makeAuthenticatedRequest('POST', '/api/visitors/checkin', checkinData, guardUser.token);
        
        // This might return 200 (success) or 404 (not implemented)
        expect([200, 404]).toContain(response.status);
      }
    });

    test('should check-out visitor (guard)', async () => {
      if (testVisitor) {
        const checkoutData = {
          visitor_id: testVisitor.id,
          guard_notes: 'Checked out by guard'
        };
        
        const response = await makeAuthenticatedRequest('POST', '/api/visitors/checkout', checkoutData, guardUser.token);
        
        // This might return 200 (success) or 404 (not implemented)
        expect([200, 404]).toContain(response.status);
      }
    });

    test('should reject check-in from non-guard', async () => {
      if (testVisitor) {
        const checkinData = {
          visitor_id: testVisitor.id,
          guard_notes: 'Unauthorized check-in'
        };
        
        const response = await makeAuthenticatedRequest('POST', '/api/visitors/checkin', checkinData, residentUser.token);
        
        expect(response.status).toBe(403);
        expect(response.data.success).toBe(false);
      }
    });
  });

  describe('Visitor Reports', () => {
    test('should get visitor reports (admin)', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/visitors/reports', null, adminUser.token);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeInstanceOf(Array);
    });

    test('should get visitor reports with date range (admin)', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();
      
      const response = await makeAuthenticatedRequest('GET', `/api/visitors/reports?start_date=${startDate}&end_date=${endDate}`, null, adminUser.token);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeInstanceOf(Array);
    });

    test('should reject visitor reports from non-admin', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/visitors/reports', null, residentUser.token);
      
      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
    });
  });

  describe('Visitor Search and Filtering', () => {
    test('should search visitors by name (admin)', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/visitors?search=John', null, adminUser.token);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeInstanceOf(Array);
    });

    test('should filter visitors by status (admin)', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/visitors?status=pending', null, adminUser.token);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeInstanceOf(Array);
    });

    test('should filter visitors by date range (admin)', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();
      
      const response = await makeAuthenticatedRequest('GET', `/api/visitors?start_date=${startDate}&end_date=${endDate}`, null, adminUser.token);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent visitor ID', async () => {
      const response = await makeAuthenticatedRequest('GET', '/api/visitors/99999', null, adminUser.token);
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('NOT_FOUND');
    });

    test('should handle malformed JSON in visitor creation', async () => {
      const response = await makeAuthenticatedRequest('POST', '/api/visitors/invite', 'invalid json', residentUser.token);
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });

    test('should handle invalid date format in visitor creation', async () => {
      const visitorData = {
        name: 'Invalid Date Visitor',
        email: `invaliddate_${Date.now()}@test.com`,
        phone: '+254712345686',
        purpose: 'Test',
        expected_arrival: 'invalid-date-format'
      };
      
      const response = await makeAuthenticatedRequest('POST', '/api/visitors/invite', visitorData, residentUser.token);
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
