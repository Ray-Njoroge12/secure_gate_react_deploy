/**
 * Comprehensive Test Suite for visitorCheckInController
 * Tests check-in, check-out, and self check-in functionality
 * 
 * Coverage Areas:
 * - Check-in operations (guard-initiated)
 * - Check-out operations (guard-initiated)
 * - Self check-in (visitor-initiated)
 * - Authorization and authentication
 * - Status validations
 * - Database operations
 * - Audit logging
 * - SSE broadcasting
 * - Error handling
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockDbManager = {
  query: jest.fn()
};

const mockRespond = jest.fn();
const mockRespondError = jest.fn();
const mockBroadcastVisitorCheckIn = jest.fn();
const mockBroadcastVisitorUpdate = jest.fn();

// Mock modules before importing controller
jest.unstable_mockModule('../../../src/database/db.enhanced.js', () => ({
  dbManager: mockDbManager
}));

jest.unstable_mockModule('../../../src/utils/respond.js', () => ({
  respond: mockRespond,
  respondError: mockRespondError
}));

jest.unstable_mockModule('../../../src/routes/sseRoutes.js', () => ({
  broadcastVisitorCheckIn: mockBroadcastVisitorCheckIn,
  broadcastVisitorUpdate: mockBroadcastVisitorUpdate
}));

jest.unstable_mockModule('../../../src/constants/statuses.js', () => ({
  PASS_STATUS: {
    PENDING: 'PENDING',
    VERIFIED: 'VERIFIED',
    ON_PREMISE: 'ON_PREMISE',
    CHECKED_OUT: 'CHECKED_OUT'
  }
}));

// Import controller after mocks
const { checkInVisitor, checkOutVisitor, selfCheckIn } = await import('../../../src/controllers/visitorCheckInController.js');

describe('visitorCheckInController', () => {
  let mockReq, mockRes, mockAudit;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock audit function
    mockAudit = jest.fn().mockResolvedValue(true);

    // Setup mock request
    mockReq = {
      user: {
        id: 1,
        email: 'guard@example.com',
        role: 'guard'
      },
      params: {},
      body: {},
      audit: mockAudit
    };

    // Setup mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  // =====================================================
  // CHECK-IN VISITOR TESTS
  // =====================================================

  describe('checkInVisitor()', () => {
    beforeEach(() => {
      mockReq.params.id = '123';
    });

    describe('Success Cases', () => {
      test('should check in a pending visitor successfully', async () => {
        const mockVisitor = {
          id: 123,
          status: 'PENDING',
          name: 'John Doe',
          phone: '+1234567890',
          email: 'john@example.com'
        };

        mockDbManager.query
          .mockResolvedValueOnce({ rows: [mockVisitor] }) // SELECT visitor
          .mockResolvedValueOnce({ rowCount: 1 }); // UPDATE visitor

        await checkInVisitor(mockReq, mockRes);

        // Verify database queries
        expect(mockDbManager.query).toHaveBeenCalledTimes(2);
        expect(mockDbManager.query).toHaveBeenNthCalledWith(
          1,
          'SELECT id, status, name, phone, email FROM visitors WHERE id = $1',
          ['123']
        );

        // Verify UPDATE query with ON_PREMISE status
        const updateCall = mockDbManager.query.mock.calls[1];
        expect(updateCall[0]).toContain('UPDATE visitors SET status = $1, check_in = $2 WHERE id = $3');
        expect(updateCall[1][0]).toBe('ON_PREMISE');
        expect(updateCall[1][2]).toBe('123');

        // Verify SSE broadcasting
        expect(mockBroadcastVisitorCheckIn).toHaveBeenCalledWith('123', 'checkin');
        expect(mockBroadcastVisitorUpdate).toHaveBeenCalledWith('123', 'ON_PREMISE', 'checkin');

        // Verify audit logging
        expect(mockAudit).toHaveBeenCalledWith(
          'visitor.checkin',
          'visitor',
          '123',
          expect.objectContaining({
            outcome: 'success',
            message: 'Visitor checked in by guard'
          })
        );

        // Verify successful response
        expect(mockRespond).toHaveBeenCalledWith(
          mockRes,
          expect.objectContaining({
            message: 'Visitor checked in successfully'
          })
        );
      });

      test('should check in a verified visitor successfully', async () => {
        const mockVisitor = {
          id: 123,
          status: 'VERIFIED',
          name: 'Jane Smith',
          phone: '+1234567890',
          email: 'jane@example.com'
        };

        mockDbManager.query
          .mockResolvedValueOnce({ rows: [mockVisitor] })
          .mockResolvedValueOnce({ rowCount: 1 });

        await checkInVisitor(mockReq, mockRes);

        expect(mockDbManager.query).toHaveBeenCalledTimes(2);
        expect(mockRespond).toHaveBeenCalled();
        expect(mockAudit).toHaveBeenCalledWith(
          'visitor.checkin',
          'visitor',
          '123',
          expect.objectContaining({ outcome: 'success' })
        );
      });

      test('should include check-in timestamp in response', async () => {
        const mockVisitor = {
          id: 123,
          status: 'PENDING',
          name: 'John Doe',
          phone: '+1234567890',
          email: 'john@example.com'
        };

        mockDbManager.query
          .mockResolvedValueOnce({ rows: [mockVisitor] })
          .mockResolvedValueOnce({ rowCount: 1 });

        await checkInVisitor(mockReq, mockRes);

        expect(mockRespond).toHaveBeenCalledWith(
          mockRes,
          expect.objectContaining({
            check_in: expect.any(Date)
          })
        );
      });
    });

    describe('Authentication & Authorization', () => {
      test('should reject request with no user', async () => {
        mockReq.user = null;

        await checkInVisitor(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 401, 'Unauthorized');
        expect(mockDbManager.query).not.toHaveBeenCalled();
      });

      test('should reject request with no email in user', async () => {
        mockReq.user = { id: 1, role: 'guard' };
        delete mockReq.user.email;

        await checkInVisitor(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 401, 'Unauthorized');
        expect(mockDbManager.query).not.toHaveBeenCalled();
      });

      test('should reject non-guard user', async () => {
        mockReq.user.role = 'resident';

        await checkInVisitor(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 403, 'Forbidden');
        expect(mockDbManager.query).not.toHaveBeenCalled();
      });

      test('should reject admin user (not guard)', async () => {
        mockReq.user.role = 'admin';

        await checkInVisitor(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 403, 'Forbidden');
      });
    });

    describe('Validation Errors', () => {
      test('should return 404 when visitor not found', async () => {
        mockDbManager.query.mockResolvedValueOnce({ rows: [] });

        await checkInVisitor(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 404, 'Visitor not found');
        expect(mockDbManager.query).toHaveBeenCalledTimes(1); // Only SELECT, no UPDATE
      });

      test('should reject check-in for already checked-in visitor', async () => {
        const mockVisitor = {
          id: 123,
          status: 'ON_PREMISE',
          name: 'John Doe'
        };

        mockDbManager.query.mockResolvedValueOnce({ rows: [mockVisitor] });

        await checkInVisitor(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 422, 'Visitor cannot be checked in');
        expect(mockDbManager.query).toHaveBeenCalledTimes(1); // Only SELECT
      });

      test('should reject check-in for checked-out visitor', async () => {
        const mockVisitor = {
          id: 123,
          status: 'CHECKED_OUT',
          name: 'John Doe'
        };

        mockDbManager.query.mockResolvedValueOnce({ rows: [mockVisitor] });

        await checkInVisitor(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 422, 'Visitor cannot be checked in');
      });

      test('should reject check-in for expired visitor', async () => {
        const mockVisitor = {
          id: 123,
          status: 'EXPIRED',
          name: 'John Doe'
        };

        mockDbManager.query.mockResolvedValueOnce({ rows: [mockVisitor] });

        await checkInVisitor(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 422, 'Visitor cannot be checked in');
      });
    });

    describe('Error Handling', () => {
      test('should handle database query errors', async () => {
        const dbError = new Error('Database connection failed');
        mockDbManager.query.mockRejectedValueOnce(dbError);

        await checkInVisitor(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 500, 'Failed to check in visitor');
        expect(mockAudit).toHaveBeenCalledWith(
          'visitor.checkin',
          'visitor',
          null,
          expect.objectContaining({
            outcome: 'fail',
            message: 'Failed to check in visitor'
          })
        );
      });

      test('should handle database update errors', async () => {
        const mockVisitor = {
          id: 123,
          status: 'PENDING',
          name: 'John Doe'
        };

        mockDbManager.query
          .mockResolvedValueOnce({ rows: [mockVisitor] })
          .mockRejectedValueOnce(new Error('Update failed'));

        await checkInVisitor(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 500, 'Failed to check in visitor');
      });

      test('should handle audit logging errors gracefully', async () => {
        const mockVisitor = {
          id: 123,
          status: 'PENDING',
          name: 'John Doe'
        };

        mockDbManager.query
          .mockResolvedValueOnce({ rows: [mockVisitor] })
          .mockResolvedValueOnce({ rowCount: 1 });

        mockAudit.mockRejectedValueOnce(new Error('Audit failed'));

        // Should not throw, audit errors should be handled gracefully
        await checkInVisitor(mockReq, mockRes);

        expect(mockRespond).toHaveBeenCalled();
      });
    });
  });

  // =====================================================
  // CHECK-OUT VISITOR TESTS
  // =====================================================

  describe('checkOutVisitor()', () => {
    beforeEach(() => {
      mockReq.params.id = '456';
    });

    describe('Success Cases', () => {
      test('should check out a visitor successfully', async () => {
        const mockVisitor = {
          id: 456,
          status: 'ON_PREMISE',
          name: 'Jane Smith',
          phone: '+1234567890',
          email: 'jane@example.com'
        };

        mockDbManager.query
          .mockResolvedValueOnce({ rows: [mockVisitor] })
          .mockResolvedValueOnce({ rowCount: 1 });

        await checkOutVisitor(mockReq, mockRes);

        // Verify database queries
        expect(mockDbManager.query).toHaveBeenCalledTimes(2);

        // Verify UPDATE query with CHECKED_OUT status
        const updateCall = mockDbManager.query.mock.calls[1];
        expect(updateCall[0]).toContain('UPDATE visitors SET status = $1, check_out = $2 WHERE id = $3');
        expect(updateCall[1][0]).toBe('CHECKED_OUT');
        expect(updateCall[1][2]).toBe('456');

        // Verify SSE broadcasting
        expect(mockBroadcastVisitorCheckIn).toHaveBeenCalledWith('456', 'checkout');
        expect(mockBroadcastVisitorUpdate).toHaveBeenCalledWith('456', 'CHECKED_OUT', 'checkout');

        // Verify audit logging
        expect(mockAudit).toHaveBeenCalledWith(
          'visitor.checkout',
          'visitor',
          '456',
          expect.objectContaining({
            outcome: 'success',
            message: 'Visitor checked out by guard'
          })
        );

        // Verify successful response
        expect(mockRespond).toHaveBeenCalledWith(
          mockRes,
          expect.objectContaining({
            message: 'Visitor checked out successfully',
            check_out: expect.any(Date)
          })
        );
      });

      test('should include check-out timestamp in response', async () => {
        const mockVisitor = {
          id: 456,
          status: 'ON_PREMISE',
          name: 'Jane Smith'
        };

        mockDbManager.query
          .mockResolvedValueOnce({ rows: [mockVisitor] })
          .mockResolvedValueOnce({ rowCount: 1 });

        await checkOutVisitor(mockReq, mockRes);

        expect(mockRespond).toHaveBeenCalledWith(
          mockRes,
          expect.objectContaining({
            check_out: expect.any(Date)
          })
        );
      });
    });

    describe('Authentication & Authorization', () => {
      test('should reject request with no user', async () => {
        mockReq.user = null;

        await checkOutVisitor(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 401, 'Unauthorized');
        expect(mockDbManager.query).not.toHaveBeenCalled();
      });

      test('should reject request with no email', async () => {
        mockReq.user = { id: 1, role: 'guard' };
        delete mockReq.user.email;

        await checkOutVisitor(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 401, 'Unauthorized');
      });

      test('should reject non-guard user', async () => {
        mockReq.user.role = 'resident';

        await checkOutVisitor(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 403, 'Forbidden');
      });
    });

    describe('Validation Errors', () => {
      test('should return 404 when visitor not found', async () => {
        mockDbManager.query.mockResolvedValueOnce({ rows: [] });

        await checkOutVisitor(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 404, 'Visitor not found');
      });

      test('should reject check-out for visitor not on premise', async () => {
        const mockVisitor = {
          id: 456,
          status: 'PENDING',
          name: 'Jane Smith'
        };

        mockDbManager.query.mockResolvedValueOnce({ rows: [mockVisitor] });

        await checkOutVisitor(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 422, 'Visitor not checked in');
      });

      test('should reject check-out for already checked-out visitor', async () => {
        const mockVisitor = {
          id: 456,
          status: 'CHECKED_OUT',
          name: 'Jane Smith'
        };

        mockDbManager.query.mockResolvedValueOnce({ rows: [mockVisitor] });

        await checkOutVisitor(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 422, 'Visitor not checked in');
      });
    });

    describe('Error Handling', () => {
      test('should handle database query errors', async () => {
        const dbError = new Error('Database connection failed');
        mockDbManager.query.mockRejectedValueOnce(dbError);

        await checkOutVisitor(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 500, 'Failed to check out visitor');
        expect(mockAudit).toHaveBeenCalledWith(
          'visitor.checkout',
          'visitor',
          null,
          expect.objectContaining({
            outcome: 'fail',
            message: 'Failed to check out visitor'
          })
        );
      });

      test('should handle database update errors', async () => {
        const mockVisitor = {
          id: 456,
          status: 'ON_PREMISE',
          name: 'Jane Smith'
        };

        mockDbManager.query
          .mockResolvedValueOnce({ rows: [mockVisitor] })
          .mockRejectedValueOnce(new Error('Update failed'));

        await checkOutVisitor(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 500, 'Failed to check out visitor');
      });
    });
  });

  // =====================================================
  // SELF CHECK-IN TESTS
  // =====================================================

  describe('selfCheckIn()', () => {
    beforeEach(() => {
      mockReq.params.inviteCode = 'ABC123XYZ';
      // Self check-in doesn't require authenticated user
      delete mockReq.user;
    });

    describe('Success Cases', () => {
      test('should allow visitor to self check-in with valid invite code', async () => {
        const mockVisitor = {
          id: 789,
          status: 'PENDING',
          name: 'Bob Johnson',
          phone: '+1234567890',
          email: 'bob@example.com'
        };

        mockDbManager.query
          .mockResolvedValueOnce({ rows: [mockVisitor] })
          .mockResolvedValueOnce({ rowCount: 1 });

        await selfCheckIn(mockReq, mockRes);

        // Verify database queries
        expect(mockDbManager.query).toHaveBeenCalledTimes(2);
        expect(mockDbManager.query).toHaveBeenNthCalledWith(
          1,
          'SELECT id, status, name, phone, email FROM visitors WHERE invite_code = $1',
          ['ABC123XYZ']
        );

        // Verify UPDATE query
        const updateCall = mockDbManager.query.mock.calls[1];
        expect(updateCall[0]).toContain('UPDATE visitors SET status = $1, check_in = $2 WHERE id = $3');
        expect(updateCall[1][0]).toBe('ON_PREMISE');
        expect(updateCall[1][2]).toBe(789);

        // Verify audit logging
        expect(mockAudit).toHaveBeenCalledWith(
          'visitor.selfcheckin',
          'visitor',
          '789',
          expect.objectContaining({
            outcome: 'success',
            message: 'Visitor self-checked in'
          })
        );

        // Verify response
        expect(mockRespond).toHaveBeenCalledWith(
          mockRes,
          expect.objectContaining({
            message: 'Self check-in successful',
            check_in: expect.any(Date)
          })
        );
      });

      test('should allow verified visitor to self check-in', async () => {
        const mockVisitor = {
          id: 789,
          status: 'VERIFIED',
          name: 'Alice Williams',
          phone: '+1234567890',
          email: 'alice@example.com'
        };

        mockDbManager.query
          .mockResolvedValueOnce({ rows: [mockVisitor] })
          .mockResolvedValueOnce({ rowCount: 1 });

        await selfCheckIn(mockReq, mockRes);

        expect(mockRespond).toHaveBeenCalled();
        expect(mockAudit).toHaveBeenCalledWith(
          'visitor.selfcheckin',
          'visitor',
          '789',
          expect.objectContaining({ outcome: 'success' })
        );
      });
    });

    describe('Validation Errors', () => {
      test('should return 404 for invalid invite code', async () => {
        mockDbManager.query.mockResolvedValueOnce({ rows: [] });

        await selfCheckIn(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 404, 'Visitor not found');
      });

      test('should reject self check-in for already checked-in visitor', async () => {
        const mockVisitor = {
          id: 789,
          status: 'ON_PREMISE',
          name: 'Bob Johnson'
        };

        mockDbManager.query.mockResolvedValueOnce({ rows: [mockVisitor] });

        await selfCheckIn(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 422, 'Visitor cannot be checked in');
      });

      test('should reject self check-in for checked-out visitor', async () => {
        const mockVisitor = {
          id: 789,
          status: 'CHECKED_OUT',
          name: 'Bob Johnson'
        };

        mockDbManager.query.mockResolvedValueOnce({ rows: [mockVisitor] });

        await selfCheckIn(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 422, 'Visitor cannot be checked in');
      });
    });

    describe('Error Handling', () => {
      test('should handle database errors', async () => {
        const dbError = new Error('Database connection failed');
        mockDbManager.query.mockRejectedValueOnce(dbError);

        await selfCheckIn(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 500, 'Failed to self check-in');
        expect(mockAudit).toHaveBeenCalledWith(
          'visitor.selfcheckin',
          'visitor',
          null,
          expect.objectContaining({
            outcome: 'fail',
            message: 'Failed to self-check in visitor'
          })
        );
      });

      test('should handle update errors', async () => {
        const mockVisitor = {
          id: 789,
          status: 'PENDING',
          name: 'Bob Johnson'
        };

        mockDbManager.query
          .mockResolvedValueOnce({ rows: [mockVisitor] })
          .mockRejectedValueOnce(new Error('Update failed'));

        await selfCheckIn(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 500, 'Failed to self check-in');
      });
    });

    describe('Security', () => {
      test('should not allow self check-in without invite code', async () => {
        mockReq.params.inviteCode = null;

        mockDbManager.query.mockResolvedValueOnce({ rows: [] });

        await selfCheckIn(mockReq, mockRes);

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 404, 'Visitor not found');
      });

      test('should prevent SQL injection in invite code', async () => {
        mockReq.params.inviteCode = "ABC'; DROP TABLE visitors; --";

        mockDbManager.query.mockResolvedValueOnce({ rows: [] });

        await selfCheckIn(mockReq, mockRes);

        // Verify parameterized query was used
        expect(mockDbManager.query).toHaveBeenCalledWith(
          expect.any(String),
          ["ABC'; DROP TABLE visitors; --"]
        );

        expect(mockRespondError).toHaveBeenCalledWith(mockRes, 404, 'Visitor not found');
      });
    });
  });

  // =====================================================
  // INTEGRATION & EDGE CASES
  // =====================================================

  describe('Integration & Edge Cases', () => {
    test('should handle missing audit function gracefully', async () => {
      mockReq.params.id = '123';
      mockReq.audit = null;

      const mockVisitor = {
        id: 123,
        status: 'PENDING',
        name: 'John Doe'
      };

      mockDbManager.query
        .mockResolvedValueOnce({ rows: [mockVisitor] })
        .mockResolvedValueOnce({ rowCount: 1 });

      // Should not throw even if audit is missing
      await checkInVisitor(mockReq, mockRes);

      expect(mockRespond).toHaveBeenCalled();
    });

    test('should handle SSE broadcast failures gracefully', async () => {
      mockReq.params.id = '123';

      const mockVisitor = {
        id: 123,
        status: 'PENDING',
        name: 'John Doe'
      };

      mockDbManager.query
        .mockResolvedValueOnce({ rows: [mockVisitor] })
        .mockResolvedValueOnce({ rowCount: 1 });

      mockBroadcastVisitorCheckIn.mockImplementationOnce(() => {
        throw new Error('SSE broadcast failed');
      });

      // Should complete check-in even if SSE broadcast fails
      await checkInVisitor(mockReq, mockRes);

      expect(mockRespond).toHaveBeenCalled();
    });

    test('should handle numeric ID as string', async () => {
      mockReq.params.id = '999';

      const mockVisitor = {
        id: 999,
        status: 'PENDING',
        name: 'Test User'
      };

      mockDbManager.query
        .mockResolvedValueOnce({ rows: [mockVisitor] })
        .mockResolvedValueOnce({ rowCount: 1 });

      await checkInVisitor(mockReq, mockRes);

      expect(mockDbManager.query).toHaveBeenNthCalledWith(
        1,
        expect.any(String),
        ['999'] // String ID should be passed as-is
      );

      expect(mockRespond).toHaveBeenCalled();
    });
  });
});
