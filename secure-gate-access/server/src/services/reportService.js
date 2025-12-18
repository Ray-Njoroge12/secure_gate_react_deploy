/**
 * @file reportService.js
 * @description Report generation service (PDF and CSV)
 * Generates reports for analytics, visitors, incidents, etc.
 */

import PDFDocument from 'pdfkit';
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
import path from 'path';
import { dbManager as db } from '../database/db.enhanced.js'; // Migrated from database-wrapper
import logger from '../config/logger.js';

const pool = db.pool || db;

/**
 * Generate report based on configuration
 * @param {object} reportConfig - Report configuration
 * @returns {Promise<string>} File path of generated report
 */
export async function generateReport(reportConfig) {
  try {
    // Fetch report data
    const data = await fetchReportData(reportConfig);

    // Generate based on format
    if (reportConfig.format === 'pdf') {
      return await generatePDF(data, reportConfig);
    } else if (reportConfig.format === 'csv') {
      return await generateCSV(data, reportConfig);
    } else {
      throw new Error(`Unsupported format: ${reportConfig.format}`);
    }
  } catch (error) {
    logger.error('Error generating report:', error);
    throw error;
  }
}

/**
 * Fetch report data based on type
 */
async function fetchReportData(config) {
  const { type, dateFrom, dateTo, siteId } = config;

  switch (type) {
    case 'visitor_summary':
      return await fetchVisitorSummaryData(dateFrom, dateTo, siteId);

    case 'incident_summary':
      return await fetchIncidentSummaryData(dateFrom, dateTo, siteId);

    case 'guard_performance':
      return await fetchGuardPerformanceData(dateFrom, dateTo, siteId);

    case 'resident_activity':
      return await fetchResidentActivityData(dateFrom, dateTo, siteId);

    default:
      throw new Error(`Unknown report type: ${type}`);
  }
}

/**
 * Fetch visitor summary data
 */
async function fetchVisitorSummaryData(dateFrom, dateTo, siteId) {
  const query = `
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as total_visitors,
      COUNT(*) FILTER (WHERE status = 'approved') as approved,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
      COUNT(*) FILTER (WHERE checked_in_at IS NOT NULL) as checked_in,
      AVG(EXTRACT(EPOCH FROM (approved_at - created_at))/60) FILTER (WHERE approved_at IS NOT NULL) as avg_approval_time_minutes
    FROM visitors
    WHERE created_at BETWEEN $1 AND $2
      AND ($3::INTEGER IS NULL OR site_id = $3)
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at)
  `;

  const result = await pool.query(query, [dateFrom, dateTo, siteId]);
  return {
    type: 'visitor_summary',
    period: { from: dateFrom, to: dateTo },
    data: result.rows
  };
}

/**
 * Fetch incident summary data
 */
async function fetchIncidentSummaryData(dateFrom, dateTo, siteId) {
  const query = `
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as total_incidents,
      COUNT(*) FILTER (WHERE severity = 'critical') as critical,
      COUNT(*) FILTER (WHERE severity = 'high') as high,
      COUNT(*) FILTER (WHERE severity = 'medium') as medium,
      COUNT(*) FILTER (WHERE severity = 'low') as low,
      COUNT(*) FILTER (WHERE status = 'closed') as closed,
      AVG(EXTRACT(EPOCH FROM (closed_at - created_at))/60) FILTER (WHERE closed_at IS NOT NULL) as avg_resolution_time_minutes
    FROM incidents
    WHERE created_at BETWEEN $1 AND $2
      AND ($3::INTEGER IS NULL OR site_id = $3)
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at)
  `;

  const result = await pool.query(query, [dateFrom, dateTo, siteId]);
  return {
    type: 'incident_summary',
    period: { from: dateFrom, to: dateTo },
    data: result.rows
  };
}

/**
 * Fetch guard performance data
 */
async function fetchGuardPerformanceData(dateFrom, dateTo, siteId) {
  const query = `
    SELECT 
      u.name as guard_name,
      COUNT(DISTINCT v.id) as visitors_processed,
      COUNT(DISTINCT v.id) FILTER (WHERE v.checked_in_at IS NOT NULL) as check_ins,
      COUNT(DISTINCT v.id) FILTER (WHERE v.checked_out_at IS NOT NULL) as check_outs,
      AVG(EXTRACT(EPOCH FROM (v.checked_in_at - v.approved_at))/60) FILTER (WHERE v.checked_in_at IS NOT NULL) as avg_processing_time_minutes
    FROM users u
    LEFT JOIN visitors v ON v.approved_by = u.id
    WHERE u.role = 'guard'
      AND v.created_at BETWEEN $1 AND $2
      AND ($3::INTEGER IS NULL OR u.site_id = $3)
    GROUP BY u.id, u.name
    ORDER BY visitors_processed DESC
  `;

  const result = await pool.query(query, [dateFrom, dateTo, siteId]);
  return {
    type: 'guard_performance',
    period: { from: dateFrom, to: dateTo },
    data: result.rows
  };
}

