/**
 * QR CODE ROUTES - Phase 2.3
 * Handles QR code generation, validation, and scanning operations
 */

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRolePolicy } from '../middleware/rolePolicy.js';
import { attachRequestAudit } from '../middleware/auditLogging.js';
import requireEstateContext from '../middleware/estateContextMiddleware.js';
import qrCodeController from '../controllers/qrCodeController.js';

const router = express.Router();

/**
 * @swagger
 * /api/qr/generate/{visitorId}:
 *   post:
 *     summary: Generate QR code for visitor
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 */
router.post('/generate/:visitorId', authenticateToken, requireEstateContext, attachRequestAudit(), qrCodeController.generateVisitorQR);

/**
 * @swagger
 * /api/qr/validate:
 *   post:
 *     summary: Validate QR code token
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 */
router.post('/validate', authenticateToken, requireEstateContext, attachRequestAudit(), qrCodeController.validateQRCode);

/**
 * @swagger
 * /api/qr/checkin:
 *   post:
 *     summary: Check-in visitor using QR code
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 */
router.post('/checkin', authenticateToken, requireEstateContext, attachRequestAudit(), qrCodeController.qrCheckIn);

/**
 * @swagger
 * /api/qr/visitor/{visitorId}:
 *   get:
 *     summary: Get QR code by visitor ID
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 */
router.get('/visitor/:visitorId', authenticateToken, requireEstateContext, attachRequestAudit(), qrCodeController.getQRCodeByVisitor);

/**
 * @swagger
 * /api/qr/analytics:
 *   get:
 *     summary: Get QR code analytics (admin only)
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 */
router.get('/analytics', authenticateToken, requireRolePolicy('adminOnly'), requireEstateContext, attachRequestAudit(), qrCodeController.getQRAnalytics);

/**
 * @swagger
 * /api/qr/cleanup:
 *   post:
 *     summary: Cleanup expired QR codes (admin only)
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 */
router.post('/cleanup', authenticateToken, requireRolePolicy('adminOnly'), requireEstateContext, attachRequestAudit(), qrCodeController.cleanupQRCodes);

export default router;
