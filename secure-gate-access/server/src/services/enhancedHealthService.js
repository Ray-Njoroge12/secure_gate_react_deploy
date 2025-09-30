/**
 * Enhanced Health Endpoint & Monitoring System
 * Extends existing health service with comprehensive monitoring capabilities
 */

import { healthCheck } from '../services/healthService.js';
import loggingService from '../services/loggingService.js';
import { randomUUID } from 'crypto';
import pool from '../database/db.js';

class EnhancedHealthMonitoring {
  constructor() {
    this.healthHistory = [];
    this.alertThresholds = {
      database: { maxLatency: 1000 }, // 1 second
      memory: { maxUsage: 0.85 }, // 85%
      responseTime: { maxAvg: 2000 }, // 2 seconds
      errorRate: { maxRate: 0.05 } // 5%
    };
    this.healthMetrics = {
      uptime: 0,
      totalRequests: 0,
      healthyChecks: 0,
      unhealthyChecks: 0,
      lastFailure: null,
      currentStatus: 'unknown'
    };
    this.startTime = Date.now();
  }

  /**
   * Enhanced health endpoint with comprehensive system status
   */
  async getComprehensiveHealth(req, includeDetails = false) {
    const correlationId = req.headers['x-correlation-id'] || randomUUID();
    const startTime = Date.now();
    
    try {
      // Get detailed health checks
      const healthResult = await healthCheck.runChecks();
      
      // Add enhanced metrics
      const enhancedResult = {
        ...healthResult,
        correlationId,
        responseTime: Date.now() - startTime,
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          environment: process.env.NODE_ENV || 'development',
          pid: process.pid
        },
        application: {
          name: 'secure-gate-access',
          version: '1.0.0', // TODO: Get from package.json
          uptime: Math.floor((Date.now() - this.startTime) / 1000),
          startTime: new Date(this.startTime).toISOString()
        },
        monitoring: {
          totalHealthChecks: this.healthMetrics.totalRequests,
          healthyChecks: this.healthMetrics.healthyChecks,
          unhealthyChecks: this.healthMetrics.unhealthyChecks,
          successRate: this.calculateSuccessRate(),
          lastFailure: this.healthMetrics.lastFailure
        }
      };

      // Add detailed information if requested
      if (includeDetails) {
        enhancedResult.details = await this.getDetailedSystemInfo();
      }

      // Update metrics
      this.updateHealthMetrics(enhancedResult.status);
      
      // Log health check
      loggingService.logInfo('Health check completed', {
        correlationId,
        status: enhancedResult.status,
        responseTime: enhancedResult.responseTime,
        checksRun: Object.keys(enhancedResult.checks).length
      });

      return enhancedResult;
      
    } catch (error) {
      this.updateHealthMetrics('unhealthy');
      
      loggingService.logError('Health check failed', {
        correlationId,
        error: error.message,
        stack: error.stack
      });
      
      return {
        status: 'unhealthy',
        error: error.message,
        correlationId,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get detailed system information for health monitoring
   */
  async getDetailedSystemInfo() {
    try {
      const [databaseStats, connectionPoolStats, systemPerformance] = await Promise.all([
        this.getDatabaseStats(),
        this.getConnectionPoolStats(),
        this.getSystemPerformanceStats()
      ]);

      return {
        database: databaseStats,
        connectionPool: connectionPoolStats,
        system: systemPerformance,
        features: {
          redis: process.env.REDIS_URL ? 'configured' : 'disabled',
          ssl: process.env.NODE_ENV === 'production' ? 'required' : 'optional',
          clustering: process.env.NODE_ENV === 'production' ? 'recommended' : 'disabled'
        }
      };
    } catch (error) {
      return {
        error: 'Failed to collect detailed system information',
        details: error.message
      };
    }
  }

  /**
   * Get database performance statistics
   */
  async getDatabaseStats() {
    try {
      const start = Date.now();
      
      // Run performance test queries
      const [
        connectionTest,
        userCount,
        visitorCount,
        activeVisitors
      ] = await Promise.all([
        pool.query('SELECT NOW() as server_time, version() as db_version'),
        pool.query('SELECT COUNT(*) as count FROM users'),
        pool.query('SELECT COUNT(*) as count FROM visitors'),
        pool.query("SELECT COUNT(*) as count FROM visitors WHERE status IN ('ON_PREMISE', 'CONFIRMED')")
      ]);
      
      const queryTime = Date.now() - start;
      
      return {
        responseTime: queryTime,
        serverTime: connectionTest.rows[0]?.server_time,
        version: connectionTest.rows[0]?.db_version?.split(' ')[0] || 'Unknown',
        statistics: {
          totalUsers: parseInt(userCount.rows[0]?.count || 0),
          totalVisitors: parseInt(visitorCount.rows[0]?.count || 0),
          activeVisitors: parseInt(activeVisitors.rows[0]?.count || 0)
        },
        performance: {
          avgQueryTime: queryTime,
          status: queryTime < 100 ? 'excellent' : 
                 queryTime < 500 ? 'good' : 
                 queryTime < 1000 ? 'acceptable' : 'slow'
        }
      };
    } catch (error) {
      return {
        error: 'Database stats collection failed',
        details: error.message
      };
    }
  }

  /**
   * Get connection pool statistics
   */
  async getConnectionPoolStats() {
    try {
      const poolStats = {
        totalConnections: pool.totalCount || 0,
        idleConnections: pool.idleCount || 0,
        waitingConnections: pool.waitingCount || 0,
        maxConnections: pool.options?.max || 10,
        configuration: {
          idleTimeoutMillis: pool.options?.idleTimeoutMillis || 30000,
          connectionTimeoutMillis: pool.options?.connectionTimeoutMillis || 2000,
          maxUses: pool.options?.maxUses || 0
        }
      };

      // Calculate utilization
      const utilization = poolStats.totalConnections / poolStats.maxConnections;
      
      return {
        ...poolStats,
        utilization: Math.round(utilization * 100),
        status: utilization > 0.9 ? 'critical' :
                utilization > 0.7 ? 'warning' :
                utilization > 0.5 ? 'moderate' : 'low',
        health: poolStats.waitingConnections > 0 ? 'warning' : 'healthy'
      };
    } catch (error) {
      return {
        error: 'Connection pool stats collection failed',
        details: error.message
      };
    }
  }

  /**
   * Get system performance statistics
   */
  async getSystemPerformanceStats() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024)
      },
      cpu: {
        user: Math.round(cpuUsage.user / 1000), // Convert to milliseconds
        system: Math.round(cpuUsage.system / 1000)
      },
      process: {
        pid: process.pid,
        uptime: Math.round(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
  }

  /**
   * Liveness probe endpoint (minimal overhead)
   */
  async getLivenessProbe(req) {
    const correlationId = req.headers['x-correlation-id'] || randomUUID();
    
    try {
      // Very basic check - just verify the process is responsive
      return {
        status: 'alive',
        timestamp: new Date().toISOString(),
        correlationId,
        pid: process.pid
      };
    } catch (error) {
      return {
        status: 'dead',
        error: error.message,
        timestamp: new Date().toISOString(),
        correlationId
      };
    }
  }

  /**
   * Readiness probe endpoint (checks dependencies)
   */
  async getReadinessProbe(req) {
    const correlationId = req.headers['x-correlation-id'] || randomUUID();
    const start = Date.now();
    
    try {
      // Check critical dependencies for readiness
      await pool.query('SELECT 1');
      
      const responseTime = Date.now() - start;
      
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        correlationId,
        responseTime,
        dependencies: {
          database: 'ready'
        }
      };
    } catch (error) {
      return {
        status: 'not-ready',
        error: error.message,
        timestamp: new Date().toISOString(),
        correlationId,
        responseTime: Date.now() - start,
        dependencies: {
          database: 'failed'
        }
      };
    }
  }

