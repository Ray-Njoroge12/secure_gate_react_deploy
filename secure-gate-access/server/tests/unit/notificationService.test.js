/**
 * NotificationService Unit Tests
 * 
 * Tests for notification delivery via email, SMS, and WhatsApp.
 * Priority: P1 (Core Business Service)
 * 
 * Coverage targets:
 * - Statements: 90%+
 * - Branches: 85%+
 * - Functions: 100%
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Set environment variables FIRST - BEFORE any service imports
const originalEnv = process.env;
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  ENABLE_EXTERNAL_NOTIFICATIONS: 'true',
  ENABLE_EMAIL_NOTIFICATIONS: 'true',
  ENABLE_SMS_NOTIFICATIONS: 'true',
  SMTP_HOST: 'smtp.test.com',
  SMTP_PORT: '587',
  SMTP_USER: 'test@test.com',
  SMTP_PASS: 'password',
  FROM_EMAIL: 'noreply@test.com',
  EMAIL_PROVIDER: 'smtp',
  MAILGUN_API_KEY: 'mailgun-test-key',
  MAILGUN_DOMAIN: 'mg.test.com',
  SES_SMTP_HOST: 'email-smtp.us-east-1.amazonaws.com',
  SES_SMTP_PORT: '587',
  SES_SMTP_USER: 'ses-user',
  SES_SMTP_PASS: 'ses-pass',
  SITE_NAME: 'Test Site',
  SITE_URL: 'http://localhost:3000',
  SMS_PROVIDER: 'africastalking',
  AT_USERNAME: 'test_at',
  AT_API_KEY: 'test_key'
};

// Mock nodemailer
const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({
  sendMail: mockSendMail
}));
jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: mockCreateTransport
  }
}));

// Mock Africa's Talking
const mockAtSend = jest.fn();
jest.unstable_mockModule('africastalking', () => ({
  default: jest.fn(() => ({
    SMS: {
      send: mockAtSend
    }
  }))
}));

// Mock Mailgun
const mockMailgunCreate = jest.fn();
jest.unstable_mockModule('mailgun.js', () => ({
  default: jest.fn().mockImplementation(() => ({
    client: jest.fn(() => ({
      messages: {
        create: mockMailgunCreate
      }
    }))
  }))
}));

// Mock form-data
jest.unstable_mockModule('form-data', () => ({
  default: jest.fn()
}));

// Mock WhatsApp service
const mockWhatsappSendVisitorInvitation = jest.fn();
const mockWhatsappSendOtp = jest.fn();
const mockWhatsappIsConfigured = jest.fn();
jest.unstable_mockModule('../../src/services/whatsappService.js', () => ({
  default: {
    isConfigured: mockWhatsappIsConfigured,
    sendVisitorInvitation: mockWhatsappSendVisitorInvitation,
    sendOtpVerification: mockWhatsappSendOtp
  }
}));

// Mock email templates
jest.unstable_mockModule('../../src/templates/email-templates.js', () => ({
  visitorInviteTemplate: jest.fn(() => '<html>Visitor Invite</html>'),
  bulkInviteTemplate: jest.fn(() => '<html>Bulk Invite</html>'),
  otpVerificationTemplate: jest.fn(() => '<html>OTP Verification</html>')
}));

// Mock SMS templates
jest.unstable_mockModule('../../src/templates/sms-templates.js', () => ({
  visitorInviteSmsTemplate: jest.fn(() => 'Visitor invite SMS'),
  bulkInviteSmsTemplate: jest.fn(() => 'Bulk invite SMS'),
  otpVerificationSmsTemplate: jest.fn(() => 'OTP verification SMS'),
  qrCodeReadySmsTemplate: jest.fn(() => 'QR code ready SMS'),
  checkinReminderSmsTemplate: jest.fn(() => 'Check-in reminder SMS')
}));

// Import notificationService AFTER mocks and environment are set
const notificationServiceModule = await import('../../src/services/notificationService.js');

describe('NotificationService', () => {
  let notificationService;
  
  beforeEach(async () => {
    jest.clearAllMocks();

    // DO NOT reset environment variables or call jest.resetModules()
    // They are already set at the top of the file before imports!

    // Default mock implementations
    mockSendMail.mockResolvedValue({ messageId: 'test-123' });
    mockWhatsappIsConfigured.mockReturnValue(true);
    mockWhatsappSendVisitorInvitation.mockResolvedValue({ success: true });
    mockWhatsappSendOtp.mockResolvedValue({ success: true });
    mockAtSend.mockResolvedValue({
      SMSMessageData: {
        Recipients: [{ status: 'Success' }]
      }
    });
    mockMailgunCreate.mockResolvedValue({ id: 'mailgun-123' });

    // Use the default export from the already-imported module
    notificationService = notificationServiceModule.default;
  });
  
  afterEach(() => {
    process.env = originalEnv;
  });
  
  // Test data factories
  const createVisitorData = (overrides = {}) => ({
    name: 'John Visitor',
    email: 'visitor@test.com',
    phone: '+254712345678',
    dateOfVisit: new Date().toISOString(),
    time: '10:00 AM',
    purpose: 'Meeting',
    inviteCode: 'ABC123',
    ...overrides
  });
  
  const createResidentData = (overrides = {}) => ({
    name: 'Jane Resident',
    email: 'resident@test.com',
    phone: '+254712345679',
    ...overrides
  });
  
  const createDeliveryData = (overrides = {}) => ({
    id: 1,
    carrierName: 'DHL',
    packageSize: 'Medium',
    packageDescription: 'Electronics',
    ...overrides
  });
  
  describe('sendVisitorInviteEmail', () => {
    it('should send visitor invitation email successfully via SMTP', async () => {
      const visitorData = createVisitorData();
      const residentData = createResidentData();
      const inviteLink = 'http://test.com/invite/ABC123';
      
      const result = await notificationService.sendVisitorInviteEmail(
        visitorData,
        residentData,
        inviteLink
      );
      
      expect(result).toBe(true);
    });
    
    it('should include QR code in email when provided', async () => {
      const visitorData = createVisitorData();
      const residentData = createResidentData();
      const inviteLink = 'http://test.com/invite/ABC123';
      const qrCode = 'data:image/png;base64,iVBORw0KGgo=';
      
      const result = await notificationService.sendVisitorInviteEmail(
        visitorData,
        residentData,
        inviteLink,
        qrCode
      );
      
      expect(result).toBe(true);
    });
    
    it('should return false when email notifications are disabled', async () => {
      process.env.ENABLE_EMAIL_NOTIFICATIONS = 'false';
      jest.resetModules();
      notificationService = await import('../../src/services/notificationService.js');
      
      const result = await notificationService.sendVisitorInviteEmail(
        createVisitorData(),
        createResidentData(),
        'http://test.com/invite'
      );
      
      expect(result).toBe(false);
    });
    
    it('should return false when external notifications are disabled', async () => {
      process.env.ENABLE_EXTERNAL_NOTIFICATIONS = 'false';
      jest.resetModules();
      notificationService = await import('../../src/services/notificationService.js');
      
      const result = await notificationService.sendVisitorInviteEmail(
        createVisitorData(),
        createResidentData(),
        'http://test.com/invite'
      );
      
      expect(result).toBe(false);
    });
    
    it('should handle email sending failure gracefully', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP connection failed'));
      jest.resetModules();
      notificationService = await import('../../src/services/notificationService.js');
      
      const result = await notificationService.sendVisitorInviteEmail(
        createVisitorData(),
        createResidentData(),
        'http://test.com/invite'
      );
      
      expect(result).toBe(false);
    });
    
    it('should use resident email as fallback when name is not provided', async () => {
      const visitorData = createVisitorData();
      const residentData = { email: 'resident@test.com' }; // No name
      
      const result = await notificationService.sendVisitorInviteEmail(
        visitorData,
        residentData,
        'http://test.com/invite'
      );
      
      expect(result).toBe(true);
    });

    it('should preserve business logic across email providers', async () => {
      const visitorData = createVisitorData();
      const residentData = createResidentData();
      const inviteLink = 'http://test.com/invite/ABC123';
      const expectedSubject = `🏠 Visitor Invitation - ${process.env.SITE_NAME}`;

      process.env.EMAIL_PROVIDER = 'mailgun';
      jest.resetModules();
      notificationService = await import('../../src/services/notificationService.js');

      const mailgunResult = await notificationService.sendVisitorInviteEmail(
        visitorData,
        residentData,
        inviteLink
      );

      expect(mailgunResult).toBe(true);
      expect(mockMailgunCreate).toHaveBeenCalledWith(
        process.env.MAILGUN_DOMAIN,
        expect.objectContaining({ subject: expectedSubject })
      );

      process.env.EMAIL_PROVIDER = 'ses';
      jest.resetModules();
      notificationService = await import('../../src/services/notificationService.js');

      const sesResult = await notificationService.sendVisitorInviteEmail(
        visitorData,
        residentData,
        inviteLink
      );

      expect(sesResult).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ subject: expectedSubject })
      );
    });
  });
  
  describe('sendOtpVerificationEmail', () => {
    it('should send OTP verification email successfully', async () => {
      const visitorData = createVisitorData();
      const otpCode = '123456';
      
      const result = await notificationService.sendOtpVerificationEmail(
        visitorData,
        otpCode
      );
      
      expect(result).toBe(true);
    });
    
    it('should use custom expiry minutes when provided', async () => {
      const visitorData = createVisitorData();
      const otpCode = '123456';
      const expiryMinutes = 30;
      
      const result = await notificationService.sendOtpVerificationEmail(
        visitorData,
        otpCode,
        expiryMinutes
      );
      
      expect(result).toBe(true);
    });
    
    it('should return false on email failure', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('Email failed'));
      jest.resetModules();
      notificationService = await import('../../src/services/notificationService.js');
      
      const result = await notificationService.sendOtpVerificationEmail(
        createVisitorData(),
        '123456'
      );
      
      expect(result).toBe(false);
    });
  });
  
  describe('sendVisitorInviteSms', () => {
    it('should send SMS via Africa\'s Talking successfully', async () => {
      const visitorData = createVisitorData();
      const residentData = createResidentData();
      const inviteLink = 'http://test.com/invite';
      
      const result = await notificationService.sendVisitorInviteSms(
        visitorData,
        residentData,
        inviteLink
      );
      
      expect(result).toBe(true);
    });
    
    it('should return false when SMS notifications are disabled', async () => {
      process.env.ENABLE_SMS_NOTIFICATIONS = 'false';
      jest.resetModules();
      notificationService = await import('../../src/services/notificationService.js');
      
      const result = await notificationService.sendVisitorInviteSms(
        createVisitorData(),
        createResidentData(),
        'http://test.com/invite'
      );
      
      expect(result).toBe(false);
    });
    
    it('should send via WhatsApp when provider is set', async () => {
      process.env.SMS_PROVIDER = 'whatsapp';
      jest.resetModules();
      notificationService = await import('../../src/services/notificationService.js');
      
      const result = await notificationService.sendVisitorInviteSms(
        createVisitorData(),
        createResidentData(),
        'http://test.com/invite'
      );
      
      expect(result).toBe(true);
    });
    
    it('should return false when WhatsApp is not configured', async () => {
      process.env.SMS_PROVIDER = 'whatsapp';
      mockWhatsappIsConfigured.mockReturnValue(false);
      jest.resetModules();
      notificationService = await import('../../src/services/notificationService.js');
      
      const result = await notificationService.sendVisitorInviteSms(
        createVisitorData(),
        createResidentData(),
        'http://test.com/invite'
      );
      
      expect(result).toBe(false);
    });
    
    it('should handle WhatsApp send failure', async () => {
      process.env.SMS_PROVIDER = 'whatsapp';
      mockWhatsappSendVisitorInvitation.mockResolvedValue({ success: false, error: 'Failed' });
      jest.resetModules();
      notificationService = await import('../../src/services/notificationService.js');
      
      const result = await notificationService.sendVisitorInviteSms(
        createVisitorData(),
        createResidentData(),
        'http://test.com/invite'
      );
      
      expect(result).toBe(false);
    });
    
    it('should handle Africa\'s Talking failure gracefully', async () => {
      mockAtSend.mockResolvedValueOnce({
        SMSMessageData: {
          Recipients: [{ status: 'Failed', statusCode: '404' }]
        }
      });
      jest.resetModules();
      notificationService = await import('../../src/services/notificationService.js');
      
      const result = await notificationService.sendVisitorInviteSms(
        createVisitorData(),
        createResidentData(),
        'http://test.com/invite'
      );
      
      expect(result).toBe(false);
    });
    
    it('should return false when Africa\'s Talking is not configured', async () => {
      delete process.env.AT_API_KEY;
      jest.resetModules();
      notificationService = await import('../../src/services/notificationService.js');
      
      const result = await notificationService.sendVisitorInviteSms(
        createVisitorData(),
        createResidentData(),
        'http://test.com/invite'
      );
      
      expect(result).toBe(false);
    });
  });
  
  describe('sendOtpVerificationSms', () => {
    it('should send OTP SMS via Africa\'s Talking successfully', async () => {
      const visitorData = createVisitorData();
      const otpCode = '123456';
      
      const result = await notificationService.sendOtpVerificationSms(
        visitorData,
        otpCode
      );
      
      expect(result).toBe(true);
    });
    
    it('should use custom expiry minutes', async () => {
      const result = await notificationService.sendOtpVerificationSms(
        createVisitorData(),
        '123456',
        30
      );
      
      expect(result).toBe(true);
    });
    
    it('should return false when SMS is disabled', async () => {
      process.env.ENABLE_SMS_NOTIFICATIONS = 'false';
      jest.resetModules();
      notificationService = await import('../../src/services/notificationService.js');
      
      const result = await notificationService.sendOtpVerificationSms(
        createVisitorData(),
        '123456'
      );
      
      expect(result).toBe(false);
    });
    
    it('should send via WhatsApp when provider is set', async () => {
      process.env.SMS_PROVIDER = 'whatsapp';
      jest.resetModules();
      notificationService = await import('../../src/services/notificationService.js');
      
      const result = await notificationService.sendOtpVerificationSms(
        createVisitorData(),
        '123456'
      );
      
      expect(result).toBe(true);
    });
    
    it('should handle WhatsApp OTP failure', async () => {
      process.env.SMS_PROVIDER = 'whatsapp';
      mockWhatsappSendOtp.mockResolvedValue({ success: false, error: 'OTP failed' });
      jest.resetModules();
      notificationService = await import('../../src/services/notificationService.js');
      
      const result = await notificationService.sendOtpVerificationSms(
        createVisitorData(),
        '123456'
      );
      
      expect(result).toBe(false);
    });
  });
  
  describe('sendDeliveryNotification', () => {
    it('should send delivery notification email successfully', async () => {
      const residentData = createResidentData();
      const deliveryData = createDeliveryData();
      
      const result = await notificationService.sendDeliveryNotification(
        residentData,
        deliveryData
      );
      
      expect(result).toBe(true);
    });
    
    it('should handle missing package description', async () => {
      const residentData = createResidentData();
      const deliveryData = createDeliveryData({ packageDescription: null });
      
      const result = await notificationService.sendDeliveryNotification(
        residentData,
        deliveryData
      );
      
      expect(result).toBe(true);
    });
    
    it('should use default name when resident name is not provided', async () => {
      const residentData = { email: 'resident@test.com' };
      const deliveryData = createDeliveryData();
      
      const result = await notificationService.sendDeliveryNotification(
        residentData,
        deliveryData
      );
      
      expect(result).toBe(true);
    });
    
    it('should return false on email failure', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('Email failed'));
      jest.resetModules();
      notificationService = await import('../../src/services/notificationService.js');
      
      const result = await notificationService.sendDeliveryNotification(
        createResidentData(),
        createDeliveryData()
      );
      
      expect(result).toBe(false);
    });
  });
  
  describe('sendHandoffDecisionNotification', () => {
    it('should notify for pickup at gate preference', async () => {
      const deliveryData = createDeliveryData();
      
      const result = await notificationService.sendHandoffDecisionNotification(
        deliveryData,
        'pickup_at_gate'
      );
      
      expect(result.success).toBe(true);
      expect(result.preference).toBe('Pickup at Gate');
    });
    
    it('should notify for deliver to residence preference', async () => {
      const deliveryData = createDeliveryData();
      
      const result = await notificationService.sendHandoffDecisionNotification(
        deliveryData,
        'deliver_to_residence'
      );
      
      expect(result.success).toBe(true);
      expect(result.preference).toBe('Deliver to Residence');
    });
  });
  
  describe('Legacy Functions', () => {
    describe('sendInviteEmail', () => {
      it('should send email successfully', async () => {
        const result = await notificationService.sendInviteEmail(
          'test@test.com',
          'Test Subject',
          '<html>Test</html>'
        );
        
        expect(result).toBe(true);
      });
      
      it('should return false on failure', async () => {
        mockSendMail.mockRejectedValueOnce(new Error('Failed'));
        jest.resetModules();
        notificationService = await import('../../src/services/notificationService.js');
        
        const result = await notificationService.sendInviteEmail(
          'test@test.com',
          'Test Subject',
          '<html>Test</html>'
        );
        
        expect(result).toBe(false);
      });
    });
    
    describe('sendSms', () => {
      it('should send SMS via Africa\'s Talking successfully', async () => {
        const result = await notificationService.sendSms(
          '+254712345678',
          'Test message'
        );
        
        expect(result).toBe(true);
      });
      
      it('should return false when external notifications disabled', async () => {
        process.env.ENABLE_EXTERNAL_NOTIFICATIONS = 'false';
        jest.resetModules();
        notificationService = await import('../../src/services/notificationService.js');
        
        const result = await notificationService.sendSms(
          '+254712345678',
          'Test message'
        );
        
        expect(result).toBe(false);
      });
      
      it('should return false when SMS notifications disabled', async () => {
        process.env.ENABLE_SMS_NOTIFICATIONS = 'false';
        jest.resetModules();
        notificationService = await import('../../src/services/notificationService.js');
        
        const result = await notificationService.sendSms(
          '+254712345678',
          'Test message'
        );
        
        expect(result).toBe(false);
      });
      
      it('should handle Africa\'s Talking failure', async () => {
        mockAtSend.mockRejectedValueOnce(new Error('Africa\'s Talking error'));
        jest.resetModules();
        notificationService = await import('../../src/services/notificationService.js');
        
        const result = await notificationService.sendSms(
          '+254712345678',
          'Test message'
        );
        
        expect(result).toBe(false);
      });
    });
  });
  
  describe('Default Export', () => {
    it('should export all notification functions', async () => {
      expect(notificationService).toBeDefined();
      expect(notificationService.sendInviteEmail).toBeDefined();
      expect(notificationService.sendSms).toBeDefined();
      expect(notificationService.sendVisitorInviteEmail).toBeDefined();
      expect(notificationService.sendOtpVerificationEmail).toBeDefined();
      expect(notificationService.sendVisitorInviteSms).toBeDefined();
      expect(notificationService.sendOtpVerificationSms).toBeDefined();
      expect(notificationService.sendDeliveryNotification).toBeDefined();
      expect(notificationService.sendHandoffDecisionNotification).toBeDefined();
    });
  });
});
