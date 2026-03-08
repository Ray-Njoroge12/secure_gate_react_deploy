/**
 * @file adminAnalyticsController.js
 * @description Admin operations analytics and reporting
 * Phase A1: Admin Operations & Analytics Dashboard
 * 
 * Provides comprehensive metrics for:
 * - Visitor volume and trends
 * - Incident statistics
 * - Guard performance
 * - Resident activity
 * - System health
 */

import dbManager from '../database/db.enhanced.js';
import logger from '../config/logger.js';

/**
 * Get dashboard overview with key metrics
 * 
 * @route GET /api/admin/analytics/overview
 * @access Private (admin only)
 */
export const getAnalyticsOverview = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    // Fix: Admin Security Scoping
    // If authenticated user has an estate_id, force filtering by it.
    // Super admins (null estate_id) can optionally filter by siteId from query.
    let siteId = req.query.siteId;
    if (req.user.estate_id) {
      siteId = req.user.estate_id;
    }

    // Default to last 30 days if not specified
    const fromDate = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = dateTo || new Date().toISOString().split('T')[0];

    // Build site filter
    const siteFilter = siteId ? 'AND v.estate_id = $3' : '';
    const params = siteId ? [fromDate, toDate, siteId] : [fromDate, toDate];
    const todaySiteFilter = siteId ? 'AND v.estate_id = $1' : '';
    const todayParams = siteId ? [siteId] : [];

    // Parallel queries for all metrics
    const [
      visitorStats,
      incidentStats,
      approvalStats,
      todayStats
    ] = await Promise.all([
      // Visitor statistics
      dbManager.query(`
        SELECT 
          COUNT(*) as total_visitors,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
          COUNT(CASE WHEN status = 'pending_approval' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
          COUNT(CASE WHEN status = 'on_premise' THEN 1 END) as on_premise,
          COUNT(CASE WHEN check_in_time IS NOT NULL THEN 1 END) as checked_in,
          COUNT(CASE WHEN check_out_time IS NOT NULL THEN 1 END) as checked_out
        FROM visitors v
        WHERE v.date_of_visit BETWEEN $1 AND $2
          ${siteFilter}
      `, params),

      // Incident statistics
      dbManager.query(`
        SELECT 
          COUNT(*) as total_incidents,
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
          COUNT(CASE WHEN severity = 'high' THEN 1 END) as high,
          COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium,
          COUNT(CASE WHEN severity = 'low' THEN 1 END) as low,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_incidents,
          COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_incidents
        FROM incidents i
        WHERE i.created_at BETWEEN $1 AND $2
          ${siteFilter.replace('v.', 'i.')}
      `, params),

      // Approval time statistics
      dbManager.query(`
        SELECT 
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60)::INTEGER as avg_approval_time_minutes,
          MIN(EXTRACT(EPOCH FROM (updated_at - created_at))/60)::INTEGER as min_approval_time_minutes,
          MAX(EXTRACT(EPOCH FROM (updated_at - created_at))/60)::INTEGER as max_approval_time_minutes,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (updated_at - created_at))/60)::INTEGER as median_approval_time_minutes
        FROM visitors v
        WHERE v.status IN ('approved', 'rejected')
          AND v.created_at BETWEEN $1 AND $2
          ${siteFilter}
      `, params),

      // Today's statistics
      dbManager.query(`
        SELECT 
          COUNT(CASE WHEN v.date_of_visit = CURRENT_DATE THEN 1 END) as visitors_today,
          COUNT(CASE WHEN v.date_of_visit = CURRENT_DATE AND v.status = 'on_premise' THEN 1 END) as current_visitors,
          COUNT(CASE WHEN i.created_at::DATE = CURRENT_DATE THEN 1 END) as incidents_today
        FROM visitors v
        LEFT JOIN incidents i ON i.created_at::DATE = CURRENT_DATE
        WHERE v.date_of_visit >= CURRENT_DATE - INTERVAL '1 day'
          ${todaySiteFilter}
      `, todayParams)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        dateRange: { from: fromDate, to: toDate },
        visitors: visitorStats.rows[0],
        incidents: incidentStats.rows[0],
        approvals: approvalStats.rows[0],
        today: todayStats.rows[0]
      }
    });

  } catch (error) {
    logger.error('Failed to get analytics overview', { error: error.message });

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics overview'
    });
  }
};

