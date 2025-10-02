/**
 * Load Balancer Routes
 * API endpoints for load balancer management and monitoring
 */

import express from 'express';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import loadBalancerService from '../services/loadBalancerService.js';
import loadBalancerHealthService from '../services/loadBalancerHealthService.js';

const router = express.Router();

/**
 * @route   GET /api/load-balancer/status
 * @desc    Get load balancer status and statistics
 * @access  Private (Admin only)
 */
router.get('/status', protect, requireRole('admin'), async (req, res) => {
    try {
        const statistics = loadBalancerService.getStatistics();
        const allServers = loadBalancerHealthService.getAllServersStatus();
        
        res.json({
            success: true,
            data: {
                loadBalancer: statistics,
                servers: allServers
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get load balancer status',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/load-balancer/servers
 * @desc    Get all server details
 * @access  Private (Admin only)
 */
router.get('/servers', protect, requireRole('admin'), async (req, res) => {
    try {
        const servers = loadBalancerHealthService.getAllServersStatus();
        const serverDetails = servers.map(server => 
            loadBalancerService.getServerDetails(server.id)
        ).filter(details => details !== null);
        
        res.json({
            success: true,
            data: serverDetails,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get server details',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/load-balancer/servers/:serverId
 * @desc    Get specific server details
 * @access  Private (Admin only)
 */
router.get('/servers/:serverId', protect, requireRole('admin'), async (req, res) => {
    try {
        const { serverId } = req.params;
        const serverDetails = loadBalancerService.getServerDetails(serverId);
        
        if (!serverDetails) {
            return res.status(404).json({
                success: false,
                message: 'Server not found'
            });
        }
        
        res.json({
            success: true,
            data: serverDetails,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get server details',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/load-balancer/servers/:serverId/health-check
 * @desc    Force health check on specific server
 * @access  Private (Admin only)
 */
router.post('/servers/:serverId/health-check', protect, requireRole('admin'), async (req, res) => {
    try {
        const { serverId } = req.params;
        const serverStatus = await loadBalancerHealthService.forceHealthCheck(serverId);
        
        res.json({
            success: true,
            data: serverStatus,
            message: 'Health check completed',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to perform health check',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/load-balancer/servers/:serverId/toggle
 * @desc    Enable/disable server
 * @access  Private (Admin only)
 */
router.put('/servers/:serverId/toggle', protect, requireRole('admin'), async (req, res) => {
    try {
        const { serverId } = req.params;
        const { enabled } = req.body;
        
        if (typeof enabled !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'enabled field must be a boolean'
            });
        }
        
        const serverStatus = loadBalancerHealthService.toggleServer(serverId, enabled);
        
        res.json({
            success: true,
            data: serverStatus,
            message: `Server ${enabled ? 'enabled' : 'disabled'} successfully`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to toggle server',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/load-balancer/servers/:serverId/config
 * @desc    Update server configuration
 * @access  Private (Admin only)
 */
router.put('/servers/:serverId/config', protect, requireRole('admin'), async (req, res) => {
    try {
        const { serverId } = req.params;
        const config = req.body;
        
        const serverStatus = loadBalancerHealthService.updateServerConfig(serverId, config);
        
        res.json({
            success: true,
            data: serverStatus,
            message: 'Server configuration updated successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update server configuration',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/load-balancer/healthy-servers
 * @desc    Get healthy servers only
 * @access  Private (Admin only)
 */
router.get('/healthy-servers', protect, requireRole('admin'), async (req, res) => {
    try {
        const healthyServers = loadBalancerHealthService.getHealthyServers();
        
        res.json({
            success: true,
            data: healthyServers,
            count: healthyServers.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get healthy servers',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/load-balancer/statistics
 * @desc    Get load balancer statistics
 * @access  Private (Admin only)
 */
router.get('/statistics', protect, requireRole('admin'), async (req, res) => {
    try {
        const statistics = loadBalancerService.getStatistics();
        
        res.json({
            success: true,
            data: statistics,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get load balancer statistics',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/load-balancer/algorithm
 * @desc    Change load balancing algorithm
 * @access  Private (Admin only)
 */
router.put('/algorithm', protect, requireRole('admin'), async (req, res) => {
    try {
        const { algorithm } = req.body;
        
        if (!algorithm) {
            return res.status(400).json({
                success: false,
                message: 'Algorithm is required'
            });
        }
        
        const newAlgorithm = loadBalancerService.changeAlgorithm(algorithm);
        
        res.json({
            success: true,
            data: {
                algorithm: newAlgorithm
            },
            message: 'Load balancing algorithm changed successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to change algorithm',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/load-balancer/algorithms
 * @desc    Get available algorithms
 * @access  Private (Admin only)
 */
router.get('/algorithms', protect, requireRole('admin'), async (req, res) => {
    try {
        const algorithms = loadBalancerService.getAvailableAlgorithms();
        
        res.json({
            success: true,
            data: algorithms,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get available algorithms',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/load-balancer/sticky-sessions
 * @desc    Toggle sticky sessions
 * @access  Private (Admin only)
 */
router.put('/sticky-sessions', protect, requireRole('admin'), async (req, res) => {
    try {
        const { enabled } = req.body;
        
        if (typeof enabled !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'enabled field must be a boolean'
            });
        }
        
        const stickySessions = loadBalancerService.toggleStickySessions(enabled);
        
        res.json({
            success: true,
            data: {
                stickySessions
            },
            message: `Sticky sessions ${enabled ? 'enabled' : 'disabled'} successfully`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to toggle sticky sessions',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/load-balancer/health
 * @desc    Get load balancer health status
 * @access  Private (Admin only)
 */
router.get('/health', protect, requireRole('admin'), async (req, res) => {
    try {
        const healthStats = loadBalancerHealthService.getStatistics();
        const healthyServers = loadBalancerHealthService.getHealthyServers();
        
        const overallHealth = {
            status: 'healthy',
            healthyServers: healthyServers.length,
            totalServers: healthStats.totalServers,
            successRate: healthStats.successRate,
            averageResponseTime: healthStats.averageResponseTime
        };
        
        if (healthyServers.length === 0) {
            overallHealth.status = 'unhealthy';
        } else if (healthyServers.length < healthStats.totalServers / 2) {
            overallHealth.status = 'degraded';
        }
        
        res.json({
            success: true,
            data: overallHealth,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get load balancer health',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/load-balancer/test-server
 * @desc    Test server selection
 * @access  Private (Admin only)
 */
router.post('/test-server', protect, requireRole('admin'), async (req, res) => {
    try {
        const { clientInfo } = req.body;
        
        const selectedServer = loadBalancerService.selectServer(clientInfo || {});
        
        res.json({
            success: true,
            data: selectedServer,
            message: 'Server selected successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to select server',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/load-balancer/sessions
 * @desc    Get active sessions (if sticky sessions enabled)
 * @access  Private (Admin only)
 */
router.get('/sessions', protect, requireRole('admin'), async (req, res) => {
    try {
        const statistics = loadBalancerService.getStatistics();
        
        res.json({
            success: true,
            data: {
                sessionCount: statistics.sessionCount,
                stickySessions: statistics.stickySessions
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get session information',
            error: error.message
        });
    }
});

export default router;
