import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError } from '../utils/respond.js';
import { PASS_STATUS } from '../constants/statuses.js';

const getDashboardStats = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    
    // Get user statistics
    const userStatsRes = await dbManager.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'resident' THEN 1 END) as residents,
        COUNT(CASE WHEN role = 'guard' THEN 1 END) as guards,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins
      FROM users
    `);
    
    // Get visitor statistics
    const visitorStatsRes = await dbManager.query(`
      SELECT 
        COUNT(*) as total_visitors,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_visitors,
        COUNT(CASE WHEN status = 'VERIFIED' THEN 1 END) as verified_visitors,
        COUNT(CASE WHEN status = $1 THEN 1 END) as checked_in_visitors,
        COUNT(CASE WHEN status = $2 THEN 1 END) as checked_out_visitors
      FROM visitors
    `, [PASS_STATUS.ON_PREMISE, PASS_STATUS.CHECKED_OUT]);
    
    // Get recent activity
    const recentVisitorsRes = await dbManager.query(`
      SELECT id, name, phone, email, status, created_at
      FROM visitors 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    const stats = {
      users: userStatsRes.rows[0],
      visitors: visitorStatsRes.rows[0],
      recent_visitors: recentVisitorsRes.rows,
      timestamp: new Date().toISOString()
    };
    
    await req.audit?.('dashboard.stats', 'dashboard', null, { outcome: 'success', message: 'Retrieved dashboard statistics' });
    respond(res, { data: stats });
  } catch (error) {
    await req.audit?.('dashboard.stats', 'dashboard', null, { outcome: 'fail', message: 'Failed to retrieve dashboard statistics', error: String(error?.message) });
    respondError(res, 500, 'Failed to retrieve dashboard statistics');
  }
};

export { getDashboardStats };

