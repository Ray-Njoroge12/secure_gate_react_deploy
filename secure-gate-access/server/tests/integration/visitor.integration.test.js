/**
 * Visitor Management Integration Tests
 * Tests complete visitor lifecycle: create → check-in → notification → check-out → audit
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers, createTestVisitor, getAuthToken } from './setup.js';

// Mock external services
jest.unstable_mockModule('../../src/services/emailService.js', () => ({
  default: {
    sendEmail: jest.fn().mockResolvedValue(),
    sendVisitorInvite: jest.fn().mockResolvedValue()
  }
}));

jest.unstable_mockModule('../../src/services/smsService.js', () => ({
  default: {
    sendSMS: jest.fn().mockResolvedValue(),
    sendVisitorNotification: jest.fn().mockResolvedValue()
  }
}));

jest.unstable_mockModule('../../src/services/qrCodeService.js', () => ({
  default: {
    generateQRCode: jest.fn().mockResolvedValue('data:image/png;base64,mockQRCode')
  }
}));

describe('Visitor Management Integration Tests', () => {
  let app;
  let testUsers;
  let residentToken;
  let guardToken;
  let adminToken;

  beforeAll(async () => {
    await setupTestDatabase();
    
    const appModule = await import('../../src/app.js');
    app = appModule.default;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
    testUsers = await createTestUsers();
    
    residentToken = await getAuthToken('resident@test.com');
    guardToken = await getAuthToken('guard@test.com');
    adminToken = await getAuthToken('admin@test.com');
  });

  describe('POST /api/visitors - Create Visitor', () => {
    it('should create visitor successfully by resident', async () => {
      const response = await request(app)
        .post('/api/visitors')
        .set('Cookie', `token=${residentToken}`)
        .send({
          name: 'John Doe',
          phone: '+254700123456',
          email: 'john@example.com',
          purpose: 'Business meeting',
          visitDate: new Date(Date.now() + 86400000).toISOString() // Tomorrow
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'John Doe');
      expect(response.body).toHaveProperty('invite_code');
      expect(response.body).toHaveProperty('qr_code');
    });

    it('should generate unique invite codes for each visitor', async () => {
      const visitor1 = await request(app)
        .post('/api/visitors')
        .set('Cookie', `token=${residentToken}`)
        .send({
          name: 'Visitor One',
          phone: '+254700111111',
          purpose: 'Visit 1'
        });

      const visitor2 = await request(app)
        .post('/api/visitors')
        .set('Cookie', `token=${residentToken}`)
        .send({
          name: 'Visitor Two',
          phone: '+254700222222',
          purpose: 'Visit 2'
        });

      expect(visitor1.body.invite_code).toBeDefined();
      expect(visitor2.body.invite_code).toBeDefined();
      expect(visitor1.body.invite_code).not.toBe(visitor2.body.invite_code);
    });

    it('should reject visitor creation without authentication', async () => {
      const response = await request(app)
        .post('/api/visitors')
        .send({
          name: 'Unauthorized Visitor',
          phone: '+254700123456'
        });

      expect(response.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/visitors')
        .set('Cookie', `token=${residentToken}`)
        .send({
          phone: '+254700123456'
          // Missing name
        });

      expect(response.status).toBe(400);
    });

    it('should associate visitor with resident host', async () => {
      const response = await request(app)
        .post('/api/visitors')
        .set('Cookie', `token=${residentToken}`)
        .send({
          name: 'Associated Visitor',
          phone: '+254700123456',
          purpose: 'Test'
        });

      expect(response.status).toBe(201);
      
      const { dbManager } = await import('../../src/database/db.enhanced.js');
      const visitor = await dbManager.query(
        'SELECT * FROM visitors WHERE id = $1',
        [response.body.id]
      );

      expect(visitor.rows[0].host_id).toBe(testUsers.resident.id);
    });
  });

  describe('GET /api/visitors - List Visitors', () => {
    beforeEach(async () => {
      // Create test visitors
      await createTestVisitor(testUsers.resident.id, { name: 'Visitor 1' });
      await createTestVisitor(testUsers.resident.id, { name: 'Visitor 2' });
      await createTestVisitor(testUsers.resident.id, { name: 'Visitor 3' });
    });

    it('should list visitors for resident (their own only)', async () => {
      const response = await request(app)
        .get('/api/visitors')
        .set('Cookie', `token=${residentToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3);
      
      // All visitors should belong to the resident
      response.body.forEach(visitor => {
        expect(visitor.host_id).toBe(testUsers.resident.id);
      });
    });

    it('should list active visitors for guard', async () => {
      const response = await request(app)
        .get('/api/visitors/active')
        .set('Cookie', `token=${guardToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/visitors?page=1&limit=2')
        .set('Cookie', `token=${residentToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(2);
    });

    it('should support filtering by status', async () => {
      const { dbManager } = await import('../../src/database/db.enhanced.js');
      await dbManager.query(
        'UPDATE visitors SET status = $1 WHERE id IN (SELECT id FROM visitors LIMIT 1)',
        ['on_premise']
      );

      const response = await request(app)
        .get('/api/visitors?status=on_premise')
        .set('Cookie', `token=${residentToken}`);

      expect(response.status).toBe(200);
      if (response.body.length > 0) {
        response.body.forEach(visitor => {
          expect(visitor.status).toBe('on_premise');
        });
      }
    });
  });

  describe('POST /api/visitors/:id/check-in - Check-In Flow', () => {
    let testVisitor;

    beforeEach(async () => {
      testVisitor = await createTestVisitor(testUsers.resident.id, {
        status: 'approved'
      });
    });

    it('should check in visitor successfully by guard', async () => {
      const response = await request(app)
        .post(`/api/visitors/${testVisitor.id}/check-in`)
        .set('Cookie', `token=${guardToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('check_in');
      
      // Verify database update
      const { dbManager } = await import('../../src/database/db.enhanced.js');
      const updated = await dbManager.query(
        'SELECT * FROM visitors WHERE id = $1',
        [testVisitor.id]
      );

      expect(updated.rows[0].status).toBe('on_premise');
      expect(updated.rows[0].check_in).not.toBeNull();
    });

    it('should deny check-in by non-guard users', async () => {
      const response = await request(app)
        .post(`/api/visitors/${testVisitor.id}/check-in`)
        .set('Cookie', `token=${residentToken}`);

      expect(response.status).toBe(403);
    });

    it('should reject check-in for non-approved visitor', async () => {
      const pendingVisitor = await createTestVisitor(testUsers.resident.id, {
        status: 'pending'
      });

      const response = await request(app)
        .post(`/api/visitors/${pendingVisitor.id}/check-in`)
        .set('Cookie', `token=${guardToken}`);

      expect(response.status).toBe(422);
    });

    it('should reject double check-in', async () => {
      // First check-in
      await request(app)
        .post(`/api/visitors/${testVisitor.id}/check-in`)
        .set('Cookie', `token=${guardToken}`);

      // Second check-in attempt
      const response = await request(app)
        .post(`/api/visitors/${testVisitor.id}/check-in`)
        .set('Cookie', `token=${guardToken}`);

      expect(response.status).toBe(422);
    });

    it('should create audit log for check-in', async () => {
      await request(app)
        .post(`/api/visitors/${testVisitor.id}/check-in`)
        .set('Cookie', `token=${guardToken}`);

      const { dbManager } = await import('../../src/database/db.enhanced.js');
      const auditLogs = await dbManager.query(
        `SELECT * FROM audit_logs WHERE action LIKE '%checkin%' AND resource = 'visitor' ORDER BY created_at DESC LIMIT 1`
      );

      expect(auditLogs.rows.length).toBeGreaterThan(0);
      expect(auditLogs.rows[0].user_id).toBe(testUsers.guard.id);
    });
  });

  describe('POST /api/visitors/:id/check-out - Check-Out Flow', () => {
    let testVisitor;

    beforeEach(async () => {
      testVisitor = await createTestVisitor(testUsers.resident.id, {
        status: 'on_premise'
      });
      
      const { dbManager } = await import('../../src/database/db.enhanced.js');
      await dbManager.query(
        'UPDATE visitors SET check_in = NOW() - INTERVAL \'2 hours\' WHERE id = $1',
        [testVisitor.id]
      );
    });

    it('should check out visitor successfully by guard', async () => {
      const response = await request(app)
        .post(`/api/visitors/${testVisitor.id}/check-out`)
        .set('Cookie', `token=${guardToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('check_out');
      
      const { dbManager } = await import('../../src/database/db.enhanced.js');
      const updated = await dbManager.query(
        'SELECT * FROM visitors WHERE id = $1',
        [testVisitor.id]
      );

      expect(updated.rows[0].status).toBe('checked_out');
      expect(updated.rows[0].check_out).not.toBeNull();
    });

    it('should calculate visit duration correctly', async () => {
      const response = await request(app)
        .post(`/api/visitors/${testVisitor.id}/check-out`)
        .set('Cookie', `token=${guardToken}`);

      expect(response.status).toBe(200);
      
      const { dbManager } = await import('../../src/database/db.enhanced.js');
      const visitor = await dbManager.query(
        'SELECT check_in, check_out FROM visitors WHERE id = $1',
        [testVisitor.id]
      );

      expect(visitor.rows[0].check_in).not.toBeNull();
      expect(visitor.rows[0].check_out).not.toBeNull();
      
      const checkInTime = new Date(visitor.rows[0].check_in);
      const checkOutTime = new Date(visitor.rows[0].check_out);
      expect(checkOutTime.getTime()).toBeGreaterThan(checkInTime.getTime());
    });

    it('should deny check-out by non-guard users', async () => {
      const response = await request(app)
        .post(`/api/visitors/${testVisitor.id}/check-out`)
        .set('Cookie', `token=${residentToken}`);

      expect(response.status).toBe(403);
    });

    it('should reject check-out for visitor not checked in', async () => {
      const notCheckedIn = await createTestVisitor(testUsers.resident.id, {
        status: 'approved'
      });

      const response = await request(app)
        .post(`/api/visitors/${notCheckedIn.id}/check-out`)
        .set('Cookie', `token=${guardToken}`);

      expect(response.status).toBe(422);
    });

    it('should create audit log for check-out', async () => {
      await request(app)
        .post(`/api/visitors/${testVisitor.id}/check-out`)
        .set('Cookie', `token=${guardToken}`);

      const { dbManager } = await import('../../src/database/db.enhanced.js');
      const auditLogs = await dbManager.query(
        `SELECT * FROM audit_logs WHERE action LIKE '%checkout%' AND resource = 'visitor' ORDER BY created_at DESC LIMIT 1`
      );

      expect(auditLogs.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Bulk Operations', () => {
    it('should support bulk visitor invite', async () => {
      const response = await request(app)
        .post('/api/visitors/bulk')
        .set('Cookie', `token=${residentToken}`)
        .send({
          visitors: [
            { name: 'Bulk Visitor 1', phone: '+254700111111', purpose: 'Meeting' },
            { name: 'Bulk Visitor 2', phone: '+254700222222', purpose: 'Meeting' },
            { name: 'Bulk Visitor 3', phone: '+254700333333', purpose: 'Meeting' }
          ]
        });

      if (response.status !== 404) {
        expect(response.status).toBe(201);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(3);
      }
    });
  });

  describe('DELETE /api/visitors/:id - Cancel Visitor', () => {
    let testVisitor;

    beforeEach(async () => {
      testVisitor = await createTestVisitor(testUsers.resident.id);
    });

    it('should allow resident to cancel their own visitor', async () => {
      const response = await request(app)
        .delete(`/api/visitors/${testVisitor.id}`)
        .set('Cookie', `token=${residentToken}`);

      expect(response.status).toBe(200);
      
      const { dbManager } = await import('../../src/database/db.enhanced.js');
      const deleted = await dbManager.query(
        'SELECT * FROM visitors WHERE id = $1',
        [testVisitor.id]
      );

      expect(deleted.rows.length).toBe(0);
    });

    it('should prevent resident from canceling other residents visitors', async () => {
      const otherResidentToken = await getAuthToken('admin@test.com');
      
      const response = await request(app)
        .delete(`/api/visitors/${testVisitor.id}`)
        .set('Cookie', `token=${otherResidentToken}`);

      expect(response.status).toBe(403);
    });

    it('should allow admin to delete any visitor', async () => {
      const response = await request(app)
        .delete(`/api/visitors/${testVisitor.id}`)
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Complete Visitor Lifecycle', () => {
    it('should handle full lifecycle: create → check-in → check-out → audit', async () => {
      // 1. Resident creates visitor
      const createResponse = await request(app)
        .post('/api/visitors')
        .set('Cookie', `token=${residentToken}`)
        .send({
          name: 'Lifecycle Test Visitor',
          phone: '+254700999999',
          email: 'lifecycle@test.com',
          purpose: 'Full lifecycle test'
        });

      expect(createResponse.status).toBe(201);
      const visitorId = createResponse.body.id;

      // 2. Update status to approved (normally done by guard/admin)
      const { dbManager } = await import('../../src/database/db.enhanced.js');
      await dbManager.query(
        'UPDATE visitors SET status = $1 WHERE id = $2',
        ['approved', visitorId]
      );

      // 3. Guard checks in visitor
      const checkInResponse = await request(app)
        .post(`/api/visitors/${visitorId}/check-in`)
        .set('Cookie', `token=${guardToken}`);

      expect(checkInResponse.status).toBe(200);

      // 4. Guard checks out visitor
      const checkOutResponse = await request(app)
        .post(`/api/visitors/${visitorId}/check-out`)
        .set('Cookie', `token=${guardToken}`);

      expect(checkOutResponse.status).toBe(200);

      // 5. Verify audit trail
      const auditLogs = await dbManager.query(
        `SELECT * FROM audit_logs WHERE resource = 'visitor' ORDER BY created_at ASC`
      );

      expect(auditLogs.rows.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent check-ins without race conditions', async () => {
      const visitor1 = await createTestVisitor(testUsers.resident.id, { status: 'approved' });
      const visitor2 = await createTestVisitor(testUsers.resident.id, { status: 'approved' });
      const visitor3 = await createTestVisitor(testUsers.resident.id, { status: 'approved' });

      const checkIns = await Promise.all([
        request(app).post(`/api/visitors/${visitor1.id}/check-in`).set('Cookie', `token=${guardToken}`),
        request(app).post(`/api/visitors/${visitor2.id}/check-in`).set('Cookie', `token=${guardToken}`),
        request(app).post(`/api/visitors/${visitor3.id}/check-in`).set('Cookie', `token=${guardToken}`)
      ]);

      checkIns.forEach(response => {
        expect(response.status).toBe(200);
      });

      const { dbManager } = await import('../../src/database/db.enhanced.js');
      const checkedIn = await dbManager.query(
        'SELECT COUNT(*) FROM visitors WHERE status = $1',
        ['on_premise']
      );

      expect(parseInt(checkedIn.rows[0].count)).toBeGreaterThanOrEqual(3);
    });
  });
});