/**
 * Fetch resident activity data
 */
async function fetchResidentActivityData(dateFrom, dateTo, siteId) {
  const query = `
    SELECT 
      u.name as resident_name,
      u.email as resident_email,
      COUNT(v.id) as total_visitors,
      COUNT(v.id) FILTER (WHERE v.status = 'approved') as approved_visitors,
      COUNT(v.id) FILTER (WHERE v.checked_in_at IS NOT NULL) as visitors_checked_in
    FROM users u
    LEFT JOIN visitors v ON v.resident_id = u.id
    WHERE u.role = 'resident'
      AND v.created_at BETWEEN $1 AND $2
      AND ($3::INTEGER IS NULL OR u.site_id = $3)
    GROUP BY u.id, u.name, u.email
    HAVING COUNT(v.id) > 0
    ORDER BY total_visitors DESC
    LIMIT 50
  `;

  const result = await pool.query(query, [dateFrom, dateTo, siteId]);
  return {
    type: 'resident_activity',
    period: { from: dateFrom, to: dateTo },
    data: result.rows
  };
}

/**
 * Generate PDF report
 */
async function generatePDF(reportData, config) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `report-${Date.now()}.pdf`;
      const filePath = path.join(process.cwd(), 'reports', fileName);

      // Ensure reports directory exists
      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc
        .fontSize(24)
        .fillColor('#667eea')
        .text(config.title || 'Secure Gate Report', { align: 'center' })
        .moveDown();

      // Period
      doc
        .fontSize(12)
        .fillColor('#666')
        .text(`Period: ${new Date(reportData.period.from).toLocaleDateString()} - ${new Date(reportData.period.to).toLocaleDateString()}`, { align: 'center' })
        .moveDown(2);

      // Content based on report type
      doc.fontSize(10).fillColor('#000');

      if (reportData.type === 'visitor_summary') {
        addVisitorSummaryToPDF(doc, reportData.data);
      } else if (reportData.type === 'incident_summary') {
        addIncidentSummaryToPDF(doc, reportData.data);
      } else if (reportData.type === 'guard_performance') {
        addGuardPerformanceToPDF(doc, reportData.data);
      } else if (reportData.type === 'resident_activity') {
        addResidentActivityToPDF(doc, reportData.data);
      }

      // Footer
      doc
        .moveDown(3)
        .fontSize(8)
        .fillColor('#999')
        .text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        logger.info(`PDF report generated: ${filePath}`);
        resolve(filePath);
      });

      stream.on('error', reject);

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Add visitor summary to PDF
 */
function addVisitorSummaryToPDF(doc, data) {
  doc.fontSize(16).text('Visitor Summary', { underline: true }).moveDown();

  // Summary statistics
  const totals = data.reduce((acc, row) => ({
    total_visitors: acc.total_visitors + parseInt(row.total_visitors || 0),
    approved: acc.approved + parseInt(row.approved || 0),
    pending: acc.pending + parseInt(row.pending || 0),
    rejected: acc.rejected + parseInt(row.rejected || 0)
  }), { total_visitors: 0, approved: 0, pending: 0, rejected: 0 });

  doc.fontSize(12)
    .text(`Total Visitors: ${totals.total_visitors}`)
    .text(`Approved: ${totals.approved}`)
    .text(`Pending: ${totals.pending}`)
    .text(`Rejected: ${totals.rejected}`)
    .moveDown(2);

  // Daily breakdown
  doc.fontSize(14).text('Daily Breakdown', { underline: true }).moveDown();

  data.forEach(row => {
    doc.fontSize(10)
      .text(`${new Date(row.date).toLocaleDateString()}: ${row.total_visitors} visitors (${row.approved} approved)`)
      .moveDown(0.5);
  });
}

/**
 * Add incident summary to PDF
 */
