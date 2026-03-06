/**
 * Unit Tests for Email Service
 * 
 * Tests cover:
 * - Service initialization with Mailgun credentials
 * - Service initialization in stub mode (no credentials)
 * - Sending OTP emails
 * - Sending welcome emails
 * - Sending password reset emails
 * - Sending registration confirmation emails
 * - Generic send method
 * - Health check functionality
 * - Error handling for all scenarios
 */

import { jest } from '@jest/globals';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: mockLogger
}));

// Mock email templates
const mockEmailTemplates = {
  otpEmail: jest.fn().mockReturnValue('<html>OTP Email</html>'),
  welcomeEmail: jest.fn().mockReturnValue('<html>Welcome Email</html>'),
  passwordResetEmail: jest.fn().mockReturnValue('<html>Password Reset</html>'),
  registrationConfirmationEmail: jest.fn().mockReturnValue('<html>Registration Confirmation</html>')
};

jest.unstable_mockModule('../../src/templates/email-templates.js', () => ({
  emailTemplates: mockEmailTemplates
}));

// Mock Mailgun
const mockMessages = {
  create: jest.fn()
};

const mockDomains = {
  get: jest.fn()
};

const mockMgClient = {
  messages: mockMessages,
  domains: mockDomains
};

const mockMailgunClient = jest.fn().mockReturnValue(mockMgClient);

const MockMailgun = class {
  constructor() { }
  client() { return mockMgClient; }
};

jest.unstable_mockModule('mailgun.js', () => ({
  default: MockMailgun
}));

// Mock form-data
const mockFormData = jest.fn();
jest.unstable_mockModule('form-data', () => ({
  default: mockFormData
}));

