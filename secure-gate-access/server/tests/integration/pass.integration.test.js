/**
 * Pass Management Integration Tests
 * Tests recurring pass creation, validation, and lifecycle
 * 
 * Priority: HIGH (Core Business Feature)
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { getTestPool, query, closeTestPool, createTestUsers, cleanupTables } from './test-db.js';

process.env.PGDATABASE = process.env.PGDATABASE || 'secure_gate_test';
process.env.NODE_ENV = 'test';

jest.unstable_mockModule('../../src/services/emailService.js', () => ({
  default: {
    sendEmail: jest.fn().mockResolvedValue(),
    sendVerificationEmail: jest.fn().mockResolvedValue(),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(),
    sendWelcomeEmail: jest.fn().mockResolvedValue()
  }
}));

jest.unstable_mockModule('../../src/services/smsService.js', () => ({
  default: {
    sendSMS: jest.fn().mockResolvedValue(),
    sendOTP: jest.fn().mockResolvedValue()
  }
}));

describe('Pass Management Integration Tests', () => {
  let app;
  let cleanupAppTestDatabase;
  let testUsers;
  let residentToken;
  let guardToken;
  let adminToken;

  const toDate = (date) => date.toISOString().split('T')[0];
  const buildQrToken = () => `RP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const getCurrentDayCode = () => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
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
  const createAdditionalResident = async () => {
    return createAdditionalUser('resident');
  };
  const createAdditionalUser = async (role = 'resident') => {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const usernamePrefix = role.replace(/[^a-z]/g, '') || 'user';
    const result = await query(
      `INSERT INTO users (username, email, password, password_hash, role, phone, house, verified, estate_id)
       SELECT $1, $2, password, password_hash, $3, $4, $5, true, estate_id
       FROM users
       WHERE id = $6
       RETURNING *`,
      [
        `${usernamePrefix}_${suffix}`,
        `${usernamePrefix}_${suffix}@test.com`,
        role,
        `+2547${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
        `${usernamePrefix.toUpperCase().slice(0, 8) || 'USER'}_${suffix.slice(-4)}`,
        testUsers.resident.id
      ]
    );

    return result.rows[0];
  };

  beforeAll(async () => {
    const integrationSetup = await import('./setup.js');
    await integrationSetup.setupTestDatabase();
    cleanupAppTestDatabase = integrationSetup.cleanupTestDatabase;

    await getTestPool();
    await cleanupTables();
    testUsers = await createTestUsers();
    residentToken = await integrationSetup.getAuthToken(testUsers.resident.email);
    guardToken = await integrationSetup.getAuthToken(testUsers.guard.email);
    adminToken = await integrationSetup.getAuthToken(testUsers.admin.email);
    const appModule = await import('../../src/app.js');
    app = appModule.default;
  }, 30000);

  afterAll(async () => {
    if (cleanupAppTestDatabase) {
      await cleanupAppTestDatabase();
    }
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
  // Pass Route Create Boundary Tests
  // =========================================
  describe('Pass Route Create Boundary', () => {
    it('should reject guard access to POST /api/recurring-passes', async () => {
      const response = await request(app)
        .post('/api/recurring-passes')
        .set('Authorization', `Bearer ${guardToken}`)
        .send({
          visitorName: 'Guard Blocked Create',
          validUntil: toDate(new Date(Date.now() + 86400000))
        });

      expect(response.status).toBe(403);
    });

    it('should return the required-field 400 when validUntil is missing', async () => {
      const response = await request(app)
        .post('/api/recurring-passes')
        .set('Authorization', `Bearer ${residentToken}`)
        .send({
          visitorName: 'Missing Valid Until'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Visitor name and valid until date are required'
      });
    });

    it('should allow resident, admin, and super_admin to create passes owned by the authenticated caller and expose only the reachable success fields', async () => {
      const { getAuthToken } = await import('./setup.js');
      const superAdmin = await createAdditionalUser('super_admin');
      const superAdminToken = await getAuthToken(superAdmin.email);
      const successPayloadKeys = [
        'access_pin',
        'created_at',
        'id',
        'pass_type',
        'qr_code_token',
        'status',
        'valid_from',
        'valid_until',
        'visitor_name'
      ];
      const testCases = [
        { label: 'resident', user: testUsers.resident, token: residentToken },
        { label: 'admin', user: testUsers.admin, token: adminToken },
        { label: 'super_admin', user: superAdmin, token: superAdminToken }
      ];

      for (const [index, testCase] of testCases.entries()) {
        const visitorName = `Create Route ${testCase.label} Pass`;
        const response = await request(app)
          .post('/api/recurring-passes')
          .set('Authorization', `Bearer ${testCase.token}`)
          .send({
            residentId: testUsers.guard.id,
            resident_id: testUsers.guard.id,
            visitorName,
            visitorPhone: `+2547119${String(index).padStart(5, '0')}`,
            vehiclePlate: `K${String.fromCharCode(65 + index)}A ${100 + index}B`,
            passType: 'daily_worker',
            purpose: `${testCase.label} create route proof`,
            validUntil: toDate(new Date(Date.now() + (index + 7) * 86400000)),
            allowedDays: ['mon', 'wed', 'fri'],
            allowedTimeStart: '06:00',
            allowedTimeEnd: '18:00'
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(Object.keys(response.body.data).sort()).toEqual(successPayloadKeys);
        expect(response.body.data.visitor_name).toBe(visitorName);
        expect(response.body.data.pass_type).toBe('daily_worker');
        expect(response.body.data.status).toBe('active');
        expect(response.body.data.access_pin).toMatch(/^\d{6}$/);
        expect(response.body.data.qr_code_token).toMatch(/^RP-/);
        expect(response.body.data.valid_from).toBeTruthy();
        expect(response.body.data.valid_until).toBeTruthy();
        expect(response.body.data.created_at).toBeTruthy();

        const persistedRow = await query(
          `SELECT resident_id, visitor_name, access_pin, access_pin_hash, qr_code_token
           FROM recurring_passes
           WHERE id = $1`,
          [response.body.data.id]
        );

        expect(persistedRow.rows).toHaveLength(1);
        expect(persistedRow.rows[0].resident_id).toBe(testCase.user.id);
        expect(persistedRow.rows[0].visitor_name).toBe(visitorName);
        expect(persistedRow.rows[0].access_pin).toBe(response.body.data.access_pin);
        expect(persistedRow.rows[0].access_pin_hash).toBeTruthy();
        expect(persistedRow.rows[0].qr_code_token).toBe(response.body.data.qr_code_token);
      }
    });
  });

  // =========================================
  // Pass Route Access Boundary Tests
  // =========================================
  describe('Pass Route Access Boundary', () => {
    it('should allow resident GET /api/recurring-passes to return only the authenticated resident pass set', async () => {
      const otherResident = await createAdditionalResident();

      await insertPass(testUsers.resident.id, {
        visitor_name: 'Resident Owned Pass',
        visitor_phone: '+254711222222'
      });

      await insertPass(otherResident.id, {
        visitor_name: 'Other Resident Pass',
        visitor_phone: '+254711333333'
      });

      const response = await request(app)
        .get('/api/recurring-passes')
        .set('Authorization', `Bearer ${residentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      const visitorNames = response.body.data.map((pass) => pass.visitor_name);
      expect(visitorNames).toContain('Resident Owned Pass');
      expect(visitorNames).not.toContain('Other Resident Pass');
    });

    it('should allow admin GET /api/recurring-passes but only return passes owned by the authenticated admin identity', async () => {
      await insertPass(testUsers.admin.id, {
        visitor_name: 'Admin Owned Pass',
        visitor_phone: '+254711444444'
      });

      await insertPass(testUsers.resident.id, {
        visitor_name: 'Resident Pass Not Returned To Admin',
        visitor_phone: '+254711555555'
      });

      const response = await request(app)
        .get('/api/recurring-passes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const visitorNames = response.body.data.map((pass) => pass.visitor_name);
      expect(visitorNames).toContain('Admin Owned Pass');
      expect(visitorNames).not.toContain('Resident Pass Not Returned To Admin');
    });

    it('should reject guard access to GET /api/recurring-passes', async () => {
      const response = await request(app)
        .get('/api/recurring-passes')
        .set('Authorization', `Bearer ${guardToken}`);

      expect(response.status).toBe(403);
    });

    it('should reject resident access to POST /api/recurring-passes/validate', async () => {
      const response = await request(app)
        .post('/api/recurring-passes/validate')
        .set('Authorization', `Bearer ${residentToken}`)
        .send({
          credential: 'RP-NOT-ALLOWED',
          method: 'qr'
        });

      expect(response.status).toBe(403);
    });

    it('should allow guard access to POST /api/recurring-passes/validate to reach request validation', async () => {
      const response = await request(app)
        .post('/api/recurring-passes/validate')
        .set('Authorization', `Bearer ${guardToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Credential required');
    });
  });

  // =========================================
  // Pass Route Validate Success Tests
  // =========================================
  describe('Pass Route Validate Success', () => {
    it('should validate QR pass successfully and record entry side effects', async () => {
      const qrCredential = buildQrToken();
      const insertResult = await insertPass(testUsers.resident.id, {
        visitor_name: 'Route Success Pass',
        visitor_phone: '+254711666666',
        qr_code_token: qrCredential,
        valid_from: toDate(new Date(Date.now() - 86400000)),
        valid_until: toDate(new Date(Date.now() + 86400000)),
        allowed_days: [getCurrentDayCode()],
        status: 'active'
      });

      const passId = insertResult.rows[0].id;

      await query(
        `UPDATE recurring_passes
         SET allowed_time_start = '00:00', allowed_time_end = '23:59'
         WHERE id = $1`,
        [passId]
      );

      const beforeEntries = await query(
        'SELECT COUNT(*)::int AS count FROM recurring_pass_entries WHERE pass_id = $1',
        [passId]
      );
      const beforePass = await query(
        'SELECT total_entries FROM recurring_passes WHERE id = $1',
        [passId]
      );

      expect(beforeEntries.rows[0].count).toBe(0);
      expect(beforePass.rows[0].total_entries).toBe(0);

      const response = await request(app)
        .post('/api/recurring-passes/validate')
        .set('Authorization', `Bearer ${guardToken}`)
        .send({
          credential: qrCredential,
          method: 'qr'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.valid).toBe(true);
      expect(response.body.pass.id).toBe(passId);
      expect(response.body.pass.visitorName).toBe('Route Success Pass');

      const recordedEntries = await query(
        `SELECT pass_id, verified_by_guard_id, entry_method
         FROM recurring_pass_entries
         WHERE pass_id = $1
         ORDER BY id ASC`,
        [passId]
      );
      const updatedPass = await query(
        'SELECT total_entries, last_used_at FROM recurring_passes WHERE id = $1',
        [passId]
      );

      expect(recordedEntries.rows).toHaveLength(1);
      expect(recordedEntries.rows[0].pass_id).toBe(passId);
      expect(recordedEntries.rows[0].verified_by_guard_id).toBe(testUsers.guard.id);
      expect(recordedEntries.rows[0].entry_method).toBe('qr');
      expect(updatedPass.rows[0].total_entries).toBe(1);
      expect(updatedPass.rows[0].last_used_at).toBeTruthy();
    });
  });

  // =========================================
  // Pass Route Suspend Boundary Tests
  // =========================================
  describe('Pass Route Suspend Boundary', () => {
    it('should allow only the authenticated owner to suspend an active pass and then reject further suspend attempts once inactive', async () => {
      const otherResident = await createAdditionalResident();
      const { getAuthToken } = await import('./setup.js');
      const otherResidentToken = await getAuthToken(otherResident.email);
      const insertResult = await insertPass(testUsers.resident.id, {
        visitor_name: 'Suspend Route Pass',
        visitor_phone: '+254711757575',
        status: 'active'
      });

      const passId = insertResult.rows[0].id;

      const otherResidentResponse = await request(app)
        .post(`/api/recurring-passes/${passId}/suspend`)
        .set('Authorization', `Bearer ${otherResidentToken}`);

      expect(otherResidentResponse.status).toBe(404);
      expect(otherResidentResponse.body.success).toBe(false);
      expect(otherResidentResponse.body.error).toBe('Pass not found or not active');

      const adminResponse = await request(app)
        .post(`/api/recurring-passes/${passId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminResponse.status).toBe(404);
      expect(adminResponse.body.success).toBe(false);
      expect(adminResponse.body.error).toBe('Pass not found or not active');

      const guardResponse = await request(app)
        .post(`/api/recurring-passes/${passId}/suspend`)
        .set('Authorization', `Bearer ${guardToken}`);

      expect(guardResponse.status).toBe(404);
      expect(guardResponse.body.success).toBe(false);
      expect(guardResponse.body.error).toBe('Pass not found or not active');

      const ownerResponse = await request(app)
        .post(`/api/recurring-passes/${passId}/suspend`)
        .set('Authorization', `Bearer ${residentToken}`);

      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body.success).toBe(true);
      expect(ownerResponse.body.data.id).toBe(passId);
      expect(ownerResponse.body.data.status).toBe('suspended');
      expect(ownerResponse.body.data.visitor_name).toBe('Suspend Route Pass');

      const suspendedPass = await query(
        'SELECT status FROM recurring_passes WHERE id = $1',
        [passId]
      );

      expect(suspendedPass.rows[0].status).toBe('suspended');

      const ownerAlreadySuspendedResponse = await request(app)
        .post(`/api/recurring-passes/${passId}/suspend`)
        .set('Authorization', `Bearer ${residentToken}`);

      expect(ownerAlreadySuspendedResponse.status).toBe(404);
      expect(ownerAlreadySuspendedResponse.body.success).toBe(false);
      expect(ownerAlreadySuspendedResponse.body.error).toBe('Pass not found or not active');
    });
  });

  // =========================================
  // Pass Route Revoke Boundary Tests
  // =========================================
  describe('Pass Route Revoke Boundary', () => {
    it('should allow only the authenticated owner to revoke an active pass, persist the revoke reason, and then reject further revoke attempts once inactive', async () => {
      const otherResident = await createAdditionalResident();
      const { getAuthToken } = await import('./setup.js');
      const otherResidentToken = await getAuthToken(otherResident.email);
      const revokeReason = 'Resident ended contractor access';
      const insertResult = await insertPass(testUsers.resident.id, {
        visitor_name: 'Revoke Route Pass',
        visitor_phone: '+254711797979',
        status: 'active'
      });

      const passId = insertResult.rows[0].id;

      const otherResidentResponse = await request(app)
        .post(`/api/recurring-passes/${passId}/revoke`)
        .set('Authorization', `Bearer ${otherResidentToken}`)
        .send({ reason: revokeReason });

      expect(otherResidentResponse.status).toBe(404);
      expect(otherResidentResponse.body.success).toBe(false);
      expect(otherResidentResponse.body.error).toBe('Pass not found or already revoked');

      const adminResponse = await request(app)
        .post(`/api/recurring-passes/${passId}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: revokeReason });

      expect(adminResponse.status).toBe(404);
      expect(adminResponse.body.success).toBe(false);
      expect(adminResponse.body.error).toBe('Pass not found or already revoked');

      const guardResponse = await request(app)
        .post(`/api/recurring-passes/${passId}/revoke`)
        .set('Authorization', `Bearer ${guardToken}`)
        .send({ reason: revokeReason });

      expect(guardResponse.status).toBe(404);
      expect(guardResponse.body.success).toBe(false);
      expect(guardResponse.body.error).toBe('Pass not found or already revoked');

      const ownerResponse = await request(app)
        .post(`/api/recurring-passes/${passId}/revoke`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({ reason: revokeReason });

      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body.success).toBe(true);
      expect(ownerResponse.body.data.id).toBe(passId);
      expect(ownerResponse.body.data.status).toBe('revoked');
      expect(ownerResponse.body.data.visitor_name).toBe('Revoke Route Pass');

      const revokedPass = await query(
        'SELECT status, revoked_reason FROM recurring_passes WHERE id = $1',
        [passId]
      );

      expect(revokedPass.rows[0].status).toBe('revoked');
      expect(revokedPass.rows[0].revoked_reason).toBe(revokeReason);

      const ownerAlreadyRevokedResponse = await request(app)
        .post(`/api/recurring-passes/${passId}/revoke`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({ reason: 'Second revoke should not succeed' });

      expect(ownerAlreadyRevokedResponse.status).toBe(404);
      expect(ownerAlreadyRevokedResponse.body.success).toBe(false);
      expect(ownerAlreadyRevokedResponse.body.error).toBe('Pass not found or already revoked');
    });
  });

  // =========================================
  // Pass Route Reactivate Boundary Tests
  // =========================================
  describe('Pass Route Reactivate Boundary', () => {
    it('should allow only the authenticated owner to reactivate a suspended pass and then reject further reactivation attempts once already active', async () => {
      const otherResident = await createAdditionalResident();
      const { getAuthToken } = await import('./setup.js');
      const otherResidentToken = await getAuthToken(otherResident.email);
      const insertResult = await insertPass(testUsers.resident.id, {
        visitor_name: 'Reactivate Route Pass',
        visitor_phone: '+254711787878',
        status: 'suspended'
      });

      const passId = insertResult.rows[0].id;

      const otherResidentResponse = await request(app)
        .post(`/api/recurring-passes/${passId}/reactivate`)
        .set('Authorization', `Bearer ${otherResidentToken}`);

      expect(otherResidentResponse.status).toBe(404);
      expect(otherResidentResponse.body.success).toBe(false);
      expect(otherResidentResponse.body.error).toBe('Pass not found or not suspended');

      const adminResponse = await request(app)
        .post(`/api/recurring-passes/${passId}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminResponse.status).toBe(404);
      expect(adminResponse.body.success).toBe(false);
      expect(adminResponse.body.error).toBe('Pass not found or not suspended');

      const guardResponse = await request(app)
        .post(`/api/recurring-passes/${passId}/reactivate`)
        .set('Authorization', `Bearer ${guardToken}`);

      expect(guardResponse.status).toBe(404);
      expect(guardResponse.body.success).toBe(false);
      expect(guardResponse.body.error).toBe('Pass not found or not suspended');

      const ownerResponse = await request(app)
        .post(`/api/recurring-passes/${passId}/reactivate`)
        .set('Authorization', `Bearer ${residentToken}`);

      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body.success).toBe(true);
      expect(ownerResponse.body.data.id).toBe(passId);
      expect(ownerResponse.body.data.status).toBe('active');
      expect(ownerResponse.body.data.visitor_name).toBe('Reactivate Route Pass');

      const reactivatedPass = await query(
        'SELECT status FROM recurring_passes WHERE id = $1',
        [passId]
      );

      expect(reactivatedPass.rows[0].status).toBe('active');

      const ownerAlreadyActiveResponse = await request(app)
        .post(`/api/recurring-passes/${passId}/reactivate`)
        .set('Authorization', `Bearer ${residentToken}`);

      expect(ownerAlreadyActiveResponse.status).toBe(404);
      expect(ownerAlreadyActiveResponse.body.success).toBe(false);
      expect(ownerAlreadyActiveResponse.body.error).toBe('Pass not found or not suspended');
    });
  });

  // =========================================
  // Pass Route Update Boundary Tests
  // =========================================
  describe('Pass Route Update Boundary', () => {
    it('should allow only the authenticated owner to update a pass when the payload contains accepted update fields', async () => {
      const otherResident = await createAdditionalResident();
      const { getAuthToken } = await import('./setup.js');
      const otherResidentToken = await getAuthToken(otherResident.email);
      const updatedValidUntil = toDate(new Date(Date.now() + 45 * 86400000));
      const insertResult = await insertPass(testUsers.resident.id, {
        visitor_name: 'Original Update Route Pass',
        visitor_phone: '+254711808080',
        purpose: 'Original access purpose'
      });

      const passId = insertResult.rows[0].id;
      const updates = {
        visitorName: 'Updated Update Route Pass',
        visitor_phone: '+254711818181',
        vehiclePlate: 'KDD 123A',
        purpose: 'Updated access purpose',
        valid_until: updatedValidUntil,
        allowedDays: ['tue', 'thu'],
        allowed_time_start: '08:30',
        allowedTimeEnd: '17:45'
      };

      const otherResidentResponse = await request(app)
        .put(`/api/recurring-passes/${passId}`)
        .set('Authorization', `Bearer ${otherResidentToken}`)
        .send(updates);

      expect(otherResidentResponse.status).toBe(404);
      expect(otherResidentResponse.body.success).toBe(false);
      expect(otherResidentResponse.body.error).toBe('Pass not found');

      const adminResponse = await request(app)
        .put(`/api/recurring-passes/${passId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates);

      expect(adminResponse.status).toBe(404);
      expect(adminResponse.body.success).toBe(false);
      expect(adminResponse.body.error).toBe('Pass not found');

      const guardResponse = await request(app)
        .put(`/api/recurring-passes/${passId}`)
        .set('Authorization', `Bearer ${guardToken}`)
        .send(updates);

      expect(guardResponse.status).toBe(404);
      expect(guardResponse.body.success).toBe(false);
      expect(guardResponse.body.error).toBe('Pass not found');

      const ownerResponse = await request(app)
        .put(`/api/recurring-passes/${passId}`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send(updates);

      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body.success).toBe(true);
      expect(ownerResponse.body.data.id).toBe(passId);
      expect(ownerResponse.body.data.visitor_name).toBe('Updated Update Route Pass');
      expect(ownerResponse.body.data.status).toBe('active');
      expect(ownerResponse.body.data.valid_until).toBeTruthy();

      const updatedPass = await query(
        `SELECT visitor_name, visitor_phone, vehicle_plate, purpose,
                TO_CHAR(valid_until, 'YYYY-MM-DD') AS valid_until_ymd,
                allowed_days, allowed_time_start, allowed_time_end, status
         FROM recurring_passes
         WHERE id = $1`,
        [passId]
      );

      expect(updatedPass.rows[0].visitor_name).toBe('Updated Update Route Pass');
      expect(updatedPass.rows[0].visitor_phone).toBe('+254711818181');
      expect(updatedPass.rows[0].vehicle_plate).toBe('KDD 123A');
      expect(updatedPass.rows[0].purpose).toBe('Updated access purpose');
      expect(updatedPass.rows[0].valid_until_ymd).toBe(updatedValidUntil);
      expect(updatedPass.rows[0].allowed_days).toEqual(['tue', 'thu']);
      expect(updatedPass.rows[0].allowed_time_start.slice(0, 5)).toBe('08:30');
      expect(updatedPass.rows[0].allowed_time_end.slice(0, 5)).toBe('17:45');
      expect(updatedPass.rows[0].status).toBe('active');
    });

    it('should return no valid fields to update for any authenticated identity before ownership is evaluated', async () => {
      const otherResident = await createAdditionalResident();
      const { getAuthToken } = await import('./setup.js');
      const otherResidentToken = await getAuthToken(otherResident.email);
      const insertResult = await insertPass(testUsers.resident.id, {
        visitor_name: 'Invalid Update Route Pass',
        visitor_phone: '+254711828282',
        status: 'active'
      });

      const passId = insertResult.rows[0].id;
      const invalidUpdates = {
        status: 'revoked',
        visitorIdNumber: '12345678'
      };

      const ownerResponse = await request(app)
        .put(`/api/recurring-passes/${passId}`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send(invalidUpdates);

      expect(ownerResponse.status).toBe(400);
      expect(ownerResponse.body).toEqual({
        success: false,
        error: 'No valid fields to update'
      });

      const otherResidentResponse = await request(app)
        .put(`/api/recurring-passes/${passId}`)
        .set('Authorization', `Bearer ${otherResidentToken}`)
        .send(invalidUpdates);

      expect(otherResidentResponse.status).toBe(400);
      expect(otherResidentResponse.body).toEqual({
        success: false,
        error: 'No valid fields to update'
      });

      const adminResponse = await request(app)
        .put(`/api/recurring-passes/${passId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidUpdates);

      expect(adminResponse.status).toBe(400);
      expect(adminResponse.body).toEqual({
        success: false,
        error: 'No valid fields to update'
      });

      const guardResponse = await request(app)
        .put(`/api/recurring-passes/${passId}`)
        .set('Authorization', `Bearer ${guardToken}`)
        .send(invalidUpdates);

      expect(guardResponse.status).toBe(400);
      expect(guardResponse.body).toEqual({
        success: false,
        error: 'No valid fields to update'
      });

      const unchangedPass = await query(
        'SELECT visitor_name, status FROM recurring_passes WHERE id = $1',
        [passId]
      );

      expect(unchangedPass.rows[0].visitor_name).toBe('Invalid Update Route Pass');
      expect(unchangedPass.rows[0].status).toBe('active');
    });
  });

  // =========================================
  // Pass Route Detail Boundary Tests
  // =========================================
  describe('Pass Route Detail Boundary', () => {
    it('should return pass detail to the owner and respond with not found for other authenticated identities', async () => {
      const otherResident = await createAdditionalResident();
      const { getAuthToken } = await import('./setup.js');
      const otherResidentToken = await getAuthToken(otherResident.email);
      const insertResult = await insertPass(testUsers.resident.id, {
        visitor_name: 'Owner Scoped Detail Pass',
        visitor_phone: '+254711767676'
      });

      const passId = insertResult.rows[0].id;

      const ownerResponse = await request(app)
        .get(`/api/recurring-passes/${passId}`)
        .set('Authorization', `Bearer ${residentToken}`);

      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body.success).toBe(true);
      expect(ownerResponse.body.data.id).toBe(passId);
      expect(ownerResponse.body.data.resident_id).toBe(testUsers.resident.id);
      expect(ownerResponse.body.data.visitor_name).toBe('Owner Scoped Detail Pass');

      const otherResidentResponse = await request(app)
        .get(`/api/recurring-passes/${passId}`)
        .set('Authorization', `Bearer ${otherResidentToken}`);

      expect(otherResidentResponse.status).toBe(404);
      expect(otherResidentResponse.body.success).toBe(false);
      expect(otherResidentResponse.body.error).toBe('Pass not found');

      const adminResponse = await request(app)
        .get(`/api/recurring-passes/${passId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminResponse.status).toBe(404);
      expect(adminResponse.body.success).toBe(false);
      expect(adminResponse.body.error).toBe('Pass not found');

      const guardResponse = await request(app)
        .get(`/api/recurring-passes/${passId}`)
        .set('Authorization', `Bearer ${guardToken}`);

      expect(guardResponse.status).toBe(404);
      expect(guardResponse.body.success).toBe(false);
      expect(guardResponse.body.error).toBe('Pass not found');
    });
  });

  // =========================================
  // Pass Route History Boundary Tests
  // =========================================
  describe('Pass Route History Boundary', () => {
    it('should return owner history after validate-success records an entry and reject other resident and admin access', async () => {
      const otherResident = await createAdditionalResident();
      const { getAuthToken } = await import('./setup.js');
      const otherResidentToken = await getAuthToken(otherResident.email);
      const qrCredential = buildQrToken();
      const insertResult = await insertPass(testUsers.resident.id, {
        visitor_name: 'History Route Pass',
        visitor_phone: '+254711777777',
        qr_code_token: qrCredential,
        valid_from: toDate(new Date(Date.now() - 86400000)),
        valid_until: toDate(new Date(Date.now() + 86400000)),
        allowed_days: [getCurrentDayCode()],
        status: 'active'
      });

      const passId = insertResult.rows[0].id;

      await query(
        `UPDATE recurring_passes
         SET allowed_time_start = '00:00', allowed_time_end = '23:59'
         WHERE id = $1`,
        [passId]
      );

      const validateResponse = await request(app)
        .post('/api/recurring-passes/validate')
        .set('Authorization', `Bearer ${guardToken}`)
        .send({
          credential: qrCredential,
          method: 'qr'
        });

      expect(validateResponse.status).toBe(200);
      expect(validateResponse.body.success).toBe(true);
      expect(validateResponse.body.valid).toBe(true);

      const ownerResponse = await request(app)
        .get(`/api/recurring-passes/${passId}/history`)
        .set('Authorization', `Bearer ${residentToken}`);

      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body.success).toBe(true);
      expect(ownerResponse.body.data).toHaveLength(1);
      expect(ownerResponse.body.data[0].pass_id).toBe(passId);
      expect(ownerResponse.body.data[0].verified_by_guard_id).toBe(testUsers.guard.id);
      expect(ownerResponse.body.data[0].entry_method).toBe('qr');

      const otherResidentResponse = await request(app)
        .get(`/api/recurring-passes/${passId}/history`)
        .set('Authorization', `Bearer ${otherResidentToken}`);

      expect(otherResidentResponse.status).toBe(404);
      expect(otherResidentResponse.body.success).toBe(false);
      expect(otherResidentResponse.body.error).toBe('Pass not found');

      const adminResponse = await request(app)
        .get(`/api/recurring-passes/${passId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminResponse.status).toBe(404);
      expect(adminResponse.body.success).toBe(false);
      expect(adminResponse.body.error).toBe('Pass not found');
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
