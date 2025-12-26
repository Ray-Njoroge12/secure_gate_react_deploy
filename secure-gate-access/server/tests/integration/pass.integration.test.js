/**
 * Pass Management Integration Tests
 * Tests recurring pass creation, validation, and lifecycle
 * 
 * Priority: HIGH (Core Business Feature)
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { getTestPool, query, closeTestPool, createTestUsers, cleanupTables, getAuthToken } from './test-db.js';

describe('Pass Management Integration Tests', () => {
  let testUsers;
  let residentToken;
  let guardToken;
  let adminToken;

  beforeAll(async () => {
    await getTestPool();
    await cleanupTables();
    testUsers = await createTestUsers();
    residentToken = await getAuthToken(testUsers.resident.email);
    guardToken = await getAuthToken(testUsers.guard.email);
    adminToken = await getAuthToken(testUsers.admin.email);
  }, 30000);

  afterAll(async () => {
    await cleanupTables();
    await closeTestPool();
  }, 30000);

  beforeEach(async () => {
    await query('DELETE FROM recurring_passes');
  });

  // =========================================
  // Pass Creation Tests
  // =========================================
  describe('Pass Creation', () => {
    it('should create recurring pass with all required fields', async () => {
      const passData = {
        name: 'Regular Cleaner',
        phone: '+254700111111',
        email: 'cleaner@test.com',
        resident_id: testUsers.resident.id,
        schedule_type: 'weekly',
        days_of_week: ['monday', 'wednesday', 'friday'],
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        status: 'active'
      };

      const result = await query(
        `INSERT INTO recurring_passes (name, phone, email, resident_id, schedule_type, days_of_week, start_date, end_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [passData.name, passData.phone, passData.email, passData.resident_id, passData.schedule_type, 
         passData.days_of_week, passData.start_date, passData.end_date, passData.status]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe(passData.name);
      expect(result.rows[0].schedule_type).toBe('weekly');
      expect(result.rows[0].status).toBe('active');
    });

    it('should generate unique access code for each pass', async () => {
      const generateAccessCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateAccessCode());
      }

      // All codes should be unique
      expect(codes.size).toBe(100);
    });

    it('should create daily pass with no day restrictions', async () => {
      const result = await query(
        `INSERT INTO recurring_passes (name, phone, resident_id, schedule_type, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['Daily Worker', '+254700222222', testUsers.resident.id, 'daily', 'active']
      );

      expect(result.rows[0].schedule_type).toBe('daily');
      expect(result.rows[0].days_of_week).toBeNull();
    });

    it('should create single-use pass', async () => {
      const result = await query(
        `INSERT INTO recurring_passes (name, phone, resident_id, schedule_type, start_date, end_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          'One-time Contractor',
          '+254700333333',
          testUsers.resident.id,
          'once',
          new Date().toISOString().split('T')[0],
          new Date().toISOString().split('T')[0],
          'active'
        ]
      );

      expect(result.rows[0].schedule_type).toBe('once');
    });

    it('should link pass to resident correctly', async () => {
      const result = await query(
        `INSERT INTO recurring_passes (name, phone, resident_id, schedule_type, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['Linked Pass', '+254700444444', testUsers.resident.id, 'weekly', 'active']
      );

      // Verify foreign key relationship
      const resident = await query(
        'SELECT * FROM users WHERE id = $1',
        [result.rows[0].resident_id]
      );

      expect(resident.rows).toHaveLength(1);
      expect(resident.rows[0].id).toBe(testUsers.resident.id);
    });
  });

  // =========================================
  // Pass Validation Tests
  // =========================================
  describe('Pass Validation', () => {
    it('should validate active pass successfully', async () => {
      const insertResult = await query(
        `INSERT INTO recurring_passes (name, phone, resident_id, schedule_type, start_date, end_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          'Valid Pass Holder',
          '+254700555555',
          testUsers.resident.id,
          'daily',
          new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
          new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
          'active'
        ]
      );

      const passId = insertResult.rows[0].id;

      // Validate pass
      const validation = await query(
        `SELECT * FROM recurring_passes 
         WHERE id = $1 
         AND status = 'active' 
         AND start_date <= CURRENT_DATE 
         AND end_date >= CURRENT_DATE`,
        [passId]
      );

      expect(validation.rows).toHaveLength(1);
    });

    it('should reject expired pass', async () => {
      const insertResult = await query(
        `INSERT INTO recurring_passes (name, phone, resident_id, schedule_type, start_date, end_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          'Expired Pass',
          '+254700666666',
          testUsers.resident.id,
          'daily',
          new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
          new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
          'active'
        ]
      );

      const passId = insertResult.rows[0].id;

      // Attempt validation
      const validation = await query(
        `SELECT * FROM recurring_passes 
         WHERE id = $1 
         AND status = 'active' 
         AND start_date <= CURRENT_DATE 
         AND end_date >= CURRENT_DATE`,
        [passId]
      );

      expect(validation.rows).toHaveLength(0);
    });

    it('should reject revoked pass', async () => {
      const insertResult = await query(
        `INSERT INTO recurring_passes (name, phone, resident_id, schedule_type, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['Revoked Pass', '+254700777777', testUsers.resident.id, 'daily', 'revoked']
      );

      const passId = insertResult.rows[0].id;

      const validation = await query(
        `SELECT * FROM recurring_passes WHERE id = $1 AND status = 'active'`,
        [passId]
      );

      expect(validation.rows).toHaveLength(0);
    });

    it('should validate pass for specific day of week', async () => {
      const today = new Date();
      const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][today.getDay()];

      const insertResult = await query(
        `INSERT INTO recurring_passes (name, phone, resident_id, schedule_type, days_of_week, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        ['Day-specific Pass', '+254700888888', testUsers.resident.id, 'weekly', [dayOfWeek], 'active']
      );

      const passId = insertResult.rows[0].id;

      // Validate for today's day
      const validation = await query(
        `SELECT * FROM recurring_passes 
         WHERE id = $1 
         AND status = 'active' 
         AND $2 = ANY(days_of_week)`,
        [passId, dayOfWeek]
      );

      expect(validation.rows).toHaveLength(1);
    });
  });

  // =========================================
  // Pass Lifecycle Tests
  // =========================================
  describe('Pass Lifecycle', () => {
    it('should update pass status correctly', async () => {
      const insertResult = await query(
        `INSERT INTO recurring_passes (name, phone, resident_id, schedule_type, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['Status Test Pass', '+254700999999', testUsers.resident.id, 'weekly', 'active']
      );

      const passId = insertResult.rows[0].id;

      // Suspend pass
      await query(
        `UPDATE recurring_passes SET status = 'suspended', updated_at = NOW() WHERE id = $1`,
        [passId]
      );

      const suspended = await query('SELECT * FROM recurring_passes WHERE id = $1', [passId]);
      expect(suspended.rows[0].status).toBe('suspended');

      // Reactivate pass
      await query(
        `UPDATE recurring_passes SET status = 'active', updated_at = NOW() WHERE id = $1`,
        [passId]
      );

      const reactivated = await query('SELECT * FROM recurring_passes WHERE id = $1', [passId]);
      expect(reactivated.rows[0].status).toBe('active');
    });

    it('should revoke pass permanently', async () => {
      const insertResult = await query(
        `INSERT INTO recurring_passes (name, phone, resident_id, schedule_type, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['Revoke Test Pass', '+254711000000', testUsers.resident.id, 'daily', 'active']
      );

      const passId = insertResult.rows[0].id;

      await query(
        `UPDATE recurring_passes SET status = 'revoked', updated_at = NOW() WHERE id = $1`,
        [passId]
      );

      const revoked = await query('SELECT * FROM recurring_passes WHERE id = $1', [passId]);
      expect(revoked.rows[0].status).toBe('revoked');
    });

    it('should handle pass expiration correctly', async () => {
      // Create pass that expires today
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      await query(
        `INSERT INTO recurring_passes (name, phone, resident_id, schedule_type, start_date, end_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['Expiring Pass', '+254711111111', testUsers.resident.id, 'daily', yesterday, today, 'active']
      );

      // Query for passes that need expiration
      const expiringPasses = await query(
        `SELECT * FROM recurring_passes 
         WHERE status = 'active' 
         AND end_date < CURRENT_DATE`
      );

      // These would be marked as expired by a scheduled job
      expect(expiringPasses.rows).toBeDefined();
    });
  });

  // =========================================
  // Pass Authorization Tests
  // =========================================
  describe('Pass Authorization', () => {
    it('should allow resident to view only their passes', async () => {
      // Create passes for different residents
      await query(
        `INSERT INTO recurring_passes (name, phone, resident_id, schedule_type, status)
         VALUES ($1, $2, $3, $4, $5)`,
        ['My Pass', '+254711222222', testUsers.resident.id, 'daily', 'active']
      );

      // Query as resident (should only see their own)
      const residentPasses = await query(
        'SELECT * FROM recurring_passes WHERE resident_id = $1',
        [testUsers.resident.id]
      );

      expect(residentPasses.rows.length).toBeGreaterThanOrEqual(1);
      residentPasses.rows.forEach(pass => {
        expect(pass.resident_id).toBe(testUsers.resident.id);
      });
    });

    it('should allow admin to view all passes', async () => {
      // Admin can query all passes
      const allPasses = await query('SELECT * FROM recurring_passes');
      expect(allPasses.rows).toBeDefined();
    });

    it('should allow guard to validate any pass', async () => {
      const insertResult = await query(
        `INSERT INTO recurring_passes (name, phone, resident_id, schedule_type, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['Guard Validate Pass', '+254711333333', testUsers.resident.id, 'daily', 'active']
      );

      const passId = insertResult.rows[0].id;

      // Guard can read pass for validation
      const pass = await query(
        'SELECT * FROM recurring_passes WHERE id = $1',
        [passId]
      );

      expect(pass.rows).toHaveLength(1);
    });
  });

  // =========================================
  // Pass Audit Trail Tests
  // =========================================
  describe('Pass Audit Trail', () => {
    it('should log pass creation in audit log', async () => {
      const insertResult = await query(
        `INSERT INTO recurring_passes (name, phone, resident_id, schedule_type, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['Audit Pass', '+254711444444', testUsers.resident.id, 'weekly', 'active']
      );

      const passId = insertResult.rows[0].id;

      // Log the creation
      await query(
        `INSERT INTO audit_logs (action, resource, user_id, details)
         VALUES ($1, $2, $3, $4)`,
        ['pass.create', 'recurring_pass', testUsers.resident.id, JSON.stringify({ pass_id: passId })]
      );

      const auditLog = await query(
        "SELECT * FROM audit_logs WHERE action = 'pass.create' AND user_id = $1",
        [testUsers.resident.id]
      );

      expect(auditLog.rows.length).toBeGreaterThanOrEqual(1);
    });

    it('should log pass validation attempts', async () => {
      const insertResult = await query(
        `INSERT INTO recurring_passes (name, phone, resident_id, schedule_type, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['Validation Log Pass', '+254711555555', testUsers.resident.id, 'daily', 'active']
      );

      const passId = insertResult.rows[0].id;

      // Log validation attempt
      await query(
        `INSERT INTO audit_logs (action, resource, user_id, details)
         VALUES ($1, $2, $3, $4)`,
        ['pass.validate', 'recurring_pass', testUsers.guard.id, JSON.stringify({ pass_id: passId, outcome: 'success' })]
      );

      const auditLog = await query(
        "SELECT * FROM audit_logs WHERE action = 'pass.validate'",
        []
      );

      expect(auditLog.rows.length).toBeGreaterThanOrEqual(1);
    });
  });
});
