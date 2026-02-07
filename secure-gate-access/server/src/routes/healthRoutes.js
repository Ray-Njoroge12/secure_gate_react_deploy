/**
 * Health Monitoring Routes
 * Provides endpoints for system health checks and monitoring
 */

import express from 'express';
import { systemHealthService } from '../services/systemHealthService.js';
import performanceMonitoringService from '../services/performanceMonitoringService.js';
import performanceAlertingService from '../services/performanceAlertingService.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/authMiddleware.js';
import { requireRolePolicy } from '../middleware/rolePolicy.js';
import { successResponse, errorResponse } from '../utils/responseUtils.js';
import { asyncHandler } from '../middleware/standardizedErrorHandler.js';
import loggingService from '../services/loggingService.js';

const router = express.Router();

/**
 * Basic health check (public endpoint)
 * GET /health
 */
router.get('/', asyncHandler(async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  };

  res.status(200).json(health);
}));

/**
 * Liveness probe for Kubernetes
 * GET /health/live
 */
router.get('/live', asyncHandler(async (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
}));

/**
 * Readiness probe for Kubernetes
 * GET /health/ready
 */
router.get('/ready', asyncHandler(async (req, res) => {
  try {
    const healthReport = await systemHealthService.performHealthCheck();

    if (healthReport.status === 'unhealthy') {
      return res.status(503).json({
        status: 'not_ready',
        reason: 'System health check failed',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      reason: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * Detailed health check (admin only)
 * GET /health/detailed
 */
router.get('/detailed',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    try {
      const healthReport = await systemHealthService.performHealthCheck();

      loggingService.logAudit(
        'Health check accessed',
        'health_check_view',
        req.user.id,
        {
          status: healthReport.status,
          components: Object.keys(healthReport.components || {}),
          alertCount: healthReport.alerts?.length || 0
        }
      );

      successResponse(res, healthReport, 'Detailed health report retrieved');

    } catch (error) {
      loggingService.logError('Failed to get detailed health report', error, {
        userId: req.user.id
      });

      errorResponse(res, 'Failed to retrieve health report', 'HEALTH_CHECK_FAILED', 500);
    }
  })
);

/**
 * Get health history
 * GET /health/history
 */
router.get('/history',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      const healthStatus = systemHealthService.getHealthStatus();

      const history = healthStatus.history.slice(-limit);

      successResponse(res, {
        history,
        total: healthStatus.history.length,
        limit
      }, 'Health history retrieved');

    } catch (error) {
      loggingService.logError('Failed to get health history', error, {
        userId: req.user.id
      });

      errorResponse(res, 'Failed to retrieve health history', 'HEALTH_HISTORY_FAILED', 500);
    }
  })
);

/**
 * Get system metrics
 * GET /health/metrics
 */
router.get('/metrics',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    try {
      const metrics = await performanceMonitoringService.getSystemMetrics();

      successResponse(res, metrics, 'System metrics retrieved');

    } catch (error) {
      loggingService.logError('Failed to get system metrics', error, {
        userId: req.user.id
      });

      errorResponse(res, 'Failed to retrieve system metrics', 'METRICS_FAILED', 500);
    }
  })
);

/**
 * Get performance alerts
 * GET /health/alerts
 */
router.get('/alerts',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    try {
      const { severity, limit = 50, status = 'active' } = req.query;

      const alerts = await performanceAlertingService.getAlerts({
        severity,
        limit: Math.min(parseInt(limit), 100),
        status
      });

      successResponse(res, alerts, 'Performance alerts retrieved');

    } catch (error) {
      loggingService.logError('Failed to get performance alerts', error, {
        userId: req.user.id
      });

      errorResponse(res, 'Failed to retrieve performance alerts', 'ALERTS_FAILED', 500);
    }
  })
);

/**
 * Acknowledge alert
 * POST /health/alerts/:alertId/acknowledge
 */
router.post('/alerts/:alertId/acknowledge',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    try {
      const { alertId } = req.params;
      const { reason } = req.body;

      await performanceAlertingService.acknowledgeAlert(alertId, {
        acknowledgedBy: req.user.id,
        acknowledgedAt: new Date(),
        reason
      });

      loggingService.logAudit(
        'Alert acknowledged',
        'alert_acknowledge',
        req.user.id,
        { alertId, reason }
      );

      successResponse(res, null, 'Alert acknowledged successfully');

    } catch (error) {
      loggingService.logError('Failed to acknowledge alert', error, {
        userId: req.user.id,
        alertId: req.params.alertId
      });

      errorResponse(res, 'Failed to acknowledge alert', 'ALERT_ACKNOWLEDGE_FAILED', 500);
    }
  })
);

/**
 * Trigger manual health check
 * POST /health/check
 */
