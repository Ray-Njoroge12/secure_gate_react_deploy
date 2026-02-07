import express from 'express';
import {
  createVisitor,
  getMyVisitors,
  createPass,
  bulkInvite,
  getBulkInvite,
  completeInvite,
  cancelVisitor
} from '../controllers/visitorInviteController.js';
import { verifyOtp, resendOtp } from '../controllers/visitorOtpController.js';
import { checkInVisitor, checkOutVisitor, selfCheckIn } from '../controllers/visitorCheckInController.js';
import { revokeVisitor, getActiveVisitors, getVisitorReport } from '../controllers/visitorAdminController.js';
import { attachUserFromToken, authenticateToken, requireEstate, requireRole } from '../middleware/authMiddleware.js';
import { requireRolePolicy } from '../middleware/rolePolicy.js';
import attachRequestAudit from '../middleware/auditLogger.js';
import CacheMiddleware from '../middleware/cacheMiddleware.js';
import { validateRequest, ValidationSchemas } from '../middleware/validationMiddleware.js';
import { rateLimit } from 'express-rate-limit';
import { minimizeData } from '../middleware/dataMinimization.js';
import { buildErrorPayload } from '../utils/responseFormatter.js';
import { asyncHandler } from '../middleware/standardizedErrorHandler.js';

import { registerWalkIn, getTodayWalkIns } from '../controllers/walkInController.js';
import {
  requestApproval,
  approveVisitor,
  rejectVisitor,
  getPendingApprovals,
  getApprovalHistory
} from '../controllers/visitorApprovalController.js';

const router = express.Router();

// Rate limiter for completeInvite endpoint (stricter to prevent abuse)
const completeInviteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  message: 'Too many invite completion attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP + invite code combination
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.ip ||
      'unknown';
    return `complete-invite:${ip}:${req.params.inviteCode || 'unknown'}`;
  },
  handler: (req, res) => {
    const response = buildErrorPayload(req, res, 'Too many invite completion attempts. Please wait a moment and try again.', 'RATE_LIMITED');
    res.status(429).json(response);
  }
});

/**
 * @swagger
 * /api/visitors:
 *   post:
 *     summary: Create a new visitor
 *     description: Create a new visitor invitation for a resident
 *     tags: [Visitors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - email
 *               - purpose
 *               - expectedArrival
 *             properties:
 *               name:
 *                 type: string
 *                 description: Visitor's full name
 *                 example: John Doe
 *               phone:
 *                 type: string
 *                 description: Visitor's phone number
 *                 example: "+254712345678"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Visitor's email address
 *                 example: john@example.com
 *               purpose:
 *                 type: string
 *                 description: Purpose of visit
 *                 example: "Meeting with resident"
 *               expectedArrival:
 *                 type: string
 *                 format: date-time
 *                 description: Expected arrival time
 *                 example: "2025-01-01T14:00:00.000Z"
 *               notes:
 *                 type: string
 *                 description: Additional notes about the visit
 *                 example: "Please bring ID"
 *     responses:
 *       201:
 *         description: Visitor created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         visitor:
 *                           $ref: '#/components/schemas/Visitor'
 *             example:
 *               success: true
 *               message: Visitor created successfully
 *               data:
 *                 visitor:
 *                   id: 1
 *                   name: "John Doe"
 *                   phone: "+254712345678"
 *                   email: "john@example.com"
 *                   purpose: "Meeting with resident"
 *                   status: "PENDING"
 *                   expectedArrival: "2025-01-01T14:00:00.000Z"
 *                   created_at: "2025-01-01T10:00:00.000Z"
 *               timestamp: "2025-01-01T00:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */

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

// Stricter rate limiting for bulk invite operations
// Bulk invites can create many visitors at once, so limit more aggressively
const bulkInviteLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // Maximum 5 bulk invites per hour per user
  message: {
    error: 'Too many bulk invite operations. Please try again later.',
    retryAfter: '1 hour',
    code: 'BULK_INVITE_RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by authenticated user ID for bulk operations
    return `bulk_invite_${req.user?.id || req.ip}`;
  },
  skip: (req) => {
    // Skip rate limiting for admins in emergency situations
    return (req.user?.role === 'admin' || req.user?.role === 'super_admin') && req.headers['x-emergency-bypass'] === 'true';
  }
});

