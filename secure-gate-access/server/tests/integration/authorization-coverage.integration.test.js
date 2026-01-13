/**
 * Authorization Coverage Integration Tests
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

describe('Authorization coverage', () => {
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

  it('denies non-admin access to notification queue stats', async () => {
    const residentResponse = await request(app)
      .get('/api/admin/notification-queue/stats')
      .set('Authorization', `Bearer ${residentToken}`);

    const guardResponse = await request(app)
      .get('/api/admin/notification-queue/stats')
      .set('Authorization', `Bearer ${guardToken}`);

    expect(residentResponse.status).toBe(403);
    expect(residentResponse.body.error?.code).toBe('AUTH_FORBIDDEN');
    expect(guardResponse.status).toBe(403);
    expect(guardResponse.body.error?.code).toBe('AUTH_FORBIDDEN');
  });

  it('allows admin access to notification queue stats', async () => {
    const adminResponse = await request(app)
      .get('/api/admin/notification-queue/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminResponse.status).toBe(200);
  });

  it('denies non-admin access to directions update', async () => {
    const residentResponse = await request(app)
      .put('/api/directions/estate')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ latitude: 1.234, longitude: 2.345 });

    const guardResponse = await request(app)
      .put('/api/directions/estate')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ latitude: 1.234, longitude: 2.345 });

    expect([401, 403]).toContain(residentResponse.status);
    expect([401, 403]).toContain(guardResponse.status);
  });
});
