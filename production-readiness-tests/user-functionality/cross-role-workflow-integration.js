/**
 * Cross-Role Workflow Integration Tests
 * 
 * Comprehensive integration testing for cross-role workflows including
 * visitor invitation to checkout complete workflow, bulk invite management,
 * incident reporting workflows, user approval processes, and cross-role
 * collaboration scenarios.
 * 
 * Requirements: 1.7, 1.8
 */

const { expect } = require('@jest/globals');
const request = require('supertest');
const { getTestApp } = require('../../tests/utils/testApp');
const { setupTestDatabase, cleanupTestDatabase, createTestUsers, getAuthToken } = require('../../tests/setup');
const { dbManager } = require('../../secure-gate-access/server/src/database/db.enhanced');

class CrossRoleWorkflowIntegration {
  constructor() {
    this.app = getTestApp();
    this.tokens = {};
    this.users = {};
    this.testData = {
      visitors: [],
      incidents: [],
      bulkInvites: [],
      workflows: []
    };
    this.validationResults = {
      visitorWorkflow: { passed: 0, failed: 0, tests: [] },
      bulkInviteWorkflow: { passed: 0, failed: 0, tests: [] },
      incidentWorkflow: { passed: 0, failed: 0, tests: [] },
      userApprovalWorkflow: { passed: 0, failed: 0, tests: [] },
      collaborationScenarios: { passed: 0, failed: 0, tests: [] },
      overall: { score: 0, criticalIssues: [], recommendations: [] }
    };
  }

  async initialize() {
    console.log('🔧 Initializing Cross-Role Workflow Integration Tests...');
    
    await setupTestDatabase();
    const testUsers = await createTestUsers();
    
    // Store users and tokens for all roles
    this.users = testUsers;
    this.tokens.admin = await getAuthToken(testUsers.admin.email);
    this.tokens.guard = await getAuthToken(testUsers.guard.email);
    this.tokens.resident = await getAuthToken(testUsers.resident.email);
    
    console.log('✅ Cross-Role Workflow Integration Tests initialized');
  }

