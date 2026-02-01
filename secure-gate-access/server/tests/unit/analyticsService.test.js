/**
 * Unit Tests for Analytics Service
 * 
 * Tests user adoption analytics, feature usage tracking, system performance metrics,
 * and launch readiness indicators.
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockDbManager = {
  query: jest.fn(),
  pool: {
    connect: jest.fn()
  }
};

const mockLoggingService = {
  logInfo: jest.fn(),
  logError: jest.fn()
};

const mockPerformanceMonitoringService = {
  getSystemMetrics: jest.fn(),
  getApplicationMetrics: jest.fn()
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

const analyticsService = (await import('../../src/services/analyticsService.js')).default;

describe('Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    analyticsService.analyticsCache.clear();
    analyticsService.isCollecting = false;
    analyticsService.metricsCollectors.clear();
  });

  describe('Initialization', () => {
    test('should initialize analytics service successfully', async () => {
      mockDbManager.query.mockResolvedValue({ rows: [] });

      await analyticsService.initialize();

      expect(analyticsService.metricsCollectors.size).toBeGreaterThan(0);
      expect(analyticsService.isCollecting).toBe(true);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Analytics service initialized successfully'
      );
    });

    test('should handle initialization errors', async () => {
      const error = new Error('Database error');
      mockDbManager.query.mockRejectedValueOnce(error);

      await expect(analyticsService.initialize()).rejects.toThrow('Database error');
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Failed to initialize analytics service',
        error
      );
    });
  });

  describe('Analytics Tables Creation', () => {
    test('should create all required analytics tables', async () => {
      mockDbManager.query.mockResolvedValue({ rows: [] });

      await analyticsService.createAnalyticsTables();

      // Should create user_activity, feature_usage, and system_metrics_history tables
      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS user_activity')
      );
      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS feature_usage')
      );
      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS system_metrics_history')
      );
      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS')
      );
    });
  });

  describe('User Activity Tracking', () => {
    test('should track user activity successfully', async () => {
      const activityData = {
        userId: 123,
        estateId: 1,
        sessionId: 'session-123',
        activityType: 'page_view',
        featureName: 'visitor_management',
        pagePath: '/visitors',
        actionDetails: { action: 'view_list' },
        durationMs: 5000
      };

      mockDbManager.query
        .mockResolvedValueOnce({ rows: [] }) // Insert user activity
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Update feature usage

      await analyticsService.trackUserActivity(activityData);

      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_activity'),
        [
          123, 1, 'session-123', 'page_view', 'visitor_management',
          '/visitors', JSON.stringify({ action: 'view_list' }), 5000
        ]
      );
    });

    test('should handle activity tracking errors gracefully', async () => {
      const activityData = {
        userId: 123,
        estateId: 1,
        activityType: 'page_view'
      };

      const error = new Error('Database error');
      mockDbManager.query.mockRejectedValueOnce(error);

      await analyticsService.trackUserActivity(activityData);

      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Failed to track user activity',
        error,
        activityData
      );
    });
  });

  describe('Feature Usage Management', () => {
    test('should update feature usage for new feature', async () => {
      const estateId = 1;
      const featureName = 'visitor_invitations';
      const userId = 123;
      const durationMs = 3000;

      const today = new Date().toISOString().split('T')[0];

      // Mock no existing record
      mockDbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }); // Insert new record

      await analyticsService.updateFeatureUsage(estateId, featureName, userId, durationMs);

      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO feature_usage'),
        [
          estateId, featureName, 3000, today,
          JSON.stringify({ userIds: [userId] })
        ]
      );
    });

    test('should update existing feature usage record', async () => {
      const estateId = 1;
      const featureName = 'visitor_invitations';
      const userId = 456;
      const durationMs = 2000;

      const existingRecord = {
        id: 1,
        usage_count: 5,
        unique_users: 2,
        total_duration_ms: 10000,
        metadata: { userIds: [123, 789] }
      };

      // Mock existing record
      mockDbManager.query
        .mockResolvedValueOnce({ rows: [existingRecord] })
        .mockResolvedValueOnce({ rows: [] }); // Update record

      await analyticsService.updateFeatureUsage(estateId, featureName, userId, durationMs);

      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE feature_usage'),
        [
          3, // unique users (2 existing + 1 new)
          2000, // duration to add
          JSON.stringify({ userIds: [123, 789, 456] }), // updated user list
          1 // record id
        ]
      );
    });

    test('should not duplicate users in feature usage', async () => {
      const estateId = 1;
      const featureName = 'visitor_invitations';
      const userId = 123; // Existing user

      const existingRecord = {
        id: 1,
        metadata: { userIds: [123, 789] }
      };

      mockDbManager.query
        .mockResolvedValueOnce({ rows: [existingRecord] })
        .mockResolvedValueOnce({ rows: [] });

      await analyticsService.updateFeatureUsage(estateId, featureName, userId, 1000);

      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE feature_usage'),
        [
          2, // same unique user count
          1000,
          JSON.stringify({ userIds: [123, 789] }), // no duplicate user
          1
        ]
      );
    });
  });

  describe('User Adoption Metrics', () => {
    test('should get comprehensive user adoption metrics', async () => {
      const filters = { estateId: 1 };

      mockDbManager.query
        .mockResolvedValueOnce({ rows: [{ total_users: 150 }] }) // Total users
        .mockResolvedValueOnce({ rows: [{ active_users: 89 }] }) // Active users
        .mockResolvedValueOnce({ rows: [{ new_users_today: 12 }] }) // New users today
        .mockResolvedValueOnce({ rows: [{ retained_users: 45, previous_users: 60 }] }); // Retention

      const result = await analyticsService.getUserAdoptionMetrics(filters);

      expect(result.totalUsers).toBe(150);
      expect(result.activeUsers).toBe(89);
      expect(result.newUsersToday).toBe(12);
      expect(result.retentionRate).toBe(75); // 45/60 * 100
    });

    test('should handle zero retention calculation', async () => {
      mockDbManager.query
        .mockResolvedValueOnce({ rows: [{ total_users: 100 }] })
        .mockResolvedValueOnce({ rows: [{ active_users: 50 }] })
        .mockResolvedValueOnce({ rows: [{ new_users_today: 5 }] })
        .mockResolvedValueOnce({ rows: [{ retained_users: 0, previous_users: 0 }] });

      const result = await analyticsService.getUserAdoptionMetrics();

      expect(result.retentionRate).toBe(0);
    });

    test('should apply date filters correctly', async () => {
      const filters = {
        estateId: 1,
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31'
      };

      mockDbManager.query
        .mockResolvedValueOnce({ rows: [{ total_users: 100 }] })
        .mockResolvedValueOnce({ rows: [{ active_users: 50 }] })
        .mockResolvedValueOnce({ rows: [{ new_users_today: 5 }] })
        .mockResolvedValueOnce({ rows: [{ retained_users: 20, previous_users: 30 }] });

      await analyticsService.getUserAdoptionMetrics(filters);

      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE 1=1 AND estate_id = $1 AND created_at >= $2 AND created_at <= $3'),
        [1, '2025-01-01', '2025-01-31']
      );
    });
  });

  describe('Feature Usage Metrics', () => {
    test('should get feature usage metrics with top features', async () => {
      const filters = { estateId: 1, limit: 10 };

      const topFeaturesData = [
        { feature_name: 'visitor_invitations', total_usage: 250, avg_unique_users: 45, total_duration: 120000 },
        { feature_name: 'visitor_management', total_usage: 180, avg_unique_users: 32, total_duration: 95000 },
        { feature_name: 'reports', total_usage: 95, avg_unique_users: 18, total_duration: 45000 }
      ];

      const trendsData = [
        { date: '2025-01-15', feature_name: 'visitor_invitations', daily_usage: 25, daily_users: 8 },
        { date: '2025-01-14', feature_name: 'visitor_invitations', daily_usage: 22, daily_users: 7 }
      ];

      mockDbManager.query
        .mockResolvedValueOnce({ rows: topFeaturesData })
        .mockResolvedValueOnce({ rows: trendsData });

      const result = await analyticsService.getFeatureUsageMetrics(filters);

      expect(result.topFeatures).toHaveLength(3);
      expect(result.topFeatures[0]).toEqual({
        name: 'visitor_invitations',
        usageCount: 250,
        uniqueUsers: 45,
        totalDuration: 120000
      });
      expect(result.trends).toEqual(trendsData);
    });

    test('should apply date range filters to feature usage', async () => {
      const filters = {
        estateId: 1,
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31'
      };

      mockDbManager.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await analyticsService.getFeatureUsageMetrics(filters);

      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE 1=1 AND estate_id = $1 AND date >= $2 AND date <= $3'),
        expect.arrayContaining([1, '2025-01-01', '2025-01-31'])
      );
    });
  });

  describe('System Performance Analytics', () => {
    test('should get system performance analytics with metrics over time', async () => {
      const filters = {
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31'
      };

      const performanceData = [
        {
          hour: '2025-01-15T10:00:00Z',
          metric_name: 'cpu_usage',
          avg_value: 0.65,
          max_value: 0.85,
          min_value: 0.45
        },
        {
          hour: '2025-01-15T10:00:00Z',
          metric_name: 'memory_usage',
          avg_value: 0.72,
          max_value: 0.89,
          min_value: 0.58
        }
      ];

      mockDbManager.query.mockResolvedValueOnce({ rows: performanceData });

      const result = await analyticsService.getSystemPerformanceAnalytics(filters);

      expect(result.metrics.cpu_usage).toHaveLength(1);
      expect(result.metrics.cpu_usage[0]).toEqual({
        timestamp: '2025-01-15T10:00:00Z',
        average: 0.65,
        maximum: 0.85,
        minimum: 0.45
      });
      expect(result.metrics.memory_usage).toHaveLength(1);
      expect(result.generatedAt).toBeDefined();
    });

    test('should handle empty performance data', async () => {
      mockDbManager.query.mockResolvedValueOnce({ rows: [] });

      const result = await analyticsService.getSystemPerformanceAnalytics();

      expect(result.metrics).toEqual({});
      expect(result.generatedAt).toBeDefined();
    });
  });

  describe('Analytics Dashboard', () => {
    test('should get comprehensive analytics dashboard', async () => {
      const filters = { estateId: 1 };

      // Mock all the required data
      jest.spyOn(analyticsService, 'getUserAdoptionMetrics').mockResolvedValueOnce({
        totalUsers: 150,
        activeUsers: 89,
        retentionRate: 75
      });

      jest.spyOn(analyticsService, 'getFeatureUsageMetrics').mockResolvedValueOnce({
        topFeatures: [
          { name: 'visitor_invitations', usageCount: 250 }
        ]
      });

      jest.spyOn(analyticsService, 'getSystemPerformanceAnalytics').mockResolvedValueOnce({
        metrics: { cpu_usage: [] }
      });

      const result = await analyticsService.getAnalyticsDashboard(filters);

      expect(result.userAdoption.totalUsers).toBe(150);
      expect(result.featureUsage.topFeatures[0].name).toBe('visitor_invitations');
      expect(result.systemPerformance.metrics).toBeDefined();
      expect(result.summary.totalUsers).toBe(150);
      expect(result.summary.activeUsers).toBe(89);
      expect(result.summary.topFeature).toBe('visitor_invitations');
      expect(result.summary.generatedAt).toBeDefined();
    });

    test('should use cached dashboard data when available', async () => {
      const filters = { estateId: 1 };
      const cachedData = {
        userAdoption: { totalUsers: 100 },
        summary: { generatedAt: new Date().toISOString() }
      };

      // Set cache
      analyticsService.setCachedData(`dashboard_${JSON.stringify(filters)}`, cachedData);

      const result = await analyticsService.getAnalyticsDashboard(filters);

      expect(result).toEqual(cachedData);
      // Should not call the individual metric methods
      expect(mockDbManager.query).not.toHaveBeenCalled();
    });
  });

  describe('Launch Readiness Indicators', () => {
    test('should assess launch readiness with all indicators', async () => {
      // Mock user adoption metrics
      jest.spyOn(analyticsService, 'getUserAdoptionMetrics').mockResolvedValueOnce({
        totalUsers: 15,
        activeUsers: 8,
        retentionRate: 65
      });

      // Mock feature usage metrics
      jest.spyOn(analyticsService, 'getFeatureUsageMetrics').mockResolvedValueOnce({
        topFeatures: [
          { name: 'visitor_invitations', usageCount: 25 },
          { name: 'visitor_management', usageCount: 20 },
          { name: 'reports', usageCount: 15 },
          { name: 'settings', usageCount: 12 },
          { name: 'dashboard', usageCount: 18 }
        ]
      });

      // Mock system metrics
      mockPerformanceMonitoringService.getSystemMetrics.mockResolvedValueOnce({
        api: {
          averageResponseTime: 800,
          errorRate: 0.02
        },
        cpu: { usage: 0.6 },
        memory: { usage: 0.7 }
      });

      const result = await analyticsService.getLaunchReadinessIndicators();

      expect(result.userAdoption.score).toBeGreaterThan(0);
      expect(result.systemPerformance.score).toBeGreaterThan(0);
      expect(result.featureUsage.score).toBeGreaterThan(0);
      expect(result.overall.score).toBeGreaterThan(0);
      expect(result.overall.readyForLaunch).toBeDefined();
    });

    test('should calculate user adoption score correctly', async () => {
      jest.spyOn(analyticsService, 'getUserAdoptionMetrics').mockResolvedValueOnce({
        totalUsers: 12, // Above threshold (10)
        activeUsers: 6,  // Above threshold (5)
        retentionRate: 55 // Above threshold (50)
      });

      jest.spyOn(analyticsService, 'getFeatureUsageMetrics').mockResolvedValueOnce({
        topFeatures: []
      });

      mockPerformanceMonitoringService.getSystemMetrics.mockResolvedValueOnce({
        api: { averageResponseTime: 1500, errorRate: 0.03 },
        cpu: { usage: 0.7 },
        memory: { usage: 0.8 }
      });

      const result = await analyticsService.getLaunchReadinessIndicators();

      // Should get full score for user adoption (30 + 30 + 40 = 100)
      expect(result.userAdoption.score).toBe(100);
      expect(result.userAdoption.status).toBe('ready');
    });

    test('should calculate system performance score correctly', async () => {
      jest.spyOn(analyticsService, 'getUserAdoptionMetrics').mockResolvedValueOnce({
        totalUsers: 5, activeUsers: 3, retentionRate: 30
      });

      jest.spyOn(analyticsService, 'getFeatureUsageMetrics').mockResolvedValueOnce({
        topFeatures: []
      });

      mockPerformanceMonitoringService.getSystemMetrics.mockResolvedValueOnce({
        api: {
          averageResponseTime: 1500, // Below 2000ms threshold
          errorRate: 0.03 // Below 0.05 threshold
        },
        cpu: { usage: 0.7 }, // Below 0.8 threshold
        memory: { usage: 0.8 } // Below 0.85 threshold
      });

      const result = await analyticsService.getLaunchReadinessIndicators();

      // Should get full score for system performance (25 + 25 + 25 + 25 = 100)
      expect(result.systemPerformance.score).toBe(100);
      expect(result.systemPerformance.status).toBe('ready');
    });

    test('should determine overall launch readiness', async () => {
      jest.spyOn(analyticsService, 'getUserAdoptionMetrics').mockResolvedValueOnce({
        totalUsers: 15, activeUsers: 8, retentionRate: 65
      });

      jest.spyOn(analyticsService, 'getFeatureUsageMetrics').mockResolvedValueOnce({
        topFeatures: Array(6).fill().map((_, i) => ({
          name: `feature_${i}`,
          usageCount: 15
        }))
      });

      mockPerformanceMonitoringService.getSystemMetrics.mockResolvedValueOnce({
        api: { averageResponseTime: 800, errorRate: 0.02 },
        cpu: { usage: 0.6 },
        memory: { usage: 0.7 }
      });

      const result = await analyticsService.getLaunchReadinessIndicators();

      expect(result.overall.score).toBeGreaterThanOrEqual(80);
      expect(result.overall.readyForLaunch).toBe(true);
      expect(result.overall.status).toBe('ready');
    });
  });

  describe('Metrics Collection', () => {
    test('should setup metrics collectors correctly', async () => {
      await analyticsService.setupMetricsCollectors();

      expect(analyticsService.metricsCollectors.has('user_adoption')).toBe(true);
      expect(analyticsService.metricsCollectors.has('feature_usage')).toBe(true);
      expect(analyticsService.metricsCollectors.has('system_performance')).toBe(true);

      const userAdoptionCollector = analyticsService.metricsCollectors.get('user_adoption');
      expect(userAdoptionCollector.name).toBe('User Adoption Metrics');
      expect(userAdoptionCollector.interval).toBe(60000);
      expect(typeof userAdoptionCollector.collect).toBe('function');
    });

    test('should start metrics collection with intervals', async () => {
      await analyticsService.setupMetricsCollectors();
      await analyticsService.startMetricsCollection();

      expect(analyticsService.isCollecting).toBe(true);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Analytics metrics collection started'
      );

      // Each collector should have an interval ID
      for (const collector of analyticsService.metricsCollectors.values()) {
        expect(collector.intervalId).toBeDefined();
      }
    });

    test('should stop metrics collection and clear intervals', () => {
      analyticsService.isCollecting = true;
      
      // Mock collectors with intervals
      analyticsService.metricsCollectors.set('test', {
        intervalId: setInterval(() => {}, 1000)
      });

      analyticsService.stopMetricsCollection();

      expect(analyticsService.isCollecting).toBe(false);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Analytics metrics collection stopped'
      );
    });

    test('should collect user adoption metrics and store them', async () => {
      jest.spyOn(analyticsService, 'getUserAdoptionMetrics').mockResolvedValueOnce({
        totalUsers: 100,
        activeUsersToday: 25,
        newUsersToday: 5,
        retentionRate: 80
      });

      jest.spyOn(analyticsService, 'storeMetric').mockResolvedValue();

      await analyticsService.collectUserAdoptionMetrics();

      expect(analyticsService.storeMetric).toHaveBeenCalledWith('user_adoption', 'total_users', 100);
      expect(analyticsService.storeMetric).toHaveBeenCalledWith('user_adoption', 'active_users_today', 25);
      expect(analyticsService.storeMetric).toHaveBeenCalledWith('user_adoption', 'new_users_today', 5);
      expect(analyticsService.storeMetric).toHaveBeenCalledWith('user_adoption', 'retention_rate', 80);
    });
  });

  describe('Metric Storage', () => {
    test('should store metrics in history table', async () => {
      mockDbManager.query.mockResolvedValueOnce({ rows: [] });

      await analyticsService.storeMetric('user_adoption', 'total_users', 150, { source: 'test' });

      expect(mockDbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO system_metrics_history'),
        ['user_adoption', 'total_users', 150, JSON.stringify({ source: 'test' })]
      );
    });

    test('should handle metric storage errors', async () => {
      const error = new Error('Storage failed');
      mockDbManager.query.mockRejectedValueOnce(error);

      await analyticsService.storeMetric('test_type', 'test_metric', 100);

      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Failed to store metric',
        error,
        { metricType: 'test_type', metricName: 'test_metric', metricValue: 100 }
      );
    });
  });

  describe('Cache Management', () => {
    test('should get cached data when within timeout', () => {
      const testData = { test: 'data' };
      analyticsService.setCachedData('test_key', testData);

      const result = analyticsService.getCachedData('test_key');

      expect(result).toEqual(testData);
    });

    test('should return null for expired cache', () => {
      const testData = { test: 'data' };
      analyticsService.setCachedData('test_key', testData);

      // Mock expired cache
      const cacheEntry = analyticsService.analyticsCache.get('test_key');
      cacheEntry.timestamp = Date.now() - (analyticsService.cacheTimeout + 1000);

      const result = analyticsService.getCachedData('test_key');

      expect(result).toBeNull();
    });

    test('should clear all cached data', () => {
      analyticsService.setCachedData('key1', { data: 1 });
      analyticsService.setCachedData('key2', { data: 2 });

      analyticsService.clearCache();

      expect(analyticsService.analyticsCache.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle user adoption metrics errors', async () => {
      const error = new Error('Database query failed');
      mockDbManager.query.mockRejectedValueOnce(error);

      await expect(analyticsService.getUserAdoptionMetrics()).rejects.toThrow('Database query failed');
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Failed to get user adoption metrics',
        error,
        {}
      );
    });

    test('should handle feature usage metrics errors', async () => {
      const error = new Error('Query failed');
      mockDbManager.query.mockRejectedValueOnce(error);

      await expect(analyticsService.getFeatureUsageMetrics()).rejects.toThrow('Query failed');
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Failed to get feature usage metrics',
        error,
        {}
      );
    });

    test('should handle system performance analytics errors', async () => {
      const error = new Error('Performance query failed');
      mockDbManager.query.mockRejectedValueOnce(error);

      await expect(analyticsService.getSystemPerformanceAnalytics()).rejects.toThrow('Performance query failed');
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Failed to get system performance analytics',
        error,
        {}
      );
    });

    test('should handle analytics dashboard errors', async () => {
      const error = new Error('Dashboard generation failed');
      jest.spyOn(analyticsService, 'getUserAdoptionMetrics').mockRejectedValueOnce(error);

      await expect(analyticsService.getAnalyticsDashboard()).rejects.toThrow('Dashboard generation failed');
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Failed to get analytics dashboard',
        error,
        {}
      );
    });
  });

  describe('Shutdown', () => {
    test('should shutdown service cleanly', async () => {
      analyticsService.isCollecting = true;
      analyticsService.analyticsCache.set('test', { data: 'test' });

      await analyticsService.shutdown();

      expect(analyticsService.isCollecting).toBe(false);
      expect(analyticsService.analyticsCache.size).toBe(0);
      expect(mockLoggingService.logInfo).toHaveBeenCalledWith(
        'Analytics service shutdown complete'
      );
    });
  });
});