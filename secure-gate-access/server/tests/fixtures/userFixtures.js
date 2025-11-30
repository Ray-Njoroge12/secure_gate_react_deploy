// Test-only user fixtures for backend unit tests
// These helpers provide minimal but realistic user shapes used across multiple suites.

export function createEnhancedUserFixture(overrides = {}) {
  return {
    id: 'user-id-1',
    email: 'user@example.com',
    phone: '+1234567890',
    role: 'resident',
    isActive: true,
    mfaEnabled: false,
    mfaMethods: [],
    ...overrides
  };
}

export function createResidentUser(overrides = {}) {
  return createEnhancedUserFixture({
    role: 'resident',
    ...overrides
  });
}

export function createAdminUser(overrides = {}) {
  return createEnhancedUserFixture({
    role: 'admin',
    ...overrides
  });
}

export function createSecurityUser(overrides = {}) {
  return createEnhancedUserFixture({
    role: 'security',
    ...overrides
  });
}

export default {
  createEnhancedUserFixture,
  createResidentUser,
  createAdminUser,
  createSecurityUser
};
