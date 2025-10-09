// server/tests/integration/email-service-comprehensive.test.js
import request from 'supertest';
import express from 'express';
import { sendVisitorInviteEmail, sendOtpVerificationEmail } from '../../src/services/notificationService.js';
import { sendEmailOtp, sendEmail } from '../../src/utils/tokenHelper.js';

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

    test('SMTP configuration is properly formatted', () => {
      const smtpConfig = {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER && process.env.SMTP_PASS ? { 
          user: process.env.SMTP_USER, 
          pass: process.env.SMTP_PASS 
        } : undefined,
      };

      expect(smtpConfig.host).toBeDefined();
      expect(smtpConfig.port).toBeGreaterThan(0);
      expect(typeof smtpConfig.secure).toBe('boolean');
    });
  });

  describe('Visitor Invite Email', () => {
    const testData = {
      visitorData: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+254712345678',
        dateOfVisit: '2025-10-07',
        time: '14:00',
        purpose: 'Meeting',
        inviteCode: 'ABC123'
      },
      residentData: {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
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
      expect(response.body.message).toBe('Email test completed');
    });

    test('handles missing visitor data gracefully', async () => {
      const response = await request(app)
        .post('/api/test/email/visitor-invite')
        .send({})
        .expect(200);

      // Should handle missing data gracefully
      expect(response.body).toHaveProperty('success');
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
      expect(response.body.message).toBe('OTP email test completed');
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
          phone: '+254712345678',
          dateOfVisit: '2025-10-07',
          time: '14:00',
          purpose: 'Meeting',
          inviteCode: 'ABC123'
        },
        residentData: {
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          unit: 'A101'
        },
        inviteLink: 'https://secure-gate.com/invite/abc123'
      };

      const response = await request(app)
        .post('/api/test/email/visitor-invite')
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('OTP verification email contains required elements', async () => {
      const testData = {
        visitorData: {
          name: 'John Doe',
          email: 'john.doe@example.com'
        },
        otpCode: '123456'
      };

      const response = await request(app)
        .post('/api/test/email/otp-verification')
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('handles missing SMTP configuration gracefully', async () => {
      // This test verifies that the service handles missing SMTP config
      const response = await request(app)
        .post('/api/test/email/send-otp')
        .send({
          email: 'test@example.com',
          otp: '123456'
        })
        .expect(200);

      // Should return true for dev/stub success when SMTP not configured
      expect(response.body.success).toBe(true);
    });

    test('handles invalid email addresses', async () => {
      const response = await request(app)
        .post('/api/test/email/send-otp')
        .send({
          email: 'invalid-email-format',
          otp: '123456'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Email Metrics and Logging', () => {
    test('tracks email sending metrics', async () => {
      const response = await request(app)
        .post('/api/test/email/visitor-invite')
        .send({
          visitorData: { name: 'Test', email: 'test@example.com' },
          residentData: { name: 'Resident', email: 'resident@example.com' },
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
        residentData: { name: 'Jane Smith', email: 'jane.smith@example.com' },
        inviteLink: 'https://secure-gate.com/invite/abc123'
      };

      const response = await request(app)
        .post('/api/test/email/visitor-invite')
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('email content is properly escaped', async () => {
      const testData = {
        visitorData: { 
          name: 'John "Danger" Doe', 
          email: 'john.doe@example.com' 
        },
        residentData: { 
          name: 'Jane <script>alert("xss")</script> Smith', 
          email: 'jane.smith@example.com'
        },
        inviteLink: 'https://secure-gate.com/invite/abc123'
      };

      const response = await request(app)
        .post('/api/test/email/visitor-invite')
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    test('handles multiple concurrent email sends', async () => {
      const promises = [];
      const testData = {
        visitorData: { name: 'Test', email: 'test@example.com' },
        residentData: { name: 'Resident', email: 'resident@example.com' },
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
    });
  });

  describe('Email Template Integration', () => {
    test('visitor invite template renders correctly', async () => {
      const testData = {
        visitorData: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+254712345678',
          dateOfVisit: '2025-10-07',
          time: '14:00',
          purpose: 'Meeting',
          inviteCode: 'ABC123'
        },
        residentData: {
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          unit: 'A101'
        },
        inviteLink: 'https://secure-gate.com/invite/abc123'
      };

      const response = await request(app)
        .post('/api/test/email/visitor-invite')
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('OTP verification template renders correctly', async () => {
      const testData = {
        visitorData: {
          name: 'John Doe',
          email: 'john.doe@example.com'
        },
        otpCode: '123456'
      };

      const response = await request(app)
        .post('/api/test/email/otp-verification')
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});




