/**
 * @fileoverview Unit Tests for Performance Monitoring Service
 * @description Tests performance metrics collection, alerting, and resource scaling
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import { jest } from '@jest/globals';
import EventEmitter from 'events';
import { PerformanceMonitoringService } from '../../src/services/performanceMonitoringService.js';

// Mock dependencies
const mockLoggingService = {
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  logError: jest.fn(),
  logDebug: jest.fn()
};

const mockPerformanceMonitor = {
  getMetrics: jest.fn(() => ({
    overall: {
      averageResponseTime: 150,
      errorRate: 2,
      requests: 100,
      slowRequests: 5
    },
    endpoints: {}
  }))
};

// Mock modules
jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  default: mockLoggingService
}));

jest.unstable_mockModule('../../src/middleware/performanceMiddleware.js', () => ({
  performanceMonitor: mockPerformanceMonitor
}));

describe('PerformanceMonitoringService', () => {
  let service;
  let originalSetInterval;
  let originalClearInterval;
  let intervalCallbacks;

  beforeEach(() => {
    // Mock timers
    intervalCallbacks = new Map();
    let intervalId = 0;
    
    originalSetInterval = global.setInterval;
    originalClearInterval = global.clearInterval;
    
    global.setInterval = jest.fn((callback, delay) => {
      const id = ++intervalId;
      intervalCallbacks.set(id, { callback, delay });
      return id;
    });
    
    global.clearInterval = jest.fn((id) => {
      intervalCallbacks.delete(id);
    });

    // Mock process methods
    jest.spyOn(process, 'cpuUsage').mockReturnValue({ user: 1000000, system: 500000 });
    jest.spyOn(process, 'hrtime').mockReturnValue([1, 500000000]);
    jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 50 * 1024 * 1024,
      heapUsed: 30 * 1024 * 1024,
      heapTotal: 40 * 1024 * 1024,
      external: 5 * 1024 * 1024
    });
    jest.spyOn(process, 'uptime').mockReturnValue(3600);

    // Mock os methods
    const mockOs = {
      totalmem: jest.fn(() => 8 * 1024 * 1024 * 1024), // 8GB
      loadavg: jest.fn(() => [0.5, 0.7, 0.8])
    };
    
    jest.doMock('os', () => mockOs);

    // Clear mocks
    jest.clearAllMocks();
    
    // Create service instance
    service = new PerformanceMonitoringService();
  });

  afterEach(() => {
    if (service) {
      service.stop();
    }
    
    // Restore timers
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    
    jest.restoreAllMocks();
  });

  describe('Service Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(service.isEnabled).toBe(true);
      expect(service.metricsCollectionInterval).toBe(5000);
      expect(service.alertCheckInterval).toBe(30000);
      expect(service.thresholds).toBeDefined();
      expect(service.metrics).toBeDefined();
    });

    test('should set up monitoring intervals', () => {
      expect(global.setInterval).toHaveBeenCalledTimes(2);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        '[PERFORMANCE] Enhanced monitoring service initialized',
        expect.any(Object)
      );
    });

    test('should initialize with correct thresholds', () => {
      expect(service.thresholds.responseTime.warning).toBe(1000);
      expect(service.thresholds.responseTime.critical).toBe(2000);
      expect(service.thresholds.errorRate.warning).toBe(0.05);
      expect(service.thresholds.errorRate.critical).toBe(0.10);
      expect(service.thresholds.cpuUsage.warning).toBe(70);
      expect(service.thresholds.cpuUsage.critical).toBe(85);
    });
  });

  describe('Metrics Collection', () => {
    test('should collect real-time metrics', async () => {
      const collectSpy = jest.spyOn(service, 'collectRealTimeMetrics');
      
      // Trigger metrics collection
      const metricsInterval = intervalCallbacks.get(1);
      await metricsInterval.callback();
      
      expect(collectSpy).toHaveBeenCalled();
      expect(service.metrics.realTime.timestamp).toBeDefined();
      expect(service.metrics.realTime.responseTime).toBeDefined();
      expect(service.metrics.realTime.system).toBeDefined();
    });

    test('should collect system metrics correctly', async () => {
      const systemMetrics = await service.collectSystemMetrics();
      
      expect(systemMetrics.cpuUsage).toBeDefined();
      expect(systemMetrics.memoryUsage.percentage).toBeDefined();
      expect(systemMetrics.loadAverage).toEqual([0.5, 0.7, 0.8]);
      expect(systemMetrics.uptime).toBe(3600);
    });

    test('should collect application metrics', async () => {
      const appMetrics = await service.collectApplicationMetrics();
      
      expect(appMetrics.responseTime.current).toBe(150);
      expect(appMetrics.errorRate).toBe(0.02); // 2% converted to decimal
      expect(appMetrics.totalRequests).toBe(100);
      expect(mockPerformanceMonitor.getMetrics).toHaveBeenCalled();
    });

    test('should calculate throughput correctly', () => {
      // Add some test requests
      const now = Date.now();
      service.requestTracker.requests = [
        { timestamp: now - 500 },
        { timestamp: now - 1500 },
        { timestamp: now - 30000 },
        { timestamp: now - 90000 }
      ];
      
      const throughput = service.calculateThroughput();
      
      expect(throughput.requestsPerSecond).toBe(1); // 1 request in last second
      expect(throughput.requestsPerMinute).toBe(3); // 3 requests in last minute
    });

    test('should calculate response time percentiles', () => {
      service.responseTimeTracker.times = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      
      const percentiles = service.calculateResponseTimePercentiles();
      
      expect(percentiles.p50).toBe(500);
      expect(percentiles.p95).toBe(950);
      expect(percentiles.p99).toBe(990);
    });

    test('should track requests for throughput calculation', () => {
      const initialCount = service.requestTracker.requests.length;
      
      service.trackRequest();
      
      expect(service.requestTracker.requests.length).toBe(initialCount + 1);
      expect(service.requestTracker.requests[service.requestTracker.requests.length - 1].timestamp).toBeDefined();
    });

    test('should track response times for percentile calculation', () => {
      const initialCount = service.responseTimeTracker.times.length;
      
      service.trackResponseTime(250);
      
      expect(service.responseTimeTracker.times.length).toBe(initialCount + 1);
      expect(service.responseTimeTracker.times).toContain(250);
    });

    test('should limit response time tracker size', () => {
      // Fill tracker to max size
      for (let i = 0; i < service.responseTimeTracker.maxSize + 10; i++) {
        service.trackResponseTime(i);
      }
      
      expect(service.responseTimeTracker.times.length).toBe(service.responseTimeTracker.maxSize);
    });
  });

  describe('Alert Management', () => {
    test('should create alerts for critical response time', () => {
      const metrics = {
        responseTime: { current: 2500 },
        errorRate: 0.02,
        system: { cpuUsage: 50, memoryUsage: { percentage: 60 } },
        throughput: { requestsPerSecond: 15 }
      };
      
      service.checkAlerts(metrics);
      
      expect(service.activeAlerts.has('response_time')).toBe(true);
      const alert = service.activeAlerts.get('response_time');
      expect(alert.severity).toBe('critical');
      expect(alert.currentValue).toBe(2500);
    });

    test('should create alerts for high error rate', () => {
      const metrics = {
        responseTime: { current: 500 },
        errorRate: 0.12, // 12%
        system: { cpuUsage: 50, memoryUsage: { percentage: 60 } },
        throughput: { requestsPerSecond: 15 }
      };
      
      service.checkAlerts(metrics);
      
      expect(service.activeAlerts.has('error_rate')).toBe(true);
      const alert = service.activeAlerts.get('error_rate');
      expect(alert.severity).toBe('critical');
      expect(alert.currentValue).toBe(12);
    });

    test('should create alerts for high CPU usage', () => {
      const metrics = {
        responseTime: { current: 500 },
        errorRate: 0.02,
        system: { cpuUsage: 90, memoryUsage: { percentage: 60 } },
        throughput: { requestsPerSecond: 15 }
      };
      
      service.checkAlerts(metrics);
      
      expect(service.activeAlerts.has('cpu_usage')).toBe(true);
      const alert = service.activeAlerts.get('cpu_usage');
      expect(alert.severity).toBe('critical');
      expect(alert.currentValue).toBe(90);
    });

    test('should create alerts for high memory usage', () => {
      const metrics = {
        responseTime: { current: 500 },
        errorRate: 0.02,
        system: { cpuUsage: 50, memoryUsage: { percentage: 95 } },
        throughput: { requestsPerSecond: 15 }
      };
      
      service.checkAlerts(metrics);
      
      expect(service.activeAlerts.has('memory_usage')).toBe(true);
      const alert = service.activeAlerts.get('memory_usage');
      expect(alert.severity).toBe('critical');
      expect(alert.currentValue).toBe(95);
    });

    test('should create alerts for low throughput', () => {
      const metrics = {
        responseTime: { current: 500 },
        errorRate: 0.02,
        system: { cpuUsage: 50, memoryUsage: { percentage: 60 } },
        throughput: { requestsPerSecond: 5 } // Below minimum of 10
      };
      
      service.checkAlerts(metrics);
      
      expect(service.activeAlerts.has('low_throughput')).toBe(true);
      const alert = service.activeAlerts.get('low_throughput');
      expect(alert.severity).toBe('warning');
      expect(alert.currentValue).toBe(5);
    });

    test('should emit alert events', () => {
      const alertSpy = jest.fn();
      service.on('alert-triggered', alertSpy);
      
      const metrics = {
        responseTime: { current: 2500 },
        errorRate: 0.02,
        system: { cpuUsage: 50, memoryUsage: { percentage: 60 } },
        throughput: { requestsPerSecond: 15 }
      };
      
      service.checkAlerts(metrics);
      
      expect(alertSpy).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'response_time',
        severity: 'critical'
      }));
    });

    test('should resolve alerts when conditions improve', () => {
      // First create an alert
      const criticalMetrics = {
        responseTime: { current: 2500 },
        errorRate: 0.02,
        system: { cpuUsage: 50, memoryUsage: { percentage: 60 } },
        throughput: { requestsPerSecond: 15 }
      };
      
      service.checkAlerts(criticalMetrics);
      expect(service.activeAlerts.has('response_time')).toBe(true);
      
      // Then resolve it
      const normalMetrics = {
        responseTime: { current: 500 },
        errorRate: 0.02,
        system: { cpuUsage: 50, memoryUsage: { percentage: 60 } },
        throughput: { requestsPerSecond: 15 }
      };
      
      const resolveSpy = jest.fn();
      service.on('alert-resolved', resolveSpy);
      
      service.checkAlerts(normalMetrics);
      
      expect(service.activeAlerts.has('response_time')).toBe(false);
      expect(resolveSpy).toHaveBeenCalled();
    });

    test('should acknowledge alerts', () => {
      // Create an alert first
      const alert = service.createAlert('test_alert', 'warning', 'Test alert', 100, 50);
      service.metrics.alerts.push(alert);
      
      service.acknowledgeAlert(alert.id, 'test_user');
      
      expect(alert.acknowledged).toBe(true);
      expect(alert.acknowledgedBy).toBe('test_user');
      expect(alert.acknowledgedAt).toBeDefined();
    });
  });

  describe('Auto Scaling', () => {
    beforeEach(() => {
      service.autoScaling.enabled = true;
      service.autoScaling.lastScalingAction = null;
    });

    test('should trigger scale up when usage exceeds threshold', () => {
      const scaleUpSpy = jest.fn();
      service.on('scale-up-triggered', scaleUpSpy);
      
      const highUsageMetrics = {
        cpuUsage: 85,
        memoryUsage: { percentage: 85 }
      };
      
      service.checkAutoScaling(highUsageMetrics);
      
      expect(scaleUpSpy).toHaveBeenCalled();
      expect(scaleUpSpy).toHaveBeenCalledWith(expect.objectContaining({
        currentUsage: 85,
        threshold: service.autoScaling.scaleUpThreshold
      }));
    });

    test('should trigger scale down when usage is below threshold', () => {
      const scaleDownSpy = jest.fn();
      service.on('scale-down-triggered', scaleDownSpy);
      
      const lowUsageMetrics = {
        cpuUsage: 20,
        memoryUsage: { percentage: 25 }
      };
      
      service.checkAutoScaling(lowUsageMetrics);
      
      expect(scaleDownSpy).toHaveBeenCalled();
      expect(scaleDownSpy).toHaveBeenCalledWith(expect.objectContaining({
        currentUsage: 22.5, // Average of 20 and 25
        threshold: service.autoScaling.scaleDownThreshold
      }));
    });

    test('should respect cooldown period', () => {
      const scaleUpSpy = jest.fn();
      service.on('scale-up-triggered', scaleUpSpy);
      
      // Set recent scaling action
      service.autoScaling.lastScalingAction = Date.now() - 60000; // 1 minute ago
      
      const highUsageMetrics = {
        cpuUsage: 85,
        memoryUsage: { percentage: 85 }
      };
      
      service.checkAutoScaling(highUsageMetrics);
      
      expect(scaleUpSpy).not.toHaveBeenCalled();
    });

    test('should not scale down below minimum instances', () => {
      const scaleDownSpy = jest.fn();
      service.on('scale-down-triggered', scaleDownSpy);
      
      // Mock getCurrentInstanceCount to return minimum
      jest.spyOn(service, 'getCurrentInstanceCount').mockReturnValue(service.autoScaling.minInstances);
      
      const lowUsageMetrics = {
        cpuUsage: 20,
        memoryUsage: { percentage: 25 }
      };
      
      service.checkAutoScaling(lowUsageMetrics);
      
      expect(scaleDownSpy).not.toHaveBeenCalled();
    });

    test('should not scale when auto scaling is disabled', () => {
      service.autoScaling.enabled = false;
      
      const scaleUpSpy = jest.fn();
      service.on('scale-up-triggered', scaleUpSpy);
      
      const highUsageMetrics = {
        cpuUsage: 85,
        memoryUsage: { percentage: 85 }
      };
      
      service.checkAutoScaling(highUsageMetrics);
      
      expect(scaleUpSpy).not.toHaveBeenCalled();
    });
  });

  describe('Historical Data Management', () => {
    test('should store historical metrics', () => {
      const testMetrics = {
        responseTime: { current: 150 },
        throughput: { requestsPerSecond: 10 },
        timestamp: Date.now()
      };
      
      service.storeHistoricalMetrics(testMetrics);
      
      expect(service.metrics.historical.length).toBeGreaterThan(0);
      expect(service.metrics.historical[service.metrics.historical.length - 1]).toMatchObject(testMetrics);
    });

    test('should limit historical data size', () => {
      const maxEntries = (24 * 60 * 60) / (service.metricsCollectionInterval / 1000);
      
      // Add more than max entries
      for (let i = 0; i < maxEntries + 10; i++) {
        service.storeHistoricalMetrics({ timestamp: Date.now() + i });
      }
      
      expect(service.metrics.historical.length).toBeLessThanOrEqual(maxEntries);
    });

    test('should update performance trends', () => {
      service.metrics.realTime = {
        timestamp: Date.now(),
        responseTime: { current: 150 },
        throughput: { requestsPerSecond: 10 },
        errorRate: 0.02,
        system: {
          cpuUsage: 50,
          memoryUsage: { percentage: 60 }
        }
      };
      
      service.updateTrends();
      
      expect(service.metrics.trends.responseTime.length).toBeGreaterThan(0);
      expect(service.metrics.trends.throughput.length).toBeGreaterThan(0);
      expect(service.metrics.trends.errorRate.length).toBeGreaterThan(0);
      expect(service.metrics.trends.cpuUsage.length).toBeGreaterThan(0);
      expect(service.metrics.trends.memoryUsage.length).toBeGreaterThan(0);
    });

    test('should limit trend data size', () => {
      const maxTrendPoints = 100;
      
      // Add more than max trend points
      for (let i = 0; i < maxTrendPoints + 10; i++) {
        service.metrics.realTime = {
          timestamp: Date.now() + i,
          responseTime: { current: 150 + i },
          throughput: { requestsPerSecond: 10 + i },
          errorRate: 0.02,
          system: {
            cpuUsage: 50 + i,
            memoryUsage: { percentage: 60 + i }
          }
        };
        service.updateTrends();
      }
      
      expect(service.metrics.trends.responseTime.length).toBeLessThanOrEqual(maxTrendPoints);
      expect(service.metrics.trends.cpuUsage.length).toBeLessThanOrEqual(maxTrendPoints);
    });
  });

  describe('Service Control', () => {
    test('should stop monitoring service', () => {
      service.stop();
      
      expect(service.isEnabled).toBe(false);
      expect(global.clearInterval).toHaveBeenCalled();
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith('[PERFORMANCE] Monitoring service stopped');
    });

    test('should start monitoring service', () => {
      service.stop();
      service.start();
      
      expect(service.isEnabled).toBe(true);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith('[PERFORMANCE] Monitoring service started');
    });

    test('should get current metrics', () => {
      const metrics = service.getMetrics();
      
      expect(metrics.realTime).toBeDefined();
      expect(metrics.historical).toBeDefined();
      expect(metrics.alerts).toBeDefined();
      expect(metrics.trends).toBeDefined();
      expect(metrics.thresholds).toBeDefined();
      expect(metrics.autoScaling).toBeDefined();
    });

    test('should update thresholds', () => {
      const newThresholds = {
        responseTime: {
          warning: 800,
          critical: 1500
        }
      };
      
      service.updateThresholds(newThresholds);
      
      expect(service.thresholds.responseTime.warning).toBe(800);
      expect(service.thresholds.responseTime.critical).toBe(1500);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        '[PERFORMANCE] Thresholds updated',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle errors in metrics collection gracefully', async () => {
      // Mock an error in system metrics collection
      jest.spyOn(service, 'collectSystemMetrics').mockRejectedValue(new Error('System error'));
      
      await service.collectRealTimeMetrics();
      
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        '[PERFORMANCE] Error collecting metrics',
        expect.any(Error)
      );
    });

    test('should handle CPU usage calculation errors', async () => {
      // Mock process.cpuUsage to throw error
      process.cpuUsage.mockImplementation(() => {
        throw new Error('CPU usage error');
      });
      
      const cpuUsage = await service.getCPUUsage();
      
      // Should return 0 or handle gracefully
      expect(typeof cpuUsage).toBe('number');
    });
  });
});