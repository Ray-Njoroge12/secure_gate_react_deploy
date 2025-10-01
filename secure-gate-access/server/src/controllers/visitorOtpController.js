import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError } from '../utils/respond.js';

const verifyOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    
    if (!otp) return respondError(res, 400, 'OTP is required');
    
    const vRes = await dbManager.query('SELECT id, otp, status, name FROM visitors WHERE id = $1', [id]);
    const visitor = vRes.rows[0];
    if (!visitor) return respondError(res, 404, 'Visitor not found');
    
    if (visitor.status !== 'PENDING') return respondError(res, 422, 'Visitor already verified or checked in');
    
    if (visitor.otp !== otp) {
      await req.audit?.('visitor.otp.verify', 'visitor', String(id), { outcome: 'fail', message: 'Invalid OTP provided' });
      return respondError(res, 400, 'Invalid OTP');
    }
    
    await dbManager.query('UPDATE visitors SET status = $1 WHERE id = $2', ['VERIFIED', id]);
    
    await req.audit?.('visitor.otp.verify', 'visitor', String(id), { outcome: 'success', message: 'OTP verified successfully', visitorName: visitor.name });
    respond(res, { message: 'OTP verified successfully', status: 'VERIFIED' });
  } catch (error) {
    await req.audit?.('visitor.otp.verify', 'visitor', null, { outcome: 'fail', message: 'Failed to verify OTP', error: String(error?.message) });
    respondError(res, 500, 'Failed to verify OTP');
  }
};

const resendOtp = async (req, res) => {
  try {
    const { id } = req.params;
    
    const vRes = await dbManager.query('SELECT id, phone, email, status, name FROM visitors WHERE id = $1', [id]);
    const visitor = vRes.rows[0];
    if (!visitor) return respondError(res, 404, 'Visitor not found');
    
    if (visitor.status !== 'PENDING') return respondError(res, 422, 'Visitor already verified or checked in');
    
    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await dbManager.query('UPDATE visitors SET otp = $1 WHERE id = $2', [otp, id]);
    
    // TODO: Send OTP via SMS/Email
    // await sendSms(visitor.phone, `Your verification code is: ${otp}`);
    // await sendEmail(visitor.email, 'Verification Code', `Your verification code is: ${otp}`);
    
    await req.audit?.('visitor.otp.resend', 'visitor', String(id), { outcome: 'success', message: 'OTP resent successfully', visitorName: visitor.name });
    respond(res, { message: 'OTP resent successfully' });
  } catch (error) {
    await req.audit?.('visitor.otp.resend', 'visitor', null, { outcome: 'fail', message: 'Failed to resend OTP', error: String(error?.message) });
    respondError(res, 500, 'Failed to resend OTP');
  }
};

export { verifyOtp, resendOtp };