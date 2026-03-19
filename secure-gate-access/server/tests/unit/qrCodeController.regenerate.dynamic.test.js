import { jest, describe, beforeEach, it, expect } from '@jest/globals';

const mockQuery = jest.fn();
const mockRespond = jest.fn();
const mockRespondError = jest.fn();
const mockGenerateVisitorQR = jest.fn();
const mockVerifyPassword = jest.fn();

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: {
    query: mockQuery
  },
  db: {
    query: mockQuery
  },
  default: {
    query: mockQuery
  }
}));

jest.unstable_mockModule('../../src/utils/respond.js', () => ({
  respond: mockRespond,
  respondError: mockRespondError
}));

jest.unstable_mockModule('../../src/services/qrCodeService.js', () => ({
  default: {
    generateVisitorQR: mockGenerateVisitorQR
  }
}));

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({
  tokenService: {
    verifyToken: jest.fn()
  },
  passwordService: {
    verifyPassword: mockVerifyPassword
  },
  accountSecurity: {
    recordLoginAttempt: jest.fn()
  }
}));

const { regenerateQR } = await import('../../src/controllers/qrCodeController.js');

describe('qrCodeController regenerateQR dynamic verification', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: { id: '123' },
      user: {
        id: 10,
        role: 'resident',
        email: 'resident@example.com',
        estate_id: 1
      }
    };
    res = {};
  });

  it('requires explicit estate context before estate comparison for super_admin', async () => {
    req.user = {
      id: 1,
      role: 'super_admin',
      email: 'super@example.com',
      estate_id: null
    };

    await regenerateQR(req, res);

    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockGenerateVisitorQR).not.toHaveBeenCalled();
    expect(mockRespondError).toHaveBeenCalledWith(res, 400, 'Estate context required');
  });

  it('treats resident created_by ownership as case-insensitive', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 123,
          name: 'Case Match Visitor',
          phone: '+254700000000',
          purpose: 'visit',
          date_of_visit: new Date().toISOString(),
          estate_id: 1,
          status: 'pending',
          host_id: null,
          resident_id: null,
          created_by: 'RESIDENT@EXAMPLE.COM'
        }]
      })
      .mockResolvedValueOnce({ rows: [] });

    mockGenerateVisitorQR.mockResolvedValue({
      success: true,
      data: {
        qrId: 'qr-123',
        qrCodeDataUrl: 'data:image/png;base64,abc'
      }
    });

    await regenerateQR(req, res);

    expect(mockRespondError).not.toHaveBeenCalled();
    expect(mockGenerateVisitorQR).toHaveBeenCalled();
    expect(mockRespond).toHaveBeenCalledWith(
      res,
      expect.objectContaining({
        message: 'QR code regenerated successfully'
      })
    );
  });

  it('handles null created_by safely and rejects non-owner resident', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 123,
        name: 'Null Owner Visitor',
        phone: '+254700000000',
        purpose: 'visit',
        date_of_visit: new Date().toISOString(),
        estate_id: 1,
        status: 'pending',
        host_id: null,
        resident_id: null,
        created_by: null
      }]
    });

    await regenerateQR(req, res);

    expect(mockGenerateVisitorQR).not.toHaveBeenCalled();
    expect(mockRespondError).toHaveBeenCalledWith(
      res,
      403,
      'You can only regenerate QR codes for your own visitors'
    );
  });
});
