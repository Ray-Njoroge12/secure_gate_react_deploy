import express from 'express';
import {
  getSettings,
  updateSettings,
  updateCompliance,
  runComplianceReview
} from '../controllers/adminSettingsController.js';
import { getMetrics, getAuditLogs, getPendingUsers, updateUserStatus, getEstateInfo } from '../controllers/adminController.js';
import {
  getPlatformOverview,
  listEstates,
  createEstate,
  updateEstateStatus,
  getEstateDecommissionImpact,
  deleteEstate,
  searchGlobalUsers,
  getGlobalLogs,
  getSystemMetrics
} from '../controllers/superAdminController.js';
import { respond, respondError } from '../utils/respond.js';
import { authenticateToken, requireRole, requireMFA } from '../middleware/authMiddleware.js';
import { requireRolePolicy } from '../middleware/rolePolicy.js';
import { requireEstateContextForAdmin } from '../middleware/estateContextMiddleware.js';
import { requireMFAForSensitiveOps, requireRecentMFAVerification } from '../middleware/mfaSensitiveOperations.js';
import attachRequestAudit from '../middleware/auditLogger.js';
import { 
  superAdminSensitiveLimit, 
  estateModificationLimit, 
  adminQueryLimit, 
  adminModificationLimit 
} from '../middleware/rateLimitMiddleware.js';
import {
  validate,
  validateSearchTerm,
  validatePagination,
  validateIdParam,
  validateUserUpdate,
  validateUserStatusUpdate,
  validateResidentCreation,
  validateEstateSettings,
  validateDPOSettings,
  validateODPCSettings,
  preventPrivilegeEscalation,
  preventSelfDeletion
} from '../middleware/adminValidation.js';
import backupService from '../services/backupService.js';
import userService from '../services/userService.js';
import { dbManager } from '../database/db.enhanced.js';
import retentionService from '../services/retentionService.js';
import retentionScheduler from '../jobs/retentionScheduler.js';
import { minimizeData } from '../middleware/dataMinimization.js';

const router = express.Router();

// ==================== SUPER ADMIN ENDPOINTS ====================

/**
 * @route GET /api/admin/super-admin/overview
 * @desc Get platform-wide overview metrics
 * @access Private (Super Admin only)
 */
router.get('/super-admin/overview', authenticateToken, requireRole(['super_admin']), requireMFA, attachRequestAudit, getPlatformOverview);

/**
 * @route GET /api/admin/super-admin/estates
 * @desc List all estates with stats
 * @access Private (Super Admin only)
 */
router.get('/super-admin/estates', authenticateToken, requireRole(['super_admin']), requireMFA, attachRequestAudit, listEstates);

/**
 * @route POST /api/admin/super-admin/estates
 * @desc Create a new estate
 * @access Private (Super Admin only)
 */
router.post('/super-admin/estates', authenticateToken, requireRole(['super_admin']), requireMFA, estateModificationLimit(), attachRequestAudit, createEstate);

/**
 * @route PATCH /api/admin/super-admin/estates/:id/status
 * @desc Update estate status (suspend/activate)
 * @access Private (Super Admin only)
 */
router.patch('/super-admin/estates/:id/status', authenticateToken, requireRole(['super_admin']), requireMFA, superAdminSensitiveLimit(), attachRequestAudit, updateEstateStatus);

/**
 * @route GET /api/admin/super-admin/estates/:id/decommission-impact
 * @desc Get impact summary before decommissioning an estate
 * @access Private (Super Admin only)
 */
router.get('/super-admin/estates/:id/decommission-impact', authenticateToken, requireRole(['super_admin']), requireMFA, attachRequestAudit, getEstateDecommissionImpact);

/**
 * @route DELETE /api/admin/super-admin/estates/:id
 * @desc Decommission estate (soft delete via status)
 * @access Private (Super Admin only)
 */
router.delete('/super-admin/estates/:id', authenticateToken, requireRole(['super_admin']), requireMFA, estateModificationLimit(), attachRequestAudit, deleteEstate);

/**
 * @route GET /api/admin/super-admin/users/search
 * @desc Search users globally (Privacy preserved)
 * @access Private (Super Admin only)
 */
router.get('/super-admin/users/search', authenticateToken, requireRole(['super_admin']), requireMFA, attachRequestAudit, searchGlobalUsers);

/**
 * @route GET /api/admin/super-admin/audit-logs
 * @desc View system-wide audit logs
 * @access Private (Super Admin only)
 */
router.get('/super-admin/audit-logs', authenticateToken, requireRole(['super_admin']), requireMFA, attachRequestAudit, getGlobalLogs);

/**
 * @route GET /api/admin/super-admin/system/metrics
 * @desc Get real-time system health metrics
 * @access Private (Super Admin only)
 */
router.get('/super-admin/system/metrics', authenticateToken, requireRole(['super_admin']), requireMFA, attachRequestAudit, getSystemMetrics);

// ==================== SUPER ADMIN ENDPOINTS ====================

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
router.get('/metrics', authenticateToken, requireEstateContextForAdmin, adminQueryLimit(), attachRequestAudit, getMetrics);

/**
 * @route GET /api/admin/estate-info
 * @desc Get current estate info
 * @tags [Admin]
 * @security
 *       - bearerAuth: []
 * @responses
 *       200:
 *         description: Estate info retrieved
 */
router.get('/estate-info', authenticateToken, requireEstateContextForAdmin, adminQueryLimit(), attachRequestAudit, getEstateInfo);

// ==================== SETTINGS & COMPLIANCE ====================

/**
 * @route GET /api/admin/settings
 * @desc Get estate settings
 * @access Private (Admin only)
 */
router.get('/settings', authenticateToken, requireRolePolicy('adminOnly'), requireEstateContextForAdmin, adminQueryLimit(), attachRequestAudit, getSettings);

/**
 * @route PUT /api/admin/settings
 * @desc Update estate settings
 * @access Private (Admin only)
 */
router.put('/settings', authenticateToken, requireRolePolicy('adminOnly'), requireEstateContextForAdmin, adminModificationLimit(), attachRequestAudit, updateSettings);

/**
 * @route PUT /api/admin/compliance/:section
 * @desc Update compliance settings (dpo/odpc)
 * @access Private (Admin only)
 */
router.put('/compliance/:section', authenticateToken, requireRolePolicy('adminOnly'), requireMFAForSensitiveOps, adminModificationLimit(), attachRequestAudit, updateCompliance);

/**
 * @route POST /api/admin/compliance/review
 * @desc Trigger compliance review
 * @access Private (Admin only)
 */
