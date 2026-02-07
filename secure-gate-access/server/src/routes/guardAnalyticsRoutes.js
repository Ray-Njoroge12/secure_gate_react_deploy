/**
 * @file guardAnalyticsRoutes.js
 * @description Phase G5 - Guard analytics routes
 * Provides operational analytics and insights for guards
 */

import express from 'express';
import { getGuardAnalytics } from '../controllers/guardAnalyticsController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { requireRolePolicy } from '../middleware/rolePolicy.js';
import requireEstateContext from '../middleware/estateContextMiddleware.js';
import { customRateLimit } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// Rate limit: 100 requests per 15 minutes
const analyticsLimiter = customRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many analytics requests, please try again later.' }
});

// All routes require authentication, estate context, and guard/admin role
router.use(authenticateToken);
router.use(requireEstateContext);

/**
 * @route GET /api/guard/analytics
 * @desc Get guard operational analytics
 * @access Private (guard, admin, super_admin)
 * @query fromDate, toDate
 */
router.get('/', requireRolePolicy('adminOrGuard'), analyticsLimiter, getGuardAnalytics);

export default router;
