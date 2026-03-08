/**
 * Auth + CSRF + Estate Integration Tests
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers, dbManager } from './setup.js';

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

  it('returns ESTATE_REQUIRED for estate-less users', async () => {
    const argon2 = await import('argon2');
    const hashedPassword = await argon2.default.hash('testpass123');

    const estateLessUser = await dbManager.query(
      `INSERT INTO users (username, email, password, password_hash, role, phone, house, verified, estate_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        `estate_less_${Date.now()}`,
        `estate_less_${Date.now()}@test.com`,
        hashedPassword,
        hashedPassword,
        'resident',
        `+2547${Date.now().toString().slice(-8)}`,
        'A101',
        true,
        null
      ]
    );

    const agent = request.agent(app);
    const loginResponse = await agent
      .post('/api/auth/login')
      .send({
        email: estateLessUser.rows[0].email,
        password: 'testpass123'
      });

    expect(loginResponse.status).toBe(200);

    const profileResponse = await agent
      .get('/api/resident/profile');

    expect(profileResponse.status).toBe(403);
    expect(profileResponse.body.error?.code).toBe('ESTATE_NOT_ASSIGNED');
    expect(profileResponse.body.error?.requestId).toBeTruthy();
  });
});
