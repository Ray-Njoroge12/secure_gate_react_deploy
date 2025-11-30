/**
 * @file approvalRoutes.js
 * @description Phase 3 - Visitor approval routes
 * Endpoints for walk-in visitor approval flow
 */

import express from 'express';
import {
  requestApproval,
  approveVisitor,
  rejectVisitor,
  getPendingApprovals,
  getApprovalHistory
} from '../controllers/visitorApprovalController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
// Audit logging removed - using built-in audit logger

const router = express.Router();

// All approval routes require authentication
router.use(authenticateToken);

/**
 * Guard endpoints
 */
// Request approval for a walk-in visitor
router.post(
  '/visitors/:id/request-approval',
  requestApproval
);

/**
 * Resident endpoints
 */
// Approve a visitor
router.post(
  '/visitors/:id/approve',
  approveVisitor
);

// Reject a visitor
router.post(
  '/visitors/:id/reject',
  rejectVisitor
);

// Get pending approvals (for logged-in resident)
router.get(
  '/visitors/pending-approvals',
  getPendingApprovals
);

// Get approval history (for logged-in resident)
router.get(
  '/visitors/approval-history',
  getApprovalHistory
);

export default router;
