import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUsers,
  createTestVisitor,
  dbManager,
  getAuthToken
} from './setup.js';

const mockGenerateVisitorQR = jest.fn();
const mockGetQRCodeAnalytics = jest.fn();
const mockCleanupExpiredQRCodes = jest.fn();

const createAuthToken = async ({ id, email, role, estate_id }) => {
  const jwt = await import('jsonwebtoken');
  const crypto = await import('crypto');
  const secret = process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests';

  return jwt.default.sign(
    {
      id,
      sub: String(id),
      email,
      role,
      estate_id,
      type: 'access',
      jti: crypto.randomBytes(16).toString('hex')
    },
    secret,
    {
      expiresIn: '2h',
      issuer: 'secure-gate-api',
      audience: 'secure-gate-client'
    }
  );
};

jest.unstable_mockModule('../../src/services/qrCodeService.js', () => ({
  default: {
    generateVisitorQR: mockGenerateVisitorQR,
    getQRCodeByVisitorId: jest.fn().mockResolvedValue(null),
    validateQRCode: jest.fn().mockResolvedValue({ success: true }),
    markQRCodeUsed: jest.fn().mockResolvedValue(true),
    getQRCodeAnalytics: mockGetQRCodeAnalytics,
    cleanupExpiredQRCodes: mockCleanupExpiredQRCodes
  }
}));

describe('Backend deep-dive dynamic verification', () => {
  let app;
  let users;
  let adminToken;
  let residentToken;

  beforeAll(async () => {
    await setupTestDatabase();
    const appModule = await import('../../src/app.js');
    app = appModule.default;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await cleanupTestDatabase();
    users = await createTestUsers();

    adminToken = await getAuthToken(users.admin.email);
    residentToken = await getAuthToken(users.resident.email);

    mockGenerateVisitorQR.mockResolvedValue({
      success: true,
      data: {
        qrCodeDataUrl: 'data:image/png;base64,verification-qr',
        qrId: 'qr-dynamic-verification'
      }
    });
    mockGetQRCodeAnalytics.mockResolvedValue({
      totalQRCodes: 5,
      activeQRCodes: 2,
      expiredQRCodes: 3
    });
    mockCleanupExpiredQRCodes.mockResolvedValue(3);
  });

  describe('Setup route hardening verification', () => {
    it('blocks unauthenticated callers from setup migrate surface by default', async () => {
      const response = await request(app)
        .post('/api/setup/migrate')
        .send({ secret: 'not-the-secret' });

      expect([403, 404]).toContain(response.status);
    });

    it('blocks unauthenticated callers from setup seed surface by default', async () => {
      const response = await request(app)
        .post('/api/setup/seed')
        .send({ secret: 'not-the-secret' });

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Public QR regeneration exposure verification', () => {
    it('blocks unauthenticated regenerate-qr invocation', async () => {
      const visitor = await createTestVisitor(users.resident.id, {
        name: 'Public Regenerate Route Visitor',
        status: 'pending'
      });

      const response = await request(app)
        .post(`/api/visitors/${visitor.id}/regenerate-qr`)
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(mockGenerateVisitorQR).not.toHaveBeenCalled();
    });

    it('does not return visitor token material in regenerate response payload', async () => {
      const visitor = await createTestVisitor(users.resident.id, {
        name: 'Token Material Redaction Visitor',
        status: 'pending'
      });

      await dbManager.query(
        'UPDATE visitors SET status = $1, visitor_token = $2 WHERE id = $3',
        ['pending', 'vst_dynamic_exposure_token', visitor.id]
      );

      const response = await request(app)
        .post(`/api/visitors/${visitor.id}/regenerate-qr`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data.visitorToken).toBeUndefined();
      expect(response.body.data.data.visitor_token).toBeUndefined();
      expect(mockGenerateVisitorQR).toHaveBeenCalled();
    });

    it('requires explicit estate context for super admin regenerate requests', async () => {
      const visitor = await createTestVisitor(users.resident.id, {
        name: 'Super Admin Missing Context Visitor',
        status: 'pending'
      });

      const superAdminNoEstateToken = await createAuthToken({
        id: users.superAdmin.id,
        email: users.superAdmin.email,
        role: 'super_admin',
        estate_id: null
      });

      const response = await request(app)
        .post(`/api/visitors/${visitor.id}/regenerate-qr`)
        .set('Authorization', `Bearer ${superAdminNoEstateToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Estate context required');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockGenerateVisitorQR).not.toHaveBeenCalled();
    });

    it('treats resident created_by ownership check as case-insensitive and null-safe', async () => {
      const visitor = await createTestVisitor(users.admin.id, {
        name: 'Resident Email Owner Visitor',
        status: 'pending',
        host_id: users.admin.id,
        resident_id: users.admin.id
      });

      await dbManager.query(
        'UPDATE visitors SET created_by = $1 WHERE id = $2',
        [users.resident.email.toUpperCase(), visitor.id]
      );

      const response = await request(app)
        .post(`/api/visitors/${visitor.id}/regenerate-qr`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockGenerateVisitorQR).toHaveBeenCalled();
    });
  });

  describe('QR analytics and cleanup scope verification', () => {
    it('blocks resident role from analytics endpoint', async () => {
      const response = await request(app)
        .get('/api/qr/analytics')
        .set('Authorization', `Bearer ${residentToken}`);

      expect(response.status).toBe(403);
      expect(mockGetQRCodeAnalytics).not.toHaveBeenCalled();
    });

    it('blocks resident role from cleanup endpoint', async () => {
      const response = await request(app)
        .post('/api/qr/cleanup')
        .set('Authorization', `Bearer ${residentToken}`)
        .send({});

      expect(response.status).toBe(403);
      expect(mockCleanupExpiredQRCodes).not.toHaveBeenCalled();
    });
  });
});
