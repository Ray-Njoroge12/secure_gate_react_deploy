/**
 * Authentication Refresh + Logout Integration Tests
 * Validates refresh token flow and logout behavior for critical auth path.
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers } from './setup.js';

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

describe('Auth refresh/logout integration', () => {
  let app;
  let testUsers;

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
  });

  it('refreshes access tokens with a valid refresh token', async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUsers.admin.email,
        password: 'testpass123'
      });

    expect(loginResponse.status).toBe(200);
    const refreshToken = loginResponse.body.refreshToken || loginResponse.body.data?.refreshToken;

    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.data?.accessToken || refreshResponse.body.accessToken).toBeDefined();
  });

  it('logs out and clears auth cookies', async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUsers.admin.email,
        password: 'testpass123'
      });

    const accessToken = loginResponse.body.accessToken || loginResponse.body.data?.accessToken;

    const logoutResponse = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.success).toBe(true);

    const cookies = logoutResponse.headers['set-cookie'] || [];
    const cookieHeader = cookies.join(';');
    expect(cookieHeader).toContain('accessToken=');
    expect(cookieHeader).toContain('refreshToken=');
  });

  it('rejects refresh without a token', async () => {
    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .send({});

    expect(refreshResponse.status).toBe(400);
  });
});
