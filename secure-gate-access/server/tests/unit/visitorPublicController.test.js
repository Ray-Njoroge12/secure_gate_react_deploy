/**
 * Visitor Public Controller Unit Tests
 * Tests for public visitor endpoints (no authentication)
 * Priority: P1 - Critical public-facing functionality
 *
 * Coverage targets:
 * - Statements: 90%+
 * - Branches: 85%+
 * - Functions: 100%
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
const mockQuery = jest.fn();
const mockGetQRCodeByVisitorId = jest.fn();
const mockGenerateVisitorQR = jest.fn();
const mockQueueEmail = jest.fn();

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  default: {
    query: mockQuery
  }
}));

jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.unstable_mockModule('../../src/services/qrCodeService.js', () => ({
  default: {
    getQRCodeByVisitorId: mockGetQRCodeByVisitorId,
    generateVisitorQR: mockGenerateVisitorQR
  }
}));

jest.unstable_mockModule('../../src/services/notificationQueueService.js', () => ({
  default: {
    queueEmail: mockQueueEmail
  }
}));

// Import after mocks
const {
  getVisitorByToken,
  getEstateInfo,
  getVisitorStatus,
  confirmVisitorByToken,
  getInviteByCode
} = await import('../../src/controllers/visitorPublicController.js');

describe('Visitor Public Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      params: {},
      body: {},
      ip: '192.168.1.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0 Test Agent')
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('getVisitorByToken', () => {
    const validToken = 'vst_' + 'a'.repeat(24);

    describe('Token Validation', () => {
      it('should return 400 if token is missing', async () => {
        mockReq.params = {};

        await getVisitorByToken(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid token format'
        });
      });

      it('should return 400 if token does not start with vst_', async () => {
        mockReq.params = { token: 'invalid_' + 'a'.repeat(64) };

        await getVisitorByToken(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid token format'
        });
      });

      it('should return 400 if token length is not 28 characters', async () => {
        mockReq.params = { token: 'vst_short' };

        await getVisitorByToken(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid token format'
        });
      });
    });

    describe('Visitor Lookup', () => {
      it('should return 404 if visitor not found', async () => {
        mockReq.params = { token: validToken };
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await getVisitorByToken(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Invite not found or has expired'
        });
      });

      it('should return 404 if token expired', async () => {
        mockReq.params = { token: validToken };
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await getVisitorByToken(mockReq, mockRes);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('token_expires_at > NOW()'),
          [validToken]
        );
        expect(mockRes.status).toHaveBeenCalledWith(404);
      });

      it('should return visitor details for valid token', async () => {
        mockReq.params = { token: validToken };

        const mockVisitor = {
          id: 1,
          name: 'John Doe',
          phone: '+254712345678',
          email: 'john@example.com',
          purpose: 'Meeting',
          date_of_visit: '2026-01-15',
          time_of_visit: '14:00',
          status: 'pending',
          vehicle_plate: 'KAA 123A',
          company: 'Tech Corp',
          photo_url: 'https://example.com/photo.jpg',
          visitor_token: validToken,
          token_expires_at: '2026-01-20',
          created_at: '2026-01-01',
          resident_name: 'Jane Smith',
          resident_email: 'jane@example.com',
          resident_phone: '+254722222222'
        };

        mockQuery.mockResolvedValueOnce({ rows: [mockVisitor] });

        await getVisitorByToken(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: expect.objectContaining({
            id: 1,
            name: 'John Doe',
            phone: '+254712345678',
            email: 'john@example.com',
            purpose: 'Meeting',
            status: 'pending'
          })
        });
      });
    });

    describe('QR Code Handling', () => {
      it('should include QR code data if visitor is confirmed', async () => {
        mockReq.params = { token: validToken };

        const mockVisitor = {
          id: 1,
          name: 'John Doe',
          phone: '+254712345678',
          email: 'john@example.com',
          purpose: 'Meeting',
          date_of_visit: '2026-01-15',
          time_of_visit: '14:00',
          status: 'confirmed',
          visitor_token: validToken,
          token_expires_at: '2026-01-20',
          created_at: '2026-01-01',
          resident_name: 'Jane Smith',
          resident_email: 'jane@example.com',
          resident_phone: '+254722222222'
        };

        mockQuery.mockResolvedValueOnce({ rows: [mockVisitor] });
        mockGetQRCodeByVisitorId.mockResolvedValueOnce({
          status: 'active',
          expires_at: '2026-01-16'
        });

        await getVisitorByToken(mockReq, mockRes);

        expect(mockGetQRCodeByVisitorId).toHaveBeenCalledWith(1);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: expect.objectContaining({
            qrCode: expect.objectContaining({
              hasQRCode: true,
              expiresAt: '2026-01-16',
              message: 'Digital pass retrieved'
            })
          })
        });
      });

      it('should generate QR code if visitor is approved but has no QR', async () => {
        mockReq.params = { token: validToken };

        const mockVisitor = {
          id: 2,
          name: 'Jane Doe',
          status: 'approved',
          visitor_token: validToken,
          token_expires_at: '2026-01-20',
          resident_name: 'John Smith',
          resident_email: 'john@example.com',
          resident_phone: '+254722222222'
        };

        mockQuery.mockResolvedValueOnce({ rows: [mockVisitor] });
        mockGetQRCodeByVisitorId.mockResolvedValueOnce(null);
        mockGenerateVisitorQR.mockResolvedValueOnce({
          success: true,
          data: {
            qrCodeDataUrl: 'data:image/png;base64,abc123',
            expiresAt: '2026-01-16'
          }
        });

        await getVisitorByToken(mockReq, mockRes);

        expect(mockGenerateVisitorQR).toHaveBeenCalledWith(mockVisitor);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: expect.objectContaining({
            qrCode: expect.objectContaining({
              hasQRCode: true,
              dataUrl: 'data:image/png;base64,abc123',
              message: 'Digital pass generated'
            })
          })
        });
      });

      it('should handle QR code generation failures gracefully', async () => {
        mockReq.params = { token: validToken };

        const mockVisitor = {
          id: 3,
          status: 'confirmed',
          visitor_token: validToken,
          token_expires_at: '2026-01-20',
          resident_name: 'Test Resident',
          resident_email: 'test@example.com',
          resident_phone: '+254700000000'
        };

        mockQuery.mockResolvedValueOnce({ rows: [mockVisitor] });
        mockGetQRCodeByVisitorId.mockRejectedValueOnce(new Error('QR service error'));

        await getVisitorByToken(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              qrCode: null
            })
          })
        );
      });
    });

    describe('Data Sanitization', () => {
      it('should sanitize resident email (show only first 3 chars)', async () => {
        mockReq.params = { token: validToken };

        const mockVisitor = {
          id: 1,
          status: 'pending',
          visitor_token: validToken,
          token_expires_at: '2026-01-20',
          resident_name: 'Resident Name',
          resident_email: 'resident@example.com',
          resident_phone: '+254700000000'
        };

        mockQuery.mockResolvedValueOnce({ rows: [mockVisitor] });

        await getVisitorByToken(mockReq, mockRes);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.data.resident.email).toBe('res***@example.com');
      });

      it('should sanitize resident phone (show first 4 and last 3 chars)', async () => {
        mockReq.params = { token: validToken };

        const mockVisitor = {
          id: 1,
          status: 'pending',
          visitor_token: validToken,
          token_expires_at: '2026-01-20',
          resident_name: 'Resident Name',
          resident_email: 'test@example.com',
          resident_phone: '+254712345678'
        };

        mockQuery.mockResolvedValueOnce({ rows: [mockVisitor] });

        await getVisitorByToken(mockReq, mockRes);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.data.resident.phone).toBe('+254***678');
      });

      it('should handle null resident email and phone', async () => {
        mockReq.params = { token: validToken };

        const mockVisitor = {
          id: 1,
          status: 'pending',
          visitor_token: validToken,
          token_expires_at: '2026-01-20',
          resident_name: 'Resident Name',
          resident_email: null,
          resident_phone: null
        };

        mockQuery.mockResolvedValueOnce({ rows: [mockVisitor] });

        await getVisitorByToken(mockReq, mockRes);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.data.resident.email).toBeNull();
        expect(response.data.resident.phone).toBeNull();
      });
    });

    describe('Error Handling', () => {
      it('should return 500 on database error', async () => {
        mockReq.params = { token: validToken };
        mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

        await getVisitorByToken(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to fetch invite details'
        });
      });
    });
  });

  describe('getEstateInfo', () => {
    it('should return estate information', async () => {
      mockReq.query = { estateId: '1' };
      
      // Mock estates query
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Secure Gate Estate',
            slug: 'secure-gate-estate',
            address: 'Nairobi, Kenya',
            timezone: 'Africa/Nairobi',
            contact_phone: '+254 700 000 000',
            emergency_contact: '+254 700 000 000'
          }]
        })
        // Mock estate_public_info query
        .mockResolvedValueOnce({
          rows: [{
            estate_id: 1,
            name: 'Secure Gate Estate',
            address: 'Nairobi, Kenya',
            timezone: 'Africa/Nairobi',
            contact: '+254 700 000 000',
            parking_instructions: 'Visitor parking available at designated areas near the main gate.',
            check_in_instructions: [
              'Present your QR code or visit code to the guard',
              'Valid ID required for entry',
              'Wait for resident approval if status is pending'
            ],
            emergency_contact: '+254 700 000 000',
            languages: ['en', 'sw'],
            gate_location: 'North Entrance',
            gate_hours: '24/7',
            gate_contact: '+254 700 000 000'
          }]
        })
        // Mock estate_locations query
        .mockResolvedValueOnce({
          rows: [{
            gate_name: 'Main Gate',
            gate_latitude: -1.123456,
            gate_longitude: 36.123456,
            directions_from_highway: 'Take exit 5',
            directions_from_city: 'Head north on Main Road'
          }]
        });

      await getEstateInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          name: 'Secure Gate Estate',
          address: 'Nairobi, Kenya',
          timezone: 'Africa/Nairobi',
          contact: '+254 700 000 000',
          gates: expect.arrayContaining([
            expect.objectContaining({
              name: 'Main Gate'
            })
          ]),
          parkingInstructions: expect.any(String),
          checkInInstructions: expect.any(Array),
          emergencyContact: expect.any(String),
          languages: expect.arrayContaining(['en', 'sw'])
        })
      });
    });

    it('should return 500 on unexpected error', async () => {
      mockReq.query = { estateId: '1' };
      mockQuery.mockRejectedValueOnce(new Error('DB error'));

      await getEstateInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch estate information'
      });
    });
  });

  describe('getVisitorStatus', () => {
    describe('Token Validation', () => {
      it('should return 400 if token is missing', async () => {
        mockReq.params = {};

        await getVisitorStatus(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid token'
        });
      });

      it('should return 400 if token does not start with vst_', async () => {
        mockReq.params = { token: 'invalid_token' };

        await getVisitorStatus(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid token'
        });
      });
    });

    describe('Status Retrieval', () => {
      it('should return visitor status for valid token', async () => {
        const validToken = 'vst_' + 'a'.repeat(24);
        mockReq.params = { token: validToken };

        mockQuery.mockResolvedValueOnce({
          rows: [{
            status: 'approved',
            updated_at: '2026-01-01T10:00:00Z'
          }]
        });

        await getVisitorStatus(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: {
            status: 'approved',
            updatedAt: '2026-01-01T10:00:00Z'
          }
        });
      });

      it('should return 404 if visitor not found', async () => {
        const validToken = 'vst_' + 'a'.repeat(24);
        mockReq.params = { token: validToken };
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await getVisitorStatus(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Invite not found or expired'
        });
      });
    });

    describe('Error Handling', () => {
      it('should return 500 on database error', async () => {
        mockReq.params = { token: 'vst_' + 'a'.repeat(24) };
        mockQuery.mockRejectedValueOnce(new Error('Database error'));

        await getVisitorStatus(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to fetch status'
        });
      });
    });
  });

  describe('confirmVisitorByToken', () => {
    const validToken = 'vst_' + 'a'.repeat(24);

    describe('Token Validation', () => {
      it('should return 400 when token is missing', async () => {
        mockReq.params = {};
        mockReq.body = {
          consent: {
            dataProcessing: true,
            privacyPolicy: true
          }
        };

        await confirmVisitorByToken(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Visitor token is required'
        });
      });
    });

    describe('Consent Validation', () => {
      it('should return 400 if consent is missing', async () => {
        mockReq.params = { token: validToken };
        mockReq.body = {};

        await confirmVisitorByToken(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Consent required for data processing and privacy policy'
        });
      });

      it('should return 400 if dataProcessing consent is false', async () => {
        mockReq.params = { token: validToken };
        mockReq.body = {
          consent: {
            dataProcessing: false,
            privacyPolicy: true
          }
        };

        await confirmVisitorByToken(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should return 400 if privacyPolicy consent is false', async () => {
        mockReq.params = { token: validToken };
        mockReq.body = {
          consent: {
            dataProcessing: true,
            privacyPolicy: false
          }
        };

        await confirmVisitorByToken(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    describe('Visitor Lookup', () => {
      it('should return 404 if visitor not found', async () => {
        mockReq.params = { token: validToken };
        mockReq.body = {
          consent: {
            dataProcessing: true,
            privacyPolicy: true
          }
        };

        mockQuery.mockResolvedValueOnce({ rows: [] });

        await confirmVisitorByToken(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Invite not found or has expired'
        });
      });
    });

    describe('Already Confirmed', () => {
      it('should return success if already confirmed with active QR', async () => {
        mockReq.params = { token: validToken };
        mockReq.body = {
          consent: {
            dataProcessing: true,
            privacyPolicy: true
          }
        };

        const mockVisitor = {
          id: 1,
          name: 'John Doe',
          purpose: 'Meeting',
          date_of_visit: '2026-01-15',
          time_of_visit: '14:00',
          status: 'confirmed',
          visitor_token: validToken
        };

        mockQuery.mockResolvedValueOnce({ rows: [mockVisitor] });
        mockGetQRCodeByVisitorId.mockResolvedValueOnce({
          status: 'active',
          expires_at: '2026-01-16'
        });

        await confirmVisitorByToken(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: 'Visit already confirmed',
          data: expect.objectContaining({
            alreadyConfirmed: true
          })
        });
      });
    });

    describe('Successful Confirmation', () => {
      it('should confirm visitor and generate QR code', async () => {
        mockReq.params = { token: validToken };
        mockReq.body = {
          consent: {
            dataProcessing: true,
            privacyPolicy: true,
            marketing: false
          },
          additionalInfo: { notes: 'Test visit' }
        };

        const mockVisitor = {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+254712345678',
          purpose: 'Meeting',
          date_of_visit: '2026-01-15',
          time_of_visit: '14:00',
          status: 'pending',
          visitor_token: validToken
        };

        mockQuery
          .mockResolvedValueOnce({ rows: [mockVisitor] })
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              name: 'John Doe',
              email: 'john@example.com',
              phone: '+254712345678',
              purpose: 'Meeting',
              date_of_visit: '2026-01-15',
              time_of_visit: '14:00',
              status: 'confirmed'
            }]
          });

        mockGenerateVisitorQR.mockResolvedValueOnce({
          success: true,
          data: {
            qrCodeDataUrl: 'data:image/png;base64,abc123',
            expiresAt: '2026-01-16T14:00:00Z'
          }
        });

        mockQueueEmail.mockResolvedValueOnce(true);

        await confirmVisitorByToken(mockReq, mockRes);

        expect(mockGenerateVisitorQR).toHaveBeenCalledWith(mockVisitor);
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE visitors'),
          expect.arrayContaining([
            expect.stringContaining('dataProcessing'),
            expect.stringContaining('Test visit'),
            1
          ])
        );
        expect(mockQueueEmail).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: 'Visit confirmed successfully',
          data: expect.objectContaining({
            visitor: expect.objectContaining({
              status: 'confirmed'
            }),
            qrCode: expect.objectContaining({
              dataUrl: 'data:image/png;base64,abc123'
            })
          })
        });
      });

      it('should handle email failures gracefully', async () => {
        mockReq.params = { token: validToken };
        mockReq.body = {
          consent: {
            dataProcessing: true,
            privacyPolicy: true
          }
        };

        const mockVisitor = {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          status: 'pending',
          visitor_token: validToken
        };

        mockQuery
          .mockResolvedValueOnce({ rows: [mockVisitor] })
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              name: 'John Doe',
              email: 'john@example.com',
              status: 'confirmed',
              date_of_visit: '2026-01-15',
              time_of_visit: '14:00'
            }]
          });

        mockGenerateVisitorQR.mockResolvedValueOnce({
          success: true,
          data: {
            qrCodeDataUrl: 'data:image/png;base64,abc123',
            expiresAt: '2026-01-16'
          }
        });

        mockQueueEmail.mockRejectedValueOnce(new Error('Email service down'));

        await confirmVisitorByToken(mockReq, mockRes);

        // Should still return success even if email fails
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Visit confirmed successfully'
          })
        );
      });
    });

    describe('QR Generation Failures', () => {
      it('should return 500 if QR code generation fails', async () => {
        mockReq.params = { token: validToken };
        mockReq.body = {
          consent: {
            dataProcessing: true,
            privacyPolicy: true
          }
        };

        const mockVisitor = {
          id: 1,
          status: 'pending',
          visitor_token: validToken
        };

        mockQuery.mockResolvedValueOnce({ rows: [mockVisitor] });
        mockGenerateVisitorQR.mockResolvedValueOnce({
          success: false,
          error: 'QR service unavailable'
        });

        await confirmVisitorByToken(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to generate visitor pass'
        });
      });
    });

    describe('Error Handling', () => {
      it('should return 500 on database error', async () => {
        mockReq.params = { token: validToken };
        mockReq.body = {
          consent: {
            dataProcessing: true,
            privacyPolicy: true
          }
        };

        mockQuery.mockRejectedValueOnce(new Error('Database error'));

        await confirmVisitorByToken(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to confirm visit'
        });
      });
    });
  });

  describe('getInviteByCode', () => {
    describe('Invite Code Validation', () => {
      it('should return 400 if invite code is missing', async () => {
        mockReq.params = {};

        await getInviteByCode(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid invite code'
        });
      });

      it('should return 400 if invite code is too short', async () => {
        mockReq.params = { inviteCode: '12345' };

        await getInviteByCode(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    describe('Visitor Invites', () => {
      it('should return visitor invite by code', async () => {
        const inviteCode = 'vst_abc123';
        mockReq.params = { inviteCode };

        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'John Doe',
            phone: '+254712345678',
            email: 'john@example.com',
            purpose: 'Meeting',
            date_of_visit: '2099-01-15',
            time_of_visit: '14:00',
            status: 'pending',
            invite_type: 'visitor',
            token_expires_at: '2099-01-20'
          }]
        });

        await getInviteByCode(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: expect.objectContaining({
            name: 'John Doe',
            purpose: 'Meeting',
            type: 'visitor'
          })
        });
      });
    });

    describe('Event Invites', () => {
      it('should return event invite with event details', async () => {
        const inviteCode = 'evt_xyz789';
        mockReq.params = { inviteCode };

        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Jane Doe',
            purpose: 'Event Invitation',
            date_of_visit: '2099-02-01',
            time_of_visit: '18:00',
            status: 'confirmed',
            invite_type: 'event',
            event_id: 5,
            event_name: 'Annual Party',
            token_expires_at: '2099-02-02'
          }]
        });

        await getInviteByCode(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: expect.objectContaining({
            name: 'Jane Doe',
            type: 'event',
            event: expect.objectContaining({
              id: 5,
              name: 'Annual Party'
            })
          })
        });
      });
    });

    describe('Not Found', () => {
      it('should return 404 if invite not found', async () => {
        mockReq.params = { inviteCode: 'invalid_code_123' };
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await getInviteByCode(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Invite not found or has expired'
        });
      });
    });

    describe('Error Handling', () => {
      it('should return 500 on database error', async () => {
        mockReq.params = { inviteCode: 'valid_code_123' };
        mockQuery.mockRejectedValueOnce(new Error('Database error'));

        await getInviteByCode(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to fetch invite details'
        });
      });
    });
  });
});
