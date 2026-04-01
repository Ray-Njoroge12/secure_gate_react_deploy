// Database health monitoring endpoints
import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/standardizedErrorHandler.js';
import { ResponseUtil } from '../utils/responseUtils.js';
import { getDBStatus, testDBConnection } from '../database/db.enhanced.js';
import { dbHealthService } from '../services/healthCore.js';

const router = Router();

/**
 * Public health check endpoint (basic)
 */
router.get('/health', asyncHandler(async (req, res) => {
  const startTime = Date.now();

  try {
    // Basic connection test
    await testDBConnection();
    const responseTime = Date.now() - startTime;

    ResponseUtil.success(res, {
      status: 'healthy',
      database: 'connected',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    }, 'Database is healthy');

  } catch (error) {
    const responseTime = Date.now() - startTime;

    ResponseUtil.error(
      res,
      'Database health check failed',
      'DATABASE_HEALTH_FAILED',
      503,
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: error.message,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    );
  }
}));

/**
 * Detailed health status (admin only)
 */
router.get('/health/detailed',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const [overall, metrics, database, pool] = await Promise.all([
      Promise.resolve(dbHealthService.getHealthStatus()),
      Promise.resolve(dbHealthService.getHealthMetrics()),
      dbHealthService.checkDatabaseHealth(),
      dbHealthService.getConnectionPoolStats()
    ]);

    ResponseUtil.success(res, {
      overall,
      metrics,
      database,
      pool
    }, 'Detailed database health status retrieved');
  })
);

/**
 * Full health report with history (admin only)
 */
router.get('/health/report',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const [overall, healthReport] = await Promise.all([
      Promise.resolve(dbHealthService.getHealthStatus()),
      dbHealthService.getDatabaseHealthReport()
    ]);

    ResponseUtil.success(res, {
      overall,
      report: healthReport
    }, 'Complete database health report generated');
  })
);

/**
 * Connection pool status (admin only)
 */
router.get('/status/pool',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const status = getDBStatus();

    ResponseUtil.success(res, status, 'Database connection pool status retrieved');
  })
);

/**
 * Active alerts (admin only)
 */
router.get('/alerts',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const healthSummary = dbHealthService.getHealthStatus();
    const databaseAlerts = (healthSummary.lastCheck?.alerts || []).filter((alert) => alert.component === 'database');

    ResponseUtil.success(res, {
      alerts: databaseAlerts,
      count: databaseAlerts.length,
      timestamp: new Date().toISOString()
    }, 'Database alerts retrieved');
  })
);

/**
 * Manual health check trigger (admin only)
 */
router.post('/health/check',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const healthCheck = await dbHealthService.performHealthCheck();
    const isHealthy = healthCheck.status !== 'unhealthy';

    if (isHealthy) {
      ResponseUtil.success(res, healthCheck, 'Manual health check completed successfully');
    } else {
      ResponseUtil.error(res, 'Manual health check failed', 'DATABASE_HEALTH_FAILED', 503, healthCheck);
    }
  })
);

/**
 * Clear all alerts (admin only, for testing)
 */
router.delete('/alerts',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const healthSummary = dbHealthService.getHealthStatus();
    const existingAlerts = healthSummary.lastCheck?.alerts || [];
    const remainingAlerts = existingAlerts.filter((alert) => alert.component !== 'database');
    const clearedCount = existingAlerts.length - remainingAlerts.length;

    if (healthSummary.lastCheck?.alerts) {
      healthSummary.lastCheck.alerts = remainingAlerts;
    }

    ResponseUtil.success(res, {
      cleared: true,
      clearedCount,
      timestamp: new Date().toISOString()
    }, 'Database alerts cleared from current health snapshot');
  })
);

export default router;
