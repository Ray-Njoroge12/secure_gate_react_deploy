/**
 * Unit Tests for Logging Service
 * Phase 4: Infrastructure & Monitoring
 * 
 * Tests cover:
 * - Logger initialization and configuration
 * - Log level operations (error, warn, info, debug)
 * - Specialized logging (security, performance, audit, database, API)
 * - Correlation ID management
 * - Log statistics
 * - Log file operations
 * - Health check
 */

import { jest } from '@jest/globals';

// Mock winston - create fresh logger for each call
const createMockLogger = () => {
  // Create a simple extensible object
  const logger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    silly: jest.fn(),
    child: jest.fn(function() { return logger; })
  };
  return logger;
};

const mockCreateLogger = jest.fn((config) => {
  // Always return a valid logger object
  return createMockLogger();
});

const winstonMock = {
  createLogger: mockCreateLogger,
  format: {
    combine: jest.fn((...args) => args),
    timestamp: jest.fn(() => ({ timestamp: true })),
    colorize: jest.fn(() => ({ colorize: true })),
    errors: jest.fn(() => ({ errors: true })),
    json: jest.fn(() => ({ json: true })),
    printf: jest.fn((fn) => ({ printf: fn })),
    metadata: jest.fn(() => ({ metadata: true }))
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
};

jest.unstable_mockModule('winston', () => ({
  default: winstonMock,
  createLogger: mockCreateLogger,
  format: winstonMock.format,
  transports: winstonMock.transports
}));

// Mock winston-daily-rotate-file
jest.unstable_mockModule('winston-daily-rotate-file', () => ({
  default: jest.fn()
}));

// Mock fs
const mockFsPromises = {
  readdir: jest.fn().mockResolvedValue(['app.log', 'error.log']),
  stat: jest.fn().mockResolvedValue({ size: 1024, birthtime: new Date(), mtime: new Date() }),
  readFile: jest.fn().mockResolvedValue('{"level":"info","message":"test"}'),
  open: jest.fn().mockResolvedValue({
    read: jest.fn().mockResolvedValue({ bytesRead: 100 }),
    close: jest.fn().mockResolvedValue(undefined)
  }),
  unlink: jest.fn().mockResolvedValue(undefined)
};

const mockFsSync = {
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue(['app.log', 'error.log']),
  statSync: jest.fn().mockReturnValue({ size: 1024, birthtime: new Date(), mtime: new Date() }),
  promises: mockFsPromises  // Include promises on the default export object
};

jest.unstable_mockModule('fs', () => ({
  default: mockFsSync,
  existsSync: mockFsSync.existsSync,
  mkdirSync: mockFsSync.mkdirSync,
  readdirSync: mockFsSync.readdirSync,
  statSync: mockFsSync.statSync,
  promises: mockFsPromises
}));

// Import after mocks
const { default: loggingService, LoggingService } = await import('../../src/services/loggingService.js');

describe('LoggingService', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(async () => {
    jest.clearAllMocks();
    // DO NOT call jest.resetModules() - it clears our Winston/fs mocks!
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Reset log stats
    loggingService.resetStats();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('initialization', () => {
    it('should create a singleton instance', () => {
      expect(loggingService).toBeDefined();
      expect(loggingService).toBeInstanceOf(LoggingService);
    });

    it('should initialize with default loggers', () => {
      expect(loggingService.loggers).toBeDefined();
      expect(loggingService.loggers.size).toBeGreaterThan(0);
    });

    it('should have log directory configured', () => {
      expect(loggingService.logDir).toBeDefined();
      expect(loggingService.logDir).toContain('logs');
    });

    it('should initialize log stats', () => {
      expect(loggingService.logStats).toBeDefined();
      expect(loggingService.logStats.totalLogs).toBe(0);
      expect(loggingService.logStats.errorCount).toBe(0);
    });
  });

  describe('ensureLogDirectory', () => {
    it('should create log directory if it does not exist', () => {
      mockFsSync.existsSync.mockReturnValueOnce(false);
      
      loggingService.ensureLogDirectory();
      
      expect(mockFsSync.mkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      );
    });

    it('should not create directory if it already exists', () => {
      mockFsSync.existsSync.mockReturnValueOnce(true);
      mockFsSync.mkdirSync.mockClear();
      
      loggingService.ensureLogDirectory();
      
      expect(mockFsSync.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('createLogger', () => {
    it('should create a logger with specified name', () => {
      const logger = loggingService.createLogger('test-logger', {
        level: 'debug',
        enableConsole: true,
        enableFile: true
      });

      expect(logger).toBeDefined();
      expect(loggingService.loggers.has('test-logger')).toBe(true);
    });

    it('should use default options when not provided', () => {
      const logger = loggingService.createLogger('default-test');

      expect(logger).toBeDefined();
    });

    it('should create logger with custom filename', () => {
      const logger = loggingService.createLogger('custom-file', {
        filename: 'custom-log',
        enableFile: true,
        enableRotation: true
      });

      expect(logger).toBeDefined();
    });
  });

  describe('getLogger', () => {
    it('should return existing logger by name', () => {
      loggingService.createLogger('existing-logger');
      
      const logger = loggingService.getLogger('existing-logger');
      
      expect(logger).toBeDefined();
    });

    it('should return app logger as default', () => {
      const logger = loggingService.getLogger('non-existent');
      
      expect(logger).toBeDefined();
    });

    it('should return app logger when no name provided', () => {
      const logger = loggingService.getLogger();
      
      expect(logger).toBeDefined();
    });
  });

  describe('updateLogStats', () => {
    it('should increment total logs', () => {
      const initialCount = loggingService.logStats.totalLogs;
      
      loggingService.updateLogStats('info', 'app');
      
      expect(loggingService.logStats.totalLogs).toBe(initialCount + 1);
    });

    it('should increment error count for error level', () => {
      const initialCount = loggingService.logStats.errorCount;
      
      loggingService.updateLogStats('error', 'app');
      
      expect(loggingService.logStats.errorCount).toBe(initialCount + 1);
    });

    it('should increment warning count for warn level', () => {
      const initialCount = loggingService.logStats.warningCount;
      
      loggingService.updateLogStats('warn', 'app');
      
      expect(loggingService.logStats.warningCount).toBe(initialCount + 1);
    });

    it('should update last log time', () => {
      loggingService.updateLogStats('info', 'app');
      
      expect(loggingService.logStats.lastLogTime).toBeDefined();
    });

    it('should update category counts', () => {
      loggingService.updateLogStats('info', 'security');
      
      expect(loggingService.logStats.logsByCategory.get('security')).toBe(1);
    });
  });

  describe('Correlation ID Management', () => {
    describe('setCorrelationId', () => {
      it('should set correlation ID', () => {
        loggingService.setCorrelationId('test-correlation-123');
        
        expect(loggingService.getCorrelationId()).toBe('test-correlation-123');
      });
    });

    describe('getCorrelationId', () => {
      it('should return set correlation ID', () => {
        loggingService.setCorrelationId('my-correlation');
        
        expect(loggingService.getCorrelationId()).toBe('my-correlation');
      });

      it('should return default when no ID set', () => {
        loggingService.clearCorrelationId();
        
        expect(loggingService.getCorrelationId()).toBe('no-correlation-id');
      });
    });

    describe('clearCorrelationId', () => {
      it('should clear correlation ID', () => {
        loggingService.setCorrelationId('to-clear');
        loggingService.clearCorrelationId();
        
        expect(loggingService.getCorrelationId()).toBe('no-correlation-id');
      });
    });
  });

  describe('Structured Logging Methods', () => {
    describe('logError', () => {
      it('should log error with error object', () => {
        const error = new Error('Test error');
        
        loggingService.logError('Error occurred', error, { userId: 1 });
        
        expect(loggingService.logStats.errorCount).toBeGreaterThan(0);
      });

      it('should log error without error object', () => {
        loggingService.logError('Error message', null, { context: 'test' });
        
        expect(loggingService.logStats.totalLogs).toBeGreaterThan(0);
      });
    });

    describe('logWarning', () => {
      it('should log warning message', () => {
        loggingService.logWarning('Warning message', { warningType: 'test' });
        
        expect(loggingService.logStats.warningCount).toBeGreaterThan(0);
      });
    });

    describe('logInfo', () => {
      it('should log info message', () => {
        loggingService.logInfo('Info message', { infoType: 'test' });
        
        expect(loggingService.logStats.infoCount).toBeGreaterThan(0);
      });
    });

    describe('logDebug', () => {
      it('should log debug message', () => {
        loggingService.logDebug('Debug message', { debugInfo: 'test' });
        
        expect(loggingService.logStats.debugCount).toBeGreaterThan(0);
      });
    });
  });

  describe('Alias Methods', () => {
    describe('info', () => {
      it('should call logInfo', () => {
        const spy = jest.spyOn(loggingService, 'logInfo');
        
        loggingService.info('Info via alias');
        
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
      });
    });

    describe('error', () => {
      it('should call logError with Error object', () => {
        const spy = jest.spyOn(loggingService, 'logError');
        const error = new Error('Test');
        
        loggingService.error('Error via alias', error);
        
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
      });

      it('should call logError with meta object', () => {
        const spy = jest.spyOn(loggingService, 'logError');
        
        loggingService.error('Error via alias', { key: 'value' });
        
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
      });
    });

    describe('warn', () => {
      it('should call logWarning', () => {
        const spy = jest.spyOn(loggingService, 'logWarning');
        
        loggingService.warn('Warning via alias');
        
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
      });
    });

    describe('debug', () => {
      it('should call logDebug', () => {
        const spy = jest.spyOn(loggingService, 'logDebug');
        
        loggingService.debug('Debug via alias');
        
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
      });
    });
  });

  describe('Specialized Logging Methods', () => {
    describe('logSecurity', () => {
      it('should log security event', () => {
        loggingService.logSecurity('warn', 'Security event', { threat: 'low' });
        
        expect(loggingService.logStats.totalLogs).toBeGreaterThan(0);
      });
    });

    describe('logPerformance', () => {
      it('should log performance event', () => {
        loggingService.logPerformance('info', 'Performance metric', { latency: 100 });
        
        expect(loggingService.logStats.totalLogs).toBeGreaterThan(0);
      });
    });

    describe('logAudit', () => {
      it('should log audit event', () => {
        loggingService.logAudit('User login', 'LOGIN', 1, { ip: '127.0.0.1' });
        
        expect(loggingService.logStats.totalLogs).toBeGreaterThan(0);
      });

      it('should log audit event without user ID', () => {
        loggingService.logAudit('System event', 'SYSTEM', null, {});
        
        expect(loggingService.logStats.totalLogs).toBeGreaterThan(0);
      });
    });

    describe('logDatabase', () => {
      it('should log database event', () => {
        loggingService.logDatabase('info', 'Query executed', { query: 'SELECT *', duration: 50 });
        
        expect(loggingService.logStats.totalLogs).toBeGreaterThan(0);
      });
    });

    describe('logAPI', () => {
      it('should log API event with request', () => {
        const mockRequest = {
          method: 'GET',
          originalUrl: '/api/test',
          get: jest.fn().mockReturnValue('Mozilla/5.0'),
          ip: '127.0.0.1',
          user: { id: 1 }
        };
        
        loggingService.logAPI('info', 'API request', mockRequest, { duration: 100 });
        
        expect(loggingService.logStats.totalLogs).toBeGreaterThan(0);
      });

      it('should log API event without request', () => {
        loggingService.logAPI('info', 'API event', null, { endpoint: '/test' });
        
        expect(loggingService.logStats.totalLogs).toBeGreaterThan(0);
      });
    });
  });

  describe('getStats', () => {
    it('should return logging statistics', () => {
      loggingService.logInfo('Test message');
      loggingService.logError('Test error');
      
      const stats = loggingService.getStats();
      
      expect(stats.totalLogs).toBeGreaterThan(0);
      expect(stats.logsByCategory).toBeDefined();
      expect(stats.loggers).toBeDefined();
      expect(stats.uptime).toBeDefined();
      expect(stats.memoryUsage).toBeDefined();
    });
  });

  describe('resetStats', () => {
    it('should reset all statistics', () => {
      loggingService.logInfo('Test');
      loggingService.logError('Test');
      
      loggingService.resetStats();
      
      expect(loggingService.logStats.totalLogs).toBe(0);
      expect(loggingService.logStats.errorCount).toBe(0);
      expect(loggingService.logStats.warningCount).toBe(0);
    });
  });

  describe('getLogFiles', () => {
    it('should return list of log files', async () => {
      mockFsPromises.readdir.mockResolvedValue(['app.log', 'error.log', 'debug.log']);
      mockFsPromises.stat.mockResolvedValue({
        size: 1024,
        birthtime: new Date(),
        mtime: new Date()
      });
      
      const files = await loggingService.getLogFiles();
      
      expect(Array.isArray(files)).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      mockFsPromises.readdir.mockRejectedValueOnce(new Error('Read error'));
      
      const files = await loggingService.getLogFiles();
      
      expect(files).toEqual([]);
    });
  });

  describe('readLogFile', () => {
    it('should read log file content', async () => {
      mockFsPromises.stat.mockResolvedValue({ size: 500 });
      mockFsPromises.readFile.mockResolvedValue('{"level":"info","message":"test"}');
      
      const content = await loggingService.readLogFile('app.log');
      
      expect(content.content).toBeDefined();
      expect(content.truncated).toBe(false);
    });

    it('should handle large files with truncation', async () => {
      mockFsPromises.stat.mockResolvedValue({ size: 2 * 1024 * 1024 }); // 2MB
      mockFsPromises.open.mockResolvedValue({
        read: jest.fn().mockResolvedValue({ bytesRead: 1024 * 1024 }),
        close: jest.fn().mockResolvedValue(undefined)
      });
      
      const content = await loggingService.readLogFile('large.log', 1024 * 1024);
      
      expect(content.truncated).toBe(true);
    });

    it('should throw error for non-existent file', async () => {
      mockFsPromises.stat.mockRejectedValueOnce(new Error('File not found'));
      
      await expect(loggingService.readLogFile('missing.log'))
        .rejects.toThrow('File not found');
    });
  });

  describe('searchLogs', () => {
    beforeEach(() => {
      mockFsPromises.readdir.mockResolvedValue(['app.log']);
      mockFsPromises.stat.mockResolvedValue({
        size: 1024,
        birthtime: new Date(),
        mtime: new Date()
      });
    });

    it('should search logs with criteria', async () => {
      mockFsPromises.readFile.mockResolvedValue(
        '{"level":"info","message":"test message","timestamp":"2025-01-01T00:00:00Z"}\n' +
        '{"level":"error","message":"error message","timestamp":"2025-01-01T00:00:00Z"}'
      );
      
      const results = await loggingService.searchLogs({
        level: 'info',
        limit: 10
      });
      
      expect(Array.isArray(results)).toBe(true);
    });

    it('should filter by message content', async () => {
      mockFsPromises.readFile.mockResolvedValue(
        '{"level":"info","message":"user logged in","timestamp":"2025-01-01T00:00:00Z"}\n' +
        '{"level":"info","message":"data exported","timestamp":"2025-01-01T00:00:00Z"}'
      );
      
      const results = await loggingService.searchLogs({
        message: 'logged in'
      });
      
      expect(Array.isArray(results)).toBe(true);
    });

    it('should return empty array on error', async () => {
      mockFsPromises.readdir.mockRejectedValueOnce(new Error('Read error'));
      
      const results = await loggingService.searchLogs({});
      
      expect(results).toEqual([]);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', () => {
      const health = loggingService.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.logDirectory).toBeDefined();
      expect(health.activeLoggers).toBeDefined();
      expect(health.stats).toBeDefined();
    });
  });

  describe('getLogDirectorySize', () => {
    it('should return log directory size', () => {
      mockFsSync.readdirSync.mockReturnValue(['app.log', 'error.log']);
      mockFsSync.statSync.mockReturnValue({ size: 1024 * 1024 }); // 1MB per file
      
      const size = loggingService.getLogDirectorySize();
      
      expect(size.bytes).toBeDefined();
      expect(size.mb).toBeDefined();
      expect(size.files).toBeDefined();
    });

    it('should handle errors', () => {
      mockFsSync.readdirSync.mockImplementation(() => {
        throw new Error('Read error');
      });
      
      const size = loggingService.getLogDirectorySize();
      
      expect(size.error).toBeDefined();
    });
  });

  describe('cleanupOldLogs', () => {
    it('should cleanup old log files', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      
      mockFsPromises.readdir.mockResolvedValue(['old.log', 'recent.log']);
      mockFsPromises.stat
        .mockResolvedValueOnce({ mtime: oldDate })
        .mockResolvedValueOnce({ mtime: new Date() });
      mockFsPromises.unlink.mockResolvedValue(undefined);
      
      const deleted = await loggingService.cleanupOldLogs(30);
      
      expect(typeof deleted).toBe('number');
    });

    it('should handle cleanup errors', async () => {
      mockFsPromises.readdir.mockRejectedValueOnce(new Error('Cleanup error'));
      
      const deleted = await loggingService.cleanupOldLogs(30);
      
      expect(deleted).toBe(0);
    });
  });
});
