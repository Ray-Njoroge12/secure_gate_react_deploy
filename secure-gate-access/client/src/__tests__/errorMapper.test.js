// client/src/__tests__/errorMapper.test.js
import { handleApiError, mapErrorMessage } from '../utils/errorMapper';

describe('Error Mapper Utility', () => {
  describe('handleApiError', () => {
    test('should map 401 errors to session message', () => {
      const error = { status: 401, message: 'Unauthorized' };
      const result = handleApiError(error);
      expect(result).toContain('session');
      expect(result.toLowerCase()).toContain('login');
    });

    test('should map 403 errors to permission message', () => {
      const error = { status: 403, message: 'Forbidden' };
      const result = handleApiError(error);
      expect(result.toLowerCase()).toContain('permission');
    });

    test('should map 404 errors appropriately', () => {
      const error = { status: 404, message: 'Not Found' };
      const result = handleApiError(error);
      expect(result.toLowerCase()).toContain('not found' || 'exist');
    });

    test('should map 500 errors to server error message', () => {
      const error = { status: 500, message: 'Internal Server Error' };
      const result = handleApiError(error);
      expect(result.toLowerCase()).toContain('server' || 'error');
    });

    test('should handle network errors', () => {
      const error = { message: 'Network Error' };
      const result = handleApiError(error);
      expect(result.toLowerCase()).toContain('network' || 'connection');
    });

    test('should handle timeout errors', () => {
      const error = { message: 'timeout', code: 'ECONNABORTED' };
      const result = handleApiError(error);
      expect(result.toLowerCase()).toContain('timeout' || 'time');
    });

    test('should provide fallback for unknown errors', () => {
      const error = {};
      const result = handleApiError(error);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toContain('undefined');
    });

    test('should handle error with response object', () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Bad Request' }
        }
      };
      const result = handleApiError(error);
      expect(result).toBeTruthy();
    });

    test('should handle error with custom message', () => {
      const error = { 
        status: 422, 
        message: 'Validation failed: Email is required' 
      };
      const result = handleApiError(error);
      expect(result).toContain('Email is required');
    });
  });

  describe('mapErrorMessage', () => {
    test('should return custom message if provided', () => {
      const result = mapErrorMessage({ message: 'Custom error' });
      expect(result).toBe('Custom error');
    });

    test('should extract message from response.data', () => {
      const error = {
        response: {
          data: { message: 'Server message' }
        }
      };
      const result = mapErrorMessage(error);
      expect(result).toBe('Server message');
    });

    test('should handle errors without message', () => {
      const result = mapErrorMessage({});
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('User-Friendly Messages', () => {
    test('should not expose technical details', () => {
      const error = { status: 500, stack: 'Error stack trace...' };
      const result = handleApiError(error);
      expect(result).not.toContain('stack');
      expect(result).not.toContain('trace');
    });

    test('should provide actionable messages', () => {
      const error = { status: 401 };
      const result = handleApiError(error);
      expect(result.length).toBeGreaterThan(20); // Should be descriptive
    });
  });
});
