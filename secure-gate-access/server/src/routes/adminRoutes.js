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
  deleteEstate,
  searchGlobalUsers,
  getGlobalLogs,
  getSystemMetrics
} from '../controllers/superAdminController.js';
import { respond, respondError } from '../utils/respond.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import attachRequestAudit from '../middleware/auditLogger.js';
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
router.get('/super-admin/overview', authenticateToken, requireRole(['super_admin']), attachRequestAudit, getPlatformOverview);

/**
 * @route GET /api/admin/super-admin/estates
 * @desc List all estates with stats
 * @access Private (Super Admin only)
 */
router.get('/super-admin/estates', authenticateToken, requireRole(['super_admin']), attachRequestAudit, listEstates);

/**
 * @route POST /api/admin/super-admin/estates
 * @desc Create a new estate
 * @access Private (Super Admin only)
 */
router.post('/super-admin/estates', authenticateToken, requireRole(['super_admin']), attachRequestAudit, createEstate);

/**
 * @route PATCH /api/admin/super-admin/estates/:id/status
 * @desc Update estate status (suspend/activate)
 * @access Private (Super Admin only)
 */
router.patch('/super-admin/estates/:id/status', authenticateToken, requireRole(['super_admin']), attachRequestAudit, updateEstateStatus);

/**
 * @route DELETE /api/admin/super-admin/estates/:id
 * @desc Decommission estate (soft delete via status)
 * @access Private (Super Admin only)
 */
router.delete('/super-admin/estates/:id', authenticateToken, requireRole(['super_admin']), attachRequestAudit, deleteEstate);

/**
 * @route GET /api/admin/super-admin/users/search
 * @desc Search users globally (Privacy preserved)
 * @access Private (Super Admin only)
 */
router.get('/super-admin/users/search', authenticateToken, requireRole(['super_admin']), attachRequestAudit, searchGlobalUsers);

/**
 * @route GET /api/admin/super-admin/audit-logs
 * @desc View system-wide audit logs
 * @access Private (Super Admin only)
 */
router.get('/super-admin/audit-logs', authenticateToken, requireRole(['super_admin']), attachRequestAudit, getGlobalLogs);

/**
 * @route GET /api/admin/super-admin/system/metrics
 * @desc Get real-time system health metrics
 * @access Private (Super Admin only)
 */
router.get('/super-admin/system/metrics', authenticateToken, requireRole(['super_admin']), attachRequestAudit, getSystemMetrics);

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
router.get('/metrics', authenticateToken, attachRequestAudit, getMetrics);

/**
 * @swagger
 * /api/admin/estate-info:
 *   get:
 *     summary: Get current estate info
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estate info retrieved
 */
router.get('/estate-info', authenticateToken, attachRequestAudit, getEstateInfo);

// ==================== SETTINGS & COMPLIANCE ====================

/**
 * @route GET /api/admin/settings
 * @desc Get estate settings
 * @access Private (Admin only)
 */
router.get('/settings', authenticateToken, requireRole(['admin']), attachRequestAudit, getSettings);

/**
 * @route PUT /api/admin/settings
 * @desc Update estate settings
 * @access Private (Admin only)
 */
router.put('/settings', authenticateToken, requireRole(['admin']), attachRequestAudit, updateSettings);

/**
 * @route PUT /api/admin/compliance/:section
 * @desc Update compliance settings (dpo/odpc)
 * @access Private (Admin only)
 */
router.put('/compliance/:section', authenticateToken, requireRole(['admin']), attachRequestAudit, updateCompliance);

/**
 * @route POST /api/admin/compliance/review
 * @desc Trigger compliance review
 * @access Private (Admin only)
 */
