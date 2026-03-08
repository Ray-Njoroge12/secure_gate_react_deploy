/**
 * VisitorApprovalController Unit Tests
 * 
 * Tests for visitor approval endpoints (walk-in visitors).
 * Priority: P1 (Visitor Approval Controller)
 * 
 * Coverage targets:
 * - Statements: 95%+
 * - Branches: 90%+
 * - Functions: 100%
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dbManager
const mockQuery = jest.fn();
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: {
    query: mockQuery
  }
}));

// Mock constants
jest.unstable_mockModule('../../src/constants/statuses.js', () => ({
  PASS_STATUS: {
    PENDING_APPROVAL: 'pending_approval',
    APPROVED: 'approved',
    REJECTED: 'rejected'
  }
}));

// Mock logger
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock websocket service
const mockEmitApprovalRequest = jest.fn();
const mockEmitApprovalResponse = jest.fn();
jest.unstable_mockModule('../../src/services/websocketService.js', () => ({
  default: {
    emitApprovalRequest: mockEmitApprovalRequest,
    emitApprovalResponse: mockEmitApprovalResponse
  }
}));

describe('VisitorApprovalController', () => {
  let controller;
  let mockReq;
  let mockRes;

  beforeEach(async () => {
    jest.clearAllMocks();

    controller = await import('../../src/controllers/visitorApprovalController.js');

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockReq = {
      user: null,
      params: {},
      body: {},
      query: {},
      audit: jest.fn().mockResolvedValue(undefined)
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Factory functions
  const createGuardUser = (overrides = {}) => ({
    id: 1,
    email: 'guard@test.com',
    role: 'guard',
    first_name: 'Guard',
    ...overrides
  });

  const createResidentUser = (overrides = {}) => ({
    id: 2,
    email: 'resident@test.com',
    role: 'resident',
    first_name: 'Resident',
    ...overrides
  });

  const createVisitor = (overrides = {}) => ({
    id: 1,
    name: 'John Visitor',
    phone: '+254712345678',
    email: 'visitor@test.com',
    status: 'pending',
    resident_id: 2,
    vehicle_plate: 'KAA 123A',
    ...overrides
  });

  describe('requestApproval', () => {
    it('should request approval for valid visitor', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };
      mockReq.body = { reason: 'Walk-in visit', notes: 'Expected visitor' };

      const visitor = createVisitor();
      mockQuery
        .mockResolvedValueOnce({ rows: [visitor] }) // SELECT visitor
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'John Visitor',
            phone: '+254712345678',
            status: 'pending_approval',
            resident_id: 2,
            approval_requested_at: new Date()
          }]
        }); // UPDATE visitor

      await controller.requestApproval(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          id: 1,
          status: 'pending_approval',
          message: 'Approval request sent to resident'
        })
      }));
    });

    it('should return 403 for users outside the guard/admin approval requester roles', async () => {
      mockReq.user = createResidentUser();
      mockReq.params = { id: '1' };

      await controller.requestApproval(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Only guards and admins can request visitor approval'
      }));
    });

    it('should return 403 when user is null', async () => {
      mockReq.user = null;
      mockReq.params = { id: '1' };

      await controller.requestApproval(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 when visitor not found', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '999' };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await controller.requestApproval(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Visitor not found'
      }));
    });

    it('should return 422 when visitor has no resident', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };

      mockQuery.mockResolvedValueOnce({
        rows: [createVisitor({ resident_id: null })]
      });

      await controller.requestApproval(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Cannot request approval: visitor has no assigned resident'
      }));
    });

    it('should return 409 when approval already requested', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };

      mockQuery.mockResolvedValueOnce({
        rows: [createVisitor({ status: 'pending_approval' })]
      });

      await controller.requestApproval(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Approval already requested for this visitor'
      }));
    });

    it('should return 409 when visitor already approved', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };

      mockQuery.mockResolvedValueOnce({
        rows: [createVisitor({ status: 'approved' })]
      });

      await controller.requestApproval(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Visitor already approved'
      }));
    });

    it('should return 409 when visitor was rejected', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };

      mockQuery.mockResolvedValueOnce({
        rows: [createVisitor({ status: 'rejected' })]
      });

      await controller.requestApproval(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Visitor was rejected'
      }));
    });

    it('should emit websocket event on success', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };
      mockReq.body = { reason: 'Walk-in' };

      const visitor = createVisitor();
      mockQuery
        .mockResolvedValueOnce({ rows: [visitor] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'John Visitor',
            phone: '+254712345678',
            status: 'pending_approval',
            resident_id: 2,
            approval_requested_at: new Date()
          }]
        });

      await controller.requestApproval(mockReq, mockRes);

      expect(mockEmitApprovalRequest).toHaveBeenCalledWith(
        2, // resident_id
        expect.objectContaining({
          id: 1,
          guard_name: 'Guard'
        })
      );
    });

    it('should call audit function on success', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };
      mockReq.body = { reason: 'Walk-in', notes: 'Test' };

      const visitor = createVisitor();
      mockQuery
        .mockResolvedValueOnce({ rows: [visitor] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, status: 'pending_approval', resident_id: 2 }]
        });

      await controller.requestApproval(mockReq, mockRes);

      expect(mockReq.audit).toHaveBeenCalledWith(
        'visitor.request_approval',
        'visitor',
        '1',
        expect.objectContaining({
          outcome: 'success',
          reason: 'Walk-in',
          notes: 'Test',
          resident_id: 2
        })
      );
    });

    it('should handle database error', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };

      mockQuery.mockRejectedValueOnce(new Error('DB error'));

      await controller.requestApproval(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Failed to request approval'
      }));
    });
  });

  describe('approveVisitor', () => {
    it('should approve visitor successfully', async () => {
      mockReq.user = createResidentUser();
      mockReq.params = { id: '1' };
      mockReq.body = { notes: 'Welcome!' };

      const visitor = createVisitor({ status: 'pending_approval', resident_id: 2 });
      mockQuery
        .mockResolvedValueOnce({ rows: [visitor] }) // SELECT visitor
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'John Visitor',
            status: 'approved',
            approved_by: 2,
            approved_at: new Date()
          }]
        }) // UPDATE visitor
        .mockResolvedValueOnce({ rows: [{ approval_requested_by: 1 }] }); // Get guard

      await controller.approveVisitor(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          id: 1,
          status: 'approved',
          message: 'Visitor approved successfully'
        })
      }));
    });

    it('should return 403 for users outside the resident/admin approver roles', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };

      await controller.approveVisitor(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Only residents and admins can approve visitors'
      }));
    });

    it('should return 404 when visitor not found', async () => {
      mockReq.user = createResidentUser();
      mockReq.params = { id: '999' };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await controller.approveVisitor(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when trying to approve another residents visitor', async () => {
      mockReq.user = createResidentUser({ id: 5 });
      mockReq.params = { id: '1' };

      mockQuery.mockResolvedValueOnce({
        rows: [createVisitor({ resident_id: 2, status: 'pending_approval' })]
      });

      await controller.approveVisitor(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'You can only approve your own visitors'
      }));
    });

    it('should return 422 when visitor not in pending approval status', async () => {
      mockReq.user = createResidentUser();
      mockReq.params = { id: '1' };

      mockQuery.mockResolvedValueOnce({
        rows: [createVisitor({ resident_id: 2, status: 'pending' })]
      });

      await controller.approveVisitor(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(422);
    });

    it('should emit websocket event on approval', async () => {
      mockReq.user = createResidentUser();
      mockReq.params = { id: '1' };

      const visitor = createVisitor({ status: 'pending_approval', resident_id: 2 });
      const approvedAt = new Date();

      mockQuery
        .mockResolvedValueOnce({ rows: [visitor] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, status: 'approved', approved_at: approvedAt }]
        })
        .mockResolvedValueOnce({ rows: [{ approval_requested_by: 3 }] });

      await controller.approveVisitor(mockReq, mockRes);

      expect(mockEmitApprovalResponse).toHaveBeenCalledWith(
        3, // guard id
        expect.objectContaining({
          visitor_id: '1',
          status: 'approved',
          responded_by: 'Resident'
        })
      );
    });

    it('should handle database error', async () => {
      mockReq.user = createResidentUser();
      mockReq.params = { id: '1' };

      mockQuery.mockRejectedValueOnce(new Error('DB error'));

      await controller.approveVisitor(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('rejectVisitor', () => {
    it('should reject visitor successfully', async () => {
      mockReq.user = createResidentUser();
      mockReq.params = { id: '1' };
      mockReq.body = { reason: 'Unknown person' };

      const visitor = createVisitor({ status: 'pending_approval', resident_id: 2, approval_requested_by: 1 });

      mockQuery
        .mockResolvedValueOnce({ rows: [visitor] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'John Visitor',
            status: 'rejected',
            rejected_by: 2,
            rejected_at: new Date(),
            rejection_reason: 'Unknown person'
          }]
        });

      await controller.rejectVisitor(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          id: 1,
          status: 'rejected',
          rejection_reason: 'Unknown person',
          message: 'Visitor rejected successfully'
        })
      }));
    });

    it('should return 403 for non-resident users', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };

      await controller.rejectVisitor(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 when visitor not found', async () => {
      mockReq.user = createResidentUser();
      mockReq.params = { id: '999' };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await controller.rejectVisitor(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when rejecting another residents visitor', async () => {
      mockReq.user = createResidentUser({ id: 5 });
      mockReq.params = { id: '1' };

      mockQuery.mockResolvedValueOnce({
        rows: [createVisitor({ resident_id: 2, status: 'pending_approval' })]
      });

      await controller.rejectVisitor(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 422 when visitor not in pending approval status', async () => {
      mockReq.user = createResidentUser();
      mockReq.params = { id: '1' };

      mockQuery.mockResolvedValueOnce({
        rows: [createVisitor({ resident_id: 2, status: 'approved' })]
      });

      await controller.rejectVisitor(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(422);
    });

    it('should emit websocket event on rejection', async () => {
      mockReq.user = createResidentUser();
      mockReq.params = { id: '1' };
      mockReq.body = { reason: 'Not expecting anyone' };

      const visitor = createVisitor({
        status: 'pending_approval',
        resident_id: 2,
        approval_requested_by: 3
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [visitor] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, status: 'rejected', rejected_at: new Date(), rejection_reason: 'Not expecting anyone' }]
        });

      await controller.rejectVisitor(mockReq, mockRes);

      expect(mockEmitApprovalResponse).toHaveBeenCalledWith(
        3,
        expect.objectContaining({
          visitor_id: '1',
          status: 'rejected',
          rejection_reason: 'Not expecting anyone'
        })
      );
    });

    it('should handle rejection without reason', async () => {
      mockReq.user = createResidentUser();
      mockReq.params = { id: '1' };
      mockReq.body = {}; // No reason

      const visitor = createVisitor({ status: 'pending_approval', resident_id: 2, approval_requested_by: 1 });

      mockQuery
        .mockResolvedValueOnce({ rows: [visitor] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, status: 'rejected', rejected_at: new Date(), rejection_reason: null }]
        });

      await controller.rejectVisitor(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ status: 'rejected' })
      }));
    });

    it('should handle database error', async () => {
      mockReq.user = createResidentUser();
      mockReq.params = { id: '1' };

      mockQuery.mockRejectedValueOnce(new Error('DB error'));

      await controller.rejectVisitor(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getPendingApprovals', () => {
    it('should return pending approvals for resident', async () => {
      mockReq.user = createResidentUser();

      const pendingVisitors = [
        { id: 1, name: 'Visitor 1', status: 'pending_approval' },
        { id: 2, name: 'Visitor 2', status: 'pending_approval' }
      ];

      mockQuery.mockResolvedValueOnce({ rows: pendingVisitors });

      await controller.getPendingApprovals(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: pendingVisitors
      }));
    });

    it('should return 403 for non-resident users', async () => {
      mockReq.user = createGuardUser();

      await controller.getPendingApprovals(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return empty array when no pending approvals', async () => {
      mockReq.user = createResidentUser();

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await controller.getPendingApprovals(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: []
      }));
    });

    it('should handle database error', async () => {
      mockReq.user = createResidentUser();

      mockQuery.mockRejectedValueOnce(new Error('DB error'));

      await controller.getPendingApprovals(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getApprovalHistory', () => {
    it('should return approval history for resident', async () => {
      mockReq.user = createResidentUser();
      mockReq.query = { limit: 50, offset: 0 };

      const history = [
        { id: 1, name: 'Visitor 1', status: 'approved', approved_at: new Date() },
        { id: 2, name: 'Visitor 2', status: 'rejected', rejected_at: new Date() }
      ];

      mockQuery.mockResolvedValueOnce({ rows: history });

      await controller.getApprovalHistory(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: history
      }));
    });

    it('should apply custom limit and offset', async () => {
      mockReq.user = createResidentUser();
      mockReq.query = { limit: 10, offset: 20 };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await controller.getApprovalHistory(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([2, 'approved', 'rejected', 10, 20])
      );
    });

    it('should use default limit and offset', async () => {
      mockReq.user = createResidentUser();
      mockReq.query = {};

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await controller.getApprovalHistory(mockReq, mockRes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([50, 0])
      );
    });

    it('should return 403 for non-resident users', async () => {
      mockReq.user = createGuardUser();

      await controller.getApprovalHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should handle database error', async () => {
      mockReq.user = createResidentUser();

      mockQuery.mockRejectedValueOnce(new Error('DB error'));

      await controller.getApprovalHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Default Export', () => {
    it('should export all controller functions', async () => {
      expect(controller.default).toBeDefined();
      expect(controller.default.requestApproval).toBeDefined();
      expect(controller.default.approveVisitor).toBeDefined();
      expect(controller.default.rejectVisitor).toBeDefined();
      expect(controller.default.getPendingApprovals).toBeDefined();
      expect(controller.default.getApprovalHistory).toBeDefined();
    });
  });
});
