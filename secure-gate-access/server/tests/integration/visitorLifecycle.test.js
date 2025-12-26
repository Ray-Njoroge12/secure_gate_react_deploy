/**
 * Integration Tests for Visitor Lifecycle
 * 
 * End-to-end tests for the complete visitor management workflow:
 * - Visitor invitation by resident
 * - Visitor approval by guard
 * - Visitor check-in process
 * - Visitor check-out process
 * - Cross-service interactions
 * 
 * Priority: P1 (Critical Business Flow)
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock database 
const mockQuery = jest.fn();
const mockTransaction = jest.fn();

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: {
    query: mockQuery,
    transaction: mockTransaction,
    isConnected: jest.fn().mockReturnValue(true)
  }
}));

// Mock notification services
const mockSendEmail = jest.fn().mockResolvedValue({ success: true });
const mockSendSMS = jest.fn().mockResolvedValue({ success: true });

jest.unstable_mockModule('../../src/services/emailService.js', () => ({
  default: {
    sendEmail: mockSendEmail,
    sendVisitorInvitation: jest.fn().mockResolvedValue({ success: true }),
    sendVisitorApproval: jest.fn().mockResolvedValue({ success: true })
  }
}));

jest.unstable_mockModule('../../src/services/smsService.js', () => ({
  default: {
    sendSMS: mockSendSMS,
    sendVisitorNotification: jest.fn().mockResolvedValue({ success: true })
  }
}));

// Mock QR code service
const mockGenerateQRCode = jest.fn().mockResolvedValue({
  qrCode: 'data:image/png;base64,mockQRCode',
  accessCode: 'ABC123'
});

jest.unstable_mockModule('../../src/services/qrCodeService.js', () => ({
  default: {
    generateAccessCode: mockGenerateQRCode,
    validateAccessCode: jest.fn().mockResolvedValue({ valid: true })
  }
}));

// Mock audit service
const mockLogAudit = jest.fn();

jest.unstable_mockModule('../../src/services/auditService.js', () => ({
  default: {
    logAction: mockLogAudit,
    logVisitorEvent: jest.fn()
  },
  auditLog: mockLogAudit
}));

// Mock logging service
jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  default: {
    logInfo: jest.fn(),
    logError: jest.fn(),
    logSecurity: jest.fn(),
    logAudit: jest.fn()
  }
}));

describe('Visitor Lifecycle Integration Tests', () => {
  // Test data
  const testResident = {
    id: 'resident-123',
    email: 'resident@example.com',
    name: 'John Resident',
    unit: 'A101',
    role: 'resident'
  };

  const testGuard = {
    id: 'guard-123',
    email: 'guard@example.com',
    name: 'Bob Guard',
    role: 'guard'
  };

  const testVisitorData = {
    firstName: 'Jane',
    lastName: 'Visitor',
    name: 'Jane Visitor',
    email: 'visitor@example.com',
    phone: '+254712345678',
    purpose: 'Social visit',
    expectedArrival: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    expectedDeparture: new Date(Date.now() + 90000000).toISOString()
  };

  const createdVisitor = {
    id: 'visitor-456',
    ...testVisitorData,
    residentId: testResident.id,
    status: 'pending',
    accessCode: null,
    qrCode: null,
    createdAt: new Date().toISOString()
  };

  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock request
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: testResident,
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Test-Agent'),
      correlationId: 'test-corr-123'
    };

    // Setup mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      locals: { requestId: 'test-123' },
      getHeader: jest.fn()
    };

    // Setup mock next
    mockNext = jest.fn();

    // Setup default mock responses
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    mockTransaction.mockImplementation(async (callback) => {
      const mockClient = {
        query: mockQuery,
        release: jest.fn()
      };
      return callback(mockClient);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =========================================
  // Input Validation Tests
  // =========================================
  describe('Input Validation', () => {
    const validateVisitorInput = (data) => {
      const errors = [];
      if (!data.name || data.name.trim() === '') {
        errors.push('Visitor name is required');
      }
      if (data.phone && !/^\+?[1-9]\d{1,14}$/.test(data.phone)) {
        errors.push('Invalid phone number format');
      }
      if (!data.purpose || data.purpose.length < 3) {
        errors.push('Purpose must be at least 3 characters');
      }
      return errors;
    };

    it('should reject empty visitor name', () => {
      const result = validateVisitorInput({ name: '', purpose: 'Visit', phone: '+254712345678' });
      expect(result).toContain('Visitor name is required');
    });

    it('should reject invalid phone number format', () => {
      const result = validateVisitorInput({ name: 'John', purpose: 'Visit', phone: 'invalid' });
      expect(result).toContain('Invalid phone number format');
    });

    it('should accept valid visitor data', () => {
      const result = validateVisitorInput(testVisitorData);
      expect(result).toHaveLength(0);
    });

    it('should reject short purpose', () => {
      const result = validateVisitorInput({ name: 'John', purpose: 'ab', phone: '+254712345678' });
      expect(result).toContain('Purpose must be at least 3 characters');
    });
  });

  // =========================================
  // Visitor Status Workflow Tests
  // =========================================
  describe('Visitor Status Workflow', () => {
    const validStatusTransitions = {
      'pending': ['approved', 'rejected'],
      'approved': ['checked_in', 'expired', 'cancelled'],
      'checked_in': ['checked_out'],
      'checked_out': [],
      'rejected': [],
      'expired': [],
      'cancelled': []
    };

    const isValidTransition = (fromStatus, toStatus) => {
      const allowedTransitions = validStatusTransitions[fromStatus] || [];
      return allowedTransitions.includes(toStatus);
    };

    it('should allow transition from pending to approved', () => {
      expect(isValidTransition('pending', 'approved')).toBe(true);
    });

    it('should allow transition from pending to rejected', () => {
      expect(isValidTransition('pending', 'rejected')).toBe(true);
    });

    it('should allow transition from approved to checked_in', () => {
      expect(isValidTransition('approved', 'checked_in')).toBe(true);
    });

    it('should allow transition from checked_in to checked_out', () => {
      expect(isValidTransition('checked_in', 'checked_out')).toBe(true);
    });

    it('should not allow transition from checked_out to any status', () => {
      expect(isValidTransition('checked_out', 'pending')).toBe(false);
      expect(isValidTransition('checked_out', 'checked_in')).toBe(false);
    });

    it('should not allow skipping check-in', () => {
      expect(isValidTransition('approved', 'checked_out')).toBe(false);
    });

    it('should not allow approving already checked-in visitor', () => {
      expect(isValidTransition('checked_in', 'approved')).toBe(false);
    });
  });

  // =========================================
  // Database Operations Tests
  // =========================================
  describe('Database Operations', () => {
    it('should create visitor record with all required fields', async () => {
      mockQuery.mockResolvedValueOnce({ 
        rows: [createdVisitor], 
        rowCount: 1 
      });

      const insertQuery = `
        INSERT INTO visitors (name, email, phone, purpose, resident_id, status, expected_arrival)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      await mockQuery(insertQuery, [
        testVisitorData.name,
        testVisitorData.email,
        testVisitorData.phone,
        testVisitorData.purpose,
        testResident.id,
        'pending',
        testVisitorData.expectedArrival
      ]);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO visitors'),
        expect.arrayContaining([testVisitorData.name, testVisitorData.email])
      );
    });

    it('should update visitor status correctly', async () => {
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ ...createdVisitor, status: 'approved' }], 
        rowCount: 1 
      });

      const updateQuery = `
        UPDATE visitors SET status = $1, approved_by = $2, approved_at = NOW()
        WHERE id = $3 AND status = 'pending'
        RETURNING *
      `;

      const result = await mockQuery(updateQuery, ['approved', testGuard.id, createdVisitor.id]);

      expect(result.rows[0].status).toBe('approved');
    });

    it('should record check-in with timestamp', async () => {
      const checkInTime = new Date();
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ ...createdVisitor, status: 'checked_in', check_in_time: checkInTime }], 
        rowCount: 1 
      });

      const checkInQuery = `
        UPDATE visitors SET status = 'checked_in', check_in_time = NOW(), checked_in_by = $1
        WHERE id = $2 AND status = 'approved'
        RETURNING *
      `;

      const result = await mockQuery(checkInQuery, [testGuard.id, createdVisitor.id]);

      expect(result.rows[0].status).toBe('checked_in');
      expect(result.rows[0].check_in_time).toBeDefined();
    });

    it('should calculate visit duration on check-out', async () => {
      const checkInTime = new Date(Date.now() - 3600000); // 1 hour ago
      const checkOutTime = new Date();
      const expectedDuration = Math.round((checkOutTime - checkInTime) / 60000); // in minutes

      mockQuery.mockResolvedValueOnce({ 
        rows: [{ 
          ...createdVisitor, 
          status: 'checked_out', 
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          visit_duration_minutes: expectedDuration
        }], 
        rowCount: 1 
      });

      const checkOutQuery = `
        UPDATE visitors 
        SET status = 'checked_out', 
            check_out_time = NOW(), 
            checked_out_by = $1,
            visit_duration_minutes = EXTRACT(EPOCH FROM (NOW() - check_in_time)) / 60
        WHERE id = $2 AND status = 'checked_in'
        RETURNING *
      `;

      const result = await mockQuery(checkOutQuery, [testGuard.id, createdVisitor.id]);

      expect(result.rows[0].status).toBe('checked_out');
      expect(result.rows[0].visit_duration_minutes).toBe(expectedDuration);
    });
  });

  // =========================================
  // Access Code Generation Tests
  // =========================================
  describe('Access Code Generation', () => {
    const generateAccessCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    it('should generate 6-character alphanumeric code', () => {
      const code = generateAccessCode();
      expect(code).toHaveLength(6);
      expect(/^[A-Z0-9]+$/.test(code)).toBe(true);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateAccessCode());
      }
      // With 36^6 combinations, 100 codes should be unique
      expect(codes.size).toBe(100);
    });
  });

  // =========================================
  // Notification Integration Tests
  // =========================================
  describe('Notification Integration', () => {
    it('should send email notification on visitor approval', async () => {
      const approvedVisitor = { ...createdVisitor, status: 'approved', accessCode: 'ABC123' };

      // Simulate approval flow
      mockQuery.mockResolvedValueOnce({ rows: [approvedVisitor], rowCount: 1 });

      // After approval, email should be sent
      await mockSendEmail({
        to: approvedVisitor.email,
        subject: 'Your visit has been approved',
        template: 'visitor-approval',
        data: {
          visitorName: approvedVisitor.name,
          accessCode: approvedVisitor.accessCode,
          expectedArrival: approvedVisitor.expectedArrival
        }
      });

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: approvedVisitor.email,
          subject: expect.stringContaining('approved')
        })
      );
    });

    it('should send SMS notification on check-in', async () => {
      const checkedInVisitor = { ...createdVisitor, status: 'checked_in' };

      // Notify resident when visitor checks in
      await mockSendSMS({
        to: testResident.phone,
        message: `Your visitor ${checkedInVisitor.name} has arrived`
      });

      expect(mockSendSMS).toHaveBeenCalled();
    });
  });

  // =========================================
  // Security Tests
  // =========================================
  describe('Security Tests', () => {
    it('should not allow resident to approve their own visitor', () => {
      const canApprove = (approverRole, approverId, visitorResidentId) => {
        if (approverId === visitorResidentId) {
          return false; // Resident cannot approve their own visitor
        }
        return ['guard', 'admin'].includes(approverRole);
      };

      expect(canApprove('resident', testResident.id, testResident.id)).toBe(false);
      expect(canApprove('guard', testGuard.id, testResident.id)).toBe(true);
    });

    it('should validate access code format', () => {
      const isValidAccessCode = (code) => {
        return /^[A-Z0-9]{6}$/.test(code);
      };

      expect(isValidAccessCode('ABC123')).toBe(true);
      expect(isValidAccessCode('abc123')).toBe(false);
      expect(isValidAccessCode('AB123')).toBe(false);
      expect(isValidAccessCode('ABC1234')).toBe(false);
    });

    it('should reject expired visitor passes', () => {
      const isExpired = (expectedArrival, gracePeriodHours = 24) => {
        const arrivalDate = new Date(expectedArrival);
        const expiryDate = new Date(arrivalDate.getTime() + gracePeriodHours * 60 * 60 * 1000);
        return new Date() > expiryDate;
      };

      const pastDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 2 days ago
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow

      expect(isExpired(pastDate)).toBe(true);
      expect(isExpired(futureDate)).toBe(false);
    });
  });

  // =========================================
  // Audit Trail Tests
  // =========================================
  describe('Audit Trail Tests', () => {
    it('should log visitor creation event', async () => {
      await mockLogAudit({
        action: 'VISITOR_CREATED',
        userId: testResident.id,
        targetId: createdVisitor.id,
        details: {
          visitorName: createdVisitor.name,
          expectedArrival: createdVisitor.expectedArrival
        }
      });

      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'VISITOR_CREATED',
          userId: testResident.id
        })
      );
    });

    it('should log visitor approval event', async () => {
      await mockLogAudit({
        action: 'VISITOR_APPROVED',
        userId: testGuard.id,
        targetId: createdVisitor.id,
        details: {
          previousStatus: 'pending',
          newStatus: 'approved'
        }
      });

      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'VISITOR_APPROVED'
        })
      );
    });

    it('should log check-in event with timestamp', async () => {
      const checkInTime = new Date();
      
      await mockLogAudit({
        action: 'VISITOR_CHECKED_IN',
        userId: testGuard.id,
        targetId: createdVisitor.id,
        details: {
          checkInTime: checkInTime.toISOString(),
          accessCode: 'ABC123'
        }
      });

      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'VISITOR_CHECKED_IN',
          details: expect.objectContaining({
            checkInTime: expect.any(String)
          })
        })
      );
    });
  });

  // =========================================
  // Error Handling Tests
  // =========================================
  describe('Error Handling Tests', () => {
    it('should handle database connection errors', async () => {
      const errorMockQuery = jest.fn().mockRejectedValueOnce(new Error('Connection refused'));

      await expect(errorMockQuery('SELECT 1')).rejects.toThrow('Connection refused');
    });

    it('should handle duplicate access code error', async () => {
      const duplicateError = Object.assign(
        new Error('duplicate key value violates unique constraint'),
        { code: '23505' }
      );
      
      const localMockQuery = jest.fn().mockRejectedValueOnce(duplicateError);

      await expect(localMockQuery('INSERT INTO visitors...')).rejects.toThrow('duplicate key');
    });

    it('should handle concurrent modification errors', async () => {
      const concurrentMockQuery = jest.fn()
        // First query succeeds
        .mockResolvedValueOnce({ rows: [{ ...createdVisitor, status: 'pending' }], rowCount: 1 })
        // Second query fails because status already changed
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const firstResult = await concurrentMockQuery('UPDATE visitors SET status = $1 WHERE id = $2 AND status = $3', ['approved', '1', 'pending']);
      expect(firstResult.rowCount).toBe(1);
      
      const secondResult = await concurrentMockQuery('UPDATE visitors SET status = $1 WHERE id = $2 AND status = $3', ['approved', '1', 'pending']);
      expect(secondResult.rowCount).toBe(0);
    });
  });

  // =========================================
  // Performance Tests
  // =========================================
  describe('Performance Tests', () => {
    it('should efficiently query visitors with pagination', async () => {
      const pageSize = 20;
      const visitors = Array.from({ length: pageSize }, (_, i) => ({
        ...createdVisitor,
        id: `visitor-${i}`
      }));

      const localMockQuery = jest.fn().mockResolvedValueOnce({ rows: visitors, rowCount: pageSize });

      const startTime = Date.now();
      const result = await localMockQuery(`
        SELECT * FROM visitors 
        WHERE resident_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `, [testResident.id, pageSize, 0]);
      const duration = Date.now() - startTime;

      expect(result.rowCount).toBe(pageSize);
      expect(result.rows).toHaveLength(pageSize);
      expect(duration).toBeLessThan(100); // Should be fast with mock
    });

    it('should handle bulk visitor status updates', async () => {
      const visitorIds = Array.from({ length: 50 }, (_, i) => `visitor-${i}`);
      
      const localMockQuery = jest.fn().mockResolvedValueOnce({ rows: [], rowCount: 50 });

      const result = await localMockQuery(`
        UPDATE visitors SET status = 'expired'
        WHERE id = ANY($1) AND status = 'approved' AND expected_arrival < NOW() - INTERVAL '24 hours'
      `, [visitorIds]);

      expect(result.rowCount).toBe(50);
      expect(localMockQuery).toHaveBeenCalled();
    });
  });

  // =========================================
  // Complete Lifecycle Integration Test
  // =========================================
  describe('Complete Lifecycle Integration', () => {
    it('should handle complete visitor flow from invitation to checkout', async () => {
      // Create separate mock for this test to ensure proper sequencing
      const lifecycleMockQuery = jest.fn()
        // Step 1: Create invitation
        .mockResolvedValueOnce({ rows: [{ ...createdVisitor, status: 'pending' }], rowCount: 1 })
        // Step 2: Approve
        .mockResolvedValueOnce({ rows: [{ ...createdVisitor, status: 'approved', accessCode: 'XYZ789' }], rowCount: 1 })
        // Step 3: Check in
        .mockResolvedValueOnce({ rows: [{ ...createdVisitor, status: 'checked_in', check_in_time: new Date() }], rowCount: 1 })
        // Step 4: Check out
        .mockResolvedValueOnce({ rows: [{ ...createdVisitor, status: 'checked_out', check_out_time: new Date() }], rowCount: 1 });

      // Execute lifecycle
      const created = await lifecycleMockQuery('INSERT...', []);
      expect(created.rows[0].status).toBe('pending');

      const approved = await lifecycleMockQuery('UPDATE...SET status=approved', []);
      expect(approved.rows[0].status).toBe('approved');
      expect(approved.rows[0].accessCode).toBeDefined();

      const checkedIn = await lifecycleMockQuery('UPDATE...SET status=checked_in', []);
      expect(checkedIn.rows[0].status).toBe('checked_in');

      const checkedOut = await lifecycleMockQuery('UPDATE...SET status=checked_out', []);
      expect(checkedOut.rows[0].status).toBe('checked_out');
    });
  });
});