  async validateVisitorWorkflow() {
    console.log('👥 Validating Complete Visitor Workflow (Resident → Guard → Checkout)...');
    
    const tests = [
      {
        name: 'Complete Visitor Journey - Invitation to Checkout',
        test: async () => {
          // Step 1: Resident creates visitor invitation
          const invitationData = {
            name: 'Complete Journey Visitor',
            phone: '+254712345001',
            email: 'journey@test.com',
            purpose: 'Complete workflow test',
            expectedArrival: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
          };
          
          const createResponse = await request(this.app)
            .post('/api/visitors')
            .set('Authorization', `Bearer ${this.tokens.resident}`)
            .send(invitationData);
          
          expect(createResponse.status).toBe(201);
          const visitor = createResponse.body.data.visitor;
          this.testData.visitors.push(visitor);
          
          // Step 2: Resident approves visitor
          const approveResponse = await request(this.app)
            .patch(`/api/visitors/${visitor.id}/approve`)
            .set('Authorization', `Bearer ${this.tokens.resident}`)
            .send({ approved: true, notes: 'Approved for visit' });
          
          expect(approveResponse.status).toBe(200);
          expect(approveResponse.body.data.visitor.status).toBe('APPROVED');
          
          // Step 3: Guard validates QR code
          const qrValidateResponse = await request(this.app)
            .post('/api/visitors/validate-qr')
            .set('Authorization', `Bearer ${this.tokens.guard}`)
            .send({ qrCode: visitor.qr_code });
          
          expect(qrValidateResponse.status).toBe(200);
          expect(qrValidateResponse.body.data.visitor.id).toBe(visitor.id);
          
          // Step 4: Guard checks in visitor
          const checkinResponse = await request(this.app)
            .post(`/api/visitors/${visitor.id}/check-in`)
            .set('Authorization', `Bearer ${this.tokens.guard}`)
            .send({ 
              notes: 'Visitor arrived and checked in',
              guardId: this.users.guard.id 
            });
          
          expect(checkinResponse.status).toBe(200);
          expect(checkinResponse.body.data.visitor.status).toBe('ON_PREMISE');
          
          // Step 5: Guard checks out visitor
          const checkoutResponse = await request(this.app)
            .post(`/api/visitors/${visitor.id}/check-out`)
            .set('Authorization', `Bearer ${this.tokens.guard}`)
            .send({ 
              notes: 'Visit completed successfully',
              guardId: this.users.guard.id 
            });
          
          expect(checkoutResponse.status).toBe(200);
          expect(checkoutResponse.body.data.visitor.status).toBe('CHECKED_OUT');
          
          // Step 6: Verify workflow completion in audit logs
          const auditResponse = await request(this.app)
            .get('/api/admin/audit-logs')
            .query({ entity_id: visitor.id, entity_type: 'visitor' })
            .set('Authorization', `Bearer ${this.tokens.admin}`);
          
          expect(auditResponse.status).toBe(200);
          const auditLogs = auditResponse.body.data.logs;
          
          // Verify all workflow steps are logged
          const expectedActions = ['visitor_created', 'visitor_approved', 'visitor_checked_in', 'visitor_checked_out'];
          expectedActions.forEach(action => {
            const logEntry = auditLogs.find(log => log.action === action);
            expect(logEntry).toBeTruthy();
          });
          
          return { 
            success: true, 
            details: 'Complete visitor workflow executed successfully',
            metrics: { 
              workflowSteps: 6, 
              auditLogEntries: auditLogs.length,
              duration: new Date() - new Date(visitor.created_at)
            }
          };
        }
      },
      {
        name: 'Visitor Workflow - Error Handling and Recovery',
        test: async () => {
          // Create visitor
          const visitorResponse = await request(this.app)
            .post('/api/visitors')
            .set('Authorization', `Bearer ${this.tokens.resident}`)
            .send({
              name: 'Error Test Visitor',
              phone: '+254712345002',
              email: 'error@test.com',
              purpose: 'Error handling test'
            });
          
          const visitor = visitorResponse.body.data.visitor;
          
          // Try to check in without approval (should fail)
          const invalidCheckinResponse = await request(this.app)
            .post(`/api/visitors/${visitor.id}/check-in`)
            .set('Authorization', `Bearer ${this.tokens.guard}`)
            .send({ guardId: this.users.guard.id });
          
          expect(invalidCheckinResponse.status).toBe(400);
          expect(invalidCheckinResponse.body.error.code).toBe('VISITOR_NOT_APPROVED');
          
          // Approve visitor
          await request(this.app)
            .patch(`/api/visitors/${visitor.id}/approve`)
            .set('Authorization', `Bearer ${this.tokens.resident}`)
            .send({ approved: true });
          
          // Now check in should work
          const validCheckinResponse = await request(this.app)
            .post(`/api/visitors/${visitor.id}/check-in`)
            .set('Authorization', `Bearer ${this.tokens.guard}`)
            .send({ guardId: this.users.guard.id });
          
          expect(validCheckinResponse.status).toBe(200);
          
          // Try to check out without being checked in (should work since we just checked in)
          const checkoutResponse = await request(this.app)
            .post(`/api/visitors/${visitor.id}/check-out`)
            .set('Authorization', `Bearer ${this.tokens.guard}`)
            .send({ guardId: this.users.guard.id });
          
          expect(checkoutResponse.status).toBe(200);
          
          return { success: true, details: 'Error handling and recovery working correctly' };
        }
      },
      {
        name: 'Visitor Workflow - Concurrent Operations',
        test: async () => {
          // Create multiple visitors
          const visitors = [];
          for (let i = 0; i < 3; i++) {
            const response = await request(this.app)
              .post('/api/visitors')
              .set('Authorization', `Bearer ${this.tokens.resident}`)
              .send({
                name: `Concurrent Visitor ${i + 1}`,
                phone: `+25471234500${i + 3}`,
                email: `concurrent${i + 1}@test.com`,
                purpose: 'Concurrent operations test'
              });
            visitors.push(response.body.data.visitor);
          }
          
          // Approve all visitors concurrently
          const approvalPromises = visitors.map(visitor =>
            request(this.app)
              .patch(`/api/visitors/${visitor.id}/approve`)
              .set('Authorization', `Bearer ${this.tokens.resident}`)
              .send({ approved: true })
          );
          
          const approvalResponses = await Promise.all(approvalPromises);
          approvalResponses.forEach(response => {
            expect(response.status).toBe(200);
          });
          
          // Check in all visitors concurrently
          const checkinPromises = visitors.map(visitor =>
            request(this.app)
              .post(`/api/visitors/${visitor.id}/check-in`)
              .set('Authorization', `Bearer ${this.tokens.guard}`)
              .send({ guardId: this.users.guard.id })
          );
          
          const checkinResponses = await Promise.all(checkinPromises);
          checkinResponses.forEach(response => {
            expect(response.status).toBe(200);
          });
          
          return { 
            success: true, 
            details: 'Concurrent visitor operations handled correctly',
            metrics: { concurrentVisitors: visitors.length }
          };
        }
      }
    ];

    await this.runTestSuite('visitorWorkflow', tests);
  }

