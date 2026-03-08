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
  getResidentMetrics,
  getActivitySummary,
  getActivityFeed,
  getActivityTrends,
  getActivityAnomalies
} from '../controllers/adminAnalyticsController.js';

const router = express.Router();
import { requireRole } from '../middleware/authMiddleware.js';
import { requireRolePolicy } from '../middleware/rolePolicy.js';
import { customRateLimit } from '../middleware/rateLimitMiddleware.js';
import { requireEstateContextForAdmin } from '../middleware/estateContextMiddleware.js';

// Fix A-007: Rate Limiting
const analyticsLimiter = customRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many analytics requests, please try again later.' }
});

// Fix A-006: Inconsistent Auth Pattern (Use shared middleware)
const requireAdmin = requireRolePolicy('adminOnly');

/**
 * @route GET /api/admin/analytics/overview
 * @desc Get dashboard overview with key metrics
 * @access Private (admin only)
 */
router.get('/overview', authenticateToken, requireAdmin, requireEstateContextForAdmin, analyticsLimiter, getAnalyticsOverview);

/**
 * @route GET /api/admin/analytics/visitors
 * @desc Get detailed visitor metrics with trends
 * @access Private (admin only)
 */
router.get('/visitors', authenticateToken, requireAdmin, requireEstateContextForAdmin, analyticsLimiter, getVisitorMetrics);

/**
 * @route GET /api/admin/analytics/incidents
 * @desc Get incident metrics and trends
 * @access Private (admin only)
 */
router.get('/incidents', authenticateToken, requireAdmin, requireEstateContextForAdmin, analyticsLimiter, getIncidentMetrics);

/**
 * @route GET /api/admin/analytics/guards
 * @desc Get guard performance metrics
 * @access Private (admin only)
 */
router.get('/guards', authenticateToken, requireAdmin, requireEstateContextForAdmin, analyticsLimiter, getGuardMetrics);

/**
 * @route GET /api/admin/analytics/residents
 * @desc Get resident activity metrics
 * @access Private (admin only)
 */
router.get('/residents', authenticateToken, requireAdmin, requireEstateContextForAdmin, analyticsLimiter, getResidentMetrics);

/**
 * @route GET /api/admin/analytics/activity/summary
 * @desc Get activity summary
 * @access Private (admin only)
 */
router.get('/activity/summary', authenticateToken, requireAdmin, requireEstateContextForAdmin, analyticsLimiter, getActivitySummary);

/**
 * @route GET /api/admin/analytics/activity/feed
 * @desc Get activity feed
 * @access Private (admin only)
 */
router.get('/activity/feed', authenticateToken, requireAdmin, requireEstateContextForAdmin, analyticsLimiter, getActivityFeed);

/**
 * @route GET /api/admin/analytics/activity/trends
 * @desc Get activity trends
 * @access Private (admin only)
 */
router.get('/activity/trends', authenticateToken, requireAdmin, requireEstateContextForAdmin, analyticsLimiter, getActivityTrends);

/**
 * @route GET /api/admin/analytics/activity/anomalies
 * @desc Get activity anomalies
 * @access Private (admin only)
 */
router.get('/activity/anomalies', authenticateToken, requireAdmin, requireEstateContextForAdmin, analyticsLimiter, getActivityAnomalies);

export default router;
