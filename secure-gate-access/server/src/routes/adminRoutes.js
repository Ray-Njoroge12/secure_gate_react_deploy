import express from 'express';
import { getMetrics, getAuditLogs } from '../controllers/adminController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import attachRequestAudit from '../middleware/auditLogger.js';
import backupService from '../services/backupService.js';

const router = express.Router();

/**
 * @swagger
 * /api/admin/metrics:
 *   get:
 *     summary: Get system metrics
 *     description: Retrieve comprehensive system metrics including user counts, visitor statistics, and recent activity
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         users:
 *                           type: object
 *                           properties:
 *                             total: { type: integer }
 *                             residents: { type: integer }
 *                             guards: { type: integer }
 *                             admins: { type: integer }
 *                         visitors:
 *                           type: object
 *                           properties:
 *                             total: { type: integer }
 *                             pending: { type: integer }
 *                             verified: { type: integer }
 *                             checkedIn: { type: integer }
 *                             checkedOut: { type: integer }
 *                         recentVisitors:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id: { type: integer }
 *                               name: { type: string }
 *                               phone: { type: string }
 *                               email: { type: string }
 *                               status: { type: string }
 *                               created_at: { type: string, format: date-time }
 *             example:
 *               success: true
 *               message: Metrics retrieved successfully
 *               data:
 *                 users:
 *                   total: 150
 *                   residents: 120
 *                   guards: 25
 *                   admins: 5
 *                 visitors:
 *                   total: 500
 *                   pending: 10
 *                   verified: 450
 *                   checkedIn: 15
 *                   checkedOut: 435
 *                 recentVisitors:
 *                   - id: 1
 *                     name: John Doe
 *                     phone: "+254712345678"
 *                     email: "john@example.com"
 *                     status: "VERIFIED"
 *                     created_at: "2025-01-01T10:00:00.000Z"
 *               timestamp: "2025-01-01T00:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
// Admin metrics endpoint
router.get('/metrics', authenticateToken, attachRequestAudit, getMetrics);

/**
 * @swagger
 * /api/admin/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     description: Retrieve system audit logs for security monitoring and compliance
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortParam'
 *       - $ref: '#/components/parameters/OrderParam'
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [info, warn, error, debug]
 *         description: Filter by log level
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs until this date
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         logs:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id: { type: integer }
 *                               level: { type: string }
 *                               action: { type: string }
 *                               message: { type: string }
 *                               userId: { type: integer }
 *                               ipAddress: { type: string }
 *                               userAgent: { type: string }
 *                               timestamp: { type: string, format: date-time }
 *                               metadata: { type: object }
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             page: { type: integer }
 *                             limit: { type: integer }
 *                             total: { type: integer }
 *                             pages: { type: integer }
 *             example:
 *               success: true
 *               message: Audit logs retrieved successfully
 *               data:
 *                 logs:
 *                   - id: 1
 *                     level: "info"
 *                     action: "user.login"
 *                     message: "User logged in successfully"
 *                     userId: 123
 *                     ipAddress: "192.168.1.100"
 *                     userAgent: "Mozilla/5.0..."
 *                     timestamp: "2025-01-01T10:00:00.000Z"
 *                     metadata: { role: "resident" }
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   total: 100
 *                   pages: 10
 *               timestamp: "2025-01-01T00:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
// Audit logs endpoint
router.get('/audit-logs', authenticateToken, attachRequestAudit, getAuditLogs);

/**
 * @swagger
 * /api/admin/backup/trigger:
 *   post:
 *     summary: Trigger system backup
 *     description: Manually trigger a system backup operation
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [full, incremental, database, files]
 *                 description: Type of backup to perform
 *                 example: full
 *               description:
 *                 type: string
 *                 description: Optional description for the backup
 *                 example: Manual backup before system update
 *     responses:
 *       200:
 *         description: Backup triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         backupId: { type: string }
 *                         type: { type: string }
 *                         status: { type: string }
 *                         startedAt: { type: string, format: date-time }
 *                         estimatedDuration: { type: string }
 *             example:
 *               success: true
 *               message: Backup triggered successfully
 *               data:
 *                 backupId: "backup_20250101_100000"
 *                 type: "full"
 *                 status: "started"
 *                 startedAt: "2025-01-01T10:00:00.000Z"
 *                 estimatedDuration: "5-10 minutes"
 *               timestamp: "2025-01-01T00:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Backup trigger failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: Failed to trigger backup
 *               error:
 *                 code: BACKUP_ERROR
 *               timestamp: "2025-01-01T00:00:00.000Z"
 */
// Backup trigger endpoint
router.post('/backup/trigger', authenticateToken, attachRequestAudit, async (req, res) => {
  try {
    const result = await backupService.triggerBackup();
    res.json({
      success: true,
      message: 'Backup triggered successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 500,
        message: 'Failed to trigger backup',
        type: 'Backup Error',
        requestId: req.requestId
      }
    });
  }
});

export default router;