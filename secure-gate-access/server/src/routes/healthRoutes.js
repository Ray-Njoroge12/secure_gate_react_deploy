/**
 * Enhanced Health Endpoints Router
 * Comprehensive health monitoring endpoints with correlation IDs and structured logging
 */

import express from 'express';
import { enhancedHealthMonitoring } from '../services/enhancedHealthService.js';
import { attachUserFromToken } from '../middleware/authMiddleware.js';
import loggingService from '../services/loggingService.js';
import { randomUUID } from 'crypto';

const router = express.Router();

/**
 * Middleware to add correlation ID and track health endpoint usage
 */
router.use((req, res, next) => {
  if (!req.headers['x-correlation-id']) {
    req.headers['x-correlation-id'] = randomUUID();
  }
  next();
});

/**
 * GET /health - Quick health check for load balancers
 * Returns minimal response optimized for high-frequency probing
 */
router.get('/', async (req, res) => {
  try {
    const result = await enhancedHealthMonitoring.getLivenessProbe(req);
    const statusCode = result.status === 'alive' ? 200 : 503;

    res.status(statusCode).json(result);
  } catch (error) {
    loggingService.logError('Health check endpoint failed', {
      correlationId: req.headers['x-correlation-id'],
      error: error.message,
      endpoint: '/health'
    });

    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      correlationId: req.headers['x-correlation-id']
    });
  }
});

/**
 * GET /health/live - Kubernetes liveness probe
 * Minimal check to verify process is running and responsive
 */
router.get('/live', async (req, res) => {
  try {
    const result = await enhancedHealthMonitoring.getLivenessProbe(req);
    const statusCode = result.status === 'alive' ? 200 : 503;

    res.status(statusCode).json(result);
  } catch (error) {
    res.status(500).json({
      status: 'dead',
      timestamp: new Date().toISOString(),
      correlationId: req.headers['x-correlation-id']
    });
  }
});

/**
 * GET /health/ready - Kubernetes readiness probe
 * Checks if application is ready to serve traffic (dependencies available)
 */
router.get('/ready', async (req, res) => {
  try {
    const result = await enhancedHealthMonitoring.getReadinessProbe(req);
    const statusCode = result.status === 'ready' ? 200 : 503;

    res.status(statusCode).json(result);
  } catch (error) {
    res.status(503).json({
      status: 'not-ready',
      error: error.message,
      timestamp: new Date().toISOString(),
      correlationId: req.headers['x-correlation-id']
    });
  }
});

/**
 * GET /health/startup - Kubernetes startup probe
 * Checks if application has completed initialization
 */
router.get('/startup', async (req, res) => {
  try {
    const result = await enhancedHealthMonitoring.getStartupProbe(req);
    const statusCode = result.status === 'started' ? 200 : 503;

    res.status(statusCode).json(result);
  } catch (error) {
    res.status(503).json({
      status: 'startup-failed',
      error: error.message,
      timestamp: new Date().toISOString(),
      correlationId: req.headers['x-correlation-id']
    });
  }
});

/**
 * GET /health/detailed - Comprehensive health check with full system information
 * Requires authentication and returns detailed monitoring data
 */
router.get('/detailed', attachUserFromToken, async (req, res) => {
  try {
    // Optional: Require admin role for detailed health information
    const role = req.user?.role;
    const includeDetails = role === 'admin' || req.query.include === 'details';

    const result = await enhancedHealthMonitoring.getComprehensiveHealth(req, includeDetails);

    // Status code based on overall health
    const statusCode = result.status === 'healthy' ? 200 :
      result.status === 'warning' ? 200 :
        result.status === 'critical' ? 503 : 503;

    res.status(statusCode).json(result);

  } catch (error) {
    loggingService.logError('Detailed health check failed', {
      correlationId: req.headers['x-correlation-id'],
      error: error.message,
      stack: error.stack,
      user: req.user?.id || 'anonymous'
    });

    res.status(500).json({
      status: 'error',
      error: 'Health check service unavailable',
      timestamp: new Date().toISOString(),
      correlationId: req.headers['x-correlation-id']
    });
  }
});

