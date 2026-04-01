import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers, getAuthToken } from './setup.js';

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

describe('Wave 8 specialty mounted routes', () => {
  let app;
  let testUsers;
  let adminToken;
  let guardToken;
  let residentToken;
  let superAdminToken;

  beforeAll(async () => {
    await setupTestDatabase();
    app = (await import('../../src/app.js')).default;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
    testUsers = await createTestUsers();
    [adminToken, guardToken, residentToken, superAdminToken] = await Promise.all([
      getAuthToken(testUsers.admin.email),
      getAuthToken(testUsers.guard.email),
      getAuthToken(testUsers.resident.email),
      getAuthToken(testUsers.superAdmin.email)
    ]);
  });

  it('keeps session metrics protected and legacy compliance status unmounted', async () => {
    const [sessionMetricsResponse, complianceStatusResponse] = await Promise.all([
      request(app).get('/api/sessions/metrics'),
      request(app).get('/api/compliance/status')
    ]);

    expect(sessionMetricsResponse.status).toBe(401);
    expect(sessionMetricsResponse.body.error.code).toBe('AUTH_TOKEN_MISSING');

    expect(complianceStatusResponse.status).toBe(404);
    expect(complianceStatusResponse.body.error.code).toBe('NOT_FOUND');
  });

  it('exposes public health, database health, Kenya DPA, and SSE smoke endpoints', async () => {
    const [healthResponse, dbHealthResponse, dpoResponse, sseTestResponse] = await Promise.all([
      request(app).get('/health'),
      request(app).get('/api/db/health'),
      request(app).get('/api/privacy/dpo'),
      request(app).get('/api/sse/test')
    ]);

    expect(healthResponse.status).toBe(200);
    expect(healthResponse.body.status).toBeDefined();
    expect(dbHealthResponse.status).toBeOneOf([200, 503]);
    expect(dbHealthResponse.body.success).toBe(true);
    expect(dpoResponse.status).toBe(200);
    expect(dpoResponse.body.data).toEqual(expect.objectContaining({ is_appointed: expect.any(Boolean) }));
    expect(sseTestResponse.status).toBe(200);
    expect(sseTestResponse.body.message).toMatch(/SSE routes are accessible/i);
  });

  it('enforces auth and role boundaries for MFA, security, monitoring, health, and Kenya DPA admin seams', async () => {
    const [mfaVerifyResponse, securityGuardResponse, securityAdminResponse, monitoringAdminResponse, monitoringSuperResponse, healthDetailedResponse, kenyaGuardResponse, kenyaAdminResponse] = await Promise.all([
      request(app).post('/api/mfa/verify').send({}),
      request(app).get('/api/security/status').set('Authorization', `Bearer ${guardToken}`),
      request(app).get('/api/security/status').set('Authorization', `Bearer ${adminToken}`),
      request(app).post('/api/monitoring/thresholds').set('Authorization', `Bearer ${adminToken}`).send({ errorRate: 0.2 }),
      request(app).post('/api/monitoring/thresholds').set('Authorization', `Bearer ${superAdminToken}`).send({}),
      request(app).get('/health/detailed').set('Authorization', `Bearer ${adminToken}`),
      request(app).get('/api/admin/compliance/kenya-dpa').set('Authorization', `Bearer ${guardToken}`),
      request(app).get('/api/admin/compliance/kenya-dpa').set('Authorization', `Bearer ${adminToken}`)
    ]);

    expect(mfaVerifyResponse.status).toBe(400);
    expect(mfaVerifyResponse.body.error.code).toBe('VALIDATION_ERROR');
    expect(securityGuardResponse.status).toBe(403);
    expect(securityGuardResponse.body.error.code).toBe('AUTH_FORBIDDEN');
    expect(securityAdminResponse.status).toBe(200);
    expect(securityAdminResponse.body.success).toBe(true);
    expect(securityAdminResponse.body.data).toHaveProperty('compliance');
    expect(monitoringAdminResponse.status).toBe(403);
    expect(monitoringAdminResponse.body.error.code).toBe('AUTH_FORBIDDEN');
    expect(monitoringSuperResponse.status).toBe(400);
    expect(monitoringSuperResponse.body.error).toMatch(/No valid threshold values/i);
    expect(healthDetailedResponse.status).toBe(200);
    expect(healthDetailedResponse.body.success).toBe(true);
    expect(kenyaGuardResponse.status).toBe(403);
    expect(kenyaGuardResponse.body.error.code).toBe('AUTH_FORBIDDEN');
    expect(kenyaAdminResponse.status).toBe(200);
    expect(kenyaAdminResponse.body.success).toBe(true);
  });

  it('shows MFA status by role and keeps sync status authenticated while validating upload payloads', async () => {
    const [residentMfaStatus, adminMfaStatus, syncAnonResponse, syncAuthResponse, syncInvalidUploadResponse] = await Promise.all([
      request(app).get('/api/mfa/status').set('Authorization', `Bearer ${residentToken}`),
      request(app).get('/api/mfa/status').set('Authorization', `Bearer ${adminToken}`),
      request(app).get('/api/sync/status'),
      request(app).get('/api/sync/status').set('Authorization', `Bearer ${adminToken}`),
      request(app).post('/api/sync/upload').set('Authorization', `Bearer ${adminToken}`).send({ packageId: '', changes: 'invalid' })
    ]);

    expect(residentMfaStatus.status).toBe(200);
    expect(residentMfaStatus.body.data).toEqual(expect.objectContaining({ mfaRequired: false }));
    expect(adminMfaStatus.status).toBe(200);
    expect(adminMfaStatus.body.data).toEqual(expect.objectContaining({ mfaRequired: true }));
    expect(syncAnonResponse.status).toBe(401);
    expect(syncAnonResponse.body.error.code).toBe('AUTH_TOKEN_MISSING');
    expect(syncAuthResponse.status).toBe(200);
    expect(syncAuthResponse.body.data).toEqual(expect.objectContaining({ online: true, syncEnabled: true }));
    expect(syncInvalidUploadResponse.status).toBe(400);
    expect(syncInvalidUploadResponse.body.error).toBe('Invalid sync upload format');
  });

  it('keeps database detailed health admin-only even for super admins', async () => {
    const [adminResponse, superAdminResponse] = await Promise.all([
      request(app).get('/api/db/health/detailed').set('Authorization', `Bearer ${adminToken}`),
      request(app).get('/api/db/health/detailed').set('Authorization', `Bearer ${superAdminToken}`)
    ]);

    expect(adminResponse.status).toBe(200);
    expect(adminResponse.body.success).toBe(true);
    expect(superAdminResponse.status).toBe(403);
    expect(superAdminResponse.body.error.code).toBe('AUTH_FORBIDDEN');
  });
});

expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    return {
      pass,
      message: () => pass ? `expected ${received} not to be one of ${expected}` : `expected ${received} to be one of ${expected}`
    };
  }
});