describe('EmailService', () => {
  let EmailService;
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;
  let originalEnv;

  beforeAll(async () => {
    // Store original environment
    originalEnv = { ...process.env };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    // Reset environment
    delete process.env.MAILGUN_API_KEY;
    delete process.env.MAILGUN_DOMAIN;
    delete process.env.EMAIL_PROVIDER;
    delete process.env.EMAIL_FROM;
    delete process.env.EMAIL_FROM_NAME;
    delete process.env.MAILGUN_BASE_URL;
    delete process.env.FRONTEND_URL;

    // Reset mock implementations
    mockMessages.create.mockResolvedValue({ id: 'msg-123' });
    mockDomains.get.mockResolvedValue({ name: 'test.domain.com' });

    // Clear module cache for fresh imports
    jest.resetModules();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Initialization', () => {
    describe('with valid Mailgun credentials', () => {
      beforeEach(async () => {
        process.env.MAILGUN_API_KEY = 'test-api-key';
        process.env.MAILGUN_DOMAIN = 'test.domain.com';
        process.env.EMAIL_PROVIDER = 'mailgun';

        // Import class and instantiate
        const { EmailService: EmailServiceClass } = await import('../../src/services/emailService.js');
        EmailService = new EmailServiceClass();
      });

      it('should initialize successfully with Mailgun', () => {
        expect(EmailService.initialized).toBe(true);
        expect(EmailService.domain).toBe('test.domain.com');
      });

      it('should set correct from email', () => {
        expect(EmailService.fromEmail).toBeDefined();
      });

      it('should set default from name', () => {
        expect(EmailService.fromName).toBe('Secure Gate Access');
      });

      it('should log successful initialization', () => {
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Email service initialized successfully with Mailgun'
        );
      });
    });

    describe('in stub mode with Mailgun explicitly selected', () => {
      beforeEach(async () => {
        // Ensure no Mailgun credentials
        delete process.env.MAILGUN_API_KEY;
        delete process.env.MAILGUN_DOMAIN;
        process.env.EMAIL_PROVIDER = 'mailgun';
        process.env.NODE_ENV = 'development';

        jest.resetModules();

        // Re-mock dependencies for fresh module
        jest.unstable_mockModule('../../src/config/logger.js', () => ({
          default: mockLogger
        }));
        jest.unstable_mockModule('../../src/templates/email-templates.js', () => ({
          emailTemplates: mockEmailTemplates
        }));
        jest.unstable_mockModule('mailgun.js', () => ({
          default: MockMailgun
        }));
        jest.unstable_mockModule('form-data', () => ({
          default: mockFormData
        }));

        const { EmailService: EmailServiceClass } = await import('../../src/services/emailService.js');
        EmailService = new EmailServiceClass();
      });

      it('should not be initialized when credentials are missing', () => {
        expect(EmailService.initialized).toBe(false);
      });

      it('should log warning about stub mode', () => {
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Mailgun credentials not found. Email service will operate in stub mode.'
        );
      });
    });

    describe('in stub mode with provider unset', () => {
      beforeEach(async () => {
        delete process.env.MAILGUN_API_KEY;
        delete process.env.MAILGUN_DOMAIN;
        delete process.env.EMAIL_PROVIDER;
        process.env.NODE_ENV = 'development';

        jest.resetModules();

        jest.unstable_mockModule('../../src/config/logger.js', () => ({
          default: mockLogger
        }));
        jest.unstable_mockModule('../../src/templates/email-templates.js', () => ({
          emailTemplates: mockEmailTemplates
        }));
        jest.unstable_mockModule('mailgun.js', () => ({
          default: MockMailgun
        }));
        jest.unstable_mockModule('form-data', () => ({
          default: mockFormData
        }));

        const { EmailService: EmailServiceClass } = await import('../../src/services/emailService.js');
        EmailService = new EmailServiceClass();
      });

      it('should stay in stub mode without logging the Mailgun bootstrap warning', () => {
        expect(EmailService.initialized).toBe(false);
        expect(mockLogger.warn).not.toHaveBeenCalledWith(
          'Mailgun credentials not found. Email service will operate in stub mode.'
        );
      });
    });

    describe('in stub mode during test bootstrap', () => {
      beforeEach(async () => {
        delete process.env.MAILGUN_API_KEY;
        delete process.env.MAILGUN_DOMAIN;
        process.env.NODE_ENV = 'test';

        jest.resetModules();

        jest.unstable_mockModule('../../src/config/logger.js', () => ({
          default: mockLogger
        }));
        jest.unstable_mockModule('../../src/templates/email-templates.js', () => ({
          emailTemplates: mockEmailTemplates
        }));
        jest.unstable_mockModule('mailgun.js', () => ({
          default: MockMailgun
        }));
        jest.unstable_mockModule('form-data', () => ({
          default: mockFormData
        }));

        const { EmailService: EmailServiceClass } = await import('../../src/services/emailService.js');
        EmailService = new EmailServiceClass();
      });

      it('should suppress the bootstrap warning in test env', () => {
        expect(EmailService.initialized).toBe(false);
        expect(mockLogger.warn).not.toHaveBeenCalledWith(
          'Mailgun credentials not found. Email service will operate in stub mode.'
        );
      });
    });

    describe('with custom configuration', () => {
      beforeEach(async () => {
        process.env.MAILGUN_API_KEY = 'test-api-key';
        process.env.MAILGUN_DOMAIN = 'custom.domain.com';
        process.env.EMAIL_FROM = 'custom@domain.com';
        process.env.EMAIL_FROM_NAME = 'Custom App';
        process.env.MAILGUN_BASE_URL = 'https://api.eu.mailgun.net';
        process.env.EMAIL_PROVIDER = 'mailgun';

        jest.resetModules();

        jest.unstable_mockModule('../../src/config/logger.js', () => ({
          default: mockLogger
        }));
        jest.unstable_mockModule('../../src/templates/email-templates.js', () => ({
          emailTemplates: mockEmailTemplates
        }));
        jest.unstable_mockModule('mailgun.js', () => ({
          default: MockMailgun
        }));
        jest.unstable_mockModule('form-data', () => ({
          default: mockFormData
        }));

        const { EmailService: EmailServiceClass } = await import('../../src/services/emailService.js');
        EmailService = new EmailServiceClass();
      });

      it('should use custom from email', () => {
        expect(EmailService.fromEmail).toBe('custom@domain.com');
      });

      it('should use custom from name', () => {
        expect(EmailService.fromName).toBe('Custom App');
      });

      it('should use custom domain', () => {
        expect(EmailService.domain).toBe('custom.domain.com');
      });
    });
  });

  describe('sendOTP', () => {
    beforeEach(async () => {
      process.env.MAILGUN_API_KEY = 'test-api-key';
      process.env.MAILGUN_API_KEY = 'test-api-key';
      process.env.MAILGUN_DOMAIN = 'test.domain.com';
      process.env.EMAIL_PROVIDER = 'mailgun';

      jest.resetModules();

      jest.unstable_mockModule('../../src/config/logger.js', () => ({
        default: mockLogger
      }));
      jest.unstable_mockModule('../../src/templates/email-templates.js', () => ({
        emailTemplates: mockEmailTemplates
      }));
      jest.unstable_mockModule('mailgun.js', () => ({
        default: MockMailgun
      }));
      jest.unstable_mockModule('form-data', () => ({
        default: mockFormData
      }));

      const { EmailService: EmailServiceClass } = await import('../../src/services/emailService.js');
      EmailService = new EmailServiceClass();
    });

    it('should send OTP email successfully', async () => {
      const result = await EmailService.sendOTP('user@test.com', '123456', 'testuser');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
      expect(mockEmailTemplates.otpEmail).toHaveBeenCalledWith({
        username: 'testuser',
        otp: '123456',
        siteName: 'Secure Gate Access',
        expiresIn: '10 minutes'
      });
    });

    it('should use email prefix as username when username is not provided', async () => {
      await EmailService.sendOTP('john.doe@test.com', '123456');

      expect(mockEmailTemplates.otpEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'john.doe'
        })
      );
    });

    it('should use correct subject for OTP email', async () => {
      await EmailService.sendOTP('user@test.com', '123456');

      expect(mockMessages.create).toHaveBeenCalledWith(
        'test.domain.com',
        expect.objectContaining({
          subject: 'Your Secure Gate Access Verification Code'
        })
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    beforeEach(async () => {
      process.env.MAILGUN_API_KEY = 'test-api-key';
      process.env.MAILGUN_DOMAIN = 'test.domain.com';
      process.env.FRONTEND_URL = 'https://app.example.com';
      process.env.EMAIL_PROVIDER = 'mailgun';

      jest.resetModules();

      jest.unstable_mockModule('../../src/config/logger.js', () => ({
        default: mockLogger
      }));
      jest.unstable_mockModule('../../src/templates/email-templates.js', () => ({
        emailTemplates: mockEmailTemplates
      }));
      jest.unstable_mockModule('mailgun.js', () => ({
        default: MockMailgun
      }));
      jest.unstable_mockModule('form-data', () => ({
        default: mockFormData
      }));

      const { EmailService: EmailServiceClass } = await import('../../src/services/emailService.js');
      EmailService = new EmailServiceClass();
    });

    it('should send welcome email successfully', async () => {
      const result = await EmailService.sendWelcomeEmail('user@test.com', 'newuser');

      expect(result.success).toBe(true);
      expect(mockEmailTemplates.welcomeEmail).toHaveBeenCalledWith({
        username: 'newuser',
        siteName: 'Secure Gate Access',
        loginUrl: 'https://app.example.com',
        temporaryPassword: null
      });
    });

    it('should include temporary password if provided', async () => {
      await EmailService.sendWelcomeEmail('user@test.com', 'newuser', 'temp123');

      expect(mockEmailTemplates.welcomeEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          temporaryPassword: 'temp123'
        })
      );
    });

    it('should use default frontend URL if not configured', async () => {
      delete process.env.FRONTEND_URL;

      jest.resetModules();

      jest.unstable_mockModule('../../src/config/logger.js', () => ({
        default: mockLogger
      }));
      jest.unstable_mockModule('../../src/templates/email-templates.js', () => ({
        emailTemplates: mockEmailTemplates
      }));
      jest.unstable_mockModule('mailgun.js', () => ({
        default: MockMailgun
      }));
      jest.unstable_mockModule('form-data', () => ({
        default: mockFormData
      }));

      const { EmailService: EmailServiceClass } = await import('../../src/services/emailService.js');
      const service = new EmailServiceClass();

      await service.sendWelcomeEmail('user@test.com', 'newuser');

      expect(mockEmailTemplates.welcomeEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          loginUrl: 'http://localhost:3000'
        })
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    beforeEach(async () => {
      process.env.MAILGUN_API_KEY = 'test-api-key';
      process.env.MAILGUN_DOMAIN = 'test.domain.com';
      process.env.FRONTEND_URL = 'https://app.example.com';
      process.env.EMAIL_PROVIDER = 'mailgun';

      jest.resetModules();

      jest.unstable_mockModule('../../src/config/logger.js', () => ({
        default: mockLogger
      }));
      jest.unstable_mockModule('../../src/templates/email-templates.js', () => ({
        emailTemplates: mockEmailTemplates
      }));
      jest.unstable_mockModule('mailgun.js', () => ({
        default: MockMailgun
      }));
      jest.unstable_mockModule('form-data', () => ({
        default: mockFormData
      }));

      const { EmailService: EmailServiceClass } = await import('../../src/services/emailService.js');
      EmailService = new EmailServiceClass();
    });

    it('should send password reset email successfully', async () => {
      const result = await EmailService.sendPasswordResetEmail(
        'user@test.com',
        'testuser',
        'reset-token-123'
      );

      expect(result.success).toBe(true);
      expect(mockEmailTemplates.passwordResetEmail).toHaveBeenCalledWith({
        username: 'testuser',
        resetUrl: 'https://app.example.com/reset-password?token=reset-token-123',
        siteName: 'Secure Gate Access',
        expiresIn: '1 hour'
      });
    });

    it('should construct correct reset URL', async () => {
      await EmailService.sendPasswordResetEmail('user@test.com', 'testuser', 'my-token');

      expect(mockEmailTemplates.passwordResetEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          resetUrl: 'https://app.example.com/reset-password?token=my-token'
        })
      );
    });
  });

  describe('sendRegistrationConfirmation', () => {
    beforeEach(async () => {
      process.env.MAILGUN_API_KEY = 'test-api-key';
      process.env.MAILGUN_DOMAIN = 'test.domain.com';
      process.env.FRONTEND_URL = 'https://app.example.com';
      process.env.EMAIL_PROVIDER = 'mailgun';

      jest.resetModules();

      jest.unstable_mockModule('../../src/config/logger.js', () => ({
        default: mockLogger
      }));
      jest.unstable_mockModule('../../src/templates/email-templates.js', () => ({
        emailTemplates: mockEmailTemplates
      }));
      jest.unstable_mockModule('mailgun.js', () => ({
        default: MockMailgun
      }));
      jest.unstable_mockModule('form-data', () => ({
        default: mockFormData
      }));

      const { EmailService: EmailServiceClass } = await import('../../src/services/emailService.js');
      EmailService = new EmailServiceClass();
    });

    it('should send registration confirmation email successfully', async () => {
      const result = await EmailService.sendRegistrationConfirmation(
        'user@test.com',
        'newuser',
        'verify-token-456'
      );

      expect(result.success).toBe(true);
      expect(mockEmailTemplates.registrationConfirmationEmail).toHaveBeenCalledWith({
        username: 'newuser',
        verificationUrl: 'https://app.example.com/verify-email?token=verify-token-456',
        siteName: 'Secure Gate Access',
        expiresIn: '24 hours'
      });
    });
  });

  describe('send (generic method)', () => {
    describe('when initialized', () => {
      beforeEach(async () => {
        process.env.MAILGUN_API_KEY = 'test-api-key';
        process.env.MAILGUN_DOMAIN = 'test.domain.com';
        process.env.EMAIL_PROVIDER = 'mailgun';

        jest.resetModules();

        jest.unstable_mockModule('../../src/config/logger.js', () => ({
          default: mockLogger
        }));
        jest.unstable_mockModule('../../src/templates/email-templates.js', () => ({
          emailTemplates: mockEmailTemplates
        }));
        jest.unstable_mockModule('mailgun.js', () => ({
          default: MockMailgun
        }));
        jest.unstable_mockModule('form-data', () => ({
          default: mockFormData
        }));

        const { EmailService: EmailServiceClass } = await import('../../src/services/emailService.js');
        EmailService = new EmailServiceClass();
      });

      it('should send email successfully via Mailgun', async () => {
        const result = await EmailService.send(
          'user@test.com',
          'Test Subject',
          '<html>Test content</html>'
        );

        expect(result.success).toBe(true);
        expect(result.messageId).toBe('msg-123');
        expect(mockMessages.create).toHaveBeenCalledWith(
          'test.domain.com',
          expect.objectContaining({
            to: 'user@test.com',
            subject: 'Test Subject',
            html: '<html>Test content</html>'
          })
        );
      });

      it('should include text content if provided', async () => {
        await EmailService.send(
          'user@test.com',
          'Test Subject',
          '<html>HTML</html>',
          'Plain text version'
        );

        expect(mockMessages.create).toHaveBeenCalledWith(
          'test.domain.com',
          expect.objectContaining({
            text: 'Plain text version'
          })
        );
      });

      it('should log successful email send', async () => {
        await EmailService.send('user@test.com', 'Test', '<html>Test</html>');

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Email sent successfully via Mailgun to u***@test.com',
          expect.objectContaining({
            messageId: 'msg-123',
            subject: 'Test'
          })
        );
      });

      it('should handle Mailgun API errors', async () => {
        mockMessages.create.mockRejectedValue(new Error('API Error'));

        const result = await EmailService.send('user@test.com', 'Test', '<html>Test</html>');

        expect(result.success).toBe(false);
        expect(result.error).toBe('API Error');
        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('should handle network errors', async () => {
        mockMessages.create.mockRejectedValue(new Error('Network timeout'));

        const result = await EmailService.send('user@test.com', 'Test', '<html>Test</html>');

        expect(result.success).toBe(false);
        expect(result.message).toBe('Failed to send email');
      });
    });

    describe('in stub mode', () => {
      beforeEach(async () => {
        delete process.env.MAILGUN_API_KEY;
        delete process.env.MAILGUN_DOMAIN;

        jest.resetModules();

        jest.unstable_mockModule('../../src/config/logger.js', () => ({
          default: mockLogger
        }));
        jest.unstable_mockModule('../../src/templates/email-templates.js', () => ({
          emailTemplates: mockEmailTemplates
        }));
        jest.unstable_mockModule('mailgun.js', () => ({
          default: MockMailgun
        }));
        jest.unstable_mockModule('form-data', () => ({
          default: mockFormData
        }));

        const { EmailService: EmailServiceClass } = await import('../../src/services/emailService.js');
        EmailService = new EmailServiceClass();
      });

      it('should return stub response when not initialized', async () => {
        const result = await EmailService.send('user@test.com', 'Test', '<html>Test</html>');

        expect(result.success).toBe(true);
        expect(result.stubMode).toBe(true);
        expect(result.message).toBe('Email service in stub mode - no actual email sent');
      });

      it('should log stub mode warning', async () => {
        await EmailService.send('user@test.com', 'Test', '<html>Test</html>');

        expect(mockLogger.warn).toHaveBeenCalledWith(
          '[EMAIL STUB] Would send email to u***@test.com: Test'
        );
      });

      it('should not call Mailgun API in stub mode', async () => {
        await EmailService.send('user@test.com', 'Test', '<html>Test</html>');

        expect(mockMessages.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('isHealthy', () => {
    describe('when initialized', () => {
      beforeEach(async () => {
        process.env.MAILGUN_API_KEY = 'test-api-key';
        process.env.MAILGUN_DOMAIN = 'test.domain.com';
        process.env.EMAIL_PROVIDER = 'mailgun';

        jest.resetModules();

        jest.unstable_mockModule('../../src/config/logger.js', () => ({
          default: mockLogger
        }));
        jest.unstable_mockModule('../../src/templates/email-templates.js', () => ({
          emailTemplates: mockEmailTemplates
        }));
        jest.unstable_mockModule('mailgun.js', () => ({
          default: MockMailgun
        }));
        jest.unstable_mockModule('form-data', () => ({
          default: mockFormData
        }));

        const { EmailService: EmailServiceClass } = await import('../../src/services/emailService.js');
        EmailService = new EmailServiceClass();
      });

      it('should return healthy when Mailgun is accessible', async () => {
        mockDomains.get.mockResolvedValue({ name: 'test.domain.com' });

        const result = await EmailService.isHealthy();

        expect(result.healthy).toBe(true);
        expect(result.provider).toBe('Mailgun');
      });

      it('should return unhealthy when Mailgun API fails', async () => {
        mockDomains.get.mockRejectedValue(new Error('Connection refused'));

        const result = await EmailService.isHealthy();

        expect(result.healthy).toBe(false);
        expect(result.reason).toBe('Cannot connect to mailgun service');
        expect(result.error).toBe('Connection refused');
      });
    });

    describe('when not initialized', () => {
      beforeEach(async () => {
        delete process.env.MAILGUN_API_KEY;
        delete process.env.MAILGUN_DOMAIN;

        jest.resetModules();

        jest.unstable_mockModule('../../src/config/logger.js', () => ({
          default: mockLogger
        }));
        jest.unstable_mockModule('../../src/templates/email-templates.js', () => ({
          emailTemplates: mockEmailTemplates
        }));
        jest.unstable_mockModule('mailgun.js', () => ({
          default: MockMailgun
        }));
        jest.unstable_mockModule('form-data', () => ({
          default: mockFormData
        }));

        const { EmailService: EmailServiceClass } = await import('../../src/services/emailService.js');
        EmailService = new EmailServiceClass();
      });

      it('should return unhealthy when service is not initialized', async () => {
        const result = await EmailService.isHealthy();

        expect(result.healthy).toBe(false);
        expect(result.reason).toBe('Email service not initialized');
      });
    });
  });
});