/**
 * GET /health/metrics - Health monitoring metrics
 * Returns health check statistics and performance metrics
 */
router.get('/metrics', attachUserFromToken, async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required for health metrics'
      });
    }

    const metrics = enhancedHealthMonitoring.getHealthMetrics();

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
      correlationId: req.headers['x-correlation-id']
    });

  } catch (error) {
    loggingService.logError('Health metrics endpoint failed', {
      correlationId: req.headers['x-correlation-id'],
      error: error.message,
      user: req.user?.id || 'anonymous'
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve health metrics',
      correlationId: req.headers['x-correlation-id']
    });
  }
});

/**
 * GET /health/status - System status dashboard endpoint
 * Returns formatted status information for monitoring dashboards
 */
router.get('/status', attachUserFromToken, async (req, res) => {
  try {
    const role = req.user?.role;
    if (!['admin', 'guard'].includes(role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions for system status'
      });
    }

    const healthResult = await enhancedHealthMonitoring.getComprehensiveHealth(req, true);

    // Format for dashboard consumption
    const statusDashboard = {
      overall: {
        status: healthResult.status,
        uptime: healthResult.application?.uptime || 0,
        environment: healthResult.environment?.environment || 'unknown'
      },
      components: {
        database: {
          status: healthResult.checks?.database?.status || 'unknown',
          latency: healthResult.checks?.database?.latency || 'unknown',
          connections: healthResult.details?.connectionPool || {}
        },
        memory: {
          status: healthResult.checks?.memory?.status || 'unknown',
          usage: healthResult.checks?.memory?.system?.usage || 'unknown',
          process: healthResult.details?.system?.memory || {}
        },
        application: {
          version: healthResult.application?.version || 'unknown',
          nodeVersion: healthResult.environment?.nodeVersion || 'unknown',
          platform: healthResult.environment?.platform || 'unknown'
        }
      },
      monitoring: healthResult.monitoring || {},
      timestamp: healthResult.timestamp
    };

    res.json({
      success: true,
      data: statusDashboard,
      correlationId: req.headers['x-correlation-id']
    });

  } catch (error) {
    loggingService.logError('System status endpoint failed', {
      correlationId: req.headers['x-correlation-id'],
      error: error.message,
      user: req.user?.id || 'anonymous'
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system status',
      correlationId: req.headers['x-correlation-id']
    });
  }
});

/**
 * POST /health/check - Trigger manual health check
 * Allows administrators to trigger health checks on demand
 */
router.post('/check', attachUserFromToken, async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required to trigger health checks'
      });
    }

    const { checks } = req.body;
    const result = await enhancedHealthMonitoring.getComprehensiveHealth(req, true);

    loggingService.logInfo('Manual health check triggered', {
      correlationId: req.headers['x-correlation-id'],
      user: req.user?.id,
      requestedChecks: checks,
      result: result.status
    });

    res.json({
      success: true,
      data: result,
      message: 'Health check completed successfully',
      correlationId: req.headers['x-correlation-id']
    });

  } catch (error) {
    loggingService.logError('Manual health check failed', {
      correlationId: req.headers['x-correlation-id'],
      error: error.message,
      user: req.user?.id || 'anonymous'
    });

    res.status(500).json({
      success: false,
      error: 'Health check execution failed',
      correlationId: req.headers['x-correlation-id']
    });
  }
});

// Error handling middleware for health routes
router.use((error, req, res, next) => {
  loggingService.logError('Health endpoint error', {
    correlationId: req.headers['x-correlation-id'],
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    status: 'error',
    error: 'Health monitoring service error',
    timestamp: new Date().toISOString(),
    correlationId: req.headers['x-correlation-id']
  });
});

export default router;