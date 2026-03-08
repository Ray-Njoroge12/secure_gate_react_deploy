/**
 * Unit Tests for QR Code Service
 * 
 * Tests cover:
 * - QR code generation for visitor invitations
 * - QR code validation
 * - JWT token creation and verification
 * - Database operations with timeout handling
 * - QR code statistics retrieval
 * - QR code deactivation
 * - Compatibility wrapper methods
 * - Error handling for all scenarios
 * - Timeout scenarios
 */

import { jest } from '@jest/globals';

// Mock QRCode library
const mockToDataURL = jest.fn();
jest.unstable_mockModule('qrcode', () => ({
  default: {
    toDataURL: mockToDataURL
  }
}));

// Mock crypto
const mockRandomUUID = jest.fn().mockReturnValue('test-uuid-1234');
const actualCrypto = jest.requireActual('crypto');
jest.unstable_mockModule('crypto', () => ({
  __esModule: true,
  ...actualCrypto,
  default: { ...actualCrypto, randomUUID: mockRandomUUID },
  randomUUID: mockRandomUUID,
  randomBytes: jest.fn().mockReturnValue(Buffer.from('test-token'))
}));

// Mock JWT
const mockSign = jest.fn();
const mockVerify = jest.fn();
jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    sign: mockSign,
    verify: mockVerify
  }
}));

// Mock UUID
jest.unstable_mockModule('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-v4')
}));

// Mock Logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: mockLogger,
  logger: mockLogger
}));

// Mock Token Service
const mockGenerateToken = jest.fn().mockResolvedValue('qr-token-123');
const mockCreateToken = jest.fn().mockResolvedValue({
  success: true,
  data: {
    token: 'qr-token-123',
    qrId: 'qr-123'
  }
});
jest.unstable_mockModule('../../src/services/qrTokenService.js', () => ({
  default: {
    generateToken: mockGenerateToken,
    createToken: mockCreateToken
  }
}));

// Mock database manager
const mockQuery = jest.fn();
const mockDbManager = {
  query: mockQuery
};

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: mockDbManager
}));

