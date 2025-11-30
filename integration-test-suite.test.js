
// FRONTEND-BACKEND INTEGRATION TEST SUITE
// Generated on 2025-11-12T00:57:34.640Z

describe('Frontend-Backend Integration Tests', () => {
  const BACKEND_URL = 'http://localhost:3001';
  
  beforeAll(async () => {
    // Ensure backend is running
    try {
      await fetch(BACKEND_URL + '/api/health');
    } catch (error) {
      throw new Error('Backend server must be running on localhost:3001');
    }
  });

  describe('Authentication Flow', () => {
    test('Registration with valid data', async () => {
      const registrationData = {
        name: 'Integration Test User',
        email: 'integration-test-' + Date.now() + '@example.com',
        password: 'TestPassword123!',
        role: 'resident',
        area: 'Test Area',
        phone: '0123456789',
        house: '123'
      };
      
      const response = await fetch(BACKEND_URL + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.user).toBeDefined();
    });
    
    test('Login with valid credentials', async () => {
      // First register a user
      const registrationData = {
        name: 'Login Test User',
        email: 'login-test-' + Date.now() + '@example.com',
        password: 'TestPassword123!',
        role: 'resident',
        area: 'Test Area',
        phone: '0123456789',
        house: '123'
      };
      
      await fetch(BACKEND_URL + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });
      
      // Then login
      const loginResponse = await fetch(BACKEND_URL + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registrationData.email,
          password: registrationData.password
        })
      });
      
      expect(loginResponse.ok).toBe(true);
      const loginData = await loginResponse.json();
      expect(loginData.success).toBe(true);
      expect(loginData.data.accessToken).toBeDefined();
    });
    
    test('Protected route access with token', async () => {
      // Register and login to get token
      const registrationData = {
        name: 'Protected Route Test User',
        email: 'protected-test-' + Date.now() + '@example.com',
        password: 'TestPassword123!',
        role: 'resident',
        area: 'Test Area',
        phone: '0123456789',
        house: '123'
      };
      
      await fetch(BACKEND_URL + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });
      
      const loginResponse = await fetch(BACKEND_URL + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registrationData.email,
          password: registrationData.password
        })
      });
      
      const loginData = await loginResponse.json();
      const token = loginData.data.accessToken;
      
      // Test protected route
      const meResponse = await fetch(BACKEND_URL + '/api/auth/me', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      
      expect(meResponse.ok).toBe(true);
      const meData = await meResponse.json();
      expect(meData.success).toBe(true);
      expect(meData.data.user).toBeDefined();
    });
  });
  
  describe('Error Handling', () => {
    test('Invalid registration data', async () => {
      const response = await fetch(BACKEND_URL + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: '123' // Too short
        })
      });
      
      expect(response.ok).toBe(false);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBeDefined();
    });
    
    test('Invalid login credentials', async () => {
      const response = await fetch(BACKEND_URL + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
      });
      
      expect(response.ok).toBe(false);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });
  
  describe('CORS and Network', () => {
    test('CORS headers present', async () => {
      const response = await fetch(BACKEND_URL + '/api/auth/register', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST'
        }
      });
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
    });
  });
});
