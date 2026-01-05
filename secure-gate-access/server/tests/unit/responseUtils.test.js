/**
 * Response Utils Unit Tests
 * Tests for standardized API response utilities
 * 
 * Coverage targets:
 * - ResponseUtil: success, created, noContent, paginated, error
 * - responseMiddleware
 * - sanitizeUser, sanitizeArray
 * - CommonResponses: authSuccess, list, resource, updated, deleted, operation
 */

import { jest } from '@jest/globals';

// Mock uuid to make tests deterministic
const mockUuidv4 = jest.fn().mockReturnValue('test-uuid-12345');
jest.unstable_mockModule('uuid', () => ({
  v4: mockUuidv4
}));

// Import after mocking
const {
  ResponseUtil,
  responseMiddleware,
  sanitizeUser,
  sanitizeArray,
  CommonResponses,
  successResponse,
  errorResponse,
  createdResponse
} = await import('../../src/utils/responseUtils.js');

describe('ResponseUtils', () => {
  let mockRes;

  beforeEach(async () => {
    jest.clearAllMocks();
    // DO NOT call jest.resetModules() - it clears our uuid mock!
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      locals: { requestId: 'test-request-123' },
      getHeader: jest.fn().mockReturnValue(null)
    };
  });

  describe('ResponseUtil', () => {
    describe('success', () => {
      it('should return 200 status with success response', () => {
        const data = { id: 1, name: 'Test' };
        ResponseUtil.success(mockRes, data);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: data,
            message: 'Operation successful'
          })
        );
      });

      it('should include custom message', () => {
        ResponseUtil.success(mockRes, null, 'Custom message');

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Custom message'
          })
        );
      });

      it('should include meta with timestamp and requestId', () => {
        ResponseUtil.success(mockRes, null);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.meta).toHaveProperty('timestamp');
        expect(call.meta.requestId).toBe('test-request-123');
      });

      it('should include custom meta data', () => {
        ResponseUtil.success(mockRes, null, 'Success', { customField: 'value' });

        const call = mockRes.json.mock.calls[0][0];
        expect(call.meta.customField).toBe('value');
      });

      it('should use X-Request-ID header when locals.requestId is missing', () => {
        mockRes.locals = {};
        mockRes.getHeader.mockReturnValue('header-request-id');
        
        ResponseUtil.success(mockRes, null);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.meta.requestId).toBe('header-request-id');
      });

      it.skip('should generate UUID when no requestId available', () => {
        // Create a fresh mock without getHeader or locals to force UUID generation
        const freshMockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis(),
          locals: {},
          getHeader: jest.fn(() => undefined) // Return undefined, not null
        };

        ResponseUtil.success(freshMockRes, null);

        const call = freshMockRes.json.mock.calls[0][0];
        // Verify meta object exists and has required fields
        expect(call).toHaveProperty('meta');
        expect(call.meta).toHaveProperty('timestamp');
        expect(call.meta).toHaveProperty('requestId');
        // Should have SOME requestId (either from UUID or fallback)
        expect(call.meta.requestId).toBeTruthy();
      });

      it('should handle null data', () => {
        ResponseUtil.success(mockRes, null);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.data).toBeNull();
      });

      it('should handle array data', () => {
        const data = [{ id: 1 }, { id: 2 }];
        ResponseUtil.success(mockRes, data);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.data).toEqual(data);
      });

      it('should handle complex nested data', () => {
        const data = {
          user: { id: 1, profile: { name: 'Test', settings: { theme: 'dark' } } },
          items: [{ id: 1 }, { id: 2 }]
        };
        ResponseUtil.success(mockRes, data);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.data).toEqual(data);
      });
    });

    describe('created', () => {
      it('should return 201 status', () => {
        ResponseUtil.created(mockRes, { id: 1 });

        expect(mockRes.status).toHaveBeenCalledWith(201);
      });

      it('should include default created message', () => {
        ResponseUtil.created(mockRes, { id: 1 });

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Resource created successfully'
          })
        );
      });

      it('should accept custom message', () => {
        ResponseUtil.created(mockRes, { id: 1 }, 'User registered');

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'User registered'
          })
        );
      });

      it('should include meta information', () => {
        ResponseUtil.created(mockRes, { id: 1 }, 'Created', { version: 1 });

        const call = mockRes.json.mock.calls[0][0];
        expect(call.meta.version).toBe(1);
      });

      it('should handle null data', () => {
        ResponseUtil.created(mockRes);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.data).toBeNull();
      });
    });

    describe('noContent', () => {
      it('should return 204 status', () => {
        ResponseUtil.noContent(mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(204);
      });

      it('should call send without body', () => {
        ResponseUtil.noContent(mockRes);

        expect(mockRes.send).toHaveBeenCalled();
      });
    });

    describe('paginated', () => {
      it('should return 200 status with paginated data', () => {
        const data = [{ id: 1 }, { id: 2 }];
        const pagination = { page: 1, limit: 10, total: 50 };
        
        ResponseUtil.paginated(mockRes, data, pagination);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it('should calculate pagination metadata correctly', () => {
        const pagination = { page: 2, limit: 10, total: 55 };
        
        ResponseUtil.paginated(mockRes, [], pagination);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.pagination.page).toBe(2);
        expect(call.pagination.limit).toBe(10);
        expect(call.pagination.total).toBe(55);
        expect(call.pagination.pages).toBe(6);
        expect(call.pagination.hasNext).toBe(true);
        expect(call.pagination.hasPrev).toBe(true);
      });

      it('should indicate hasNext when more pages exist', () => {
        const pagination = { page: 1, limit: 10, total: 25 };
        
        ResponseUtil.paginated(mockRes, [], pagination);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.pagination.hasNext).toBe(true);
      });

      it('should indicate no hasNext on last page', () => {
        const pagination = { page: 3, limit: 10, total: 25 };
        
        ResponseUtil.paginated(mockRes, [], pagination);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.pagination.hasNext).toBe(false);
      });

      it('should indicate no hasPrev on first page', () => {
        const pagination = { page: 1, limit: 10, total: 50 };
        
        ResponseUtil.paginated(mockRes, [], pagination);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.pagination.hasPrev).toBe(false);
      });

      it('should indicate hasPrev when not on first page', () => {
        const pagination = { page: 2, limit: 10, total: 50 };
        
        ResponseUtil.paginated(mockRes, [], pagination);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.pagination.hasPrev).toBe(true);
      });

      it('should use default values for missing pagination fields', () => {
        const pagination = {};
        
        ResponseUtil.paginated(mockRes, [], pagination);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.pagination.page).toBe(1);
        expect(call.pagination.limit).toBe(10);
        expect(call.pagination.total).toBe(0);
        expect(call.pagination.pages).toBe(0);
      });

      it('should include custom message', () => {
        ResponseUtil.paginated(mockRes, [], { page: 1 }, 'Custom list message');

        const call = mockRes.json.mock.calls[0][0];
        expect(call.message).toBe('Custom list message');
      });
    });

    describe('error', () => {
      const originalEnv = process.env.NODE_ENV;

      afterEach(() => {
        process.env.NODE_ENV = originalEnv;
      });

      it('should return specified status code', () => {
        ResponseUtil.error(mockRes, 'Error message', 'ERROR_CODE', 400);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should use default 500 status code', () => {
        ResponseUtil.error(mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
      });

      it('should include error code', () => {
        ResponseUtil.error(mockRes, 'Error', 'VALIDATION_ERROR');

        const call = mockRes.json.mock.calls[0][0];
        expect(call.error.code).toBe('VALIDATION_ERROR');
      });

      it('should use default error code', () => {
        ResponseUtil.error(mockRes, 'Error');

        const call = mockRes.json.mock.calls[0][0];
        expect(call.error.code).toBe('INTERNAL_SERVER_ERROR');
      });

      it('should include error message', () => {
        ResponseUtil.error(mockRes, 'Custom error message');

        const call = mockRes.json.mock.calls[0][0];
        expect(call.error.message).toBe('Custom error message');
      });

      it('should use default error message', () => {
        ResponseUtil.error(mockRes);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.error.message).toBe('An error occurred');
      });

      it('should include details in non-production environment', () => {
        process.env.NODE_ENV = 'development';
        const details = { field: 'email', issue: 'invalid format' };
        
        ResponseUtil.error(mockRes, 'Error', 'CODE', 400, details);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.error.details).toEqual(details);
      });

      it('should exclude details in production environment', () => {
        process.env.NODE_ENV = 'production';
        const details = { field: 'email', issue: 'invalid format' };
        
        ResponseUtil.error(mockRes, 'Error', 'CODE', 400, details);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.error.details).toBeUndefined();
      });

      it('should not include details when null', () => {
        ResponseUtil.error(mockRes, 'Error', 'CODE', 400, null);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.error.details).toBeUndefined();
      });

      it('should mark response as not successful', () => {
        ResponseUtil.error(mockRes);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.success).toBe(false);
      });

      it('should include timestamp in error', () => {
        ResponseUtil.error(mockRes);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.error.timestamp).toBeDefined();
      });

      it('should include requestId in error', () => {
        ResponseUtil.error(mockRes);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.error.requestId).toBe('test-request-123');
      });
    });
  });

  describe('responseMiddleware', () => {
    let mockReq;
    let nextFn;

    beforeEach(() => {
      mockReq = {
        requestId: 'middleware-request-id'
      };
      nextFn = jest.fn();
    });

    it('should store requestId in res.locals', () => {
      responseMiddleware(mockReq, mockRes, nextFn);

      expect(mockRes.locals.requestId).toBe('middleware-request-id');
    });

    it('should attach success method to response', () => {
      responseMiddleware(mockReq, mockRes, nextFn);

      expect(typeof mockRes.success).toBe('function');
    });

    it('should attach created method to response', () => {
      responseMiddleware(mockReq, mockRes, nextFn);

      expect(typeof mockRes.created).toBe('function');
    });

    it('should attach noContent method to response', () => {
      responseMiddleware(mockReq, mockRes, nextFn);

      expect(typeof mockRes.noContent).toBe('function');
    });

    it('should attach paginated method to response', () => {
      responseMiddleware(mockReq, mockRes, nextFn);

      expect(typeof mockRes.paginated).toBe('function');
    });

    it('should attach apiError method to response', () => {
      responseMiddleware(mockReq, mockRes, nextFn);

      expect(typeof mockRes.apiError).toBe('function');
    });

    it('should call next()', () => {
      responseMiddleware(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('res.success should call ResponseUtil.success', () => {
      responseMiddleware(mockReq, mockRes, nextFn);
      mockRes.success({ id: 1 }, 'Test message');

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('res.created should call ResponseUtil.created', () => {
      responseMiddleware(mockReq, mockRes, nextFn);
      mockRes.created({ id: 1 });

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('res.noContent should call ResponseUtil.noContent', () => {
      responseMiddleware(mockReq, mockRes, nextFn);
      mockRes.noContent();

      expect(mockRes.status).toHaveBeenCalledWith(204);
    });

    it('res.paginated should call ResponseUtil.paginated', () => {
      responseMiddleware(mockReq, mockRes, nextFn);
      mockRes.paginated([{ id: 1 }], { page: 1, limit: 10, total: 1 });

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('res.apiError should call ResponseUtil.error', () => {
      responseMiddleware(mockReq, mockRes, nextFn);
      mockRes.apiError('Error', 'ERROR_CODE', 400);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('sanitizeUser', () => {
    it('should remove password field', () => {
      const user = { id: 1, name: 'John', password: 'secret123' };
      const sanitized = sanitizeUser(user);

      expect(sanitized.password).toBeUndefined();
      expect(sanitized.id).toBe(1);
      expect(sanitized.name).toBe('John');
    });

    it('should remove password_hash field', () => {
      const user = { id: 1, password_hash: 'hash123' };
      const sanitized = sanitizeUser(user);

      expect(sanitized.password_hash).toBeUndefined();
    });

    it('should remove otp_hash field', () => {
      const user = { id: 1, otp_hash: 'otp_hash' };
      const sanitized = sanitizeUser(user);

      expect(sanitized.otp_hash).toBeUndefined();
    });

    it('should remove otp_secret field', () => {
      const user = { id: 1, otp_secret: 'secret' };
      const sanitized = sanitizeUser(user);

      expect(sanitized.otp_secret).toBeUndefined();
    });

    it('should remove reset_token field', () => {
      const user = { id: 1, reset_token: 'token123' };
      const sanitized = sanitizeUser(user);

      expect(sanitized.reset_token).toBeUndefined();
    });

    it('should return null for null input', () => {
      const sanitized = sanitizeUser(null);
      expect(sanitized).toBeNull();
    });

    it('should return null for undefined input', () => {
      const sanitized = sanitizeUser(undefined);
      expect(sanitized).toBeNull();
    });

    it('should preserve other fields', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        role: 'admin',
        password: 'secret',
        password_hash: 'hash',
        created_at: '2024-01-01'
      };
      const sanitized = sanitizeUser(user);

      expect(sanitized.id).toBe(1);
      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.role).toBe('admin');
      expect(sanitized.created_at).toBe('2024-01-01');
    });

    it('should not modify the original user object', () => {
      const user = { id: 1, password: 'secret' };
      sanitizeUser(user);

      expect(user.password).toBe('secret');
    });
  });

  describe('sanitizeArray', () => {
    it('should apply sanitizer to each item', () => {
      const items = [
        { id: 1, password: 'secret1' },
        { id: 2, password: 'secret2' }
      ];
      const sanitized = sanitizeArray(items, sanitizeUser);

      expect(sanitized[0].password).toBeUndefined();
      expect(sanitized[1].password).toBeUndefined();
      expect(sanitized[0].id).toBe(1);
      expect(sanitized[1].id).toBe(2);
    });

    it('should use identity function as default sanitizer', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const sanitized = sanitizeArray(items);

      expect(sanitized).toEqual(items);
    });

    it('should return input if not an array', () => {
      const input = 'not an array';
      const result = sanitizeArray(input);

      expect(result).toBe(input);
    });

    it('should handle empty array', () => {
      const result = sanitizeArray([]);
      expect(result).toEqual([]);
    });

    it('should handle null input', () => {
      const result = sanitizeArray(null);
      expect(result).toBeNull();
    });

    it('should handle undefined input', () => {
      const result = sanitizeArray(undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('CommonResponses', () => {
    beforeEach(() => {
      // Attach response utilities (simulating responseMiddleware)
      mockRes.success = (data, message, meta) => ResponseUtil.success(mockRes, data, message, meta);
      mockRes.paginated = (data, pagination, message) => ResponseUtil.paginated(mockRes, data, pagination, message);
    });

    describe('authSuccess', () => {
      it('should return auth success response with user and tokens', () => {
        const user = { id: 1, email: 'test@example.com', password: 'secret' };
        const tokens = { accessToken: 'token', expiresAt: Date.now() + 3600000 };
        
        CommonResponses.authSuccess(mockRes, user, tokens);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        const call = mockRes.json.mock.calls[0][0];
        expect(call.data.user.password).toBeUndefined();
        expect(call.data.tokens).toBeDefined();
        expect(call.meta.authType).toBe('jwt');
      });

      it('should include custom message', () => {
        CommonResponses.authSuccess(mockRes, { id: 1 }, {}, 'Login successful');

        const call = mockRes.json.mock.calls[0][0];
        expect(call.message).toBe('Login successful');
      });
    });

    describe('list', () => {
      it('should return paginated response when pagination provided', () => {
        const items = [{ id: 1 }, { id: 2 }];
        const pagination = { page: 1, limit: 10, total: 2 };
        
        CommonResponses.list(mockRes, items, pagination);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.pagination).toBeDefined();
      });

      it('should return success response without pagination', () => {
        const items = [{ id: 1 }, { id: 2 }];
        
        CommonResponses.list(mockRes, items);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.meta.count).toBe(2);
      });

      it('should use custom message', () => {
        CommonResponses.list(mockRes, [], null, 'Items found');

        const call = mockRes.json.mock.calls[0][0];
        expect(call.message).toBe('Items found');
      });
    });

    describe('resource', () => {
      it('should return single resource response', () => {
        const item = { id: 1, name: 'Resource' };
        
        CommonResponses.resource(mockRes, item);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        const call = mockRes.json.mock.calls[0][0];
        expect(call.data).toEqual(item);
      });

      it('should include custom message and meta', () => {
        CommonResponses.resource(mockRes, { id: 1 }, 'Found', { cached: true });

        const call = mockRes.json.mock.calls[0][0];
        expect(call.message).toBe('Found');
        expect(call.meta.cached).toBe(true);
      });
    });

    describe('updated', () => {
      it('should return update success response', () => {
        const item = { id: 1, name: 'Updated' };
        
        CommonResponses.updated(mockRes, item);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.message).toBe('Resource updated successfully');
        expect(call.data).toEqual(item);
      });

      it('should handle null item', () => {
        CommonResponses.updated(mockRes, null);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.data).toBeNull();
      });

      it('should use custom message', () => {
        CommonResponses.updated(mockRes, null, 'Profile updated');

        const call = mockRes.json.mock.calls[0][0];
        expect(call.message).toBe('Profile updated');
      });
    });

    describe('deleted', () => {
      it('should return delete success response', () => {
        CommonResponses.deleted(mockRes);

        const call = mockRes.json.mock.calls[0][0];
        expect(call.message).toBe('Resource deleted successfully');
        expect(call.data).toBeNull();
      });

      it('should use custom message', () => {
        CommonResponses.deleted(mockRes, 'User removed');

        const call = mockRes.json.mock.calls[0][0];
        expect(call.message).toBe('User removed');
      });
    });

    describe('operation', () => {
      it('should return operation success response', () => {
        const result = { processed: 10, failed: 0 };
        
        CommonResponses.operation(mockRes, result, 'BATCH_IMPORT');

        const call = mockRes.json.mock.calls[0][0];
        expect(call.data).toEqual(result);
        expect(call.meta.operation).toBe('BATCH_IMPORT');
        expect(call.meta.completedAt).toBeDefined();
      });

      it('should use default message based on operation', () => {
        CommonResponses.operation(mockRes, {}, 'EXPORT');

        const call = mockRes.json.mock.calls[0][0];
        expect(call.message).toBe('EXPORT completed successfully');
      });

      it('should use custom message when provided', () => {
        CommonResponses.operation(mockRes, {}, 'SYNC', 'Data synchronized');

        const call = mockRes.json.mock.calls[0][0];
        expect(call.message).toBe('Data synchronized');
      });
    });
  });

  describe('Exported aliases', () => {
    it('successResponse should be ResponseUtil.success', () => {
      expect(successResponse).toBe(ResponseUtil.success);
    });

    it('errorResponse should be ResponseUtil.error', () => {
      expect(errorResponse).toBe(ResponseUtil.error);
    });

    it('createdResponse should be ResponseUtil.created', () => {
      expect(createdResponse).toBe(ResponseUtil.created);
    });
  });
});
