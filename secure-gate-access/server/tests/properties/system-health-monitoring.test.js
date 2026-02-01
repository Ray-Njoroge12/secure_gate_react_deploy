/**
 * Property Test: System Health Monitoring
 * **Validates: Requirements 15.1, 15.2**
 * 
 * Property 15: System Health Monitoring
 * For any system deployment or performance issue, comprehensive health checks should be 
 * available and real-time alerting should trigger appropriate escalation procedures
 */

import { jest } from '@jest/globals';
import fc from 'fast-check';
import { systemHealthService } from '../../src/services/systemHealthService.js';
import performanceAlertingService from '../../src/services/performanceAlertingService.js';

// Mock dependencies
const mockDbManager = {
  query: jest.fn(),
  getStatus: jest.fn(),
  pool: {
    connect: jest.fn()
  }
};

const mockRedisClient = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  ping: jest.fn(),
  info: jest.fn()
};

const mockPerformanceMonitoringService = {
  getApplicationMetrics: jest.fn(),
  getSystemMetrics: jest.fn()
};

const mockPerformanceAlertingService = {
  sendAlert: jest.fn()
};

const mockLoggingService = {
  logInfo: jest.fn(),
  logError: jest.fn(),
  logSecurity: jest.fn()
};

// Mock modules
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: mockDbManager
}));

jest.unstable_mockModule('../../src/services/performanceMonitoringService.js', () => ({
  default: mockPerformanceMonitoringService
}));

jest.unstable_mockModule('../../src/services/performanceAlertingService.js', () => ({
  default: mockPerformanceAlertingService
}));

jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  default: mockLoggingService
}));

// Test data generators
const healthStatusGenerator = fc.constantFrom('healthy', 'degraded', 'unhealthy');

const componentHealthGenerator = fc.record({
  status: healthStatusGenerator,
  responseTime: fc.integer({ min: 10, max: 5000 }),
  message: fc.string({ minLength: 10, maxLength: 100 }),
  details: fc.record({
    connectionPool: fc.record({
      total: fc.integer({ min: 1, max: 20 }),
      idle: fc.integer({ min: 0, max: 10 }),
      max: fc.integer({ min: 10, max: 50 }),
      utilization: fc.integer({ min: 0, max: 100 })
    }),
    memory: fc.record({
      used: fc.integer({ min: 1000000, max: 8000000000 }),
      max: fc.integer({ min: 2000000000, max: 16000000000 }),
      usage: fc.integer({ min: 0, max: 100 })
    }),
    services: fc.array(fc.record({
      name: fc.string({ minLength: 5, maxLength: 20 }),
      status: healthStatusGenerator,
      responseTime: fc.integer({ min: 50, max: 2000 })
    }), { minLength: 1, maxLength: 5 })
  }, { requiredKeys: [] })
});

const systemMetricsGenerator = fc.record({
  cpu: fc.record({
    usage: fc.float({ min: 0, max: 1 }),
    cores: fc.integer({ min: 1, max: 16 }),
    loadAverage: fc.array(fc.float({ min: 0, max: 4 }), { minLength: 3, maxLength: 3 })
  }),
  memory: fc.record({
    total: fc.integer({ min: 1000000000, max: 32000000000 }),
    used: fc.integer({ min: 500000000, max: 16000000000 }),
    free: fc.integer({ min: 100000000, max: 16000000000 }),
    usage: fc.float({ min: 0, max: 1 })
  }),
  disk: fc.record({
    usage: fc.float({ min: 0, max: 1 })
  }),
  uptime: fc.integer({ min: 0, max: 86400 * 30 }),
  timestamp: fc.date()
});

const alertGenerator = fc.record({
  component: fc.string({ minLength: 5, max: 20 }),
  severity: fc.constantFrom('low', 'warning', 'high', 'critical', 'emergency'),
  message: fc.string({ minLength: 20, maxLength: 200 }),
  timestamp: fc.date()
});

