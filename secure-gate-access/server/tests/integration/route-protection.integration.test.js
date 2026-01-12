/**
 * Integration Tests: Route protection checks
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, createTestUsers, getAuthToken, cleanupTestDatabase } from './setup.js';
import { getTestApp } from '../utils/testApp.js';

const app = getTestApp();

describe('Route protection checks', () => {
  let adminToken;

  beforeAll(async () => {
    await setupTestDatabase();
    const testUsers = await createTestUsers();
    adminToken = await getAuthToken(testUsers.admin.email);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  test('cache stats require elevated role', async () => {
    const noAuthResponse = await request(app).get('/api/cache/stats');
    expect(noAuthResponse.status).toBe(401);

    const adminResponse = await request(app)
      .get('/api/cache/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminResponse.status).toBe(403);
  });

  test('SSE guard stream requires authentication', async () => {
    const response = await request(app).get('/api/sse/guards');
    expect(response.status).toBe(401);
  });
});
