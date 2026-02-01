/**
 * Property Test: Launch Readiness Monitoring
 * **Validates: Requirements 15.6**
 * 
 * Property 30: Launch Readiness Monitoring
 * For any production deployment, comprehensive analytics should be available covering 
 * user adoption, feature usage, and system performance metrics
 */

import { jest } from '@jest/globals';
import fc from 'fast-check';
import analyticsService from '../../src/services/analyticsService.js';

// Mock dependencies
const mockDbManager = {
  query: jest.fn()
};

const mockPerformanceMonitoringService = {
  getSystemMetrics: jest.fn()
};

const mockLoggingService = {
  logInfo: jest.fn(),
  logError: jest.fn()
};

// Mock modules
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: mockDbManager
}));

jest.unstable_mockModule('../../src/services/performanceMonitoringService.js', () => ({
  default: mockPerformanceMonitoringService
}));

jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  default: mockLoggingService
}));

// Test data generators
const userAdoptionMetricsGenerator = fc.record({
  totalUsers: fc.integer({ min: 0, max: 10000 }),
  activeUsers: fc.integer({ min: 0, max: 5000 }),
  activeUsersToday: fc.integer({ min: 0, max: 1000 }),
  newUsersToday: fc.integer({ min: 0, max: 100 }),
  retentionRate: fc.float({ min: 0, max: Math.fround(100) })
});

const featureUsageMetricsGenerator = fc.record({
  topFeatures: fc.array(
    fc.record({
      name: fc.string({ minLength: 3, maxLength: 30 }),
      usageCount: fc.integer({ min: 1, max: 1000 }),
      uniqueUsers: fc.integer({ min: 1, max: 500 }),
      totalDuration: fc.integer({ min: 1000, max: 3600000 })
    }),
    { minLength: 1, maxLength: 20 }
  ),
  trends: fc.array(
    fc.record({
      date: fc.date(),
      feature_name: fc.string({ minLength: 3, maxLength: 30 }),
      daily_usage: fc.integer({ min: 1, max: 100 }),
      daily_users: fc.integer({ min: 1, max: 50 })
    }),
    { minLength: 0, maxLength: 30 }
  )
});

const systemPerformanceMetricsGenerator = fc.record({
  cpu: fc.record({
    usage: fc.float({ min: 0, max: Math.fround(1) }),
    cores: fc.integer({ min: 1, max: 16 })
  }),
  memory: fc.record({
    usage: fc.float({ min: 0, max: Math.fround(1) }),
    total: fc.integer({ min: 1000000000, max: 32000000000 }),
    used: fc.integer({ min: 500000000, max: 16000000000 })
  }),
  api: fc.record({
    averageResponseTime: fc.integer({ min: 50, max: 5000 }),
    errorRate: fc.float({ min: 0, max: Math.fround(0.2) })
  })
});

const launchReadinessThresholdsGenerator = fc.record({
  userAdoption: fc.record({
    minUsers: fc.integer({ min: 5, max: 50 }),
    minActiveUsers: fc.integer({ min: 3, max: 25 }),
    minRetentionRate: fc.float({ min: Math.fround(30), max: Math.fround(80) })
  }),
  systemPerformance: fc.record({
    maxResponseTime: fc.integer({ min: 1000, max: 5000 }),
    maxErrorRate: fc.float({ min: Math.fround(0.01), max: Math.fround(0.1) }),
    maxCpuUsage: fc.float({ min: Math.fround(0.6), max: Math.fround(0.9) }),
    maxMemoryUsage: fc.float({ min: Math.fround(0.7), max: Math.fround(0.95) })
  }),
  featureUsage: fc.record({
    minFeaturesUsed: fc.integer({ min: 3, max: 15 }),
    minUsagePerFeature: fc.integer({ min: 5, max: 50 })
  })
});

