import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockInitializeAsync = jest.fn();
const mockQuery = jest.fn();
const mockReaddir = jest.fn();
const mockReadFile = jest.fn();

// Force fallback-secret branch for this test module.
delete process.env.SETUP_SECRET;

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: {
    initializeAsync: mockInitializeAsync,
    query: mockQuery
  },
  db: {
    query: jest.fn().mockResolvedValue({ rows: [{ ok: 1 }] })
  }
}));

jest.unstable_mockModule('fs/promises', () => ({
  readdir: mockReaddir,
  readFile: mockReadFile
}));

describe('setup.routes security dynamic verification', () => {
  let app;

  beforeAll(async () => {
    const setupRoutes = (await import('../../src/routes/setup.routes.js')).default;
    app = express();
    app.use(express.json());
    app.use('/api/setup', setupRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockInitializeAsync.mockResolvedValue(undefined);

    mockQuery.mockImplementation(async (sql) => {
      if (typeof sql === 'string' && sql.includes('SELECT filename FROM schema_migrations')) {
        return { rows: [] };
      }
      if (typeof sql === 'string' && sql.includes('SELECT EXISTS')) {
        return { rows: [{ exists: true }] };
      }
      if (typeof sql === 'string' && sql.includes('SELECT COUNT(*) as count')) {
        return { rows: [{ count: '1', last_migration: new Date().toISOString() }] };
      }
      return { rows: [], rowCount: 0 };
    });

    mockReaddir.mockResolvedValue(['001_initial_schema.sql']);
    mockReadFile.mockResolvedValue(`
      CREATE TABLE IF NOT EXISTS verification_table (id SERIAL PRIMARY KEY);
      -- Down migration
      DROP TABLE verification_table;
    `);
  });

  it('rejects invalid secret without requiring authentication middleware', async () => {
    const response = await request(app)
      .post('/api/setup/migrate')
      .send({ secret: 'wrong-secret' });

    expect(response.status).toBe(403);
    expect(response.status).not.toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('accepts the default fallback secret when SETUP_SECRET is unset', async () => {
    const response = await request(app)
      .post('/api/setup/migrate')
      .send({ secret: 'secure-gate-setup-2024' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockReaddir).toHaveBeenCalled();
    expect(mockReadFile).toHaveBeenCalled();
  });
});