describe('OptimizedQRCodeService', () => {
  let QRCodeService;
  let consoleErrorSpy;
  let originalEnv;

  // Define mocks here so they are available to beforeEach
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  };

  const mockGenerateToken = jest.fn().mockResolvedValue('qr-token-123');
  const mockCreateToken = jest.fn().mockImplementation(async () => {
    console.log('--- MOCK CREATE TOKEN CALLED ---');
    return {
      success: true,
      data: {
        token: 'qr-token-123',
        qrId: 'qr-123'
      }
    };
  });

  beforeAll(async () => {
    originalEnv = { ...process.env };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error');

    // Reset environment
    process.env.JWT_SECRET = 'test-jwt-secret';

    // Reset mocks
    mockToDataURL.mockResolvedValue('data:image/png;base64,iVBORw0KGgo=');
    mockSign.mockReturnValue('mock-jwt-token');
    mockVerify.mockReturnValue({
      qrId: 'test-uuid-1234',
      visitorId: 1,
      type: 'visitor_invite'
    });
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    mockRandomUUID.mockReturnValue('test-uuid-1234');
    mockCreateToken.mockResolvedValue({
      success: true,
      data: {
        token: 'qr-token-123',
        qrId: 'qr-123'
      }
    });

    // Reset modules and re-import
    jest.resetModules();

    jest.unstable_mockModule('qrcode', () => ({
      default: { toDataURL: mockToDataURL }
    }));
    jest.unstable_mockModule('crypto', () => ({
      __esModule: true,
      ...actualCrypto,
      default: { ...actualCrypto, randomUUID: mockRandomUUID },
      randomUUID: mockRandomUUID,
      randomBytes: jest.fn().mockReturnValue(Buffer.from('test-token'))
    }));
    jest.unstable_mockModule('jsonwebtoken', () => ({
      default: { sign: mockSign, verify: mockVerify }
    }));
    jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
      dbManager: mockDbManager
    }));
    jest.unstable_mockModule('uuid', () => ({
      v4: jest.fn().mockReturnValue('test-uuid-v4')
    }));
    jest.unstable_mockModule('../../src/config/logger.js', () => ({
      default: mockLogger,
      logger: mockLogger
    }));
    jest.unstable_mockModule('../../src/services/qrTokenService.js', () => ({
      default: {
        generateToken: mockGenerateToken,
        createToken: mockCreateToken
      }
    }));

    const module = await import('../../src/services/qrCodeService.js');
    QRCodeService = module.default;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with default QR code options', () => {
      expect(QRCodeService.defaultOptions).toBeDefined();
      expect(QRCodeService.defaultOptions.errorCorrectionLevel).toBe('M');
      expect(QRCodeService.defaultOptions.width).toBe(256);
    });
  });

  describe('generateVisitorQR', () => {
    const mockVisitorData = {
      id: 1,
      name: 'John Doe',
      phone: '+254712345678',
      purpose: 'Meeting',
      date_of_visit: new Date('2025-12-25')
    };

    it('should generate QR code successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ qr_id: 'test-uuid-1234', expires_at: new Date(), status: 'active' }],
        rowCount: 1
      });

      const result = await QRCodeService.generateVisitorQR(mockVisitorData);

      expect(result.success).toBe(true);
      expect(result.data.qrId).toBe('test-uuid-1234');
      expect(result.data.qrCodeDataUrl).toBeDefined();
      expect(result.data.token).toBe('qr-token-123');
    });

    it('should generate unique QR ID', async () => {
      mockQuery.mockResolvedValue({ rows: [{}], rowCount: 1 });

      await QRCodeService.generateVisitorQR(mockVisitorData);

      expect(mockRandomUUID).toHaveBeenCalled();
    });

    it('should sign JWT with correct payload', async () => {
      mockQuery.mockResolvedValue({ rows: [{}], rowCount: 1 });

      await QRCodeService.generateVisitorQR(mockVisitorData);

      expect(mockSign).toHaveBeenCalledWith(
        expect.objectContaining({
          qrId: 'test-uuid-1234',
          type: 'visitor_access'
        }),
        'test-jwt-secret',
        expect.objectContaining({
          expiresIn: expect.any(Number)
        })
      );
    });

    it('should set expiration to end of visit day', async () => {
      mockQuery.mockResolvedValue({ rows: [{}], rowCount: 1 });

      const result = await QRCodeService.generateVisitorQR(mockVisitorData);

      const expiresAt = new Date(result.data.expiresAt);
      expect(expiresAt.getHours()).toBe(23);
      expect(expiresAt.getMinutes()).toBe(59);
    });

    it('should use fallback expiration if no visit date', async () => {
      mockQuery.mockResolvedValue({ rows: [{}], rowCount: 1 });

      const visitorWithoutDate = { ...mockVisitorData, date_of_visit: null };
      const result = await QRCodeService.generateVisitorQR(visitorWithoutDate);

      expect(result.success).toBe(true);
      expect(result.data.expiresAt).toBeDefined();
    });

    it('should store QR code in database', async () => {
      mockQuery.mockResolvedValue({ rows: [{}], rowCount: 1 });

      await QRCodeService.generateVisitorQR(mockVisitorData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO qr_codes'),
        expect.arrayContaining(['test-uuid-1234', 1, 'mock-jwt-token'])
      );
    });

    it('should apply custom QR options', async () => {
      mockQuery.mockResolvedValue({ rows: [{}], rowCount: 1 });

      await QRCodeService.generateVisitorQR(mockVisitorData, { width: 512 });

      expect(mockToDataURL).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ width: 512 })
      );
    });

    it('should handle QR code generation timeout', async () => {
      mockToDataURL.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('QR code generation timeout')), 10)
        )
      );

      // Simulate timeout by making QR generation hang
      mockToDataURL.mockImplementation(() => new Promise(() => { }));

      // We need to use a shorter timeout for this test
      // The actual implementation uses Promise.race with 3000ms timeout
      // For testing, we'll just verify the error handling path
      mockToDataURL.mockRejectedValue(new Error('QR code generation timeout'));

      const result = await QRCodeService.generateVisitorQR(mockVisitorData);

      expect(result.success).toBe(false);
      expect(result.code).toBe(408);
    });

    it('should handle database timeout', async () => {
      mockQuery.mockRejectedValue(new Error('Database query timeout'));

      const result = await QRCodeService.generateVisitorQR(mockVisitorData);

      expect(result.success).toBe(false);
      expect(result.code).toBe(408);
    });

    it('should handle general errors', async () => {
      mockQuery.mockRejectedValue(new Error('Connection lost'));

      const result = await QRCodeService.generateVisitorQR(mockVisitorData);

      expect(result.success).toBe(false);
      expect(result.code).toBe(500);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should return visitor info in response', async () => {
      mockQuery.mockResolvedValue({ rows: [{}], rowCount: 1 });

      const result = await QRCodeService.generateVisitorQR(mockVisitorData);

      expect(result.data.visitor).toEqual({
        id: 1
      });
    });
  });

  describe('validateQR', () => {
    const validQRData = JSON.stringify({
      token: 'valid-token',
      qrId: 'test-uuid-1234',
      type: 'visitor_access'
    });

    beforeEach(() => {
      mockVerify.mockReturnValue({
        qrId: 'test-uuid-1234',
        visitorId: 1,
        type: 'visitor_invite'
      });
    });

    it('should validate QR code successfully', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            qr_id: 'test-uuid-1234',
            visitor_id: 1,
            status: 'active',
            expires_at: futureDate,
            scan_count: 0
          }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'John Doe',
            phone: '+254712345678',
            status: 'approved'
          }],
          rowCount: 1
        });

      const result = await QRCodeService.validateQR(validQRData);

      expect(result.success).toBe(true);
      expect(result.data.qrId).toBe('test-uuid-1234');
      expect(result.data.visitor).toBeDefined();
    });

    it('should reject invalid JSON format', async () => {
      const result = await QRCodeService.validateQR('invalid-json');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid QR code format');
      expect(result.code).toBe(400);
    });

    it('should reject missing token', async () => {
      const result = await QRCodeService.validateQR(JSON.stringify({ qrId: '123' }));

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required QR code data');
      expect(result.code).toBe(400);
    });

    it('should reject missing qrId', async () => {
      const result = await QRCodeService.validateQR(JSON.stringify({ token: 'abc' }));

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required QR code data');
      expect(result.code).toBe(400);
    });

    it('should reject invalid JWT token', async () => {
      mockVerify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      const result = await QRCodeService.validateQR(validQRData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired QR code');
      expect(result.code).toBe(401);
    });

    it('should reject expired JWT token', async () => {
      mockVerify.mockImplementation(() => {
        const err = new Error('jwt expired');
        err.name = 'TokenExpiredError';
        throw err;
      });

      const result = await QRCodeService.validateQR(validQRData);

      expect(result.success).toBe(false);
      expect(result.code).toBe(401);
    });

    it('should reject QR code not found in database', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await QRCodeService.validateQR(validQRData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('QR code not found');
      expect(result.code).toBe(404);
    });

    it('should reject expired QR code', async () => {
      const pastDate = new Date(Date.now() - 86400000);
      mockQuery.mockResolvedValueOnce({
        rows: [{
          qr_id: 'test-uuid-1234',
          status: 'active',
          expires_at: pastDate
        }],
        rowCount: 1
      });

      const result = await QRCodeService.validateQR(validQRData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('QR code has expired');
      expect(result.code).toBe(410);
    });

    it('should reject inactive QR code', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      mockQuery.mockResolvedValueOnce({
        rows: [{
          qr_id: 'test-uuid-1234',
          status: 'used',
          expires_at: futureDate
        }],
        rowCount: 1
      });

      const result = await QRCodeService.validateQR(validQRData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('QR code is not active');
      expect(result.code).toBe(403);
    });

    it('should reject if visitor not found', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            qr_id: 'test-uuid-1234',
            visitor_id: 1,
            status: 'active',
            expires_at: futureDate
          }],
          rowCount: 1
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await QRCodeService.validateQR(validQRData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Associated visitor not found');
      expect(result.code).toBe(404);
    });

    it('should handle database timeout', async () => {
      mockQuery.mockRejectedValue(new Error('Database query timeout'));

      const result = await QRCodeService.validateQR(validQRData);

      expect(result.success).toBe(false);
      expect(result.code).toBe(408);
    });
  });

  describe('getQRStats', () => {
    it('should return QR statistics', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          total_generated: '5',
          active_count: '2',
          used_count: '3',
          last_generated: new Date()
        }],
        rowCount: 1
      });

      const result = await QRCodeService.getQRStats(1);

      expect(result.success).toBe(true);
      expect(result.data.total_generated).toBe(5);
      expect(result.data.active_count).toBe(2);
      expect(result.data.used_count).toBe(3);
    });

    it('should return zero stats for no QR codes', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await QRCodeService.getQRStats(999);

      expect(result.success).toBe(true);
      expect(result.data.total_generated).toBe(0);
    });

    it('should handle timeout', async () => {
      mockQuery.mockRejectedValue(new Error('Database query timeout'));

      const result = await QRCodeService.getQRStats(1);

      expect(result.success).toBe(false);
      expect(result.code).toBe(408);
    });

    it('should handle errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const result = await QRCodeService.getQRStats(1);

      expect(result.success).toBe(false);
      expect(result.code).toBe(500);
    });
  });

  describe('deactivateQR', () => {
    it('should deactivate QR code successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await QRCodeService.deactivateQR('qr-123');

      expect(result.success).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE qr_codes'),
        expect.arrayContaining(['inactive', 'qr-123'])
      );
    });

    it('should handle errors', async () => {
      mockQuery.mockRejectedValue(new Error('Update failed'));

      const result = await QRCodeService.deactivateQR('qr-123');

      expect(result.success).toBe(false);
      expect(result.code).toBe(500);
    });
  });

  describe('Compatibility Wrappers', () => {
    describe('validateQRCode', () => {
      it('should return valid: true on success', async () => {
        const futureDate = new Date(Date.now() + 86400000);
        mockQuery
          .mockResolvedValueOnce({
            rows: [{
              qr_id: 'test-uuid-1234',
              visitor_id: 1,
              status: 'active',
              expires_at: futureDate
            }],
            rowCount: 1
          })
          .mockResolvedValueOnce({
            rows: [{ id: 1, name: 'John' }],
            rowCount: 1
          });

        const validQRToken = JSON.stringify({
          token: 'valid-token',
          qrId: 'test-uuid-1234'
        });

        const result = await QRCodeService.validateQRCode(validQRToken);

        expect(result.valid).toBe(true);
        expect(result.visitor).toBeDefined();
      });

      it('should return valid: false on failure', async () => {
        const result = await QRCodeService.validateQRCode('invalid');

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('markQRCodeUsed', () => {
      it('should mark QR as used', async () => {
        mockQuery.mockResolvedValueOnce({ rowCount: 1 });

        const qrToken = JSON.stringify({ qrId: 'qr-123' });
        const result = await QRCodeService.markQRCodeUsed(qrToken);

        expect(result.success).toBe(true);
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("SET status = 'used'"),
          ['qr-123']
        );
      });

      it('should handle invalid token format', async () => {
        const result = await QRCodeService.markQRCodeUsed('invalid');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid QR token format');
      });

      it('should handle missing qrId', async () => {
        const result = await QRCodeService.markQRCodeUsed(JSON.stringify({}));

        expect(result.success).toBe(false);
        expect(result.error).toBe('Missing qrId');
      });
    });

    describe('getQRCodeByVisitorId', () => {
      it('should return QR code for visitor', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'qr-123',
            visitor_id: 1,
            status: 'active'
          }],
          rowCount: 1
        });

        const result = await QRCodeService.getQRCodeByVisitorId(1);

        expect(result).toBeDefined();
        expect(result.id).toBe('qr-123');
      });

      it('should return null if no QR code found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const result = await QRCodeService.getQRCodeByVisitorId(999);

        expect(result).toBeNull();
      });
    });

    describe('getQRCodeAnalytics', () => {
      it('should return analytics for date range', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            total: 100,
            active: 20,
            used: 70,
            expired: 10
          }],
          rowCount: 1
        });

        const result = await QRCodeService.getQRCodeAnalytics(
          new Date('2025-01-01'),
          new Date('2025-12-31')
        );

        expect(result.total).toBe(100);
        expect(result.active).toBe(20);
      });

      it('should return zeros if no data', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const result = await QRCodeService.getQRCodeAnalytics(
          new Date('2025-01-01'),
          new Date('2025-12-31')
        );

        expect(result).toEqual({ total: 0, active: 0, used: 0, expired: 0 });
      });
    });

    describe('cleanupExpiredQRCodes', () => {
      it('should cleanup expired QR codes', async () => {
        mockQuery.mockResolvedValueOnce({ rowCount: 5 });

        const result = await QRCodeService.cleanupExpiredQRCodes();

        expect(result).toBe(5);
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("SET status = 'expired'"),
          []
        );
      });

      it('should return 0 if no codes cleaned', async () => {
        mockQuery.mockResolvedValueOnce({ rowCount: 0 });

        const result = await QRCodeService.cleanupExpiredQRCodes();

        expect(result).toBe(0);
      });
    });
  });
});
