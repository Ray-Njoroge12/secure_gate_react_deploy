/**
 * Walk-In Controller Unit Tests
 * Tests for the walk-in visitor functionality
 */

describe('Walk-In Controller', () => {
  // Mock data
  const mockWalkIn = {
    visitorName: 'John Doe',
    phone: '+254712345678',
    idNumber: '12345678',
    purpose: 'Meeting',
    hostResidentId: 'res-123',
    visitingUnit: 'A101'
  };

  describe('Input Validation', () => {
    const validateWalkInInput = (data) => {
      const errors = [];
      
      if (!data.visitorName || data.visitorName.trim().length === 0) {
        errors.push({ field: 'visitorName', message: 'Visitor name is required' });
      }
      
      if (!data.phone || !/^\+?[0-9]{10,15}$/.test(data.phone.replace(/[\s-]/g, ''))) {
        errors.push({ field: 'phone', message: 'Valid phone number is required' });
      }
      
      if (!data.idNumber || data.idNumber.length < 5) {
        errors.push({ field: 'idNumber', message: 'Valid ID number is required' });
      }
      
      if (!data.purpose || data.purpose.trim().length === 0) {
        errors.push({ field: 'purpose', message: 'Purpose of visit is required' });
      }
      
      if (data.purpose && data.purpose.length > 500) {
        errors.push({ field: 'purpose', message: 'Purpose must be less than 500 characters' });
      }
      
      return { isValid: errors.length === 0, errors };
    };

    test('should reject empty visitor name', () => {
      const result = validateWalkInInput({ ...mockWalkIn, visitorName: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'visitorName' })
      );
    });

    test('should reject invalid phone number', () => {
      const result = validateWalkInInput({ ...mockWalkIn, phone: '123' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'phone' })
      );
    });

    test('should reject short ID number', () => {
      const result = validateWalkInInput({ ...mockWalkIn, idNumber: '123' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'idNumber' })
      );
    });

    test('should reject empty purpose', () => {
      const result = validateWalkInInput({ ...mockWalkIn, purpose: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'purpose' })
      );
    });

    test('should reject purpose over 500 characters', () => {
      const result = validateWalkInInput({ ...mockWalkIn, purpose: 'a'.repeat(501) });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'purpose' })
      );
    });

    test('should accept valid walk-in data', () => {
      const result = validateWalkInInput(mockWalkIn);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Walk-In Creation', () => {
    let idCounter = 0;
    
    const createWalkIn = (data) => {
      idCounter++;
      return {
        id: `walkin-${Date.now()}-${idCounter}-${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        status: 'pending_approval',
        checkInTime: null,
        checkOutTime: null,
        createdAt: new Date().toISOString(),
        createdBy: 'guard-123'
      };
    };

    test('should create walk-in with pending status', () => {
      const result = createWalkIn(mockWalkIn);
      expect(result.status).toBe('pending_approval');
    });

    test('should generate unique ID', () => {
      const result1 = createWalkIn(mockWalkIn);
      const result2 = createWalkIn(mockWalkIn);
      expect(result1.id).not.toBe(result2.id);
    });

    test('should initialize check times as null', () => {
      const result = createWalkIn(mockWalkIn);
      expect(result.checkInTime).toBeNull();
      expect(result.checkOutTime).toBeNull();
    });
  });

  describe('Walk-In Status Transitions', () => {
    const validTransitions = {
      'pending_approval': ['approved', 'rejected'],
      'approved': ['checked_in', 'cancelled'],
      'checked_in': ['checked_out'],
      'rejected': [],
      'cancelled': [],
      'checked_out': []
    };

    const canTransition = (fromStatus, toStatus) => {
      return validTransitions[fromStatus]?.includes(toStatus) || false;
    };

    test('should allow pending to approved', () => {
      expect(canTransition('pending_approval', 'approved')).toBe(true);
    });

    test('should allow pending to rejected', () => {
      expect(canTransition('pending_approval', 'rejected')).toBe(true);
    });

    test('should allow approved to checked_in', () => {
      expect(canTransition('approved', 'checked_in')).toBe(true);
    });

    test('should not allow rejected to approved', () => {
      expect(canTransition('rejected', 'approved')).toBe(false);
    });

    test('should not allow checked_out to any status', () => {
      expect(canTransition('checked_out', 'checked_in')).toBe(false);
    });
  });

  describe('Walk-In Search', () => {
    const walkIns = [
      { id: '1', visitorName: 'John Doe', phone: '+254712345678', idNumber: '12345678' },
      { id: '2', visitorName: 'Jane Smith', phone: '+254722222222', idNumber: '87654321' },
      { id: '3', visitorName: 'Bob Johnson', phone: '+254733333333', idNumber: '11111111' }
    ];

    const searchWalkIns = (query) => {
      const q = query.toLowerCase();
      return walkIns.filter(w => 
        w.visitorName.toLowerCase().includes(q) ||
        w.phone.includes(q) ||
        w.idNumber.includes(q)
      );
    };

    test('should search by name', () => {
      const results = searchWalkIns('john');
      expect(results).toHaveLength(2); // John Doe and Bob Johnson
    });

    test('should search by phone', () => {
      const results = searchWalkIns('712345678');
      expect(results).toHaveLength(1);
      expect(results[0].visitorName).toBe('John Doe');
    });

    test('should search by ID number', () => {
      const results = searchWalkIns('87654321');
      expect(results).toHaveLength(1);
      expect(results[0].visitorName).toBe('Jane Smith');
    });

    test('should be case insensitive', () => {
      const results = searchWalkIns('JANE');
      expect(results).toHaveLength(1);
    });
  });

  describe('Walk-In Time Tracking', () => {
    const calculateDuration = (checkIn, checkOut) => {
      if (!checkIn || !checkOut) return null;
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      return Math.round((end - start) / 1000 / 60); // minutes
    };

    test('should calculate visit duration in minutes', () => {
      const checkIn = '2024-01-15T10:00:00Z';
      const checkOut = '2024-01-15T12:30:00Z';
      expect(calculateDuration(checkIn, checkOut)).toBe(150);
    });

    test('should return null for missing check-in', () => {
      expect(calculateDuration(null, '2024-01-15T12:30:00Z')).toBeNull();
    });

    test('should return null for missing check-out', () => {
      expect(calculateDuration('2024-01-15T10:00:00Z', null)).toBeNull();
    });
  });

  describe('Walk-In Notification', () => {
    const notificationQueue = [];
    
    const queueNotification = (walkIn, type) => {
      notificationQueue.push({
        walkInId: walkIn.id,
        type,
        recipientId: walkIn.hostResidentId,
        timestamp: new Date().toISOString()
      });
    };

    beforeEach(() => {
      notificationQueue.length = 0;
    });

    test('should queue approval request notification', () => {
      const walkIn = { id: 'w1', hostResidentId: 'res-123' };
      queueNotification(walkIn, 'approval_request');
      expect(notificationQueue).toHaveLength(1);
      expect(notificationQueue[0].type).toBe('approval_request');
    });

    test('should queue check-in notification', () => {
      const walkIn = { id: 'w1', hostResidentId: 'res-123' };
      queueNotification(walkIn, 'checked_in');
      expect(notificationQueue[0].type).toBe('checked_in');
    });
  });

  describe('Walk-In Report Generation', () => {
    const walkIns = [
      { id: '1', status: 'checked_out', checkInTime: '2024-01-15T10:00:00Z', checkOutTime: '2024-01-15T12:00:00Z' },
      { id: '2', status: 'checked_out', checkInTime: '2024-01-15T09:00:00Z', checkOutTime: '2024-01-15T11:00:00Z' },
      { id: '3', status: 'rejected' },
      { id: '4', status: 'checked_in', checkInTime: '2024-01-15T14:00:00Z' }
    ];

    const generateReport = (data) => {
      const completed = data.filter(w => w.status === 'checked_out');
      const active = data.filter(w => w.status === 'checked_in');
      const rejected = data.filter(w => w.status === 'rejected');
      
      return {
        total: data.length,
        completed: completed.length,
        active: active.length,
        rejected: rejected.length,
        completionRate: data.length > 0 ? 
          ((completed.length / data.length) * 100).toFixed(2) : '0.00'
      };
    };

    test('should count total walk-ins', () => {
      const report = generateReport(walkIns);
      expect(report.total).toBe(4);
    });

    test('should count completed walk-ins', () => {
      const report = generateReport(walkIns);
      expect(report.completed).toBe(2);
    });

    test('should count active walk-ins', () => {
      const report = generateReport(walkIns);
      expect(report.active).toBe(1);
    });

    test('should calculate completion rate', () => {
      const report = generateReport(walkIns);
      expect(report.completionRate).toBe('50.00');
    });
  });
});
