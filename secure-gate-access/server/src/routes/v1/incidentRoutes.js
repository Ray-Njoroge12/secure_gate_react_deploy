import express from 'express';
import { asyncHandler } from '../../middleware/enhancedErrorHandler.js';
import { successResponse } from '../../utils/responseUtils.js';
import { authenticateToken as authenticate, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Incidents v1
 *   description: Incident management endpoints (API v1)
 */

router.get('/', authenticate, authorize(['admin', 'guard']), asyncHandler(async (req, res) => {
  successResponse(res, { message: 'Incident routes v1 - placeholder' }, 'Incidents retrieved successfully');
}));

export default router;