describe('Property 30: Launch Readiness Monitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockDbManager.query.mockResolvedValue({ rows: [] });
    mockPerformanceMonitoringService.getSystemMetrics.mockResolvedValue({
      cpu: { usage: 0.5, cores: 4 },
      memory: { usage: 0.6, total: 8000000000, used: 4800000000 },
      api: { averageResponseTime: 800, errorRate: 0.02 }
    });
  });

  test('comprehensive analytics should cover user adoption metrics', async () => {
    await fc.assert(fc.asyncProperty(
      userAdoptionMetricsGenerator,
      async (userMetrics) => {
        // Setup mock data for user adoption queries
        mockDbManager.query
          .mockResolvedValueOnce({ rows: [{ total_users: userMetrics.totalUsers }] })
          .mockResolvedValueOnce({ rows: [{ active_users: userMetrics.activeUsers }] })
          .mockResolvedValueOnce({ rows: [{ new_users_today: userMetrics.newUsersToday }] })
          .mockResolvedValueOnce({ 
            rows: [{ 
              retained_users: Math.floor(userMetrics.activeUsers * userMetrics.retentionRate / 100),
              previous_users: userMetrics.activeUsers 
            }] 
          });

        const result = await analyticsService.getUserAdoptionMetrics();

        // Property: User adoption metrics should include all required fields
        expect(result).toHaveProperty('totalUsers');
        expect(result).toHaveProperty('activeUsers');
        expect(result).toHaveProperty('activeUsersToday');
        expect(result).toHaveProperty('newUsersToday');
        expect(result).toHaveProperty('retentionRate');

        // Property: All metrics should be non-negative numbers
        expect(result.totalUsers).toBeGreaterThanOrEqual(0);
        expect(result.activeUsers).toBeGreaterThanOrEqual(0);
        expect(result.activeUsersToday).toBeGreaterThanOrEqual(0);
        expect(result.newUsersToday).toBeGreaterThanOrEqual(0);
        expect(result.retentionRate).toBeGreaterThanOrEqual(0);

        // Property: Active users should not exceed total users
        expect(result.activeUsers).toBeLessThanOrEqual(result.totalUsers);

        // Property: Retention rate should be a percentage (0-100)
        expect(result.retentionRate).toBeLessThanOrEqual(100);

        // Property: All numeric values should be finite
        expect(Number.isFinite(result.totalUsers)).toBe(true);
        expect(Number.isFinite(result.activeUsers)).toBe(true);
        expect(Number.isFinite(result.retentionRate)).toBe(true);
      }
    ), { numRuns: 100 });
  });

  test('feature usage analytics should track comprehensive usage patterns', async () => {
    await fc.assert(fc.asyncProperty(
      featureUsageMetricsGenerator,
      async (featureMetrics) => {
        // Setup mock data for feature usage queries
        const topFeaturesData = featureMetrics.topFeatures.map(feature => ({
          feature_name: feature.name,
          total_usage: feature.usageCount,
          avg_unique_users: feature.uniqueUsers,
          total_duration: feature.totalDuration
        }));

        mockDbManager.query
          .mockResolvedValueOnce({ rows: topFeaturesData })
          .mockResolvedValueOnce({ rows: featureMetrics.trends });

        const result = await analyticsService.getFeatureUsageMetrics();

        // Property: Feature usage should include top features and trends
        expect(result).toHaveProperty('topFeatures');
        expect(result).toHaveProperty('trends');
        expect(Array.isArray(result.topFeatures)).toBe(true);
        expect(Array.isArray(result.trends)).toBe(true);

        // Property: Each top feature should have required metrics
        result.topFeatures.forEach(feature => {
          expect(feature).toHaveProperty('name');
          expect(feature).toHaveProperty('usageCount');
          expect(feature).toHaveProperty('uniqueUsers');
          expect(feature).toHaveProperty('totalDuration');

          // Property: Feature metrics should be positive numbers
          expect(typeof feature.name).toBe('string');
          expect(feature.name.length).toBeGreaterThan(0);
          expect(feature.usageCount).toBeGreaterThan(0);
          expect(feature.uniqueUsers).toBeGreaterThan(0);
          expect(feature.totalDuration).toBeGreaterThan(0);

          // Property: Usage count should be at least as high as unique users
          expect(feature.usageCount).toBeGreaterThanOrEqual(feature.uniqueUsers);
        });

        // Property: Features should be ordered by usage count (descending)
        for (let i = 1; i < result.topFeatures.length; i++) {
          expect(result.topFeatures[i - 1].usageCount).toBeGreaterThanOrEqual(
            result.topFeatures[i].usageCount
          );
        }
      }
    ), { numRuns: 100 });
  });

  test('system performance analytics should provide comprehensive metrics', async () => {
    await fc.assert(fc.asyncProperty(
      systemPerformanceMetricsGenerator,
      async (performanceMetrics) => {
        mockPerformanceMonitoringService.getSystemMetrics.mockResolvedValue(performanceMetrics);

        // Setup mock data for performance history
        const performanceHistory = [
          {
            hour: new Date(),
            metric_name: 'cpu_usage',
            avg_value: performanceMetrics.cpu.usage,
            max_value: Math.min(performanceMetrics.cpu.usage * 1.2, 1),
            min_value: Math.max(performanceMetrics.cpu.usage * 0.8, 0)
          },
          {
            hour: new Date(),
            metric_name: 'memory_usage',
            avg_value: performanceMetrics.memory.usage,
            max_value: Math.min(performanceMetrics.memory.usage * 1.1, 1),
            min_value: Math.max(performanceMetrics.memory.usage * 0.9, 0)
          },
          {
            hour: new Date(),
            metric_name: 'api_response_time',
            avg_value: performanceMetrics.api.averageResponseTime,
            max_value: performanceMetrics.api.averageResponseTime * 1.5,
            min_value: performanceMetrics.api.averageResponseTime * 0.7
          }
        ];

        mockDbManager.query.mockResolvedValue({ rows: performanceHistory });

        const result = await analyticsService.getSystemPerformanceAnalytics();

        // Property: Performance analytics should include metrics over time
        expect(result).toHaveProperty('metrics');
        expect(result).toHaveProperty('generatedAt');
        expect(typeof result.metrics).toBe('object');

        // Property: Each metric should have historical data points
        Object.values(result.metrics).forEach(metricData => {
          expect(Array.isArray(metricData)).toBe(true);
          
          metricData.forEach(dataPoint => {
            expect(dataPoint).toHaveProperty('timestamp');
            expect(dataPoint).toHaveProperty('average');
            expect(dataPoint).toHaveProperty('maximum');
            expect(dataPoint).toHaveProperty('minimum');

            // Property: Min <= Average <= Max
            expect(dataPoint.minimum).toBeLessThanOrEqual(dataPoint.average);
            expect(dataPoint.average).toBeLessThanOrEqual(dataPoint.maximum);

            // Property: All values should be non-negative
            expect(dataPoint.minimum).toBeGreaterThanOrEqual(0);
            expect(dataPoint.average).toBeGreaterThanOrEqual(0);
            expect(dataPoint.maximum).toBeGreaterThanOrEqual(0);
          });
        });

        // Property: Generated timestamp should be recent
        const generatedTime = new Date(result.generatedAt);
        const now = new Date();
        const timeDiff = now.getTime() - generatedTime.getTime();
        expect(timeDiff).toBeLessThan(60000); // Within last minute
      }
    ), { numRuns: 100 });
  });

  test('launch readiness indicators should provide accurate scoring', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        userMetrics: userAdoptionMetricsGenerator,
        featureMetrics: featureUsageMetricsGenerator,
        performanceMetrics: systemPerformanceMetricsGenerator,
        thresholds: launchReadinessThresholdsGenerator
      }),
      async ({ userMetrics, featureMetrics, performanceMetrics, thresholds }) => {
        // Setup mocks for all required data
        mockDbManager.query
          .mockResolvedValueOnce({ rows: [{ total_users: userMetrics.totalUsers }] })
          .mockResolvedValueOnce({ rows: [{ active_users: userMetrics.activeUsers }] })
          .mockResolvedValueOnce({ rows: [{ new_users_today: userMetrics.newUsersToday }] })
          .mockResolvedValueOnce({ 
            rows: [{ 
              retained_users: Math.floor(userMetrics.activeUsers * userMetrics.retentionRate / 100),
              previous_users: userMetrics.activeUsers 
            }] 
          })
          .mockResolvedValueOnce({ 
            rows: featureMetrics.topFeatures.map(f => ({
              feature_name: f.name,
              total_usage: f.usageCount,
              avg_unique_users: f.uniqueUsers,
              total_duration: f.totalDuration
            }))
          })
          .mockResolvedValueOnce({ rows: featureMetrics.trends });

        mockPerformanceMonitoringService.getSystemMetrics.mockResolvedValue(performanceMetrics);

        // Override thresholds for testing
        const originalThresholds = analyticsService.thresholds;
        analyticsService.thresholds = thresholds;

        try {
          const result = await analyticsService.getLaunchReadinessIndicators();

          // Property: Launch readiness should include all indicator categories
          expect(result).toHaveProperty('userAdoption');
          expect(result).toHaveProperty('systemPerformance');
          expect(result).toHaveProperty('featureUsage');
          expect(result).toHaveProperty('overall');

          // Property: Each indicator should have score, status, metrics, and thresholds
          ['userAdoption', 'systemPerformance', 'featureUsage'].forEach(category => {
            const indicator = result[category];
            expect(indicator).toHaveProperty('score');
            expect(indicator).toHaveProperty('status');
            expect(indicator).toHaveProperty('metrics');
            expect(indicator).toHaveProperty('thresholds');

            // Property: Score should be between 0 and 100
            expect(indicator.score).toBeGreaterThanOrEqual(0);
            expect(indicator.score).toBeLessThanOrEqual(100);

            // Property: Status should be valid
            expect(['ready', 'warning', 'not_ready']).toContain(indicator.status);

            // Property: Score and status should be consistent
            if (indicator.score >= 80) {
              expect(indicator.status).toBe('ready');
            } else if (indicator.score >= 50) {
              expect(['warning', 'ready']).toContain(indicator.status);
            } else {
              expect(['not_ready', 'warning']).toContain(indicator.status);
            }
          });

          // Property: Overall readiness should be calculated correctly
          const categoryScores = [
            result.userAdoption.score,
            result.systemPerformance.score,
            result.featureUsage.score
          ];
          const expectedOverallScore = Math.round(
            categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length
          );

          expect(result.overall.score).toBe(expectedOverallScore);

          // Property: Ready for launch should match overall score
          expect(result.overall.readyForLaunch).toBe(result.overall.score >= 80);

          // Property: Overall status should reflect overall score
          if (result.overall.score >= 80) {
            expect(result.overall.status).toBe('ready');
          } else if (result.overall.score >= 50) {
            expect(['warning', 'ready']).toContain(result.overall.status);
          } else {
            expect(['not_ready', 'warning']).toContain(result.overall.status);
          }

        } finally {
          // Restore original thresholds
          analyticsService.thresholds = originalThresholds;
        }
      }
    ), { numRuns: 100 });
  });

  test('analytics dashboard should provide comprehensive data aggregation', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        userMetrics: userAdoptionMetricsGenerator,
        featureMetrics: featureUsageMetricsGenerator,
        performanceMetrics: systemPerformanceMetricsGenerator
      }),
      async ({ userMetrics, featureMetrics, performanceMetrics }) => {
        // Setup comprehensive mock data
        mockDbManager.query
          .mockResolvedValueOnce({ rows: [{ total_users: userMetrics.totalUsers }] })
          .mockResolvedValueOnce({ rows: [{ active_users: userMetrics.activeUsers }] })
          .mockResolvedValueOnce({ rows: [{ new_users_today: userMetrics.newUsersToday }] })
          .mockResolvedValueOnce({ 
            rows: [{ 
              retained_users: Math.floor(userMetrics.activeUsers * userMetrics.retentionRate / 100),
              previous_users: userMetrics.activeUsers 
            }] 
          })
          .mockResolvedValueOnce({ 
            rows: featureMetrics.topFeatures.map(f => ({
              feature_name: f.name,
              total_usage: f.usageCount,
              avg_unique_users: f.uniqueUsers,
              total_duration: f.totalDuration
            }))
          })
          .mockResolvedValueOnce({ rows: featureMetrics.trends })
          .mockResolvedValueOnce({ rows: [] }); // Performance history

        mockPerformanceMonitoringService.getSystemMetrics.mockResolvedValue(performanceMetrics);

        const result = await analyticsService.getAnalyticsDashboard();

        // Property: Dashboard should aggregate all analytics categories
        expect(result).toHaveProperty('userAdoption');
        expect(result).toHaveProperty('featureUsage');
        expect(result).toHaveProperty('systemPerformance');
        expect(result).toHaveProperty('summary');

        // Property: Summary should provide key insights
        expect(result.summary).toHaveProperty('totalUsers');
        expect(result.summary).toHaveProperty('activeUsers');
        expect(result.summary).toHaveProperty('topFeature');
        expect(result.summary).toHaveProperty('systemHealth');
        expect(result.summary).toHaveProperty('generatedAt');

        // Property: Summary values should match detailed data
        expect(result.summary.totalUsers).toBe(result.userAdoption.totalUsers);
        expect(result.summary.activeUsers).toBe(result.userAdoption.activeUsers);

        if (result.featureUsage.topFeatures.length > 0) {
          expect(result.summary.topFeature).toBe(result.featureUsage.topFeatures[0].name);
        }

        // Property: Generated timestamp should be recent and valid
        const generatedTime = new Date(result.summary.generatedAt);
        expect(generatedTime.getTime()).toBeLessThanOrEqual(Date.now());
        expect(generatedTime.getTime()).toBeGreaterThan(Date.now() - 60000); // Within last minute

        // Property: System health should be a valid status
        expect(['healthy', 'degraded', 'unhealthy']).toContain(result.summary.systemHealth);
      }
    ), { numRuns: 100 });
  });

  test('metrics collection should maintain data consistency', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        metricType: fc.constantFrom('user_adoption', 'feature_usage', 'system_performance'),
        metricName: fc.string({ minLength: 3, maxLength: 50 }),
        metricValue: fc.float({ min: 0, max: Math.fround(10000) }),
        metadata: fc.record({
          source: fc.string({ minLength: 3, maxLength: 20 }),
          timestamp: fc.date()
        })
      }),
      async ({ metricType, metricName, metricValue, metadata }) => {
        // Mock successful metric storage
        mockDbManager.query.mockResolvedValue({ rows: [{ id: 1 }] });

        await analyticsService.storeMetric(metricType, metricName, metricValue, metadata);

        // Property: Metric storage should be called with correct parameters
        expect(mockDbManager.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO system_metrics_history'),
          [metricType, metricName, metricValue, JSON.stringify(metadata)]
        );

        // Property: Metric type should be valid
        expect(['user_adoption', 'feature_usage', 'system_performance']).toContain(metricType);

        // Property: Metric name should be non-empty string
        expect(typeof metricName).toBe('string');
        expect(metricName.length).toBeGreaterThan(0);

        // Property: Metric value should be a finite number
        expect(Number.isFinite(metricValue)).toBe(true);
        expect(metricValue).toBeGreaterThanOrEqual(0);

        // Property: Metadata should be serializable
        expect(() => JSON.stringify(metadata)).not.toThrow();
      }
    ), { numRuns: 100 });
  });
});

// Run the test with warning about long-running property-based tests
console.warn('LongRunningPBT: This property-based test suite may take several minutes to complete due to comprehensive analytics testing.');