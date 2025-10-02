// client/src/__tests__/adminService.test.js
import { 
  getMetrics, 
  getAuditLogs, 
  getAllResidents,
  getAllGuards,
  getVisitorLogs,
  getAccessLogs,
  getIncidents 
} from '../services/adminService';

// Mock the http service
jest.mock('../services/_http.js', () => ({
  http: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}));

import { http } from '../services/_http.js';

describe('Admin Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetrics', () => {
    test('should fetch metrics from correct endpoint', async () => {
      const mockMetrics = {
        invitesActive: 10,
        invitesExpired: 5,
        checkinsToday: 20,
        failedOtps: 2
      };
      
      http.get.mockResolvedValue(mockMetrics);
      
      const result = await getMetrics();
      
      expect(http.get).toHaveBeenCalledWith('/api/admin/metrics');
      expect(result).toEqual(mockMetrics);
    });

    test('should handle errors gracefully', async () => {
      http.get.mockRejectedValue(new Error('Network error'));
      
      await expect(getMetrics()).rejects.toThrow('Network error');
    });
  });

  describe('getAuditLogs', () => {
    test('should fetch audit logs with params', async () => {
      const mockLogs = [
        { id: 1, action: 'login', user_id: '123' },
        { id: 2, action: 'logout', user_id: '456' }
      ];
      
      http.get.mockResolvedValue(mockLogs);
      
      const result = await getAuditLogs({ page: 1, limit: 25 });
      
      expect(http.get).toHaveBeenCalledWith('/api/admin/audit-logs?page=1&limit=25');
      expect(result).toEqual(mockLogs);
    });

    test('should handle empty params', async () => {
      http.get.mockResolvedValue([]);
      
      await getAuditLogs();
      
      expect(http.get).toHaveBeenCalledWith('/api/admin/audit-logs');
    });
  });

  describe('getAllResidents', () => {
    test('should fetch all residents', async () => {
      const mockResidents = [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Doe', email: 'jane@example.com' }
      ];
      
      http.get.mockResolvedValue(mockResidents);
      
      const result = await getAllResidents();
      
      expect(http.get).toHaveBeenCalledWith('/api/admin/residents');
      expect(result).toEqual(mockResidents);
    });
  });

  describe('getAllGuards', () => {
    test('should fetch all guards', async () => {
      const mockGuards = [
        { id: 1, name: 'Guard One', post: 'Main Gate' },
        { id: 2, name: 'Guard Two', post: 'Back Gate' }
      ];
      
      http.get.mockResolvedValue(mockGuards);
      
      const result = await getAllGuards();
      
      expect(http.get).toHaveBeenCalledWith('/api/admin/guards');
      expect(result).toEqual(mockGuards);
    });
  });

  describe('getVisitorLogs', () => {
    test('should fetch visitor logs with filters', async () => {
      const mockLogs = [
        { id: 1, name: 'Visitor 1', status: 'checked-in' }
      ];
      
      http.get.mockResolvedValue(mockLogs);
      
      const result = await getVisitorLogs({ status: 'checked-in' });
      
      expect(http.get).toHaveBeenCalledWith('/api/admin/visitors?status=checked-in');
      expect(result).toEqual(mockLogs);
    });
  });

  describe('getAccessLogs', () => {
    test('should fetch access logs', async () => {
      const mockLogs = [
        { id: 1, cardId: 'CARD123', zone: 'Zone A' }
      ];
      
      http.get.mockResolvedValue(mockLogs);
      
      const result = await getAccessLogs();
      
      expect(http.get).toHaveBeenCalledWith('/api/admin/access-logs');
      expect(result).toEqual(mockLogs);
    });
  });

  describe('getIncidents', () => {
    test('should fetch incidents', async () => {
      const mockIncidents = [
        { id: 1, title: 'Security Breach', status: 'open' }
      ];
      
      http.get.mockResolvedValue(mockIncidents);
      
      const result = await getIncidents();
      
      expect(http.get).toHaveBeenCalledWith('/api/admin/incidents');
      expect(result).toEqual(mockIncidents);
    });
  });

  describe('Service Structure', () => {
    test('should not import axios directly', () => {
      const serviceCode = require('fs').readFileSync(
        require.resolve('../services/adminService.js'),
        'utf-8'
      );
      expect(serviceCode).not.toContain('import axios');
      expect(serviceCode).toContain('from \'./_http.js\'');
    });

    test('should use centralized http service', () => {
      const serviceCode = require('fs').readFileSync(
        require.resolve('../services/adminService.js'),
        'utf-8'
      );
      expect(serviceCode).toContain('http.get');
      expect(serviceCode).toContain('http.post');
    });
  });
});