describe('Property 15: System Health Monitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockDbManager.query.mockResolvedValue({ rows: [{ health_check: 1 }] });
    mockDbManager.getStatus.mockReturnValue({
      totalConnections: 5,
      idleConnections: 2,
      maxConnections: 20
    });
    
    mockRedisClient.set.mockResolvedValue('OK');
    mockRedisClient.get.mockResolvedValue('health_check_value');
    mockRedisClient.del.mockResolvedValue(1);
    mockRedisClient.ping.mockResolvedValue('PONG');
    mockRedisClient.info.mockResolvedValue('used_memory:1000000\nmaxmemory:2000000');
    
    mockPerformanceMonitoringService.getApplicationMetrics.mockResolvedValue({
      api: {
        averageResponseTime: 500,
        errorRate: 0.01
      }
    });
    
    mockPerformanceAlertingService.sendAlert.mockResolvedValue({ id: 'alert-123' });
  });

  test('comprehensive health checks should cover all system components', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        databaseHealth: componentHealthGenerator,
        redisHealth: componentHealthGenerator,
        externalServicesHealth: componentHealthGenerator,
        systemResourcesHealth: componentHealthGenerator,
        applicationHealth: componentHealthGenerator
      }),
      async ({ databaseHealth, redisHealth, externalServicesHealth, systemResourcesHealth, applicationHealth }) => {
        // Setup mocks based on generated health data
        if (databaseHealth.status === 'healthy') {
          mockDbManager.query.mockResolvedValue({ rows: [{ health_check: 1 }] });
        } else {
          mockDbManager.query.mockRejectedValue(new Error('Database connection failed'));
        }
        
        if (systemResourcesHealth.details?.memory) {
          mockPerformanceMonitoringService.getSystemMetrics = jest.fn().mockResolvedValue({
            cpu: { usage: 0.5, cores: 4 },
            memory: {
              total: systemResourcesHealth.details.memory.max,
              used: systemResourcesHealth.details.memory.used,
              usage: systemResourcesHealth.details.memory.usage / 100
            },
            disk: { usage: 0.3 }
          });
        }

        // Create a new instance for testing
        const testHealthService = Object.create(systemHealthService);
        testHealthService.redisClient = mockRedisClient;
        
        // Perform health check
        const healthReport = await testHealthService.performHealthCheck();
        
        // Property: Health report should contain all required components
        expect(healthReport).toHaveProperty('timestamp');
        expect(healthReport).toHaveProperty('status');
        expect(healthReport).toHaveProperty('components');
        expect(healthReport).toHaveProperty('metrics');
        expect(healthReport).toHaveProperty('alerts');
        expect(healthReport).toHaveProperty('responseTime');
        
        // Property: All critical components should be checked
        const requiredComponents = ['database', 'system_resources', 'application'];
        requiredComponents.forEach(component => {
          expect(healthReport.components).toHaveProperty(component);
        });
        
        // Property: Each component should have required health information
        Object.values(healthReport.components).forEach(component => {
          expect(component).toHaveProperty('name');
          expect(component).toHaveProperty('status');
          expect(['healthy', 'degraded', 'unhealthy']).toContain(component.status);
          
          if (component.status !== 'unhealthy') {
            expect(component).toHaveProperty('responseTime');
            expect(typeof component.responseTime).toBe('number');
            expect(component.responseTime).toBeGreaterThanOrEqual(0);
          }
        });
        
        // Property: Overall status should reflect component health
        const criticalComponents = Object.values(healthReport.components)
          .filter(c => c.critical);
        const unhealthyCritical = criticalComponents.filter(c => c.status === 'unhealthy');
        const degradedCritical = criticalComponents.filter(c => c.status === 'degraded');
        
        if (unhealthyCritical.length > 0) {
          expect(healthReport.status).toBe('unhealthy');
        } else if (degradedCritical.length > 0) {
          expect(['degraded', 'unhealthy']).toContain(healthReport.status);
        }
        
        // Property: Response time should be reasonable
        expect(healthReport.responseTime).toBeGreaterThan(0);
        expect(healthReport.responseTime).toBeLessThan(30000); // 30 seconds max
      }
    ), { numRuns: 100 });
  });

  test('real-time alerting should trigger for performance issues', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        alerts: fc.array(alertGenerator, { minLength: 0, maxLength: 5 }),
        systemMetrics: systemMetricsGenerator,
        criticalThresholds: fc.record({
          cpuThreshold: fc.float({ min: 0.7, max: 0.95 }),
          memoryThreshold: fc.float({ min: 0.8, max: 0.95 }),
          responseTimeThreshold: fc.integer({ min: 1000, max: 5000 })
        })
      }),
      async ({ alerts, systemMetrics, criticalThresholds }) => {
        // Setup system metrics that may trigger alerts
        mockPerformanceMonitoringService.getSystemMetrics.mockResolvedValue(systemMetrics);
        
        // Setup application metrics
        const highResponseTime = systemMetrics.cpu.usage > criticalThresholds.cpuThreshold;
        mockPerformanceMonitoringService.getApplicationMetrics.mockResolvedValue({
          api: {
            averageResponseTime: highResponseTime ? criticalThresholds.responseTimeThreshold + 500 : 500,
            errorRate: 0.01
          }
        });
        
        const testHealthService = Object.create(systemHealthService);
        testHealthService.redisClient = mockRedisClient;
        
        // Perform health check
        const healthReport = await testHealthService.performHealthCheck();
        
        // Property: Alerts should be generated for threshold violations
        if (systemMetrics.cpu.usage > criticalThresholds.cpuThreshold) {
          expect(healthReport.alerts.length).toBeGreaterThan(0);
          
          const cpuAlert = healthReport.alerts.find(alert => 
            alert.message.toLowerCase().includes('cpu') || 
            alert.component === 'system_resources'
          );
          
          if (cpuAlert) {
            expect(['warning', 'critical']).toContain(cpuAlert.severity);
            expect(cpuAlert).toHaveProperty('message');
            expect(cpuAlert).toHaveProperty('component');
            expect(cpuAlert).toHaveProperty('timestamp');
          }
        }
        
        if (systemMetrics.memory.usage > criticalThresholds.memoryThreshold) {
          expect(healthReport.alerts.length).toBeGreaterThan(0);
          
          const memoryAlert = healthReport.alerts.find(alert => 
            alert.message.toLowerCase().includes('memory') || 
            alert.component === 'system_resources'
          );
          
          if (memoryAlert) {
            expect(['warning', 'critical']).toContain(memoryAlert.severity);
          }
        }
        
        // Property: Critical alerts should trigger escalation
        const criticalAlerts = healthReport.alerts.filter(alert => alert.severity === 'critical');
        
        if (criticalAlerts.length > 0) {
          // Should have called alert service for each critical alert
          expect(mockPerformanceAlertingService.sendAlert).toHaveBeenCalled();
          
          const alertCalls = mockPerformanceAlertingService.sendAlert.mock.calls;
          const criticalAlertCalls = alertCalls.filter(call => 
            call[0].severity === 'critical'
          );
          
          expect(criticalAlertCalls.length).toBeGreaterThan(0);
          
          // Property: Alert calls should have proper structure
          criticalAlertCalls.forEach(call => {
            const alertData = call[0];
            expect(alertData).toHaveProperty('type');
            expect(alertData).toHaveProperty('severity');
            expect(alertData).toHaveProperty('component');
            expect(alertData).toHaveProperty('message');
            expect(alertData).toHaveProperty('timestamp');
          });
        }
        
        // Property: All alerts should have required fields
        healthReport.alerts.forEach(alert => {
          expect(alert).toHaveProperty('component');
          expect(alert).toHaveProperty('severity');
          expect(alert).toHaveProperty('message');
          expect(typeof alert.component).toBe('string');
          expect(typeof alert.severity).toBe('string');
          expect(typeof alert.message).toBe('string');
          expect(alert.component.length).toBeGreaterThan(0);
          expect(alert.message.length).toBeGreaterThan(0);
        });
      }
    ), { numRuns: 100 });
  });

  test('health monitoring should maintain historical data', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(
        fc.record({
          status: healthStatusGenerator,
          responseTime: fc.integer({ min: 100, max: 3000 }),
          alertCount: fc.integer({ min: 0, max: 10 }),
          timestamp: fc.date()
        }),
        { minLength: 5, maxLength: 20 }
      ),
      async (healthHistory) => {
        const testHealthService = Object.create(systemHealthService);
        testHealthService.healthHistory = [];
        testHealthService.redisClient = mockRedisClient;
        
        // Simulate multiple health checks
        for (const historyItem of healthHistory) {
          const mockHealthReport = {
            timestamp: historyItem.timestamp.toISOString(),
            status: historyItem.status,
            responseTime: historyItem.responseTime,
            alerts: Array(historyItem.alertCount).fill().map((_, i) => ({
              component: `component_${i}`,
              severity: 'warning',
              message: `Test alert ${i}`
            })),
            components: {},
            metrics: {}
          };
          
          testHealthService.addToHealthHistory(mockHealthReport);
        }
        
        const healthStatus = testHealthService.getHealthStatus();
        
        // Property: Health history should be maintained
        expect(healthStatus).toHaveProperty('history');
        expect(Array.isArray(healthStatus.history)).toBe(true);
        
        // Property: History should not exceed maximum size (100 items)
        expect(healthStatus.history.length).toBeLessThanOrEqual(100);
        
        // Property: History items should have required fields
        healthStatus.history.forEach(item => {
          expect(item).toHaveProperty('timestamp');
          expect(item).toHaveProperty('status');
          expect(item).toHaveProperty('responseTime');
          expect(item).toHaveProperty('alertCount');
          
          expect(['healthy', 'degraded', 'unhealthy']).toContain(item.status);
          expect(typeof item.responseTime).toBe('number');
          expect(typeof item.alertCount).toBe('number');
          expect(item.responseTime).toBeGreaterThanOrEqual(0);
          expect(item.alertCount).toBeGreaterThanOrEqual(0);
        });
        
        // Property: History should be ordered by timestamp (most recent last)
        for (let i = 1; i < healthStatus.history.length; i++) {
          const prevTimestamp = new Date(healthStatus.history[i - 1].timestamp);
          const currTimestamp = new Date(healthStatus.history[i].timestamp);
          expect(currTimestamp.getTime()).toBeGreaterThanOrEqual(prevTimestamp.getTime());
        }
      }
    ), { numRuns: 100 });
  });

  test('health check timeouts should be enforced', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        componentTimeouts: fc.record({
          database: fc.integer({ min: 1000, max: 10000 }),
          redis: fc.integer({ min: 500, max: 5000 }),
          external_services: fc.integer({ min: 2000, max: 15000 }),
          system_resources: fc.integer({ min: 1000, max: 5000 }),
          application: fc.integer({ min: 1000, max: 8000 })
        }),
        simulateSlowResponse: fc.boolean()
      }),
      async ({ componentTimeouts, simulateSlowResponse }) => {
        // Setup slow responses if requested
        if (simulateSlowResponse) {
          mockDbManager.query.mockImplementation(() => 
            new Promise(resolve => setTimeout(() => resolve({ rows: [{ health_check: 1 }] }), 
              componentTimeouts.database + 1000))
          );
        }
        
        const testHealthService = Object.create(systemHealthService);
        testHealthService.redisClient = mockRedisClient;
        
        // Override health check configurations with test timeouts
        testHealthService.healthChecks = new Map([
          ['database', {
            name: 'Database Connection',
            check: testHealthService.checkDatabaseHealth.bind(testHealthService),
            critical: true,
            timeout: componentTimeouts.database
          }],
          ['redis', {
            name: 'Redis Cache',
            check: testHealthService.checkRedisHealth.bind(testHealthService),
            critical: true,
            timeout: componentTimeouts.redis
          }]
        ]);
        
        const startTime = Date.now();
        const healthReport = await testHealthService.performHealthCheck();
        const totalTime = Date.now() - startTime;
        
        // Property: Health check should complete within reasonable time
        const maxExpectedTime = Math.max(...Object.values(componentTimeouts)) + 5000; // 5s buffer
        expect(totalTime).toBeLessThan(maxExpectedTime);
        
        // Property: Timed out components should be marked as unhealthy
        if (simulateSlowResponse) {
          const databaseComponent = healthReport.components.database;
          if (databaseComponent) {
            // Should either be unhealthy due to timeout or have completed within timeout
            if (databaseComponent.status === 'unhealthy') {
              expect(databaseComponent.error).toMatch(/timeout|failed/i);
            }
          }
        }
        
        // Property: Health report should always be returned
        expect(healthReport).toHaveProperty('timestamp');
        expect(healthReport).toHaveProperty('status');
        expect(healthReport).toHaveProperty('responseTime');
        expect(typeof healthReport.responseTime).toBe('number');
        expect(healthReport.responseTime).toBeGreaterThan(0);
      }
    ), { numRuns: 100 });
  });

  test('escalation procedures should follow defined workflows', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        alertSeverity: fc.constantFrom('low', 'warning', 'high', 'critical', 'emergency'),
        componentType: fc.constantFrom('database', 'redis', 'external_services', 'system_resources', 'application'),
        alertMessage: fc.string({ minLength: 20, maxLength: 200 }),
        escalationEnabled: fc.boolean()
      }),
      async ({ alertSeverity, componentType, alertMessage, escalationEnabled }) => {
        const testHealthService = Object.create(systemHealthService);
        
        // Create test alert
        const testAlert = {
          component: componentType,
          severity: alertSeverity,
          message: alertMessage
        };
        
        // Process the alert
        await testHealthService.processHealthAlerts([testAlert]);
        
        // Property: Alert should be sent through alerting service
        expect(mockPerformanceAlertingService.sendAlert).toHaveBeenCalled();
        
        const alertCall = mockPerformanceAlertingService.sendAlert.mock.calls[0];
        const sentAlert = alertCall[0];
        
        // Property: Sent alert should have proper structure
        expect(sentAlert).toHaveProperty('type', 'health_check');
        expect(sentAlert).toHaveProperty('severity', alertSeverity);
        expect(sentAlert).toHaveProperty('component', componentType);
        expect(sentAlert).toHaveProperty('message', alertMessage);
        expect(sentAlert).toHaveProperty('timestamp');
        
        // Property: Critical and emergency alerts should be logged as security events
        if (['critical', 'emergency'].includes(alertSeverity)) {
          expect(mockLoggingService.logSecurity).toHaveBeenCalledWith(
            'warn',
            'Health alert triggered',
            expect.objectContaining({
              component: componentType,
              severity: alertSeverity,
              message: alertMessage
            })
          );
        }
        
        // Property: All alerts should be logged
        expect(mockLoggingService.logSecurity).toHaveBeenCalled();
        
        const logCall = mockLoggingService.logSecurity.mock.calls.find(call => 
          call[1] === 'Health alert triggered'
        );
        
        expect(logCall).toBeDefined();
        expect(logCall[2]).toMatchObject({
          component: componentType,
          severity: alertSeverity,
          message: alertMessage
        });
      }
    ), { numRuns: 100 });
  });
});

// Run the test with warning about long-running property-based tests
console.warn('LongRunningPBT: This property-based test suite may take several minutes to complete due to comprehensive health check testing.');