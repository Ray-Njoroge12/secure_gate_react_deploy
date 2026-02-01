/**
 * Security Guard Functionality Validator
 * 
 * Comprehensive validation system for Security Guard role functionality
 * including QR scanning, visitor check-in/check-out workflows, incident reporting,
 * real-time updates, and mobile optimization features.
 * 
 * Requirements: 1.3
 */

const { expect } = require('@jest/globals');
const request = require('supertest');
const { getTestApp } = require('../../tests/utils/testApp');
const { setupTestDatabase, cleanupTestDatabase, createTestUsers, getAuthToken } = require('../../tests/setup');
const { dbManager } = require('../../secure-gate-access/server/src/database/db.enhanced');

class SecurityGuardValidator {
  constructor() {
    this.app = getTestApp();
    this.guardToken = null;
    this.guardUser = null;
    this.testVisitors = [];
    this.testIncidents = [];
    this.validationResults = {
      qrScanning: { passed: 0, failed: 0, tests: [] },
      visitorWorkflows: { passed: 0, failed: 0, tests: [] },
      incidentReporting: { passed: 0, failed: 0, tests: [] },
      realTimeUpdates: { passed: 0, failed: 0, tests: [] },
      mobileOptimization: { passed: 0, failed: 0, tests: [] },
      overall: { score: 0, criticalIssues: [], recommendations: [] }
    };
  }

  async initialize() {
    console.log('🔧 Initializing Security Guard Validator...');
    
    await setupTestDatabase();
    const testUsers = await createTestUsers();
    this.guardUser = testUsers.guard;
    this.guardToken = await getAuthToken(this.guardUser.email);
    
    // Create test visitors for guard operations
    await this.createTestVisitors();
    
    console.log('✅ Security Guard Validator initialized');
  }

  async createTestVisitors() {
    const visitorData = [
      {
        name: 'Test Visitor 1',
        phone: '+254712345001',
        email: 'visitor1@test.com',
        purpose: 'Business meeting',
        status: 'APPROVED',
        invite_code: 'TEST-QR-001',
        qr_code: 'QR-DATA-001'
      },
      {
        name: 'Test Visitor 2', 
        phone: '+254712345002',
        email: 'visitor2@test.com',
        purpose: 'Delivery',
        status: 'PENDING',
        invite_code: 'TEST-QR-002',
        qr_code: 'QR-DATA-002'
      },
      {
        name: 'Test Visitor 3',
        phone: '+254712345003',
        email: 'visitor3@test.com',
        purpose: 'Maintenance',
        status: 'VERIFIED',
        invite_code: 'TEST-QR-003',
        qr_code: 'QR-DATA-003'
      }
    ];

    for (const visitor of visitorData) {
      const result = await dbManager.query(
        `INSERT INTO visitors (name, phone, email, purpose, status, invite_code, qr_code, estate_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          visitor.name, visitor.phone, visitor.email, visitor.purpose,
          visitor.status, visitor.invite_code, visitor.qr_code,
          this.guardUser.estate_id, this.guardUser.email
        ]
      );
      this.testVisitors.push(result.rows[0]);
    }
  }

  async validateQRScanningFunctionality() {
    console.log('🔍 Validating QR Scanning Functionality...');
    
    const tests = [
      {
        name: 'QR Code Validation - Valid Code',
        test: async () => {
          const visitor = this.testVisitors[0];
          const response = await request(this.app)
            .post('/api/visitors/validate-qr')
            .set('Authorization', `Bearer ${this.guardToken}`)
            .send({ qrCode: visitor.qr_code });
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.visitor.id).toBe(visitor.id);
          return { success: true, details: 'Valid QR code correctly validated' };
        }
      },
      {
        name: 'QR Code Validation - Invalid Code',
        test: async () => {
          const response = await request(this.app)
            .post('/api/visitors/validate-qr')
            .set('Authorization', `Bearer ${this.guardToken}`)
            .send({ qrCode: 'INVALID-QR-CODE' });
          
          expect(response.status).toBe(404);
          expect(response.body.success).toBe(false);
          return { success: true, details: 'Invalid QR code properly rejected' };
        }
      },
      {
        name: 'QR Code Scanning - Estate Scoping',
        test: async () => {
          // Create visitor in different estate
          const otherEstateVisitor = await dbManager.query(
            `INSERT INTO visitors (name, phone, email, purpose, status, invite_code, qr_code, estate_id, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [
              'Other Estate Visitor', '+254712345999', 'other@test.com', 'Visit',
              'APPROVED', 'OTHER-QR-001', 'OTHER-QR-DATA', 999, 'other@test.com'
            ]
          );

          const response = await request(this.app)
            .post('/api/visitors/validate-qr')
            .set('Authorization', `Bearer ${this.guardToken}`)
            .send({ qrCode: otherEstateVisitor.rows[0].qr_code });
          
          expect(response.status).toBe(404);
          expect(response.body.success).toBe(false);
          
          // Cleanup
          await dbManager.query('DELETE FROM visitors WHERE id = $1', [otherEstateVisitor.rows[0].id]);
          
          return { success: true, details: 'Estate scoping properly enforced for QR scanning' };
        }
      },
      {
        name: 'QR Code Performance - Bulk Validation',
        test: async () => {
          const startTime = Date.now();
          const promises = [];
          
          // Test 10 concurrent QR validations
          for (let i = 0; i < 10; i++) {
            const visitor = this.testVisitors[i % this.testVisitors.length];
            promises.push(
              request(this.app)
                .post('/api/visitors/validate-qr')
                .set('Authorization', `Bearer ${this.guardToken}`)
                .send({ qrCode: visitor.qr_code })
            );
          }
          
          const responses = await Promise.all(promises);
          const endTime = Date.now();
          const totalTime = endTime - startTime;
          
          // All should succeed
          responses.forEach(response => {
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
          });
          
          // Should complete within reasonable time (< 2 seconds)
          expect(totalTime).toBeLessThan(2000);
          
          return { 
            success: true, 
            details: `Bulk QR validation completed in ${totalTime}ms`,
            metrics: { totalTime, requestCount: 10, avgTime: totalTime / 10 }
          };
        }
      }
    ];

