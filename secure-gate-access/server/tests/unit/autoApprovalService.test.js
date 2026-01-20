/**
 * AutoApprovalService Unit Tests
 * 
 * Tests for privacy-preserving auto-approval rules engine.
 * Priority: P1 (Core Business Service)
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as crypto from 'crypto';

// Encryption constants (must be exactly 32 characters)
const ENCRYPTION_KEY = 'rules-encryption-key-32-chars!!!';
const IV_LENGTH = 16;

// Helper function to create mock encrypted criteria
function createEncryptedCriteria(criteria = { visitorName: 'john doe', visitorPhone: '254712345678' }) {
  const text = JSON.stringify(criteria);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Mock database pool
const mockQuery = jest.fn();
jest.unstable_mockModule('../../src/database/connection.js', () => ({
  pool: {
    query: mockQuery
  }
}));

describe('AutoApprovalService', () => {
  let autoApprovalService;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('../../src/services/autoApprovalService.js');
    autoApprovalService = module;
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('RULE_CATEGORIES', () => {
    it('should export rule categories', () => {
      expect(autoApprovalService.RULE_CATEGORIES).toBeDefined();
      expect(autoApprovalService.RULE_CATEGORIES.FAMILY).toBe('family');
      expect(autoApprovalService.RULE_CATEGORIES.FRIEND).toBe('friend');
      expect(autoApprovalService.RULE_CATEGORIES.SERVICE).toBe('service');
      expect(autoApprovalService.RULE_CATEGORIES.DELIVERY).toBe('delivery');
      expect(autoApprovalService.RULE_CATEGORIES.BUSINESS).toBe('business');
      expect(autoApprovalService.RULE_CATEGORIES.CUSTOM).toBe('custom');
    });
  });
  
  describe('createRule', () => {
    it('should create a new rule successfully', async () => {
      const mockRule = { id: 1, rule_name: 'Family Rule', time_restrictions: {}, is_active: true, created_at: new Date() };
      mockQuery.mockResolvedValueOnce({ rows: [mockRule] });
      
      const result = await autoApprovalService.createRule(1, {
        ruleName: 'Family Rule',
        visitorName: 'John Doe',
        visitorPhone: '+254712345678',
        category: 'family',
        notes: 'My brother'
      });
      
      expect(result.success).toBe(true);
      expect(result.rule).toEqual(mockRule);
      expect(result.message).toBe('Auto-approval rule created');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO auto_approval_rules'), expect.any(Array));
    });
    
    it('should create rule with time restrictions', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, rule_name: 'Weekday Rule' }] });
      const result = await autoApprovalService.createRule(1, { ruleName: 'Weekday Rule', visitorName: 'Jane', timeRestrictions: { days: ['mon', 'tue', 'wed', 'thu', 'fri'], start_time: '09:00', end_time: '17:00' } });
      expect(result.success).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining([1, 'Weekday Rule']));
    });
    
    it('should create rule without phone number', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const result = await autoApprovalService.createRule(1, { ruleName: 'Name Only Rule', visitorName: 'Delivery Person' });
      expect(result.success).toBe(true);
    });
    
    it('should use CUSTOM category when not provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const result = await autoApprovalService.createRule(1, { ruleName: 'Test Rule', visitorName: 'Test Person' });
      expect(result.success).toBe(true);
    });
    
    it('should normalize visitor name to lowercase', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      await autoApprovalService.createRule(1, { ruleName: 'Test', visitorName: '  JOHN DOE  ' });
      expect(mockQuery).toHaveBeenCalled();
    });
    
    it('should strip non-digits from phone number', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      await autoApprovalService.createRule(1, { ruleName: 'Test', visitorPhone: '+254 (712) 345-678' });
      expect(mockQuery).toHaveBeenCalled();
    });
  });
  
  describe('getResidentRules', () => {
    it('should return all rules for a resident', async () => {
      const encryptedCriteria = createEncryptedCriteria();
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, rule_name: 'Rule 1', match_criteria_encrypted: encryptedCriteria, time_restrictions: { days: ['mon'] }, is_active: true, match_count: 5, last_matched_at: new Date(), created_at: new Date() }] });
      const rules = await autoApprovalService.getResidentRules(1);
      expect(Array.isArray(rules)).toBe(true);
      expect(rules[0].ruleName).toBe('Rule 1');
      expect(rules[0].isActive).toBe(true);
      expect(rules[0].matchCriteria).toBeDefined();
    });
    
    it('should return empty array when no rules exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const rules = await autoApprovalService.getResidentRules(1);
      expect(rules).toEqual([]);
    });
    
    it('should decrypt rule criteria for the owner', async () => {
      const criteria = { visitorName: 'test user', visitorPhone: '123456789' };
      const encryptedCriteria = createEncryptedCriteria(criteria);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, rule_name: 'Test Rule', match_criteria_encrypted: encryptedCriteria, time_restrictions: {}, is_active: true, match_count: 0, last_matched_at: null, created_at: new Date() }] });
      const rules = await autoApprovalService.getResidentRules(1);
      expect(rules[0].matchCriteria.visitorName).toBe('test user');
      expect(rules[0].matchCriteria.visitorPhone).toBe('123456789');
    });
    
    it('should handle corrupted encrypted data', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, rule_name: 'Test Rule', match_criteria_encrypted: 'invalid:encrypted:data', time_restrictions: {}, is_active: true, match_count: 0, last_matched_at: null, created_at: new Date() }] });
      const rules = await autoApprovalService.getResidentRules(1);
      expect(rules[0].matchCriteria).toBeNull();
    });
  });
  
  describe('updateRule', () => {
    it('should update rule successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }).mockResolvedValueOnce({ rows: [{ id: 1, rule_name: 'Updated', is_active: true }] });
      const result = await autoApprovalService.updateRule(1, 1, { ruleName: 'Updated Rule Name' });
      expect(result.success).toBe(true);
      expect(result.rule).toBeDefined();
    });
    
    it('should return error when rule not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await autoApprovalService.updateRule(999, 1, { ruleName: 'New' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Rule not found or access denied');
    });
    
    it('should return error when resident does not own rule', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await autoApprovalService.updateRule(1, 2, { ruleName: 'New' });
      expect(result.success).toBe(false);
    });
    
    it('should update matchCriteria when provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }).mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const result = await autoApprovalService.updateRule(1, 1, { matchCriteria: { visitorName: 'new name' } });
      expect(result.success).toBe(true);
      expect(mockQuery.mock.calls[1][0]).toContain('match_criteria_encrypted');
    });
    
    it('should update timeRestrictions when provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }).mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const result = await autoApprovalService.updateRule(1, 1, { timeRestrictions: { days: ['sat', 'sun'] } });
      expect(result.success).toBe(true);
      expect(mockQuery.mock.calls[1][0]).toContain('time_restrictions');
    });
    
    it('should update isActive when provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }).mockResolvedValueOnce({ rows: [{ id: 1, is_active: false }] });
      const result = await autoApprovalService.updateRule(1, 1, { isActive: false });
      expect(result.success).toBe(true);
      expect(mockQuery.mock.calls[1][0]).toContain('is_active');
    });
    
    it('should update multiple fields at once', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }).mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const result = await autoApprovalService.updateRule(1, 1, { ruleName: 'Updated Name', isActive: false, timeRestrictions: { days: ['mon'] } });
      expect(result.success).toBe(true);
    });
  });
  
  describe('deleteRule', () => {
    it('should delete rule successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const result = await autoApprovalService.deleteRule(1, 1);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Rule deleted');
    });
    
    it('should return error when rule not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await autoApprovalService.deleteRule(999, 1);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Rule not found or access denied');
    });
    
    it('should not delete rule owned by different resident', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await autoApprovalService.deleteRule(1, 999);
      expect(result.success).toBe(false);
    });
  });
  
  describe('checkAutoApproval', () => {
    it('should return approved when matching rule exists', async () => {
      const criteria = { visitorName: 'john doe', visitorPhone: '254712345678' };
      const encryptedCriteria = createEncryptedCriteria(criteria);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, match_criteria_encrypted: encryptedCriteria, time_restrictions: {} }] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });
      const result = await autoApprovalService.checkAutoApproval(1, 'John Doe', '+254712345678');
      expect(result.approved).toBe(true);
      expect(result.reason).toBe('auto_approved');
      expect(result.displayMessage).toBe('Auto-approved by resident');
    });
    
    it('should return not approved when no matching rules', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await autoApprovalService.checkAutoApproval(1, 'Unknown Person', '+000000000');
      expect(result.approved).toBe(false);
      expect(result.reason).toBe('no_matching_rule');
    });
    
    it('should match by partial name', async () => {
      const criteria = { visitorName: 'john', visitorPhone: '' };
      const encryptedCriteria = createEncryptedCriteria(criteria);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, match_criteria_encrypted: encryptedCriteria, time_restrictions: {} }] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });
      const result = await autoApprovalService.checkAutoApproval(1, 'John Doe', '');
      expect(result.approved).toBe(true);
    });
    
    it('should match by partial phone', async () => {
      const criteria = { visitorName: '', visitorPhone: '712345678' };
      const encryptedCriteria = createEncryptedCriteria(criteria);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, match_criteria_encrypted: encryptedCriteria, time_restrictions: {} }] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });
      const result = await autoApprovalService.checkAutoApproval(1, '', '+254712345678');
      expect(result.approved).toBe(true);
    });
    
    it('should not approve when day restriction does not match', async () => {
      const criteria = { visitorName: 'john', visitorPhone: '' };
      const encryptedCriteria = createEncryptedCriteria(criteria);
      const today = new Date().getDay();
      const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const notToday = daysOfWeek[(today + 1) % 7];
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, match_criteria_encrypted: encryptedCriteria, time_restrictions: { days: [notToday] } }] });
      const result = await autoApprovalService.checkAutoApproval(1, 'John', '');
      expect(result.approved).toBe(false);
    });
    
    it('should approve when day restriction matches', async () => {
      const criteria = { visitorName: 'john', visitorPhone: '' };
      const encryptedCriteria = createEncryptedCriteria(criteria);
      const today = new Date().getDay();
      const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const todayStr = daysOfWeek[today];
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, match_criteria_encrypted: encryptedCriteria, time_restrictions: { days: [todayStr] } }] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });
      const result = await autoApprovalService.checkAutoApproval(1, 'John', '');
      expect(result.approved).toBe(true);
    });
    
    it('should handle decryption failure gracefully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, match_criteria_encrypted: 'invalid:encrypted:data', time_restrictions: {} }] });
      const result = await autoApprovalService.checkAutoApproval(1, 'John', '+123');
      expect(result.approved).toBe(false);
    });
    
    it('should update match count and log on successful match', async () => {
      const criteria = { visitorName: 'john', visitorPhone: '' };
      const encryptedCriteria = createEncryptedCriteria(criteria);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, match_criteria_encrypted: encryptedCriteria, time_restrictions: {} }] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });
      await autoApprovalService.checkAutoApproval(1, 'John', '');
      expect(mockQuery).toHaveBeenCalledTimes(3);
      expect(mockQuery.mock.calls[1][0]).toContain('UPDATE auto_approval_rules');
      expect(mockQuery.mock.calls[2][0]).toContain('INSERT INTO auto_approval_logs');
    });
    
    it('should not approve when time window does not match', async () => {
      const criteria = { visitorName: 'john', visitorPhone: '' };
      const encryptedCriteria = createEncryptedCriteria(criteria);
      const now = new Date();
      const hourLater = String((now.getHours() + 2) % 24).padStart(2, '0');
      const twoHoursLater = String((now.getHours() + 3) % 24).padStart(2, '0');
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, match_criteria_encrypted: encryptedCriteria, time_restrictions: { start_time: hourLater + ':00', end_time: twoHoursLater + ':00' } }] });
      const result = await autoApprovalService.checkAutoApproval(1, 'John', '');
      expect(result.approved).toBe(false);
    });
    
    it('should not match when neither name nor phone matches', async () => {
      const criteria = { visitorName: 'specific name', visitorPhone: '999999999' };
      const encryptedCriteria = createEncryptedCriteria(criteria);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, match_criteria_encrypted: encryptedCriteria, time_restrictions: {} }] });
      const result = await autoApprovalService.checkAutoApproval(1, 'Different Name', '+123456789');
      expect(result.approved).toBe(false);
    });
  });
  
  describe('getAutoApprovalStats', () => {
    it('should return aggregate stats', async () => {
      const stats = { residents_using_rules: 10, total_rules: 25, active_rules: 20, total_auto_approvals: 100, approvals_today: 5, approvals_this_week: 30 };
      mockQuery.mockResolvedValueOnce({ rows: [stats] });
      const result = await autoApprovalService.getAutoApprovalStats();
      expect(result.residents_using_rules).toBe(10);
      expect(result.total_rules).toBe(25);
      expect(result.active_rules).toBe(20);
      expect(result.total_auto_approvals).toBe(100);
      expect(result.approvals_today).toBe(5);
      expect(result.approvals_this_week).toBe(30);
    });
    
    it('should return zero values when no data', async () => {
      const emptyStats = { residents_using_rules: 0, total_rules: 0, active_rules: 0, total_auto_approvals: 0, approvals_today: 0, approvals_this_week: 0 };
      mockQuery.mockResolvedValueOnce({ rows: [emptyStats] });
      const result = await autoApprovalService.getAutoApprovalStats();
      expect(result.total_rules).toBe(0);
    });
  });
  
  describe('getResidentApprovalHistory', () => {
    it('should return residents approval history', async () => {
      const history = [{ id: 1, approved_at: new Date(), reason: 'auto_approved', visitor_name: 'John', rule_name: 'Family' }];
      mockQuery.mockResolvedValueOnce({ rows: history });
      const result = await autoApprovalService.getResidentApprovalHistory(1);
      expect(result).toHaveLength(1);
      expect(result[0].visitor_name).toBe('John');
    });
    
    it('should use default limit of 20', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await autoApprovalService.getResidentApprovalHistory(1);
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [1, 20]);
    });
    
    it('should use custom limit when provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await autoApprovalService.getResidentApprovalHistory(1, 50);
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [1, 50]);
    });
    
    it('should return empty array when no history', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await autoApprovalService.getResidentApprovalHistory(1);
      expect(result).toEqual([]);
    });
  });
  
  describe('deleteAllResidentRules', () => {
    it('should delete all rules for resident', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 5, rows: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }] });
      const result = await autoApprovalService.deleteAllResidentRules(1);
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(5);
      expect(result.message).toBe('All auto-approval rules deleted');
    });
    
    it('should handle case when no rules to delete', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      const result = await autoApprovalService.deleteAllResidentRules(1);
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(0);
    });
  });
  
  describe('exportResidentRules', () => {
    it('should export all resident rules', async () => {
      const encryptedCriteria = createEncryptedCriteria({ visitorName: 'john', visitorPhone: '123' });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, rule_name: 'Rule 1', match_criteria_encrypted: encryptedCriteria, time_restrictions: {}, is_active: true, match_count: 10, last_matched_at: new Date(), created_at: new Date() }] });
      const result = await autoApprovalService.exportResidentRules(1);
      expect(result.exportDate).toBeDefined();
      expect(result.residentId).toBe(1);
      expect(result.rulesCount).toBe(1);
      expect(Array.isArray(result.rules)).toBe(true);
      expect(result.rules[0].ruleName).toBe('Rule 1');
    });
    
    it('should return empty export when no rules', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await autoApprovalService.exportResidentRules(1);
      expect(result.rulesCount).toBe(0);
      expect(result.rules).toEqual([]);
    });
    
    it('should include all rule details in export', async () => {
      const criteria = { visitorName: 'test', visitorPhone: '999' };
      const encryptedCriteria = createEncryptedCriteria(criteria);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, rule_name: 'Export Test', match_criteria_encrypted: encryptedCriteria, time_restrictions: { days: ['mon', 'tue'] }, is_active: false, match_count: 5, last_matched_at: null, created_at: new Date() }] });
      const result = await autoApprovalService.exportResidentRules(1);
      expect(result.rules[0]).toHaveProperty('ruleName');
      expect(result.rules[0]).toHaveProperty('matchCriteria');
      expect(result.rules[0]).toHaveProperty('timeRestrictions');
      expect(result.rules[0]).toHaveProperty('isActive');
      expect(result.rules[0]).toHaveProperty('matchCount');
    });
  });
  
  describe('Default Export', () => {
    it('should export all functions', () => {
      expect(autoApprovalService.default).toBeDefined();
      expect(autoApprovalService.default.RULE_CATEGORIES).toBeDefined();
      expect(autoApprovalService.default.createRule).toBeDefined();
      expect(autoApprovalService.default.getResidentRules).toBeDefined();
      expect(autoApprovalService.default.updateRule).toBeDefined();
      expect(autoApprovalService.default.deleteRule).toBeDefined();
      expect(autoApprovalService.default.checkAutoApproval).toBeDefined();
      expect(autoApprovalService.default.getAutoApprovalStats).toBeDefined();
      expect(autoApprovalService.default.getResidentApprovalHistory).toBeDefined();
      expect(autoApprovalService.default.deleteAllResidentRules).toBeDefined();
      expect(autoApprovalService.default.exportResidentRules).toBeDefined();
    });
  });
});