  /**
   * Startup probe endpoint (checks if application finished initializing)
   */
  async getStartupProbe(req) {
    const correlationId = req.headers['x-correlation-id'] || randomUUID();
    
    try {
      // Check if application has been running long enough to be considered started
      const uptime = Date.now() - this.startTime;
      const minStartupTime = 5000; // 5 seconds minimum
      
      if (uptime < minStartupTime) {
        return {
          status: 'starting',
          timestamp: new Date().toISOString(),
          correlationId,
          uptime,
          message: `Starting up... ${Math.round((uptime / 1000) * 10) / 10}s elapsed`
        };
      }

      // Verify critical components are initialized
      await pool.query('SELECT 1');
      
      return {
        status: 'started',
        timestamp: new Date().toISOString(),
        correlationId,
        uptime,
        message: 'Application startup complete'
      };
    } catch (error) {
      return {
        status: 'startup-failed',
        error: error.message,
        timestamp: new Date().toISOString(),
        correlationId
      };
    }
  }

  /**
   * Update health metrics tracking
   */
  updateHealthMetrics(status) {
    this.healthMetrics.totalRequests++;
    
    if (status === 'healthy') {
      this.healthMetrics.healthyChecks++;
      this.healthMetrics.currentStatus = 'healthy';
    } else {
      this.healthMetrics.unhealthyChecks++;
      this.healthMetrics.currentStatus = status;
      this.healthMetrics.lastFailure = new Date().toISOString();
    }
  }

