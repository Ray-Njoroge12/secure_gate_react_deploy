/**
 * Unit Tests for Auto Scaling Service
 * 
 * Tests automatic resource scaling, intelligent capacity management,
 * scaling decisions, and performance-based scaling policies.
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockLoggingService = {
  logInfo: jest.fn(),
  logError: jest.fn()
};

const mockPerformanceMonitoringService = {
  getSystemMetrics: jest.fn(),
  getApplicationMetrics: jest.fn(),
  getHistoricalMetrics: jest.fn()
};

const mockPerformanceAlertingService = {
  sendAlert: jest.fn()
};

jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  loggingService: mockLoggingService
}));

jest.unstable_mockModule('../../src/services/performanceMonitoringService.js', () => ({
  performanceMonitoringService: mockPerformanceMonitoringService
}));

jest.unstable_mockModule('../../src/services/performanceAlertingService.js', () => ({
  performanceAlertingService: mockPerformanceAlertingService
}));

// Set environment variables for testing
process.env.AUTO_SCALING_ENABLED = 'true';
process.env.MIN_INSTANCES = '2';
process.env.MAX_INSTANCES = '10';

const { autoScalingService } = await import('../../src/services/autoScalingService.js');

describe('Auto Scaling Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    autoScalingService.isEnabled = true;
    autoScalingService.scalingInterval = null;
    autoScalingService.scalingHistory = [];
    autoScalingService.lastScalingAction = null;
    autoScalingService.currentCapacity = {
      instances: 2,
      cpuCores: 2,
      memoryGB: 4
    };
  });

  describe('Initialization', () => {
    test('should initialize auto scaling service when enabled', async () => {
      await autoScalingService.initialize();

      expect(autoScalingService.scalingPolicies.size).toBeGreaterThan(0);
      expect(autoScalingService.scalingInterval).toBeDefined();
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Auto scaling service initialized',
        expect.objectContaining({
          enabled: true,
          thresholds: expect.any(Object),
          limits: expect.any(Object),
          currentCapacity: expect.any(Object)
        })
      );
    });

    test('should skip initialization when auto scaling is disabled', async () => {
      process.env.AUTO_SCALING_ENABLED = 'false';
      autoScalingService.isEnabled = false;

      await autoScalingService.initialize();

      expect(mockLoggingService.logInfo).toHaveBeenCalledWith('Auto scaling is disabled');
      expect(autoScalingService.scalingInterval).toBeNull();
    });

    test('should handle initialization errors', async () => {
      const error = new Error('Initialization failed');
      jest.spyOn(autoScalingService, 'loadScalingPolicies').mockRejectedValueOnce(error);

      await expect(autoScalingService.initialize()).rejects.toThrow('Initialization failed');
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Failed to initialize auto scaling service',
        error
      );
    });
  });

  describe('Scaling Policy Management', () => {
    test('should load default scaling policies', async () => {
      await autoScalingService.loadScalingPolicies();

      expect(autoScalingService.scalingPolicies.has('cpu_scaling')).toBe(true);
      expect(autoScalingService.scalingPolicies.has('memory_scaling')).toBe(true);
      expect(autoScalingService.scalingPolicies.has('response_time_scaling')).toBe(true);
      expect(autoScalingService.scalingPolicies.has('error_rate_scaling')).toBe(true);
      expect(autoScalingService.scalingPolicies.has('connection_scaling')).toBe(true);

      const cpuPolicy = autoScalingService.scalingPolicies.get('cpu_scaling');
      expect(cpuPolicy.name).toBe('CPU-based Scaling');
      expect(cpuPolicy.metric).toBe('cpu_usage');
      expect(cpuPolicy.scaleUpThreshold).toBe(0.7);
      expect(cpuPolicy.scaleDownThreshold).toBe(0.3);
      expect(cpuPolicy.scalingAction).toBe('horizontal');
      expect(cpuPolicy.priority).toBe(1);
    });

    test('should update scaling policy successfully', async () => {
      await autoScalingService.loadScalingPolicies();
      
      const updates = {
        scaleUpThreshold: 0.8,
        scaleDownThreshold: 0.2,
        enabled: false
      };

      await autoScalingService.updateScalingPolicy('cpu_scaling', updates);

      const policy = autoScalingService.scalingPolicies.get('cpu_scaling');
      expect(policy.scaleUpThreshold).toBe(0.8);
      expect(policy.scaleDownThreshold).toBe(0.2);
      expect(policy.enabled).toBe(false);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Scaling policy updated',
        { policyId: 'cpu_scaling', updates }
      );
    });

    test('should throw error when updating non-existent policy', async () => {
      await expect(autoScalingService.updateScalingPolicy('invalid_policy', {}))
        .rejects.toThrow('Scaling policy invalid_policy not found');
    });
  });

  describe('Metrics Collection', () => {
    test('should get current system metrics', async () => {
      const mockSystemMetrics = {
        cpu: { usage: 0.6 },
        memory: { usage: 0.7 },
        database: { connectionUtilization: 0.5 }
      };

      const mockAppMetrics = {
        api: {
          averageResponseTime: 800,
          errorRate: 0.02
        }
      };

      mockPerformanceMonitoringService.getSystemMetrics.mockResolvedValueOnce(mockSystemMetrics);
      mockPerformanceMonitoringService.getApplicationMetrics.mockResolvedValueOnce(mockAppMetrics);

      const result = await autoScalingService.getCurrentMetrics();

      expect(result.cpu_usage).toBe(0.6);
      expect(result.memory_usage).toBe(0.7);
      expect(result.response_time).toBe(800);
      expect(result.error_rate).toBe(0.02);
      expect(result.db_connections).toBe(0.5);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    test('should handle missing metrics gracefully', async () => {
      mockPerformanceMonitoringService.getSystemMetrics.mockResolvedValueOnce({});
      mockPerformanceMonitoringService.getApplicationMetrics.mockResolvedValueOnce({});

      const result = await autoScalingService.getCurrentMetrics();

      expect(result.cpu_usage).toBe(0);
      expect(result.memory_usage).toBe(0);
      expect(result.response_time).toBe(0);
      expect(result.error_rate).toBe(0);
      expect(result.db_connections).toBe(0);
    });
  });

  describe('Policy Evaluation', () => {
    test('should evaluate CPU scaling policy for scale up', async () => {
      const policy = {
        metric: 'cpu_usage',
        scaleUpThreshold: 0.7,
        scaleDownThreshold: 0.3,
        evaluationPeriod: 300,
        scalingAction: 'horizontal',
        priority: 1
      };

      const metrics = { cpu_usage: 0.8 };

      // Mock sustained metric check
      jest.spyOn(autoScalingService, 'isMetricSustained').mockResolvedValueOnce(true);

      const result = await autoScalingService.evaluatePolicy(policy, metrics);

      expect(result.direction).toBe('up');
      expect(result.action).toBe('horizontal');
      expect(result.reason).toContain('cpu_usage (0.8) exceeded scale-up threshold (0.7)');
      expect(result.metricValue).toBe(0.8);
      expect(result.threshold).toBe(0.7);
      expect(result.priority).toBe(1);
    });

    test('should evaluate memory scaling policy for scale down', async () => {
      const policy = {
        metric: 'memory_usage',
        scaleUpThreshold: 0.8,
        scaleDownThreshold: 0.4,
        evaluationPeriod: 300,
        scalingAction: 'vertical',
        priority: 2
      };

      const metrics = { memory_usage: 0.3 };

      jest.spyOn(autoScalingService, 'isMetricSustained').mockResolvedValueOnce(true);

      const result = await autoScalingService.evaluatePolicy(policy, metrics);

      expect(result.direction).toBe('down');
      expect(result.action).toBe('vertical');
      expect(result.reason).toContain('memory_usage (0.3) below scale-down threshold (0.4)');
    });

    test('should return null when metric is not sustained', async () => {
      const policy = {
        metric: 'cpu_usage',
        scaleUpThreshold: 0.7,
        scaleDownThreshold: 0.3,
        evaluationPeriod: 300
      };

      const metrics = { cpu_usage: 0.8 };

      jest.spyOn(autoScalingService, 'isMetricSustained').mockResolvedValueOnce(false);

      const result = await autoScalingService.evaluatePolicy(policy, metrics);

      expect(result).toBeNull();
    });

    test('should return null when metric is within thresholds', async () => {
      const policy = {
        metric: 'cpu_usage',
        scaleUpThreshold: 0.7,
        scaleDownThreshold: 0.3,
        evaluationPeriod: 300
      };

      const metrics = { cpu_usage: 0.5 }; // Between thresholds

      jest.spyOn(autoScalingService, 'isMetricSustained').mockResolvedValueOnce(true);

      const result = await autoScalingService.evaluatePolicy(policy, metrics);

      expect(result).toBeNull();
    });
  });

  describe('Metric Sustainability Check', () => {
    test('should detect sustained high CPU usage', async () => {
      const historicalMetrics = [
        { value: 0.75, timestamp: new Date() },
        { value: 0.78, timestamp: new Date() },
        { value: 0.72, timestamp: new Date() },
        { value: 0.76, timestamp: new Date() },
        { value: 0.74, timestamp: new Date() }
      ];

      mockPerformanceMonitoringService.getHistoricalMetrics.mockResolvedValueOnce(historicalMetrics);

      const result = await autoScalingService.isMetricSustained('cpu_usage', 0.75, 300);

      expect(result).toBe(true);
      expect(mockPerformanceMonitoringService.getHistoricalMetrics).toHaveBeenCalledWith(
        'cpu_usage',
        300
      );
    });

    test('should detect non-sustained metrics', async () => {
      const historicalMetrics = [
        { value: 0.75, timestamp: new Date() },
        { value: 0.45, timestamp: new Date() }, // Low value
        { value: 0.72, timestamp: new Date() },
        { value: 0.76, timestamp: new Date() },
        { value: 0.74, timestamp: new Date() }
      ];

      mockPerformanceMonitoringService.getHistoricalMetrics.mockResolvedValueOnce(historicalMetrics);

      const result = await autoScalingService.isMetricSustained('cpu_usage', 0.75, 300);

      expect(result).toBe(false);
    });

    test('should handle empty historical metrics', async () => {
      mockPerformanceMonitoringService.getHistoricalMetrics.mockResolvedValueOnce([]);

      const result = await autoScalingService.isMetricSustained('cpu_usage', 0.75, 300);

      expect(result).toBe(false);
    });
  });

  describe('Scaling Execution', () => {
    test('should execute horizontal scale up successfully', async () => {
      const scalingDecision = {
        policy: { name: 'CPU-based Scaling', priority: 1 },
        decision: {
          direction: 'up',
          action: 'horizontal',
          reason: 'High CPU usage detected'
        }
      };

      jest.spyOn(autoScalingService, 'simulateScalingAction').mockResolvedValueOnce();

      const result = await autoScalingService.executeScalingAction(scalingDecision);

      expect(result.success).toBe(true);
      expect(result.description).toContain('Scaled up from 2 to 3 instances');
      expect(result.oldCapacity.instances).toBe(2);
      expect(result.newCapacity.instances).toBe(3);
      expect(autoScalingService.currentCapacity.instances).toBe(3);
    });

    test('should execute horizontal scale down successfully', async () => {
      autoScalingService.currentCapacity.instances = 4;

      const scalingDecision = {
        policy: { name: 'CPU-based Scaling', priority: 1 },
        decision: {
          direction: 'down',
          action: 'horizontal',
          reason: 'Low CPU usage detected'
        }
      };

      jest.spyOn(autoScalingService, 'simulateScalingAction').mockResolvedValueOnce();

      const result = await autoScalingService.executeScalingAction(scalingDecision);

      expect(result.success).toBe(true);
      expect(result.description).toContain('Scaled down from 4 to 3 instances');
      expect(autoScalingService.currentCapacity.instances).toBe(3);
    });

    test('should execute vertical CPU scale up successfully', async () => {
      const scalingDecision = {
        policy: { name: 'Memory-based Scaling', metric: 'cpu_usage', priority: 2 },
        decision: {
          direction: 'up',
          action: 'vertical',
          reason: 'High CPU usage detected'
        }
      };

      jest.spyOn(autoScalingService, 'simulateScalingAction').mockResolvedValueOnce();

      const result = await autoScalingService.executeScalingAction(scalingDecision);

      expect(result.success).toBe(true);
      expect(result.description).toContain('Scaled up CPU from 2 to 3 cores');
      expect(autoScalingService.currentCapacity.cpuCores).toBe(3);
    });

    test('should execute vertical memory scale up successfully', async () => {
      const scalingDecision = {
        policy: { name: 'Memory-based Scaling', metric: 'memory_usage', priority: 2 },
        decision: {
          direction: 'up',
          action: 'vertical',
          reason: 'High memory usage detected'
        }
      };

      jest.spyOn(autoScalingService, 'simulateScalingAction').mockResolvedValueOnce();

      const result = await autoScalingService.executeScalingAction(scalingDecision);

      expect(result.success).toBe(true);
      expect(result.description).toContain('Scaled up memory from 4GB to 6GB');
      expect(autoScalingService.currentCapacity.memoryGB).toBe(6);
    });

    test('should respect maximum instance limits', async () => {
      autoScalingService.currentCapacity.instances = 10; // At max limit

      const scalingDecision = {
        policy: { name: 'CPU-based Scaling', priority: 1 },
        decision: {
          direction: 'up',
          action: 'horizontal',
          reason: 'High CPU usage detected'
        }
      };

      const result = await autoScalingService.executeScalingAction(scalingDecision);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Already at maximum instance limit');
      expect(autoScalingService.currentCapacity.instances).toBe(10);
    });

    test('should respect minimum instance limits', async () => {
      autoScalingService.currentCapacity.instances = 2; // At min limit

      const scalingDecision = {
        policy: { name: 'CPU-based Scaling', priority: 1 },
        decision: {
          direction: 'down',
          action: 'horizontal',
          reason: 'Low CPU usage detected'
        }
      };

      const result = await autoScalingService.executeScalingAction(scalingDecision);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Already at minimum instance limit');
      expect(autoScalingService.currentCapacity.instances).toBe(2);
    });
  });

  describe('Scaling Decision Processing', () => {
    test('should process scaling decisions by priority', async () => {
      const scalingDecisions = [
        {
          policyId: 'memory_scaling',
          policy: { name: 'Memory-based Scaling', priority: 2 },
          decision: { direction: 'up', action: 'vertical', reason: 'High memory' }
        },
        {
          policyId: 'cpu_scaling',
          policy: { name: 'CPU-based Scaling', priority: 1 },
          decision: { direction: 'up', action: 'horizontal', reason: 'High CPU' }
        }
      ];

      jest.spyOn(autoScalingService, 'executeScalingAction').mockResolvedValueOnce({
        success: true,
        description: 'Scaled up from 2 to 3 instances',
        oldCapacity: { instances: 2 },
        newCapacity: { instances: 3 }
      });

      await autoScalingService.processScalingDecisions(scalingDecisions);

      // Should execute the higher priority (lower number) decision first
      expect(autoScalingService.executeScalingAction).toHaveBeenCalledWith(scalingDecisions[1]);
      expect(autoScalingService.lastScalingAction).toBeDefined();
      expect(autoScalingService.scalingHistory).toHaveLength(1);
      expect(mockPerformanceAlertingService.sendAlert).toHaveBeenCalledWith({
        type: 'auto_scaling',
        severity: 'info',
        message: 'Auto scaling executed: Scaled up from 2 to 3 instances',
        details: expect.any(Object)
      });
    });

    test('should handle scaling execution failures', async () => {
      const scalingDecisions = [{
        policyId: 'cpu_scaling',
        policy: { name: 'CPU-based Scaling', priority: 1 },
        decision: { direction: 'up', action: 'horizontal', reason: 'High CPU' }
      }];

      const error = new Error('Scaling failed');
      jest.spyOn(autoScalingService, 'executeScalingAction').mockRejectedValueOnce(error);

      await autoScalingService.processScalingDecisions(scalingDecisions);

      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Failed to execute scaling action',
        error,
        expect.any(Object)
      );
      expect(mockPerformanceAlertingService.sendAlert).toHaveBeenCalledWith({
        type: 'auto_scaling_error',
        severity: 'warning',
        message: 'Auto scaling action failed: Scaling failed',
        details: expect.any(Object)
      });
    });
  });

  describe('Cooldown Period Management', () => {
    test('should respect cooldown period after scaling action', () => {
      autoScalingService.lastScalingAction = {
        timestamp: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
      };
      autoScalingService.cooldownPeriod = 5 * 60 * 1000; // 5 minutes

      const result = autoScalingService.isInCooldownPeriod();

      expect(result).toBe(true);
    });

    test('should allow scaling after cooldown period expires', () => {
      autoScalingService.lastScalingAction = {
        timestamp: new Date(Date.now() - 6 * 60 * 1000) // 6 minutes ago
      };
      autoScalingService.cooldownPeriod = 5 * 60 * 1000; // 5 minutes

      const result = autoScalingService.isInCooldownPeriod();

      expect(result).toBe(false);
    });

    test('should allow scaling when no previous action exists', () => {
      autoScalingService.lastScalingAction = null;

      const result = autoScalingService.isInCooldownPeriod();

      expect(result).toBe(false);
    });
  });

  describe('Scaling Condition Evaluation', () => {
    test('should skip evaluation during cooldown period', async () => {
      autoScalingService.lastScalingAction = {
        timestamp: new Date() // Just happened
      };

      jest.spyOn(autoScalingService, 'getCurrentMetrics').mockResolvedValueOnce({});

      await autoScalingService.evaluateScalingConditions();

      expect(autoScalingService.getCurrentMetrics).not.toHaveBeenCalled();
    });

    test('should evaluate all enabled policies', async () => {
      autoScalingService.lastScalingAction = null;
      await autoScalingService.loadScalingPolicies();

      const mockMetrics = {
        cpu_usage: 0.8,
        memory_usage: 0.6,
        response_time: 1500,
        error_rate: 0.03,
        db_connections: 0.7
      };

      jest.spyOn(autoScalingService, 'getCurrentMetrics').mockResolvedValueOnce(mockMetrics);
      jest.spyOn(autoScalingService, 'evaluatePolicy').mockResolvedValue(null);
      jest.spyOn(autoScalingService, 'processScalingDecisions').mockResolvedValueOnce();

      await autoScalingService.evaluateScalingConditions();

      expect(autoScalingService.evaluatePolicy).toHaveBeenCalledTimes(5); // All policies
      expect(autoScalingService.processScalingDecisions).toHaveBeenCalledWith([]);
    });

    test('should handle evaluation errors gracefully', async () => {
      const error = new Error('Evaluation failed');
      jest.spyOn(autoScalingService, 'getCurrentMetrics').mockRejectedValueOnce(error);

      await autoScalingService.evaluateScalingConditions();

      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Failed to evaluate scaling conditions',
        error
      );
    });
  });

  describe('Monitoring Control', () => {
    test('should start monitoring with periodic evaluation', async () => {
      await autoScalingService.startMonitoring();

      expect(autoScalingService.scalingInterval).toBeDefined();
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith('Auto scaling monitoring started');
    });

    test('should not start monitoring if already running', async () => {
      autoScalingService.scalingInterval = setInterval(() => {}, 1000);

      await autoScalingService.startMonitoring();

      // Should not create a new interval
      expect(mockLoggingService.logInfo).not.toHaveBeenCalledWith('Auto scaling monitoring started');
    });

    test('should stop monitoring and clear interval', () => {
      autoScalingService.scalingInterval = setInterval(() => {}, 1000);

      autoScalingService.stopMonitoring();

      expect(autoScalingService.scalingInterval).toBeNull();
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith('Auto scaling monitoring stopped');
    });

    test('should enable/disable auto scaling', () => {
      jest.spyOn(autoScalingService, 'startMonitoring').mockImplementation();
      jest.spyOn(autoScalingService, 'stopMonitoring').mockImplementation();

      autoScalingService.setEnabled(true);
      expect(autoScalingService.isEnabled).toBe(true);
      expect(autoScalingService.startMonitoring).toHaveBeenCalled();

      autoScalingService.setEnabled(false);
      expect(autoScalingService.isEnabled).toBe(false);
      expect(autoScalingService.stopMonitoring).toHaveBeenCalled();
    });
  });

  describe('Status and History Management', () => {
    test('should get comprehensive scaling status', () => {
      autoScalingService.lastScalingAction = {
        timestamp: new Date(),
        decision: { reason: 'High CPU usage' },
        result: { description: 'Scaled up instances' }
      };

      autoScalingService.scalingHistory = [
        { timestamp: new Date(), decision: { reason: 'Test' } }
      ];

      const status = autoScalingService.getScalingStatus();

      expect(status.enabled).toBe(true);
      expect(status.currentCapacity).toEqual(autoScalingService.currentCapacity);
      expect(status.limits).toEqual(autoScalingService.limits);
      expect(status.thresholds).toEqual(autoScalingService.thresholds);
      expect(status.lastScalingAction).toBeDefined();
      expect(status.scalingHistory).toHaveLength(1);
      expect(status.cooldownRemaining).toBeGreaterThan(0);
      expect(status.policies).toBeInstanceOf(Array);
    });

    test('should add scaling actions to history with size limit', () => {
      // Add 105 actions to test size limit
      for (let i = 0; i < 105; i++) {
        autoScalingService.addToScalingHistory({
          timestamp: new Date(),
          decision: { reason: `Action ${i}` }
        });
      }

      expect(autoScalingService.scalingHistory).toHaveLength(100);
    });
  });

  describe('Shutdown', () => {
    test('should shutdown service cleanly', async () => {
      autoScalingService.scalingInterval = setInterval(() => {}, 1000);

      await autoScalingService.shutdown();

      expect(autoScalingService.scalingInterval).toBeNull();
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Auto scaling service shutdown complete'
      );
    });
  });
});