  async validateBulkInviteWorkflow() {
    console.log('📋 Validating Bulk Invite Management Workflow...');
    
    const tests = [
      {
        name: 'Bulk Invite Creation and Management',
        test: async () => {
          // Step 1: Resident creates bulk invite
          const bulkInviteData = {
            eventName: 'Community Meeting',
            date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
            time: '18:00',
            numGuests: 10,
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
          };
          
          const createResponse = await request(this.app)
            .post('/api/visitors/bulk-invite')
            .set('Authorization', `Bearer ${this.tokens.resident}`)
            .send(bulkInviteData);
          
          expect(createResponse.status).toBe(201);
          const bulkInvite = createResponse.body.data.bulkInvite;
          this.testData.bulkInvites.push(bulkInvite);
          
          // Step 2: Admin reviews bulk invite
          const reviewResponse = await request(this.app)
            .get(`/api/admin/bulk-invites/${bulkInvite.id}`)
            .set('Authorization', `Bearer ${this.tokens.admin}`);
          
          expect(reviewResponse.status).toBe(200);
          expect(reviewResponse.body.data.bulkInvite.event_name).toBe(bulkInviteData.eventName);
          
          // Step 3: Multiple visitors register using bulk invite code
          const registrations = [];
          for (let i = 0; i < 3; i++) {
            const regResponse = await request(this.app)
              .post(`/api/public/bulk-invite/${bulkInvite.invite_code}/register`)
              .send({
                name: `Bulk Visitor ${i + 1}`,
                phone: `+25471234510${i}`,
                email: `bulk${i + 1}@test.com`
              });
            
            expect(regResponse.status).toBe(201);
            registrations.push(regResponse.body.data.visitor);
          }
          
          // Step 4: Guard processes bulk check-ins
          const visitorIds = registrations.map(v => v.id);
          const bulkCheckinResponse = await request(this.app)
            .post('/api/visitors/bulk-check-in')
            .set('Authorization', `Bearer ${this.tokens.guard}`)
            .send({ 
              visitorIds,
              guardId: this.users.guard.id,
              notes: 'Bulk event check-in'
            });
          
          expect(bulkCheckinResponse.status).toBe(200);
          expect(bulkCheckinResponse.body.data.processed).toBe(visitorIds.length);
          
          // Step 5: Admin monitors bulk invite usage
          const usageResponse = await request(this.app)
            .get(`/api/admin/bulk-invites/${bulkInvite.id}/usage`)
            .set('Authorization', `Bearer ${this.tokens.admin}`);
          
          expect(usageResponse.status).toBe(200);
          expect(usageResponse.body.data.registrations).toBe(registrations.length);
          expect(usageResponse.body.data.checkedIn).toBe(registrations.length);
          
          return { 
            success: true, 
            details: 'Bulk invite workflow completed successfully',
            metrics: { 
              registrations: registrations.length,
              checkedIn: registrations.length,
              remainingSlots: bulkInvite.num_guests - registrations.length
            }
          };
        }
      },
      {
        name: 'Bulk Invite Capacity Management',
        test: async () => {
          // Create bulk invite with limited capacity
          const limitedBulkInvite = await request(this.app)
            .post('/api/visitors/bulk-invite')
            .set('Authorization', `Bearer ${this.tokens.resident}`)
            .send({
              eventName: 'Limited Capacity Event',
              date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              time: '15:00',
              numGuests: 2,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });
          
          const bulkInvite = limitedBulkInvite.body.data.bulkInvite;
          
          // Register up to capacity
          for (let i = 0; i < 2; i++) {
            const response = await request(this.app)
              .post(`/api/public/bulk-invite/${bulkInvite.invite_code}/register`)
              .send({
                name: `Limited Visitor ${i + 1}`,
                phone: `+25471234520${i}`,
                email: `limited${i + 1}@test.com`
              });
            expect(response.status).toBe(201);
          }
          
          // Try to register beyond capacity (should fail)
          const overCapacityResponse = await request(this.app)
            .post(`/api/public/bulk-invite/${bulkInvite.invite_code}/register`)
            .send({
              name: 'Over Capacity Visitor',
              phone: '+254712345299',
              email: 'overcapacity@test.com'
            });
          
          expect(overCapacityResponse.status).toBe(400);
          expect(overCapacityResponse.body.error.code).toBe('BULK_INVITE_FULL');
          
          return { success: true, details: 'Bulk invite capacity management working correctly' };
        }
      }
    ];

    await this.runTestSuite('bulkInviteWorkflow', tests);
  }

