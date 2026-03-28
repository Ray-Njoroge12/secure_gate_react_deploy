/**
 * Company & Worker Access Management Integration Tests
 *
 * Tests the full lifecycle:
 * - Company registration → admin approval → role promotion
 * - Worker registration (single + bulk) → pre-approval → pass generation
 * - Worker check-in → check-out (guard flow)
 * - Estate scoping and company isolation
 * - Role-based access enforcement
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers, getAuthToken, dbManager } from './setup.js';

// Mock notification services to prevent external calls
jest.unstable_mockModule('../../src/services/emailService.js', () => ({
  default: { sendEmail: jest.fn().mockResolvedValue() }
}));
jest.unstable_mockModule('../../src/services/smsService.js', () => ({
  default: { sendSMS: jest.fn().mockResolvedValue() }
}));
jest.unstable_mockModule('../../src/services/whatsappService.js', () => ({
  sendCheckInNotification: jest.fn().mockResolvedValue(),
  sendCheckOutNotification: jest.fn().mockResolvedValue(),
  default: { send: jest.fn().mockResolvedValue() }
}));

describe('Company & Worker Access Management', () => {
  let app;
  let adminToken, guardToken, residentToken;
  let testUsers;
  let testEstateId = 1;

  beforeAll(async () => {
    await setupTestDatabase();
    const appModule = await import('../../src/app.js');
    app = appModule.default;

    // Ensure the company tables exist (migration may not have run in test DB)
    try {
      await dbManager.query(`SELECT 1 FROM companies LIMIT 0`);
    } catch (err) {
      // If tables don't exist, skip these tests gracefully
      console.warn('Company tables not found in test DB - run migration 068 first');
      return;
    }
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await dbManager.query(`DELETE FROM worker_check_ins WHERE estate_id = $1`, [testEstateId]);
      await dbManager.query(`DELETE FROM worker_passes WHERE worker_id IN (SELECT id FROM workers WHERE estate_id = $1)`, [testEstateId]);
      await dbManager.query(`DELETE FROM workers WHERE estate_id = $1`, [testEstateId]);
      await dbManager.query(`DELETE FROM company_locations WHERE company_id IN (SELECT id FROM companies WHERE estate_id = $1)`, [testEstateId]);
      await dbManager.query(`DELETE FROM companies WHERE estate_id = $1`, [testEstateId]);
      await dbManager.query(`UPDATE users SET company_id = NULL, role = CASE WHEN role = 'company_admin' THEN 'resident' ELSE role END WHERE estate_id = $1 AND company_id IS NOT NULL`, [testEstateId]);
    } catch (err) {
      // Ignore cleanup errors
    }
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    testUsers = await createTestUsers();
    adminToken = await getAuthToken(testUsers.admin.email);
    guardToken = await getAuthToken(testUsers.guard.email);
    residentToken = await getAuthToken(testUsers.resident.email);
  });

  describe('Company Registration Lifecycle', () => {
    it('should register a company (authenticated user)', async () => {
      const res = await request(app)
        .post('/api/companies/register')
        .set('Cookie', [`accessToken=${residentToken}`])
        .send({
          name: `Test Corp ${Date.now()}`,
          registrationNumber: `RC-${Date.now()}`,
          contactName: 'John Doe',
          contactEmail: 'john@testcorp.com',
          contactPhone: '+254700000001',
          description: 'Integration test company'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.company).toBeDefined();
      expect(res.body.data.company.status).toBe('pending');
    });

    it('should NOT allow unauthenticated company registration', async () => {
      const res = await request(app)
        .post('/api/companies/register')
        .send({ name: 'Unauthorized Corp' });

      expect(res.status).toBe(401);
    });

    it('should allow admin to list companies', async () => {
      const res = await request(app)
        .get('/api/companies')
        .set('Cookie', [`accessToken=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.companies).toBeDefined();
    });

    it('should NOT allow resident to list companies', async () => {
      const res = await request(app)
        .get('/api/companies')
        .set('Cookie', [`accessToken=${residentToken}`]);

      expect(res.status).toBe(403);
    });

    it('admin should approve a pending company', async () => {
      // First create a company
      const createRes = await request(app)
        .post('/api/companies/register')
        .set('Cookie', [`accessToken=${residentToken}`])
        .send({ name: `Approve Corp ${Date.now()}` });

      const companyId = createRes.body.data.company.id;

      // Admin approves
      const approveRes = await request(app)
        .post(`/api/companies/${companyId}/approve`)
        .set('Cookie', [`accessToken=${adminToken}`]);

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.company.status).toBe('approved');

      // Verify the registering user was promoted to company_admin
      const userCheck = await dbManager.query(
        `SELECT role, company_id FROM users WHERE id = $1`,
        [testUsers.resident.id]
      );
      expect(userCheck.rows[0].role).toBe('company_admin');
      expect(userCheck.rows[0].company_id).toBe(companyId);
    });

    it('admin should reject a pending company with reason', async () => {
      const createRes = await request(app)
        .post('/api/companies/register')
        .set('Cookie', [`accessToken=${residentToken}`])
        .send({ name: `Reject Corp ${Date.now()}` });

      const companyId = createRes.body.data.company.id;

      const rejectRes = await request(app)
        .post(`/api/companies/${companyId}/reject`)
        .set('Cookie', [`accessToken=${adminToken}`])
        .send({ reason: 'Invalid documentation' });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.data.company.status).toBe('rejected');
    });

    it('guard should NOT be able to approve companies', async () => {
      const createRes = await request(app)
        .post('/api/companies/register')
        .set('Cookie', [`accessToken=${residentToken}`])
        .send({ name: `Guard Test Corp ${Date.now()}` });

      const companyId = createRes.body.data.company.id;

      const approveRes = await request(app)
        .post(`/api/companies/${companyId}/approve`)
        .set('Cookie', [`accessToken=${guardToken}`]);

      expect(approveRes.status).toBe(403);
    });
  });

  describe('Worker Management', () => {
    let companyId;
    let companyAdminToken;

    beforeEach(async () => {
      // Create and approve a company
      const createRes = await request(app)
        .post('/api/companies/register')
        .set('Cookie', [`accessToken=${residentToken}`])
        .send({ name: `Worker Test Corp ${Date.now()}` });

      companyId = createRes.body.data.company.id;

      await request(app)
        .post(`/api/companies/${companyId}/approve`)
        .set('Cookie', [`accessToken=${adminToken}`]);

      // Get a fresh token for the now-promoted company admin
      companyAdminToken = await getAuthToken(testUsers.resident.email);
    });

    it('company admin should register a worker', async () => {
      const res = await request(app)
        .post('/api/workers')
        .set('Cookie', [`accessToken=${companyAdminToken}`])
        .send({
          firstName: 'Jane',
          lastName: 'Worker',
          phone: '+254700000002',
          workerType: 'employee',
          preApproved: true
        });

      expect(res.status).toBe(200);
      expect(res.body.data.worker).toBeDefined();
      expect(res.body.data.worker.status).toBe('active');
    });

    it('company admin should bulk register workers', async () => {
      const res = await request(app)
        .post('/api/workers/bulk')
        .set('Cookie', [`accessToken=${companyAdminToken}`])
        .send({
          workers: [
            { firstName: 'Bulk', lastName: 'Worker1', phone: '+254700000003', workerType: 'employee' },
            { firstName: 'Bulk', lastName: 'Worker2', phone: '+254700000004', workerType: 'subcontractor' }
          ],
          preApproved: true
        });

      expect(res.status).toBe(200);
      expect(res.body.data.registered).toBe(2);
      expect(res.body.data.errors).toHaveLength(0);
    });

    it('guard should NOT register workers', async () => {
      const res = await request(app)
        .post('/api/workers')
        .set('Cookie', [`accessToken=${guardToken}`])
        .send({ firstName: 'Unauthorized', lastName: 'Worker' });

      expect(res.status).toBe(403);
    });
  });

  describe('Worker Check-in/Check-out (Guard Flow)', () => {
    let companyId, workerId, companyAdminToken;

    beforeEach(async () => {
      // Setup: company + approved worker
      const createRes = await request(app)
        .post('/api/companies/register')
        .set('Cookie', [`accessToken=${residentToken}`])
        .send({ name: `Checkin Corp ${Date.now()}` });

      companyId = createRes.body.data.company.id;

      await request(app)
        .post(`/api/companies/${companyId}/approve`)
        .set('Cookie', [`accessToken=${adminToken}`]);

      companyAdminToken = await getAuthToken(testUsers.resident.email);

      const workerRes = await request(app)
        .post('/api/workers')
        .set('Cookie', [`accessToken=${companyAdminToken}`])
        .send({
          firstName: 'Gate',
          lastName: 'Worker',
          phone: '+254700000005',
          preApproved: true
        });

      workerId = workerRes.body.data.worker.id;
    });

    it('guard should check in a worker', async () => {
      const res = await request(app)
        .post(`/api/workers/${workerId}/check-in`)
        .set('Cookie', [`accessToken=${guardToken}`])
        .send({ notes: 'Morning shift' });

      expect(res.status).toBe(200);
      expect(res.body.data.checkIn).toBeDefined();
    });

    it('guard should see active workers', async () => {
      // Check in first
      await request(app)
        .post(`/api/workers/${workerId}/check-in`)
        .set('Cookie', [`accessToken=${guardToken}`]);

      const res = await request(app)
        .get('/api/workers/active')
        .set('Cookie', [`accessToken=${guardToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.workers.length).toBeGreaterThanOrEqual(1);
    });

    it('should prevent double check-in', async () => {
      await request(app)
        .post(`/api/workers/${workerId}/check-in`)
        .set('Cookie', [`accessToken=${guardToken}`]);

      const res = await request(app)
        .post(`/api/workers/${workerId}/check-in`)
        .set('Cookie', [`accessToken=${guardToken}`]);

      expect(res.status).toBe(500); // Error thrown by service
    });

    it('guard should check out a worker', async () => {
      const checkInRes = await request(app)
        .post(`/api/workers/${workerId}/check-in`)
        .set('Cookie', [`accessToken=${guardToken}`]);

      const checkInId = checkInRes.body.data.checkIn.id;

      const res = await request(app)
        .post(`/api/workers/check-ins/${checkInId}/check-out`)
        .set('Cookie', [`accessToken=${guardToken}`])
        .send({ notes: 'End of day' });

      expect(res.status).toBe(200);
    });
  });

  describe('Worker Pass Flow', () => {
    let companyId, workerId, companyAdminToken;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/companies/register')
        .set('Cookie', [`accessToken=${residentToken}`])
        .send({ name: `Pass Corp ${Date.now()}` });

      companyId = createRes.body.data.company.id;

      await request(app)
        .post(`/api/companies/${companyId}/approve`)
        .set('Cookie', [`accessToken=${adminToken}`]);

      companyAdminToken = await getAuthToken(testUsers.resident.email);

      const workerRes = await request(app)
        .post('/api/workers')
        .set('Cookie', [`accessToken=${companyAdminToken}`])
        .send({ firstName: 'Pass', lastName: 'Worker', preApproved: true });

      workerId = workerRes.body.data.worker.id;
    });

    it('company admin should generate a worker pass', async () => {
      const res = await request(app)
        .post(`/api/workers/${workerId}/passes`)
        .set('Cookie', [`accessToken=${companyAdminToken}`])
        .send({ passType: 'worker' });

      expect(res.status).toBe(200);
      expect(res.body.data.pass).toBeDefined();
      expect(res.body.data.pass.qrDataUrl || res.body.data.pass.qr_data_url).toBeTruthy();
    });

    it('guard should validate a worker pass QR token', async () => {
      // Generate pass
      const passRes = await request(app)
        .post(`/api/workers/${workerId}/passes`)
        .set('Cookie', [`accessToken=${companyAdminToken}`])
        .send({ passType: 'worker' });

      const qrToken = passRes.body.data.pass.qrToken || passRes.body.data.pass.qr_token;

      // Guard validates
      const res = await request(app)
        .post('/api/workers/passes/validate')
        .set('Cookie', [`accessToken=${guardToken}`])
        .send({ qrToken });

      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.canCheckIn).toBe(true);
    });
  });

  describe('Company Locations', () => {
    let companyId, companyAdminToken;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/companies/register')
        .set('Cookie', [`accessToken=${residentToken}`])
        .send({ name: `Location Corp ${Date.now()}` });

      companyId = createRes.body.data.company.id;

      await request(app)
        .post(`/api/companies/${companyId}/approve`)
        .set('Cookie', [`accessToken=${adminToken}`]);

      companyAdminToken = await getAuthToken(testUsers.resident.email);
    });

    it('should add and list company locations', async () => {
      await request(app)
        .post(`/api/companies/${companyId}/locations`)
        .set('Cookie', [`accessToken=${companyAdminToken}`])
        .send({ name: 'Main Office', address: '123 Street', isPrimary: true });

      await request(app)
        .post(`/api/companies/${companyId}/locations`)
        .set('Cookie', [`accessToken=${companyAdminToken}`])
        .send({ name: 'Branch', address: '456 Ave' });

      const res = await request(app)
        .get(`/api/companies/${companyId}/locations`)
        .set('Cookie', [`accessToken=${companyAdminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.locations.length).toBeGreaterThanOrEqual(2);
    });
  });
});
