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
    const { dateFrom, dateTo, siteId } = req.query;
    
    // Default to last 30 days if not specified
    const fromDate = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = dateTo || new Date().toISOString().split('T')[0];
    
    // Build site filter
    const siteFilter = siteId ? 'AND v.site_id = $3' : '';
    const params = siteId ? [fromDate, toDate, siteId] : [fromDate, toDate];
    
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
          COUNT(CASE WHEN checked_in_at IS NOT NULL THEN 1 END) as checked_in,
          COUNT(CASE WHEN checked_out_at IS NOT NULL THEN 1 END) as checked_out
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
          ${siteFilter}
      `, params)
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
    const { dateFrom, dateTo, groupBy = 'day', siteId } = req.query;
    
    const fromDate = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = dateTo || new Date().toISOString().split('T')[0];
    
    const siteFilter = siteId ? 'AND site_id = $3' : '';
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
        ${siteFilter.replace('site_id', 'v.site_id')}
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
    const { dateFrom, dateTo, siteId } = req.query;
    
    const fromDate = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = dateTo || new Date().toISOString().split('T')[0];
    
    const siteFilter = siteId ? 'AND site_id = $3' : '';
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
        ${siteFilter.replace('site_id', 'i.site_id')}
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
    const { dateFrom, dateTo, siteId } = req.query;
    
    const fromDate = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = dateTo || new Date().toISOString().split('T')[0];
    
    const siteFilter = siteId ? 'AND v.site_id = $3' : '';
    const params = siteId ? [fromDate, toDate, siteId] : [fromDate, toDate];
    
    // Check-in/check-out performance
    const performanceQuery = `
      SELECT 
        u.username as guard_name,
        COUNT(DISTINCT v.id) as visitors_processed,
        COUNT(CASE WHEN v.checked_in_at IS NOT NULL THEN 1 END) as check_ins,
        COUNT(CASE WHEN v.checked_out_at IS NOT NULL THEN 1 END) as check_outs,
        AVG(EXTRACT(EPOCH FROM (v.checked_in_at - v.created_at))/60)::INTEGER as avg_processing_time_minutes
      FROM visitors v
      LEFT JOIN users u ON v.checked_in_by = u.id
      WHERE v.date_of_visit BETWEEN $1 AND $2
        ${siteFilter}
        AND v.checked_in_at IS NOT NULL
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
        ${siteFilter.replace('v.site_id', 'i.site_id')}
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
    const { dateFrom, dateTo, siteId } = req.query;
    
    const fromDate = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = dateTo || new Date().toISOString().split('T')[0];
    
    const siteFilter = siteId ? 'AND v.site_id = $3' : '';
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

export default {
  getAnalyticsOverview,
  getVisitorMetrics,
  getIncidentMetrics,
  getGuardMetrics,
  getResidentMetrics
};
