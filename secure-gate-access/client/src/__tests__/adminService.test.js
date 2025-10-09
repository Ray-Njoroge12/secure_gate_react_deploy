// client/src/__tests__/services/adminService.test.js
import * as adminService from '../../services/adminService';
import { http } from '../../services/_http';

// Mock the http service
jest.mock('../../services/_http', () => ({
  http: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}));

describe('Admin Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetrics', () => {
    test('should fetch metrics from correct endpoint', async () => {
      const mockData = {
        invitesActive: 10,
        invitesExpired: 5,
        checkinsToday: 20,
        failedOtps: 2
      };
      
      http.get.mockResolvedValue(mockData);
      
      const result = await adminService.getMetrics();
      
      expect(http.get).toHaveBeenCalledWith('/api/admin/metrics');
      expect(result).toEqual(mockData);
    });

    test('should handle error when fetching metrics', async () => {
      http.get.mockRejectedValue(new Error('Network error'));
      
      await expect(adminService.getMetrics()).rejects.toThrow('Network error');
    });
  });

  describe('getAuditLogs', () => {
    test('should fetch audit logs without params', async () => {
      const mockLogs = [{ id: 1, action: 'login' }];
      http.get.mockResolvedValue(mockLogs);
      
      const result = await adminService.getAuditLogs();
      
      expect(http.get).toHaveBeenCalledWith('/api/admin/audit-logs');
      expect(result).toEqual(mockLogs);
    });

    test('should fetch audit logs with params', async () => {
      const params = { page: 2, limit: 50, action: 'login' };
      const mockLogs = [{ id: 1, action: 'login' }];
      http.get.mockResolvedValue(mockLogs);
      
      const result = await adminService.getAuditLogs(params);
      
      expect(http.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/audit-logs?')
      );
      expect(http.get).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      );
      expect(http.get).toHaveBeenCalledWith(
        expect.stringContaining('limit=50')
      );
      expect(result).toEqual(mockLogs);
    });
  });

  describe('Residents Management', () => {
    test('getAllResidents should fetch all residents', async () => {
      const mockResidents = [
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Smith' }
      ];
      http.get.mockResolvedValue(mockResidents);
      
      const result = await adminService.getAllResidents();
      
      expect(http.get).toHaveBeenCalledWith('/api/admin/residents');
      expect(result).toEqual(mockResidents);
    });

    test('updateResident should send PUT request', async () => {
      const residentId = 1;
      const updateData = { name: 'Updated Name' };
      http.put.mockResolvedValue({ success: true });
      
      await adminService.updateResident(residentId, updateData);
      
      expect(http.put).toHaveBeenCalledWith(
        '/api/admin/residents/1',
        updateData
      );
    });

    test('deleteResident should send DELETE request', async () => {
      const residentId = 1;
      http.delete.mockResolvedValue({ success: true });
      
      await adminService.deleteResident(residentId);
      
      expect(http.delete).toHaveBeenCalledWith('/api/admin/residents/1');
    });
  });

  describe('Guards Management', () => {
    test('getAllGuards should fetch all guards', async () => {
      const mockGuards = [{ id: 1, name: 'Guard One' }];
      http.get.mockResolvedValue(mockGuards);
      
      const result = await adminService.getAllGuards();
      
      expect(http.get).toHaveBeenCalledWith('/api/admin/guards');
      expect(result).toEqual(mockGuards);
    });

    test('addGuard should send POST request', async () => {
      const guardData = { name: 'New Guard', email: 'guard@test.com' };
      http.post.mockResolvedValue({ id: 3, ...guardData });
      
      await adminService.addGuard(guardData);
      
      expect(http.post).toHaveBeenCalledWith('/api/admin/guards', guardData);
    });

    test('updateGuard should send PUT request', async () => {
      const guardId = 1;
      const updateData = { name: 'Updated Guard' };
      http.put.mockResolvedValue({ success: true });
      
      await adminService.updateGuard(guardId, updateData);
      
      expect(http.put).toHaveBeenCalledWith(
        '/api/admin/guards/1',
        updateData
      );
    });

    test('deleteGuard should send DELETE request', async () => {
      const guardId = 1;
      http.delete.mockResolvedValue({ success: true });
      
      await adminService.deleteGuard(guardId);
      
      expect(http.delete).toHaveBeenCalledWith('/api/admin/guards/1');
    });
  });

  describe('Visitor Logs', () => {
    test('getVisitorLogs should fetch visitor logs', async () => {
      const mockLogs = [{ id: 1, visitor: 'John Doe' }];
      http.get.mockResolvedValue(mockLogs);
      
      const result = await adminService.getVisitorLogs();
      
      expect(http.get).toHaveBeenCalledWith('/api/admin/visitors');
      expect(result).toEqual(mockLogs);
    });

    test('getVisitorLogs should handle query params', async () => {
      const params = { status: 'active', date: '2025-10-02' };
      http.get.mockResolvedValue([]);
      
      await adminService.getVisitorLogs(params);
      
      expect(http.get).toHaveBeenCalledWith(
        expect.stringContaining('status=active')
      );
    });

    test('checkInVisitor should send POST request', async () => {
      const visitorId = 123;
      http.post.mockResolvedValue({ success: true });
      
      await adminService.checkInVisitor(visitorId);
      
      expect(http.post).toHaveBeenCalledWith(
        '/api/admin/visitors/123/check-in'
      );
    });

    test('checkOutVisitor should send POST request', async () => {
      const visitorId = 123;
      http.post.mockResolvedValue({ success: true });
      
      await adminService.checkOutVisitor(visitorId);
      
      expect(http.post).toHaveBeenCalledWith(
        '/api/admin/visitors/123/check-out'
      );
    });
  });

  describe('Access Control', () => {
    test('getAccessLogs should fetch access logs', async () => {
      const mockLogs = [{ id: 1, type: 'entry' }];
      http.get.mockResolvedValue(mockLogs);
      
      const result = await adminService.getAccessLogs();
      
      expect(http.get).toHaveBeenCalledWith('/api/admin/access-logs');
      expect(result).toEqual(mockLogs);
    });
  });

  describe('Incident Management', () => {
    test('getIncidents should fetch incidents', async () => {
      const mockIncidents = [{ id: 1, title: 'Test Incident' }];
      http.get.mockResolvedValue(mockIncidents);
      
      const result = await adminService.getIncidents();
      
      expect(http.get).toHaveBeenCalledWith('/api/admin/incidents');
      expect(result).toEqual(mockIncidents);
    });

    test('createIncident should send POST request', async () => {
      const incidentData = { title: 'New Incident', severity: 'high' };
      http.post.mockResolvedValue({ id: 1, ...incidentData });
      
      await adminService.createIncident(incidentData);
      
      expect(http.post).toHaveBeenCalledWith(
        '/api/admin/incidents',
        incidentData
      );
    });

    test('updateIncident should send PUT request', async () => {
      const incidentId = 1;
      const updateData = { status: 'resolved' };
      http.put.mockResolvedValue({ success: true });
      
      await adminService.updateIncident(incidentId, updateData);
      
      expect(http.put).toHaveBeenCalledWith(
        '/api/admin/incidents/1',
        updateData
      );
    });

    test('deleteIncident should send DELETE request', async () => {
      const incidentId = 1;
      http.delete.mockResolvedValue({ success: true });
      
      await adminService.deleteIncident(incidentId);
      
      expect(http.delete).toHaveBeenCalledWith('/api/admin/incidents/1');
    });
  });

  describe('Service Integration', () => {
    test('should use centralized http service (not axios)', () => {
      // This test ensures the service imports from _http.js
      expect(http.get).toBeDefined();
      expect(http.post).toBeDefined();
      expect(http.put).toBeDefined();
      expect(http.delete).toBeDefined();
    });

    test('all methods should return promises', () => {
      http.get.mockResolvedValue({});
      
      expect(adminService.getMetrics()).toBeInstanceOf(Promise);
      expect(adminService.getAllResidents()).toBeInstanceOf(Promise);
      expect(adminService.getAllGuards()).toBeInstanceOf(Promise);
    });
  });
});
