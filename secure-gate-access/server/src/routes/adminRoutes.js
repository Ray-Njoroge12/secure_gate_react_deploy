import express from 'express';
import { getMetrics, getAuditLogs } from '../controllers/adminController.js';
import { attachUserFromToken } from '../middleware/authMiddleware.js';
import attachRequestAudit from '../middleware/auditLogger.js';
import backupService from '../services/backupService.js';

const router = express.Router();

// Admin metrics endpoint
router.get('/metrics', attachUserFromToken, attachRequestAudit, getMetrics);

// Audit logs endpoint
router.get('/audit-logs', attachUserFromToken, attachRequestAudit, getAuditLogs);

// Backup trigger endpoint
router.post('/backup/trigger', attachUserFromToken, attachRequestAudit, async (req, res) => {
  try {
    const result = await backupService.triggerBackup();
    res.json({
      success: true,
      message: 'Backup triggered successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 500,
        message: 'Failed to trigger backup',
        type: 'Backup Error',
        requestId: req.requestId
      }
    });
  }
});

export default router;