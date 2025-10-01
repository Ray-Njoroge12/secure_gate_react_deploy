import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { attachUserFromToken } from '../middleware/authMiddleware.js';
import attachRequestAudit from '../middleware/auditLogger.js';

const router = express.Router();

// Dashboard routes (authenticated users)
router.get('/stats', attachUserFromToken, attachRequestAudit, getDashboardStats);

export default router;

