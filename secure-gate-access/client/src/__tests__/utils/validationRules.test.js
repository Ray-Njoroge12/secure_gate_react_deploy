import {
  validationFunctions,
  createValidationResult,
  debounce,
  throttle
} from '../../utils/validationRules';

describe('validationRules', () => {
  describe('createValidationResult', () => {
    test('creates valid result', () => {
      const result = createValidationResult(true, null);
      expect(result.isValid).toBe(true);
      expect(result.message).toBeNull();
    });

    test('creates invalid result with message', () => {
      const result = createValidationResult(false, 'Error message');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Error message');
    });

    test('includes additional data', () => {
      const result = createValidationResult(true, null, { field: 'email' });
      expect(result.field).toBe('email');
    });
  });

  describe('validationFunctions.required', () => {
    test('returns invalid for empty string', () => {
      const result = validationFunctions.required('');
      expect(result.isValid).toBe(false);
    });

    test('returns invalid for null', () => {
      const result = validationFunctions.required(null);
      expect(result.isValid).toBe(false);
    });

    test('returns invalid for undefined', () => {
      const result = validationFunctions.required(undefined);
      expect(result.isValid).toBe(false);
    });

    test('returns valid for non-empty value', () => {
      const result = validationFunctions.required('valid');
      expect(result.isValid).toBe(true);
    });

    test('returns invalid for whitespace only', () => {
      const result = validationFunctions.required('   ');
      expect(result.isValid).toBe(false);
    });

    test('uses custom message when provided', () => {
      const result = validationFunctions.required('', { message: 'Custom required' });
      expect(result.message).toBe('Custom required');
    });
  });

  describe('validationFunctions.email', () => {
    test('returns invalid for malformed email', () => {
      const result = validationFunctions.email('invalid');
      expect(result.isValid).toBe(false);
    });

    test('returns valid for proper email', () => {
      const result = validationFunctions.email('test@example.com');
      expect(result.isValid).toBe(true);
    });

    test('returns valid for empty value (let required handle it)', () => {
      const result = validationFunctions.email('');
      expect(result.isValid).toBe(true);
    });
  });

  describe('validationFunctions.minLength', () => {
    test('returns invalid for short string', () => {
      const result = validationFunctions.minLength('ab', { min: 5 });
      expect(result.isValid).toBe(false);
    });

    test('returns valid for string meeting minimum', () => {
      const result = validationFunctions.minLength('abcde', { min: 5 });
      expect(result.isValid).toBe(true);
    });

    test('returns valid for empty value', () => {
      const result = validationFunctions.minLength('', { min: 5 });
      expect(result.isValid).toBe(true);
    });
  });

  describe('validationFunctions.maxLength', () => {
    test('returns invalid for long string', () => {
      const result = validationFunctions.maxLength('abcdef', { max: 5 });
      expect(result.isValid).toBe(false);
    });

    test('returns valid for string within limit', () => {
      const result = validationFunctions.maxLength('abc', { max: 5 });
      expect(result.isValid).toBe(true);
    });
  });

  describe('validationFunctions.phone', () => {
    test('returns valid for empty value', () => {
      const result = validationFunctions.phone('');
      expect(result.isValid).toBe(true);
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('delays function execution', () => {
      const callback = jest.fn();
      const debounced = debounce(callback, 100);

      debounced();
      expect(callback).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('cancels previous calls on rapid invocation', () => {
      const callback = jest.fn();
      const debounced = debounce(callback, 100);

      debounced();
      debounced();
      debounced();

      jest.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('executes immediately on first call', () => {
      const callback = jest.fn();
      const throttled = throttle(callback, 100);

      throttled();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('ignores calls within throttle period', () => {
      const callback = jest.fn();
      const throttled = throttle(callback, 100);

      throttled();
      throttled();
      throttled();

      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('allows calls after throttle period', () => {
      const callback = jest.fn();
      const throttled = throttle(callback, 100);

      throttled();
      jest.advanceTimersByTime(100);
      throttled();

      expect(callback).toHaveBeenCalledTimes(2);
    });
  });
});