function addIncidentSummaryToPDF(doc, data) {
  doc.fontSize(16).text('Incident Summary', { underline: true }).moveDown();

  const totals = data.reduce((acc, row) => ({
    total_incidents: acc.total_incidents + parseInt(row.total_incidents || 0),
    critical: acc.critical + parseInt(row.critical || 0),
    high: acc.high + parseInt(row.high || 0),
    closed: acc.closed + parseInt(row.closed || 0)
  }), { total_incidents: 0, critical: 0, high: 0, closed: 0 });

  doc.fontSize(12)
    .text(`Total Incidents: ${totals.total_incidents}`)
    .text(`Critical: ${totals.critical}`)
    .text(`High Priority: ${totals.high}`)
    .text(`Resolved: ${totals.closed}`)
    .moveDown();
}

/**
 * Add guard performance to PDF
 */
function addGuardPerformanceToPDF(doc, data) {
  doc.fontSize(16).text('Guard Performance', { underline: true }).moveDown();

  data.forEach(guard => {
    doc.fontSize(10)
      .text(`${guard.guard_name}: ${guard.visitors_processed} visitors processed`)
      .moveDown(0.5);
  });
}

/**
 * Add resident activity to PDF
 */
function addResidentActivityToPDF(doc, data) {
  doc.fontSize(16).text('Top Residents by Visitor Volume', { underline: true }).moveDown();

  data.forEach((resident, index) => {
    doc.fontSize(10)
      .text(`${index + 1}. ${resident.resident_name}: ${resident.total_visitors} visitors`)
      .moveDown(0.5);
  });
}

/**
 * Generate CSV report
 */
async function generateCSV(reportData, config) {
  try {
    const fileName = `report-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), 'reports', fileName);

    // Ensure reports directory exists
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    // Determine headers based on report type
    const headers = getCSVHeaders(reportData.type);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: headers
    });

    await csvWriter.writeRecords(reportData.data);

    logger.info(`CSV report generated: ${filePath}`);
    return filePath;

  } catch (error) {
    logger.error('Error generating CSV:', error);
    throw error;
  }
}

/**
 * Get CSV headers based on report type
 */
function getCSVHeaders(type) {
  const headers = {
    visitor_summary: [
      { id: 'date', title: 'Date' },
      { id: 'total_visitors', title: 'Total Visitors' },
      { id: 'approved', title: 'Approved' },
      { id: 'pending', title: 'Pending' },
      { id: 'rejected', title: 'Rejected' },
      { id: 'checked_in', title: 'Checked In' },
      { id: 'avg_approval_time_minutes', title: 'Avg Approval Time (min)' }
    ],
    incident_summary: [
      { id: 'date', title: 'Date' },
      { id: 'total_incidents', title: 'Total Incidents' },
      { id: 'critical', title: 'Critical' },
      { id: 'high', title: 'High' },
      { id: 'medium', title: 'Medium' },
      { id: 'low', title: 'Low' },
      { id: 'closed', title: 'Closed' },
      { id: 'avg_resolution_time_minutes', title: 'Avg Resolution Time (min)' }
    ],
    guard_performance: [
      { id: 'guard_name', title: 'Guard Name' },
      { id: 'visitors_processed', title: 'Visitors Processed' },
      { id: 'check_ins', title: 'Check-ins' },
      { id: 'check_outs', title: 'Check-outs' },
      { id: 'avg_processing_time_minutes', title: 'Avg Processing Time (min)' }
    ],
    resident_activity: [
      { id: 'resident_name', title: 'Resident Name' },
      { id: 'resident_email', title: 'Email' },
      { id: 'total_visitors', title: 'Total Visitors' },
      { id: 'approved_visitors', title: 'Approved' },
      { id: 'visitors_checked_in', title: 'Checked In' }
    ]
  };

  return headers[type] || [];
}

/**
 * Schedule report generation
 */
export async function scheduleReport(reportConfig) {
  try {
    // Save to scheduled_reports table
    const result = await pool.query(
      `INSERT INTO scheduled_reports (
        name, report_type, schedule, format, config,
        recipients, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        reportConfig.name,
        reportConfig.type,
        reportConfig.schedule,
        reportConfig.format,
        reportConfig.config,
        reportConfig.recipients,
        reportConfig.createdBy
      ]
    );

    logger.info(`Report scheduled: ${result.rows[0].id}`);
    return result.rows[0].id;

  } catch (error) {
    logger.error('Error scheduling report:', error);
    throw error;
  }
}

export default {
  generateReport,
  scheduleReport
};
