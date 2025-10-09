/**
 * Database Test Helpers
 * Utilities for database operations in tests
 * Provides connection management, transactions, and data operations
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from server root
dotenv.config({ path: join(__dirname, '../../.env') });

let testPool = null;
let transactionClient = null;

/**
 * Get test database connection pool
 * @returns {Pool} PostgreSQL connection pool
 */
export const getTestPool = () => {
  if (!testPool) {
    testPool = new Pool({
      host: process.env.PGHOST || 'localhost',
      port: process.env.PGPORT || 5432,
      database: process.env.TEST_PGDATABASE || process.env.PGDATABASE || 'secure_gate_test',
      user: process.env.PGUSER || 'secure_gate_user',
      password: process.env.PGPASSWORD,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
  }
  
  return testPool;
};

/**
 * Get a database client for transactions
 * @returns {Promise<Client>}
 */
export const getTestClient = async () => {
  const pool = getTestPool();
  return await pool.connect();
};

/**
 * Begin a transaction
 * @returns {Promise<Client>}
 */
export const beginTransaction = async () => {
  if (transactionClient) {
    throw new Error('Transaction already in progress');
  }
  
  transactionClient = await getTestClient();
  await transactionClient.query('BEGIN');
  return transactionClient;
};

/**
 * Commit transaction
 */
export const commitTransaction = async () => {
  if (!transactionClient) {
    throw new Error('No transaction in progress');
  }
  
  await transactionClient.query('COMMIT');
  transactionClient.release();
  transactionClient = null;
};

/**
 * Rollback transaction
 */
export const rollbackTransaction = async () => {
  if (!transactionClient) {
    throw new Error('No transaction in progress');
  }
  
  await transactionClient.query('ROLLBACK');
  transactionClient.release();
  transactionClient = null;
};

/**
 * Execute query with test pool
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 */
export const query = async (text, params) => {
  const pool = getTestPool();
  return await pool.query(text, params);
};

/**
 * Execute query with timeout
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @param {number} timeout - Timeout in milliseconds
 */
export const queryWithTimeout = async (text, params, timeout = 5000) => {
  const pool = getTestPool();
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Query timeout')), timeout);
  });
  
  const queryPromise = pool.query(text, params);
  
  return await Promise.race([queryPromise, timeoutPromise]);
};

/**
 * Truncate a table
 * @param {string} tableName - Name of table to truncate
 * @param {boolean} cascade - Whether to cascade
 */
