/**
 * Error Mapper Unit Tests
 * Tests for error handling and mapping utilities
 */

import {
  mapStatusToMessage,
  handleApiError,
  mapSuccessMessage,
  formatValidationErrors,
  validateResponse,
  mapErrorMessage
} from '../../utils/errorMapper';

describe('Error Mapper', () => {
  describe('mapStatusToMessage', () => {
    test('should map known status codes to default messages', () => {
      expect(mapStatusToMessage(401)).toContain('Authentication');
      expect(mapStatusToMessage(403)).toContain('Access');
      expect(mapStatusToMessage(404)).toContain('not found');
      expect(mapStatusToMessage(429)).toContain('Too many');
      expect(mapStatusToMessage(500)).toContain('Server');
    });

    test('should prefer payload.message patterns when present', () => {
      expect(mapStatusToMessage(400, { message: 'Invitation expired' })).toBe('This invitation has expired.');
      expect(mapStatusToMessage(400, { message: 'duplicate key value violates unique constraint' })).toBe('This item already exists.');
    });
  });

  describe('handleApiError', () => {
    test('should return fallback message for null error', () => {
      expect(handleApiError(null)).toContain('unexpected');
    });

    test('should map based on error.status when present', () => {
      expect(handleApiError({ status: 404, response: { payload: {} } })).toContain('not found');
    });

    test('should return network message for fetch/network errors', () => {
      expect(handleApiError(new Error('Network Error'))).toContain('Network');
    });

    test('should return timeout message for timeout errors', () => {
      const err = new Error('timeout of 1000ms exceeded');
      err.code = 'ECONNABORTED';
      expect(handleApiError(err)).toContain('timeout');
    });
  });

  describe('mapSuccessMessage', () => {
    test('should return correct message for known action', () => {
      expect(mapSuccessMessage('visitor_created')).toContain('Visitor');
    });

    test('should return default message for unknown action', () => {
      expect(mapSuccessMessage('unknown_action')).toContain('Operation');
    });
  });

  describe('formatValidationErrors', () => {
    test('should format object errors into a string', () => {
      const result = formatValidationErrors({ email: 'Invalid email' });
      expect(result).toContain('email');
      expect(result).toContain('Invalid email');
    });

    test('should return default message when invalid input', () => {
      expect(formatValidationErrors(null)).toContain('Please fix');
    });
  });

  describe('validateResponse', () => {
    test('should consider payload.success false as not ok', () => {
      const res = { status: 200, ok: true };
      const result = validateResponse(res, { success: false, message: 'Nope' });
      expect(result.ok).toBe(false);
      expect(result.message).toBe('Nope');
    });
  });

  describe('mapErrorMessage', () => {
    test('should prefer userMessage', () => {
      expect(mapErrorMessage({ userMessage: 'Friendly' })).toBe('Friendly');
    });
  });
});