router.post('/check',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    try {
      const healthReport = await systemHealthService.performHealthCheck();

      loggingService.logAudit(
        'Manual health check triggered',
        'health_check_manual',
        req.user.id,
        {
          status: healthReport.status,
          responseTime: healthReport.responseTime
        }
      );

      successResponse(res, healthReport, 'Health check completed');

    } catch (error) {
      loggingService.logError('Failed to perform manual health check', error, {
        userId: req.user.id
      });

      errorResponse(res, 'Failed to perform health check', 'HEALTH_CHECK_FAILED', 500);
    }
  })
);

/**
 * Get component-specific health
 * GET /health/components/:componentName
 */
router.get('/components/:componentName',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    try {
      const { componentName } = req.params;
      const healthReport = await systemHealthService.performHealthCheck();

      const component = healthReport.components?.[componentName];

      if (!component) {
        return errorResponse(res, 'Component not found', 'COMPONENT_NOT_FOUND', 404);
      }

      successResponse(res, component, `${componentName} health retrieved`);

    } catch (error) {
      loggingService.logError('Failed to get component health', error, {
        userId: req.user.id,
        component: req.params.componentName
      });

      errorResponse(res, 'Failed to retrieve component health', 'COMPONENT_HEALTH_FAILED', 500);
    }
  })
);

/**
 * Get launch readiness status
 * GET /health/launch-readiness
 */
router.get('/launch-readiness',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    try {
      const healthReport = await systemHealthService.performHealthCheck();
      const metrics = await performanceMonitoringService.getSystemMetrics();
      const alerts = await performanceAlertingService.getAlerts({ status: 'active' });

      // Calculate launch readiness score
      const readinessChecks = {
        systemHealth: healthReport.status === 'healthy',
        databaseConnectivity: healthReport.components?.database?.status === 'healthy',
        externalServices: healthReport.components?.external_services?.status !== 'unhealthy',
        systemResources: healthReport.components?.system_resources?.status !== 'unhealthy',
        criticalAlerts: alerts.filter(a => a.severity === 'critical').length === 0,
        performanceMetrics: metrics.api?.averageResponseTime < 2000
      };

      const passedChecks = Object.values(readinessChecks).filter(Boolean).length;
      const totalChecks = Object.keys(readinessChecks).length;
      const readinessScore = Math.round((passedChecks / totalChecks) * 100);

      const readinessStatus = {
        ready: readinessScore >= 90,
        score: readinessScore,
        checks: readinessChecks,
        recommendations: [],
        timestamp: new Date().toISOString()
      };

      // Add recommendations for failed checks
      if (!readinessChecks.systemHealth) {
        readinessStatus.recommendations.push('System health issues need to be resolved');
      }
      if (!readinessChecks.databaseConnectivity) {
        readinessStatus.recommendations.push('Database connectivity issues need attention');
      }
      if (!readinessChecks.criticalAlerts) {
        readinessStatus.recommendations.push('Critical alerts need to be addressed');
      }
      if (!readinessChecks.performanceMetrics) {
        readinessStatus.recommendations.push('API performance needs optimization');
      }

      successResponse(res, readinessStatus, 'Launch readiness status retrieved');

    } catch (error) {
      loggingService.logError('Failed to get launch readiness status', error, {
        userId: req.user.id
      });

      errorResponse(res, 'Failed to retrieve launch readiness status', 'LAUNCH_READINESS_FAILED', 500);
    }
  })
);

/**
 * Health update stream (Server-Sent Events)
 * GET /health/stream
 */
