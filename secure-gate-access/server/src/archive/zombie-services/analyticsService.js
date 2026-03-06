/**
 * Analytics Service
 * Comprehensive analytics covering user adoption, feature usage, and system performance
 */

import { dbManager } from '../database/db.enhanced.js';
import loggingService from './loggingService.js';
import performanceMonitoringService from './performanceMonitoringService.js';

class AnalyticsService {
  constructor() {
    this.analyticsCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.metricsCollectors = new Map();
    this.isCollecting = false;
  }

  /**
   * Initialize analytics service
   */
  async initialize() {
    try {
      await this.createAnalyticsTables();
      await this.setupMetricsCollectors();
      await this.startMetricsCollection();
      
      loggingService.logInfo('Analytics service initialized successfully');
    } catch (error) {
      loggingService.logError('Failed to initialize analytics service', error);
      throw error;
    }
  }

  /**
   * Create analytics database tables
   */
  async createAnalyticsTables() {
    const createUserActivityTable = `
      CREATE TABLE IF NOT EXISTS user_activity (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        estate_id INTEGER REFERENCES estates(id),
        session_id VARCHAR(100),
        activity_type VARCHAR(50) NOT NULL,
        feature_name VARCHAR(100),
        page_path VARCHAR(200),
        action_details JSONB DEFAULT '{}',
        duration_ms INTEGER,
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `;

    const createFeatureUsageTable = `
      CREATE TABLE IF NOT EXISTS feature_usage (
        id SERIAL PRIMARY KEY,
        estate_id INTEGER REFERENCES estates(id),
        feature_name VARCHAR(100) NOT NULL,
        usage_count INTEGER DEFAULT 1,
        unique_users INTEGER DEFAULT 1,
        total_duration_ms BIGINT DEFAULT 0,
        date DATE DEFAULT CURRENT_DATE,
        metadata JSONB DEFAULT '{}'
      );
    `;

    const createSystemMetricsTable = `
      CREATE TABLE IF NOT EXISTS system_metrics_history (
        id SERIAL PRIMARY KEY,
        metric_type VARCHAR(50) NOT NULL,
        metric_name VARCHAR(100) NOT NULL,
        metric_value DECIMAL(10,4),
        metadata JSONB DEFAULT '{}',
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `;

    await dbManager.query(createUserActivityTable);
    await dbManager.query(createFeatureUsageTable);
    await dbManager.query(createSystemMetricsTable);

    // Create indexes
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_user_activity_user_estate ON user_activity(user_id, estate_id);
      CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp ON user_activity(timestamp);
      CREATE INDEX IF NOT EXISTS idx_user_activity_feature ON user_activity(feature_name);
      CREATE INDEX IF NOT EXISTS idx_feature_usage_estate_date ON feature_usage(estate_id, date);
      CREATE INDEX IF NOT EXISTS idx_feature_usage_feature ON feature_usage(feature_name);
      CREATE INDEX IF NOT EXISTS idx_system_metrics_type_timestamp ON system_metrics_history(metric_type, timestamp);
    `;

    await dbManager.query(createIndexes);
  }
  /**
   * Setup metrics collectors
   */
  async setupMetricsCollectors() {
    // User adoption metrics collector
    this.metricsCollectors.set('user_adoption', {
      name: 'User Adoption Metrics',
      interval: 60000, // 1 minute
      collect: this.collectUserAdoptionMetrics.bind(this)
    });

    // Feature usage metrics collector
    this.metricsCollectors.set('feature_usage', {
      name: 'Feature Usage Metrics',
      interval: 300000, // 5 minutes
      collect: this.collectFeatureUsageMetrics.bind(this)
    });

    // System performance metrics collector
    this.metricsCollectors.set('system_performance', {
      name: 'System Performance Metrics',
      interval: 30000, // 30 seconds
      collect: this.collectSystemPerformanceMetrics.bind(this)
    });
  }

  /**
   * Start metrics collection
   */
  async startMetricsCollection() {
    if (this.isCollecting) {
      return;
    }

    this.isCollecting = true;

    for (const [collectorId, collector] of this.metricsCollectors) {
      const intervalId = setInterval(async () => {
        try {
          await collector.collect();
        } catch (error) {
          loggingService.logError(`Metrics collection failed for ${collector.name}`, error);
        }
      }, collector.interval);

      collector.intervalId = intervalId;
    }

    loggingService.logInfo('Analytics metrics collection started');
  }

  /**
   * Stop metrics collection
   */
  stopMetricsCollection() {
    if (!this.isCollecting) {
      return;
    }

    for (const [collectorId, collector] of this.metricsCollectors) {
      if (collector.intervalId) {
        clearInterval(collector.intervalId);
        delete collector.intervalId;
      }
    }

    this.isCollecting = false;
    loggingService.logInfo('Analytics metrics collection stopped');
  }

  /**
   * Track user activity
   */
  async trackUserActivity(activityData) {
    try {
      const {
        userId,
        estateId,
        sessionId,
        activityType,
        featureName,
        pagePath,
        actionDetails = {},
        durationMs
      } = activityData;

      await dbManager.query(`
        INSERT INTO user_activity (
          user_id, estate_id, session_id, activity_type, feature_name,
          page_path, action_details, duration_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        userId, estateId, sessionId, activityType, featureName,
        pagePath, JSON.stringify(actionDetails), durationMs
      ]);

