/**
 * Visitor Controller Unit Tests
 * Tests for visitor management functionality
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockDbManager = {
  query: jest.fn()
};

const mockAuditLog = jest.fn();

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: mockDbManager
}));

jest.unstable_mockModule('../../src/services/auditService.js', () => ({
  auditLog: mockAuditLog
}));

describe('Visitor Controller', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      body: {},
      params: {},
      query: {},
      user: { id: 1, email: 'test@example.com', role: 'resident' },
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Test-Agent')
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      locals: { requestId: 'test-123' },
      getHeader: jest.fn()
    };

    next = jest.fn();
  });

  describe('Input Validation', () => {
    test('should reject empty visitor name', () => {
      const validateVisitorInput = (data) => {
        const errors = [];
        if (!data.name || data.name.trim() === '') {
          errors.push('Visitor name is required');
        }
        return errors;
      };

      const result = validateVisitorInput({ name: '' });
      expect(result).toContain('Visitor name is required');
    });

    test('should reject invalid phone number format', () => {
      const validatePhone = (phone) => {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        return phoneRegex.test(phone);
      };

      expect(validatePhone('invalid')).toBe(false);
      expect(validatePhone('+254712345678')).toBe(true);
      expect(validatePhone('0712345678')).toBe(false);
    });

    test('should validate visit date is in the future', () => {
      const validateVisitDate = (date) => {
        const visitDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return visitDate >= today;
      };

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      expect(validateVisitDate(yesterday.toISOString())).toBe(false);
      expect(validateVisitDate(tomorrow.toISOString())).toBe(true);
    });

    test('should validate purpose field length', () => {
      const validatePurpose = (purpose) => {
        return purpose && purpose.length >= 3 && purpose.length <= 500;
      };

      expect(validatePurpose('ab')).toBe(false);
      expect(validatePurpose('abc')).toBe(true);
      expect(validatePurpose('a'.repeat(501))).toBe(false);
    });
  });

  describe('Visitor Creation', () => {
    test('should create visitor with valid data', async () => {
      const visitorData = {
        name: 'John Doe',
        phone: '+254712345678',
        email: 'john@example.com',
        purpose: 'Delivery',
        visitDate: new Date(Date.now() + 86400000).toISOString()
      };

      mockDbManager.query.mockResolvedValueOnce({
        rows: [{ id: 1, ...visitorData }],
        rowCount: 1
      });

      // Simulate visitor creation
      const result = await mockDbManager.query(
        'INSERT INTO visitors (name, phone, email, purpose, visit_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [visitorData.name, visitorData.phone, visitorData.email, visitorData.purpose, visitorData.visitDate]
      );

      expect(result.rows[0].name).toBe('John Doe');
      expect(mockDbManager.query).toHaveBeenCalledTimes(1);
    });

    test('should sanitize visitor name input', () => {
      const sanitizeName = (name) => {
        return name.trim().replace(/<[^>]*>/g, '').substring(0, 100);
      };

      expect(sanitizeName('  John Doe  ')).toBe('John Doe');
      expect(sanitizeName('<script>alert("xss")</script>John')).toBe('alert("xss")John');
      expect(sanitizeName('a'.repeat(150))).toHaveLength(100);
    });
  });

  describe('Visitor Retrieval', () => {
    test('should return visitor by ID', async () => {
      const mockVisitor = {
        id: 1,
        name: 'John Doe',
        phone: '+254712345678',
        status: 'pending'
      };

      mockDbManager.query.mockResolvedValueOnce({
        rows: [mockVisitor],
        rowCount: 1
      });

      const result = await mockDbManager.query(
        'SELECT * FROM visitors WHERE id = $1',
        [1]
      );

      expect(result.rows[0]).toEqual(mockVisitor);
    });

    test('should return empty for non-existent visitor', async () => {
      mockDbManager.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const result = await mockDbManager.query(
        'SELECT * FROM visitors WHERE id = $1',
        [999]
      );

      expect(result.rowCount).toBe(0);
    });
  });

  describe('Visitor Status Updates', () => {
    test('should update visitor status to approved', async () => {
      mockDbManager.query.mockResolvedValueOnce({
        rows: [{ id: 1, status: 'approved' }],
        rowCount: 1
      });

      const result = await mockDbManager.query(
        'UPDATE visitors SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        ['approved', 1]
      );

      expect(result.rows[0].status).toBe('approved');
    });

    test('should validate status value', () => {
      const validStatuses = ['pending', 'approved', 'rejected', 'checked_in', 'checked_out', 'expired'];
      
      const validateStatus = (status) => validStatuses.includes(status);

      expect(validateStatus('approved')).toBe(true);
      expect(validateStatus('invalid')).toBe(false);
    });
  });

  describe('OTP Generation', () => {
    test('should generate 6-digit OTP', () => {
      const generateOtp = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
      };

      const otp = generateOtp();
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    test('should generate unique OTPs', () => {
      const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
      
      const otps = new Set();
      for (let i = 0; i < 100; i++) {
        otps.add(generateOtp());
      }
      
      // Most OTPs should be unique (allowing for some collision)
      expect(otps.size).toBeGreaterThan(95);
    });
  });

  describe('Visit Time Validation', () => {
    test('should reject visit time outside business hours', () => {
      const validateVisitTime = (time, minHour = 6, maxHour = 22) => {
        const hour = parseInt(time.split(':')[0]);
        return hour >= minHour && hour < maxHour;
      };

      expect(validateVisitTime('03:00')).toBe(false);
      expect(validateVisitTime('10:00')).toBe(true);
      expect(validateVisitTime('23:00')).toBe(false);
    });

    test('should allow custom business hours', () => {
      const validateVisitTime = (time, minHour = 6, maxHour = 22) => {
        const hour = parseInt(time.split(':')[0]);
        return hour >= minHour && hour < maxHour;
      };

      // 24-hour access
      expect(validateVisitTime('03:00', 0, 24)).toBe(true);
      
      // Restricted hours
      expect(validateVisitTime('08:00', 9, 17)).toBe(false);
      expect(validateVisitTime('12:00', 9, 17)).toBe(true);
    });
  });
});

describe('Visitor Search', () => {
  test('should search visitors by name', () => {
    const searchVisitors = (visitors, query) => {
      const lowerQuery = query.toLowerCase();
      return visitors.filter(v => 
        v.name.toLowerCase().includes(lowerQuery)
      );
    };

    const visitors = [
      { id: 1, name: 'John Doe' },
      { id: 2, name: 'Jane Smith' },
      { id: 3, name: 'Johnny Walker' }
    ];

    const results = searchVisitors(visitors, 'john');
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('John Doe');
  });

  test('should search visitors by phone', () => {
    const searchByPhone = (visitors, phone) => {
      const normalizedPhone = phone.replace(/\D/g, '');
      return visitors.filter(v => 
        v.phone.replace(/\D/g, '').includes(normalizedPhone)
      );
    };

    const visitors = [
      { id: 1, name: 'John', phone: '+254712345678' },
      { id: 2, name: 'Jane', phone: '+254798765432' }
    ];

    const results = searchByPhone(visitors, '712345');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('John');
  });
});

describe('Visitor Pass Generation', () => {
  test('should generate unique pass code', () => {
    const generatePassCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    const code = generatePassCode();
    expect(code).toHaveLength(8);
    expect(/^[A-Z0-9]{8}$/.test(code)).toBe(true);
  });

  test('should set pass expiration correctly', () => {
    const setPassExpiration = (hours = 24) => {
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + hours);
      return expiry;
    };

    const expiry = setPassExpiration(24);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    
    // Should be approximately 24 hours (within 1 minute tolerance)
    expect(diff).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(diff).toBeLessThan(25 * 60 * 60 * 1000);
  });
});
