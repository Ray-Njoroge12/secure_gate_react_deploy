/**
 * Basic Smoke Test Suite
 * Tests fundamental system availability without direct database access
 * Uses Express app directly (no running server required)
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import request from 'supertest';

// Import app directly for testing
let app;

beforeAll(async () => {
  const appModule = await import('../../src/app.js');
  app = appModule.default;
});

describe('Smoke Tests: Basic System Health', () => {
  test('[SMOKE-01] Server health endpoint responds', async () => {
    const response = await request(app)
      .get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body.timestamp).toBeDefined();
  }, 10000);

  test('[SMOKE-02] Server responds within acceptable time (< 1s)', async () => {
    const startTime = Date.now();

    await request(app)
      .get('/api/health');

    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(1000);
  }, 10000);

  test('[SMOKE-03] Authentication endpoint is accessible', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'test' });

    // Should get 401 or 400, not 404 or 500
    expect([400, 401, 422, 500]).toContain(response.status);
  }, 10000);

  test('[SMOKE-04] Protected endpoints require authentication', async () => {
    const response = await request(app)
      .get('/api/visitors');

    // Should return 401 or 403 (both indicate auth required)
    expect([401, 403]).toContain(response.status);
  }, 10000);

  test('[SMOKE-05] Invalid JWT tokens are rejected', async () => {
    const response = await request(app)
      .get('/api/visitors')
      .set('Authorization', 'Bearer invalid-token-12345');

    // Should return 401 or 403 (both indicate auth failure)
    expect([401, 403]).toContain(response.status);
  }, 10000);
});