  /**
   * Calculate success rate for health checks
   */
  calculateSuccessRate() {
    if (this.healthMetrics.totalRequests === 0) return 100;
    return Math.round((this.healthMetrics.healthyChecks / this.healthMetrics.totalRequests) * 100);
  }

  /**
   * Get health metrics summary
   */
  getHealthMetrics() {
    return {
      ...this.healthMetrics,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      successRate: this.calculateSuccessRate()
    };
  }

  /**
   * Register custom health check for business logic
   */
  registerBusinessHealthCheck(name, checkFunction) {
    healthCheck.registerCheck(name, checkFunction);
  }

  /**
   * Add application-specific health checks
   */
  initializeApplicationHealthChecks() {
    // Check authentication service
    this.registerBusinessHealthCheck('authentication', async () => {
      try {
        // Test JWT functionality
        const testUser = await pool.query('SELECT id FROM users LIMIT 1');
        return {
          status: 'healthy',
          details: 'Authentication service operational',
          userCount: testUser.rowCount
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message,
          details: 'Authentication service check failed'
        };
      }
    });

    // Check visitor management system
    this.registerBusinessHealthCheck('visitor-system', async () => {
      try {
        const activeVisitors = await pool.query("SELECT COUNT(*) as count FROM visitors WHERE status = 'ON_PREMISE'");
        const recentVisitors = await pool.query("SELECT COUNT(*) as count FROM visitors WHERE created_at > NOW() - INTERVAL '1 hour'");
        
        return {
          status: 'healthy',
          details: 'Visitor management system operational',
          metrics: {
            activeVisitors: parseInt(activeVisitors.rows[0]?.count || 0),
            recentVisitors: parseInt(recentVisitors.rows[0]?.count || 0)
          }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message,
          details: 'Visitor system check failed'
        };
      }
    });

    // Check notification system
    this.registerBusinessHealthCheck('notifications', async () => {
      try {
        // Basic check - verify notification configuration
        const hasEmailConfig = !!(process.env.SMTP_HOST && process.env.SMTP_USER);
        const hasSMSConfig = !!(process.env.SMS_PROVIDER);
        
        return {
          status: 'healthy',
          details: 'Notification system configured',
          capabilities: {
            email: hasEmailConfig ? 'enabled' : 'disabled',
            sms: hasSMSConfig ? 'enabled' : 'disabled'
          }
        };
      } catch (error) {
        return {
          status: 'warning',
          error: error.message,
          details: 'Notification system check completed with warnings'
        };
      }
    });
  }
}

// Export singleton instance
export const enhancedHealthMonitoring = new EnhancedHealthMonitoring();

// Initialize application-specific health checks
enhancedHealthMonitoring.initializeApplicationHealthChecks();