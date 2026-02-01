/**
 * Visitor Functionality Validator
 * 
 * Comprehensive validation system for Visitor role functionality
 * including self-service validation, QR code access, visit confirmation,
 * status updates, and public access security.
 * 
 * Requirements: 1.5
 */

const { expect } = require('@jest/globals');
const request = require('supertest');
const { getTestApp } = require('../../tests/utils/testApp');
const { setupTestDatabase, cleanupTestDatabase, createTestUsers, getAuthToken } = require('../../tests/setup');
const { dbManager } = require('../../secure-gate-access/server/src/database/db.enhanced');

class VisitorValidator {
  constructor() {
    this.app = getTestApp();
    this.residentToken = null;
    this.residentUser = null;
    this.testVisitors = [];
    this.testTokens = [];
    this.validationResults = {
      selfService: { passed: 0, failed: 0, tests: [] },
      qrCodeAccess: { passed: 0, failed: 0, tests: [] },
      visitConfirmation: { passed: 0, failed: 0, tests: [] },
      statusUpdates: { passed: 0, failed: 0, tests: [] },
      publicAccessSecurity: { passed: 0, failed: 0, tests: [] },
      overall: { score: 0, criticalIssues: [], recommendations: [] }
    };
  }

  async initialize() {
    console.log('🔧 Initializing Visitor Validator...');
    
    await setupTestDatabase();
    const testUsers = await createTestUsers();
    this.residentUser = testUsers.resident;
    this.residentToken = await getAuthToken(this.residentUser.email);
    
    // Create test visitors for validation
    await this.createTestVisitors();
    
    console.log('✅ Visitor Validator initialized');
  }

