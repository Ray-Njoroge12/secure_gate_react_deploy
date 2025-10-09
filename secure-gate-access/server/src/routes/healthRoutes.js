#!/usr/bin/env node
/**
 * Health Check API Routes
 * Provides health monitoring and system status endpoints
 */

import express from 'express';
import { asyncHandler } from '../middleware/enhancedErrorHandler.js';
import { successResponse } from '../utils/responseUtils.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import MonitoringService from '../services/monitoringService.js';
import logger from '../config/logger.js';

const router = express.Router();

// Initialize monitoring service
const monitoringService = new MonitoringService();

// Start monitoring service
monitoringService.start();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Get system health status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [healthy, warning, error]
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     uptime:
 *                       type: number
 *                     healthChecks:
 *                       type: object
 *                       additionalProperties:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           status:
 *                             type: string
 *                           lastCheck:
 *                             type: string
 *                             format: date-time
 */
router.get('/', asyncHandler(async (req, res) => {
  const systemStatus = monitoringService.getSystemStatus();
  
  // Determine overall status
  const healthCheckStatuses = Object.values(systemStatus.healthChecks).map(hc => hc.status);
  const hasError = healthCheckStatuses.includes('error');
  const hasWarning = healthCheckStatuses.includes('warning');
  
  const overallStatus = hasError ? 'error' : hasWarning ? 'warning' : 'healthy';
  
  const healthData = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    healthChecks: systemStatus.healthChecks,
    monitoring: systemStatus.monitoring
  };

  successResponse(res, healthData, 'System health status retrieved');
}));

/**
 * @swagger
 * /api/health/detailed:
 *   get:
 *     summary: Get detailed system health status
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detailed system health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                     uptime:
 *                       type: number
 *                     healthChecks:
 *                       type: object
 *                     metrics:
 *                       type: object
 *                     alerts:
 *                       type: array
 */
router.get('/detailed', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  const systemStatus = monitoringService.getSystemStatus();
  
  // Get recent metrics
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
  const metrics = await monitoringService.getMetrics(startTime, endTime);
  
  // Get health check history
  const healthHistory = await monitoringService.getHealthCheckHistory(null, 50);
  
  const detailedData = {
    ...systemStatus,
    metrics: metrics.reduce((acc, metric) => {
      if (!acc[metric.metric_name]) {
        acc[metric.metric_name] = [];
      }
      acc[metric.metric_name].push({
        value: metric.metric_value,
        timestamp: metric.timestamp
      });
      return acc;
    }, {}),
    healthHistory: healthHistory.slice(0, 10), // Last 10 health checks
    timestamp: new Date().toISOString()
  };

  successResponse(res, detailedData, 'Detailed system health status retrieved');
}));

/**
 * @swagger
 * /api/health/metrics:
 *   get:
 *     summary: Get system metrics
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start time for metrics (ISO 8601)
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End time for metrics (ISO 8601)
 *       - in: query
 *         name: metricNames
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Specific metric names to retrieve
 *     responses:
 *       200:
 *         description: System metrics retrieved
 */
router.get('/metrics', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  const { startTime, endTime, metricNames } = req.query;
  
  const start = startTime ? new Date(startTime) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const end = endTime ? new Date(endTime) : new Date();
  const metrics = metricNames ? metricNames.split(',') : null;
  
  const metricsData = await monitoringService.getMetrics(start, end, metrics);
  
  successResponse(res, metricsData, 'System metrics retrieved');
}));

/**
 * @swagger
 * /api/health/health-checks:
 *   get:
 *     summary: Get health check history
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: component
 *         schema:
 *           type: string
 *         description: Specific component to check
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of records to return
 *     responses:
 *       200:
 *         description: Health check history retrieved
 */
router.get('/health-checks', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  const { component, limit = 100 } = req.query;
  
  const healthHistory = await monitoringService.getHealthCheckHistory(component, parseInt(limit));
  
  successResponse(res, healthHistory, 'Health check history retrieved');
}));

/**
 * @swagger
 * /api/health/restart-monitoring:
 *   post:
 *     summary: Restart monitoring service
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monitoring service restarted
 */
router.post('/restart-monitoring', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  monitoringService.stop();
  monitoringService.start();
  
  logger.info('Monitoring service restarted by admin', {
    userId: req.user.id,
    timestamp: new Date().toISOString()
  });
  
  successResponse(res, { status: 'restarted' }, 'Monitoring service restarted');
}));

/**
 * @swagger
 * /api/health/stop-monitoring:
 *   post:
 *     summary: Stop monitoring service
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monitoring service stopped
 */
router.post('/stop-monitoring', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  monitoringService.stop();
  
  logger.info('Monitoring service stopped by admin', {
    userId: req.user.id,
    timestamp: new Date().toISOString()
  });
  
  successResponse(res, { status: 'stopped' }, 'Monitoring service stopped');
}));

/**
 * @swagger
 * /api/health/start-monitoring:
 *   post:
 *     summary: Start monitoring service
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monitoring service started
 */
router.post('/start-monitoring', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  monitoringService.start();
  
  logger.info('Monitoring service started by admin', {
    userId: req.user.id,
    timestamp: new Date().toISOString()
  });
  
  successResponse(res, { status: 'started' }, 'Monitoring service started');
}));

/**
 * @swagger
 * /api/health/database:
 *   get:
 *     summary: Check database health specifically
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Database health status
 */
router.get('/database', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  const dbHealth = await monitoringService.checkDatabaseHealth();
  
  successResponse(res, dbHealth, 'Database health status retrieved');
}));

/**
 * @swagger
 * /api/health/memory:
 *   get:
 *     summary: Check memory health specifically
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Memory health status
 */
router.get('/memory', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  const memoryHealth = monitoringService.checkMemoryHealth();
  
  successResponse(res, memoryHealth, 'Memory health status retrieved');
}));

/**
 * @swagger
 * /api/health/cpu:
 *   get:
 *     summary: Check CPU health specifically
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CPU health status
 */
router.get('/cpu', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  const cpuHealth = monitoringService.checkCpuHealth();
  
  successResponse(res, cpuHealth, 'CPU health status retrieved');
}));

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down monitoring service...');
  await monitoringService.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down monitoring service...');
  await monitoringService.close();
  process.exit(0);
});

export default router;