  async validateIncidentWorkflow() {
    console.log('🚨 Validating Incident Reporting Workflow...');
    
    const tests = [
      {
        name: 'Complete Incident Workflow - Creation to Resolution',
        test: async () => {
          // Step 1: Guard creates incident
          const incidentData = {
            category: 'security',
            severity: 'high',
            description: 'Unauthorized access attempt detected',
            priority: 1
          };
          
          const createResponse = await request(this.app)
            .post('/api/incidents')
            .set('Authorization', `Bearer ${this.tokens.guard}`)
            .send(incidentData);
          
          expect(createResponse.status).toBe(201);
          const incident = createResponse.body.data.incident;
          this.testData.incidents.push(incident);
          
          // Step 2: Admin reviews and assigns incident
          const assignResponse = await request(this.app)
            .patch(`/api/incidents/${incident.id}/assign`)
            .set('Authorization', `Bearer ${this.tokens.admin}`)
            .send({ 
              assigned_to: this.users.guard.id,
              notes: 'Assigned to security guard for investigation'
            });
          
          expect(assignResponse.status).toBe(200);
          expect(assignResponse.body.data.incident.assigned_to).toBe(this.users.guard.id);
          
          // Step 3: Guard updates incident status
          const updateResponse = await request(this.app)
            .patch(`/api/incidents/${incident.id}`)
            .set('Authorization', `Bearer ${this.tokens.guard}`)
            .send({ 
              status: 'in_progress',
              resolution: 'Investigating the security breach'
            });
          
          expect(updateResponse.status).toBe(200);
          expect(updateResponse.body.data.incident.status).toBe('in_progress');
          
          // Step 4: Guard resolves incident
          const resolveResponse = await request(this.app)
            .patch(`/api/incidents/${incident.id}/resolve`)
            .set('Authorization', `Bearer ${this.tokens.guard}`)
            .send({ 
              resolution: 'False alarm - system glitch resolved',
              status: 'resolved'
            });
          
          expect(resolveResponse.status).toBe(200);
          expect(resolveResponse.body.data.incident.status).toBe('resolved');
          
          // Step 5: Admin closes incident
          const closeResponse = await request(this.app)
            .patch(`/api/incidents/${incident.id}/close`)
            .set('Authorization', `Bearer ${this.tokens.admin}`)
            .send({ 
              notes: 'Incident resolved and closed'
            });
          
          expect(closeResponse.status).toBe(200);
          expect(closeResponse.body.data.incident.status).toBe('closed');
          
          return { 
            success: true, 
            details: 'Complete incident workflow executed successfully',
            metrics: { 
              workflowSteps: 5,
              resolutionTime: new Date() - new Date(incident.created_at)
            }
          };
        }
      },
      {
        name: 'Incident Escalation Workflow',
        test: async () => {
          // Create critical incident
          const criticalIncident = await request(this.app)
            .post('/api/incidents')
            .set('Authorization', `Bearer ${this.tokens.guard}`)
            .send({
              category: 'safety',
              severity: 'critical',
              description: 'Emergency situation requiring immediate attention',
              priority: 1
            });
          
          const incident = criticalIncident.body.data.incident;
          
          // Check if escalation notification was triggered
          const notificationResponse = await request(this.app)
            .get(`/api/incidents/${incident.id}/notifications`)
            .set('Authorization', `Bearer ${this.tokens.admin}`);
          
          expect(notificationResponse.status).toBe(200);
          expect(notificationResponse.body.data.notifications.length).toBeGreaterThan(0);
          
          // Verify escalation to admin
          const escalationResponse = await request(this.app)
            .patch(`/api/incidents/${incident.id}/escalate`)
            .set('Authorization', `Bearer ${this.tokens.guard}`)
            .send({ 
              escalated_to: this.users.admin.id,
              reason: 'Critical incident requires admin attention'
            });
          
          expect(escalationResponse.status).toBe(200);
          expect(escalationResponse.body.data.incident.escalated_to).toBe(this.users.admin.id);
          
          return { success: true, details: 'Incident escalation workflow working correctly' };
        }
      }
    ];

    await this.runTestSuite('incidentWorkflow', tests);
  }

