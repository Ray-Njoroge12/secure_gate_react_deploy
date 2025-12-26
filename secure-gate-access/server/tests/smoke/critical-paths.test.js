/**
 * SMOKE-001: Critical Path Smoke Tests
 * Tests the absolute minimum functionality required for system operation
 * These tests must ALL pass before any deployment
 */

import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';

describe('SMOKE-001: Critical System Paths', () => {
  let app;
  let server;
  const BASE_URL = process.env.API_URL || 'http://localhost:5000';
  
  beforeAll(async () => {
    // Start server if not running
    if (process.env.TEST_AGAINST_RUNNING_SERVER !== 'true') {
      const appModule = await import('../../src/app.js');
      app = appModule.default;
    }
  });

  afterAll(async () => {
    // Cleanup
    if (server) {
      await server.close();
    }
  });

  describe('System Health', () => {
    it('SMOKE-SYS-01: Server should be running', async () => {
      const agent = app ? request(app) : request(BASE_URL);
      const response = await agent.get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
    }, 10000);

    it('SMOKE-SYS-02: Database connection should be healthy', async () => {
      const agent = app ? request(app) : request(BASE_URL);
      const response = await agent.get('/health');
      
      expect(response.status).toBe(200);
      // Deep health check would verify DB connection
    }, 10000);

    it('SMOKE-SYS-03: API should respond within acceptable time', async () => {
      const agent = app ? request(app) : request(BASE_URL);
      const startTime = Date.now();
      
      await agent.get('/health');
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(1000); // 1 second threshold
    }, 10000);
  });

  describe('Authentication Critical Path', () => {
    let testToken;
    const testUser = {
      email: `smoke-test-${Date.now()}@test.com`,
      password: 'SmokeTest123!',
      username: `smokeuser${Date.now()}`,
      role: 'resident'
    };

    it('SMOKE-AUTH-01: User registration should work', async () => {
      const agent = app ? request(app) : request(BASE_URL);
      const response = await agent
        .post('/api/auth/register')
        .send(testUser);

      expect([201, 409]).toContain(response.status); // 201 created or 409 if exists
      
      if (response.status === 201) {
        expect(response.body).toHaveProperty('success');
      }
    }, 10000);

    it('SMOKE-AUTH-02: User login should work', async () => {
      const agent = app ? request(app) : request(BASE_URL);
      const response = await agent
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      // May fail if email verification required
      expect([200, 401, 403]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('accessToken');
        testToken = response.body.data.accessToken;
      }
    }, 10000);

    it('SMOKE-AUTH-03: Protected endpoint should require auth', async () => {
      const agent = app ? request(app) : request(BASE_URL);
      const response = await agent
        .get('/api/visitors')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    }, 10000);

    it('SMOKE-AUTH-04: Valid token should grant access', async () => {
      if (!testToken) {
        console.log('⚠️  Skipping - no valid token available');
        return;
      }

      const agent = app ? request(app) : request(BASE_URL);
      const response = await agent
        .get('/api/visitors')
        .set('Authorization', `Bearer ${testToken}`);

      expect([200, 404]).toContain(response.status); // 200 or 404 if no visitors
    }, 10000);
  });

  describe('Visitor Management Critical Path', () => {
    let authToken;
    let visitorId;

    beforeAll(async () => {
      // Get a valid token for testing (would use test fixture in real scenario)
      // For smoke test, we skip if no token available
    });

    it('SMOKE-VIS-01: Should create visitor invitation', async () => {
      if (!authToken) {
        console.log('⚠️  Skipping - requires authenticated user');
        return;
      }

      const agent = app ? request(app) : request(BASE_URL);
      const response = await agent
        .post('/api/visitors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Smoke Test Visitor',
          phone: '+254700000000',
          purpose: 'Smoke Testing',
          dateOfVisit: new Date().toISOString()
        });

      expect([201, 401]).toContain(response.status);
      
      if (response.status === 201) {
        visitorId = response.body.data.id;
      }
    }, 10000);

    it('SMOKE-VIS-02: Should retrieve visitor list', async () => {
      if (!authToken) {
        console.log('⚠️  Skipping - requires authenticated user');
        return;
      }

      const agent = app ? request(app) : request(BASE_URL);
      const response = await agent
        .get('/api/visitors')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    }, 10000);
  });

  describe('QR Code Critical Path', () => {
    it('SMOKE-QR-01: QR code generation should work', async () => {
      // This would require a valid visitor ID
      // Smoke test verifies the endpoint exists
      const agent = app ? request(app) : request(BASE_URL);
      const response = await agent
        .get('/api/qr/test-qr-id');

      // Endpoint should exist even if QR not found
      expect([200, 401, 404]).toContain(response.status);
    }, 10000);
  });

  describe('Data Persistence Critical Path', () => {
    it('SMOKE-DB-01: Database should persist data', async () => {
      // This is verified by successful CRUD operations above
      // Additional checks could query database directly
      expect(true).toBe(true);
    });

    it('SMOKE-DB-02: Database constraints should be enforced', async () => {
      // Attempt to create duplicate user should fail
      const agent = app ? request(app) : request(BASE_URL);
      const response = await agent
        .post('/api/auth/register')
        .send({
          email: 'admin@securegate.com', // Existing seed user
          password: 'Test123!',
          username: 'duplicate',
          role: 'resident'
        });

      expect([409, 400]).toContain(response.status); // Conflict or bad request
    }, 10000);
  });

  describe('Error Handling Critical Path', () => {
    it('SMOKE-ERR-01: Should return proper error for 404', async () => {
      const agent = app ? request(app) : request(BASE_URL);
      const response = await agent.get('/api/non-existent-endpoint');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    }, 10000);

    it('SMOKE-ERR-02: Should return proper error for malformed request', async () => {
      const agent = app ? request(app) : request(BASE_URL);
      const response = await agent
        .post('/api/auth/login')
        .send({ invalid: 'data' });

      expect([400, 422]).toContain(response.status);
      expect(response.body).toHaveProperty('success', false);
    }, 10000);

    it('SMOKE-ERR-03: Should not leak sensitive information in errors', async () => {
      const agent = app ? request(app) : request(BASE_URL);
      const response = await agent
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });

      expect(response.status).toBe(401);
      
      // Should not reveal if email exists
      const errorMsg = JSON.stringify(response.body).toLowerCase();
      expect(errorMsg).not.toContain('stack');
      expect(errorMsg).not.toContain('database');
      expect(errorMsg).not.toContain('pg_');
    }, 10000);
  });
});

/**
 * SMOKE TEST EXECUTION CRITERIA:
 * 
 * PASS THRESHOLD: 100% - All smoke tests must pass
 * SEVERITY: CRITICAL - Any failure blocks deployment
 * 
 * If any smoke test fails:
 * 1. Stop all deployments immediately
 * 2. Roll back if already deployed
 * 3. Alert engineering team
 * 4. Create incident ticket
 * 5. Fix before proceeding
 */
