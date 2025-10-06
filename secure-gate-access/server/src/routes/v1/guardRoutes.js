import express from 'express';
import { asyncHandler } from '../../middleware/enhancedErrorHandler.js';
import { successResponse } from '../../utils/responseUtils.js';
import { authenticateToken as authenticate, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Guards v1
 *   description: Guard management endpoints (API v1)
 */

router.get('/', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  successResponse(res, { message: 'Guard routes v1 - placeholder' }, 'Guards retrieved successfully');
}));

export default router;
