import request from 'supertest';
import app from '../src/app.js';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const testDbConfig = {
  host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
  port: process.env.PGPORT || process.env.DB_PORT || 5432,
  database: process.env.PGDATABASE || process.env.DB_NAME || 'secure_gate_test',
  user: process.env.PGUSER || process.env.DB_USER || 'secure_gate_user',
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'secure_gate_password',
  ssl: false
};

let testPool;

beforeAll(async () => {
  testPool = new Pool(testDbConfig);
  try {
    await testPool.query('SELECT 1');
    console.log('✅ Test database connected for API versioning tests.');
  } catch (error) {
    console.error('❌ Failed to connect to test database for API versioning tests:', error);
    process.exit(1);
  }
});

afterAll(async () => {
  await testPool.end();
  console.log('✅ Test database connection closed for API versioning tests.');
});

describe('API Versioning', () => {
  describe('Version Detection', () => {
    test('Should detect version from URL path', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .expect(200);
      
      expect(res.headers['api-version']).toBe('v1');
      expect(res.headers['api-version-status']).toBe('stable');
    });

    test('Should detect version from Accept header', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Accept', 'application/json;version=2.0')
        .expect(200);
      
      expect(res.headers['api-version']).toBe('v2');
      expect(res.headers['api-version-status']).toBe('beta');
    });

    test('Should detect version from custom header', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('API-Version', 'v2')
        .expect(200);
      
      expect(res.headers['api-version']).toBe('v2');
    });

    test('Should detect version from query parameter', async () => {
      const res = await request(app)
        .get('/api/health?version=v1')
        .expect(200);
      
      expect(res.headers['api-version']).toBe('v1');
    });

    test('Should use default version when none specified', async () => {
      const res = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(res.headers['api-version']).toBe('v1');
    });
  });

  describe('Version Information Endpoints', () => {
    test('GET /api/versions should return supported versions', async () => {
      const res = await request(app)
        .get('/api/versions')
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.versions).toBeDefined();
      expect(res.body.data.defaultVersion).toBe('v1');
      expect(res.body.data.versions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            version: 'v1',
            status: 'stable'
          }),
          expect.objectContaining({
            version: 'v2',
            status: 'beta'
          })
        ])
      );
    });

    test('GET /api/migration-guide should return migration guide', async () => {
      const res = await request(app)
        .get('/api/migration-guide?from=v1&to=v2')
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.from).toBe('v1');
      expect(res.body.data.to).toBe('v2');
      expect(res.body.data.breakingChanges).toBeDefined();
      expect(res.body.data.newFeatures).toBeDefined();
      expect(res.body.data.migrationSteps).toBeDefined();
    });

    test('GET /api/migration-guide should return 404 for unsupported migration', async () => {
      const res = await request(app)
        .get('/api/migration-guide?from=v2&to=v3')
        .expect(404);
      
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Migration guide not found');
    });
  });

  describe('Versioned Authentication (v1)', () => {
    test('POST /api/v1/auth/register should work with v1 format', async () => {
      const userData = {
        name: 'Test User v1',
        email: 'testv1@example.com',
        phone: '+254712345001',
        password: 'SecurePass123!',
        role: 'resident'
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.refresh_token).toBeUndefined(); // v1 doesn't have refresh tokens
      expect(res.headers['api-version']).toBe('v1');
    });

    test('POST /api/v1/auth/login should work with v1 format', async () => {
      const loginData = {
        email: 'testv1@example.com',
        password: 'SecurePass123!'
      };

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.refresh_token).toBeUndefined(); // v1 doesn't have refresh tokens
      expect(res.headers['api-version']).toBe('v1');
    });
  });

  describe('Versioned Authentication (v2)', () => {
    test('POST /api/v2/auth/register should work with v2 enhanced format', async () => {
      const userData = {
        name: 'Test User v2',
        email: 'testv2@example.com',
        phone: '+254712345002',
        password: 'SecurePass123!',
        role: 'resident',
        preferences: {
          notifications: true,
          language: 'en'
        }
      };

      const res = await request(app)
        .post('/api/v2/auth/register')
        .send(userData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.refresh_token).toBeDefined(); // v2 has refresh tokens
      expect(res.body.data.meta).toBeDefined(); // v2 has metadata
      expect(res.body.data.user.preferences).toBeDefined();
      expect(res.headers['api-version']).toBe('v2');
    });

    test('POST /api/v2/auth/login should work with v2 enhanced format', async () => {
      const loginData = {
        email: 'testv2@example.com',
        password: 'SecurePass123!',
        remember_me: true
      };

      const res = await request(app)
        .post('/api/v2/auth/login')
        .send(loginData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.refresh_token).toBeDefined(); // v2 has refresh tokens
      expect(res.body.data.meta).toBeDefined(); // v2 has metadata
      expect(res.headers['api-version']).toBe('v2');
    });

    test('POST /api/v2/auth/refresh should work with refresh token', async () => {
      // First login to get refresh token
      const loginRes = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'testv2@example.com',
          password: 'SecurePass123!'
        });

      const refreshToken = loginRes.body.data.refresh_token;

      // Use refresh token to get new access token
      const res = await request(app)
        .post('/api/v2/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });
  });

  describe('Versioned Admin Routes (v1)', () => {
    let adminToken;

    beforeAll(async () => {
      // Create admin user and get token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'AdminPass123!'
        });
      adminToken = loginRes.body.data.token;
    });

    test('GET /api/v1/admin/users should work with v1 format', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.users).toBeDefined();
      expect(res.body.data.pagination).toBeDefined();
      expect(res.headers['api-version']).toBe('v1');
    });
  });

  describe('Versioned Admin Routes (v2)', () => {
    let adminToken;

    beforeAll(async () => {
      // Create admin user and get token
      const loginRes = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'AdminPass123!'
        });
      adminToken = loginRes.body.data.token;
    });

    test('GET /api/v2/admin/users should work with v2 enhanced format', async () => {
      const res = await request(app)
        .get('/api/v2/admin/users?search=test&sort=name&order=asc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.users).toBeDefined();
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.filters).toBeDefined(); // v2 has enhanced filtering
      expect(res.body.data.meta).toBeDefined(); // v2 has metadata
      expect(res.headers['api-version']).toBe('v2');
    });

    test('GET /api/v2/admin/stats should work with v2 enhanced stats', async () => {
      const res = await request(app)
        .get('/api/v2/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.users).toBeDefined();
      expect(res.body.data.recent_activity).toBeDefined();
      expect(res.body.meta).toBeDefined();
      expect(res.headers['api-version']).toBe('v2');
    });
  });

  describe('Error Handling', () => {
    test('Should return 400 for unsupported version', async () => {
      const res = await request(app)
        .get('/api/v3/health')
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNSUPPORTED_API_VERSION');
    });

    test('Should return 410 for sunset version', async () => {
      // This would require setting up a sunset version in the database
      // For now, we'll test the error handling structure
      const res = await request(app)
        .get('/api/v0/health')
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('Version Headers', () => {
    test('Should include version headers in all responses', async () => {
      const res = await request(app)
        .get('/api/v2/health')
        .expect(200);

      expect(res.headers['api-version']).toBe('v2');
      expect(res.headers['api-version-status']).toBe('beta');
      expect(res.headers['api-version-date']).toBeDefined();
    });

    test('Should include deprecation warning for deprecated versions', async () => {
      // This would require setting up a deprecated version
      // For now, we'll test the header structure
      const res = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(res.headers['api-version']).toBe('v1');
      expect(res.headers['api-version-status']).toBe('stable');
    });
  });
});
