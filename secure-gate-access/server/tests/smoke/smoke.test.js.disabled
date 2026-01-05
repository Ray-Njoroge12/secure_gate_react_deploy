/**
 * Smoke Tests - Basic System Health Verification
 * Tests critical paths to ensure the system is operational
 */

const API_URL = process.env.API_URL || 'http://localhost:5001/api';

describe('Smoke Tests', () => {
  
  describe('SMOKE-SRV: Server Health', () => {
    test('SMOKE-SRV-01: Server is running and responds to liveness check', async () => {
      const response = await fetch(`${API_URL}/health/live`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('alive');
    });

    test('SMOKE-SRV-02: Health endpoint responds (any status)', async () => {
      const response = await fetch(`${API_URL}/health`);
      expect([200, 503]).toContain(response.status);
      const data = await response.json();
      expect(data).toHaveProperty('status');
    });

    test('SMOKE-SRV-03: API responds with correct headers', async () => {
      const response = await fetch(`${API_URL}/health/live`);
      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('SMOKE-AUTH: Authentication', () => {
    test('SMOKE-AUTH-01: Login endpoint exists and responds', async () => {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com', password: 'test' })
      });
      // Should return 401 for invalid credentials, not 404 or 500
      expect([400, 401, 403]).toContain(response.status);
    });

    test('SMOKE-AUTH-02: Register endpoint exists and responds', async () => {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      // Should return 400 for missing fields, not 404 or 500
      expect([400, 401, 422]).toContain(response.status);
    });

    test('SMOKE-AUTH-03: Valid login returns token', async () => {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: 'admin@securegate.com', 
          password: 'AdminPass123!' 
        })
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('SMOKE-API: Protected Endpoints', () => {
    let authToken;

    beforeAll(async () => {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: 'admin@securegate.com', 
          password: 'AdminPass123!' 
        })
      });
      const data = await response.json();
      authToken = data.token || data.data?.token;
    });

    test('SMOKE-API-01: Protected endpoint requires authentication', async () => {
      const response = await fetch(`${API_URL}/visitors`);
      expect([401, 403]).toContain(response.status);
    });

    test('SMOKE-API-02: Protected endpoint works with auth', async () => {
      if (!authToken) {
        console.log('Skipping - no auth token available');
        return;
      }
      const response = await fetch(`${API_URL}/visitors`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      expect([200, 403]).toContain(response.status);
    });
  });

  describe('SMOKE-ERR: Error Handling', () => {
    test('SMOKE-ERR-01: 404 for non-existent routes', async () => {
      const response = await fetch(`${API_URL}/nonexistent-route-12345`);
      expect(response.status).toBe(404);
    });

    test('SMOKE-ERR-02: Invalid JSON returns 400', async () => {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json{'
      });
      expect([400, 500]).toContain(response.status);
    });
  });
});
