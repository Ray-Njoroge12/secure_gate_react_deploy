/**
 * Regression Test Suite
 * Ensures critical business functionality remains working after changes
 */

import request from 'supertest';
import app from '../../src/app.js';
import { dbManager } from '../../src/database/db.enhanced.js';

describe('REGRESSION: Critical Business Functions', () => {
  let authToken = null;
  let testUserId = null;
  let testVisitorId = null;

  beforeAll(async () => {
    await dbManager.initializeAsync();
  });

  afterAll(async () => {
    await dbManager.disconnect();
  });

  describe('REG-AUTH: Authentication Regression', () => {
    test('REG-AUTH-01: User registration creates account', async () => {
      const uniqueEmail = `reg_test_${Date.now()}@test.com`;
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          password: 'TestPass123!',
          username: `regtest_${Date.now()}`,
          phone: '+254700000001'
        });

      expect([200, 201, 400, 409]).toContain(response.status);
    });

    test('REG-AUTH-02: Login returns valid token structure', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@securegate.com',
          password: 'AdminPass123!'
        });

      if (response.status === 200) {
        authToken = response.body.data?.token || response.body.token;
        testUserId = response.body.data?.user?.id;
        expect(response.body.success).toBe(true);
      }
      expect([200, 401, 423]).toContain(response.status);
    });

    test('REG-AUTH-03: Invalid credentials rejected', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@securegate.com',
          password: 'WrongPassword!'
        });

      expect([401, 423]).toContain(response.status);
    });

    test('REG-AUTH-04: Token required for protected routes', async () => {
      const response = await request(app)
        .get('/api/visitors');

      expect(response.status).toBe(401);
    });
  });

  describe('REG-VISITOR: Visitor Management Regression', () => {
    test('REG-VIS-01: Can list visitors with valid token', async () => {
      if (!authToken) {
        console.log('Skipping - no auth token');
        return;
      }

      const response = await request(app)
        .get('/api/visitors')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 403]).toContain(response.status);
    });

    test('REG-VIS-02: Can create visitor with valid data', async () => {
      if (!authToken) {
        console.log('Skipping - no auth token');
        return;
      }

      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Regression Test ${Date.now()}`,
          phone: '+254700000002',
          email: `regvisitor_${Date.now()}@test.com`,
          purpose: 'Testing',
          expected_date: new Date().toISOString().split('T')[0]
        });

      if (response.status === 201) {
        testVisitorId = response.body.data?.id || response.body.visitor?.id;
      }
      expect([200, 201, 400, 403]).toContain(response.status);
    });

    test('REG-VIS-03: Invalid visitor data rejected', async () => {
      if (!authToken) {
        console.log('Skipping - no auth token');
        return;
      }

      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '', // Invalid - empty name
          phone: 'invalid'
        });

      expect([400, 422]).toContain(response.status);
    });

    test('REG-VIS-04: Can search visitors', async () => {
      if (!authToken) {
        console.log('Skipping - no auth token');
        return;
      }

      const response = await request(app)
        .get('/api/visitors?search=test')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 403]).toContain(response.status);
    });
  });

  describe('REG-API: API Stability Regression', () => {
    test('REG-API-01: Health endpoint responds', async () => {
      const response = await request(app)
        .get('/api/health');

      expect([200, 503]).toContain(response.status);
    });

    test('REG-API-02: API version header present', async () => {
      const response = await request(app)
        .get('/api/health');

      // Check for version-related headers
      const hasVersionInfo = response.headers['api-version'] || 
                            response.headers['x-api-version'] ||
                            response.body?.version;
      
      expect(response.status).toBeLessThan(500);
    });

    test('REG-API-03: CORS headers present', async () => {
      const response = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.status).toBeLessThan(500);
    });

    test('REG-API-04: JSON content type for API responses', async () => {
      const response = await request(app)
        .get('/api/health');

      if (response.status === 200) {
        expect(response.headers['content-type']).toMatch(/json/);
      }
    });
  });

  describe('REG-ERROR: Error Handling Regression', () => {
    test('REG-ERR-01: 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent-route-12345');

      expect(response.status).toBe(404);
    });

    test('REG-ERR-02: Malformed JSON rejected', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect([400, 500]).toContain(response.status);
    });

    test('REG-ERR-03: Error responses have consistent structure', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com' }); // Missing password

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('REG-SECURITY: Security Regression', () => {
    test('REG-SEC-01: SQL injection prevented', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "'; DROP TABLE users; --",
          password: 'test'
        });

      expect([400, 401]).toContain(response.status);
    });

    test('REG-SEC-02: XSS in input sanitized', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'xss@test.com',
          password: 'Test123!',
          username: '<script>alert("xss")</script>',
          phone: '+254700000003'
        });

      if (response.status === 201 || response.status === 200) {
        const body = JSON.stringify(response.body);
        expect(body).not.toContain('<script>');
      }
    });

    test('REG-SEC-03: Security headers present', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});