// Daily limit for total visitors created via bulk invite
const dailyBulkInviteLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 20, // Maximum 20 bulk invite operations per day
  message: {
    error: 'Daily bulk invite limit reached. Please try again tomorrow.',
    retryAfter: '24 hours',
    code: 'DAILY_BULK_LIMIT_REACHED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `daily_bulk_${req.user?.id || req.ip}`,
});

/**
 * @swagger
 * /api/visitors:
 *   get:
 *     summary: Get my visitors
 *     description: Retrieve all visitors created by the current resident
 *     tags: [Visitors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, VERIFIED, ON_PREMISE, CHECKED_OUT, REVOKED]
 *         description: Filter by visitor status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by visitor name, phone, or email
 *     responses:
 *       200:
 *         description: Visitors retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         visitors:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Visitor'
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             page: { type: integer }
 *                             limit: { type: integer }
 *                             total: { type: integer }
 *                             pages: { type: integer }
 *             example:
 *               success: true
 *               message: Visitors retrieved successfully
 *               data:
 *                 visitors:
 *                   - id: 1
 *                     name: "John Doe"
 *                     phone: "+254712345678"
 *                     email: "john@example.com"
 *                     status: "PENDING"
 *                     created_at: "2025-01-01T10:00:00.000Z"
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   total: 1
 *                   pages: 1
 *               timestamp: "2025-01-01T00:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

// Protected routes (resident-auth required)
router.post('/',
  visitorCreationLimit,
  authenticateToken,  // Changed from attachUserFromToken to authenticateToken (requires auth)
  attachRequestAudit,
  createVisitor
);
router.get('/',
  authenticateToken,
  requireEstate,
  minimizeData('visitor'),
  attachRequestAudit,
  // CacheMiddleware.createMiddleware({ ttl: 300 }), // Temporarily disabled for debugging
  getMyVisitors
);
router.post('/:visitorId/pass', attachUserFromToken, attachRequestAudit, createPass);
router.post('/bulk-invite',
  authenticateToken,  // Must authenticate first to get user ID for rate limiting
  bulkInviteLimit,    // Hourly limit: 5 bulk invites per hour
  dailyBulkInviteLimit, // Daily limit: 20 bulk invites per day
  attachRequestAudit,
  bulkInvite
);

// Complete invite route (public - visitor completing their registration)
// SEC-010: Rate-limited to prevent abuse of visitor registration
router.post('/complete/:inviteCode',
  completeInviteLimiter,
  attachRequestAudit,
  completeInvite
);

// Self check-in route (public - visitor self-checking in with invite code)
// SEC-011: Rate-limited to prevent unauthorized access attempts
router.post('/self-check-in/:inviteCode',
  completeInviteLimiter,  // Reuse same rate limiter (similar abuse risk)
  attachRequestAudit,
  selfCheckIn
);

// Guard Operations (guard/admin/super_admin roles required)
router.post('/:id/check-in',
  authenticateToken,
  requireRolePolicy('adminOrGuard'),
  attachRequestAudit,
  checkInVisitor
);

router.post('/:id/check-out',
  authenticateToken,
  requireRolePolicy('adminOrGuard'),
  attachRequestAudit,
  checkOutVisitor
);

// Walk-in registration (guard/admin/super_admin only)
router.post('/walk-in',
  authenticateToken,
  requireRolePolicy('adminOrGuard'),
  attachRequestAudit,
  registerWalkIn
);

router.get('/walk-ins/today',
  authenticateToken,
  requireRolePolicy('adminOrGuard'),
  attachRequestAudit,
  getTodayWalkIns
);

// Rate limiter for approval operations (prevent abuse)
const approvalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 approvals per minute per user
  message: {
    error: 'Too many approval operations, please try again later.',
    retryAfter: '1 minute',
    code: 'APPROVAL_RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `approval_${req.user?.id || req.ip}`
});

// SEC-007: Strict IP-based rate limiter for OTP verification (prevent brute-force)
const otpVerifyRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 5, // 5 OTP verification attempts per minute per IP
  message: {
    error: 'Too many OTP verification attempts. Please wait and try again.',
    retryAfter: '1 minute',
    code: 'OTP_VERIFY_RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP + visitor ID combination to prevent enumeration
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.ip ||
      'unknown';
    return `otp_verify:${ip}:${req.params.id || req.body?.id || 'unknown'}`;
  },
  handler: (req, res) => {
    const response = buildErrorPayload(req, res, 'Too many OTP verification attempts. Please wait a minute and try again.', 'OTP_VERIFY_RATE_LIMITED');
    res.status(429).json(response);
  }
});

// SEC-008: Stricter global IP rate limit for OTP (prevent mass enumeration)
const otpGlobalIpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 total OTP attempts per IP across all visitors
  message: {
    error: 'Too many OTP requests from this IP. Please try again later.',
    retryAfter: '15 minutes',
    code: 'OTP_GLOBAL_RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.ip ||
      'unknown';
    return `otp_global:${ip}`;
  },
  handler: (req, res) => {
    const response = buildErrorPayload(req, res, 'Too many OTP requests from this IP address. Please try again in 15 minutes.', 'OTP_GLOBAL_RATE_LIMITED');
    res.status(429).json(response);
  }
});

// SEC-009: Rate limiter for OTP resend (prevent SMS/email flooding)
const otpResendRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 resend attempts per 5 minutes per IP + visitor
  message: {
    error: 'Too many OTP resend requests. Please wait and try again.',
    retryAfter: '5 minutes',
    code: 'OTP_RESEND_RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.ip ||
      'unknown';
    return `otp_resend:${ip}:${req.params.id || 'unknown'}`;
  },
  handler: (req, res) => {
    const response = buildErrorPayload(req, res, 'Too many OTP resend requests. Please wait 5 minutes before trying again.', 'OTP_RESEND_RATE_LIMITED');
    res.status(429).json(response);
  }
});

// Approval flow - with proper role enforcement (RES-004 FIX)
// Guards can request approval, residents can approve/reject
router.post('/:id/request-approval',
  authenticateToken,
  requireRolePolicy('adminOrGuard'),
  approvalRateLimiter,
  attachRequestAudit,
  requestApproval
);

router.post('/:id/approve',
  authenticateToken,
  requireRolePolicy('adminOrResident'),
  approvalRateLimiter,
  attachRequestAudit,
  approveVisitor
);

router.post('/:id/reject',
  authenticateToken,
  requireRolePolicy('adminOrResident'),
  approvalRateLimiter,
  attachRequestAudit,
  rejectVisitor
);

router.get('/pending-approvals',
  authenticateToken,
  requireRolePolicy('adminOrResident'),
  attachRequestAudit,
  getPendingApprovals
);

router.get('/approval-history',
  authenticateToken,
  requireRolePolicy('adminOrResident'),
  attachRequestAudit,
  getApprovalHistory
);

/**
 * @swagger
 * /api/visitors/{id}/verify-otp:
 *   post:
 *     summary: Verify visitor OTP
 *     description: Verify the OTP code sent to visitor's phone for access
 *     tags: [Visitors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Visitor ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otp
 *             properties:
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP code
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         visitor:
 *                           $ref: '#/components/schemas/Visitor'
 *                         accessGranted:
 *                           type: boolean
 *             example:
 *               success: true
 *               message: OTP verified successfully
 *               data:
 *                 visitor:
 *                   id: 1
 *                   name: "John Doe"
 *                   status: "VERIFIED"
 *                 accessGranted: true
 *               timestamp: "2025-01-01T00:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: Invalid OTP code
 *               error:
 *                 code: INVALID_OTP
 *               timestamp: "2025-01-01T00:00:00.000Z"
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/visitors/{id}/resend-otp:
 *   post:
 *     summary: Resend visitor OTP
 *     description: Resend OTP code to visitor's phone
 *     tags: [Visitors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Visitor ID
 *         example: 1
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               success: true
 *               message: OTP resent successfully
 *               data: {}
 *               timestamp: "2025-01-01T00:00:00.000Z"
 *       400:
 *         description: OTP resend limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: OTP resend limit exceeded
 *               error:
 *                 code: RATE_LIMIT_EXCEEDED
 *               timestamp: "2025-01-01T00:00:00.000Z"
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */

