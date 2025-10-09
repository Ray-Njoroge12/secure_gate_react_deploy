/**
 * Mock Data Generators
 * Utilities for generating realistic test data
 * Uses Faker.js for random data generation
 */

import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

/**
 * Generate random user
 * @param {Object} overrides - Override default values
 */
export const generateUser = (overrides = {}) => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  
  return {
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    username: faker.internet.username({ firstName, lastName }).toLowerCase(),
    password: 'Password123!',
    first_name: firstName,
    last_name: lastName,
    phone: `+254${faker.string.numeric(9)}`,
    role: faker.helpers.arrayElement(['admin', 'resident', 'guard']),
    status: 'active',
    ...overrides
  };
};

/**
 * Generate user with hashed password
 * @param {Object} overrides - Override default values
 */
export const generateUserWithHashedPassword = async (overrides = {}) => {
  const user = generateUser(overrides);
  user.password_hash = await bcrypt.hash(user.password, 10);
  delete user.password;
  return user;
};

/**
 * Generate multiple users
 * @param {number} count - Number of users to generate
 * @param {Object} overrides - Override default values
 */
export const generateUsers = (count, overrides = {}) => {
  return Array.from({ length: count }, () => generateUser(overrides));
};

/**
 * Generate visitor
 * @param {Object} overrides - Override default values
 */
export const generateVisitor = (overrides = {}) => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  
  return {
    first_name: firstName,
    last_name: lastName,
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    phone: `+254${faker.string.numeric(9)}`,
    id_number: faker.string.numeric(8),
    purpose_of_visit: faker.helpers.arrayElement([
      'Business meeting',
      'Delivery',
      'Personal visit',
      'Maintenance',
      'Interview'
    ]),
    host_resident_id: null,
    status: 'pending',
    ...overrides
  };
};

/**
 * Generate multiple visitors
 * @param {number} count - Number of visitors to generate
 * @param {Object} overrides - Override default values
 */
export const generateVisitors = (count, overrides = {}) => {
  return Array.from({ length: count }, () => generateVisitor(overrides));
};

/**
 * Generate pass/invite
 * @param {Object} overrides - Override default values
 */
export const generatePass = (overrides = {}) => {
  const startDate = faker.date.future();
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + faker.number.int({ min: 1, max: 24 }));
  
  return {
    visitor_id: null,
    pass_code: generatePassCode(),
    valid_from: startDate,
    valid_until: endDate,
    status: 'active',
    created_by: null,
    ...overrides
  };
};

/**
 * Generate pass code
 * @param {number} length - Length of pass code
 */
export const generatePassCode = (length = 6) => {
  return faker.string.numeric(length);
};

/**
 * Generate OTP code
 * @param {number} length - Length of OTP
 */
export const generateOTP = (length = 6) => {
  return faker.string.numeric(length);
};

/**
 * Generate multiple passes
 * @param {number} count - Number of passes to generate
 * @param {Object} overrides - Override default values
 */
export const generatePasses = (count, overrides = {}) => {
  return Array.from({ length: count }, () => generatePass(overrides));
};

/**
 * Generate access log
 * @param {Object} overrides - Override default values
 */
export const generateAccessLog = (overrides = {}) => {
  return {
    visitor_id: null,
    pass_id: null,
    action: faker.helpers.arrayElement(['check-in', 'check-out', 'denied']),
    location: faker.helpers.arrayElement(['Main Gate', 'Side Entrance', 'Parking']),
    device_id: faker.string.uuid(),
    ip_address: faker.internet.ip(),
    user_agent: faker.internet.userAgent(),
    timestamp: faker.date.recent(),
    ...overrides
  };
};

/**
 * Generate security event
 * @param {Object} overrides - Override default values
 */
export const generateSecurityEvent = (overrides = {}) => {
  return {
    event_type: faker.helpers.arrayElement([
      'failed_login',
      'suspicious_activity',
      'unauthorized_access',
      'system_alert'
    ]),
    severity: faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
    description: faker.lorem.sentence(),
    user_id: null,
    ip_address: faker.internet.ip(),
    timestamp: faker.date.recent(),
    ...overrides
  };
};

/**
 * Generate random email
 * @param {string} domain - Email domain
 */
export const randomEmail = (domain = 'test.com') => {
  const timestamp = Date.now();
  const random = faker.string.alphanumeric(6);
  return `test_${timestamp}_${random}@${domain}`;
};

/**
 * Generate random test email
 */
