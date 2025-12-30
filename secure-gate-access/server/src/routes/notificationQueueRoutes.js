/**
 * Notification Queue Routes
 * Admin API endpoints for monitoring and managing notification delivery queues
 */

import express from 'express';
import notificationQueueService from '../services/notificationQueueService.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route GET /api/admin/notification-queue/stats
 * @desc Get notification queue statistics
 * @access Admin only
 */
router.get('/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const stats = await notificationQueueService.getStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get queue statistics',
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/notification-queue/failed
 * @desc Get failed notifications from dead letter queue
 * @access Admin only
 */
router.get('/failed', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const failedNotifications = await notificationQueueService.getFailedNotifications(limit);

    res.json({
      success: true,
      data: failedNotifications,
      count: failedNotifications.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get failed notifications',
      error: error.message
    });
  }
});

/**
 * @route POST /api/admin/notification-queue/retry/:jobId
 * @desc Retry a failed notification
 * @access Admin only
 */
router.post('/retry/:jobId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await notificationQueueService.retryFailedNotification(jobId);

    res.json({
      success: true,
      message: 'Notification requeued successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retry notification',
      error: error.message
    });
  }
});

/**
 * @route POST /api/admin/notification-queue/clean
 * @desc Clean old completed jobs
 * @access Admin only
 */
router.post('/clean', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const olderThanHours = parseInt(req.body.hours) || 24;
    const olderThanMs = olderThanHours * 60 * 60 * 1000;

    await notificationQueueService.cleanOldJobs(olderThanMs);

    res.json({
      success: true,
      message: `Cleaned jobs older than ${olderThanHours} hours`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clean old jobs',
      error: error.message
    });
  }
});

export default router;