// OTP Operations (public endpoints for visitor verification)
// SEC-007/008/009: IP-based rate limiting to prevent brute-force and enumeration attacks
router.post('/:id/verify-otp',
  otpGlobalIpRateLimiter,   // Global IP limit: 20 attempts per 15 min across all visitors
  otpVerifyRateLimiter,      // Per-visitor limit: 5 attempts per minute per IP + visitor ID
  attachRequestAudit,
  verifyOtp
);
router.post('/:id/resend-otp',
  otpGlobalIpRateLimiter,   // Global IP limit
  otpResendRateLimiter,      // Resend limit: 3 per 5 min per IP + visitor ID
  attachRequestAudit,
  resendOtp
);

// QR Code Regeneration (BULK-005: Allow visitors to regenerate failed QR codes)
router.post('/:id/regenerate-qr', rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 regeneration attempts per hour
  message: 'Too many QR regeneration attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
}), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { QRCodeService } = await import('../services/qrCodeService.js');
  const { dbManager } = await import('../config/database.js');
  
  // Get visitor details
  const visitorResult = await dbManager.query(
    `SELECT id, name, phone, email, purpose, date_of_visit, estate_id, status, visitor_token
     FROM visitors WHERE id = $1`,
    [id]
  );
  
  if (visitorResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Visitor not found' }
    });
  }
  
  const visitor = visitorResult.rows[0];
  
  // Only allow regeneration if status indicates QR issue
  if (!['qr_pending', 'otp_verified', 'pending'].includes(visitor.status)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: 'QR regeneration not available for this visitor status' }
    });
  }
  
  try {
    const qrResult = await QRCodeService.generateVisitorQR({
      id: visitor.id,
      name: visitor.name,
      phone: visitor.phone,
      purpose: visitor.purpose,
      date_of_visit: visitor.date_of_visit,
      estate_id: visitor.estate_id
    }, { generateOtp: false });
    
    if (qrResult?.success) {
      const qrCodeDataUrl = qrResult.data.qrCodeDataUrl;
      const qrId = qrResult.data.qrId;
      
      // Update visitor with QR code
      if (qrId) {
        await dbManager.query(
          'UPDATE visitors SET qr_code = $1, status = $2 WHERE id = $3',
          [qrId, 'otp_verified', visitor.id]
        );
      }
      
      res.json({
        success: true,
        message: 'QR code regenerated successfully',
        data: {
          qr_code: qrCodeDataUrl,
          visitor_token: visitor.visitor_token
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: { code: 'QR_GENERATION_FAILED', message: 'Failed to generate QR code, please try again later' }
      });
    }
  } catch (error) {
    console.error('[regenerateQR] Error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'QR regeneration failed' }
    });
  }
}));

// Cancel/Delete visitor (resident can cancel their own, admin can cancel any)
router.delete('/:id', authenticateToken, attachRequestAudit, cancelVisitor);

// Admin Operations (admin role required)
router.get('/active', authenticateToken, requireRolePolicy('adminOrGuard'), minimizeData('visitor'), attachRequestAudit, getActiveVisitors);
router.get('/report', authenticateToken, requireRolePolicy('adminOnly'), minimizeData('visitor'), attachRequestAudit, getVisitorReport);
router.delete('/:visitorId/revoke', authenticateToken, requireRolePolicy('adminOnly'), attachRequestAudit, revokeVisitor);

// Route aliases to match frontend expectations
router.get('/reports', authenticateToken, requireRolePolicy('adminOnly'), minimizeData('visitor'), attachRequestAudit, getVisitorReport); // Alias for /report (plural)

// Public invite route alias
router.get('/invite/:inviteCode',
  CacheMiddleware.createMiddleware({ ttl: 300 }),
  getBulkInvite
);

// OTP verification shim for frontend compatibility (also rate-limited)
router.post('/verify-otp',
  otpGlobalIpRateLimiter,
  otpVerifyRateLimiter,
  (req, res) => {
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
