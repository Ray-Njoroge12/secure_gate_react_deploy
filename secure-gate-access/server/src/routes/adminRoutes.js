import express from 'express';
import { getMetrics, getAuditLogs } from '../controllers/adminController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import attachRequestAudit from '../middleware/auditLogger.js';
import backupService from '../services/backupService.js';
import userService from '../services/userService.js';
import { dbManager } from '../database/db.enhanced.js';

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

// ==================== USER MANAGEMENT ENDPOINTS ====================

/**
 * @route GET /api/admin/users
 * @desc Get all users with optional filtering
 * @access Private (Admin only)
 */
router.get('/users', authenticateToken, requireRole(['admin']), attachRequestAudit, async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const baseSelect = 'SELECT id, username, email, role, status, estate_id, created_at, updated_at FROM users WHERE 1=1';
    let query = baseSelect;
    const params = [];
    let paramIndex = 1;
    
    if (role) {
      query += ` AND role = $${paramIndex++}`;
      params.push(role);
    }
    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (search) {
      query += ` AND (username ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    // Get total count
    const countQuery = query.replace(baseSelect, 'SELECT COUNT(*) FROM users WHERE 1=1');
    const countResult = await dbManager.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Add pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);
    
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
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
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
      updates.push(`status = $${paramIndex++}`);
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
    
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, email, role, status, estate_id, updated_at`;
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
    const result = await dbManager.query(
      `UPDATE users SET status = 'deleted', updated_at = NOW() WHERE id = $1 AND status != 'deleted' RETURNING id`,
      [id]
    );
    
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
router.get('/residents', authenticateToken, requireRole(['admin']), attachRequestAudit, async (req, res) => {
  try {
    const result = await dbManager.query(
      `SELECT id, username, email, phone, unit_number, status, created_at 
       FROM users WHERE role = 'resident' AND status != 'deleted' 
       ORDER BY created_at DESC`
    );
    
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
 * @route PUT /api/admin/residents/:id
 * @desc Update a resident
 * @access Private (Admin only)
 */
router.put('/residents/:id', authenticateToken, requireRole(['admin']), attachRequestAudit, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, phone, unit_number, status } = req.body;
    
    const result = await dbManager.query(
      `UPDATE users SET 
        username = COALESCE($1, username),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        unit_number = COALESCE($4, unit_number),
        status = COALESCE($5, status),
        updated_at = NOW()
       WHERE id = $6 AND role = 'resident'
       RETURNING id, username, email, phone, unit_number, status`,
      [username, email, phone, unit_number, status, id]
    );
    
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
    
    const result = await dbManager.query(
      `UPDATE users SET status = 'deleted', updated_at = NOW() 
       WHERE id = $1 AND role = 'resident' AND status != 'deleted' 
       RETURNING id`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Resident not found' });
    }
    
    res.json({ success: true, message: 'Resident deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete resident', error: error.message });
  }
});

// ==================== GUARDS MANAGEMENT ====================

/**
 * @route GET /api/admin/guards
 * @desc Get all guards
 * @access Private (Admin only)
 */
router.get('/guards', authenticateToken, requireRole(['admin']), attachRequestAudit, async (req, res) => {
  try {
    const result = await dbManager.query(
      `SELECT id, username, email, phone, status, created_at 
       FROM users WHERE role = 'guard' AND status != 'deleted' 
       ORDER BY created_at DESC`
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching guards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch guards',
      error: error.message
    });
  }
});

/**
 * @route POST /api/admin/guards
 * @desc Add a new guard
 * @access Private (Admin only)
 */
router.post('/guards', authenticateToken, requireRole(['admin']), attachRequestAudit, async (req, res) => {
  try {
    const { username, email, phone, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }
    
    // Use userService to create guard with proper password hashing
    const guard = await userService.createUser({
      username,
      email,
      phone,
      password,
      role: 'guard'
    });
    
    res.status(201).json({
      success: true,
      message: 'Guard created successfully',
      data: {
        id: guard.id,
        username: guard.username,
        email: guard.email,
        role: 'guard'
      }
    });
  } catch (error) {
    console.error('Error creating guard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create guard',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/admin/guards/:id
 * @desc Update a guard
 * @access Private (Admin only)
 */
router.put('/guards/:id', authenticateToken, requireRole(['admin']), attachRequestAudit, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, phone, status } = req.body;
    
    const result = await dbManager.query(
      `UPDATE users SET 
        username = COALESCE($1, username),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        status = COALESCE($4, status),
        updated_at = NOW()
       WHERE id = $5 AND role = 'guard'
       RETURNING id, username, email, phone, status`,
      [username, email, phone, status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Guard not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update guard', error: error.message });
  }
});

/**
 * @route DELETE /api/admin/guards/:id
 * @desc Delete a guard
 * @access Private (Admin only)
 */
router.delete('/guards/:id', authenticateToken, requireRole(['admin']), attachRequestAudit, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await dbManager.query(
      `UPDATE users SET status = 'deleted', updated_at = NOW() 
       WHERE id = $1 AND role = 'guard' AND status != 'deleted' 
       RETURNING id`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Guard not found' });
    }
    
    res.json({ success: true, message: 'Guard deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete guard', error: error.message });
  }
});

// ==================== VISITOR LOGS ====================

/**
 * @route GET /api/admin/visitors
 * @desc Get visitor logs with filtering
 * @access Private (Admin only)
 */
router.get('/visitors', authenticateToken, requireRole(['admin']), attachRequestAudit, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `SELECT v.*, u.username as host_name 
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
    res.status(500).json({
      success: false,
      message: 'Failed to fetch visitor logs',
      error: error.message
    });
  }
});

// ==================== ACCESS LOGS ====================

/**
 * @route GET /api/admin/access-logs
 * @desc Get access logs
 * @access Private (Admin only)
 */
router.get('/access-logs', authenticateToken, requireRole(['admin']), attachRequestAudit, async (req, res) => {
  try {
    const { type, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
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
    
    const result = await dbManager.query(
      `SELECT * FROM access_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching access logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch access logs',
      error: error.message
    });
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
    const offset = (page - 1) * limit;
    
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
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incidents',
      error: error.message
    });
  }
});

export default router;
