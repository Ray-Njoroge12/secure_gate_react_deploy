// server/src/utils/logger.js
/**
 * Basic Logger Utility
 * Provides structured logging for the application
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

class Logger {
  constructor() {
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    this.level = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta
    };

    if (isDevelopment) {
      // Pretty print for development
      return `${timestamp} [${level.toUpperCase()}] ${message}${
        Object.keys(meta).length > 0 ? '\n' + JSON.stringify(meta, null, 2) : ''
      }`;
    } else {
      // JSON format for production
      return JSON.stringify(logEntry);
    }
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.level];
  }

  error(message, meta = {}) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, meta));
    }
  }

  warn(message, meta = {}) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  info(message, meta = {}) {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, meta));
    }
  }

  debug(message, meta = {}) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;
export { Logger };