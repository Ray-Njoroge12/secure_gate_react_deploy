// client/src/__tests__/utils/logger.test.js
import logger from 'utils/logger';

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

  describe('Development Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    test('should log debug messages with [DEBUG] prefix', () => {
      logger.debug('test message');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] test message')
      );
    });

    test('should log info messages with [INFO] prefix', () => {
      logger.info('test message');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] test message')
      );
    });

    test('should include context when provided', () => {
      logger.debug('test', { userId: 123, action: 'login' });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] test'),
        { userId: 123, action: 'login' }
      );
    });

    test('should handle messages without context', () => {
      logger.debug('simple message');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] simple message')
      );
    });
  });

  describe('Error Logging', () => {
    test('should log error objects', () => {
      const error = new Error('test error');
      logger.error('Error occurred', error);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] Error occurred'),
        error
      );
    });

    test('should log error with context', () => {
      const error = new Error('test error');
      const context = { userId: 123 };
      logger.error('Error occurred', error, context);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] Error occurred'),
        error,
        context
      );
    });
  });

  describe('Warning Logging', () => {
    test('should log warnings with [WARN] prefix', () => {
      logger.warn('test warning');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN] test warning')
      );
    });

    test('should log warnings with context', () => {
      const context = { reason: 'deprecated' };
      logger.warn('test warning', context);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN] test warning'),
        context
      );
    });
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    test('should not log debug messages in production', () => {
      logger.debug('test message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('should not log info messages in production', () => {
      logger.info('test message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('should still log errors in production', () => {
      const error = new Error('test error');
      logger.error('Error occurred', error);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] Error occurred'),
        error
      );
    });

    test('should still log warnings in production', () => {
      logger.warn('test warning');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN] test warning')
      );
    });
  });
});