router.get('/stream',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial health data
    try {
      const healthReport = await systemHealthService.performHealthCheck();
      res.write(`data: ${JSON.stringify(healthReport)}\n\n`);
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: 'Failed to get initial health data' })}\n\n`);
    }

    // Set up periodic updates
    const interval = setInterval(async () => {
      try {
        const healthReport = await systemHealthService.performHealthCheck();
        res.write(`data: ${JSON.stringify(healthReport)}\n\n`);
      } catch (error) {
        res.write(`data: ${JSON.stringify({ error: 'Health check failed' })}\n\n`);
      }
    }, 30000); // Every 30 seconds

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });

    req.on('error', () => {
      clearInterval(interval);
      res.end();
    });
  })
);

/**
 * Enable deployment mode
 * POST /health/deployment/enable
 */
router.post('/deployment/enable',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    try {
      await systemHealthService.enableDeploymentMode();

      loggingService.logAudit(
        'Deployment mode enabled',
        'deployment_mode_enable',
        req.user.id,
        { timestamp: new Date().toISOString() }
      );

      successResponse(res, null, 'Deployment mode enabled successfully');

    } catch (error) {
      loggingService.logError('Failed to enable deployment mode', error, {
        userId: req.user.id
      });

      errorResponse(res, 'Failed to enable deployment mode', 'DEPLOYMENT_MODE_FAILED', 500);
    }
  })
);

/**
 * Disable deployment mode
 * POST /health/deployment/disable
 */
router.post('/deployment/disable',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    try {
      await systemHealthService.disableDeploymentMode();

      loggingService.logAudit(
        'Deployment mode disabled',
        'deployment_mode_disable',
        req.user.id,
        { timestamp: new Date().toISOString() }
      );

      successResponse(res, null, 'Deployment mode disabled successfully');

    } catch (error) {
      loggingService.logError('Failed to disable deployment mode', error, {
        userId: req.user.id
      });

      errorResponse(res, 'Failed to disable deployment mode', 'DEPLOYMENT_MODE_FAILED', 500);
    }
  })
);

/**
 * Check deployment readiness
 * GET /health/deployment/readiness
 */
router.get('/deployment/readiness',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    try {
      const readinessStatus = await systemHealthService.checkDeploymentReadiness();

      successResponse(res, readinessStatus, 'Deployment readiness status retrieved');

    } catch (error) {
      loggingService.logError('Failed to check deployment readiness', error, {
        userId: req.user.id
      });

      errorResponse(res, 'Failed to check deployment readiness', 'DEPLOYMENT_READINESS_FAILED', 500);
    }
  })
);

/**
 * Initiate graceful shutdown
 * POST /health/shutdown/graceful
 */
router.post('/shutdown/graceful',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    try {
      // Send response before initiating shutdown
      successResponse(res, null, 'Graceful shutdown initiated');

      loggingService.logAudit(
        'Graceful shutdown initiated',
        'graceful_shutdown',
        req.user.id,
        { timestamp: new Date().toISOString() }
      );

      // Initiate shutdown after response is sent
      setTimeout(() => {
        systemHealthService.initiateGracefulShutdown();
      }, 1000);

    } catch (error) {
      loggingService.logError('Failed to initiate graceful shutdown', error, {
        userId: req.user.id
      });

      errorResponse(res, 'Failed to initiate graceful shutdown', 'GRACEFUL_SHUTDOWN_FAILED', 500);
    }
  })
);

/**
 * Get system capacity status
 * GET /health/capacity
 */
router.get('/capacity',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    try {
      const capacityStatus = await systemHealthService.checkCapacity();

      successResponse(res, capacityStatus, 'System capacity status retrieved');

    } catch (error) {
      loggingService.logError('Failed to get capacity status', error, {
        userId: req.user.id
      });

      errorResponse(res, 'Failed to retrieve capacity status', 'CAPACITY_CHECK_FAILED', 500);
    }
  })
);

/**
 * Get real-time metrics
 * GET /health/metrics/realtime
 */
router.get('/metrics/realtime',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    try {
      const realTimeMetrics = systemHealthService.getRealTimeMetrics();

      successResponse(res, realTimeMetrics, 'Real-time metrics retrieved');

    } catch (error) {
      loggingService.logError('Failed to get real-time metrics', error, {
        userId: req.user.id
      });

      errorResponse(res, 'Failed to retrieve real-time metrics', 'REALTIME_METRICS_FAILED', 500);
    }
  })
);

/**
 * Enable circuit breaker for component
 * POST /health/circuit-breaker/:component/enable
 */
router.post('/circuit-breaker/:component/enable',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    try {
      const { component } = req.params;
      const { failureThreshold, timeout, monitoringPeriod } = req.body;

      systemHealthService.enableCircuitBreaker(component, {
        failureThreshold,
        timeout,
        monitoringPeriod
      });

      loggingService.logAudit(
        'Circuit breaker enabled',
        'circuit_breaker_enable',
        req.user.id,
        { component, failureThreshold, timeout, monitoringPeriod }
      );

      successResponse(res, null, `Circuit breaker enabled for ${component}`);

    } catch (error) {
      loggingService.logError('Failed to enable circuit breaker', error, {
        userId: req.user.id,
        component: req.params.component
      });

      errorResponse(res, 'Failed to enable circuit breaker', 'CIRCUIT_BREAKER_FAILED', 500);
    }
  })
);

/**
 * Get circuit breaker status
 * GET /health/circuit-breaker/:component
 */
router.get('/circuit-breaker/:component',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    try {
      const { component } = req.params;
      const status = systemHealthService.checkCircuitBreaker(component);

      successResponse(res, status, `Circuit breaker status for ${component}`);

    } catch (error) {
      loggingService.logError('Failed to get circuit breaker status', error, {
        userId: req.user.id,
        component: req.params.component
      });

      errorResponse(res, 'Failed to get circuit breaker status', 'CIRCUIT_BREAKER_STATUS_FAILED', 500);
    }
  })
);

/**
 * Enable degradation mode for component
 * POST /health/degradation/:component/enable
 */
router.post('/degradation/:component/enable',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    try {
      const { component } = req.params;

      // Note: Fallback function would be configured in the service layer
      systemHealthService.enableDegradationMode(component, () => {
        return { status: 'degraded', message: 'Service running in degradation mode' };
      });

      loggingService.logAudit(
        'Degradation mode enabled',
        'degradation_mode_enable',
        req.user.id,
        { component }
      );

      successResponse(res, null, `Degradation mode enabled for ${component}`);

    } catch (error) {
      loggingService.logError('Failed to enable degradation mode', error, {
        userId: req.user.id,
        component: req.params.component
      });

      errorResponse(res, 'Failed to enable degradation mode', 'DEGRADATION_MODE_FAILED', 500);
    }
  })
);

/**
 * Disable degradation mode for component
 * POST /health/degradation/:component/disable
 */
router.post('/degradation/:component/disable',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    try {
      const { component } = req.params;

      systemHealthService.disableDegradationMode(component);

      loggingService.logAudit(
        'Degradation mode disabled',
        'degradation_mode_disable',
        req.user.id,
        { component }
      );

      successResponse(res, null, `Degradation mode disabled for ${component}`);

    } catch (error) {
      loggingService.logError('Failed to disable degradation mode', error, {
        userId: req.user.id,
        component: req.params.component
      });

      errorResponse(res, 'Failed to disable degradation mode', 'DEGRADATION_MODE_FAILED', 500);
    }
  })
);

/**
 * Real-time metrics stream (Server-Sent Events)
 * GET /health/metrics/stream
 */
router.get('/metrics/stream',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  asyncHandler(async (req, res) => {
    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial metrics
    try {
      const metrics = systemHealthService.getRealTimeMetrics();
      res.write(`data: ${JSON.stringify(metrics)}\n\n`);
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: 'Failed to get initial metrics' })}\n\n`);
    }

    // Set up periodic updates every 5 seconds for real-time metrics
    const interval = setInterval(async () => {
      try {
        const metrics = systemHealthService.getRealTimeMetrics();
        res.write(`data: ${JSON.stringify(metrics)}\n\n`);
      } catch (error) {
        res.write(`data: ${JSON.stringify({ error: 'Metrics collection failed' })}\n\n`);
      }
    }, 5000);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });

    req.on('error', () => {
      clearInterval(interval);
      res.end();
    });
  })
);

