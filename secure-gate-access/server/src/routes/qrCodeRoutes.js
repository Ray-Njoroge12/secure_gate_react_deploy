/**
 * QR CODE ROUTES - Phase 2.3
 * Handles QR code generation, validation, and scanning operations
 */

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import attachRequestAudit from '../middleware/auditLogger.js';
import requireEstateContext from '../middleware/estateContextMiddleware.js';
import QRCodeService from '../services/qrCodeService.js';
import WebSocketService from '../services/websocketService.js';
import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError } from '../utils/respond.js';
import { PASS_STATUS } from '../constants/statuses.js';
import { validateVisitorTransition } from '../services/visitorStateService.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

/**
 * Generate QR code for visitor
 */
router.post('/generate/:visitorId', authenticateToken, requireEstateContext, attachRequestAudit(), async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');

    const { visitorId } = req.params;

    const estateCheck = await dbManager.query(
      'SELECT id FROM visitors WHERE id = $1 AND estate_id = $2',
      [visitorId, req.user.estate_id]
    );

    if (estateCheck.rows.length === 0) {
      return respondError(res, 404, 'Visitor not found');
    }

    // Get visitor information
    const visitorResult = await dbManager.query(
      'SELECT id, name, phone, email, purpose, date_of_visit, status FROM visitors WHERE id = $1 AND estate_id = $2',
      [visitorId, req.user.estate_id]
    );

    if (visitorResult.rows.length === 0) {
      return respondError(res, 404, 'Visitor not found');
    }

    const visitor = visitorResult.rows[0];

    // Check if user has permission to generate QR code for this visitor
    if (req.user.role === 'resident') {
      // Residents can only generate QR codes for their own invites
      const createdByResult = await dbManager.query(
        'SELECT created_by FROM visitors WHERE id = $1 AND estate_id = $2',
        [visitorId, req.user.estate_id]
      );

      if (createdByResult.rows[0]?.created_by !== req.user.email) {
        return respondError(res, 403, 'You can only generate QR codes for your own visitors');
      }
    }

    // Generate QR code
    const qrResult = await QRCodeService.generateVisitorQR(visitor);

    // Update visitor record with QR code reference
    await dbManager.query(
      'UPDATE visitors SET qr_code = $1 WHERE id = $2 AND estate_id = $3',
      [qrResult.qrId, visitorId, req.user.estate_id]
    );

    // Log activity
    await req.audit?.('qr.generate', 'visitor', String(visitorId), {
      outcome: 'success',
      message: 'QR code generated for visitor',
      qrId: qrResult.qrId
    });

    // Emit real-time event
    try {
      WebSocketService.getDashboardEvents()?.emitSystemNotification({
        id: `qr_generated_${Date.now()}`,
        title: 'QR Code Generated',
        message: `QR code generated for visitor ${visitor.name}`,
        type: 'info',
        targetRoles: ['admin', 'guard']
      });
    } catch (wsError) {
      console.warn('Failed to emit QR generation notification:', wsError.message);
    }

    respond(res, {
      message: 'QR code generated successfully',
      data: {
        qrId: qrResult.qrId,
        qrCodeDataUrl: qrResult.qrCodeDataUrl,
        expiresAt: qrResult.expiresAt,
        visitorName: visitor.name
      }
    });

  } catch (error) {
    await req.audit?.('qr.generate', 'visitor', req.params.visitorId, {
      outcome: 'fail',
      message: 'Failed to generate QR code',
      error: error.message
    });
    respondError(res, 500, `Failed to generate QR code: ${error.message}`);
  }
});

/**
 * Validate QR code token
 */
