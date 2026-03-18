/**
 * Unit Tests for Consent Middleware
 * 
 * Tests consent validation, recording, withdrawal, and Kenya DPA 2019 compliance.
 * Priority: P0 (Critical Security Component)
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies before importing the module
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: {
    query: jest.fn()
  }
}));

jest.unstable_mockModule('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234')
}));

// Import after mocking
const { dbManager } = await import('../../src/database/db.enhanced.js');
const { v4: uuidv4 } = await import('uuid');

const {
  createConsentMiddleware,
  recordConsent,
  withdrawConsent,
  getUserConsentHistory,
  getConsentStatistics,
  isConsentValid,
  getRequiredConsentsForEndpoint,
  validateConsent,
  requireConsentWithdrawal,
  CONSENT_TYPES,
  CONSENT_STATUS
} = await import('../../src/middleware/consentMiddleware.js');

describe('Consent Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      path: '/api/protected',
      user: { id: 'user-123' },
      ip: '192.168.1.1',
      get: jest.fn((header) => {
        if (header === 'User-Agent') return 'Mozilla/5.0';
        return null;
      })
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // ============================================
  // CONSENT_TYPES and CONSENT_STATUS Constants
  // ============================================
  describe('Constants', () => {
    it('should export all required consent types', () => {
      expect(CONSENT_TYPES).toBeDefined();
      expect(CONSENT_TYPES.DATA_COLLECTION).toBe('data_collection');
      expect(CONSENT_TYPES.DATA_PROCESSING).toBe('data_processing');
      expect(CONSENT_TYPES.DATA_STORAGE).toBe('data_storage');
      expect(CONSENT_TYPES.DATA_SHARING).toBe('data_sharing');
      expect(CONSENT_TYPES.EMAIL_NOTIFICATIONS).toBe('email_notifications');
      expect(CONSENT_TYPES.SMS_NOTIFICATIONS).toBe('sms_notifications');
      expect(CONSENT_TYPES.PUSH_NOTIFICATIONS).toBe('push_notifications');
      expect(CONSENT_TYPES.MARKETING_COMMUNICATIONS).toBe('marketing_communications');
      expect(CONSENT_TYPES.ACCESS_CONTROL).toBe('access_control');
      expect(CONSENT_TYPES.SECURITY_MONITORING).toBe('security_monitoring');
      expect(CONSENT_TYPES.SYSTEM_IMPROVEMENT).toBe('system_improvement');
      expect(CONSENT_TYPES.ANALYTICS).toBe('analytics');
      expect(CONSENT_TYPES.BIOMETRIC_DATA).toBe('biometric_data');
      expect(CONSENT_TYPES.LOCATION_DATA).toBe('location_data');
      expect(CONSENT_TYPES.BEHAVIORAL_DATA).toBe('behavioral_data');
    });

    it('should export all required consent statuses', () => {
      expect(CONSENT_STATUS).toBeDefined();
      expect(CONSENT_STATUS.GIVEN).toBe('given');
      expect(CONSENT_STATUS.WITHDRAWN).toBe('withdrawn');
      expect(CONSENT_STATUS.PENDING).toBe('pending');
      expect(CONSENT_STATUS.EXPIRED).toBe('expired');
    });
  });

  // ============================================
  // createConsentMiddleware Tests
  // ============================================
  describe('createConsentMiddleware', () => {
    it('should skip consent check for public health endpoint', async () => {
      mockReq.path = '/health';
      const middleware = createConsentMiddleware([CONSENT_TYPES.DATA_PROCESSING]);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(dbManager.query).not.toHaveBeenCalled();
    });

    it('should skip consent check for /api/health endpoint', async () => {
      mockReq.path = '/api/health';
      const middleware = createConsentMiddleware([CONSENT_TYPES.DATA_PROCESSING]);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip consent check for /api/auth/login endpoint', async () => {
      mockReq.path = '/api/auth/login';
      const middleware = createConsentMiddleware([CONSENT_TYPES.DATA_PROCESSING]);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip consent check for /api/auth/register endpoint', async () => {
      mockReq.path = '/api/auth/register';
      const middleware = createConsentMiddleware([CONSENT_TYPES.DATA_PROCESSING]);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip consent check for canonical /api/privacy/consent endpoints', async () => {
      mockReq.path = '/api/privacy/consent/required';
      const middleware = createConsentMiddleware([CONSENT_TYPES.DATA_PROCESSING]);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip consent check for legacy /api/consent endpoints', async () => {
      mockReq.path = '/api/consent/required';
      const middleware = createConsentMiddleware([CONSENT_TYPES.DATA_PROCESSING]);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip consent check for /api-docs endpoint', async () => {
      mockReq.path = '/api-docs/swagger';
      const middleware = createConsentMiddleware([CONSENT_TYPES.DATA_PROCESSING]);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip consent check if no user context', async () => {
      mockReq.user = null;
      const middleware = createConsentMiddleware([CONSENT_TYPES.DATA_PROCESSING]);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(dbManager.query).not.toHaveBeenCalled();
    });

    it('should skip consent check if user id is undefined', async () => {
      mockReq.user = {};
      const middleware = createConsentMiddleware([CONSENT_TYPES.DATA_PROCESSING]);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow request when no required consents specified', async () => {
      const middleware = createConsentMiddleware([]);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow request when all required consents are given', async () => {
      dbManager.query.mockResolvedValueOnce({
        rows: [
          { consent_type: 'data_processing', status: 'given', given_at: new Date(), expires_at: null }
        ]
      });

      const middleware = createConsentMiddleware([CONSENT_TYPES.DATA_PROCESSING]);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.consentStatus).toBeDefined();
      expect(mockReq.consentStatus.allConsentsGiven).toBe(true);
    });

    it('should allow request when multiple required consents are given', async () => {
      dbManager.query.mockResolvedValueOnce({
        rows: [
          { consent_type: 'data_processing', status: 'given', given_at: new Date(), expires_at: null },
          { consent_type: 'data_collection', status: 'given', given_at: new Date(), expires_at: null }
        ]
      });

      const middleware = createConsentMiddleware([CONSENT_TYPES.DATA_PROCESSING, CONSENT_TYPES.DATA_COLLECTION]);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.consentStatus.allConsentsGiven).toBe(true);
    });

    it('should return 403 when consent is missing', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });

      const middleware = createConsentMiddleware([CONSENT_TYPES.DATA_PROCESSING]);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Consent required for data processing',
        error: expect.objectContaining({
          code: 'CONSENT_REQUIRED',
          details: expect.objectContaining({
            missingConsents: [CONSENT_TYPES.DATA_PROCESSING]
          })
        })
      }));
    });

    it('should return 403 when some consents are missing', async () => {
      dbManager.query.mockResolvedValueOnce({
        rows: [
          { consent_type: 'data_processing', status: 'given', given_at: new Date(), expires_at: null }
        ]
      });

      const middleware = createConsentMiddleware([
        CONSENT_TYPES.DATA_PROCESSING,
        CONSENT_TYPES.DATA_COLLECTION,
        CONSENT_TYPES.DATA_SHARING
      ]);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          details: expect.objectContaining({
            missingConsents: [CONSENT_TYPES.DATA_COLLECTION, CONSENT_TYPES.DATA_SHARING]
          })
        })
      }));
    });

    it('should set consent status on request when missing consents', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });

      const middleware = createConsentMiddleware([CONSENT_TYPES.DATA_PROCESSING]);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockReq.consentStatus).toBeDefined();
      expect(mockReq.consentStatus.allConsentsGiven).toBe(false);
      expect(mockReq.consentStatus.missingConsents).toContain(CONSENT_TYPES.DATA_PROCESSING);
    });

    it('should return 403 when checkUserConsents fails (returns allConsentsGiven: false)', async () => {
      // checkUserConsents catches errors and returns { allConsentsGiven: false, missingConsents: requiredConsents }
      dbManager.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const middleware = createConsentMiddleware([CONSENT_TYPES.DATA_PROCESSING]);

      await middleware(mockReq, mockRes, mockNext);

      // The error is caught, allConsentsGiven is false, so 403 is returned
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should include consent URL in error response', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });

      const middleware = createConsentMiddleware([CONSENT_TYPES.DATA_PROCESSING]);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          details: expect.objectContaining({
            consentUrl: '/api/privacy/consent/required'
          })
        })
      }));
    });

    it('should include timestamp in error response', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });

      const middleware = createConsentMiddleware([CONSENT_TYPES.DATA_PROCESSING]);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        timestamp: expect.any(String)
      }));
    });
  });

  // ============================================
  // recordConsent Tests
  // ============================================
  describe('recordConsent', () => {
    const userId = 'user-123';
    const consentData = {
      consentType: CONSENT_TYPES.DATA_PROCESSING,
      purpose: 'Data processing for visitor management',
      dataCategories: ['personal_info', 'contact_info'],
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0'
    };

    it('should record consent successfully', async () => {
      const mockResult = {
        rows: [{
          id: 'test-uuid-1234',
          user_id: userId,
          consent_type: consentData.consentType,
          status: CONSENT_STATUS.GIVEN
        }]
      };

      dbManager.query
        .mockResolvedValueOnce(mockResult) // INSERT consent
        .mockResolvedValueOnce({ rows: [] }); // Audit log

      const result = await recordConsent(userId, consentData);

      expect(result).toBeDefined();
      expect(result.consent_type).toBe(CONSENT_TYPES.DATA_PROCESSING);
      expect(dbManager.query).toHaveBeenCalled();
    });

    it('should use default status of GIVEN when not specified', async () => {
      const mockResult = { rows: [{ id: 'test-uuid-1234', status: CONSENT_STATUS.GIVEN }] };
      dbManager.query
        .mockResolvedValueOnce(mockResult)
        .mockResolvedValueOnce({ rows: [] });

      await recordConsent(userId, { consentType: CONSENT_TYPES.DATA_PROCESSING });

      const insertCall = dbManager.query.mock.calls[0];
      expect(insertCall[1]).toContain(CONSENT_STATUS.GIVEN);
    });

    it('should handle custom status', async () => {
      const mockResult = { rows: [{ id: 'test-uuid-1234', status: CONSENT_STATUS.PENDING }] };
      dbManager.query
        .mockResolvedValueOnce(mockResult)
        .mockResolvedValueOnce({ rows: [] });

      await recordConsent(userId, {
        consentType: CONSENT_TYPES.DATA_PROCESSING,
        status: CONSENT_STATUS.PENDING
      });

      const insertCall = dbManager.query.mock.calls[0];
      expect(insertCall[1]).toContain(CONSENT_STATUS.PENDING);
    });

    it('should handle expiration date', async () => {
      const expiresAt = new Date('2025-12-31');
      const mockResult = { rows: [{ id: 'test-uuid-1234' }] };
      dbManager.query
        .mockResolvedValueOnce(mockResult)
        .mockResolvedValueOnce({ rows: [] });

      await recordConsent(userId, {
        consentType: CONSENT_TYPES.DATA_PROCESSING,
        expiresAt
      });

      const insertCall = dbManager.query.mock.calls[0];
      expect(insertCall[1]).toContain(expiresAt);
    });

    it('should throw error on database failure', async () => {
      dbManager.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(recordConsent(userId, consentData)).rejects.toThrow('Database error');
    });

    it('should log consent event after recording', async () => {
      const mockResult = { rows: [{ id: 'test-uuid-1234' }] };
      dbManager.query
        .mockResolvedValueOnce(mockResult)
        .mockResolvedValueOnce({ rows: [] }); // Audit log query

      await recordConsent(userId, consentData);

      // Should have made 2 queries - INSERT and audit log
      expect(dbManager.query).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================
  // withdrawConsent Tests
  // ============================================
  describe('withdrawConsent', () => {
    const userId = 'user-123';
    const consentType = CONSENT_TYPES.DATA_PROCESSING;

    it('should withdraw consent successfully', async () => {
      const mockResult = {
        rows: [{ id: 'consent-id', status: CONSENT_STATUS.WITHDRAWN }]
      };
      dbManager.query
        .mockResolvedValueOnce(mockResult)
        .mockResolvedValueOnce({ rows: [] }); // Audit log

      const result = await withdrawConsent(userId, consentType);

      expect(result.status).toBe(CONSENT_STATUS.WITHDRAWN);
      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_consents'),
        expect.arrayContaining([CONSENT_STATUS.WITHDRAWN, null, userId, consentType])
      );
    });

    it('should include withdrawal reason', async () => {
      const reason = 'User requested data deletion';
      const mockResult = { rows: [{ id: 'consent-id' }] };
      dbManager.query
        .mockResolvedValueOnce(mockResult)
        .mockResolvedValueOnce({ rows: [] });

      await withdrawConsent(userId, consentType, reason);

      const updateCall = dbManager.query.mock.calls[0];
      expect(updateCall[1]).toContain(reason);
    });

    it('should throw error when no active consent found', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });

      await expect(withdrawConsent(userId, consentType))
        .rejects.toThrow('No active consent found to withdraw');
    });

    it('should throw error on database failure', async () => {
      dbManager.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(withdrawConsent(userId, consentType)).rejects.toThrow('Database error');
    });

    it('should log consent withdrawal event', async () => {
      const mockResult = { rows: [{ id: 'consent-id' }] };
      dbManager.query
        .mockResolvedValueOnce(mockResult)
        .mockResolvedValueOnce({ rows: [] });

      await withdrawConsent(userId, consentType);

      // Should have made 2 queries - UPDATE and audit log
      expect(dbManager.query).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================
  // getUserConsentHistory Tests
  // ============================================
  describe('getUserConsentHistory', () => {
    const userId = 'user-123';

    it('should get user consent history with defaults', async () => {
      const mockRows = [
        { consent_type: 'data_processing', status: 'given', given_at: new Date() },
        { consent_type: 'data_collection', status: 'withdrawn', given_at: new Date() }
      ];
      dbManager.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await getUserConsentHistory(userId);

      expect(result).toEqual(mockRows);
      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        expect.arrayContaining([userId, 50, 0])
      );
    });

    it('should filter by consent type', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });

      await getUserConsentHistory(userId, { consentType: CONSENT_TYPES.DATA_PROCESSING });

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('consent_type = $2'),
        expect.arrayContaining([userId, CONSENT_TYPES.DATA_PROCESSING])
      );
    });

    it('should filter by status', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });

      await getUserConsentHistory(userId, { status: CONSENT_STATUS.GIVEN });

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('status ='),
        expect.arrayContaining([userId, CONSENT_STATUS.GIVEN])
      );
    });

    it('should handle pagination', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });

      await getUserConsentHistory(userId, { limit: 10, offset: 20 });

      const queryCall = dbManager.query.mock.calls[0];
      expect(queryCall[1]).toContain(10);
      expect(queryCall[1]).toContain(20);
    });

    it('should throw error on database failure', async () => {
      dbManager.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(getUserConsentHistory(userId)).rejects.toThrow('Database error');
    });
  });

  // ============================================
  // getConsentStatistics Tests
  // ============================================
  describe('getConsentStatistics', () => {
    it('should return consent statistics', async () => {
      const mockStats = [
        { consent_type: 'data_processing', status: 'given', count: '100' },
        { consent_type: 'data_processing', status: 'withdrawn', count: '10' }
      ];
      dbManager.query.mockResolvedValueOnce({ rows: mockStats });

      const result = await getConsentStatistics();

      expect(result).toEqual(mockStats);
      expect(dbManager.query).toHaveBeenCalledWith(expect.stringContaining('GROUP BY'));
    });

    it('should throw error on database failure', async () => {
      dbManager.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(getConsentStatistics()).rejects.toThrow('Database error');
    });
  });

  // ============================================
  // isConsentValid Tests
  // ============================================
  describe('isConsentValid', () => {
    const userId = 'user-123';
    const consentType = CONSENT_TYPES.DATA_PROCESSING;

    it('should return true for valid consent', async () => {
      dbManager.query.mockResolvedValueOnce({
        rows: [{ id: 'consent-id', status: 'given', expires_at: null }]
      });

      const result = await isConsentValid(userId, consentType);

      expect(result).toBe(true);
    });

    it('should return false when no consent found', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });

      const result = await isConsentValid(userId, consentType);

      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      dbManager.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await isConsentValid(userId, consentType);

      expect(result).toBe(false);
    });

    it('should check for non-expired consent', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });

      await isConsentValid(userId, consentType);

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('expires_at IS NULL OR expires_at > NOW()'),
        expect.any(Array)
      );
    });

    it('should only check for given status', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });

      await isConsentValid(userId, consentType);

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'given'"),
        expect.any(Array)
      );
    });
  });

  // ============================================
  // getRequiredConsentsForEndpoint Tests
  // ============================================
  describe('getRequiredConsentsForEndpoint', () => {
    it('should return required consents for registration', () => {
      const consents = getRequiredConsentsForEndpoint('/api/auth/register');

      expect(consents).toContain(CONSENT_TYPES.DATA_COLLECTION);
      expect(consents).toContain(CONSENT_TYPES.DATA_PROCESSING);
    });

    it('should return required consents for login', () => {
      const consents = getRequiredConsentsForEndpoint('/api/auth/login');

      expect(consents).toContain(CONSENT_TYPES.DATA_PROCESSING);
    });

    it('should return required consents for visitors', () => {
      const consents = getRequiredConsentsForEndpoint('/api/visitors');

      expect(consents).toContain(CONSENT_TYPES.DATA_COLLECTION);
      expect(consents).toContain(CONSENT_TYPES.DATA_PROCESSING);
    });

    it('should return required consents for bulk invite', () => {
      const consents = getRequiredConsentsForEndpoint('/api/visitors/bulk-invite');

      expect(consents).toContain(CONSENT_TYPES.DATA_SHARING);
    });

    it('should return required consents for admin metrics', () => {
      const consents = getRequiredConsentsForEndpoint('/api/admin/metrics');

      expect(consents).toContain(CONSENT_TYPES.ANALYTICS);
    });

    it('should return required consents for audit logs', () => {
      const consents = getRequiredConsentsForEndpoint('/api/admin/audit-logs');

      expect(consents).toContain(CONSENT_TYPES.SECURITY_MONITORING);
    });

    it('should return required consents for notifications', () => {
      const consents = getRequiredConsentsForEndpoint('/api/notifications');

      expect(consents).toContain(CONSENT_TYPES.EMAIL_NOTIFICATIONS);
      expect(consents).toContain(CONSENT_TYPES.SMS_NOTIFICATIONS);
    });

    it('should return empty array for unknown endpoints', () => {
      const consents = getRequiredConsentsForEndpoint('/api/unknown/endpoint');

      expect(consents).toEqual([]);
    });
  });

  // ============================================
  // validateConsent Middleware Tests
  // ============================================
  describe('validateConsent', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = null;
      const middleware = validateConsent(CONSENT_TYPES.DATA_PROCESSING);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Authentication required',
        error: { code: 'AUTH_REQUIRED' }
      }));
    });

    it('should return 403 when consent is not valid', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });
      const middleware = validateConsent(CONSENT_TYPES.DATA_PROCESSING);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Valid consent required',
        error: expect.objectContaining({
          code: 'CONSENT_INVALID',
          details: { requiredConsent: CONSENT_TYPES.DATA_PROCESSING }
        })
      }));
    });

    it('should call next when consent is valid', async () => {
      dbManager.query.mockResolvedValueOnce({
        rows: [{ id: 'consent-id', status: 'given' }]
      });
      const middleware = validateConsent(CONSENT_TYPES.DATA_PROCESSING);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 when isConsentValid fails (returns false on error)', async () => {
      // isConsentValid catches errors and returns false, so validateConsent
      // sees it as invalid consent, not as an error
      dbManager.query.mockRejectedValueOnce(new Error('Database error'));
      const middleware = validateConsent(CONSENT_TYPES.DATA_PROCESSING);

      await middleware(mockReq, mockRes, mockNext);

      // isConsentValid returns false on error, so we get 403 CONSENT_INVALID
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Valid consent required',
        error: expect.objectContaining({
          code: 'CONSENT_INVALID'
        })
      }));
    });
  });

  // ============================================
  // requireConsentWithdrawal Middleware Tests
  // ============================================
  describe('requireConsentWithdrawal', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = null;
      const middleware = requireConsentWithdrawal(CONSENT_TYPES.DATA_PROCESSING);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: { code: 'AUTH_REQUIRED' }
      }));
    });

    it('should return 400 when no active consent to withdraw', async () => {
      dbManager.query.mockResolvedValueOnce({ rows: [] });
      const middleware = requireConsentWithdrawal(CONSENT_TYPES.DATA_PROCESSING);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'No active consent to withdraw',
        error: { code: 'NO_ACTIVE_CONSENT' }
      }));
    });

    it('should call next when active consent exists', async () => {
      dbManager.query.mockResolvedValueOnce({
        rows: [{ id: 'consent-id', status: 'given' }]
      });
      const middleware = requireConsentWithdrawal(CONSENT_TYPES.DATA_PROCESSING);

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 400 when isConsentValid fails (returns false on error)', async () => {
      // isConsentValid catches errors and returns false, so requireConsentWithdrawal
      // sees it as no active consent, not as an error
      dbManager.query.mockRejectedValueOnce(new Error('Database error'));
      const middleware = requireConsentWithdrawal(CONSENT_TYPES.DATA_PROCESSING);

      await middleware(mockReq, mockRes, mockNext);

      // isConsentValid returns false on error, so we get 400 NO_ACTIVE_CONSENT
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: { code: 'NO_ACTIVE_CONSENT' }
      }));
    });
  });

  // ============================================
  // Integration Scenarios
  // ============================================
  describe('Integration Scenarios', () => {
    it('should handle complete consent lifecycle', async () => {
      const userId = 'user-123';
      const consentType = CONSENT_TYPES.DATA_PROCESSING;

      // 1. Check consent - initially false
      dbManager.query.mockResolvedValueOnce({ rows: [] });
      let isValid = await isConsentValid(userId, consentType);
      expect(isValid).toBe(false);

      // 2. Record consent
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ id: 'consent-id', status: 'given' }] })
        .mockResolvedValueOnce({ rows: [] }); // Audit log

      await recordConsent(userId, { consentType });

      // 3. Check consent - now true
      dbManager.query.mockResolvedValueOnce({
        rows: [{ id: 'consent-id', status: 'given' }]
      });
      isValid = await isConsentValid(userId, consentType);
      expect(isValid).toBe(true);

      // 4. Withdraw consent
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ id: 'consent-id', status: 'withdrawn' }] })
        .mockResolvedValueOnce({ rows: [] }); // Audit log

      await withdrawConsent(userId, consentType, 'User request');

      // 5. Check consent - now false
      dbManager.query.mockResolvedValueOnce({ rows: [] });
      isValid = await isConsentValid(userId, consentType);
      expect(isValid).toBe(false);
    });

    it('should enforce consent requirements in protected routes', async () => {
      const middleware = createConsentMiddleware([
        CONSENT_TYPES.DATA_PROCESSING,
        CONSENT_TYPES.DATA_COLLECTION
      ]);

      // First request - missing consents
      dbManager.query.mockResolvedValueOnce({ rows: [] });
      await middleware(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);

      // Reset mocks
      jest.clearAllMocks();

      // Second request - all consents given
      dbManager.query.mockResolvedValueOnce({
        rows: [
          { consent_type: 'data_processing', status: 'given' },
          { consent_type: 'data_collection', status: 'given' }
        ]
      });

      await middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle GDPR-compliant data subject rights', async () => {
      const userId = 'user-123';

      // User gets consent history
      dbManager.query.mockResolvedValueOnce({
        rows: [
          { consent_type: 'data_processing', status: 'given', given_at: new Date() },
          { consent_type: 'marketing_communications', status: 'given', given_at: new Date() }
        ]
      });

      const history = await getUserConsentHistory(userId);
      expect(history).toHaveLength(2);

      // User withdraws marketing consent
      dbManager.query
        .mockResolvedValueOnce({ rows: [{ id: 'consent-id', status: 'withdrawn' }] })
        .mockResolvedValueOnce({ rows: [] });

      await withdrawConsent(userId, CONSENT_TYPES.MARKETING_COMMUNICATIONS, 'Right to object');

      // Verify withdrawn
      dbManager.query.mockResolvedValueOnce({ rows: [] });
      const isMarketingValid = await isConsentValid(userId, CONSENT_TYPES.MARKETING_COMMUNICATIONS);
      expect(isMarketingValid).toBe(false);
    });
  });
});