/**
 * Get detailed visitor metrics with trends
 * 
 * @route GET /api/admin/analytics/visitors
 * @access Private (admin only)
 */
export const getVisitorMetrics = async (req, res) => {
  try {
    const { dateFrom, dateTo, groupBy = 'day' } = req.query;
    let siteId = req.query.siteId;

    // Fix: Admin Security Scoping
    if (req.user.estate_id) {
      siteId = req.user.estate_id;
    }

    const fromDate = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = dateTo || new Date().toISOString().split('T')[0];

    const siteFilter = siteId ? 'AND estate_id = $3' : '';
    const params = siteId ? [fromDate, toDate, siteId] : [fromDate, toDate];

    // Group by clause based on groupBy parameter
    let groupByClause;
    let dateFormat;
    switch (groupBy) {
      case 'hour':
        groupByClause = "DATE_TRUNC('hour', date_of_visit)";
        dateFormat = 'YYYY-MM-DD HH24:00';
        break;
      case 'week':
        groupByClause = "DATE_TRUNC('week', date_of_visit)";
        dateFormat = 'YYYY-"W"IW';
        break;
      case 'month':
        groupByClause = "DATE_TRUNC('month', date_of_visit)";
        dateFormat = 'YYYY-MM';
        break;
      default: // day
        groupByClause = "date_of_visit";
        dateFormat = 'YYYY-MM-DD';
    }

    // Visitor trends over time
    const trendsQuery = `
      SELECT 
        TO_CHAR(${groupByClause}, '${dateFormat}') as period,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'pending_approval' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
      FROM visitors
      WHERE date_of_visit BETWEEN $1 AND $2
        ${siteFilter}
      GROUP BY period
      ORDER BY period
    `;

    // Top residents by visitor count
    const topResidentsQuery = `
      SELECT 
        u.username as resident_name,
        u.email as resident_email,
        COUNT(v.id) as visitor_count,
        COUNT(CASE WHEN v.status = 'approved' THEN 1 END) as approved_count
      FROM visitors v
      JOIN users u ON v.resident_id = u.id
      WHERE v.date_of_visit BETWEEN $1 AND $2
        ${siteFilter.replace('estate_id', 'v.estate_id')}
      GROUP BY u.id, u.username, u.email
      ORDER BY visitor_count DESC
      LIMIT 10
    `;

    // Purpose distribution
    const purposeQuery = `
      SELECT 
        purpose,
        COUNT(*) as count
      FROM visitors
      WHERE date_of_visit BETWEEN $1 AND $2
        ${siteFilter}
      GROUP BY purpose
      ORDER BY count DESC
    `;

    // Peak hours (hour of day distribution)
    const peakHoursQuery = `
      SELECT 
        EXTRACT(HOUR FROM time_of_visit::TIME) as hour,
        COUNT(*) as count
      FROM visitors
      WHERE date_of_visit BETWEEN $1 AND $2
        AND time_of_visit IS NOT NULL
        ${siteFilter}
      GROUP BY hour
      ORDER BY hour
    `;

    const [trends, topResidents, purposes, peakHours] = await Promise.all([
      dbManager.query(trendsQuery, params),
      dbManager.query(topResidentsQuery, params),
      dbManager.query(purposeQuery, params),
      dbManager.query(peakHoursQuery, params)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        trends: trends.rows,
        topResidents: topResidents.rows,
        purposes: purposes.rows,
        peakHours: peakHours.rows
      }
    });

  } catch (error) {
    logger.error('Failed to get visitor metrics', { error: error.message });

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch visitor metrics'
    });
  }
};

/**
 * Get incident metrics and trends
 * 
 * @route GET /api/admin/analytics/incidents
 * @access Private (admin only)
 */
