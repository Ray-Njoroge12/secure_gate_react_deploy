import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError } from '../utils/respond.js';
import { PASS_STATUS } from '../constants/statuses.js';

const getActiveVisitors = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role !== 'guard' && req.user.role !== 'admin') return respondError(res, 403, 'Forbidden');
    
    const estateId = req.user.estate_id ?? null;
    const params = [PASS_STATUS.PENDING, PASS_STATUS.VERIFIED, PASS_STATUS.ON_PREMISE];
    let estateClause = '';
    if (estateId !== null) {
      estateClause = ' AND estate_id = $4';
      params.push(estateId);
    }

    const vRes = await dbManager.query(`
      SELECT id, name, phone, email, purpose, date_of_visit, time_of_visit, 
             invite_code, status, check_in, check_out, created_at
      FROM visitors 
      WHERE status IN ($1, $2, $3)${estateClause}
      ORDER BY created_at DESC
    `, params);
    
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
    
    const estateId = req.user.estate_id ?? null;
    const statsParams = [PASS_STATUS.PENDING, PASS_STATUS.VERIFIED, PASS_STATUS.ON_PREMISE, PASS_STATUS.CHECKED_OUT];
    let statsEstateClause = '';
    if (estateId !== null) {
      statsEstateClause = ' WHERE estate_id = $5';
      statsParams.push(estateId);
    }

    const statsRes = await dbManager.query(`
      SELECT 
        COUNT(*) as total_visitors,
        COUNT(CASE WHEN status = $1 THEN 1 END) as pending_visitors,
        COUNT(CASE WHEN status = $2 THEN 1 END) as verified_visitors,
        COUNT(CASE WHEN status = $3 THEN 1 END) as checked_in_visitors,
        COUNT(CASE WHEN status = $4 THEN 1 END) as checked_out_visitors
      FROM visitors${statsEstateClause}
    `, statsParams);
    
    const recentParams = [];
    const recentEstateClause = estateId !== null ? ' WHERE estate_id = $1' : '';
    if (estateId !== null) {
      recentParams.push(estateId);
    }

    const recentRes = await dbManager.query(`
      SELECT id, name, phone, email, purpose, status, check_in, check_out, created_at
      FROM visitors${recentEstateClause}
      ORDER BY created_at DESC 
      LIMIT 50
    `, recentParams);
    
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
    
    const vRes = await dbManager.query('SELECT id, status, name, estate_id FROM visitors WHERE id = $1', [visitorId]);
    const visitor = vRes.rows[0];
    if (!visitor) return respondError(res, 404, 'Visitor not found');
    const estateId = req.user.estate_id ?? null;
    if (estateId !== null && visitor.estate_id !== null && visitor.estate_id !== estateId) {
      return respondError(res, 403, 'Forbidden');
    }
    
    await dbManager.query('UPDATE visitors SET status = $1 WHERE id = $2', [PASS_STATUS.REVOKED, visitorId]);
    
    await req.audit?.('visitor.revoke', 'visitor', String(visitorId), { outcome: 'success', message: 'Visitor access revoked', visitorName: visitor.name });
    respond(res, { message: 'Visitor access revoked successfully' });
  } catch (error) {
    await req.audit?.('visitor.revoke', 'visitor', null, { outcome: 'fail', message: 'Failed to revoke visitor access', error: String(error?.message) });
    respondError(res, 500, 'Failed to revoke visitor access');
  }
};

export { getActiveVisitors, getVisitorReport, revokeVisitor };

