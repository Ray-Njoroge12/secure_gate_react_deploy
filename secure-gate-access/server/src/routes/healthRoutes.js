// server/src/routes/healthRoutes.js
/**
 * Health Routes
 * Health monitoring endpoints for production deployment and load balancer health checks
 */

import express from 'express';
import { enhancedHealthMonitoring } from '../services/enhancedHealthService.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route GET /health
 * @desc Basic health check - public endpoint for load balancers
 * @access Public
 */
router.get('/health', async (req, res) => {
  try {
    const basicHealth = await enhancedHealthMonitoring.getBasicHealth();
    
    const statusCode = basicHealth.status === 'healthy' ? 200 : 
                       basicHealth.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json({
      status: basicHealth.status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

/**
 * @route GET /health/live
 * @desc Kubernetes liveness probe
 * @access Public
 */
router.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route GET /health/ready
 * @desc Kubernetes readiness probe
 * @access Public
 */
router.get('/health/ready', async (req, res) => {
  try {
    const health = await enhancedHealthMonitoring.getBasicHealth();
    
    if (health.status === 'healthy' || health.status === 'degraded') {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed'
    });
  }
});

/**
 * @route GET /health/detailed
 * @desc Detailed health check - requires authentication
 * @access Admin only
 */
router.get('/health/detailed', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const detailedHealth = await enhancedHealthMonitoring.getDetailedHealth();
    
    res.status(200).json({
      status: detailedHealth.status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      components: detailedHealth.components,
      metrics: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Failed to retrieve detailed health information'
    });
  }
});

/**
 * @route GET /health/metrics
 * @desc Prometheus-compatible metrics endpoint
 * @access Admin only
 */
router.get('/health/metrics', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const metrics = await enhancedHealthMonitoring.getMetrics();
    
    // Format as Prometheus metrics
    let prometheusMetrics = '';
    
    // Memory metrics
    const memUsage = process.memoryUsage();
    prometheusMetrics += `# HELP nodejs_heap_size_bytes Node.js heap size\n`;
    prometheusMetrics += `# TYPE nodejs_heap_size_bytes gauge\n`;
    prometheusMetrics += `nodejs_heap_size_bytes{type="used"} ${memUsage.heapUsed}\n`;
    prometheusMetrics += `nodejs_heap_size_bytes{type="total"} ${memUsage.heapTotal}\n`;
    
    // Uptime metric
    prometheusMetrics += `# HELP nodejs_uptime_seconds Node.js process uptime\n`;
    prometheusMetrics += `# TYPE nodejs_uptime_seconds counter\n`;
    prometheusMetrics += `nodejs_uptime_seconds ${process.uptime()}\n`;

    res.set('Content-Type', 'text/plain');
    res.send(prometheusMetrics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve metrics'
    });
  }
});

export default router;
