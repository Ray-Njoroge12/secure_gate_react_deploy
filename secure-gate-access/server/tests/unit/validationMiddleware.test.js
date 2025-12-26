/**
 * ValidationMiddleware Unit Tests
 * 
 * Tests for input validation framework and utilities.
 * Priority: P1 (Security Middleware)
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('ValidationMiddleware', () => {
  let validationModule;
  let ValidationSchemas;
  let validateRequest;
  let SanitizeUtil;
  let CustomValidators;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    validationModule = await import('../../src/middleware/validationMiddleware.js');
    ValidationSchemas = validationModule.ValidationSchemas;
    validateRequest = validationModule.validateRequest;
    SanitizeUtil = validationModule.SanitizeUtil;
    CustomValidators = validationModule.CustomValidators;
  });
  
  describe('ValidationSchemas', () => {
    describe('userRegistration', () => {
      it('should validate valid registration data', () => {
        const validData = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'Test@1234',
          role: 'resident'
        };
        
        const { error, value } = ValidationSchemas.userRegistration.validate(validData);
        
        expect(error).toBeUndefined();
        expect(value.email).toBe('test@example.com');
      });
      
      it('should reject invalid email', () => {
        const invalidData = {
          email: 'invalid-email',
          username: 'testuser',
          password: 'Test@1234'
        };
        
        const { error } = ValidationSchemas.userRegistration.validate(invalidData);
        
        expect(error).toBeDefined();
      });
      
      it('should reject weak password', () => {
        const invalidData = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'weak'
        };
        
        const { error } = ValidationSchemas.userRegistration.validate(invalidData);
        
        expect(error).toBeDefined();
      });
      
      it('should reject short username', () => {
        const invalidData = {
          email: 'test@example.com',
          username: 'ab',
          password: 'Test@1234'
        };
        
        const { error } = ValidationSchemas.userRegistration.validate(invalidData);
        
        expect(error).toBeDefined();
      });
      
      it('should trim and lowercase email', () => {
        const data = {
          email: '  TEST@EXAMPLE.COM  ',
          username: 'testuser',
          password: 'Test@1234'
        };
        
        const { value } = ValidationSchemas.userRegistration.validate(data);
        
        expect(value.email).toBe('test@example.com');
      });
      
      it('should accept valid phone formats', () => {
        const data = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'Test@1234',
          phone: '+254712345678'
        };
        
        const { error } = ValidationSchemas.userRegistration.validate(data);
        
        expect(error).toBeUndefined();
      });
      
      it('should accept Kenyan local phone format', () => {
        const data = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'Test@1234',
          phone: '0712345678'
        };
        
        const { error } = ValidationSchemas.userRegistration.validate(data);
        
        expect(error).toBeUndefined();
      });
    });
    
    describe('userLogin', () => {
      it('should validate valid login data', () => {
        const validData = {
          email: 'test@example.com',
          password: 'anypassword'
        };
        
        const { error } = ValidationSchemas.userLogin.validate(validData);
        
        expect(error).toBeUndefined();
      });
      
      it('should require email', () => {
        const invalidData = {
          password: 'anypassword'
        };
        
        const { error } = ValidationSchemas.userLogin.validate(invalidData);
        
        expect(error).toBeDefined();
      });
      
      it('should require password', () => {
        const invalidData = {
          email: 'test@example.com'
        };
        
        const { error } = ValidationSchemas.userLogin.validate(invalidData);
        
        expect(error).toBeDefined();
      });
    });
    
    describe('visitorCreation', () => {
      it('should validate valid visitor data', () => {
        const validData = {
          name: 'John Visitor',
          phone: '+254712345678',
          dateOfVisit: new Date(Date.now() + 86400000), // Tomorrow
          time: '10:30',
          purpose: 'Meeting'
        };
        
        const { error } = ValidationSchemas.visitorCreation.validate(validData);
        
        expect(error).toBeUndefined();
      });
      
      it('should require visitor name', () => {
        const invalidData = {
          dateOfVisit: new Date(Date.now() + 86400000),
          time: '10:30',
          purpose: 'Meeting'
        };
        
        const { error } = ValidationSchemas.visitorCreation.validate(invalidData);
        
        expect(error).toBeDefined();
      });
      
      it('should validate time format', () => {
        const invalidData = {
          name: 'John Visitor',
          dateOfVisit: new Date(Date.now() + 86400000),
          time: '25:00', // Invalid time
          purpose: 'Meeting'
        };
        
        const { error } = ValidationSchemas.visitorCreation.validate(invalidData);
        
        expect(error).toBeDefined();
      });
    });
    
    describe('pagination', () => {
      it('should set default values', () => {
        const data = {};
        
        const { value } = ValidationSchemas.pagination.validate(data);
        
        expect(value.page).toBe(1);
        expect(value.limit).toBe(20);
        expect(value.offset).toBe(0);
      });
      
      it('should reject page less than 1', () => {
        const data = { page: 0 };
        
        const { error } = ValidationSchemas.pagination.validate(data);
        
        expect(error).toBeDefined();
      });
      
      it('should reject limit greater than 100', () => {
        const data = { limit: 150 };
        
        const { error } = ValidationSchemas.pagination.validate(data);
        
        expect(error).toBeDefined();
      });
    });
    
    describe('otpVerification', () => {
      it('should validate valid OTP verification', () => {
        const validData = {
          inviteCode: 'INVITE-12345678-1234-1234-1234-123456789012',
          otpCode: '123456'
        };
        
        const { error } = ValidationSchemas.otpVerification.validate(validData);
        
        expect(error).toBeUndefined();
      });
      
      it('should reject invalid OTP format', () => {
        const invalidData = {
          inviteCode: 'INVITE-12345678-1234-1234-1234-123456789012',
          otpCode: '12345' // 5 digits
        };
        
        const { error } = ValidationSchemas.otpVerification.validate(invalidData);
        
        expect(error).toBeDefined();
      });
    });
  });
  
  describe('SanitizeUtil', () => {
    describe('html', () => {
      it('should remove script tags', () => {
        const input = '<script>alert("xss")</script>Hello';
        const result = SanitizeUtil.html(input);
        
        expect(result).not.toContain('<script>');
        expect(result).toContain('Hello');
      });
      
      it('should remove iframe tags', () => {
        const input = '<iframe src="malicious.com"></iframe>Content';
        const result = SanitizeUtil.html(input);
        
        expect(result).not.toContain('<iframe');
        expect(result).toContain('Content');
      });
      
      it('should remove javascript: protocol', () => {
        const input = 'javascript:alert("xss")';
        const result = SanitizeUtil.html(input);
        
        expect(result).not.toContain('javascript:');
      });
      
      it('should remove event handlers', () => {
        const input = '<div onclick="alert()">text</div>';
        const result = SanitizeUtil.html(input);
        
        expect(result).not.toContain('onclick');
      });
      
      it('should return non-string input unchanged', () => {
        expect(SanitizeUtil.html(123)).toBe(123);
        expect(SanitizeUtil.html(null)).toBe(null);
      });
    });
    
    describe('sql', () => {
      it('should remove SQL injection characters', () => {
        const input = "'; DROP TABLE users;--";
        const result = SanitizeUtil.sql(input);
        
        expect(result).not.toContain("'");
        expect(result).not.toContain(';');
      });
      
      it('should remove double quotes', () => {
        const input = '"; DELETE FROM users;';
        const result = SanitizeUtil.sql(input);
        
        expect(result).not.toContain('"');
      });
      
      it('should return non-string input unchanged', () => {
        expect(SanitizeUtil.sql(123)).toBe(123);
      });
    });
    
    describe('xss', () => {
      it('should remove angle brackets', () => {
        const input = '<script>alert()</script>';
        const result = SanitizeUtil.xss(input);
        
        expect(result).not.toContain('<');
        expect(result).not.toContain('>');
      });
      
      it('should remove quotes', () => {
        const input = '"test" \'value\'';
        const result = SanitizeUtil.xss(input);
        
        expect(result).not.toContain('"');
        expect(result).not.toContain("'");
      });
      
      it('should trim whitespace', () => {
        const input = '  hello world  ';
        const result = SanitizeUtil.xss(input);
        
        expect(result).toBe('hello world');
      });
    });
    
    describe('phone', () => {
      it('should keep only digits and plus sign', () => {
        const input = '+1 (234) 567-8900';
        const result = SanitizeUtil.phone(input);
        
        expect(result).toBe('+12345678900');
      });
      
      it('should handle international format', () => {
        const input = '+254 712 345 678';
        const result = SanitizeUtil.phone(input);
        
        expect(result).toBe('+254712345678');
      });
    });
    
    describe('userInput', () => {
      it('should apply both html and xss sanitization', () => {
        const input = '<script>alert("xss")</script>';
        const result = SanitizeUtil.userInput(input);
        
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('"');
      });
    });
  });
  
  describe('CustomValidators', () => {
    describe('isStrongPassword', () => {
      it('should validate strong password', () => {
        const result = CustomValidators.isStrongPassword('Test@1234');
        
        expect(result.isValid).toBe(true);
        expect(result.score).toBe(5);
      });
      
      it('should reject weak password', () => {
        const result = CustomValidators.isStrongPassword('weak');
        
        expect(result.isValid).toBe(false);
        expect(result.requirements.minLength).toBe(false);
      });
      
      it('should check uppercase requirement', () => {
        const result = CustomValidators.isStrongPassword('test@1234');
        
        expect(result.requirements.hasUpperCase).toBe(false);
      });
      
      it('should check lowercase requirement', () => {
        const result = CustomValidators.isStrongPassword('TEST@1234');
        
        expect(result.requirements.hasLowerCase).toBe(false);
      });
      
      it('should check number requirement', () => {
        const result = CustomValidators.isStrongPassword('Test@abcd');
        
        expect(result.requirements.hasNumbers).toBe(false);
      });
      
      it('should check special character requirement', () => {
        const result = CustomValidators.isStrongPassword('Test1234');
        
        expect(result.requirements.hasSpecialChar).toBe(false);
      });
    });
    
    describe('isAllowedEmailDomain', () => {
      it('should return true when no domains specified', () => {
        expect(CustomValidators.isAllowedEmailDomain('test@any.com')).toBe(true);
      });
      
      it('should return true for allowed domain', () => {
        const result = CustomValidators.isAllowedEmailDomain(
          'test@company.com',
          ['company.com', 'example.com']
        );
        
        expect(result).toBe(true);
      });
      
      it('should return false for disallowed domain', () => {
        const result = CustomValidators.isAllowedEmailDomain(
          'test@gmail.com',
          ['company.com']
        );
        
        expect(result).toBe(false);
      });
    });
    
    describe('isValidInviteCode', () => {
      it('should validate correct invite code format', () => {
        expect(CustomValidators.isValidInviteCode('INVITE-12345678-1234-1234-1234-123456789012')).toBe(true);
      });
      
      it('should reject invalid invite code format', () => {
        expect(CustomValidators.isValidInviteCode('INVALID-CODE')).toBe(false);
        expect(CustomValidators.isValidInviteCode('123456')).toBe(false);
      });
    });
  });
  
  describe('validateRequest', () => {
    it('should return a middleware function', () => {
      const middleware = validateRequest(ValidationSchemas.userLogin);
      expect(typeof middleware).toBe('function');
    });
    
    it('should call next on valid data', () => {
      const middleware = validateRequest(ValidationSchemas.userLogin);
      const mockReq = {
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'Test@1234'
        }
      };
      const mockRes = {};
      const mockNext = jest.fn();
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should throw on invalid data', () => {
      const middleware = validateRequest(ValidationSchemas.userLogin);
      const mockReq = {
        method: 'POST',
        body: {
          email: 'invalid-email',
          password: 'Test@1234'
        }
      };
      const mockRes = {};
      const mockNext = jest.fn();
      
      expect(() => {
        middleware(mockReq, mockRes, mockNext);
      }).toThrow();
    });
    
    it('should handle GET requests with pagination schema', () => {
      const middleware = validateRequest(ValidationSchemas.pagination);
      const mockReq = {
        method: 'GET',
        query: { page: '2', limit: '10' }
      };
      const mockRes = {};
      const mockNext = jest.fn();
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.query.page).toBe(2);
      expect(mockReq.query.limit).toBe(10);
    });
  });
  
  describe('Default Export', () => {
    it('should export all components', () => {
      expect(validationModule.default.ValidationSchemas).toBeDefined();
      expect(validationModule.default.validateRequest).toBeDefined();
      expect(validationModule.default.SanitizeUtil).toBeDefined();
      expect(validationModule.default.CustomValidators).toBeDefined();
    });
  });
});