export const getIncidentMetrics = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    let siteId = req.query.siteId;

    // Fix: Admin Security Scoping
    if (req.user.estate_id) {
      siteId = req.user.estate_id;
    }

    const fromDate = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = dateTo || new Date().toISOString().split('T')[0];

    const siteFilter = siteId ? 'AND estate_id = $3' : '';
    const params = siteId ? [fromDate, toDate, siteId] : [fromDate, toDate];

    // Incident trends by day
    const trendsQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as high
      FROM incidents
      WHERE created_at BETWEEN $1 AND $2
        ${siteFilter}
      GROUP BY date
      ORDER BY date
    `;

    // Category distribution
    const categoryQuery = `
      SELECT 
        category,
        COUNT(*) as count,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count
      FROM incidents
      WHERE created_at BETWEEN $1 AND $2
        ${siteFilter}
      GROUP BY category
      ORDER BY count DESC
    `;

    // Resolution time stats
    const resolutionQuery = `
      SELECT 
        AVG(EXTRACT(EPOCH FROM (closed_at - created_at))/3600)::INTEGER as avg_resolution_hours,
        MIN(EXTRACT(EPOCH FROM (closed_at - created_at))/3600)::INTEGER as min_resolution_hours,
        MAX(EXTRACT(EPOCH FROM (closed_at - created_at))/3600)::INTEGER as max_resolution_hours
      FROM incidents
      WHERE status = 'closed'
        AND closed_at IS NOT NULL
        AND created_at BETWEEN $1 AND $2
        ${siteFilter}
    `;

    // Guard incident reporting
    const guardStatsQuery = `
      SELECT 
        u.username as guard_name,
        COUNT(i.id) as incidents_reported,
        COUNT(CASE WHEN i.severity IN ('critical', 'high') THEN 1 END) as high_severity_count
      FROM incidents i
      JOIN users u ON i.reported_by = u.id
      WHERE i.created_at BETWEEN $1 AND $2
        ${siteFilter.replace('estate_id', 'i.estate_id')}
      GROUP BY u.id, u.username
      ORDER BY incidents_reported DESC
      LIMIT 10
    `;

    const [trends, categories, resolution, guardStats] = await Promise.all([
      dbManager.query(trendsQuery, params),
      dbManager.query(categoryQuery, params),
      dbManager.query(resolutionQuery, params),
      dbManager.query(guardStatsQuery, params)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        trends: trends.rows,
        categories: categories.rows,
        resolution: resolution.rows[0] || {},
        guardStats: guardStats.rows
      }
    });

  } catch (error) {
    logger.error('Failed to get incident metrics', { error: error.message });

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch incident metrics'
    });
  }
};

/**
 * Get guard performance metrics
 * 
 * @route GET /api/admin/analytics/guards
 * @access Private (admin only)
 */
export const getGuardMetrics = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    let siteId = req.query.siteId;

    // Fix: Admin Security Scoping
    if (req.user.estate_id) {
      siteId = req.user.estate_id;
    }

    const fromDate = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = dateTo || new Date().toISOString().split('T')[0];

    const siteFilter = siteId ? 'AND v.estate_id = $3' : '';
    const params = siteId ? [fromDate, toDate, siteId] : [fromDate, toDate];

    // Check-in/check-out performance
    const performanceQuery = `
      SELECT 
        u.username as guard_name,
        COUNT(DISTINCT v.id) as visitors_processed,
        COUNT(CASE WHEN v.check_in_time IS NOT NULL THEN 1 END) as check_ins,
        COUNT(CASE WHEN v.check_out_time IS NOT NULL THEN 1 END) as check_outs,
        AVG(EXTRACT(EPOCH FROM (v.check_in_time - v.created_at))/60)::INTEGER as avg_processing_time_minutes
      FROM visitors v
      LEFT JOIN users u ON v.check_in_guard_id = u.id
      WHERE v.date_of_visit BETWEEN $1 AND $2
        ${siteFilter}
        AND v.check_in_time IS NOT NULL
      GROUP BY u.id, u.username
      ORDER BY visitors_processed DESC
    `;

    // Incident reporting by guard
    const incidentReportingQuery = `
      SELECT 
        u.username as guard_name,
        COUNT(i.id) as incidents_reported,
        COUNT(CASE WHEN i.severity IN ('critical', 'high') THEN 1 END) as critical_high_count,
        COUNT(CASE WHEN i.status = 'closed' THEN 1 END) as resolved_count
      FROM incidents i
      JOIN users u ON i.reported_by = u.id
      WHERE i.created_at BETWEEN $1 AND $2
        ${siteFilter.replace('v.estate_id', 'i.estate_id')}
      GROUP BY u.id, u.username
      ORDER BY incidents_reported DESC
    `;

    const [performance, incidentReporting] = await Promise.all([
      dbManager.query(performanceQuery, params),
      dbManager.query(incidentReportingQuery, params)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        performance: performance.rows,
        incidentReporting: incidentReporting.rows
      }
    });

  } catch (error) {
    logger.error('Failed to get guard metrics', { error: error.message });

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch guard metrics'
    });
  }
};

/**
 * Get resident activity metrics
 * 
 * @route GET /api/admin/analytics/residents
 * @access Private (admin only)
 */
export const getResidentMetrics = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    let siteId = req.query.siteId;

    // Fix: Admin Security Scoping
    if (req.user.estate_id) {
      siteId = req.user.estate_id;
    }

    const fromDate = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = dateTo || new Date().toISOString().split('T')[0];

    const siteFilter = siteId ? 'AND v.estate_id = $3' : '';
    const params = siteId ? [fromDate, toDate, siteId] : [fromDate, toDate];

    // Most active residents
    const activityQuery = `
      SELECT 
        u.username as resident_name,
        u.email as resident_email,
        COUNT(v.id) as total_visitors,
        COUNT(CASE WHEN v.status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN v.status = 'rejected' THEN 1 END) as rejected,
        AVG(EXTRACT(EPOCH FROM (v.updated_at - v.created_at))/60)::INTEGER as avg_approval_time_minutes
      FROM visitors v
      JOIN users u ON v.resident_id = u.id
      WHERE v.date_of_visit BETWEEN $1 AND $2
        ${siteFilter}
      GROUP BY u.id, u.username, u.email
      ORDER BY total_visitors DESC
      LIMIT 20
    `;

    const activity = await dbManager.query(activityQuery, params);

    return res.status(200).json({
      success: true,
      data: {
        activity: activity.rows
      }
    });

  } catch (error) {
    logger.error('Failed to get resident metrics', { error: error.message });

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch resident metrics'
    });
  }
};


/**
 * Get activity summary stats
 * 
 * @route GET /api/admin/analytics/activity/summary
 * @access Private (admin only)
 */
export const getActivitySummary = async (req, res) => {
  try {
    let siteId = req.query.siteId;
    if (req.user.estate_id) {
      siteId = req.user.estate_id;
    }

    const siteFilter = siteId ? 'AND estate_id = $1' : '';
    const params = siteId ? [siteId] : [];

    // Parallel queries for summary cards
    const [stats] = await Promise.all([
      dbManager.query(`
        SELECT
          (SELECT COUNT(*) FROM audit_logs WHERE created_at >= NOW() - INTERVAL '24 hours' ${siteFilter}) as last_24h,
          (SELECT COUNT(*) FROM audit_logs WHERE created_at >= NOW() - INTERVAL '7 days' ${siteFilter}) as last_7d,
          (SELECT COUNT(*) FROM visitors WHERE status = 'pending_approval' ${siteFilter}) as pending_approvals,
          (SELECT COUNT(*) FROM visitors WHERE date_of_visit = CURRENT_DATE ${siteFilter}) as visitors_today
      `, params)
    ]);

    const result = stats.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        last24h: parseInt(result.last_24h, 10),
        last7d: parseInt(result.last_7d, 10),
        pendingApprovals: parseInt(result.pending_approvals, 10),
        visitorsToday: parseInt(result.visitors_today, 10)
      }
    });
  } catch (error) {
    logger.error('Failed to get activity summary', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch activity summary' });
  }
};

/**
 * Get activity feed (recent actions)
 * 
 * @route GET /api/admin/analytics/activity/feed
 * @access Private (admin only)
 */
export const getActivityFeed = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    let siteId = req.query.siteId;
    if (req.user.estate_id) {
      siteId = req.user.estate_id;
    }

    let query = `
      SELECT 
        a.id, 
        a.action, 
        a.message, 
        a.resource, 
        a.outcome, 
        a.ip_address, 
        a.created_at as timestamp,
        u.username,
        u.role
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (siteId) {
      query += ` AND a.estate_id = $${paramIndex++}`;
      params.push(siteId);
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit, 10));

    const result = await dbManager.query(query, params);

    // Post-process for privacy
    const sanitizedRows = result.rows.map(row => {
      // Mask IP address (keep first 2 octets)
      let maskedIp = row.ip_address;
      if (row.ip_address && row.ip_address.includes('.')) {
        const parts = row.ip_address.split('.');
        if (parts.length === 4) {
          maskedIp = `${parts[0]}.${parts[1]}.***.***`;
        }
      }

      // Anonymize Resident names
      let displayName = row.username;
      if (row.role === 'resident') {
        displayName = 'Resident';
      }

      return {
        ...row,
        ip_address: maskedIp,
        username: displayName,
        // Remove role from output if not needed by frontend, or keep it
        role: undefined
      };
    });

    return res.status(200).json({
      success: true,
      data: sanitizedRows
    });
  } catch (error) {
    logger.error('Failed to get activity feed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch activity feed' });
  }
};

