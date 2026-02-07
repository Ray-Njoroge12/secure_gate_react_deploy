/**
 * @fileoverview Bulk Operations Routes - Task 13.1
 * @description Routes for bulk operations including user management, visitor processing, and CSV imports
 */

import express from 'express';
import {
  executeBulkOperation,
  importFromCSV,
  getOperationStatus,
  getActiveOperations,
  cancelOperation,
  searchAndFilter,
  createOperationTemplate,
  executeFromTemplate,
  getOperationTemplates,
  scheduleAutomatedOperation,
  getCompletionReport
} from '../controllers/bulkOperationsController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { requireRolePolicy } from '../middleware/rolePolicy.js';
import attachRequestAudit from '../middleware/auditLogger.js';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// Rate limiting for bulk operations
const bulkOperationLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 bulk operations per 5 minutes per user
  message: {
    error: 'Too many bulk operations, please try again later.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `bulk_ops_${req.user?.id || req.ip}`,
});

// Rate limiting for CSV imports
const csvImportLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 CSV imports per 10 minutes per user
  message: {
    error: 'Too many CSV import attempts, please try again later.',
    retryAfter: '10 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `csv_import_${req.user?.id || req.ip}`,
});

/**
 * @swagger
 * /api/bulk-operations/execute:
 *   post:
 *     summary: Execute bulk operation
 *     description: Execute a bulk operation on multiple items with progress tracking
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - operationType
 *               - itemIds
 *             properties:
 *               operationType:
 *                 type: string
 *                 enum: [approve_users, reject_users, delete_users, approve_visitors, reject_visitors, send_notifications, update_status]
 *                 description: Type of bulk operation to perform
 *                 example: approve_users
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of item IDs to process
 *                 example: [1, 2, 3, 4, 5]
 *               data:
 *                 type: object
 *                 description: Additional data for the operation
 *                 properties:
 *                   reason:
 *                     type: string
 *                     description: Reason for rejection (for reject operations)
 *                   message:
 *                     type: string
 *                     description: Message content (for notification operations)
 *                   title:
 *                     type: string
 *                     description: Notification title (for notification operations)
 *                   channels:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [email, sms]
 *                     description: Notification channels (for notification operations)
 *               batchSize:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 50
 *                 description: Number of items to process per batch
 *     responses:
 *       200:
 *         description: Bulk operation completed successfully
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
 *                         operationId:
 *                           type: string
 *                           description: Unique operation identifier
 *                         type:
 *                           type: string
 *                           description: Operation type
 *                         status:
 *                           type: string
 *                           enum: [completed, failed, cancelled]
 *                         results:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: integer
 *                               description: Total items processed
 *                             success:
 *                               type: integer
 *                               description: Successfully processed items
 *                             failed:
 *                               type: integer
 *                               description: Failed items
 *                             skipped:
 *                               type: integer
 *                               description: Skipped items
 *                         duration:
 *                           type: integer
 *                           description: Operation duration in milliseconds
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post('/execute',
  bulkOperationLimit,
  authenticateToken,
  requireRolePolicy('adminOrGuard'), // Admin, guard, and super_admin can execute bulk operations
  attachRequestAudit,
  executeBulkOperation
);

/**
 * @swagger
 * /api/bulk-operations/import:
 *   post:
 *     summary: Import data from CSV
 *     description: Import users or visitors from CSV data with validation and progress tracking
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - csvData
 *               - importType
 *             properties:
 *               csvData:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Array of objects representing CSV rows
 *                 example:
 *                   - username: "john_doe"
 *                     email: "john@example.com"
 *                     role: "resident"
 *                     phone: "+254712345678"
 *                   - username: "jane_smith"
 *                     email: "jane@example.com"
 *                     role: "resident"
 *                     phone: "+254712345679"
 *               importType:
 *                 type: string
 *                 enum: [users, visitors]
 *                 description: Type of data to import
 *                 example: users
 *     responses:
 *       200:
 *         description: CSV import completed successfully
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
 *                         operationId:
 *                           type: string
 *                         type:
 *                           type: string
 *                         status:
 *                           type: string
 *                         results:
 *                           type: object
 *                           properties:
 *                             total: { type: integer }
 *                             success: { type: integer }
 *                             failed: { type: integer }
 *                             skipped: { type: integer }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post('/import',
  csvImportLimit,
  authenticateToken,
  requireRolePolicy('adminOnly'), // Only admin/super_admin can import data
  attachRequestAudit,
  importFromCSV
);

/**
 * @swagger
 * /api/bulk-operations/status/{operationId}:
 *   get:
 *     summary: Get operation status
 *     description: Get the status and progress of a bulk operation
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: operationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Operation ID
 *         example: bulk_1640995200000_abc123def
 *     responses:
 *       200:
 *         description: Operation status retrieved successfully
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
 *                         operation:
 *                           type: object
 *                           properties:
 *                             id: { type: string }
 *                             type: { type: string }
 *                             status: { type: string }
 *                             progress:
 *                               type: object
 *                               properties:
 *                                 current: { type: integer }
 *                                 total: { type: integer }
 *                                 percentage: { type: integer }
 *                             results:
 *                               type: object
 *                               properties:
 *                                 success: { type: integer }
 *                                 failed: { type: integer }
 *                                 skipped: { type: integer }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/status/:operationId',
  authenticateToken,
  attachRequestAudit,
  getOperationStatus
);

/**
 * @swagger
 * /api/bulk-operations/active:
 *   get:
 *     summary: Get active operations
 *     description: Get all currently active bulk operations for the user
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active operations retrieved successfully
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
 *                         operations:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id: { type: string }
 *                               type: { type: string }
 *                               status: { type: string }
 *                               progress:
 *                                 type: object
 *                                 properties:
 *                                   current: { type: integer }
 *                                   total: { type: integer }
 *                                   percentage: { type: integer }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/active',
  authenticateToken,
  attachRequestAudit,
  getActiveOperations
);

/**
 * @swagger
 * /api/bulk-operations/cancel/{operationId}:
 *   post:
 *     summary: Cancel operation
 *     description: Cancel a running bulk operation
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: operationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Operation ID to cancel
 *         example: bulk_1640995200000_abc123def
 *     responses:
 *       200:
 *         description: Operation cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/cancel/:operationId',
  authenticateToken,
  attachRequestAudit,
  cancelOperation
);

/**
 * @swagger
 * /api/bulk-operations/templates:
 *   get:
 *     summary: Get bulk operation templates
 *     description: Get available bulk operation templates and import formats based on user role
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
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
 *                         templates:
 *                           type: object
 *                           properties:
 *                             user_operations:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   key: { type: string }
 *                                   label: { type: string }
 *                                   description: { type: string }
 *                                   icon: { type: string }
 *                                   variant: { type: string }
 *                             visitor_operations:
 *                               type: array
 *                               items:
 *                                 type: object
 *                             import_templates:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   key: { type: string }
 *                                   label: { type: string }
 *                                   fields: { type: array }
 *                                   requiredFields: { type: array }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/templates',
  authenticateToken,
  attachRequestAudit,
  getOperationTemplates
);

/**
 * @swagger
 * /api/bulk-operations/search/{entityType}:
 *   get:
 *     summary: Advanced search and filtering
 *     description: Search and filter large datasets with pagination and sorting
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [users, visitors, audit_logs]
 *         description: Type of entity to search
 *         example: users
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query
 *         example: john
 *       - in: query
 *         name: filters
 *         schema:
 *           type: string
 *         description: JSON string of filters
 *         example: '{"role":"resident","status":"active"}'
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort field
 *         example: created_at
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *         example: desc
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *         example: 20
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
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
 *                         items:
 *                           type: array
 *                           items:
 *                             type: object
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             page: { type: integer }
 *                             limit: { type: integer }
 *                             total: { type: integer }
 *                             pages: { type: integer }
 *                             hasNext: { type: boolean }
 *                             hasPrev: { type: boolean }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/search/:entityType',
  authenticateToken,
  attachRequestAudit,
  searchAndFilter
);

/**
 * @swagger
 * /api/bulk-operations/templates/create:
 *   post:
 *     summary: Create operation template
 *     description: Create a reusable template for bulk operations
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - operationType
 *             properties:
 *               name:
 *                 type: string
 *                 description: Template name
 *                 example: "Weekly User Approval"
 *               description:
 *                 type: string
 *                 description: Template description
 *                 example: "Approve all pending users from the past week"
 *               operationType:
 *                 type: string
 *                 enum: [approve_users, reject_users, delete_users, approve_visitors, reject_visitors, send_notifications]
 *                 description: Type of operation
 *                 example: approve_users
 *               defaultSettings:
 *                 type: object
 *                 description: Default settings for the operation
 *                 properties:
 *                   batchSize:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 100
 *                     example: 50
 *                   notifyUsers:
 *                     type: boolean
 *                     example: true
 *               filters:
 *                 type: object
 *                 description: Default filters to apply
 *                 example: {"status": "pending", "created_at": {"gte": "7d"}}
 *               automationRules:
 *                 type: object
 *                 description: Automation rules for the template
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     example: false
 *                   schedule:
 *                     type: string
 *                     description: Cron expression for scheduling
 *                     example: "0 9 * * 1"
 *                   conditions:
 *                     type: array
 *                     items:
 *                       type: object
 *                     example: [{"field": "count", "operator": "gte", "value": 10}]
 *     responses:
 *       201:
 *         description: Template created successfully
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
 *                         template:
 *                           type: object
 *                           properties:
 *                             id: { type: string }
 *                             name: { type: string }
 *                             description: { type: string }
 *                             operationType: { type: string }
 *                             createdAt: { type: string }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/templates/create',
  authenticateToken,
  requireRolePolicy('adminOnly'), // Only admin/super_admin can create templates
  attachRequestAudit,
  createOperationTemplate
);

/**
 * @swagger
 * /api/bulk-operations/templates/{templateId}/execute:
 *   post:
 *     summary: Execute operation from template
 *     description: Execute a bulk operation using a predefined template
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *         example: template_1640995200000_abc123
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               overrides:
 *                 type: object
 *                 description: Override template settings
 *                 properties:
 *                   batchSize:
 *                     type: integer
 *                     example: 25
 *                   filters:
 *                     type: object
 *                     example: {"status": "pending"}
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Specific item IDs to process (optional)
 *                 example: [1, 2, 3]
 *     responses:
 *       200:
 *         description: Template operation executed successfully
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
 *                         operationId: { type: string }
 *                         templateId: { type: string }
 *                         status: { type: string }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/templates/:templateId/execute',
  bulkOperationLimit,
  authenticateToken,
  requireRolePolicy('adminOrGuard'),
  attachRequestAudit,
  executeFromTemplate
);

/**
 * @swagger
 * /api/bulk-operations/automation/schedule:
 *   post:
 *     summary: Schedule automated operation
 *     description: Schedule a bulk operation to run automatically based on conditions
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - templateId
 *               - schedule
 *             properties:
 *               templateId:
 *                 type: string
 *                 description: Template to use for automation
 *                 example: template_1640995200000_abc123
 *               schedule:
 *                 type: string
 *                 description: Cron expression for scheduling
 *                 example: "0 9 * * 1"
 *               conditions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field:
 *                       type: string
 *                       example: count
 *                     operator:
 *                       type: string
 *                       enum: [eq, ne, gt, gte, lt, lte]
 *                       example: gte
 *                     value:
 *                       type: number
 *                       example: 10
 *                 description: Conditions that must be met for execution
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 description: Whether the automation is active
 *     responses:
 *       201:
 *         description: Automation scheduled successfully
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
 *                         automationId: { type: string }
 *                         templateId: { type: string }
 *                         schedule: { type: string }
 *                         nextRun: { type: string }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/automation/schedule',
  authenticateToken,
  requireRolePolicy('adminOnly'), // Only admin/super_admin can schedule automation
  attachRequestAudit,
  scheduleAutomatedOperation
);

/**
 * @swagger
 * /api/bulk-operations/reports/{operationId}:
 *   get:
 *     summary: Get completion report
 *     description: Get detailed completion report for a bulk operation with recommendations
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: operationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Operation ID
 *         example: bulk_1640995200000_abc123def
 *     responses:
 *       200:
 *         description: Completion report retrieved successfully
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
 *                         report:
 *                           type: object
 *                           properties:
 *                             operationId: { type: string }
 *                             summary:
 *                               type: object
 *                               properties:
 *                                 total: { type: integer }
 *                                 success: { type: integer }
 *                                 failed: { type: integer }
 *                                 skipped: { type: integer }
 *                                 duration: { type: integer }
 *                             details:
 *                               type: object
 *                               properties:
 *                                 successItems: { type: array }
 *                                 failedItems: { type: array }
 *                                 skippedItems: { type: array }
 *                             recommendations:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   type: { type: string }
 *                                   message: { type: string }
 *                                   priority: { type: string }
 *                             nextSteps:
 *                               type: array
 *                               items:
 *                                 type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/reports/:operationId',
  authenticateToken,
  attachRequestAudit,
  getCompletionReport
);

export default router;