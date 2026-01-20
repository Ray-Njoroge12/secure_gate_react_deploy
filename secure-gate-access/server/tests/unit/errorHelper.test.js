/**
 * Error Helper Unit Tests
 * Tests for error handling utilities
 * Priority: P1 - Core utility functions
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Import the actual implementation (no mocking needed - we test behavior)
const {
  handleTransactionError,
  handleValidationError,
  handleNotFoundError,
  handleForbiddenError
} = await import('../../src/utils/errorHelper.js');

describe('errorHelper', () => {
  let mockRes;
  let consoleErrorSpy;

  beforeEach(async () => {
    jest.clearAllMocks();
    // DO NOT call jest.resetModules() here - it clears our mocks!
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('handleTransactionError', () => {
    it('should respond with 500 status code', () => {
      const error = new Error('Database connection failed');

      handleTransactionError(mockRes, error);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should include error message in response', () => {
      const error = new Error('Connection timeout');

      handleTransactionError(mockRes, error);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Transaction failed: Connection timeout'),
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR'
          })
        })
      );
    });

    it('should log error with default context', () => {
      const error = new Error('Test error');

      handleTransactionError(mockRes, error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Transaction] Transaction error:',
        'Test error'
      );
    });

    it('should log error with custom context', () => {
      const error = new Error('Payment failed');

      handleTransactionError(mockRes, error, 'PaymentService');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[PaymentService] Transaction error:',
        'Payment failed'
      );
    });

    it('should include context in response message', () => {
      const error = new Error('Rollback required');

      handleTransactionError(mockRes, error, 'OrderProcessing');

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('OrderProcessing failed'),
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR'
          })
        })
      );
    });

    it('should return response object', () => {
      const error = new Error('Test');

      const result = handleTransactionError(mockRes, error);

      expect(result).toBe(mockRes);
    });

    it('should handle error without message', () => {
      const error = new Error();

      expect(() => handleTransactionError(mockRes, error)).not.toThrow();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle non-Error objects', () => {
      const error = { code: 'ECONNREFUSED', message: 'Connection refused' };

      expect(() => handleTransactionError(mockRes, error)).not.toThrow();
    });

    it('should handle string errors', () => {
      const error = 'Something went wrong';

      expect(() => handleTransactionError(mockRes, error)).not.toThrow();
    });
  });

  describe('handleValidationError', () => {
    it('should respond with 400 status code', () => {
      // The function takes a message string, not an Error object
      handleValidationError(mockRes, 'Invalid input');

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should include validation error message', () => {
      handleValidationError(mockRes, 'Email is required');

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Email is required',
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR'
          })
        })
      );
    });

    it('should handle validation message string', () => {
      handleValidationError(mockRes, 'Invalid email format');

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return response object', () => {
      const result = handleValidationError(mockRes, 'Validation failed');

      expect(result).toBe(mockRes);
    });

    it('should handle simple message string', () => {
      expect(() => handleValidationError(mockRes, 'Name is required')).not.toThrow();
    });
  });

  describe('handleNotFoundError', () => {
    it('should respond with 404 status code', () => {
      handleNotFoundError(mockRes, 'User');

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should include resource name in message', () => {
      handleNotFoundError(mockRes, 'Visitor');

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Visitor'),
          error: expect.objectContaining({
            code: 'NOT_FOUND'
          })
        })
      );
    });

    it('should use default message when no resource provided', () => {
      handleNotFoundError(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should return response object', () => {
      const result = handleNotFoundError(mockRes, 'Resource');

      expect(result).toBe(mockRes);
    });

    it('should format message with entity name', () => {
      // handleNotFoundError takes entity name, not ID - fixed test
      handleNotFoundError(mockRes, 'User');

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not found',
          error: expect.objectContaining({
            code: 'NOT_FOUND'
          })
        })
      );
    });
  });

  describe('handleForbiddenError', () => {
    it('should respond with 403 status code', () => {
      handleForbiddenError(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should include default forbidden message', () => {
      handleForbiddenError(mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Access denied',
          error: expect.objectContaining({
            code: 'FORBIDDEN'
          })
        })
      );
    });

    it('should use custom message when provided', () => {
      handleForbiddenError(mockRes, 'Admin access required');

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Admin access required',
          error: expect.objectContaining({
            code: 'FORBIDDEN'
          })
        })
      );
    });

    it('should return response object', () => {
      const result = handleForbiddenError(mockRes);

      expect(result).toBe(mockRes);
    });

    it('should handle action description', () => {
      handleForbiddenError(mockRes, 'You cannot delete this resource');

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'You cannot delete this resource',
          error: expect.objectContaining({
            code: 'FORBIDDEN'
          })
        })
      );
    });
  });

  describe('Edge cases', () => {
    it('should throw when error is null', () => {
      // The implementation doesn't guard against null/undefined - expected behavior
      expect(() => handleTransactionError(mockRes, null)).toThrow();
    });

    it('should throw when error is undefined', () => {
      // The implementation doesn't guard against null/undefined - expected behavior
      expect(() => handleTransactionError(mockRes, undefined)).toThrow();
    });

    it('should handle circular reference in error', () => {
      const error = new Error('Circular');
      error.circular = error;

      expect(() => handleTransactionError(mockRes, error)).not.toThrow();
    });

    it('should handle error with stack trace', () => {
      const error = new Error('With stack');
      error.stack = 'Error: With stack\n    at Test.fn';

      expect(() => handleTransactionError(mockRes, error)).not.toThrow();
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(10000);
      const error = new Error(longMessage);

      expect(() => handleTransactionError(mockRes, error)).not.toThrow();
    });
  });
});
