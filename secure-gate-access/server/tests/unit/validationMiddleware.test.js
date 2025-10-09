const { describe, it, expect, beforeEach, afterEach, jest } = require('@jest/globals');
const validationMiddleware = require('../../src/middleware/validationMiddleware');

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateEmail', () => {
    it('should accept valid email', () => {
      req.body.email = 'user@example.com';

      validationMiddleware.validateEmail(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should accept email with subdomain', () => {
      req.body.email = 'user@mail.example.com';

      validationMiddleware.validateEmail(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should accept email with plus addressing', () => {
      req.body.email = 'user+tag@example.com';

      validationMiddleware.validateEmail(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject missing email', () => {
      req.body.email = undefined;

      validationMiddleware.validateEmail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email is required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject empty email', () => {
      req.body.email = '';

      validationMiddleware.validateEmail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email is required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid email format', () => {
      req.body.email = 'invalid-email';

      validationMiddleware.validateEmail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid email format'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject email without @', () => {
      req.body.email = 'userexample.com';

      validationMiddleware.validateEmail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid email format'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject email without domain', () => {
      req.body.email = 'user@';

      validationMiddleware.validateEmail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid email format'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should normalize email to lowercase', () => {
      req.body.email = 'USER@EXAMPLE.COM';

      validationMiddleware.validateEmail(req, res, next);

      expect(req.body.email).toBe('user@example.com');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('validatePassword', () => {
    it('should accept strong password', () => {
      req.body.password = 'StrongPass123!@#';

      validationMiddleware.validatePassword(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should accept password with minimum requirements', () => {
      req.body.password = 'Pass123!';

      validationMiddleware.validatePassword(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject missing password', () => {
      req.body.password = undefined;

      validationMiddleware.validatePassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Password is required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject empty password', () => {
      req.body.password = '';

      validationMiddleware.validatePassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Password is required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject password shorter than 8 characters', () => {
      req.body.password = 'Pass1!';

      validationMiddleware.validatePassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject password without uppercase letter', () => {
      req.body.password = 'password123!';

      validationMiddleware.validatePassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Password must contain at least one uppercase letter'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject password without lowercase letter', () => {
      req.body.password = 'PASSWORD123!';

      validationMiddleware.validatePassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Password must contain at least one lowercase letter'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject password without number', () => {
      req.body.password = 'Password!@#';

      validationMiddleware.validatePassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Password must contain at least one number'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject password without special character', () => {
      req.body.password = 'Password123';

      validationMiddleware.validatePassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Password must contain at least one special character'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject password longer than 128 characters', () => {
      req.body.password = 'P1!' + 'a'.repeat(130);

      validationMiddleware.validatePassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Password must not exceed 128 characters'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject common passwords', () => {
      const commonPasswords = ['Password123!', 'Admin123!', 'Welcome123!'];

      commonPasswords.forEach(password => {
        req.body.password = password;
        next.mockClear();
        res.status.mockClear();
        res.json.mockClear();

        validationMiddleware.validatePassword(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          error: 'Password is too common, please choose a different password'
        });
        expect(next).not.toHaveBeenCalled();
      });
    });
  });

  describe('validateUsername', () => {
    it('should accept valid username', () => {
      req.body.username = 'validuser123';

      validationMiddleware.validateUsername(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should accept username with underscores', () => {
      req.body.username = 'valid_user_123';

      validationMiddleware.validateUsername(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should accept username with hyphens', () => {
      req.body.username = 'valid-user-123';

      validationMiddleware.validateUsername(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject missing username', () => {
      req.body.username = undefined;

      validationMiddleware.validateUsername(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Username is required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject empty username', () => {
      req.body.username = '';

      validationMiddleware.validateUsername(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Username is required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject username shorter than 3 characters', () => {
      req.body.username = 'ab';

      validationMiddleware.validateUsername(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Username must be between 3 and 30 characters'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject username longer than 30 characters', () => {
      req.body.username = 'a'.repeat(31);

      validationMiddleware.validateUsername(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Username must be between 3 and 30 characters'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject username with special characters', () => {
      req.body.username = 'user@name!';

      validationMiddleware.validateUsername(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Username can only contain letters, numbers, underscores, and hyphens'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject username with spaces', () => {
      req.body.username = 'user name';

      validationMiddleware.validateUsername(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Username can only contain letters, numbers, underscores, and hyphens'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should normalize username to lowercase', () => {
      req.body.username = 'ValidUser123';

      validationMiddleware.validateUsername(req, res, next);

      expect(req.body.username).toBe('validuser123');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateMFACode', () => {
    it('should accept valid 6-digit TOTP code', () => {
      req.body.code = '123456';
      req.body.type = 'totp';

      validationMiddleware.validateMFACode(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should accept valid backup code', () => {
      req.body.code = 'ABCD-1234-EFGH-5678';
      req.body.type = 'backup';

      validationMiddleware.validateMFACode(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should accept valid OTP code', () => {
      req.body.code = '123456';
      req.body.type = 'otp';

      validationMiddleware.validateMFACode(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject missing code', () => {
      req.body.code = undefined;
      req.body.type = 'totp';

      validationMiddleware.validateMFACode(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'MFA code is required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject empty code', () => {
      req.body.code = '';
      req.body.type = 'totp';

      validationMiddleware.validateMFACode(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'MFA code is required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject missing type', () => {
      req.body.code = '123456';
      req.body.type = undefined;

      validationMiddleware.validateMFACode(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'MFA type is required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid MFA type', () => {
      req.body.code = '123456';
      req.body.type = 'invalid';

      validationMiddleware.validateMFACode(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid MFA type'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject TOTP code with non-digits', () => {
      req.body.code = '12345a';
      req.body.type = 'totp';

      validationMiddleware.validateMFACode(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid TOTP code format'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject TOTP code with wrong length', () => {
      req.body.code = '12345';
      req.body.type = 'totp';

      validationMiddleware.validateMFACode(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'TOTP code must be 6 digits'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should sanitize code by trimming whitespace', () => {
      req.body.code = '  123456  ';
      req.body.type = 'totp';

      validationMiddleware.validateMFACode(req, res, next);

      expect(req.body.code).toBe('123456');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateObjectId', () => {
    it('should accept valid MongoDB ObjectId', () => {
      req.params.id = '507f1f77bcf86cd799439011';

      validationMiddleware.validateObjectId(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should accept valid ObjectId in different field', () => {
      req.params.userId = '507f1f77bcf86cd799439012';

      validationMiddleware.validateObjectId('userId')(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject missing ObjectId', () => {
      req.params.id = undefined;

      validationMiddleware.validateObjectId(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'ID is required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject empty ObjectId', () => {
      req.params.id = '';

      validationMiddleware.validateObjectId(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'ID is required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid ObjectId format', () => {
      req.params.id = 'invalid-id';

      validationMiddleware.validateObjectId(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid ID format'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject ObjectId with wrong length', () => {
      req.params.id = '507f1f77bcf86cd79943901';

      validationMiddleware.validateObjectId(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid ID format'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize HTML tags from input', () => {
      req.body.comment = '<script>alert("XSS")</script>Hello';

      validationMiddleware.sanitizeInput(req, res, next);

      expect(req.body.comment).not.toContain('<script>');
      expect(next).toHaveBeenCalled();
    });

    it('should sanitize SQL injection attempts', () => {
      req.body.search = "'; DROP TABLE users; --";

      validationMiddleware.sanitizeInput(req, res, next);

      expect(req.body.search).not.toContain('DROP TABLE');
      expect(next).toHaveBeenCalled();
    });

    it('should handle nested objects', () => {
      req.body.user = {
        name: '<b>John</b>',
        bio: '<script>alert("XSS")</script>Developer'
      };

      validationMiddleware.sanitizeInput(req, res, next);

      expect(req.body.user.name).not.toContain('<b>');
      expect(req.body.user.bio).not.toContain('<script>');
      expect(next).toHaveBeenCalled();
    });

    it('should handle arrays', () => {
      req.body.tags = ['<script>tag1</script>', 'tag2', '<b>tag3</b>'];

      validationMiddleware.sanitizeInput(req, res, next);

      req.body.tags.forEach(tag => {
        expect(tag).not.toContain('<script>');
        expect(tag).not.toContain('<b>');
      });
      expect(next).toHaveBeenCalled();
    });

    it('should not affect valid input', () => {
      req.body.message = 'This is a normal message';

      validationMiddleware.sanitizeInput(req, res, next);

      expect(req.body.message).toBe('This is a normal message');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('validatePagination', () => {
    it('should accept valid pagination parameters', () => {
      req.query.page = '2';
      req.query.limit = '20';

      validationMiddleware.validatePagination(req, res, next);

      expect(req.query.page).toBe(2);
      expect(req.query.limit).toBe(20);
      expect(next).toHaveBeenCalled();
    });

    it('should use default values when not provided', () => {
      req.query = {};

      validationMiddleware.validatePagination(req, res, next);

      expect(req.query.page).toBe(1);
      expect(req.query.limit).toBe(10);
      expect(next).toHaveBeenCalled();
    });

    it('should reject negative page number', () => {
      req.query.page = '-1';

      validationMiddleware.validatePagination(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Page number must be positive'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject negative limit', () => {
      req.query.limit = '-10';

      validationMiddleware.validatePagination(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Limit must be positive'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject limit exceeding maximum', () => {
      req.query.limit = '200';

      validationMiddleware.validatePagination(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Limit cannot exceed 100'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject non-numeric page', () => {
      req.query.page = 'abc';

      validationMiddleware.validatePagination(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid page number'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject non-numeric limit', () => {
      req.query.limit = 'xyz';

      validationMiddleware.validatePagination(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid limit value'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateDateRange', () => {
    it('should accept valid date range', () => {
      req.query.startDate = '2024-01-01';
      req.query.endDate = '2024-12-31';

      validationMiddleware.validateDateRange(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject end date before start date', () => {
      req.query.startDate = '2024-12-31';
      req.query.endDate = '2024-01-01';

      validationMiddleware.validateDateRange(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'End date must be after start date'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid date format', () => {
      req.query.startDate = 'invalid-date';
      req.query.endDate = '2024-12-31';

      validationMiddleware.validateDateRange(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid date format'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept when no dates provided', () => {
      req.query = {};

      validationMiddleware.validateDateRange(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