router.post('/compliance/review', authenticateToken, requireRolePolicy('adminOnly'), requireMFAForSensitiveOps, attachRequestAudit, runComplianceReview);

// ==================== SETTINGS & COMPLIANCE ====================

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
router.get('/audit-logs', authenticateToken, adminQueryLimit(), attachRequestAudit, getAuditLogs);

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
 *               message: 'Failed to trigger backup'
 *               error:
 *                 code: BACKUP_ERROR
 *               timestamp: "2025-01-01T00:00:00.000Z"
 */
// Backup trigger endpoint
router.post('/backup/trigger', authenticateToken, requireRolePolicy('adminOnly'), requireMFAForSensitiveOps, adminModificationLimit(), attachRequestAudit, async (req, res) => {
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

// ==================== USER MANAGEMENT ENDPOINTS ====================

/**
 * @route GET /api/admin/users/pending
 * @desc Get all pending users requiring approval
 * @access Private (Admin only)
 */
router.get('/users/pending', authenticateToken, requireRolePolicy('adminOnly'), requireEstateContextForAdmin, adminQueryLimit(), minimizeData('user'), attachRequestAudit, getPendingUsers);

/**
 * @route PUT /api/admin/users/:id/status
 * @desc Update user account status (approve/reject/suspend)
 * @access Private (Admin only)
 */
router.put('/users/:id/status', 
  authenticateToken, 
  requireRolePolicy('adminOnly'),
  requireEstateContextForAdmin, 
  adminModificationLimit(), 
  validateUserStatusUpdate(), 
  validate, 
  attachRequestAudit, 
  updateUserStatus
);

/**
 * @route POST /api/admin/users/bulk-approve
 * @desc Bulk approve pending users
 * @access Private (Admin only)
 */
router.post('/users/bulk-approve',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  adminModificationLimit(),
  attachRequestAudit,
  async (req, res) => {
    try {
      const { userIds, estateId } = req.body;

      // Validation
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'userIds must be a non-empty array'
        });
      }

      if (userIds.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Cannot approve more than 50 users at once'
        });
      }

      // Validate all IDs are numbers
      if (!userIds.every(id => Number.isInteger(id) && id > 0)) {
        return res.status(400).json({
          success: false,
          message: 'All user IDs must be positive integers'
        });
      }

      // Build query with estate scoping
      let query = `
        UPDATE users 
        SET account_status = 'active', updated_at = NOW() 
        WHERE id = ANY($1) 
        AND account_status = 'pending'
      `;
      const params = [userIds];

      // Estate scoping
      if (req.user.estate_id) {
        query += ` AND estate_id = $2`;
        params.push(req.user.estate_id);
      } else if (estateId) {
        // Super admin can specify estate
        query += ` AND estate_id = $2`;
        params.push(estateId);
      }

      query += ` RETURNING id, username, email, role`;

      const result = await dbManager.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No pending users found with the provided IDs in your estate'
        });
      }

      res.json({
        success: true,
        message: `${result.rows.length} user(s) approved successfully`,
        data: {
          approved: result.rows,
          count: result.rows.length,
          requested: userIds.length
        }
      });
    } catch (error) {
      console.error('Error in bulk approve:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve users',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/admin/users/bulk-reject
 * @desc Bulk reject pending users
 * @access Private (Admin only)
 */
router.post('/users/bulk-reject',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  adminModificationLimit(),
  attachRequestAudit,
  async (req, res) => {
    try {
      const { userIds, reason } = req.body;

      // Validation
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'userIds must be a non-empty array'
        });
      }

      if (userIds.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Cannot reject more than 50 users at once'
        });
      }

      // Build query with estate scoping
      let query = `
        UPDATE users 
        SET account_status = 'rejected', updated_at = NOW() 
        WHERE id = ANY($1) 
        AND account_status = 'pending'
      `;
      const params = [userIds];

      if (req.user.estate_id) {
        query += ` AND estate_id = $2`;
        params.push(req.user.estate_id);
      }

      query += ` RETURNING id, username, email`;

      const result = await dbManager.query(query, params);

      res.json({
        success: true,
        message: `${result.rows.length} user(s) rejected`,
        data: {
          rejected: result.rows,
          count: result.rows.length,
          reason: reason || 'No reason provided'
        }
      });
    } catch (error) {
      console.error('Error in bulk reject:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject users',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/admin/users
 * @desc Get all users with optional filtering
 * @access Private (Admin only)
 */
router.get('/users', 
  authenticateToken, 
  requireRolePolicy('adminOnly'), 
  adminQueryLimit(), 
  validateSearchTerm(), 
  validatePagination(), 
  validate, 
  minimizeData('user'), 
  attachRequestAudit, 
  async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;

    // Fix A-004: Pagination Input Validation
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20)); // Cap limit at 100
    const offset = (pageNum - 1) * limitNum;

    // Fix A-003: Input Validation (Search Sanity)
    if (search && search.length > 100) {
      return respondError(res, 400, 'Search term too long');
    }

    let query = 'SELECT id, username, email, role, account_status AS status, created_at, updated_at FROM users WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (role) {
      query += ` AND role = $${paramIndex++}`;
      params.push(role);
    }
    if (status) {
      query += ` AND account_status = $${paramIndex++}`;
      params.push(status);
    }
    if (search) {
      query += ` AND (username ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Fix: Admin User Isolation - Add to WHERE clause BEFORE ordering/pagination
    // Only allow super admins (null estate_id) to see all users
    // Admin with estate_id can only see users in their estate
    if (req.user.estate_id) {
      query += ` AND estate_id = $${paramIndex++}`;
      params.push(req.user.estate_id);
    }

    // Get total count
    const countQuery = query.replace('SELECT id, username, email, role, account_status AS status, created_at, updated_at', 'SELECT COUNT(*)');
    const countResult = await dbManager.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limitNum, offset);



    const result = await dbManager.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    // Fix A-002: Safe Error Handling
  } catch (error) {
    console.error('Error fetching users:', error);
    respondError(res, 500, 'Failed to fetch users', error);
  }
});

/**
 * @route POST /api/admin/users/advanced-search
 * @desc Advanced multi-field search with date range filtering
 * @access Private (Admin only)
 */
router.post('/users/advanced-search',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  adminQueryLimit(),
  attachRequestAudit,
  async (req, res) => {
    try {
      const {
        searchTerm,
        roles = [],
        statuses = [],
        dateFrom,
        dateTo,
        mfaEnabled,
        page = 1,
        limit = 20
      } = req.body;

      // Validation
      const limitNum = Math.min(parseInt(limit) || 20, 100);
      const offset = (parseInt(page) - 1) * limitNum;

      let query = `
        SELECT id, username, email, role, account_status AS status, 
               phone, mfa_enabled, created_at, updated_at, last_login
        FROM users 
        WHERE account_status != 'deleted'
      `;
      const params = [];
      let paramIndex = 1;

      // Estate scoping (CRITICAL)
      if (req.user.estate_id) {
        query += ` AND estate_id = $${paramIndex++}`;
        params.push(req.user.estate_id);
      }

      // Multi-field search (username, email, phone)
      if (searchTerm && searchTerm.trim().length > 0) {
        query += ` AND (
          username ILIKE $${paramIndex} OR 
          email ILIKE $${paramIndex} OR 
          phone ILIKE $${paramIndex}
        )`;
        params.push(`%${searchTerm.trim()}%`);
        paramIndex++;
      }

      // Role filter (multiple roles)
      if (roles.length > 0) {
        query += ` AND role = ANY($${paramIndex++})`;
        params.push(roles);
      }

      // Status filter (multiple statuses)
      if (statuses.length > 0) {
        query += ` AND account_status = ANY($${paramIndex++})`;
        params.push(statuses);
      }

      // Date range filter
      if (dateFrom) {
        query += ` AND created_at >= $${paramIndex++}`;
        params.push(dateFrom);
      }
      if (dateTo) {
        query += ` AND created_at <= $${paramIndex++}`;
        params.push(dateTo);
      }

      // MFA filter
      if (mfaEnabled !== undefined) {
        query += ` AND mfa_enabled = $${paramIndex++}`;
        params.push(mfaEnabled);
      }

      // Get total count
      const countQuery = query.replace(
        'SELECT id, username, email, role, account_status AS status, phone, mfa_enabled, created_at, updated_at, last_login',
        'SELECT COUNT(*)'
      );
      const countResult = await dbManager.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Add sorting and pagination
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      params.push(limitNum, offset);

      const result = await dbManager.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        },
        filters: {
          searchTerm,
          roles,
          statuses,
          dateFrom,
          dateTo,
          mfaEnabled
        }
      });
    } catch (error) {
      console.error('Error in advanced search:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform advanced search',
        error: error.message
      });
    }
  }
);

/**
 * @route PUT /api/admin/users/:id
 * @desc Update a user
 * @access Private (Admin only)
 */
router.put('/users/:id', 
  authenticateToken, 
  requireRolePolicy('adminOnly'), 
  adminModificationLimit(), 
  validateUserUpdate(), 
  preventPrivilegeEscalation, 
  validate, 
  attachRequestAudit, 
  async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, status } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (username) {
      updates.push(`username = $${paramIndex++}`);
      params.push(username);
    }
    if (email) {
      updates.push(`email = $${paramIndex++}`);
      params.push(email);
    }
    if (role) {
      updates.push(`role = $${paramIndex++}`);
      params.push(role);
    }
    if (status) {
      updates.push(`account_status = $${paramIndex++}`);
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    updates.push(`updated_at = NOW()`);
    params.push(id);

    // Fix: Admin Update Isolation
    let whereClause = `WHERE id = $${paramIndex++}`;
    if (req.user.estate_id) {
      whereClause += ` AND estate_id = $${paramIndex++}`;
      params.push(req.user.estate_id);
    }

    const query = `UPDATE users SET ${updates.join(', ')} ${whereClause} RETURNING id, username, email, role, account_status AS status, updated_at`;
    const result = await dbManager.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/users/:id/sessions
 * @desc Get all active sessions for a user
 * @access Private (Admin only)
 */
router.get('/users/:id/sessions',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  adminQueryLimit(),
  validateIdParam(),
  validate,
  attachRequestAudit,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if user_sessions table exists
      const tableCheck = await dbManager.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'user_sessions'
        )`
      );

      if (!tableCheck.rows[0].exists) {
        return res.status(501).json({
          success: false,
          message: 'Session management not yet implemented. user_sessions table does not exist.'
        });
      }

      // Verify user belongs to admin's estate
      let userQuery = `SELECT id, username, email FROM users WHERE id = $1`;
      const userParams = [id];

      if (req.user.estate_id) {
        userQuery += ` AND estate_id = $2`;
        userParams.push(req.user.estate_id);
      }

      const userResult = await dbManager.query(userQuery, userParams);

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get active sessions
      const sessionsQuery = `
        SELECT 
          id, 
          user_id, 
          token_id, 
          ip_address, 
          user_agent, 
          created_at, 
          last_activity, 
          expires_at
        FROM user_sessions
        WHERE user_id = $1 
        AND expires_at > NOW()
        ORDER BY last_activity DESC
      `;
      const sessions = await dbManager.query(sessionsQuery, [id]);

      res.json({
        success: true,
        data: {
          user: userResult.rows[0],
          sessions: sessions.rows,
          count: sessions.rows.length
        }
      });
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sessions',
        error: error.message
      });
    }
  }
);