router.post('/compliance/review', authenticateToken, requireRole(['admin']), attachRequestAudit, runComplianceReview);

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
router.post('/backup/trigger', authenticateToken, requireRole(['admin']), attachRequestAudit, async (req, res) => {
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
router.get('/users/pending', authenticateToken, requireRole(['admin']), minimizeData('user'), attachRequestAudit, getPendingUsers);

/**
 * @route PUT /api/admin/users/:id/status
 * @desc Update user account status (approve/reject/suspend)
 * @access Private (Admin only)
 */
router.put('/users/:id/status', authenticateToken, requireRole(['admin']), attachRequestAudit, updateUserStatus);

// ==================== USER MANAGEMENT ENDPOINTS ====================

/**
 * @route GET /api/admin/users
 * @desc Get all users with optional filtering
 * @access Private (Admin only)
 */
router.get('/users', authenticateToken, requireRole(['admin']), minimizeData('user'), attachRequestAudit, async (req, res) => {
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
 * @route PUT /api/admin/users/:id
 * @desc Update a user
 * @access Private (Admin only)
 */
router.put('/users/:id', authenticateToken, requireRole(['admin']), attachRequestAudit, async (req, res) => {
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
 * @route DELETE /api/admin/users/:id
 * @desc Delete a user (soft delete by setting status to 'deleted')
 * @access Private (Admin only)
 */
router.delete('/users/:id', authenticateToken, requireRole(['admin']), attachRequestAudit, async (req, res) => {
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
router.get('/residents', authenticateToken, requireRole(['admin']), minimizeData('user'), attachRequestAudit, async (req, res) => {
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
router.post('/residents', authenticateToken, requireRole(['admin']), attachRequestAudit, async (req, res) => {
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
router.put('/residents/:id', authenticateToken, requireRole(['admin']), attachRequestAudit, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, first_name, last_name, email, phone, unit_number, status } = req.body;

    // SECURITY: Filter by estate_id to prevent cross-estate modification
    let query = `UPDATE users SET 
      username = COALESCE($1, username),
      first_name = COALESCE($2, first_name),
      last_name = COALESCE($3, last_name),
      email = COALESCE($4, email),
      phone = COALESCE($5, phone),
      unit_number = COALESCE($6, unit_number),
      status = COALESCE($7, status),
      updated_at = NOW()
     WHERE id = $8 AND role = 'resident'`;
    const params = [username, first_name, last_name, email, phone, unit_number, status, id];

    if (req.user.estate_id) {
      query += ` AND estate_id = $9`;
      params.push(req.user.estate_id);
    }
    query += ` RETURNING id, username, first_name, last_name, email, phone, unit_number, status`;

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
router.delete('/residents/:id', authenticateToken, requireRole(['admin']), attachRequestAudit, async (req, res) => {
  try {
    const { id } = req.params;

    // SECURITY: Filter by estate_id to prevent cross-estate deletion
    let query = `UPDATE users SET status = 'deleted', updated_at = NOW() 
       WHERE id = $1 AND role = 'resident' AND status != 'deleted'`;
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
router.get('/visitors', authenticateToken, requireRole(['admin']), minimizeData('visitor'), attachRequestAudit, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    // Fix A-004: Pagination Input Validation
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20)); // Cap limit at 100
    const offset = (pageNum - 1) * limitNum;

    let query = `SELECT v.*, v.check_in_time AS check_in, v.check_out_time AS check_out, u.username as host_name 
                 FROM visitors v 
                 LEFT JOIN users u ON v.created_by = u.email 
                 WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

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
    params.push(limit, offset);

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
router.get('/access-logs', authenticateToken, requireRole(['admin']), minimizeData('access'), attachRequestAudit, async (req, res) => {
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
router.get('/incidents-list', authenticateToken, requireRole(['admin']), attachRequestAudit, async (req, res) => {
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

    let query = 'SELECT * FROM incidents WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (priority) {
      query += ` AND priority = $${paramIndex++}`;
      params.push(priority);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

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
router.get('/retention-settings', authenticateToken, requireRole(['admin']), attachRequestAudit, async (req, res) => {
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
router.put('/retention-settings', authenticateToken, requireRole(['admin']), attachRequestAudit, async (req, res) => {
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
router.post('/retention/trigger', authenticateToken, requireRole(['admin']), attachRequestAudit, async (req, res) => {
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
router.get('/retention/logs', authenticateToken, requireRole(['admin']), attachRequestAudit, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const result = await dbManager.query(
      `SELECT * FROM retention_logs ORDER BY timestamp DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

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
router.get('/retention/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
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
router.post('/retention/run', authenticateToken, requireRole(['admin']), attachRequestAudit, async (req, res) => {
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
router.get('/retention/scheduler/status', authenticateToken, requireRole(['admin']), async (req, res) => {
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
