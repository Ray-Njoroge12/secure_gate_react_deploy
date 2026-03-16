/**
 * @file policyController.js
 * @description CRUD controller for admin policy engine management
 */

import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError } from '../utils/respond.js';
import logger from '../config/logger.js';

/**
 * Get all policies for the estate
 * GET /api/admin/policies
 */
export const getPolicies = async (req, res) => {
  try {
    const estateId = req.user.estate_id;
    const result = await dbManager.query(
      `SELECT p.*, u.first_name || ' ' || u.last_name AS created_by_name
       FROM admin_policies p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.estate_id = $1
       ORDER BY p.priority DESC, p.created_at DESC`,
      [estateId]
    );
    return respond(res, 200, 'Policies retrieved', result.rows);
  } catch (error) {
    logger.error('Error fetching policies:', error);
    return respondError(res, 500, 'Failed to fetch policies');
  }
};

/**
 * Create a policy
 * POST /api/admin/policies
 */
export const createPolicy = async (req, res) => {
  try {
    const estateId = req.user.estate_id;
    const { name, description, policy_type, conditions, actions, is_enabled, priority } = req.body;

    if (!name || !policy_type) {
      return respondError(res, 400, 'Name and policy type are required');
    }

    const validTypes = ['access', 'visitor', 'security', 'notification'];
    if (!validTypes.includes(policy_type)) {
      return respondError(res, 400, `Invalid policy type. Must be one of: ${validTypes.join(', ')}`);
    }

    const result = await dbManager.query(
      `INSERT INTO admin_policies (estate_id, name, description, policy_type, conditions, actions, is_enabled, priority, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [estateId, name.trim(), description || null, policy_type, JSON.stringify(conditions || {}), JSON.stringify(actions || {}), is_enabled !== false, priority || 0, req.user.id]
    );

    return respond(res, 201, 'Policy created', result.rows[0]);
  } catch (error) {
    logger.error('Error creating policy:', error);
    return respondError(res, 500, 'Failed to create policy');
  }
};

/**
 * Update a policy
 * PUT /api/admin/policies/:id
 */
export const updatePolicy = async (req, res) => {
  try {
    const estateId = req.user.estate_id;
    const { id } = req.params;
    const { name, description, policy_type, conditions, actions, is_enabled, priority } = req.body;

    const result = await dbManager.query(
      `UPDATE admin_policies
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           policy_type = COALESCE($3, policy_type),
           conditions = COALESCE($4, conditions),
           actions = COALESCE($5, actions),
           is_enabled = COALESCE($6, is_enabled),
           priority = COALESCE($7, priority),
           updated_at = NOW()
       WHERE id = $8 AND estate_id = $9
       RETURNING *`,
      [name, description, policy_type, conditions ? JSON.stringify(conditions) : null, actions ? JSON.stringify(actions) : null, is_enabled, priority, id, estateId]
    );

    if (result.rows.length === 0) {
      return respondError(res, 404, 'Policy not found');
    }

    return respond(res, 200, 'Policy updated', result.rows[0]);
  } catch (error) {
    logger.error('Error updating policy:', error);
    return respondError(res, 500, 'Failed to update policy');
  }
};

/**
 * Delete a policy
 * DELETE /api/admin/policies/:id
 */
export const deletePolicy = async (req, res) => {
  try {
    const estateId = req.user.estate_id;
    const { id } = req.params;

    const result = await dbManager.query(
      'DELETE FROM admin_policies WHERE id = $1 AND estate_id = $2 RETURNING id',
      [id, estateId]
    );

    if (result.rows.length === 0) {
      return respondError(res, 404, 'Policy not found');
    }

    return respond(res, 200, 'Policy deleted');
  } catch (error) {
    logger.error('Error deleting policy:', error);
    return respondError(res, 500, 'Failed to delete policy');
  }
};
