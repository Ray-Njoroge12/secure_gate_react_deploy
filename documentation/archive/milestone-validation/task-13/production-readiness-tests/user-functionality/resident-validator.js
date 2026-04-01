/**
 * Resident Functionality Validator
 * 
 * Comprehensive validation system for Resident role functionality
 * including visitor invitation, approval workflows, visitor tracking,
 * notification preferences, and mobile access features.
 * 
 * Requirements: 1.4
 */

const { expect } = require('@jest/globals');
const request = require('supertest');
const { getTestApp } = require('../../tests/utils/testApp');
const { setupTestDatabase, cleanupTestDatabase, createTestUsers, getAuthToken } = require('../../tests/setup');
const { dbManager } = require('../../secure-gate-access/server/src/database/db.enhanced');

class ResidentValidator {
  constructor() {
    this.app = getTestApp();
    this.residentToken = null;
    this.residentUser = null;
    this.testVisitors = [];
    this.testInvitations = [];
    this.validationResults = {
      visitorInvitation: { passed: 0, failed: 0, tests: [] },
      approvalWorkflows: { passed: 0, failed: 0, tests: [] },
      visitorTracking: { passed: 0, failed: 0, tests: [] },
      notificationPreferences: { passed: 0, failed: 0, tests: [] },
      mobileAccess: { passed: 0, failed: 0, tests: [] },
      overall: { score: 0, criticalIssues: [], recommendations: [] }
    };
  }

  async initialize() {
    console.log('🔧 Initializing Resident Validator...');
    
    await setupTestDatabase();
    const testUsers = await createTestUsers();
    this.residentUser = testUsers.resident;
    this.residentToken = await getAuthToken(this.residentUser.email);
    
    console.log('✅ Resident Validator initialized');
  }

