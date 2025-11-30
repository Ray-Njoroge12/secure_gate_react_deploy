/**
 * SMS Service Stub
 * TODO: Implement proper SMS service (Africa's Talking)
 */

class SMSService {
  async sendOTP(phone, otp) {
    console.log(`[SMS STUB] Would send OTP ${otp} to ${phone}`);
    return { success: true };
  }

  async send(phone, message) {
    console.log(`[SMS STUB] Would send SMS to ${phone}: ${message}`);
    return { success: true };
  }
}

export default new SMSService();
