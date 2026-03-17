/**
 * @file approvalRoutes.js
 * @description Phase 3 - Visitor approval routes
 * Endpoints for walk-in visitor approval flow
 */

import express from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  requestApproval,
  approveVisitor,
  rejectVisitor,
  getPendingApprovals,
  getApprovalHistory
} from '../controllers/visitorApprovalController.js';
import { attachRequestAudit } from '../middleware/auditLogging.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRolePolicy } from '../middleware/rolePolicy.js';
import { buildErrorPayload } from '../utils/responseFormatter.js';

const router = express.Router();

const approvalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `approval_${req.user?.id || req.ip}`,
  handler: (req, res) => {
    const response = buildErrorPayload(
      req,
      res,
      'Too many approval operations, please try again later.',
      'APPROVAL_RATE_LIMITED'
    );
    res.status(429).json(response);
  }
});

// All approval routes require authentication
router.use(authenticateToken);

/**
 * Guard endpoints
 */
// Request approval for a walk-in visitor
router.post(
  '/visitors/:id/request-approval',
  requireRolePolicy('adminOrGuard'),
  approvalRateLimiter,
  attachRequestAudit,
  requestApproval
);

/**
 * Resident endpoints
 */
// Approve a visitor
router.post(
  '/visitors/:id/approve',
  requireRolePolicy('adminOrResident'),
  approvalRateLimiter,
  attachRequestAudit,
  approveVisitor
);

// Reject a visitor
router.post(
  '/visitors/:id/reject',
  requireRolePolicy('adminOrResident'),
  approvalRateLimiter,
  attachRequestAudit,
  rejectVisitor
);

// Get pending approvals (for logged-in resident)
router.get(
  '/visitors/pending-approvals',
  requireRolePolicy('adminOrResident'),
  attachRequestAudit,
  getPendingApprovals
);

// Get approval history (for logged-in resident)
router.get(
  '/visitors/approval-history',
  requireRolePolicy('adminOrResident'),
  attachRequestAudit,
  getApprovalHistory
);

export default router;
