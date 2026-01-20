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
import { requireRole } from '../middleware/authMiddleware.js';
import { customRateLimit } from '../middleware/rateLimitMiddleware.js';

// Fix A-007: Rate Limiting
const analyticsLimiter = customRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many analytics requests, please try again later.' }
});

// Fix A-006: Inconsistent Auth Pattern (Use shared middleware)
const requireAdmin = requireRole(['admin']);

/**
 * @route GET /api/admin/analytics/overview
 * @desc Get dashboard overview with key metrics
 * @access Private (admin only)
 */
router.get('/overview', authenticateToken, requireAdmin, analyticsLimiter, getAnalyticsOverview);

/**
 * @route GET /api/admin/analytics/visitors
 * @desc Get detailed visitor metrics with trends
 * @access Private (admin only)
 */
router.get('/visitors', authenticateToken, requireAdmin, analyticsLimiter, getVisitorMetrics);

/**
 * @route GET /api/admin/analytics/incidents
 * @desc Get incident metrics and trends
 * @access Private (admin only)
 */
router.get('/incidents', authenticateToken, requireAdmin, analyticsLimiter, getIncidentMetrics);

/**
 * @route GET /api/admin/analytics/guards
 * @desc Get guard performance metrics
 * @access Private (admin only)
 */
router.get('/guards', authenticateToken, requireAdmin, analyticsLimiter, getGuardMetrics);

/**
 * @route GET /api/admin/analytics/residents
 * @desc Get resident activity metrics
 * @access Private (admin only)
 */
router.get('/residents', authenticateToken, requireAdmin, analyticsLimiter, getResidentMetrics);

export default router;
