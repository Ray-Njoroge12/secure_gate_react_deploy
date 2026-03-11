// server/src/controllers/dashboardController-optimized.js
/**
 * Dashboard Controller - Optimized Version
 * Handles dashboard statistics and metrics
 * 
 * SECURITY: All queries now require estate_id filtering
 */

import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError } from '../utils/respond.js';
import logger from '../config/logger.js';

/**
 * Get dashboard statistics based on user role
 */
export const getDashboardStats = async (req, res) => {
  try {
    if (!req.user || !req.user.email) {
      return respondError(res, 401, 'Unauthorized');
    }

    const userRole = req.user.role || 'resident';
    const userEmail = req.user.email;
    const estateId = req.user.estate_id;

    // SECURITY: Require estate context for all dashboard queries
    if (!estateId) {
      return respondError(res, 400, 'Estate context required');
    }

    let stats = {};

    if (userRole === 'admin' || userRole === 'super_admin') {
      // Admin dashboard stats
      stats = await getAdminStats(estateId);
    } else if (userRole === 'guard' || userRole === 'security') {
      // Guard dashboard stats
      stats = await getGuardStats(estateId);
    } else {
      // Resident dashboard stats
      stats = await getResidentStats(userEmail, estateId);
    }

    respond(res, {
      role: userRole,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Dashboard stats error', { error: error.message, stack: error.stack });
    respondError(res, 500, 'Failed to get dashboard stats');
  }
};

/**
 * Get admin-level statistics
 * @param {number} estateId - Estate ID for filtering
 */
async function getAdminStats(estateId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Total users - filtered by estate
  const usersResult = await dbManager.query(
    'SELECT COUNT(*) as total, role FROM users WHERE estate_id = $1 GROUP BY role',
    [estateId]
  );

  // Today's visitors - filtered by estate
  const todayVisitorsResult = await dbManager.query(
    `SELECT COUNT(*) as total FROM visitors WHERE created_at >= $1 AND estate_id = $2`,
    [today, estateId]
  );

  // Active visitors (on premise) - filtered by estate
  const activeVisitorsResult = await dbManager.query(
    `SELECT COUNT(*) as total FROM visitors WHERE status = 'ON_PREMISE' AND estate_id = $1`,
    [estateId]
  );

  // Pending approvals - filtered by estate
  const pendingResult = await dbManager.query(
    `SELECT COUNT(*) as total FROM visitors WHERE status = 'PENDING' AND estate_id = $1`,
    [estateId]
  );

  // Recent check-ins (last 24 hours) - filtered by estate
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const checkInsResult = await dbManager.query(
    `SELECT COUNT(*) as total FROM visitors WHERE check_in_time >= $1 AND estate_id = $2`,
    [yesterday, estateId]
  );

  // Weekly visitor trend - filtered by estate
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weeklyTrendResult = await dbManager.query(
    `SELECT DATE(created_at) as date, COUNT(*) as count 
     FROM visitors 
     WHERE created_at >= $1 AND estate_id = $2
     GROUP BY DATE(created_at) 
     ORDER BY date`,
    [weekAgo, estateId]
  );

  return {
    users: {
      total: usersResult.rows.reduce((sum, r) => sum + parseInt(r.total), 0),
      byRole: usersResult.rows.reduce((acc, r) => {
        acc[r.role] = parseInt(r.total);
        return acc;
      }, {})
    },
    visitors: {
      today: parseInt(todayVisitorsResult.rows[0]?.total || 0),
      active: parseInt(activeVisitorsResult.rows[0]?.total || 0),
      pending: parseInt(pendingResult.rows[0]?.total || 0),
      checkInsLast24h: parseInt(checkInsResult.rows[0]?.total || 0)
    },
    trends: {
      weekly: weeklyTrendResult.rows.map(r => ({
        date: r.date,
        count: parseInt(r.count)
      }))
    }
  };
}

/**
 * Get guard-level statistics
 * @param {number} estateId - Estate ID for filtering
 */
async function getGuardStats(estateId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Expected visitors today - filtered by estate
  const expectedResult = await dbManager.query(
    `SELECT COUNT(*) as total FROM visitors 
     WHERE DATE(date_of_visit) = CURRENT_DATE 
     AND status IN ('PENDING', 'VERIFIED')
     AND estate_id = $1`,
    [estateId]
  );

  // Checked in today - filtered by estate
  const checkedInResult = await dbManager.query(
    `SELECT COUNT(*) as total FROM visitors WHERE check_in_time >= $1 AND estate_id = $2`,
    [today, estateId]
  );

  // Currently on premise - filtered by estate
  const onPremiseResult = await dbManager.query(
    `SELECT COUNT(*) as total FROM visitors WHERE status = 'ON_PREMISE' AND estate_id = $1`,
    [estateId]
  );

  // Recent check-ins (for activity feed) - filtered by estate
  const recentResult = await dbManager.query(
    `SELECT id, name, phone, purpose, check_in_time AS check_in, status 
     FROM visitors 
     WHERE check_in_time IS NOT NULL AND estate_id = $1
     ORDER BY check_in_time DESC 
     LIMIT 10`,
    [estateId]
  );

  return {
    today: {
      expected: parseInt(expectedResult.rows[0]?.total || 0),
      checkedIn: parseInt(checkedInResult.rows[0]?.total || 0),
      onPremise: parseInt(onPremiseResult.rows[0]?.total || 0)
    },
    recentActivity: recentResult.rows
  };
}

/**
 * Get resident-level statistics
 * @param {string} userEmail - User email for lookup
 * @param {number} estateId - Estate ID for filtering
 */
async function getResidentStats(userEmail, estateId) {
  // Get resident ID - filtered by estate for security
  const residentResult = await dbManager.query(
    'SELECT id FROM users WHERE email = $1 AND estate_id = $2',
    [userEmail, estateId]
  );

  if (residentResult.rows.length === 0) {
    return { error: 'Resident not found' };
  }

  const residentId = residentResult.rows[0].id;

  // Total visitors invited - filtered by estate
  const totalResult = await dbManager.query(
    'SELECT COUNT(*) as total FROM visitors WHERE resident_id = $1 AND estate_id = $2',
    [residentId, estateId]
  );

  // Pending visitors - filtered by estate
  const pendingResult = await dbManager.query(
    `SELECT COUNT(*) as total FROM visitors 
     WHERE resident_id = $1 AND status = 'PENDING' AND estate_id = $2`,
    [residentId, estateId]
  );

  // Active visitors (on premise) - filtered by estate
  const activeResult = await dbManager.query(
    `SELECT COUNT(*) as total FROM visitors 
     WHERE resident_id = $1 AND status = 'ON_PREMISE' AND estate_id = $2`,
    [residentId, estateId]
  );

  // Recent visitors - filtered by estate
  try {
    const recentResult = await dbManager.query(
      `SELECT id, name, phone, purpose, status, date_of_visit, created_at 
       FROM visitors 
       WHERE resident_id = $1 AND estate_id = $2
       ORDER BY created_at DESC 
       LIMIT 5`,
      [residentId, estateId]
    );
    // This month's visitors - filtered by estate
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthlyResult = await dbManager.query(
      `SELECT COUNT(*) as total FROM visitors 
     WHERE resident_id = $1 AND created_at >= $2 AND estate_id = $3`,
      [residentId, monthStart, estateId]
    );
    return {
      visitors: {
        total: parseInt(totalResult.rows[0]?.total || 0),
        pending: parseInt(pendingResult.rows[0]?.total || 0),
        active: parseInt(activeResult.rows[0]?.total || 0),
        thisMonth: parseInt(monthlyResult.rows[0]?.total || 0)
      },
      recent: recentResult.rows
    };
  } catch (err) {
    logger.error('Dashboard resident stats error', { error: err.message, stack: err.stack });
    throw err;
  }
}

export default {
  getDashboardStats
};
