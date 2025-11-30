/**
 * Backup and Disaster Recovery Routes
 * API endpoints for backup management and disaster recovery
 */

import express from 'express';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import backupService from '../services/backupService.js';
import disasterRecoveryService from '../services/disasterRecoveryService.js';
import optimizedDb from '../services/optimizedDatabaseService.js';

const router = express.Router();

/**
 * @route   GET /api/backup/status
 * @desc    Get backup service status
 * @access  Private (Admin only)
 */
router.get('/status', protect, requireRole('admin'), async (req, res) => {
    try {
        const backupStatus = backupService.getStatus();
        const drStatus = disasterRecoveryService.getStatus();
        
        res.json({
            success: true,
            data: {
                backup: backupStatus,
                disasterRecovery: drStatus
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get backup and DR status',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/backup/full
 * @desc    Trigger full backup
 * @access  Private (Admin only)
 */
router.post('/full', protect, requireRole('admin'), async (req, res) => {
    try {
        // Trigger full backup asynchronously
        backupService.performFullBackup().catch(error => {
            console.error('Full backup failed:', error);
        });
        
        res.json({
            success: true,
            message: 'Full backup triggered successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to trigger full backup',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/backup/incremental
 * @desc    Trigger incremental backup
 * @access  Private (Admin only)
 */
router.post('/incremental', protect, requireRole('admin'), async (req, res) => {
    try {
        // Trigger incremental backup asynchronously
        backupService.performIncrementalBackup().catch(error => {
            console.error('Incremental backup failed:', error);
        });
        
        res.json({
            success: true,
            message: 'Incremental backup triggered successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to trigger incremental backup',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/backup/history
 * @desc    Get backup history
 * @access  Private (Admin only)
 */
router.get('/history', protect, requireRole('admin'), async (req, res) => {
    try {
        const { 
            startDate, 
            endDate, 
            type, 
            status, 
            limit = 100, 
            offset = 0 
        } = req.query;
        
        let query = `
            SELECT backup_id, backup_type, file_path, file_size, 
                   duration, status, error_message, created_at, completed_at
            FROM backup_log 
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 0;
        
        if (startDate) {
            query += ` AND created_at >= $${++paramCount}`;
            values.push(startDate);
        }
        
        if (endDate) {
            query += ` AND created_at <= $${++paramCount}`;
            values.push(endDate);
        }
        
        if (type) {
            query += ` AND backup_type = $${++paramCount}`;
            values.push(type);
        }
        
        if (status) {
            query += ` AND status = $${++paramCount}`;
            values.push(status);
        }
        
        query += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
        values.push(parseInt(limit), parseInt(offset));
        
        const result = await optimizedDb.query(query, values);
        
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: result.rows.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get backup history',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/backup/statistics
 * @desc    Get backup statistics
 * @access  Private (Admin only)
 */
router.get('/statistics', protect, requireRole('admin'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }
        
        const query = `SELECT * FROM get_backup_statistics($1, $2)`;
        const result = await optimizedDb.query(query, [startDate, endDate]);
        
        res.json({
            success: true,
            data: result.rows,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get backup statistics',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/dr/status
 * @desc    Get disaster recovery status
 * @access  Private (Admin only)
 */
router.get('/dr/status', protect, requireRole('admin'), async (req, res) => {
    try {
        const query = `SELECT * FROM get_dr_status()`;
        const result = await optimizedDb.query(query);
        
        res.json({
            success: true,
            data: result.rows,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get DR status',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/dr/recovery-history
 * @desc    Get disaster recovery history
 * @access  Private (Admin only)
 */
router.get('/dr/recovery-history', protect, requireRole('admin'), async (req, res) => {
    try {
        const { 
            startDate, 
            endDate, 
            issueType, 
            severity, 
            status, 
            limit = 100, 
            offset = 0 
        } = req.query;
        
        let query = `
            SELECT recovery_id, issue_type, severity, description, 
                   strategy, status, result, created_at, completed_at
            FROM dr_recovery_log 
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 0;
        
        if (startDate) {
            query += ` AND created_at >= $${++paramCount}`;
            values.push(startDate);
        }
        
        if (endDate) {
            query += ` AND created_at <= $${++paramCount}`;
            values.push(endDate);
        }
        
        if (issueType) {
            query += ` AND issue_type = $${++paramCount}`;
            values.push(issueType);
        }
        
        if (severity) {
            query += ` AND severity = $${++paramCount}`;
            values.push(severity);
        }
        
        if (status) {
            query += ` AND status = $${++paramCount}`;
            values.push(status);
        }
        
        query += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
        values.push(parseInt(limit), parseInt(offset));
        
        const result = await optimizedDb.query(query, values);
        
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: result.rows.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get DR recovery history',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/dr/statistics
 * @desc    Get disaster recovery statistics
 * @access  Private (Admin only)
 */
router.get('/dr/statistics', protect, requireRole('admin'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }
        
        const query = `SELECT * FROM get_dr_recovery_statistics($1, $2)`;
        const result = await optimizedDb.query(query, [startDate, endDate]);
        
        res.json({
            success: true,
            data: result.rows,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get DR statistics',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/dr/health-checks
 * @desc    Get health check history
 * @access  Private (Admin only)
 */
router.get('/dr/health-checks', protect, requireRole('admin'), async (req, res) => {
    try {
        const { 
            startDate, 
            endDate, 
            checkType, 
            status, 
            limit = 100, 
            offset = 0 
        } = req.query;
        
        let query = `
            SELECT check_type, status, details, response_time, created_at
            FROM health_check_log 
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 0;
        
        if (startDate) {
            query += ` AND created_at >= $${++paramCount}`;
            values.push(startDate);
        }
        
        if (endDate) {
            query += ` AND created_at <= $${++paramCount}`;
            values.push(endDate);
        }
        
        if (checkType) {
            query += ` AND check_type = $${++paramCount}`;
            values.push(checkType);
        }
        
        if (status) {
            query += ` AND status = $${++paramCount}`;
            values.push(status);
        }
        
        query += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
        values.push(parseInt(limit), parseInt(offset));
        
        const result = await optimizedDb.query(query, values);
        
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: result.rows.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get health check history',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/dr/health-statistics
 * @desc    Get health check statistics
 * @access  Private (Admin only)
 */
router.get('/dr/health-statistics', protect, requireRole('admin'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }
        
        const query = `SELECT * FROM get_health_check_statistics($1, $2)`;
        const result = await optimizedDb.query(query, [startDate, endDate]);
        
        res.json({
            success: true,
            data: result.rows,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get health check statistics',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/dr/test-failover
 * @desc    Test failover procedure
 * @access  Private (Admin only)
 */
router.post('/dr/test-failover', protect, requireRole('admin'), async (req, res) => {
    try {
        const { strategy } = req.body;
        
        if (!strategy) {
            return res.status(400).json({
                success: false,
                message: 'Failover strategy is required'
            });
        }
        
        // Trigger test failover asynchronously
        disasterRecoveryService.triggerRecoveryProcedure({
            type: 'test_failover',
            severity: 'low',
            description: `Test failover using ${strategy} strategy`,
            details: { strategy }
        }).catch(error => {
            console.error('Test failover failed:', error);
        });
        
        res.json({
            success: true,
            message: 'Test failover triggered successfully',
            strategy,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to trigger test failover',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/dr/configuration
 * @desc    Get DR configuration
 * @access  Private (Admin only)
 */
router.get('/dr/configuration', protect, requireRole('admin'), async (req, res) => {
    try {
        const query = `
            SELECT config_key, config_value, config_type, description, updated_at
            FROM dr_configuration 
            ORDER BY config_key
        `;
        const result = await optimizedDb.query(query);
        
        res.json({
            success: true,
            data: result.rows,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get DR configuration',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/dr/configuration
 * @desc    Update DR configuration
 * @access  Private (Admin only)
 */
router.put('/dr/configuration', protect, requireRole('admin'), async (req, res) => {
    try {
        const { configKey, configValue } = req.body;
        
        if (!configKey || configValue === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Configuration key and value are required'
            });
        }
        
        const query = `
            UPDATE dr_configuration 
            SET config_value = $1, updated_at = NOW()
            WHERE config_key = $2
        `;
        
        await optimizedDb.query(query, [configValue, configKey]);
        
        res.json({
            success: true,
            message: 'DR configuration updated successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update DR configuration',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/backup/cleanup
 * @desc    Trigger backup cleanup
 * @access  Private (Admin only)
 */
router.post('/cleanup', protect, requireRole('admin'), async (req, res) => {
    try {
        // Trigger cleanup asynchronously
        backupService.cleanupOldBackups().catch(error => {
            console.error('Backup cleanup failed:', error);
        });
        
        res.json({
            success: true,
            message: 'Backup cleanup triggered successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to trigger backup cleanup',
            error: error.message
        });
    }
});

export default router;
