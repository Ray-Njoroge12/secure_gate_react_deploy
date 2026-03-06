import QRCodeService from '../services/qrCodeService.js';
import WebSocketService from '../services/websocketService.js';
import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError } from '../utils/respond.js';
import { PASS_STATUS } from '../constants/statuses.js';
import { validateVisitorTransition } from '../services/visitorStateService.js';
import { passwordService } from '../services/tokenService.js';

/**
 * QR Code Controller
 * @description Handles QR code generation, validation, and scanning
 */
export const generateVisitorQR = async (req, res) => {
    try {
        const { visitorId } = req.params;
        const estateId = req.user.estate_id;

        const visitorResult = await dbManager.query(
            'SELECT id, name, phone, email, purpose, date_of_visit, status FROM visitors WHERE id = $1 AND estate_id = $2',
            [visitorId, estateId]
        );

        if (visitorResult.rows.length === 0) {
            return respondError(res, 404, 'Visitor not found');
        }

        const visitor = visitorResult.rows[0];

        // Check permissions
        if (req.user.role === 'resident') {
            const createdByResult = await dbManager.query(
                'SELECT created_by FROM visitors WHERE id = $1',
                [visitorId]
            );
            if (createdByResult.rows[0]?.created_by !== req.user.email) {
                return respondError(res, 403, 'You can only generate QR codes for your own visitors');
            }
        }

        const qrResult = await QRCodeService.generateVisitorQR(visitor);

        await dbManager.query(
            'UPDATE visitors SET qr_code = $1 WHERE id = $2',
            [qrResult.qrId, visitorId]
        );

        // Audit and WS (Simplified for brevity, following original logic)
        req.audit?.('qr.generate', 'visitor', String(visitorId), { outcome: 'success' });

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
        respondError(res, 500, `Failed to generate QR code: ${error.message}`);
    }
};

export const validateQRCode = async (req, res) => {
    try {
        const { qrToken } = req.body;
        if (!qrToken) return respondError(res, 400, 'QR token is required');

        const validation = await QRCodeService.validateQRCode(qrToken);

        if (!validation.valid) {
            return respondError(res, 400, validation.error);
        }

        if (validation.visitor?.estate_id !== req.user.estate_id) {
            return respondError(res, 403, 'Visitor does not belong to your estate');
        }

        const visitorData = { ...validation.visitor };
        const otpRequired = !!visitorData.otp_hash &&
            visitorData.otp_expires_at &&
            new Date(visitorData.otp_expires_at) > new Date();

        delete visitorData.otp_hash;
        delete visitorData.otp_expires_at;
        delete visitorData.otp_attempts;

        respond(res, {
            message: 'QR code is valid',
            data: {
                visitor: visitorData,
                qrCode: validation.qrCode,
                canCheckIn: validateVisitorTransition(validation.visitor.status, PASS_STATUS.ON_PREMISE).valid,
                otpRequired
            }
        });
    } catch (error) {
        respondError(res, 500, 'QR code validation failed');
    }
};

