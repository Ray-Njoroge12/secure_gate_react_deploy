/**
 * Unit Tests for System Health Service (Client)
 * 
 * Tests client-side health monitoring communication, caching,
 * real-time updates, and health status formatting.
 */

import { systemHealthService } from '../../services/systemHealthService';

// Mock apiClient
const mockApiClient = {
  get: jest.fn(),
  post: jest.fn()
};

jest.mock('../../services/apiClient', () => ({
  apiClient: mockApiClient
}));

// Mock EventSource for real-time updates
const mockEventSource = {
  onmessage: null,
  onerror: null,
  close: jest.fn()
};

global.EventSource = jest.fn(() => mockEventSource);

describe('System Health Service (Client)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    systemHealthService.cache.clear();
    global.EventSource.mockClear();
  });

  describe('Basic Health Monitoring', () => {
    test('should get system health with caching', async () => {
      const mockHealthData = {
        status: 'healthy',
        components: {
          database: { status: 'healthy', responseTime: 50 },
          redis: { status: 'healthy', responseTime: 20 }
        },
        timestamp: new Date().toISOString()
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockHealthData });

      const result = await systemHealthService.getSystemHealth();

      expect(result).toEqual(mockHealthData);
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/health/detailed');
      
      // Should cache the result
      const cachedResult = systemHealthService.getCachedData('system_health');
      expect(cachedResult).toEqual(mockHealthData);
    });

    test('should return cached data when available', async () => {
      const cachedData = { status: 'healthy', cached: true };
      systemHealthService.setCachedData('system_health', cachedData);

      const result = await systemHealthService.getSystemHealth();

      expect(result).toEqual(cachedData);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    test('should handle health check errors', async () => {
      const error = new Error('Network error');
      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(systemHealthService.getSystemHealth())
        .rejects.toThrow('Failed to fetch system health: Network error');
    });
  });

  describe('Detailed Health Reports', () => {
    test('should get detailed health report', async () => {
      const mockDetailedReport = {
        status: 'healthy',
        components: {
          database: {
            status: 'healthy',
            responseTime: 45,
            details: {
              connectionPool: { total: 5, max: 20, utilization: 25 }
            }
          }
        },
        metrics: {
          cpu: { usage: 0.6 },
          memory: { usage: 0.7 }
        }
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockDetailedReport });

      const result = await systemHealthService.getDetailedHealthReport();

      expect(result).toEqual(mockDetailedReport);
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/health/detailed');
    });

    test('should handle detailed report errors', async () => {
      const error = new Error('Server error');
      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(systemHealthService.getDetailedHealthReport())
        .rejects.toThrow('Failed to fetch detailed health report: Server error');
    });
  });

  describe('Health History', () => {
    test('should get health history with limit', async () => {
      const mockHistory = [
        { timestamp: '2025-01-15T10:00:00Z', status: 'healthy', responseTime: 150 },
        { timestamp: '2025-01-15T09:30:00Z', status: 'degraded', responseTime: 2500 }
      ];

      mockApiClient.get.mockResolvedValueOnce({ data: mockHistory });

      const result = await systemHealthService.getHealthHistory(50);

      expect(result).toEqual(mockHistory);
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/health/history', {
        params: { limit: 50 }
      });
    });

    test('should use default limit when not specified', async () => {
      mockApiClient.get.mockResolvedValueOnce({ data: [] });

      await systemHealthService.getHealthHistory();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/health/history', {
        params: { limit: 50 }
      });
    });
  });

  describe('System Metrics', () => {
    test('should get system metrics with caching', async () => {
      const mockMetrics = {
        cpu: { usage: 0.65, cores: 4 },
        memory: { usage: 0.72, total: 8589934592 },
        disk: { usage: 0.45 }
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockMetrics });

      const result = await systemHealthService.getSystemMetrics();

      expect(result).toEqual(mockMetrics);
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/health/metrics');
      
      // Should cache the result
      const cachedResult = systemHealthService.getCachedData('system_metrics');
      expect(cachedResult).toEqual(mockMetrics);
    });

    test('should handle metrics errors', async () => {
      const error = new Error('Metrics unavailable');
      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(systemHealthService.getSystemMetrics())
        .rejects.toThrow('Failed to fetch system metrics: Metrics unavailable');
    });
  });

  describe('Performance Alerts', () => {
    test('should get performance alerts with severity filter', async () => {
      const mockAlerts = [
        {
          id: 1,
          severity: 'critical',
          component: 'database',
          message: 'High response time detected',
          timestamp: '2025-01-15T10:00:00Z'
        }
      ];

      mockApiClient.get.mockResolvedValueOnce({ data: mockAlerts });

      const result = await systemHealthService.getPerformanceAlerts('critical');

      expect(result).toEqual(mockAlerts);
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/health/alerts', {
        params: { severity: 'critical' }
      });
    });

    test('should get all alerts when no severity specified', async () => {
      mockApiClient.get.mockResolvedValueOnce({ data: [] });

      await systemHealthService.getPerformanceAlerts();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/health/alerts', {
        params: {}
      });
    });

    test('should acknowledge alert', async () => {
      const alertId = 123;
      const mockResponse = { success: true, acknowledged: true };

      mockApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await systemHealthService.acknowledgeAlert(alertId);

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.post).toHaveBeenCalledWith(`/api/health/alerts/${alertId}/acknowledge`);
    });
  });

  describe('Launch Readiness', () => {
    test('should get launch readiness status', async () => {
      const mockReadiness = {
        ready: true,
        score: 95,
        checks: {
          systemHealth: true,
          lowLoad: true,
          noActiveDeployment: true
        },
        recommendations: []
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockReadiness });

      const result = await systemHealthService.getLaunchReadinessStatus();

      expect(result).toEqual(mockReadiness);
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/health/launch-readiness');
    });

    test('should handle readiness check errors', async () => {
      const error = new Error('Readiness check failed');
      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(systemHealthService.getLaunchReadinessStatus())
        .rejects.toThrow('Failed to fetch launch readiness status: Readiness check failed');
    });
  });

  describe('Manual Health Checks', () => {
    test('should trigger manual health check and clear cache', async () => {
      const mockResult = { status: 'healthy', triggered: true };
      systemHealthService.setCachedData('test_key', { cached: 'data' });

      mockApiClient.post.mockResolvedValueOnce({ data: mockResult });

      const result = await systemHealthService.triggerHealthCheck();

      expect(result).toEqual(mockResult);
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/health/check');
      expect(systemHealthService.cache.size).toBe(0); // Cache should be cleared
    });

    test('should handle manual health check errors', async () => {
      const error = new Error('Health check failed');
      mockApiClient.post.mockRejectedValueOnce(error);

      await expect(systemHealthService.triggerHealthCheck())
        .rejects.toThrow('Failed to trigger health check: Health check failed');
    });
  });

  describe('Component-Specific Health', () => {
    test('should get component health', async () => {
      const componentName = 'database';
      const mockComponentHealth = {
        status: 'healthy',
        responseTime: 45,
        details: { connectionPool: { utilization: 25 } }
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockComponentHealth });

      const result = await systemHealthService.getComponentHealth(componentName);

      expect(result).toEqual(mockComponentHealth);
      expect(mockApiClient.get).toHaveBeenCalledWith(`/api/health/components/${componentName}`);
    });

    test('should handle component health errors', async () => {
      const error = new Error('Component not found');
      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(systemHealthService.getComponentHealth('invalid'))
        .rejects.toThrow('Failed to fetch invalid health: Component not found');
    });
  });

  describe('Real-time Health Updates', () => {
    test('should subscribe to health updates with EventSource', () => {
      const mockCallback = jest.fn();
      
      const subscription = systemHealthService.subscribeToHealthUpdates(mockCallback);

      expect(global.EventSource).toHaveBeenCalledWith('/api/health/stream');
      expect(subscription.close).toBeDefined();

      // Simulate receiving a message
      const mockData = { status: 'healthy', timestamp: new Date().toISOString() };
      mockEventSource.onmessage({ data: JSON.stringify(mockData) });

      expect(mockCallback).toHaveBeenCalledWith(mockData);
    });

    test('should handle EventSource errors and fallback to polling', () => {
      const mockCallback = jest.fn();
      jest.spyOn(systemHealthService, 'startPolling').mockReturnValue({ close: jest.fn() });

      const subscription = systemHealthService.subscribeToHealthUpdates(mockCallback);

      // Simulate EventSource error
      mockEventSource.onerror(new Error('Connection failed'));

      expect(mockEventSource.close).toHaveBeenCalled();
      // Should fallback to polling after timeout
      setTimeout(() => {
        expect(systemHealthService.startPolling).toHaveBeenCalledWith(mockCallback);
      }, 5100);
    });

    test('should fallback to polling when EventSource not supported', () => {
      // Mock EventSource as undefined
      const originalEventSource = global.EventSource;
      global.EventSource = undefined;

      const mockCallback = jest.fn();
      jest.spyOn(systemHealthService, 'startPolling').mockReturnValue({ close: jest.fn() });

      const subscription = systemHealthService.subscribeToHealthUpdates(mockCallback);

      expect(systemHealthService.startPolling).toHaveBeenCalledWith(mockCallback);
      expect(subscription.close).toBeDefined();

      // Restore EventSource
      global.EventSource = originalEventSource;
    });

    test('should handle invalid JSON in EventSource messages', () => {
      const mockCallback = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      systemHealthService.subscribeToHealthUpdates(mockCallback);

      // Simulate receiving invalid JSON
      mockEventSource.onmessage({ data: 'invalid json' });

      expect(mockCallback).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse health update:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Polling Fallback', () => {
    test('should start polling for health updates', async () => {
      const mockCallback = jest.fn();
      const mockHealthData = { status: 'healthy' };

      jest.spyOn(systemHealthService, 'getSystemHealth').mockResolvedValue(mockHealthData);

      const subscription = systemHealthService.startPolling(mockCallback, 1000);

      // Should call immediately
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockCallback).toHaveBeenCalledWith(mockHealthData);

      // Should have interval set
      expect(subscription.close).toBeDefined();

      // Clean up
      subscription.close();
    });

    test('should handle polling errors gracefully', async () => {
      const mockCallback = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      jest.spyOn(systemHealthService, 'getSystemHealth').mockRejectedValue(new Error('Polling failed'));

      const subscription = systemHealthService.startPolling(mockCallback, 100);

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(consoleSpy).toHaveBeenCalledWith('Health polling error:', expect.any(Error));
      expect(mockCallback).not.toHaveBeenCalled();

      subscription.close();
      consoleSpy.mockRestore();
    });
  });

  describe('Cache Management', () => {
    test('should get cached data within timeout', () => {
      const testData = { test: 'data' };
      systemHealthService.setCachedData('test_key', testData);

      const result = systemHealthService.getCachedData('test_key');

      expect(result).toEqual(testData);
    });

    test('should return null for expired cache', () => {
      const testData = { test: 'data' };
      systemHealthService.setCachedData('test_key', testData);

      // Mock expired cache
      const cacheEntry = systemHealthService.cache.get('test_key');
      cacheEntry.timestamp = Date.now() - (systemHealthService.cacheTimeout + 1000);

      const result = systemHealthService.getCachedData('test_key');

      expect(result).toBeNull();
    });

    test('should clear all cache', () => {
      systemHealthService.setCachedData('key1', { data: 1 });
      systemHealthService.setCachedData('key2', { data: 2 });

      systemHealthService.clearCache();

      expect(systemHealthService.cache.size).toBe(0);
    });
  });

  describe('Health Status Formatting', () => {
    test('should format health status correctly', () => {
      const healthyStatus = systemHealthService.formatHealthStatus('healthy');
      expect(healthyStatus).toEqual({
        text: 'Healthy',
        color: 'green',
        icon: 'check-circle'
      });

      const degradedStatus = systemHealthService.formatHealthStatus('degraded');
      expect(degradedStatus).toEqual({
        text: 'Degraded',
        color: 'yellow',
        icon: 'alert-triangle'
      });

      const unhealthyStatus = systemHealthService.formatHealthStatus('unhealthy');
      expect(unhealthyStatus).toEqual({
        text: 'Unhealthy',
        color: 'red',
        icon: 'x-circle'
      });

      const unknownStatus = systemHealthService.formatHealthStatus('invalid');
      expect(unknownStatus).toEqual({
        text: 'Unknown',
        color: 'gray',
        icon: 'help-circle'
      });
    });
  });

  describe('Uptime Calculation', () => {
    test('should calculate uptime percentage correctly', () => {
      const healthHistory = [
        { status: 'healthy' },
        { status: 'healthy' },
        { status: 'degraded' },
        { status: 'healthy' },
        { status: 'unhealthy' }
      ];

      const uptime = systemHealthService.calculateUptimePercentage(healthHistory);

      expect(uptime).toBe(60); // 3 healthy out of 5 = 60%
    });

    test('should return 0 for empty history', () => {
      const uptime = systemHealthService.calculateUptimePercentage([]);
      expect(uptime).toBe(0);

      const uptimeNull = systemHealthService.calculateUptimePercentage(null);
      expect(uptimeNull).toBe(0);
    });
  });

  describe('Health Trend Analysis', () => {
    test('should detect declining trend', () => {
      const healthHistory = [
        { status: 'healthy' },
        { status: 'unhealthy' },
        { status: 'unhealthy' },
        { status: 'unhealthy' },
        { status: 'unhealthy' }
      ];

      const trend = systemHealthService.getHealthTrend(healthHistory);
      expect(trend).toBe('declining');
    });

    test('should detect improving trend', () => {
      const healthHistory = [
        { status: 'unhealthy' },
        { status: 'healthy' },
        { status: 'healthy' },
        { status: 'healthy' },
        { status: 'healthy' }
      ];

      const trend = systemHealthService.getHealthTrend(healthHistory);
      expect(trend).toBe('improving');
    });

    test('should detect stable trend', () => {
      const healthHistory = [
        { status: 'healthy' },
        { status: 'degraded' },
        { status: 'healthy' },
        { status: 'degraded' },
        { status: 'healthy' }
      ];

      const trend = systemHealthService.getHealthTrend(healthHistory);
      expect(trend).toBe('stable');
    });

    test('should return stable for insufficient data', () => {
      const trend = systemHealthService.getHealthTrend([{ status: 'healthy' }]);
      expect(trend).toBe('stable');

      const trendEmpty = systemHealthService.getHealthTrend([]);
      expect(trendEmpty).toBe('stable');
    });
  });

  describe('Utility Functions', () => {
    test('should format response time correctly', () => {
      expect(systemHealthService.formatResponseTime(500)).toBe('500ms');
      expect(systemHealthService.formatResponseTime(1500)).toBe('1.5s');
      expect(systemHealthService.formatResponseTime(2000)).toBe('2.0s');
    });

    test('should format bytes correctly', () => {
      expect(systemHealthService.formatBytes(0)).toBe('0 Bytes');
      expect(systemHealthService.formatBytes(1024)).toBe('1 KB');
      expect(systemHealthService.formatBytes(1048576)).toBe('1 MB');
      expect(systemHealthService.formatBytes(1073741824)).toBe('1 GB');
      expect(systemHealthService.formatBytes(1536)).toBe('1.5 KB');
    });

    test('should get severity color correctly', () => {
      expect(systemHealthService.getSeverityColor('low')).toBe('blue');
      expect(systemHealthService.getSeverityColor('normal')).toBe('green');
      expect(systemHealthService.getSeverityColor('warning')).toBe('yellow');
      expect(systemHealthService.getSeverityColor('high')).toBe('orange');
      expect(systemHealthService.getSeverityColor('critical')).toBe('red');
      expect(systemHealthService.getSeverityColor('emergency')).toBe('purple');
      expect(systemHealthService.getSeverityColor('unknown')).toBe('gray');
    });
  });
});