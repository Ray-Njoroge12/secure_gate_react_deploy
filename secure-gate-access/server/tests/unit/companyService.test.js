/**
 * CompanyService Unit Tests
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock dbManager
const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: {
    query: mockQuery,
    transaction: mockTransaction
  }
}));

describe('CompanyService', () => {
  let companyService;

  beforeEach(async () => {
    jest.clearAllMocks();
    companyService = (await import('../../src/services/companyService.js')).default;
  });

  describe('registerCompany', () => {
    it('should insert a company with pending status', async () => {
      const companyData = {
        name: 'Test Corp',
        registrationNumber: 'REG-001',
        estateId: 1,
        contactName: 'John Doe',
        contactEmail: 'john@test.com',
        contactPhone: '+254700000000',
        address: '123 Street',
        description: 'A test company'
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, ...companyData, status: 'pending' }]
      });

      const result = await companyService.registerCompany(companyData);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toContain("'pending'");
      expect(mockQuery.mock.calls[0][1]).toEqual([
        'Test Corp', 'REG-001', 1, 'John Doe', 'john@test.com', '+254700000000', '123 Street', 'A test company'
      ]);
      expect(result.status).toBe('pending');
      expect(result.name).toBe('Test Corp');
    });
  });

  describe('setCompanyAdmin', () => {
    it('should link user to company WITHOUT changing role', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await companyService.setCompanyAdmin(5, 10);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      // First call: update companies.admin_user_id
      expect(mockQuery.mock.calls[0][1]).toEqual([10, 5]);
      // Second call: update users.company_id — should NOT set role
      const secondQuery = mockQuery.mock.calls[1][0];
      expect(secondQuery).toContain('company_id');
      expect(secondQuery).not.toContain("role = 'company_admin'");
    });
  });

  describe('promoteCompanyAdmin', () => {
    it('should promote the admin user to company_admin role', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await companyService.promoteCompanyAdmin(5);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toContain("role = 'company_admin'");
      expect(mockQuery.mock.calls[0][1]).toEqual([5]);
    });
  });

  describe('listCompanies', () => {
    it('should list companies without status filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Corp A' }] })
        .mockResolvedValueOnce({ rows: [{ total: '1' }] });

      const result = await companyService.listCompanies(1, { page: 1, limit: 10 });

      expect(result.companies).toHaveLength(1);
      expect(result.total).toBe(1);
      // Data query should have params [estateId, limit, offset]
      expect(mockQuery.mock.calls[0][1]).toEqual([1, 10, 0]);
      // Count query should have params [estateId]
      expect(mockQuery.mock.calls[1][1]).toEqual([1]);
    });

    it('should list companies WITH status filter and correct parameter indexing', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Corp A', status: 'pending' }] })
        .mockResolvedValueOnce({ rows: [{ total: '1' }] });

      const result = await companyService.listCompanies(1, { status: 'pending', page: 2, limit: 5 });

      expect(result.companies).toHaveLength(1);
      expect(result.page).toBe(2);
      // Data query: [estateId, status, limit, offset]
      expect(mockQuery.mock.calls[0][1]).toEqual([1, 'pending', 5, 5]);
      // Count query: [estateId, status]
      expect(mockQuery.mock.calls[1][1]).toEqual([1, 'pending']);
      // Verify the WHERE clause uses $2 for status
      expect(mockQuery.mock.calls[0][0]).toContain('c.status = $2');
      expect(mockQuery.mock.calls[1][0]).toContain('c.status = $2');
    });
  });

  describe('approveCompany', () => {
    it('should approve a pending company and promote admin', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'approved', admin_user_id: 10 }] }) // approve
        .mockResolvedValueOnce({ rows: [] }); // promoteCompanyAdmin

      const result = await companyService.approveCompany(1, 1, 99);

      expect(result).toBeTruthy();
      expect(result.status).toBe('approved');
      // Should have called promoteCompanyAdmin
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery.mock.calls[1][0]).toContain("role = 'company_admin'");
    });

    it('should return null for non-pending company', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await companyService.approveCompany(1, 1, 99);
      expect(result).toBeNull();
      // Should NOT call promoteCompanyAdmin
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('rejectCompany', () => {
    it('should reject a pending company with reason', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'rejected', rejected_reason: 'Invalid docs' }] });

      const result = await companyService.rejectCompany(1, 1, 'Invalid docs');

      expect(result.status).toBe('rejected');
      expect(mockQuery.mock.calls[0][1][0]).toBe('Invalid docs');
    });

    it('should return null for non-pending company', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await companyService.rejectCompany(1, 1, 'reason');
      expect(result).toBeNull();
    });
  });

  describe('suspendCompany', () => {
    it('should suspend an approved company', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'suspended' }] });
      const result = await companyService.suspendCompany(1, 1);
      expect(result.status).toBe('suspended');
    });

    it('should return null for non-approved company', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await companyService.suspendCompany(1, 1);
      expect(result).toBeNull();
    });
  });

  describe('updateCompany', () => {
    it('should update allowed fields', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Updated Corp' }] });

      const result = await companyService.updateCompany(1, 1, { name: 'Updated Corp', contact_email: 'new@test.com' });

      expect(result).toBeTruthy();
      expect(mockQuery.mock.calls[0][0]).toContain('name = $1');
      expect(mockQuery.mock.calls[0][0]).toContain('contact_email = $2');
    });

    it('should return null when no allowed fields provided', async () => {
      const result = await companyService.updateCompany(1, 1, { status: 'approved' });
      expect(result).toBeNull();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should ignore disallowed fields like status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Corp' }] });

      await companyService.updateCompany(1, 1, { name: 'Corp', status: 'approved', admin_user_id: 999 });

      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toContain('name = $1');
      expect(sql).not.toContain('status');
      expect(sql).not.toContain('admin_user_id');
    });
  });

  describe('addLocation', () => {
    it('should add a non-primary location', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Branch A', is_primary: false }] });

      const result = await companyService.addLocation(1, { name: 'Branch A', address: '456 Ave', isPrimary: false });

      expect(result.name).toBe('Branch A');
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should atomically unset existing primary and add new primary using CTE', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, name: 'HQ', is_primary: true }] });

      const result = await companyService.addLocation(1, { name: 'HQ', address: '789 Blvd', isPrimary: true });

      expect(result.is_primary).toBe(true);
      // Should use a single query with CTE, not two separate queries
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toContain('WITH unset AS');
    });
  });

  describe('getLocations', () => {
    it('should return locations ordered by primary first', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'HQ', is_primary: true },
          { id: 2, name: 'Branch', is_primary: false }
        ]
      });

      const result = await companyService.getLocations(1);
      expect(result).toHaveLength(2);
      expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY is_primary DESC');
    });
  });

  describe('deleteLocation', () => {
    it('should delete a location and return it', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Old Branch' }] });
      const result = await companyService.deleteLocation(1, 1);
      expect(result).toBeTruthy();
    });

    it('should return null for non-existent location', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await companyService.deleteLocation(999, 1);
      expect(result).toBeNull();
    });
  });

  describe('getCompanyById', () => {
    it('should return company with admin info (estate scoped)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Corp', estate_id: 1, admin_email: 'admin@corp.com' }]
      });

      const result = await companyService.getCompanyById(1, 1);
      expect(result.name).toBe('Corp');
      // Verify estate scoping in query
      expect(mockQuery.mock.calls[0][1]).toEqual([1, 1]);
    });

    it('should return null for wrong estate', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await companyService.getCompanyById(1, 999);
      expect(result).toBeNull();
    });
  });
});