export const truncateTable = async (tableName, cascade = false) => {
  const cascadeStr = cascade ? 'CASCADE' : '';
  await query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY ${cascadeStr}`);
};

/**
 * Truncate multiple tables
 * @param {Array<string>} tableNames - Names of tables to truncate
 */
export const truncateTables = async (tableNames) => {
  for (const tableName of tableNames) {
    await truncateTable(tableName, true);
  }
};

/**
 * Reset sequence for a table
 * @param {string} tableName - Table name
 * @param {string} sequenceName - Sequence name
 */
export const resetSequence = async (tableName, sequenceName) => {
  await query(`ALTER SEQUENCE ${sequenceName} RESTART WITH 1`);
};

/**
 * Insert test data
 * @param {string} tableName - Table name
 * @param {Object} data - Data to insert
 * @returns {Promise<Object>} Inserted row
 */
export const insertTestData = async (tableName, data) => {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  
  const text = `
    INSERT INTO ${tableName} (${keys.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;
  
  const result = await query(text, values);
  return result.rows[0];
};

/**
 * Insert multiple test records
 * @param {string} tableName - Table name
 * @param {Array<Object>} dataArray - Array of data objects
 * @returns {Promise<Array>} Inserted rows
 */
export const insertMultipleTestData = async (tableName, dataArray) => {
  const results = [];
  
  for (const data of dataArray) {
    const result = await insertTestData(tableName, data);
    results.push(result);
  }
  
  return results;
};

/**
 * Delete test data
 * @param {string} tableName - Table name
 * @param {Object} where - Where conditions
 */
export const deleteTestData = async (tableName, where) => {
  const keys = Object.keys(where);
  const values = Object.values(where);
  const conditions = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
  
  const text = `DELETE FROM ${tableName} WHERE ${conditions}`;
  await query(text, values);
};

/**
 * Delete test data by pattern
 * @param {string} tableName - Table name
 * @param {string} column - Column name
 * @param {string} pattern - Pattern to match (LIKE)
 */
export const deleteTestDataByPattern = async (tableName, column, pattern) => {
  const text = `DELETE FROM ${tableName} WHERE ${column} LIKE $1`;
  await query(text, [pattern]);
};

/**
 * Count rows in table
 * @param {string} tableName - Table name
 * @param {Object} where - Optional where conditions
 */
export const countRows = async (tableName, where = {}) => {
  let text = `SELECT COUNT(*) FROM ${tableName}`;
  const values = [];
  
  if (Object.keys(where).length > 0) {
    const keys = Object.keys(where);
    const conditions = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
    text += ` WHERE ${conditions}`;
    values.push(...Object.values(where));
  }
  
  const result = await query(text, values);
  return parseInt(result.rows[0].count);
};

/**
 * Check if record exists
 * @param {string} tableName - Table name
 * @param {Object} where - Where conditions
 */
export const recordExists = async (tableName, where) => {
  const count = await countRows(tableName, where);
  return count > 0;
};

/**
 * Find one record
 * @param {string} tableName - Table name
 * @param {Object} where - Where conditions
 */
export const findOne = async (tableName, where) => {
  const keys = Object.keys(where);
  const values = Object.values(where);
  const conditions = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
  
  const text = `SELECT * FROM ${tableName} WHERE ${conditions} LIMIT 1`;
  const result = await query(text, values);
  
  return result.rows[0] || null;
};

/**
 * Find multiple records
 * @param {string} tableName - Table name
 * @param {Object} where - Where conditions
 * @param {Object} options - Query options (limit, offset, orderBy)
 */
export const findMany = async (tableName, where = {}, options = {}) => {
  let text = `SELECT * FROM ${tableName}`;
  const values = [];
  
  if (Object.keys(where).length > 0) {
    const keys = Object.keys(where);
    const conditions = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
    text += ` WHERE ${conditions}`;
    values.push(...Object.values(where));
  }
  
  if (options.orderBy) {
    text += ` ORDER BY ${options.orderBy}`;
  }
  
  if (options.limit) {
    text += ` LIMIT ${options.limit}`;
  }
  
  if (options.offset) {
    text += ` OFFSET ${options.offset}`;
  }
  
  const result = await query(text, values);
  return result.rows;
};

/**
 * Update test data
 * @param {string} tableName - Table name
 * @param {Object} data - Data to update
 * @param {Object} where - Where conditions
 */
export const updateTestData = async (tableName, data, where) => {
  const dataKeys = Object.keys(data);
  const whereKeys = Object.keys(where);
  
  const setClause = dataKeys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const whereClause = whereKeys.map((key, i) => `${key} = $${dataKeys.length + i + 1}`).join(' AND ');
  
  const text = `
    UPDATE ${tableName}
    SET ${setClause}
    WHERE ${whereClause}
    RETURNING *
  `;
  
  const values = [...Object.values(data), ...Object.values(where)];
  const result = await query(text, values);
  
  return result.rows[0] || null;
};

/**
 * Clean up all test data
 * Removes all records with test markers
 */
export const cleanupAllTestData = async () => {
  const tables = [
    'access_logs',
    'security_events',
    'passes',
    'visitors',
    'users'
  ];
  
  for (const table of tables) {
    try {
      if (table === 'users') {
        await deleteTestDataByPattern(table, 'email', '%@test.com');
        await deleteTestDataByPattern(table, 'email', '%test_%');
      } else if (table === 'visitors') {
        await deleteTestDataByPattern(table, 'phone', '+2547123%');
        await deleteTestDataByPattern(table, 'phone', '+254test%');
      } else {
        await deleteTestDataByPattern(table, 'request_id', 'test_%');
      }
    } catch (error) {
      console.warn(`Warning: Could not clean ${table}:`, error.message);
    }
  }
};

/**
 * Close test pool
 */
export const closeTestPool = async () => {
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
};

/**
 * Reset test database
 * Truncates all tables and resets sequences
 */
export const resetTestDatabase = async () => {
  const tables = [
    'access_logs',
    'security_events',
    'audit_logs',
    'passes',
    'visitors',
    'bulk_invites',
    'users'
  ];
  
  await truncateTables(tables);
};

// Export all helpers
export default {
  getTestPool,
  getTestClient,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
  query,
  queryWithTimeout,
  truncateTable,
  truncateTables,
  resetSequence,
  insertTestData,
  insertMultipleTestData,
  deleteTestData,
  deleteTestDataByPattern,
  countRows,
  recordExists,
  findOne,
  findMany,
  updateTestData,
  cleanupAllTestData,
  closeTestPool,
  resetTestDatabase
};