/**
 * Prometheus metrics endpoint
 * GET /health/prometheus
 */
router.get('/prometheus',
  asyncHandler(async (req, res) => {
    try {
      const healthReport = await systemHealthService.performHealthCheck();
      const metrics = await performanceMonitoringService.getSystemMetrics();

      // Generate Prometheus format metrics
      let prometheusMetrics = '';

      // Health status metric
      prometheusMetrics += `# HELP system_health_status System health status (1=healthy, 0.5=degraded, 0=unhealthy)\n`;
      prometheusMetrics += `# TYPE system_health_status gauge\n`;
      const healthValue = healthReport.status === 'healthy' ? 1 : healthReport.status === 'degraded' ? 0.5 : 0;
      prometheusMetrics += `system_health_status ${healthValue}\n\n`;

      // Response time metric
      prometheusMetrics += `# HELP system_health_response_time_ms Health check response time in milliseconds\n`;
      prometheusMetrics += `# TYPE system_health_response_time_ms gauge\n`;
      prometheusMetrics += `system_health_response_time_ms ${healthReport.responseTime || 0}\n\n`;

      // System resource metrics
      if (metrics.cpu) {
        prometheusMetrics += `# HELP system_cpu_usage CPU usage percentage\n`;
        prometheusMetrics += `# TYPE system_cpu_usage gauge\n`;
        prometheusMetrics += `system_cpu_usage ${metrics.cpu.usage}\n\n`;
      }

      if (metrics.memory) {
        prometheusMetrics += `# HELP system_memory_usage Memory usage percentage\n`;
        prometheusMetrics += `# TYPE system_memory_usage gauge\n`;
        prometheusMetrics += `system_memory_usage ${metrics.memory.usage}\n\n`;
      }

      // Component health metrics
      if (healthReport.components) {
        Object.entries(healthReport.components).forEach(([component, data]) => {
          const componentValue = data.status === 'healthy' ? 1 : data.status === 'degraded' ? 0.5 : 0;
          prometheusMetrics += `system_component_health{component="${component}"} ${componentValue}\n`;
        });
      }

      res.set('Content-Type', 'text/plain');
      res.send(prometheusMetrics);

    } catch (error) {
      loggingService.logError('Failed to generate Prometheus metrics', error);
      res.status(500).send('# Error generating metrics\n');
    }
  })
);

export default router;