/**
 * @route DELETE /api/admin/users/:userId/sessions/:sessionId
 * @desc Revoke a specific user session
 * @access Private (Admin only)
 */
router.delete('/users/:userId/sessions/:sessionId',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  requireMFAForSensitiveOps,
  adminModificationLimit(),
  attachRequestAudit,
  async (req, res) => {
    try {
      const { userId, sessionId } = req.params;

      // Check if user_sessions table exists
      const tableCheck = await dbManager.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'user_sessions'
        )`
      );

      if (!tableCheck.rows[0].exists) {
        return res.status(501).json({
          success: false,
          message: 'Session management not yet implemented'
        });
      }

      // Verify user belongs to admin's estate
      let userQuery = `SELECT id FROM users WHERE id = $1`;
      const userParams = [userId];

      if (req.user.estate_id) {
        userQuery += ` AND estate_id = $2`;
        userParams.push(req.user.estate_id);
      }

      const userResult = await dbManager.query(userQuery, userParams);

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Delete the session
      const deleteQuery = `
        DELETE FROM user_sessions 
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;
      const result = await dbManager.query(deleteQuery, [sessionId, userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      res.json({
        success: true,
        message: 'Session revoked successfully'
      });
    } catch (error) {
      console.error('Error revoking session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to revoke session',
        error: error.message
      });
    }
  }
);

/**
 * @route DELETE /api/admin/users/:id/sessions
 * @desc Revoke all sessions for a user (force logout)
 * @access Private (Admin only)
 */
