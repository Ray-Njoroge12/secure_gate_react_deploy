import { generateRealisticUser } from '../helpers/mockData.enhanced.js';
import { generateBulkUsers } from '../helpers/bulkDataGenerator.js';

export function createBulkUsers(count = 10, options = {}) {
  return generateBulkUsers(count, options);
}

export function createUserWithVisitors(options = {}) {
  const user = generateRealisticUser(options.role || 'resident', options);
  const visitorCount = options.visitorCount ?? 2;
  const visitors = [];

  for (let i = 0; i < visitorCount; i++) {
    visitors.push({
      ...generateRealisticUser('visitor', options),
      hostEmail: user.email
    });
  }

  return { user, visitors };
}

export function createTestUser(overrides = {}) {
  return generateRealisticUser(overrides.role || 'resident', overrides);
}

export const testUsers = {
  admin: createTestUser({ role: 'admin' }),
  resident: createTestUser({ role: 'resident' }),
  guard: createTestUser({ role: 'guard' })
};

export default {
  createBulkUsers,
  createUserWithVisitors,
  createTestUser,
  testUsers
};