export const randomTestEmail = () => {
  return randomEmail('test.com');
};

/**
 * Generate random phone number
 * @param {string} countryCode - Country code
 */
export const randomPhone = (countryCode = '+254') => {
  return `${countryCode}${faker.string.numeric(9)}`;
};

/**
 * Generate random test phone
 */
export const randomTestPhone = () => {
  return randomPhone('+254712');
};

/**
 * Generate random string
 * @param {number} length - String length
 */
export const randomString = (length = 10) => {
  return faker.string.alphanumeric(length);
};

/**
 * Generate random number
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 */
export const randomNumber = (min = 0, max = 100) => {
  return faker.number.int({ min, max });
};

/**
 * Generate random date
 * @param {Date} refDate - Reference date
 * @param {number} days - Days from reference
 */
export const randomDate = (refDate = new Date(), days = 30) => {
  return faker.date.soon({ days, refDate });
};

/**
 * Generate random past date
 * @param {number} days - Days in the past
 */
export const randomPastDate = (days = 30) => {
  return faker.date.recent({ days });
};

/**
 * Generate random future date
 * @param {number} days - Days in the future
 */
export const randomFutureDate = (days = 30) => {
  return faker.date.soon({ days });
};

/**
 * Generate random boolean
 */
export const randomBoolean = () => {
  return faker.datatype.boolean();
};

/**
 * Generate random UUID
 */
export const randomUUID = () => {
  return faker.string.uuid();
};

/**
 * Generate random IP address
 */
export const randomIP = () => {
  return faker.internet.ip();
};

/**
 * Generate random URL
 */
export const randomURL = () => {
  return faker.internet.url();
};

/**
 * Generate random user agent
 */
export const randomUserAgent = () => {
  return faker.internet.userAgent();
};

/**
 * Generate bulk test data
 * @param {Function} generator - Generator function
 * @param {number} count - Number of items
 * @param {Object} overrides - Override values
 */
export const generateBulk = (generator, count, overrides = {}) => {
  return Array.from({ length: count }, () => generator(overrides));
};

/**
 * Generate JWT payload
 * @param {Object} overrides - Override default values
 */
export const generateJWTPayload = (overrides = {}) => {
  return {
    user_id: faker.number.int({ min: 1, max: 1000 }),
    email: randomTestEmail(),
    role: faker.helpers.arrayElement(['admin', 'resident', 'guard']),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides
  };
};

/**
 * Generate session data
 * @param {Object} overrides - Override default values
 */
export const generateSessionData = (overrides = {}) => {
  return {
    session_id: randomUUID(),
    user_id: faker.number.int({ min: 1, max: 1000 }),
    ip_address: randomIP(),
    user_agent: randomUserAgent(),
    created_at: new Date(),
    expires_at: faker.date.future(),
    ...overrides
  };
};

/**
 * Generate test credentials
 * @param {Object} overrides - Override default values
 */
export const generateCredentials = (overrides = {}) => {
  return {
    email: randomTestEmail(),
    password: 'Password123!',
    ...overrides
  };
};

/**
 * Generate admin user
 */
export const generateAdminUser = (overrides = {}) => {
  return generateUser({ role: 'admin', ...overrides });
};

/**
 * Generate resident user
 */
export const generateResidentUser = (overrides = {}) => {
  return generateUser({ role: 'resident', ...overrides });
};

/**
 * Generate guard user
 */
export const generateGuardUser = (overrides = {}) => {
  return generateUser({ role: 'guard', ...overrides });
};

/**
 * Reset faker seed for consistent test data
 * @param {number} seed - Seed value
 */
export const resetFakerSeed = (seed = 123) => {
  faker.seed(seed);
};

// Export all generators
export default {
  generateUser,
  generateUserWithHashedPassword,
  generateUsers,
  generateVisitor,
  generateVisitors,
  generatePass,
  generatePassCode,
  generateOTP,
  generatePasses,
  generateAccessLog,
  generateSecurityEvent,
  randomEmail,
  randomTestEmail,
  randomPhone,
  randomTestPhone,
  randomString,
  randomNumber,
  randomDate,
  randomPastDate,
  randomFutureDate,
  randomBoolean,
  randomUUID,
  randomIP,
  randomURL,
  randomUserAgent,
  generateBulk,
  generateJWTPayload,
  generateSessionData,
  generateCredentials,
  generateAdminUser,
  generateResidentUser,
  generateGuardUser,
  resetFakerSeed
};
