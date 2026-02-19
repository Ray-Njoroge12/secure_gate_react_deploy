// Database health monitoring endpoints
import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/standardizedErrorHandler.js';
import { ResponseUtil } from '../utils/responseUtils.js';
import { getDBStatus, testDBConnection } from '../database/db.enhanced.js';
import dbHealthService from '../services/databaseHealthService.js';

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

    ResponseUtil.success(res, {
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    }, 'Database health check failed', 503);
  }
}));

/**
 * Detailed health status (admin only)
 */
router.get('/health/detailed',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const healthSummary = dbHealthService.getHealthSummary();

    ResponseUtil.success(res, healthSummary, 'Detailed database health status retrieved');
  })
);

/**
 * Full health report with history (admin only)
 */
router.get('/health/report',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const healthReport = dbHealthService.getHealthReport();

    ResponseUtil.success(res, healthReport, 'Complete database health report generated');
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
    const healthSummary = dbHealthService.getHealthSummary();

    ResponseUtil.success(res, {
      alerts: healthSummary.activeAlerts,
      count: healthSummary.alertCount,
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
    const healthCheck = await dbHealthService.runHealthCheck();

    if (healthCheck.success) {
      ResponseUtil.success(res, healthCheck, 'Manual health check completed successfully');
    } else {
      ResponseUtil.success(res, healthCheck, 'Manual health check failed', 503);
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
    dbHealthService.clearAllAlerts();

    ResponseUtil.success(res, {
      cleared: true,
      timestamp: new Date().toISOString()
    }, 'All database alerts cleared');
  })
);

export default router;
