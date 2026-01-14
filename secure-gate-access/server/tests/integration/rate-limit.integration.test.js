/**
 * Rate Limiting Integration Tests
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers } from './setup.js';

const originalEnv = { ...process.env };

describe('Rate limiting integration', () => {
  let app;
  let testUsers;

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_RATE_LIMIT = 'true';
    process.env.AUTH_RATE_LIMIT_MAX = '2';
    process.env.REFRESH_RATE_LIMIT_MAX = '2';

    await setupTestDatabase();
    jest.resetModules();
    const appModule = await import('../../src/app.js');
    app = appModule.default;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    process.env = { ...originalEnv };
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
    testUsers = await createTestUsers();
  });

  it('rate limits excessive login attempts', async () => {
    const requests = Array.from({ length: 3 }, () => (
      request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'wrongpassword' })
    ));

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(response => response.status === 429);

    expect(rateLimited.length).toBeGreaterThan(0);
    expect(rateLimited[0].body.error?.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(rateLimited[0].body.error?.requestId).toBeTruthy();
  });

  it('rate limits refresh attempts under burst traffic', async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post('/api/auth/login')
      .send({ email: testUsers.admin.email, password: 'testpass123' });

    expect(loginResponse.status).toBe(200);

    const requests = Array.from({ length: 3 }, () => (
      agent.post('/api/auth/refresh').send({})
    ));

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(response => response.status === 429);

    expect(rateLimited.length).toBeGreaterThan(0);
    expect(rateLimited[0].body.error?.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(rateLimited[0].body.error?.requestId).toBeTruthy();
  });
});
