/**
 * VisitorCheckInController Unit Tests
 * 
 * Tests for visitor check-in/check-out operations.
 * Priority: P1 (Visitor Management)
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
  __esModule: true,
  default: {
    query: mockQuery
  },
  db: {
    query: mockQuery
  },
  dbManager: {
    query: mockQuery
  }
}));

// Mock respond utilities
const mockRespond = jest.fn();
const mockRespondError = jest.fn();
const mockCamelize = jest.fn((value) => value);
jest.unstable_mockModule('../../src/utils/respond.js', () => ({
  camelize: mockCamelize,
  respond: mockRespond,
  respondError: mockRespondError
}));

// Mock SSE routes
const mockBroadcastVisitorCheckIn = jest.fn();
const mockBroadcastVisitorUpdate = jest.fn();
jest.unstable_mockModule('../../src/routes/sseRoutes.js', () => ({
  broadcastVisitorCheckIn: mockBroadcastVisitorCheckIn,
  broadcastVisitorUpdate: mockBroadcastVisitorUpdate
}));

// Mock statuses
jest.unstable_mockModule('../../src/constants/statuses.js', () => ({
  PASS_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    ON_PREMISE: 'on_premise',
    CHECKED_OUT: 'checked_out',
    VERIFIED: 'verified'
  },
  normalizeStatus: jest.fn((status) => status),
  canCheckInStatus: jest.fn((status) => ['verified', 'approved', 'pending'].includes(status)),
  statusEquals: jest.fn((a, b) => a === b)
}));

// Mock visitor state service
const mockValidateVisitorTransition = jest.fn();
jest.unstable_mockModule('../../src/services/visitorStateService.js', () => ({
  validateVisitorTransition: mockValidateVisitorTransition
}));

// Mock WebSocket service
const mockEmitVisitorCheckIn = jest.fn();
const mockEmitVisitorCheckOut = jest.fn();
jest.unstable_mockModule('../../src/services/websocketService.js', () => ({
  default: {
    emitVisitorCheckIn: mockEmitVisitorCheckIn,
    emitVisitorCheckOut: mockEmitVisitorCheckOut
  }
}));

describe('VisitorCheckInController', () => {
  let controller;
  let mockReq;
  let mockRes;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    mockValidateVisitorTransition.mockImplementation((fromStatus, toStatus) => {
      if (toStatus === 'on_premise') {
        return ['verified', 'approved', 'pending'].includes(fromStatus)
          ? { valid: true }
          : { valid: false, reason: 'Visitor cannot be checked in' };
      }

      if (toStatus === 'checked_out') {
        return fromStatus === 'on_premise'
          ? { valid: true }
          : { valid: false, reason: 'Visitor not checked in' };
      }

      return { valid: true };
    });
    
    controller = await import('../../src/controllers/visitorCheckInController.js');
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    mockReq = {
      user: null,
      params: {},
      body: {},
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
    estate_id: 1,
    ...overrides
  });
  
  const createVisitor = (overrides = {}) => ({
    id: 1,
    name: 'John Visitor',
    phone: '+254712345678',
    email: 'visitor@test.com',
    status: 'verified',
    ...overrides
  });
  
  describe('checkInVisitor', () => {
    it('should check in visitor successfully', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };
      
      const visitor = createVisitor();
      mockQuery.mockResolvedValueOnce({ rows: [visitor] }); // SELECT
      mockQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE
      
      await controller.checkInVisitor(mockReq, mockRes);
      
      expect(mockRespond).toHaveBeenCalledWith(mockRes, {
        message: 'Visitor checked in successfully',
        check_in: expect.any(Date)
      });
      expect(mockBroadcastVisitorCheckIn).toHaveBeenCalledWith('1', 'checkin', 1);
    });
    
    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = null;
      mockReq.params = { id: '1' };
      
      await controller.checkInVisitor(mockReq, mockRes);
      
      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 401, 'Unauthorized');
    });
    
    it('should return 401 when user has no email', async () => {
      mockReq.user = { id: 1, role: 'guard' };
      mockReq.params = { id: '1' };
      
      await controller.checkInVisitor(mockReq, mockRes);
      
      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 401, 'Unauthorized');
    });
    
    it('should return 403 when user is not a guard', async () => {
      mockReq.user = { id: 1, email: 'resident@test.com', role: 'resident' };
      mockReq.params = { id: '1' };
      
      await controller.checkInVisitor(mockReq, mockRes);
      
      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 403, 'Forbidden');
    });
    
    it('should return 404 when visitor not found', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '999' };
      
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      await controller.checkInVisitor(mockReq, mockRes);
      
      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 404, 'Visitor not found');
    });
    
    it('should return 422 when visitor cannot be checked in', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };
      
      mockQuery.mockResolvedValueOnce({ rows: [createVisitor({ status: 'rejected' })] });
      
      await controller.checkInVisitor(mockReq, mockRes);
      
      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 422, 'Visitor cannot be checked in');
    });
    
    it('should emit WebSocket event on check-in', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };
      
      mockQuery.mockResolvedValueOnce({ rows: [createVisitor()] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      await controller.checkInVisitor(mockReq, mockRes);
      
      expect(mockEmitVisitorCheckIn).toHaveBeenCalledWith(expect.objectContaining({
        id: 1,
        name: 'John Visitor'
      }));
    });
    
    it('should handle WebSocket error gracefully', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };
      
      mockQuery.mockResolvedValueOnce({ rows: [createVisitor()] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockEmitVisitorCheckIn.mockImplementationOnce(() => { throw new Error('WS error'); });
      
      await controller.checkInVisitor(mockReq, mockRes);
      
      // Should still succeed despite WebSocket error
      expect(mockRespond).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        message: 'Visitor checked in successfully'
      }));
    });
    
    it('should call audit on success', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };
      
      mockQuery.mockResolvedValueOnce({ rows: [createVisitor()] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      await controller.checkInVisitor(mockReq, mockRes);
      
      expect(mockReq.audit).toHaveBeenCalledWith(
        'visitor.checkin',
        'visitor',
        '1',
        expect.objectContaining({ outcome: 'success' })
      );
    });
    
    it('should handle database error', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };
      
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      
      await controller.checkInVisitor(mockReq, mockRes);
      
      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 500, 'Failed to check in visitor');
      expect(mockReq.audit).toHaveBeenCalledWith(
        'visitor.checkin',
        'visitor',
        null,
        expect.objectContaining({ outcome: 'fail' })
      );
    });
  });
  
  describe('checkOutVisitor', () => {
    it('should check out visitor successfully', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };
      
      const visitor = createVisitor({ status: 'on_premise' });
      mockQuery.mockResolvedValueOnce({ rows: [visitor] }); // SELECT visitor
      mockQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE
      mockQuery.mockResolvedValueOnce({ rows: [{ check_in_time: new Date(Date.now() - 3600000) }] }); // SELECT check_in_time
      
      await controller.checkOutVisitor(mockReq, mockRes);
      
      expect(mockRespond).toHaveBeenCalledWith(mockRes, {
        message: 'Visitor checked out successfully',
        check_out: expect.any(Date)
      });
      expect(mockBroadcastVisitorCheckIn).toHaveBeenCalledWith('1', 'checkout', 1);
    });
    
    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = null;
      mockReq.params = { id: '1' };
      
      await controller.checkOutVisitor(mockReq, mockRes);
      
      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 401, 'Unauthorized');
    });
    
    it('should return 403 when user is not a guard', async () => {
      mockReq.user = { id: 1, email: 'resident@test.com', role: 'resident' };
      mockReq.params = { id: '1' };
      
      await controller.checkOutVisitor(mockReq, mockRes);
      
      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 403, 'Forbidden');
    });
    
    it('should return 404 when visitor not found', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '999' };
      
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      await controller.checkOutVisitor(mockReq, mockRes);
      
      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 404, 'Visitor not found');
    });
    
    it('should return 422 when visitor not checked in', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };
      
      mockQuery.mockResolvedValueOnce({ rows: [createVisitor({ status: 'verified' })] });
      
      await controller.checkOutVisitor(mockReq, mockRes);
      
      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 422, 'Visitor not checked in');
    });
    
    it('should emit WebSocket event on check-out', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };
      
      const visitor = createVisitor({ status: 'on_premise' });
      mockQuery.mockResolvedValueOnce({ rows: [visitor] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ check_in_time: new Date() }] });
      
      await controller.checkOutVisitor(mockReq, mockRes);
      
      expect(mockEmitVisitorCheckOut).toHaveBeenCalledWith(expect.objectContaining({
        id: 1,
        name: 'John Visitor'
      }));
    });
    
    it('should handle missing check-in time', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };
      
      const visitor = createVisitor({ status: 'on_premise' });
      mockQuery.mockResolvedValueOnce({ rows: [visitor] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{}] }); // No check_in_time
      
      await controller.checkOutVisitor(mockReq, mockRes);
      
      expect(mockEmitVisitorCheckOut).toHaveBeenCalledWith(expect.objectContaining({
        duration: 'Unknown'
      }));
    });
    
    it('should handle WebSocket error gracefully', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };
      
      const visitor = createVisitor({ status: 'on_premise' });
      mockQuery.mockResolvedValueOnce({ rows: [visitor] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ check_in_time: new Date() }] });
      mockEmitVisitorCheckOut.mockImplementationOnce(() => { throw new Error('WS error'); });
      
      await controller.checkOutVisitor(mockReq, mockRes);
      
      expect(mockRespond).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        message: 'Visitor checked out successfully'
      }));
    });
    
    it('should call audit on success', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };
      
      const visitor = createVisitor({ status: 'on_premise' });
      mockQuery.mockResolvedValueOnce({ rows: [visitor] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ check_in_time: new Date() }] });
      
      await controller.checkOutVisitor(mockReq, mockRes);
      
      expect(mockReq.audit).toHaveBeenCalledWith(
        'visitor.checkout',
        'visitor',
        '1',
        expect.objectContaining({ outcome: 'success' })
      );
    });
    
    it('should handle database error', async () => {
      mockReq.user = createGuardUser();
      mockReq.params = { id: '1' };
      
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      
      await controller.checkOutVisitor(mockReq, mockRes);
      
      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 500, 'Failed to check out visitor');
    });
  });
  
  describe('selfCheckIn', () => {
    it('should self check-in visitor successfully', async () => {
      mockReq.params = { inviteCode: 'ABC123' };
      
      const visitor = createVisitor();
      mockQuery.mockResolvedValueOnce({ rows: [visitor] }); // SELECT
      mockQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE
      
      await controller.selfCheckIn(mockReq, mockRes);
      
      expect(mockRespond).toHaveBeenCalledWith(mockRes, {
        message: 'Self check-in successful',
        check_in: expect.any(Date)
      });
    });
    
    it('should return 404 when visitor not found', async () => {
      mockReq.params = { inviteCode: 'INVALID' };
      
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      await controller.selfCheckIn(mockReq, mockRes);
      
      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 404, 'Visitor not found');
    });
    
    it('should return 422 when visitor cannot be checked in', async () => {
      mockReq.params = { inviteCode: 'ABC123' };
      
      mockQuery.mockResolvedValueOnce({ rows: [createVisitor({ status: 'on_premise' })] });
      
      await controller.selfCheckIn(mockReq, mockRes);
      
      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 422, 'Visitor cannot be checked in');
    });
    
    it('should call audit on success', async () => {
      mockReq.params = { inviteCode: 'ABC123' };
      
      mockQuery.mockResolvedValueOnce({ rows: [createVisitor()] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      await controller.selfCheckIn(mockReq, mockRes);
      
      expect(mockReq.audit).toHaveBeenCalledWith(
        'visitor.selfcheckin',
        'visitor',
        '1',
        expect.objectContaining({ outcome: 'success' })
      );
    });
    
    it('should handle database error', async () => {
      mockReq.params = { inviteCode: 'ABC123' };
      
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      
      await controller.selfCheckIn(mockReq, mockRes);
      
      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 500, 'Failed to self check-in');
    });
  });
  
  describe('Exports', () => {
    it('should export checkInVisitor function', () => {
      expect(controller.checkInVisitor).toBeDefined();
      expect(typeof controller.checkInVisitor).toBe('function');
    });
    
    it('should export checkOutVisitor function', () => {
      expect(controller.checkOutVisitor).toBeDefined();
      expect(typeof controller.checkOutVisitor).toBe('function');
    });
    
    it('should export selfCheckIn function', () => {
      expect(controller.selfCheckIn).toBeDefined();
      expect(typeof controller.selfCheckIn).toBe('function');
    });
  });
});
