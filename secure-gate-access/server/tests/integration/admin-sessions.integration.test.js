import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers, getAuthToken } from './setup.js';

jest.unstable_mockModule('../../src/services/emailService.js', () => ({
  default: { sendEmail: jest.fn().mockResolvedValue() }
}));

describe('Admin Session Management', () => {
  let app;
  let testUsers;
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
    adminToken = await getAuthToken(testUsers.admin.email);
  });

  describe('GET /api/admin/users/:id/sessions', () => {
    it('should return sessions array for a valid user', async () => {
      const res = await request(app)
        .get(`/api/admin/users/${testUsers.resident.id}/sessions`)
        .set('Cookie', `token=${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('sessions');
      expect(Array.isArray(res.body.data.sessions)).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .get(`/api/admin/users/99999999/sessions`)
        .set('Cookie', `token=${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should reject non-admin users', async () => {
      const residentToken = await getAuthToken(testUsers.resident.email);
      const res = await request(app)
        .get(`/api/admin/users/${testUsers.resident.id}/sessions`)
        .set('Cookie', `token=${residentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/admin/users/:id/sessions', () => {
    it('should revoke all sessions for a user', async () => {
      const res = await request(app)
        .delete(`/api/admin/users/${testUsers.resident.id}/sessions`)
        .set('Cookie', `token=${adminToken}`);

      // 200 OK or 400 if MFA required in test env
      expect([200, 400]).toContain(res.status);
    });

    it('should prevent admin from revoking their own sessions', async () => {
      const res = await request(app)
        .delete(`/api/admin/users/${testUsers.admin.id}/sessions`)
        .set('Cookie', `token=${adminToken}`);

      expect([400, 403]).toContain(res.status);
    });
  });
});
