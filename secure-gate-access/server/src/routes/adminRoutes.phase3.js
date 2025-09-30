import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { getMetrics, getAuditLogs, updateAdminSetting } from '../controllers/adminController.phase3.js';
import { adminRateLimit } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();
router.get('/metrics', adminRateLimit(), authenticateToken, requireRole('admin'), getMetrics);
router.get('/audit-logs', adminRateLimit(), authenticateToken, requireRole('admin'), getAuditLogs);
router.post('/settings', adminRateLimit(), authenticateToken, requireRole('admin'), updateAdminSetting);

export default router;
