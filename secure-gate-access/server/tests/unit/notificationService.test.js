/**
 * Unit Tests for notificationService.js
 * Tests email and SMS notification functionality
 * 
 * Coverage:
 * - Email notifications (visitor invites, OTP)
 * - SMS notifications (visitor invites, OTP)
 * - Configuration handling
 * - Error scenarios
 * - Legacy functions
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockNodemailer = {
  createTransport: jest.fn()
};

const mockTwilio = jest.fn();

const mockMetrics = {
  notifications_email_sent: 0,
  notifications_email_failed: 0,
  notifications_sms_sent: 0,
  notifications_sms_failed: 0
};

const mockVisitorInviteTemplate = jest.fn((data) => `<html>Invite for ${data.visitorName}</html>`);
const mockOtpVerificationTemplate = jest.fn((data) => `<html>OTP: ${data.otpCode}</html>`);
const mockVisitorInviteSmsTemplate = jest.fn((data) => `SMS Invite for ${data.visitorName}`);
const mockOtpVerificationSmsTemplate = jest.fn((data) => `Your OTP is ${data.otpCode}`);

// Mock modules
jest.unstable_mockModule('nodemailer', () => ({
  default: mockNodemailer
}));

jest.unstable_mockModule('twilio', () => ({
  default: mockTwilio
}));

jest.unstable_mockModule('../../../src/templates/email-templates.js', () => ({
  visitorInviteTemplate: mockVisitorInviteTemplate,
  bulkInviteTemplate: jest.fn(),
  otpVerificationTemplate: mockOtpVerificationTemplate
}));

jest.unstable_mockModule('../../../src/templates/sms-templates.js', () => ({
  visitorInviteSmsTemplate: mockVisitorInviteSmsTemplate,
  bulkInviteSmsTemplate: jest.fn(),
  otpVerificationSmsTemplate: mockOtpVerificationSmsTemplate,
  qrCodeReadySmsTemplate: jest.fn(),
  checkinReminderSmsTemplate: jest.fn()
}));

jest.unstable_mockModule('../../../src/utils/metrics.js', () => ({
  metrics: mockMetrics
}));

describe('notificationService', () => {
  let notificationService;
  let mockTransporter;
  let mockTwilioClient;
  let originalEnv;

  beforeAll(async () => {
    // Save original env
    originalEnv = { ...process.env };

    // Setup mock transporter
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
    };
    mockNodemailer.createTransport.mockReturnValue(mockTransporter);

    // Setup mock Twilio client
    mockTwilioClient = {
      messages: {
        create: jest.fn().mockResolvedValue({ sid: 'test-sms-sid' })
      }
    };
    mockTwilio.mockReturnValue(mockTwilioClient);

    // Set environment variables
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'test@test.com';
    process.env.SMTP_PASS = 'testpass';
    process.env.FROM_EMAIL = 'noreply@test.com';
    process.env.TWILIO_ACCOUNT_SID = 'test-account-sid';
    process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
    process.env.TWILIO_FROM = '+1234567890';
    process.env.SITE_NAME = 'Test Secure Gate';
    process.env.SITE_URL = 'https://test.com';

    // Import service after mocks are set up
    notificationService = await import('../../../src/services/notificationService.js');
  });

  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset metrics
    mockMetrics.notifications_email_sent = 0;
    mockMetrics.notifications_email_failed = 0;
    mockMetrics.notifications_sms_sent = 0;
    mockMetrics.notifications_sms_failed = 0;
  });

  describe('sendVisitorInviteEmail', () => {
    const visitorData = {
      name: 'John Visitor',
      email: 'visitor@test.com',
      dateOfVisit: new Date('2025-02-01'),
      time: '10:00 AM',
      purpose: 'Business Meeting',
      inviteCode: 'INV123'
    };

    const residentData = {
      name: 'Jane Resident',
      email: 'resident@test.com'
    };

    const inviteLink = 'https://test.com/invite/INV123';

    it('should send visitor invitation email successfully', async () => {
      const result = await notificationService.sendVisitorInviteEmail(
        visitorData,
        residentData,
        inviteLink
      );

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@test.com',
        to: 'visitor@test.com',
        subject: expect.stringContaining('Visitor Invitation'),
        html: expect.any(String)
      });
      expect(mockVisitorInviteTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          visitorName: 'John Visitor',
          residentName: 'Jane Resident',
          inviteCode: 'INV123'
        })
      );
    });

    it('should include QR code when provided', async () => {
      const qrCode = 'data:image/png;base64,mockqrcode';
      
      await notificationService.sendVisitorInviteEmail(
        visitorData,
        residentData,
        inviteLink,
        qrCode
      );

      expect(mockVisitorInviteTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          qrCode: qrCode
        })
      );
    });

    it('should handle missing SMTP configuration', async () => {
      const originalHost = process.env.SMTP_HOST;
      delete process.env.SMTP_HOST;

      // Need to re-import to pick up env change
      jest.resetModules();
      const service = await import('../../../src/services/notificationService.js');

      const result = await service.sendVisitorInviteEmail(
        visitorData,
        residentData,
        inviteLink
      );

      expect(result).toBe(false);
      
      // Restore
      process.env.SMTP_HOST = originalHost;
    });

    it('should handle email sending errors', async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(new Error('SMTP error'));

      const result = await notificationService.sendVisitorInviteEmail(
        visitorData,
        residentData,
        inviteLink
      );

      expect(result).toBe(false);
    });

    it('should format dates correctly', async () => {
      await notificationService.sendVisitorInviteEmail(
        visitorData,
        residentData,
        inviteLink
      );

      expect(mockVisitorInviteTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          visitDate: expect.any(String),
          expiryDate: expect.any(String)
        })
      );
    });
  });

  describe('sendOtpVerificationEmail', () => {
    const visitorData = {
      name: 'John Visitor',
      email: 'visitor@test.com'
    };

    const otpCode = '123456';

    it('should send OTP verification email successfully', async () => {
      const result = await notificationService.sendOtpVerificationEmail(
        visitorData,
        otpCode
      );

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@test.com',
        to: 'visitor@test.com',
        subject: expect.stringContaining('Verification Code'),
        html: expect.any(String)
      });
      expect(mockOtpVerificationTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          visitorName: 'John Visitor',
          otpCode: '123456',
          expiryMinutes: 15
        })
      );
    });

    it('should use custom expiry time', async () => {
      await notificationService.sendOtpVerificationEmail(
        visitorData,
        otpCode,
        30
      );

      expect(mockOtpVerificationTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          expiryMinutes: 30
        })
      );
    });

    it('should handle email sending errors', async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(new Error('Network error'));

      const result = await notificationService.sendOtpVerificationEmail(
        visitorData,
        otpCode
      );

      expect(result).toBe(false);
    });

    it('should include site name in email', async () => {
      await notificationService.sendOtpVerificationEmail(
        visitorData,
        otpCode
      );

      expect(mockOtpVerificationTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          siteName: 'Test Secure Gate'
        })
      );
    });
  });

  describe('sendVisitorInviteSms', () => {
    const visitorData = {
      name: 'John Visitor',
      phone: '+1234567890',
      dateOfVisit: new Date('2025-02-01'),
      time: '10:00 AM',
      purpose: 'Business Meeting',
      inviteCode: 'INV123'
    };

    const residentData = {
      name: 'Jane Resident',
      email: 'resident@test.com'
    };

    const inviteLink = 'https://test.com/invite/INV123';

    it('should send visitor invitation SMS successfully', async () => {
      const result = await notificationService.sendVisitorInviteSms(
        visitorData,
        residentData,
        inviteLink
      );

      expect(result).toBe(true);
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: expect.any(String),
        from: '+1234567890',
        to: '+1234567890'
      });
      expect(mockVisitorInviteSmsTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          visitorName: 'John Visitor',
          residentName: 'Jane Resident',
          inviteCode: 'INV123'
        })
      );
    });

    it('should handle missing Twilio configuration', async () => {
      const originalSid = process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_ACCOUNT_SID;

      jest.resetModules();
      const service = await import('../../../src/services/notificationService.js');

      const result = await service.sendVisitorInviteSms(
        visitorData,
        residentData,
        inviteLink
      );

      expect(result).toBe(false);
      
      process.env.TWILIO_ACCOUNT_SID = originalSid;
    });

    it('should handle SMS sending errors', async () => {
      mockTwilioClient.messages.create.mockRejectedValueOnce(
        new Error('Twilio error')
      );

      const result = await notificationService.sendVisitorInviteSms(
        visitorData,
        residentData,
        inviteLink
      );

      expect(result).toBe(false);
    });

    it('should format SMS data correctly', async () => {
      await notificationService.sendVisitorInviteSms(
        visitorData,
        residentData,
        inviteLink
      );

      expect(mockVisitorInviteSmsTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          siteName: 'Test Secure Gate',
          visitDate: expect.any(String),
          inviteLink: inviteLink
        })
      );
    });
  });

  describe('sendOtpVerificationSms', () => {
    const visitorData = {
      name: 'John Visitor',
      phone: '+1234567890'
    };

    const otpCode = '654321';

    it('should send OTP verification SMS successfully', async () => {
      const result = await notificationService.sendOtpVerificationSms(
        visitorData,
        otpCode
      );

      expect(result).toBe(true);
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: expect.any(String),
        from: '+1234567890',
        to: '+1234567890'
      });
      expect(mockOtpVerificationSmsTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          visitorName: 'John Visitor',
          otpCode: '654321',
          expiryMinutes: 15
        })
      );
    });

    it('should use custom expiry time', async () => {
      await notificationService.sendOtpVerificationSms(
        visitorData,
        otpCode,
        20
      );

      expect(mockOtpVerificationSmsTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          expiryMinutes: 20
        })
      );
    });

    it('should handle SMS sending errors', async () => {
      mockTwilioClient.messages.create.mockRejectedValueOnce(
        new Error('Invalid phone number')
      );

      const result = await notificationService.sendOtpVerificationSms(
        visitorData,
        otpCode
      );

      expect(result).toBe(false);
    });
  });

  describe('Legacy functions', () => {
    describe('sendInviteEmail', () => {
      it('should send basic email successfully', async () => {
        const result = await notificationService.sendInviteEmail(
          'test@test.com',
          'Test Subject',
          '<html>Test HTML</html>'
        );

        expect(result).toBe(true);
        expect(mockTransporter.sendMail).toHaveBeenCalledWith({
          from: 'noreply@test.com',
          to: 'test@test.com',
          subject: 'Test Subject',
          html: '<html>Test HTML</html>'
        });
      });

      it('should handle email errors', async () => {
        mockTransporter.sendMail.mockRejectedValueOnce(new Error('Send failed'));

        const result = await notificationService.sendInviteEmail(
          'test@test.com',
          'Test',
          'Body'
        );

        expect(result).toBe(false);
      });
    });

    describe('sendSms', () => {
      it('should send basic SMS successfully', async () => {
        const result = await notificationService.sendSms(
          '+1234567890',
          'Test message'
        );

        expect(result).toBe(true);
        expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
          body: 'Test message',
          from: '+1234567890',
          to: '+1234567890'
        });
      });

      it('should handle SMS errors', async () => {
        mockTwilioClient.messages.create.mockRejectedValueOnce(
          new Error('Send failed')
        );

        const result = await notificationService.sendSms(
          '+1234567890',
          'Test'
        );

        expect(result).toBe(false);
      });
    });
  });

  describe('Module exports', () => {
    it('should export all notification functions', () => {
      expect(notificationService.sendInviteEmail).toBeDefined();
      expect(notificationService.sendSms).toBeDefined();
      expect(notificationService.sendVisitorInviteEmail).toBeDefined();
      expect(notificationService.sendOtpVerificationEmail).toBeDefined();
      expect(notificationService.sendVisitorInviteSms).toBeDefined();
      expect(notificationService.sendOtpVerificationSms).toBeDefined();
      expect(notificationService.default).toBeDefined();
    });

    it('should have correct default export structure', () => {
      const defaultExport = notificationService.default;
      expect(defaultExport.sendInviteEmail).toBeDefined();
      expect(defaultExport.sendSms).toBeDefined();
      expect(defaultExport.sendVisitorInviteEmail).toBeDefined();
      expect(defaultExport.sendOtpVerificationEmail).toBeDefined();
      expect(defaultExport.sendVisitorInviteSms).toBeDefined();
      expect(defaultExport.sendOtpVerificationSms).toBeDefined();
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle null visitor data gracefully', async () => {
      await expect(async () => {
        await notificationService.sendVisitorInviteEmail(
          null,
          { name: 'Test' },
          'link'
        );
      }).rejects.toThrow();
    });

    it('should handle malformed email addresses', async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(
        new Error('Invalid email')
      );

      const result = await notificationService.sendVisitorInviteEmail(
        { email: 'invalid-email', name: 'Test' },
        { name: 'Resident' },
        'link'
      );

      expect(result).toBe(false);
    });

    it('should handle malformed phone numbers', async () => {
      mockTwilioClient.messages.create.mockRejectedValueOnce(
        new Error('Invalid phone')
      );

      const result = await notificationService.sendVisitorInviteSms(
        { phone: 'invalid', name: 'Test' },
        { name: 'Resident' },
        'link'
      );

      expect(result).toBe(false);
    });

    it('should handle template rendering errors', async () => {
      mockVisitorInviteTemplate.mockImplementationOnce(() => {
        throw new Error('Template error');
      });

      const result = await notificationService.sendVisitorInviteEmail(
        { email: 'test@test.com', name: 'Test' },
        { name: 'Resident' },
        'link'
      );

      expect(result).toBe(false);
    });
  });

  describe('Configuration validation', () => {
    it('should handle missing FROM_EMAIL gracefully', async () => {
      const originalFrom = process.env.FROM_EMAIL;
      delete process.env.FROM_EMAIL;

      await notificationService.sendInviteEmail('test@test.com', 'Subject', 'Body');

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: undefined
        })
      );

      process.env.FROM_EMAIL = originalFrom;
    });

    it('should handle missing TWILIO_FROM gracefully', async () => {
      const originalFrom = process.env.TWILIO_FROM;
      delete process.env.TWILIO_FROM;

      jest.resetModules();
      const service = await import('../../../src/services/notificationService.js');

      const result = await service.sendSms('+1234567890', 'Test');

      expect(result).toBe(false);

      process.env.TWILIO_FROM = originalFrom;
    });
  });
});
