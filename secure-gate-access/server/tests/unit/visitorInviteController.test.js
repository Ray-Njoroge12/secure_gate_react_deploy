/**
 * Comprehensive Unit Tests - visitorInviteController.js
 * Phase 1, Week 1, Day 4, Phase C
 * 
 * Test Coverage:
 * - createVisitor: Authorization, validation, input sanitization, date/time validation, 
 *   backward compatibility, audit logging, notifications, error handling
 * - getMyVisitors: Authorization, pagination, filtering, backward compatibility
 * - createPass: Authorization, validation, QR generation, duplicate prevention, expiry
 * - bulkInvite: Authorization, validation, invite code generation, slot management
 * - getBulkInvite: Retrieval, expiry handling, not found scenarios
 * - completeInvite: Single/bulk invite completion, OTP generation, QR code, slot management,
 *   transaction handling, validation, expiry, notifications
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockQuery = jest.fn();
const mockDbManager = { query: mockQuery };

const mockSendInviteEmail = jest.fn();
const mockSendSmsGeneric = jest.fn();
const mockSendVisitorInviteEmail = jest.fn();
const mockSendVisitorInviteSms = jest.fn();
const mockSendOtpVerificationEmail = jest.fn();
const mockSendOtpVerificationSms = jest.fn();
const mockBroadcastNewVisitor = jest.fn();

const mockSendEmailOtp = jest.fn();
const mockSendSmsOtp = jest.fn();

const mockToDataURL = jest.fn();
const mockQrcode = { toDataURL: mockToDataURL };

const mockRespond = jest.fn();
const mockRespondError = jest.fn();

const mockWithTransaction = jest.fn();
const mockHandleTransactionError = jest.fn();
const mockHandleValidationError = jest.fn();
const mockHandleNotFoundError = jest.fn();
const mockHandleForbiddenError = jest.fn();

// Setup module mocks
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: mockDbManager
}));

jest.unstable_mockModule('../../src/services/notificationService.js', () => ({
  sendInviteEmail: mockSendInviteEmail,
  sendSms: mockSendSmsGeneric,
  sendVisitorInviteEmail: mockSendVisitorInviteEmail,
  sendVisitorInviteSms: mockSendVisitorInviteSms,
  sendOtpVerificationEmail: mockSendOtpVerificationEmail,
  sendOtpVerificationSms: mockSendOtpVerificationSms
}));

jest.unstable_mockModule('../../src/routes/sseRoutes.js', () => ({
  broadcastNewVisitor: mockBroadcastNewVisitor
}));

jest.unstable_mockModule('qrcode', () => ({
  default: mockQrcode
}));

jest.unstable_mockModule('../../src/utils/tokenHelper.js', () => ({
  sendEmailOtp: mockSendEmailOtp,
  sendSmsOtp: mockSendSmsOtp,
  metrics: {}
}));

jest.unstable_mockModule('../../src/utils/respond.js', () => ({
  respond: mockRespond,
  respondError: mockRespondError
}));

jest.unstable_mockModule('../../src/utils/transactionHelper.js', () => ({
  withTransaction: mockWithTransaction
}));

jest.unstable_mockModule('../../src/utils/errorHelper.js', () => ({
  handleTransactionError: mockHandleTransactionError,
  handleValidationError: mockHandleValidationError,
  handleNotFoundError: mockHandleNotFoundError,
  handleForbiddenError: mockHandleForbiddenError
}));

const {
  createVisitor,
  getMyVisitors,
  createPass,
  bulkInvite,
  getBulkInvite,
  completeInvite
} = await import('../../src/controllers/visitorInviteController.js');

describe('visitorInviteController - createVisitor', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { email: 'resident@test.com', role: 'resident', id: 1 },
      body: {
        name: 'John Doe',
        phone: '+15551234567',
        email: 'john@test.com',
        dateOfVisit: '2024-12-31',
        time: '14:00',
        purpose: 'Meeting'
      },
      audit: jest.fn(),
      protocol: 'https',
      get: jest.fn(() => 'example.com')
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    process.env.ENABLE_EMAIL_NOTIFICATIONS = 'false';
    process.env.ENABLE_SMS_NOTIFICATIONS = 'false';
  });

  describe('Authorization', () => {
    test('should reject if user not authenticated', async () => {
      req.user = null;
      await createVisitor(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 401, 'Unauthorized');
    });

    test('should reject if user email missing', async () => {
      req.user = { role: 'resident' };
      await createVisitor(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 401, 'Unauthorized');
    });

    test('should reject if user role is not resident', async () => {
      req.user = { email: 'admin@test.com', role: 'admin' };
      await createVisitor(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 403, 'Forbidden');
      expect(req.audit).toHaveBeenCalledWith(
        'invite.create',
        'visitor',
        null,
        expect.objectContaining({ outcome: 'fail', message: 'Forbidden: role not allowed' })
      );
    });

    test('should allow resident role', async () => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1 }) // created_by check
        .mockResolvedValueOnce({ rows: [{ id: 1, invite_code: 'INVITE-123' }] }); // insert
      await createVisitor(req, res);
      expect(mockRespond).toHaveBeenCalled();
    });
  });

  describe('Input Validation', () => {
    test('should reject if name is missing', async () => {
      req.body.name = '';
      await createVisitor(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 400, 'Visitor name is required');
    });

    test('should reject if name is not a string', async () => {
      req.body.name = 123;
      await createVisitor(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 400, 'Visitor name is required');
    });

    test('should reject if dateOfVisit is missing', async () => {
      req.body.dateOfVisit = '';
      await createVisitor(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 400, 'Visit date is required');
    });

    test('should reject if dateOfVisit is invalid', async () => {
      req.body.dateOfVisit = 'invalid-date';
      await createVisitor(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 400, 'Invalid date format');
    });

    test('should reject if dateOfVisit is in the past', async () => {
      req.body.dateOfVisit = '2020-01-01';
      await createVisitor(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 422, 'dateOfVisit cannot be in the past');
    });

    test('should reject if time is missing', async () => {
      req.body.time = '';
      await createVisitor(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 400, 'Visit time is required');
    });

    test('should reject if time format is invalid', async () => {
      req.body.time = '25:00';
      await createVisitor(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 400, 'Time must be in HH:MM format (24-hour)');
    });

    test('should accept valid time formats (14:30)', async () => {
      req.body.time = '14:30';
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 1, invite_code: 'INVITE-123' }] });
      await createVisitor(req, res);
      expect(mockRespond).toHaveBeenCalled();
    });

    test('should reject if purpose is missing', async () => {
      req.body.purpose = '';
      await createVisitor(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 400, 'Purpose of visit is required');
    });

    test('should sanitize input fields', async () => {
      req.body.name = '<script>alert("xss")</script>';
      req.body.purpose = 'Meeting<>';
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 1, invite_code: 'INVITE-123' }] });
      await createVisitor(req, res);
      // Verify sanitization by checking query params
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.stringMatching(/scriptalert\("xss"\)\/script/), // < and > removed
          expect.anything(),
          expect.anything(),
          expect.stringMatching(/Meeting/)
        ])
      );
    });
  });

  describe('Backward Compatibility', () => {
    test('should detect created_by column exists', async () => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1 }) // created_by check
        .mockResolvedValueOnce({ rows: [{ id: 1, invite_code: 'INVITE-123', created_by: 'resident@test.com' }] });
      await createVisitor(req, res);
      expect(mockQuery).toHaveBeenNthCalledWith(1, expect.stringContaining('information_schema.columns'));
    });

    test('should use created_by in insert when column exists', async () => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1 }) // created_by exists
        .mockResolvedValueOnce({ rows: [{ id: 1, invite_code: 'INVITE-123' }] });
      await createVisitor(req, res);
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('created_by'),
        expect.arrayContaining(['resident@test.com'])
      );
    });

    test('should omit created_by in insert when column does not exist', async () => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 0 }) // created_by does not exist
        .mockResolvedValueOnce({ rows: [{ id: 1, invite_code: 'INVITE-123' }] });
      await createVisitor(req, res);
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.not.stringContaining('created_by'),
        expect.not.arrayContaining(['resident@test.com'])
      );
    });
  });

  describe('Invite Code & Link Generation', () => {
    test('should generate unique invite code', async () => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 1, invite_code: 'INVITE-abc-123' }] });
      await createVisitor(req, res);
      expect(mockRespond).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          invite_code: expect.stringMatching(/^INVITE-/),
          inviteLink: expect.stringContaining('https://example.com/invite/')
        })
      );
    });

    test('should include protocol and host in invite link', async () => {
      req.protocol = 'http';
      req.get = jest.fn(() => 'localhost:3000');
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 1, invite_code: 'INVITE-xyz' }] });
      await createVisitor(req, res);
      expect(mockRespond).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          inviteLink: expect.stringContaining('http://localhost:3000/invite/')
        })
      );
    });
  });

  describe('Audit Logging', () => {
    test('should log successful creation', async () => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 1, invite_code: 'INVITE-123' }] });
      await createVisitor(req, res);
      expect(req.audit).toHaveBeenCalledWith(
        'invite.create',
        'visitor',
        '1',
        expect.objectContaining({
          outcome: 'success',
          message: 'Visitor invitation created',
          inviteCode: expect.any(String),
          dateOfVisit: '2024-12-31',
          time: '14:00'
        })
      );
    });

    test('should log failure on error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));
      await createVisitor(req, res);
      expect(req.audit).toHaveBeenCalledWith(
        'invite.create',
        'visitor',
        null,
        expect.objectContaining({
          outcome: 'fail',
          message: 'Failed to create visitor invitation',
          error: 'Database error'
        })
      );
    });
  });

  describe('Notifications', () => {
    beforeEach(() => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 1, invite_code: 'INVITE-123' }] })
        .mockResolvedValueOnce({ rows: [{ notify_email: true, notify_sms: true }] }); // prefs
    });

    test('should send email notification when enabled', async () => {
      process.env.ENABLE_EMAIL_NOTIFICATIONS = 'true';
      await createVisitor(req, res);
      expect(mockSendInviteEmail).toHaveBeenCalledWith(
        'john@test.com',
        'Your Visit Invitation',
        expect.stringContaining('invited to visit')
      );
    });

    test('should send SMS notification when enabled', async () => {
      process.env.ENABLE_SMS_NOTIFICATIONS = 'true';
      await createVisitor(req, res);
      expect(mockSendSmsGeneric).toHaveBeenCalledWith(
        '+15551234567',
        expect.stringContaining('invited')
      );
    });

    test('should not send notifications when disabled', async () => {
      process.env.ENABLE_EMAIL_NOTIFICATIONS = 'false';
      process.env.ENABLE_SMS_NOTIFICATIONS = 'false';
      await createVisitor(req, res);
      expect(mockSendInviteEmail).not.toHaveBeenCalled();
      expect(mockSendSmsGeneric).not.toHaveBeenCalled();
    });

    test('should respect resident notification preferences', async () => {
      process.env.ENABLE_EMAIL_NOTIFICATIONS = 'true';
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 1, invite_code: 'INVITE-123' }] })
        .mockResolvedValueOnce({ rows: [{ notify_email: false, notify_sms: false }] });
      await createVisitor(req, res);
      expect(mockSendInviteEmail).not.toHaveBeenCalled();
    });

    test('should not fail if notification throws error', async () => {
      process.env.ENABLE_EMAIL_NOTIFICATIONS = 'true';
      mockSendInviteEmail.mockRejectedValueOnce(new Error('Email service down'));
      await createVisitor(req, res);
      expect(mockRespond).toHaveBeenCalled(); // Still succeeds
    });
  });

  describe('Broadcasting', () => {
    test('should broadcast new visitor to guards', async () => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'John Doe', invite_code: 'INVITE-123' }] });
      await createVisitor(req, res);
      expect(mockBroadcastNewVisitor).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, name: 'John Doe' })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection lost'));
      await createVisitor(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 500, 'Failed to create visitor');
    });
  });
});

describe('visitorInviteController - getMyVisitors', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { email: 'resident@test.com', role: 'resident' },
      query: {}
    };
    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('Authorization', () => {
    test('should reject if user not authenticated', async () => {
      req.user = null;
      await getMyVisitors(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 401, 'Unauthorized');
    });

    test('should reject if user email missing', async () => {
      req.user = { role: 'resident' };
      await getMyVisitors(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 401, 'Unauthorized');
    });

    test('should reject if user role is not resident', async () => {
      req.user = { email: 'guard@test.com', role: 'guard' };
      await getMyVisitors(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 403, 'Forbidden');
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1 }) // created_by check
        .mockResolvedValueOnce({ rows: [] }) // data
        .mockResolvedValueOnce({ rows: [{ total: 0 }] }); // count
    });

    test('should use default limit of 20', async () => {
      await getMyVisitors(req, res);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([20, 0])
      );
    });

    test('should use default offset of 0', async () => {
      await getMyVisitors(req, res);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([20, 0])
      );
    });

    test('should accept custom limit', async () => {
      req.query.limit = '50';
      await getMyVisitors(req, res);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([50, 0])
      );
    });

    test('should accept custom offset', async () => {
      req.query.offset = '10';
      await getMyVisitors(req, res);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([20, 10])
      );
    });

    test('should cap limit at 100', async () => {
      req.query.limit = '200';
      await getMyVisitors(req, res);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([100, 0])
      );
    });

    test('should handle negative offset', async () => {
      req.query.offset = '-5';
      await getMyVisitors(req, res);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([20, 0])
      );
    });

    test('should set pagination headers', async () => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: 42 }] });
      await getMyVisitors(req, res);
      expect(res.setHeader).toHaveBeenCalledWith('X-Total-Count', 42);
      expect(res.setHeader).toHaveBeenCalledWith('X-Limit', 20);
      expect(res.setHeader).toHaveBeenCalledWith('X-Offset', 0);
    });
  });

  describe('Backward Compatibility', () => {
    test('should filter by created_by when column exists', async () => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1 }) // created_by exists
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: 0 }] });
      await getMyVisitors(req, res);
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('created_by'),
        expect.arrayContaining(['resident@test.com'])
      );
    });

    test('should return all visitors when created_by column does not exist', async () => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 0 }) // created_by does not exist
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: 0 }] });
      await getMyVisitors(req, res);
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.not.stringContaining('created_by'),
        expect.not.arrayContaining(['resident@test.com'])
      );
    });
  });

  describe('Response', () => {
    test('should return visitor list', async () => {
      const visitors = [
        { id: 1, name: 'John Doe', status: 'PENDING' },
        { id: 2, name: 'Jane Smith', status: 'CHECKED_IN' }
      ];
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rows: visitors })
        .mockResolvedValueOnce({ rows: [{ total: 2 }] });
      await getMyVisitors(req, res);
      expect(mockRespond).toHaveBeenCalledWith(res, visitors);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));
      await getMyVisitors(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 500, 'Failed to fetch visitors');
    });
  });
});

describe('visitorInviteController - createPass', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { email: 'resident@test.com', role: 'resident' },
      params: { visitorId: '1' },
      audit: jest.fn()
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockToDataURL.mockResolvedValue('data:image/png;base64,iVBOR...');
  });

  describe('Authorization', () => {
    test('should reject if user not authenticated', async () => {
      req.user = null;
      await createPass(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 401, 'Unauthorized');
    });

    test('should reject if user role is not resident', async () => {
      req.user = { email: 'guard@test.com', role: 'guard' };
      await createPass(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 403, 'Forbidden');
    });
  });

  describe('Validation', () => {
    test('should reject if visitor not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await createPass(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 404, 'Visitor not found');
    });

    test('should reject if active pass already exists', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, date_of_visit: '2024-12-31' }] }) // visitor
        .mockResolvedValueOnce({ rowCount: 1 }); // existing pass
      await createPass(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 409, 'Active pass already exists');
    });
  });

  describe('QR Code Generation', () => {
    test('should generate QR code for pass', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, date_of_visit: '2024-12-31' }] })
        .mockResolvedValueOnce({ rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ id: 1, pass_id: 'PASS-1-123', qr_code: 'data:image/png;base64,iVBOR...' }] });
      await createPass(req, res);
      expect(mockToDataURL).toHaveBeenCalledWith(expect.stringMatching(/^PASS-1-/));
    });

    test('should handle QR generation failure', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, date_of_visit: '2024-12-31' }] })
        .mockResolvedValueOnce({ rowCount: 0 });
      mockToDataURL.mockRejectedValueOnce(new Error('QR generation failed'));
      await createPass(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 500, 'Failed to generate QR');
    });
  });

  describe('Pass Creation', () => {
    test('should create pass with correct expiry', async () => {
      const dateOfVisit = '2024-12-31';
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, date_of_visit: dateOfVisit }] })
        .mockResolvedValueOnce({ rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ id: 1, pass_id: 'PASS-1-123' }] });
      await createPass(req, res);
      
      const insertCall = mockQuery.mock.calls[2];
      expect(insertCall[0]).toContain('INSERT INTO passes');
      const expiresAt = new Date(insertCall[1][2]);
      expect(expiresAt.getHours()).toBe(23);
      expect(expiresAt.getMinutes()).toBe(59);
    });

    test('should set status to active', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, date_of_visit: '2024-12-31' }] })
        .mockResolvedValueOnce({ rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ id: 1, pass_id: 'PASS-1-123', status: 'active' }] });
      await createPass(req, res);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['active'])
      );
    });
  });

  describe('Audit Logging', () => {
    test('should log successful pass creation', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, date_of_visit: '2024-12-31' }] })
        .mockResolvedValueOnce({ rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ id: 1, pass_id: 'PASS-1-123' }] });
      await createPass(req, res);
      expect(req.audit).toHaveBeenCalledWith(
        'pass.create',
        'pass',
        '1',
        expect.objectContaining({
          outcome: 'success',
          visitorId: 1
        })
      );
    });

    test('should log failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));
      await createPass(req, res);
      expect(req.audit).toHaveBeenCalledWith(
        'pass.create',
        'pass',
        null,
        expect.objectContaining({
          outcome: 'fail'
        })
      );
    });
  });
});

describe('visitorInviteController - bulkInvite', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { email: 'resident@test.com', role: 'resident', id: 1 },
      body: {
        eventName: 'Company Party',
        date: '2024-12-31',
        time: '18:00',
        numGuests: 25
      },
      audit: jest.fn(),
      protocol: 'https',
      get: jest.fn(() => 'example.com')
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('Authorization', () => {
    test('should reject if user not authenticated', async () => {
      req.user = null;
      await bulkInvite(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 401, 'Unauthorized');
    });

    test('should reject if user role is not resident', async () => {
      req.user = { email: 'guard@test.com', role: 'guard' };
      await bulkInvite(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 403, 'Forbidden');
    });
  });

  describe('Input Validation', () => {
    test('should reject if eventName is missing', async () => {
      req.body.eventName = '';
      await bulkInvite(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 400, 'Missing required fields');
    });

    test('should reject if date is missing', async () => {
      req.body.date = '';
      await bulkInvite(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 400, 'Missing required fields');
    });

    test('should reject if numGuests < 1', async () => {
      req.body.numGuests = 0;
      await bulkInvite(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 422, 'Number of guests must be 1-50');
    });

    test('should reject if numGuests > 50', async () => {
      req.body.numGuests = 51;
      await bulkInvite(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 422, 'Number of guests must be 1-50');
    });

    test('should accept valid numGuests range', async () => {
      req.body.numGuests = 25;
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, invite_code: 'BULK-123', remaining_slots: 25 }] });
      await bulkInvite(req, res);
      expect(mockRespond).toHaveBeenCalled();
    });
  });

  describe('Invite Creation', () => {
    test('should generate unique bulk invite code', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, invite_code: 'BULK-abc-123', remaining_slots: 25 }] });
      await bulkInvite(req, res);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          'Company Party',
          '2024-12-31',
          '18:00',
          25,
          expect.stringMatching(/^BULK-/)
        ])
      );
    });

    test('should set remaining_slots equal to numGuests', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, remaining_slots: 25 }] });
      await bulkInvite(req, res);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([25, 25]) // numGuests and remaining_slots
      );
    });

    test('should compute expiry at end of event day', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, expires_at: '2024-12-31T23:59:59.999Z' }] });
      await bulkInvite(req, res);
      const insertCall = mockQuery.mock.calls[0];
      const expiresAt = new Date(insertCall[1][6]);
      expect(expiresAt.getHours()).toBe(23);
      expect(expiresAt.getMinutes()).toBe(59);
    });

    test('should include inviteLink in response', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, invite_code: 'BULK-xyz' }] });
      await bulkInvite(req, res);
      expect(mockRespond).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          inviteLink: expect.stringContaining('https://example.com/bulk-register/BULK-xyz')
        })
      );
    });
  });

  describe('Audit Logging', () => {
    test('should log successful creation', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, invite_code: 'BULK-123' }] });
      await bulkInvite(req, res);
      expect(req.audit).toHaveBeenCalledWith(
        'bulk_invite.create',
        'bulk_invite',
        '1',
        expect.objectContaining({
          outcome: 'success',
          eventName: 'Company Party',
          numGuests: 25
        })
      );
    });

    test('should log failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));
      await bulkInvite(req, res);
      expect(req.audit).toHaveBeenCalledWith(
        'bulk_invite.create',
        'bulk_invite',
        null,
        expect.objectContaining({
          outcome: 'fail'
        })
      );
    });
  });
});

describe('visitorInviteController - getBulkInvite', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: { inviteCode: 'BULK-123' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  test('should return bulk invite if valid and not expired', async () => {
    const bulkInvite = { id: 1, invite_code: 'BULK-123', event_name: 'Party', remaining_slots: 10 };
    mockQuery.mockResolvedValueOnce({ rows: [bulkInvite] });
    await getBulkInvite(req, res);
    expect(mockRespond).toHaveBeenCalledWith(res, bulkInvite);
  });

  test('should reject if invite not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await getBulkInvite(req, res);
    expect(mockRespondError).toHaveBeenCalledWith(res, 404, 'Bulk invitation not found or expired');
  });

  test('should reject if invite expired', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // Query filters by expires_at > NOW()
    await getBulkInvite(req, res);
    expect(mockRespondError).toHaveBeenCalledWith(res, 404, 'Bulk invitation not found or expired');
  });

  test('should handle database errors', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Database error'));
    await getBulkInvite(req, res);
    expect(mockRespondError).toHaveBeenCalledWith(res, 500, 'Failed to fetch bulk invitation');
  });
});

describe('visitorInviteController - completeInvite', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: { inviteCode: 'INVITE-123' },
      body: {
        name: 'John Doe',
        phone: '+15551234567',
        email: 'john@test.com',
        idNumber: 'ID123',
        vehiclePlate: 'ABC-123',
        expectedTime: '2 hours'
      },
      audit: jest.fn(),
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockToDataURL.mockResolvedValue('data:image/png;base64,QR...');
    process.env.OTP_DEBUG_ECHO = 'false';
  });

  describe('Input Validation', () => {
    test('should reject if name is missing', async () => {
      req.body.name = '';
      await completeInvite(req, res);
      expect(mockHandleValidationError).toHaveBeenCalledWith(res, 'Name and phone required');
    });

    test('should reject if phone is missing', async () => {
      req.body.phone = '';
      await completeInvite(req, res);
      expect(mockHandleValidationError).toHaveBeenCalledWith(res, 'Name and phone required');
    });
  });

  describe('Single Invite Completion', () => {
    test('should complete single invite successfully', async () => {
      const visitor = { id: 1, status: 'PENDING', date_of_visit: '2024-12-31' };
      mockQuery
        .mockResolvedValueOnce({ rows: [visitor], rowCount: 1 }) // find visitor
        .mockResolvedValueOnce({ rows: [] }) // update visitor
        .mockResolvedValueOnce({ rows: [{ ...visitor, name: 'John Doe', status: 'OTP_SENT' }] }); // fetch updated
      await completeInvite(req, res);
      expect(mockRespond).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          visitor: expect.objectContaining({ id: 1, status: 'OTP_SENT' }),
          otp_issued: true,
          otp_ttl_minutes: 15
        })
      );
    });

    test('should reject if single invite expired', async () => {
      const visitor = { id: 1, status: 'PENDING', date_of_visit: '2020-01-01' };
      mockQuery.mockResolvedValueOnce({ rows: [visitor], rowCount: 1 });
      await completeInvite(req, res);
      expect(mockHandleValidationError).toHaveBeenCalledWith(res, 'Invitation expired');
    });

    test('should reject if invite already completed', async () => {
      const visitor = { id: 1, status: 'VERIFIED', date_of_visit: '2024-12-31' };
      mockQuery.mockResolvedValueOnce({ rows: [visitor], rowCount: 1 });
      await completeInvite(req, res);
      expect(mockHandleValidationError).toHaveBeenCalledWith(res, 'Invitation already completed');
    });
  });

  describe('Bulk Invite Completion', () => {
    test('should complete bulk invite and create visitor', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // no single invite
      mockWithTransaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, date: '2024-12-31', time: '18:00', remaining_slots: 9 }] }) // decrement
            .mockResolvedValueOnce({ rows: [{ id: 1, status: 'PENDING' }] }) // create visitor
        };
        return await callback(mockClient);
      });
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // update
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'OTP_SENT' }] }); // fetch
      await completeInvite(req, res);
      expect(mockRespond).toHaveBeenCalled();
    });

    test('should reject if bulk invite not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      mockWithTransaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rowCount: 0 }) // decrement fails
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // check fails
        };
        await callback(mockClient);
        throw new Error('Invitation not found');
      });
      await completeInvite(req, res);
      expect(mockHandleNotFoundError).toHaveBeenCalledWith(res, 'Invitation');
    });

    test('should reject if bulk invite expired', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      mockWithTransaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rowCount: 0 })
            .mockResolvedValueOnce({ rows: [{ id: 1, expires_at: '2020-01-01T00:00:00.000Z', remaining_slots: 10 }] })
        };
        await callback(mockClient);
        throw new Error('Bulk invitation expired');
      });
      await completeInvite(req, res);
      expect(mockHandleValidationError).toHaveBeenCalledWith(res, 'Bulk invitation expired');
    });

    test('should reject if no remaining slots', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      mockWithTransaction.mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rowCount: 0 })
            .mockResolvedValueOnce({ rows: [{ id: 1, expires_at: '2024-12-31T23:59:59.999Z', remaining_slots: 0 }] })
        };
        await callback(mockClient);
        throw new Error('No remaining slots for this bulk invite');
      });
      await completeInvite(req, res);
      expect(mockHandleValidationError).toHaveBeenCalledWith(res, 'No remaining slots for this bulk invite');
    });
  });

  describe('OTP & QR Code Generation', () => {
    beforeEach(() => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'PENDING', date_of_visit: '2024-12-31' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'OTP_SENT', qr_code: 'data:image/png;base64,QR...' }] });
    });

    test('should generate 6-digit OTP', async () => {
      await completeInvite(req, res);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE visitors'),
        expect.arrayContaining([expect.stringMatching(/^\d{6}$/)])
      );
    });

    test('should generate QR code', async () => {
      await completeInvite(req, res);
      expect(mockToDataURL).toHaveBeenCalledWith(expect.stringMatching(/^PASS-1-/));
    });

    test('should update visitor status to OTP_SENT', async () => {
      await completeInvite(req, res);
      expect(mockRespond).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          visitor: expect.objectContaining({ status: 'OTP_SENT' })
        })
      );
    });

    test('should include debug OTP when OTP_DEBUG_ECHO enabled', async () => {
      process.env.OTP_DEBUG_ECHO = 'true';
      await completeInvite(req, res);
      expect(mockRespond).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          debug_otp: expect.stringMatching(/^\d{6}$/)
        })
      );
    });
  });

  describe('OTP Delivery', () => {
    beforeEach(() => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'PENDING', date_of_visit: '2024-12-31', created_by: 'resident@test.com' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ notify_email: true, notify_sms: true }] }) // prefs
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'OTP_SENT' }] });
      mockSendEmailOtp.mockResolvedValue(true);
      mockSendSmsOtp.mockResolvedValue(true);
    });

    test('should send OTP via email', async () => {
      await completeInvite(req, res);
      expect(mockSendEmailOtp).toHaveBeenCalledWith(
        'john@test.com',
        expect.stringMatching(/^\d{6}$/)
      );
    });

    test('should send OTP via SMS', async () => {
      await completeInvite(req, res);
      expect(mockSendSmsOtp).toHaveBeenCalledWith(
        '+15551234567',
        expect.stringMatching(/^\d{6}$/)
      );
    });

    test('should not fail if OTP delivery fails', async () => {
      mockSendEmailOtp.mockRejectedValueOnce(new Error('Email service down'));
      await completeInvite(req, res);
      expect(mockRespond).toHaveBeenCalled();
    });

    test('should respect notification preferences', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'PENDING', date_of_visit: '2024-12-31', created_by: 'resident@test.com' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ notify_email: false, notify_sms: false }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'OTP_SENT' }] });
      await completeInvite(req, res);
      expect(mockSendEmailOtp).not.toHaveBeenCalled();
      expect(mockSendSmsOtp).not.toHaveBeenCalled();
    });
  });

  describe('Audit Logging', () => {
    beforeEach(() => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'PENDING', date_of_visit: '2024-12-31' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'OTP_SENT' }] });
    });

    test('should log OTP delivery success', async () => {
      mockSendEmailOtp.mockResolvedValue(true);
      await completeInvite(req, res);
      expect(req.audit).toHaveBeenCalledWith(
        'otp.deliver',
        'visitor',
        '1',
        expect.objectContaining({
          outcome: 'success',
          message: 'OTP delivered'
        })
      );
    });

    test('should log OTP issuance success', async () => {
      await completeInvite(req, res);
      expect(req.audit).toHaveBeenCalledWith(
        'otp.issue',
        'visitor',
        '1',
        expect.objectContaining({
          outcome: 'success',
          message: 'OTP issued for visitor',
          ttl: 15
        })
      );
    });

    test('should log failure on error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));
      await completeInvite(req, res);
      expect(req.audit).toHaveBeenCalledWith(
        'otp.issue',
        'visitor',
        null,
        expect.objectContaining({
          outcome: 'fail'
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection lost'));
      await completeInvite(req, res);
      expect(mockRespondError).toHaveBeenCalledWith(res, 500, 'Failed to complete invitation');
    });
  });
});
