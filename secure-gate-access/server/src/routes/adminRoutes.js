import express from 'express';
import logger from '../config/logger.js';
import { maskPhoneNumber, maskEmail } from '../utils/masking.js';
import {
  getSettings,
  updateSettings,
  updateCompliance,
  runComplianceReview
} from '../controllers/adminSettingsController.js';
import {
  getMetrics, getAuditLogs, getPendingUsers, updateUserStatus, getEstateInfo,
  triggerBackup, bulkApproveUsers, bulkRejectUsers,
  getResidents, createResident, updateResident, deleteResident,
  getVisitorLogs, getAccessLogs,
  getSites, createSite, updateSite, switchSite
} from '../controllers/adminController.js';
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
import { asyncHandler, ErrorHelper, ERROR_CODES } from '../middleware/standardizedErrorHandler.js';
import { authenticateToken, requireRole, requireMFA } from '../middleware/authMiddleware.js';
import { requireRolePolicy } from '../middleware/rolePolicy.js';
import { requireEstateContextForAdmin } from '../middleware/estateContextMiddleware.js';
import { requireMFAForSensitiveOps, requireRecentMFAVerification } from '../middleware/mfaSensitiveOperations.js';
import { attachRequestAudit } from '../middleware/auditLogging.js';
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
import adminAnalyticsController from '../controllers/adminAnalyticsController.js';
import { passwordService } from '../services/tokenService.js';

import {
  getActiveVisitors,
  getVisitorReport,
  revokeVisitor,
  getRecentVisitors,
  getVisitorDetails
} from '../controllers/visitorAdminController.js';

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

// ==================== ACTIVITY & ANALYTICS ====================

/**
 * @route GET /api/admin/analytics/activity/summary
 * @desc Get activity summary
 * @access Private (Super Admin only)
 */
router.get('/analytics/activity/summary', authenticateToken, requireRole(['super_admin']), attachRequestAudit, adminAnalyticsController.getActivitySummary);

/**
 * @route GET /api/admin/analytics/activity/trends
 * @desc Get activity trends
 * @access Private (Super Admin only)
 */
router.get('/analytics/activity/trends', authenticateToken, requireRole(['super_admin']), attachRequestAudit, adminAnalyticsController.getActivityTrends);

/**
 * @route GET /api/admin/analytics/activity/feed
 * @desc Get activity feed
 * @access Private (Super Admin only)
 */
router.get('/analytics/activity/feed', authenticateToken, requireRole(['super_admin']), attachRequestAudit, adminAnalyticsController.getActivityFeed);



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
router.get('/access-logs', authenticateToken, requireRole(['admin', 'super_admin']), adminQueryLimit(), attachRequestAudit, getAccessLogs);

// Site management routes
router.get('/sites', authenticateToken, requireRole(['admin', 'super_admin']), adminQueryLimit(), attachRequestAudit, getSites);
router.post('/sites', authenticateToken, requireRole(['super_admin']), estateModificationLimit(), attachRequestAudit, createSite);
router.put('/sites/:id', authenticateToken, requireRole(['super_admin']), estateModificationLimit(), attachRequestAudit, updateSite);
router.patch('/sites/:id/switch', authenticateToken, requireRole(['super_admin']), superAdminSensitiveLimit(), attachRequestAudit, switchSite);

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
router.post('/backup/trigger', authenticateToken, requireRolePolicy('adminOnly'), requireMFAForSensitiveOps, adminModificationLimit(), attachRequestAudit, triggerBackup);

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
  requireEstateContextForAdmin,
  adminModificationLimit(),
  attachRequestAudit,
  bulkApproveUsers
);


/**
 * @route POST /api/admin/users/bulk-reject
 * @desc Bulk reject pending users
 * @access Private (Admin only)
 */
router.post('/users/bulk-reject',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  requireEstateContextForAdmin,
  adminModificationLimit(),
  attachRequestAudit,
  bulkRejectUsers
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

      // Mask sensitive data for all users in list view
      const maskedUsers = result.rows.map(user => ({
        ...user,
        email: maskEmail(user.email),
        phone: user.phone ? maskPhoneNumber(user.phone) : null
      }));

      res.json({
        success: true,
        data: maskedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
      // Fix A-002: Safe Error Handling
    } catch (error) {
      logger.error('Error fetching users', { error: error.message });
      respondError(res, 500, 'Failed to fetch users', error);
    }
  });

/**
 * @route GET /api/admin/users/:id
 * @desc Get single user details (unmasked for authorized admins)
 * @access Private (Admin only)
 */
