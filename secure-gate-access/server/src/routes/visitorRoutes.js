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
import { attachUserFromToken, authenticateToken } from '../middleware/authMiddleware.js';
import attachRequestAudit from '../middleware/auditLogger.js';
import CacheMiddleware from '../middleware/cacheMiddleware.js';
import { validateRequest, ValidationSchemas } from '../middleware/validationMiddleware.js';
import { rateLimit } from 'express-rate-limit';

import { registerWalkIn, getTodayWalkIns } from '../controllers/walkInController.js';
import {
  requestApproval,
  approveVisitor,
  rejectVisitor,
  getPendingApprovals,
  getApprovalHistory
} from '../controllers/visitorApprovalController.js';

const router = express.Router();

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
  attachUserFromToken,
  attachRequestAudit,
  // CacheMiddleware.createMiddleware({ ttl: 300 }), // Temporarily disabled for debugging
  getMyVisitors
);
router.post('/:visitorId/pass', attachUserFromToken, attachRequestAudit, createPass);
router.post('/bulk-invite',
  visitorCreationLimit,
  authenticateToken,  // Changed from attachUserFromToken to authenticateToken (requires auth)
  attachRequestAudit,
  bulkInvite
);

// Guard Operations (guard/admin roles required) - require authentication
router.post('/:id/check-in', authenticateToken, attachRequestAudit, checkInVisitor);
router.post('/:id/check-out', authenticateToken, attachRequestAudit, checkOutVisitor);

// Walk-in registration (guard only) - Phase G2
router.post('/walk-in', authenticateToken, attachRequestAudit, registerWalkIn);
router.get('/walk-ins/today', authenticateToken, attachRequestAudit, getTodayWalkIns);

// Approval flow aliases (client compatibility)
router.post('/:id/request-approval', authenticateToken, attachRequestAudit, requestApproval);
router.post('/:id/approve', authenticateToken, attachRequestAudit, approveVisitor);
router.post('/:id/reject', authenticateToken, attachRequestAudit, rejectVisitor);
router.get('/pending-approvals', authenticateToken, attachRequestAudit, getPendingApprovals);
router.get('/approval-history', authenticateToken, attachRequestAudit, getApprovalHistory);

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
router.post('/:id/verify-otp', verifyOtp);
router.post('/:id/resend-otp', resendOtp);

// Public routes (guests) - cached for performance
router.get('/bulk-invite/:inviteCode',
  CacheMiddleware.createMiddleware({ ttl: 300 }),
  getBulkInvite
);
router.post('/complete/:inviteCode', completeInvite);
router.post('/self-checkin/:inviteCode', selfCheckIn);

// Cancel/Delete visitor (resident can cancel their own, admin can cancel any)
router.delete('/:id', attachUserFromToken, attachRequestAudit, cancelVisitor);

// Admin Operations (admin role required)
router.get('/active', attachUserFromToken, attachRequestAudit, getActiveVisitors);
router.get('/report', attachUserFromToken, attachRequestAudit, getVisitorReport);
router.delete('/:visitorId/revoke', attachUserFromToken, attachRequestAudit, revokeVisitor);

// Route aliases to match frontend expectations
router.get('/reports', attachUserFromToken, attachRequestAudit, getVisitorReport); // Alias for /report (plural)

// Public invite route alias
router.get('/invite/:inviteCode',
  CacheMiddleware.createMiddleware({ ttl: 300 }),
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
