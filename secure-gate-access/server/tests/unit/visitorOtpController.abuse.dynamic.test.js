import { jest, describe, beforeEach, it, expect } from '@jest/globals';

const mockQuery = jest.fn();
const mockVerify = jest.fn();
const mockHash = jest.fn();
const mockGenerateOTP = jest.fn();
const mockValidateOTPFormat = jest.fn();
const mockSendOtpSms = jest.fn();
const mockSendOtpEmail = jest.fn();

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: { query: mockQuery }
}));

jest.unstable_mockModule('argon2', () => ({
  default: {
    verify: mockVerify,
    hash: mockHash
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

const { verifyOtp, resendOtp } = await import('../../src/controllers/visitorOtpController.js');

const makeReqRes = ({ id = '77', otp = '123456' } = {}) => {
  const req = {
    params: { id },
    body: otp === undefined ? {} : { otp, role: 'super_admin', bypass: true },
    audit: jest.fn().mockResolvedValue(undefined),
    user: undefined
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };

  return { req, res };
};

describe('visitorOtpController abuse resistance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OTP_MAX_ATTEMPTS = '5';
    process.env.OTP_RESEND_COOLDOWN_SECONDS = '60';
    process.env.OTP_DEBUG_ECHO = 'false';
    process.env.NODE_ENV = 'test';

    mockValidateOTPFormat.mockReturnValue(true);
    mockGenerateOTP.mockReturnValue('654321');
    mockHash.mockResolvedValue('hashed-otp');
    mockSendOtpSms.mockResolvedValue(true);
    mockSendOtpEmail.mockResolvedValue(false);
  });

  it('denies OTP verification when attempts reached regardless of crafted privileged payload', async () => {
    const { req, res } = makeReqRes({ otp: '123456' });
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 77,
        status: 'pending',
        otp_hash: 'hash',
        otp_expires_at: new Date(Date.now() + 60_000).toISOString(),
        otp_attempts: 5
      }]
    });

    await verifyOtp(req, res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(JSON.stringify(res.json.mock.calls[0][0])).toContain('Too many Pass Code attempts');
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('increments attempts on invalid OTP and keeps denial path deterministic', async () => {
    const { req, res } = makeReqRes({ otp: '111111' });

    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 77,
          status: 'pending',
          otp_hash: 'hash',
          otp_expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
          otp_attempts: 2
        }]
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockVerify.mockResolvedValueOnce(false);

    await verifyOtp(req, res);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE visitors SET otp_attempts'),
      ['77']
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(JSON.stringify(res.json.mock.calls[0][0])).toContain('Invalid Pass Code');
  });

  it('enforces resend cooldown and returns 429 without generating new OTP', async () => {
    const { req, res } = makeReqRes({ otp: undefined });
    req.body = { role: 'admin', bypass: true };

    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 77,
        status: 'pending',
        name: 'Visitor',
        phone: '+254700000001',
        email: 'visitor@example.com',
        otp_last_resend: new Date(Date.now() - 25_000).toISOString()
      }]
    });

    await resendOtp(req, res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(JSON.stringify(res.json.mock.calls[0][0])).toContain('Please wait');
    expect(mockGenerateOTP).not.toHaveBeenCalled();
  });
});
