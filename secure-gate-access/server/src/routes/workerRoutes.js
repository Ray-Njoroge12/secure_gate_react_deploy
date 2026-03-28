/**
 * Worker Routes
 * API endpoints for worker registration, pass management, and check-in/out
 */

import express from 'express';
import {
  registerWorker,
  bulkRegisterWorkers,
  listWorkers,
  getWorker,
  updateWorker,
  preApproveWorker,
  revokeWorker,
  generateWorkerPass,
  getWorkerPasses,
  validateWorkerPass,
  revokeWorkerPass,
  checkInWorker,
  checkOutWorker,
  getActiveWorkers,
  getCheckInHistory
} from '../controllers/workerController.js';
import { authenticateToken, requireEstate, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication and estate context
router.use(authenticateToken, requireEstate);

// Worker registration
router.post('/', requireRole(['admin', 'super_admin', 'company_admin']), registerWorker);
router.post('/bulk', requireRole(['admin', 'super_admin', 'company_admin']), bulkRegisterWorkers);

// Active workers on premise (guard/admin view)
router.get('/active', requireRole(['admin', 'super_admin', 'guard', 'company_admin']), getActiveWorkers);

// Check-in history
router.get('/check-in-history', requireRole(['admin', 'super_admin', 'guard', 'company_admin']), getCheckInHistory);

// Worker pass validation (guard action)
router.post('/passes/validate', requireRole(['guard', 'admin', 'super_admin']), validateWorkerPass);

// Worker pass revoke
router.post('/passes/:id/revoke', requireRole(['admin', 'super_admin', 'company_admin']), revokeWorkerPass);

// List workers
router.get('/', requireRole(['admin', 'super_admin', 'guard', 'company_admin']), listWorkers);

// Worker details
router.get('/:id', requireRole(['admin', 'super_admin', 'guard', 'company_admin']), getWorker);
router.put('/:id', requireRole(['admin', 'super_admin', 'company_admin']), updateWorker);

// Worker approval and revocation
router.post('/:id/pre-approve', requireRole(['admin', 'super_admin', 'company_admin']), preApproveWorker);
router.post('/:id/revoke', requireRole(['admin', 'super_admin', 'company_admin']), revokeWorker);

// Worker passes
router.post('/:id/passes', requireRole(['admin', 'super_admin', 'company_admin']), generateWorkerPass);
router.get('/:id/passes', requireRole(['admin', 'super_admin', 'company_admin', 'guard']), getWorkerPasses);

// Worker check-in/out (guard actions)
router.post('/:id/check-in', requireRole(['guard', 'admin', 'super_admin']), checkInWorker);
router.post('/check-ins/:id/check-out', requireRole(['guard', 'admin', 'super_admin']), checkOutWorker);

export default router;
