import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError, camelize } from '../utils/respond.js';
import { PASS_STATUS } from '../constants/statuses.js';

/**
 * Admin Controller
 * Handles admin-specific operations and metrics
 */

const getMetrics = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (!['admin', 'super_admin'].includes(req.user.role)) return respondError(res, 403, 'Forbidden');

    // Fix: Allow super_admin to view specific estate metrics
    let estateId = req.user.estate_id;
    if (req.user.role === 'super_admin' && req.query.siteId) {
      estateId = req.query.siteId;
    }

    // SECURITY: All queries must filter by estate_id to prevent cross-estate data leakage
    if (!estateId) {
      return respondError(res, 400, 'Estate context required');
    }

    // Get user metrics - filtered by estate
    const totalUsersRes = await dbManager.query(
      'SELECT COUNT(*) FROM users WHERE estate_id = $1',
      [estateId]
    );
    const residentsRes = await dbManager.query(
      'SELECT COUNT(*) FROM users WHERE role = $1 AND estate_id = $2',
      ['resident', estateId]
    );
    const guardsRes = await dbManager.query(
      'SELECT COUNT(*) FROM users WHERE role = $1 AND estate_id = $2',
      ['guard', estateId]
    );
    const adminsRes = await dbManager.query(
      'SELECT COUNT(*) FROM users WHERE role = $1 AND estate_id = $2',
      ['admin', estateId]
    );

    // Get visitor metrics - filtered by estate
    const totalVisitorsRes = await dbManager.query(
      'SELECT COUNT(*) FROM visitors WHERE estate_id = $1',
      [estateId]
    );
    const pendingVisitorsRes = await dbManager.query(
      'SELECT COUNT(*) FROM visitors WHERE status = $1 AND estate_id = $2',
      ['PENDING', estateId]
    );
    const verifiedVisitorsRes = await dbManager.query(
      'SELECT COUNT(*) FROM visitors WHERE status = $1 AND estate_id = $2',
      ['VERIFIED', estateId]
    );
    const checkedInVisitorsRes = await dbManager.query(
      'SELECT COUNT(*) FROM visitors WHERE status = $1 AND estate_id = $2',
      [PASS_STATUS.ON_PREMISE, estateId]
    );
    const checkedOutVisitorsRes = await dbManager.query(
      'SELECT COUNT(*) FROM visitors WHERE status = $1 AND estate_id = $2',
      [PASS_STATUS.CHECKED_OUT, estateId]
    );

    // Get recent visitors - filtered by estate
    const recentVisitorsRes = await dbManager.query(
      `SELECT id, name, phone, email, status, created_at
       FROM visitors WHERE estate_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [estateId]
    );


    const metrics = {
      users: {
        totalUsers: parseInt(totalUsersRes.rows[0].count, 10),
        residents: parseInt(residentsRes.rows[0].count, 10),
        guards: parseInt(guardsRes.rows[0].count, 10),
        admins: parseInt(adminsRes.rows[0].count, 10)
      },
      visitors: {
        totalVisitors: parseInt(totalVisitorsRes.rows[0].count, 10),
        pendingVisitors: parseInt(pendingVisitorsRes.rows[0].count, 10),
        verifiedVisitors: parseInt(verifiedVisitorsRes.rows[0].count, 10),
        checkedInVisitors: parseInt(checkedInVisitorsRes.rows[0].count, 10),
        checkedOutVisitors: parseInt(checkedOutVisitorsRes.rows[0].count, 10)
      },
      recentVisitors: recentVisitorsRes.rows,
      timestamp: new Date().toISOString()
    };

    respond(res, { data: metrics });
  } catch (error) {
    console.error('Error fetching admin metrics:', error);
    respondError(res, 500, 'Failed to fetch metrics');
  }
};

const getAuditLogs = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (!['admin', 'super_admin'].includes(req.user.role)) return respondError(res, 403, 'Forbidden');

    const { page = 1, limit = 25, action, user_id, userId, date } = req.query;
    const filterUserId = user_id || userId; // Support both snake_case and camelCase
    const offset = (page - 1) * limit;

    // Fix: Allow super_admin to view specific estate logs
    let estateId = req.user.estate_id;
    if (req.user.role === 'super_admin' && req.query.siteId) {
      estateId = req.query.siteId;
    }

    // SECURITY: Filter by estate_id
    if (!estateId) {
      return respondError(res, 400, 'Estate context required');
    }

    // Fix A-005: Explicit Column Selection (Avoid SELECT *)
    let query = 'SELECT id, outcome AS level, action, resource, details, message, user_id, ip_address, user_agent, timestamp, created_at, metadata FROM audit_logs WHERE estate_id = $1';
    const params = [estateId];
    let paramIndex = 2;

    if (action) {
      query += ` AND action ILIKE $${paramIndex++}`;
      params.push(`%${action}%`);
    }
    if (filterUserId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(filterUserId);
    }
    if (date) {
      query += ` AND DATE(created_at) = $${paramIndex++}`;
      params.push(date);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await dbManager.query(query, params);
    const totalRes = await dbManager.query(
      'SELECT COUNT(*) FROM audit_logs WHERE estate_id = $1',
      [estateId]
    );
    const total = parseInt(totalRes.rows[0].count, 10);

    // Return with success flag and data directly at top level (camelized)
    res.status(200).json({
      success: true,
      data: camelize(result.rows),
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    respondError(res, 500, 'Failed to fetch audit logs');
  }
};

const getPendingUsers = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (!['admin', 'super_admin'].includes(req.user.role)) return respondError(res, 403, 'Forbidden');

    // Fix: Allow super_admin to view specific estate pending users
    let estateId = req.user.estate_id;
    if (req.user.role === 'super_admin' && req.query.siteId) {
      estateId = req.query.siteId;
    }

    // SECURITY: Filter by estate_id to prevent cross-estate access
    if (!estateId) {
      return respondError(res, 400, 'Estate context required');
    }

    const result = await dbManager.query(
      `SELECT id, username, email, phone, role, created_at, account_status
       FROM users
       WHERE account_status = 'pending' AND estate_id = $1
       ORDER BY created_at ASC`,
      [estateId]
    );

    respond(res, { data: camelize(result.rows) });
  } catch (error) {
    console.error('Error fetching pending users:', error);
    respondError(res, 500, 'Failed to fetch pending users');
  }
};

const updateUserStatus = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (!['admin', 'super_admin'].includes(req.user.role)) return respondError(res, 403, 'Forbidden');

    const { id } = req.params;
    const { status } = req.body; // 'active', 'rejected', 'suspended'

    // Fix: Allow super_admin to manage users for specific estate
    let estateId = req.user.estate_id;
    if (req.user.role === 'super_admin' && req.query.siteId) {
      estateId = req.query.siteId;
    }

    // SECURITY: Require estate context for defense-in-depth
    if (!estateId) {
      return respondError(res, 400, 'Estate context required');
    }

    if (!['active', 'rejected', 'suspended', 'pending'].includes(status)) {
      return respondError(res, 400, 'Invalid status');
    }

    // SECURITY: Filter by estate_id to prevent cross-estate user modification
    const result = await dbManager.query(
      `UPDATE users
       SET account_status = $1, updated_at = NOW()
       WHERE id = $2 AND estate_id = $3
       RETURNING id, username, email, account_status`,
      [status, id, estateId]
    );

    if (result.rowCount === 0) {
      return respondError(res, 404, 'User not found or access denied');
    }

    // TODO: Send email notification to user about status change?
    // For now, just update.

    respond(res, { data: camelize(result.rows[0]), message: `User status updated to ${status}` });
  } catch (error) {
    console.error('Error updating user status:', error);
    respondError(res, 500, 'Failed to update user status');
  }
};

const getEstateInfo = async (req, res) => {
  try {
    if (!req.user || !req.user.estate_id) return respondError(res, 400, 'Estate context missing');

    const result = await dbManager.query(
      'SELECT id, name, slug, timezone, status FROM estates WHERE id = $1',
      [req.user.estate_id]
    );

    if (result.rowCount === 0) {
      return respondError(res, 404, 'Estate not found');
    }

    respond(res, { data: camelize(result.rows[0]) });
  } catch (error) {
    console.error('Error fetching estate info:', error);
    respondError(res, 500, 'Failed to fetch estate info');
  }
};

export { getMetrics, getAuditLogs, getPendingUsers, updateUserStatus, getEstateInfo };

// ====================  EXTRACTED FROM ADMIN ROUTES  ====================

import { maskPhoneNumber, maskEmail } from '../utils/masking.js';
import backupService from '../services/backupService.js';
import userService from '../services/userService.js';
import { asyncHandler, ErrorHelper, ERROR_CODES } from '../middleware/standardizedErrorHandler.js';
import { respond as _respond, respondError as _respondError } from '../utils/respond.js';

/**
 * POST /api/admin/backup/trigger
 */
export const triggerBackup = async (req, res) => {
  try {
    const result = await backupService.triggerBackup();
    res.json({ success: true, message: 'Backup triggered successfully', data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 500, message: 'Failed to trigger backup', type: 'Backup Error', requestId: req.requestId }
    });
  }
};

/**
 * POST /api/admin/users/bulk-approve
 */
export const bulkApproveUsers = async (req, res) => {
  try {
    const { userIds, estateId } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0)
      return res.status(400).json({ success: false, message: 'userIds must be a non-empty array' });
    if (userIds.length > 50)
      return res.status(400).json({ success: false, message: 'Cannot approve more than 50 users at once' });
    if (!userIds.every(id => Number.isInteger(id) && id > 0))
      return res.status(400).json({ success: false, message: 'All user IDs must be positive integers' });

    let query = `UPDATE users SET account_status = 'active', updated_at = NOW()
      WHERE id = ANY($1) AND account_status = 'pending'`;
    const params = [userIds];
    if (req.user.estate_id) { query += ` AND estate_id = $2`; params.push(req.user.estate_id); }
    else if (estateId) { query += ` AND estate_id = $2`; params.push(estateId); }
    query += ` RETURNING id, username, email, role`;

    const result = await dbManager.query(query, params);
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'No pending users found with the provided IDs in your estate' });

    res.json({
      success: true, message: `${result.rows.length} user(s) approved successfully`,
      data: { approved: result.rows, count: result.rows.length, requested: userIds.length }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to approve users', error: error.message });
  }
};

/**
 * POST /api/admin/users/bulk-reject
 */
export const bulkRejectUsers = async (req, res) => {
  try {
    const { userIds, reason } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0)
      return res.status(400).json({ success: false, message: 'userIds must be a non-empty array' });
    if (userIds.length > 50)
      return res.status(400).json({ success: false, message: 'Cannot reject more than 50 users at once' });

    let query = `UPDATE users SET account_status = 'rejected', rejection_reason = $2, updated_at = NOW()
      WHERE id = ANY($1) AND account_status = 'pending'`;
    const params = [userIds, reason || 'Rejected by admin'];
    if (req.user.estate_id) { query += ` AND estate_id = $3`; params.push(req.user.estate_id); }
    query += ` RETURNING id, username, email, role`;

    const result = await dbManager.query(query, params);
    res.json({
      success: true, message: `${result.rows.length} user(s) rejected`,
      data: { rejected: result.rows, count: result.rows.length }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reject users', error: error.message });
  }
};

/**
 * GET /api/admin/residents
 */
export const getResidents = async (req, res) => {
  try {
    let query = `SELECT id, username, first_name, last_name, email, phone, unit_number,
       account_status as status, created_at FROM users WHERE role = 'resident' AND account_status != 'deleted'`;
    const params = [];
    if (req.user.estate_id) { query += ` AND estate_id = $1`; params.push(req.user.estate_id); }
    query += ` ORDER BY created_at DESC`;

    const result = await dbManager.query(query, params);
    const masked = result.rows.map(r => ({
      ...r, email: maskEmail(r.email), phone: r.phone ? maskPhoneNumber(r.phone) : null
    }));
    res.json({ success: true, data: masked });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch residents', error: error.message });
  }
};

/**
 * POST /api/admin/residents
 */
export const createResident = asyncHandler(async (req, res) => {
  const { username, first_name, last_name, email, password, phone, unit_number } = req.body;
  if (!username || !email || !password || !first_name || !last_name)
    throw ErrorHelper.badRequest(ERROR_CODES.VALIDATION_REQUIRED_FIELD, 'Missing required fields');

  const newUser = await userService.createUser({
    username, first_name, last_name, email, password, phone, role: 'resident',
    unit_number, estate_id: req.user.estate_id, account_status: 'active'
  });

  try {
    const { default: emailService } = await import('../services/emailService.js');
    await emailService.sendWelcomeEmail(email, username, password);
  } catch (emailErr) {
    console.error('Failed to send welcome email to resident:', emailErr);
  }

  _respond(res, newUser, 201);
});

/**
 * PUT /api/admin/residents/:id
 */
export const updateResident = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, first_name, last_name, email, phone, unit_number, status } = req.body;

    let query = `UPDATE users SET
      username = COALESCE($1, username), first_name = COALESCE($2, first_name),
      last_name = COALESCE($3, last_name), email = COALESCE($4, email),
      phone = COALESCE($5, phone), unit_number = COALESCE($6, unit_number),
      account_status = COALESCE($7, account_status), updated_at = NOW()
     WHERE id = $8 AND role = 'resident'`;
    const params = [username, first_name, last_name, email, phone, unit_number, status, id];

    if (req.user.estate_id) { query += ` AND estate_id = $9`; params.push(req.user.estate_id); }
    query += ` RETURNING id, username, first_name, last_name, email, phone, unit_number, account_status AS status`;

    const result = await dbManager.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Resident not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update resident', error: error.message });
  }
};

/**
 * DELETE /api/admin/residents/:id
 */
export const deleteResident = async (req, res) => {
  try {
    const { id } = req.params;
    let query = `UPDATE users SET account_status = 'deleted', updated_at = NOW()
       WHERE id = $1 AND role = 'resident' AND account_status != 'deleted'`;
    const params = [id];
    if (req.user.estate_id) { query += ` AND estate_id = $2`; params.push(req.user.estate_id); }
    query += ` RETURNING id`;

    const result = await dbManager.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Resident not found' });
    res.json({ success: true, message: 'Resident deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete resident', error: error.message });
  }
};

/**
 * GET /api/admin/visitors  (visitor log listing for admin panel)
 */
export const getVisitorLogs = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let query = `SELECT v.*, v.check_in_time AS check_in, v.check_out_time AS check_out, u.username as host_name
                 FROM visitors v LEFT JOIN users u ON v.created_by = u.email
                 WHERE v.estate_id = $1`;
    const params = [req.user.estate_id];
    let paramIndex = 2;
    if (status) { query += ` AND v.status = $${paramIndex++}`; params.push(status); }
    if (search) { query += ` AND (v.name ILIKE $${paramIndex} OR v.phone ILIKE $${paramIndex} OR v.email ILIKE $${paramIndex})`; params.push(`%${search}%`); paramIndex++; }
    query += ` ORDER BY v.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limitNum, offset);

    const result = await dbManager.query(query, params);
    const masked = result.rows.map(v => ({
      ...v, email: maskEmail(v.email), phone: v.phone ? maskPhoneNumber(v.phone) : null
    }));
    res.json({ success: true, data: masked });
  } catch (error) {
    _respondError(res, 500, 'Failed to fetch visitor logs', error);
  }
};

/**
 * GET /api/admin/access-logs
 */
export const getAccessLogs = async (req, res) => {
  try {
    const { type, search, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const tableCheck = await dbManager.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'access_logs')`
    );
    if (!tableCheck.rows[0].exists)
      return res.json({ success: true, data: [], message: 'Access logs table not configured' });

    let query = `SELECT a.*, u.username as user_name, u.role as user_role FROM access_logs a
      LEFT JOIN users u ON a.user_id = u.id WHERE 1=1`;
    const params = [];
    let paramIndex = 1;
    if (req.user.estate_id) { query += ` AND u.estate_id = $${paramIndex++}`; params.push(req.user.estate_id); }
    if (type) { query += ` AND a.action = $${paramIndex++}`; params.push(type); }
    if (search) { query += ` AND (u.username ILIKE $${paramIndex} OR a.action ILIKE $${paramIndex})`; params.push(`%${search}%`); paramIndex++; }
    query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limitNum, offset);

    const result = await dbManager.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    _respondError(res, 500, 'Failed to fetch access logs', error);
  }
};

