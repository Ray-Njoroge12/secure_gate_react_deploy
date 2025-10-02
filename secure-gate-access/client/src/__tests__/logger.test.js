// client/src/__tests__/logger.test.js
import logger from '../utils/logger';

describe('Logger Utility', () => {
  let consoleLogSpy, consoleWarnSpy, consoleErrorSpy;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    test('should not log debug messages in production', () => {
      logger.debug('test debug message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('should not log info messages in production', () => {
      logger.info('test info message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('should still log errors in production', () => {
      const error = new Error('test error');
      logger.error('test error message', error);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('should still log warnings in production', () => {
      logger.warn('test warning');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('Development Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    test('should log debug messages with [DEBUG] prefix', () => {
      logger.debug('test message');
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleLogSpy.mock.calls[0][0]).toContain('[DEBUG]');
    });

    test('should log info messages with [INFO] prefix', () => {
      logger.info('test message');
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleLogSpy.mock.calls[0][0]).toContain('[INFO]');
    });

    test('should log warnings with [WARN] prefix', () => {
      logger.warn('test warning');
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy.mock.calls[0][0]).toContain('[WARN]');
    });

    test('should log errors with [ERROR] prefix', () => {
      const error = new Error('test error');
      logger.error('test error', error);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('[ERROR]');
    });

    test('should include context when provided', () => {
      logger.debug('test', { userId: 123, action: 'login' });
      expect(consoleLogSpy).toHaveBeenCalled();
      const calls = consoleLogSpy.mock.calls[0];
      expect(calls).toHaveLength(2);
      expect(calls[1]).toEqual({ userId: 123, action: 'login' });
    });

    test('should handle messages without context', () => {
      logger.debug('simple message');
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleLogSpy.mock.calls[0]).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle Error objects', () => {
      const error = new Error('test error');
      error.stack = 'Error stack trace';
      logger.error('Error occurred', error);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('should handle string errors', () => {
      logger.error('String error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('should handle null/undefined', () => {
      expect(() => logger.debug(null)).not.toThrow();
      expect(() => logger.debug(undefined)).not.toThrow();
    });
  });
});
