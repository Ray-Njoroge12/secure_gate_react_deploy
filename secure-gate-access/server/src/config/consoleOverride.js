/**
 * Production Console Override
 * Disables console.log in production while preserving error/warn
 * This is loaded at app startup to make all console.log calls production-safe
 */

// Only override in production
if (process.env.NODE_ENV === 'production') {
  // Preserve original console methods
  const originalConsole = {
    log: console.log,
    info: console.info,
    debug: console.debug,
    warn: console.warn,
    error: console.error
  };

  // Override console.log to be silent in production
  console.log = function(...args) {
    // Silently ignore in production
    // If debugging is needed, use logger.info() instead
  };

  // Override console.info to be silent in production
  console.info = function(...args) {
    // Silently ignore in production
  };

  // Override console.debug to be silent in production  
  console.debug = function(...args) {
    // Silently ignore in production
  };

  // Keep console.warn and console.error - these should still log
  // console.warn and console.error remain unchanged

  // Log that console override is active
  originalConsole.log('🔒 Production mode: console.log/info/debug disabled for security');
  originalConsole.log('   Use logger.info/warn/error for production logging');
}

export default {
  isProduction: process.env.NODE_ENV === 'production',
  consoleSuppressed: process.env.NODE_ENV === 'production'
};
