/**
 * EmergencyService Unit Tests
 * 
 * Tests for panic button and emergency alert functionality.
 * Priority: P1 (Core Business Service)
 * 
 * Coverage targets:
 * - Statements: 95%+
 * - Branches: 90%+
 * - Functions: 100%
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock database pool
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn();
jest.unstable_mockModule('../../src/database/connection.js', () => ({
  pool: {
    query: mockQuery,
    connect: mockConnect
  }
}));

// Mock logging service
const mockLogInfo = jest.fn();
const mockLogError = jest.fn();
jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  default: {
    logInfo: mockLogInfo,
    logError: mockLogError
  }
}));

describe('EmergencyService', () => {
  let emergencyService;
  let mockClient;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Setup mock client
    mockClient = {
      query: jest.fn(),
      release: mockRelease
    };
    mockConnect.mockResolvedValue(mockClient);
    
    // Import after mocks are set up
    const module = await import('../../src/services/emergencyService.js');
    emergencyService = module.default;
    
    // Clear the activeEmergencies map
    emergencyService.activeEmergencies.clear();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  // Factory functions
  const createGuard = (overrides = {}) => ({
    id: 1,
    username: 'guard1',
    email: 'guard@test.com',
    phone: '+254712345678',
    role: 'guard',
    ...overrides
  });
  
  const createEmergency = (overrides = {}) => ({
    id: 1,
    guard_id: 1,
    gate_id: null,
    latitude: -1.2921,
    longitude: 36.8219,
    location_accuracy: 10,
    status: 'triggered',
    triggered_at: new Date(),
    ...overrides
  });
  
  describe('triggerPanicButton', () => {
    it('should trigger panic button successfully with location', async () => {
      const guard = createGuard();
      const emergency = createEmergency();
      const recipients = [
        { id: 2, username: 'admin', role: 'admin', phone: '+1', email: 'a@t.com' },
        { id: 3, username: 'guard2', role: 'guard', phone: '+2', email: 'g@t.com' }
      ];
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [guard] }) // SELECT guard
        .mockResolvedValueOnce({ rows: [] }) // Recent panic check
        .mockResolvedValueOnce({ rows: [emergency] }) // INSERT emergency
        .mockResolvedValueOnce({ rows: recipients }) // SELECT recipients
        .mockResolvedValueOnce({ rows: [] }) // INSERT alert log 1
        .mockResolvedValueOnce({ rows: [] }) // INSERT alert log 2
        .mockResolvedValueOnce({ rows: [] }); // COMMIT
      
      const result = await emergencyService.triggerPanicButton(
        1, 
        { latitude: -1.2921, longitude: 36.8219, accuracy: 10 },
        5
      );
      
      expect(result.emergency).toEqual(emergency);
      expect(result.guard.id).toBe(1);
      expect(result.recipients.length).toBe(2);
      expect(result.message).toBe('Emergency alert triggered successfully');
      expect(mockClient.release).toHaveBeenCalled();
    });
    
    it('should trigger panic button without location', async () => {
      const guard = createGuard();
      const emergency = createEmergency({ latitude: null, longitude: null });
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [guard] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [emergency] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      
      const result = await emergencyService.triggerPanicButton(1);
      
      expect(result.emergency).toBeDefined();
      expect(mockLogInfo).toHaveBeenCalledWith(
        'PANIC_BUTTON_TRIGGERED',
        expect.objectContaining({ hasLocation: false })
      );
    });
    
    it('should throw error when guard not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }); // No guard found
      
      await expect(emergencyService.triggerPanicButton(999))
        .rejects.toThrow('Guard not found or invalid role');
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
    
    it('should throw error when cooldown is active', async () => {
      const guard = createGuard();
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [guard] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Recent panic found
      
      await expect(emergencyService.triggerPanicButton(1))
        .rejects.toThrow('Panic button cooldown active');
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
    
    it('should add emergency to activeEmergencies cache', async () => {
      const guard = createGuard();
      const emergency = createEmergency();
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [guard] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [emergency] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      
      await emergencyService.triggerPanicButton(1);
      
      expect(emergencyService.activeEmergencies.has(emergency.id)).toBe(true);
    });
    
    it('should log error when panic fails', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('DB error'));
      
      await expect(emergencyService.triggerPanicButton(1))
        .rejects.toThrow('DB error');
      
      expect(mockLogError).toHaveBeenCalledWith(
        'PANIC_BUTTON_FAILED',
        expect.objectContaining({ guardId: 1 })
      );
    });
  });
  
  describe('acknowledgeEmergency', () => {
    it('should acknowledge emergency successfully', async () => {
      const responder = { id: 2, role: 'admin' };
      const emergency = createEmergency({ status: 'acknowledged' });
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [responder] }) // Verify responder
        .mockResolvedValueOnce({ rows: [emergency] }) // UPDATE emergency
        .mockResolvedValueOnce({ rows: [] }); // UPDATE alert log
      
      const result = await emergencyService.acknowledgeEmergency(1, 2);
      
      expect(result.status).toBe('acknowledged');
      expect(mockLogInfo).toHaveBeenCalledWith(
        'EMERGENCY_ACKNOWLEDGED',
        expect.objectContaining({ emergencyId: 1, responderId: 2 })
      );
    });
    
    it('should throw error for non-admin/guard responder', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      await expect(emergencyService.acknowledgeEmergency(1, 99))
        .rejects.toThrow('Only admins or guards can acknowledge emergencies');
    });
    
    it('should throw error when emergency not found', async () => {
      const responder = { id: 2, role: 'guard' };
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [responder] })
        .mockResolvedValueOnce({ rows: [] }); // No emergency found
      
      await expect(emergencyService.acknowledgeEmergency(999, 2))
        .rejects.toThrow('Emergency not found or already acknowledged');
    });
    
    it('should update activeEmergencies cache', async () => {
      const emergency = createEmergency();
      emergencyService.activeEmergencies.set(1, emergency);
      
      const responder = { id: 2, role: 'admin' };
      const updatedEmergency = { ...emergency, status: 'acknowledged' };
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [responder] })
        .mockResolvedValueOnce({ rows: [updatedEmergency] })
        .mockResolvedValueOnce({ rows: [] });
      
      await emergencyService.acknowledgeEmergency(1, 2);
      
      expect(emergencyService.activeEmergencies.get(1).status).toBe('acknowledged');
    });
  });
  
  describe('resolveEmergency', () => {
    it('should resolve emergency successfully', async () => {
      const resolver = { id: 1, role: 'admin' };
      const emergency = createEmergency({ status: 'resolved' });
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [resolver] })
        .mockResolvedValueOnce({ rows: [emergency] });
      
      const result = await emergencyService.resolveEmergency(1, 1, {
        notes: 'Situation resolved',
        isFalseAlarm: false
      });
      
      expect(result.status).toBe('resolved');
      expect(mockLogInfo).toHaveBeenCalledWith(
        'EMERGENCY_RESOLVED',
        expect.objectContaining({ emergencyId: 1 })
      );
    });
    
    it('should mark as false alarm when specified', async () => {
      const resolver = { id: 1, role: 'admin' };
      const emergency = createEmergency({ status: 'resolved', is_false_alarm: true });
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [resolver] })
        .mockResolvedValueOnce({ rows: [emergency] });
      
      await emergencyService.resolveEmergency(1, 1, {
        isFalseAlarm: true,
        falseAlarmReason: 'Accidental press'
      });
      
      expect(mockLogInfo).toHaveBeenCalledWith(
        'EMERGENCY_RESOLVED',
        expect.objectContaining({ isFalseAlarm: true })
      );
    });
    
    it('should throw error for non-admin resolver', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      await expect(emergencyService.resolveEmergency(1, 2))
        .rejects.toThrow('Only admins can resolve emergencies');
    });
    
    it('should throw error when emergency not found', async () => {
      const resolver = { id: 1, role: 'admin' };
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [resolver] })
        .mockResolvedValueOnce({ rows: [] });
      
      await expect(emergencyService.resolveEmergency(999, 1))
        .rejects.toThrow('Emergency not found or already resolved');
    });
    
    it('should remove emergency from activeEmergencies cache', async () => {
      emergencyService.activeEmergencies.set(1, createEmergency());
      
      const resolver = { id: 1, role: 'admin' };
      const emergency = createEmergency({ status: 'resolved' });
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [resolver] })
        .mockResolvedValueOnce({ rows: [emergency] });
      
      await emergencyService.resolveEmergency(1, 1);
      
      expect(emergencyService.activeEmergencies.has(1)).toBe(false);
    });
  });
  
  describe('cancelEmergency', () => {
    it('should cancel emergency within 30 seconds', async () => {
      const emergency = createEmergency({ status: 'cancelled' });
      
      mockClient.query.mockResolvedValueOnce({ rows: [emergency] });
      
      const result = await emergencyService.cancelEmergency(1, 1);
      
      expect(result.status).toBe('cancelled');
      expect(mockLogInfo).toHaveBeenCalledWith(
        'EMERGENCY_CANCELLED',
        expect.objectContaining({ emergencyId: 1, guardId: 1 })
      );
    });
    
    it('should throw error when cannot cancel', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      await expect(emergencyService.cancelEmergency(1, 1))
        .rejects.toThrow('Cannot cancel');
    });
    
    it('should remove from activeEmergencies cache', async () => {
      emergencyService.activeEmergencies.set(1, createEmergency());
      
      mockClient.query.mockResolvedValueOnce({ 
        rows: [createEmergency({ status: 'cancelled' })] 
      });
      
      await emergencyService.cancelEmergency(1, 1);
      
      expect(emergencyService.activeEmergencies.has(1)).toBe(false);
    });
  });
  
  describe('getActiveEmergencies', () => {
    it('should return all active emergencies', async () => {
      const emergencies = [
        createEmergency({ status: 'triggered' }),
        createEmergency({ id: 2, status: 'acknowledged' })
      ];
      
      mockQuery.mockResolvedValueOnce({ rows: emergencies });
      
      const result = await emergencyService.getActiveEmergencies();
      
      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("status IN ('triggered', 'acknowledged')"));
    });
    
    it('should return empty array when no active emergencies', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      const result = await emergencyService.getActiveEmergencies();
      
      expect(result).toEqual([]);
    });
  });
  
  describe('getGuardEmergencyHistory', () => {
    it('should return guards own emergency history', async () => {
      const history = [
        { id: 1, triggered_at: new Date(), status: 'resolved' },
        { id: 2, triggered_at: new Date(), status: 'resolved' }
      ];
      
      mockQuery.mockResolvedValueOnce({ rows: history });
      
      const result = await emergencyService.getGuardEmergencyHistory(1);
      
      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [1, 10] // guardId, default limit
      );
    });
    
    it('should use custom limit', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      await emergencyService.getGuardEmergencyHistory(1, 5);
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [1, 5]
      );
    });
  });
  
  describe('getEmergencyDetails', () => {
    it('should return details for admin', async () => {
      const emergency = createEmergency({ 
        guard_name: 'guard1',
        triggered_at: new Date()
      });
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }] })
        .mockResolvedValueOnce({ rows: [emergency] });
      
      const result = await emergencyService.getEmergencyDetails(1, 1);
      
      expect(result).toEqual(emergency);
      expect(mockClient.release).toHaveBeenCalled();
    });
    
    it('should return details for guard who triggered', async () => {
      const emergency = createEmergency({ guard_id: 2 });
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ role: 'guard' }] })
        .mockResolvedValueOnce({ rows: [emergency] });
      
      const result = await emergencyService.getEmergencyDetails(1, 2);
      
      expect(result).toBeDefined();
    });
    
    it('should throw error when guard tries to view others emergency', async () => {
      const emergency = createEmergency({ guard_id: 1 });
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ role: 'guard' }] })
        .mockResolvedValueOnce({ rows: [emergency] });
      
      await expect(emergencyService.getEmergencyDetails(1, 2))
        .rejects.toThrow('Access denied');
    });
    
    it('should throw error when user not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      await expect(emergencyService.getEmergencyDetails(1, 999))
        .rejects.toThrow('User not found');
    });
    
    it('should throw error when emergency not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }] })
        .mockResolvedValueOnce({ rows: [] });
      
      await expect(emergencyService.getEmergencyDetails(999, 1))
        .rejects.toThrow('Emergency not found');
    });
    
    it('should redact location for non-admin after 24 hours', async () => {
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 25); // 25 hours ago
      
      const emergency = createEmergency({ 
        guard_id: 1,
        triggered_at: oldDate,
        latitude: -1.2921,
        longitude: 36.8219
      });
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ role: 'guard' }] })
        .mockResolvedValueOnce({ rows: [emergency] });
      
      const result = await emergencyService.getEmergencyDetails(1, 1);
      
      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
    });
  });
  
  describe('getEmergencyStats', () => {
    it('should return stats for month period', async () => {
      const stats = {
        total_emergencies: 10,
        false_alarms: 2,
        resolved: 8,
        avg_acknowledge_seconds: 45,
        avg_resolve_seconds: 300
      };
      
      mockQuery.mockResolvedValueOnce({ rows: [stats] });
      
      const result = await emergencyService.getEmergencyStats('month');
      
      expect(result.period).toBe('month');
      expect(result.total_emergencies).toBe(10);
    });
    
    it('should return stats for week period', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total_emergencies: 5 }] });
      
      const result = await emergencyService.getEmergencyStats('week');
      
      expect(result.period).toBe('week');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('7 days'));
    });
    
    it('should return stats for day period', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total_emergencies: 1 }] });
      
      const result = await emergencyService.getEmergencyStats('day');
      
      expect(result.period).toBe('day');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('1 day'));
    });
    
    it('should default to month for invalid period', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total_emergencies: 10 }] });
      
      const result = await emergencyService.getEmergencyStats('invalid');
      
      expect(result.period).toBe('invalid');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('30 days'));
    });
  });
});
