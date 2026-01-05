/**
 * Dashboard Controller Unit Tests
 * Tests for dashboard statistics and metrics
 * Priority: P1 - Core dashboard functionality
 *
 * Coverage targets:
 * - Statements: 90%+
 * - Branches: 85%+
 * - Functions: 100%
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock database
const mockQuery = jest.fn();
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: {
    query: mockQuery
  }
}));

// Import after mocks
const { getDashboardStats } = await import('../../src/controllers/dashboardController-optimized.js');

describe('Dashboard Controller', () => {
  let mockReq;
  let mockRes;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: {
        email: 'test@example.com',
        role: 'resident'
      }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('getDashboardStats', () => {
    describe('Authentication', () => {
      it('should return 401 if user is not authenticated', async () => {
        mockReq.user = null;

        await getDashboardStats(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 401,
              message: 'Unauthorized'
            })
          })
        );
      });

      it('should return 401 if user email is missing', async () => {
        mockReq.user = { role: 'resident' };

        await getDashboardStats(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
      });
    });

    describe('Admin Dashboard', () => {
      beforeEach(() => {
        mockReq.user.role = 'admin';
      });

      it('should return admin statistics', async () => {
        // Mock database responses for admin stats
        mockQuery
          // Users by role
          .mockResolvedValueOnce({
            rows: [
              { total: '5', role: 'admin' },
              { total: '10', role: 'guard' },
              { total: '100', role: 'resident' }
            ]
          })
          // Today's visitors
          .mockResolvedValueOnce({ rows: [{ total: '15' }] })
          // Active visitors
          .mockResolvedValueOnce({ rows: [{ total: '8' }] })
          // Pending approvals
          .mockResolvedValueOnce({ rows: [{ total: '3' }] })
          // Recent check-ins (last 24h)
          .mockResolvedValueOnce({ rows: [{ total: '12' }] })
          // Weekly trend
          .mockResolvedValueOnce({
            rows: [
              { date: '2025-12-25', count: '10' },
              { date: '2025-12-26', count: '15' },
              { date: '2025-12-27', count: '12' }
            ]
          });

        await getDashboardStats(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              role: 'admin',
              stats: expect.objectContaining({
                users: expect.objectContaining({
                  total: 115,
                  byRole: {
                    admin: 5,
                    guard: 10,
                    resident: 100
                  }
                }),
                visitors: expect.objectContaining({
                  today: 15,
                  active: 8,
                  pending: 3,
                  checkInsLast24h: 12
                }),
                trends: expect.objectContaining({
                  weekly: expect.arrayContaining([
                    { date: '2025-12-25', count: 10 }
                  ])
                })
              })
            })
          })
        );
      });

      it('should handle database query errors gracefully', async () => {
        mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

        await getDashboardStats(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              message: 'Failed to get dashboard stats'
            })
          })
        );
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should handle empty database results', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [] }) // Users
          .mockResolvedValueOnce({ rows: [] }) // Today's visitors
          .mockResolvedValueOnce({ rows: [] }) // Active
          .mockResolvedValueOnce({ rows: [] }) // Pending
          .mockResolvedValueOnce({ rows: [] }) // Check-ins
          .mockResolvedValueOnce({ rows: [] }); // Weekly trend

        await getDashboardStats(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              stats: expect.objectContaining({
                users: { total: 0, byRole: {} },
                visitors: {
                  today: 0,
                  active: 0,
                  pending: 0,
                  checkInsLast24h: 0
                }
              })
            })
          })
        );
      });
    });

    describe('Guard Dashboard', () => {
      beforeEach(() => {
        mockReq.user.role = 'guard';
      });

      it('should return guard statistics', async () => {
        mockQuery
          // Expected visitors today
          .mockResolvedValueOnce({ rows: [{ total: '20' }] })
          // Checked in today
          .mockResolvedValueOnce({ rows: [{ total: '15' }] })
          // Currently on premise
          .mockResolvedValueOnce({ rows: [{ total: '10' }] })
          // Recent check-ins
          .mockResolvedValueOnce({
            rows: [
              {
                id: 1,
                name: 'John Doe',
                phone: '+254712345678',
                purpose: 'Meeting',
                check_in: '2025-12-31T10:00:00Z',
                status: 'ON_PREMISE'
              }
            ]
          });

        await getDashboardStats(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              role: 'guard',
              stats: expect.objectContaining({
                today: {
                  expected: 20,
                  checkedIn: 15,
                  onPremise: 10
                },
                recentActivity: expect.arrayContaining([
                  expect.objectContaining({
                    name: 'John Doe',
                    purpose: 'Meeting'
                  })
                ])
              })
            })
          })
        );
      });

      it('should include recent activity feed', async () => {
        const recentVisitors = [
          { id: 1, name: 'Visitor 1', phone: '+254700000001', purpose: 'Delivery', check_in: '2025-12-31T09:00:00Z', status: 'CHECKED_OUT' },
          { id: 2, name: 'Visitor 2', phone: '+254700000002', purpose: 'Meeting', check_in: '2025-12-31T10:00:00Z', status: 'ON_PREMISE' }
        ];

        mockQuery
          .mockResolvedValueOnce({ rows: [{ total: '0' }] })
          .mockResolvedValueOnce({ rows: [{ total: '0' }] })
          .mockResolvedValueOnce({ rows: [{ total: '0' }] })
          .mockResolvedValueOnce({ rows: recentVisitors });

        await getDashboardStats(mockReq, mockRes);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.data.stats.recentActivity).toHaveLength(2);
        expect(response.data.stats.recentActivity[0].name).toBe('Visitor 1');
      });
    });

    describe('Resident Dashboard', () => {
      beforeEach(() => {
        mockReq.user.role = 'resident';
        mockReq.user.email = 'resident@example.com';
      });

      it('should return resident statistics', async () => {
        mockQuery
          // Get resident ID
          .mockResolvedValueOnce({ rows: [{ id: 123 }] })
          // Total visitors
          .mockResolvedValueOnce({ rows: [{ total: '50' }] })
          // Pending visitors
          .mockResolvedValueOnce({ rows: [{ total: '5' }] })
          // Active visitors
          .mockResolvedValueOnce({ rows: [{ total: '2' }] })
          // Recent visitors
          .mockResolvedValueOnce({
            rows: [
              {
                id: 1,
                name: 'Jane Smith',
                phone: '+254712345679',
                purpose: 'Visit',
                status: 'VERIFIED',
                expected_arrival: '2025-12-31',
                created_at: '2025-12-30'
              }
            ]
          })
          // This month's visitors
          .mockResolvedValueOnce({ rows: [{ total: '20' }] });

        await getDashboardStats(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              role: 'resident',
              stats: expect.objectContaining({
                visitors: expect.objectContaining({
                  total: 50,
                  pending: 5,
                  active: 2,
                  thisMonth: 20
                }),
                recent: expect.arrayContaining([
                  expect.objectContaining({
                    name: 'Jane Smith'
                  })
                ])
              })
            })
          })
        );
      });

      it('should handle resident not found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] }); // No resident found

        await getDashboardStats(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        const response = mockRes.json.mock.calls[0][0];
        expect(response.data.stats).toHaveProperty('error', 'Resident not found');
      });

      it('should use correct resident ID for queries', async () => {
        const residentId = 456;
        mockQuery
          .mockResolvedValueOnce({ rows: [{ id: residentId }] })
          .mockResolvedValueOnce({ rows: [{ total: '0' }] })
          .mockResolvedValueOnce({ rows: [{ total: '0' }] })
          .mockResolvedValueOnce({ rows: [{ total: '0' }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ total: '0' }] }); // Monthly

        await getDashboardStats(mockReq, mockRes);

        // Verify resident ID is used in subsequent queries
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('WHERE resident_id = $1'),
          [residentId]
        );
      });
    });

    describe('Default Role Handling', () => {
      it('should default to resident role if role is undefined', async () => {
        mockReq.user.role = undefined;

        mockQuery
          .mockResolvedValueOnce({ rows: [{ id: 789 }] })
          .mockResolvedValueOnce({ rows: [{ total: '0' }] })
          .mockResolvedValueOnce({ rows: [{ total: '0' }] })
          .mockResolvedValueOnce({ rows: [{ total: '0' }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ total: '0' }] }); // Monthly

        await getDashboardStats(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        const response = mockRes.json.mock.calls[0][0];
        expect(response.data.role).toBe('resident');
      });
    });

    describe('Response Structure', () => {
      it('should include timestamp in response', async () => {
        mockReq.user.role = 'admin';

        mockQuery
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] });

        await getDashboardStats(mockReq, mockRes);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.data).toHaveProperty('timestamp');
        expect(typeof response.data.timestamp).toBe('string');
      });

      it('should include user role in response', async () => {
        mockReq.user.role = 'guard';

        mockQuery
          .mockResolvedValueOnce({ rows: [{ total: '0' }] })
          .mockResolvedValueOnce({ rows: [{ total: '0' }] })
          .mockResolvedValueOnce({ rows: [{ total: '0' }] })
          .mockResolvedValueOnce({ rows: [] });

        await getDashboardStats(mockReq, mockRes);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.data.role).toBe('guard');
      });
    });

    describe('Data Type Conversions', () => {
      it('should convert string counts to integers for admin stats', async () => {
        mockReq.user.role = 'admin';

        mockQuery
          .mockResolvedValueOnce({ rows: [{ total: '10', role: 'admin' }] })
          .mockResolvedValueOnce({ rows: [{ total: '25' }] })
          .mockResolvedValueOnce({ rows: [{ total: '5' }] })
          .mockResolvedValueOnce({ rows: [{ total: '2' }] })
          .mockResolvedValueOnce({ rows: [{ total: '8' }] })
          .mockResolvedValueOnce({ rows: [{ date: '2025-12-31', count: '20' }] });

        await getDashboardStats(mockReq, mockRes);

        const response = mockRes.json.mock.calls[0][0];
        expect(typeof response.data.stats.visitors.today).toBe('number');
        expect(response.data.stats.visitors.today).toBe(25);
        expect(typeof response.data.stats.trends.weekly[0].count).toBe('number');
      });

      it('should handle null/undefined values in database results', async () => {
        mockReq.user.role = 'admin';

        mockQuery
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ total: null }] })
          .mockResolvedValueOnce({ rows: [{}] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] });

        await getDashboardStats(mockReq, mockRes);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.data.stats.visitors.today).toBe(0);
        expect(response.data.stats.visitors.active).toBe(0);
      });
    });
  });
});