  async validateVisitorInvitation() {
    console.log('📧 Validating Visitor Invitation Functionality...');
    
    const tests = [
      {
        name: 'Single Visitor Invitation - Complete Flow',
        test: async () => {
          const invitationData = {
            name: 'John Doe',
            phone: '+254712345001',
            email: 'john.doe@test.com',
            purpose: 'Business meeting',
            expectedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            notes: 'Please bring ID'
          };
          
          const response = await request(this.app)
            .post('/api/visitors')
            .set('Authorization', `Bearer ${this.residentToken}`)
            .send(invitationData);
          
          expect(response.status).toBe(201);
          expect(response.body.success).toBe(true);
          expect(response.body.data.visitor.name).toBe(invitationData.name);
          expect(response.body.data.visitor.status).toBe('PENDING');
          expect(response.body.data.visitor.invite_code).toBeTruthy();
          expect(response.body.data.visitor.qr_code).toBeTruthy();
          
          this.testVisitors.push(response.body.data.visitor);
          
          return { success: true, details: 'Single visitor invitation created successfully' };
        }
      },
      {
        name: 'Bulk Visitor Invitation - Multiple Guests',
        test: async () => {
          const bulkInviteData = {
            eventName: 'Family Gathering',
            date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
            time: '18:00',
            numGuests: 5,
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
          };
          
          const response = await request(this.app)
            .post('/api/visitors/bulk-invite')
            .set('Authorization', `Bearer ${this.residentToken}`)
            .send(bulkInviteData);
          
          expect(response.status).toBe(201);
          expect(response.body.success).toBe(true);
          expect(response.body.data.bulkInvite.event_name).toBe(bulkInviteData.eventName);
          expect(response.body.data.bulkInvite.num_guests).toBe(bulkInviteData.numGuests);
          expect(response.body.data.bulkInvite.invite_code).toBeTruthy();
          
          this.testInvitations.push(response.body.data.bulkInvite);
          
          return { success: true, details: 'Bulk visitor invitation created successfully' };
        }
      },
      {
        name: 'Visitor Invitation Validation - Required Fields',
        test: async () => {
          const invalidData = {
            name: '', // Missing required field
            phone: 'invalid-phone',
            email: 'not-an-email'
          };
          
          const response = await request(this.app)
            .post('/api/visitors')
            .set('Authorization', `Bearer ${this.residentToken}`)
            .send(invalidData);
          
          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
          expect(response.body.error.code).toBe('VALIDATION_ERROR');
          
          return { success: true, details: 'Validation properly enforced for required fields' };
        }
      },
      {
        name: 'QR Code Generation - Unique Codes',
        test: async () => {
          const invitations = [];
          
          // Create multiple invitations
          for (let i = 0; i < 5; i++) {
            const response = await request(this.app)
              .post('/api/visitors')
              .set('Authorization', `Bearer ${this.residentToken}`)
              .send({
                name: `Test Visitor ${i + 1}`,
                phone: `+25471234500${i + 1}`,
                email: `visitor${i + 1}@test.com`,
                purpose: 'Test visit'
              });
            
            expect(response.status).toBe(201);
            invitations.push(response.body.data.visitor);
          }
          
          // Verify all QR codes are unique
          const qrCodes = invitations.map(inv => inv.qr_code);
          const uniqueQrCodes = new Set(qrCodes);
          expect(uniqueQrCodes.size).toBe(qrCodes.length);
          
          // Verify all invite codes are unique
          const inviteCodes = invitations.map(inv => inv.invite_code);
          const uniqueInviteCodes = new Set(inviteCodes);
          expect(uniqueInviteCodes.size).toBe(inviteCodes.length);
          
          this.testVisitors.push(...invitations);
          
          return { 
            success: true, 
            details: 'All QR codes and invite codes are unique',
            metrics: { totalInvitations: invitations.length, uniqueCodes: uniqueQrCodes.size }
          };
        }
      },
      {
        name: 'Invitation Expiry - Time-based Validation',
        test: async () => {
          const expiredInviteData = {
            name: 'Expired Visitor',
            phone: '+254712345999',
            email: 'expired@test.com',
            purpose: 'Test expired invite',
            expectedArrival: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
          };
          
          const response = await request(this.app)
            .post('/api/visitors')
            .set('Authorization', `Bearer ${this.residentToken}`)
            .send(expiredInviteData);
          
          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
          expect(response.body.error.code).toBe('INVALID_ARRIVAL_TIME');
          
          return { success: true, details: 'Expired invitation properly rejected' };
        }
      }
    ];

    await this.runTestSuite('visitorInvitation', tests);
  }

