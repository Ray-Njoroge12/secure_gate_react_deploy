/**
 * QR Code Service Unit Tests
 * SEC-004: One-Time QR Code Use Enforcement
 */

import { jest } from '@jest/globals';

// Mock dependencies - include all exports from db.enhanced.js
const mockQuery = jest.fn();
const mockDbManager = {
  query: mockQuery,
  getStatus: jest.fn().mockReturnValue({ isConnected: true }),
  testConnection: jest.fn().mockResolvedValue(true),
  initializeAsync: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn().mockResolvedValue(undefined)
};

jest.unstable_mockModule('../../../src/database/db.enhanced.js', () => ({
  dbManager: mockDbManager,
  db: mockDbManager,
  default: mockDbManager,
  getDBStatus: jest.fn().mockReturnValue({ isConnected: true }),
  testDBConnection: jest.fn().mockResolvedValue(true)
}));

jest.unstable_mockModule('qrcode', () => ({
  default: {
    toDataURL: jest.fn()
  }
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    sign: jest.fn(),
    verify: jest.fn()
  }
}));

// Import after mocking
const { dbManager } = await import('../../../src/database/db.enhanced.js');
const QRCode = (await import('qrcode')).default;
const jwt = (await import('jsonwebtoken')).default;

const qrCodeService = (await import('../../../src/services/qrCodeService.js')).default;