router.post('/validate', authenticateToken, requireEstateContext, attachRequestAudit(), async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');

    // Only guards and admins can validate QR codes
    if (req.user.role !== 'guard' && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return respondError(res, 403, 'Only guards and admins can validate QR codes');
    }

    const { qrToken } = req.body;

    if (!qrToken) {
      return respondError(res, 400, 'QR token is required');
    }

    // Validate QR code
    const validation = await QRCodeService.validateQRCode(qrToken, { estateId: req.user.estate_id });

    if (!validation.valid) {
      await req.audit?.('qr.validate', 'qr_code', null, {
        outcome: 'fail',
        message: 'QR code validation failed',
        error: validation.error
      });
      return respondError(res, 400, validation.error);
    }

    const validationQrId = validation.qrCode?.id ?? validation.qrCode?.qr_id ?? validation.qrId ?? null;
    const visitorEstateId = validation.visitor?.estate_id ?? req.user.estate_id;
    const qrCodeData = validation.qrCode ?? (validationQrId ? { id: validationQrId } : undefined);

    if (visitorEstateId !== req.user.estate_id) {
      await req.audit?.('qr.validate', 'qr_code', validationQrId, {
        outcome: 'fail',
        message: 'QR code estate mismatch',
        visitorId: validation.visitor?.id
      });
      return respondError(res, 403, 'Visitor does not belong to your estate');
    }

    await req.audit?.('qr.validate', 'qr_code', validationQrId, {
      outcome: 'success',
      message: 'QR code validated successfully',
      visitorId: validation.visitor.id,
      visitorName: validation.visitor.name
    });

    // Sanitize visitor data (remove sensitive OTP fields)
    const visitorData = { ...validation.visitor };
    const otpRequired = !!visitorData.otp_hash &&
      visitorData.otp_expires_at &&
      new Date(visitorData.otp_expires_at) > new Date();

    // Remove sensitive fields
    delete visitorData.otp_hash;
    delete visitorData.otp_expires_at;
    delete visitorData.otp_attempts;

    respond(res, {
      message: 'QR code is valid',
      data: {
        visitor: visitorData,
        qrCode: qrCodeData,
        canCheckIn: validateVisitorTransition(validation.visitor.status, PASS_STATUS.ON_PREMISE).valid,
        otpRequired: otpRequired
      }
    });

  } catch (error) {
    await req.audit?.('qr.validate', 'qr_code', null, {
      outcome: 'fail',
      message: 'QR code validation error',
      error: error.message
    });
    respondError(res, 500, 'QR code validation failed');
  }
});

/**
 * Check-in visitor using QR code
 */
router.post('/checkin', authenticateToken, requireEstateContext, attachRequestAudit(), async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');

    // Only guards and admins can check-in visitors
    if (req.user.role !== 'guard' && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return respondError(res, 403, 'Only guards and admins can check-in visitors');
    }

    const { qrToken, location = 'Main Gate', notes, otp } = req.body;

    if (!qrToken) {
      return respondError(res, 400, 'QR token is required');
    }

    // Validate QR code
    const validation = await QRCodeService.validateQRCode(qrToken, { estateId: req.user.estate_id });

    if (!validation.valid) {
      return respondError(res, 400, validation.error);
    }

    const visitor = validation.visitor;
    const visitorId = visitor?.id ?? validation.visitorId ?? null;
    const validationQrId = validation.qrCode?.id ?? validation.qrCode?.qr_id ?? validation.qrId ?? null;
    const visitorEstateId = visitor?.estate_id ?? req.user.estate_id;

    if (visitorEstateId !== req.user.estate_id) {
      return respondError(res, 403, 'Visitor does not belong to your estate');
    }

    // OTP Verification
    if (visitor.otp_hash) {
      const now = new Date();
      const expiresAt = visitor.otp_expires_at ? new Date(visitor.otp_expires_at) : null;

      const isExpired = expiresAt && expiresAt < now;

      // If OTP exists and is not expired, verify it
      if (!isExpired) {
        if (!otp) {
          return respondError(res, 428, 'OTP required', 'OTP_REQUIRED');
        }

        const isValid = await bcrypt.compare(otp.toString(), visitor.otp_hash);

        if (!isValid) {
          // Increment attempts? (Optional, skipping DB update for speed unless critical)
          await req.audit?.('visitor.checkin_failed', 'visitor', String(visitorId), {
            outcome: 'fail',
            message: 'Invalid OTP provided',
            qrId: validationQrId
          });
          return respondError(res, 401, 'Invalid OTP', 'INVALID_OTP');
        }
      }
    }

    // Check if visitor can be checked in
    const transition = validateVisitorTransition(visitor.status, PASS_STATUS.ON_PREMISE);
    if (!transition.valid) {
      return respondError(res, 422, transition.reason);
    }

    // Check-in visitor
    const now = new Date();
    await dbManager.query(
      'UPDATE visitors SET status = $1, check_in_time = $2, real_time_status = $3 WHERE id = $4 AND estate_id = $5',
      [PASS_STATUS.ON_PREMISE, now, PASS_STATUS.ON_PREMISE, visitorId, req.user.estate_id]
    );

    // Mark QR code as used
    await QRCodeService.markQRCodeUsed(qrToken, { estateId: req.user.estate_id });

    // Emit real-time check-in event
    try {
      WebSocketService.emitVisitorCheckIn({
        id: visitorId,
        name: visitor.name,
        phone: visitor.phone,
        purpose: visitor.purpose,
        checkInTime: now.toISOString(),
        location: location,
        estate_id: req.user.estate_id  // Estate context for room scoping
      });
    } catch (wsError) {
      console.warn('Failed to emit check-in event:', wsError.message);
    }

    await req.audit?.('visitor.qr_checkin', 'visitor', String(visitorId), {
      outcome: 'success',
      message: 'Visitor checked in via QR code',
      qrId: validationQrId,
      location: location,
      guardEmail: req.user.email
    });

    respond(res, {
      message: 'Visitor checked in successfully',
      data: {
        visitor: {
          id: visitorId,
          name: visitor.name,
          status: PASS_STATUS.ON_PREMISE,
          checkInTime: now.toISOString(),
          location: location
        }
      }
    });

  } catch (error) {
    await req.audit?.('visitor.qr_checkin', 'visitor', null, {
      outcome: 'fail',
      message: 'QR check-in failed',
      error: error.message
    });
    respondError(res, 500, 'Check-in failed');
  }
});

