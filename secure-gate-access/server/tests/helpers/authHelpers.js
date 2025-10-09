/**
 * Authentication Test Helpers
 * Utilities for authentication and authorization in tests
 * Provides login, token generation, and role-based access helpers
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { post } from './apiHelpers.js';
import { insertTestData } from './dbHelpers.js';
import { generateUser, generateUserWithHashedPassword } from './mockData.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_min_32_chars_long';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_in_production_min_32_chars_long';

/**
 * Generate JWT access token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Token expiration
 */
export const generateAccessToken = (payload, expiresIn = '15m') => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

/**
 * Generate JWT refresh token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Token expiration
 */
export const generateRefreshToken = (payload, expiresIn = '7d') => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn });
};

/**
 * Verify JWT access token
 * @param {string} token - JWT token
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
};

/**
 * Verify JWT refresh token
 * @param {string} token - JWT refresh token
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error(`Invalid refresh token: ${error.message}`);
  }
};

/**
 * Create test user and get tokens
 * @param {Object} userData - User data
 * @param {Object} app - Express app for login
 */
export const createAuthenticatedUser = async (userData = {}, app = null) => {
  // Generate user with hashed password
  const user = await generateUserWithHashedPassword(userData);
  
  // Insert user into database
  const insertedUser = await insertTestData('users', user);
  
  // Generate tokens
  const payload = {
    user_id: insertedUser.user_id,
    email: insertedUser.email,
    role: insertedUser.role
  };
  
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  return {
    user: insertedUser,
    accessToken,
    refreshToken,
    payload
  };
};

/**
 * Login user via API
 * @param {Object} app - Express app
 * @param {string} email - User email
 * @param {string} password - User password
 */
export const loginUser = async (app, email, password) => {
  const response = await post(app, '/api/v1/auth/login', { email, password });
  
  if (response.status !== 200) {
    throw new Error(`Login failed: ${response.status} - ${JSON.stringify(response.body)}`);
  }
  
  return {
    accessToken: response.body.accessToken || response.body.token,
    refreshToken: response.body.refreshToken,
    user: response.body.user
  };
};

/**
 * Register user via API
 * @param {Object} app - Express app
 * @param {Object} userData - User registration data
 */
export const registerUser = async (app, userData = {}) => {
  const user = generateUser(userData);
  const response = await post(app, '/api/v1/auth/register', user);
  
  if (response.status !== 201 && response.status !== 200) {
    throw new Error(`Registration failed: ${response.status} - ${JSON.stringify(response.body)}`);
  }
  
  return {
    user: response.body.user,
    accessToken: response.body.accessToken || response.body.token,
    refreshToken: response.body.refreshToken
  };
};

/**
 * Create admin user with authentication
 * @param {Object} userData - User data overrides
 */
export const createAuthenticatedAdmin = async (userData = {}) => {
  return await createAuthenticatedUser({ role: 'admin', ...userData });
};

/**
 * Create resident user with authentication
 * @param {Object} userData - User data overrides
 */
export const createAuthenticatedResident = async (userData = {}) => {
  return await createAuthenticatedUser({ role: 'resident', ...userData });
};

/**
 * Create guard user with authentication
 * @param {Object} userData - User data overrides
 */
export const createAuthenticatedGuard = async (userData = {}) => {
  return await createAuthenticatedUser({ role: 'guard', ...userData });
};

/**
 * Hash password
 * @param {string} password - Plain text password
 */
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Password hash
 */
export const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Create expired token
 * @param {Object} payload - Token payload
 */
export const createExpiredToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '-1h' });
};

/**
 * Create invalid token
 */
export const createInvalidToken = () => {
  return jwt.sign({ user_id: 999 }, 'invalid_secret', { expiresIn: '1h' });
};

/**
 * Extract token from response
 * @param {Object} response - API response
 */
export const extractToken = (response) => {
  return response.body.accessToken || response.body.token || response.headers['authorization']?.replace('Bearer ', '');
};

/**
 * Create token payload for role
 * @param {string} role - User role
 * @param {Object} overrides - Additional payload data
 */
export const createTokenPayloadForRole = (role, overrides = {}) => {
  return {
    user_id: Math.floor(Math.random() * 1000) + 1,
    email: `test_${role}@test.com`,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides
  };
};

/**
 * Create admin token
 * @param {Object} overrides - Token payload overrides
 */
export const createAdminToken = (overrides = {}) => {
  const payload = createTokenPayloadForRole('admin', overrides);
  return generateAccessToken(payload);
};

/**
 * Create resident token
 * @param {Object} overrides - Token payload overrides
 */
export const createResidentToken = (overrides = {}) => {
  const payload = createTokenPayloadForRole('resident', overrides);
  return generateAccessToken(payload);
};

/**
 * Create guard token
 * @param {Object} overrides - Token payload overrides
 */
export const createGuardToken = (overrides = {}) => {
  const payload = createTokenPayloadForRole('guard', overrides);
  return generateAccessToken(payload);
};

/**
 * Refresh access token
 * @param {Object} app - Express app
 * @param {string} refreshToken - Refresh token
 */
export const refreshAccessToken = async (app, refreshToken) => {
  const response = await post(app, '/api/v1/auth/refresh', { refreshToken });
  
  if (response.status !== 200) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }
  
  return {
    accessToken: response.body.accessToken || response.body.token,
    refreshToken: response.body.refreshToken
  };
};

/**
 * Logout user
 * @param {Object} app - Express app
 * @param {string} accessToken - Access token
 */
export const logoutUser = async (app, accessToken) => {
  const response = await post(app, '/api/v1/auth/logout', {}, accessToken);
  return response;
};

/**
 * Validate token format
 * @param {string} token - JWT token
 */
export const isValidTokenFormat = (token) => {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  const parts = token.split('.');
  return parts.length === 3;
};

/**
 * Decode token without verification
 * @param {string} token - JWT token
 */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 */
export const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }
  
  return decoded.exp < Math.floor(Date.now() / 1000);
};

/**
 * Get token expiration time
 * @param {string} token - JWT token
 */
export const getTokenExpiration = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return null;
  }
  
  return new Date(decoded.exp * 1000);
};

/**
 * Create session data for user
 * @param {number} userId - User ID
 * @param {Object} overrides - Session data overrides
 */
export const createSessionData = (userId, overrides = {}) => {
  return {
    user_id: userId,
    session_id: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    ip_address: '127.0.0.1',
    user_agent: 'Test User Agent',
    created_at: new Date(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    ...overrides
  };
};

/**
 * Create multiple authenticated users
 * @param {number} count - Number of users
 * @param {Object} baseData - Base user data
 */
export const createMultipleAuthenticatedUsers = async (count, baseData = {}) => {
  const users = [];
  
  for (let i = 0; i < count; i++) {
    const user = await createAuthenticatedUser(baseData);
    users.push(user);
  }
  
  return users;
};

// Export all authentication helpers
export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  createAuthenticatedUser,
  loginUser,
  registerUser,
  createAuthenticatedAdmin,
  createAuthenticatedResident,
  createAuthenticatedGuard,
  hashPassword,
  comparePassword,
  createExpiredToken,
  createInvalidToken,
  extractToken,
  createTokenPayloadForRole,
  createAdminToken,
  createResidentToken,
  createGuardToken,
  refreshAccessToken,
  logoutUser,
  isValidTokenFormat,
  decodeToken,
  isTokenExpired,
  getTokenExpiration,
  createSessionData,
  createMultipleAuthenticatedUsers
};
