import request from 'supertest';
import app from '../src/app.js';

describe('API Versioning - Basic Tests', () => {
  describe('Version Detection', () => {
    test('Should detect version from URL path v1', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .expect(200);
      
      expect(res.headers['api-version']).toBe('v1');
      expect(res.headers['api-version-status']).toBe('stable');
    });

    test('Should detect version from URL path v2', async () => {
      const res = await request(app)
        .get('/api/v2/health')
        .expect(200);
      
      expect(res.headers['api-version']).toBe('v2');
      expect(res.headers['api-version-status']).toBe('beta');
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
  });

  describe('Version Headers', () => {
    test('Should include version headers in v1 responses', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(res.headers['api-version']).toBe('v1');
      expect(res.headers['api-version-status']).toBe('stable');
      expect(res.headers['api-version-date']).toBeDefined();
    });

    test('Should include version headers in v2 responses', async () => {
      const res = await request(app)
        .get('/api/v2/health')
        .expect(200);

      expect(res.headers['api-version']).toBe('v2');
      expect(res.headers['api-version-status']).toBe('beta');
      expect(res.headers['api-version-date']).toBeDefined();
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
  });
});




