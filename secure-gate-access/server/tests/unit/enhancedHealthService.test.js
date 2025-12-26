/**
 * Unit Tests for Enhanced Health Service
 * Phase 4: Infrastructure & Monitoring
 * 
 * Tests cover:
 * - Comprehensive health endpoint
 * - Database statistics
 * - Connection pool monitoring
 * - System performance stats
 * - Liveness and readiness probes
 * - Health metrics tracking
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockQuery = jest.fn();
const mockDbPool = {
  query: mockQuery,
  totalCount: 10,
  idleCount: 5,
  waitingCount: 0,
  options: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    maxUses: 0
  }
};

const mockDbManager = {
  pool: mockDbPool,
  query: mockQuery
};

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: mockDbManager
}));

const mockLoggingService = {
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn()
};

jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  default: mockLoggingService
}));

// Import after mocks - note: enhancedHealthMonitoring is a named export, not default
const { enhancedHealthMonitoring } = await import('../../src/services/enhancedHealthService.js');

describe('EnhancedHealthService', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Reset mock query responses
    mockQuery.mockReset();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('EnhancedHealthMonitoring', () => {
    describe('constructor', () => {
      it('should initialize with default values', () => {
        expect(enhancedHealthMonitoring.healthHistory).toEqual([]);
        expect(enhancedHealthMonitoring.alertThresholds).toBeDefined();
        expect(enhancedHealthMonitoring.healthMetrics).toBeDefined();
        expect(enhancedHealthMonitoring.startTime).toBeDefined();
      });

      it('should have configured alert thresholds', () => {
        expect(enhancedHealthMonitoring.alertThresholds.database.maxLatency).toBe(1000);
        expect(enhancedHealthMonitoring.alertThresholds.memory.maxUsage).toBe(0.85);
        expect(enhancedHealthMonitoring.alertThresholds.responseTime.maxAvg).toBe(2000);
        expect(enhancedHealthMonitoring.alertThresholds.errorRate.maxRate).toBe(0.05);
      });
    });

    describe('getComprehensiveHealth', () => {
      const mockReq = {
        headers: {}
      };

      beforeEach(() => {
        // Setup mock query responses
        mockQuery
          .mockResolvedValueOnce({ rows: [{ server_time: new Date(), db_version: 'PostgreSQL 14.0' }] })
          .mockResolvedValueOnce({ rows: [{ count: '100' }] })
          .mockResolvedValueOnce({ rows: [{ count: '500' }] })
          .mockResolvedValueOnce({ rows: [{ count: '10' }] });
      });

      it('should return comprehensive health status', async () => {
        const result = await enhancedHealthMonitoring.getComprehensiveHealth(mockReq);
        
        expect(result.status).toBeDefined();
        expect(result.correlationId).toBeDefined();
        expect(result.responseTime).toBeDefined();
        expect(result.environment).toBeDefined();
        expect(result.application).toBeDefined();
        expect(result.monitoring).toBeDefined();
      });

      it('should use correlation ID from header if provided', async () => {
        const reqWithId = {
          headers: { 'x-correlation-id': 'custom-correlation-123' }
        };
        
        const result = await enhancedHealthMonitoring.getComprehensiveHealth(reqWithId);
        
        expect(result.correlationId).toBe('custom-correlation-123');
      });

      it('should include detailed info when requested', async () => {
        const result = await enhancedHealthMonitoring.getComprehensiveHealth(mockReq, true);
        
        expect(result.details).toBeDefined();
      });

      it('should handle errors gracefully', async () => {
        mockQuery.mockReset();
        mockQuery.mockRejectedValue(new Error('Database error'));
        
        const result = await enhancedHealthMonitoring.getComprehensiveHealth(mockReq);
        
        expect(result.status).toBe('unhealthy');
        // When db queries fail, individual health checks catch errors 
        // and return unhealthy status. The error is in the checks object, not at root level.
        expect(result.checks).toBeDefined();
      });

      it('should log health check', async () => {
        await enhancedHealthMonitoring.getComprehensiveHealth(mockReq);
        
        expect(mockLoggingService.logInfo).toHaveBeenCalled();
      });
    });

    describe('getDetailedSystemInfo', () => {
      beforeEach(() => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ server_time: new Date(), db_version: 'PostgreSQL 14.0' }] })
          .mockResolvedValueOnce({ rows: [{ count: '100' }] })
          .mockResolvedValueOnce({ rows: [{ count: '500' }] })
          .mockResolvedValueOnce({ rows: [{ count: '10' }] });
      });

      it('should return detailed system information', async () => {
        const info = await enhancedHealthMonitoring.getDetailedSystemInfo();
        
        expect(info.database).toBeDefined();
        expect(info.connectionPool).toBeDefined();
        expect(info.system).toBeDefined();
        expect(info.features).toBeDefined();
      });

      it('should handle errors and return error details', async () => {
        mockQuery.mockReset();
        mockQuery.mockRejectedValue(new Error('Failed'));
        
        const info = await enhancedHealthMonitoring.getDetailedSystemInfo();
        
        // getDetailedSystemInfo's inner functions (getDatabaseStats) catch errors
        // and return objects with error field. So info.database.error will be set.
        expect(info.database).toBeDefined();
        expect(info.database.error).toBe('Database stats collection failed');
        expect(info.database.details).toBe('Failed');
      });
    });

    describe('getDatabaseStats', () => {
      it('should return database statistics', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ server_time: new Date(), db_version: 'PostgreSQL 14.0' }] })
          .mockResolvedValueOnce({ rows: [{ count: '100' }] })
          .mockResolvedValueOnce({ rows: [{ count: '500' }] })
          .mockResolvedValueOnce({ rows: [{ count: '10' }] });
        
        const stats = await enhancedHealthMonitoring.getDatabaseStats();
        
        expect(stats.responseTime).toBeDefined();
        expect(stats.statistics).toBeDefined();
        expect(stats.performance).toBeDefined();
      });

      it('should classify performance based on response time', async () => {
        mockQuery
          .mockImplementation(() => new Promise(resolve => 
            setTimeout(() => resolve({ rows: [{ count: '0' }] }), 10)
          ));
        
        const stats = await enhancedHealthMonitoring.getDatabaseStats();
        
        expect(['excellent', 'good', 'acceptable', 'slow']).toContain(stats.performance?.status);
      });

      it('should handle database errors', async () => {
        mockQuery.mockRejectedValue(new Error('Connection failed'));
        
        const stats = await enhancedHealthMonitoring.getDatabaseStats();
        
        expect(stats.error).toBeDefined();
      });
    });

    describe('getConnectionPoolStats', () => {
      it('should return connection pool statistics', async () => {
        const stats = await enhancedHealthMonitoring.getConnectionPoolStats();
        
        expect(stats.totalConnections).toBeDefined();
        expect(stats.idleConnections).toBeDefined();
        expect(stats.maxConnections).toBeDefined();
        expect(stats.utilization).toBeDefined();
      });

      it('should calculate pool utilization', async () => {
        const stats = await enhancedHealthMonitoring.getConnectionPoolStats();
        
        expect(stats.utilization).toBe(50); // 10/20 = 50%
      });

      it('should determine pool status based on utilization', async () => {
        const stats = await enhancedHealthMonitoring.getConnectionPoolStats();
        
        expect(['critical', 'warning', 'moderate', 'low']).toContain(stats.status);
      });
    });

    describe('getSystemPerformanceStats', () => {
      it('should return system performance statistics', async () => {
        const stats = await enhancedHealthMonitoring.getSystemPerformanceStats();
        
        expect(stats.memory).toBeDefined();
        expect(stats.memory.heapUsed).toBeDefined();
        expect(stats.memory.heapTotal).toBeDefined();
        expect(stats.memory.rss).toBeDefined();
      });

      it('should return CPU usage information', async () => {
        const stats = await enhancedHealthMonitoring.getSystemPerformanceStats();
        
        expect(stats.cpu).toBeDefined();
        expect(stats.cpu.user).toBeDefined();
        expect(stats.cpu.system).toBeDefined();
      });

      it('should return process information', async () => {
        const stats = await enhancedHealthMonitoring.getSystemPerformanceStats();
        
        expect(stats.process).toBeDefined();
        expect(stats.process.pid).toBeDefined();
        expect(stats.process.uptime).toBeDefined();
        expect(stats.process.nodeVersion).toBeDefined();
        expect(stats.process.platform).toBeDefined();
      });
    });

    describe('getLivenessProbe', () => {
      it('should return alive status', async () => {
        const req = { headers: {} };
        
        const result = await enhancedHealthMonitoring.getLivenessProbe(req);
        
        expect(result.status).toBe('alive');
        expect(result.timestamp).toBeDefined();
        expect(result.pid).toBeDefined();
      });

      it('should use correlation ID from header', async () => {
        const req = { headers: { 'x-correlation-id': 'liveness-123' } };
        
        const result = await enhancedHealthMonitoring.getLivenessProbe(req);
        
        expect(result.correlationId).toBe('liveness-123');
      });
    });

    describe('getReadinessProbe', () => {
      beforeEach(() => {
        mockQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] });
      });

      it('should return ready status when dependencies are available', async () => {
        const req = { headers: {} };
        
        const result = await enhancedHealthMonitoring.getReadinessProbe(req);
        
        expect(result.status).toBe('ready');
        expect(result.responseTime).toBeDefined();
        expect(result.dependencies).toBeDefined();
      });

      it('should return not ready when database is unavailable', async () => {
        mockQuery.mockRejectedValue(new Error('Database unavailable'));
        const req = { headers: {} };
        
        const result = await enhancedHealthMonitoring.getReadinessProbe(req);
        
        // Service returns 'not-ready' with hyphen
        expect(result.status).toBe('not-ready');
        expect(result.error).toBeDefined();
      });
    });

    describe('updateHealthMetrics', () => {
      it('should update healthy check count', () => {
        const initialCount = enhancedHealthMonitoring.healthMetrics.healthyChecks;
        
        enhancedHealthMonitoring.updateHealthMetrics('healthy');
        
        expect(enhancedHealthMonitoring.healthMetrics.healthyChecks).toBe(initialCount + 1);
      });

      it('should update unhealthy check count', () => {
        const initialCount = enhancedHealthMonitoring.healthMetrics.unhealthyChecks;
        
        enhancedHealthMonitoring.updateHealthMetrics('unhealthy');
        
        expect(enhancedHealthMonitoring.healthMetrics.unhealthyChecks).toBe(initialCount + 1);
      });

      it('should update last failure on unhealthy status', () => {
        enhancedHealthMonitoring.updateHealthMetrics('unhealthy');
        
        expect(enhancedHealthMonitoring.healthMetrics.lastFailure).toBeDefined();
      });

      it('should update current status', () => {
        enhancedHealthMonitoring.updateHealthMetrics('healthy');
        
        expect(enhancedHealthMonitoring.healthMetrics.currentStatus).toBe('healthy');
      });
    });

    describe('calculateSuccessRate', () => {
      it('should calculate correct success rate', () => {
        // calculateSuccessRate uses healthyChecks / totalRequests * 100
        enhancedHealthMonitoring.healthMetrics.healthyChecks = 90;
        enhancedHealthMonitoring.healthMetrics.totalRequests = 100;
        
        const rate = enhancedHealthMonitoring.calculateSuccessRate();
        
        expect(rate).toBe(90);
      });

      it('should return 100 when no checks performed', () => {
        // When totalRequests is 0, the function returns 100 (default healthy)
        enhancedHealthMonitoring.healthMetrics.healthyChecks = 0;
        enhancedHealthMonitoring.healthMetrics.totalRequests = 0;
        
        const rate = enhancedHealthMonitoring.calculateSuccessRate();
        
        expect(rate).toBe(100);
      });
    });
  });
});
