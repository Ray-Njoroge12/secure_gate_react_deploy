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
    const estateId = req.user.estate_id || null;

    // Insert incident
    const query = `
      INSERT INTO incidents (
        guard_id,
        reported_by,
        visitor_id,
        category,
        severity,
        description,
        estate_id,
        site_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, guard_id, reported_by, visitor_id, category, severity, description, estate_id, site_id, created_at, updated_at
    `;

    const result = await dbManager.query(query, [
      req.user.id,
      req.user.id,
      visitorId || null,
      category,
      incidentSeverity,
      sanitizedDescription,
      estateId,
      estateId
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

    logger.info('Incident created', {
      incidentId: incident.id,
      guardId: req.user.id,
      role: req.user.role
    });

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
        u.username as guard_name,
        u.email as guard_email,
        v.name as visitor_name,
        v.phone as visitor_phone,
        r.username as resolved_by_name
      FROM incidents i
      LEFT JOIN users u ON i.guard_id = u.id
      LEFT JOIN visitors v ON i.visitor_id = v.id
      LEFT JOIN users r ON i.resolved_by = r.id
      WHERE 1=1
    `;

    const params = [];
    const filters = [];
    let paramIndex = 1;

    // Fix: G-003 Incident Retrieval Leak (Strictly Filter by estate)
    // Guards and Estate Admins MUST be scoped.
    const estateId = req.user.estate_id;
    if (estateId) {
      filters.push(`i.estate_id = $${paramIndex}`);
      params.push(estateId);
      paramIndex++;
    } else {
      // If no estate_id (e.g. super admin?), current logic allowed all.
      // Secure default: If not super-admin/special role, fail or return empty?
      // Assuming req.user.role checked above.
      // Ideally we force scope if role is 'guard'.
      if (req.user.role === 'guard') {
        return respondError(res, 403, 'Guard has no estate context');
      }
    }

    // Date filters
    if (fromDate) {
      filters.push(`i.created_at >= $${paramIndex}::date`);
      params.push(fromDate);
      paramIndex++;
    }

    if (toDate) {
      filters.push(`i.created_at <= $${paramIndex}::date + INTERVAL '1 day'`);
      params.push(toDate);
      paramIndex++;
    }

    // Category filter
    if (category) {
      filters.push(`i.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    // Severity filter
    if (severity) {
      filters.push(`i.severity = $${paramIndex}`);
      params.push(severity);
      paramIndex++;
    }

    // Resolved filter
    if (resolved === 'true') {
      filters.push('i.resolved_at IS NOT NULL');
    } else if (resolved === 'false') {
      filters.push('i.resolved_at IS NULL');
    }

    const whereClause = filters.length ? ` AND ${filters.join(' AND ')}` : '';
    query += whereClause;

    // Order by most recent first
    query += ` ORDER BY i.created_at DESC`;

    // Pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await dbManager.query(query, params);

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM incidents i WHERE 1=1${whereClause}`;
    const countParams = params.slice(0, -2);
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
    // Auth check: guard/admin only
    if (!req.user || !req.user.email) {
      return respondError(res, 401, 'Unauthorized');
    }
    if (req.user.role !== 'guard' && req.user.role !== 'admin') {
      return respondError(res, 403, 'Forbidden - guards/admins only');
    }

    const { id } = req.params;
    const { resolution } = req.body;

    if (!resolution || typeof resolution !== 'string' || !resolution.trim()) {
      return respondError(res, 400, 'Resolution description is required');
    }

    // Fetch incident to check ownership and estate
    const incidentQuery = await dbManager.query(
      'SELECT id, guard_id, estate_id, category, severity FROM incidents WHERE id = $1',
      [id]
    );

    if (incidentQuery.rows.length === 0) {
      return respondError(res, 404, 'Incident not found');
    }

    const incident = incidentQuery.rows[0];

    // Estate isolation check
    if (req.user.estate_id && incident.estate_id !== req.user.estate_id) {
      await req.audit?.('incident.resolve', 'incident', id, {
        outcome: 'fail',
        message: 'Cross-estate incident access denied',
        attemptedEstateId: req.user.estate_id,
        incidentEstateId: incident.estate_id
      });
      return respondError(res, 403, 'Forbidden - incident belongs to different estate');
    }

    // Ownership check for guards: they can only resolve THEIR OWN incidents
    if (req.user.role === 'guard') {
      if (incident.guard_id !== req.user.id) {
        await req.audit?.('incident.resolve', 'incident', id, {
          outcome: 'fail',
          message: 'Guard attempted to resolve another guard\'s incident',
          guardId: req.user.id,
          incidentGuardId: incident.guard_id
        });
        return respondError(res, 403, 'Forbidden - guards can only resolve their own incidents');
      }
    }

    // Admin can resolve any incident (no additional check needed)

    // Update incident with resolution
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
      message: `Incident resolved by ${req.user.role}`,
      resolvedBy: req.user.id,
      role: req.user.role
    });

    logger.info('Incident resolved', {
      incidentId: id,
      resolvedBy: req.user.id,
      role: req.user.role
    });

    respond(res, {
      message: 'Incident resolved',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error resolving incident:', {
      error: error.message,
      stack: error.stack,
      incidentId: req.params.id,
      userId: req.user?.id,
      userRole: req.user?.role,
      estateId: req.user?.estate_id,
      sqlState: error.code,
      sqlMessage: error.message
    });
    await req.audit?.('incident.resolve', 'incident', req.params.id, {
      outcome: 'fail',
      message: 'Failed to resolve incident',
      error: error.message,
      errorCode: error.code
    });
    respondError(res, 500, 'Failed to resolve incident');
  }
};

export default {
  createIncident,
  getIncidents,
  resolveIncident
};