describe('QRCodeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key-for-testing';
  });

  describe('SEC-004: One-Time QR Code Use', () => {
    describe('generateVisitorQR', () => {
      it('should generate QR code with unique qrId', async () => {
        const mockVisitor = {
          id: 1,
          name: 'John Visitor',
          phone: '+254712345678',
          purpose: 'Meeting',
          date_of_visit: new Date().toISOString().split('T')[0]
        };

        jwt.sign.mockReturnValue('mock-jwt-token');
        QRCode.toDataURL.mockResolvedValue('data:image/png;base64,mock-qr-image');
        dbManager.query.mockResolvedValue({
          rows: [{
            qr_id: 'mock-uuid',
            expires_at: new Date(Date.now() + 86400000),
            status: 'active',
            created_at: new Date()
          }]
        });

        const result = await qrCodeService.generateVisitorQR(mockVisitor);

        expect(result.success).toBe(true);
        expect(result.data.qrId).toBeDefined();
        expect(result.data.qrCodeDataUrl).toContain('data:image/png');
        expect(result.data.token).toBeDefined();
      });

      it('should set QR expiry to end of visit day', async () => {
        const visitDate = '2025-12-31';
        const mockVisitor = {
          id: 1,
          name: 'Test',
          date_of_visit: visitDate
        };

        jwt.sign.mockReturnValue('token');
        QRCode.toDataURL.mockResolvedValue('data:image/png;base64,test');
        dbManager.query.mockResolvedValue({ rows: [{}] });

        await qrCodeService.generateVisitorQR(mockVisitor);

        // Check JWT sign was called with correct expiry
        const jwtCall = jwt.sign.mock.calls[0];
        expect(jwtCall[0].expiresAt).toContain(visitDate);
      });

      it('should store QR code with active status', async () => {
        const mockVisitor = { id: 1, name: 'Test' };

        jwt.sign.mockReturnValue('token');
        QRCode.toDataURL.mockResolvedValue('data:image/png;base64,test');
        dbManager.query.mockResolvedValue({ rows: [{ qr_id: 'test' }] });

        await qrCodeService.generateVisitorQR(mockVisitor);

        const insertCall = dbManager.query.mock.calls[0];
        expect(insertCall[0]).toContain('INSERT INTO qr_codes');
        expect(insertCall[1]).toContain('active');
      });

      it('should throw when JWT_SECRET is missing outside test mode', async () => {
        const originalNodeEnv = process.env.NODE_ENV;

        delete process.env.JWT_SECRET;
        process.env.NODE_ENV = 'development';

        try {
          await expect(qrCodeService.generateVisitorQR({ id: 1, name: 'Test' }))
            .rejects
            .toThrow('JWT_SECRET is required');
        } finally {
          process.env.NODE_ENV = originalNodeEnv;
          process.env.JWT_SECRET = 'test-secret-key-for-testing';
        }
      });
    });

    describe('validateQR', () => {
      const validQrData = JSON.stringify({
        token: 'valid-jwt-token',
        qrId: 'test-qr-id',
        type: 'visitor_access'
      });

      it('should validate active QR code successfully', async () => {
        jwt.verify.mockReturnValue({
          qrId: 'test-qr-id',
          visitorId: 1,
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        });

        dbManager.query
          .mockResolvedValueOnce({
            rows: [{
              qr_id: 'test-qr-id',
              visitor_id: 1,
              status: 'active',
              expires_at: new Date(Date.now() + 86400000),
              scan_count: 0
            }]
          })
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              name: 'Test Visitor',
              phone: '+254712345678',
              status: 'pending'
            }]
          });

        const result = await qrCodeService.validateQR(validQrData);

        expect(result.success).toBe(true);
        expect(result.data.visitor).toBeDefined();
      });

      it('should reject expired QR code', async () => {
        jwt.verify.mockReturnValue({
          qrId: 'test-qr-id',
          visitorId: 1
        });

        dbManager.query.mockResolvedValueOnce({
          rows: [{
            qr_id: 'test-qr-id',
            status: 'active',
            expires_at: new Date(Date.now() - 86400000) // Expired yesterday
          }]
        });

        const result = await qrCodeService.validateQR(validQrData);

        expect(result.success).toBe(false);
        expect(result.error).toContain('expired');
      });

      it('should reject already used QR code', async () => {
        jwt.verify.mockReturnValue({
          qrId: 'test-qr-id',
          visitorId: 1
        });

        dbManager.query.mockResolvedValueOnce({
          rows: [{
            qr_id: 'test-qr-id',
            status: 'used', // Already used
            expires_at: new Date(Date.now() + 86400000)
          }]
        });

        const result = await qrCodeService.validateQR(validQrData);

        expect(result.success).toBe(false);
        expect(result.error).toContain('not active');
      });

      it('should reject tampered QR code with invalid JWT', async () => {
        jwt.verify.mockImplementation(() => {
          throw new Error('invalid signature');
        });

        const result = await qrCodeService.validateQR(validQrData);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid or expired');
      });

      it('should reject invalid QR code format', async () => {
        const result = await qrCodeService.validateQR('not-valid-json');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid QR code format');
      });

      it('should reject QR code missing required fields', async () => {
        const incompleteData = JSON.stringify({ token: 'test' }); // Missing qrId

        const result = await qrCodeService.validateQR(incompleteData);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Missing required');
      });
    });

    describe('consumeQRCode', () => {
      it('should reject expired QR code on consume', async () => {
        const qrToken = JSON.stringify({ token: 'valid-jwt', qrId: 'expired-qr' });

        jwt.verify.mockReturnValue({ qrId: 'expired-qr', visitorId: 1 });
        dbManager.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({
            rows: [{
              qr_id: 'expired-qr',
              status: 'active',
              expires_at: new Date(Date.now() - 1000)
            }]
          });

        const result = await qrCodeService.consumeQRCode(qrToken, { guardId: 7 });

        expect(result.success).toBe(false);
        expect(result.error).toContain('expired');
      });

      it('should reject reused QR code on consume', async () => {
        const qrToken = JSON.stringify({ token: 'valid-jwt', qrId: 'used-qr' });

        jwt.verify.mockReturnValue({ qrId: 'used-qr', visitorId: 1 });
        dbManager.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({
            rows: [{
              qr_id: 'used-qr',
              status: 'used',
              expires_at: new Date(Date.now() + 1000)
            }]
          });

        const result = await qrCodeService.consumeQRCode(qrToken, { guardId: 9 });

        expect(result.success).toBe(false);
        expect(result.error).toContain('already been used');
      });
    });

    describe('markQRCodeUsed', () => {
      it('should mark QR code as used with scan count', async () => {
        const qrToken = JSON.stringify({ qrId: 'test-qr-id', token: 'jwt' });

        dbManager.query.mockResolvedValue({ rows: [] });

        await qrCodeService.markQRCodeUsed(qrToken);

        const updateCall = dbManager.query.mock.calls[0];
        expect(updateCall[0]).toContain("status = 'used'");
        expect(updateCall[0]).toContain('scan_count = scan_count + 1');
      });

      it('should reject invalid token format', async () => {
        const result = await qrCodeService.markQRCodeUsed('invalid');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid');
      });
    });

    describe('validateQRCode (compatibility wrapper)', () => {
      it('should return valid:true for valid QR', async () => {
        const validQrData = JSON.stringify({
          token: 'valid-jwt',
          qrId: 'test-id'
        });

        jwt.verify.mockReturnValue({ qrId: 'test-id', visitorId: 1 });
        dbManager.query
          .mockResolvedValueOnce({
            rows: [{
              qr_id: 'test-id',
              status: 'active',
              expires_at: new Date(Date.now() + 86400000),
              visitor_id: 1
            }]
          })
          .mockResolvedValueOnce({
            rows: [{ id: 1, name: 'Test', status: 'pending' }]
          });

        const result = await qrCodeService.validateQRCode(validQrData);

        expect(result.valid).toBe(true);
        expect(result.visitor).toBeDefined();
      });

      it('should return valid:false for invalid QR', async () => {
        jwt.verify.mockImplementation(() => {
          throw new Error('invalid');
        });

        const result = await qrCodeService.validateQRCode('{"token":"bad","qrId":"x"}');

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('QR Code Analytics', () => {
    it('should return QR code statistics', async () => {
      dbManager.query.mockResolvedValue({
        rows: [{
          total_generated: '10',
          active_count: '5',
          used_count: '3',
          last_generated: new Date()
        }]
      });

      const result = await qrCodeService.getQRStats(1);

      expect(result.success).toBe(true);
      expect(result.data.total_generated).toBe(10);
      expect(result.data.active_count).toBe(5);
    });

    it('should cleanup expired QR codes', async () => {
      dbManager.query.mockResolvedValue({ rowCount: 5 });

      const count = await qrCodeService.cleanupExpiredQRCodes();

      expect(count).toBe(5);
      const query = dbManager.query.mock.calls[0][0];
      expect(query).toContain("status = 'expired'");
      expect(query).toContain('expires_at < NOW()');
    });
  });
});
