import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import { getMetrics, getAuditLogs, updateAdminSetting } from '../controllers/adminController.js';
import { validateRequest, ValidationSchemas } from '../middleware/validationMiddleware.js';
import { adminRateLimit } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// Deprecated legacy admin login route kept only to emit 410 responses.
router.post('/login', (_req, res) => {
	return res.status(410).json({ success: false, error: 'Legacy admin login removed', message: 'Use /api/users/login with role-based JWT instead' });
});

router.get('/metrics', adminRateLimit(), authenticateToken, requireRole('admin'), getMetrics);

router.get('/audit-logs', 
  adminRateLimit(),
  authenticateToken, 
  requireRole('admin'),
  validateRequest(ValidationSchemas.pagination),
  getAuditLogs
);

router.post('/settings', 
  adminRateLimit(),
  authenticateToken, 
  requireRole('admin'),
  validateRequest(ValidationSchemas.adminSetting),
  updateAdminSetting
);

export default router;
