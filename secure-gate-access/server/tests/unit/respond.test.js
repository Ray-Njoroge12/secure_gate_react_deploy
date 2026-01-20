/**
 * Respond Utility Unit Tests
 * Tests for response formatting utilities
 * Priority: P1 - Core utility functions
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  toCamel,
  camelize,
  respond,
  respondError
} from '../../src/utils/respond.js';

describe('respond utilities', () => {

  describe('toCamel', () => {
    it('should convert snake_case to camelCase', () => {
      expect(toCamel('user_name')).toBe('userName');
    });

    it('should convert multiple underscores', () => {
      expect(toCamel('first_name_last_name')).toBe('firstNameLastName');
    });

    it('should handle single word without underscore', () => {
      expect(toCamel('name')).toBe('name');
    });

    it('should handle empty string', () => {
      expect(toCamel('')).toBe('');
    });

    it('should handle string with trailing underscore', () => {
      expect(toCamel('user_')).toBe('user_');
    });

    it('should handle string starting with underscore', () => {
      // Based on the actual implementation: _([a-z]) pattern
      // _u matches and becomes U, then _n becomes N
      expect(toCamel('_user_name')).toBe('UserName');
    });

    it('should handle multiple consecutive underscores', () => {
      // __ doesn't match _[a-z], only _n matches
      expect(toCamel('user__name')).toBe('user_Name');
    });

    it('should handle uppercase letters after underscore', () => {
      // The regex only matches _[a-z], so _N doesn't match
      expect(toCamel('user_Name')).toBe('user_Name');
    });

    it('should handle database column names', () => {
      expect(toCamel('created_at')).toBe('createdAt');
      expect(toCamel('updated_at')).toBe('updatedAt');
      expect(toCamel('visitor_id')).toBe('visitorId');
      expect(toCamel('resident_name')).toBe('residentName');
    });
  });

  describe('camelize', () => {
    describe('with arrays', () => {
      it('should camelize array of objects', () => {
        const input = [
          { user_name: 'john', first_name: 'John' },
          { user_name: 'jane', first_name: 'Jane' }
        ];

        const result = camelize(input);

        expect(result).toEqual([
          { userName: 'john', firstName: 'John' },
          { userName: 'jane', firstName: 'Jane' }
        ]);
      });

      it('should handle empty array', () => {
        expect(camelize([])).toEqual([]);
      });

      it('should handle array of primitives', () => {
        expect(camelize([1, 2, 3])).toEqual([1, 2, 3]);
        expect(camelize(['a', 'b'])).toEqual(['a', 'b']);
      });

      it('should handle nested arrays', () => {
        const input = [[{ user_id: 1 }], [{ user_id: 2 }]];
        const result = camelize(input);

        expect(result).toEqual([[{ userId: 1 }], [{ userId: 2 }]]);
      });
    });

    describe('with objects', () => {
      it('should camelize object keys', () => {
        const input = { user_name: 'john', email_address: 'john@test.com' };
        const result = camelize(input);

        expect(result).toEqual({
          userName: 'john',
          emailAddress: 'john@test.com'
        });
      });

      it('should handle empty object', () => {
        expect(camelize({})).toEqual({});
      });

      it('should handle nested objects', () => {
        const input = {
          user_data: {
            first_name: 'John',
            last_name: 'Doe',
            contact_info: {
              phone_number: '1234567890'
            }
          }
        };

        const result = camelize(input);

        expect(result).toEqual({
          userData: {
            firstName: 'John',
            lastName: 'Doe',
            contactInfo: {
              phoneNumber: '1234567890'
            }
          }
        });
      });

      it('should handle mixed nested structures', () => {
        const input = {
          user_list: [
            { user_id: 1, user_name: 'john' },
            { user_id: 2, user_name: 'jane' }
          ],
          total_count: 2
        };

        const result = camelize(input);

        expect(result).toEqual({
          userList: [
            { userId: 1, userName: 'john' },
            { userId: 2, userName: 'jane' }
          ],
          totalCount: 2
        });
      });

      it('should preserve null values', () => {
        const input = { user_name: null, email_address: 'test@test.com' };
        const result = camelize(input);

        expect(result).toEqual({
          userName: null,
          emailAddress: 'test@test.com'
        });
      });

      it('should handle objects with date values', () => {
        const date = new Date('2024-01-01');
        const input = { created_at: date };
        const result = camelize(input);

        expect(result.createdAt).toBe(date);
      });
    });

    describe('with primitives', () => {
      it('should return string as is', () => {
        expect(camelize('hello_world')).toBe('hello_world');
      });

      it('should return number as is', () => {
        expect(camelize(123)).toBe(123);
      });

      it('should return null as is', () => {
        expect(camelize(null)).toBe(null);
      });

      it('should return undefined as is', () => {
        expect(camelize(undefined)).toBe(undefined);
      });

      it('should return boolean as is', () => {
        expect(camelize(true)).toBe(true);
        expect(camelize(false)).toBe(false);
      });
    });

    describe('with special objects', () => {
      it('should handle Date objects without modification', () => {
        const date = new Date();
        const result = camelize(date);
        expect(result).toBe(date);
      });

      it('should handle RegExp objects without modification', () => {
        const regex = /test/gi;
        const result = camelize(regex);
        expect(result).toBe(regex);
      });
    });
  });

  describe('respond', () => {
    let mockRes;

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    it('should respond with 200 status by default', () => {
      respond(mockRes, { name: 'test' });

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should respond with custom status code', () => {
      respond(mockRes, { name: 'test' }, 201);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should wrap data in success response', () => {
      respond(mockRes, { user_name: 'john' });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { userName: 'john' }
      });
    });

    it('should camelize response data', () => {
      respond(mockRes, {
        first_name: 'John',
        last_name: 'Doe',
        created_at: '2024-01-01'
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          firstName: 'John',
          lastName: 'Doe',
          createdAt: '2024-01-01'
        }
      });
    });

    it('should handle array data', () => {
      respond(mockRes, [
        { user_id: 1 },
        { user_id: 2 }
      ]);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [
          { userId: 1 },
          { userId: 2 }
        ]
      });
    });

    it('should handle null data', () => {
      respond(mockRes, null);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: null
      });
    });

    it('should handle empty object', () => {
      respond(mockRes, {});

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {}
      });
    });

    it('should return response object', () => {
      const result = respond(mockRes, { test: 'data' });

      expect(result).toBe(mockRes);
    });
  });

  describe('respondError', () => {
    let mockRes;

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    it('should respond with specified error code', () => {
      respondError(mockRes, 400, 'Bad request');

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should include error code and message in response', () => {
      respondError(mockRes, 404, 'Resource not found');

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Resource not found',
        error: expect.objectContaining({
          code: 'NOT_FOUND'
        }),
        timestamp: expect.any(String)
      }));
    });

    it('should handle 400 Bad Request', () => {
      respondError(mockRes, 400, 'Validation failed');

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Validation failed',
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR'
        })
      }));
    });

    it('should handle 401 Unauthorized', () => {
      respondError(mockRes, 401, 'Authentication required');

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Authentication required',
        error: expect.objectContaining({
          code: 'UNAUTHORIZED'
        })
      }));
    });

    it('should handle 403 Forbidden', () => {
      respondError(mockRes, 403, 'Access denied');

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Access denied',
        error: expect.objectContaining({
          code: 'FORBIDDEN'
        })
      }));
    });

    it('should handle 404 Not Found', () => {
      respondError(mockRes, 404, 'User not found');

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'User not found',
        error: expect.objectContaining({
          code: 'NOT_FOUND'
        })
      }));
    });

    it('should handle 500 Internal Server Error', () => {
      respondError(mockRes, 500, 'Internal server error');

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Internal server error',
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR'
        })
      }));
    });

    it('should handle 429 Too Many Requests', () => {
      respondError(mockRes, 429, 'Rate limit exceeded');

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Rate limit exceeded',
        error: expect.objectContaining({
          code: 'RATE_LIMIT_EXCEEDED'
        })
      }));
    });

    it('should return response object', () => {
      const result = respondError(mockRes, 400, 'Error');

      expect(result).toBe(mockRes);
    });

    it('should handle empty message', () => {
      respondError(mockRes, 400, '');

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: '',
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR'
        })
      }));
    });
  });
});