/**
 * Get QR code by visitor ID
 */
router.get('/visitor/:visitorId', authenticateToken, requireEstateContext, attachRequestAudit(), async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');

    const { visitorId } = req.params;

    // Check permissions
    if (req.user.role === 'resident') {
      const createdByResult = await dbManager.query(
        'SELECT created_by FROM visitors WHERE id = $1 AND estate_id = $2',
        [visitorId, req.user.estate_id]
      );

      if (createdByResult.rows[0]?.created_by !== req.user.email) {
        return respondError(res, 403, 'You can only view QR codes for your own visitors');
      }
    }

    const qrCode = await QRCodeService.getQRCodeByVisitorId(visitorId);

    if (!qrCode) {
      return respondError(res, 404, 'QR code not found for this visitor');
    }

    respond(res, {
      data: {
        qrId: qrCode.id,
        status: qrCode.status,
        expiresAt: qrCode.expires_at,
        scanCount: qrCode.scan_count,
        createdAt: qrCode.created_at
      }
    });

  } catch (error) {
    respondError(res, 500, 'Failed to retrieve QR code');
  }
});

/**
 * Get QR code analytics (admin only)
 */
router.get('/analytics', authenticateToken, attachRequestAudit(), async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');

    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return respondError(res, 403, 'Admin access required');
    }

    const { days = 7 } = req.query;
    const daysBack = parseInt(days);

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - daysBack);
    const dateTo = new Date();

    const analytics = await QRCodeService.getQRCodeAnalytics(dateFrom, dateTo);

    respond(res, {
      data: analytics,
      period: `${daysBack} days`
    });

  } catch (error) {
    respondError(res, 500, 'Failed to retrieve QR code analytics');
  }
});

/**
 * Cleanup expired QR codes (admin only)
 */
router.post('/cleanup', authenticateToken, attachRequestAudit(), async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');

    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return respondError(res, 403, 'Admin access required');
    }

    const cleanedCount = await QRCodeService.cleanupExpiredQRCodes();

    await req.audit?.('qr.cleanup', 'system', null, {
      outcome: 'success',
      message: 'Expired QR codes cleaned up',
      cleanedCount: cleanedCount
    });

    respond(res, {
      message: 'Expired QR codes cleaned up successfully',
      data: { cleanedCount }
    });

  } catch (error) {
    await req.audit?.('qr.cleanup', 'system', null, {
      outcome: 'fail',
      message: 'QR code cleanup failed',
      error: error.message
    });
    respondError(res, 500, 'Failed to cleanup expired QR codes');
  }
});

export default router;
