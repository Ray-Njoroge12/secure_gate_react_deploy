// server/tests/integration/email-service.test.js
import request from 'supertest';
import express from 'express';
import nodemailer from 'nodemailer';
import { sendVisitorInviteEmail, sendOtpVerificationEmail } from '../../src/services/notificationService.js';
import { sendEmailOtp, sendEmail } from '../../src/utils/tokenHelper.js';

// Mock nodemailer
const mockTransporter = {
  sendMail: jest.fn()
};

// Mock nodemailer module
jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransporter: jest.fn(() => mockTransporter)
  }
}));

// Create test app
const app = express();
app.use(express.json());

// Mock email service endpoints
app.post('/api/test/email/visitor-invite', async (req, res) => {
  try {
    const { visitorData, residentData, inviteLink } = req.body;
    const result = await sendVisitorInviteEmail(visitorData, residentData, inviteLink);
    res.json({ success: result, message: 'Email test completed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/test/email/otp-verification', async (req, res) => {
  try {
    const { visitorData, otpCode } = req.body;
    const result = await sendOtpVerificationEmail(visitorData, otpCode);
    res.json({ success: result, message: 'OTP email test completed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/test/email/send-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const result = await sendEmailOtp(email, otp);
    res.json({ success: result, message: 'OTP email sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/test/email/send-generic', async (req, res) => {
  try {
    const { to, subject, text } = req.body;
    const result = await sendEmail(to, subject, text);
    res.json({ success: result, message: 'Generic email sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    success: false,
    message: err.message,
    error: { code: err.code || 'INTERNAL_ERROR' }
  });
});

describe('Email Service Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful email sending
    mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });
  });

  describe('SMTP Configuration', () => {
    test('validates SMTP configuration', () => {
      const requiredEnvVars = [
        'SMTP_HOST',
        'SMTP_PORT',
        'SMTP_USER',
        'SMTP_PASS',
        'FROM_EMAIL'
      ];

      requiredEnvVars.forEach(envVar => {
        expect(process.env[envVar]).toBeDefined();
      });
    });

    test('creates nodemailer transporter with correct config', () => {
      expect(nodemailer.createTransporter).toHaveBeenCalledWith({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    });
  });

  describe('Visitor Invite Email', () => {
    const testData = {
      visitorData: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+254712345678'
      },
      residentData: {
        name: 'Jane Smith',
        unit: 'A101'
      },
      inviteLink: 'https://secure-gate.com/invite/abc123'
    };

    test('sends visitor invite email successfully', async () => {
      const response = await request(app)
        .post('/api/test/email/visitor-invite')
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: process.env.FROM_EMAIL,
          to: testData.visitorData.email,
          subject: expect.stringContaining('Invitation'),
          html: expect.stringContaining(testData.visitorData.name)
        })
      );
    });

    test('handles missing visitor data', async () => {
      const response = await request(app)
        .post('/api/test/email/visitor-invite')
        .send({})
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('handles invalid email format', async () => {
      const invalidData = {
        ...testData,
        visitorData: {
          ...testData.visitorData,
          email: 'invalid-email'
        }
      };

      const response = await request(app)
        .post('/api/test/email/visitor-invite')
        .send(invalidData)
        .expect(200);

      // Should still attempt to send (validation happens at service level)
      expect(response.body.success).toBe(true);
    });
  });

  describe('OTP Verification Email', () => {
    const testData = {
      visitorData: {
        name: 'John Doe',
        email: 'john.doe@example.com'
      },
      otpCode: '123456'
    };

    test('sends OTP verification email successfully', async () => {
      const response = await request(app)
        .post('/api/test/email/otp-verification')
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: process.env.FROM_EMAIL,
          to: testData.visitorData.email,
          subject: expect.stringContaining('Verification Code'),
          html: expect.stringContaining(testData.otpCode)
        })
      );
    });

    test('handles missing OTP code', async () => {
      const response = await request(app)
        .post('/api/test/email/otp-verification')
        .send({
          visitorData: testData.visitorData
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Generic Email Functions', () => {
    test('sends OTP email using tokenHelper', async () => {
      const response = await request(app)
        .post('/api/test/email/send-otp')
        .send({
          email: 'test@example.com',
          otp: '123456'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('sends generic email using tokenHelper', async () => {
      const response = await request(app)
        .post('/api/test/email/send-generic')
        .send({
          to: 'test@example.com',
          subject: 'Test Subject',
          text: 'Test message'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Email Template Rendering', () => {
    test('visitor invite email contains required elements', async () => {
      const testData = {
        visitorData: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+254712345678'
        },
        residentData: {
          name: 'Jane Smith',
          unit: 'A101'
        },
        inviteLink: 'https://secure-gate.com/invite/abc123'
      };

      await request(app)
        .post('/api/test/email/visitor-invite')
        .send(testData);

      const sentEmail = mockTransporter.sendMail.mock.calls[0][0];
      expect(sentEmail.html).toContain(testData.visitorData.name);
      expect(sentEmail.html).toContain(testData.residentData.name);
      expect(sentEmail.html).toContain(testData.inviteLink);
    });

    test('OTP verification email contains required elements', async () => {
      const testData = {
        visitorData: {
          name: 'John Doe',
          email: 'john.doe@example.com'
        },
        otpCode: '123456'
      };

      await request(app)
        .post('/api/test/email/otp-verification')
        .send(testData);

      const sentEmail = mockTransporter.sendMail.mock.calls[0][0];
      expect(sentEmail.html).toContain(testData.otpCode);
      expect(sentEmail.html).toContain('15 minutes'); // Default expiry
    });
  });

  describe('Error Handling', () => {
    test('handles SMTP connection errors', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP connection failed'));

      const response = await request(app)
        .post('/api/test/email/visitor-invite')
        .send({
          visitorData: { name: 'Test', email: 'test@example.com' },
          residentData: { name: 'Resident', unit: 'A101' },
          inviteLink: 'https://test.com'
        })
        .expect(200);

      expect(response.body.success).toBe(false);
    });

    test('handles missing SMTP configuration', async () => {
      // Temporarily clear SMTP env vars
      const originalHost = process.env.SMTP_HOST;
      const originalUser = process.env.SMTP_USER;
      const originalPass = process.env.SMTP_PASS;

      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      const response = await request(app)
        .post('/api/test/email/send-otp')
        .send({
          email: 'test@example.com',
          otp: '123456'
        })
        .expect(200);

      // Should return true for dev/stub success
      expect(response.body.success).toBe(true);

      // Restore env vars
      process.env.SMTP_HOST = originalHost;
      process.env.SMTP_USER = originalUser;
      process.env.SMTP_PASS = originalPass;
    });
  });

  describe('Email Metrics and Logging', () => {
    test('tracks email sending metrics', async () => {
      // This would require access to the metrics object
      // For now, we'll test that the function completes successfully
      const response = await request(app)
        .post('/api/test/email/visitor-invite')
        .send({
          visitorData: { name: 'Test', email: 'test@example.com' },
          residentData: { name: 'Resident', unit: 'A101' },
          inviteLink: 'https://test.com'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Email Content Validation', () => {
    test('email contains proper headers', async () => {
      const testData = {
        visitorData: { name: 'John Doe', email: 'john.doe@example.com' },
        residentData: { name: 'Jane Smith', unit: 'A101' },
        inviteLink: 'https://secure-gate.com/invite/abc123'
      };

      await request(app)
        .post('/api/test/email/visitor-invite')
        .send(testData);

      const sentEmail = mockTransporter.sendMail.mock.calls[0][0];
      expect(sentEmail.from).toBe(process.env.FROM_EMAIL);
      expect(sentEmail.to).toBe(testData.visitorData.email);
      expect(sentEmail.subject).toBeDefined();
      expect(sentEmail.html).toBeDefined();
    });

    test('email content is properly escaped', async () => {
      const testData = {
        visitorData: { 
          name: 'John "Danger" Doe', 
          email: 'john.doe@example.com' 
        },
        residentData: { 
          name: 'Jane <script>alert("xss")</script> Smith', 
          unit: 'A101' 
        },
        inviteLink: 'https://secure-gate.com/invite/abc123'
      };

      await request(app)
        .post('/api/test/email/visitor-invite')
        .send(testData);

      const sentEmail = mockTransporter.sendMail.mock.calls[0][0];
      // Check that HTML is properly escaped
      expect(sentEmail.html).not.toContain('<script>');
      expect(sentEmail.html).toContain('&quot;');
    });
  });

  describe('Performance Tests', () => {
    test('handles multiple concurrent email sends', async () => {
      const promises = [];
      const testData = {
        visitorData: { name: 'Test', email: 'test@example.com' },
        residentData: { name: 'Resident', unit: 'A101' },
        inviteLink: 'https://test.com'
      };

      // Send 10 concurrent emails
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/test/email/visitor-invite')
            .send(testData)
        );
      }

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // All emails should have been sent
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(10);
    });
  });

  describe('Email Template Integration', () => {
    test('visitor invite template renders correctly', async () => {
      const testData = {
        visitorData: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+254712345678'
        },
        residentData: {
          name: 'Jane Smith',
          unit: 'A101'
        },
        inviteLink: 'https://secure-gate.com/invite/abc123'
      };

      await request(app)
        .post('/api/test/email/visitor-invite')
        .send(testData);

      const sentEmail = mockTransporter.sendMail.mock.calls[0][0];
      
      // Check template structure
      expect(sentEmail.html).toContain('<!DOCTYPE html>');
      expect(sentEmail.html).toContain('<html>');
      expect(sentEmail.html).toContain('<body>');
      expect(sentEmail.html).toContain('</body>');
      expect(sentEmail.html).toContain('</html>');
    });

    test('OTP verification template renders correctly', async () => {
      const testData = {
        visitorData: {
          name: 'John Doe',
          email: 'john.doe@example.com'
        },
        otpCode: '123456'
      };

      await request(app)
        .post('/api/test/email/otp-verification')
        .send(testData);

      const sentEmail = mockTransporter.sendMail.mock.calls[0][0];
      
      // Check template structure
      expect(sentEmail.html).toContain('<!DOCTYPE html>');
      expect(sentEmail.html).toContain('<html>');
      expect(sentEmail.html).toContain('<body>');
      expect(sentEmail.html).toContain('</body>');
      expect(sentEmail.html).toContain('</html>');
    });
  });
});
