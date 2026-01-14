/**
 * @file adminAnalyticsRoutes.js
 * @description Admin analytics API routes
 * Phase A1: Admin Operations & Analytics Dashboard
 */

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { errorResponse } from '../utils/responseFormatter.js';
import {
  getAnalyticsOverview,
  getVisitorMetrics,
  getIncidentMetrics,
  getGuardMetrics,
  getResidentMetrics
} from '../controllers/adminAnalyticsController.js';

const router = express.Router();

// Middleware: Require admin role
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return errorResponse(res, 'Admin access required', 'FORBIDDEN', 403, null, req);
};

/**
 * @route GET /api/admin/analytics/overview
 * @desc Get dashboard overview with key metrics
 * @access Private (admin only)
 */
router.get('/overview', authenticateToken, requireAdmin, getAnalyticsOverview);

/**
 * @route GET /api/admin/analytics/visitors
 * @desc Get detailed visitor metrics with trends
 * @access Private (admin only)
 */
router.get('/visitors', authenticateToken, requireAdmin, getVisitorMetrics);

/**
 * @route GET /api/admin/analytics/incidents
 * @desc Get incident metrics and trends
 * @access Private (admin only)
 */
router.get('/incidents', authenticateToken, requireAdmin, getIncidentMetrics);

/**
 * @route GET /api/admin/analytics/guards
 * @desc Get guard performance metrics
 * @access Private (admin only)
 */
router.get('/guards', authenticateToken, requireAdmin, getGuardMetrics);

/**
 * @route GET /api/admin/analytics/residents
 * @desc Get resident activity metrics
 * @access Private (admin only)
 */
router.get('/residents', authenticateToken, requireAdmin, getResidentMetrics);

export default router;