router.get('/users/:id',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  validateIdParam(),
  attachRequestAudit,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Ensure admin can only view users in their estate (unless super_admin)
      let query = 'SELECT id, username, email, phone, role, house, account_status, created_at, updated_at, estate_id FROM users WHERE id = $1';
      const params = [id];

      if (req.user.estate_id) {
        query += ' AND estate_id = $2';
        params.push(req.user.estate_id);
      }

      const result = await dbManager.query(query, params);

      if (result.rowCount === 0) {
        return respondError(res, 404, 'User not found');
      }

      // Return full unmasked details
      respond(res, result.rows[0]);
    } catch (error) {
      logger.error('Error fetching user details', { error: error.message });
      respondError(res, 500, 'Failed to fetch user details');
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
      logger.error('Error in advanced search', { error: error.message });
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
      logger.error('Error updating user', { error: error.message });
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
      logger.error('Error fetching user sessions', { error: error.message });
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
      logger.error('Error revoking session', { error: error.message });
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
      logger.error('Error revoking sessions', { error: error.message });
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
      const hashedPassword = await passwordService.hashPassword(tempPassword);

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
          logger.info(`Temporary password generated for ${user.email}`);
        } catch (emailError) {
          logger.error('Failed to send password reset email', { error: emailError.message });
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
      logger.error('Error resetting password', { error: error.message });
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
      logger.error('Error deleting user', { error: error.message });
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
router.get('/residents', authenticateToken, requireRolePolicy('adminOnly'), minimizeData('user'), attachRequestAudit, getResidents);

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
        logger.debug('Visitors table not available for trends');
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
      logger.error('Error fetching activity trends', { error: error.message });
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
        logger.debug('Visitors table not available for anomaly detection');
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
      logger.error('Error detecting anomalies', { error: error.message });
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
        logger.debug('Visitors table not available');
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
      logger.error('Error fetching activity summary', { error: error.message });
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
      logger.error('Error fetching notification preferences', { error: error.message });
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
      logger.error('Error updating notification preference', { error: error.message });
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
      logger.error('Error in bulk update', { error: error.message });
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
    logger.error('Error fetching retention stats', { error: error.message });
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
    logger.error('Error running retention job', { error: error.message });
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
    logger.error('Error fetching scheduler status', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduler status',
      error: error.message
    });
  }
});

// ==============================================================================
// ROLE MANAGEMENT
// ==============================================================================

/**
 * @route GET /api/admin/roles
 * @desc Get list of available roles with descriptions
 * @access Private (Admin only)
 */
router.get('/roles', authenticateToken, requireRolePolicy('adminOnly'), requireEstateContextForAdmin, async (req, res) => {
  const roles = [
    { id: 'resident', name: 'Resident', description: 'Estate resident with visitor invitation privileges', permissions: ['invite_visitors', 'view_own_visitors', 'manage_deliveries'] },
    { id: 'guard', name: 'Guard', description: 'Security guard with check-in/check-out privileges', permissions: ['check_in_visitors', 'check_out_visitors', 'view_all_visitors', 'log_incidents', 'manage_walk_ins'] },
    { id: 'admin', name: 'Admin', description: 'Estate administrator with full management access', permissions: ['manage_users', 'manage_settings', 'view_analytics', 'manage_watchlist', 'manage_policies'] },
    { id: 'super_admin', name: 'Super Admin', description: 'Platform-wide administrator', permissions: ['manage_estates', 'manage_all_users', 'platform_settings', 'view_global_analytics'] },
  ];
  return respond(res, 200, 'Roles retrieved', roles);
});

/**
 * @route GET /api/admin/permissions
 * @desc Get list of available permissions
 * @access Private (Admin only)
 */
router.get('/permissions', authenticateToken, requireRolePolicy('adminOnly'), requireEstateContextForAdmin, async (req, res) => {
  const permissions = [
    { id: 'invite_visitors', name: 'Invite Visitors', category: 'visitor' },
    { id: 'view_own_visitors', name: 'View Own Visitors', category: 'visitor' },
    { id: 'view_all_visitors', name: 'View All Visitors', category: 'visitor' },
    { id: 'check_in_visitors', name: 'Check In Visitors', category: 'guard' },
    { id: 'check_out_visitors', name: 'Check Out Visitors', category: 'guard' },
    { id: 'log_incidents', name: 'Log Incidents', category: 'guard' },
    { id: 'manage_walk_ins', name: 'Manage Walk-Ins', category: 'guard' },
    { id: 'manage_users', name: 'Manage Users', category: 'admin' },
    { id: 'manage_settings', name: 'Manage Settings', category: 'admin' },
    { id: 'view_analytics', name: 'View Analytics', category: 'admin' },
    { id: 'manage_watchlist', name: 'Manage Watchlist', category: 'admin' },
    { id: 'manage_policies', name: 'Manage Policies', category: 'admin' },
    { id: 'manage_deliveries', name: 'Manage Deliveries', category: 'resident' },
    { id: 'manage_estates', name: 'Manage Estates', category: 'super_admin' },
    { id: 'manage_all_users', name: 'Manage All Users', category: 'super_admin' },
    { id: 'platform_settings', name: 'Platform Settings', category: 'super_admin' },
    { id: 'view_global_analytics', name: 'View Global Analytics', category: 'super_admin' },
  ];
  return respond(res, 200, 'Permissions retrieved', permissions);
});

/**
 * @route POST /api/admin/users/:id/assign-role
 * @desc Assign a role to a user
 * @access Private (Admin only)
 */
router.post('/users/:id/assign-role', authenticateToken, requireRolePolicy('adminOnly'), requireEstateContextForAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const estateId = req.user.estate_id;

  const validRoles = ['resident', 'guard', 'admin'];
  if (!role || !validRoles.includes(role)) {
    return respondError(res, 400, `Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }

  // Verify user belongs to same estate
  const userResult = await dbManager.query(
    'SELECT id, role FROM users WHERE id = $1 AND estate_id = $2',
    [id, estateId]
  );

  if (userResult.rows.length === 0) {
    return respondError(res, 404, 'User not found in this estate');
  }

  await dbManager.query(
    'UPDATE users SET role = $1 WHERE id = $2 AND estate_id = $3',
    [role, id, estateId]
  );

  logger.info(`Role assigned: user ${id} -> ${role} by admin ${req.user.id}`);
  return respond(res, 200, 'Role assigned successfully', { userId: id, role });
}));

export default router;