router.delete('/users/:id/sessions',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  requireMFAForSensitiveOps,
  adminModificationLimit(),
  validateIdParam(),
  validate,
  attachRequestAudit,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if user_sessions table exists
      const tableCheck = await dbManager.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'user_sessions'
        )`
      );

      if (!tableCheck.rows[0].exists) {
        return res.status(501).json({
          success: false,
          message: 'Session management not yet implemented'
        });
      }

      // Verify user belongs to admin's estate
      let userQuery = `SELECT id, username, email FROM users WHERE id = $1`;
      const userParams = [id];

      if (req.user.estate_id) {
        userQuery += ` AND estate_id = $2`;
        userParams.push(req.user.estate_id);
      }

      const userResult = await dbManager.query(userQuery, userParams);

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Prevent revoking own sessions (would lock out admin)
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot revoke your own sessions. Please use logout instead.'
        });
      }

      // Delete all sessions for the user
      const deleteQuery = `
        DELETE FROM user_sessions 
        WHERE user_id = $1
        RETURNING id
      `;
      const result = await dbManager.query(deleteQuery, [id]);

      res.json({
        success: true,
        message: `${result.rows.length} session(s) revoked successfully`,
        data: {
          revokedCount: result.rows.length,
          user: userResult.rows[0]
        }
      });
    } catch (error) {
      console.error('Error revoking sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to revoke sessions',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/admin/users/:id/reset-password
 * @desc Reset user password and send temporary password via email
 * @access Private (Admin only)
 */
router.post('/users/:id/reset-password',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  requireMFAForSensitiveOps,
  adminModificationLimit(),
  validateIdParam(),
  validate,
  attachRequestAudit,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { sendEmail = true } = req.body;

      // Verify user exists and belongs to admin's estate
      let userQuery = `SELECT id, username, email, role FROM users WHERE id = $1 AND account_status != 'deleted'`;
      const userParams = [id];

      if (req.user.estate_id) {
        userQuery += ` AND estate_id = $2`;
        userParams.push(req.user.estate_id);
      }

      const userResult = await dbManager.query(userQuery, userParams);

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = userResult.rows[0];

      // Generate temporary password (12 characters, alphanumeric + special chars)
      const crypto = require('crypto');
      const tempPassword = crypto.randomBytes(8).toString('base64').slice(0, 12);

      // Hash the temporary password
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Update user password and set force_password_change flag
      const updateQuery = `
        UPDATE users 
        SET password_hash = $1, 
            force_password_change = true,
            updated_at = NOW() 
        WHERE id = $2
        RETURNING id, username, email
      `;
      await dbManager.query(updateQuery, [hashedPassword, id]);

      // Send email with temporary password (if email service is configured)
      if (sendEmail) {
        try {
          // TODO: Integrate with email service
          // await emailService.sendPasswordReset(user.email, tempPassword);
          console.log(`Temporary password for ${user.email}: ${tempPassword}`);
        } catch (emailError) {
          console.error('Failed to send password reset email:', emailError);
        }
      }

      res.json({
        success: true,
        message: 'Password reset successfully',
        data: {
          userId: user.id,
          username: user.username,
          email: user.email,
          temporaryPassword: sendEmail ? undefined : tempPassword, // Only return if email not sent
          note: sendEmail 
            ? 'Temporary password sent to user email' 
            : 'Temporary password returned (email service not configured)'
        }
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password',
        error: error.message
      });
    }
  }
);

/**
 * @route DELETE /api/admin/users/:id
 * @desc Delete a user (soft delete by setting status to 'deleted')
 * @access Private (Admin only)
 */
router.delete('/users/:id', 
  authenticateToken, 
  requireRolePolicy('adminOnly'), 
  requireMFAForSensitiveOps,
  adminModificationLimit(), 
  validateIdParam(), 
  preventSelfDeletion, 
  validate, 
  attachRequestAudit, 
  async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting own account
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Soft delete - set status to 'deleted'
    // SECURITY: Filter by estate_id to prevent cross-estate deletion
    let query = `UPDATE users SET account_status = 'deleted', updated_at = NOW() WHERE id = $1 AND account_status != 'deleted'`;
    const params = [id];

    if (req.user.estate_id) {
      query += ` AND estate_id = $2`;
      params.push(req.user.estate_id);
    }
    query += ` RETURNING id`;

    const result = await dbManager.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or already deleted'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

// ==================== RESIDENTS MANAGEMENT ====================

/**
 * @route GET /api/admin/residents
 * @desc Get all residents
 * @access Private (Admin only)
 */
router.get('/residents', authenticateToken, requireRolePolicy('adminOnly'), minimizeData('user'), attachRequestAudit, async (req, res) => {
  try {
    // SECURITY: Filter by estate_id to prevent cross-estate access
    // Fix: Use account_status as the column name
    let query = `SELECT id, username, first_name, last_name, email, phone, unit_number, account_status as status, created_at 
       FROM users WHERE role = 'resident' AND account_status != 'deleted'`;
    const params = [];

    if (req.user.estate_id) {
      query += ` AND estate_id = $1`;
      params.push(req.user.estate_id);
    }
    query += ` ORDER BY created_at DESC`;

    const result = await dbManager.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching residents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch residents',
      error: error.message
    });
  }
});

/**
 * @route POST /api/admin/residents
 * @desc Create a new resident
 * @access Private (Admin only)
 */
router.post('/residents', 
  authenticateToken, 
  requireRolePolicy('adminOnly'), 
  adminModificationLimit(), 
  validateResidentCreation(), 
  validate, 
  attachRequestAudit, 
  async (req, res) => {
  try {
    const { username, first_name, last_name, email, password, phone, unit_number } = req.body;

    if (!username || !email || !password || !first_name || !last_name) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newUser = await userService.createUser({
      username,
      first_name,
      last_name,
      email,
      password,
      phone,
      role: 'resident',
      unit_number,
      status: 'active',
      estate_id: req.user.estate_id,
      account_status: 'active' // Admin created residents are immediately active
    });

    // Send Welcome Email
    try {
      const { default: emailService } = await import('../services/emailService.js');
      await emailService.sendWelcomeEmail(email, username, password);
    } catch (emailErr) {
      console.error('Failed to send welcome email to resident:', emailErr);
    }

    res.status(201).json({ success: true, data: newUser });
  } catch (error) {
    // Check for duplicate
    if (error.code === 'DUPLICATE_ENTRY') {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create resident', error: error.message });
  }
});

/**
 * @route PUT /api/admin/residents/:id
 * @desc Update a resident
 * @access Private (Admin only)
 */
router.put('/residents/:id', authenticateToken, requireRolePolicy('adminOnly'), attachRequestAudit, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, first_name, last_name, email, phone, unit_number, status } = req.body;

    // SECURITY: Filter by estate_id to prevent cross-estate modification
    // FIX: Use account_status column (status was renamed in migration 048)
    let query = `UPDATE users SET
      username = COALESCE($1, username),
      first_name = COALESCE($2, first_name),
      last_name = COALESCE($3, last_name),
      email = COALESCE($4, email),
      phone = COALESCE($5, phone),
      unit_number = COALESCE($6, unit_number),
      account_status = COALESCE($7, account_status),
      updated_at = NOW()
     WHERE id = $8 AND role = 'resident'`;
    const params = [username, first_name, last_name, email, phone, unit_number, status, id];

    if (req.user.estate_id) {
      query += ` AND estate_id = $9`;
      params.push(req.user.estate_id);
    }
    // FIX: Alias account_status AS status for UI compatibility
    query += ` RETURNING id, username, first_name, last_name, email, phone, unit_number, account_status AS status`;

    const result = await dbManager.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Resident not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update resident', error: error.message });
  }
});

/**
 * @route DELETE /api/admin/residents/:id
 * @desc Delete a resident
 * @access Private (Admin only)
 */
router.delete('/residents/:id', authenticateToken, requireRolePolicy('adminOnly'), attachRequestAudit, async (req, res) => {
  try {
    const { id } = req.params;

    // SECURITY: Filter by estate_id to prevent cross-estate deletion
    // FIX: Use account_status column (status was renamed in migration 048)
    let query = `UPDATE users SET account_status = 'deleted', updated_at = NOW()
       WHERE id = $1 AND role = 'resident' AND account_status != 'deleted'`;
    const params = [id];

    if (req.user.estate_id) {
      query += ` AND estate_id = $2`;
      params.push(req.user.estate_id);
    }
    query += ` RETURNING id`;

    const result = await dbManager.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Resident not found' });
    }

    res.json({ success: true, message: 'Resident deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete resident', error: error.message });
  }
});









// ==================== VISITOR LOGS ====================

/**
 * @route GET /api/admin/visitors
 * @desc Get visitor logs with filtering
 * @access Private (Admin only)
 */
router.get('/visitors', authenticateToken, requireRolePolicy('adminOnly'), adminQueryLimit(), minimizeData('visitor'), attachRequestAudit, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    // Fix A-004: Pagination Input Validation
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20)); // Cap limit at 100
    const offset = (pageNum - 1) * limitNum;

    // PHASE 1 SECURITY FIX: Add estate scoping to prevent cross-estate data leakage
    let query = `SELECT v.*, v.check_in_time AS check_in, v.check_out_time AS check_out, u.username as host_name 
                 FROM visitors v 
                 LEFT JOIN users u ON v.created_by = u.email 
                 WHERE v.estate_id = $1`;
    const params = [req.user.estate_id];
    let paramIndex = 2;

    if (status) {
      query += ` AND v.status = $${paramIndex++}`;
      params.push(status);
    }
    if (search) {
      query += ` AND (v.name ILIKE $${paramIndex} OR v.phone ILIKE $${paramIndex} OR v.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY v.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limitNum, offset);

    const result = await dbManager.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching visitor logs:', error);
    respondError(res, 500, 'Failed to fetch visitor logs', error);
  }
});

