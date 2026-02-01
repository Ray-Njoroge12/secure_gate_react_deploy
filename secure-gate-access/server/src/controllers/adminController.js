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
