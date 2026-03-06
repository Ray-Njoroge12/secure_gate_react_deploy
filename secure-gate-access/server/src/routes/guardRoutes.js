/**
 * Guard Routes
 * Routes for guard-specific operations.
 * Business logic delegated to guardController.js
 * SECURITY: All queries filter by estate_id
 */

import express from 'express';
import { authenticateToken, authorize } from '../middleware/authMiddleware.js';
import { attachRequestAudit } from '../middleware/auditLogging.js';
import { asyncHandler } from '../middleware/standardizedErrorHandler.js';
import { minimizeData } from '../middleware/dataMinimization.js';
import {
  getVisitorHistory,
  getEstateResidents
} from '../controllers/guardController.js';

const router = express.Router();

const withGuardAuth = [authenticateToken, authorize(['guard', 'admin', 'super_admin'])];

/**
 * GET /api/guard/visitor-history
 * Returns all visitors that have been checked out or are currently on premise.
 * Filtered by the guard's estate for security.
 */
router.get('/visitor-history',
  ...withGuardAuth,
  minimizeData('visitor'),
  attachRequestAudit,
  asyncHandler(getVisitorHistory)
);

/**
 * GET /api/guard/residents
 * Returns minimal resident details for delivery and visitor check-in.
 */
router.get('/residents',
  ...withGuardAuth,
  minimizeData('user'),
  attachRequestAudit,
  asyncHandler(getEstateResidents)
);

export default router;
