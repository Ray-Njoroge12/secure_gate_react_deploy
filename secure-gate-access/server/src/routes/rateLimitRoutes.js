// server/src/routes/rateLimitRoutes.js
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { rateLimitAnalytics } from '../config/rateLimits.js';
import { AppError, asyncHandler } from '../middleware/standardizedErrorHandler.js';
import { successResponse } from '../utils/responseFormatter.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Rate Limiting
 *   description: Rate limiting monitoring and management
 */

/**
 * @swagger
 * /api/rate-limits/stats:
 *   get:
 *     summary: Get rate limiting statistics
 *     tags: [Rate Limiting]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rate limiting statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: "Rate limiting statistics retrieved"
 *                   data:
 *                     totalKeys: 150
 *                     activeKeys: 45
 *                     recentAlerts: []
 *                     topViolators: []
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedErrorResponse'
 *       403:
 *         description: Forbidden - admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenErrorResponse'
 */
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  // Only admins can view rate limiting stats
  if (req.user.role !== 'admin') {
    throw new AppError('Forbidden: Only administrators can view rate limiting statistics.', 403, 'AUTH_FORBIDDEN');
  }

  const stats = rateLimitAnalytics.getStats();
  successResponse(res, 'Rate limiting statistics retrieved', stats);
}));

/**
 * @swagger
 * /api/rate-limits/alerts:
 *   get:
 *     summary: Get recent rate limiting alerts
 *     tags: [Rate Limiting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of alerts to return
 *     responses:
 *       200:
 *         description: Recent alerts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: "Recent alerts retrieved"
 *                   data:
 *                     alerts: []
 *                     total: 0
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedErrorResponse'
 *       403:
 *         description: Forbidden - admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenErrorResponse'
 */
router.get('/alerts', authenticateToken, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Forbidden: Only administrators can view rate limiting alerts.', 403, 'AUTH_FORBIDDEN');
  }

  const limit = parseInt(req.query.limit) || 20;
  const stats = rateLimitAnalytics.getStats();
  const alerts = stats.recentAlerts.slice(0, limit);

  successResponse(res, 'Recent alerts retrieved', {
    alerts,
    total: alerts.length
  });
}));

/**
 * @swagger
 * /api/rate-limits/clear:
 *   post:
 *     summary: Clear rate limiting statistics
 *     tags: [Rate Limiting]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: "Rate limiting statistics cleared"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedErrorResponse'
 *       403:
 *         description: Forbidden - admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenErrorResponse'
 */
router.post('/clear', authenticateToken, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Forbidden: Only administrators can clear rate limiting statistics.', 403, 'AUTH_FORBIDDEN');
  }

  rateLimitAnalytics.clearStats();
  successResponse(res, 'Rate limiting statistics cleared');
}));

/**
 * @swagger
 * /api/rate-limits/health:
 *   get:
 *     summary: Get rate limiting system health
 *     tags: [Rate Limiting]
 *     responses:
 *       200:
 *         description: System health retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: "Rate limiting system healthy"
 *                   data:
 *                     status: "healthy"
 *                     uptime: 3600
 *                     memoryUsage: {}
 *                     activeConnections: 0
 */
router.get('/health', asyncHandler(async (req, res) => {
  const health = {
    status: 'healthy',
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    activeConnections: rateLimitAnalytics.stats.size,
    timestamp: new Date().toISOString()
  };

  successResponse(res, 'Rate limiting system healthy', health);
}));

export default router;