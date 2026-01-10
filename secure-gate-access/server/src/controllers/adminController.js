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
    if (req.user.role !== 'admin') return respondError(res, 403, 'Forbidden');

    // Get user metrics
    const totalUsersRes = await dbManager.query('SELECT COUNT(*) FROM users');
    const residentsRes = await dbManager.query('SELECT COUNT(*) FROM users WHERE role = $1', ['resident']);
    const guardsRes = await dbManager.query('SELECT COUNT(*) FROM users WHERE role = $1', ['guard']);
    const adminsRes = await dbManager.query('SELECT COUNT(*) FROM users WHERE role = $1', ['admin']);

    const estateId = req.user.estate_id ?? null;
    const estateClause = estateId !== null ? ' WHERE estate_id = $1' : '';
    const statusClause = estateId !== null ? ' AND estate_id = $2' : '';

    // Get visitor metrics
    const totalVisitorsRes = await dbManager.query(
      `SELECT COUNT(*) FROM visitors${estateClause}`,
      estateId !== null ? [estateId] : []
    );
    const pendingVisitorsRes = await dbManager.query(
      `SELECT COUNT(*) FROM visitors WHERE status = $1${statusClause}`,
      estateId !== null ? ['PENDING', estateId] : ['PENDING']
    );
    const verifiedVisitorsRes = await dbManager.query(
      `SELECT COUNT(*) FROM visitors WHERE status = $1${statusClause}`,
      estateId !== null ? ['VERIFIED', estateId] : ['VERIFIED']
    );
    const checkedInVisitorsRes = await dbManager.query(
      `SELECT COUNT(*) FROM visitors WHERE status = $1${statusClause}`,
      estateId !== null ? [PASS_STATUS.ON_PREMISE, estateId] : [PASS_STATUS.ON_PREMISE]
    );
    const checkedOutVisitorsRes = await dbManager.query(
      `SELECT COUNT(*) FROM visitors WHERE status = $1${statusClause}`,
      estateId !== null ? [PASS_STATUS.CHECKED_OUT, estateId] : [PASS_STATUS.CHECKED_OUT]
    );

    // Get recent visitors
    const recentVisitorsRes = await dbManager.query(
      `SELECT id, name, phone, email, status, created_at
       FROM visitors${estateClause}
       ORDER BY created_at DESC LIMIT 10`,
      estateId !== null ? [estateId] : []
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
    if (req.user.role !== 'admin') return respondError(res, 403, 'Forbidden');

    const { page = 1, limit = 25, action, user_id, userId, date } = req.query;
    const filterUserId = user_id || userId; // Support both snake_case and camelCase
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    let paramIndex = 1;

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
    const totalRes = await dbManager.query('SELECT COUNT(*) FROM audit_logs');
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

export { getMetrics, getAuditLogs };
