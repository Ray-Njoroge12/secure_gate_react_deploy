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
      .set('X-Client-Platform', 'api')
      .send({
        email: testUsers.admin.email,
        password: 'testpass123'
      });

    expect(loginResponse.status).toBe(200);
    const refreshToken = loginResponse.body.refreshToken || loginResponse.body.data?.refreshToken;

    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .set('X-Client-Platform', 'api')
      .send({ refreshToken });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.data?.accessToken || refreshResponse.body.accessToken).toBeDefined();
  });

  it('logs out and clears auth cookies', async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post('/api/auth/login')
      .send({
        email: testUsers.admin.email,
        password: 'testpass123'
      });

    expect(loginResponse.status).toBe(200);

    const logoutResponse = await agent.post('/api/auth/logout');

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.success).toBe(true);

    const cookies = logoutResponse.headers['set-cookie'] || [];
    const accessCookie = cookies.find(cookie => cookie.startsWith('accessToken='));
    const refreshCookie = cookies.find(cookie => cookie.startsWith('refreshToken='));

    expect(accessCookie).toMatch(/Expires=Thu, 01 Jan 1970/i);
    expect(refreshCookie).toMatch(/Expires=Thu, 01 Jan 1970/i);
    expect(refreshCookie).toContain('Path=/api/auth/refresh');
  });

  it('rejects refresh without a token', async () => {
    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .send({});

    expect(refreshResponse.status).toBe(400);
  });
});