/**
 * Get activity trends
 * 
 * @route GET /api/admin/analytics/activity/trends
 * @access Private (admin only)
 */
export const getActivityTrends = async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    let siteId = req.query.siteId;
    if (req.user.estate_id) {
      siteId = req.user.estate_id;
    }

    let interval = '7 days';
    if (period === '30d') interval = '30 days';
    if (period === '90d') interval = '90 days';

    const params = siteId ? [interval, siteId] : [interval];
    const siteFilter = siteId ? 'AND a.estate_id = $2' : '';

    // Action Breakdown
    const actionQuery = `
      SELECT action, COUNT(*) as count
      FROM audit_logs a
      WHERE created_at >= NOW() - $1::INTERVAL
      ${siteFilter}
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `;

    // Active Users (Exclude Residents for Privacy)
    const userQuery = `
      SELECT u.username, COUNT(*) as activity_count
      FROM audit_logs a
      JOIN users u ON a.user_id = u.id
      WHERE a.created_at >= NOW() - $1::INTERVAL
      AND u.role != 'resident'
      ${siteFilter.replace('a.estate_id', 'a.estate_id')}
      GROUP BY u.username
      ORDER BY activity_count DESC
      LIMIT 10
    `;

    const [actions, users] = await Promise.all([
      dbManager.query(actionQuery, params),
      dbManager.query(userQuery, params)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        actionBreakdown: actions.rows,
        activeUsers: users.rows
      }
    });

  } catch (error) {
    logger.error('Failed to get activity trends', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch activity trends' });
  }
};

/**
 * Get activity anomalies
 * 
 * @route GET /api/admin/analytics/activity/anomalies
 * @access Private (admin only)
 */
export const getActivityAnomalies = async (req, res) => {
  try {
    let siteId = req.query.siteId;
    if (req.user.estate_id) {
      siteId = req.user.estate_id;
    }

    const params = siteId ? [siteId] : [];
    const siteFilter = siteId ? 'AND estate_id = $1' : '';

    const query = `
      SELECT 
        'security_alert' as type,
        details as message,
        created_at as timestamp
      FROM audit_logs
      WHERE outcome = 'fail' 
      AND created_at >= NOW() - INTERVAL '24 hours'
      ${siteFilter}
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const result = await dbManager.query(query, params);

    return res.status(200).json({
      success: true,
      data: {
        anomalies: result.rows
      }
    });
  } catch (error) {
    logger.error('Failed to get activity anomalies', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch anomalies' });
  }
};

export default {
  getAnalyticsOverview,
  getVisitorMetrics,
  getIncidentMetrics,
  getGuardMetrics,
  getResidentMetrics,
  getActivitySummary,
  getActivityFeed,
  getActivityTrends,
  getActivityAnomalies
};