  async validateApprovalWorkflows() {
    console.log('✅ Validating Approval Workflow Functionality...');
    
    const tests = [
      {
        name: 'Visitor Approval - Pending to Approved',
        test: async () => {
          const visitor = this.testVisitors.find(v => v.status === 'PENDING');
          if (!visitor) {
            throw new Error('No pending visitor found for approval test');
          }
          
          const response = await request(this.app)
            .patch(`/api/visitors/${visitor.id}/approve`)
            .set('Authorization', `Bearer ${this.residentToken}`)
            .send({ 
              approved: true,
              notes: 'Visitor approved by resident'
            });
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.visitor.status).toBe('APPROVED');
          
          return { success: true, details: 'Visitor successfully approved by resident' };
        }
      },
      {
        name: 'Visitor Rejection - Pending to Rejected',
        test: async () => {
          // Create a new visitor for rejection test
          const newVisitorResponse = await request(this.app)
            .post('/api/visitors')
            .set('Authorization', `Bearer ${this.residentToken}`)
            .send({
              name: 'Rejection Test Visitor',
              phone: '+254712345888',
              email: 'reject@test.com',
              purpose: 'Test rejection'
            });
          
          const visitor = newVisitorResponse.body.data.visitor;
          
          const response = await request(this.app)
            .patch(`/api/visitors/${visitor.id}/approve`)
            .set('Authorization', `Bearer ${this.residentToken}`)
            .send({ 
              approved: false,
              notes: 'Visitor rejected - not authorized'
            });
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.visitor.status).toBe('REVOKED');
          
          return { success: true, details: 'Visitor successfully rejected by resident' };
        }
      },
      {
        name: 'Bulk Approval - Multiple Visitors',
        test: async () => {
          // Get pending visitors
          const pendingVisitors = this.testVisitors.filter(v => v.status === 'PENDING');
          const visitorIds = pendingVisitors.slice(0, 3).map(v => v.id);
          
          if (visitorIds.length === 0) {
            // Create some pending visitors for bulk approval
            for (let i = 0; i < 3; i++) {
              const response = await request(this.app)
                .post('/api/visitors')
                .set('Authorization', `Bearer ${this.residentToken}`)
                .send({
                  name: `Bulk Test Visitor ${i + 1}`,
                  phone: `+25471234588${i}`,
                  email: `bulk${i + 1}@test.com`,
                  purpose: 'Bulk approval test'
                });
              visitorIds.push(response.body.data.visitor.id);
            }
          }
          
          const response = await request(this.app)
            .post('/api/visitors/bulk-approve')
            .set('Authorization', `Bearer ${this.residentToken}`)
            .send({ 
              visitorIds,
              approved: true,
              notes: 'Bulk approval by resident'
            });
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.processed).toBe(visitorIds.length);
          expect(response.body.data.approved).toBe(visitorIds.length);
          
          return { 
            success: true, 
            details: `Bulk approval processed ${visitorIds.length} visitors`,
            metrics: { processed: visitorIds.length, approved: visitorIds.length }
          };
        }
      },
      {
        name: 'Approval Workflow - Status Transitions',
        test: async () => {
          // Create visitor and test status transitions
          const visitorResponse = await request(this.app)
            .post('/api/visitors')
            .set('Authorization', `Bearer ${this.residentToken}`)
            .send({
              name: 'Status Test Visitor',
              phone: '+254712345777',
              email: 'status@test.com',
              purpose: 'Status transition test'
            });
          
          const visitor = visitorResponse.body.data.visitor;
          expect(visitor.status).toBe('PENDING');
          
          // Approve visitor
          const approveResponse = await request(this.app)
            .patch(`/api/visitors/${visitor.id}/approve`)
            .set('Authorization', `Bearer ${this.residentToken}`)
            .send({ approved: true });
          
          expect(approveResponse.body.data.visitor.status).toBe('APPROVED');
          
          // Try to revoke approved visitor
          const revokeResponse = await request(this.app)
            .patch(`/api/visitors/${visitor.id}/revoke`)
            .set('Authorization', `Bearer ${this.residentToken}`)
            .send({ reason: 'Changed mind' });
          
          expect(revokeResponse.status).toBe(200);
          expect(revokeResponse.body.data.visitor.status).toBe('REVOKED');
          
          return { success: true, details: 'Status transitions working correctly' };
        }
      },
      {
        name: 'Approval Permissions - Estate Scoping',
        test: async () => {
          // Try to approve visitor from different estate (should fail)
          const otherEstateVisitor = await dbManager.query(
            `INSERT INTO visitors (name, phone, email, purpose, status, invite_code, estate_id, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
              'Other Estate Visitor', '+254712345666', 'other@test.com', 'Cross-estate test',
              'PENDING', 'OTHER-INV-001', 999, 'other@test.com'
            ]
          );
          
          const response = await request(this.app)
            .patch(`/api/visitors/${otherEstateVisitor.rows[0].id}/approve`)
            .set('Authorization', `Bearer ${this.residentToken}`)
            .send({ approved: true });
          
          expect(response.status).toBe(404);
          expect(response.body.success).toBe(false);
          
          // Cleanup
          await dbManager.query('DELETE FROM visitors WHERE id = $1', [otherEstateVisitor.rows[0].id]);
          
          return { success: true, details: 'Estate scoping properly enforced for approvals' };
        }
      }
    ];

    await this.runTestSuite('approvalWorkflows', tests);
  }

  async validateVisitorTracking() {
    console.log('📊 Validating Visitor Tracking Capabilities...');
    
    const tests = [
      {
        name: 'Visitor History - Personal Invitations',
        test: async () => {
          const response = await request(this.app)
            .get('/api/visitors/my-invitations')
            .set('Authorization', `Bearer ${this.residentToken}`);
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(Array.isArray(response.body.data.visitors)).toBe(true);
          expect(response.body.data.visitors.length).toBeGreaterThan(0);
          
          // Verify all visitors belong to this resident
          response.body.data.visitors.forEach(visitor => {
            expect(visitor.created_by).toBe(this.residentUser.email);
          });
          
          return { 
            success: true, 
            details: `Retrieved ${response.body.data.visitors.length} personal invitations`,
            metrics: { totalInvitations: response.body.data.visitors.length }
          };
        }
      },
      {
        name: 'Visitor Status Tracking - Real-time Updates',
        test: async () => {
          const visitor = this.testVisitors[0];
          
          // Get current status
          const statusResponse = await request(this.app)
            .get(`/api/visitors/${visitor.id}/status`)
            .set('Authorization', `Bearer ${this.residentToken}`);
          
          expect(statusResponse.status).toBe(200);
          expect(statusResponse.body.success).toBe(true);
          expect(statusResponse.body.data.visitor.id).toBe(visitor.id);
          expect(statusResponse.body.data.statusHistory).toBeTruthy();
          
          return { success: true, details: 'Visitor status tracking working correctly' };
        }
      },
      {
        name: 'Visit Analytics - Statistics Dashboard',
        test: async () => {
          const response = await request(this.app)
            .get('/api/residents/visit-analytics')
            .set('Authorization', `Bearer ${this.residentToken}`);
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.analytics).toBeTruthy();
          expect(response.body.data.analytics.totalInvitations).toBeGreaterThanOrEqual(0);
          expect(response.body.data.analytics.approvedVisitors).toBeGreaterThanOrEqual(0);
          expect(response.body.data.analytics.completedVisits).toBeGreaterThanOrEqual(0);
          
          return { 
            success: true, 
            details: 'Visit analytics successfully retrieved',
            metrics: response.body.data.analytics
          };
        }
      },
      {
        name: 'Visitor Search - Filter and Search',
        test: async () => {
          const searchResponse = await request(this.app)
            .get('/api/visitors/search')
            .query({ 
              q: 'Test',
              status: 'APPROVED',
              dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
            })
            .set('Authorization', `Bearer ${this.residentToken}`);
          
          expect(searchResponse.status).toBe(200);
          expect(searchResponse.body.success).toBe(true);
          expect(Array.isArray(searchResponse.body.data.visitors)).toBe(true);
          
          // Verify search results match criteria
          searchResponse.body.data.visitors.forEach(visitor => {
            expect(visitor.name.toLowerCase()).toContain('test');
            expect(visitor.status).toBe('APPROVED');
          });
          
          return { 
            success: true, 
            details: `Search returned ${searchResponse.body.data.visitors.length} matching visitors`,
            metrics: { searchResults: searchResponse.body.data.visitors.length }
          };
        }
      },
      {
        name: 'Visitor Timeline - Activity History',
        test: async () => {
          const visitor = this.testVisitors[0];
          
          const timelineResponse = await request(this.app)
            .get(`/api/visitors/${visitor.id}/timeline`)
            .set('Authorization', `Bearer ${this.residentToken}`);
          
          expect(timelineResponse.status).toBe(200);
          expect(timelineResponse.body.success).toBe(true);
          expect(Array.isArray(timelineResponse.body.data.timeline)).toBe(true);
          expect(timelineResponse.body.data.timeline.length).toBeGreaterThan(0);
          
          // Verify timeline contains creation event
          const creationEvent = timelineResponse.body.data.timeline.find(
            event => event.action === 'visitor_created'
          );
          expect(creationEvent).toBeTruthy();
          
          return { 
            success: true, 
            details: `Visitor timeline contains ${timelineResponse.body.data.timeline.length} events`,
            metrics: { timelineEvents: timelineResponse.body.data.timeline.length }
          };
        }
      }
    ];

    await this.runTestSuite('visitorTracking', tests);
  }

  async validateNotificationPreferences() {
    console.log('🔔 Validating Notification Preferences...');
    
    const tests = [
      {
        name: 'Notification Settings - Email Preferences',
        test: async () => {
          const updateResponse = await request(this.app)
            .patch('/api/residents/notification-preferences')
            .set('Authorization', `Bearer ${this.residentToken}`)
            .send({
              emailNotifications: true,
              smsNotifications: false,
              pushNotifications: true,
              notificationTypes: ['visitor_arrival', 'visitor_approved', 'visitor_checked_in']
            });
          
          expect(updateResponse.status).toBe(200);
          expect(updateResponse.body.success).toBe(true);
          
          // Verify preferences were saved
          const getResponse = await request(this.app)
            .get('/api/residents/notification-preferences')
            .set('Authorization', `Bearer ${this.residentToken}`);
          
          expect(getResponse.status).toBe(200);
          expect(getResponse.body.data.preferences.emailNotifications).toBe(true);
          expect(getResponse.body.data.preferences.smsNotifications).toBe(false);
          expect(getResponse.body.data.preferences.pushNotifications).toBe(true);
          
          return { success: true, details: 'Notification preferences successfully updated' };
        }
      },
      {
        name: 'Notification Delivery - Email Notifications',
        test: async () => {
          // Create visitor to trigger notification
          const visitorResponse = await request(this.app)
            .post('/api/visitors')
            .set('Authorization', `Bearer ${this.residentToken}`)
            .send({
              name: 'Notification Test Visitor',
              phone: '+254712345555',
              email: 'notify@test.com',
              purpose: 'Test notification delivery'
            });
          
          expect(visitorResponse.status).toBe(201);
          
          // Check if notification was queued
          const notificationResponse = await request(this.app)
            .get('/api/residents/notifications/recent')
            .set('Authorization', `Bearer ${this.residentToken}`);
          
          expect(notificationResponse.status).toBe(200);
          expect(notificationResponse.body.data.notifications.length).toBeGreaterThan(0);
          
          const notification = notificationResponse.body.data.notifications[0];
          expect(notification.type).toBe('visitor_invitation_created');
          
          return { success: true, details: 'Email notification successfully delivered' };
        }
      },
      {
        name: 'Notification History - Message Archive',
        test: async () => {
          const response = await request(this.app)
            .get('/api/residents/notifications/history')
            .set('Authorization', `Bearer ${this.residentToken}`)
            .query({ limit: 10, page: 1 });
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(Array.isArray(response.body.data.notifications)).toBe(true);
          expect(response.body.data.pagination).toBeTruthy();
          
          return { 
            success: true, 
            details: `Retrieved ${response.body.data.notifications.length} notification history items`,
            metrics: { historyCount: response.body.data.notifications.length }
          };
        }
      },
      {
        name: 'Notification Channels - Multi-channel Delivery',
        test: async () => {
          // Test different notification channels
          const channelTests = [
            { channel: 'email', enabled: true },
            { channel: 'sms', enabled: false },
            { channel: 'push', enabled: true }
          ];
          
          for (const test of channelTests) {
            const response = await request(this.app)
              .patch(`/api/residents/notification-preferences/${test.channel}`)
              .set('Authorization', `Bearer ${this.residentToken}`)
              .send({ enabled: test.enabled });
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
          }
          
          return { success: true, details: 'Multi-channel notification preferences configured' };
        }
      },
      {
        name: 'Notification Timing - Quiet Hours',
        test: async () => {
          const quietHoursResponse = await request(this.app)
            .patch('/api/residents/notification-preferences/quiet-hours')
            .set('Authorization', `Bearer ${this.residentToken}`)
            .send({
              enabled: true,
              startTime: '22:00',
              endTime: '07:00',
              timezone: 'Africa/Nairobi'
            });
          
          expect(quietHoursResponse.status).toBe(200);
          expect(quietHoursResponse.body.success).toBe(true);
          
          // Verify quiet hours were saved
          const getResponse = await request(this.app)
            .get('/api/residents/notification-preferences')
            .set('Authorization', `Bearer ${this.residentToken}`);
          
          expect(getResponse.body.data.preferences.quietHours.enabled).toBe(true);
          expect(getResponse.body.data.preferences.quietHours.startTime).toBe('22:00');
          
          return { success: true, details: 'Quiet hours notification preferences configured' };
        }
      }
    ];

    await this.runTestSuite('notificationPreferences', tests);
  }

  async validateMobileAccess() {
    console.log('📱 Validating Mobile Access Features...');
    
    const tests = [
      {
        name: 'Mobile API - Optimized Responses',
        test: async () => {
          const response = await request(this.app)
            .get('/api/mobile/residents/dashboard')
            .set('Authorization', `Bearer ${this.residentToken}`)
            .set('User-Agent', 'SecureGate-Mobile/1.0 (iOS)');
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.layout).toBe('mobile');
          expect(response.body.data.widgets).toBeTruthy();
          expect(response.body.data.quickActions).toBeTruthy();
          
          return { success: true, details: 'Mobile-optimized dashboard successfully delivered' };
        }
      },
      {
        name: 'Mobile Invitations - Quick Invite',
        test: async () => {
          const quickInviteData = {
            name: 'Mobile Quick Invite',
            phone: '+254712345444',
            purpose: 'Quick mobile invitation'
          };
          
          const response = await request(this.app)
            .post('/api/mobile/visitors/quick-invite')
            .set('Authorization', `Bearer ${this.residentToken}`)
            .set('User-Agent', 'SecureGate-Mobile/1.0 (Android)')
            .send(quickInviteData);
          
          expect(response.status).toBe(201);
          expect(response.body.success).toBe(true);
          expect(response.body.data.visitor.name).toBe(quickInviteData.name);
          expect(response.body.data.qrCodeUrl).toBeTruthy();
          
          return { success: true, details: 'Mobile quick invite successfully created' };
        }
      },
      {
        name: 'Mobile Performance - Response Times',
        test: async () => {
          const startTime = Date.now();
          
          const response = await request(this.app)
            .get('/api/mobile/visitors/recent')
            .set('Authorization', `Bearer ${this.residentToken}`)
            .set('User-Agent', 'SecureGate-Mobile/1.0 (iOS)');
          
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(responseTime).toBeLessThan(500); // Mobile should be < 500ms
          
          return { 
            success: true, 
            details: `Mobile API response time: ${responseTime}ms`,
            metrics: { responseTime, threshold: 500 }
          };
        }
      },
      {
        name: 'Offline Capability - Data Synchronization',
        test: async () => {
          const response = await request(this.app)
            .get('/api/mobile/offline/sync-data')
            .set('Authorization', `Bearer ${this.residentToken}`);
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.visitors).toBeTruthy();
          expect(response.body.data.preferences).toBeTruthy();
          expect(response.body.data.lastSync).toBeTruthy();
          
          return { success: true, details: 'Offline data synchronization working correctly' };
        }
      },
      {
        name: 'Push Notifications - Mobile Integration',
        test: async () => {
          const deviceTokenResponse = await request(this.app)
            .post('/api/mobile/push/register')
            .set('Authorization', `Bearer ${this.residentToken}`)
            .send({
              deviceToken: 'test-device-token-123',
              platform: 'ios',
              appVersion: '1.0.0'
            });
          
          expect(deviceTokenResponse.status).toBe(200);
          expect(deviceTokenResponse.body.success).toBe(true);
          
          // Test push notification delivery
          const pushResponse = await request(this.app)
            .post('/api/mobile/push/test')
            .set('Authorization', `Bearer ${this.residentToken}`)
            .send({
              message: 'Test push notification',
              type: 'visitor_arrival'
            });
          
          expect(pushResponse.status).toBe(200);
          expect(pushResponse.body.success).toBe(true);
          
          return { success: true, details: 'Push notification integration working correctly' };
        }
      }
    ];

    await this.runTestSuite('mobileAccess', tests);
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
        if (test.name.includes('Visitor Invitation') || 
            test.name.includes('Approval') || 
            test.name.includes('Tracking')) {
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
    console.log('📊 Generating Resident Validation Report...');
    
    // Calculate overall score
    const totalTests = Object.values(this.validationResults)
      .filter(category => typeof category === 'object' && category.passed !== undefined)
      .reduce((sum, category) => sum + category.passed + category.failed, 0);
    
    const totalPassed = Object.values(this.validationResults)
      .filter(category => typeof category === 'object' && category.passed !== undefined)
      .reduce((sum, category) => sum + category.passed, 0);
    
    this.validationResults.overall.score = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
    
    // Generate recommendations
    if (this.validationResults.visitorInvitation.failed > 0) {
      this.validationResults.overall.recommendations.push(
        'Improve visitor invitation validation and QR code generation'
      );
    }
    
    if (this.validationResults.approvalWorkflows.failed > 0) {
      this.validationResults.overall.recommendations.push(
        'Enhance approval workflow reliability and status management'
      );
    }
    
    if (this.validationResults.notificationPreferences.failed > 0) {
      this.validationResults.overall.recommendations.push(
        'Optimize notification delivery and preference management'
      );
    }
    
    if (this.validationResults.mobileAccess.failed > 0) {
      this.validationResults.overall.recommendations.push(
        'Improve mobile performance and offline capabilities'
      );
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      validator: 'Resident Functionality',
      requirements: ['1.4'],
      summary: {
        totalTests,
        totalPassed,
        totalFailed: totalTests - totalPassed,
        successRate: `${this.validationResults.overall.score.toFixed(2)}%`,
        criticalIssues: this.validationResults.overall.criticalIssues.length
      },
      categories: {
        visitorInvitation: this.validationResults.visitorInvitation,
        approvalWorkflows: this.validationResults.approvalWorkflows,
        visitorTracking: this.validationResults.visitorTracking,
        notificationPreferences: this.validationResults.notificationPreferences,
        mobileAccess: this.validationResults.mobileAccess
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
    
    console.log('\n📋 Resident Validation Report Summary:');
    console.log(`   Overall Score: ${report.summary.successRate}`);
    console.log(`   Tests Passed: ${report.summary.totalPassed}/${report.summary.totalTests}`);
    console.log(`   Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`   Production Status: ${report.productionReadiness.status}`);
    
    return report;
  }

  async cleanup() {
    console.log('🧹 Cleaning up Resident Validator...');
    
    // Clean up test data
    if (this.testVisitors.length > 0) {
      const visitorIds = this.testVisitors.map(v => v.id);
      await dbManager.query(
        `DELETE FROM visitors WHERE id = ANY($1)`,
        [visitorIds]
      );
    }
    
    if (this.testInvitations.length > 0) {
      const invitationIds = this.testInvitations.map(i => i.id);
      await dbManager.query(
        `DELETE FROM bulk_invites WHERE id = ANY($1)`,
        [invitationIds]
      );
    }
    
    await cleanupTestDatabase();
    console.log('✅ Resident Validator cleanup completed');
  }

  async validate() {
    try {
      await this.initialize();
      
      console.log('\n🏠 Starting Resident Functionality Validation...');
      console.log('Requirements: 1.4 - Resident role functionality');
      
      await this.validateVisitorInvitation();
      await this.validateApprovalWorkflows();
      await this.validateVisitorTracking();
      await this.validateNotificationPreferences();
      await this.validateMobileAccess();
      
      const report = await this.generateValidationReport();
      
      await this.cleanup();
      
      return report;
      
    } catch (error) {
      console.error('❌ Resident Validation failed:', error);
      await this.cleanup();
      throw error;
    }
  }
}

module.exports = { ResidentValidator };

// Export for standalone execution
if (require.main === module) {
  const validator = new ResidentValidator();
  validator.validate()
    .then(report => {
      console.log('\n✅ Resident Validation completed');
      console.log('📊 Final Report:', JSON.stringify(report, null, 2));
      process.exit(report.productionReadiness.status === 'READY' ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}