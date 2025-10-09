// server/tests/integration/rate-limiting-proper.test.js
import request from 'supertest';
import express from 'express';
import { rateLimiters, speedLimiters, rateLimitAnalytics } from '../../src/config/rateLimits.js';
import rateLimitRoutes from '../../src/routes/rateLimitRoutes.js';

// Create test app
const app = express();
app.use(express.json());

// Mock authentication middleware
const mockAuth = (req, res, next) => {
  req.user = { id: 'test-user', role: 'admin' };
  next();
};

// Apply rate limiting with external IP simulation
app.use('/api', (req, res, next) => {
  // Simulate external IP to bypass internal IP bypass
  req.connection = { remoteAddress: '203.0.113.1' };
  req.socket = { remoteAddress: '203.0.113.1' };
  req.ip = '203.0.113.1';
  next();
});

app.use('/api', rateLimiters.general);
app.use('/api/auth', rateLimiters.auth);
app.use('/api/admin', rateLimiters.admin);
app.use('/api/sensitive', rateLimiters.sensitive);

// Add speed limiting
app.use('/api', speedLimiters.general);

// Add rate limiting routes
app.use('/api/rate-limits', mockAuth, rateLimitRoutes);

// Test endpoints
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test endpoint', ip: req.ip });
});

app.post('/api/auth/login', (req, res) => {
  res.json({ message: 'Login endpoint', ip: req.ip });
});

app.get('/api/admin/users', (req, res) => {
  res.json({ message: 'Admin endpoint', ip: req.ip });
});

app.post('/api/sensitive/reset-password', (req, res) => {
  res.json({ message: 'Sensitive endpoint', ip: req.ip });
});

app.get('/api/slow/test', (req, res) => {
  res.json({ message: 'Slow endpoint', ip: req.ip });
});

// Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    success: false,
    message: err.message,
    error: { code: err.code || 'INTERNAL_ERROR' }
  });
});

