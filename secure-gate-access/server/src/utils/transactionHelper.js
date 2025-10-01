import { dbManager } from '../database/db.enhanced.js';
const pool = dbManager.pool;

/**
 * Execute a database transaction with automatic rollback on error
 * @param {Function} callback - Function to execute within transaction, receives client
 * @param {Object} options - Options for transaction handling
 * @returns {Promise} Result of the callback function
 */
export async function withTransaction(callback, options = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await callback(client);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Transaction rollback failed:', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute a query within a transaction and handle common error responses
 * @param {Object} client - Database client
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @param {Object} options - Options for error handling
 * @returns {Object} Query result
 */
export async function executeQuery(client, query, params = [], options = {}) {
  try {
    const result = await client.query(query, params);
    return result;
  } catch (error) {
    if (options.rollbackOnError !== false) {
      await client.query('ROLLBACK');
    }
    throw error;
  }
}

export default { withTransaction, executeQuery };
