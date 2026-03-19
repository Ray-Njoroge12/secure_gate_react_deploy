import { jest, describe, beforeAll, beforeEach, it, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockInitializeAsync = jest.fn();
const mockQuery = jest.fn();
const mockReaddir = jest.fn();
const mockReadFile = jest.fn();

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

describe('setup bootstrap abuse protections', () => {
  let app;

  beforeAll(async () => {
    const setupRoutes = (await import('../../src/routes/setup.routes.js')).default;
    app = express();
    app.use(express.json());
    app.use('/api/setup', setupRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SETUP_SECRET = 'this-is-a-very-strong-setup-secret-12345';

    mockInitializeAsync.mockResolvedValue(undefined);
    mockReaddir.mockResolvedValue(['001_initial_schema.sql']);
    mockReadFile.mockResolvedValue('CREATE TABLE IF NOT EXISTS abuse_test_table (id SERIAL PRIMARY KEY);');
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('keeps denying repeated invalid setup-secret attempts without touching DB execution path', async () => {
    const statuses = [];

    for (let i = 0; i < 8; i++) {
      const response = await request(app)
        .post('/api/setup/migrate')
        .send({ secret: `wrong-secret-${i}` });
      statuses.push(response.status);
      expect(response.body.error.code).toBe('FORBIDDEN');
    }

    expect(statuses.every((status) => status === 403)).toBe(true);
    expect(statuses.some((status) => status === 429)).toBe(false);
    expect(mockInitializeAsync).not.toHaveBeenCalled();
    expect(mockReaddir).not.toHaveBeenCalled();
  });

  it('rejects crafted payload/header/query bypass attempts when body secret is invalid', async () => {
    const response = await request(app)
      .post('/api/setup/migrate?secret=this-is-a-very-strong-setup-secret-12345')
      .set('x-setup-secret', 'this-is-a-very-strong-setup-secret-12345')
      .send({
        secret: 'definitely-wrong-secret',
        setupSecret: 'this-is-a-very-strong-setup-secret-12345',
        role: 'super_admin'
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(mockInitializeAsync).not.toHaveBeenCalled();
  });

  it('is idempotent on repeated migrate calls (first apply, subsequent skip)', async () => {
    const applied = new Set();

    mockQuery.mockImplementation(async (sql, params = []) => {
      if (typeof sql === 'string' && sql.includes('SELECT filename FROM schema_migrations')) {
        return { rows: [...applied].map((filename) => ({ filename })) };
      }
      if (typeof sql === 'string' && sql.includes('INSERT INTO schema_migrations')) {
        applied.add(params[0]);
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });

    const first = await request(app)
      .post('/api/setup/migrate')
      .send({ secret: 'this-is-a-very-strong-setup-secret-12345' });

    const second = await request(app)
      .post('/api/setup/migrate')
      .send({ secret: 'this-is-a-very-strong-setup-secret-12345' });

    expect(first.status).toBe(200);
    expect(first.body.stats.applied).toBe(1);
    expect(first.body.stats.skipped).toBe(0);

    expect(second.status).toBe(200);
    expect(second.body.stats.applied).toBe(0);
    expect(second.body.stats.skipped).toBe(1);
  });
});