// ==================== ACCESS LOGS ====================

/**
 * @route GET /api/admin/access-logs
 * @desc Get access logs
 * @access Private (Admin only)
 */
router.get('/access-logs', authenticateToken, requireRolePolicy('adminOnly'), minimizeData('access'), attachRequestAudit, async (req, res) => {
  try {
    const { type, search, page = 1, limit = 50 } = req.query;
    // Fix A-004: Pagination Input Validation
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50)); // Cap limit at 100
    const offset = (pageNum - 1) * limitNum;

    // Check if access_logs table exists, if not return empty
    const tableCheck = await dbManager.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'access_logs')`
    );

    if (!tableCheck.rows[0].exists) {
      return res.json({
        success: true,
        data: [],
        message: 'Access logs table not configured'
      });
    }

    // Securely query access logs with estate scoping via User table
    // Since access_logs table doesn't have estate_id directly, we infer it from user_id
    let query = `
      SELECT a.*, u.username as user_name, u.role as user_role
      FROM access_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (req.user.estate_id) {
      query += ` AND u.estate_id = $${paramIndex++}`;
      params.push(req.user.estate_id);
    }

    if (type) {
      query += ` AND a.action = $${paramIndex++}`;
      params.push(type);
    }

    if (search) {
      query += ` AND (u.username ILIKE $${paramIndex} OR a.action ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limitNum, offset);

    const result = await dbManager.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching access logs:', error);
    respondError(res, 500, 'Failed to fetch access logs', error);
  }
});

// ==================== INCIDENTS ====================

/**
 * @route GET /api/admin/incidents-list
 * @desc Get incidents list
 * @access Private (Admin only)
 */
router.get('/incidents-list', authenticateToken, requireRolePolicy('adminOnly'), adminQueryLimit(), attachRequestAudit, async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 20 } = req.query;
    // Fix A-004: Pagination Input Validation
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20)); // Cap limit at 100
    const offset = (pageNum - 1) * limitNum;

    // Check if incidents table exists
    const tableCheck = await dbManager.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'incidents')`
    );

    if (!tableCheck.rows[0].exists) {
      return res.json({
        success: true,
        data: [],
        message: 'Incidents table not configured'
      });
    }

    // PHASE 1 SECURITY FIX: Add estate scoping to prevent cross-estate incident visibility
    let query = 'SELECT * FROM incidents WHERE estate_id = $1';
    const params = [req.user.estate_id];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (priority) {
      query += ` AND priority = $${paramIndex++}`;
      params.push(priority);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limitNum, offset);

    const result = await dbManager.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching incidents:', error);
    respondError(res, 500, 'Failed to fetch incidents', error);
  }
});

// ==================== DATA RETENTION MANAGEMENT ====================

/**
 * @route GET /api/admin/retention-settings
 * @desc Get data retention settings
 * @access Private (Admin only)
 */
