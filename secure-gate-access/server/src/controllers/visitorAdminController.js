import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError } from '../utils/respond.js';
import { PASS_STATUS } from '../constants/statuses.js';

const getActiveVisitors = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role !== 'guard' && req.user.role !== 'admin') return respondError(res, 403, 'Forbidden');

    const estateId = req.user.estate_id;

    // SECURITY: Require estate context
    if (!estateId) {
      return respondError(res, 400, 'Estate context required');
    }

    const vRes = await dbManager.query(`
      SELECT id, name, phone, email, purpose, date_of_visit, time_of_visit, 
             invite_code, status, check_in_time AS check_in, check_out_time AS check_out, created_at
      FROM visitors 
      WHERE status IN ($1, $2, $3) AND estate_id = $4
      ORDER BY created_at DESC
    `, [PASS_STATUS.PENDING, PASS_STATUS.VERIFIED, PASS_STATUS.ON_PREMISE, estateId]);

    await req.audit?.('visitor.list.active', 'visitor', null, { outcome: 'success', message: 'Retrieved active visitors', count: vRes.rows.length });
    respond(res, { data: vRes.rows });
  } catch (error) {
    await req.audit?.('visitor.list.active', 'visitor', null, { outcome: 'fail', message: 'Failed to retrieve active visitors', error: String(error?.message) });
    respondError(res, 500, 'Failed to retrieve active visitors');
  }
};

const getVisitorReport = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role !== 'admin') return respondError(res, 403, 'Forbidden');

    const estateId = req.user.estate_id;
    if (!estateId) return respondError(res, 400, 'Estate context required');

    const { mode, status, host, from, to } = req.query;

    let baseQuery = ' FROM visitors WHERE estate_id = $1';
    const params = [estateId];
    let paramIndex = 2;

    if (status) {
      baseQuery += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (host) {
      baseQuery += ` AND (host_id IN (SELECT id FROM users WHERE (username ILIKE $${paramIndex} OR email ILIKE $${paramIndex}) AND estate_id = $1))`;
      params.push(`%${host}%`);
      paramIndex++; // Re-using same param
    }
    if (from) {
      baseQuery += ` AND created_at >= $${paramIndex++}`;
      params.push(from);
    }
    if (to) {
      baseQuery += ` AND created_at <= $${paramIndex++}`;
      params.push(to);
    }

    // Aggregation Mode (for charts)
    if (mode === 'aggregates') {
      const statsQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = '${PASS_STATUS.PENDING}' THEN 1 END) as pending,
                COUNT(CASE WHEN status = '${PASS_STATUS.VERIFIED}' THEN 1 END) as verified,
                COUNT(CASE WHEN status = '${PASS_STATUS.ON_PREMISE}' THEN 1 END) as checked_in,
                COUNT(CASE WHEN status = '${PASS_STATUS.CHECKED_OUT}' THEN 1 END) as checked_out
            ${baseQuery}
        `;

      // Ensure params slice matches usage if we add complexity, but here baseQuery uses $1..$N
      const statsRes = await dbManager.query(statsQuery, params);

      // Daily Activity (last 7 days by default if no date range)
      // If range provided, group by day within range
      let dateFilter = '';
      const limitParams = [estateId]; // Reset for specific sub-queries if needed, but reusing params safely is tricky with dynamic SQL strings.
      // Safer to run dedicated queries for fixed components:

      const dailyQuery = `
            SELECT to_char(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count
            FROM visitors 
            WHERE estate_id = $1
            AND created_at > NOW() - INTERVAL '30 days'
            GROUP BY 1
            ORDER BY 1
        `;
      const dailyRes = await dbManager.query(dailyQuery, [estateId]);

      const hostQuery = `
            SELECT u.username as host_name, COUNT(v.id) as count
            FROM visitors v
            JOIN users u ON v.host_id = u.id
            WHERE v.estate_id = $1
            GROUP BY u.username
            ORDER BY count DESC
            LIMIT 5
        `;
      const hostRes = await dbManager.query(hostQuery, [estateId]);

      return respond(res, {
        data: {
          counts: statsRes.rows[0],
          dailyTotals: dailyRes.rows,
          hostSummary: hostRes.rows
        }
      });
    }

    // Default Mode: List View
    const listQuery = `SELECT id, name, phone, email, purpose, status, check_in_time AS check_in, check_out_time AS check_out, created_at ${baseQuery} ORDER BY created_at DESC LIMIT 100`;
    const listRes = await dbManager.query(listQuery, params);

    await req.audit?.('visitor.report', 'visitor', null, { outcome: 'success', message: 'Generated visitor report' });
    respond(res, { data: listRes.rows });

  } catch (error) {
    await req.audit?.('visitor.report', 'visitor', null, { outcome: 'fail', message: 'Failed to generate visitor report', error: String(error?.message) });
    respondError(res, 500, 'Failed to generate visitor report');
  }
};

const revokeVisitor = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role !== 'admin') return respondError(res, 403, 'Forbidden');

    const { visitorId } = req.params;
    const estateId = req.user.estate_id;

    // SECURITY: Require estate context
    if (!estateId) {
      return respondError(res, 400, 'Estate context required');
    }

    // SECURITY: Include estate_id in both SELECT and UPDATE to prevent race conditions
    const vRes = await dbManager.query(
      'SELECT id, status, name FROM visitors WHERE id = $1 AND estate_id = $2',
      [visitorId, estateId]
    );
    const visitor = vRes.rows[0];
    if (!visitor) return respondError(res, 404, 'Visitor not found or access denied');

    // SECURITY: Include estate_id in UPDATE for defense-in-depth
    await dbManager.query(
      'UPDATE visitors SET status = $1 WHERE id = $2 AND estate_id = $3',
      [PASS_STATUS.REVOKED, visitorId, estateId]
    );

    await req.audit?.('visitor.revoke', 'visitor', String(visitorId), { outcome: 'success', message: 'Visitor access revoked', visitorName: visitor.name });
    respond(res, { message: 'Visitor access revoked successfully' });
  } catch (error) {
    await req.audit?.('visitor.revoke', 'visitor', null, { outcome: 'fail', message: 'Failed to revoke visitor access', error: String(error?.message) });
    respondError(res, 500, 'Failed to revoke visitor access');
  }
};

export { getActiveVisitors, getVisitorReport, revokeVisitor };
