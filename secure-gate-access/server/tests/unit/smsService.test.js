/**
 * Unit Tests for SMS Service
 * 
 * Tests cover:
 * - Service initialization
 * - Sending OTP via SMS
 * - Generic send method
 * - Error handling
 * - Stub mode behavior
 */

import { jest } from '@jest/globals';

describe('SMSService', () => {
  let SMSService;
  let consoleLogSpy;

  beforeEach(async () => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Reset module cache for fresh import
    jest.resetModules();
    
    const module = await import('../../src/services/smsService.js');
    SMSService = module.default;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('sendOTP', () => {
    it('should return success in stub mode', async () => {
      const result = await SMSService.sendOTP('+254712345678', '123456');
      
      expect(result.success).toBe(true);
    });

    it('should log the OTP being sent (stub mode)', async () => {
      await SMSService.sendOTP('+254712345678', '123456');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[SMS STUB] Would send OTP 123456 to +254712345678'
      );
    });

    it('should handle various phone number formats', async () => {
      const phoneNumbers = [
        '+254712345678',   // Kenya format
        '+1234567890',     // US format
        '0712345678',      // Local Kenya
        '254712345678'     // Without + prefix
      ];

      for (const phone of phoneNumbers) {
        const result = await SMSService.sendOTP(phone, '000000');
        expect(result.success).toBe(true);
      }
    });

    it('should handle various OTP formats', async () => {
      const otps = ['123456', '000000', '999999', '1234'];
      
      for (const otp of otps) {
        const result = await SMSService.sendOTP('+254712345678', otp);
        expect(result.success).toBe(true);
      }
    });

    it('should handle empty phone number gracefully', async () => {
      const result = await SMSService.sendOTP('', '123456');
      expect(result.success).toBe(true);
    });

    it('should handle null parameters gracefully', async () => {
      // Service should handle undefined without crashing
      const result = await SMSService.sendOTP(undefined, undefined);
      expect(result.success).toBe(true);
    });
  });

  describe('send', () => {
    it('should return success in stub mode', async () => {
      const result = await SMSService.send('+254712345678', 'Test message');
      
      expect(result.success).toBe(true);
    });

    it('should log the message being sent (stub mode)', async () => {
      await SMSService.send('+254712345678', 'Hello, this is a test');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[SMS STUB] Would send SMS to +254712345678: Hello, this is a test'
      );
    });

    it('should handle long messages', async () => {
      const longMessage = 'A'.repeat(1000);
      const result = await SMSService.send('+254712345678', longMessage);
      
      expect(result.success).toBe(true);
    });

    it('should handle special characters in message', async () => {
      const specialMessage = 'Test with émojis 🎉 and special chars: <>&';
      const result = await SMSService.send('+254712345678', specialMessage);
      
      expect(result.success).toBe(true);
    });

    it('should handle unicode messages', async () => {
      const unicodeMessage = 'مرحبا بالعالم'; // Arabic "Hello World"
      const result = await SMSService.send('+254712345678', unicodeMessage);
      
      expect(result.success).toBe(true);
    });

    it('should handle empty message gracefully', async () => {
      const result = await SMSService.send('+254712345678', '');
      expect(result.success).toBe(true);
    });
  });

  describe('Service Structure', () => {
    it('should be a singleton instance', async () => {
      const module1 = await import('../../src/services/smsService.js');
      const module2 = await import('../../src/services/smsService.js');
      
      expect(module1.default).toBe(module2.default);
    });

    it('should have sendOTP method', () => {
      expect(typeof SMSService.sendOTP).toBe('function');
    });

    it('should have send method', () => {
      expect(typeof SMSService.send).toBe('function');
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent send calls', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(SMSService.send(`+25471234567${i}`, `Message ${i}`));
      }
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle rapid sequential calls', async () => {
      for (let i = 0; i < 5; i++) {
        const result = await SMSService.send('+254712345678', `Message ${i}`);
        expect(result.success).toBe(true);
      }
    });

    it('should maintain consistent response structure', async () => {
      const otpResult = await SMSService.sendOTP('+254712345678', '123456');
      const sendResult = await SMSService.send('+254712345678', 'Test');
      
      expect(otpResult).toHaveProperty('success');
      expect(sendResult).toHaveProperty('success');
    });
  });
});
