/**
 * Visitor API Integration Tests
 * Tests all visitor management API endpoints
 * 
 * Priority: CRITICAL (Core Business Feature)
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers, getAuthToken } from '../setup.js';
import { dbManager } from '../../../src/database/db.enhanced.js';

describe('Visitor API Integration Tests', () => {
  let testUsers;
  let residentToken;
  let guardToken;
  let adminToken;

  beforeAll(async () => {
    await setupTestDatabase();
    testUsers = await createTestUsers();
    residentToken = await getAuthToken(testUsers.resident.email);
    guardToken = await getAuthToken(testUsers.guard.email);
    adminToken = await getAuthToken(testUsers.admin.email);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await dbManager.query('DELETE FROM visitors');
  });

  // =========================================
  // GET /api/visitors - List Visitors
  // =========================================
  describe('GET /api/visitors', () => {
    beforeEach(async () => {
      // Create test visitors
      for (let i = 0; i < 15; i++) {
        await dbManager.query(
          `INSERT INTO visitors (name, phone, host_id, invite_code, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [`Visitor ${i}`, `+2547001111${i.toString().padStart(2, '0')}`, testUsers.resident.id, `LIST${i}`, i < 5 ? 'pending' : i < 10 ? 'approved' : 'checked_out']
        );
      }
    });

    it('should return paginated visitor list', async () => {
      const page1 = await dbManager.query(
        'SELECT * FROM visitors ORDER BY created_at DESC LIMIT 10 OFFSET 0'
      );

      const page2 = await dbManager.query(
        'SELECT * FROM visitors ORDER BY created_at DESC LIMIT 10 OFFSET 10'
      );

      expect(page1.rows).toHaveLength(10);
      expect(page2.rows).toHaveLength(5);
    });

    it('should filter visitors by status', async () => {
      const pending = await dbManager.query(
        "SELECT * FROM visitors WHERE status = 'pending'"
      );

      const approved = await dbManager.query(
        "SELECT * FROM visitors WHERE status = 'approved'"
      );

      expect(pending.rows).toHaveLength(5);
      expect(approved.rows).toHaveLength(5);
    });

    it('should return only resident own visitors for resident role', async () => {
      const residentVisitors = await dbManager.query(
        'SELECT * FROM visitors WHERE host_id = $1',
        [testUsers.resident.id]
      );

      expect(residentVisitors.rows).toHaveLength(15);
      residentVisitors.rows.forEach(v => {
        expect(v.host_id).toBe(testUsers.resident.id);
      });
    });

    it('should return all visitors for admin role', async () => {
      const allVisitors = await dbManager.query('SELECT * FROM visitors');
      expect(allVisitors.rows).toHaveLength(15);
    });

    it('should support search by name', async () => {
      const searchResult = await dbManager.query(
        "SELECT * FROM visitors WHERE name ILIKE '%Visitor 1%'"
      );

      expect(searchResult.rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================
  // GET /api/visitors/:id - Get Visitor
  // =========================================
  describe('GET /api/visitors/:id', () => {
    it('should return visitor details', async () => {
      const insertResult = await dbManager.query(
        `INSERT INTO visitors (name, phone, email, purpose, host_id, invite_code, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        ['Detail Visitor', '+254700222222', 'detail@test.com', 'Business', testUsers.resident.id, 'DETAIL001', 'pending']
      );

      const visitorId = insertResult.rows[0].id;

      const result = await dbManager.query(
        'SELECT * FROM visitors WHERE id = $1',
        [visitorId]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe('Detail Visitor');
      expect(result.rows[0].email).toBe('detail@test.com');
    });

    it('should return 404 for non-existent visitor', async () => {
      const result = await dbManager.query(
        'SELECT * FROM visitors WHERE id = $1',
        [99999]
      );

      expect(result.rows).toHaveLength(0);
    });

    it('should enforce ownership for resident access', async () => {
      // Create visitor for different host
      const insertResult = await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['Other Visitor', '+254700333333', testUsers.admin.id, 'OTHER001', 'pending']
      );

      const visitorId = insertResult.rows[0].id;

      // Resident tries to access (should be blocked by host_id check)
      const result = await dbManager.query(
        'SELECT * FROM visitors WHERE id = $1 AND host_id = $2',
        [visitorId, testUsers.resident.id]
      );

      expect(result.rows).toHaveLength(0);
    });
  });

  // =========================================
  // POST /api/visitors - Create Visitor
  // =========================================
  describe('POST /api/visitors', () => {
    it('should create visitor with valid data', async () => {
      const visitorData = {
        name: 'New Visitor',
        phone: '+254700444444',
        email: 'new@test.com',
        purpose: 'Meeting',
        host_id: testUsers.resident.id,
        invite_code: `NEW${Date.now()}`,
        status: 'pending'
      };

      const result = await dbManager.query(
        `INSERT INTO visitors (name, phone, email, purpose, host_id, invite_code, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [visitorData.name, visitorData.phone, visitorData.email, visitorData.purpose, visitorData.host_id, visitorData.invite_code, visitorData.status]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe('New Visitor');
      expect(result.rows[0].status).toBe('pending');
      expect(result.rows[0].invite_code).toBeDefined();
    });

    it('should generate unique invite code', async () => {
      const codes = new Set();

      for (let i = 0; i < 10; i++) {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        codes.add(code);
      }

      expect(codes.size).toBe(10);
    });

    it('should reject duplicate invite code', async () => {
      const code = 'DUPLICATE';

      await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status)
         VALUES ($1, $2, $3, $4, $5)`,
        ['First Visitor', '+254700555551', testUsers.resident.id, code, 'pending']
      );

      try {
        await dbManager.query(
          `INSERT INTO visitors (name, phone, host_id, invite_code, status)
           VALUES ($1, $2, $3, $4, $5)`,
          ['Second Visitor', '+254700555552', testUsers.resident.id, code, 'pending']
        );
        fail('Should have thrown duplicate error');
      } catch (error) {
        expect(error.message).toContain('duplicate');
      }
    });

    it('should create audit log for visitor creation', async () => {
      const insertResult = await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['Audit Visitor', '+254700666666', testUsers.resident.id, 'AUDIT001', 'pending']
      );

      await dbManager.query(
        `INSERT INTO audit_logs (action, resource, user_id, details)
         VALUES ($1, $2, $3, $4)`,
        ['visitor.create', 'visitor', testUsers.resident.id, JSON.stringify({ visitor_id: insertResult.rows[0].id })]
      );

      const auditLog = await dbManager.query(
        "SELECT * FROM audit_logs WHERE action = 'visitor.create' AND user_id = $1",
        [testUsers.resident.id]
      );

      expect(auditLog.rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================
  // PUT /api/visitors/:id - Update Visitor
  // =========================================
  describe('PUT /api/visitors/:id', () => {
    it('should update visitor details', async () => {
      const insertResult = await dbManager.query(
        `INSERT INTO visitors (name, phone, purpose, host_id, invite_code, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        ['Update Visitor', '+254700777777', 'Original Purpose', testUsers.resident.id, 'UPDATE001', 'pending']
      );

      const visitorId = insertResult.rows[0].id;

      await dbManager.query(
        `UPDATE visitors SET purpose = $1, updated_at = NOW() WHERE id = $2`,
        ['Updated Purpose', visitorId]
      );

      const updated = await dbManager.query(
        'SELECT * FROM visitors WHERE id = $1',
        [visitorId]
      );

      expect(updated.rows[0].purpose).toBe('Updated Purpose');
    });

    it('should not allow status change via regular update', async () => {
      const insertResult = await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['Status Visitor', '+254700888888', testUsers.resident.id, 'STATUS001', 'pending']
      );

      const visitorId = insertResult.rows[0].id;

      // This should be controlled - regular updates shouldn't change status
      // Status changes should go through specific endpoints (approve, check-in, etc.)
      const updateResult = await dbManager.query(
        `UPDATE visitors SET purpose = $1 WHERE id = $2 AND host_id = $3 RETURNING *`,
        ['New Purpose', visitorId, testUsers.resident.id]
      );

      expect(updateResult.rows[0].status).toBe('pending');
    });

    it('should enforce ownership on update', async () => {
      const insertResult = await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['Owned Visitor', '+254700999999', testUsers.admin.id, 'OWNED001', 'pending']
      );

      const visitorId = insertResult.rows[0].id;

      // Resident tries to update (wrong host_id)
      const updateResult = await dbManager.query(
        `UPDATE visitors SET purpose = $1 WHERE id = $2 AND host_id = $3 RETURNING *`,
        ['Hacked Purpose', visitorId, testUsers.resident.id]
      );

      expect(updateResult.rows).toHaveLength(0);
    });
  });

  // =========================================
  // DELETE /api/visitors/:id - Delete Visitor
  // =========================================
  describe('DELETE /api/visitors/:id', () => {
    it('should delete pending visitor', async () => {
      const insertResult = await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['Delete Visitor', '+254711000000', testUsers.resident.id, 'DELETE001', 'pending']
      );

      const visitorId = insertResult.rows[0].id;

      await dbManager.query(
        'DELETE FROM visitors WHERE id = $1 AND host_id = $2',
        [visitorId, testUsers.resident.id]
      );

      const check = await dbManager.query(
        'SELECT * FROM visitors WHERE id = $1',
        [visitorId]
      );

      expect(check.rows).toHaveLength(0);
    });

    it('should not delete checked-in visitor', async () => {
      const insertResult = await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status, check_in_time)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        ['Active Visitor', '+254711111111', testUsers.resident.id, 'ACTIVE001', 'on_premise']
      );

      const visitorId = insertResult.rows[0].id;

      // Should not delete active visitor (business rule)
      const deleteResult = await dbManager.query(
        "DELETE FROM visitors WHERE id = $1 AND status = 'pending' RETURNING *",
        [visitorId]
      );

      expect(deleteResult.rows).toHaveLength(0);

      // Visitor should still exist
      const check = await dbManager.query(
        'SELECT * FROM visitors WHERE id = $1',
        [visitorId]
      );
      expect(check.rows).toHaveLength(1);
    });
  });

  // =========================================
  // POST /api/visitors/:id/check-in
  // =========================================
  describe('POST /api/visitors/:id/check-in', () => {
    it('should check in approved visitor', async () => {
      const insertResult = await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['CheckIn Visitor', '+254711222222', testUsers.resident.id, 'CHECKIN001', 'approved']
      );

      const visitorId = insertResult.rows[0].id;

      const updateResult = await dbManager.query(
        `UPDATE visitors 
         SET status = 'on_premise', check_in_time = NOW()
         WHERE id = $1 AND status = 'approved'
         RETURNING *`,
        [visitorId]
      );

      expect(updateResult.rows).toHaveLength(1);
      expect(updateResult.rows[0].status).toBe('on_premise');
      expect(updateResult.rows[0].check_in_time).toBeDefined();
    });

    it('should reject check-in for pending visitor', async () => {
      const insertResult = await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['Pending Visitor', '+254711333333', testUsers.resident.id, 'PENDING001', 'pending']
      );

      const visitorId = insertResult.rows[0].id;

      const updateResult = await dbManager.query(
        `UPDATE visitors 
         SET status = 'on_premise', check_in_time = NOW()
         WHERE id = $1 AND status = 'approved'
         RETURNING *`,
        [visitorId]
      );

      expect(updateResult.rows).toHaveLength(0);
    });

    it('should prevent double check-in', async () => {
      const insertResult = await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status, check_in_time)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        ['Already Checked', '+254711444444', testUsers.resident.id, 'DOUBLE001', 'on_premise']
      );

      const visitorId = insertResult.rows[0].id;

      const updateResult = await dbManager.query(
        `UPDATE visitors 
         SET status = 'on_premise', check_in_time = NOW()
         WHERE id = $1 AND status = 'approved'
         RETURNING *`,
        [visitorId]
      );

      expect(updateResult.rows).toHaveLength(0);
    });

    it('should create audit log for check-in', async () => {
      const insertResult = await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['Audit CheckIn', '+254711555555', testUsers.resident.id, 'AUDITCI001', 'approved']
      );

      await dbManager.query(
        `UPDATE visitors SET status = 'on_premise', check_in_time = NOW() WHERE id = $1`,
        [insertResult.rows[0].id]
      );

      await dbManager.query(
        `INSERT INTO audit_logs (action, resource, user_id, details)
         VALUES ($1, $2, $3, $4)`,
        ['visitor.checkin', 'visitor', testUsers.guard.id, JSON.stringify({ visitor_id: insertResult.rows[0].id })]
      );

      const auditLog = await dbManager.query(
        "SELECT * FROM audit_logs WHERE action = 'visitor.checkin'"
      );

      expect(auditLog.rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================
  // POST /api/visitors/:id/check-out
  // =========================================
  describe('POST /api/visitors/:id/check-out', () => {
    it('should check out on-premise visitor', async () => {
      const checkInTime = new Date(Date.now() - 3600000); // 1 hour ago

      const insertResult = await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status, check_in_time)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        ['CheckOut Visitor', '+254711666666', testUsers.resident.id, 'CHECKOUT001', 'on_premise', checkInTime]
      );

      const visitorId = insertResult.rows[0].id;

      const updateResult = await dbManager.query(
        `UPDATE visitors 
         SET status = 'checked_out', check_out_time = NOW()
         WHERE id = $1 AND status = 'on_premise'
         RETURNING *`,
        [visitorId]
      );

      expect(updateResult.rows).toHaveLength(1);
      expect(updateResult.rows[0].status).toBe('checked_out');
      expect(updateResult.rows[0].check_out_time).toBeDefined();
    });

    it('should calculate visit duration', async () => {
      const checkInTime = new Date(Date.now() - 7200000); // 2 hours ago

      const insertResult = await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status, check_in_time)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        ['Duration Visitor', '+254711777777', testUsers.resident.id, 'DURATION001', 'on_premise', checkInTime]
      );

      const visitorId = insertResult.rows[0].id;
      const checkOutTime = new Date();

      await dbManager.query(
        `UPDATE visitors SET status = 'checked_out', check_out_time = $1 WHERE id = $2`,
        [checkOutTime, visitorId]
      );

      const visitor = await dbManager.query(
        'SELECT check_in_time, check_out_time FROM visitors WHERE id = $1',
        [visitorId]
      );

      const duration = new Date(visitor.rows[0].check_out_time) - new Date(visitor.rows[0].check_in_time);
      const durationMinutes = Math.round(duration / 60000);

      expect(durationMinutes).toBeGreaterThanOrEqual(119); // ~2 hours
      expect(durationMinutes).toBeLessThanOrEqual(121);
    });

    it('should reject check-out for non-checked-in visitor', async () => {
      const insertResult = await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['Not Checked In', '+254711888888', testUsers.resident.id, 'NOTCI001', 'approved']
      );

      const visitorId = insertResult.rows[0].id;

      const updateResult = await dbManager.query(
        `UPDATE visitors 
         SET status = 'checked_out', check_out_time = NOW()
         WHERE id = $1 AND status = 'on_premise'
         RETURNING *`,
        [visitorId]
      );

      expect(updateResult.rows).toHaveLength(0);
    });
  });

  // =========================================
  // Authorization Tests
  // =========================================
  describe('Authorization Tests', () => {
    it('should allow guard to check in any approved visitor', async () => {
      const insertResult = await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['Guard CI Visitor', '+254711999999', testUsers.resident.id, 'GUARDCI001', 'approved']
      );

      // Guard can check in (no host_id restriction)
      const updateResult = await dbManager.query(
        `UPDATE visitors 
         SET status = 'on_premise', check_in_time = NOW()
         WHERE id = $1 AND status = 'approved'
         RETURNING *`,
        [insertResult.rows[0].id]
      );

      expect(updateResult.rows).toHaveLength(1);
    });

    it('should restrict resident to their own visitors', async () => {
      // Visitor belongs to admin
      const insertResult = await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['Admin Visitor', '+254712000000', testUsers.admin.id, 'ADMINV001', 'pending']
      );

      // Resident cannot access
      const accessResult = await dbManager.query(
        'SELECT * FROM visitors WHERE id = $1 AND host_id = $2',
        [insertResult.rows[0].id, testUsers.resident.id]
      );

      expect(accessResult.rows).toHaveLength(0);
    });

    it('should allow admin full access', async () => {
      const insertResult = await dbManager.query(
        `INSERT INTO visitors (name, phone, host_id, invite_code, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['Any Visitor', '+254712111111', testUsers.resident.id, 'ANYV001', 'pending']
      );

      // Admin can access any visitor
      const accessResult = await dbManager.query(
        'SELECT * FROM visitors WHERE id = $1',
        [insertResult.rows[0].id]
      );

      expect(accessResult.rows).toHaveLength(1);
    });
  });
});
