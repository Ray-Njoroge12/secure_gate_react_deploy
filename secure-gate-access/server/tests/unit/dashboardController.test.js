/**
 * Unit Tests for Dashboard Controller
 * 
 * Coverage:
 * - Dashboard statistics retrieval
 * - User statistics aggregation
 * - Visitor statistics aggregation
 * - Recent activity
 * - Authorization
 * - Audit logging
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getDashboardStats } from '../../src/controllers/dashboardController.js';
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

describe('Dashboard Controller - getDashboardStats', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    
    req = {
      user: {
        id: 'user-123',
        email: 'user@example.com',
        role: 'admin'
      },
      audit: vi.fn().mockResolvedValue(undefined)
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

      await getDashboardStats(req, res);

      expect(respondError).toHaveBeenCalledWith(res, 401, 'Unauthorized');
      expect(dbManager.query).not.toHaveBeenCalled();
    });

    it('should return 401 if user email is missing', async () => {
      req.user = { id: 'user-1', role: 'admin' };
      delete req.user.email;

      await getDashboardStats(req, res);

      expect(respondError).toHaveBeenCalledWith(res, 401, 'Unauthorized');
      expect(dbManager.query).not.toHaveBeenCalled();
    });

    it('should allow access for any authenticated user with email', async () => {
      req.user.role = 'resident';

      dbManager.query
        .mockResolvedValueOnce({ rows: [{ total_users: '100', residents: '50', guards: '30', admins: '20' }] })
        .mockResolvedValueOnce({ rows: [{ total_visitors: '200', pending_visitors: '25', verified_visitors: '100', checked_in_visitors: '50', checked_out_visitors: '25' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getDashboardStats(req, res);

      expect(dbManager.query).toHaveBeenCalled();
      expect(respond).toHaveBeenCalled();
    });

    it('should allow access for guard users', async () => {
      req.user.role = 'guard';

      dbManager.query
        .mockResolvedValueOnce({ rows: [{ total_users: '100', residents: '50', guards: '30', admins: '20' }] })
        .mockResolvedValueOnce({ rows: [{ total_visitors: '200', pending_visitors: '25', verified_visitors: '100', checked_in_visitors: '50', checked_out_visitors: '25' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getDashboardStats(req, res);

      expect(dbManager.query).toHaveBeenCalled();
      expect(respond).toHaveBeenCalled();
    });

    it('should allow access for admin users', async () => {
      req.user.role = 'admin';

      dbManager.query
        .mockResolvedValueOnce({ rows: [{ total_users: '100', residents: '50', guards: '30', admins: '20' }] })
        .mockResolvedValueOnce({ rows: [{ total_visitors: '200', pending_visitors: '25', verified_visitors: '100', checked_in_visitors: '50', checked_out_visitors: '25' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getDashboardStats(req, res);

      expect(dbManager.query).toHaveBeenCalled();
      expect(respond).toHaveBeenCalled();
    });
  });

  describe('Successful Stats Retrieval', () => {
    beforeEach(() => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ total_users: '100', residents: '50', guards: '30', admins: '20' }] })
        .mockResolvedValueOnce({ rows: [{ total_visitors: '200', pending_visitors: '25', verified_visitors: '100', checked_in_visitors: '50', checked_out_visitors: '25' }] })
        .mockResolvedValueOnce({ rows: [] });
    });

    it('should return complete stats structure', async () => {
      await getDashboardStats(req, res);

      expect(respond).toHaveBeenCalledWith(res, {
        data: expect.objectContaining({
          users: expect.any(Object),
          visitors: expect.any(Object),
          recent_visitors: expect.any(Array),
          timestamp: expect.any(String)
        })
      });
    });

    it('should return user statistics', async () => {
      await getDashboardStats(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.data.users).toEqual({
        total_users: '100',
        residents: '50',
        guards: '30',
        admins: '20'
      });
    });

    it('should return visitor statistics', async () => {
      await getDashboardStats(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.data.visitors).toEqual({
        total_visitors: '200',
        pending_visitors: '25',
        verified_visitors: '100',
        checked_in_visitors: '50',
        checked_out_visitors: '25'
      });
    });

    it('should return recent visitors list', async () => {
      const recentVisitors = [
        { id: 1, name: 'John Doe', phone: '123456', email: 'john@example.com', status: 'VERIFIED', created_at: '2024-01-01' },
        { id: 2, name: 'Jane Smith', phone: '789012', email: 'jane@example.com', status: 'PENDING', created_at: '2024-01-02' }
      ];

      dbManager.query
        .mockReset()
        .mockResolvedValueOnce({ rows: [{ total_users: '100', residents: '50', guards: '30', admins: '20' }] })
        .mockResolvedValueOnce({ rows: [{ total_visitors: '200', pending_visitors: '25', verified_visitors: '100', checked_in_visitors: '50', checked_out_visitors: '25' }] })
        .mockResolvedValueOnce({ rows: recentVisitors });

      await getDashboardStats(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.data.recent_visitors).toEqual(recentVisitors);
    });

    it('should include ISO timestamp', async () => {
      const beforeCall = new Date().toISOString();
      
      await getDashboardStats(req, res);
      
      const afterCall = new Date().toISOString();
      const callArgs = respond.mock.calls[0][1];
      
      expect(callArgs.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(callArgs.data.timestamp >= beforeCall && callArgs.data.timestamp <= afterCall).toBe(true);
    });
  });

  describe('Database Queries', () => {
    beforeEach(() => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ total_users: '100', residents: '50', guards: '30', admins: '20' }] })
        .mockResolvedValueOnce({ rows: [{ total_visitors: '200', pending_visitors: '25', verified_visitors: '100', checked_in_visitors: '50', checked_out_visitors: '25' }] })
        .mockResolvedValueOnce({ rows: [] });
    });

    it('should query for user statistics with aggregation', async () => {
      await getDashboardStats(req, res);

      const userStatsCall = dbManager.query.mock.calls[0];
      expect(userStatsCall[0]).toContain('SELECT');
      expect(userStatsCall[0]).toContain('COUNT(*) as total_users');
      expect(userStatsCall[0]).toContain("role = 'resident'");
      expect(userStatsCall[0]).toContain("role = 'guard'");
      expect(userStatsCall[0]).toContain("role = 'admin'");
      expect(userStatsCall[0]).toContain('FROM users');
    });

    it('should query for visitor statistics with aggregation', async () => {
      await getDashboardStats(req, res);

      const visitorStatsCall = dbManager.query.mock.calls[1];
      expect(visitorStatsCall[0]).toContain('SELECT');
      expect(visitorStatsCall[0]).toContain('COUNT(*) as total_visitors');
      expect(visitorStatsCall[0]).toContain("status = 'PENDING'");
      expect(visitorStatsCall[0]).toContain("status = 'VERIFIED'");
      expect(visitorStatsCall[0]).toContain('FROM visitors');
      expect(visitorStatsCall[1]).toEqual([PASS_STATUS.ON_PREMISE, PASS_STATUS.CHECKED_OUT]);
    });

    it('should query for recent visitors with limit 10', async () => {
      await getDashboardStats(req, res);

      const recentVisitorsCall = dbManager.query.mock.calls[2];
      expect(recentVisitorsCall[0]).toContain('SELECT id, name, phone, email, status, created_at');
      expect(recentVisitorsCall[0]).toContain('FROM visitors');
      expect(recentVisitorsCall[0]).toContain('ORDER BY created_at DESC');
      expect(recentVisitorsCall[0]).toContain('LIMIT 10');
    });

    it('should execute queries in correct order', async () => {
      await getDashboardStats(req, res);

      expect(dbManager.query).toHaveBeenCalledTimes(3);
      
      const firstCall = dbManager.query.mock.calls[0][0];
      const secondCall = dbManager.query.mock.calls[1][0];
      const thirdCall = dbManager.query.mock.calls[2][0];
      
      expect(firstCall).toContain('FROM users');
      expect(secondCall).toContain('FROM visitors');
      expect(thirdCall).toContain('ORDER BY created_at DESC');
    });
  });

  describe('Zero Statistics', () => {
    it('should handle zero users', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ total_users: '0', residents: '0', guards: '0', admins: '0' }] })
        .mockResolvedValueOnce({ rows: [{ total_visitors: '200', pending_visitors: '25', verified_visitors: '100', checked_in_visitors: '50', checked_out_visitors: '25' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getDashboardStats(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.data.users).toEqual({
        total_users: '0',
        residents: '0',
        guards: '0',
        admins: '0'
      });
    });

    it('should handle zero visitors', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ total_users: '100', residents: '50', guards: '30', admins: '20' }] })
        .mockResolvedValueOnce({ rows: [{ total_visitors: '0', pending_visitors: '0', verified_visitors: '0', checked_in_visitors: '0', checked_out_visitors: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getDashboardStats(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.data.visitors).toEqual({
        total_visitors: '0',
        pending_visitors: '0',
        verified_visitors: '0',
        checked_in_visitors: '0',
        checked_out_visitors: '0'
      });
    });

    it('should handle no recent visitors', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ total_users: '100', residents: '50', guards: '30', admins: '20' }] })
        .mockResolvedValueOnce({ rows: [{ total_visitors: '0', pending_visitors: '0', verified_visitors: '0', checked_in_visitors: '0', checked_out_visitors: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getDashboardStats(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.data.recent_visitors).toEqual([]);
    });

    it('should handle all zero statistics', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ total_users: '0', residents: '0', guards: '0', admins: '0' }] })
        .mockResolvedValueOnce({ rows: [{ total_visitors: '0', pending_visitors: '0', verified_visitors: '0', checked_in_visitors: '0', checked_out_visitors: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getDashboardStats(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.data.users.total_users).toBe('0');
      expect(callArgs.data.visitors.total_visitors).toBe('0');
      expect(callArgs.data.recent_visitors).toEqual([]);
    });
  });

  describe('Large Statistics', () => {
    it('should handle large user counts', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ total_users: '999999', residents: '500000', guards: '300000', admins: '199999' }] })
        .mockResolvedValueOnce({ rows: [{ total_visitors: '1000000', pending_visitors: '100000', verified_visitors: '500000', checked_in_visitors: '250000', checked_out_visitors: '150000' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getDashboardStats(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.data.users.total_users).toBe('999999');
      expect(callArgs.data.visitors.total_visitors).toBe('1000000');
    });

    it('should handle 10 recent visitors', async () => {
      const recentVisitors = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Visitor ${i + 1}`,
        phone: `12345${i}`,
        email: `visitor${i}@example.com`,
        status: 'VERIFIED',
        created_at: new Date(Date.now() - i * 86400000).toISOString()
      }));

      dbManager.query
        .mockResolvedValueOnce({ rows: [{ total_users: '100', residents: '50', guards: '30', admins: '20' }] })
        .mockResolvedValueOnce({ rows: [{ total_visitors: '200', pending_visitors: '25', verified_visitors: '100', checked_in_visitors: '50', checked_out_visitors: '25' }] })
        .mockResolvedValueOnce({ rows: recentVisitors });

      await getDashboardStats(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.data.recent_visitors).toHaveLength(10);
    });
  });

  describe('Audit Logging', () => {
    beforeEach(() => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ total_users: '100', residents: '50', guards: '30', admins: '20' }] })
        .mockResolvedValueOnce({ rows: [{ total_visitors: '200', pending_visitors: '25', verified_visitors: '100', checked_in_visitors: '50', checked_out_visitors: '25' }] })
        .mockResolvedValueOnce({ rows: [] });
    });

    it('should call audit function on success', async () => {
      await getDashboardStats(req, res);

      expect(req.audit).toHaveBeenCalledWith(
        'dashboard.stats',
        'dashboard',
        null,
        {
          outcome: 'success',
          message: 'Retrieved dashboard statistics'
        }
      );
    });

    it('should handle missing audit function', async () => {
      delete req.audit;

      await getDashboardStats(req, res);

      // Should not throw and should still respond
      expect(respond).toHaveBeenCalled();
    });

    it('should call audit function on failure', async () => {
      const error = new Error('Database error');
      dbManager.query.mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await getDashboardStats(req, res);

      expect(req.audit).toHaveBeenCalledWith(
        'dashboard.stats',
        'dashboard',
        null,
        {
          outcome: 'fail',
          message: 'Failed to retrieve dashboard statistics',
          error: 'Database error'
        }
      );

      consoleErrorSpy.mockRestore();
    });

    it('should continue even if audit function throws', async () => {
      req.audit.mockRejectedValue(new Error('Audit failed'));

      await getDashboardStats(req, res);

      // Should still respond successfully
      expect(respond).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection error', async () => {
      const dbError = new Error('Database connection failed');
      dbManager.query.mockRejectedValue(dbError);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await getDashboardStats(req, res);

      expect(respondError).toHaveBeenCalledWith(res, 500, 'Failed to retrieve dashboard statistics');
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle query execution error', async () => {
      const queryError = new Error('Query execution failed');
      dbManager.query.mockRejectedValue(queryError);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await getDashboardStats(req, res);

      expect(respondError).toHaveBeenCalledWith(res, 500, 'Failed to retrieve dashboard statistics');
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle error in user stats query', async () => {
      const error = new Error('User stats query failed');
      dbManager.query.mockRejectedValueOnce(error);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await getDashboardStats(req, res);

      expect(respondError).toHaveBeenCalledWith(res, 500, 'Failed to retrieve dashboard statistics');
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle error in visitor stats query', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ total_users: '100', residents: '50', guards: '30', admins: '20' }] })
        .mockRejectedValueOnce(new Error('Visitor stats query failed'));
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await getDashboardStats(req, res);

      expect(respondError).toHaveBeenCalledWith(res, 500, 'Failed to retrieve dashboard statistics');
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle error in recent visitors query', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ total_users: '100', residents: '50', guards: '30', admins: '20' }] })
        .mockResolvedValueOnce({ rows: [{ total_visitors: '200', pending_visitors: '25', verified_visitors: '100', checked_in_visitors: '50', checked_out_visitors: '25' }] })
        .mockRejectedValueOnce(new Error('Recent visitors query failed'));
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await getDashboardStats(req, res);

      expect(respondError).toHaveBeenCalledWith(res, 500, 'Failed to retrieve dashboard statistics');
      
      consoleErrorSpy.mockRestore();
    });

    it('should call failure audit log on error', async () => {
      const error = new Error('Test error');
      dbManager.query.mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await getDashboardStats(req, res);

      expect(req.audit).toHaveBeenCalledWith(
        'dashboard.stats',
        'dashboard',
        null,
        expect.objectContaining({
          outcome: 'fail',
          message: 'Failed to retrieve dashboard statistics',
          error: 'Test error'
        })
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Data Format', () => {
    it('should return data with correct structure', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ total_users: '100', residents: '50', guards: '30', admins: '20' }] })
        .mockResolvedValueOnce({ rows: [{ total_visitors: '200', pending_visitors: '25', verified_visitors: '100', checked_in_visitors: '50', checked_out_visitors: '25' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getDashboardStats(req, res);

      const callArgs = respond.mock.calls[0][1];
      
      expect(callArgs).toHaveProperty('data');
      expect(callArgs.data).toHaveProperty('users');
      expect(callArgs.data).toHaveProperty('visitors');
      expect(callArgs.data).toHaveProperty('recent_visitors');
      expect(callArgs.data).toHaveProperty('timestamp');
    });

    it('should include all user role counts', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ total_users: '100', residents: '50', guards: '30', admins: '20' }] })
        .mockResolvedValueOnce({ rows: [{ total_visitors: '200', pending_visitors: '25', verified_visitors: '100', checked_in_visitors: '50', checked_out_visitors: '25' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getDashboardStats(req, res);

      const callArgs = respond.mock.calls[0][1];
      const users = callArgs.data.users;
      
      expect(users).toHaveProperty('total_users');
      expect(users).toHaveProperty('residents');
      expect(users).toHaveProperty('guards');
      expect(users).toHaveProperty('admins');
    });

    it('should include all visitor status counts', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ total_users: '100', residents: '50', guards: '30', admins: '20' }] })
        .mockResolvedValueOnce({ rows: [{ total_visitors: '200', pending_visitors: '25', verified_visitors: '100', checked_in_visitors: '50', checked_out_visitors: '25' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getDashboardStats(req, res);

      const callArgs = respond.mock.calls[0][1];
      const visitors = callArgs.data.visitors;
      
      expect(visitors).toHaveProperty('total_visitors');
      expect(visitors).toHaveProperty('pending_visitors');
      expect(visitors).toHaveProperty('verified_visitors');
      expect(visitors).toHaveProperty('checked_in_visitors');
      expect(visitors).toHaveProperty('checked_out_visitors');
    });

    it('should include visitor details in recent visitors', async () => {
      const visitor = {
        id: 1,
        name: 'Test Visitor',
        phone: '1234567890',
        email: 'test@example.com',
        status: 'VERIFIED',
        created_at: '2024-01-01T00:00:00.000Z'
      };

      dbManager.query
        .mockResolvedValueOnce({ rows: [{ total_users: '100', residents: '50', guards: '30', admins: '20' }] })
        .mockResolvedValueOnce({ rows: [{ total_visitors: '200', pending_visitors: '25', verified_visitors: '100', checked_in_visitors: '50', checked_out_visitors: '25' }] })
        .mockResolvedValueOnce({ rows: [visitor] });

      await getDashboardStats(req, res);

      const callArgs = respond.mock.calls[0][1];
      const recentVisitor = callArgs.data.recent_visitors[0];
      
      expect(recentVisitor).toHaveProperty('id');
      expect(recentVisitor).toHaveProperty('name');
      expect(recentVisitor).toHaveProperty('phone');
      expect(recentVisitor).toHaveProperty('email');
      expect(recentVisitor).toHaveProperty('status');
      expect(recentVisitor).toHaveProperty('created_at');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values in statistics', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ total_users: null, residents: null, guards: null, admins: null }] })
        .mockResolvedValueOnce({ rows: [{ total_visitors: null, pending_visitors: null, verified_visitors: null, checked_in_visitors: null, checked_out_visitors: null }] })
        .mockResolvedValueOnce({ rows: [] });

      await getDashboardStats(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.data.users.total_users).toBe(null);
      expect(callArgs.data.visitors.total_visitors).toBe(null);
    });

    it('should handle malformed database response', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [{}] }) // Empty object
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] });

      await getDashboardStats(req, res);

      const callArgs = respond.mock.calls[0][1];
      expect(callArgs.data.users).toEqual({});
      expect(callArgs.data.visitors).toEqual({});
    });

    it('should handle empty rows array', async () => {
      dbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      // This would cause an error accessing rows[0], which should be caught
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await getDashboardStats(req, res);

      expect(respondError).toHaveBeenCalledWith(res, 500, 'Failed to retrieve dashboard statistics');

      consoleErrorSpy.mockRestore();
    });
  });
});

describe('Dashboard Controller - Module Exports', () => {
  it('should export getDashboardStats function', async () => {
    const dashboardControllerModule = await import('../../src/controllers/dashboardController.js');
    
    expect(dashboardControllerModule.getDashboardStats).toBeDefined();
    expect(typeof dashboardControllerModule.getDashboardStats).toBe('function');
  });
});