export const qrCheckIn = async (req, res) => {
    try {
        const { qrToken, location = 'Main Gate', otp } = req.body;
        if (!qrToken) return respondError(res, 400, 'QR token is required');

        const validation = await QRCodeService.validateQRCode(qrToken);
        if (!validation.valid) return respondError(res, 400, validation.error);

        const visitor = validation.visitor;
        if (visitor?.estate_id !== req.user.estate_id) {
            return respondError(res, 403, 'Visitor does not belong to your estate');
        }

        // OTP Verification
        if (visitor.otp_hash) {
            const now = new Date();
            if (!visitor.otp_expires_at || new Date(visitor.otp_expires_at) > now) {
                if (!otp) return respondError(res, 428, 'OTP required', 'OTP_REQUIRED');
                const isValid = await passwordService.verifyPassword(otp.toString(), visitor.otp_hash);
                if (!isValid) return respondError(res, 401, 'Invalid OTP', 'INVALID_OTP');
            }
        }

        const transition = validateVisitorTransition(visitor.status, PASS_STATUS.ON_PREMISE);
        if (!transition.valid) return respondError(res, 422, transition.reason);

        const now = new Date();
        await dbManager.query(
            'UPDATE visitors SET status = $1, check_in_time = $2, real_time_status = $3 WHERE id = $4',
            [PASS_STATUS.ON_PREMISE, now, PASS_STATUS.ON_PREMISE, visitor.id]
        );

        await QRCodeService.markQRCodeUsed(qrToken);

        // Emit WS event
        try {
            WebSocketService.emitVisitorCheckIn({
                id: visitor.id,
                name: visitor.name,
                checkInTime: now.toISOString(),
                location,
                estate_id: req.user.estate_id
            });
        } catch (wsError) {
            console.warn('Failed to emit check-in event:', wsError.message);
        }

        respond(res, {
            message: 'Visitor checked in successfully',
            data: {
                visitor: {
                    id: visitor.id,
                    name: visitor.name,
                    status: PASS_STATUS.ON_PREMISE,
                    checkInTime: now.toISOString()
                }
            }
        });
    } catch (error) {
        respondError(res, 500, 'Check-in failed');
    }
};

export const regenerateQR = async (req, res) => {
    try {
        const { id } = req.params;

        // Get visitor details
        const visitorResult = await dbManager.query(
            `SELECT id, name, phone, email, purpose, date_of_visit, estate_id, status, visitor_token
       FROM visitors WHERE id = $1`,
            [id]
        );

        if (visitorResult.rows.length === 0) {
            return respondError(res, 404, 'Visitor not found');
        }

        const visitor = visitorResult.rows[0];

        // Only allow regeneration if status indicates QR issue
        if (!['qr_pending', 'otp_verified', 'pending'].includes(visitor.status)) {
            return respondError(res, 400, 'QR regeneration not available for this visitor status');
        }

        const qrResult = await QRCodeService.generateVisitorQR({
            id: visitor.id,
            name: visitor.name,
            phone: visitor.phone,
            purpose: visitor.purpose,
            date_of_visit: visitor.date_of_visit,
            estate_id: visitor.estate_id
        }, { generateOtp: false });

        if (qrResult?.success) {
            const qrId = qrResult.data.qrId;
            if (qrId) {
                await dbManager.query(
                    'UPDATE visitors SET qr_code = $1, status = $2 WHERE id = $3',
                    [qrId, 'otp_verified', visitor.id]
                );
            }

            respond(res, {
                message: 'QR code regenerated successfully',
                data: {
                    qr_code: qrResult.data.qrCodeDataUrl,
                    visitor_token: visitor.visitor_token
                }
            });
        } else {
            respondError(res, 500, 'Failed to generate QR code');
        }
    } catch (error) {
        console.error('[regenerateQR] Error:', error);
        respondError(res, 500, 'QR regeneration failed');
    }
};

export const getQRCodeByVisitor = async (req, res) => {
    try {
        const { visitorId } = req.params;
        const qrCode = await QRCodeService.getQRCodeByVisitorId(visitorId);
        if (!qrCode) return respondError(res, 404, 'QR code not found');

        respond(res, { data: qrCode });
    } catch (error) {
        respondError(res, 500, 'Failed to retrieve QR code');
    }
};

export const getQRAnalytics = async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - parseInt(days));

        const analytics = await QRCodeService.getQRCodeAnalytics(dateFrom, new Date());
        respond(res, { data: analytics });
    } catch (error) {
        respondError(res, 500, 'Failed to retrieve analytics');
    }
};

export const cleanupQRCodes = async (req, res) => {
    try {
        const cleanedCount = await QRCodeService.cleanupExpiredQRCodes();
        respond(res, { message: 'Cleanup successful', data: { cleanedCount } });
    } catch (error) {
        respondError(res, 500, 'Cleanup failed');
    }
};

export default {
    generateVisitorQR,
    validateQRCode,
    qrCheckIn,
    regenerateQR,
    getQRCodeByVisitor,
    getQRAnalytics,
    cleanupQRCodes
};
