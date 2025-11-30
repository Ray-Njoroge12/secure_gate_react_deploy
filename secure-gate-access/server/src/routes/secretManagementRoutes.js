/**
 * Secret Management Routes
 * API endpoints for secret management, rotation, and audit
 */

import express from 'express';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import secretManagementService from '../services/secretManagementService.js';
import secretRotationService from '../services/secretRotationService.js';
import secretAuditService from '../services/secretAuditService.js';
import { validateSecretRequest } from '../middleware/validationMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/secrets/status
 * @desc    Get secret management service status
 * @access  Private (Admin only)
 */
router.get('/status', protect, requireRole('admin'), async (req, res) => {
    try {
        const status = secretManagementService.getStatus();
        const rotationStatus = secretRotationService.getStatus();
        const auditStatus = secretAuditService.getStatus();
        
        res.json({
            success: true,
            data: {
                secretManagement: status,
                rotation: rotationStatus,
                audit: auditStatus
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get secret management status',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/secrets/health
 * @desc    Get Vault health status
 * @access  Private (Admin only)
 */
router.get('/health', protect, requireRole('admin'), async (req, res) => {
    try {
        const health = await secretManagementService.healthCheck();
        
        res.json({
            success: true,
            data: health,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get Vault health status',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/secrets/:path
 * @desc    Get secret from Vault
 * @access  Private
 */
router.get('/:path', protect, async (req, res) => {
    try {
        const { path } = req.params;
        const { key } = req.query;
        
        // Log secret access
        secretAuditService.logSecretAccess(
            'read',
            `secret/data/${path}`,
            key,
            req.user.id,
            req.ip,
            req.get('User-Agent')
        );
        
        const secret = await secretManagementService.getSecret(`secret/data/${path}`, key);
        
        res.json({
            success: true,
            data: secret,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve secret',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/secrets/:path
 * @desc    Store secret in Vault
 * @access  Private (Admin only)
 */
router.post('/:path', protect, requireRole('admin'), validateSecretRequest, async (req, res) => {
    try {
        const { path } = req.params;
        const { data, metadata } = req.body;
        
        // Log secret modification
        secretAuditService.logSecretModification(
            'create',
            `secret/data/${path}`,
            null,
            req.user.id,
            req.ip,
            req.get('User-Agent'),
            { dataKeys: Object.keys(data) }
        );
        
        await secretManagementService.storeSecret(`secret/data/${path}`, data, metadata);
        
        res.json({
            success: true,
            message: 'Secret stored successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to store secret',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/secrets/:path
 * @desc    Update secret in Vault
 * @access  Private (Admin only)
 */
router.put('/:path', protect, requireRole('admin'), validateSecretRequest, async (req, res) => {
    try {
        const { path } = req.params;
        const { data, metadata } = req.body;
        
        // Log secret modification
        secretAuditService.logSecretModification(
            'update',
            `secret/data/${path}`,
            null,
            req.user.id,
            req.ip,
            req.get('User-Agent'),
            { dataKeys: Object.keys(data) }
        );
        
        await secretManagementService.updateSecret(`secret/data/${path}`, data, metadata);
        
        res.json({
            success: true,
            message: 'Secret updated successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update secret',
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/secrets/:path
 * @desc    Delete secret from Vault
 * @access  Private (Admin only)
 */
router.delete('/:path', protect, requireRole('admin'), async (req, res) => {
    try {
        const { path } = req.params;
        const { reason } = req.body;
        
        // Log secret deletion
        secretAuditService.logSecretDeletion(
            'delete',
            `secret/data/${path}`,
            null,
            req.user.id,
            req.ip,
            req.get('User-Agent'),
            reason || 'No reason provided'
        );
        
        await secretManagementService.deleteSecret(`secret/data/${path}`);
        
        res.json({
            success: true,
            message: 'Secret deleted successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete secret',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/secrets/:path/rotate
 * @desc    Rotate secret
 * @access  Private (Admin only)
 */
router.post('/:path/rotate', protect, requireRole('admin'), async (req, res) => {
    try {
        const { path } = req.params;
        const { key, type } = req.body;
        
        if (!key) {
            return res.status(400).json({
                success: false,
                message: 'Secret key is required for rotation'
            });
        }
        
        // Log secret rotation
        secretAuditService.logSecretRotation(
            'rotate',
            `secret/data/${path}`,
            key,
            req.user.id,
            req.ip,
            req.get('User-Agent'),
            { rotationType: type || 'random' }
        );
        
        const newSecret = await secretRotationService.rotateSecret(
            `secret/data/${path}`,
            key,
            type || 'random'
        );
        
        res.json({
            success: true,
            message: 'Secret rotated successfully',
            data: {
                newSecret: newSecret.substring(0, 8) + '...', // Only show first 8 characters
                key,
                type: type || 'random'
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to rotate secret',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/secrets/:path/metadata
 * @desc    Get secret metadata
 * @access  Private (Admin only)
 */
router.get('/:path/metadata', protect, requireRole('admin'), async (req, res) => {
    try {
        const { path } = req.params;
        
        const metadata = await secretManagementService.getSecretMetadata(`secret/data/${path}`);
        
        res.json({
            success: true,
            data: metadata,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get secret metadata',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/secrets/list/:path
 * @desc    List secrets
 * @access  Private (Admin only)
 */
router.get('/list/:path', protect, requireRole('admin'), async (req, res) => {
    try {
        const { path } = req.params;
        
        const secrets = await secretManagementService.listSecrets(`secret/data/${path}`);
        
        res.json({
            success: true,
            data: secrets,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to list secrets',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/secrets/rotation/history
 * @desc    Get rotation history
 * @access  Private (Admin only)
 */
router.get('/rotation/history', protect, requireRole('admin'), async (req, res) => {
    try {
        const { limit = 100 } = req.query;
        
        const history = secretRotationService.getRotationHistory(parseInt(limit));
        
        res.json({
            success: true,
            data: history,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get rotation history',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/secrets/rotation/queue
 * @desc    Get rollback queue
 * @access  Private (Admin only)
 */
router.get('/rotation/queue', protect, requireRole('admin'), async (req, res) => {
    try {
        const queue = secretRotationService.getRollbackQueue();
        
        res.json({
            success: true,
            data: queue,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get rollback queue',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/secrets/audit/events
 * @desc    Get audit events
 * @access  Private (Admin only)
 */
router.get('/audit/events', protect, requireRole('admin'), async (req, res) => {
    try {
        const {
            eventType,
            userId,
            secretPath,
            startDate,
            endDate,
            limit = 100
        } = req.query;
        
        const filters = {
            eventType,
            userId: userId ? parseInt(userId) : undefined,
            secretPath,
            startDate,
            endDate,
            limit: parseInt(limit)
        };
        
        const events = await secretAuditService.getAuditEvents(filters);
        
        res.json({
            success: true,
            data: events,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get audit events',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/secrets/audit/statistics
 * @desc    Get audit statistics
 * @access  Private (Admin only)
 */
router.get('/audit/statistics', protect, requireRole('admin'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }
        
        const statistics = await secretAuditService.getAuditStatistics(startDate, endDate);
        
        res.json({
            success: true,
            data: statistics,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get audit statistics',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/secrets/generate
 * @desc    Generate new secret
 * @access  Private (Admin only)
 */
router.post('/generate', protect, requireRole('admin'), async (req, res) => {
    try {
        const { type = 'random', length = 32 } = req.body;
        
        const secret = secretManagementService.generateSecret(type, length);
        
        res.json({
            success: true,
            data: {
                secret: secret.substring(0, 8) + '...', // Only show first 8 characters
                type,
                length: secret.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to generate secret',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/secrets/cache/clear
 * @desc    Clear secret cache
 * @access  Private (Admin only)
 */
router.post('/cache/clear', protect, requireRole('admin'), async (req, res) => {
    try {
        secretManagementService.clearCache();
        
        res.json({
            success: true,
            message: 'Secret cache cleared successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to clear secret cache',
            error: error.message
        });
    }
});

export default router;
