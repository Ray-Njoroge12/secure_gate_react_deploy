/**
 * User Test Fixtures
 * Predefined user data for consistent testing
 */

import bcrypt from 'bcryptjs';

// Common password for all test users
const TEST_PASSWORD = 'Test123!';
const TEST_PASSWORD_HASH = await bcrypt.hash(TEST_PASSWORD, 10);

/**
 * Admin user fixtures
 */
export const adminUsers = {
  primaryAdmin: {
    email: 'admin@test.com',
    username: 'testadmin',
    password_hash: TEST_PASSWORD_HASH,
    phone: '+254712000001',
    role: 'admin',
    area: 'Block A',
    house: 'A101',
    notify_email: true,
    notify_sms: false,
    verified: true
  },
  
  secondaryAdmin: {
    email: 'admin2@test.com',
    username: 'testadmin2',
    password_hash: TEST_PASSWORD_HASH,
    phone: '+254712000002',
    role: 'admin',
    area: 'Block B',
    house: 'B101',
    notify_email: true,
    notify_sms: false,
    verified: true
  }
};

/**
 * Resident user fixtures
 */
export const residentUsers = {
  primaryResident: {
    email: 'resident@test.com',
    username: 'testresident',
    password_hash: TEST_PASSWORD_HASH,
    phone: '+254712000010',
    role: 'resident',
    area: 'Block C',
    house: 'C201',
    notify_email: true,
    notify_sms: true,
    verified: true
  },
  
  secondaryResident: {
    email: 'resident2@test.com',
    username: 'testresident2',
    password_hash: TEST_PASSWORD_HASH,
    phone: '+254712000011',
    role: 'resident',
    area: 'Block C',
    house: 'C202',
    notify_email: true,
    notify_sms: false,
    verified: true
  },
  
  inactiveResident: {
    email: 'resident_inactive@test.com',
    username: 'testresidentinactive',
    password_hash: TEST_PASSWORD_HASH,
    phone: '+254712000012',
    role: 'resident',
    area: 'Block D',
    house: 'D301',
    notify_email: false,
    notify_sms: false,
    verified: false
  }
};

/**
 * Guard user fixtures
 */
export const guardUsers = {
  primaryGuard: {
    email: 'guard@test.com',
    username: 'testguard',
    password_hash: TEST_PASSWORD_HASH,
    phone: '+254712000020',
    role: 'guard',
    area: 'Main Gate',
    house: 'Gate 1',
    notify_email: true,
    notify_sms: true,
    verified: true
  },
  
  secondaryGuard: {
    email: 'guard2@test.com',
    username: 'testguard2',
    password_hash: TEST_PASSWORD_HASH,
    phone: '+254712000021',
    role: 'guard',
    area: 'Main Gate',
    house: 'Gate 2',
    notify_email: true,
    notify_sms: false,
    verified: true
  }
};

/**
 * All user fixtures combined
 */
export const allUsers = {
  ...adminUsers,
  ...residentUsers,
  ...guardUsers
};

/**
 * Get all users as array
 */
export const getAllUsersArray = () => {
  return Object.values(allUsers);
};

/**
 * Get users by role
 */
export const getUsersByRole = (role) => {
  return getAllUsersArray().filter(user => user.role === role);
};

/**
 * Get verified users
 */
export const getVerifiedUsers = () => {
  return getAllUsersArray().filter(user => user.verified === true);
};

/**
 * Get active users
 */
export const getActiveUsers = () => {
  return getAllUsersArray().filter(user => user.status === 'active');
};

/**
 * Get test password
 */
export const getTestPassword = () => TEST_PASSWORD;

/**
 * Get test password hash
 */
export const getTestPasswordHash = () => TEST_PASSWORD_HASH;

// Export default
export default {
  adminUsers,
  residentUsers,
  guardUsers,
  allUsers,
  getAllUsersArray,
  getUsersByRole,
  getActiveUsers,
  getTestPassword,
  getTestPasswordHash,
  TEST_PASSWORD,
  TEST_PASSWORD_HASH
};
