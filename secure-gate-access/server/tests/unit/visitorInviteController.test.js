/**
 * Comprehensive Test Suite for visitorInviteController
 * Tests visitor creation, invitations, bulk operations, and pass generation
 * 
 * Coverage Areas:
 * - Visitor creation with validation
 * - Pass generation and OTP handling
 * - Bulk invite operations
 * - Invite completion (single and bulk)
 * - Authorization and authentication
 * - Error handling
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockDbManager = {
  query: jest.fn(),
  transaction: jest.fn()
};

const mockRespond = jest.fn();
const mockRespondError = jest.fn();

const mockQRCodeService = {
  generateVisitorQR: jest.fn()
};

const mockNotificationService = {
  sendVisitorInviteSms: jest.fn(),
  sendVisitorInviteEmail: jest.fn(),
  sendOtpVerificationSms: jest.fn(),
  sendOtpVerificationEmail: jest.fn()
};

const mockEncryptionService = {
  encrypt: jest.fn(),
  decrypt: jest.fn()
};

const mockArgon2 = {
  hash: jest.fn()
};

const mockTokenHelper = {
  generateOTP: jest.fn(),
  generateSecureToken: jest.fn()
};

// Mock modules before importing controller
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: mockDbManager
}));

jest.unstable_mockModule('../../src/utils/respond.js', () => ({
  respond: mockRespond,
  respondError: mockRespondError
}));

jest.unstable_mockModule('../../src/services/qrCodeService.js', () => ({
  default: mockQRCodeService
}));

jest.unstable_mockModule('../../src/services/notificationService.js', () => ({
  sendVisitorInviteSms: mockNotificationService.sendVisitorInviteSms,
  sendVisitorInviteEmail: mockNotificationService.sendVisitorInviteEmail,
  sendOtpVerificationSms: mockNotificationService.sendOtpVerificationSms,
  sendOtpVerificationEmail: mockNotificationService.sendOtpVerificationEmail
}));

jest.unstable_mockModule('../../src/services/encryptionService.js', () => ({
  default: mockEncryptionService
}));

jest.unstable_mockModule('argon2', () => ({
  default: mockArgon2
}));

jest.unstable_mockModule('../../src/utils/tokenHelper.js', () => ({
  generateOTP: mockTokenHelper.generateOTP,
  generateSecureToken: mockTokenHelper.generateSecureToken
}));

// Import controller after mocks
const {
  createVisitor,
  getMyVisitors,
  createPass,
  bulkInvite,
  getBulkInvite,
  completeInvite
} = await import('../../src/controllers/visitorInviteController-optimized.js');

describe('visitorInviteController', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      query: {},
      user: {
        email: 'resident@test.com',
        role: 'resident',
        estate_id: 1
      },
      audit: jest.fn()
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Default mock implementations
    mockTokenHelper.generateOTP.mockReturnValue('123456');
    mockTokenHelper.generateSecureToken.mockReturnValue('mock-secure-token');
    mockArgon2.hash.mockResolvedValue('hashed-otp');
    mockEncryptionService.encrypt.mockResolvedValue('encrypted-pin');
    mockQRCodeService.generateVisitorQR.mockResolvedValue({
      success: true,
      data: { qrCodeDataUrl: 'data:image/png;base64,mock', qrId: 'qr-123' }
    });
    mockNotificationService.sendVisitorInviteSms.mockResolvedValue(true);
    mockNotificationService.sendOtpVerificationSms.mockResolvedValue(true);
  });

  describe('createVisitor', () => {
    const validVisitorData = {
      name: 'John Doe',
      phone: '+254700123456',
      email: 'john@example.com',
      dateOfVisit: '2026-01-15',
      time: '10:00',
      purpose: 'Meeting',
      consent_given: true,
      consent_timestamp: new Date().toISOString()
    };

    beforeEach(() => {
      // Setup default database responses
      mockDbManager.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, username: 'Resident', email: 'resident@test.com' }]
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 100,
            name: 'John Doe',
            phone: '+1234567890',
            email: 'john@example.com',
            purpose: 'Meeting',
            date_of_visit: '2026-01-15',
            time_of_visit: '10:00',
            invite_code: 'inv_mock-secure-token',
            status: 'pending_confirmation',
            created_at: new Date()
          }]
        });
    });

    it('should create a visitor successfully', async () => {
      mockReq.body = validVisitorData;

      await createVisitor(mockReq, mockRes);

      expect(mockDbManager.query).toHaveBeenCalledTimes(2);
      expect(mockRespond).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          message: 'Visitor invite created successfully',
          id: 100,
          name: 'John Doe',
          inviteCode: expect.any(String),
          inviteLink: expect.stringContaining('/invite/')
        }),
        201
      );
    });

    it('should return 401 if user is not authenticated', async () => {
      mockReq.user = null;
      mockReq.body = validVisitorData;

      await createVisitor(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 401, 'Unauthorized');
    });

    it('should return 401 if user email is missing', async () => {
      mockReq.user = { role: 'resident', estate_id: 1 };
      mockReq.body = validVisitorData;

      await createVisitor(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 401, 'Unauthorized');
    });

    it('should return 403 if user is not a resident', async () => {
      mockReq.user = { email: 'guard@test.com', role: 'guard', estate_id: 1 };
      mockReq.body = validVisitorData;

      await createVisitor(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 403, expect.stringContaining('Forbidden'));
    });

    it('should return 400 if estate context is missing', async () => {
      mockReq.user = { email: 'resident@test.com', role: 'resident' };
      mockReq.body = validVisitorData;

      await createVisitor(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 400, 'Estate context is required to create visitors');
    });

    it('should return 400 if visitor name is missing', async () => {
      mockReq.body = { ...validVisitorData, name: '' };

      await createVisitor(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 400, 'Visitor name is required');
    });

    it('should return 400 if visitor name is not a string', async () => {
      mockReq.body = { ...validVisitorData, name: 123 };

      await createVisitor(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 400, 'Visitor name is required');
    });

    it('should return 400 if phone is missing', async () => {
      mockReq.body = { ...validVisitorData, phone: '' };

      await createVisitor(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 400, 'Phone number is required');
    });

    it('should return 400 if phone is not a string', async () => {
      mockReq.body = { ...validVisitorData, phone: 12345 };

      await createVisitor(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 400, 'Phone number is required');
    });

    // Test removed: Controller defaults to today's date if missing

    it('should return 404 if resident is not found', async () => {
      mockDbManager.query.mockReset();
      mockDbManager.query.mockResolvedValueOnce({ rows: [] });
      mockReq.body = validVisitorData;

      await createVisitor(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 404, 'Resident not found');
    });

    it('should handle notification failure gracefully', async () => {
      mockNotificationService.sendVisitorInviteSms.mockResolvedValue(false);
      mockReq.body = validVisitorData;

      await createVisitor(mockReq, mockRes);

      // Should still succeed
      expect(mockRespond).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          message: 'Visitor invite created successfully'
        }),
        201
      );
    });

    it('should call audit log on success', async () => {
      mockReq.body = validVisitorData;

      await createVisitor(mockReq, mockRes);

      expect(mockReq.audit).toHaveBeenCalledWith(
        'visitor.create',
        'visitor',
        '100',
        expect.objectContaining({
          outcome: 'success',
          visitorName: 'John Doe',
          hasQR: false
        })
      );
    });

    it('should handle database errors', async () => {
      mockDbManager.query.mockReset();
      mockDbManager.query.mockRejectedValue(new Error('Database error'));
      mockReq.body = validVisitorData;

      await createVisitor(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 500, 'Failed to create visitor');
    });

    it('should encrypt unit pin when allow_residence_location is true', async () => {
      mockReq.body = {
        ...validVisitorData,
        allowResidenceLocation: true,
        unitPin: '1234'
      };

      await createVisitor(mockReq, mockRes);

      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('1234');
    });
  });

  describe('getMyVisitors', () => {
    beforeEach(() => {
      mockDbManager.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({
          rows: [
            { id: 100, name: 'Visitor 1', status: 'pending' },
            { id: 101, name: 'Visitor 2', status: 'approved' }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });
    });

    it('should return visitors for authenticated resident', async () => {
      mockReq.query = { page: '1', limit: '20' };

      await getMyVisitors(mockReq, mockRes);

      expect(mockRespond).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          visitors: expect.any(Array),
          pagination: expect.objectContaining({
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1
          })
        })
      );
    });

    it('should return 401 if user is not authenticated', async () => {
      mockReq.user = null;

      await getMyVisitors(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 401, 'Unauthorized');
    });

    it('should return 404 if resident not found', async () => {
      mockDbManager.query.mockReset();
      mockDbManager.query.mockResolvedValueOnce({ rows: [] });

      await getMyVisitors(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 404, 'Resident not found');
    });

    it('should filter by status when provided', async () => {
      mockReq.query = { status: 'pending' };

      await getMyVisitors(mockReq, mockRes);

      expect(mockDbManager.query).toHaveBeenCalled();
    });

    it('should allow guards to view all visitors', async () => {
      mockReq.user = { email: 'guard@test.com', role: 'guard', estate_id: 1 };

      await getMyVisitors(mockReq, mockRes);

      expect(mockRespond).toHaveBeenCalled();
    });

    it('should scope guard results to the current estate', async () => {
      mockReq.user = { email: 'guard@test.com', role: 'guard', estate_id: 42 };
      mockDbManager.query.mockReset();
      mockDbManager.query
        .mockResolvedValueOnce({ rows: [{ id: 100 }] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      await getMyVisitors(mockReq, mockRes);

      const firstQueryParams = mockDbManager.query.mock.calls[0][1];
      const countQueryParams = mockDbManager.query.mock.calls[1][1];

      expect(firstQueryParams).toContain(42);
      expect(countQueryParams).toContain(42);
    });

    it('should allow admins to view all visitors', async () => {
      mockReq.user = { email: 'admin@test.com', role: 'admin', estate_id: 1 };
      mockDbManager.query.mockReset();
      mockDbManager.query
        .mockResolvedValueOnce({ rows: [{ id: 100 }] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      await getMyVisitors(mockReq, mockRes);

      expect(mockRespond).toHaveBeenCalled();
    });
  });

  describe('createPass', () => {
    const mockVisitor = {
      id: 100,
      name: 'John Doe',
      phone: '+1234567890',
      email: 'john@example.com',
      purpose: 'Meeting',
      date_of_visit: '2026-01-15',
      time_of_visit: '10:00',
      resident_id: 1,
      visitor_token: null
    };

    beforeEach(() => {
      mockReq.params = { visitorId: '100' };
      mockDbManager.query
        .mockResolvedValueOnce({ rows: [mockVisitor] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] }) // UPDATE visitors
        .mockResolvedValueOnce({ rows: [] }); // UPDATE qr_code
    });

    it('should create a pass successfully', async () => {
      await createPass(mockReq, mockRes);

      expect(mockRespond).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          visitorId: 100,
          visitor_token: expect.any(String),
          passLink: expect.stringContaining('/v/'),
          expiresAt: expect.any(Date)
        })
      );
    });

    it('should return 401 if user is not authenticated', async () => {
      mockReq.user = null;

      await createPass(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 401, 'Unauthorized');
    });

    it('should return 400 for invalid visitorId', async () => {
      mockReq.params = { visitorId: 'invalid' };

      await createPass(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 400, 'Invalid visitorId');
    });

    it('should return 404 if visitor not found', async () => {
      mockDbManager.query.mockReset();
      mockDbManager.query.mockResolvedValueOnce({ rows: [] });

      await createPass(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 404, 'Visitor not found');
    });

    it('should return 409 if pass already issued', async () => {
      mockDbManager.query.mockReset();
      mockDbManager.query
        .mockResolvedValueOnce({
          rows: [{ ...mockVisitor, visitor_token: 'existing-token' }]
        })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // resident lookup

      await createPass(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 409, 'Pass already issued for this visitor');
    });

    it('should return 400 if date_of_visit is missing', async () => {
      mockDbManager.query.mockReset();
      mockDbManager.query
        .mockResolvedValueOnce({
          rows: [{ ...mockVisitor, date_of_visit: null }]
        })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // resident lookup

      await createPass(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 400, 'Date of visit is required to generate a pass');
    });

    it('should return 403 for resident accessing another residents visitor', async () => {
      mockDbManager.query.mockReset();
      mockDbManager.query
        .mockResolvedValueOnce({ rows: [{ ...mockVisitor, resident_id: 999 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await createPass(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 403, 'Forbidden');
    });

    it('should generate and send OTP', async () => {
      await createPass(mockReq, mockRes);

      expect(mockTokenHelper.generateOTP).toHaveBeenCalledWith(6);
      expect(mockArgon2.hash).toHaveBeenCalledWith('123456');
      expect(mockNotificationService.sendOtpVerificationSms).toHaveBeenCalled();
    });

    it('should generate QR code', async () => {
      await createPass(mockReq, mockRes);

      expect(mockQRCodeService.generateVisitorQR).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 100,
          name: 'John Doe'
        })
      );
    });
  });

  describe('bulkInvite', () => {
    const validBulkData = {
      eventName: 'Birthday Party',
      date: '2026-01-20',
      time: '14:00',
      numGuests: 10
    };

    beforeEach(() => {
      mockDbManager.query
        .mockResolvedValueOnce({ rows: [{ id: 1, email: 'resident@test.com' }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            event_name: 'Birthday Party',
            date: '2026-01-20',
            time: '14:00',
            num_guests: 10,
            invite_code: 'mock-secure-token',
            expires_at: new Date('2026-01-20T23:59:59'),
            remaining_slots: 10
          }]
        });
    });

    it('should create a bulk invite successfully', async () => {
      mockReq.body = validBulkData;

      await bulkInvite(mockReq, mockRes);

      expect(mockRespond).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          message: 'Event invite created successfully',
          bulkInviteId: 1,
          inviteCode: 'mock-secure-token',
          inviteLink: expect.stringContaining('/invite/')
        }),
        201
      );
    });

    it('should return 401 if user is not authenticated', async () => {
      mockReq.user = null;
      mockReq.body = validBulkData;

      await bulkInvite(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 401, 'Unauthorized');
    });

    it('should return 403 if user is not a resident', async () => {
      mockReq.user = { email: 'guard@test.com', role: 'guard', estate_id: 1 };
      mockReq.body = validBulkData;

      await bulkInvite(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 403, expect.stringContaining('Forbidden'));
    });

    it('should return 400 if event name is missing', async () => {
      mockReq.body = { ...validBulkData, eventName: '' };

      await bulkInvite(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 400, 'Event name is required');
    });

    it('should return 400 if date is missing', async () => {
      mockReq.body = { ...validBulkData, date: null };

      await bulkInvite(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 400, 'Event date is required');
    });

    it('should return 400 if time is missing', async () => {
      mockReq.body = { ...validBulkData, time: null };

      await bulkInvite(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 400, 'Event time is required');
    });

    it('should return 400 if numGuests exceeds 100', async () => {
      mockReq.body = { ...validBulkData, numGuests: 101 };

      await bulkInvite(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 400, 'Maximum 100 guests per event');
    });

    it('should return 404 if resident not found', async () => {
      mockDbManager.query.mockReset();
      mockDbManager.query.mockResolvedValueOnce({ rows: [] });
      mockReq.body = validBulkData;

      await bulkInvite(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 404, 'Resident not found');
    });

    it('should pre-register guests when provided', async () => {
      mockDbManager.query
        .mockResolvedValueOnce({ rows: [] }) // visitor insert
        .mockResolvedValueOnce({ rows: [] }); // update slots

      mockReq.body = {
        ...validBulkData,
        guests: [{ name: 'Guest 1', phone: '+1111111111' }]
      };

      await bulkInvite(mockReq, mockRes);

      expect(mockRespond).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          message: 'Event invite created successfully'
        }),
        201
      );
    });
  });

  describe('getBulkInvite', () => {
    const mockBulkInvite = {
      id: 1,
      event_name: 'Birthday Party',
      date: '2026-01-20',
      time: '14:00',
      num_guests: 10,
      remaining_slots: 8,
      expires_at: new Date(Date.now() + 86400000) // tomorrow
    };

    beforeEach(() => {
      mockDbManager.query.mockReset();
      mockReq.params = { inviteCode: 'test-invite-code' };
    });

    it('should return bulk invite details', async () => {
      mockDbManager.query.mockResolvedValueOnce({ rows: [mockBulkInvite] });

      await getBulkInvite(mockReq, mockRes);

      expect(mockRespond).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          eventName: 'Birthday Party',
          date: '2026-01-20',
          remainingSlots: 8
        })
      );
    });

    it('should return 400 if invite code is missing', async () => {
      mockReq.params = {};

      await getBulkInvite(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 400, 'Invite code is required');
    });

    it('should return 404 if invite not found', async () => {
      mockDbManager.query.mockResolvedValueOnce({ rows: [] });

      await getBulkInvite(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 404, 'Invitation not found');
    });

    it('should return 410 if invite has expired', async () => {
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{ ...mockBulkInvite, expires_at: new Date(Date.now() - 86400000) }]
      });

      await getBulkInvite(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 410, 'This invitation has expired');
    });

    it('should return 410 if no slots available', async () => {
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{ ...mockBulkInvite, remaining_slots: 0 }]
      });

      await getBulkInvite(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 410, 'No more slots available for this invitation');
    });
  });

  describe('completeInvite', () => {
    const validCompleteData = {
      name: 'Guest Name',
      phone: '+1234567890',
      consent_given: true,
      consent_timestamp: new Date().toISOString()
    };

    describe('bulk invite completion', () => {
      const mockBulkInvite = {
        id: 1,
        event_name: 'Party',
        date: '2026-01-20',
        time: '14:00',
        remaining_slots: 5,
        expires_at: new Date(Date.now() + 86400000),
        created_by: 'resident@test.com'
      };

      beforeEach(() => {
        mockReq.params = { inviteCode: 'bulk-invite-code' };
        mockReq.body = validCompleteData;
        mockReq.user = null; // Public endpoint

        mockDbManager.query.mockResolvedValueOnce({ rows: [mockBulkInvite] });
        mockDbManager.transaction.mockImplementation(async (callback) => {
          const mockClient = {
            query: jest.fn()
              .mockResolvedValueOnce({ rows: [mockBulkInvite] }) // SELECT FOR UPDATE
              .mockResolvedValueOnce({ rows: [] }) // duplicate check
              .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // resident lookup
              .mockResolvedValueOnce({
                rows: [{
                  id: 100,
                  name: 'Guest Name',
                  phone: '+1234567890',
                  email: null,
                  purpose: 'Party',
                  date_of_visit: '2026-01-20',
                  time_of_visit: '14:00',
                  visitor_token: 'vst_mock-token',
                  token_expires_at: new Date(),
                  status: 'otp_sent'
                }]
              })
              .mockResolvedValueOnce({ rows: [] }) // update remaining slots
              .mockResolvedValueOnce({ rows: [] }) // update qr_code
          };
          return callback(mockClient);
        });
      });

      it('should complete bulk invite registration', async () => {
        await completeInvite(mockReq, mockRes);

        expect(mockRespond).toHaveBeenCalledWith(
          mockRes,
          expect.objectContaining({
            id: 100,
            name: 'Guest Name',
            visitor_token: expect.any(String),
            passLink: expect.stringContaining('/v/')
          }),
          201
        );
      });

      it('should return 400 if invite code is missing', async () => {
        mockReq.params = {};

        await completeInvite(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 400, 'Invite code is required');
      });

      it('should return 400 if name is missing', async () => {
        mockReq.body = { ...validCompleteData, name: '' };

        await completeInvite(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 400, 'Name is required');
      });

      it('should return 400 if phone and email are both missing', async () => {
        mockReq.body = { ...validCompleteData, phone: '' };

        await completeInvite(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 400, 'Phone or email is required');
      });

      it('should return 400 if consent is not given', async () => {
        mockReq.body = { ...validCompleteData, consent_given: false };

        await completeInvite(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 400, 'Consent is required');
      });

      it('should accept email instead of phone', async () => {
        mockReq.body = { ...validCompleteData, phone: '', email: 'guest@test.com' };

        await completeInvite(mockReq, mockRes);

        expect(mockRespond).toHaveBeenCalled();
      });
    });

    describe('single invite completion', () => {
      const mockVisitor = {
        id: 100,
        resident_id: 1,
        date_of_visit: '2026-01-20', // Future date
        time_of_visit: '14:00',
        status: 'pending_confirmation',
        visitor_token: null,
        token_expires_at: null
      };

      beforeEach(() => {
        mockDbManager.query.mockReset();
        mockDbManager.transaction.mockReset();
        mockQRCodeService.generateVisitorQR.mockReset();
        mockArgon2.hash.mockReset();
        mockNotificationService.sendOtpVerificationSms.mockReset();
        mockTokenHelper.generateOTP.mockReset();
        mockTokenHelper.generateSecureToken.mockReset();

        // Re-setup default mocks
        mockTokenHelper.generateOTP.mockReturnValue('123456');
        mockTokenHelper.generateSecureToken.mockReturnValue('mock-secure-token');
        mockArgon2.hash.mockResolvedValue('hashed-otp');
        mockQRCodeService.generateVisitorQR.mockResolvedValue({
          success: true,
          data: { qrCodeDataUrl: 'data:image/png;base64,mock', qrId: 'qr-123' }
        });
        mockNotificationService.sendOtpVerificationSms.mockResolvedValue(true);

        mockReq.params = { inviteCode: 'single-invite-code' };
        mockReq.body = validCompleteData;
        mockReq.user = null;
      });

      it('should complete single invite registration', async () => {
        mockDbManager.query.mockResolvedValueOnce({ rows: [] }); // No bulk invite found
        mockDbManager.transaction.mockImplementation(async (callback) => {
          const mockClient = {
            query: jest.fn()
              .mockResolvedValueOnce({ rows: [mockVisitor] }) // SELECT FOR UPDATE
              .mockResolvedValueOnce({
                rows: [{
                  id: 100,
                  name: 'Guest Name',
                  phone: '+1234567890',
                  email: null,
                  purpose: 'Visit',
                  date_of_visit: '2026-01-20',
                  time_of_visit: '14:00',
                  visitor_token: 'vst_mock-secure-token',
                  token_expires_at: new Date('2026-01-21'),
                  status: 'otp_sent'
                }]
              })
              .mockResolvedValueOnce({ rows: [] }) // update qr_code
          };
          return callback(mockClient);
        });

        await completeInvite(mockReq, mockRes);

        expect(mockRespond).toHaveBeenCalledWith(
          mockRes,
          expect.objectContaining({
            id: 100,
            name: 'Guest Name',
            visitor_token: expect.any(String)
          }),
          201
        );
      });

      it('should return 404 if invite not found', async () => {
        mockDbManager.query.mockResolvedValueOnce({ rows: [] }); // No bulk invite found
        mockDbManager.transaction.mockImplementation(async (callback) => {
          const mockClient = {
            query: jest.fn().mockResolvedValueOnce({ rows: [] })
          };
          return callback(mockClient);
        });

        await completeInvite(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 404, 'Invitation not found');
      });

      it('should return 409 if invite already completed', async () => {
        mockDbManager.query.mockResolvedValueOnce({ rows: [] }); // No bulk invite found
        mockDbManager.transaction.mockImplementation(async (callback) => {
          const mockClient = {
            query: jest.fn().mockResolvedValueOnce({
              rows: [{
                id: 100,
                name: 'John Doe',
                phone: '+1234567890',
                email: 'john@example.com',
                visitor_token: 'existing-token',
                status: 'approved'
              }]
            })
          };
          return callback(mockClient);
        });

        await completeInvite(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 409, 'Invitation already completed');
      });
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      mockDbManager.query.mockReset();
      mockDbManager.transaction.mockReset();
    });

    it('should handle unexpected errors in createVisitor', async () => {
      mockDbManager.query.mockRejectedValue(new Error('Unexpected error'));
      mockReq.body = {
        name: 'John',
        phone: '+123',
        dateOfVisit: '2026-01-15'
      };

      await createVisitor(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 500, 'Failed to create visitor');
    });

    it('should handle unexpected errors in getMyVisitors', async () => {
      mockDbManager.query.mockRejectedValue(new Error('Unexpected error'));

      await getMyVisitors(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 500, 'Failed to get visitors');
    });

    it('should handle unexpected errors in createPass', async () => {
      mockReq.params = { visitorId: '100' };
      mockDbManager.query.mockRejectedValue(new Error('Unexpected error'));

      await createPass(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 500, 'Failed to create pass');
    });

    it('should handle unexpected errors in bulkInvite', async () => {
      mockDbManager.query.mockRejectedValue(new Error('Unexpected error'));
      mockReq.body = {
        eventName: 'Test',
        date: '2026-01-20',
        time: '14:00'
      };

      await bulkInvite(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 500, 'Failed to create event invite');
    });

    it('should handle unexpected errors in getBulkInvite', async () => {
      mockReq.params = { inviteCode: 'test' };
      mockDbManager.query.mockRejectedValue(new Error('Unexpected error'));

      await getBulkInvite(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 500, 'Failed to get invitation details');
    });

    it('should handle unexpected errors in completeInvite', async () => {
      mockReq.params = { inviteCode: 'test' };
      mockReq.body = {
        name: 'Guest',
        phone: '+123',
        consent_given: true
      };
      mockDbManager.query.mockRejectedValue(new Error('Unexpected error'));

      await completeInvite(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 500, 'Failed to complete registration');
    });
  });
});
