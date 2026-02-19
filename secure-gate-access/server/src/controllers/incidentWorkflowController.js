/**
 * @file incidentWorkflowController.js
 * @description Incident workflow management API endpoints
 * Phase A4: Incident Workflow & Escalations
 */

import { dbManager as db } from '../database/db.enhanced.js'; // Migrated from database-wrapper
import logger from '../config/logger.js';
import { evaluateAutomationRules } from '../services/automationService.js';
import webhookService from '../services/webhookService.js';

const pool = db.pool || db;

const getEstateId = (req) => {
  // Super admins can provide estate_id in body or query to manage different estates
  if (req?.user?.role === 'super_admin' || req?.user?.role === 'system_admin') {
    const providedId = req.body?.estate_id || req.query?.estate_id || req.user?.estate_id;
    const parsedId = Number(providedId);
    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  }
  const estateId = Number(req?.user?.estate_id);
  return Number.isInteger(estateId) && estateId > 0 ? estateId : null;
};

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const ensureIncidentInEstate = async (incidentId, estateId) => {
  const incident = await pool.query(
    `SELECT id
     FROM incidents
     WHERE id = $1 AND estate_id = $2`,
    [incidentId, estateId]
  );

  return incident.rows.length > 0;
};

const ensureUserInEstate = async (userId, estateId) => {
  const user = await pool.query(
    `SELECT id
     FROM users
     WHERE id = $1 AND estate_id = $2 AND account_status != 'deleted'`,
    [userId, estateId]
  );

  return user.rows.length > 0;
};

/**
 * Get incident queue with filtering
 */
