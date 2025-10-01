// server/src/routes/performanceRoutes.js
/**
 * Performance Monitoring Routes
 * Administrative endpoints for performance monitoring and optimization
 */

import express from 'express';
# import { performanceMonitor } from '../middleware/performanceMiddleware.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Simple role check middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * @route GET /api/performance/metrics
 * @desc Get current performance metrics
 * @access Admin
 */
router.get('/metrics', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics();

    logger.info('Performance metrics requested', {
      adminId: req.user.id,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance metrics',
      message: error.message
    });
  }
});

/**
 * @route GET /api/performance/summary
 * @desc Get performance summary with key metrics
 * @access Admin
 */
router.get('/summary', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics();
    const systemInfo = {
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid
    };

    const summary = {
      system: systemInfo,
      performance: {
        totalRequests: metrics.summary.totalRequests,
        averageResponseTime: metrics.summary.averageResponseTime,
        errorRate: metrics.summary.errorRate,
        activeRequests: metrics.summary.activeRequests,
        memoryUsage: metrics.summary.memoryUsage
      },
      alerts: metrics.alerts,
      topSlowEndpoints: metrics.slowRequests.slice(0, 5)
    };

    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting performance summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance summary',
      message: error.message
    });
  }
});

/**
 * @route GET /api/performance/slow-requests
 * @desc Get detailed information about slow requests
 * @access Admin
 */
router.get('/slow-requests', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { limit = 20, sort = 'averageTime' } = req.query;
    const metrics = performanceMonitor.getMetrics();

    const slowRequests = metrics.slowRequests;

    // Sort by specified field
    switch (sort) {
    case 'count':
      slowRequests.sort((a, b) => b.count - a.count);
      break;
    case 'maxTime':
      slowRequests.sort((a, b) => b.maxTime - a.maxTime);
      break;
    case 'averageTime':
    default:
      slowRequests.sort((a, b) => b.averageTime - a.averageTime);
      break;
    }

    res.json({
      success: true,
      data: {
        slowRequests: slowRequests.slice(0, parseInt(limit)),
        summary: {
          totalSlowEndpoints: slowRequests.length,
          averageSlowTime: slowRequests.reduce((sum, req) => sum + req.averageTime, 0) / slowRequests.length || 0
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting slow requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve slow requests data',
      message: error.message
    });
  }
});

/**
 * @route GET /api/performance/memory
 * @desc Get detailed memory usage information
 * @access Admin
 */
router.get('/memory', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const memoryInfo = {
      heapUsed: {
        bytes: memoryUsage.heapUsed,
        mb: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100
      },
      heapTotal: {
        bytes: memoryUsage.heapTotal,
        mb: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100
      },
      external: {
        bytes: memoryUsage.external,
        mb: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100
      },
      rss: {
        bytes: memoryUsage.rss,
        mb: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100
      },
      arrayBuffers: {
        bytes: memoryUsage.arrayBuffers,
        mb: Math.round(memoryUsage.arrayBuffers / 1024 / 1024 * 100) / 100
      }
    };

    // Calculate memory efficiency metrics
    const heapUtilization = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    const totalMemoryMB = memoryUsage.rss / 1024 / 1024;

    res.json({
      success: true,
      data: {
        current: memoryInfo,
        metrics: {
          heapUtilization: Math.round(heapUtilization * 100) / 100,
          totalMemoryMB: Math.round(totalMemoryMB * 100) / 100,
          uptime: process.uptime()
        },
        warnings: totalMemoryMB > 500 ? ['High memory usage detected'] : []
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting memory info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve memory information',
      message: error.message
    });
  }
});

/**
 * @route POST /api/performance/reset
 * @desc Reset performance metrics (for testing/debugging)
 * @access Super Admin
 */
router.post('/reset', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    performanceMonitor.reset();

    logger.warn('Performance metrics reset', {
      adminId: req.user.id,
      adminUsername: req.user.username,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Performance metrics have been reset',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error resetting performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset performance metrics',
      message: error.message
    });
  }
});

/**
 * @route GET /api/performance/health
 * @desc Get system health status based on performance metrics
 * @access Admin
 */
router.get('/health', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics();
    const memoryUsage = process.memoryUsage();

    // Determine health status
    let status = 'healthy';
    let score = 100;
    const issues = [];

    // Check response time
    if (metrics.summary.averageResponseTime > 2000) {
      status = 'degraded';
      score -= 30;
      issues.push('High average response time');
    } else if (metrics.summary.averageResponseTime > 1000) {
      score -= 15;
      issues.push('Elevated response time');
    }

    // Check error rate
    if (metrics.summary.errorRate > 0.1) {
      status = 'critical';
      score -= 40;
      issues.push('High error rate');
    } else if (metrics.summary.errorRate > 0.05) {
      status = 'degraded';
      score -= 20;
      issues.push('Elevated error rate');
    }

    // Check memory usage
    const memoryMB = memoryUsage.heapUsed / 1024 / 1024;
    if (memoryMB > 800) {
      status = 'critical';
      score -= 35;
      issues.push('Very high memory usage');
    } else if (memoryMB > 500) {
      status = 'degraded';
      score -= 20;
      issues.push('High memory usage');
    }

    // Check active requests
    if (metrics.summary.activeRequests > 100) {
      status = 'degraded';
      score -= 15;
      issues.push('High number of active requests');
    }

    if (score < 60) status = 'critical';
    else if (score < 80) status = 'degraded';

    res.json({
      success: true,
      data: {
        status,
        score: Math.max(0, score),
        issues,
        metrics: {
          uptime: process.uptime(),
          totalRequests: metrics.summary.totalRequests,
          averageResponseTime: metrics.summary.averageResponseTime,
          errorRate: metrics.summary.errorRate,
          memoryUsageMB: Math.round(memoryMB * 100) / 100,
          activeRequests: metrics.summary.activeRequests
        },
        recommendations: generateRecommendations(metrics, memoryUsage)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting health status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve health status',
      message: error.message
    });
  }
});

/**
 * Generate performance recommendations based on metrics
 */
function generateRecommendations(metrics, memoryUsage) {
  const recommendations = [];

  if (metrics.summary.averageResponseTime > 1000) {
    recommendations.push({
      type: 'performance',
      message: 'Consider optimizing database queries and adding caching for frequently accessed data',
      priority: 'high'
    });
  }

  if (metrics.summary.errorRate > 0.05) {
    recommendations.push({
      type: 'reliability',
      message: 'Investigate and fix recurring errors to improve system reliability',
      priority: 'high'
    });
  }

  const memoryMB = memoryUsage.heapUsed / 1024 / 1024;
  if (memoryMB > 400) {
    recommendations.push({
      type: 'memory',
      message: 'Monitor memory usage and consider implementing memory cleanup or optimization',
      priority: memoryMB > 600 ? 'high' : 'medium'
    });
  }

  if (metrics.slowRequests.length > 10) {
    recommendations.push({
      type: 'optimization',
      message: 'Multiple slow endpoints detected - review and optimize query performance',
      priority: 'medium'
    });
  }

  return recommendations;
}

export default router;