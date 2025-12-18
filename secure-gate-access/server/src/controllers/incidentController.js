/**
 * @file incidentController.js
 * @description Phase G4 - Incident reporting controller
 * Handles guard incident logging and management
 */

import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError } from '../utils/respond.js';
import logger from '../config/logger.js';

/**
 * Create a new incident report
 * POST /api/incidents
 */
export const createIncident = async (req, res) => {
  try {
    // Auth check: guard, admin only
    if (!req.user || !req.user.email) {
      return respondError(res, 401, 'Unauthorized');
    }
    if (req.user.role !== 'guard' && req.user.role !== 'admin') {
      await req.audit?.('incident.create', 'incident', null, {
        outcome: 'fail',
        message: 'Forbidden: only guards and admins can log incidents'
      });
      return respondError(res, 403, 'Forbidden - guards/admins only');
    }

    const { visitorId, category, severity, description } = req.body;

    // Validation
    if (!category || typeof category !== 'string') {
      return respondError(res, 400, 'Category is required');
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return respondError(res, 400, 'Description is required');
    }

    const validCategories = ['suspicious', 'document_issue', 'vehicle', 'behavior', 'system_error', 'other'];
    if (!validCategories.includes(category)) {
      return respondError(res, 400, `Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    const incidentSeverity = severity || 'medium';
    if (!validSeverities.includes(incidentSeverity)) {
      return respondError(res, 400, `Invalid severity. Must be one of: ${validSeverities.join(', ')}`);
    }

    // Sanitize inputs
    const sanitizedDescription = description.trim();

    // Insert incident
    const query = `
      INSERT INTO incidents (
        guard_id,
        visitor_id,
        category,
        severity,
        description
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, guard_id, visitor_id, category, severity, description, created_at, updated_at
    `;

    const result = await dbManager.query(query, [
      req.user.id,
      visitorId || null,
      category,
      incidentSeverity,
      sanitizedDescription
    ]);

    const incident = result.rows[0];

    // Audit log
    await req.audit?.('incident.create', 'incident', String(incident.id), {
      outcome: 'success',
      message: 'Incident logged by guard',
      category,
      severity: incidentSeverity,
      visitorId: visitorId || 'none',
      guardId: req.user.id
    });

    logger.info(`Incident ${incident.id} created by guard ${req.user.id} (${req.user.email})`);

    respond(res, {
      message: 'Incident logged successfully',
      data: incident
    });

  } catch (error) {
    logger.error('Error creating incident:', error);
    await req.audit?.('incident.create', 'incident', null, {
      outcome: 'fail',
      message: 'Failed to create incident',
      error: error.message
    });
    respondError(res, 500, 'Failed to log incident');
  }
};

/**
 * Get incidents with filtering
 * GET /api/incidents?fromDate=...&toDate=...&category=...&severity=...
 */
export const getIncidents = async (req, res) => {
  try {
    // Auth check
    if (!req.user || !req.user.email) {
      return respondError(res, 401, 'Unauthorized');
    }
    if (req.user.role !== 'guard' && req.user.role !== 'admin') {
      return respondError(res, 403, 'Forbidden');
    }

    const { fromDate, toDate, category, severity, resolved, limit = 100, offset = 0 } = req.query;

    // Build dynamic query
    let query = `
      SELECT 
        i.*,
        u.full_name as guard_name,
        u.email as guard_email,
        v.name as visitor_name,
        v.phone as visitor_phone,
        r.full_name as resolved_by_name
      FROM incidents i
      LEFT JOIN users u ON i.guard_id = u.id
      LEFT JOIN visitors v ON i.visitor_id = v.id
      LEFT JOIN users r ON i.resolved_by = r.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Date filters
    if (fromDate) {
      query += ` AND i.created_at >= $${paramIndex}::date`;
      params.push(fromDate);
      paramIndex++;
    }

    if (toDate) {
      query += ` AND i.created_at <= $${paramIndex}::date + INTERVAL '1 day'`;
      params.push(toDate);
      paramIndex++;
    }

    // Category filter
    if (category) {
      query += ` AND i.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Severity filter
    if (severity) {
      query += ` AND i.severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    // Resolved filter
    if (resolved === 'true') {
      query += ` AND i.resolved_at IS NOT NULL`;
    } else if (resolved === 'false') {
      query += ` AND i.resolved_at IS NULL`;
    }

    // Order by most recent first
    query += ` ORDER BY i.created_at DESC`;

    // Pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await dbManager.query(query, params);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM incidents i WHERE 1=1`;
    const countParams = params.slice(0, -2); // Exclude limit/offset
    let countParamIndex = 1;

    if (fromDate) {
      countQuery += ` AND i.created_at >= $${countParamIndex}::date`;
      countParamIndex++;
    }
    if (toDate) {
      countQuery += ` AND i.created_at <= $${countParamIndex}::date + INTERVAL '1 day'`;
      countParamIndex++;
    }
    if (category) {
      countQuery += ` AND i.category = $${countParamIndex}`;
      countParamIndex++;
    }
    if (severity) {
      countQuery += ` AND i.severity = $${countParamIndex}`;
      countParamIndex++;
    }
    if (resolved === 'true') {
      countQuery += ` AND i.resolved_at IS NOT NULL`;
    } else if (resolved === 'false') {
      countQuery += ` AND i.resolved_at IS NULL`;
    }

    const countResult = await dbManager.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count, 10);

    respond(res, {
      data: result.rows,
      pagination: {
        total,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });

  } catch (error) {
    logger.error('Error fetching incidents:', error);
    respondError(res, 500, 'Failed to fetch incidents');
  }
};

/**
 * Resolve an incident
 * PUT /api/incidents/:id/resolve
 */
export const resolveIncident = async (req, res) => {
  try {
    // Auth check: admin only
    if (!req.user || !req.user.email) {
      return respondError(res, 401, 'Unauthorized');
    }
    if (req.user.role !== 'admin') {
      return respondError(res, 403, 'Forbidden - admins only');
    }

    const { id } = req.params;
    const { resolution } = req.body;

    if (!resolution || typeof resolution !== 'string' || !resolution.trim()) {
      return respondError(res, 400, 'Resolution description is required');
    }

    const query = `
      UPDATE incidents
      SET 
        resolution = $1,
        resolved_at = NOW(),
        resolved_by = $2
      WHERE id = $3
      RETURNING *
    `;

    const result = await dbManager.query(query, [
      resolution.trim(),
      req.user.id,
      id
    ]);

    if (result.rows.length === 0) {
      return respondError(res, 404, 'Incident not found');
    }

    await req.audit?.('incident.resolve', 'incident', id, {
      outcome: 'success',
      message: 'Incident resolved by admin',
      adminId: req.user.id
    });

    respond(res, {
      message: 'Incident resolved',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error resolving incident:', error);
    respondError(res, 500, 'Failed to resolve incident');
  }
};

export default {
  createIncident,
  getIncidents,
  resolveIncident
};
