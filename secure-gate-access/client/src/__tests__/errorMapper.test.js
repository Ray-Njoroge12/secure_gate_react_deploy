// client/src/__tests__/utils/errorMapper.test.js
import { handleApiError, mapStatusToMessage, mapSuccessMessage, formatValidationErrors } from '../../utils/errorMapper';

describe('Error Mapper Utility', () => {
  describe('handleApiError', () => {
    test('should map 401 errors to authentication message', () => {
      const error = { status: 401, message: 'Unauthorized' };
      const result = handleApiError(error);
      expect(result).toContain('Authentication required');
      expect(result).toContain('login');
    });

    test('should map 403 errors to permission denied message', () => {
      const error = { status: 403, message: 'Forbidden' };
      const result = handleApiError(error);
      expect(result).toContain('Access denied');
      expect(result).toContain('permission');
    });

    test('should map 404 errors to not found message', () => {
      const error = { status: 404 };
      const result = handleApiError(error);
      expect(result).toContain('not found');
    });

    test('should map 500 errors to server error message', () => {
      const error = { status: 500 };
      const result = handleApiError(error);
      expect(result).toContain('Server error');
      expect(result).toContain('try again');
    });

    test('should handle network errors', () => {
      const error = { message: 'Network Error' };
      const result = handleApiError(error);
      expect(result).toContain('Network error');
      expect(result).toContain('connection');
    });

    test('should handle timeout errors', () => {
      const error = { message: 'timeout exceeded' };
      const result = handleApiError(error);
      expect(result).toContain('timeout');
    });

    test('should return custom error messages from API', () => {
      const error = { 
        status: 400, 
        response: { payload: { message: 'Custom error message' } } 
      };
      const result = handleApiError(error);
      expect(result).toBe('Custom error message');
    });

    test('should include context in error message when provided', () => {
      const error = { status: 500 };
      const result = handleApiError(error, 'User Registration');
      expect(result).toContain('Server error');
    });
  });

  describe('mapStatusToMessage', () => {
    test('should map common HTTP status codes', () => {
      const testCases = [
        { status: 400, expected: /Invalid request/ },
        { status: 401, expected: /Authentication required/ },
        { status: 403, expected: /Access denied/ },
        { status: 404, expected: /not found/ },
        { status: 500, expected: /Server error/ }
      ];

      testCases.forEach(({ status, expected }) => {
        const result = mapStatusToMessage(status);
        expect(result).toMatch(expected);
      });
    });

    test('should handle specific server messages', () => {
      const payload = { message: 'expired' };
      const result = mapStatusToMessage(400, payload);
      expect(result).toBe('This invitation has expired.');
    });

    test('should return custom message if provided', () => {
      const payload = { message: 'Custom error message' };
      const result = mapStatusToMessage(400, payload);
      expect(result).toBe('Custom error message');
    });

    test('should return default message for unknown status', () => {
      const result = mapStatusToMessage(999);
      expect(result).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('mapSuccessMessage', () => {
    test('should map success actions to messages', () => {
      expect(mapSuccessMessage('visitor_created')).toBe('Visitor registered successfully!');
      expect(mapSuccessMessage('invite_sent')).toBe('Invitation sent to visitor.');
      expect(mapSuccessMessage('otp_verified')).toBe('Verification successful!');
    });

    test('should return default message for unknown action', () => {
      const result = mapSuccessMessage('unknown_action');
      expect(result).toBe('Operation completed successfully!');
    });
  });

  describe('formatValidationErrors', () => {
    test('should format validation errors', () => {
      const errors = {
        email: 'Email is required',
        password: 'Password must be at least 8 characters'
      };
      const result = formatValidationErrors(errors);
      expect(result).toContain('email: Email is required');
      expect(result).toContain('password: Password must be at least 8 characters');
    });

    test('should handle empty errors object', () => {
      const result = formatValidationErrors({});
      expect(result).toBe('Please fix the errors and try again.');
    });

    test('should handle null errors', () => {
      const result = formatValidationErrors(null);
      expect(result).toBe('Please fix the errors and try again.');
    });
  });

  describe('Edge Cases', () => {
    test('should handle null error', () => {
      const result = handleApiError(null);
      expect(result).toBe('An unexpected error occurred. Please try again.');
    });

    test('should handle undefined error', () => {
      const result = handleApiError(undefined);
      expect(result).toBe('An unexpected error occurred. Please try again.');
    });

    test('should handle error with nested response structure', () => {
      const error = {
        status: 400,
        response: {
          data: {
            errors: {
              message: 'Nested error message'
            }
          }
        }
      };
      const result = handleApiError(error);
      expect(result).toContain('Invalid request');
    });

    test('should handle axios error structure', () => {
      const error = {
        status: 500,
        response: {
          data: {
            message: 'Axios error'
          }
        }
      };
      const result = handleApiError(error);
      expect(result).toContain('Server error');
    });
  });
});