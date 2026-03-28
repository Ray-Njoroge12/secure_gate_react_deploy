/**
 * Worker Controller Unit Tests
 * Tests controller logic, authorization checks, and input validation
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock workerService
const mockWorkerService = {
  registerWorker: jest.fn(),
  bulkRegisterWorkers: jest.fn(),
  listWorkers: jest.fn(),
  getWorkerById: jest.fn(),
  updateWorker: jest.fn(),
  preApproveWorker: jest.fn(),
  revokeWorker: jest.fn(),
  generateWorkerPass: jest.fn(),
  getWorkerPasses: jest.fn(),
  validateWorkerPass: jest.fn(),
  revokePass: jest.fn(),
  checkInWorker: jest.fn(),
  checkOutWorker: jest.fn(),
  getActiveWorkers: jest.fn(),
  getCheckInHistory: jest.fn()
};

jest.unstable_mockModule('../../src/services/workerService.js', () => ({
  default: mockWorkerService
}));

// Mock respond utilities
const mockRespond = jest.fn();
const mockRespondError = jest.fn();
jest.unstable_mockModule('../../src/utils/respond.js', () => ({
  respond: mockRespond,
  respondError: mockRespondError,
  camelize: jest.fn(x => x),
  toCamel: jest.fn(s => s)
}));

// Mock standardizedErrorHandler
jest.unstable_mockModule('../../src/middleware/standardizedErrorHandler.js', () => ({
  asyncHandler: (fn) => fn,
  AppError: class AppError extends Error {
    constructor(message, statusCode, code) {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
    }
  }
}));

describe('WorkerController', () => {
  let controller;
  let mockReq;
  let mockRes;

  beforeEach(async () => {
    jest.clearAllMocks();
    controller = await import('../../src/controllers/workerController.js');
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    mockReq = {
      user: { id: 1, role: 'company_admin', estate_id: 1, company_id: 10 },
      params: {},
      query: {},
      body: {}
    };
  });

  describe('registerWorker', () => {
    it('should register a worker successfully', async () => {
      mockReq.body = { firstName: 'John', lastName: 'Doe', phone: '+254700000000' };
      mockWorkerService.registerWorker.mockResolvedValueOnce({ id: 1, first_name: 'John', last_name: 'Doe' });

      await controller.registerWorker(mockReq, mockRes);

      expect(mockWorkerService.registerWorker).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 10, estateId: 1, firstName: 'John', lastName: 'Doe' })
      );
      expect(mockRespond).toHaveBeenCalled();
    });

    it('should reject missing required fields', async () => {
      mockReq.body = { firstName: 'John' }; // missing lastName

      await controller.registerWorker(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 400, 'First name and last name are required');
      expect(mockWorkerService.registerWorker).not.toHaveBeenCalled();
    });

    it('should block company_admin from registering workers for another company', async () => {
      mockReq.body = { firstName: 'John', lastName: 'Doe', companyId: 999 };

      await controller.registerWorker(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 403, 'You can only register workers for your own company');
    });

    it('should allow admin to register workers for any company', async () => {
      mockReq.user.role = 'admin';
      mockReq.body = { firstName: 'John', lastName: 'Doe', companyId: 999 };
      mockWorkerService.registerWorker.mockResolvedValueOnce({ id: 1 });

      await controller.registerWorker(mockReq, mockRes);

      expect(mockWorkerService.registerWorker).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 999 })
      );
      expect(mockRespond).toHaveBeenCalled();
    });
  });

  describe('bulkRegisterWorkers', () => {
    it('should reject empty workers array', async () => {
      mockReq.body = { workers: [] };
      await controller.bulkRegisterWorkers(mockReq, mockRes);
      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 400, 'Workers array is required and must not be empty');
    });

    it('should reject more than 500 workers', async () => {
      mockReq.body = { workers: new Array(501).fill({ firstName: 'A', lastName: 'B' }) };
      await controller.bulkRegisterWorkers(mockReq, mockRes);
      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 400, 'Maximum 500 workers per bulk registration');
    });

    it('should succeed with valid workers', async () => {
      mockReq.body = {
        workers: [{ firstName: 'John', lastName: 'Doe' }],
        preApproved: true
      };
      mockWorkerService.bulkRegisterWorkers.mockResolvedValueOnce({
        registered: [{ id: 1 }],
        errors: []
      });

      await controller.bulkRegisterWorkers(mockReq, mockRes);

      expect(mockWorkerService.bulkRegisterWorkers).toHaveBeenCalledWith(
        10, 1,
        expect.any(Array),
        expect.objectContaining({ preApproved: true, preApprovedBy: 1, createdBy: 1 })
      );
      expect(mockRespond).toHaveBeenCalled();
    });

    it('should block company_admin from bulk registering for another company', async () => {
      mockReq.body = { companyId: 999, workers: [{ firstName: 'A', lastName: 'B' }] };
      await controller.bulkRegisterWorkers(mockReq, mockRes);
      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 403, 'You can only register workers for your own company');
    });
  });

  describe('listWorkers', () => {
    it('should scope company_admin to their own company', async () => {
      mockReq.query = { companyId: '999' }; // trying to see another company
      mockWorkerService.listWorkers.mockResolvedValueOnce({ workers: [], total: 0 });

      await controller.listWorkers(mockReq, mockRes);

      // Should use company_id=10 (user's company), NOT 999
      expect(mockWorkerService.listWorkers).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ companyId: 10 })
      );
    });

    it('should allow admin to filter by any company', async () => {
      mockReq.user.role = 'admin';
      mockReq.query = { companyId: '999' };
      mockWorkerService.listWorkers.mockResolvedValueOnce({ workers: [], total: 0 });

      await controller.listWorkers(mockReq, mockRes);

      expect(mockWorkerService.listWorkers).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ companyId: 999 })
      );
    });
  });

  describe('getWorker', () => {
    it('should return 404 for non-existent worker', async () => {
      mockReq.params.id = '99';
      mockWorkerService.getWorkerById.mockResolvedValueOnce(null);

      await controller.getWorker(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 404, 'Worker not found');
    });

    it('should block company_admin from viewing another company\'s worker', async () => {
      mockReq.params.id = '1';
      mockWorkerService.getWorkerById.mockResolvedValueOnce({ id: 1, company_id: 999 });

      await controller.getWorker(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 403, 'Access denied');
    });

    it('should allow company_admin to view own worker', async () => {
      mockReq.params.id = '1';
      mockWorkerService.getWorkerById.mockResolvedValueOnce({ id: 1, company_id: 10 });

      await controller.getWorker(mockReq, mockRes);

      expect(mockRespond).toHaveBeenCalled();
    });
  });

  describe('updateWorker', () => {
    it('should block company_admin from updating another company\'s worker', async () => {
      mockReq.params.id = '1';
      mockReq.body = { first_name: 'Jane' };
      mockWorkerService.getWorkerById.mockResolvedValueOnce({ id: 1, company_id: 999 });

      await controller.updateWorker(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 403, 'You can only update workers in your own company');
    });
  });

  describe('preApproveWorker', () => {
    it('should pre-approve a pending worker', async () => {
      mockReq.params.id = '1';
      mockWorkerService.getWorkerById.mockResolvedValueOnce({ id: 1, company_id: 10 });
      mockWorkerService.preApproveWorker.mockResolvedValueOnce({ id: 1, status: 'active', pre_approved: true });

      await controller.preApproveWorker(mockReq, mockRes);

      expect(mockWorkerService.preApproveWorker).toHaveBeenCalledWith(1, 1, 1);
      expect(mockRespond).toHaveBeenCalled();
    });

    it('should return 404 for already active worker', async () => {
      mockReq.params.id = '1';
      mockWorkerService.getWorkerById.mockResolvedValueOnce({ id: 1, company_id: 10 });
      mockWorkerService.preApproveWorker.mockResolvedValueOnce(null);

      await controller.preApproveWorker(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 404, 'Worker not found or not in pending status');
    });
  });

  describe('revokeWorker', () => {
    it('should revoke worker and their passes', async () => {
      mockReq.params.id = '1';
      mockWorkerService.revokeWorker.mockResolvedValueOnce({ id: 1, status: 'revoked' });

      await controller.revokeWorker(mockReq, mockRes);

      expect(mockWorkerService.revokeWorker).toHaveBeenCalledWith(1, 1);
      expect(mockRespond).toHaveBeenCalled();
    });
  });

  describe('generateWorkerPass', () => {
    it('should generate pass for own company worker', async () => {
      mockReq.params.id = '1';
      mockReq.body = { passType: 'worker' };
      mockWorkerService.getWorkerById.mockResolvedValueOnce({ id: 1, company_id: 10 });
      mockWorkerService.generateWorkerPass.mockResolvedValueOnce({ id: 1, pass_code: 'wp_abc' });

      await controller.generateWorkerPass(mockReq, mockRes);

      expect(mockWorkerService.generateWorkerPass).toHaveBeenCalledWith(1, 1, expect.objectContaining({ passType: 'worker' }));
      expect(mockRespond).toHaveBeenCalled();
    });

    it('should block company_admin from generating pass for another company\'s worker', async () => {
      mockReq.params.id = '1';
      mockWorkerService.getWorkerById.mockResolvedValueOnce({ id: 1, company_id: 999 });

      await controller.generateWorkerPass(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 403, 'You can only generate passes for your own company workers');
    });
  });

  describe('getWorkerPasses', () => {
    it('should verify worker exists in estate before returning passes', async () => {
      mockReq.params.id = '1';
      mockWorkerService.getWorkerById.mockResolvedValueOnce(null);

      await controller.getWorkerPasses(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 404, 'Worker not found');
    });

    it('should block company_admin from viewing another company\'s worker passes', async () => {
      mockReq.params.id = '1';
      mockWorkerService.getWorkerById.mockResolvedValueOnce({ id: 1, company_id: 999 });

      await controller.getWorkerPasses(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 403, 'Access denied');
    });
  });

  describe('validateWorkerPass', () => {
    it('should reject missing qrToken', async () => {
      mockReq.user.role = 'guard';
      mockReq.body = {};

      await controller.validateWorkerPass(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 400, 'QR token is required');
    });

    it('should return 422 for invalid pass', async () => {
      mockReq.user.role = 'guard';
      mockReq.body = { qrToken: 'wqr_invalid' };
      mockWorkerService.validateWorkerPass.mockResolvedValueOnce({ valid: false, reason: 'Pass not found' });

      await controller.validateWorkerPass(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 422, 'Pass not found');
    });

    it('should return worker and pass info for valid pass', async () => {
      mockReq.user.role = 'guard';
      mockReq.body = { qrToken: 'wqr_valid' };
      mockWorkerService.validateWorkerPass.mockResolvedValueOnce({
        valid: true,
        canCheckIn: true,
        pass: {
          id: 1, worker_id: 5, first_name: 'John', last_name: 'Doe',
          phone: '+254700000000', worker_type: 'employee', vehicle_plate: 'KAA 123A',
          company_name: 'Test Corp', pass_type: 'worker', valid_until: null
        }
      });

      await controller.validateWorkerPass(mockReq, mockRes);

      expect(mockRespond).toHaveBeenCalledWith(mockRes, expect.objectContaining({
        valid: true,
        canCheckIn: true,
        worker: expect.objectContaining({ id: 5, firstName: 'John', companyName: 'Test Corp' })
      }));
    });
  });

  describe('checkInWorker', () => {
    it('should check in a worker', async () => {
      mockReq.user.role = 'guard';
      mockReq.params.id = '5';
      mockReq.body = { passId: 1, vehiclePlate: 'KAA 123A' };
      mockWorkerService.checkInWorker.mockResolvedValueOnce({ id: 1, worker_id: 5 });

      await controller.checkInWorker(mockReq, mockRes);

      expect(mockWorkerService.checkInWorker).toHaveBeenCalledWith(5, 1, expect.objectContaining({
        guardId: 1, passId: 1, vehiclePlate: 'KAA 123A'
      }));
      expect(mockRespond).toHaveBeenCalled();
    });
  });

  describe('checkOutWorker', () => {
    it('should check out a worker', async () => {
      mockReq.user.role = 'guard';
      mockReq.params.id = '1';
      mockWorkerService.checkOutWorker.mockResolvedValueOnce({ id: 1, check_out_time: new Date() });

      await controller.checkOutWorker(mockReq, mockRes);

      expect(mockWorkerService.checkOutWorker).toHaveBeenCalledWith(1, 1, expect.objectContaining({ guardId: 1 }));
      expect(mockRespond).toHaveBeenCalled();
    });

    it('should return 404 when no active check-in found', async () => {
      mockReq.user.role = 'guard';
      mockReq.params.id = '999';
      mockWorkerService.checkOutWorker.mockResolvedValueOnce(null);

      await controller.checkOutWorker(mockReq, mockRes);

      expect(mockRespondError).toHaveBeenCalledWith(mockRes, 404, 'Active check-in not found');
    });
  });

  describe('getActiveWorkers', () => {
    it('should return active workers for the estate', async () => {
      mockReq.user.role = 'guard';
      mockWorkerService.getActiveWorkers.mockResolvedValueOnce([{ id: 1, first_name: 'John' }]);

      await controller.getActiveWorkers(mockReq, mockRes);

      expect(mockWorkerService.getActiveWorkers).toHaveBeenCalledWith(1);
      expect(mockRespond).toHaveBeenCalled();
    });
  });

  describe('getCheckInHistory', () => {
    it('should pass query params correctly', async () => {
      mockReq.user.role = 'admin';
      mockReq.query = { companyId: '10', from: '2026-01-01', page: '2', limit: '10' };
      mockWorkerService.getCheckInHistory.mockResolvedValueOnce({ checkIns: [], page: 2, limit: 10 });

      await controller.getCheckInHistory(mockReq, mockRes);

      expect(mockWorkerService.getCheckInHistory).toHaveBeenCalledWith(1, expect.objectContaining({
        companyId: 10,
        from: '2026-01-01',
        page: 2,
        limit: 10
      }));
    });
  });
});
