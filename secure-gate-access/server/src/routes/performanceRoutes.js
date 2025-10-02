/**
 * Performance Routes
 * API endpoints for performance monitoring and optimization
 */

import express from 'express';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import performanceService from '../services/performanceService.js';
import connectionPoolService from '../services/connectionPoolService.js';
import redisCacheService from '../services/redisCacheService.js';
import { performanceMonitor } from '../middleware/performanceMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/performance/status
 * @desc    Get overall performance status
 * @access  Private (Admin only)
 */
router.get('/status', protect, requireRole('admin'), async (req, res) => {
    try {
        const [performanceMetrics, poolStats, cacheStats] = await Promise.all([
            performanceService.getMetrics(),
            connectionPoolService.getPoolStats(),
            redisCacheService.getStats()
        ]);
        
        res.json({
            success: true,
            data: {
                performance: performanceMetrics,
                database: poolStats,
                cache: cacheStats,
                middleware: performanceMonitor.getMetrics()
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get performance status',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/performance/metrics
 * @desc    Get detailed performance metrics
 * @access  Private (Admin only)
 */
router.get('/metrics', protect, requireRole('admin'), async (req, res) => {
    try {
        const metrics = performanceMonitor.getMetrics();
        
        res.json({
            success: true,
            data: metrics,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get performance metrics',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/performance/cache
 * @desc    Get cache performance metrics
 * @access  Private (Admin only)
 */
router.get('/cache', protect, requireRole('admin'), async (req, res) => {
    try {
        const cacheStats = redisCacheService.getStats();
        const healthCheck = await redisCacheService.healthCheck();
        
        res.json({
            success: true,
            data: {
                stats: cacheStats,
                health: healthCheck
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get cache metrics',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/performance/cache/clear
 * @desc    Clear cache
 * @access  Private (Admin only)
 */
router.post('/cache/clear', protect, requireRole('admin'), async (req, res) => {
    try {
        const { prefix } = req.body;
        
        let result;
        if (prefix) {
            result = await redisCacheService.clearByPrefix(prefix);
        } else {
            result = await redisCacheService.clear();
        }
        
        res.json({
            success: true,
            message: `Cache cleared successfully${prefix ? ` for prefix: ${prefix}` : ''}`,
            clearedKeys: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to clear cache',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/performance/database
 * @desc    Get database performance metrics
 * @access  Private (Admin only)
 */
router.get('/database', protect, requireRole('admin'), async (req, res) => {
    try {
        const poolStats = connectionPoolService.getPoolStats();
        const healthCheck = await connectionPoolService.healthCheck();
        
        res.json({
            success: true,
            data: {
                pools: poolStats,
                health: healthCheck
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get database metrics',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/performance/endpoints
 * @desc    Get endpoint performance metrics
 * @access  Private (Admin only)
 */
router.get('/endpoints', protect, requireRole('admin'), async (req, res) => {
    try {
        const { limit = 20, sortBy = 'count' } = req.query;
        const metrics = performanceMonitor.getMetrics();
        
        let endpoints = Object.entries(metrics.endpoints || {});
        
        // Sort by specified field
        switch (sortBy) {
            case 'count':
                endpoints.sort((a, b) => b[1].count - a[1].count);
                break;
            case 'averageTime':
                endpoints.sort((a, b) => b[1].averageTime - a[1].averageTime);
                break;
            case 'slowCount':
                endpoints.sort((a, b) => b[1].slowCount - a[1].slowCount);
                break;
            case 'errorCount':
                endpoints.sort((a, b) => b[1].errorCount - a[1].errorCount);
                break;
        }
        
        const limitedEndpoints = endpoints.slice(0, parseInt(limit));
        
        res.json({
            success: true,
            data: limitedEndpoints.map(([endpoint, metrics]) => ({
                endpoint,
                ...metrics
            })),
            pagination: {
                limit: parseInt(limit),
                total: endpoints.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get endpoint metrics',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/performance/slow-queries
 * @desc    Get slow query metrics
 * @access  Private (Admin only)
 */
router.get('/slow-queries', protect, requireRole('admin'), async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const performanceMetrics = performanceService.getMetrics();
        
        const slowQueries = performanceMetrics.database?.queryStats || [];
        const limitedQueries = slowQueries.slice(0, parseInt(limit));
        
        res.json({
            success: true,
            data: limitedQueries,
            pagination: {
                limit: parseInt(limit),
                total: slowQueries.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get slow query metrics',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/performance/reset
 * @desc    Reset performance metrics
 * @access  Private (Admin only)
 */
router.post('/reset', protect, requireRole('admin'), async (req, res) => {
    try {
        performanceMonitor.resetMetrics();
        
        res.json({
            success: true,
            message: 'Performance metrics reset successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to reset performance metrics',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/performance/health
 * @desc    Get performance health check
 * @access  Private (Admin only)
 */
router.get('/health', protect, requireRole('admin'), async (req, res) => {
    try {
        const [cacheHealth, dbHealth] = await Promise.all([
            redisCacheService.healthCheck(),
            connectionPoolService.healthCheck()
        ]);
        
        const overallHealth = {
            status: 'healthy',
            components: {
                cache: cacheHealth.status,
                database: dbHealth.status
            },
            timestamp: new Date().toISOString()
        };
        
        if (cacheHealth.status !== 'healthy' || dbHealth.status !== 'healthy') {
            overallHealth.status = 'unhealthy';
        }
        
        res.json({
            success: true,
            data: overallHealth,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get performance health',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/performance/recommendations
 * @desc    Get performance optimization recommendations
 * @access  Private (Admin only)
 */
router.get('/recommendations', protect, requireRole('admin'), async (req, res) => {
    try {
        const metrics = performanceMonitor.getMetrics();
        const recommendations = [];
        
        // Check average response time
        if (metrics.overall.averageResponseTime > 1000) {
            recommendations.push({
                type: 'response_time',
                severity: 'high',
                message: 'Average response time is high. Consider optimizing database queries and adding caching.',
                currentValue: `${metrics.overall.averageResponseTime.toFixed(2)}ms`,
                targetValue: '< 500ms'
            });
        }
        
        // Check error rate
        if (metrics.overall.errorRate > 5) {
            recommendations.push({
                type: 'error_rate',
                severity: 'high',
                message: 'Error rate is high. Review error logs and fix issues.',
                currentValue: `${metrics.overall.errorRate.toFixed(2)}%`,
                targetValue: '< 1%'
            });
        }
        
        // Check slow requests
        if (metrics.overall.slowRequests > 0) {
            recommendations.push({
                type: 'slow_requests',
                severity: 'medium',
                message: 'Slow requests detected. Review endpoint performance.',
                currentValue: `${metrics.overall.slowRequests} slow requests`,
                targetValue: '0 slow requests'
            });
        }
        
        // Check cache hit rate
        if (metrics.cache.hitRate < 50) {
            recommendations.push({
                type: 'cache_hit_rate',
                severity: 'medium',
                message: 'Cache hit rate is low. Consider increasing cache TTL or adding more cacheable data.',
                currentValue: `${metrics.cache.hitRate.toFixed(2)}%`,
                targetValue: '> 80%'
            });
        }
        
        res.json({
            success: true,
            data: {
                recommendations,
                summary: {
                    total: recommendations.length,
                    high: recommendations.filter(r => r.severity === 'high').length,
                    medium: recommendations.filter(r => r.severity === 'medium').length,
                    low: recommendations.filter(r => r.severity === 'low').length
                }
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get performance recommendations',
            error: error.message
        });
    }
});

export default router;