export const getIncidentQueue = async (req, res) => {
  try {
    const { severity, assignedToMe, unassigned, slaBreached } = req.query;
    const userId = req.user.id;
    const estateId = getEstateId(req);

    // SECURITY: Require estate context
    if (!estateId) {
      return res.status(400).json({ error: 'Estate context required' });
    }

    let query = `
      SELECT i.*, 
        u.username as assigned_name,
        reporter.username as reported_by_name,
        sla.response_sla_met,
        sla.resolution_sla_met,
        CASE 
          WHEN sla.resolution_sla_met = FALSE THEN 
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - i.created_at))/60 - sla.resolution_sla_minutes
          ELSE 0
        END as overdue_minutes
      FROM incidents i
      LEFT JOIN users u ON i.assigned_to = u.id
      LEFT JOIN users reporter ON i.reported_by = reporter.id
      LEFT JOIN incident_sla_tracking sla ON i.id = sla.incident_id
      WHERE i.status != 'closed' AND i.estate_id = $1
    `;

    const params = [estateId];
    let paramIndex = 2;

    if (severity) {
      query += ` AND i.severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    if (assignedToMe === 'true') {
      query += ` AND i.assigned_to = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (unassigned === 'true') {
      query += ` AND i.assigned_to IS NULL`;
    }

    if (req.query.status && req.query.status !== 'all') {
      // Map 'assigned' tab to 'under_review' status if needed, 
      // but better to just support the status directly if passed.
      const statusFilter = req.query.status === 'assigned' ? 'under_review' : req.query.status;
      query += ` AND i.status = $${paramIndex}`;
      params.push(statusFilter);
      paramIndex++;
    }

    if (slaBreached === 'true') {
      query += ` AND sla.resolution_sla_met = FALSE`;
    }

    query += ` ORDER BY i.priority ASC, i.created_at ASC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching incident queue:', error);
    res.status(500).json({ error: 'Failed to fetch incident queue' });
  }
};

/**
 * Get incident statistics
 */
export const getIncidentStats = async (req, res) => {
  try {
    const estateId = getEstateId(req);

    // SECURITY: Require estate context
    if (!estateId) {
      return res.status(400).json({ error: 'Estate context required' });
    }

    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'open') as open,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical,
        COUNT(*) FILTER (WHERE status = 'under_review') as under_review,
        (SELECT COUNT(*) FROM incident_sla_tracking sla 
         JOIN incidents i ON sla.incident_id = i.id 
         WHERE sla.resolution_sla_met = FALSE AND i.estate_id = $1) as sla_breached
      FROM incidents
      WHERE status != 'closed' AND estate_id = $1
    `;

    const result = await pool.query(query, [estateId]);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error fetching incident stats:', error);
    res.status(500).json({ error: 'Failed to fetch incident stats' });
  }
};

/**
 * Update incident status
 */
export const updateIncidentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    const estateId = getEstateId(req);

    // SECURITY: Require estate context
    if (!estateId) {
      return res.status(400).json({ error: 'Estate context required' });
    }

    const validStatuses = ['open', 'under_review', 'investigating', 'in_progress', 'resolved', 'closed', 'cancelled', 'escalated'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}` });
    }

    // SECURITY: Filter by estate_id to prevent cross-estate modification
    // Dynamic query construction to handle status-specific updates
    let query = 'UPDATE incidents SET status = $1, updated_at = NOW()';
    const params = [status];
    let paramIndex = 2; // $1 is status

    if (status === 'resolved') {
      query += `, resolved_at = CURRENT_TIMESTAMP, resolved_by = $${paramIndex++}`;
      params.push(userId);
    } else if (status === 'closed') {
      query += `, closed_at = CURRENT_TIMESTAMP, closed_by = $${paramIndex++}`;
      params.push(userId);
    }

    query += ` WHERE id = $${paramIndex++} AND estate_id = $${paramIndex++} RETURNING *`;
    params.push(id, estateId);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found or access denied' });
    }

    // Calculate SLA
    await pool.query('SELECT calculate_incident_sla($1)', [id]);

    // Trigger automation
    await evaluateAutomationRules(`incident.${status}`, result.rows[0]);
    await webhookService.sendWebhook(`incident.${status}`, result.rows[0]);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error updating incident status:', error);
    res.status(500).json({ error: 'Failed to update incident status' });
  }
};

/**
 * Assign incident to user
 */
export const assignIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;
    const userId = req.user.id;
    const estateId = getEstateId(req);

    // SECURITY: Require estate context
    if (!estateId) {
      return res.status(400).json({ error: 'Estate context required' });
    }

    const incidentId = parsePositiveInt(id);
    const assigneeId = parsePositiveInt(assignedTo || req.body.assignee_id);
    if (!incidentId || !assigneeId) {
      return res.status(400).json({ error: 'Invalid incident id or assignedTo user id' });
    }

    const assigneeInEstate = await ensureUserInEstate(assigneeId, estateId);
    if (!assigneeInEstate) {
      return res.status(400).json({ error: 'Assigned user must belong to the same estate' });
    }

    // SECURITY: Filter by estate_id
    const result = await pool.query(
      `UPDATE incidents
       SET assigned_to = $1,
           assigned_at = CURRENT_TIMESTAMP,
           assigned_by = $2,
           status = CASE WHEN status = 'open' THEN 'under_review' ELSE status END
       WHERE id = $3 AND estate_id = $4
       RETURNING *`,
      [assigneeId, userId, incidentId, estateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found or access denied' });
    }

    // Log assignment
    await pool.query(
      `INSERT INTO incident_assignments (incident_id, assigned_to, assigned_by, assignment_type)
       VALUES ($1, $2, $3, 'primary')`,
      [incidentId, assigneeId, userId]
    );

    // Calculate SLA
    await pool.query('SELECT calculate_incident_sla($1)', [incidentId]);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error assigning incident:', error);
    res.status(500).json({ error: 'Failed to assign incident' });
  }
};

/**
 * Escalate incident
 */
export const escalateIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { escalateTo } = req.body;
    const userId = req.user.id;
    const estateId = getEstateId(req);

    // SECURITY: Require estate context
    if (!estateId) {
      return res.status(400).json({ error: 'Estate context required' });
    }

    const incidentId = parsePositiveInt(id);
    let escalationTargetId = parsePositiveInt(escalateTo || req.body.escalate_to);

    if (!incidentId) {
      return res.status(400).json({ error: 'Invalid incident id' });
    }

    // Get incident details to check category
    const incidentRes = await pool.query(
      'SELECT category, estate_id FROM incidents WHERE id = $1 AND estate_id = $2',
      [incidentId, estateId]
    );

    if (incidentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found or access denied' });
    }

    const category = incidentRes.rows[0].category?.toLowerCase();
    const systemCategories = ['system', 'downtime', 'security_breach', 'infrastructure'];

    if (!systemCategories.includes(category)) {
      return res.status(400).json({ error: 'Only system-related incidents (downtime, security breach) can be escalated to Super Admins' });
    }

    // Auto-pick escalation target if missing
    if (!escalationTargetId) {
      // Find the first available super_admin
      const adminResult = await pool.query(
        `SELECT id FROM users 
         WHERE role = 'super_admin' AND account_status = 'active'
         LIMIT 1`
      );

      if (adminResult.rows.length === 0) {
        return res.status(400).json({ error: 'No Super Admin found to escalate to' });
      }
      escalationTargetId = adminResult.rows[0].id;
    } else {
      // Verify target is actually a super_admin
      const targetRoleRes = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [escalationTargetId]
      );
      if (targetRoleRes.rows[0]?.role !== 'super_admin') {
        return res.status(400).json({ error: 'Incident can only be escalated to a Super Admin' });
      }
    }

    // SECURITY: Update incident status and escalation details
    const result = await pool.query(
      `UPDATE incidents
       SET status = 'escalated',
           escalated_to = $1,
           escalated_at = CURRENT_TIMESTAMP,
           escalated_by = $2
       WHERE id = $3 AND estate_id = $4
       RETURNING *`,
      [escalationTargetId, userId, incidentId, estateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found or access denied' });
    }

    // Log escalation
    await pool.query(
      `INSERT INTO incident_assignments (incident_id, assigned_to, assigned_by, assignment_type)
       VALUES ($1, $2, $3, 'escalated')`,
      [incidentId, escalationTargetId, userId]
    );

    // Trigger automation
    await evaluateAutomationRules('incident.escalated', result.rows[0]);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error escalating incident:', error);
    res.status(500).json({ error: 'Failed to escalate incident' });
  }
};

/**
 * Get incident comments
 */
export const getIncidentComments = async (req, res) => {
  try {
    const { id } = req.params;
    const estateId = getEstateId(req);
    const incidentId = parsePositiveInt(id);

    if (!estateId) {
      return res.status(400).json({ error: 'Estate context required' });
    }
    if (!incidentId) {
      return res.status(400).json({ error: 'Invalid incident id' });
    }

    const incidentExists = await ensureIncidentInEstate(incidentId, estateId);
    if (!incidentExists) {
      return res.status(404).json({ error: 'Incident not found or access denied' });
    }

    const result = await pool.query(
      `SELECT c.*, u.username as user_name
       FROM incident_comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.incident_id = $1
       ORDER BY c.created_at DESC`,
      [incidentId]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

/**
 * Add incident comment
 */
export const addIncidentComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, internal = true } = req.body;
    const userId = req.user.id;
    const estateId = getEstateId(req);
    const incidentId = parsePositiveInt(id);

    if (!estateId) {
      return res.status(400).json({ error: 'Estate context required' });
    }
    if (!incidentId) {
      return res.status(400).json({ error: 'Invalid incident id' });
    }
    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Comment is required' });
    }

    const incidentExists = await ensureIncidentInEstate(incidentId, estateId);
    if (!incidentExists) {
      return res.status(404).json({ error: 'Incident not found or access denied' });
    }

    const result = await pool.query(
      `INSERT INTO incident_comments (incident_id, user_id, comment, is_internal)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [incidentId, userId, comment.trim(), internal]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

/**
 * Get incident history
 */
export const getIncidentHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const estateId = getEstateId(req);
    const incidentId = parsePositiveInt(id);

    if (!estateId) {
      return res.status(400).json({ error: 'Estate context required' });
    }
    if (!incidentId) {
      return res.status(400).json({ error: 'Invalid incident id' });
    }

    const incidentExists = await ensureIncidentInEstate(incidentId, estateId);
    if (!incidentExists) {
      return res.status(404).json({ error: 'Incident not found or access denied' });
    }

    const result = await pool.query(
      `SELECT 
        'Status Changed' as action,
        CONCAT('Status changed from ', from_status, ' to ', to_status) as description,
        changed_at as created_at
       FROM incident_status_history
       WHERE incident_id = $1
       UNION ALL
       SELECT 
        'Assignment' as action,
        CONCAT('Assigned to user ', assigned_to) as description,
        assigned_at as created_at
       FROM incident_assignments
       WHERE incident_id = $1
       ORDER BY created_at DESC`,
      [incidentId]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};

/**
 * Get SLA information
 */
export const getIncidentSLA = async (req, res) => {
  try {
    const { id } = req.params;
    const estateId = getEstateId(req);
    const incidentId = parsePositiveInt(id);

    if (!estateId) {
      return res.status(400).json({ error: 'Estate context required' });
    }
    if (!incidentId) {
      return res.status(400).json({ error: 'Invalid incident id' });
    }

    const incidentExists = await ensureIncidentInEstate(incidentId, estateId);
    if (!incidentExists) {
      return res.status(404).json({ error: 'Incident not found or access denied' });
    }

    const result = await pool.query(
      `SELECT 
        response_sla_minutes,
        resolution_sla_minutes,
        EXTRACT(EPOCH FROM (first_response_at - 
          (SELECT created_at FROM incidents WHERE id = $1 AND estate_id = $2)))/60 as response_minutes,
        EXTRACT(EPOCH FROM (resolved_at - 
          (SELECT created_at FROM incidents WHERE id = $1 AND estate_id = $2)))/60 as resolution_minutes,
        response_sla_met,
        resolution_sla_met
       FROM incident_sla_tracking
       WHERE incident_id = $1`,
      [incidentId, estateId]
    );

    res.json({
      success: true,
      data: result.rows[0] || null
    });

  } catch (error) {
    logger.error('Error fetching SLA:', error);
    res.status(500).json({ error: 'Failed to fetch SLA information' });
  }
};

export default {
  getIncidentQueue,
  getIncidentStats,
  updateIncidentStatus,
  assignIncident,
  escalateIncident,
  getIncidentComments,
  addIncidentComment,
  getIncidentHistory,
  getIncidentSLA
};
