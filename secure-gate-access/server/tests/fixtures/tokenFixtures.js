/**
 * Token Test Fixtures
 * Provides reusable token data for auth-related unit tests
 * 
 * Safe test-only data - no real secrets or tokens
 */

import jwt from 'jsonwebtoken';

/**
 * Create a test token fixture with customizable payload
 */
export function createTokenFixture(options = {}) {
  const {
    userId = 1,
    email = 'test@example.com',
    role = 'resident',
    username = 'testuser',
    verified = true,
    expiresIn = '15m'
  } = options;

  const secret = 'test-jwt-secret-for-unit-tests-only-min-32-chars';
  
  const payload = {
    sub: String(userId),
    id: userId,
    email,
    role,
    username,
    verified,
    type: 'access',
    iat: Math.floor(Date.now() / 1000),
    jti: `test-jti-${userId}-${Date.now()}`
  };

  const accessToken = jwt.sign(payload, secret, {
    expiresIn,
    issuer: 'secure-gate-api',
    audience: 'secure-gate-client'
  });

  const refreshPayload = {
    sub: String(userId),
    email,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    jti: `test-refresh-jti-${userId}-${Date.now()}`,
    accessJti: payload.jti
  };

  const refreshToken = jwt.sign(refreshPayload, secret + '-refresh', {
    expiresIn: '7d',
    issuer: 'secure-gate-api',
    audience: 'secure-gate-client'
  });

  return {
    accessToken,
    refreshToken,
    jti: payload.jti,
    refreshJti: refreshPayload.jti,
    expiresIn: 15 * 60 * 1000,
    tokenType: 'Bearer',
    payload,
    secret
  };
}

/**
 * Create an expired token fixture
 */
export function createExpiredTokenFixture(options = {}) {
  return createTokenFixture({
    ...options,
    expiresIn: '-1s' // Already expired
  });
}

/**
 * Create a malformed/invalid token
 */
export function createInvalidTokenFixture() {
  return {
    accessToken: 'invalid.token.here',
    refreshToken: 'invalid.refresh.token',
    jti: 'invalid-jti',
    refreshJti: 'invalid-refresh-jti',
    expiresIn: 0,
    tokenType: 'Bearer',
    payload: null,
    secret: null
  };
}

/**
 * Create token for a specific role
 */
export function createRoleTokenFixture(role, options = {}) {
  return createTokenFixture({
    ...options,
    role
  });
}

/**
 * Create admin token
 */
export function createAdminTokenFixture(options = {}) {
  return createRoleTokenFixture('admin', {
    userId: 100,
    email: 'admin@example.com',
    username: 'admin',
    ...options
  });
}

/**
 * Create guard token
 */
export function createGuardTokenFixture(options = {}) {
  return createRoleTokenFixture('guard', {
    userId: 200,
    email: 'guard@example.com',
    username: 'guard',
    ...options
  });
}

/**
 * Create resident token
 */
export function createResidentTokenFixture(options = {}) {
  return createRoleTokenFixture('resident', {
    userId: 300,
    email: 'resident@example.com',
    username: 'resident',
    ...options
  });
}

export default {
  createTokenFixture,
  createExpiredTokenFixture,
  createInvalidTokenFixture,
  createRoleTokenFixture,
  createAdminTokenFixture,
  createGuardTokenFixture,
  createResidentTokenFixture
};
