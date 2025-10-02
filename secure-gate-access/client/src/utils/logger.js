/**
 * 🛠️ Logger Utility
 * 
 * Production-safe logging utility that only outputs logs in development mode.
 * Provides consistent logging interface with log levels and context.
 * 
 * Usage:
 *   import logger from '@/utils/logger';
 *   logger.debug('Component mounted', { componentName: 'Dashboard' });
 *   logger.error('API call failed', error);
 *   logger.warn('Deprecated feature used');
 *   logger.info('User logged in');
 */

const isDevelopment = process.env.NODE_ENV === 'development';

class Logger {
  constructor() {
    this.isDevelopment = isDevelopment;
  }

  /**
   * Format log message with timestamp and context
   */
  _formatMessage(level, message, context) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    
    if (context) {
      return { prefix, message, context };
    }
    
    return { prefix, message };
  }

  /**
   * Log debug information (development only)
   */
  debug(message, context = null) {
    if (!this.isDevelopment) return;
    
    const formatted = this._formatMessage('DEBUG', message, context);
    if (formatted.context) {
      console.log(`${formatted.prefix} ${formatted.message}`, formatted.context);
    } else {
      console.log(`${formatted.prefix} ${formatted.message}`);
    }
  }

  /**
   * Log informational messages (development only)
   */
  info(message, context = null) {
    if (!this.isDevelopment) return;
    
    const formatted = this._formatMessage('INFO', message, context);
    if (formatted.context) {
      console.log(`${formatted.prefix} ${formatted.message}`, formatted.context);
    } else {
      console.log(`${formatted.prefix} ${formatted.message}`);
    }
  }

  /**
   * Log warning messages (always logged)
   */
  warn(message, context = null) {
    const formatted = this._formatMessage('WARN', message, context);
    if (formatted.context) {
      console.warn(`${formatted.prefix} ${formatted.message}`, formatted.context);
    } else {
      console.warn(`${formatted.prefix} ${formatted.message}`);
    }
  }

  /**
   * Log error messages (always logged)
   */
  error(message, error = null, context = null) {
    const formatted = this._formatMessage('ERROR', message, context);
    
    if (error && context) {
      console.error(`${formatted.prefix} ${formatted.message}`, error, formatted.context);
    } else if (error) {
      console.error(`${formatted.prefix} ${formatted.message}`, error);
    } else if (context) {
      console.error(`${formatted.prefix} ${formatted.message}`, formatted.context);
    } else {
      console.error(`${formatted.prefix} ${formatted.message}`);
    }
  }

  /**
   * Log performance metrics (development only)
   */
  performance(label, duration, context = null) {
    if (!this.isDevelopment) return;
    
    const message = `⏱️ ${label}: ${duration}ms`;
    this.debug(message, context);
  }

  /**
   * Group related logs together (development only)
   */
  group(label, callback) {
    if (!this.isDevelopment) return;
    
    console.group(label);
    callback();
    console.groupEnd();
  }

  /**
   * Log table data (development only)
   */
  table(data) {
    if (!this.isDevelopment) return;
    console.table(data);
  }
}

// Export singleton instance
const logger = new Logger();
export default logger;
