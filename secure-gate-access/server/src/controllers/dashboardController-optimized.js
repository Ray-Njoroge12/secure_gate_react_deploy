// server/src/controllers/dashboardController-optimized.js
/**
 * Dashboard Controller - Optimized Version
 * Handles dashboard statistics and metrics
 */

import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError } from '../utils/respond.js';

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

    let stats = {};

    if (userRole === 'admin') {
      // Admin dashboard stats
      stats = await getAdminStats();
    } else if (userRole === 'guard') {
      // Guard dashboard stats
      stats = await getGuardStats();
    } else {
      // Resident dashboard stats
      stats = await getResidentStats(userEmail);
    }

    respond(res, {
      role: userRole,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    respondError(res, 500, 'Failed to get dashboard stats');
  }
};

/**
 * Get admin-level statistics
 */
async function getAdminStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Total users
  const usersResult = await dbManager.query(
    'SELECT COUNT(*) as total, role FROM users GROUP BY role'
  );

  // Today's visitors
  const todayVisitorsResult = await dbManager.query(
    `SELECT COUNT(*) as total FROM visitors WHERE created_at >= $1`,
    [today]
  );

  // Active visitors (on premise)
  const activeVisitorsResult = await dbManager.query(
    `SELECT COUNT(*) as total FROM visitors WHERE status = 'ON_PREMISE'`
  );

  // Pending approvals
  const pendingResult = await dbManager.query(
    `SELECT COUNT(*) as total FROM visitors WHERE status = 'PENDING'`
  );

  // Recent check-ins (last 24 hours)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const checkInsResult = await dbManager.query(
    `SELECT COUNT(*) as total FROM visitors WHERE check_in >= $1`,
    [yesterday]
  );

  // Weekly visitor trend
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weeklyTrendResult = await dbManager.query(
    `SELECT DATE(created_at) as date, COUNT(*) as count 
     FROM visitors 
     WHERE created_at >= $1 
     GROUP BY DATE(created_at) 
     ORDER BY date`,
    [weekAgo]
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
 */
async function getGuardStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Expected visitors today
  const expectedResult = await dbManager.query(
    `SELECT COUNT(*) as total FROM visitors 
     WHERE DATE(expected_arrival) = CURRENT_DATE 
     AND status IN ('PENDING', 'VERIFIED')`
  );

  // Checked in today
  const checkedInResult = await dbManager.query(
    `SELECT COUNT(*) as total FROM visitors WHERE check_in >= $1`,
    [today]
  );

  // Currently on premise
  const onPremiseResult = await dbManager.query(
    `SELECT COUNT(*) as total FROM visitors WHERE status = 'ON_PREMISE'`
  );

  // Recent check-ins (for activity feed)
  const recentResult = await dbManager.query(
    `SELECT id, name, phone, purpose, check_in, status 
     FROM visitors 
     WHERE check_in IS NOT NULL 
     ORDER BY check_in DESC 
     LIMIT 10`
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
 */
async function getResidentStats(userEmail) {
  // Get resident ID
  const residentResult = await dbManager.query(
    'SELECT id FROM users WHERE email = $1',
    [userEmail]
  );

  if (residentResult.rows.length === 0) {
    return { error: 'Resident not found' };
  }

  const residentId = residentResult.rows[0].id;

  // Total visitors invited
  const totalResult = await dbManager.query(
    'SELECT COUNT(*) as total FROM visitors WHERE resident_id = $1',
    [residentId]
  );

  // Pending visitors
  const pendingResult = await dbManager.query(
    `SELECT COUNT(*) as total FROM visitors 
     WHERE resident_id = $1 AND status = 'PENDING'`,
    [residentId]
  );

  // Active visitors (on premise)
  const activeResult = await dbManager.query(
    `SELECT COUNT(*) as total FROM visitors 
     WHERE resident_id = $1 AND status = 'ON_PREMISE'`,
    [residentId]
  );

  // Recent visitors
  const recentResult = await dbManager.query(
    `SELECT id, name, phone, purpose, status, expected_arrival, created_at 
     FROM visitors 
     WHERE resident_id = $1 
     ORDER BY created_at DESC 
     LIMIT 5`,
    [residentId]
  );

  // This month's visitors
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthlyResult = await dbManager.query(
    `SELECT COUNT(*) as total FROM visitors 
     WHERE resident_id = $1 AND created_at >= $2`,
    [residentId, monthStart]
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
}

export default {
  getDashboardStats
};
