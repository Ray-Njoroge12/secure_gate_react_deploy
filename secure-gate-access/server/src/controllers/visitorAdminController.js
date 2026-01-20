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

    // SECURITY: Require estate context
    if (!estateId) {
      return respondError(res, 400, 'Estate context required');
    }

    const statsRes = await dbManager.query(`
      SELECT 
        COUNT(*) as total_visitors,
        COUNT(CASE WHEN status = $1 THEN 1 END) as pending_visitors,
        COUNT(CASE WHEN status = $2 THEN 1 END) as verified_visitors,
        COUNT(CASE WHEN status = $3 THEN 1 END) as checked_in_visitors,
        COUNT(CASE WHEN status = $4 THEN 1 END) as checked_out_visitors
      FROM visitors WHERE estate_id = $5
    `, [PASS_STATUS.PENDING, PASS_STATUS.VERIFIED, PASS_STATUS.ON_PREMISE, PASS_STATUS.CHECKED_OUT, estateId]);

    const recentRes = await dbManager.query(`
      SELECT id, name, phone, email, purpose, status, check_in_time AS check_in, check_out_time AS check_out, created_at
      FROM visitors WHERE estate_id = $1
      ORDER BY created_at DESC 
      LIMIT 50
    `, [estateId]);

    const report = {
      statistics: statsRes.rows[0],
      recent_visitors: recentRes.rows
    };

    await req.audit?.('visitor.report', 'visitor', null, { outcome: 'success', message: 'Generated visitor report' });
    respond(res, { data: report });
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