  async validateUserApprovalWorkflow() {
    console.log('👤 Validating User Approval Workflow...');
    
    const tests = [
      {
        name: 'New User Registration and Approval Process',
        test: async () => {
          // Step 1: New user registers
          const registrationData = {
            username: 'newuser_test',
            email: 'newuser@test.com',
            password: 'NewUser123!',
            phone: '+254712345777',
            role: 'resident'
          };
          
          const registerResponse = await request(this.app)
            .post('/api/auth/register')
            .send(registrationData);
          
          expect(registerResponse.status).toBe(201);
          const newUser = registerResponse.body.data.user;
          expect(newUser.account_status).toBe('pending');
          
          // Step 2: Admin reviews pending users
          const pendingResponse = await request(this.app)
            .get('/api/admin/users/pending')
            .set('Authorization', `Bearer ${this.tokens.admin}`);
          
          expect(pendingResponse.status).toBe(200);
          const pendingUsers = pendingResponse.body.data.users;
          const pendingUser = pendingUsers.find(u => u.email === registrationData.email);
          expect(pendingUser).toBeTruthy();
          
          // Step 3: Admin approves user
          const approveResponse = await request(this.app)
            .patch(`/api/admin/users/${newUser.id}/approve`)
            .set('Authorization', `Bearer ${this.tokens.admin}`)
            .send({ 
              approved: true,
              notes: 'User approved for access'
            });
          
          expect(approveResponse.status).toBe(200);
          expect(approveResponse.body.data.user.account_status).toBe('active');
          
          // Step 4: User can now login
          const loginResponse = await request(this.app)
            .post('/api/auth/login')
            .send({
              email: registrationData.email,
              password: registrationData.password
            });
          
          expect(loginResponse.status).toBe(200);
          expect(loginResponse.body.data.user.account_status).toBe('active');
          
          // Cleanup
          await dbManager.query('DELETE FROM users WHERE id = $1', [newUser.id]);
          
          return { 
            success: true, 
            details: 'User approval workflow completed successfully',
            metrics: { approvalTime: new Date() - new Date(newUser.created_at) }
          };
        }
      },
      {
        name: 'User Role Change Workflow',
        test: async () => {
          // Create test user
          const testUser = await dbManager.query(
            `INSERT INTO users (username, email, password_hash, role, phone, verified, account_status, estate_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
              'rolechange_test', 'rolechange@test.com', 'hashed_password',
              'resident', '+254712345888', true, 'active', this.users.admin.estate_id
            ]
          );
          
          const user = testUser.rows[0];
          
          // Admin changes user role
          const roleChangeResponse = await request(this.app)
            .patch(`/api/admin/users/${user.id}/role`)
            .set('Authorization', `Bearer ${this.tokens.admin}`)
            .send({ 
              newRole: 'guard',
              reason: 'Promoted to security guard position'
            });
          
          expect(roleChangeResponse.status).toBe(200);
          expect(roleChangeResponse.body.data.user.role).toBe('guard');
          
          // Verify role change is logged
          const auditResponse = await request(this.app)
            .get('/api/admin/audit-logs')
            .query({ entity_id: user.id, action: 'user_role_changed' })
            .set('Authorization', `Bearer ${this.tokens.admin}`);
          
          expect(auditResponse.status).toBe(200);
          expect(auditResponse.body.data.logs.length).toBeGreaterThan(0);
          
          // Cleanup
          await dbManager.query('DELETE FROM users WHERE id = $1', [user.id]);
          
          return { success: true, details: 'User role change workflow working correctly' };
        }
      }
    ];

    await this.runTestSuite('userApprovalWorkflow', tests);
  }

  async validateCollaborationScenarios() {
    console.log('🤝 Validating Cross-Role Collaboration Scenarios...');
    
    const tests = [
      {
        name: 'Multi-Role Incident Response Collaboration',
        test: async () => {
          // Guard creates incident
          const incidentResponse = await request(this.app)
            .post('/api/incidents')
            .set('Authorization', `Bearer ${this.tokens.guard}`)
            .send({
              category: 'security',
              severity: 'high',
              description: 'Suspicious activity requiring multi-role response'
            });
          
          const incident = incidentResponse.body.data.incident;
          
          // Admin assigns incident and adds notes
          await request(this.app)
            .patch(`/api/incidents/${incident.id}/assign`)
            .set('Authorization', `Bearer ${this.tokens.admin}`)
            .send({ 
              assigned_to: this.users.guard.id,
              notes: 'Coordinating with security team'
            });
          
          // Resident reports additional information
          const residentUpdateResponse = await request(this.app)
            .post(`/api/incidents/${incident.id}/comments`)
            .set('Authorization', `Bearer ${this.tokens.resident}`)
            .send({ 
              comment: 'I witnessed the suspicious activity and can provide details',
              type: 'witness_statement'
            });
          
          expect(residentUpdateResponse.status).toBe(201);
          
          // Guard updates investigation progress
          await request(this.app)
            .patch(`/api/incidents/${incident.id}`)
            .set('Authorization', `Bearer ${this.tokens.guard}`)
            .send({ 
              status: 'in_progress',
              resolution: 'Investigating with witness statement from resident'
            });
          
          // Admin reviews collaboration
          const collaborationResponse = await request(this.app)
            .get(`/api/incidents/${incident.id}/collaboration`)
            .set('Authorization', `Bearer ${this.tokens.admin}`);
          
          expect(collaborationResponse.status).toBe(200);
          expect(collaborationResponse.body.data.participants.length).toBe(3); // Guard, Admin, Resident
          
          return { 
            success: true, 
            details: 'Multi-role incident collaboration working correctly',
            metrics: { participants: 3, collaborationSteps: 4 }
          };
        }
      },
      {
        name: 'Visitor Management Collaboration',
        test: async () => {
          // Resident creates visitor
          const visitorResponse = await request(this.app)
            .post('/api/visitors')
            .set('Authorization', `Bearer ${this.tokens.resident}`)
            .send({
              name: 'Collaboration Test Visitor',
              phone: '+254712345999',
              email: 'collab@test.com',
              purpose: 'Multi-role collaboration test'
            });
          
          const visitor = visitorResponse.body.data.visitor;
          
          // Admin reviews visitor (special case)
          const adminReviewResponse = await request(this.app)
            .get(`/api/admin/visitors/${visitor.id}/review`)
            .set('Authorization', `Bearer ${this.tokens.admin}`);
          
          expect(adminReviewResponse.status).toBe(200);
          
          // Resident approves visitor
          await request(this.app)
            .patch(`/api/visitors/${visitor.id}/approve`)
            .set('Authorization', `Bearer ${this.tokens.resident}`)
            .send({ approved: true });
          
          // Guard processes visitor
          await request(this.app)
            .post(`/api/visitors/${visitor.id}/check-in`)
            .set('Authorization', `Bearer ${this.tokens.guard}`)
            .send({ guardId: this.users.guard.id });
          
          // Admin monitors the process
          const monitoringResponse = await request(this.app)
            .get(`/api/admin/visitors/${visitor.id}/activity`)
            .set('Authorization', `Bearer ${this.tokens.admin}`);
          
          expect(monitoringResponse.status).toBe(200);
          expect(monitoringResponse.body.data.activities.length).toBeGreaterThan(0);
          
          return { 
            success: true, 
            details: 'Visitor management collaboration working correctly',
            metrics: { roleParticipation: 3, processSteps: 4 }
          };
        }
      },
      {
        name: 'Cross-Role Communication and Notifications',
        test: async () => {
          // Create a scenario that triggers cross-role notifications
          const emergencyIncident = await request(this.app)
            .post('/api/incidents')
            .set('Authorization', `Bearer ${this.tokens.guard}`)
            .send({
              category: 'emergency',
              severity: 'critical',
              description: 'Emergency requiring immediate multi-role response'
            });
          
          const incident = emergencyIncident.body.data.incident;
          
          // Check notifications for all roles
          const adminNotifications = await request(this.app)
            .get('/api/notifications/recent')
            .set('Authorization', `Bearer ${this.tokens.admin}`);
          
          const guardNotifications = await request(this.app)
            .get('/api/notifications/recent')
            .set('Authorization', `Bearer ${this.tokens.guard}`);
          
          const residentNotifications = await request(this.app)
            .get('/api/notifications/recent')
            .set('Authorization', `Bearer ${this.tokens.resident}`);
          
          // Verify notifications were sent to appropriate roles
          expect(adminNotifications.status).toBe(200);
          expect(guardNotifications.status).toBe(200);
          expect(residentNotifications.status).toBe(200);
          
          // Admin should have emergency notifications
          const adminEmergencyNotif = adminNotifications.body.data.notifications.find(
            n => n.type === 'emergency_incident'
          );
          expect(adminEmergencyNotif).toBeTruthy();
          
          return { 
            success: true, 
            details: 'Cross-role communication and notifications working correctly',
            metrics: { 
              adminNotifications: adminNotifications.body.data.notifications.length,
              guardNotifications: guardNotifications.body.data.notifications.length,
              residentNotifications: residentNotifications.body.data.notifications.length
            }
          };
        }
      },
      {
        name: 'Data Consistency Across Roles',
        test: async () => {
          // Create visitor through resident
          const visitorResponse = await request(this.app)
            .post('/api/visitors')
            .set('Authorization', `Bearer ${this.tokens.resident}`)
            .send({
              name: 'Consistency Test Visitor',
              phone: '+254712345888',
              email: 'consistency@test.com',
              purpose: 'Data consistency test'
            });
          
          const visitor = visitorResponse.body.data.visitor;
          
          // Verify data consistency across different role views
          const residentView = await request(this.app)
            .get(`/api/visitors/${visitor.id}`)
            .set('Authorization', `Bearer ${this.tokens.resident}`);
          
          const guardView = await request(this.app)
            .get(`/api/visitors/${visitor.id}`)
            .set('Authorization', `Bearer ${this.tokens.guard}`);
          
          const adminView = await request(this.app)
            .get(`/api/admin/visitors/${visitor.id}`)
            .set('Authorization', `Bearer ${this.tokens.admin}`);
          
          // Verify core data is consistent
          expect(residentView.body.data.visitor.name).toBe(visitor.name);
          expect(guardView.body.data.visitor.name).toBe(visitor.name);
          expect(adminView.body.data.visitor.name).toBe(visitor.name);
          
          // Verify role-specific data access
          expect(residentView.body.data.visitor.created_by).toBe(this.users.resident.email);
          expect(guardView.body.data.visitor.qr_code).toBeTruthy();
          expect(adminView.body.data.visitor.audit_trail).toBeTruthy();
          
          return { 
            success: true, 
            details: 'Data consistency across roles maintained correctly',
            metrics: { roleViews: 3, dataFields: Object.keys(visitor).length }
          };
        }
      }
    ];

    await this.runTestSuite('collaborationScenarios', tests);
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
        
        // Add to critical issues if it's a core workflow test
        if (test.name.includes('Complete') || 
            test.name.includes('Multi-Role') || 
            test.name.includes('Data Consistency')) {
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
    console.log('📊 Generating Cross-Role Workflow Integration Report...');
    
    // Calculate overall score
    const totalTests = Object.values(this.validationResults)
      .filter(category => typeof category === 'object' && category.passed !== undefined)
      .reduce((sum, category) => sum + category.passed + category.failed, 0);
    
    const totalPassed = Object.values(this.validationResults)
      .filter(category => typeof category === 'object' && category.passed !== undefined)
      .reduce((sum, category) => sum + category.passed, 0);
    
    this.validationResults.overall.score = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
    
    // Generate recommendations
    if (this.validationResults.visitorWorkflow.failed > 0) {
      this.validationResults.overall.recommendations.push(
        'Improve visitor workflow error handling and state management'
      );
    }
    
    if (this.validationResults.incidentWorkflow.failed > 0) {
      this.validationResults.overall.recommendations.push(
        'Enhance incident workflow escalation and notification systems'
      );
    }
    
    if (this.validationResults.collaborationScenarios.failed > 0) {
      this.validationResults.overall.recommendations.push(
        'Optimize cross-role collaboration and communication mechanisms'
      );
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      validator: 'Cross-Role Workflow Integration',
      requirements: ['1.7', '1.8'],
      summary: {
        totalTests,
        totalPassed,
        totalFailed: totalTests - totalPassed,
        successRate: `${this.validationResults.overall.score.toFixed(2)}%`,
        criticalIssues: this.validationResults.overall.criticalIssues.length
      },
      categories: {
        visitorWorkflow: this.validationResults.visitorWorkflow,
        bulkInviteWorkflow: this.validationResults.bulkInviteWorkflow,
        incidentWorkflow: this.validationResults.incidentWorkflow,
        userApprovalWorkflow: this.validationResults.userApprovalWorkflow,
        collaborationScenarios: this.validationResults.collaborationScenarios
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
    
    console.log('\n📋 Cross-Role Workflow Integration Report Summary:');
    console.log(`   Overall Score: ${report.summary.successRate}`);
    console.log(`   Tests Passed: ${report.summary.totalPassed}/${report.summary.totalTests}`);
    console.log(`   Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`   Production Status: ${report.productionReadiness.status}`);
    
    return report;
  }

  async cleanup() {
    console.log('🧹 Cleaning up Cross-Role Workflow Integration Tests...');
    
    // Clean up test data
    if (this.testData.visitors.length > 0) {
      const visitorIds = this.testData.visitors.map(v => v.id);
      await dbManager.query(
        `DELETE FROM visitors WHERE id = ANY($1)`,
        [visitorIds]
      );
    }
    
    if (this.testData.incidents.length > 0) {
      const incidentIds = this.testData.incidents.map(i => i.id);
      await dbManager.query(
        `DELETE FROM incidents WHERE id = ANY($1)`,
        [incidentIds]
      );
    }
    
    if (this.testData.bulkInvites.length > 0) {
      const bulkInviteIds = this.testData.bulkInvites.map(i => i.id);
      await dbManager.query(
        `DELETE FROM bulk_invites WHERE id = ANY($1)`,
        [bulkInviteIds]
      );
    }
    
    await cleanupTestDatabase();
    console.log('✅ Cross-Role Workflow Integration Tests cleanup completed');
  }

  async validate() {
    try {
      await this.initialize();
      
      console.log('\n🔄 Starting Cross-Role Workflow Integration Validation...');
      console.log('Requirements: 1.7, 1.8 - Cross-role workflow integration');
      
      await this.validateVisitorWorkflow();
      await this.validateBulkInviteWorkflow();
      await this.validateIncidentWorkflow();
      await this.validateUserApprovalWorkflow();
      await this.validateCollaborationScenarios();
      
      const report = await this.generateValidationReport();
      
      await this.cleanup();
      
      return report;
      
    } catch (error) {
      console.error('❌ Cross-Role Workflow Integration Validation failed:', error);
      await this.cleanup();
      throw error;
    }
  }
}

module.exports = { CrossRoleWorkflowIntegration };

// Export for standalone execution
if (require.main === module) {
  const validator = new CrossRoleWorkflowIntegration();
  validator.validate()
    .then(report => {
      console.log('\n✅ Cross-Role Workflow Integration Validation completed');
      console.log('📊 Final Report:', JSON.stringify(report, null, 2));
      process.exit(report.productionReadiness.status === 'READY' ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}