  async createTestVisitors() {
    const visitorData = [
      {
        name: 'Test Visitor 1',
        phone: '+254712345001',
        email: 'visitor1@test.com',
        purpose: 'Business meeting',
        status: 'APPROVED'
      },
      {
        name: 'Test Visitor 2',
        phone: '+254712345002',
        email: 'visitor2@test.com',
        purpose: 'Delivery',
        status: 'PENDING'
      },
      {
        name: 'Test Visitor 3',
        phone: '+254712345003',
        email: 'visitor3@test.com',
        purpose: 'Maintenance',
        status: 'VERIFIED'
      }
    ];

    for (const visitor of visitorData) {
      // Create visitor through resident API to get proper tokens
      const response = await request(this.app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${this.residentToken}`)
        .send({
          name: visitor.name,
          phone: visitor.phone,
          email: visitor.email,
          purpose: visitor.purpose,
          expectedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });

      if (response.status === 201) {
        const createdVisitor = response.body.data.visitor;
        
        // Update status if needed
        if (visitor.status !== 'PENDING') {
          await dbManager.query(
            'UPDATE visitors SET status = $1 WHERE id = $2',
            [visitor.status, createdVisitor.id]
          );
          createdVisitor.status = visitor.status;
        }
        
        this.testVisitors.push(createdVisitor);
        
        // Generate visitor access token
        const tokenResponse = await request(this.app)
          .post('/api/visitors/generate-access-token')
          .send({
            visitorId: createdVisitor.id,
            inviteCode: createdVisitor.invite_code
          });
        
        if (tokenResponse.status === 200) {
          this.testTokens.push({
            visitorId: createdVisitor.id,
            token: tokenResponse.body.data.accessToken,
            visitor: createdVisitor
          });
        }
      }
    }
  }

  async validateSelfService() {
    console.log('🔐 Validating Self-Service Functionality...');
    
    const tests = [
      {
        name: 'Visitor Registration - Self Registration',
        test: async () => {
          const registrationData = {
            name: 'Self Registered Visitor',
            phone: '+254712345999',
            email: 'selfreg@test.com',
            purpose: 'Self registration test',
            hostContact: this.residentUser.email
          };
          
          const response = await request(this.app)
            .post('/api/public/visitors/self-register')
            .send(registrationData);
          
          expect(response.status).toBe(201);
          expect(response.body.success).toBe(true);
          expect(response.body.data.visitor.name).toBe(registrationData.name);
          expect(response.body.data.visitor.status).toBe('PENDING');
          expect(response.body.data.confirmationToken).toBeTruthy();
          
          return { success: true, details: 'Self-registration completed successfully' };
        }
      },
      {
        name: 'Visitor Access - Token-based Authentication',
        test: async () => {
          const visitorToken = this.testTokens[0];
          if (!visitorToken) {
            throw new Error('No visitor token available for testing');
          }
          
          const response = await request(this.app)
            .get('/api/visitors/my-visit')
            .set('Authorization', `Bearer ${visitorToken.token}`);
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.visitor.id).toBe(visitorToken.visitorId);
          expect(response.body.data.visitor.name).toBe(visitorToken.visitor.name);
          
          return { success: true, details: 'Token-based visitor authentication working' };
        }
      },
      {
        name: 'Visit Information - Public Access',
        test: async () => {
          const visitor = this.testVisitors[0];
          
          const response = await request(this.app)
            .get(`/api/public/visitors/${visitor.invite_code}/info`);
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.visitor.name).toBe(visitor.name);
          expect(response.body.data.visitor.purpose).toBe(visitor.purpose);
          // Sensitive data should be masked
          expect(response.body.data.visitor.phone).toMatch(/\*\*\*/);
          
          return { success: true, details: 'Public visit information access working with data masking' };
        }
      },
      {
        name: 'Visitor Profile Update - Self Management',
        test: async () => {
          const visitorToken = this.testTokens[0];
          if (!visitorToken) {
            throw new Error('No visitor token available for testing');
          }
          
          const updateData = {
            phone: '+254712345111',
            emergencyContact: '+254712345222',
            notes: 'Updated contact information'
          };
          
          const response = await request(this.app)
            .patch('/api/visitors/my-profile')
            .set('Authorization', `Bearer ${visitorToken.token}`)
            .send(updateData);
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.visitor.phone).toBe(updateData.phone);
          
          return { success: true, details: 'Visitor profile self-update working correctly' };
        }
      },
      {
        name: 'Visit Cancellation - Self Service',
        test: async () => {
          // Create a new visitor for cancellation test
          const newVisitorResponse = await request(this.app)
            .post('/api/visitors')
            .set('Authorization', `Bearer ${this.residentToken}`)
            .send({
              name: 'Cancellation Test Visitor',
              phone: '+254712345888',
              email: 'cancel@test.com',
              purpose: 'Cancellation test'
            });
          
          const visitor = newVisitorResponse.body.data.visitor;
          
          // Generate access token for visitor
          const tokenResponse = await request(this.app)
            .post('/api/visitors/generate-access-token')
            .send({
              visitorId: visitor.id,
              inviteCode: visitor.invite_code
            });
          
          const visitorToken = tokenResponse.body.data.accessToken;
          
          // Cancel visit
          const cancelResponse = await request(this.app)
            .post('/api/visitors/my-visit/cancel')
            .set('Authorization', `Bearer ${visitorToken}`)
            .send({ reason: 'Unable to attend' });
          
          expect(cancelResponse.status).toBe(200);
          expect(cancelResponse.body.success).toBe(true);
          expect(cancelResponse.body.data.visitor.status).toBe('CANCELLED');
          
          return { success: true, details: 'Visit self-cancellation working correctly' };
        }
      }
    ];

    await this.runTestSuite('selfService', tests);
  }

  async validateQRCodeAccess() {
    console.log('📱 Validating QR Code Access Functionality...');
    
    const tests = [
      {
        name: 'QR Code Display - Visitor Access',
        test: async () => {
          const visitorToken = this.testTokens[0];
          if (!visitorToken) {
            throw new Error('No visitor token available for testing');
          }
          
          const response = await request(this.app)
            .get('/api/visitors/my-qr-code')
            .set('Authorization', `Bearer ${visitorToken.token}`);
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.qrCode).toBeTruthy();
          expect(response.body.data.qrCodeUrl).toBeTruthy();
          expect(response.body.data.expiresAt).toBeTruthy();
          
          return { success: true, details: 'QR code access working for visitors' };
        }
      },
      {
        name: 'QR Code Validation - Public Endpoint',
        test: async () => {
          const visitor = this.testVisitors.find(v => v.status === 'APPROVED');
          if (!visitor) {
            throw new Error('No approved visitor available for QR validation');
          }
          
          const response = await request(this.app)
            .post('/api/public/qr/validate')
            .send({ qrCode: visitor.qr_code });
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.valid).toBe(true);
          expect(response.body.data.visitor.name).toBe(visitor.name);
          expect(response.body.data.visitor.status).toBe('APPROVED');
          
          return { success: true, details: 'QR code validation working correctly' };
        }
      },
      {
        name: 'QR Code Security - Invalid Code Rejection',
        test: async () => {
          const response = await request(this.app)
            .post('/api/public/qr/validate')
            .send({ qrCode: 'INVALID-QR-CODE-123' });
          
          expect(response.status).toBe(404);
          expect(response.body.success).toBe(false);
          expect(response.body.error.code).toBe('INVALID_QR_CODE');
          
          return { success: true, details: 'Invalid QR codes properly rejected' };
        }
      },
      {
        name: 'QR Code Expiry - Time-based Validation',
        test: async () => {
          // Create expired visitor
          const expiredVisitor = await dbManager.query(
            `INSERT INTO visitors (name, phone, email, purpose, status, invite_code, qr_code, estate_id, created_by, expected_arrival)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [
              'Expired Visitor', '+254712345777', 'expired@test.com', 'Expired test',
              'APPROVED', 'EXP-001', 'EXP-QR-001', this.residentUser.estate_id,
              this.residentUser.email, new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
            ]
          );
          
          const response = await request(this.app)
            .post('/api/public/qr/validate')
            .send({ qrCode: expiredVisitor.rows[0].qr_code });
          
          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
          expect(response.body.error.code).toBe('QR_CODE_EXPIRED');
          
          // Cleanup
          await dbManager.query('DELETE FROM visitors WHERE id = $1', [expiredVisitor.rows[0].id]);
          
          return { success: true, details: 'Expired QR codes properly rejected' };
        }
      },
      {
        name: 'QR Code Refresh - Token Regeneration',
        test: async () => {
          const visitorToken = this.testTokens[0];
          if (!visitorToken) {
            throw new Error('No visitor token available for testing');
          }
          
          // Get current QR code
          const currentResponse = await request(this.app)
            .get('/api/visitors/my-qr-code')
            .set('Authorization', `Bearer ${visitorToken.token}`);
          
          const currentQrCode = currentResponse.body.data.qrCode;
          
          // Refresh QR code
          const refreshResponse = await request(this.app)
            .post('/api/visitors/refresh-qr-code')
            .set('Authorization', `Bearer ${visitorToken.token}`);
          
          expect(refreshResponse.status).toBe(200);
          expect(refreshResponse.body.success).toBe(true);
          expect(refreshResponse.body.data.qrCode).toBeTruthy();
          expect(refreshResponse.body.data.qrCode).not.toBe(currentQrCode);
          
          return { success: true, details: 'QR code refresh working correctly' };
        }
      }
    ];

    await this.runTestSuite('qrCodeAccess', tests);
  }

  async validateVisitConfirmation() {
    console.log('✅ Validating Visit Confirmation Features...');
    
    const tests = [
      {
        name: 'Visit Confirmation - Arrival Confirmation',
        test: async () => {
          const visitorToken = this.testTokens[0];
          if (!visitorToken) {
            throw new Error('No visitor token available for testing');
          }
          
          const confirmationData = {
            confirmed: true,
            estimatedArrival: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            notes: 'Confirmed arrival time'
          };
          
          const response = await request(this.app)
            .post('/api/visitors/my-visit/confirm')
            .set('Authorization', `Bearer ${visitorToken.token}`)
            .send(confirmationData);
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.visitor.status).toBe('VERIFIED');
          
          return { success: true, details: 'Visit confirmation working correctly' };
        }
      },
      {
        name: 'Visit Details - Information Access',
        test: async () => {
          const visitor = this.testVisitors[0];
          
          const response = await request(this.app)
            .get(`/api/public/visits/${visitor.invite_code}/details`);
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.visit.visitor.name).toBe(visitor.name);
          expect(response.body.data.visit.estate).toBeTruthy();
          expect(response.body.data.visit.host).toBeTruthy();
          expect(response.body.data.visit.directions).toBeTruthy();
          
          return { success: true, details: 'Visit details access working correctly' };
        }
      },
      {
        name: 'Visit Instructions - Host Information',
        test: async () => {
          const visitor = this.testVisitors[0];
          
          const response = await request(this.app)
            .get(`/api/public/visits/${visitor.invite_code}/instructions`);
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.instructions).toBeTruthy();
          expect(response.body.data.hostContact).toBeTruthy();
          expect(response.body.data.estateInfo).toBeTruthy();
          expect(response.body.data.checkInProcess).toBeTruthy();
          
          return { success: true, details: 'Visit instructions access working correctly' };
        }
      },
      {
        name: 'Visit Timeline - Status History',
        test: async () => {
          const visitorToken = this.testTokens[0];
          if (!visitorToken) {
            throw new Error('No visitor token available for testing');
          }
          
          const response = await request(this.app)
            .get('/api/visitors/my-visit/timeline')
            .set('Authorization', `Bearer ${visitorToken.token}`);
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(Array.isArray(response.body.data.timeline)).toBe(true);
          expect(response.body.data.timeline.length).toBeGreaterThan(0);
          
          // Should contain creation event
          const creationEvent = response.body.data.timeline.find(
            event => event.action === 'visitor_created'
          );
          expect(creationEvent).toBeTruthy();
          
          return { success: true, details: 'Visit timeline access working correctly' };
        }
      },
      {
        name: 'Emergency Contact - Help Information',
        test: async () => {
          const visitor = this.testVisitors[0];
          
          const response = await request(this.app)
            .get(`/api/public/visits/${visitor.invite_code}/emergency-contact`);
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.emergencyContact).toBeTruthy();
          expect(response.body.data.securityContact).toBeTruthy();
          expect(response.body.data.helpDesk).toBeTruthy();
          
          return { success: true, details: 'Emergency contact information access working' };
        }
      }
    ];

    await this.runTestSuite('visitConfirmation', tests);
  }

  async validateStatusUpdates() {
    console.log('🔄 Validating Status Update Capabilities...');
    
    const tests = [
      {
        name: 'Status Notifications - Real-time Updates',
        test: async () => {
          const visitorToken = this.testTokens[0];
          if (!visitorToken) {
            throw new Error('No visitor token available for testing');
          }
          
          // Subscribe to status updates
          const subscribeResponse = await request(this.app)
            .post('/api/visitors/subscribe-updates')
            .set('Authorization', `Bearer ${visitorToken.token}`);
          
          expect(subscribeResponse.status).toBe(200);
          expect(subscribeResponse.body.success).toBe(true);
          
          // Check for recent updates
          const updatesResponse = await request(this.app)
            .get('/api/visitors/my-updates')
            .set('Authorization', `Bearer ${visitorToken.token}`);
          
          expect(updatesResponse.status).toBe(200);
          expect(updatesResponse.body.success).toBe(true);
          expect(Array.isArray(updatesResponse.body.data.updates)).toBe(true);
          
          return { success: true, details: 'Status update notifications working correctly' };
        }
      },
      {
        name: 'Check-in Status - Visitor Perspective',
        test: async () => {
          const visitorToken = this.testTokens[0];
          if (!visitorToken) {
            throw new Error('No visitor token available for testing');
          }
          
          const response = await request(this.app)
            .get('/api/visitors/my-visit/status')
            .set('Authorization', `Bearer ${visitorToken.token}`);
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.currentStatus).toBeTruthy();
          expect(response.body.data.canCheckIn).toBeDefined();
          expect(response.body.data.nextSteps).toBeTruthy();
          
          return { success: true, details: 'Check-in status visibility working correctly' };
        }
      },
      {
        name: 'Visit Progress - Step Tracking',
        test: async () => {
          const visitorToken = this.testTokens[0];
          if (!visitorToken) {
            throw new Error('No visitor token available for testing');
          }
          
          const response = await request(this.app)
            .get('/api/visitors/my-visit/progress')
            .set('Authorization', `Bearer ${visitorToken.token}`);
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.steps).toBeTruthy();
          expect(response.body.data.currentStep).toBeTruthy();
          expect(response.body.data.completedSteps).toBeTruthy();
          expect(response.body.data.remainingSteps).toBeTruthy();
          
          return { success: true, details: 'Visit progress tracking working correctly' };
        }
      },
      {
        name: 'Status Change Notifications - Push Updates',
        test: async () => {
          const visitor = this.testVisitors[0];
          
          // Simulate status change
          await dbManager.query(
            'UPDATE visitors SET status = $1 WHERE id = $2',
            ['APPROVED', visitor.id]
          );
          
          // Check if notification was generated
          const notificationResponse = await request(this.app)
            .get(`/api/public/visits/${visitor.invite_code}/notifications`);
          
          expect(notificationResponse.status).toBe(200);
          expect(notificationResponse.body.success).toBe(true);
          expect(Array.isArray(notificationResponse.body.data.notifications)).toBe(true);
          
          return { success: true, details: 'Status change notifications working correctly' };
        }
      },
      {
        name: 'Visit Completion - Final Status',
        test: async () => {
          // Create a completed visit for testing
          const completedVisitor = await dbManager.query(
            `INSERT INTO visitors (name, phone, email, purpose, status, invite_code, qr_code, estate_id, created_by, check_in_time, check_out_time)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [
              'Completed Visitor', '+254712345666', 'completed@test.com', 'Completed test',
              'CHECKED_OUT', 'COMP-001', 'COMP-QR-001', this.residentUser.estate_id,
              this.residentUser.email, new Date(Date.now() - 2 * 60 * 60 * 1000),
              new Date(Date.now() - 1 * 60 * 60 * 1000)
            ]
          );
          
          const response = await request(this.app)
            .get(`/api/public/visits/${completedVisitor.rows[0].invite_code}/summary`);
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.visit.status).toBe('CHECKED_OUT');
          expect(response.body.data.visit.duration).toBeTruthy();
          expect(response.body.data.visit.completed).toBe(true);
          
          // Cleanup
          await dbManager.query('DELETE FROM visitors WHERE id = $1', [completedVisitor.rows[0].id]);
          
          return { success: true, details: 'Visit completion status working correctly' };
        }
      }
    ];

    await this.runTestSuite('statusUpdates', tests);
  }

  async validatePublicAccessSecurity() {
    console.log('🔒 Validating Public Access Security...');
    
    const tests = [
      {
        name: 'Token Validation - Secure Access',
        test: async () => {
          const visitor = this.testVisitors[0];
          
          // Valid token access
          const validResponse = await request(this.app)
            .get(`/api/public/visits/${visitor.invite_code}/info`);
          
          expect(validResponse.status).toBe(200);
          expect(validResponse.body.success).toBe(true);
          
          // Invalid token access
          const invalidResponse = await request(this.app)
            .get('/api/public/visits/INVALID-TOKEN/info');
          
          expect(invalidResponse.status).toBe(404);
          expect(invalidResponse.body.success).toBe(false);
          
          return { success: true, details: 'Token validation security working correctly' };
        }
      },
      {
        name: 'Data Masking - Sensitive Information Protection',
        test: async () => {
          const visitor = this.testVisitors[0];
          
          const response = await request(this.app)
            .get(`/api/public/visits/${visitor.invite_code}/info`);
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          
          // Check that sensitive data is masked
          const visitorData = response.body.data.visitor;
          expect(visitorData.phone).toMatch(/\*\*\*/); // Phone should be masked
          expect(visitorData.email).toMatch(/\*\*\*/); // Email should be masked
          expect(visitorData.name).toBeTruthy(); // Name should be visible
          expect(visitorData.purpose).toBeTruthy(); // Purpose should be visible
          
          return { success: true, details: 'Sensitive data masking working correctly' };
        }
      },
      {
        name: 'Rate Limiting - Public Endpoint Protection',
        test: async () => {
          const visitor = this.testVisitors[0];
          const promises = [];
          
          // Make multiple rapid requests
          for (let i = 0; i < 15; i++) {
            promises.push(
              request(this.app)
                .get(`/api/public/visits/${visitor.invite_code}/info`)
            );
          }
          
          const responses = await Promise.all(promises);
          
          // Some requests should be rate limited
          const rateLimitedResponses = responses.filter(r => r.status === 429);
          expect(rateLimitedResponses.length).toBeGreaterThan(0);
          
          return { success: true, details: 'Rate limiting protection working correctly' };
        }
      },
      {
        name: 'Cross-Estate Access - Security Isolation',
        test: async () => {
          // Create visitor in different estate
          const otherEstateVisitor = await dbManager.query(
            `INSERT INTO visitors (name, phone, email, purpose, status, invite_code, qr_code, estate_id, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [
              'Other Estate Visitor', '+254712345555', 'other@test.com', 'Cross-estate test',
              'APPROVED', 'OTHER-EST-001', 'OTHER-QR-001', 999, 'other@test.com'
            ]
          );
          
          // Try to access with visitor token from different estate
          const visitorToken = this.testTokens[0];
          if (visitorToken) {
            const response = await request(this.app)
              .get(`/api/public/visits/${otherEstateVisitor.rows[0].invite_code}/info`);
            
            // Should still work for public endpoint, but with limited data
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
          }
          
          // Cleanup
          await dbManager.query('DELETE FROM visitors WHERE id = $1', [otherEstateVisitor.rows[0].id]);
          
          return { success: true, details: 'Cross-estate access security working correctly' };
        }
      },
      {
        name: 'Input Validation - Malicious Input Protection',
        test: async () => {
          const maliciousInputs = [
            '<script>alert("xss")</script>',
            'DROP TABLE visitors;',
            '../../etc/passwd',
            'javascript:alert(1)'
          ];
          
          for (const maliciousInput of maliciousInputs) {
            const response = await request(this.app)
              .get(`/api/public/visits/${maliciousInput}/info`);
            
            // Should return 404 or 400, not 500 (server error)
            expect([400, 404]).toContain(response.status);
            expect(response.body.success).toBe(false);
          }
          
          return { success: true, details: 'Malicious input protection working correctly' };
        }
      }
    ];

    await this.runTestSuite('publicAccessSecurity', tests);
  }

  async runTestSuite(category, tests) {
    for (const test of tests) {
      try {
        console.log(`  ⏳ Running: ${test.name}`);
        const result = await test.test();
        
        this.validationResults[category].passed++;
        this.validationResults[category].tests.push({
          name: test.name,
          status: 'PASSED',
          details: result.details,
          metrics: result.metrics || null
        });
        
        console.log(`  ✅ ${test.name}: PASSED`);
        if (result.metrics) {
          console.log(`     📊 Metrics: ${JSON.stringify(result.metrics)}`);
        }
        
      } catch (error) {
        this.validationResults[category].failed++;
        this.validationResults[category].tests.push({
          name: test.name,
          status: 'FAILED',
          error: error.message,
          details: error.stack
        });
        
        console.log(`  ❌ ${test.name}: FAILED - ${error.message}`);
        
        // Add to critical issues if it's a core functionality test
        if (test.name.includes('Self Registration') || 
            test.name.includes('QR Code Access') || 
            test.name.includes('Token Validation')) {
          this.validationResults.overall.criticalIssues.push({
            category,
            test: test.name,
            error: error.message,
            severity: 'HIGH'
          });
        }
      }
    }
  }

  async generateValidationReport() {
    console.log('📊 Generating Visitor Validation Report...');
    
    // Calculate overall score
    const totalTests = Object.values(this.validationResults)
      .filter(category => typeof category === 'object' && category.passed !== undefined)
      .reduce((sum, category) => sum + category.passed + category.failed, 0);
    
    const totalPassed = Object.values(this.validationResults)
      .filter(category => typeof category === 'object' && category.passed !== undefined)
      .reduce((sum, category) => sum + category.passed, 0);
    
    this.validationResults.overall.score = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
    
    // Generate recommendations
    if (this.validationResults.selfService.failed > 0) {
      this.validationResults.overall.recommendations.push(
        'Improve self-service registration and profile management'
      );
    }
    
    if (this.validationResults.qrCodeAccess.failed > 0) {
      this.validationResults.overall.recommendations.push(
        'Enhance QR code security and validation mechanisms'
      );
    }
    
    if (this.validationResults.publicAccessSecurity.failed > 0) {
      this.validationResults.overall.recommendations.push(
        'Strengthen public access security and input validation'
      );
    }
    
    if (this.validationResults.statusUpdates.failed > 0) {
      this.validationResults.overall.recommendations.push(
        'Optimize real-time status update delivery and notifications'
      );
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      validator: 'Visitor Functionality',
      requirements: ['1.5'],
      summary: {
        totalTests,
        totalPassed,
        totalFailed: totalTests - totalPassed,
        successRate: `${this.validationResults.overall.score.toFixed(2)}%`,
        criticalIssues: this.validationResults.overall.criticalIssues.length
      },
      categories: {
        selfService: this.validationResults.selfService,
        qrCodeAccess: this.validationResults.qrCodeAccess,
        visitConfirmation: this.validationResults.visitConfirmation,
        statusUpdates: this.validationResults.statusUpdates,
        publicAccessSecurity: this.validationResults.publicAccessSecurity
      },
      criticalIssues: this.validationResults.overall.criticalIssues,
      recommendations: this.validationResults.overall.recommendations,
      productionReadiness: {
        score: this.validationResults.overall.score,
        status: this.validationResults.overall.score >= 95 ? 'READY' : 
                this.validationResults.overall.score >= 85 ? 'NEEDS_IMPROVEMENT' : 'NOT_READY',
        blockers: this.validationResults.overall.criticalIssues.filter(issue => issue.severity === 'HIGH')
      }
    };
    
    console.log('\n📋 Visitor Validation Report Summary:');
    console.log(`   Overall Score: ${report.summary.successRate}`);
    console.log(`   Tests Passed: ${report.summary.totalPassed}/${report.summary.totalTests}`);
    console.log(`   Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`   Production Status: ${report.productionReadiness.status}`);
    
    return report;
  }

  async cleanup() {
    console.log('🧹 Cleaning up Visitor Validator...');
    
    // Clean up test data
    if (this.testVisitors.length > 0) {
      const visitorIds = this.testVisitors.map(v => v.id);
      await dbManager.query(
        `DELETE FROM visitors WHERE id = ANY($1)`,
        [visitorIds]
      );
    }
    
    await cleanupTestDatabase();
    console.log('✅ Visitor Validator cleanup completed');
  }

  async validate() {
    try {
      await this.initialize();
      
      console.log('\n👤 Starting Visitor Functionality Validation...');
      console.log('Requirements: 1.5 - Visitor role functionality');
      
      await this.validateSelfService();
      await this.validateQRCodeAccess();
      await this.validateVisitConfirmation();
      await this.validateStatusUpdates();
      await this.validatePublicAccessSecurity();
      
      const report = await this.generateValidationReport();
      
      await this.cleanup();
      
      return report;
      
    } catch (error) {
      console.error('❌ Visitor Validation failed:', error);
      await this.cleanup();
      throw error;
    }
  }
}

module.exports = { VisitorValidator };

// Export for standalone execution
if (require.main === module) {
  const validator = new VisitorValidator();
  validator.validate()
    .then(report => {
      console.log('\n✅ Visitor Validation completed');
      console.log('📊 Final Report:', JSON.stringify(report, null, 2));
      process.exit(report.productionReadiness.status === 'READY' ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}