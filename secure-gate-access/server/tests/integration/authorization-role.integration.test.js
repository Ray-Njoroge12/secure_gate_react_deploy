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

  it('denies non-admin access to admin user listing', async () => {
    const residentResponse = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${residentToken}`);

    const guardResponse = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${guardToken}`);

    expect(residentResponse.status).toBe(403);
    expect(residentResponse.body.error?.code).toBe('AUTH_FORBIDDEN');
    expect(guardResponse.status).toBe(403);
    expect(guardResponse.body.error?.code).toBe('AUTH_FORBIDDEN');
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

    expect(residentResponse.status).toBe(403);
    expect(residentResponse.body.error?.code).toBe('AUTH_FORBIDDEN');
    expect(adminResponse.status).toBe(403);
    expect(adminResponse.body.error?.code).toBe('AUTH_FORBIDDEN');
  });

  it('denies guard access to resident profile', async () => {
    const guardResponse = await request(app)
      .get('/api/resident/profile')
      .set('Authorization', `Bearer ${guardToken}`);

    expect(guardResponse.status).toBe(403);
    expect(guardResponse.body.error?.code).toBe('AUTH_FORBIDDEN');
  });
});
