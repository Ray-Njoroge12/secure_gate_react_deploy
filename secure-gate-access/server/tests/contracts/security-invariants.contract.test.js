import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockDbQuery = jest.fn();
const mockDbInit = jest.fn();
const mockRespond = jest.fn();
const mockRespondError = jest.fn();
const mockGenerateVisitorQR = jest.fn();
const mockVerifyPassword = jest.fn();
const mockVerifyTOTPToken = jest.fn();
const mockVerifyBackupCode = jest.fn();
const mockDisableMFA = jest.fn();
const mockGetUserById = jest.fn();
const mockUpdateUser = jest.fn();
const mockTokenVerifyAccess = jest.fn();

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: {
    query: mockDbQuery,
    initializeAsync: mockDbInit,
  },
  db: {
    query: mockDbQuery,
  },
  default: {
    query: mockDbQuery,
  },
}));

jest.unstable_mockModule('../../src/utils/respond.js', () => ({
  respond: mockRespond,
  respondError: mockRespondError,
  toCamel: (s) => s,
  camelize: (obj) => obj,
  default: {
    respond: mockRespond,
    respondError: mockRespondError,
    toCamel: (s) => s,
    camelize: (obj) => obj,
  },
}));

jest.unstable_mockModule('../../src/services/qrCodeService.js', () => ({
  default: {
    generateVisitorQR: mockGenerateVisitorQR,
  },
}));

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({
  tokenService: {
    verifyAccessToken: mockTokenVerifyAccess,
    verifyToken: jest.fn(),
  },
  passwordService: {
    verifyPassword: jest.fn(),
  },
  accountSecurity: {
    recordLoginAttempt: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/services/mfaService.js', () => ({
  default: {
    verifyTOTPToken: mockVerifyTOTPToken,
    verifyBackupCode: mockVerifyBackupCode,
    disableMFA: mockDisableMFA,
  },
}));

jest.unstable_mockModule('../../src/services/userService.js', () => ({
  userService: {
    getUserById: mockGetUserById,
    verifyPassword: mockVerifyPassword,
    updateUser: mockUpdateUser,
    db: {
      query: mockDbQuery,
    },
  },
  default: {
    getUserById: mockGetUserById,
    verifyPassword: mockVerifyPassword,
    updateUser: mockUpdateUser,
    db: {
      query: mockDbQuery,
    },
  }
}));

jest.unstable_mockModule('fs/promises', () => {
  const readdir = jest.fn().mockResolvedValue(['001_initial_schema.sql']);
  const readFile = jest.fn().mockResolvedValue('CREATE TABLE IF NOT EXISTS t(id INT);');
  return {
    readdir,
    readFile,
    default: { readdir, readFile },
  };
});

const { Contracts, ContractValidator } = await import('./contract.utils.js');
const adminController = await import('../../src/controllers/adminController.js');
const qrCodeController = await import('../../src/controllers/qrCodeController.js');
const setupRoutes = (await import('../../src/routes/setup.routes.js')).default;
const mfaRoutes = (await import('../../src/routes/mfaRoutes.js')).default;
const { errorHandler } = await import('../../src/middleware/standardizedErrorHandler.js');

const makeResDouble = () => ({
  statusCode: 200,
  payload: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.payload = body;
    return this;
  },
});

const makeStandardError = (message, code) => ({
  success: false,
  message,
  error: { code },
  timestamp: new Date().toISOString(),
});

const getLastRouteHandler = (router, path, method = 'post') => {
  const layer = router.stack.find((entry) => entry.route?.path === path && entry.route.methods?.[method]);
  if (!layer) return undefined;
  const stack = layer.route.stack || [];
  return stack[stack.length - 1]?.handle;
};

