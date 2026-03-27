import { jest, describe, beforeAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockVerifyAccessToken = jest.fn();
const mockQuery = jest.fn();
const mockAudit = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({
  tokenService: { verifyAccessToken: mockVerifyAccessToken },
  passwordService: {
    hashPassword: jest.fn(),
    comparePassword: jest.fn()
  }
}));
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({ dbManager: { query: mockQuery }, default: { query: mockQuery } }));
jest.unstable_mockModule('../../src/middleware/auditLogging.js', () => ({
  attachRequestAudit: (req, res, next) => {
    req.audit = mockAudit;
    next();
  },
  default: () => (req, res, next) => {
    req.audit = mockAudit;
    next();
  }
}));
jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.unstable_mockModule('../../src/services/loggingService.js', () => ({ default: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn(), logSecurity: jest.fn() } }));

const usersByToken = {
  'admin-token': { id: 3, email: 'admin@test.com', username: 'admin', role: 'admin', estate_id: 100 },
  'resident-token': { id: 1, email: 'resident@test.com', username: 'resident', role: 'resident', estate_id: 100 }
};

const isAuthUserLookup = (sql) => sql.includes('FROM users');

describe('GET /api/admin/visitors alias', () => {
  let app;

  beforeAll(async () => {
    const visitorRoutes = (await import('../../src/routes/visitorRoutes.js')).default;
    const { notFoundHandler, errorHandler } = await import('../../src/middleware/standardizedErrorHandler.js');

    app = express();
    app.use(express.json());
    app.use('/api/admin/visitors', visitorRoutes);
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockVerifyAccessToken.mockImplementation(async (token) => ({
      userId: usersByToken[token]?.id,
      estate_id: usersByToken[token]?.estate_id
    }));

    mockQuery.mockImplementation(async (sql, params = []) => {
      if (isAuthUserLookup(sql)) {
        const user = Object.values(usersByToken).find(({ id, estate_id }) => {
          if (id !== params[0]) return false;
          if (typeof params[1] === 'undefined') return true;
          return (estate_id ?? null) === (params[1] ?? null);
        });
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
      }

      if (sql.includes('FROM visitors') && sql.includes('ORDER BY created_at DESC')) {
        return {
          rows: [{
            id: 17,
            name: 'Guest 17',
            phone: '+254700000017',
            email: 'guest17@example.com',
            status: 'pending',
            created_at: '2026-03-26T10:00:00.000Z',
            is_private: false
          }],
          rowCount: 1
        };
      }

      if (sql.includes('SELECT COUNT(*) FROM visitors')) {
        return { rows: [{ count: '1' }], rowCount: 1 };
      }

      if (sql.includes('SELECT id FROM estates WHERE id = $1')) {
        return { rows: [{ id: params[0] }], rowCount: 1 };
      }

      return { rows: [], rowCount: 0 };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 401 without token (auth still enforced)', async () => {
    const response = await request(app).get('/api/admin/visitors');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('returns non-404 for authorized admin flow', async () => {
    const response = await request(app)
      .get('/api/admin/visitors')
      .set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(200);
    expect(response.status).not.toBe(404);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        visitors: expect.any(Array),
        pagination: expect.objectContaining({ total: 1 })
      })
    );
  });

});
