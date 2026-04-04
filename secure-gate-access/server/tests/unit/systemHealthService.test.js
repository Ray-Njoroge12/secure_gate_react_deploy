/**
 * Unit Tests for System Health Service
 * 
 * Tests comprehensive health checks, real-time alerting with escalation,
 * performance monitoring, and capacity management functionality.
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockDbManager = {
  query: jest.fn(),
  getStatus: jest.fn(),
  pool: {
    connect: jest.fn()
  }
};

const mockLoggingService = {
  logInfo: jest.fn(),
  logError: jest.fn(),
  logSecurity: jest.fn()
};

const mockPerformanceMonitoringService = {
  getApplicationMetrics: jest.fn(),
  getSystemMetrics: jest.fn(),
  getHistoricalMetrics: jest.fn()
};

const mockPerformanceAlertingService = {
  sendAlert: jest.fn()
};

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: mockDbManager
}));

jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  default: mockLoggingService
}));

jest.unstable_mockModule('../../src/services/performanceMonitoringService.js', () => ({
  default: mockPerformanceMonitoringService
}));

jest.unstable_mockModule('../../src/services/performanceAlertingService.js', () => ({
  default: mockPerformanceAlertingService
}));

const { systemHealthService } = await import('../../src/services/systemHealthService.js');

describe('System Health Service', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    systemHealthService.isMonitoring = false;
    systemHealthService.healthCheckInterval = null;
    systemHealthService.healthHistory = [];
    systemHealthService.lastHealthCheck = null;
    systemHealthService.healthStatus = 'unknown';
  });

  describe('Initialization', () => {
    test('should initialize health monitoring system successfully', async () => {
      await systemHealthService.initialize();

      expect(systemHealthService.healthChecks.size).toBeGreaterThan(0);
      expect(systemHealthService.isMonitoring).toBe(true);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'System health monitoring initialized successfully'
      );
    });

    test('should handle initialization errors', async () => {
      const error = new Error('Initialization failed');
      jest.spyOn(systemHealthService, 'startMonitoring').mockRejectedValueOnce(error);

      await expect(systemHealthService.initialize()).rejects.toThrow('Initialization failed');
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Failed to initialize system health monitoring',
        error
      );
    });
  });

  describe('Health Check Registration', () => {
    test('should register all required health checks', () => {
      systemHealthService.registerHealthChecks();

      expect(systemHealthService.healthChecks.has('database')).toBe(true);
      expect(systemHealthService.healthChecks.has('redis')).toBe(true);
      expect(systemHealthService.healthChecks.has('external_services')).toBe(true);
      expect(systemHealthService.healthChecks.has('system_resources')).toBe(true);
      expect(systemHealthService.healthChecks.has('application')).toBe(true);

      const dbCheck = systemHealthService.healthChecks.get('database');
      expect(dbCheck.name).toBe('Database Connection');
      expect(dbCheck.critical).toBe(true);
      expect(dbCheck.timeout).toBe(5000);
    });
  });

  describe('Database Health Check', () => {
    test('should return healthy status for good database connection', async () => {
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{ health_check: 1 }]
      });

      mockDbManager.getStatus.mockReturnValueOnce({
        totalConnections: 5,
        idleConnections: 3,
        maxConnections: 20
      });

      const result = await systemHealthService.checkDatabaseHealth();

      expect(result.status).toBe('healthy');
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.details.connectionPool.utilization).toBe(25); // 5/20 * 100
      expect(mockDbManager.query).toHaveBeenCalledWith('SELECT 1 as health_check');
    });

    test('should return degraded status for slow database response', async () => {
      // Mock slow response
      mockDbManager.query.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({ rows: [{ health_check: 1 }] }), 1500))
      );

      mockDbManager.getStatus.mockReturnValueOnce({
        totalConnections: 5,
        idleConnections: 3,
        maxConnections: 20
      });

      const result = await systemHealthService.checkDatabaseHealth();

      expect(result.status).toBe('degraded');
      expect(result.responseTime).toBeGreaterThan(1000);
      expect(result.message).toContain('Database response time is high');
    });

    test('should return unhealthy status for database connection failure', async () => {
      const error = new Error('Connection refused');
      mockDbManager.query.mockRejectedValueOnce(error);

      const result = await systemHealthService.checkDatabaseHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.message).toContain('Database health check failed');
      expect(result.error).toBe('Connection refused');
    });

    test('should return degraded status for high connection pool utilization', async () => {
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{ health_check: 1 }]
      });

      mockDbManager.getStatus.mockReturnValueOnce({
        totalConnections: 18,
        idleConnections: 2,
        maxConnections: 20
      });

      const result = await systemHealthService.checkDatabaseHealth();

      expect(result.status).toBe('degraded');
      expect(result.message).toContain('Database connection pool utilization is high: 90%');
    });
  });

  describe('System Resources Health Check', () => {
    test('should return healthy status for normal resource usage', async () => {
      jest.spyOn(systemHealthService, 'collectSystemMetrics').mockResolvedValueOnce({
        cpu: { usage: 0.5 },
        memory: { usage: 0.6 },
        disk: { usage: 0.7 }
      });

      const result = await systemHealthService.checkSystemResourcesHealth();

      expect(result.status).toBe('healthy');
      expect(result.message).toBe('System resources are healthy');
    });

    test('should return degraded status for high resource usage', async () => {
      jest.spyOn(systemHealthService, 'collectSystemMetrics').mockResolvedValueOnce({
        cpu: { usage: 0.85 }, // Above 80% threshold
        memory: { usage: 0.9 }, // Above 85% threshold
        disk: { usage: 0.95 } // Above 90% threshold
      });

      const result = await systemHealthService.checkSystemResourcesHealth();

      expect(result.status).toBe('degraded');
      expect(result.message).toContain('High CPU usage: 85%');
      expect(result.message).toContain('High memory usage: 90%');
      expect(result.message).toContain('High disk usage: 95%');
    });
  });

  describe('Application Health Check', () => {
    test('should return healthy status for good application metrics', async () => {
      mockPerformanceMonitoringService.getApplicationMetrics.mockResolvedValueOnce({
        api: {
          averageResponseTime: 150,
          errorRate: 0.01
        }
      });

      const result = await systemHealthService.checkApplicationHealth();

      expect(result.status).toBe('healthy');
      expect(result.message).toBe('Application is healthy');
    });

    test('should return degraded status for high response times', async () => {
      mockPerformanceMonitoringService.getApplicationMetrics.mockResolvedValueOnce({
        api: {
          averageResponseTime: 2500, // Above 2000ms threshold
          errorRate: 0.02
        }
      });

      const result = await systemHealthService.checkApplicationHealth();

      expect(result.status).toBe('degraded');
      expect(result.message).toContain('API response time is high: 2500ms');
    });

    test('should return degraded status for high error rates', async () => {
      mockPerformanceMonitoringService.getApplicationMetrics.mockResolvedValueOnce({
        api: {
          averageResponseTime: 500,
          errorRate: 0.08 // Above 5% threshold
        }
      });

      const result = await systemHealthService.checkApplicationHealth();

      expect(result.status).toBe('degraded');
      expect(result.message).toContain('API error rate is high: 8%');
    });
  });

  describe('Comprehensive Health Check', () => {
    test('should perform comprehensive health check successfully', async () => {
      // Mock all health check methods
      jest.spyOn(systemHealthService, 'checkDatabaseHealth').mockResolvedValueOnce({
        status: 'healthy',
        responseTime: 50,
        details: {}
      });

      jest.spyOn(systemHealthService, 'checkRedisHealth').mockResolvedValueOnce({
        status: 'healthy',
        responseTime: 20,
        details: {}
      });

      jest.spyOn(systemHealthService, 'checkExternalServicesHealth').mockResolvedValueOnce({
        status: 'healthy',
        responseTime: 100,
        details: {}
      });

      jest.spyOn(systemHealthService, 'checkSystemResourcesHealth').mockResolvedValueOnce({
        status: 'healthy',
        responseTime: 30,
        details: {}
      });

      jest.spyOn(systemHealthService, 'checkApplicationHealth').mockResolvedValueOnce({
        status: 'healthy',
        responseTime: 40,
        details: {}
      });

      jest.spyOn(systemHealthService, 'collectSystemMetrics').mockResolvedValueOnce({
        cpu: { usage: 0.5 },
        memory: { usage: 0.6 }
      });

      const result = await systemHealthService.performHealthCheck();

      expect(result.status).toBe('healthy');
      expect(result.components).toHaveProperty('database');
      expect(result.components).toHaveProperty('redis');
      expect(result.components).toHaveProperty('external_services');
      expect(result.components).toHaveProperty('system_resources');
      expect(result.components).toHaveProperty('application');
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.alerts).toEqual([]);
    });

    test('should detect unhealthy status from critical component failure', async () => {
      jest.spyOn(systemHealthService, 'checkDatabaseHealth').mockResolvedValueOnce({
        status: 'unhealthy',
        responseTime: 5000,
        message: 'Database connection failed'
      });

      jest.spyOn(systemHealthService, 'checkRedisHealth').mockResolvedValueOnce({
        status: 'healthy',
        responseTime: 20
      });

      jest.spyOn(systemHealthService, 'checkExternalServicesHealth').mockResolvedValueOnce({
        status: 'healthy',
        responseTime: 100
      });

      jest.spyOn(systemHealthService, 'checkSystemResourcesHealth').mockResolvedValueOnce({
        status: 'healthy',
        responseTime: 30
      });

      jest.spyOn(systemHealthService, 'checkApplicationHealth').mockResolvedValueOnce({
        status: 'healthy',
        responseTime: 40
      });

      jest.spyOn(systemHealthService, 'collectSystemMetrics').mockResolvedValueOnce({
        cpu: { usage: 0.5 }
      });

      const result = await systemHealthService.performHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].severity).toBe('critical');
      expect(result.alerts[0].component).toBe('database');
    });

    test('should process health alerts when issues detected', async () => {
      jest.spyOn(systemHealthService, 'checkDatabaseHealth').mockResolvedValueOnce({
        status: 'degraded',
        responseTime: 1500,
        message: 'Database response time is high'
      });

      jest.spyOn(systemHealthService, 'checkRedisHealth').mockResolvedValueOnce({
        status: 'healthy',
        responseTime: 20
      });

      jest.spyOn(systemHealthService, 'checkExternalServicesHealth').mockResolvedValueOnce({
        status: 'healthy',
        responseTime: 100
      });

      jest.spyOn(systemHealthService, 'checkSystemResourcesHealth').mockResolvedValueOnce({
        status: 'healthy',
        responseTime: 30
      });

      jest.spyOn(systemHealthService, 'checkApplicationHealth').mockResolvedValueOnce({
        status: 'healthy',
        responseTime: 40
      });

      jest.spyOn(systemHealthService, 'collectSystemMetrics').mockResolvedValueOnce({
        cpu: { usage: 0.5 }
      });

      const result = await systemHealthService.performHealthCheck();

      expect(result.status).toBe('degraded');
      expect(result.alerts).toHaveLength(1);
      expect(mockPerformanceAlertingService.sendAlert).toHaveBeenCalledWith({
        type: 'health_check',
        severity: 'warning',
        component: 'database',
        message: 'Database response time is high',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Health Monitoring', () => {
    test('should start monitoring with periodic health checks', async () => {
      jest.spyOn(systemHealthService, 'performHealthCheck').mockResolvedValue({
        status: 'healthy',
        components: {},
        alerts: []
      });

      await systemHealthService.startMonitoring();

      expect(systemHealthService.isMonitoring).toBe(true);
      expect(systemHealthService.healthCheckInterval).toBeDefined();
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith('Health monitoring started');
    });

    test('should stop monitoring and clear interval', () => {
      systemHealthService.isMonitoring = true;
      systemHealthService.healthCheckInterval = setInterval(() => {}, 1000);

      systemHealthService.stopMonitoring();

      expect(systemHealthService.isMonitoring).toBe(false);
      expect(systemHealthService.healthCheckInterval).toBeNull();
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith('Health monitoring stopped');
    });

    test('should not start monitoring if already monitoring', async () => {
      systemHealthService.isMonitoring = true;

      await systemHealthService.startMonitoring();

      expect(systemHealthService.healthCheckInterval).toBeNull();
    });
  });

  describe('Health History Management', () => {
    test('should add health reports to history', () => {
      const healthReport = {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        responseTime: 150,
        alerts: []
      };

      systemHealthService.addToHealthHistory(healthReport);

      expect(systemHealthService.healthHistory).toHaveLength(1);
      expect(systemHealthService.healthHistory[0]).toMatchObject({
        timestamp: healthReport.timestamp,
        status: 'healthy',
        responseTime: 150,
        alertCount: 0
      });
    });

    test('should limit health history to 100 entries', () => {
      // Add 105 entries
      for (let i = 0; i < 105; i++) {
        systemHealthService.addToHealthHistory({
          timestamp: new Date().toISOString(),
          status: 'healthy',
          responseTime: 100,
          alerts: []
        });
      }

      expect(systemHealthService.healthHistory).toHaveLength(100);
    });
  });

  describe('Launch Readiness Assessment', () => {
    test('should assess deployment readiness with all checks passing', async () => {
      jest.spyOn(systemHealthService, 'performHealthCheck').mockResolvedValueOnce({
        status: 'healthy',
        components: {
          database: { status: 'healthy' },
          external_services: { status: 'healthy' }
        }
      });

      jest.spyOn(systemHealthService, 'checkCapacity').mockResolvedValueOnce({
        currentLoad: 40
      });

      systemHealthService.capacityMetrics.currentLoad = 40;
      systemHealthService.deploymentMode = false;

      const result = await systemHealthService.checkDeploymentReadiness();

      expect(result.ready).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.checks.systemHealth).toBe(true);
      expect(result.checks.lowLoad).toBe(true);
      expect(result.checks.noActiveDeployment).toBe(true);
      expect(result.recommendations).toHaveLength(0);
    });

    test('should assess deployment readiness with failing checks', async () => {
      jest.spyOn(systemHealthService, 'performHealthCheck').mockResolvedValueOnce({
        status: 'degraded',
        components: {
          database: { status: 'degraded' },
          external_services: { status: 'unhealthy' }
        }
      });

      jest.spyOn(systemHealthService, 'checkCapacity').mockResolvedValueOnce({
        currentLoad: 85
      });

      systemHealthService.capacityMetrics.currentLoad = 85;
      systemHealthService.deploymentMode = true;

      const result = await systemHealthService.checkDeploymentReadiness();

      expect(result.ready).toBe(false);
      expect(result.score).toBeLessThan(90);
      expect(result.checks.systemHealth).toBe(false);
      expect(result.checks.lowLoad).toBe(false);
      expect(result.checks.noActiveDeployment).toBe(false);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Circuit Breaker Management', () => {
    test('should enable circuit breaker for component', () => {
      const component = 'external_api';
      const options = {
        failureThreshold: 3,
        timeout: 30000
      };

      systemHealthService.enableCircuitBreaker(component, options);

      const breaker = systemHealthService.circuitBreakers.get(component);
      expect(breaker.failureThreshold).toBe(3);
      expect(breaker.timeout).toBe(30000);
      expect(breaker.state).toBe('CLOSED');
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        `Circuit breaker enabled for ${component}`
      );
    });

    test('should check circuit breaker state correctly', () => {
      const component = 'external_api';
      systemHealthService.enableCircuitBreaker(component);

      let result = systemHealthService.checkCircuitBreaker(component);
      expect(result.allowed).toBe(true);
      expect(result.state).toBe('CLOSED');

      // Simulate opening the breaker
      const breaker = systemHealthService.circuitBreakers.get(component);
      breaker.state = 'OPEN';
      breaker.lastFailureTime = Date.now();

      result = systemHealthService.checkCircuitBreaker(component);
      expect(result.allowed).toBe(false);
      expect(result.state).toBe('OPEN');
    });

    test('should record circuit breaker failures and open when threshold reached', () => {
      const component = 'external_api';
      systemHealthService.enableCircuitBreaker(component, { failureThreshold: 2 });

      // Record first failure
      systemHealthService.recordCircuitBreakerFailure(component);
      let breaker = systemHealthService.circuitBreakers.get(component);
      expect(breaker.state).toBe('CLOSED');
      expect(breaker.failureCount).toBe(1);

      // Record second failure - should open breaker
      systemHealthService.recordCircuitBreakerFailure(component);
      breaker = systemHealthService.circuitBreakers.get(component);
      expect(breaker.state).toBe('OPEN');
      expect(mockPerformanceAlertingService.sendAlert).toHaveBeenCalledWith({
        type: 'circuit_breaker_open',
        severity: 'warning',
        component,
        message: `Circuit breaker opened for ${component} due to repeated failures`,
        timestamp: expect.any(String)
      });
    });

    test('should record circuit breaker success and close from half-open', () => {
      const component = 'external_api';
      systemHealthService.enableCircuitBreaker(component);

      const breaker = systemHealthService.circuitBreakers.get(component);
      breaker.state = 'HALF_OPEN';
      breaker.successCount = 2;

      // Third success should close the breaker
      systemHealthService.recordCircuitBreakerSuccess(component);

      expect(breaker.state).toBe('CLOSED');
      expect(breaker.failureCount).toBe(0);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        `Circuit breaker for ${component} closed - service recovered`
      );
    });
  });

  describe('Degradation Mode Management', () => {
    test('should enable degradation mode with fallback function', () => {
      const component = 'search_service';
      const fallbackFunction = jest.fn().mockResolvedValue('fallback result');

      systemHealthService.enableDegradationMode(component, fallbackFunction);

      const degradation = systemHealthService.degradationModes.get(component);
      expect(degradation.enabled).toBe(true);
      expect(degradation.fallback).toBe(fallbackFunction);
      expect(degradation.usageCount).toBe(0);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        `Degradation mode enabled for ${component}`
      );
    });

    test('should use degradation mode when available', async () => {
      const component = 'search_service';
      const fallbackFunction = jest.fn().mockResolvedValue('fallback result');
      const originalFunction = jest.fn().mockResolvedValue('original result');

      systemHealthService.enableDegradationMode(component, fallbackFunction);

      const result = await systemHealthService.useDegradationMode(
        component, 
        originalFunction, 
        'test arg'
      );

      expect(result).toBe('fallback result');
      expect(fallbackFunction).toHaveBeenCalledWith('test arg');
      expect(originalFunction).not.toHaveBeenCalled();

      const degradation = systemHealthService.degradationModes.get(component);
      expect(degradation.usageCount).toBe(1);
    });

    test('should use original function when degradation mode not enabled', async () => {
      const component = 'search_service';
      const originalFunction = jest.fn().mockResolvedValue('original result');

      const result = await systemHealthService.useDegradationMode(
        component, 
        originalFunction, 
        'test arg'
      );

      expect(result).toBe('original result');
      expect(originalFunction).toHaveBeenCalledWith('test arg');
    });

    test('should disable degradation mode and log usage statistics', () => {
      const component = 'search_service';
      const fallbackFunction = jest.fn();

      systemHealthService.enableDegradationMode(component, fallbackFunction);
      const degradation = systemHealthService.degradationModes.get(component);
      degradation.usageCount = 5;

      systemHealthService.disableDegradationMode(component);

      expect(systemHealthService.degradationModes.has(component)).toBe(false);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        `Degradation mode disabled for ${component} (used 5 times)`
      );
    });
  });

  describe('Capacity Management', () => {
    test('should check system capacity and calculate load', async () => {
      jest.spyOn(systemHealthService, 'collectSystemMetrics').mockResolvedValueOnce({
        cpu: { usage: 0.6 },
        memory: { usage: 0.7 },
        database: { connectionUtilization: 0.5 }
      });

      const result = await systemHealthService.checkCapacity();

      // Expected load: (60 * 0.4) + (70 * 0.4) + (50 * 0.2) = 24 + 28 + 10 = 62
      expect(result.currentLoad).toBe(62);
      expect(result.utilizationPercentage).toBe(62);
      expect(result.status).toBe('normal'); // < 80%
      expect(result.scalingRecommended).toBe(false); // < 80% threshold
    });

    test('should recommend scaling when load exceeds threshold', async () => {
      jest.spyOn(systemHealthService, 'collectSystemMetrics').mockResolvedValueOnce({
        cpu: { usage: 0.9 },
        memory: { usage: 0.85 },
        database: { connectionUtilization: 0.8 }
      });

      systemHealthService.capacityMetrics.lastScalingAction = null;

      const result = await systemHealthService.checkCapacity();

      // Expected load: (90 * 0.4) + (85 * 0.4) + (80 * 0.2) = 36 + 34 + 16 = 86
      expect(result.currentLoad).toBe(86);
      expect(result.status).toBe('warning'); // > 80%
      expect(result.scalingRecommended).toBe(true);
      expect(mockPerformanceAlertingService.sendAlert).toHaveBeenCalledWith({
        type: 'scaling_recommended',
        severity: 'warning',
        message: `System capacity at ${result.utilizationPercentage}% - scaling recommended`,
        details: result,
        timestamp: expect.any(String)
      });
    });
  });

  describe('Real-time Metrics', () => {
    test('should update real-time metrics and maintain window', () => {
      const metrics = {
        requestsPerSecond: 50,
        activeUsers: 25,
        errorRate: 0.02,
        responseTime: 150
      };

      systemHealthService.updateRealTimeMetrics(metrics);

      expect(systemHealthService.realTimeMetrics).toEqual(metrics);
      expect(systemHealthService.metricsWindow).toHaveLength(1);
      expect(systemHealthService.metricsWindow[0]).toMatchObject({
        timestamp: expect.any(Date),
        ...metrics
      });
    });

    test('should maintain metrics window size limit', () => {
      // Add more than window size
      for (let i = 0; i < 65; i++) {
        systemHealthService.updateRealTimeMetrics({
          requestsPerSecond: i,
          activeUsers: i,
          errorRate: 0.01,
          responseTime: 100
        });
      }

      expect(systemHealthService.metricsWindow).toHaveLength(60); // Window size limit
    });

    test('should get real-time metrics with trends', () => {
      // Add some historical data
      for (let i = 0; i < 20; i++) {
        systemHealthService.updateRealTimeMetrics({
          requestsPerSecond: 50 + i,
          activeUsers: 25,
          errorRate: 0.01,
          responseTime: 100 + i
        });
      }

      const result = systemHealthService.getRealTimeMetrics();

      expect(result.current).toBeDefined();
      expect(result.history).toHaveLength(20);
      expect(result.trends).toHaveProperty('requestsPerSecond');
      expect(result.trends).toHaveProperty('responseTime');
      expect(result.trends).toHaveProperty('errorRate');
    });
  });

  describe('Deployment Mode Management', () => {
    test('should enable deployment mode with adjusted thresholds', async () => {
      await systemHealthService.enableDeploymentMode();

      expect(systemHealthService.deploymentMode).toBe(true);
      expect(systemHealthService.alertThresholds.api.responseTime).toBe(5000);
      expect(systemHealthService.alertThresholds.system.cpuUsage).toBe(0.95);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Deployment mode enabled - health checks adjusted for deployment'
      );
      expect(mockPerformanceAlertingService.sendAlert).toHaveBeenCalledWith({
        type: 'deployment_mode',
        severity: 'info',
        message: 'System entering deployment mode',
        timestamp: expect.any(String)
      });
    });

    test('should disable deployment mode and restore normal thresholds', async () => {
      systemHealthService.deploymentMode = true;
      
      await systemHealthService.disableDeploymentMode();

      expect(systemHealthService.deploymentMode).toBe(false);
      expect(systemHealthService.alertThresholds.api.responseTime).toBe(2000);
      expect(systemHealthService.alertThresholds.system.cpuUsage).toBe(0.8);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Deployment mode disabled - normal health checks restored'
      );
      expect(mockPerformanceAlertingService.sendAlert).toHaveBeenCalledWith({
        type: 'deployment_complete',
        severity: 'info',
        message: 'System deployment completed successfully',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Graceful Shutdown', () => {
    test('should initiate graceful shutdown process', async () => {
      const mockConnection = { destroy: jest.fn() };
      systemHealthService.activeConnections.add(mockConnection);

      // Mock the waitForActiveConnections to resolve immediately
      jest.spyOn(systemHealthService, 'waitForActiveConnections').mockResolvedValueOnce();

      await systemHealthService.initiateGracefulShutdown();

      expect(systemHealthService.gracefulShutdownInProgress).toBe(true);
      expect(systemHealthService.healthStatus).toBe('shutting_down');
      expect(systemHealthService.isMonitoring).toBe(false);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith('Initiating graceful shutdown');
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith('Graceful shutdown completed');
    });

    test('should force close connections on timeout', async () => {
      const mockConnection = { destroy: jest.fn() };
      systemHealthService.activeConnections.add(mockConnection);
      systemHealthService.shutdownTimeout = 100; // Short timeout for test

      // Mock waitForActiveConnections to never resolve (timeout scenario)
      jest.spyOn(systemHealthService, 'waitForActiveConnections').mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      await systemHealthService.initiateGracefulShutdown();

      expect(mockConnection.destroy).toHaveBeenCalled();
      expect(systemHealthService.activeConnections.size).toBe(0);
    });
  });

  describe('Helper Methods', () => {
    test('should create timeout promise that rejects after specified time', async () => {
      const timeoutPromise = systemHealthService.createTimeoutPromise(100);

      await expect(timeoutPromise).rejects.toThrow('Health check timeout after 100ms');
    });

    test('should parse Redis info string correctly', () => {
      const infoString = 'used_memory:1048576\r\nmaxmemory:2097152\r\nconnected_clients:5\r\n';
      
      const result = systemHealthService.parseRedisInfo(infoString);

      expect(result.used_memory).toBe(1048576);
      expect(result.maxmemory).toBe(2097152);
      expect(result.connected_clients).toBe(5);
    });

    test('should register and remove active connections', () => {
      const mockConnection = {
        on: jest.fn(),
        destroy: jest.fn()
      };

      systemHealthService.registerConnection(mockConnection);

      expect(systemHealthService.activeConnections.has(mockConnection)).toBe(true);
      expect(mockConnection.on).toHaveBeenCalledWith('close', expect.any(Function));

      // Simulate connection close
      const closeHandler = mockConnection.on.mock.calls[0][1];
      closeHandler();

      expect(systemHealthService.activeConnections.has(mockConnection)).toBe(false);
    });

    test('should get health status with history', () => {
      systemHealthService.healthStatus = 'healthy';
      systemHealthService.isMonitoring = true;
      systemHealthService.lastHealthCheck = { status: 'healthy', timestamp: new Date() };
      systemHealthService.healthHistory = [
        { timestamp: new Date(), status: 'healthy' },
        { timestamp: new Date(), status: 'degraded' }
      ];

      const result = systemHealthService.getHealthStatus();

      expect(result.status).toBe('healthy');
      expect(result.isMonitoring).toBe(true);
      expect(result.lastCheck).toBeDefined();
      expect(result.history).toHaveLength(2);
    });

    test('should shutdown service cleanly', async () => {
      systemHealthService.isMonitoring = true;
      systemHealthService.healthCheckInterval = setInterval(() => {}, 1000);

      await systemHealthService.shutdown();

      expect(systemHealthService.isMonitoring).toBe(false);
      expect(systemHealthService.healthCheckInterval).toBeNull();
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'System health service shutdown complete'
      );
    });
  });
});