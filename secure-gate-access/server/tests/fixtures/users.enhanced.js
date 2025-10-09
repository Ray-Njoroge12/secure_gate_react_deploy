/**
 * Enhanced User Test Fixtures
 * Advanced user scenarios including bulk generation, relationships, and edge cases
 */

import bcrypt from 'bcryptjs';

// Common password for all test users
const TEST_PASSWORD = 'Test123!';
const TEST_PASSWORD_HASH = await bcrypt.hash(TEST_PASSWORD, 10);

/**
 * Bulk User Generator
 * Generate multiple users for performance and load testing
 * 
 * @param {number} count - Number of users to generate
 * @param {string} role - User role (admin, resident, guard)
 * @param {Object} options - Additional options
 * @returns {Array} Array of user objects
 * 
 * @example
 * const residents = generateBulkUsers(100, 'resident', { verified: true });
 */
export function generateBulkUsers(count, role = 'resident', options = {}) {
  const users = [];
  const areas = ['Block A', 'Block B', 'Block C', 'Block D', 'Block E'];
  const kenyanNames = {
    first: ['John', 'Mary', 'David', 'Grace', 'Peter', 'Sarah', 'James', 'Lucy', 'Michael', 'Faith'],
    last: ['Mwangi', 'Ochieng', 'Kamau', 'Wanjiru', 'Otieno', 'Njeri', 'Kipchoge', 'Akinyi', 'Mutua', 'Wambui']
  };

  for (let i = 0; i < count; i++) {
    const firstName = kenyanNames.first[i % kenyanNames.first.length];
    const lastName = kenyanNames.last[i % kenyanNames.last.length];
    const area = areas[i % areas.length];
    const block = area.split(' ')[1];
    const houseNum = 100 + i;
    
    users.push({
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@test.com`,
      username: `${firstName.toLowerCase()}${lastName.toLowerCase()}${i}`,
      password_hash: TEST_PASSWORD_HASH,
      phone: `+2547${String(10000000 + i).substring(0, 8)}`,
      role: role,
      area: area,
      house: `${block}${houseNum}`,
      notify_email: i % 2 === 0,
      notify_sms: i % 3 === 0,
      verified: options.verified !== undefined ? options.verified : (i % 5 !== 0),
      ...options
    });
  }

  return users;
}

/**
 * Users with Relationships
 * Users that have predefined relationships with visitors and other users
 */
export const usersWithRelationships = {
  // Resident with multiple visitors
  hostResident: {
    email: 'host.resident@test.com',
    username: 'hostresident',
    password_hash: TEST_PASSWORD_HASH,
    phone: '+254712100001',
    role: 'resident',
    area: 'Block A',
    house: 'A101',
    notify_email: true,
    notify_sms: true,
    verified: true
  },

  // Resident with family members
  familyResident: {
    email: 'family.resident@test.com',
    username: 'familyresident',
    password_hash: TEST_PASSWORD_HASH,
    phone: '+254712100002',
    role: 'resident',
    area: 'Block A',
    house: 'A102',
    notify_email: true,
    notify_sms: true,
    verified: true,
    metadata: {
      family_members: ['spouse@test.com', 'child1@test.com', 'child2@test.com']
    }
  },

  // Resident with frequent visitors
  businessResident: {
    email: 'business.resident@test.com',
    username: 'businessresident',
    password_hash: TEST_PASSWORD_HASH,
    phone: '+254712100003',
    role: 'resident',
    area: 'Block B',
    house: 'B201',
    notify_email: true,
    notify_sms: false,
    verified: true,
    metadata: {
      frequent_visitors: ['contractor@test.com', 'assistant@test.com']
    }
  }
};

/**
 * Edge Case Users
 * Users with special conditions for testing edge cases
 */
export const edgeCaseUsers = {
  // User with expired token
  expiredTokenUser: {
    email: 'expired.token@test.com',
    username: 'expiredtoken',
    password_hash: TEST_PASSWORD_HASH,
    phone: '+254712200001',
    role: 'resident',
    area: 'Block C',
    house: 'C301',
    notify_email: true,
    notify_sms: false,
    verified: true,
    metadata: {
      token_expires_at: new Date(Date.now() - 86400000) // Yesterday
    }
  },

  // Suspended user
  suspendedUser: {
    email: 'suspended.user@test.com',
    username: 'suspendeduser',
    password_hash: TEST_PASSWORD_HASH,
    phone: '+254712200002',
    role: 'resident',
    area: 'Block C',
    house: 'C302',
    notify_email: false,
    notify_sms: false,
    verified: true,
    status: 'suspended',
    metadata: {
      suspended_at: new Date(),
      suspension_reason: 'Test suspension'
    }
  },

  // Unverified user (email not confirmed)
  unverifiedUser: {
    email: 'unverified@test.com',
    username: 'unverifieduser',
    password_hash: TEST_PASSWORD_HASH,
    phone: '+254712200003',
    role: 'resident',
    area: 'Block C',
    house: 'C303',
    notify_email: true,
    notify_sms: false,
    verified: false,
    metadata: {
      verification_token: 'test-verification-token-123',
      verification_token_expires: new Date(Date.now() + 86400000)
    }
  },

  // User with special characters in name
  specialCharsUser: {
    email: 'special.chars@test.com',
    username: 'specialcharsuser',
    password_hash: TEST_PASSWORD_HASH,
    phone: '+254712200004',
    role: 'resident',
    area: "Block D'Oconnor",
    house: 'D-401',
    notify_email: true,
    notify_sms: false,
    verified: true,
    metadata: {
      full_name: "O'Brien-Smith, Jr."
    }
  },

  // User with maximum length fields
  maxLengthUser: {
    email: 'a'.repeat(50) + '@test.com',
    username: 'u'.repeat(30),
    password_hash: TEST_PASSWORD_HASH,
    phone: '+254712200005',
    role: 'resident',
    area: 'A'.repeat(50),
    house: 'H'.repeat(20),
    notify_email: true,
    notify_sms: false,
    verified: true
  },

  // User with minimal data
  minimalUser: {
    email: 'minimal@test.com',
    username: 'minimaluser',
    password_hash: TEST_PASSWORD_HASH,
    phone: '+254712200006',
    role: 'resident',
    verified: false
  }
};

/**
 * Performance Test Users
 * Pre-configured users for load and performance testing
 */
export const performanceTestUsers = {
  // Generate 100 residents
  residents100: () => generateBulkUsers(100, 'resident', { verified: true }),
  
  // Generate 1000 residents
  residents1000: () => generateBulkUsers(1000, 'resident', { verified: true }),
  
  // Generate 50 guards
  guards50: () => generateBulkUsers(50, 'guard', { verified: true }),
  
  // Generate 20 admins
  admins20: () => generateBulkUsers(20, 'admin', { verified: true }),
  
  // Mixed role users
  mixedUsers200: () => [
    ...generateBulkUsers(150, 'resident', { verified: true }),
    ...generateBulkUsers(30, 'guard', { verified: true }),
    ...generateBulkUsers(20, 'admin', { verified: true })
  ]
};

/**
 * User Scenarios
 * Complete user scenarios for integration testing
 */
export const userScenarios = {
  // Complete apartment block
  blockAResidents: () => {
    const residents = [];
    for (let floor = 1; floor <= 5; floor++) {
      for (let unit = 1; unit <= 4; unit++) {
        const houseNum = `A${floor}0${unit}`;
        residents.push({
          email: `resident.${houseNum.toLowerCase()}@test.com`,
          username: `resident${houseNum.toLowerCase()}`,
          password_hash: TEST_PASSWORD_HASH,
          phone: `+2547121${floor}${unit}${String(Math.random() * 1000).padStart(4, '0')}`,
          role: 'resident',
          area: 'Block A',
          house: houseNum,
          notify_email: true,
          notify_sms: floor % 2 === 0,
          verified: true
        });
      }
    }
    return residents;
  },

  // Security team
  securityTeam: () => {
    const gates = ['Main Gate', 'Back Gate', 'Side Gate'];
    return gates.flatMap((gate, gateIndex) => {
      return [1, 2, 3].map(shift => ({
        email: `guard.gate${gateIndex + 1}.shift${shift}@test.com`,
        username: `guard_g${gateIndex + 1}_s${shift}`,
        password_hash: TEST_PASSWORD_HASH,
        phone: `+2547123${gateIndex}${shift}000`,
        role: 'guard',
        area: gate,
        house: `${gate} - Shift ${shift}`,
        notify_email: true,
        notify_sms: true,
        verified: true
      }));
    });
  },

  // Management team
  managementTeam: () => {
    const departments = ['General', 'Security', 'Maintenance', 'Finance'];
    return departments.map((dept, index) => ({
      email: `admin.${dept.toLowerCase()}@test.com`,
      username: `admin${dept.toLowerCase()}`,
      password_hash: TEST_PASSWORD_HASH,
      phone: `+254712400${index}00`,
      role: 'admin',
      area: `Admin Office`,
      house: `${dept} Department`,
      notify_email: true,
      notify_sms: true,
      verified: true,
      metadata: {
        department: dept
      }
    }));
  }
};

/**
 * Helper Functions
 */

/**
 * Get user by role and index
 * @param {string} role - User role
 * @param {number} index - User index
 * @returns {Object} User object
 */
export function getUserByRole(role, index = 0) {
  return generateBulkUsers(index + 1, role, { verified: true })[index];
}

/**
 * Get Kenyan phone number
 * @param {number} index - Index for uniqueness
 * @returns {string} Formatted Kenyan phone number
 */
export function getKenyanPhone(index = 0) {
  const baseNumber = 700000000 + index;
  return `+254${baseNumber}`;
}

/**
 * Get test password (same for all test users)
 * @returns {string} Test password
 */
export function getTestPassword() {
  return TEST_PASSWORD;
}

/**
 * Get test password hash
 * @returns {string} Test password hash
 */
export function getTestPasswordHash() {
  return TEST_PASSWORD_HASH;
}

// Export all collections
export default {
  generateBulkUsers,
  usersWithRelationships,
  edgeCaseUsers,
  performanceTestUsers,
  userScenarios,
  getUserByRole,
  getKenyanPhone,
  getTestPassword,
  getTestPasswordHash
};
