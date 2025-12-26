/**
 * Token Helper Unit Tests
 * Tests for core utility functions: event bus, metrics, logging, PII masking
 * Priority: P1 - Core utility functions
 */

import {
  visitorEventBus,
  metrics,
  log,
  maskPII,
  generateOTP,
  validateOTPFormat,
  generateSecureToken
} from '../../src/utils/tokenHelper.js';

describe('tokenHelper', () => {
  
  describe('VisitorEventBus', () => {
    beforeEach(() => {
      visitorEventBus.removeAllListeners();
    });

    afterEach(() => {
      visitorEventBus.removeAllListeners();
    });

    describe('emitVisitorEvent', () => {
      it('should emit events with timestamp', (done) => {
        const eventType = 'visitor.checkin';
        const data = { visitorId: '123', gateId: 'gate-1' };

        visitorEventBus.on(eventType, (eventData) => {
          expect(eventData).toHaveProperty('timestamp');
          expect(eventData.visitorId).toBe('123');
          expect(eventData.gateId).toBe('gate-1');
          done();
        });

        visitorEventBus.emitVisitorEvent(eventType, data);
      });

      it('should include ISO timestamp format', (done) => {
        const eventType = 'visitor.checkout';

        visitorEventBus.on(eventType, (eventData) => {
          expect(new Date(eventData.timestamp).toISOString()).toBe(eventData.timestamp);
          done();
        });

        visitorEventBus.emitVisitorEvent(eventType, {});
      });

      it('should handle multiple listeners', () => {
        let listenerCount = 0;
        const eventType = 'visitor.created';

        visitorEventBus.on(eventType, () => listenerCount++);
        visitorEventBus.on(eventType, () => listenerCount++);

        visitorEventBus.emitVisitorEvent(eventType, {});

        expect(listenerCount).toBe(2);
      });
    });

    describe('max listeners', () => {
      it('should have max listeners set to 50', () => {
        expect(visitorEventBus.getMaxListeners()).toBe(50);
      });
    });
  });

  describe('MetricsTracker', () => {
    beforeEach(() => {
      metrics.reset();
    });

    describe('increment', () => {
      it('should increment counter by default value of 1', () => {
        const result = metrics.increment('otpSent');
        expect(result).toBe(1);
      });

      it('should increment counter by specified value', () => {
        const result = metrics.increment('checkIns', 5);
        expect(result).toBe(5);
      });

      it('should accumulate counter values', () => {
        metrics.increment('otpVerified');
        metrics.increment('otpVerified');
        const result = metrics.increment('otpVerified');
        expect(result).toBe(3);
      });

      it('should handle new counter names', () => {
        const result = metrics.increment('customCounter');
        expect(result).toBe(1);
      });

      it('should accept labels parameter', () => {
        const result = metrics.increment('checkIns', 1, { gate: 'main' });
        expect(result).toBe(1);
      });
    });

    describe('decrement', () => {
      it('should decrement counter by default value of 1', () => {
        metrics.increment('checkOuts', 5);
        const result = metrics.decrement('checkOuts');
        expect(result).toBe(4);
      });

      it('should decrement counter by specified value', () => {
        metrics.increment('visitorInvites', 10);
        const result = metrics.decrement('visitorInvites', 3);
        expect(result).toBe(7);
      });

      it('should allow negative values', () => {
        const result = metrics.decrement('otpFailed');
        expect(result).toBe(-1);
      });

      it('should handle new counter names', () => {
        const result = metrics.decrement('newCounter');
        expect(result).toBe(-1);
      });
    });

    describe('gauge', () => {
      it('should set gauge value', () => {
        const result = metrics.gauge('activeVisitors', 50);
        expect(result).toBe(50);
      });

      it('should update gauge value', () => {
        metrics.gauge('activeVisitors', 50);
        const result = metrics.gauge('activeVisitors', 75);
        expect(result).toBe(75);
      });

      it('should store gauge with labels and timestamp', () => {
        metrics.gauge('activeVisitors', 100, { gate: 'main' });
        const allMetrics = metrics.getMetrics();
        expect(allMetrics.gauges.activeVisitors).toHaveProperty('value', 100);
        expect(allMetrics.gauges.activeVisitors).toHaveProperty('timestamp');
      });
    });

    describe('histogram', () => {
      it('should record histogram value', () => {
        const result = metrics.histogram('responseTime', 150);
        expect(result).toBe(150);
      });

      it('should accumulate histogram values', () => {
        metrics.histogram('responseTime', 100);
        metrics.histogram('responseTime', 200);
        metrics.histogram('responseTime', 300);
        
        const allMetrics = metrics.getMetrics();
        expect(allMetrics.histograms.responseTime).toBe(3);
      });

      it('should limit histogram to 1000 entries', () => {
        // Add 1005 entries
        for (let i = 0; i < 1005; i++) {
          metrics.histogram('highVolume', i);
        }
        
        const allMetrics = metrics.getMetrics();
        expect(allMetrics.histograms.highVolume).toBe(1000);
      });
    });

    describe('getMetrics', () => {
      it('should return all metrics', () => {
        metrics.increment('otpSent', 5);
        metrics.gauge('activeConnections', 10);
        metrics.histogram('latency', 100);

        const allMetrics = metrics.getMetrics();
        
        expect(allMetrics.counters.otpSent).toBe(5);
        expect(allMetrics.gauges.activeConnections.value).toBe(10);
        expect(allMetrics.histograms.latency).toBe(1);
      });

      it('should return default counters', () => {
        const allMetrics = metrics.getMetrics();
        
        expect(allMetrics.counters).toHaveProperty('otpSent');
        expect(allMetrics.counters).toHaveProperty('otpVerified');
        expect(allMetrics.counters).toHaveProperty('checkIns');
        expect(allMetrics.counters).toHaveProperty('authFailures');
      });
    });

    describe('reset', () => {
      it('should reset all counters to 0', () => {
        metrics.increment('otpSent', 100);
        metrics.reset();
        
        const allMetrics = metrics.getMetrics();
        expect(allMetrics.counters.otpSent).toBe(0);
      });

      it('should clear gauges', () => {
        metrics.gauge('test', 50);
        metrics.reset();
        
        const allMetrics = metrics.getMetrics();
        expect(allMetrics.gauges).toEqual({});
      });

      it('should clear histograms', () => {
        metrics.histogram('test', 100);
        metrics.reset();
        
        const allMetrics = metrics.getMetrics();
        expect(allMetrics.histograms).toEqual({});
      });
    });
  });

  describe('log', () => {
    let originalEnv;
    let consoleSpy;

    beforeEach(() => {
      originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should return log entry with timestamp', () => {
      const result = log('info', 'Test message');
      
      expect(result).toHaveProperty('timestamp');
      expect(result.level).toBe('info');
      expect(result.message).toBe('Test message');
    });

    it('should include metadata in log entry', () => {
      const meta = { userId: '123', action: 'login' };
      const result = log('info', 'User action', meta);
      
      expect(result.userId).toBe('123');
      expect(result.action).toBe('login');
    });

    it('should handle all log levels', () => {
      const levels = ['error', 'warn', 'info', 'debug'];
      
      levels.forEach(level => {
        const result = log(level, `${level} message`);
        expect(result.level).toBe(level);
      });
    });

    it('should handle unknown log level', () => {
      const result = log('custom', 'Custom level message');
      expect(result.level).toBe('custom');
    });
  });

  describe('maskPII', () => {
    describe('email', () => {
      it('should mask email correctly', () => {
        const result = maskPII.email('john.doe@example.com');
        expect(result).toBe('j******e@example.com');
      });

      it('should handle short local part', () => {
        const result = maskPII.email('ab@test.com');
        expect(result).toBe('***@test.com');
      });

      it('should return *** for null email', () => {
        expect(maskPII.email(null)).toBe('***');
      });

      it('should return *** for undefined email', () => {
        expect(maskPII.email(undefined)).toBe('***');
      });

      it('should return *** for non-string email', () => {
        expect(maskPII.email(12345)).toBe('***');
      });

      it('should return ***@*** for email without @', () => {
        expect(maskPII.email('notanemail')).toBe('***@***');
      });
    });

    describe('phone', () => {
      it('should mask phone number keeping last 4 digits', () => {
        const result = maskPII.phone('+254712345678');
        // +254712345678 -> cleaned: 254712345678 (12 digits) -> 8 asterisks + 5678
        expect(result).toBe('********5678');
      });

      it('should handle phone with spaces and dashes', () => {
        const result = maskPII.phone('+1 (555) 123-4567');
        expect(result).toMatch(/\*+4567$/);
      });

      it('should return *** for null phone', () => {
        expect(maskPII.phone(null)).toBe('***');
      });

      it('should return *** for undefined phone', () => {
        expect(maskPII.phone(undefined)).toBe('***');
      });

      it('should return *** for non-string phone', () => {
        expect(maskPII.phone(12345)).toBe('***');
      });

      it('should return *** for short phone numbers', () => {
        expect(maskPII.phone('123')).toBe('***');
      });
    });

    describe('name', () => {
      it('should mask name keeping first and last character', () => {
        const result = maskPII.name('John');
        expect(result).toBe('J**n');
      });

      it('should mask longer names', () => {
        const result = maskPII.name('Alexander');
        expect(result).toBe('A*******r');
      });

      it('should return *** for null name', () => {
        expect(maskPII.name(null)).toBe('***');
      });

      it('should return *** for undefined name', () => {
        expect(maskPII.name(undefined)).toBe('***');
      });

      it('should return *** for non-string name', () => {
        expect(maskPII.name(123)).toBe('***');
      });

      it('should return *** for short names', () => {
        expect(maskPII.name('AB')).toBe('***');
        expect(maskPII.name('A')).toBe('***');
      });
    });

    describe('idNumber', () => {
      it('should mask ID keeping last 4 characters', () => {
        const result = maskPII.idNumber('12345678');
        expect(result).toBe('****5678');
      });

      it('should handle alphanumeric IDs', () => {
        const result = maskPII.idNumber('ABC12345678');
        expect(result).toBe('*******5678');
      });

      it('should return *** for null ID', () => {
        expect(maskPII.idNumber(null)).toBe('***');
      });

      it('should return *** for undefined ID', () => {
        expect(maskPII.idNumber(undefined)).toBe('***');
      });

      it('should return *** for non-string ID', () => {
        expect(maskPII.idNumber(12345)).toBe('***');
      });

      it('should return *** for short IDs', () => {
        expect(maskPII.idNumber('123')).toBe('***');
      });
    });
  });

  describe('generateOTP', () => {
    it('should generate 6-digit OTP by default', () => {
      const otp = generateOTP();
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    it('should generate OTP of specified length', () => {
      const otp4 = generateOTP(4);
      const otp8 = generateOTP(8);
      
      expect(otp4).toHaveLength(4);
      expect(otp8).toHaveLength(8);
    });

    it('should only contain digits', () => {
      for (let i = 0; i < 100; i++) {
        const otp = generateOTP();
        expect(/^\d+$/.test(otp)).toBe(true);
      }
    });

    it('should generate different OTPs (probabilistic)', () => {
      const otps = new Set();
      for (let i = 0; i < 100; i++) {
        otps.add(generateOTP());
      }
      // High probability of getting many unique values
      expect(otps.size).toBeGreaterThan(90);
    });
  });

  describe('validateOTPFormat', () => {
    it('should validate 4-digit OTP', () => {
      expect(validateOTPFormat('1234')).toBe(true);
    });

    it('should validate 6-digit OTP', () => {
      expect(validateOTPFormat('123456')).toBe(true);
    });

    it('should validate 8-digit OTP', () => {
      expect(validateOTPFormat('12345678')).toBe(true);
    });

    it('should reject 3-digit OTP', () => {
      expect(validateOTPFormat('123')).toBe(false);
    });

    it('should reject 9-digit OTP', () => {
      expect(validateOTPFormat('123456789')).toBe(false);
    });

    it('should reject OTP with letters', () => {
      expect(validateOTPFormat('12a456')).toBe(false);
    });

    it('should reject OTP with special characters', () => {
      expect(validateOTPFormat('123-56')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validateOTPFormat('')).toBe(false);
    });

    it('should reject null', () => {
      expect(validateOTPFormat(null)).toBe(false);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate 32-character token by default', () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(32);
    });

    it('should generate token of specified length', () => {
      const token16 = generateSecureToken(16);
      const token64 = generateSecureToken(64);
      
      expect(token16).toHaveLength(16);
      expect(token64).toHaveLength(64);
    });

    it('should only contain alphanumeric characters', () => {
      for (let i = 0; i < 50; i++) {
        const token = generateSecureToken();
        expect(/^[A-Za-z0-9]+$/.test(token)).toBe(true);
      }
    });

    it('should generate unique tokens (probabilistic)', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken());
      }
      expect(tokens.size).toBe(100);
    });

    it('should include both upper and lowercase letters (probabilistic)', () => {
      let hasUpper = false;
      let hasLower = false;
      let hasDigit = false;
      
      for (let i = 0; i < 100; i++) {
        const token = generateSecureToken();
        if (/[A-Z]/.test(token)) hasUpper = true;
        if (/[a-z]/.test(token)) hasLower = true;
        if (/[0-9]/.test(token)) hasDigit = true;
      }
      
      expect(hasUpper).toBe(true);
      expect(hasLower).toBe(true);
      expect(hasDigit).toBe(true);
    });
  });
});
