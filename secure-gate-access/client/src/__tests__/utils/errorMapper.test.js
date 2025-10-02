// client/src/__tests__/utils/errorMapper.test.js
import { handleApiError, mapStatusToMessage } from '../../utils/errorMapper';

describe('Error Mapper Utility', () => {
  describe('handleApiError', () => {
    test('should map 401 errors to session expired message', () => {
      const error = { status: 401, message: 'Unauthorized' };
      const result = handleApiError(error);
      expect(result).toMatch(/session|expired|login/i);
    });

    test('should map 403 errors to permission denied message', () => {
      const error = { status: 403, message: 'Forbidden' };
      const result = handleApiError(error);
      expect(result).toMatch(/permission|access|denied/i);
    });

    test('should map 404 errors to not found message', () => {
      const error = { status: 404 };
      const result = handleApiError(error);
      expect(result).toMatch(/not found|doesn't exist/i);
    });

    test('should map 500 errors to server error message', () => {
      const error = { status: 500 };
      const result = handleApiError(error);
      expect(result).toMatch(/server error|try again/i);
    });

    test('should handle network errors', () => {
      const error = { message: 'Network Error' };
      const result = handleApiError(error);
      expect(result).toMatch(/network|connection/i);
    });

    test('should handle timeout errors', () => {
      const error = { message: 'timeout exceeded' };
      const result = handleApiError(error);
      expect(result).toMatch(/timeout|took too long/i);
    });

    test('should return custom error messages from API', () => {
      const error = { 
        status: 400, 
        response: { data: { message: 'Custom error message' } } 
      };
      const result = handleApiError(error);
      expect(result).toBe('Custom error message');
    });

    test('should return default message for unknown errors', () => {
      const error = {};
      const result = handleApiError(error);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle errors without status', () => {
      const error = { message: 'Something went wrong' };
      const result = handleApiError(error);
      expect(result).toBeTruthy();
    });

    test('should include context in error message when provided', () => {
      const error = { status: 500 };
      const result = handleApiError(error, 'User Registration');
      expect(result).toMatch(/User Registration/i);
    });
  });

  describe('mapStatusToMessage', () => {
    test('should map common HTTP status codes', () => {
      const testCases = [
        { status: 400, expected: /bad request|invalid/i },
        { status: 401, expected: /unauthorized|session/i },
        { status: 403, expected: /forbidden|permission/i },
        { status: 404, expected: /not found/i },
        { status: 422, expected: /validation|invalid/i },
        { status: 500, expected: /server error/i },
        { status: 502, expected: /gateway|unavailable/i },
        { status: 503, expected: /unavailable|maintenance/i }
      ];

      testCases.forEach(({ status, expected }) => {
        const result = mapStatusToMessage(status);
        expect(result).toMatch(expected);
      });
    });

    test('should provide user-friendly messages', () => {
      const result = mapStatusToMessage(500);
      expect(result).not.toContain('undefined');
      expect(result).not.toContain('null');
      expect(result.length).toBeGreaterThan(10);
    });
  });

  describe('Edge Cases', () => {
    test('should handle null error', () => {
      const result = handleApiError(null);
      expect(result).toBeTruthy();
    });

    test('should handle undefined error', () => {
      const result = handleApiError(undefined);
      expect(result).toBeTruthy();
    });

    test('should handle error with nested response structure', () => {
      const error = {
        response: {
          data: {
            error: 'Nested error message'
          }
        }
      };
      const result = handleApiError(error);
      expect(result).toContain('Nested error message');
    });

    test('should handle axios error structure', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            message: 'Axios error'
          }
        }
      };
      const result = handleApiError(error);
      expect(result).toContain('Axios error');
    });
  });
});
