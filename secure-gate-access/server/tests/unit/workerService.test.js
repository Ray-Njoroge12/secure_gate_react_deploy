/**
 * WorkerService Unit Tests
 * Tests business logic, security fixes, and data integrity
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock dbManager before importing service
const mockQuery = jest.fn();
const mockTransaction = jest.fn();

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: {
    query: mockQuery,
    transaction: mockTransaction
  }
}));

jest.unstable_mockModule('../../src/utils/tokenHelper.js', () => ({
  generateSecureToken: jest.fn(() => 'mock-secure-token-abc123')
}));

jest.unstable_mockModule('qrcode', () => ({
  default: { toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,mockqr')) }
}));

const { default: workerService } = await import('../../src/services/workerService.js');

describe('WorkerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =============================================
  // Bug Fix #2: updateWorker should NOT allow status changes
  // =============================================
  describe('updateWorker - status field protection', () => {
    it('should NOT update status even if passed in updates', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'pending', first_name: 'Updated' }] });

      await workerService.updateWorker(1, 100, { status: 'active', first_name: 'Updated' });

      const sql = mockQuery.mock.calls[0][0];
      expect(sql).not.toContain('status');
      expect(sql).toContain('first_name');
    });

    it('should return null if no allowed fields provided', async () => {
      const result = await workerService.updateWorker(1, 100, { status: 'active' });
      expect(result).toBeNull();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should allow legitimate field updates', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await workerService.updateWorker(1, 100, {
        first_name: 'John',
        last_name: 'Doe',
        phone: '0712345678',
        vehicle_plate: 'KAA 123A'
      });

      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toContain('first_name');
      expect(sql).toContain('last_name');
      expect(sql).toContain('phone');
      expect(sql).toContain('vehicle_plate');
    });
  });

  // =============================================
  // Bug Fix #4: checkInWorker must validate worker & company status
  // =============================================
  describe('checkInWorker - status validation', () => {
    it('should throw if worker not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // getWorkerById returns null

      await expect(
        workerService.checkInWorker(999, 100, { guardId: 1 })
      ).rejects.toThrow('Worker not found');
    });

    it('should throw if worker status is revoked', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'revoked', company_status: 'approved' }] });

      await expect(
        workerService.checkInWorker(1, 100, { guardId: 1 })
      ).rejects.toThrow('Worker access is not active');
    });

    it('should throw if worker status is pending', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'pending', company_status: 'approved' }] });

      await expect(
        workerService.checkInWorker(1, 100, { guardId: 1 })
      ).rejects.toThrow('Worker access is not active');
    });

    it('should throw if company is not approved', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'active', company_status: 'suspended' }] });

      await expect(
        workerService.checkInWorker(1, 100, { guardId: 1 })
      ).rejects.toThrow('Company is not approved for estate access');
    });

    it('should throw if worker already checked in', async () => {
      // getWorkerById
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'active', company_status: 'approved' }] });
      // existing check-in query
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 5 }] });

      await expect(
        workerService.checkInWorker(1, 100, { guardId: 1 })
      ).rejects.toThrow('Worker is already checked in');
    });

    it('should succeed for active worker with approved company', async () => {
      // getWorkerById
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'active', company_status: 'approved' }] });
      // existing check-in query (none)
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // insert check-in
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 10, worker_id: 1, check_in_time: new Date() }] });

      const result = await workerService.checkInWorker(1, 100, { guardId: 1, passId: 5 });
      expect(result).toBeDefined();
      expect(result.id).toBe(10);
    });
  });

  // =============================================
  // Bug Fix #8: bulkRegisterWorkers uses transaction
  // =============================================
  describe('bulkRegisterWorkers - transaction handling', () => {
    it('should call dbManager.transaction for atomicity', async () => {
      const mockClient = { query: jest.fn() };
      mockTransaction.mockImplementation(async (callback) => {
        await callback(mockClient);
      });
      mockClient.query.mockResolvedValue({ rows: [{ id: 1 }] });

      const workers = [
        { first_name: 'Worker1', last_name: 'One', phone: '0700000001' },
        { first_name: 'Worker2', last_name: 'Two', phone: '0700000002' }
      ];

      const result = await workerService.bulkRegisterWorkers(1, 100, workers, {
        preApproved: true,
        preApprovedBy: 5,
        createdBy: 5
      });

      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(result.registered).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect individual errors without failing entire batch', async () => {
      const mockClient = { query: jest.fn() };
      mockTransaction.mockImplementation(async (callback) => {
        await callback(mockClient);
      });
      // First succeeds, second fails
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockRejectedValueOnce(new Error('Duplicate id_number'));

      const workers = [
        { first_name: 'Good', last_name: 'Worker' },
        { first_name: 'Dup', last_name: 'Worker' }
      ];

      const result = await workerService.bulkRegisterWorkers(1, 100, workers, {
        preApproved: false,
        createdBy: 5
      });

      expect(result.registered).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Duplicate');
    });
  });

  // =============================================
  // Pass management
  // =============================================
  describe('generateWorkerPass', () => {
    it('should throw if worker not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        workerService.generateWorkerPass(999, 100)
      ).rejects.toThrow('Worker not found');
    });

    it('should throw if worker is not active', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'pending' }] });

      await expect(
        workerService.generateWorkerPass(1, 100)
      ).rejects.toThrow('Worker must be active to generate a pass');
    });

    it('should generate pass for active worker', async () => {
      // getWorkerById
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'active', company_status: 'approved' }] });
      // insert pass
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, pass_code: 'wp_abc', qr_token: 'wqr_xyz', status: 'active' }] });

      const pass = await workerService.generateWorkerPass(1, 100, { issuedBy: 5 });
      expect(pass.status).toBe('active');
    });
  });

  describe('validateWorkerPass', () => {
    it('should return invalid if pass not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await workerService.validateWorkerPass('invalid_token', 100);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Pass not found');
    });

    it('should return invalid if pass is revoked', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ status: 'revoked', worker_status: 'active', company_status: 'approved' }] });

      const result = await workerService.validateWorkerPass('token', 100);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Pass is not active');
    });

    it('should return invalid if pass expired', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{
        status: 'active',
        valid_until: '2020-01-01',
        worker_status: 'active',
        company_status: 'approved'
      }] });

      const result = await workerService.validateWorkerPass('token', 100);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Pass has expired');
    });

    it('should return invalid if worker access is revoked', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{
        status: 'active',
        valid_until: null,
        worker_status: 'revoked',
        company_status: 'approved'
      }] });

      const result = await workerService.validateWorkerPass('token', 100);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Worker access is not active');
    });

    it('should return invalid if company is suspended', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{
        status: 'active',
        valid_until: null,
        worker_status: 'active',
        company_status: 'suspended'
      }] });

      const result = await workerService.validateWorkerPass('token', 100);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Company is not approved');
    });

    it('should return valid for good pass', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{
        status: 'active',
        valid_until: null,
        worker_status: 'active',
        company_status: 'approved',
        first_name: 'John'
      }] });

      const result = await workerService.validateWorkerPass('token', 100);
      expect(result.valid).toBe(true);
      expect(result.canCheckIn).toBe(true);
    });
  });

  // =============================================
  // Revoke worker (cascading pass revocation)
  // =============================================
  describe('revokeWorker', () => {
    it('should revoke worker and all active passes', async () => {
      // Update worker status
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'revoked' }] });
      // Revoke passes
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await workerService.revokeWorker(1, 100);
      expect(result.status).toBe('revoked');
      expect(mockQuery).toHaveBeenCalledTimes(2);

      const passRevokeSql = mockQuery.mock.calls[1][0];
      expect(passRevokeSql).toContain('worker_passes');
      expect(passRevokeSql).toContain("status = 'revoked'");
    });

    it('should not revoke passes if worker not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await workerService.revokeWorker(999, 100);
      expect(result).toBeNull();
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  // =============================================
  // listWorkers - parameter indexing
  // =============================================
  describe('listWorkers - parameterized queries', () => {
    it('should handle all filter combinations correctly', async () => {
      // data query
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // count query
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '1' }] });

      await workerService.listWorkers(100, {
        companyId: 5,
        status: 'active',
        workerType: 'employee',
        search: 'John',
        page: 1,
        limit: 10
      });

      // Data query params: [100, 5, 'active', 'employee', '%John%', 10, 0]
      const dataParams = mockQuery.mock.calls[0][1];
      expect(dataParams).toEqual([100, 5, 'active', 'employee', '%John%', 10, 0]);

      // Count query params: [100, 5, 'active', 'employee', '%John%'] (no limit/offset)
      const countParams = mockQuery.mock.calls[1][1];
      expect(countParams).toEqual([100, 5, 'active', 'employee', '%John%']);
    });

    it('should handle no filters', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const result = await workerService.listWorkers(100);

      const dataParams = mockQuery.mock.calls[0][1];
      expect(dataParams).toEqual([100, 20, 0]); // estateId, limit, offset
      expect(result.total).toBe(0);
    });
  });
});
