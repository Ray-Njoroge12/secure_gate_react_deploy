/**
 * Guard Controller
 * Extracted logic from guardRoutes.js
 */
import { dbManager } from '../database/db.enhanced.js';
import { AppError } from '../middleware/standardizedErrorHandler.js';
import { successResponse } from '../utils/responseFormatter.js';
import { PASS_STATUS } from '../constants/statuses.js';

/**
 * Get visitor history (past check-ins and check-outs)
 */
export const getVisitorHistory = async (req, res) => {
    // SECURITY: Require estate context
    if (!req.user.estate_id) {
        throw new AppError('Estate context required', 400);
    }

    const result = await dbManager.query(`
    SELECT 
      v.id,
      v.name as visitor_name,
      v.phone,
      v.email,
      v.status,
      v.check_in_time,
      v.check_out_time,
      v.created_at,
      u.username as resident_name,
      u.unit_number as resident_unit
    FROM visitors v
    LEFT JOIN users u ON v.host_id = u.id
    WHERE v.estate_id = $1
      AND v.status IN ($2, $3)
    ORDER BY 
      COALESCE(v.check_out_time, v.check_in_time, v.created_at) DESC
    LIMIT 100
  `, [req.user.estate_id, PASS_STATUS.CHECKED_OUT, PASS_STATUS.ON_PREMISE]);

    await req.audit?.('visitor.history.view', 'visitor', null, {
        outcome: 'success',
        message: 'Viewed visitor history',
        count: result.rows.length
    });

    return successResponse(res, result.rows, 'Visitor history retrieved');
};

/**
 * Get all residents for the guard's estate
 */
export const getEstateResidents = async (req, res) => {
    // SECURITY: Require estate context
    if (!req.user.estate_id) {
        throw new AppError('Estate context required', 400);
    }

    const result = await dbManager.query(`
    SELECT id, username, unit_number, phone
    FROM users 
    WHERE role = 'resident' 
    AND estate_id = $1
    AND account_status = 'active'
    ORDER BY unit_number ASC, username ASC
  `, [req.user.estate_id]);

    return successResponse(res, result.rows, 'Residents retrieved successfully');
};
