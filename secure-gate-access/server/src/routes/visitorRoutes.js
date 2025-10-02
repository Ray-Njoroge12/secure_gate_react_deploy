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
import { validateRequest, ValidationSchemas } from '../middleware/validationMiddleware.js';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// Rate limiting for visitor creation
const visitorCreationLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 visitor creations per 15 minutes per IP
  message: {
    error: 'Too many visitor creation attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Protected routes (resident-auth required)
router.post('/', 
  visitorCreationLimit,
  attachUserFromToken, 
  attachRequestAudit, 
  createVisitor
);
router.get('/',
  attachUserFromToken,
  attachRequestAudit,
  CacheMiddleware.apiCache(300, (req) => `visitors:${req.user?.email || 'anonymous'}:${JSON.stringify(req.query)}`),
  getMyVisitors
);
router.post('/:visitorId/pass', attachUserFromToken, attachRequestAudit, createPass);
router.post('/bulk-invite', 
  visitorCreationLimit,
  attachUserFromToken, 
  attachRequestAudit, 
  bulkInvite
);

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
router.get('/active', attachUserFromToken, attachRequestAudit, getActiveVisitors);
router.get('/report', attachUserFromToken, attachRequestAudit, getVisitorReport);
router.delete('/:visitorId/revoke', attachUserFromToken, attachRequestAudit, revokeVisitor);

// Route aliases to match frontend expectations
router.get('/reports', attachUserFromToken, attachRequestAudit, getVisitorReport); // Alias for /report (plural)

// Public invite route alias
router.get('/invite/:inviteCode',
  CacheMiddleware.apiCache(300, (req) => `bulk-invite:${req.params.inviteCode}`),
  getBulkInvite
);

// OTP verification shim for frontend compatibility
router.post('/verify-otp', (req, res) => {
  const { id, otp } = req.body;
  if (!id || !otp) {
    return res.status(400).json({
      success: false,
      error: {
        code: 400,
        message: 'Visitor ID and OTP are required. Use { id: visitorId, otp: "123456" } format.',
        type: 'Validation Error'
      }
    });
  }
  // Forward to existing verifyOtp controller
  req.params.id = id;
  verifyOtp(req, res);
});

export default router;
