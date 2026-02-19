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

    const validStatuses = ['open', 'under_review', 'escalated', 'closed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // SECURITY: Filter by estate_id to prevent cross-estate modification
    const result = await pool.query(
      `UPDATE incidents
       SET status = $1,
           ${status === 'closed' ? 'closed_at = CURRENT_TIMESTAMP, closed_by = $2' : '1=1'}
       WHERE id = $${status === 'closed' ? 3 : 2} AND estate_id = $${status === 'closed' ? 4 : 3}
       RETURNING *`,
      status === 'closed' ? [status, userId, id, estateId] : [status, id, estateId]
    );

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
    const assigneeId = parsePositiveInt(assignedTo);
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
       VALUES ($1, $2, $3, 'assigned')`,
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
    const escalationTargetId = parsePositiveInt(escalateTo);
    if (!incidentId || !escalationTargetId) {
      return res.status(400).json({ error: 'Invalid incident id or escalateTo user id' });
    }

    const escalationTargetInEstate = await ensureUserInEstate(escalationTargetId, estateId);
    if (!escalationTargetInEstate) {
      return res.status(400).json({ error: 'Escalation target must belong to the same estate' });
    }

    // SECURITY: Filter by estate_id
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
      `INSERT INTO incident_comments (incident_id, user_id, comment, internal)
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
