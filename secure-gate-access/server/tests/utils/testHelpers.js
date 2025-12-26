/**
 * Integration Test Helpers
 * HTTP request utilities, authentication helpers, and assertion utilities
 */

import jwt from 'jsonwebtoken';
import { dbManager } from '../../src/database/db.enhanced.js';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-integration-tests';
const API_BASE = '/api';

/**
 * Generate JWT token for testing
 */
export function generateTestToken(user, options = {}) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    username: user.username
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: options.expiresIn || '1h',
    ...options
  });
}

/**
 * Generate expired token for testing
 */
export function generateExpiredToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '-1h' });
}

/**
 * Generate invalid token
 */
export function generateInvalidToken() {
  return 'invalid.token.here';
}

/**
 * Create mock Express request object
 */
export function createMockRequest(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ip: '127.0.0.1',
    method: 'GET',
    path: '/',
    originalUrl: '/',
    get: function(header) {
      return this.headers[header.toLowerCase()];
    },
    ...overrides
  };
}

/**
 * Create mock Express response object
 */
export function createMockResponse() {
  const res = {
    statusCode: 200,
    _data: null,
    _headers: {},
    
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    
    json: function(data) {
      this._data = data;
      return this;
    },
    
    send: function(data) {
      this._data = data;
      return this;
    },
    
    setHeader: function(name, value) {
      this._headers[name] = value;
      return this;
    },
    
    getHeader: function(name) {
      return this._headers[name];
    },
    
    end: function() {
      return this;
    }
  };
  
  return res;
}

/**
 * Create mock next function
 */
export function createMockNext() {
  const next = jest.fn();
  return next;
}

/**
 * Build authenticated request
 */
export function buildAuthenticatedRequest(user, overrides = {}) {
  const token = generateTestToken(user);
  return createMockRequest({
    user,
    headers: {
      authorization: `Bearer ${token}`,
      ...overrides.headers
    },
    ...overrides
  });
}

/**
 * Wait for async operations
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function for flaky operations
 */
export async function retry(fn, options = {}) {
  const { maxAttempts = 3, delay = 100 } = options;
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await wait(delay * attempt);
      }
    }
  }
  
  throw lastError;
}

/**
 * Database assertion helpers
 */
export const dbAssert = {
  /**
   * Assert record exists in table
   */
  async recordExists(table, conditions) {
    const whereClauses = Object.keys(conditions)
      .map((key, i) => `${key} = $${i + 1}`)
      .join(' AND ');
    
    const result = await dbManager.query(
      `SELECT COUNT(*) FROM ${table} WHERE ${whereClauses}`,
      Object.values(conditions)
    );
    
    return parseInt(result.rows[0].count) > 0;
  },

  /**
   * Assert record does not exist
   */
  async recordNotExists(table, conditions) {
    return !(await this.recordExists(table, conditions));
  },

  /**
   * Get record count
   */
  async getCount(table, conditions = {}) {
    let query = `SELECT COUNT(*) FROM ${table}`;
    const values = [];
    
    if (Object.keys(conditions).length > 0) {
      const whereClauses = Object.keys(conditions)
        .map((key, i) => `${key} = $${i + 1}`)
        .join(' AND ');
      query += ` WHERE ${whereClauses}`;
      values.push(...Object.values(conditions));
    }
    
    const result = await dbManager.query(query, values);
    return parseInt(result.rows[0].count);
  },

  /**
   * Assert audit log was created
   */
  async auditLogExists(action, userId = null) {
    const conditions = { action };
    if (userId) conditions.user_id = userId;
    return this.recordExists('audit_logs', conditions);
  },

  /**
   * Get latest record from table
   */
  async getLatest(table, orderBy = 'created_at') {
    const result = await dbManager.query(
      `SELECT * FROM ${table} ORDER BY ${orderBy} DESC LIMIT 1`
    );
    return result.rows[0];
  }
};

/**
 * Transaction helper for test isolation
 */
export class TestTransaction {
  constructor() {
    this.client = null;
    this.released = false;
  }

  async begin() {
    this.client = await dbManager.pool.connect();
    await this.client.query('BEGIN');
    return this;
  }

  async query(text, params) {
    if (!this.client) throw new Error('Transaction not started');
    return this.client.query(text, params);
  }

  async rollback() {
    if (this.client && !this.released) {
      await this.client.query('ROLLBACK');
      this.client.release();
      this.released = true;
    }
  }

  async commit() {
    if (this.client && !this.released) {
      await this.client.query('COMMIT');
      this.client.release();
      this.released = true;
    }
  }
}

/**
 * Run test in transaction that rolls back
 */
export async function runInTransaction(testFn) {
  const tx = new TestTransaction();
  await tx.begin();
  
  try {
    await testFn(tx);
  } finally {
    await tx.rollback();
  }
}

/**
 * Concurrent operation helper
 */
export async function runConcurrently(operations) {
  return Promise.all(operations.map(op => op()));
}

/**
 * Race condition test helper
 */
export async function testRaceCondition(setup, operations, assertions) {
  await setup();
  const results = await runConcurrently(operations);
  await assertions(results);
}

/**
 * Performance measurement helper
 */
export async function measurePerformance(fn, label = 'Operation') {
  const start = process.hrtime.bigint();
  const result = await fn();
  const end = process.hrtime.bigint();
  const durationMs = Number(end - start) / 1000000;
  
  return {
    result,
    durationMs,
    label
  };
}

/**
 * Assert response structure
 */
export function assertResponseStructure(response, expectedFields) {
  for (const field of expectedFields) {
    expect(response).toHaveProperty(field);
  }
}

/**
 * Assert error response
 */
export function assertErrorResponse(response, expectedStatus, expectedMessage = null) {
  expect(response.statusCode).toBe(expectedStatus);
  expect(response._data).toHaveProperty('error');
  if (expectedMessage) {
    expect(response._data.error).toContain(expectedMessage);
  }
}

/**
 * Assert success response
 */
export function assertSuccessResponse(response, expectedStatus = 200) {
  expect(response.statusCode).toBe(expectedStatus);
  expect(response._data).toBeDefined();
}

export default {
  generateTestToken,
  generateExpiredToken,
  generateInvalidToken,
  createMockRequest,
  createMockResponse,
  createMockNext,
  buildAuthenticatedRequest,
  wait,
  retry,
  dbAssert,
  TestTransaction,
  runInTransaction,
  runConcurrently,
  testRaceCondition,
  measurePerformance,
  assertResponseStructure,
  assertErrorResponse,
  assertSuccessResponse
};
