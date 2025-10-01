import express from 'express';
import { updateStatusValues } from '../controllers/databaseUpdateController.js';
import { attachUserFromToken } from '../middleware/authMiddleware.js';
import attachRequestAudit from '../middleware/auditLogger.js';

const router = express.Router();

// Database update endpoint
router.post('/update-status', attachUserFromToken, attachRequestAudit, updateStatusValues);

export default router;
