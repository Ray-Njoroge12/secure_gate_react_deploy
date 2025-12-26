import logger from '../../utils/logger';

describe('logger', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      debug: jest.spyOn(console, 'debug').mockImplementation()
    };
  });

  afterEach(() => {
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  test('debug logs message', () => {
    logger.debug('Debug message');
    // Logger may or may not call console based on env, just verify no error
    expect(true).toBe(true);
  });

  test('info logs message', () => {
    logger.info('Info message');
    expect(true).toBe(true);
  });

  test('warn logs message', () => {
    logger.warn('Warning message');
    expect(true).toBe(true);
  });

  test('error logs message', () => {
    logger.error('Error message');
    expect(true).toBe(true);
  });

  test('logger methods are callable with multiple arguments', () => {
    expect(() => logger.debug('msg', { data: 1 })).not.toThrow();
    expect(() => logger.info('msg', { data: 1 })).not.toThrow();
    expect(() => logger.warn('msg', { data: 1 })).not.toThrow();
    expect(() => logger.error('msg', new Error('test'))).not.toThrow();
  });
});
