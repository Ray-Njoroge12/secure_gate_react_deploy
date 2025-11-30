/**
 * Database Backup & Recovery API Routes
 * Provides REST API for backup management operations
 */

import express from 'express';
import BackupService from '../services/backupService.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { successResponse, createdResponse } from '../utils/responseUtils.js';

const router = express.Router();
const backupService = new BackupService();

/**
 * @swagger
 * /api/backup/full:
 *   post:
 *     summary: Create a full database backup
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               compress:
 *                 type: boolean
 *                 description: Enable compression
 *                 default: false
 *               schemaOnly:
 *                 type: boolean
 *                 description: Backup schema only
 *                 default: false
 *               dataOnly:
 *                 type: boolean
 *                 description: Backup data only
 *                 default: false
 *     responses:
 *       201:
 *         description: Full backup created successfully
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
 *                     backupId:
 *                       type: string
 *                     fileName:
 *                       type: string
 *                     filePath:
 *                       type: string
 *                     fileSize:
 *                       type: number
 *                     duration:
 *                       type: number
 *                     type:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/full', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  const { compress = false, schemaOnly = false, dataOnly = false } = req.body;
  
  const backup = await backupService.createFullBackup({
    compress,
    schemaOnly,
    dataOnly
  });
  
  createdResponse(res, backup, 'Full backup created successfully');
}));

/**
 * @swagger
 * /api/backup/incremental:
 *   post:
 *     summary: Create an incremental backup
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               compress:
 *                 type: boolean
 *                 description: Enable compression
 *                 default: false
 *     responses:
 *       201:
 *         description: Incremental backup created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/incremental', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  const { compress = false } = req.body;
  
  const backup = await backupService.createIncrementalBackup({
    compress
  });
  
  createdResponse(res, backup, 'Incremental backup created successfully');
}));

/**
 * @swagger
 * /api/backup/data:
 *   post:
 *     summary: Create a data-only backup
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Data backup created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/data', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  const backup = await backupService.createDataBackup();
  
  createdResponse(res, backup, 'Data backup created successfully');
}));

/**
 * @swagger
 * /api/backup/restore:
 *   post:
 *     summary: Restore database from backup
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - backupPath
 *             properties:
 *               backupPath:
 *                 type: string
 *                 description: Path to the backup file
 *               options:
 *                 type: object
 *                 description: Restore options
 *     responses:
 *       200:
 *         description: Database restored successfully
 *       400:
 *         description: Bad request - Invalid backup path
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/restore', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  const { backupPath, options = {} } = req.body;
  
  if (!backupPath) {
    return res.status(400).json({
      success: false,
      message: 'Backup path is required',
      error: {
        code: 'VALIDATION_ERROR',
        details: { missing: ['backupPath'] }
      }
    });
  }
  
  const restore = await backupService.restoreFromBackup(backupPath, options);
  
  successResponse(res, restore, 'Database restored successfully');
}));

/**
 * @swagger
 * /api/backup/list:
 *   get:
 *     summary: List all backups
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [full, incremental, data]
 *         description: Filter by backup type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed]
 *         description: Filter by backup status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Limit number of results
 *     responses:
 *       200:
 *         description: List of backups retrieved successfully
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       backup_id:
 *                         type: string
 *                       backup_type:
 *                         type: string
 *                       file_path:
 *                         type: string
 *                       file_size:
 *                         type: number
 *                       duration:
 *                         type: number
 *                       status:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                       completed_at:
 *                         type: string
 *                       error_message:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/list', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  const { type, status, limit } = req.query;
  
  const backups = await backupService.listBackups({
    type,
    status,
    limit: limit ? parseInt(limit) : undefined
  });
  
  successResponse(res, backups, 'Backups retrieved successfully');
}));

/**
 * @swagger
 * /api/backup/cleanup:
 *   post:
 *     summary: Clean up old backups
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Old backups cleaned up successfully
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
 *                     deletedCount:
 *                       type: number
 *                     totalSize:
 *                       type: number
 *                     retentionDays:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/cleanup', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  const cleanup = await backupService.cleanupOldBackups();
  
  successResponse(res, cleanup, 'Old backups cleaned up successfully');
}));

/**
 * @swagger
 * /api/backup/statistics:
 *   get:
 *     summary: Get backup statistics
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup statistics retrieved successfully
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
 *                     byType:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           backup_type:
 *                             type: string
 *                           status:
 *                             type: string
 *                           count:
 *                             type: number
 *                           total_size:
 *                             type: number
 *                           avg_duration:
 *                             type: number
 *                           oldest_backup:
 *                             type: string
 *                           newest_backup:
 *                             type: string
 *                     totals:
 *                       type: object
 *                       properties:
 *                         total_backups:
 *                           type: number
 *                         total_size:
 *                           type: number
 *                         avg_duration:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/statistics', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  const statistics = await backupService.getBackupStatistics();
  
  successResponse(res, statistics, 'Backup statistics retrieved successfully');
}));

/**
 * @swagger
 * /api/backup/health:
 *   get:
 *     summary: Check backup system health
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup system health check successful
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
 *                       enum: [healthy, warning, critical]
 *                     backupDirectory:
 *                       type: string
 *                     retentionDays:
 *                       type: number
 *                     lastBackup:
 *                       type: string
 *                     totalBackups:
 *                       type: number
 *                     totalSize:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/health', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  try {
    // Check backup directory
    const fs = await import('fs');
    const path = await import('path');
    const backupDir = path.join(process.cwd(), 'backups');
    const dirExists = fs.existsSync(backupDir);
    
    // Get recent backups
    const recentBackups = await backupService.listBackups({ limit: 1 });
    const lastBackup = recentBackups.length > 0 ? recentBackups[0] : null;
    
    // Get statistics
    const stats = await backupService.getBackupStatistics();
    
    // Determine health status
    let status = 'healthy';
    if (!dirExists) {
      status = 'critical';
    } else if (!lastBackup || new Date(lastBackup.created_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
      status = 'warning';
    }
    
    const health = {
      status,
      backupDirectory: backupDir,
      retentionDays: backupService.retentionDays,
      lastBackup: lastBackup ? lastBackup.created_at : null,
      totalBackups: stats.totals.total_backups || 0,
      totalSize: backupService.formatFileSize(stats.totals.total_size || 0)
    };
    
    successResponse(res, health, 'Backup system health check completed');
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Backup health check failed',
      error: {
        code: 'HEALTH_CHECK_FAILED',
        details: { error: error.message }
      }
    });
  }
}));

export default router;




