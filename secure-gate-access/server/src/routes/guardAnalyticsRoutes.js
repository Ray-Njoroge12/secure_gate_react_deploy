/**
 * @file guardAnalyticsRoutes.js
 * @description Phase G5 - Guard analytics routes
 * Provides operational analytics and insights for guards
 */

import express from 'express';
import { getGuardAnalytics } from '../controllers/guardAnalyticsController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route GET /api/guard/analytics
 * @desc Get guard operational analytics
 * @access Private (guard, admin)
 * @query fromDate, toDate
 */
import { customRateLimit } from '../middleware/rateLimitMiddleware.js';

// Rate limit: 100 requests per 15 minutes
const analyticsLimiter = customRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many analytics requests, please try again later.' }
});

router.get('/', analyticsLimiter, getGuardAnalytics);

export default router;
