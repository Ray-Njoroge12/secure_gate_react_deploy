/**
 * Visitor OTP Controller Unit Tests
 * Tests for OTP verification and resend functionality
 * Priority: P0 - Critical security feature
 *
 * Coverage targets:
 * - Statements: 90%+
 * - Branches: 85%+
 * - Functions: 100%
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
const mockQuery = jest.fn();
const mockHash = jest.fn();
const mockVerify = jest.fn();
const mockGenerateOTP = jest.fn();
const mockValidateOTPFormat = jest.fn();
const mockSendOtpSms = jest.fn();
const mockSendOtpEmail = jest.fn();

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: { query: mockQuery }
}));

jest.unstable_mockModule('argon2', () => ({
  default: {
    hash: mockHash,
    verify: mockVerify
  }
}));

jest.unstable_mockModule('../../src/utils/tokenHelper.js', () => ({
  generateOTP: mockGenerateOTP,
  validateOTPFormat: mockValidateOTPFormat
}));

jest.unstable_mockModule('../../src/services/notificationService.js', () => ({
  default: {
    sendOtpVerificationSms: mockSendOtpSms,
    sendOtpVerificationEmail: mockSendOtpEmail
  }
}));

// Import after mocks
const visitorOtpController = await import('../../src/controllers/visitorOtpController.js');
const { verifyOtp, resendOtp } = visitorOtpController.default || visitorOtpController;

describe('Visitor OTP Controller', () => {
  let mockReq;
  let mockRes;
  let consoleErrorSpy;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      params: { id: '123' },
      body: {},
      audit: jest.fn()
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    process.env = {
      ...originalEnv,
      OTP_MAX_ATTEMPTS: '5',
      OTP_EXPIRY_MINUTES: '15',
      OTP_RESEND_COOLDOWN_SECONDS: '60',
      OTP_DEBUG_ECHO: 'false',
      NODE_ENV: 'test'
    };

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    process.env = originalEnv;
  });

  describe('verifyOtp', () => {
    describe('Input Validation', () => {
      it('should return 400 if OTP is missing', async () => {
        mockReq.body = {};

        await verifyOtp(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'OTP is required'
          })
        );
      });

      it('should return 400 if OTP format is invalid', async () => {
        mockReq.body = { otp: 'INVALID' };
        mockValidateOTPFormat.mockReturnValue(false);

        await verifyOtp(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Invalid OTP format'
          })
        );
        expect(mockValidateOTPFormat).toHaveBeenCalledWith('INVALID');
      });
    });

    describe('Visitor Validation', () => {
      it('should return 404 if visitor not found', async () => {
        mockReq.body = { otp: '123456' };
        mockValidateOTPFormat.mockReturnValue(true);
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await verifyOtp(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Visitor not found'
          })
        );
      });

      it('should return 422 if visitor already verified', async () => {
        mockReq.body = { otp: '123456' };
        mockValidateOTPFormat.mockReturnValue(true);
        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 123, status: 'verified', name: 'Test Visitor' }]
        });

        await verifyOtp(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(422);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Visitor already verified or checked in'
          })
        );
      });

      it('should accept PENDING status', async () => {
        mockReq.body = { otp: '123456' };
        mockValidateOTPFormat.mockReturnValue(true);

        const visitor = {
          id: 123,
          status: 'pending',
          otp_hash: '$argon2id$hashed',
          otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          otp_attempts: 0,
          name: 'Test Visitor'
        };

        mockQuery.mockResolvedValueOnce({ rows: [visitor] });
        mockVerify.mockResolvedValueOnce(true);
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Update query

        await verifyOtp(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it('should accept OTP_SENT status', async () => {
        mockReq.body = { otp: '123456' };
        mockValidateOTPFormat.mockReturnValue(true);

        const visitor = {
          id: 123,
          status: 'otp_sent',
          otp_hash: '$argon2id$hashed',
          otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          otp_attempts: 0,
          name: 'Test Visitor'
        };

        mockQuery.mockResolvedValueOnce({ rows: [visitor] });
        mockVerify.mockResolvedValueOnce(true);
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await verifyOtp(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });

    describe('Rate Limiting', () => {
      it('should return 429 if max attempts reached', async () => {
        mockReq.body = { otp: '123456' };
        mockValidateOTPFormat.mockReturnValue(true);

        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 123,
            status: 'pending',
            otp_attempts: 5,
            otp_hash: 'hash',
            otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
          }]
        });

        await verifyOtp(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(429);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: expect.stringContaining('Too many OTP attempts')
          })
        );
        expect(mockReq.audit).toHaveBeenCalled();
      });

      it('should use environment variable for max attempts', async () => {
        process.env.OTP_MAX_ATTEMPTS = '3';
        mockReq.body = { otp: '123456' };
        mockValidateOTPFormat.mockReturnValue(true);

        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 123,
            status: 'pending',
            otp_attempts: 3,
            otp_hash: 'hash',
            otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
          }]
        });

        await verifyOtp(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(429);
      });
    });

    describe('OTP Validation', () => {
      it('should return 400 if OTP not issued', async () => {
        mockReq.body = { otp: '123456' };
        mockValidateOTPFormat.mockReturnValue(true);

        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 123,
            status: 'pending',
            otp_attempts: 0,
            otp_hash: null,
            otp_expires_at: null
          }]
        });

        await verifyOtp(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: expect.stringContaining('OTP not issued')
          })
        );
      });

      it('should return 400 if OTP expired', async () => {
        mockReq.body = { otp: '123456' };
        mockValidateOTPFormat.mockReturnValue(true);

        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 123,
            status: 'pending',
            otp_attempts: 0,
            otp_hash: '$argon2id$hashed',
            otp_expires_at: new Date(Date.now() - 1000).toISOString() // Expired
          }]
        });

        await verifyOtp(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: expect.stringContaining('OTP expired')
          })
        );
      });

      it('should increment attempts on invalid OTP', async () => {
        mockReq.body = { otp: '123456' };
        mockValidateOTPFormat.mockReturnValue(true);

        const visitor = {
          id: 123,
          status: 'pending',
          otp_hash: '$argon2id$hashed',
          otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          otp_attempts: 2
        };

        mockQuery.mockResolvedValueOnce({ rows: [visitor] });
        mockVerify.mockResolvedValueOnce(false); // Invalid OTP
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Increment attempts

        await verifyOtp(mockReq, mockRes);

        expect(mockVerify).toHaveBeenCalledWith('$argon2id$hashed', '123456');
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE visitors SET otp_attempts'),
          ['123']
        );
        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should verify visitor on valid OTP', async () => {
        mockReq.body = { otp: '123456' };
        mockValidateOTPFormat.mockReturnValue(true);

        const visitor = {
          id: 123,
          status: 'pending',
          otp_hash: '$argon2id$hashed',
          otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          otp_attempts: 0,
          name: 'John Doe'
        };

        mockQuery.mockResolvedValueOnce({ rows: [visitor] });
        mockVerify.mockResolvedValueOnce(true);
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Update to verified

        await verifyOtp(mockReq, mockRes);

        expect(mockVerify).toHaveBeenCalledWith('$argon2id$hashed', '123456');
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE visitors SET status = $1'),
          expect.arrayContaining(['verified', '123'])
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              message: 'OTP verified successfully',
              status: 'verified'
            })
          })
        );
      });

      it('should clear OTP data after successful verification', async () => {
        mockReq.body = { otp: '123456' };
        mockValidateOTPFormat.mockReturnValue(true);

        const visitor = {
          id: 123,
          status: 'pending',
          otp_hash: '$argon2id$hashed',
          otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          otp_attempts: 2,
          name: 'Jane Doe'
        };

        mockQuery.mockResolvedValueOnce({ rows: [visitor] });
        mockVerify.mockResolvedValueOnce(true);
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await verifyOtp(mockReq, mockRes);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('otp_hash = NULL, otp_expires_at = NULL, otp_attempts = 0'),
          expect.any(Array)
        );
      });
    });

    describe('Audit Logging', () => {
      it('should audit successful verification', async () => {
        mockReq.body = { otp: '123456' };
        mockValidateOTPFormat.mockReturnValue(true);

        const visitor = {
          id: 123,
          status: 'pending',
          otp_hash: '$argon2id$hashed',
          otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          otp_attempts: 0,
          name: 'Audit Test'
        };

        mockQuery.mockResolvedValueOnce({ rows: [visitor] });
        mockVerify.mockResolvedValueOnce(true);
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await verifyOtp(mockReq, mockRes);

        expect(mockReq.audit).toHaveBeenCalledWith(
          'visitor.otp.verify',
          'visitor',
          '123',
          expect.objectContaining({
            outcome: 'success',
            visitorName: 'Audit Test'
          })
        );
      });

      it('should audit failed verification attempts', async () => {
        mockReq.body = { otp: 'wrong' };
        mockValidateOTPFormat.mockReturnValue(true);

        const visitor = {
          id: 123,
          status: 'pending',
          otp_hash: '$argon2id$hashed',
          otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          otp_attempts: 0
        };

        mockQuery.mockResolvedValueOnce({ rows: [visitor] });
        mockVerify.mockResolvedValueOnce(false);
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await verifyOtp(mockReq, mockRes);

        expect(mockReq.audit).toHaveBeenCalledWith(
          'visitor.otp.verify',
          'visitor',
          '123',
          expect.objectContaining({
            outcome: 'fail',
            message: 'Invalid OTP provided'
          })
        );
      });
    });

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        mockReq.body = { otp: '123456' };
        mockValidateOTPFormat.mockReturnValue(true);
        mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

        await verifyOtp(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Failed to verify OTP'
          })
        );
      });
    });
  });

  describe('resendOtp', () => {
    describe('Visitor Validation', () => {
      it('should return 404 if visitor not found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await resendOtp(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Visitor not found'
          })
        );
      });

      it('should return 422 if visitor already verified', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 123, status: 'checked_in', phone: '+254712345678' }]
        });

        await resendOtp(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(422);
      });
    });

    describe('Rate Limiting', () => {
      it('should enforce cooldown period', async () => {
        const recentResend = new Date(Date.now() - 30 * 1000); // 30 seconds ago

        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 123,
            status: 'pending',
            phone: '+254712345678',
            email: 'test@example.com',
            name: 'Test',
            otp_last_resend: recentResend.toISOString()
          }]
        });

        await resendOtp(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(429);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: expect.stringMatching(/Please wait \d+s/)
          })
        );
      });

      it('should allow resend after cooldown period', async () => {
        const oldResend = new Date(Date.now() - 61 * 1000); // 61 seconds ago

        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 123,
            status: 'pending',
            phone: '+254712345678',
            email: 'test@example.com',
            name: 'Test',
            otp_last_resend: oldResend.toISOString()
          }]
        });

        mockGenerateOTP.mockReturnValue('654321');
        mockHash.mockResolvedValue('$argon2id$newhash');
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Update query
        mockSendOtpSms.mockResolvedValue(true);

        await resendOtp(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });

    describe('OTP Generation and Storage', () => {
      it('should generate new OTP and hash it', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 123,
            status: 'pending',
            phone: '+254712345678',
            name: 'Test'
          }]
        });

        mockGenerateOTP.mockReturnValue('123456');
        mockHash.mockResolvedValue('$argon2id$hashedotp');
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockSendOtpSms.mockResolvedValue(true);

        await resendOtp(mockReq, mockRes);

        expect(mockGenerateOTP).toHaveBeenCalledWith(6);
        expect(mockHash).toHaveBeenCalledWith('123456');
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('otp_hash = $1'),
          expect.arrayContaining(['$argon2id$hashedotp'])
        );
      });

      it('should set OTP expiry time', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 123,
            status: 'pending',
            phone: '+254712345678',
            name: 'Test'
          }]
        });

        mockGenerateOTP.mockReturnValue('123456');
        mockHash.mockResolvedValue('$argon2id$hashedotp');
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockSendOtpSms.mockResolvedValue(true);

        await resendOtp(mockReq, mockRes);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('otp_expires_at = $2'),
          expect.any(Array)
        );
      });

      it('should reset OTP attempts counter', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 123,
            status: 'pending',
            phone: '+254712345678',
            name: 'Test'
          }]
        });

        mockGenerateOTP.mockReturnValue('123456');
        mockHash.mockResolvedValue('$argon2id$hashedotp');
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockSendOtpSms.mockResolvedValue(true);

        await resendOtp(mockReq, mockRes);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('otp_attempts = 0'),
          expect.any(Array)
        );
      });

      it('should update status to OTP_SENT', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 123,
            status: 'pending',
            phone: '+254712345678',
            name: 'Test'
          }]
        });

        mockGenerateOTP.mockReturnValue('123456');
        mockHash.mockResolvedValue('$argon2id$hashedotp');
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockSendOtpSms.mockResolvedValue(true);

        await resendOtp(mockReq, mockRes);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('status = $3'),
          expect.arrayContaining(['otp_sent'])
        );
      });
    });

    describe('Notification Delivery', () => {
      it('should send OTP via SMS first', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 123,
            status: 'pending',
            phone: '+254712345678',
            email: 'test@example.com',
            name: 'Test User'
          }]
        });

        mockGenerateOTP.mockReturnValue('123456');
        mockHash.mockResolvedValue('$argon2id$hashedotp');
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockSendOtpSms.mockResolvedValue(true);

        await resendOtp(mockReq, mockRes);

        expect(mockSendOtpSms).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 123,
            phone: '+254712345678'
          }),
          '123456',
          15
        );
        expect(mockSendOtpEmail).not.toHaveBeenCalled();
      });

      it('should fall back to email if SMS fails', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 123,
            status: 'pending',
            phone: '+254712345678',
            email: 'test@example.com',
            name: 'Test User'
          }]
        });

        mockGenerateOTP.mockReturnValue('123456');
        mockHash.mockResolvedValue('$argon2id$hashedotp');
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockSendOtpSms.mockResolvedValue(false); // SMS failed
        mockSendOtpEmail.mockResolvedValue(true);

        await resendOtp(mockReq, mockRes);

        expect(mockSendOtpEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'test@example.com'
          }),
          '123456',
          15
        );
      });

      it('should include delivery status in response', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 123,
            status: 'pending',
            phone: '+254712345678',
            name: 'Test'
          }]
        });

        mockGenerateOTP.mockReturnValue('123456');
        mockHash.mockResolvedValue('$argon2id$hashedotp');
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockSendOtpSms.mockResolvedValue(true);

        await resendOtp(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              delivery: {
                sms: true,
                email: false
              }
            })
          })
        );
      });
    });

    describe('Debug Mode', () => {
      it('should echo OTP in debug mode', async () => {
        process.env.OTP_DEBUG_ECHO = 'true';
        process.env.NODE_ENV = 'development';

        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 123,
            status: 'pending',
            phone: '+254712345678',
            name: 'Test'
          }]
        });

        mockGenerateOTP.mockReturnValue('123456');
        mockHash.mockResolvedValue('$argon2id$hashedotp');
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockSendOtpSms.mockResolvedValue(true);

        await resendOtp(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              otp: '123456'
            })
          })
        );
      });

      it('should not echo OTP in production', async () => {
        process.env.OTP_DEBUG_ECHO = 'true';
        process.env.NODE_ENV = 'production';

        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 123,
            status: 'pending',
            phone: '+254712345678',
            name: 'Test'
          }]
        });

        mockGenerateOTP.mockReturnValue('123456');
        mockHash.mockResolvedValue('$argon2id$hashedotp');
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockSendOtpSms.mockResolvedValue(true);

        await resendOtp(mockReq, mockRes);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.data).not.toHaveProperty('otp');
      });
    });

    describe('Error Handling', () => {
      it('should handle database errors', async () => {
        mockQuery.mockRejectedValueOnce(new Error('Database error'));

        await resendOtp(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: expect.stringContaining('Failed to resend OTP')
          })
        );
      });
    });
  });
});
