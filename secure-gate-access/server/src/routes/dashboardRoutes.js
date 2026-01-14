import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import attachRequestAudit from '../middleware/auditLogger.js';

const router = express.Router();

// Dashboard routes (authenticated users)
router.get('/stats', authenticateToken, attachRequestAudit, getDashboardStats);

export default router;

