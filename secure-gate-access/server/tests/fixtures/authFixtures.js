/**
 * Auth fixtures for unit testing
 * Provides reusable authentication test data
 */

export const createEnhancedAuthFixture = (overrides = {}) => ({
  userId: 'user_test_123',
  token: 'test_jwt_token_abc123xyz',
  refreshToken: 'test_refresh_token_def456uvw',
  expiresIn: 3600,
  tokenType: 'Bearer',
  issuedAt: new Date('2025-11-21T10:00:00'),
  expiresAt: new Date('2025-11-21T11:00:00'),
  ...overrides
});

export const createValidAuthToken = (overrides = {}) => ({
  ...createEnhancedAuthFixture(),
  isValid: true,
  ...overrides
});

export const createExpiredAuthToken = (overrides = {}) => ({
  ...createEnhancedAuthFixture(),
  isValid: false,
  expiresAt: new Date('2025-11-21T09:00:00'), // expired
  ...overrides
});

export const createAuthHeaders = (token = null, overrides = {}) => ({
  'Content-Type': 'application/json',
  'Authorization': token ? `Bearer ${token}` : undefined,
  'User-Agent': 'Jest Test Suite',
  ...overrides
});

export const createLoginCredentials = (overrides = {}) => ({
  email: 'test@example.com',
  password: 'TestPassword123!',
  ...overrides
});

export const createRegistrationData = (overrides = {}) => ({
  email: 'newuser@example.com',
  username: 'newuser123',
  password: 'NewPassword123!',
  phone: '+254712345678',
  role: 'resident',
  area: 'Block A',
  house: 'A101',
  ...overrides
});

export default {
  createEnhancedAuthFixture,
  createValidAuthToken,
  createExpiredAuthToken,
  createAuthHeaders,
  createLoginCredentials,
  createRegistrationData
};
