import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError } from '../utils/respond.js';
import { PASS_STATUS } from '../constants/statuses.js';

const getActiveVisitors = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role !== 'guard' && req.user.role !== 'admin') return respondError(res, 403, 'Forbidden');
    const estateId = req.user.estate_id ?? 1;

    const vRes = await dbManager.query(`
      SELECT id, name, phone, email, purpose, date_of_visit, time_of_visit, 
             invite_code, status, check_in, check_out, created_at
      FROM visitors 
      WHERE status IN ('PENDING', 'VERIFIED', $1)
        AND estate_id = $2
      ORDER BY created_at DESC
    `, [PASS_STATUS.ON_PREMISE, estateId]);
    
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
    const estateId = req.user.estate_id ?? 1;

    const statsRes = await dbManager.query(`
      SELECT 
        COUNT(*) as total_visitors,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_visitors,
        COUNT(CASE WHEN status = 'VERIFIED' THEN 1 END) as verified_visitors,
        COUNT(CASE WHEN status = 'CHECKED_IN' THEN 1 END) as checked_in_visitors,
        COUNT(CASE WHEN status = 'CHECKED_OUT' THEN 1 END) as checked_out_visitors
      FROM visitors
      WHERE estate_id = $1
    `, [estateId]);
    
    const recentRes = await dbManager.query(`
      SELECT id, name, phone, email, purpose, status, check_in, check_out, created_at
      FROM visitors 
      WHERE estate_id = $1
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
    
    const vRes = await dbManager.query('SELECT id, status, name FROM visitors WHERE id = $1', [visitorId]);
    const visitor = vRes.rows[0];
    if (!visitor) return respondError(res, 404, 'Visitor not found');
    
    await dbManager.query('UPDATE visitors SET status = $1 WHERE id = $2', [PASS_STATUS.REVOKED, visitorId]);
    
    await req.audit?.('visitor.revoke', 'visitor', String(visitorId), { outcome: 'success', message: 'Visitor access revoked', visitorName: visitor.name });
    respond(res, { message: 'Visitor access revoked successfully' });
  } catch (error) {
    await req.audit?.('visitor.revoke', 'visitor', null, { outcome: 'fail', message: 'Failed to revoke visitor access', error: String(error?.message) });
    respondError(res, 500, 'Failed to revoke visitor access');
  }
};

export { getActiveVisitors, getVisitorReport, revokeVisitor };