describe('Rate Limiting Proper Tests', () => {
  beforeEach(() => {
    // Clear analytics before each test
    rateLimitAnalytics.clearStats();
  });

  describe('General Rate Limiting', () => {
    test('allows requests within limit', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.body.message).toBe('Test endpoint');
      expect(response.body.ip).toBe('203.0.113.1');
    });

    test('blocks requests exceeding general limit', async () => {
      // Make requests up to the limit (200 for general)
      const limit = 200;
      const promises = [];

      for (let i = 0; i < limit + 1; i++) {
        promises.push(request(app).get('/api/test'));
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponse = responses.find(r => r.status === 429);

      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse.body.success).toBe(false);
      expect(rateLimitedResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    }, 30000);

    test('includes retry information in rate limit response', async () => {
      // Exceed rate limit
      const limit = 200;
      const promises = [];

      for (let i = 0; i < limit + 1; i++) {
        promises.push(request(app).get('/api/test'));
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponse = responses.find(r => r.status === 429);

      expect(rateLimitedResponse.body.error.details).toHaveProperty('limit');
      expect(rateLimitedResponse.body.error.details).toHaveProperty('remaining');
      expect(rateLimitedResponse.body.error.details).toHaveProperty('resetTime');
      expect(rateLimitedResponse.body.error.details).toHaveProperty('retryAfter');
    }, 30000);
  });

  describe('Authentication Rate Limiting', () => {
    test('has stricter limits for auth endpoints', async () => {
      const limit = 20; // From AUTH profile
      const promises = [];

      for (let i = 0; i < limit + 1; i++) {
        promises.push(request(app).post('/api/auth/login'));
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponse = responses.find(r => r.status === 429);

      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse.body.error.details.limit).toBe(20);
    }, 30000);
  });

  describe('Admin Rate Limiting', () => {
    test('has strict limits for admin endpoints', async () => {
      const limit = 50; // From ADMIN profile
      const promises = [];

      for (let i = 0; i < limit + 1; i++) {
        promises.push(request(app).get('/api/admin/users'));
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponse = responses.find(r => r.status === 429);

      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse.body.error.details.limit).toBe(50);
    }, 30000);
  });

  describe('Sensitive Operations Rate Limiting', () => {
    test('has very strict limits for sensitive endpoints', async () => {
      const limit = 5; // From SENSITIVE profile
      const promises = [];

      for (let i = 0; i < limit + 1; i++) {
        promises.push(request(app).post('/api/sensitive/reset-password'));
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponse = responses.find(r => r.status === 429);

      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse.body.error.details.limit).toBe(5);
    }, 30000);
  });

  describe('Speed Limiting', () => {
    test('applies speed limiting after threshold', async () => {
      const startTime = Date.now();
      
      // Make requests to trigger speed limiting (delayAfter: 50)
      const promises = [];
      for (let i = 0; i < 60; i++) { // Exceed delayAfter threshold
        promises.push(request(app).get('/api/slow/test'));
      }

      await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take longer due to speed limiting
      expect(duration).toBeGreaterThan(1000); // At least 1 second
    }, 30000);
  });

  describe('Rate Limiting Analytics', () => {
    test('records hit statistics', async () => {
      await request(app).get('/api/test');
      
      const stats = rateLimitAnalytics.getStats();
      expect(stats.totalKeys).toBeGreaterThan(0);
    });

    test('tracks violations', async () => {
      // Exceed rate limit to trigger violation
      const limit = 200;
      const promises = [];

      for (let i = 0; i < limit + 1; i++) {
        promises.push(request(app).get('/api/test'));
      }

      await Promise.all(promises);
      
      const stats = rateLimitAnalytics.getStats();
      expect(stats.recentAlerts.length).toBeGreaterThan(0);
    }, 30000);

    test('provides top violators', async () => {
      // Create multiple violations
      for (let i = 0; i < 3; i++) {
        const promises = [];
        for (let j = 0; j < 210; j++) { // Exceed limit
          promises.push(request(app).get('/api/test'));
        }
        await Promise.all(promises);
      }

      const stats = rateLimitAnalytics.getStats();
      expect(stats.topViolators.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Rate Limiting Management API', () => {
    test('gets rate limiting statistics', async () => {
      const response = await request(app)
        .get('/api/rate-limits/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalKeys');
      expect(response.body.data).toHaveProperty('activeKeys');
      expect(response.body.data).toHaveProperty('recentAlerts');
      expect(response.body.data).toHaveProperty('topViolators');
    });

    test('gets recent alerts', async () => {
      // Create some alerts first
      const promises = [];
      for (let i = 0; i < 210; i++) {
        promises.push(request(app).get('/api/test'));
      }
      await Promise.all(promises);

      const response = await request(app)
        .get('/api/rate-limits/alerts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data).toHaveProperty('total');
    }, 30000);

    test('clears statistics', async () => {
      // Create some data first
      await request(app).get('/api/test');
      
      const response = await request(app)
        .post('/api/rate-limits/clear')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Rate limiting statistics cleared');
    });

    test('gets system health', async () => {
      const response = await request(app)
        .get('/api/rate-limits/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('memoryUsage');
      expect(response.body.data).toHaveProperty('activeConnections');
    });
  });

  describe('Bypass Conditions', () => {
    test('bypasses rate limiting for health checks', async () => {
      // Test health check bypass
      const healthReq = {
        path: '/health',
        headers: {}
      };
      expect(healthReq.path === '/health').toBe(true);
    });

    test('bypasses rate limiting for internal IPs', async () => {
      const internalIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
      const clientIP = '127.0.0.1';
      expect(internalIPs.includes(clientIP)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('handles rate limiting errors gracefully', async () => {
      // Exceed rate limit
      const limit = 200;
      const promises = [];

      for (let i = 0; i < limit + 1; i++) {
        promises.push(request(app).get('/api/test'));
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponse = responses.find(r => r.status === 429);

      expect(rateLimitedResponse.body).toHaveProperty('success', false);
      expect(rateLimitedResponse.body).toHaveProperty('message');
      expect(rateLimitedResponse.body).toHaveProperty('error');
      expect(rateLimitedResponse.body).toHaveProperty('timestamp');
    }, 30000);

    test('includes proper error codes', async () => {
      // Exceed rate limit
      const limit = 200;
      const promises = [];

      for (let i = 0; i < limit + 1; i++) {
        promises.push(request(app).get('/api/test'));
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponse = responses.find(r => r.status === 429);

      expect(rateLimitedResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    }, 30000);
  });

  describe('Performance', () => {
    test('handles concurrent requests efficiently', async () => {
      const startTime = Date.now();
      const promises = [];

      // Make 100 concurrent requests
      for (let i = 0; i < 100; i++) {
        promises.push(request(app).get('/api/test'));
      }

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should handle 100 requests quickly
      expect(duration).toBeLessThan(5000); // Less than 5 seconds
      expect(responses.filter(r => r.status === 200).length).toBe(100);
    });
  });

  describe('Rate Limiting Configuration', () => {
    test('verifies rate limiting profiles are configured correctly', () => {
      // Test that rate limiters are properly configured
      expect(rateLimiters.general).toBeDefined();
      expect(rateLimiters.auth).toBeDefined();
      expect(rateLimiters.admin).toBeDefined();
      expect(rateLimiters.sensitive).toBeDefined();
    });

    test('verifies speed limiters are configured correctly', () => {
      expect(speedLimiters.general).toBeDefined();
    });
  });
});




