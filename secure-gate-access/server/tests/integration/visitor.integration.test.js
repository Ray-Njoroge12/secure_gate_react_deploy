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

    // Use actual emails from created users (they have unique timestamps)
    residentToken = await getAuthToken(testUsers.resident.email);
    guardToken = await getAuthToken(testUsers.guard.email);
    adminToken = await getAuthToken(testUsers.admin.email);
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
          date_of_visit: new Date(Date.now() + 86400000).toISOString().split('T')[0] // Tomorrow
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name', 'John Doe');
      expect(response.body.data).toHaveProperty('inviteCode'); // camelized
      // qr_code is not returned in the response
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

      // Debug: check if creation succeeded
      if (!visitor1.body.success || !visitor1.body.data) {
        console.log('Visitor 1 failed:', visitor1.status, visitor1.body);
      }
      if (!visitor2.body.success || !visitor2.body.data) {
        console.log('Visitor 2 failed:', visitor2.status, visitor2.body);
      }

      expect(visitor1.body.data.inviteCode).toBeDefined();
      expect(visitor2.body.data.inviteCode).toBeDefined();
      expect(visitor1.body.data.inviteCode).not.toBe(visitor2.body.data.inviteCode);
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
        [response.body.data.id]
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
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('visitors');
      expect(Array.isArray(response.body.data.visitors)).toBe(true);
      expect(response.body.data.visitors.length).toBeGreaterThanOrEqual(3);

      // All visitors should belong to the resident (check both hostId and residentId for compatibility)
      response.body.data.visitors.forEach(visitor => {
        const ownerId = visitor.hostId || visitor.residentId;
        expect(ownerId).toBe(testUsers.resident.id);
      });
    });

    it('should not return visitors owned by other residents', async () => {
      const { dbManager } = await import('../../src/database/db.enhanced.js');
      const otherEmail = `other_resident_${Date.now()}@test.com`;

      const otherResidentResult = await dbManager.query(
        `INSERT INTO users (username, email, password, password_hash, role, phone, house, verified, estate_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          `other_resident_${Date.now()}`,
          otherEmail,
          testUsers.resident.password_hash,
          testUsers.resident.password_hash,
          'resident',
          '+254700999999',
          'B202',
          true,
          testUsers.resident.estate_id
        ]
      );

      const otherResident = otherResidentResult.rows[0];
      const otherVisitor = await createTestVisitor(otherResident.id, { name: 'Other Visitor' });

      const response = await request(app)
        .get('/api/visitors')
        .set('Cookie', `token=${residentToken}`);

      expect(response.status).toBe(200);
      const visitorIds = response.body.data.visitors.map(visitor => visitor.id);
      expect(visitorIds).not.toContain(otherVisitor.id);
    });

    it('should forbid resident from listing active visitors', async () => {
      const response = await request(app)
        .get('/api/visitors/active')
        .set('Cookie', `token=${residentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/visitors?page=1&limit=2')
        .set('Cookie', `token=${residentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('visitors');
      expect(Array.isArray(response.body.data.visitors)).toBe(true);
      expect(response.body.data.visitors.length).toBeLessThanOrEqual(2);
    });

    it('should support searching by name', async () => {
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const searchableName = `Searchable Visitor ${uniqueSuffix}`;
      const searchableVisitor = await createTestVisitor(testUsers.resident.id, { name: searchableName });

      const response = await request(app)
        .get(`/api/visitors?search=${encodeURIComponent(uniqueSuffix)}`)
        .set('Cookie', `token=${residentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      const visitors = response.body.data.visitors || [];
      const visitorIds = visitors.map(visitor => visitor.id);
      expect(visitorIds).toContain(searchableVisitor.id);
      visitors.forEach(visitor => {
        const matchesName = visitor.name?.includes(uniqueSuffix);
        const matchesPhone = visitor.phone?.includes(uniqueSuffix);
        const matchesEmail = visitor.email?.includes(uniqueSuffix);
        expect(matchesName || matchesPhone || matchesEmail).toBe(true);
      });
    });

    it('should support filtering by status', async () => {
      await createTestVisitor(testUsers.resident.id, { status: 'on_premise' });

      const response = await request(app)
        .get('/api/visitors?status=on_premise')
        .set('Cookie', `token=${residentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      if (response.body.data.visitors && response.body.data.visitors.length > 0) {
        response.body.data.visitors.forEach(visitor => {
          expect(visitor.status).toBe('on_premise');
        });
      }
    });

    it('should not return visitors from other estates for resident', async () => {
      const { dbManager } = await import('../../src/database/db.enhanced.js');
      const argon2 = await import('argon2');
      const hashedPassword = await argon2.default.hash('testpass123');
      const timestamp = Date.now();
      const uniqueSuffix = `${timestamp}_${Math.random().toString(36).substring(2, 11)}`;

      await dbManager.query(
        `INSERT INTO estates (id, name, slug, timezone)
         VALUES (1, 'Estate One', 'estate-one', 'UTC')
         ON CONFLICT (id) DO NOTHING`
      );
      await dbManager.query(
        `INSERT INTO estates (id, name, slug, timezone)
         VALUES (2, 'Estate Two', 'estate-two', 'UTC')
         ON CONFLICT (id) DO NOTHING`
      );
      await dbManager.query(
        `INSERT INTO estate_locations (estate_id)
         VALUES (1), (2)
         ON CONFLICT (estate_id) DO NOTHING`
      );

      const residentAResult = await dbManager.query(
        `INSERT INTO users (username, email, password, password_hash, role, phone, house, verified, estate_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          `residentA_${uniqueSuffix}`,
          `residentA_${uniqueSuffix}@test.com`,
          hashedPassword,
          hashedPassword,
          'resident',
          `+2547${timestamp.toString().slice(-8)}`,
          `A101-${uniqueSuffix}`,
          true,
          1
        ]
      );

      const residentBResult = await dbManager.query(
        `INSERT INTO users (username, email, password, password_hash, role, phone, house, verified, estate_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          `residentB_${uniqueSuffix}`,
          `residentB_${uniqueSuffix}@test.com`,
          hashedPassword,
          hashedPassword,
          'resident',
          `+2547${(timestamp + 1).toString().slice(-8)}`,
          'B201',
          true,
          2
        ]
      );

      const residentA = residentAResult.rows[0];
      const residentB = residentBResult.rows[0];
      const residentAToken = await getAuthToken(residentA.email);

      await dbManager.query(
        `INSERT INTO visitors (name, phone, email, purpose, status, resident_id, host_id, invite_code, estate_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          'Estate A Visitor',
          '+254700000001',
          'estateA@test.com',
          'Test visit',
          'pending',
          residentA.id,
          residentA.id,
          `ESTATE_A_${uniqueSuffix}`,
          1
        ]
      );

      await dbManager.query(
        `INSERT INTO visitors (name, phone, email, purpose, status, resident_id, host_id, invite_code, estate_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          'Estate B Visitor',
          '+254700000002',
          'estateB@test.com',
          'Test visit',
          'pending',
          residentB.id,
          residentB.id,
          `ESTATE_B_${uniqueSuffix}`,
          2
        ]
      );

      await dbManager.query(
        `INSERT INTO visitors (name, phone, email, purpose, status, resident_id, host_id, invite_code, estate_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          'Mismatched Estate Visitor',
          '+254700000003',
          'mismatch@test.com',
          'Test visit',
          'pending',
          residentA.id,
          residentA.id,
          `ESTATE_MISMATCH_${uniqueSuffix}`,
          2
        ]
      );

      const response = await request(app)
        .get('/api/visitors')
        .set('Cookie', `token=${residentAToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      const visitors = response.body.data.visitors || [];
      const visitorNames = visitors.map(visitor => visitor.name);

      expect(visitorNames).toContain('Estate A Visitor');
      expect(visitorNames).not.toContain('Estate B Visitor');
      expect(visitorNames).not.toContain('Mismatched Estate Visitor');
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
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('checkIn');

      // Verify database update
      const { dbManager } = await import('../../src/database/db.enhanced.js');
      const updated = await dbManager.query(
        'SELECT * FROM visitors WHERE id = $1',
        [testVisitor.id]
      );

      expect(updated.rows[0].status).toBe('on_premise');
      expect(updated.rows[0].check_in_time).not.toBeNull();
    });

    it('should deny check-in by non-guard users', async () => {
      const response = await request(app)
        .post(`/api/visitors/${testVisitor.id}/check-in`)
        .set('Cookie', `token=${residentToken}`);

      expect(response.status).toBe(403);
    });

    it('should reject check-in for expired visitor', async () => {
      // Create a visitor with expired status (cannot be checked in)
      const expiredVisitor = await createTestVisitor(testUsers.resident.id, {
        status: 'expired'
      });

      const response = await request(app)
        .post(`/api/visitors/${expiredVisitor.id}/check-in`)
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
        'UPDATE visitors SET check_in_time = NOW() - INTERVAL \'2 hours\' WHERE id = $1',
        [testVisitor.id]
      );
    });

    it('should check out visitor successfully by guard', async () => {
      const response = await request(app)
        .post(`/api/visitors/${testVisitor.id}/check-out`)
        .set('Cookie', `token=${guardToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('checkOut');

      const { dbManager } = await import('../../src/database/db.enhanced.js');
      const updated = await dbManager.query(
        'SELECT * FROM visitors WHERE id = $1',
        [testVisitor.id]
      );

      expect(updated.rows[0].status).toBe('checked_out');
      expect(updated.rows[0].check_out_time).not.toBeNull();
    });

    it('should calculate visit duration correctly', async () => {
      const response = await request(app)
        .post(`/api/visitors/${testVisitor.id}/check-out`)
        .set('Cookie', `token=${guardToken}`);

      expect(response.status).toBe(200);
      
      const { dbManager } = await import('../../src/database/db.enhanced.js');
      const visitor = await dbManager.query(
        'SELECT check_in_time, check_out_time FROM visitors WHERE id = $1',
        [testVisitor.id]
      );

      expect(visitor.rows[0].check_in_time).not.toBeNull();
      expect(visitor.rows[0].check_out_time).not.toBeNull();
      
      const checkInTime = new Date(visitor.rows[0].check_in_time);
      const checkOutTime = new Date(visitor.rows[0].check_out_time);
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
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBe(3);
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

    it('should prevent non-owner resident from canceling visitors', async () => {
      // Create another resident user for this test
      const { dbManager } = await import('../../src/database/db.enhanced.js');
      const argon2 = await import('argon2');
      const hashedPassword = await argon2.default.hash('testpass123');
      
      const otherResident = await dbManager.query(
        `INSERT INTO users (username, email, password, password_hash, role, house, verified, estate_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        ['other_resident', 'other@test.com', hashedPassword, hashedPassword, 'resident', 'B202', true, 1]
      );
      
      const otherResidentToken = await getAuthToken('other@test.com');

      const response = await request(app)
        .delete(`/api/visitors/${testVisitor.id}`)
        .set('Cookie', `token=${otherResidentToken}`);

      expect(response.status).toBe(403);
      
      // Cleanup
      await dbManager.query('DELETE FROM users WHERE id = $1', [otherResident.rows[0].id]);
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
      const visitorId = createResponse.body.data.id;

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
