// server/src/config/consoleOverride.js
/**
 * Console Override for Production Safety
 * Suppresses console.log in production to prevent sensitive data leakage
 * Must be imported first in server.js
 */

const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug
};

// Only override in production
if (process.env.NODE_ENV === 'production') {
  // Suppress console.log and console.debug in production
  console.log = (...args) => {
    // Allow if explicitly marked as safe
    if (args[0] && typeof args[0] === 'string' && args[0].startsWith('[SAFE]')) {
      originalConsole.log(...args);
    }
    // Otherwise, silently ignore
  };

  console.debug = () => {
    // Completely suppress debug logs in production
  };

  // Keep warn and error but sanitize potential PII
  console.warn = (...args) => {
    const sanitized = args.map(arg => sanitizePII(arg));
    originalConsole.warn(...sanitized);
  };

  console.error = (...args) => {
    const sanitized = args.map(arg => sanitizePII(arg));
    originalConsole.error(...sanitized);
  };

  console.info = (...args) => {
    const sanitized = args.map(arg => sanitizePII(arg));
    originalConsole.info(...sanitized);
  };
}

/**
 * Sanitize potential PII from log output
 */
function sanitizePII(input) {
  if (typeof input !== 'string') {
    try {
      input = JSON.stringify(input);
    } catch {
      return input;
    }
  }

  // Mask email addresses
  input = input.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi, '***@***.***');
  
  // Mask phone numbers (various formats)
  input = input.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '***-***-****');
  
  // Mask potential tokens/secrets (long alphanumeric strings)
  input = input.replace(/\b[a-zA-Z0-9]{32,}\b/g, '[REDACTED_TOKEN]');
  
  // Mask potential passwords in JSON
  input = input.replace(/"password"\s*:\s*"[^"]+"/gi, '"password":"[REDACTED]"');
  
  return input;
}

// Export for testing
export { originalConsole, sanitizePII };
export default { originalConsole, sanitizePII };
