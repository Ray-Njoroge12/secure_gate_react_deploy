/**
 * Unit Tests for Admin Controller
 * 
 * Coverage:
 * - Admin metrics retrieval
 * - Audit logs retrieval
 * - Authorization checks
 * - Pagination
 * - Filtering
 * - Error handling
 * - Response formatting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getMetrics, getAuditLogs } from '../../src/controllers/adminController.js';
import { dbManager } from '../../src/database/db.enhanced.js';
import { respond, respondError } from '../../src/utils/respond.js';
import { PASS_STATUS } from '../../src/constants/statuses.js';

// Mock dependencies
vi.mock('../../src/database/db.enhanced.js', () => ({
  dbManager: {
    query: vi.fn()
  }
}));

vi.mock('../../src/utils/respond.js', () => ({
  respond: vi.fn(),
  respondError: vi.fn()
}));

vi.mock('../../src/constants/statuses.js', () => ({
  PASS_STATUS: {
    ON_PREMISE: 'ON_PREMISE',
    CHECKED_OUT: 'CHECKED_OUT',
    PENDING: 'PENDING',
    VERIFIED: 'VERIFIED'
  }
}));

describe('Admin Controller - getMetrics', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    
    req = {
      user: {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin'
      }
    };
    
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = null;

      await getMetrics(req, res);

      expect(respondError).toHaveBeenCalledWith(res, 401, 'Unauthorized');
      expect(dbManager.query).not.toHaveBeenCalled();
    });

    it('should return 401 if user email is missing', async () => {
      req.user = { id: 'user-1', role: 'admin' };
      delete req.user.email;

      await getMetrics(req, res);

      expect(respondError).toHaveBeenCalledWith(res, 401, 'Unauthorized');
      expect(dbManager.query).not.toHaveBeenCalled();
    });

    it('should return 403 if user is not admin', async () => {
      req.user.role = 'resident';

      await getMetrics(req, res);

      expect(respondError).toHaveBeenCalledWith(res, 403, 'Forbidden');
      expect(dbManager.query).not.toHaveBeenCalled();
    });

    it('should return 403 if user is guard', async () => {
      req.user.role = 'guard';

      await getMetrics(req, res);

      expect(respondError).toHaveBeenCalledWith(res, 403, 'Forbidden');
      expect(dbManager.query).not.toHaveBeenCalled();
    });

    it('should allow access for admin users', async () => {
      // Mock all database queries
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] }) // total users
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })  // residents
        .mockResolvedValueOnce({ rows: [{ count: '30' }] })  // guards
        .mockResolvedValueOnce({ rows: [{ count: '20' }] })  // admins
        .mockResolvedValueOnce({ rows: [{ count: '200' }] }) // total visitors
        .mockResolvedValueOnce({ rows: [{ count: '25' }] })  // pending
        .mockResolvedValueOnce({ rows: [{ count: '100' }] }) // verified
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })  // checked in
        .mockResolvedValueOnce({ rows: [{ count: '25' }] })  // checked out
        .mockResolvedValueOnce({ rows: [] });                 // recent visitors

      await getMetrics(req, res);

      expect(dbManager.query).toHaveBeenCalled();
      expect(respond).toHaveBeenCalled();
    });
  });

  describe('Successful Metrics Retrieval', () => {
    beforeEach(() => {
      // Setup default successful responses
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] }) // total users
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })  // residents
        .mockResolvedValueOnce({ rows: [{ count: '30' }] })  // guards
        .mockResolvedValueOnce({ rows: [{ count: '20' }] })  // admins
        .mockResolvedValueOnce({ rows: [{ count: '200' }] }) // total visitors
        .mockResolvedValueOnce({ rows: [{ count: '25' }] })  // pending
        .mockResolvedValueOnce({ rows: [{ count: '100' }] }) // verified
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })  // checked in
        .mockResolvedValueOnce({ rows: [{ count: '25' }] })  // checked out
        .mockResolvedValueOnce({ rows: [] });                 // recent visitors
    });

    it('should return complete metrics data structure', async () => {
      await getMetrics(req, res);

      expect(respond).toHaveBeenCalledWith(res, {
        data: expect.objectContaining({
          users: expect.any(Object),
          visitors: expect.any(Object),
          recentVisitors: expect.any(Array),
          timestamp: expect.any(String)
        })
      });
    });

    it('should return correct user metrics', async () => {
      await getMetrics(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.data.users).toEqual({
        totalUsers: 100,
        residents: 50,
        guards: 30,
        admins: 20
      });
    });

    it('should return correct visitor metrics', async () => {
      await getMetrics(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.data.visitors).toEqual({
        totalVisitors: 200,
        pendingVisitors: 25,
        verifiedVisitors: 100,
        checkedInVisitors: 50,
        checkedOutVisitors: 25
      });
    });

    it('should include recent visitors data', async () => {
      const recentVisitors = [
        { id: 1, name: 'John Doe', phone: '123456', email: 'john@example.com', status: 'VERIFIED', created_at: '2024-01-01' },
        { id: 2, name: 'Jane Smith', phone: '789012', email: 'jane@example.com', status: 'PENDING', created_at: '2024-01-02' }
      ];

      dbManager.query.mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })
        .mockResolvedValueOnce({ rows: [{ count: '30' }] })
        .mockResolvedValueOnce({ rows: [{ count: '20' }] })
        .mockResolvedValueOnce({ rows: [{ count: '200' }] })
        .mockResolvedValueOnce({ rows: [{ count: '25' }] })
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })
        .mockResolvedValueOnce({ rows: [{ count: '25' }] })
        .mockResolvedValueOnce({ rows: recentVisitors });

      await getMetrics(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.data.recentVisitors).toEqual(recentVisitors);
    });

    it('should include ISO timestamp', async () => {
      const beforeCall = new Date().toISOString();
      
      await getMetrics(req, res);
      
      const afterCall = new Date().toISOString();
      const callArgs = respond.mock.calls[0][1];
      
      expect(callArgs.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(callArgs.data.timestamp >= beforeCall && callArgs.data.timestamp <= afterCall).toBe(true);
    });

    it('should query database for all user roles', async () => {
      await getMetrics(req, res);

      expect(dbManager.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM users');
      expect(dbManager.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM users WHERE role = $1', ['resident']);
      expect(dbManager.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM users WHERE role = $1', ['guard']);
      expect(dbManager.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM users WHERE role = $1', ['admin']);
    });

    it('should query database for all visitor statuses', async () => {
      await getMetrics(req, res);

      expect(dbManager.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM visitors');
      expect(dbManager.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM visitors WHERE status = $1', ['PENDING']);
      expect(dbManager.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM visitors WHERE status = $1', ['VERIFIED']);
      expect(dbManager.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM visitors WHERE status = $1', [PASS_STATUS.ON_PREMISE]);
      expect(dbManager.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM visitors WHERE status = $1', [PASS_STATUS.CHECKED_OUT]);
    });

    it('should query for recent visitors with correct limit', async () => {
      await getMetrics(req, res);

      expect(dbManager.query).toHaveBeenCalledWith(
        'SELECT id, name, phone, email, status, created_at FROM visitors ORDER BY created_at DESC LIMIT 10'
      );
    });
  });

  describe('Zero Count Scenarios', () => {
    it('should handle zero users', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '200' }] })
        .mockResolvedValueOnce({ rows: [{ count: '25' }] })
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })
        .mockResolvedValueOnce({ rows: [{ count: '25' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getMetrics(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.data.users).toEqual({
        totalUsers: 0,
        residents: 0,
        guards: 0,
        admins: 0
      });
    });

    it('should handle zero visitors', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })
        .mockResolvedValueOnce({ rows: [{ count: '30' }] })
        .mockResolvedValueOnce({ rows: [{ count: '20' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getMetrics(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.data.visitors).toEqual({
        totalVisitors: 0,
        pendingVisitors: 0,
        verifiedVisitors: 0,
        checkedInVisitors: 0,
        checkedOutVisitors: 0
      });
    });

    it('should handle no recent visitors', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })
        .mockResolvedValueOnce({ rows: [{ count: '30' }] })
        .mockResolvedValueOnce({ rows: [{ count: '20' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getMetrics(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.data.recentVisitors).toEqual([]);
    });
  });

  describe('Large Number Handling', () => {
    it('should handle large user counts', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ count: '999999' }] })
        .mockResolvedValueOnce({ rows: [{ count: '500000' }] })
        .mockResolvedValueOnce({ rows: [{ count: '300000' }] })
        .mockResolvedValueOnce({ rows: [{ count: '199999' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getMetrics(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.data.users.totalUsers).toBe(999999);
    });

    it('should parse string counts to integers correctly', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ count: '12345' }] })
        .mockResolvedValueOnce({ rows: [{ count: '5000' }] })
        .mockResolvedValueOnce({ rows: [{ count: '3000' }] })
        .mockResolvedValueOnce({ rows: [{ count: '2000' }] })
        .mockResolvedValueOnce({ rows: [{ count: '67890' }] })
        .mockResolvedValueOnce({ rows: [{ count: '1234' }] })
        .mockResolvedValueOnce({ rows: [{ count: '5678' }] })
        .mockResolvedValueOnce({ rows: [{ count: '9012' }] })
        .mockResolvedValueOnce({ rows: [{ count: '3456' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getMetrics(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(typeof callArgs.data.users.totalUsers).toBe('number');
      expect(typeof callArgs.data.visitors.totalVisitors).toBe('number');
      expect(callArgs.data.users.totalUsers).toBe(12345);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection error', async () => {
      const dbError = new Error('Database connection failed');
      dbManager.query.mockRejectedValue(dbError);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await getMetrics(req, res);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching admin metrics:', dbError);
      expect(respondError).toHaveBeenCalledWith(res, 500, 'Failed to fetch metrics');
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle query execution error', async () => {
      const queryError = new Error('Query execution failed');
      dbManager.query.mockRejectedValue(queryError);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await getMetrics(req, res);

      expect(respondError).toHaveBeenCalledWith(res, 500, 'Failed to fetch metrics');
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle partial query failure', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })
        .mockRejectedValueOnce(new Error('Query failed'));
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await getMetrics(req, res);

      expect(respondError).toHaveBeenCalledWith(res, 500, 'Failed to fetch metrics');
      
      consoleErrorSpy.mockRestore();
    });
  });
});

describe('Admin Controller - getAuditLogs', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    
    req = {
      user: {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin'
      },
      query: {}
    };
    
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = null;

      await getAuditLogs(req, res);

      expect(respondError).toHaveBeenCalledWith(res, 401, 'Unauthorized');
      expect(dbManager.query).not.toHaveBeenCalled();
    });

    it('should return 401 if user email is missing', async () => {
      req.user = { id: 'user-1', role: 'admin' };
      delete req.user.email;

      await getAuditLogs(req, res);

      expect(respondError).toHaveBeenCalledWith(res, 401, 'Unauthorized');
      expect(dbManager.query).not.toHaveBeenCalled();
    });

    it('should return 403 if user is not admin', async () => {
      req.user.role = 'resident';

      await getAuditLogs(req, res);

      expect(respondError).toHaveBeenCalledWith(res, 403, 'Forbidden');
      expect(dbManager.query).not.toHaveBeenCalled();
    });

    it('should return 403 if user is guard', async () => {
      req.user.role = 'guard';

      await getAuditLogs(req, res);

      expect(respondError).toHaveBeenCalledWith(res, 403, 'Forbidden');
      expect(dbManager.query).not.toHaveBeenCalled();
    });

    it('should allow access for admin users', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await getAuditLogs(req, res);

      expect(dbManager.query).toHaveBeenCalled();
      expect(respond).toHaveBeenCalled();
    });
  });

  describe('Pagination - Default Values', () => {
    beforeEach(() => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '100' }] });
    });

    it('should use default page 1 if not provided', async () => {
      await getAuditLogs(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.pagination.page).toBe(1);
    });

    it('should use default limit 25 if not provided', async () => {
      await getAuditLogs(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.pagination.limit).toBe(25);
    });

    it('should calculate offset correctly with defaults', async () => {
      await getAuditLogs(req, res);

      // Check the query call for LIMIT and OFFSET
      const queryCall = dbManager.query.mock.calls[0];
      const params = queryCall[1];
      
      expect(params[params.length - 2]).toBe(25); // limit
      expect(params[params.length - 1]).toBe(0);  // offset (page 1, offset 0)
    });
  });

  describe('Pagination - Custom Values', () => {
    it('should use custom page value', async () => {
      req.query.page = '3';
      
      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '100' }] });

      await getAuditLogs(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.pagination.page).toBe(3);
    });

    it('should use custom limit value', async () => {
      req.query.limit = '50';
      
      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '100' }] });

      await getAuditLogs(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.pagination.limit).toBe(50);
    });

    it('should calculate offset correctly for page 2', async () => {
      req.query.page = '2';
      req.query.limit = '25';
      
      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '100' }] });

      await getAuditLogs(req, res);

      const queryCall = dbManager.query.mock.calls[0];
      const params = queryCall[1];
      
      expect(params[params.length - 2]).toBe(25); // limit
      expect(params[params.length - 1]).toBe(25); // offset = (2-1) * 25
    });

    it('should calculate offset correctly for page 5 with limit 10', async () => {
      req.query.page = '5';
      req.query.limit = '10';
      
      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '100' }] });

      await getAuditLogs(req, res);

      const queryCall = dbManager.query.mock.calls[0];
      const params = queryCall[1];
      
      expect(params[params.length - 2]).toBe(10); // limit
      expect(params[params.length - 1]).toBe(40); // offset = (5-1) * 10
    });

    it('should calculate total pages correctly', async () => {
      req.query.limit = '25';
      
      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '100' }] });

      await getAuditLogs(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.pagination.pages).toBe(4); // 100 / 25 = 4
    });

    it('should round up pages for partial page', async () => {
      req.query.limit = '30';
      
      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '100' }] });

      await getAuditLogs(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.pagination.pages).toBe(4); // Math.ceil(100 / 30) = 4
    });
  });

  describe('Filtering - Action', () => {
    it('should filter by action parameter', async () => {
      req.query.action = 'LOGIN';
      
      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '10' }] });

      await getAuditLogs(req, res);

      const queryCall = dbManager.query.mock.calls[0];
      expect(queryCall[0]).toContain('AND action ILIKE');
      expect(queryCall[1]).toContain('%LOGIN%');
    });

    it('should support partial action matching', async () => {
      req.query.action = 'LOG';
      
      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '20' }] });

      await getAuditLogs(req, res);

      const queryCall = dbManager.query.mock.calls[0];
      expect(queryCall[1]).toContain('%LOG%');
    });

    it('should be case-insensitive for action filter', async () => {
      req.query.action = 'login';
      
      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] });

      await getAuditLogs(req, res);

      const queryCall = dbManager.query.mock.calls[0];
      expect(queryCall[0]).toContain('ILIKE');
    });
  });

  describe('Filtering - User ID', () => {
    it('should filter by user_id parameter', async () => {
      req.query.user_id = 'user-123';
      
      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '15' }] });

      await getAuditLogs(req, res);

      const queryCall = dbManager.query.mock.calls[0];
      expect(queryCall[0]).toContain('AND user_id =');
      expect(queryCall[1]).toContain('user-123');
    });

    it('should use exact match for user_id', async () => {
      req.query.user_id = 'admin-456';
      
      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '8' }] });

      await getAuditLogs(req, res);

      const queryCall = dbManager.query.mock.calls[0];
      expect(queryCall[1]).toContain('admin-456');
    });
  });

  describe('Filtering - Date', () => {
    it('should filter by date parameter', async () => {
      req.query.date = '2024-01-15';
      
      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '30' }] });

      await getAuditLogs(req, res);

      const queryCall = dbManager.query.mock.calls[0];
      expect(queryCall[0]).toContain('AND DATE(created_at) =');
      expect(queryCall[1]).toContain('2024-01-15');
    });

    it('should match entire day for date filter', async () => {
      req.query.date = '2024-12-25';
      
      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '50' }] });

      await getAuditLogs(req, res);

      const queryCall = dbManager.query.mock.calls[0];
      expect(queryCall[0]).toContain('DATE(created_at)');
    });
  });

  describe('Combined Filtering', () => {
    it('should apply multiple filters together', async () => {
      req.query.action = 'UPDATE';
      req.query.user_id = 'admin-789';
      req.query.date = '2024-03-01';
      
      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] });

      await getAuditLogs(req, res);

      const queryCall = dbManager.query.mock.calls[0];
      const query = queryCall[0];
      const params = queryCall[1];
      
      expect(query).toContain('AND action ILIKE');
      expect(query).toContain('AND user_id =');
      expect(query).toContain('AND DATE(created_at) =');
      expect(params).toContain('%UPDATE%');
      expect(params).toContain('admin-789');
      expect(params).toContain('2024-03-01');
    });

    it('should work with action and user_id only', async () => {
      req.query.action = 'DELETE';
      req.query.user_id = 'admin-999';
      
      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '3' }] });

      await getAuditLogs(req, res);

      const queryCall = dbManager.query.mock.calls[0];
      expect(queryCall[1]).toContain('%DELETE%');
      expect(queryCall[1]).toContain('admin-999');
    });

    it('should work with user_id and date only', async () => {
      req.query.user_id = 'user-555';
      req.query.date = '2024-06-15';
      
      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '12' }] });

      await getAuditLogs(req, res);

      const queryCall = dbManager.query.mock.calls[0];
      expect(queryCall[1]).toContain('user-555');
      expect(queryCall[1]).toContain('2024-06-15');
    });
  });

  describe('Successful Logs Retrieval', () => {
    it('should return audit logs data', async () => {
      const mockLogs = [
        { id: 1, action: 'LOGIN', user_id: 'user-1', created_at: '2024-01-01' },
        { id: 2, action: 'LOGOUT', user_id: 'user-2', created_at: '2024-01-02' }
      ];

      dbManager.query
        .mockResolvedValueOnce({ rows: mockLogs })
        .mockResolvedValueOnce({ rows: [{ count: '100' }] });

      await getAuditLogs(req, res);

      expect(respond).toHaveBeenCalledWith(res, {
        data: mockLogs,
        pagination: expect.any(Object)
      });
    });

    it('should return empty array when no logs found', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await getAuditLogs(req, res);

      expect(respond).toHaveBeenCalledWith(res, {
        data: [],
        pagination: expect.objectContaining({
          total: 0,
          pages: 0
        })
      });
    });

    it('should include complete pagination info', async () => {
      req.query.page = '2';
      req.query.limit = '20';

      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '150' }] });

      await getAuditLogs(req, res);

      expect(respond).toHaveBeenCalledWith(res, {
        data: [],
        pagination: {
          page: 2,
          limit: 20,
          total: 150,
          pages: 8 // Math.ceil(150 / 20)
        }
      });
    });

    it('should order logs by created_at DESC', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '50' }] });

      await getAuditLogs(req, res);

      const queryCall = dbManager.query.mock.calls[0];
      expect(queryCall[0]).toContain('ORDER BY created_at DESC');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection error', async () => {
      const dbError = new Error('Database connection failed');
      dbManager.query.mockRejectedValue(dbError);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await getAuditLogs(req, res);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching audit logs:', dbError);
      expect(respondError).toHaveBeenCalledWith(res, 500, 'Failed to fetch audit logs');
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle query execution error', async () => {
      const queryError = new Error('Query execution failed');
      dbManager.query.mockRejectedValue(queryError);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await getAuditLogs(req, res);

      expect(respondError).toHaveBeenCalledWith(res, 500, 'Failed to fetch audit logs');
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle error in count query', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('Count query failed'));
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await getAuditLogs(req, res);

      expect(respondError).toHaveBeenCalledWith(res, 500, 'Failed to fetch audit logs');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large page numbers', async () => {
      req.query.page = '1000';
      req.query.limit = '25';

      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '100' }] });

      await getAuditLogs(req, res);

      const queryCall = dbManager.query.mock.calls[0];
      const params = queryCall[1];
      
      expect(params[params.length - 1]).toBe(24975); // offset = (1000-1) * 25
    });

    it('should handle very large limit values', async () => {
      req.query.limit = '1000';

      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '5000' }] });

      await getAuditLogs(req, res);

      const queryCall = dbManager.query.mock.calls[0];
      const params = queryCall[1];
      
      expect(params[params.length - 2]).toBe(1000);
    });

    it('should handle string values for page and limit', async () => {
      req.query.page = '3';
      req.query.limit = '50';

      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '200' }] });

      await getAuditLogs(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(typeof callArgs.pagination.page).toBe('number');
      expect(typeof callArgs.pagination.limit).toBe('number');
      expect(callArgs.pagination.page).toBe(3);
      expect(callArgs.pagination.limit).toBe(50);
    });

    it('should handle empty string filters gracefully', async () => {
      req.query.action = '';
      req.query.user_id = '';

      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '100' }] });

      await getAuditLogs(req, res);

      // Should not add empty filters
      const queryCall = dbManager.query.mock.calls[0];
      const query = queryCall[0];
      
      // Empty strings are falsy, so filters should not be added
      expect(query).not.toContain('%%'); // No empty ILIKE pattern
    });
  });
});

describe('Admin Controller - Module Exports', () => {
  it('should export getMetrics function', async () => {
    const adminControllerModule = await import('../../src/controllers/adminController.js');
    
    expect(adminControllerModule.getMetrics).toBeDefined();
    expect(typeof adminControllerModule.getMetrics).toBe('function');
  });

  it('should export getAuditLogs function', async () => {
    const adminControllerModule = await import('../../src/controllers/adminController.js');
    
    expect(adminControllerModule.getAuditLogs).toBeDefined();
    expect(typeof adminControllerModule.getAuditLogs).toBe('function');
  });
});