    await this.runTestSuite('qrScanning', tests);
  }

  async validateVisitorWorkflows() {
    console.log('👥 Validating Visitor Check-in/Check-out Workflows...');
    
    const tests = [
      {
        name: 'Visitor Check-in - Approved Visitor',
        test: async () => {
          const visitor = this.testVisitors.find(v => v.status === 'APPROVED');
          
          const response = await request(this.app)
            .post(`/api/visitors/${visitor.id}/check-in`)
            .set('Authorization', `Bearer ${this.guardToken}`)
            .send({ 
              notes: 'Visitor arrived on time',
              guardId: this.guardUser.id 
            });
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.visitor.status).toBe('ON_PREMISE');
          expect(response.body.data.visitor.check_in_time).toBeTruthy();
          
          return { success: true, details: 'Approved visitor successfully checked in' };
        }
      },
      {
        name: 'Visitor Check-in - Pending Visitor Rejection',
        test: async () => {
          const visitor = this.testVisitors.find(v => v.status === 'PENDING');
          
          const response = await request(this.app)
            .post(`/api/visitors/${visitor.id}/check-in`)
            .set('Authorization', `Bearer ${this.guardToken}`)
            .send({ 
              notes: 'Attempted check-in of pending visitor',
              guardId: this.guardUser.id 
            });
          
          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
          expect(response.body.error.code).toBe('VISITOR_NOT_APPROVED');
          
          return { success: true, details: 'Pending visitor check-in properly rejected' };
        }
      },
      {
        name: 'Visitor Check-out - On Premise Visitor',
        test: async () => {
          // First ensure visitor is checked in
          const visitor = this.testVisitors.find(v => v.status === 'VERIFIED');
          
          await request(this.app)
            .post(`/api/visitors/${visitor.id}/check-in`)
            .set('Authorization', `Bearer ${this.guardToken}`)
            .send({ 
              notes: 'Check-in for checkout test',
              guardId: this.guardUser.id 
            });
          
          // Now test check-out
          const response = await request(this.app)
            .post(`/api/visitors/${visitor.id}/check-out`)
            .set('Authorization', `Bearer ${this.guardToken}`)
            .send({ 
              notes: 'Visit completed successfully',
              guardId: this.guardUser.id 
            });
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.visitor.status).toBe('CHECKED_OUT');
          expect(response.body.data.visitor.check_out_time).toBeTruthy();
          
          return { success: true, details: 'On-premise visitor successfully checked out' };
        }
      },
      {
        name: 'Visitor Status Updates - Real-time Tracking',
        test: async () => {
          const visitor = this.testVisitors[0];
          
          // Get initial status
          const initialResponse = await request(this.app)
            .get(`/api/visitors/${visitor.id}`)
            .set('Authorization', `Bearer ${this.guardToken}`);
          
          expect(initialResponse.status).toBe(200);
          const initialStatus = initialResponse.body.data.visitor.status;
          
          // Update status
          const updateResponse = await request(this.app)
            .patch(`/api/visitors/${visitor.id}/status`)
            .set('Authorization', `Bearer ${this.guardToken}`)
            .send({ 
              status: 'VERIFIED',
              notes: 'Status updated by guard'
            });
          
          expect(updateResponse.status).toBe(200);
          expect(updateResponse.body.data.visitor.status).toBe('VERIFIED');
          expect(updateResponse.body.data.visitor.status).not.toBe(initialStatus);
          
          return { success: true, details: 'Visitor status successfully updated with tracking' };
        }
      },
      {
        name: 'Bulk Visitor Operations - Multiple Check-ins',
        test: async () => {
          const visitorIds = this.testVisitors
            .filter(v => ['APPROVED', 'VERIFIED'].includes(v.status))
            .map(v => v.id);
          
          const response = await request(this.app)
            .post('/api/visitors/bulk-check-in')
            .set('Authorization', `Bearer ${this.guardToken}`)
            .send({ 
              visitorIds,
              guardId: this.guardUser.id,
              notes: 'Bulk check-in operation'
            });
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.processed).toBe(visitorIds.length);
          expect(response.body.data.successful).toBeGreaterThan(0);
          
          return { 
            success: true, 
            details: `Bulk check-in processed ${response.body.data.processed} visitors`,
            metrics: response.body.data
          };
        }
      }
    ];

    await this.runTestSuite('visitorWorkflows', tests);
  }

  async validateIncidentReporting() {
    console.log('📋 Validating Incident Reporting Capabilities...');
    
    const tests = [
      {
        name: 'Incident Creation - Security Incident',
        test: async () => {
          const incidentData = {
            category: 'security',
            severity: 'high',
            description: 'Unauthorized access attempt detected',
            visitor_id: this.testVisitors[0].id,
            priority: 1
          };
          
          const response = await request(this.app)
            .post('/api/incidents')
            .set('Authorization', `Bearer ${this.guardToken}`)
            .send(incidentData);
          
          expect(response.status).toBe(201);
          expect(response.body.success).toBe(true);
          expect(response.body.data.incident.category).toBe('security');
          expect(response.body.data.incident.severity).toBe('high');
          expect(response.body.data.incident.guard_id).toBe(this.guardUser.id);
          
          this.testIncidents.push(response.body.data.incident);
          
          return { success: true, details: 'Security incident successfully created' };
        }
      },
      {
        name: 'Incident Updates - Status Progression',
        test: async () => {
          const incident = this.testIncidents[0];
          
          const updateResponse = await request(this.app)
            .patch(`/api/incidents/${incident.id}`)
            .set('Authorization', `Bearer ${this.guardToken}`)
            .send({ 
              status: 'in_progress',
              resolution: 'Investigating the incident'
            });
          
          expect(updateResponse.status).toBe(200);
          expect(updateResponse.body.success).toBe(true);
          expect(updateResponse.body.data.incident.status).toBe('in_progress');
          
          return { success: true, details: 'Incident status successfully updated' };
        }
      },
      {
        name: 'Incident Assignment - Guard Assignment',
        test: async () => {
          const incident = this.testIncidents[0];
          
          const response = await request(this.app)
            .patch(`/api/incidents/${incident.id}/assign`)
            .set('Authorization', `Bearer ${this.guardToken}`)
            .send({ 
              assigned_to: this.guardUser.id,
              notes: 'Self-assigned for resolution'
            });
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.incident.assigned_to).toBe(this.guardUser.id);
          
          return { success: true, details: 'Incident successfully assigned to guard' };
        }
      },
      {
        name: 'Incident Escalation - Priority Escalation',
        test: async () => {
          const highPriorityIncident = {
            category: 'safety',
            severity: 'critical',
            description: 'Emergency situation requiring immediate attention',
            priority: 1
          };
          
          const response = await request(this.app)
            .post('/api/incidents')
            .set('Authorization', `Bearer ${this.guardToken}`)
            .send(highPriorityIncident);
          
          expect(response.status).toBe(201);
          expect(response.body.success).toBe(true);
          expect(response.body.data.incident.severity).toBe('critical');
          
          // Check if escalation notification was triggered
          const incident = response.body.data.incident;
          const notificationResponse = await request(this.app)
            .get(`/api/incidents/${incident.id}/notifications`)
            .set('Authorization', `Bearer ${this.guardToken}`);
          
          expect(notificationResponse.status).toBe(200);
          expect(notificationResponse.body.data.notifications.length).toBeGreaterThan(0);
          
          return { success: true, details: 'Critical incident properly escalated with notifications' };
        }
      }
    ];

    await this.runTestSuite('incidentReporting', tests);
  }

  async validateRealTimeUpdates() {
    console.log('⚡ Validating Real-time Update Functionality...');
    
    const tests = [
      {
        name: 'WebSocket Connection - Guard Dashboard',
        test: async () => {
          // Test WebSocket connection establishment
          const wsResponse = await request(this.app)
            .get('/api/ws/guard/connect')
            .set('Authorization', `Bearer ${this.guardToken}`);
          
          expect(wsResponse.status).toBe(200);
          expect(wsResponse.body.success).toBe(true);
          expect(wsResponse.body.data.connectionId).toBeTruthy();
          
          return { success: true, details: 'WebSocket connection established for guard dashboard' };
        }
      },
      {
        name: 'Real-time Visitor Updates - Status Changes',
        test: async () => {
          const visitor = this.testVisitors[0];
          
          // Subscribe to visitor updates
          const subscribeResponse = await request(this.app)
            .post('/api/ws/subscribe')
            .set('Authorization', `Bearer ${this.guardToken}`)
            .send({ 
              channel: 'visitor_updates',
              filters: { estate_id: this.guardUser.estate_id }
            });
          
          expect(subscribeResponse.status).toBe(200);
          
          // Trigger visitor status change
          await request(this.app)
            .patch(`/api/visitors/${visitor.id}/status`)
            .set('Authorization', `Bearer ${this.guardToken}`)
            .send({ status: 'APPROVED' });
          
          // Check for real-time update delivery
          const updatesResponse = await request(this.app)
            .get('/api/ws/updates')
            .set('Authorization', `Bearer ${this.guardToken}`);
          
          expect(updatesResponse.status).toBe(200);
          expect(updatesResponse.body.data.updates.length).toBeGreaterThan(0);
          
          return { success: true, details: 'Real-time visitor updates successfully delivered' };
        }
      },
      {
        name: 'Live Visitor Feed - Active Visitors',
        test: async () => {
          const response = await request(this.app)
            .get('/api/visitors/live-feed')
            .set('Authorization', `Bearer ${this.guardToken}`);
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(Array.isArray(response.body.data.visitors)).toBe(true);
          expect(response.body.data.lastUpdated).toBeTruthy();
          
          return { success: true, details: 'Live visitor feed successfully retrieved' };
        }
      },
      {
        name: 'Push Notifications - Incident Alerts',
        test: async () => {
          // Create high-priority incident to trigger notification
          const incidentData = {
            category: 'security',
            severity: 'critical',
            description: 'Test notification incident',
            priority: 1
          };
          
          const incidentResponse = await request(this.app)
            .post('/api/incidents')
            .set('Authorization', `Bearer ${this.guardToken}`)
            .send(incidentData);
          
          expect(incidentResponse.status).toBe(201);
          
          // Check notification delivery
          const notificationResponse = await request(this.app)
            .get('/api/notifications/recent')
            .set('Authorization', `Bearer ${this.guardToken}`);
          
          expect(notificationResponse.status).toBe(200);
          expect(notificationResponse.body.data.notifications.length).toBeGreaterThan(0);
          
          const notification = notificationResponse.body.data.notifications[0];
          expect(notification.type).toBe('incident_alert');
          expect(notification.priority).toBe('high');
          
          return { success: true, details: 'Push notifications successfully delivered for critical incidents' };
        }
      }
    ];

    await this.runTestSuite('realTimeUpdates', tests);
  }

  async validateMobileOptimization() {
    console.log('📱 Validating Mobile Optimization Features...');
    
    const tests = [
      {
        name: 'Mobile API Endpoints - Touch-Optimized Responses',
        test: async () => {
          const response = await request(this.app)
            .get('/api/mobile/guard/dashboard')
            .set('Authorization', `Bearer ${this.guardToken}`)
            .set('User-Agent', 'SecureGate-Mobile/1.0 (iOS)');
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.layout).toBe('mobile');
          expect(response.body.data.touchOptimized).toBe(true);
          
          return { success: true, details: 'Mobile-optimized API responses successfully delivered' };
        }
      },
      {
        name: 'Offline Capability - Data Caching',
        test: async () => {
          // Test offline data availability
          const response = await request(this.app)
            .get('/api/mobile/offline/visitors')
            .set('Authorization', `Bearer ${this.guardToken}`);
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.cached).toBe(true);
          expect(Array.isArray(response.body.data.visitors)).toBe(true);
          
          return { success: true, details: 'Offline data caching successfully implemented' };
        }
      },
      {
        name: 'Mobile Performance - Response Time Optimization',
        test: async () => {
          const startTime = Date.now();
          
          const response = await request(this.app)
            .get('/api/mobile/guard/quick-actions')
            .set('Authorization', `Bearer ${this.guardToken}`)
            .set('User-Agent', 'SecureGate-Mobile/1.0 (Android)');
          
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
        name: 'Progressive Web App - PWA Features',
        test: async () => {
          const response = await request(this.app)
            .get('/api/mobile/pwa/manifest')
            .set('Authorization', `Bearer ${this.guardToken}`);
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.manifest.name).toBeTruthy();
          expect(response.body.data.manifest.icons).toBeTruthy();
          expect(response.body.data.manifest.start_url).toBeTruthy();
          
          return { success: true, details: 'PWA manifest and features successfully configured' };
        }
      },
      {
        name: 'Touch Gesture Support - Swipe Actions',
        test: async () => {
          const visitor = this.testVisitors[0];
          
          // Test swipe-to-action API
          const response = await request(this.app)
            .post(`/api/mobile/visitors/${visitor.id}/swipe-action`)
            .set('Authorization', `Bearer ${this.guardToken}`)
            .send({ 
              action: 'check-in',
              gesture: 'swipe-right',
              touchData: { startX: 0, endX: 200, duration: 300 }
            });
          
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.actionExecuted).toBe('check-in');
          
          return { success: true, details: 'Touch gesture support successfully implemented' };
        }
      }
    ];

    await this.runTestSuite('mobileOptimization', tests);
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
        if (test.name.includes('QR Code Validation') || 
            test.name.includes('Check-in') || 
            test.name.includes('Incident Creation')) {
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
    console.log('📊 Generating Security Guard Validation Report...');
    
    // Calculate overall score
    const totalTests = Object.values(this.validationResults)
      .filter(category => typeof category === 'object' && category.passed !== undefined)
      .reduce((sum, category) => sum + category.passed + category.failed, 0);
    
    const totalPassed = Object.values(this.validationResults)
      .filter(category => typeof category === 'object' && category.passed !== undefined)
      .reduce((sum, category) => sum + category.passed, 0);
    
    this.validationResults.overall.score = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
    
    // Generate recommendations
    if (this.validationResults.qrScanning.failed > 0) {
      this.validationResults.overall.recommendations.push(
        'Improve QR code scanning reliability and error handling'
      );
    }
    
    if (this.validationResults.visitorWorkflows.failed > 0) {
      this.validationResults.overall.recommendations.push(
        'Enhance visitor workflow validation and status management'
      );
    }
    
    if (this.validationResults.realTimeUpdates.failed > 0) {
      this.validationResults.overall.recommendations.push(
        'Optimize real-time update delivery and WebSocket stability'
      );
    }
    
    if (this.validationResults.mobileOptimization.failed > 0) {
      this.validationResults.overall.recommendations.push(
        'Improve mobile performance and touch optimization'
      );
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      validator: 'Security Guard Functionality',
      requirements: ['1.3'],
      summary: {
        totalTests,
        totalPassed,
        totalFailed: totalTests - totalPassed,
        successRate: `${this.validationResults.overall.score.toFixed(2)}%`,
        criticalIssues: this.validationResults.overall.criticalIssues.length
      },
      categories: {
        qrScanning: this.validationResults.qrScanning,
        visitorWorkflows: this.validationResults.visitorWorkflows,
        incidentReporting: this.validationResults.incidentReporting,
        realTimeUpdates: this.validationResults.realTimeUpdates,
        mobileOptimization: this.validationResults.mobileOptimization
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
    
    console.log('\n📋 Security Guard Validation Report Summary:');
    console.log(`   Overall Score: ${report.summary.successRate}`);
    console.log(`   Tests Passed: ${report.summary.totalPassed}/${report.summary.totalTests}`);
    console.log(`   Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`   Production Status: ${report.productionReadiness.status}`);
    
    return report;
  }

  async cleanup() {
    console.log('🧹 Cleaning up Security Guard Validator...');
    
    // Clean up test data
    if (this.testVisitors.length > 0) {
      const visitorIds = this.testVisitors.map(v => v.id);
      await dbManager.query(
        `DELETE FROM visitors WHERE id = ANY($1)`,
        [visitorIds]
      );
    }
    
    if (this.testIncidents.length > 0) {
      const incidentIds = this.testIncidents.map(i => i.id);
      await dbManager.query(
        `DELETE FROM incidents WHERE id = ANY($1)`,
        [incidentIds]
      );
    }
    
    await cleanupTestDatabase();
    console.log('✅ Security Guard Validator cleanup completed');
  }

  async validate() {
    try {
      await this.initialize();
      
      console.log('\n🔍 Starting Security Guard Functionality Validation...');
      console.log('Requirements: 1.3 - Security Guard role functionality');
      
      await this.validateQRScanningFunctionality();
      await this.validateVisitorWorkflows();
      await this.validateIncidentReporting();
      await this.validateRealTimeUpdates();
      await this.validateMobileOptimization();
      
      const report = await this.generateValidationReport();
      
      await this.cleanup();
      
      return report;
      
    } catch (error) {
      console.error('❌ Security Guard Validation failed:', error);
      await this.cleanup();
      throw error;
    }
  }
}

module.exports = { SecurityGuardValidator };

// Export for standalone execution
if (require.main === module) {
  const validator = new SecurityGuardValidator();
  validator.validate()
    .then(report => {
      console.log('\n✅ Security Guard Validation completed');
      console.log('📊 Final Report:', JSON.stringify(report, null, 2));
      process.exit(report.productionReadiness.status === 'READY' ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}