describe('P3-002 Security Invariants Contracts', () => {
  let validator;

  beforeAll(() => {
    validator = new ContractValidator(Contracts);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    validator.clearResults();
    delete process.env.SETUP_SECRET;

    mockTokenVerifyAccess.mockResolvedValue({ sub: 1, estate_id: 1 });
    mockDbInit.mockResolvedValue(undefined);
    mockDbQuery.mockResolvedValue({ rowCount: 1, rows: [{ id: 1, estate_id: 1, role: 'resident', email: 'resident@example.com' }] });
  });

  describe('1) Admin bulk operations estate-scope contract', () => {
    it('rejects request when estate context is absent and ignores body estateId fallback', async () => {
      const req = {
        body: { userIds: [101], estateId: 999 },
        user: { id: 1, role: 'admin', estate_id: null },
      };
      const res = makeResDouble();

      await adminController.bulkApproveUsers(req, res);

      expect(mockDbQuery).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);

      const result = validator.validateResponse('Security.AdminBulkApproveEstateScope', 403, res.payload);
      expect(result.valid).toBe(true);
    });

    it('binds bulk reject query to authenticated estate context', async () => {
      const req = {
        body: { userIds: [101], reason: 'security-test' },
        user: { id: 1, role: 'admin', estate_id: 77 },
      };
      const res = makeResDouble();
      mockDbQuery.mockResolvedValueOnce({ rows: [{ id: 101, username: 'u', email: 'u@test.com', role: 'resident' }] });

      await adminController.bulkRejectUsers(req, res);

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND estate_id = $3'),
        [[101], 'security-test', 77],
      );

      const result = validator.validateResponse('Security.AdminBulkRejectEstateScope', 200, res.payload);
      expect(result.valid).toBe(true);
    });
  });

  describe('2) QR regenerate auth + tenant + leakage contract', () => {
    it('returns standard unauthorized shape when route is hit without auth token', async () => {
      const app = express();
      app.use(express.json());
      app.use('/api/visitors', (await import('../../src/routes/visitorRoutes.js')).default);
      app.use(errorHandler);

      const response = await request(app).post('/api/visitors/123/regenerate-qr').send({});

      expect(response.status).toBe(401);
      const result = validator.validateResponse('Security.QRRegenerate', 401, response.body);
      expect(result.valid).toBe(true);
    });

    it('denies cross-estate QR regeneration and does not leak visitor token fields', async () => {
      const req = {
        params: { id: '123' },
        user: { id: 20, role: 'resident', email: 'resident@example.com', estate_id: 7 },
      };
      const res = {};

      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          id: 123,
          name: 'Visitor',
          phone: '+254700000000',
          purpose: 'visit',
          date_of_visit: new Date().toISOString(),
          estate_id: 9,
          status: 'pending',
          host_id: null,
          resident_id: null,
          created_by: 'resident@example.com',
          visitor_token: 'sensitive',
          qr_token: 'sensitive',
        }],
      });

      await qrCodeController.regenerateQR(req, res);

      expect(mockRespondError).toHaveBeenCalledWith(res, 403, 'You do not have access to this visitor');
      const [, code, message] = mockRespondError.mock.calls[0];
      const result = validator.validateResponse(
        'Security.QRRegenerate',
        code,
        makeStandardError(message, 'FORBIDDEN'),
      );
      expect(result.valid).toBe(true);
      expect(JSON.stringify(mockRespond.mock.calls)).not.toContain('visitor_token');
      expect(JSON.stringify(mockRespond.mock.calls)).not.toContain('qr_token');
    });
  });

  describe('3) Setup bootstrap gate contract', () => {
    it('is disabled by default when setup secret is missing', async () => {
      const app = express();
      app.use(express.json());
      app.use('/api/setup', setupRoutes);

      const response = await request(app).post('/api/setup/migrate').send({ secret: 'any-secret' });

      expect(response.status).toBe(403);
      const result = validator.validateResponse('Security.SetupBootstrapMigrate', 403, response.body);
      expect(result.valid).toBe(true);
      expect(response.body.message).toBe('Setup is disabled');
    });

    it('is disabled when setup secret is weak (no permissive fallback)', async () => {
      process.env.SETUP_SECRET = 'weak-secret';
      const app = express();
      app.use(express.json());
      app.use('/api/setup', setupRoutes);

      const response = await request(app).post('/api/setup/migrate').send({ secret: 'weak-secret' });

      expect(response.status).toBe(403);
      const result = validator.validateResponse('Security.SetupBootstrapMigrate', 403, response.body);
      expect(result.valid).toBe(true);
      expect(response.body.message).toBe('Setup is disabled');
    });
  });

  describe('4) MFA disable auth contract consistency', () => {
    it('requires password in request contract shape', () => {
      const result = validator.validateRequest('Security.MFADisable', { token: '123456' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({ path: 'password' }));
    });

    it('returns consistent denial shape for invalid password', async () => {
      const handler = getLastRouteHandler(mfaRoutes, '/disable', 'post');
      expect(typeof handler).toBe('function');

      const req = {
        user: { id: 1 },
        body: { password: 'WrongPass123!', token: '123456' },
      };
      const res = makeResDouble();
      const next = jest.fn((error) => errorHandler(error, req, res, () => {}));

      mockVerifyPassword.mockResolvedValue(false);

      handler(req, res, next);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(res.statusCode).toBe(401);
      const result = validator.validateResponse('Security.MFADisable', 401, res.payload);
      expect(result.valid).toBe(true);
      expect(res.payload.message).toBe('Invalid password');
      expect(res.payload.error.code).toBe('INVALID_PASSWORD');
    });
  });
});
