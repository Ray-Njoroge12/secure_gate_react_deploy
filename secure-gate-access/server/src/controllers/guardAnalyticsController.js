/**
 * @file guardAnalyticsController.js
 * @description Phase G5 - Guard analytics controller
 * Provides insights and metrics for guard operations
 */

import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError } from '../utils/respond.js';
import logger from '../config/logger.js';

/**
 * Get guard operational statistics
 * GET /api/guard/analytics?fromDate=...&toDate=...
 */
export const getGuardAnalytics = async (req, res) => {
  try {
    // Auth check: guard, admin only
    if (!req.user || !req.user.email) {
      return respondError(res, 401, 'Unauthorized');
    }
    if (req.user.role !== 'guard' && req.user.role !== 'admin') {
      return respondError(res, 403, 'Forbidden');
    }

    const { fromDate, toDate } = req.query;
    const from = fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const to = toDate || new Date().toISOString().split('T')[0];

    const estateId = req.user.estate_id ?? null;
    const estateFilter = estateId !== null ? ' AND estate_id = $3' : '';
    const estateParams = estateId !== null ? [from, to, estateId] : [from, to];

    // 1. Approval time statistics
    const approvalStats = await dbManager.query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (approved_at - approval_requested_at))) as avg_approval_seconds,
        COUNT(*) FILTER (WHERE approved_at IS NOT NULL) as total_approved,
        COUNT(*) FILTER (WHERE rejected_at IS NOT NULL) as total_rejected,
        COUNT(*) FILTER (WHERE approval_requested_at IS NOT NULL) as total_approval_requests
      FROM visitors
      WHERE approval_requested_at BETWEEN $1 AND $2
      ${estateFilter}
    `, estateParams);

    // 2. Visits by hour of day
    const visitsByHour = await dbManager.query(`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as count
      FROM visitors
      WHERE created_at BETWEEN $1 AND $2
      ${estateFilter}
      GROUP BY hour
      ORDER BY hour
    `, estateParams);

    // 3. Incidents by category
    const incidentsByCategory = await dbManager.query(`
      SELECT 
        category,
        severity,
        COUNT(*) as count
      FROM incidents
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY category, severity
      ORDER BY count DESC
    `, [from, to]);

    // 4. Top residents by approvals
    const topResidents = await dbManager.query(`
      SELECT 
        u.full_name,
        u.email,
        COUNT(*) FILTER (WHERE v.approved_at IS NOT NULL) as approval_count,
        COUNT(*) FILTER (WHERE v.rejected_at IS NOT NULL) as rejection_count
      FROM visitors v
      JOIN users u ON v.resident_id = u.id
      WHERE v.approval_requested_at BETWEEN $1 AND $2
        ${estateId !== null ? 'AND v.estate_id = $3' : ''}
      GROUP BY u.id, u.full_name, u.email
      ORDER BY approval_count DESC
      LIMIT 10
    `, estateParams);

    // 5. Daily visitor trends
    const dailyTrends = await dbManager.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_visitors,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE status = 'pending_approval') as pending
      FROM visitors
      WHERE created_at BETWEEN $1 AND $2
      ${estateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date
    `, estateParams);

    // 6. Walk-in vs pre-registered ratio
    const visitorTypes = await dbManager.query(`
      SELECT 
        COUNT(*) FILTER (WHERE created_by LIKE '%@%') as walk_ins,
        COUNT(*) FILTER (WHERE created_by NOT LIKE '%@%' OR created_by IS NULL) as pre_registered
      FROM visitors
      WHERE created_at BETWEEN $1 AND $2
      ${estateFilter}
    `, estateParams);

    respond(res, {
      data: {
        dateRange: { from, to },
        approvalStats: {
          avgApprovalTimeSeconds: parseFloat(approvalStats.rows[0]?.avg_approval_seconds) || 0,
          avgApprovalTimeMinutes: Math.round((parseFloat(approvalStats.rows[0]?.avg_approval_seconds) || 0) / 60),
          totalApproved: parseInt(approvalStats.rows[0]?.total_approved) || 0,
          totalRejected: parseInt(approvalStats.rows[0]?.total_rejected) || 0,
          totalRequests: parseInt(approvalStats.rows[0]?.total_approval_requests) || 0
        },
        visitsByHour: visitsByHour.rows.map(r => ({
          hour: parseInt(r.hour),
          count: parseInt(r.count)
        })),
        incidentsByCategory: incidentsByCategory.rows.map(r => ({
          category: r.category,
          severity: r.severity,
          count: parseInt(r.count)
        })),
        topResidents: topResidents.rows.map(r => ({
          name: r.full_name,
          email: r.email,
          approvals: parseInt(r.approval_count),
          rejections: parseInt(r.rejection_count)
        })),
        dailyTrends: dailyTrends.rows.map(r => ({
          date: r.date,
          total: parseInt(r.total_visitors),
          approved: parseInt(r.approved),
          rejected: parseInt(r.rejected),
          pending: parseInt(r.pending)
        })),
        visitorTypes: {
          walkIns: parseInt(visitorTypes.rows[0]?.walk_ins) || 0,
          preRegistered: parseInt(visitorTypes.rows[0]?.pre_registered) || 0
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching guard analytics:', error);
    respondError(res, 500, 'Failed to fetch analytics');
  }
};

export default {
  getGuardAnalytics
};
