// Test helper for creating standardized JWT tokens
import { tokenService } from '../src/services/tokenService.js';

/**
 * Create test JWT token using the new standardized format
 */
export function createTestToken(userPayload, type = 'access', expiresIn = '1h') {
  // Ensure we have proper user payload structure
  const standardizedPayload = {
    id: userPayload.id || 1,
    email: userPayload.email,
    role: userPayload.role || 'resident',
    username: userPayload.username || userPayload.email?.split('@')[0],
    verified: userPayload.verified !== false
  };

  if (process.env.NODE_ENV !== 'test') {
    console.warn('createTestToken should only be used in test environment');
  }

  // Use the tokenService to create standardized tokens
  if (type === 'access') {
    const tokens = tokenService.generateTokens(standardizedPayload);
    return tokens.accessToken;
  } else if (type === 'refresh') {
    const tokens = tokenService.generateTokens(standardizedPayload);
    return tokens.refreshToken;
  }
}

/**
 * Create authorization headers for tests
 */
export function createTestHeaders(userPayload, tokenType = 'access') {
  const token = createTestToken(userPayload, tokenType);
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Pre-configured test user payloads
 */
export const testUsers = {
  resident: {
    id: 1,
    email: 'resident@test.com',
    role: 'resident',
    username: 'resident',
    verified: true
  },
  guard: {
    id: 2,
    email: 'guard1@test.com', 
    role: 'guard',
    username: 'guard1',
    verified: true
  },
  admin: {
    id: 3,
    email: 'admin@test.com',
    role: 'admin',
    username: 'admin',
    verified: true
  }
};

/**
 * Quick helper functions for common test scenarios
 */
export const testAuth = {
  residentHeaders: () => createTestHeaders(testUsers.resident),
  guardHeaders: () => createTestHeaders(testUsers.guard),
  adminHeaders: () => createTestHeaders(testUsers.admin),
  
  // For backward compatibility with existing tests
  makeHeaders: (email, role = 'resident') => {
    const userPayload = {
      id: email === 'resident@test.com' ? 1 : 
          email === 'guard1@test.com' ? 2 : 
          email === 'admin@test.com' ? 3 : 999,
      email,
      role,
      username: email.split('@')[0],
      verified: true
    };
    return createTestHeaders(userPayload);
  }
};

export default testAuth;