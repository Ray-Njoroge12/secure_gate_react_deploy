import { jest, describe, beforeAll, it, expect } from '@jest/globals';

const capturedRateLimits = [];

const mockRateLimitFactory = jest.fn((options) => {
  capturedRateLimits.push(options);
  return (req, res, next) => next();
});

const noop = () => (req, res, next) => next();

jest.unstable_mockModule('express-rate-limit', () => ({
  rateLimit: mockRateLimitFactory,
  default: mockRateLimitFactory
}));

jest.unstable_mockModule('../../src/controllers/visitorInviteController.js', () => ({
  createVisitor: (req, res) => res.status(201).json({ success: true }),
  getMyVisitors: (req, res) => res.status(200).json({ success: true }),
  createPass: (req, res) => res.status(200).json({ success: true }),
  bulkInvite: (req, res) => res.status(200).json({ success: true }),
  getBulkInvite: (req, res) => res.status(200).json({ success: true }),
  completeInvite: (req, res) => res.status(200).json({ success: true }),
  cancelVisitor: (req, res) => res.status(200).json({ success: true })
}));

jest.unstable_mockModule('../../src/controllers/visitorOtpController.js', () => ({
  verifyOtp: (req, res) => res.status(200).json({ success: true }),
  resendOtp: (req, res) => res.status(200).json({ success: true })
}));

jest.unstable_mockModule('../../src/controllers/visitorCheckInController.js', () => ({
  checkInVisitor: (req, res) => res.status(200).json({ success: true }),
  checkOutVisitor: (req, res) => res.status(200).json({ success: true }),
  selfCheckIn: (req, res) => res.status(200).json({ success: true })
}));

jest.unstable_mockModule('../../src/controllers/visitorAdminController.js', () => ({
  revokeVisitor: (req, res) => res.status(200).json({ success: true }),
  getActiveVisitors: (req, res) => res.status(200).json({ success: true }),
  getVisitorReport: (req, res) => res.status(200).json({ success: true }),
  getRecentVisitors: (req, res) => res.status(200).json({ success: true }),
  getVisitorDetails: (req, res) => res.status(200).json({ success: true }),
  getVisitorHistory: (req, res) => res.status(200).json({ success: true })
}));

jest.unstable_mockModule('../../src/controllers/qrCodeController.js', () => ({
  default: {
    regenerateQR: (req, res) => res.status(200).json({ success: true })
  }
}));

jest.unstable_mockModule('../../src/controllers/walkInController.js', () => ({
  registerWalkIn: (req, res) => res.status(200).json({ success: true }),
  getTodayWalkIns: (req, res) => res.status(200).json({ success: true })
}));

jest.unstable_mockModule('../../src/controllers/visitorApprovalController.js', () => ({
  requestApproval: (req, res) => res.status(200).json({ success: true }),
  approveVisitor: (req, res) => res.status(200).json({ success: true }),
  rejectVisitor: (req, res) => res.status(200).json({ success: true }),
  getPendingApprovals: (req, res) => res.status(200).json({ success: true }),
  getApprovalHistory: (req, res) => res.status(200).json({ success: true })
}));

jest.unstable_mockModule('../../src/middleware/authMiddleware.js', () => ({
  attachUserFromToken: noop(),
  authenticateToken: noop(),
  requireEstate: noop(),
  requireRole: () => noop()
}));

jest.unstable_mockModule('../../src/middleware/rolePolicy.js', () => ({
  requireRolePolicy: () => noop()
}));

jest.unstable_mockModule('../../src/middleware/auditLogging.js', () => ({
  attachRequestAudit: noop()
}));

jest.unstable_mockModule('../../src/middleware/cacheMiddleware.js', () => ({
  default: { createMiddleware: () => noop() }
}));

jest.unstable_mockModule('../../src/middleware/validationMiddleware.js', () => ({
  validateRequest: () => noop(),
  validateParams: () => noop(),
  ValidationSchemas: {
    visitorCreation: {},
    bulkInviteCreation: {},
    inviteCodeParam: {},
    inviteCompletion: {}
  }
}));

jest.unstable_mockModule('../../src/middleware/dataMinimization.js', () => ({
  minimizeData: () => noop()
}));

jest.unstable_mockModule('../../src/middleware/standardizedErrorHandler.js', () => ({
  asyncHandler: (handler) => handler
}));

jest.unstable_mockModule('../../src/utils/responseFormatter.js', () => ({
  buildErrorPayload: (req, res, message, code) => ({ success: false, message, error: { code } })
}));

const findLimiter = ({ windowMs, max, messageIncludes }) => capturedRateLimits.find((cfg) =>
  cfg.windowMs === windowMs &&
  cfg.max === max &&
  String(typeof cfg.message === 'string' ? cfg.message : cfg.message?.error || '').includes(messageIncludes)
);

describe('visitorRoutes abuse protection contract', () => {
  beforeAll(async () => {
    await import('../../src/routes/visitorRoutes.js');
  });

  it('registers OTP verify and resend limiters with hardened thresholds', () => {
    expect(findLimiter({ windowMs: 60 * 1000, max: 5, messageIncludes: 'OTP verification attempts' })).toBeDefined();
    expect(findLimiter({ windowMs: 15 * 60 * 1000, max: 20, messageIncludes: 'OTP requests from this IP' })).toBeDefined();
    expect(findLimiter({ windowMs: 5 * 60 * 1000, max: 3, messageIncludes: 'OTP resend requests' })).toBeDefined();
  });

  it('uses visitor-aware and IP-aware key generators for OTP abuse resistance', () => {
    const verifyLimiter = findLimiter({ windowMs: 60 * 1000, max: 5, messageIncludes: 'OTP verification attempts' });
    const globalLimiter = findLimiter({ windowMs: 15 * 60 * 1000, max: 20, messageIncludes: 'OTP requests from this IP' });
    const resendLimiter = findLimiter({ windowMs: 5 * 60 * 1000, max: 3, messageIncludes: 'OTP resend requests' });

    const verifyKey = verifyLimiter.keyGenerator({
      headers: { 'x-forwarded-for': '203.0.113.4, 10.0.0.1' },
      params: { id: '77' },
      body: { id: '123', role: 'admin', bypass: true },
      ip: '198.51.100.8'
    });

    const globalKey = globalLimiter.keyGenerator({
      headers: { 'x-real-ip': '203.0.113.44' },
      params: {},
      body: { id: '888', role: 'super_admin' },
      ip: '198.51.100.9'
    });

    const resendKey = resendLimiter.keyGenerator({
      headers: {},
      params: { id: '77' },
      body: { role: 'super_admin', x_emergency_bypass: true },
      ip: '198.51.100.10'
    });

    expect(verifyKey).toBe('otp_verify:203.0.113.4:77');
    expect(globalKey).toBe('otp_global:203.0.113.44');
    expect(resendKey).toBe('otp_resend:198.51.100.10:77');
  });

  it('registers strict QR regeneration limiter (3/hour)', () => {
    const qrLimiter = findLimiter({ windowMs: 60 * 60 * 1000, max: 3, messageIncludes: 'QR regeneration attempts' });
    expect(qrLimiter).toBeDefined();
    expect(qrLimiter.standardHeaders).toBe(true);
    expect(qrLimiter.legacyHeaders).toBe(false);
  });
});
