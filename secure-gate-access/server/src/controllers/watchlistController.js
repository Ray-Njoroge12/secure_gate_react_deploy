/**
 * @file watchlistController.js
 * @description CRUD controller for estate watchlist management
 */

import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError } from '../utils/respond.js';
import logger from '../config/logger.js';

/**
 * Get all watchlist entries for the estate
 * GET /api/admin/watchlist
 */
export const getWatchlist = async (req, res) => {
  try {
    const estateId = req.user.estate_id;
    const result = await dbManager.query(
      `SELECT w.*, u.first_name || ' ' || u.last_name AS created_by_name
       FROM watchlist w
       LEFT JOIN users u ON w.created_by = u.id
       WHERE w.estate_id = $1
       ORDER BY w.created_at DESC`,
      [estateId]
    );
    return respond(res, 200, 'Watchlist retrieved', result.rows);
  } catch (error) {
    logger.error('Error fetching watchlist:', error);
    return respondError(res, 500, 'Failed to fetch watchlist');
  }
};

/**
 * Create a watchlist entry
 * POST /api/admin/watchlist
 */
export const createWatchlistEntry = async (req, res) => {
  try {
    const estateId = req.user.estate_id;
    const { full_name, id_number, vehicle_plate, reason, risk_level } = req.body;

    if (!full_name || !reason) {
      return respondError(res, 400, 'Full name and reason are required');
    }

    const validRiskLevels = ['low', 'medium', 'high', 'critical'];
    if (risk_level && !validRiskLevels.includes(risk_level)) {
      return respondError(res, 400, `Invalid risk level. Must be one of: ${validRiskLevels.join(', ')}`);
    }

    const result = await dbManager.query(
      `INSERT INTO watchlist (estate_id, full_name, id_number, vehicle_plate, reason, risk_level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [estateId, full_name.trim(), id_number || null, vehicle_plate || null, reason.trim(), risk_level || 'medium', req.user.id]
    );

    return respond(res, 201, 'Watchlist entry created', result.rows[0]);
  } catch (error) {
    logger.error('Error creating watchlist entry:', error);
    return respondError(res, 500, 'Failed to create watchlist entry');
  }
};

/**
 * Update a watchlist entry
 * PUT /api/admin/watchlist/:id
 */
export const updateWatchlistEntry = async (req, res) => {
  try {
    const estateId = req.user.estate_id;
    const { id } = req.params;
    const { full_name, id_number, vehicle_plate, reason, risk_level, is_active } = req.body;

    const result = await dbManager.query(
      `UPDATE watchlist
       SET full_name = COALESCE($1, full_name),
           id_number = COALESCE($2, id_number),
           vehicle_plate = COALESCE($3, vehicle_plate),
           reason = COALESCE($4, reason),
           risk_level = COALESCE($5, risk_level),
           is_active = COALESCE($6, is_active),
           updated_at = NOW()
       WHERE id = $7 AND estate_id = $8
       RETURNING *`,
      [full_name, id_number, vehicle_plate, reason, risk_level, is_active, id, estateId]
    );

    if (result.rows.length === 0) {
      return respondError(res, 404, 'Watchlist entry not found');
    }

    return respond(res, 200, 'Watchlist entry updated', result.rows[0]);
  } catch (error) {
    logger.error('Error updating watchlist entry:', error);
    return respondError(res, 500, 'Failed to update watchlist entry');
  }
};

/**
 * Delete a watchlist entry
 * DELETE /api/admin/watchlist/:id
 */
export const deleteWatchlistEntry = async (req, res) => {
  try {
    const estateId = req.user.estate_id;
    const { id } = req.params;

    const result = await dbManager.query(
      'DELETE FROM watchlist WHERE id = $1 AND estate_id = $2 RETURNING id',
      [id, estateId]
    );

    if (result.rows.length === 0) {
      return respondError(res, 404, 'Watchlist entry not found');
    }

    return respond(res, 200, 'Watchlist entry removed');
  } catch (error) {
    logger.error('Error deleting watchlist entry:', error);
    return respondError(res, 500, 'Failed to delete watchlist entry');
  }
};

/**
 * Get recent watchlist matches
 * GET /api/admin/watchlist/matches
 */
export const getWatchlistMatches = async (req, res) => {
  try {
    const estateId = req.user.estate_id;
    const result = await dbManager.query(
      `SELECT wm.*, w.full_name, w.risk_level,
              v.first_name AS visitor_first_name, v.last_name AS visitor_last_name,
              u.first_name || ' ' || u.last_name AS matched_by_name
       FROM watchlist_matches wm
       JOIN watchlist w ON wm.watchlist_id = w.id
       LEFT JOIN visitors v ON wm.visitor_id = v.id
       LEFT JOIN users u ON wm.matched_by = u.id
       WHERE wm.estate_id = $1
       ORDER BY wm.matched_at DESC
       LIMIT 100`,
      [estateId]
    );
    return respond(res, 200, 'Watchlist matches retrieved', result.rows);
  } catch (error) {
    logger.error('Error fetching watchlist matches:', error);
    return respondError(res, 500, 'Failed to fetch watchlist matches');
  }
};
