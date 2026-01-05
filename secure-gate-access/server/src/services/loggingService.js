// server/src/services/loggingService.js
/**
 * Enhanced Logging Service
 * Comprehensive structured logging with Winston, log aggregation, and monitoring
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Enhanced Logging Service with structured logging and monitoring
 */
class LoggingService {
  constructor() {
    this.loggers = new Map();
    this.logDir = path.join(__dirname, '../../logs');
    this.correlationIdStore = new Map();
    this.logStats = {
      totalLogs: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      debugCount: 0,
      lastLogTime: null,
      logsByLevel: {
        error: 0,
        warn: 0,
        info: 0,
        debug: 0,
        verbose: 0,
        silly: 0
      },
      logsByCategory: new Map()
    };

    this.initialize();
  }

  /**
   * Initialize logging service with directory creation and logger setup
   */
  initialize() {
    try {
      // Ensure log directory exists
      this.ensureLogDirectory();

      // Create main application logger
      this.createLogger('app', {
        level: process.env.LOG_LEVEL || 'info',
        enableConsole: true,
        enableFile: true,
        enableRotation: true
      });

      // Create specialized loggers
      this.createLogger('security', {
        level: 'info',
        enableFile: true,
        enableRotation: true,
        filename: 'security'
      });

      this.createLogger('performance', {
        level: 'info',
        enableFile: true,
        enableRotation: true,
        filename: 'performance'
      });

      this.createLogger('audit', {
        level: 'info',
        enableFile: true,
        enableRotation: true,
        filename: 'audit'
      });

      this.createLogger('database', {
        level: 'info',
        enableFile: true,
        enableRotation: true,
        filename: 'database'
      });

      this.createLogger('api', {
        level: 'info',
        enableFile: true,
        enableRotation: true,
        filename: 'api'
      });

      console.log('✅ Enhanced logging service initialized');

    } catch (error) {
      console.error('❌ Failed to initialize logging service:', error);
      throw error;
    }
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
      console.log(`📁 Log directory created: ${this.logDir}`);
    }
  }

  /**
   * Create a specialized logger with custom configuration
   */
  createLogger(name, options = {}) {
    const {
      level = 'info',
      enableConsole = false,
      enableFile = true,
      enableRotation = true,
      filename = name,
      maxSize = '20m',
      maxFiles = '14d'
    } = options;

    const transports = [];

    // Console transport (for development and debugging)
    if (enableConsole) {
      transports.push(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            let logMessage = `${timestamp} [${level.toUpperCase()}]`;

            // Add correlation ID if present
            if (meta.correlationId) {
              logMessage += ` [${meta.correlationId}]`;
            }

            logMessage += `: ${message}`;

            // Add metadata if present
            const metaKeys = Object.keys(meta).filter(key => key !== 'correlationId');
            if (metaKeys.length > 0) {
              const metaString = metaKeys.map(key => `${key}=${JSON.stringify(meta[key])}`).join(', ');
              logMessage += ` | ${metaString}`;
            }

            return logMessage;
          })
        )
      }));
    }

    // File transport with rotation
    if (enableFile) {
      const fileTransport = enableRotation
        ? new DailyRotateFile({
          filename: path.join(this.logDir, `${filename}-%DATE%.log`),
          datePattern: 'YYYY-MM-DD',
          maxSize,
          maxFiles,
          zippedArchive: true,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
          )
        })
        : new winston.transports.File({
          filename: path.join(this.logDir, `${filename}.log`),
          maxsize: 20 * 1024 * 1024, // 20MB
          maxFiles: 5,
          tailable: true,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
          )
        });

      transports.push(fileTransport);
    }

    // Error-specific file transport
    if (enableFile) {
      transports.push(new winston.transports.File({
        filename: path.join(this.logDir, `${filename}-error.log`),
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10,
        tailable: true,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      }));
    }

    const logger = winston.createLogger({
      level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
      ),
      transports,
      defaultMeta: { service: name },
      exitOnError: false
    });

    // Add custom logging methods
    logger.logWithCorrelation = (level, message, meta = {}, correlationId = null) => {
      this.updateLogStats(level, name);

      const logData = {
        ...meta,
        correlationId: correlationId || this.getCorrelationId()
      };

      logger.log(level, message, logData);
    };

    // Override default log levels to track statistics
    const originalLog = logger.log.bind(logger);
    logger.log = (level, message, meta = {}) => {
      this.updateLogStats(level, name);
      return originalLog(level, message, meta);
    };

    this.loggers.set(name, logger);
    return logger;
  }

  /**
   * Get logger by name
   */
  getLogger(name = 'app') {
    return this.loggers.get(name) || this.loggers.get('app');
  }

  /**
   * Update logging statistics
   */
  updateLogStats(level, category) {
    this.logStats.totalLogs++;
    this.logStats.lastLogTime = new Date().toISOString();

    // Update level counts
    if (this.logStats.logsByLevel[level] !== undefined) {
      this.logStats.logsByLevel[level]++;
    }

    // Update category counts
    if (!this.logStats.logsByCategory.has(category)) {
      this.logStats.logsByCategory.set(category, 0);
    }
    this.logStats.logsByCategory.set(category, this.logStats.logsByCategory.get(category) + 1);

    // Update convenience counters
    switch (level) {
    case 'error':
      this.logStats.errorCount++;
      break;
    case 'warn':
      this.logStats.warningCount++;
      break;
    case 'info':
      this.logStats.infoCount++;
      break;
    case 'debug':
      this.logStats.debugCount++;
      break;
    }
  }

  /**
   * Set correlation ID for request tracing
   */
  setCorrelationId(id) {
    this.correlationIdStore.set('current', id);
  }

  /**
   * Get current correlation ID
   */
  getCorrelationId() {
    return this.correlationIdStore.get('current') || 'no-correlation-id';
  }

  /**
   * Clear correlation ID
   */
  clearCorrelationId() {
    this.correlationIdStore.delete('current');
  }

  /**
   * Structured logging methods with different severity levels
   */
  logError(message, error = null, meta = {}, correlationId = null) {
    const logger = this.getLogger('app');
    const logData = {
      ...meta,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      } : null
    };

    logger.logWithCorrelation('error', message, logData, correlationId);
  }

  logWarning(message, meta = {}, correlationId = null) {
    const logger = this.getLogger('app');
    logger.logWithCorrelation('warn', message, meta, correlationId);
  }

  logInfo(message, meta = {}, correlationId = null) {
    const logger = this.getLogger('app');
    logger.logWithCorrelation('info', message, meta, correlationId);
  }

  logDebug(message, meta = {}, correlationId = null) {
    const logger = this.getLogger('app');
    logger.logWithCorrelation('debug', message, meta, correlationId);
  }

  // Alias methods for convenience (allows both loggingService.info() and loggingService.logInfo())
  info(message, meta = {}, correlationId = null) {
    return this.logInfo(message, meta, correlationId);
  }

  error(message, errorOrMeta = null, meta = {}, correlationId = null) {
    // Handle both error(message, error, meta) and error(message, meta) signatures
    if (errorOrMeta instanceof Error) {
      return this.logError(message, errorOrMeta, meta, correlationId);
    }
    return this.logError(message, null, errorOrMeta || {}, meta);
  }

  warn(message, meta = {}, correlationId = null) {
    return this.logWarning(message, meta, correlationId);
  }

  debug(message, meta = {}, correlationId = null) {
    return this.logDebug(message, meta, correlationId);
  }

  /**
   * Specialized logging methods
   */
  logSecurity(level, message, meta = {}, correlationId = null) {
    const logger = this.getLogger('security');
    logger.logWithCorrelation(level, message, {
      ...meta,
      category: 'security',
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  logPerformance(level, message, meta = {}, correlationId = null) {
    const logger = this.getLogger('performance');
    logger.logWithCorrelation(level, message, {
      ...meta,
      category: 'performance',
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  logAudit(message, action, userId = null, meta = {}, correlationId = null) {
    const logger = this.getLogger('audit');
    logger.logWithCorrelation('info', message, {
      ...meta,
      category: 'audit',
      action,
      userId,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  logDatabase(level, message, meta = {}, correlationId = null) {
    const logger = this.getLogger('database');
    logger.logWithCorrelation(level, message, {
      ...meta,
      category: 'database',
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  logAPI(level, message, request = null, meta = {}, correlationId = null) {
    const logger = this.getLogger('api');

    const requestData = request ? {
      method: request.method,
      url: request.originalUrl || request.url,
      userAgent: request.get('User-Agent'),
      ip: request.ip || request.connection?.remoteAddress,
      userId: request.user?.id
    } : null;

    logger.logWithCorrelation(level, message, {
      ...meta,
      category: 'api',
      request: requestData,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  /**
   * Get logging statistics
   */
  getStats() {
    return {
      ...this.logStats,
      logsByCategory: Object.fromEntries(this.logStats.logsByCategory),
      loggers: Array.from(this.loggers.keys()),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Reset logging statistics
   */
  resetStats() {
    this.logStats = {
      totalLogs: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      debugCount: 0,
      lastLogTime: null,
      logsByLevel: {
        error: 0,
        warn: 0,
        info: 0,
        debug: 0,
        verbose: 0,
        silly: 0
      },
      logsByCategory: new Map()
    };
  }

  /**
   * Get log files information
   */
  async getLogFiles() {
    try {
      const files = await fs.promises.readdir(this.logDir);
      const logFiles = [];

      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file);
          const stats = await fs.promises.stat(filePath);

          logFiles.push({
            name: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            path: filePath
          });
        }
      }

      return logFiles.sort((a, b) => b.modified - a.modified);

    } catch (error) {
      this.logError('Failed to get log files', error);
      return [];
    }
  }

  /**
   * Read log file content (with size limit for safety)
   */
  async readLogFile(filename, maxSize = 1024 * 1024) { // 1MB default limit
    try {
      const filePath = path.join(this.logDir, filename);
      const stats = await fs.promises.stat(filePath);

      if (stats.size > maxSize) {
        // Read only the last part of the file if it's too large
        const fd = await fs.promises.open(filePath, 'r');
        const buffer = Buffer.alloc(maxSize);
        const { bytesRead } = await fd.read(buffer, 0, maxSize, Math.max(0, stats.size - maxSize));
        await fd.close();

        return {
          content: buffer.slice(0, bytesRead).toString(),
          truncated: true,
          originalSize: stats.size,
          readSize: bytesRead
        };
      } else {
        const content = await fs.promises.readFile(filePath, 'utf8');
        return {
          content,
          truncated: false,
          originalSize: stats.size,
          readSize: stats.size
        };
      }

    } catch (error) {
      this.logError('Failed to read log file', error, { filename });
      throw error;
    }
  }

  /**
   * Search logs by criteria
   */
  async searchLogs(criteria = {}) {
    const {
      level = null,
      category = null,
      startDate = null,
      endDate = null,
      message = null,
      limit = 100
    } = criteria;

    // This is a simplified implementation
    // In a real-world scenario, you might want to use a proper log aggregation system
    try {
      const logFiles = await this.getLogFiles();
      const results = [];

      for (const logFile of logFiles.slice(0, 5)) { // Limit to recent files
        if (logFile.name.includes('error') && level && level !== 'error') {
          continue;
        }

        const fileContent = await this.readLogFile(logFile.name, 512 * 1024); // 512KB limit
        const lines = fileContent.content.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const logEntry = JSON.parse(line);

            // Apply filters
            if (level && logEntry.level !== level) continue;
            if (category && logEntry.metadata?.category !== category) continue;
            if (message && !logEntry.message.toLowerCase().includes(message.toLowerCase())) continue;

            // Date filtering
            if (startDate && new Date(logEntry.timestamp) < new Date(startDate)) continue;
            if (endDate && new Date(logEntry.timestamp) > new Date(endDate)) continue;

            results.push({
              ...logEntry,
              file: logFile.name
            });

            if (results.length >= limit) break;

          } catch (parseError) {
            // Skip non-JSON lines
            continue;
          }
        }

        if (results.length >= limit) break;
      }

      return results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    } catch (error) {
      this.logError('Failed to search logs', error, { criteria });
      return [];
    }
  }

  /**
   * Health check for logging service
   */
  healthCheck() {
    let logFiles = [];
    try {
      logFiles = fs.readdirSync(this.logDir) || [];
    } catch (error) {
      // Directory may not exist in test environment
      logFiles = [];
    }
    const loggerNames = Array.from(this.loggers.keys());

    return {
      status: 'healthy',
      logDirectory: this.logDir,
      logFiles: logFiles.length,
      activeLoggers: loggerNames,
      stats: this.getStats(),
      diskSpace: this.getLogDirectorySize()
    };
  }

  /**
   * Get log directory size
   */
  getLogDirectorySize() {
    try {
      const files = fs.readdirSync(this.logDir);
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      }

      return {
        bytes: totalSize,
        mb: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        files: files.length
      };

    } catch (error) {
      return {
        bytes: 0,
        mb: 0,
        files: 0,
        error: error.message
      };
    }
  }

  /**
   * Cleanup old log files
   */
  async cleanupOldLogs(daysToKeep = 30) {
    try {
      const files = await fs.promises.readdir(this.logDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      let deletedFiles = 0;

      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file);
          const stats = await fs.promises.stat(filePath);

          if (stats.mtime < cutoffDate) {
            await fs.promises.unlink(filePath);
            deletedFiles++;
            this.logInfo('Old log file deleted', { filename: file, age: Math.round((Date.now() - stats.mtime) / (1000 * 60 * 60 * 24)) });
          }
        }
      }

      this.logInfo('Log cleanup completed', { deletedFiles, daysToKeep });
      return deletedFiles;

    } catch (error) {
      this.logError('Failed to cleanup old logs', error);
      return 0;
    }
  }
}

// Create and export singleton instance
const loggingService = new LoggingService();

export default loggingService;
export { LoggingService };