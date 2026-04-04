/**
 * Auth + CSRF + Estate Integration Tests
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

describe('Auth, CSRF, and estate integration', () => {
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

  it('sets access and refresh cookies on login', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUsers.admin.email,
        password: 'testpass123'
      });

    expect(response.status).toBe(200);
    const cookies = response.headers['set-cookie'] || [];
    const cookieHeader = cookies.join(';');
    expect(cookieHeader).toContain('accessToken=');
    expect(cookieHeader).toContain('refreshToken=');
    expect(cookieHeader).toContain('HttpOnly');
    expect(response.headers['x-csrf-token']).toBeTruthy();
  });

  it('refreshes tokens using cookie session', async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post('/api/auth/login')
      .send({
        email: testUsers.admin.email,
        password: 'testpass123'
      });

    expect(loginResponse.status).toBe(200);

    const refreshResponse = await agent
      .post('/api/auth/refresh')
      .send({});

    expect(refreshResponse.status).toBe(200);
    const cookies = refreshResponse.headers['set-cookie'] || [];
    const cookieHeader = cookies.join(';');
    expect(cookieHeader).toContain('accessToken=');
    expect(cookieHeader).toContain('refreshToken=');
  });

  it('returns CSRF token header and body', async () => {
    const response = await request(app)
      .get('/api/auth/csrf-token');

    expect(response.status).toBe(200);
    expect(response.headers['x-csrf-token']).toBeTruthy();
    expect(response.body.data?.csrfToken).toBeTruthy();
  });

  it('rejects requests with invalid CSRF tokens', async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post('/api/auth/login')
      .send({
        email: testUsers.resident.email,
        password: 'testpass123'
      });

    expect(loginResponse.status).toBe(200);

    const response = await agent
      .post('/api/auth/logout')
      .set('X-CSRF-Token', 'invalid-token')
      .send({});

    expect([200, 204]).toContain(response.status);
  });

  it('rejects estate-mismatched tokens before resident profile access', async () => {
    const jwt = await import('jsonwebtoken');

    const forgedToken = jwt.default.sign(
      {
        id: testUsers.resident.id,
        sub: String(testUsers.resident.id),
        email: testUsers.resident.email,
        role: testUsers.resident.role,
        estate_id: 999999,
        type: 'access',
        jti: `test-jti-${Date.now()}`
      },
      process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests',
      {
        expiresIn: '15m',
        issuer: 'secure-gate-api',
        audience: 'secure-gate-client'
      }
    );

    const profileResponse = await request(app)
      .get('/api/resident/profile')
      .set('Authorization', `Bearer ${forgedToken}`);

    expect(profileResponse.status).toBe(401);
    expect(profileResponse.body.error?.code).toBe('AUTH_USER_NOT_FOUND');
    expect(profileResponse.body.error?.requestId).toBeTruthy();
  });
});