router.get('/retention-settings', authenticateToken, requireRolePolicy('adminOnly'), attachRequestAudit, async (req, res) => {
  try {
    const settings = await retentionService.getRetentionSettings();

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching retention settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch retention settings',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/admin/retention-settings
 * @desc Update data retention settings
 * @access Private (Admin only)
 */
router.put('/retention-settings', authenticateToken, requireRolePolicy('adminOnly'), requireMFAForSensitiveOps, attachRequestAudit, async (req, res) => {
  try {
    const { id, type, duration } = req.body;

    const result = await retentionService.updateRetentionSetting(id, type, duration);

    res.json({
      success: true,
      message: 'Retention setting updated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error updating retention setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update retention setting',
      error: error.message
    });
  }
});

/**
 * @route POST /api/admin/retention/trigger
 * @desc Trigger data retention policy
 * @access Private (Admin only)
 */
router.post('/retention/trigger', authenticateToken, requireRolePolicy('adminOnly'), requireMFAForSensitiveOps, attachRequestAudit, async (req, res) => {
  try {
    // Trigger retention policy immediately
    await retentionService.triggerRetentionPolicy();

    res.json({
      success: true,
      message: 'Data retention policy triggered successfully'
    });
  } catch (error) {
    console.error('Error triggering retention policy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger retention policy',
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/retention/logs
 * @desc Get retention logs
 * @access Private (Admin only)
 */
router.get('/retention/logs', authenticateToken, requireRolePolicy('adminOnly'), requireMFAForSensitiveOps, adminQueryLimit(), attachRequestAudit, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // PHASE 1 SECURITY FIX: Add estate scoping to retention logs
    // Check if retention_logs has estate_id column
    const columnCheck = await dbManager.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'retention_logs' AND column_name = 'estate_id'`
    );

    let query;
    let params;

    if (columnCheck.rowCount > 0) {
      // Table has estate_id column - filter by it
      query = `SELECT * FROM retention_logs 
               WHERE estate_id = $1 
               ORDER BY timestamp DESC LIMIT $2 OFFSET $3`;
      params = [req.user.estate_id, limit, offset];
    } else {
      // Fallback: No estate_id column yet (needs migration)
      // For now, show all logs but log a warning
      console.warn('⚠️ retention_logs table missing estate_id column - estate scoping not enforced');
      query = `SELECT * FROM retention_logs ORDER BY timestamp DESC LIMIT $1 OFFSET $2`;
      params = [limit, offset];
    }

    const result = await dbManager.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching retention logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch retention logs',
      error: error.message
    });
  }
});

// ==================== DATA RETENTION ENDPOINTS ====================

/**
 * @swagger
 * /api/admin/retention/stats:
 *   get:
 *     summary: Get data retention statistics
 *     description: Retrieve current retention statistics including archived records count
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/retention/stats', authenticateToken, requireRolePolicy('adminOnly'), async (req, res) => {
  try {
    const stats = await retentionService.getRetentionStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching retention stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch retention statistics',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/admin/retention/run:
 *   post:
 *     summary: Manually trigger data retention job
 *     description: Run the data retention job immediately (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Retention job completed successfully
 */
router.post('/retention/run', authenticateToken, requireRolePolicy('adminOnly'), requireMFAForSensitiveOps, attachRequestAudit, async (req, res) => {
  try {
    const results = await retentionService.runRetentionJob();

    res.json({
      success: true,
      message: 'Retention job completed',
      data: results
    });
  } catch (error) {
    console.error('Error running retention job:', error);
    res.status(500).json({
      success: false,
      message: 'Retention job failed',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/admin/retention/scheduler/status:
 *   get:
 *     summary: Get retention scheduler status
 *     description: Check if the retention scheduler is running
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scheduler status retrieved
 */
router.get('/retention/scheduler/status', authenticateToken, requireRolePolicy('adminOnly'), async (req, res) => {
  try {
    const status = retentionScheduler.getStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error fetching scheduler status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduler status',
      error: error.message
    });
  }
});

// ==================== ACTIVITY DASHBOARD & ANALYTICS ====================

/**
 * @route GET /api/admin/activity/feed
 * @desc Get recent activity feed (real-time events)
 * @access Private (Admin only)
 */
router.get('/activity/feed',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  adminQueryLimit(),
  attachRequestAudit,
  async (req, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const limitNum = Math.min(parseInt(limit) || 50, 100);
      const offsetNum = parseInt(offset) || 0;

      // Get recent audit logs as activity feed
      let query = `
        SELECT 
          al.id,
          al.action,
          al.resource,
          al.message,
          al.outcome,
          al.timestamp,
          al.ip_address,
          u.username,
          u.role
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      // Estate scoping
      if (req.user.estate_id) {
        query += ` AND al.estate_id = $${paramIndex++}`;
        params.push(req.user.estate_id);
      }

      query += ` ORDER BY al.timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      params.push(limitNum, offsetNum);

      const result = await dbManager.query(query, params);

      // Get total count
      let countQuery = `SELECT COUNT(*) FROM audit_logs WHERE 1=1`;
      const countParams = [];
      if (req.user.estate_id) {
        countQuery += ` AND estate_id = $1`;
        countParams.push(req.user.estate_id);
      }
      const countResult = await dbManager.query(countQuery, countParams);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: parseInt(countResult.rows[0].count)
        }
      });
    } catch (error) {
      console.error('Error fetching activity feed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch activity feed',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/admin/activity/trends
 * @desc Get activity trends and statistics
 * @access Private (Admin only)
 */
router.get('/activity/trends',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  adminQueryLimit(),
  attachRequestAudit,
  async (req, res) => {
    try {
      const { period = '7d' } = req.query; // 7d, 30d, 90d
      
      // Calculate date range
      let days = 7;
      if (period === '30d') days = 30;
      if (period === '90d') days = 90;
      
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      // Estate scoping
      const estateFilter = req.user.estate_id ? `AND estate_id = $2` : '';
      const params = [dateFrom];
      if (req.user.estate_id) {
        params.push(req.user.estate_id);
      }

      // Get daily activity counts
      const dailyActivity = await dbManager.query(
        `SELECT 
          DATE(timestamp) as date,
          COUNT(*) as count
        FROM audit_logs
        WHERE timestamp >= $1 ${estateFilter}
        GROUP BY DATE(timestamp)
        ORDER BY date ASC`,
        params
      );

      // Get activity by action type
      const actionBreakdown = await dbManager.query(
        `SELECT 
          action,
          COUNT(*) as count
        FROM audit_logs
        WHERE timestamp >= $1 ${estateFilter}
        GROUP BY action
        ORDER BY count DESC
        LIMIT 10`,
        params
      );

      // Get most active users
      const activeUsers = await dbManager.query(
        `SELECT 
          u.username,
          u.role,
          COUNT(al.id) as activity_count
        FROM audit_logs al
        JOIN users u ON al.user_id = u.id
        WHERE al.timestamp >= $1 ${estateFilter}
        GROUP BY u.id, u.username, u.role
        ORDER BY activity_count DESC
        LIMIT 10`,
        params
      );

      // Get visitor trends (if visitors table exists)
      let visitorTrends = [];
      try {
        const visitorQuery = req.user.estate_id 
          ? `SELECT DATE(created_at) as date, COUNT(*) as count
             FROM visitors
             WHERE created_at >= $1 AND estate_id = $2
             GROUP BY DATE(created_at)
             ORDER BY date ASC`
          : `SELECT DATE(created_at) as date, COUNT(*) as count
             FROM visitors
             WHERE created_at >= $1
             GROUP BY DATE(created_at)
             ORDER BY date ASC`;
        
        const visitorResult = await dbManager.query(visitorQuery, params);
        visitorTrends = visitorResult.rows;
      } catch (err) {
        console.log('Visitors table not available for trends');
      }

      res.json({
        success: true,
        data: {
          period,
          dailyActivity: dailyActivity.rows,
          actionBreakdown: actionBreakdown.rows,
          activeUsers: activeUsers.rows,
          visitorTrends
        }
      });
    } catch (error) {
      console.error('Error fetching activity trends:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch activity trends',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/admin/activity/anomalies
 * @desc Detect anomalies in activity patterns
 * @access Private (Admin only)
 */
router.get('/activity/anomalies',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  adminQueryLimit(),
  attachRequestAudit,
  async (req, res) => {
    try {
      const anomalies = [];
      const estateFilter = req.user.estate_id ? `AND estate_id = $1` : '';
      const params = req.user.estate_id ? [req.user.estate_id] : [];

      // Check for unusual login failures (more than 5 in last hour)
      const failedLogins = await dbManager.query(
        `SELECT COUNT(*) as count
         FROM audit_logs
         WHERE action = 'user.login.failed'
         AND timestamp > NOW() - INTERVAL '1 hour'
         ${estateFilter}`,
        params
      );

      if (parseInt(failedLogins.rows[0].count) > 5) {
        anomalies.push({
          type: 'failed_logins',
          severity: 'high',
          message: `${failedLogins.rows[0].count} failed login attempts in the last hour`,
          count: parseInt(failedLogins.rows[0].count),
          timestamp: new Date()
        });
      }

      // Check for unusual visitor volume (more than 2x average)
      try {
        const avgVisitors = await dbManager.query(
          `SELECT AVG(daily_count) as avg_count
           FROM (
             SELECT DATE(created_at) as date, COUNT(*) as daily_count
             FROM visitors
             WHERE created_at > NOW() - INTERVAL '30 days'
             ${estateFilter}
             GROUP BY DATE(created_at)
           ) daily_visitors`,
          params
        );

        const todayVisitors = await dbManager.query(
          `SELECT COUNT(*) as count
           FROM visitors
           WHERE DATE(created_at) = CURRENT_DATE
           ${estateFilter}`,
          params
        );

        const avgCount = parseFloat(avgVisitors.rows[0]?.avg_count || 0);
        const todayCount = parseInt(todayVisitors.rows[0]?.count || 0);

        if (todayCount > avgCount * 2 && avgCount > 0) {
          anomalies.push({
            type: 'unusual_visitor_volume',
            severity: 'medium',
            message: `Today's visitor count (${todayCount}) is ${Math.round(todayCount / avgCount)}x higher than the 30-day average (${Math.round(avgCount)})`,
            todayCount,
            averageCount: Math.round(avgCount),
            timestamp: new Date()
          });
        }
      } catch (err) {
        console.log('Visitors table not available for anomaly detection');
      }

      // Check for after-hours activity (10 PM - 6 AM)
      const afterHoursActivity = await dbManager.query(
        `SELECT COUNT(*) as count
         FROM audit_logs
         WHERE DATE(timestamp) = CURRENT_DATE
         AND EXTRACT(HOUR FROM timestamp) NOT BETWEEN 6 AND 22
         ${estateFilter}`,
        params
      );

      if (parseInt(afterHoursActivity.rows[0].count) > 10) {
        anomalies.push({
          type: 'after_hours_activity',
          severity: 'low',
          message: `${afterHoursActivity.rows[0].count} activities detected outside normal hours (10 PM - 6 AM)`,
          count: parseInt(afterHoursActivity.rows[0].count),
          timestamp: new Date()
        });
      }

      res.json({
        success: true,
        data: {
          anomalies,
          count: anomalies.length,
          checkedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to detect anomalies',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/admin/activity/summary
 * @desc Get activity summary for dashboard
 * @access Private (Admin only)
 */
router.get('/activity/summary',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  adminQueryLimit(),
  attachRequestAudit,
  async (req, res) => {
    try {
      const estateFilter = req.user.estate_id ? `AND estate_id = $1` : '';
      const params = req.user.estate_id ? [req.user.estate_id] : [];

      // Activity in last 24 hours
      const last24h = await dbManager.query(
        `SELECT COUNT(*) as count
         FROM audit_logs
         WHERE timestamp > NOW() - INTERVAL '24 hours'
         ${estateFilter}`,
        params
      );

      // Activity in last 7 days
      const last7d = await dbManager.query(
        `SELECT COUNT(*) as count
         FROM audit_logs
         WHERE timestamp > NOW() - INTERVAL '7 days'
         ${estateFilter}`,
        params
      );

      // Pending approvals
      const pendingUsers = await dbManager.query(
        `SELECT COUNT(*) as count
         FROM users
         WHERE account_status = 'pending'
         ${req.user.estate_id ? 'AND estate_id = $1' : ''}`,
        params
      );

      // Active sessions (approximate based on recent activity)
      const activeSessions = await dbManager.query(
        `SELECT COUNT(DISTINCT user_id) as count
         FROM audit_logs
         WHERE timestamp > NOW() - INTERVAL '30 minutes'
         ${estateFilter}`,
        params
      );

      // Visitors today
      let visitorsToday = 0;
      try {
        const visitorResult = await dbManager.query(
          `SELECT COUNT(*) as count
           FROM visitors
           WHERE DATE(created_at) = CURRENT_DATE
           ${estateFilter}`,
          params
        );
        visitorsToday = parseInt(visitorResult.rows[0].count);
      } catch (err) {
        console.log('Visitors table not available');
      }

      res.json({
        success: true,
        data: {
          last24h: parseInt(last24h.rows[0].count),
          last7d: parseInt(last7d.rows[0].count),
          pendingApprovals: parseInt(pendingUsers.rows[0].count),
          activeSessions: parseInt(activeSessions.rows[0].count),
          visitorsToday,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Error fetching activity summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch activity summary',
        error: error.message
      });
    }
  }
);

// ==================== NOTIFICATION PREFERENCES ====================

/**
 * @route GET /api/admin/notification-preferences
 * @desc Get current user's notification preferences
 * @access Private (Admin only)
 */
router.get('/notification-preferences',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  adminQueryLimit(),
  attachRequestAudit,
  async (req, res) => {
    try {
      // Check if table exists
      const tableCheck = await dbManager.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'admin_notification_preferences'
        )`
      );

      if (!tableCheck.rows[0].exists) {
        return res.status(501).json({
          success: false,
          message: 'Notification preferences not yet implemented. Please run migration 007_admin_notification_preferences.sql'
        });
      }

      // Get user's preferences
      const result = await dbManager.query(
        `SELECT 
          id, event_type, notify_email, notify_sms, notify_in_app, frequency, updated_at
        FROM admin_notification_preferences
        WHERE user_id = $1
        ORDER BY event_type`,
        [req.user.id]
      );

      // If no preferences exist, create default ones
      if (result.rows.length === 0) {
        const defaultEvents = [
          'pending_approval',
          'emergency_alert',
          'guard_late',
          'visitor_checkin',
          'incident_reported',
          'backup_completed',
          'retention_completed',
          'compliance_alert',
          'system_alert'
        ];

        const insertPromises = defaultEvents.map(event => {
          const notifyEmail = ['emergency_alert', 'compliance_alert', 'system_alert'].includes(event);
          const notifySms = event === 'emergency_alert';
          const frequency = ['emergency_alert', 'incident_reported'].includes(event) ? 'instant' : 'daily';

          return dbManager.query(
            `INSERT INTO admin_notification_preferences 
             (user_id, event_type, notify_email, notify_sms, notify_in_app, frequency)
             VALUES ($1, $2, $3, $4, true, $5)
             RETURNING *`,
            [req.user.id, event, notifyEmail, notifySms, frequency]
          );
        });

        const insertedResults = await Promise.all(insertPromises);
        const preferences = insertedResults.map(r => r.rows[0]);

        return res.json({
          success: true,
          data: preferences,
          message: 'Default preferences created'
        });
      }

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notification preferences',
        error: error.message
      });
    }
  }
);

/**
 * @route PUT /api/admin/notification-preferences/:id
 * @desc Update a notification preference
 * @access Private (Admin only)
 */
router.put('/notification-preferences/:id',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  adminModificationLimit(),
  attachRequestAudit,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { notify_email, notify_sms, notify_in_app, frequency } = req.body;

      // Validate frequency
      const validFrequencies = ['instant', 'hourly', 'daily', 'weekly', 'disabled'];
      if (frequency && !validFrequencies.includes(frequency)) {
        return res.status(400).json({
          success: false,
          message: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`
        });
      }

      // Build update query
      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (notify_email !== undefined) {
        updates.push(`notify_email = $${paramIndex++}`);
        params.push(notify_email);
      }
      if (notify_sms !== undefined) {
        updates.push(`notify_sms = $${paramIndex++}`);
        params.push(notify_sms);
      }
      if (notify_in_app !== undefined) {
        updates.push(`notify_in_app = $${paramIndex++}`);
        params.push(notify_in_app);
      }
      if (frequency) {
        updates.push(`frequency = $${paramIndex++}`);
        params.push(frequency);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }

      updates.push(`updated_at = NOW()`);

      // Ensure user can only update their own preferences
      const query = `
        UPDATE admin_notification_preferences 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;
      params.push(id, req.user.id);

      const result = await dbManager.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Notification preference not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification preference updated',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating notification preference:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification preference',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/admin/notification-preferences/bulk-update
 * @desc Update multiple notification preferences at once
 * @access Private (Admin only)
 */
router.post('/notification-preferences/bulk-update',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  adminModificationLimit(),
  attachRequestAudit,
  async (req, res) => {
    try {
      const { preferences } = req.body;

      if (!Array.isArray(preferences) || preferences.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'preferences must be a non-empty array'
        });
      }

      if (preferences.length > 20) {
        return res.status(400).json({
          success: false,
          message: 'Cannot update more than 20 preferences at once'
        });
      }

      const updatePromises = preferences.map(pref => {
        const { id, notify_email, notify_sms, notify_in_app, frequency } = pref;

        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (notify_email !== undefined) {
          updates.push(`notify_email = $${paramIndex++}`);
          params.push(notify_email);
        }
        if (notify_sms !== undefined) {
          updates.push(`notify_sms = $${paramIndex++}`);
          params.push(notify_sms);
        }
        if (notify_in_app !== undefined) {
          updates.push(`notify_in_app = $${paramIndex++}`);
          params.push(notify_in_app);
        }
        if (frequency) {
          updates.push(`frequency = $${paramIndex++}`);
          params.push(frequency);
        }

        if (updates.length === 0) return null;

        updates.push(`updated_at = NOW()`);

        const query = `
          UPDATE admin_notification_preferences 
          SET ${updates.join(', ')}
          WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
          RETURNING *
        `;
        params.push(id, req.user.id);

        return dbManager.query(query, params);
      });

      const results = await Promise.all(updatePromises.filter(p => p !== null));
      const updated = results.filter(r => r.rows.length > 0).map(r => r.rows[0]);

      res.json({
        success: true,
        message: `${updated.length} preference(s) updated`,
        data: updated
      });
    } catch (error) {
      console.error('Error in bulk update:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update preferences',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/admin/retention/stats
 * @desc Get data retention statistics
 * @access Private (Admin only)
 */
router.get('/retention/stats', authenticateToken, requireRolePolicy('adminOnly'), async (req, res) => {
  try {
    const stats = await retentionService.getRetentionStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching retention stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch retention statistics',
      error: error.message
    });
  }
});

/**
 * @route POST /api/admin/retention/run
 * @desc Manually trigger data retention job
 * @access Private (Admin only)
 */
router.post('/retention/run', authenticateToken, requireRolePolicy('adminOnly'), requireMFAForSensitiveOps, attachRequestAudit, async (req, res) => {
  try {
    const results = await retentionService.runRetentionJob();

    res.json({
      success: true,
      message: 'Retention job completed',
      data: results
    });
  } catch (error) {
    console.error('Error running retention job:', error);
    res.status(500).json({
      success: false,
      message: 'Retention job failed',
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/retention/scheduler/status
 * @desc Get retention scheduler status
 * @access Private (Admin only)
 */
router.get('/retention/scheduler/status', authenticateToken, requireRolePolicy('adminOnly'), async (req, res) => {
  try {
    const status = retentionScheduler.getStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error fetching scheduler status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduler status',
      error: error.message
    });
  }
});

export default router;