      // Update feature usage aggregates
      if (featureName) {
        await this.updateFeatureUsage(estateId, featureName, userId, durationMs);
      }

    } catch (error) {
      loggingService.logError('Failed to track user activity', error, activityData);
    }
  }

  /**
   * Update feature usage aggregates
   */
  async updateFeatureUsage(estateId, featureName, userId, durationMs = 0) {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if record exists for today
      const existingResult = await dbManager.query(`
        SELECT id, usage_count, unique_users, total_duration_ms, metadata
        FROM feature_usage
        WHERE estate_id = $1 AND feature_name = $2 AND date = $3
      `, [estateId, featureName, today]);

      if (existingResult.rows.length > 0) {
        // Update existing record
        const existing = existingResult.rows[0];
        const metadata = existing.metadata || {};
        const uniqueUsers = metadata.userIds || [];
        
        if (!uniqueUsers.includes(userId)) {
          uniqueUsers.push(userId);
        }

        await dbManager.query(`
          UPDATE feature_usage
          SET usage_count = usage_count + 1,
              unique_users = $1,
              total_duration_ms = total_duration_ms + $2,
              metadata = $3
          WHERE id = $4
        `, [
          uniqueUsers.length,
          durationMs || 0,
          JSON.stringify({ ...metadata, userIds: uniqueUsers }),
          existing.id
        ]);
      } else {
        // Create new record
        await dbManager.query(`
          INSERT INTO feature_usage (
            estate_id, feature_name, usage_count, unique_users,
            total_duration_ms, date, metadata
          ) VALUES ($1, $2, 1, 1, $3, $4, $5)
        `, [
          estateId, featureName, durationMs || 0, today,
          JSON.stringify({ userIds: [userId] })
        ]);
      }

    } catch (error) {
      loggingService.logError('Failed to update feature usage', error, {
        estateId, featureName, userId
      });
    }
  }

  /**
   * Collect user adoption metrics
   */
  async collectUserAdoptionMetrics() {
    try {
      const metrics = await this.getUserAdoptionMetrics();
      
      // Store key metrics in history
      await this.storeMetric('user_adoption', 'total_users', metrics.totalUsers);
      await this.storeMetric('user_adoption', 'active_users_today', metrics.activeUsersToday);
      await this.storeMetric('user_adoption', 'new_users_today', metrics.newUsersToday);
      await this.storeMetric('user_adoption', 'retention_rate', metrics.retentionRate);

    } catch (error) {
      loggingService.logError('Failed to collect user adoption metrics', error);
    }
  }

  /**
   * Collect feature usage metrics
   */
  async collectFeatureUsageMetrics() {
    try {
      const metrics = await this.getFeatureUsageMetrics();
      
      // Store top feature usage
      for (const feature of metrics.topFeatures.slice(0, 10)) {
        await this.storeMetric('feature_usage', `feature_${feature.name}`, feature.usageCount);
      }

    } catch (error) {
      loggingService.logError('Failed to collect feature usage metrics', error);
    }
  }

  /**
   * Collect system performance metrics
   */
  async collectSystemPerformanceMetrics() {
    try {
      const systemMetrics = await performanceMonitoringService.getSystemMetrics();
      
      // Store system metrics
      if (systemMetrics.cpu) {
        await this.storeMetric('system_performance', 'cpu_usage', systemMetrics.cpu.usage);
      }
      
      if (systemMetrics.memory) {
        await this.storeMetric('system_performance', 'memory_usage', systemMetrics.memory.usage);
      }
      
      if (systemMetrics.api) {
        await this.storeMetric('system_performance', 'api_response_time', systemMetrics.api.averageResponseTime);
        await this.storeMetric('system_performance', 'api_error_rate', systemMetrics.api.errorRate);
      }

    } catch (error) {
      loggingService.logError('Failed to collect system performance metrics', error);
    }
  }

  /**
   * Store metric in history
   */
  async storeMetric(metricType, metricName, metricValue, metadata = {}) {
    try {
      await dbManager.query(`
        INSERT INTO system_metrics_history (metric_type, metric_name, metric_value, metadata)
        VALUES ($1, $2, $3, $4)
      `, [metricType, metricName, metricValue, JSON.stringify(metadata)]);

    } catch (error) {
      loggingService.logError('Failed to store metric', error, {
        metricType, metricName, metricValue
      });
    }
  }

  /**
   * Get user adoption metrics
   */
  async getUserAdoptionMetrics(filters = {}) {
    try {
      const { estateId, dateFrom, dateTo } = filters;
      
      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (estateId) {
        whereClause += ` AND estate_id = $${paramIndex++}`;
        params.push(estateId);
      }

      if (dateFrom) {
        whereClause += ` AND created_at >= $${paramIndex++}`;
        params.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ` AND created_at <= $${paramIndex++}`;
        params.push(dateTo);
      }

      // Total users
      const totalUsersQuery = `
        SELECT COUNT(*) as total_users
        FROM users
        ${whereClause}
      `;

      // Active users (logged in within last 30 days)
      const activeUsersQuery = `
        SELECT COUNT(DISTINCT user_id) as active_users
        FROM user_activity
        WHERE timestamp >= NOW() - INTERVAL '30 days'
        ${estateId ? 'AND estate_id = $1' : ''}
      `;

      // New users today
      const newUsersTodayQuery = `
        SELECT COUNT(*) as new_users_today
        FROM users
        WHERE DATE(created_at) = CURRENT_DATE
        ${estateId ? 'AND estate_id = $1' : ''}
      `;

      // User retention (users who were active in last 7 days and previous 7 days)
      const retentionQuery = `
        WITH recent_users AS (
          SELECT DISTINCT user_id
          FROM user_activity
          WHERE timestamp >= NOW() - INTERVAL '7 days'
          ${estateId ? 'AND estate_id = $1' : ''}
        ),
        previous_users AS (
          SELECT DISTINCT user_id
          FROM user_activity
          WHERE timestamp >= NOW() - INTERVAL '14 days'
          AND timestamp < NOW() - INTERVAL '7 days'
          ${estateId ? 'AND estate_id = $1' : ''}
        )
        SELECT 
          COUNT(DISTINCT r.user_id) as retained_users,
          COUNT(DISTINCT p.user_id) as previous_users
        FROM recent_users r
        FULL OUTER JOIN previous_users p ON r.user_id = p.user_id
      `;

      const [totalUsers, activeUsers, newUsersToday, retention] = await Promise.all([
        dbManager.query(totalUsersQuery, params),
        dbManager.query(activeUsersQuery, estateId ? [estateId] : []),
        dbManager.query(newUsersTodayQuery, estateId ? [estateId] : []),
        dbManager.query(retentionQuery, estateId ? [estateId] : [])
      ]);

      const retentionData = retention.rows[0];
      const retentionRate = retentionData.previous_users > 0 
        ? (retentionData.retained_users / retentionData.previous_users) * 100
        : 0;

      return {
        totalUsers: parseInt(totalUsers.rows[0].total_users),
        activeUsers: parseInt(activeUsers.rows[0].active_users),
        activeUsersToday: parseInt(activeUsers.rows[0].active_users), // Simplified
        newUsersToday: parseInt(newUsersToday.rows[0].new_users_today),
        retentionRate: parseFloat(retentionRate.toFixed(2))
      };

    } catch (error) {
      loggingService.logError('Failed to get user adoption metrics', error, filters);
      throw error;
    }
  }
  /**
   * Get feature usage metrics
   */
  async getFeatureUsageMetrics(filters = {}) {
    try {
      const { estateId, dateFrom, dateTo, limit = 20 } = filters;
      
      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (estateId) {
        whereClause += ` AND estate_id = $${paramIndex++}`;
        params.push(estateId);
      }

      if (dateFrom) {
        whereClause += ` AND date >= $${paramIndex++}`;
        params.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ` AND date <= $${paramIndex++}`;
        params.push(dateTo);
      }

      // Top features by usage
      const topFeaturesQuery = `
        SELECT 
          feature_name,
          SUM(usage_count) as total_usage,
          AVG(unique_users) as avg_unique_users,
          SUM(total_duration_ms) as total_duration
        FROM feature_usage
        ${whereClause}
        GROUP BY feature_name
        ORDER BY total_usage DESC
        LIMIT $${paramIndex++}
      `;
      params.push(limit);

      // Feature usage trends (last 30 days)
      const trendsQuery = `
        SELECT 
          date,
          feature_name,
          SUM(usage_count) as daily_usage,
          AVG(unique_users) as daily_users
        FROM feature_usage
        ${whereClause}
        AND date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY date, feature_name
        ORDER BY date DESC, daily_usage DESC
      `;

      const [topFeatures, trends] = await Promise.all([
        dbManager.query(topFeaturesQuery, params),
        dbManager.query(trendsQuery, params.slice(0, -1))
      ]);

      return {
        topFeatures: topFeatures.rows.map(row => ({
          name: row.feature_name,
          usageCount: parseInt(row.total_usage),
          uniqueUsers: parseFloat(row.avg_unique_users),
          totalDuration: parseInt(row.total_duration)
        })),
        trends: trends.rows
      };

    } catch (error) {
      loggingService.logError('Failed to get feature usage metrics', error, filters);
      throw error;
    }
  }

  /**
   * Get system performance analytics
   */
  async getSystemPerformanceAnalytics(filters = {}) {
    try {
      const { dateFrom, dateTo } = filters;
      
      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (dateFrom) {
        whereClause += ` AND timestamp >= $${paramIndex++}`;
        params.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ` AND timestamp <= $${paramIndex++}`;
        params.push(dateTo);
      }

      // Performance metrics over time
      const performanceQuery = `
        SELECT 
          DATE_TRUNC('hour', timestamp) as hour,
          metric_name,
          AVG(metric_value) as avg_value,
          MAX(metric_value) as max_value,
          MIN(metric_value) as min_value
        FROM system_metrics_history
        ${whereClause}
        AND metric_type = 'system_performance'
        GROUP BY hour, metric_name
        ORDER BY hour DESC, metric_name
      `;

      const result = await dbManager.query(performanceQuery, params);

      // Group by metric name
      const metrics = {};
      result.rows.forEach(row => {
        if (!metrics[row.metric_name]) {
          metrics[row.metric_name] = [];
        }
        metrics[row.metric_name].push({
          timestamp: row.hour,
          average: parseFloat(row.avg_value),
          maximum: parseFloat(row.max_value),
          minimum: parseFloat(row.min_value)
        });
      });

      return {
        metrics,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      loggingService.logError('Failed to get system performance analytics', error, filters);
      throw error;
    }
  }

  /**
   * Get comprehensive analytics dashboard
   */
  async getAnalyticsDashboard(filters = {}) {
    try {
      const cacheKey = `dashboard_${JSON.stringify(filters)}`;
      const cached = this.getCachedData(cacheKey);
      
      if (cached) {
        return cached;
      }

      const [
        userAdoption,
        featureUsage,
        systemPerformance
      ] = await Promise.all([
        this.getUserAdoptionMetrics(filters),
        this.getFeatureUsageMetrics(filters),
        this.getSystemPerformanceAnalytics(filters)
      ]);

      const dashboard = {
        userAdoption,
        featureUsage,
        systemPerformance,
        summary: {
          totalUsers: userAdoption.totalUsers,
          activeUsers: userAdoption.activeUsers,
          topFeature: featureUsage.topFeatures[0]?.name || 'N/A',
          systemHealth: 'healthy', // Would be calculated from performance metrics
          generatedAt: new Date().toISOString()
        }
      };

      this.setCachedData(cacheKey, dashboard);
      return dashboard;

    } catch (error) {
      loggingService.logError('Failed to get analytics dashboard', error, filters);
      throw error;
    }
  }

  /**
   * Get launch readiness indicators
   */
  async getLaunchReadinessIndicators() {
    try {
      const indicators = {
        userAdoption: {
          score: 0,
          status: 'not_ready',
          metrics: {},
          thresholds: {
            minUsers: 10,
            minActiveUsers: 5,
            minRetentionRate: 50
          }
        },
        systemPerformance: {
          score: 0,
          status: 'not_ready',
          metrics: {},
          thresholds: {
            maxResponseTime: 2000,
            maxErrorRate: 0.05,
            maxCpuUsage: 0.8,
            maxMemoryUsage: 0.85
          }
        },
        featureUsage: {
          score: 0,
          status: 'not_ready',
          metrics: {},
          thresholds: {
            minFeaturesUsed: 5,
            minUsagePerFeature: 10
          }
        },
        overall: {
          score: 0,
          status: 'not_ready',
          readyForLaunch: false
        }
      };

      // Get current metrics
      const userAdoption = await this.getUserAdoptionMetrics();
      const featureUsage = await this.getFeatureUsageMetrics();
      const systemMetrics = await performanceMonitoringService.getSystemMetrics();

      // Calculate user adoption score
      let userScore = 0;
      if (userAdoption.totalUsers >= indicators.userAdoption.thresholds.minUsers) userScore += 30;
      if (userAdoption.activeUsers >= indicators.userAdoption.thresholds.minActiveUsers) userScore += 30;
      if (userAdoption.retentionRate >= indicators.userAdoption.thresholds.minRetentionRate) userScore += 40;

      indicators.userAdoption.score = userScore;
      indicators.userAdoption.status = userScore >= 80 ? 'ready' : userScore >= 50 ? 'warning' : 'not_ready';
      indicators.userAdoption.metrics = userAdoption;

      // Calculate system performance score
      let perfScore = 0;
      if (systemMetrics.api?.averageResponseTime <= indicators.systemPerformance.thresholds.maxResponseTime) perfScore += 25;
      if (systemMetrics.api?.errorRate <= indicators.systemPerformance.thresholds.maxErrorRate) perfScore += 25;
      if (systemMetrics.cpu?.usage <= indicators.systemPerformance.thresholds.maxCpuUsage) perfScore += 25;
      if (systemMetrics.memory?.usage <= indicators.systemPerformance.thresholds.maxMemoryUsage) perfScore += 25;

      indicators.systemPerformance.score = perfScore;
      indicators.systemPerformance.status = perfScore >= 80 ? 'ready' : perfScore >= 50 ? 'warning' : 'not_ready';
      indicators.systemPerformance.metrics = systemMetrics;

      // Calculate feature usage score
      let featureScore = 0;
      const usedFeatures = featureUsage.topFeatures.length;
      const avgUsage = featureUsage.topFeatures.reduce((sum, f) => sum + f.usageCount, 0) / usedFeatures || 0;

      if (usedFeatures >= indicators.featureUsage.thresholds.minFeaturesUsed) featureScore += 50;
      if (avgUsage >= indicators.featureUsage.thresholds.minUsagePerFeature) featureScore += 50;

      indicators.featureUsage.score = featureScore;
      indicators.featureUsage.status = featureScore >= 80 ? 'ready' : featureScore >= 50 ? 'warning' : 'not_ready';
      indicators.featureUsage.metrics = featureUsage;

      // Calculate overall score
      const overallScore = Math.round((userScore + perfScore + featureScore) / 3);
      indicators.overall.score = overallScore;
      indicators.overall.status = overallScore >= 80 ? 'ready' : overallScore >= 50 ? 'warning' : 'not_ready';
      indicators.overall.readyForLaunch = overallScore >= 80;

      return indicators;

    } catch (error) {
      loggingService.logError('Failed to get launch readiness indicators', error);
      throw error;
    }
  }

  /**
   * Get cached data
   */
  getCachedData(key) {
    const cached = this.analyticsCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set cached data
   */
  setCachedData(key, data) {
    this.analyticsCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear analytics cache
   */
  clearCache() {
    this.analyticsCache.clear();
  }

  /**
   * Shutdown analytics service
   */
  async shutdown() {
    this.stopMetricsCollection();
    this.clearCache();
    loggingService.logInfo('Analytics service shutdown complete');
  }
}

export default new AnalyticsService();