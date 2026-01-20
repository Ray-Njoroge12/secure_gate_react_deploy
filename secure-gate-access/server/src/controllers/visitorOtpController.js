import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError } from '../utils/respond.js';
import argon2 from 'argon2';
import { PASS_STATUS } from '../constants/statuses.js';
import { generateOTP, validateOTPFormat } from '../utils/tokenHelper.js';
import notificationService from '../services/notificationService.js';

const verifyOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;

    if (!otp) return respondError(res, 400, 'OTP is required');
    if (!validateOTPFormat(otp)) return respondError(res, 400, 'Invalid OTP format');

    let query = 'SELECT id, otp_hash, otp_expires_at, otp_attempts, status, name, phone, email FROM visitors WHERE id = $1';
    const params = [id];

    // Fix G-002: Enforce estate scoping if authenticated user (Guard/Admin)
    if (req.user && req.user.estate_id) {
      query += ' AND estate_id = $2';
      params.push(req.user.estate_id);
    }

    const vRes = await dbManager.query(query, params);
    const visitor = vRes.rows[0];
    if (!visitor) return respondError(res, 404, 'Visitor not found');

    const currentStatus = String(visitor.status || '').toLowerCase();

    // Allow both PENDING and OTP_SENT status for verification
    if (currentStatus !== PASS_STATUS.PENDING && currentStatus !== PASS_STATUS.OTP_SENT) {
      return respondError(res, 422, 'Visitor already verified or checked in');
    }

    const maxAttempts = Number(process.env.OTP_MAX_ATTEMPTS || 5);
    const attempts = Number(visitor.otp_attempts || 0);
    if (attempts >= maxAttempts) {
      await req.audit?.('visitor.otp.verify', 'visitor', String(id), {
        outcome: 'fail',
        message: 'OTP verification blocked (max attempts reached)',
        otpAttempts: attempts
      });
      return respondError(res, 429, 'Too many OTP attempts. Please request a new OTP.');
    }

    if (!visitor.otp_hash || !visitor.otp_expires_at) {
      await req.audit?.('visitor.otp.verify', 'visitor', String(id), {
        outcome: 'fail',
        message: 'OTP not issued for visitor'
      });
      return respondError(res, 400, 'OTP not issued. Please request a new OTP.');
    }

    const expiresAt = new Date(visitor.otp_expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      await req.audit?.('visitor.otp.verify', 'visitor', String(id), {
        outcome: 'fail',
        message: 'OTP expired'
      });
      return respondError(res, 400, 'OTP expired. Please request a new OTP.');
    }

    const isValid = await argon2.verify(visitor.otp_hash, otp);
    if (!isValid) {
      await dbManager.query(
        'UPDATE visitors SET otp_attempts = COALESCE(otp_attempts, 0) + 1 WHERE id = $1',
        [id]
      );
      await req.audit?.('visitor.otp.verify', 'visitor', String(id), { outcome: 'fail', message: 'Invalid OTP provided' });
      return respondError(res, 400, 'Invalid OTP');
    }

    await dbManager.query(
      'UPDATE visitors SET status = $1, otp_hash = NULL, otp_expires_at = NULL, otp_attempts = 0, otp = NULL WHERE id = $2',
      [PASS_STATUS.VERIFIED, id]
    );

    await req.audit?.('visitor.otp.verify', 'visitor', String(id), { outcome: 'success', message: 'OTP verified successfully', visitorName: visitor.name });
    respond(res, { message: 'OTP verified successfully', status: PASS_STATUS.VERIFIED });
  } catch (error) {
    await req.audit?.('visitor.otp.verify', 'visitor', null, { outcome: 'fail', message: 'Failed to verify OTP', error: String(error?.message) });
    respondError(res, 500, 'Failed to verify OTP');
  }
};

const resendOtp = async (req, res) => {
  try {
    const { id } = req.params;

    let query = 'SELECT id, phone, email, status, name, otp_resend_count, otp_last_resend FROM visitors WHERE id = $1';
    const params = [id];

    // Fix G-002: Enforce estate scoping if authenticated user (Guard/Admin)
    if (req.user && req.user.estate_id) {
      query += ' AND estate_id = $2';
      params.push(req.user.estate_id);
    }

    const vRes = await dbManager.query(query, params);
    const visitor = vRes.rows[0];
    if (!visitor) return respondError(res, 404, 'Visitor not found');

    const currentStatus = String(visitor.status || '').toLowerCase();

    if (currentStatus !== PASS_STATUS.PENDING && currentStatus !== PASS_STATUS.OTP_SENT) {
      return respondError(res, 422, 'Visitor already verified or checked in');
    }

    const resendCooldownSeconds = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);
    if (visitor.otp_last_resend) {
      const lastResendAt = new Date(visitor.otp_last_resend);
      if (!Number.isNaN(lastResendAt.getTime())) {
        const secondsSinceLast = Math.floor((Date.now() - lastResendAt.getTime()) / 1000);
        if (secondsSinceLast >= 0 && secondsSinceLast < resendCooldownSeconds) {
          return respondError(res, 429, `Please wait ${resendCooldownSeconds - secondsSinceLast}s before requesting a new OTP`);
        }
      }
    }

    // Generate new OTP
    const otp = generateOTP(6);
    const otpHash = await argon2.hash(otp);
    const expiryMinutes = Number(process.env.OTP_EXPIRY_MINUTES || 15);
    const otpExpiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    const shouldEchoOtp = process.env.OTP_DEBUG_ECHO === 'true' && process.env.NODE_ENV !== 'production';

    // SEC-001: Never store plaintext OTP in database
    await dbManager.query(
      `UPDATE visitors SET 
         otp_hash = $1,
         otp_expires_at = $2,
         otp_attempts = 0,
         otp_resend_count = COALESCE(otp_resend_count, 0) + 1,
         otp_last_resend = NOW(),
         status = $3
       WHERE id = $4`,
      [otpHash, otpExpiresAt, PASS_STATUS.OTP_SENT, id]
    );

    const visitorData = {
      id: visitor.id,
      name: visitor.name,
      phone: visitor.phone,
      email: visitor.email
    };

    const smsSent = await notificationService.sendOtpVerificationSms(visitorData, otp, expiryMinutes);
    const emailSent = !smsSent && visitor.email
      ? await notificationService.sendOtpVerificationEmail(visitorData, otp, expiryMinutes)
      : false;

    await req.audit?.('visitor.otp.resend', 'visitor', String(id), { outcome: 'success', message: 'OTP resent successfully', visitorName: visitor.name });
    respond(res, {
      message: 'OTP resent successfully',
      delivery: {
        sms: smsSent,
        email: emailSent
      },
      ...(shouldEchoOtp ? { otp } : {})
    });
  } catch (error) {
    await req.audit?.('visitor.otp.resend', 'visitor', null, { outcome: 'fail', message: 'Failed to resend OTP', error: String(error?.message) });
    respondError(res, 500, 'Failed to resend OTP');
  }
};

export { verifyOtp, resendOtp };