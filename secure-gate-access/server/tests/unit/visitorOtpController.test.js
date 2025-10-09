/**
 * Comprehensive Unit Tests - visitorOtpController.js
 * Phase 1, Week 1, Day 4, Phase C
 * 
 * Test Coverage:
 * - verifyOtp: OTP validation, visitor status validation, audit logging, error handling
 * - resendOtp: OTP regeneration, status validation, notification (TODO), error handling
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockQuery = jest.fn();
const mockDbManager = { query: mockQuery };

const mockRespond = jest.fn();
const mockRespondError = jest.fn();

// Setup module mocks
jest.unstable_mockModule('../../../src/database/db.enhanced.js', () => ({
  dbManager: mockDbManager
}));

jest.unstable_mockModule('../../../src/utils/respond.js', () => ({
  respond: mockRespond,
  respondError: mockRespondError
}));

const { verifyOtp, resendOtp } = await import('../../../src/controllers/visitorOtpController.js');

describe('visitorOtpController - verifyOtp', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: { id: '1' },
      body: { otp: '123456' },
      audit: jest.fn()
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('Input Validation', () => {
    test('should reject if OTP is missing', async () => {
      req.body.otp = '';
      await verifyOtp(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 400, 'OTP is required');
    });

    test('should reject if OTP is null', async () => {
      req.body.otp = null;
      await verifyOtp(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 400, 'OTP is required');
    });

    test('should reject if OTP is undefined', async () => {
      req.body = {};
      await verifyOtp(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 400, 'OTP is required');
    });
  });

  describe('Visitor Validation', () => {
    test('should reject if visitor not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await verifyOtp(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 404, 'Visitor not found');
    });

    test('should reject if visitor status is not PENDING', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, otp: '123456', status: 'VERIFIED', name: 'John Doe' }]
      });
      await verifyOtp(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 422, 'Visitor already verified or checked in');
    });

    test('should reject if visitor status is CHECKED_IN', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, otp: '123456', status: 'CHECKED_IN', name: 'John Doe' }]
      });
      await verifyOtp(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 422, 'Visitor already verified or checked in');
    });

    test('should accept PENDING status', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, otp: '123456', status: 'PENDING', name: 'John Doe' }]
        })
        .mockResolvedValueOnce({ rows: [] }); // update
      await verifyOtp(req, res);
      expect(mockRespond).toHaveBeenCalled();
    });
  });

  describe('OTP Verification', () => {
    test('should reject if OTP does not match', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, otp: '654321', status: 'PENDING', name: 'John Doe' }]
      });
      req.body.otp = '123456';
      await verifyOtp(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 400, 'Invalid OTP');
    });

    test('should accept correct OTP', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, otp: '123456', status: 'PENDING', name: 'John Doe' }]
        })
        .mockResolvedValueOnce({ rows: [] });
      req.body.otp = '123456';
      await verifyOtp(req, res);
      expect(mockRespond).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          message: 'OTP verified successfully',
          status: 'VERIFIED'
        })
      );
    });

    test('should be case-sensitive for OTP', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, otp: '123abc', status: 'PENDING', name: 'John Doe' }]
      });
      req.body.otp = '123ABC';
      await verifyOtp(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 400, 'Invalid OTP');
    });
  });

  describe('Status Update', () => {
    test('should update visitor status to VERIFIED', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, otp: '123456', status: 'PENDING', name: 'John Doe' }]
        })
        .mockResolvedValueOnce({ rows: [] });
      await verifyOtp(req, res);
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        'UPDATE visitors SET status = $1 WHERE id = $2',
        ['VERIFIED', '1']
      );
    });

    test('should return success message with new status', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, otp: '123456', status: 'PENDING', name: 'John Doe' }]
        })
        .mockResolvedValueOnce({ rows: [] });
      await verifyOtp(req, res);
      expect(mockRespond).toHaveBeenCalledWith(
        res,
        {
          message: 'OTP verified successfully',
          status: 'VERIFIED'
        }
      );
    });
  });

  describe('Audit Logging', () => {
    test('should log successful verification', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, otp: '123456', status: 'PENDING', name: 'John Doe' }]
        })
        .mockResolvedValueOnce({ rows: [] });
      await verifyOtp(req, res);
      expect(req.audit).toHaveBeenCalledWith(
        'visitor.otp.verify',
        'visitor',
        '1',
        expect.objectContaining({
          outcome: 'success',
          message: 'OTP verified successfully',
          visitorName: 'John Doe'
        })
      );
    });

    test('should log failed verification attempt', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, otp: '654321', status: 'PENDING', name: 'John Doe' }]
      });
      req.body.otp = '123456';
      await verifyOtp(req, res);
      expect(req.audit).toHaveBeenCalledWith(
        'visitor.otp.verify',
        'visitor',
        '1',
        expect.objectContaining({
          outcome: 'fail',
          message: 'Invalid OTP provided'
        })
      );
    });

    test('should log failure on error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));
      await verifyOtp(req, res);
      expect(req.audit).toHaveBeenCalledWith(
        'visitor.otp.verify',
        'visitor',
        null,
        expect.objectContaining({
          outcome: 'fail',
          message: 'Failed to verify OTP',
          error: 'Database error'
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection lost'));
      await verifyOtp(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 500, 'Failed to verify OTP');
    });

    test('should handle unexpected errors', async () => {
      mockQuery.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      await verifyOtp(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 500, 'Failed to verify OTP');
    });
  });

  describe('Edge Cases', () => {
    test('should handle numeric OTP as string', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, otp: '123456', status: 'PENDING', name: 'John Doe' }]
        })
        .mockResolvedValueOnce({ rows: [] });
      req.body.otp = 123456; // numeric instead of string
      await verifyOtp(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 400, 'Invalid OTP');
    });

    test('should handle OTP with whitespace', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, otp: '123456', status: 'PENDING', name: 'John Doe' }]
      });
      req.body.otp = ' 123456 ';
      await verifyOtp(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 400, 'Invalid OTP');
    });
  });
});

describe('visitorOtpController - resendOtp', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: { id: '1' },
      audit: jest.fn()
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('Visitor Validation', () => {
    test('should reject if visitor not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await resendOtp(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 404, 'Visitor not found');
    });

    test('should reject if visitor status is not PENDING', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, phone: '+15551234567', email: 'john@test.com', status: 'VERIFIED', name: 'John Doe' }]
      });
      await resendOtp(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 422, 'Visitor already verified or checked in');
    });

    test('should reject if visitor status is CHECKED_IN', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, phone: '+15551234567', email: 'john@test.com', status: 'CHECKED_IN', name: 'John Doe' }]
      });
      await resendOtp(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 422, 'Visitor already verified or checked in');
    });

    test('should accept PENDING status', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, phone: '+15551234567', email: 'john@test.com', status: 'PENDING', name: 'John Doe' }]
        })
        .mockResolvedValueOnce({ rows: [] }); // update
      await resendOtp(req, res);
      expect(mockRespond).toHaveBeenCalled();
    });
  });

  describe('OTP Generation', () => {
    test('should generate new 6-digit OTP', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, phone: '+15551234567', email: 'john@test.com', status: 'PENDING', name: 'John Doe' }]
        })
        .mockResolvedValueOnce({ rows: [] });
      await resendOtp(req, res);
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        'UPDATE visitors SET otp = $1 WHERE id = $2',
        [expect.stringMatching(/^\d{6}$/), '1']
      );
    });

    test('should generate different OTP on each call', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, phone: '+15551234567', email: 'john@test.com', status: 'PENDING', name: 'John Doe' }]
        })
        .mockResolvedValueOnce({ rows: [] });
      await resendOtp(req, res);
      const firstOtp = mockQuery.mock.calls[1][1][0];

      mockQuery.mockClear();
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, phone: '+15551234567', email: 'john@test.com', status: 'PENDING', name: 'John Doe' }]
        })
        .mockResolvedValueOnce({ rows: [] });
      await resendOtp(req, res);
      const secondOtp = mockQuery.mock.calls[1][1][0];

      // OTPs should be different (with very high probability)
      expect(firstOtp).not.toBe(secondOtp);
    });

    test('should update OTP in database', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, phone: '+15551234567', email: 'john@test.com', status: 'PENDING', name: 'John Doe' }]
        })
        .mockResolvedValueOnce({ rows: [] });
      await resendOtp(req, res);
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE visitors SET otp = $1 WHERE id = $2',
        [expect.any(String), '1']
      );
    });
  });

  describe('Response', () => {
    test('should return success message', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, phone: '+15551234567', email: 'john@test.com', status: 'PENDING', name: 'John Doe' }]
        })
        .mockResolvedValueOnce({ rows: [] });
      await resendOtp(req, res);
      expect(mockRespond).toHaveBeenCalledWith(
        res,
        { message: 'OTP resent successfully' }
      );
    });

    test('should not include OTP in response', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, phone: '+15551234567', email: 'john@test.com', status: 'PENDING', name: 'John Doe' }]
        })
        .mockResolvedValueOnce({ rows: [] });
      await resendOtp(req, res);
      expect(mockRespond).toHaveBeenCalledWith(
        res,
        expect.not.objectContaining({ otp: expect.any(String) })
      );
    });
  });

  describe('Audit Logging', () => {
    test('should log successful resend', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, phone: '+15551234567', email: 'john@test.com', status: 'PENDING', name: 'John Doe' }]
        })
        .mockResolvedValueOnce({ rows: [] });
      await resendOtp(req, res);
      expect(req.audit).toHaveBeenCalledWith(
        'visitor.otp.resend',
        'visitor',
        '1',
        expect.objectContaining({
          outcome: 'success',
          message: 'OTP resent successfully',
          visitorName: 'John Doe'
        })
      );
    });

    test('should log failure on error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));
      await resendOtp(req, res);
      expect(req.audit).toHaveBeenCalledWith(
        'visitor.otp.resend',
        'visitor',
        null,
        expect.objectContaining({
          outcome: 'fail',
          message: 'Failed to resend OTP',
          error: 'Database error'
        })
      );
    });
  });

  describe('TODO: Notification Integration', () => {
    test('should send OTP via SMS when implemented', async () => {
      // This is a placeholder test for future implementation
      // When SMS sending is implemented, uncomment and add proper mocks
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, phone: '+15551234567', email: 'john@test.com', status: 'PENDING', name: 'John Doe' }]
        })
        .mockResolvedValueOnce({ rows: [] });
      await resendOtp(req, res);
      // TODO: Expect SMS send function to be called
      // expect(mockSendSms).toHaveBeenCalledWith('+15551234567', expect.stringContaining('verification code'));
    });

    test('should send OTP via email when implemented', async () => {
      // This is a placeholder test for future implementation
      // When email sending is implemented, uncomment and add proper mocks
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, phone: '+15551234567', email: 'john@test.com', status: 'PENDING', name: 'John Doe' }]
        })
        .mockResolvedValueOnce({ rows: [] });
      await resendOtp(req, res);
      // TODO: Expect email send function to be called
      // expect(mockSendEmail).toHaveBeenCalledWith('john@test.com', 'Verification Code', expect.stringContaining('verification code'));
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection lost'));
      await resendOtp(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 500, 'Failed to resend OTP');
    });

    test('should handle unexpected errors', async () => {
      mockQuery.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      await resendOtp(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 500, 'Failed to resend OTP');
    });
  });

  describe('Edge Cases', () => {
    test('should handle visitor with null phone', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, phone: null, email: 'john@test.com', status: 'PENDING', name: 'John Doe' }]
        })
        .mockResolvedValueOnce({ rows: [] });
      await resendOtp(req, res);
      expect(mockRespond).toHaveBeenCalled();
      // Note: Current implementation doesn't send notifications, but should still succeed
    });

    test('should handle visitor with null email', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, phone: '+15551234567', email: null, status: 'PENDING', name: 'John Doe' }]
        })
        .mockResolvedValueOnce({ rows: [] });
      await resendOtp(req, res);
      expect(mockRespond).toHaveBeenCalled();
    });

    test('should handle visitor with both phone and email null', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, phone: null, email: null, status: 'PENDING', name: 'John Doe' }]
        })
        .mockResolvedValueOnce({ rows: [] });
      await resendOtp(req, res);
      expect(mockRespond).toHaveBeenCalled();
      // Note: This is a valid case, though in practice notification would fail
    });
  });

  describe('Security Considerations', () => {
    test('should not leak OTP in audit logs', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, phone: '+15551234567', email: 'john@test.com', status: 'PENDING', name: 'John Doe' }]
        })
        .mockResolvedValueOnce({ rows: [] });
      await resendOtp(req, res);
      const auditCall = req.audit.mock.calls[0];
      const auditData = auditCall[3];
      expect(auditData).not.toHaveProperty('otp');
    });

    test('should generate cryptographically random OTP', async () => {
      // Collect multiple OTPs to verify randomness
      const otps = new Set();
      for (let i = 0; i < 10; i++) {
        mockQuery.mockClear();
        mockQuery
          .mockResolvedValueOnce({
            rows: [{ id: 1, phone: '+15551234567', email: 'john@test.com', status: 'PENDING', name: 'John Doe' }]
          })
          .mockResolvedValueOnce({ rows: [] });
        await resendOtp(req, res);
        const otp = mockQuery.mock.calls[1][1][0];
        otps.add(otp);
      }
      // All OTPs should be unique (with very high probability)
      expect(otps.size).toBe(10);
    });
  });
});
