/**
 * Authorization Role Enforcement Integration Tests
 */

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

describe('Authorization role enforcement', () => {
  let app;
  let testUsers;
  let adminToken;
  let guardToken;
  let residentToken;

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
    guardToken = await getAuthToken(testUsers.guard.email);
    residentToken = await getAuthToken(testUsers.resident.email);
  });

  const expectForbiddenWithRequestId = (response) => {
    expect(response.status).toBe(403);
    // Accept both codes as middleware/controller consistency is aligned
    expect(['FORBIDDEN', 'AUTH_FORBIDDEN']).toContain(response.body.error?.code);
    expect(response.body.error?.requestId).toBeTruthy();
  };

  it('denies non-admin access to admin user listing', async () => {
    const residentResponse = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${residentToken}`);

    const guardResponse = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${guardToken}`);

    expectForbiddenWithRequestId(residentResponse);
    expectForbiddenWithRequestId(guardResponse);
  });

  it('allows admin access to admin user listing', async () => {
    const adminResponse = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminResponse.status).toBe(200);
  });

  it('denies non-guard access to guard dashboard', async () => {
    const residentResponse = await request(app)
      .get('/api/guards/dashboard')
      .set('Authorization', `Bearer ${residentToken}`);

    const adminResponse = await request(app)
      .get('/api/guards/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expectForbiddenWithRequestId(residentResponse);
    expectForbiddenWithRequestId(adminResponse);
  });

  it('denies non-admin access to guard roster', async () => {
    const residentResponse = await request(app)
      .get('/api/guards')
      .set('Authorization', `Bearer ${residentToken}`);

    const guardResponse = await request(app)
      .get('/api/guards')
      .set('Authorization', `Bearer ${guardToken}`);

    expectForbiddenWithRequestId(residentResponse);
    expectForbiddenWithRequestId(guardResponse);
  });

  it('denies non-guard access to guard shift start', async () => {
    const residentResponse = await request(app)
      .post('/api/guards/shifts/1/start')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({});

    const adminResponse = await request(app)
      .post('/api/guards/shifts/1/start')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expectForbiddenWithRequestId(residentResponse);
    expectForbiddenWithRequestId(adminResponse);
  });

  it('denies guard access to resident profile', async () => {
    const guardResponse = await request(app)
      .get('/api/resident/profile')
      .set('Authorization', `Bearer ${guardToken}`);

    expectForbiddenWithRequestId(guardResponse);
  });

  it('denies guard access to resident favorites', async () => {
    const guardResponse = await request(app)
      .get('/api/resident/favorites')
      .set('Authorization', `Bearer ${guardToken}`);

    expectForbiddenWithRequestId(guardResponse);
  });

  it('denies non-admin access to security status', async () => {
    const residentResponse = await request(app)
      .get('/api/security/status')
      .set('Authorization', `Bearer ${residentToken}`);

    const guardResponse = await request(app)
      .get('/api/security/status')
      .set('Authorization', `Bearer ${guardToken}`);

    expectForbiddenWithRequestId(residentResponse);
    expectForbiddenWithRequestId(guardResponse);
  });

  it('denies non-admin access to detailed database health', async () => {
    const residentResponse = await request(app)
      .get('/api/db/health/detailed')
      .set('Authorization', `Bearer ${residentToken}`);

    const guardResponse = await request(app)
      .get('/api/db/health/detailed')
      .set('Authorization', `Bearer ${guardToken}`);

    expectForbiddenWithRequestId(residentResponse);
    expectForbiddenWithRequestId(guardResponse);
  });

  it('denies non-admin access to system info', async () => {
    const residentResponse = await request(app)
      .get('/api/system/info')
      .set('Authorization', `Bearer ${residentToken}`);

    const guardResponse = await request(app)
      .get('/api/system/info')
      .set('Authorization', `Bearer ${guardToken}`);

    expectForbiddenWithRequestId(residentResponse);
    expectForbiddenWithRequestId(guardResponse);
  });

  it('denies non-admin access to admin analytics overview', async () => {
    const residentResponse = await request(app)
      .get('/api/admin/analytics/overview')
      .set('Authorization', `Bearer ${residentToken}`);

    const guardResponse = await request(app)
      .get('/api/admin/analytics/overview')
      .set('Authorization', `Bearer ${guardToken}`);

    expectForbiddenWithRequestId(residentResponse);
    expectForbiddenWithRequestId(guardResponse);
  });

  it('denies non-admin access to admin metrics', async () => {
    const residentResponse = await request(app)
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${residentToken}`);

    const guardResponse = await request(app)
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${guardToken}`);

    expectForbiddenWithRequestId(residentResponse);
    expectForbiddenWithRequestId(guardResponse);
  });

  it('denies non-admin access to admin audit logs', async () => {
    const residentResponse = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${residentToken}`);

    const guardResponse = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${guardToken}`);

    expectForbiddenWithRequestId(residentResponse);
    expectForbiddenWithRequestId(guardResponse);
  });

  it('denies guard access to event creation', async () => {
    const guardResponse = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ name: 'Test Event' });

    expectForbiddenWithRequestId(guardResponse);
  });

  it('denies resident access to visitor check-in', async () => {
    const residentResponse = await request(app)
      .post('/api/visitors/123/check-in')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({});

    expectForbiddenWithRequestId(residentResponse);
  });

  it('denies guard access to visitor approval', async () => {
    const guardResponse = await request(app)
      .post('/api/visitors/123/approve')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({});

    expectForbiddenWithRequestId(guardResponse);
  });

  it('denies guard access to visitor creation', async () => {
    const guardResponse = await request(app)
      .post('/api/visitors')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({
        name: 'Guard Attempt',
        phone: '+254700123456'
      });

    expect(guardResponse.status).toBe(403);
  });

  it('allows guard access to visitor lists', async () => {
    const guardResponse = await request(app)
      .get('/api/visitors')
      .set('Authorization', `Bearer ${guardToken}`);

    expect(guardResponse.status).toBe(200);
  });

  it('denies non-admin access to visitor reports', async () => {
    const residentResponse = await request(app)
      .get('/api/visitors/report')
      .set('Authorization', `Bearer ${residentToken}`);

    const guardResponse = await request(app)
      .get('/api/visitors/report')
      .set('Authorization', `Bearer ${guardToken}`);

    expectForbiddenWithRequestId(residentResponse);
    expectForbiddenWithRequestId(guardResponse);
  });

  it('denies guard access to event attendees', async () => {
    const guardResponse = await request(app)
      .get('/api/events/1/attendees')
      .set('Authorization', `Bearer ${guardToken}`);

    expectForbiddenWithRequestId(guardResponse);
  });

  it('denies non-admin access to delivery webhook stats', async () => {
    const residentResponse = await request(app)
      .get('/api/webhooks/delivery/stats')
      .set('Authorization', `Bearer ${residentToken}`);

    const guardResponse = await request(app)
      .get('/api/webhooks/delivery/stats')
      .set('Authorization', `Bearer ${guardToken}`);

    expectForbiddenWithRequestId(residentResponse);
    expectForbiddenWithRequestId(guardResponse);
  });

  it('denies non-admin access to monitoring metrics', async () => {
    const residentResponse = await request(app)
      .get('/api/monitoring/metrics')
      .set('Authorization', `Bearer ${residentToken}`);

    const guardResponse = await request(app)
      .get('/api/monitoring/metrics')
      .set('Authorization', `Bearer ${guardToken}`);

    expectForbiddenWithRequestId(residentResponse);
    expectForbiddenWithRequestId(guardResponse);
  });

  it('allows admin access to monitoring metrics', async () => {
    const adminResponse = await request(app)
      .get('/api/monitoring/metrics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminResponse.status).toBe(200);
  });

  it('allows admin access to security headers', async () => {
    const adminResponse = await request(app)
      .get('/api/security/headers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminResponse.status).toBe(200);
  });
});
