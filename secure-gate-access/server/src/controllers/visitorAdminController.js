import pool from '../database/db.js';
import { respond, respondError } from '../utils/respond.js';

/**
 * Revoke a visitor's access (admin only)
 */
const revokeVisitor = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role !== 'admin') return respondError(res, 403, 'Forbidden');

    const { visitorId } = req.params;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const vRes = await client.query('SELECT id, status, name, email FROM visitors WHERE id = $1 FOR UPDATE', [visitorId]);
      const visitor = vRes.rows[0];
      if (!visitor) {
        await client.query('ROLLBACK');
        return respondError(res, 404, 'Visitor not found');
      }

      // Update visitor status to REVOKED
      await client.query('UPDATE visitors SET status = $1 WHERE id = $2', ['REVOKED', visitorId]);

      // Update any active passes to revoked
      await client.query('UPDATE passes SET status = $1 WHERE visitor_id = $2 AND status IN ($3,$4)', ['REVOKED', visitorId, 'active', 'ACTIVE']);

      await client.query('COMMIT');

      await req.audit?.('visitor.revoke', 'visitor', String(visitorId), {
        outcome: 'success',
        message: 'Visitor access revoked by admin',
        adminEmail: req.user.email
      });

      respond(res, { message: 'Visitor access revoked successfully' });
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    await req.audit?.('visitor.revoke', 'visitor', null, {
      outcome: 'fail',
      message: 'Failed to revoke visitor access',
      error: String(error?.message)
    });
    respondError(res, 500, 'Failed to revoke visitor access');
  }
};

/**
 * Get all active visitors (admin only)
 */
const getActiveVisitors = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role !== 'admin') return respondError(res, 403, 'Forbidden');

    const maxLimit = 100;
    const defaultLimit = 20;
    const limit = Math.min(Math.max(parseInt(req.query.limit || defaultLimit, 10) || defaultLimit, 1), maxLimit);
    const offset = Math.max(parseInt(req.query.offset || 0, 10) || 0, 0);

    const dataRes = await pool.query(
      `SELECT id, name, phone, email, purpose, date_of_visit, time_of_visit, status,
              check_in_time AS check_in, check_out_time AS check_out, created_by
       FROM visitors
       WHERE status IN ('PENDING', 'VERIFIED', 'CHECKED_IN', 'OTP_SENT')
       ORDER BY check_in_time DESC NULLS LAST, id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM visitors WHERE status IN ('PENDING', 'VERIFIED', 'CHECKED_IN', 'OTP_SENT')`
    );
    const total = countRes.rows[0]?.total || 0;

    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Limit', limit);
    res.setHeader('X-Offset', offset);

    respond(res, dataRes.rows);
  } catch (error) {
    respondError(res, 500, 'Failed to fetch active visitors');
  }
};

/**
 * Get visitor report with statistics (admin only)
 */
const getVisitorReport = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role !== 'admin') return respondError(res, 403, 'Forbidden');

    const { startDate, endDate } = req.query;

    let dateFilter = '';
    let params = [];
    if (startDate && endDate) {
      dateFilter = 'WHERE date_of_visit BETWEEN $1 AND $2';
      params = [startDate, endDate];
    }

    const statsRes = await pool.query(`
      SELECT
        COUNT(*)::int AS total_visitors,
        COUNT(CASE WHEN status = 'CHECKED_IN' THEN 1 END)::int AS currently_checked_in,
        COUNT(CASE WHEN status = 'CHECKED_OUT' THEN 1 END)::int AS completed_visits,
        COUNT(CASE WHEN status = 'REVOKED' THEN 1 END)::int AS revoked_visits,
        COUNT(CASE WHEN check_in_time IS NOT NULL THEN 1 END)::int AS total_check_ins
      FROM visitors
      ${dateFilter}
    `, params);

    const recentVisitorsRes = await pool.query(`
      SELECT id, name, phone, email, purpose, date_of_visit, time_of_visit, status,
             check_in_time AS check_in, check_out_time AS check_out, created_by
      FROM visitors
      ${dateFilter}
      ORDER BY created_at DESC
      LIMIT 10
    `, params);

    const report = {
      statistics: statsRes.rows[0],
      recentVisitors: recentVisitorsRes.rows,
      dateRange: startDate && endDate ? { startDate, endDate } : null
    };

    respond(res, report);
  } catch (error) {
    respondError(res, 500, 'Failed to generate visitor report');
  }
};

export { revokeVisitor, getActiveVisitors, getVisitorReport };
