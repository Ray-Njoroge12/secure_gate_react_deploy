import express from 'express';
import {
  createVisitor,
  getMyVisitors,
  createPass,
  bulkInvite,
  getBulkInvite,
  completeInvite
} from '../controllers/visitorInviteController.js';
import { verifyOtp, resendOtp } from '../controllers/visitorOtpController.js';
import { checkInVisitor, checkOutVisitor, selfCheckIn } from '../controllers/visitorCheckInController.js';
import { revokeVisitor, getActiveVisitors, getVisitorReport } from '../controllers/visitorAdminController.js';
import { attachUserFromToken } from '../middleware/authMiddleware.js';
import attachRequestAudit from '../middleware/auditLogger.js';
import CacheMiddleware from '../middleware/cacheMiddleware.js';

const router = express.Router();

// Protected routes (resident-auth required)
router.post('/', attachUserFromToken, attachRequestAudit, createVisitor);
router.get('/',
	attachUserFromToken,
	attachRequestAudit,
	CacheMiddleware.apiCache(300, (req) => `visitors:${req.user?.email || 'anonymous'}:${JSON.stringify(req.query)}`),
	getMyVisitors
);
router.post('/:visitorId/pass', attachUserFromToken, attachRequestAudit, createPass);
router.post('/bulk-invite', attachUserFromToken, attachRequestAudit, bulkInvite);

// Guard Operations (guard/admin roles required)
router.post('/:id/check-in', attachUserFromToken, attachRequestAudit, checkInVisitor);
router.post('/:id/check-out', attachUserFromToken, attachRequestAudit, checkOutVisitor);

// OTP Operations (public endpoints for visitor verification)
router.post('/:id/verify-otp', verifyOtp);
router.post('/:id/resend-otp', resendOtp);

// Public routes (guests) - cached for performance
router.get('/bulk-invite/:inviteCode',
	CacheMiddleware.apiCache(300, (req) => `bulk-invite:${req.params.inviteCode}`),
	getBulkInvite
);
router.post('/complete/:inviteCode', completeInvite);
router.post('/self-checkin/:inviteCode', selfCheckIn);

// Admin Operations (admin role required)
router.get('/admin/active-visitors', attachUserFromToken, attachRequestAudit, getActiveVisitors);
router.get('/admin/report', attachUserFromToken, attachRequestAudit, getVisitorReport);
router.delete('/admin/:visitorId/revoke', attachUserFromToken, attachRequestAudit, revokeVisitor);

export default router;
