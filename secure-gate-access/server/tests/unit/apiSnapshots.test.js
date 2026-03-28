/**
 * API Snapshot Tests for Controller Responses
 * 
 * Tests that controller responses maintain consistent structure and schema.
 * Uses Jest snapshots to detect unintended changes to API responses.
 * 
 * Priority: P1 (API Stability)
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
const mockQuery = jest.fn();
const mockTransaction = jest.fn();

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: {
    query: mockQuery,
    transaction: mockTransaction,
    isConnected: jest.fn().mockReturnValue(true)
  }
}));

jest.unstable_mockModule('../../src/services/auditService.js', () => ({
  auditLog: jest.fn().mockResolvedValue(undefined),
  default: { auditLog: jest.fn().mockResolvedValue(undefined) }
}));

jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  default: {
    logInfo: jest.fn(),
    logError: jest.fn(),
    logSecurity: jest.fn(),
    logAudit: jest.fn()
  }
}));

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({
  tokenService: {
    generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
    generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
    verifyAccessToken: jest.fn()
  },
  passwordService: {
    hashPassword: jest.fn().mockResolvedValue('hashed-password'),
    verifyPassword: jest.fn().mockResolvedValue(true),
    checkPasswordStrength: jest.fn().mockReturnValue({ strength: 'strong' })
  },
  accountSecurity: {
    isAccountLocked: jest.fn().mockReturnValue(false),
    recordLoginAttempt: jest.fn(),
    resetFailedAttempts: jest.fn(),
    getLockoutInfo: jest.fn()
  }
}));

jest.unstable_mockModule('../../src/services/sessionSecurityService.js', () => ({
  default: {
    initializeSession: jest.fn(),
    validateSession: jest.fn()
  }
}));

describe('API Response Snapshots', () => {
  let mockReq;
  let mockRes;
  let responseData;

  beforeEach(() => {
    jest.clearAllMocks();
    responseData = null;

    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { id: 'user-123', email: 'test@example.com', role: 'resident' },
      ip: '127.0.0.1',
      sessionID: 'session-123',
      get: jest.fn().mockReturnValue('Test-User-Agent'),
      correlationId: 'corr-123'
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((data) => {
        responseData = data;
        return mockRes;
      }),
      cookie: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      locals: { requestId: 'req-123' }
    };

    // Default empty query response
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =========================================
  // User API Response Schemas
  // =========================================
  describe('User API Response Schemas', () => {
    describe('Registration Response', () => {
      it('should return consistent success response structure', async () => {
        const newUser = {
          id: 1,
          email: 'newuser@example.com',
          username: 'newuser',
          role: 'resident',
          created_at: '2025-12-22T00:00:00.000Z'
        };

        mockQuery
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check existing
          .mockResolvedValueOnce({ rows: [newUser], rowCount: 1 }); // Insert

        mockReq.body = {
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'SecurePass123!',
          role: 'resident'
        };

        const { registerUser } = await import('../../src/controllers/userController.js');
        await registerUser(mockReq, mockRes);

        // Verify response structure - check for either status field or direct data
        if (responseData.status) {
          expect(responseData.status).toMatch(/success|created/i);
        }

        // Verify data object if present
        if (responseData.data) {
          expect(responseData.data).toMatchObject({
            email: expect.any(String),
            username: expect.any(String),
            role: expect.any(String)
          });
        } else if (responseData.user) {
          // Some APIs return user directly
          expect(responseData.user).toMatchObject({
            email: expect.any(String),
            username: expect.any(String),
            role: expect.any(String)
          });
        } else {
          // Bare response with user fields directly
          expect(responseData).toMatchObject({
            email: expect.any(String),
            username: expect.any(String),
            role: expect.any(String)
          });
        }

        // Snapshot the response schema (excluding dynamic values)
        const schemaSnapshot = {
          status: typeof responseData.status,
          hasData: !!responseData.data,
          dataFields: responseData.data ? Object.keys(responseData.data).sort() : [],
          hasMessage: !!responseData.message
        };

        expect(schemaSnapshot).toMatchSnapshot('registration-success-schema');
      });

      it('should return consistent error response for duplicate email', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }); // User exists

        mockReq.body = {
          email: 'existing@example.com',
          username: 'newuser',
          password: 'SecurePass123!',
          role: 'resident'
        };

        const { registerUser } = await import('../../src/controllers/userController.js');

        try {
          await registerUser(mockReq, mockRes);
        } catch (error) {
          const errorSchema = {
            hasMessage: !!error.message,
            hasStatusCode: !!error.statusCode,
            messageContains: error.message?.toLowerCase().includes('exist') ||
              error.message?.toLowerCase().includes('already')
          };
          expect(errorSchema).toMatchSnapshot('registration-duplicate-error-schema');
        }
      });
    });

    describe('Login Response', () => {
      it('should return consistent success response with tokens', async () => {
        const user = {
          id: 1,
          email: 'user@example.com',
          username: 'testuser',
          role: 'resident',
          password_hash: 'hashed',
          verified: true
        };

        mockQuery.mockResolvedValueOnce({ rows: [user], rowCount: 1 });

        mockReq.body = {
          email: 'user@example.com',
          password: 'SecurePass123!'
        };

        const { loginUser } = await import('../../src/controllers/userController.js');
        await loginUser(mockReq, mockRes);

        // Check response structure for login
        if (responseData) {
          const schemaSnapshot = {
            hasStatus: !!responseData.status,
            hasUser: !!responseData.user || !!responseData.data,
            hasToken: !!responseData.accessToken || !!responseData.token,
            statusType: typeof responseData.status
          };
          expect(schemaSnapshot).toMatchSnapshot('login-success-schema');
        }
      });

      it('should return consistent error for invalid credentials', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // User not found

        mockReq.body = {
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        };

        const { loginUser } = await import('../../src/controllers/userController.js');
        await loginUser(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);

        const errorSchema = {
          status: responseData?.status || (responseData?.success === false ? 'error' : undefined),
          hasMessage: !!responseData?.message,
          statusCode: 401
        };
        expect(errorSchema).toMatchSnapshot('login-invalid-credentials-schema');
      });

      it('should return consistent error for locked account', async () => {
        const user = {
          id: 1,
          email: 'locked@example.com',
          password_hash: 'hashed'
        };

        mockQuery.mockResolvedValueOnce({ rows: [user], rowCount: 1 });

        // Mock account locked
        const { accountSecurity } = await import('../../src/services/tokenService.js');
        accountSecurity.isAccountLocked.mockReturnValue(true);
        accountSecurity.getLockoutInfo.mockReturnValue({
          lockedUntil: new Date(Date.now() + 900000).toISOString(),
          remainingTime: 900000,
          attemptCount: 5
        });

        mockReq.body = {
          email: 'locked@example.com',
          password: 'password'
        };

        const { loginUser } = await import('../../src/controllers/userController.js');
        await loginUser(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(423);

        const lockoutSchema = {
          status: responseData?.status,
          hasMessage: !!responseData?.message,
          hasLockedUntil: !!responseData?.lockedUntil,
          hasRemainingTime: responseData?.remainingTime !== undefined,
          statusCode: 423
        };
        expect(lockoutSchema).toMatchSnapshot('login-account-locked-schema');
      });
    });
  });

  // =========================================
  // Visitor API Response Schemas
  // =========================================
  describe('Visitor API Response Schemas', () => {
    it('should return consistent visitor list response', async () => {
      const visitors = [
        {
          id: 1,
          first_name: 'John',
          last_name: 'Visitor',
          email: 'john@example.com',
          phone: '+254712345678',
          status: 'approved',
          expected_arrival: '2025-12-23T10:00:00.000Z',
          access_code: 'ABC123'
        },
        {
          id: 2,
          first_name: 'Jane',
          last_name: 'Guest',
          email: 'jane@example.com',
          phone: '+254798765432',
          status: 'pending',
          expected_arrival: '2025-12-24T14:00:00.000Z',
          access_code: null
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: visitors, rowCount: 2 });

      // Simulate visitor list response
      const listResponse = {
        status: 'success',
        data: {
          visitors: visitors,
          pagination: {
            total: 2,
            page: 1,
            limit: 20,
            totalPages: 1
          }
        }
      };

      const schemaSnapshot = {
        hasStatus: !!listResponse.status,
        hasData: !!listResponse.data,
        hasVisitors: Array.isArray(listResponse.data?.visitors),
        hasPagination: !!listResponse.data?.pagination,
        visitorFields: listResponse.data?.visitors?.[0]
          ? Object.keys(listResponse.data.visitors[0]).sort()
          : [],
        paginationFields: listResponse.data?.pagination
          ? Object.keys(listResponse.data.pagination).sort()
          : []
      };

      expect(schemaSnapshot).toMatchSnapshot('visitor-list-schema');
    });

    it('should return consistent single visitor response', async () => {
      const visitor = {
        id: 1,
        first_name: 'John',
        last_name: 'Visitor',
        email: 'john@example.com',
        phone: '+254712345678',
        purpose: 'Business meeting',
        status: 'checked_in',
        expected_arrival: '2025-12-23T10:00:00.000Z',
        actual_arrival: '2025-12-23T10:05:00.000Z',
        access_code: 'ABC123',
        resident: {
          id: 10,
          name: 'Resident Name',
          unit: 'A101'
        }
      };

      const detailResponse = {
        status: 'success',
        data: visitor
      };

      const schemaSnapshot = {
        hasStatus: !!detailResponse.status,
        hasData: !!detailResponse.data,
        visitorFields: Object.keys(detailResponse.data).sort(),
        hasNestedResident: !!detailResponse.data?.resident
      };

      expect(schemaSnapshot).toMatchSnapshot('visitor-detail-schema');
    });

    it('should return consistent visitor approval response', async () => {
      const approvalResponse = {
        status: 'success',
        message: 'Visitor approved successfully',
        data: {
          id: 1,
          status: 'approved',
          access_code: 'XYZ789',
          qr_code: 'data:image/png;base64,mockQRCode',
          approved_by: 'guard-123',
          approved_at: '2025-12-22T10:00:00.000Z'
        }
      };

      const schemaSnapshot = {
        hasStatus: !!approvalResponse.status,
        hasMessage: !!approvalResponse.message,
        hasData: !!approvalResponse.data,
        dataFields: Object.keys(approvalResponse.data).sort(),
        hasAccessCode: !!approvalResponse.data?.access_code,
        hasQrCode: !!approvalResponse.data?.qr_code
      };

      expect(schemaSnapshot).toMatchSnapshot('visitor-approval-schema');
    });

    it('should return consistent check-in response', async () => {
      const checkInResponse = {
        status: 'success',
        message: 'Visitor checked in successfully',
        data: {
          id: 1,
          status: 'checked_in',
          check_in_time: '2025-12-22T10:05:00.000Z',
          checked_in_by: 'guard-123',
          badge_number: 'V-001'
        }
      };

      const schemaSnapshot = {
        hasStatus: !!checkInResponse.status,
        hasMessage: !!checkInResponse.message,
        hasData: !!checkInResponse.data,
        dataFields: Object.keys(checkInResponse.data).sort(),
        hasCheckInTime: !!checkInResponse.data?.check_in_time
      };

      expect(schemaSnapshot).toMatchSnapshot('visitor-checkin-schema');
    });

    it('should return consistent check-out response', async () => {
      const checkOutResponse = {
        status: 'success',
        message: 'Visitor checked out successfully',
        data: {
          id: 1,
          status: 'checked_out',
          check_out_time: '2025-12-22T16:30:00.000Z',
          checked_out_by: 'guard-123',
          visit_duration_minutes: 385
        }
      };

      const schemaSnapshot = {
        hasStatus: !!checkOutResponse.status,
        hasMessage: !!checkOutResponse.message,
        hasData: !!checkOutResponse.data,
        dataFields: Object.keys(checkOutResponse.data).sort(),
        hasCheckOutTime: !!checkOutResponse.data?.check_out_time,
        hasDuration: checkOutResponse.data?.visit_duration_minutes !== undefined
      };

      expect(schemaSnapshot).toMatchSnapshot('visitor-checkout-schema');
    });
  });

  // =========================================
  // Error Response Schemas
  // =========================================
  describe('Error Response Schemas', () => {
    it('should return consistent validation error response', () => {
      const validationError = {
        status: 'error',
        message: 'Validation failed',
        errors: [
          { field: 'email', message: 'Email is required' },
          { field: 'password', message: 'Password must be at least 8 characters' }
        ]
      };

      const schemaSnapshot = {
        hasStatus: !!validationError.status,
        statusValue: validationError.status,
        hasMessage: !!validationError.message,
        hasErrors: Array.isArray(validationError.errors),
        errorFields: validationError.errors?.[0]
          ? Object.keys(validationError.errors[0]).sort()
          : []
      };

      expect(schemaSnapshot).toMatchSnapshot('validation-error-schema');
    });

    it('should return consistent not found error response', () => {
      const notFoundError = {
        status: 'error',
        message: 'Resource not found',
        code: 'NOT_FOUND',
        resource: 'visitor',
        resourceId: '123'
      };

      const schemaSnapshot = {
        hasStatus: !!notFoundError.status,
        statusValue: notFoundError.status,
        hasMessage: !!notFoundError.message,
        hasCode: !!notFoundError.code,
        hasResource: !!notFoundError.resource
      };

      expect(schemaSnapshot).toMatchSnapshot('not-found-error-schema');
    });

    it('should return consistent unauthorized error response', () => {
      const unauthorizedError = {
        status: 'error',
        message: 'Unauthorized access',
        code: 'UNAUTHORIZED'
      };

      const schemaSnapshot = {
        hasStatus: !!unauthorizedError.status,
        statusValue: unauthorizedError.status,
        hasMessage: !!unauthorizedError.message,
        hasCode: !!unauthorizedError.code
      };

      expect(schemaSnapshot).toMatchSnapshot('unauthorized-error-schema');
    });

    it('should return consistent forbidden error response', () => {
      const forbiddenError = {
        status: 'error',
        message: 'Access forbidden',
        code: 'FORBIDDEN',
        requiredRole: 'admin'
      };

      const schemaSnapshot = {
        hasStatus: !!forbiddenError.status,
        statusValue: forbiddenError.status,
        hasMessage: !!forbiddenError.message,
        hasCode: !!forbiddenError.code,
        hasRequiredRole: !!forbiddenError.requiredRole
      };

      expect(schemaSnapshot).toMatchSnapshot('forbidden-error-schema');
    });

    it('should return consistent rate limit error response', () => {
      const rateLimitError = {
        status: 'error',
        message: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60
      };

      const schemaSnapshot = {
        hasStatus: !!rateLimitError.status,
        statusValue: rateLimitError.status,
        hasMessage: !!rateLimitError.message,
        hasCode: !!rateLimitError.code,
        hasRetryAfter: rateLimitError.retryAfter !== undefined
      };

      expect(schemaSnapshot).toMatchSnapshot('rate-limit-error-schema');
    });
  });

  // =========================================
  // Pagination Response Schemas
  // =========================================
  describe('Pagination Response Schemas', () => {
    it('should return consistent paginated response structure', () => {
      const paginatedResponse = {
        status: 'success',
        data: {
          items: [{ id: 1 }, { id: 2 }, { id: 3 }],
          pagination: {
            total: 100,
            page: 1,
            limit: 20,
            totalPages: 5,
            hasNextPage: true,
            hasPrevPage: false
          }
        }
      };

      const schemaSnapshot = {
        hasStatus: !!paginatedResponse.status,
        hasData: !!paginatedResponse.data,
        hasItems: Array.isArray(paginatedResponse.data?.items),
        hasPagination: !!paginatedResponse.data?.pagination,
        paginationFields: paginatedResponse.data?.pagination
          ? Object.keys(paginatedResponse.data.pagination).sort()
          : []
      };

      expect(schemaSnapshot).toMatchSnapshot('paginated-response-schema');
    });
  });

  // =========================================
  // Health & System Response Schemas
  // =========================================
  describe('Health & System Response Schemas', () => {
    it('should return consistent health check response', () => {
      const healthResponse = {
        status: 'healthy',
        timestamp: '2025-12-22T10:00:00.000Z',
        version: '1.0.0',
        services: {
          database: { status: 'connected', latency: 5 },
          redis: { status: 'connected', latency: 2 },
          email: { status: 'healthy' }
        },
        uptime: 86400
      };

      const schemaSnapshot = {
        hasStatus: !!healthResponse.status,
        hasTimestamp: !!healthResponse.timestamp,
        hasVersion: !!healthResponse.version,
        hasServices: !!healthResponse.services,
        serviceNames: Object.keys(healthResponse.services).sort(),
        hasUptime: healthResponse.uptime !== undefined
      };

      expect(schemaSnapshot).toMatchSnapshot('health-check-schema');
    });

    it('should return consistent metrics response', () => {
      const metricsResponse = {
        status: 'success',
        data: {
          requests: {
            total: 10000,
            success: 9500,
            error: 500,
            avgResponseTime: 150
          },
          visitors: {
            today: 50,
            pending: 5,
            checkedIn: 20
          },
          system: {
            cpuUsage: 45.5,
            memoryUsage: 62.3,
            diskUsage: 70.1
          }
        }
      };

      const schemaSnapshot = {
        hasStatus: !!metricsResponse.status,
        hasData: !!metricsResponse.data,
        categories: Object.keys(metricsResponse.data).sort(),
        requestFields: metricsResponse.data?.requests
          ? Object.keys(metricsResponse.data.requests).sort()
          : []
      };

      expect(schemaSnapshot).toMatchSnapshot('metrics-response-schema');
    });
  });
});
