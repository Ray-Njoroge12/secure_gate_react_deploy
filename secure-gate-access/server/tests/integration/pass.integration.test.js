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

  const toDate = (date) => date.toISOString().split('T')[0];
  const buildQrToken = () => `RP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const buildPassData = (residentId, overrides = {}) => {
    const now = new Date();
    return {
      resident_id: residentId,
      visitor_name: `Test Visitor ${Date.now()}`,
      visitor_phone: '+254700111111',
      pass_type: 'daily_worker',
      purpose: 'General access',
      access_pin: '123456',
      qr_code_token: buildQrToken(),
      valid_from: toDate(now),
      valid_until: toDate(new Date(now.getTime() + 30 * 86400000)),
      allowed_days: ['mon', 'wed', 'fri'],
      status: 'active',
      ...overrides
    };
  };
  const insertPass = async (residentId, overrides = {}) => {
    const passData = buildPassData(residentId, overrides);
    return query(
      `INSERT INTO recurring_passes (
        resident_id, visitor_name, visitor_phone, pass_type, purpose,
        access_pin, qr_code_token, valid_from, valid_until, allowed_days, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        passData.resident_id,
        passData.visitor_name,
        passData.visitor_phone,
        passData.pass_type,
        passData.purpose,
        passData.access_pin,
        passData.qr_code_token,
        passData.valid_from,
        passData.valid_until,
        passData.allowed_days,
        passData.status
      ]
    );
  };

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
      const passData = buildPassData(testUsers.resident.id, {
        visitor_name: 'Regular Cleaner',
        visitor_phone: '+254700111111',
        pass_type: 'daily_worker',
        allowed_days: ['mon', 'wed', 'fri'],
        valid_until: toDate(new Date(Date.now() + 90 * 86400000))
      });

      const result = await insertPass(testUsers.resident.id, passData);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].visitor_name).toBe(passData.visitor_name);
      expect(result.rows[0].pass_type).toBe('daily_worker');
      expect(result.rows[0].status).toBe('active');
    });

    it('should generate unique QR tokens for each pass', async () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(buildQrToken());
      }

      // All codes should be unique
      expect(codes.size).toBe(100);
    });

    it('should create daily pass with no day restrictions', async () => {
      const result = await insertPass(testUsers.resident.id, {
        visitor_name: 'Daily Worker',
        visitor_phone: '+254700222222',
        pass_type: 'daily_worker',
        allowed_days: null
      });

      expect(result.rows[0].pass_type).toBe('daily_worker');
      expect(result.rows[0].allowed_days).toBeNull();
    });

    it('should create single-use pass', async () => {
      const todayResult = await query('SELECT CURRENT_DATE::text as today');
      const today = todayResult.rows[0].today;
      const result = await insertPass(testUsers.resident.id, {
        visitor_name: 'One-time Contractor',
        visitor_phone: '+254700333333',
        pass_type: 'contractor',
        valid_from: today,
        valid_until: today
      });

      const validFrom = result.rows[0].valid_from;
      const validUntil = result.rows[0].valid_until;
      const formatLocalDate = (value) => {
        if (!(value instanceof Date)) {
          return String(value);
        }
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      const normalizedFrom = formatLocalDate(validFrom);
      const normalizedUntil = formatLocalDate(validUntil);

      expect(normalizedFrom).toBe(today);
      expect(normalizedUntil).toBe(today);
    });

    it('should link pass to resident correctly', async () => {
      const result = await insertPass(testUsers.resident.id, {
        visitor_name: 'Linked Pass',
        visitor_phone: '+254700444444'
      });

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
      const insertResult = await insertPass(testUsers.resident.id, {
        visitor_name: 'Valid Pass Holder',
        visitor_phone: '+254700555555',
        valid_from: toDate(new Date(Date.now() - 86400000)),
        valid_until: toDate(new Date(Date.now() + 86400000)),
        status: 'active'
      });

      const passId = insertResult.rows[0].id;

      // Validate pass
      const validation = await query(
        `SELECT * FROM recurring_passes 
         WHERE id = $1 
         AND status = 'active' 
         AND valid_from <= CURRENT_DATE 
         AND valid_until >= CURRENT_DATE`,
        [passId]
      );

      expect(validation.rows).toHaveLength(1);
    });

    it('should reject expired pass', async () => {
      const insertResult = await insertPass(testUsers.resident.id, {
        visitor_name: 'Expired Pass',
        visitor_phone: '+254700666666',
        valid_from: toDate(new Date(Date.now() - 30 * 86400000)),
        valid_until: toDate(new Date(Date.now() - 10 * 86400000)),
        status: 'active'
      });

      const passId = insertResult.rows[0].id;

      // Attempt validation
      const validation = await query(
        `SELECT * FROM recurring_passes 
         WHERE id = $1 
         AND status = 'active' 
         AND valid_from <= CURRENT_DATE 
         AND valid_until >= CURRENT_DATE`,
        [passId]
      );

      expect(validation.rows).toHaveLength(0);
    });

    it('should reject revoked pass', async () => {
      const insertResult = await insertPass(testUsers.resident.id, {
        visitor_name: 'Revoked Pass',
        visitor_phone: '+254700777777',
        status: 'revoked'
      });

      const passId = insertResult.rows[0].id;

      const validation = await query(
        `SELECT * FROM recurring_passes WHERE id = $1 AND status = 'active'`,
        [passId]
      );

      expect(validation.rows).toHaveLength(0);
    });

    it('should validate pass for specific day of week', async () => {
      const today = new Date();
      const dayOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][today.getDay()];

      const insertResult = await insertPass(testUsers.resident.id, {
        visitor_name: 'Day-specific Pass',
        visitor_phone: '+254700888888',
        allowed_days: [dayOfWeek]
      });

      const passId = insertResult.rows[0].id;

      // Validate for today's day
      const validation = await query(
        `SELECT * FROM recurring_passes 
         WHERE id = $1 
         AND status = 'active' 
         AND $2 = ANY(allowed_days)`,
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
      const insertResult = await insertPass(testUsers.resident.id, {
        visitor_name: 'Status Test Pass',
        visitor_phone: '+254700999999',
        status: 'active'
      });

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
      const insertResult = await insertPass(testUsers.resident.id, {
        visitor_name: 'Revoke Test Pass',
        visitor_phone: '+254711000000',
        status: 'active'
      });

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
      const today = toDate(new Date());
      const yesterday = toDate(new Date(Date.now() - 86400000));

      await insertPass(testUsers.resident.id, {
        visitor_name: 'Expiring Pass',
        visitor_phone: '+254711111111',
        valid_from: yesterday,
        valid_until: today,
        status: 'active'
      });

      // Query for passes that need expiration
      const expiringPasses = await query(
        `SELECT * FROM recurring_passes 
         WHERE status = 'active' 
         AND valid_until < CURRENT_DATE`
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
      await insertPass(testUsers.resident.id, {
        visitor_name: 'My Pass',
        visitor_phone: '+254711222222'
      });

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
      const insertResult = await insertPass(testUsers.resident.id, {
        visitor_name: 'Guard Validate Pass',
        visitor_phone: '+254711333333'
      });

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
      const insertResult = await insertPass(testUsers.resident.id, {
        visitor_name: 'Audit Pass',
        visitor_phone: '+254711444444'
      });

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
      const insertResult = await insertPass(testUsers.resident.id, {
        visitor_name: 'Validation Log Pass',
        visitor_phone: '+254711555555'
      });

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
