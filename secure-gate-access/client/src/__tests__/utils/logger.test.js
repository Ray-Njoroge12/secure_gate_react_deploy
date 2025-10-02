// client/src/__tests__/utils/logger.test.js
import logger from '../../utils/logger';

describe('Logger Utility', () => {
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
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
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        expect.stringContaining('test message')
      );
    });

    test('should log info messages with [INFO] prefix', () => {
      logger.info('test message');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining('test message')
      );
    });

    test('should log with context object', () => {
      const context = { userId: 123, action: 'test' };
      logger.debug('test message', context);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        context
      );
    });

    test('should format timestamps correctly', () => {
      logger.info('test message');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\d{2}:\d{2}:\d{2}/),
        expect.any(String)
      );
    });
  });

  describe('Error Logging', () => {
    test('should log error objects', () => {
      const error = new Error('test error');
      logger.error('Error occurred', error);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.stringContaining('Error occurred'),
        error,
        undefined
      );
    });

    test('should log error with context', () => {
      const error = new Error('test error');
      const context = { userId: 123 };
      logger.error('Error occurred', error, context);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        error,
        context
      );
    });

    test('should handle error without message', () => {
      const error = new Error('test error');
      logger.error('', error);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Warning Logging', () => {
    test('should log warnings with [WARN] prefix', () => {
      logger.warn('test warning');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        expect.stringContaining('test warning')
      );
    });

    test('should log warnings with context', () => {
      const context = { reason: 'deprecated' };
      logger.warn('test warning', context);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        context
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle null messages', () => {
      logger.debug(null);
      expect(consoleLogSpy).not.toThrow();
    });

    test('should handle undefined messages', () => {
      logger.info(undefined);
      expect(consoleLogSpy).not.toThrow();
    });

    test('should handle empty strings', () => {
      logger.warn('');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    test('should handle circular context objects', () => {
      const circular = { a: 1 };
      circular.self = circular;
      expect(() => logger.debug('test', circular)).not.toThrow();
    });
  });
});
