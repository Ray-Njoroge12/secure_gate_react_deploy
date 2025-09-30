import pool from '../database/db.js';
import bcrypt from 'bcryptjs';
import * as tokenHelper from '../utils/tokenHelper.js';
import { respond, respondError } from '../utils/respond.js';

const { sendEmailOtp, sendSmsOtp } = tokenHelper;

const OTP_TTL_MINUTES = 15;

const verifyOtp = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const { otp } = req.body;
    if (!otp || otp.length !== 6) return respondError(res, 400, 'OTP must be 6 digits');

    const vRes = await pool.query(
      `SELECT id, otp_hash, otp_expires_at, otp_attempts, status, name, phone, email, purpose,
              date_of_visit, time_of_visit, qr_code, expected_time, check_in_time AS check_in,
              check_out_time AS check_out
       FROM visitors WHERE invite_code = $1`, [inviteCode]
    );
    const visitor = vRes.rows[0];
    if (!visitor) return respondError(res, 404, 'Visitor not found');
    if (visitor.status !== 'OTP_SENT') return respondError(res, 422, 'OTP not required for this visitor');

    // Check OTP expiry
    if (new Date() > new Date(visitor.otp_expires_at)) {
      await req.audit?.('otp.verify', 'visitor', String(visitor.id), { outcome: 'fail', message: 'OTP expired' });
      return respondError(res, 410, 'OTP expired');
    }

    // Check attempts
    if (visitor.otp_attempts >= 3) {
      await req.audit?.('otp.verify', 'visitor', String(visitor.id), { outcome: 'fail', message: 'Too many OTP attempts' });
      return respondError(res, 429, 'Too many attempts');
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, visitor.otp_hash);
    if (!isValid) {
      // Increment attempts
      await pool.query('UPDATE visitors SET otp_attempts = otp_attempts + 1 WHERE id = $1', [visitor.id]);
      await req.audit?.('otp.verify', 'visitor', String(visitor.id), { outcome: 'fail', message: 'Invalid OTP' });
      return respondError(res, 401, 'Invalid OTP');
    }

    // OTP valid: update status to VERIFIED
    await pool.query(
      `UPDATE visitors SET status = 'VERIFIED', otp_hash = NULL, otp_expires_at = NULL, otp_attempts = 0
       WHERE id = $1`, [visitor.id]
    );

    await req.audit?.('otp.verify', 'visitor', String(visitor.id), { outcome: 'success', message: 'OTP verified successfully' });

    // Return visitor data (safe subset)
    const safeVisitor = {
      id: visitor.id,
      name: visitor.name,
      phone: visitor.phone,
      email: visitor.email,
      purpose: visitor.purpose,
      date_of_visit: visitor.date_of_visit,
      time_of_visit: visitor.time_of_visit,
      status: 'VERIFIED',
      qr_code: visitor.qr_code,
      expected_time: visitor.expected_time,
      check_in: visitor.check_in,
      check_out: visitor.check_out
    };

    respond(res, { visitor: safeVisitor, otp_verified: true });
  } catch (error) {
    await req.audit?.('otp.verify', 'visitor', null, { outcome: 'fail', message: 'Failed to verify OTP', error: String(error?.message) });
    respondError(res, 500, 'Failed to verify OTP');
  }
};

const resendOtp = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const vRes = await pool.query(
      `SELECT id, status, otp_expires_at, otp_attempts, name, phone, email, created_by
       FROM visitors WHERE invite_code = $1`, [inviteCode]
    );
    const visitor = vRes.rows[0];
    if (!visitor) return respondError(res, 404, 'Visitor not found');
    if (visitor.status !== 'OTP_SENT') return respondError(res, 422, 'OTP not required for this visitor');

    // Check if resend is allowed (not too frequent)
    const lastOtpTime = new Date(visitor.otp_expires_at);
    const now = new Date();
    const timeSinceLastOtp = now - (lastOtpTime - OTP_TTL_MINUTES * 60 * 1000);
    if (timeSinceLastOtp < 60 * 1000) { // 1 minute cooldown
      return respondError(res, 429, 'Please wait before requesting another OTP');
    }

    // Check attempts
    if (visitor.otp_attempts >= 3) {
      await req.audit?.('otp.resend', 'visitor', String(visitor.id), { outcome: 'fail', message: 'Too many OTP attempts' });
      return respondError(res, 429, 'Too many attempts');
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    // Update visitor with new OTP
    await pool.query(
      `UPDATE visitors SET otp_hash = $1, otp_expires_at = $2, otp_attempts = otp_attempts + 1
       WHERE id = $3`, [otpHash, otpExpiresAt, visitor.id]
    );

    // Deliver OTP via available channels (best-effort)
    // Fetch resident notification preferences
    let notify_email = true, notify_sms = false;
    let residentEmail = visitor.created_by;
    if (residentEmail) {
      const prefRes = await pool.query('SELECT notify_email, notify_sms FROM users WHERE email = $1', [residentEmail]);
      if (prefRes.rowCount > 0) {
        notify_email = prefRes.rows[0].notify_email;
        notify_sms = prefRes.rows[0].notify_sms;
      }
    }

    const deliveries = [];
    if (visitor.email && notify_email) {
      deliveries.push(sendEmailOtp(visitor.email, otp));
    }
    if (visitor.phone && notify_sms) {
      deliveries.push(sendSmsOtp(visitor.phone, otp));
    }
    const results = await Promise.allSettled(deliveries);
    const delivered = results.some(r => r.status === 'fulfilled' && r.value === true);

    await req.audit?.('otp.resend', 'visitor', String(visitor.id), { channels: { email: !!visitor.email, phone: !!visitor.phone }, outcome: delivered ? 'success' : 'fail', message: delivered ? 'OTP resent' : 'OTP resend failed' });

    const debugOtp = process.env.OTP_DEBUG_ECHO === 'true' ? otp : undefined;
    const payload = { otp_resent: true, otp_ttl_minutes: OTP_TTL_MINUTES };
    if (debugOtp) payload.debug_otp = debugOtp;
    respond(res, payload);
  } catch (error) {
    await req.audit?.('otp.resend', 'visitor', null, { outcome: 'fail', message: 'Failed to resend OTP', error: String(error?.message) });
    respondError(res, 500, 'Failed to resend OTP');
  }
};

export { verifyOtp, resendOtp };
