/**
 * Test Database Helper
 * Provides database utilities for test environments
 * Handles connection pooling and cleanup without closing shared pool
 */

import dbManager from '../../src/database/db.enhanced.js';

/**
 * Test Database Helper Class
 * Wraps dbManager queries with test-specific behavior
 */
class TestDatabase {
  constructor() {
    this.dbManager = dbManager;
    this.testDataCreated = [];
  }

  /**
   * Execute a database query
   * @param {string} text - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async query(text, params) {
    try {
      return await this.dbManager.query(text, params);
    } catch (error) {
      console.error('Test DB Query Error:', error.message);
      throw error;
    }
  }

  /**
   * Execute query within a transaction
   * @param {Function} callback - Async function to execute in transaction
   * @returns {Promise<any>} Transaction result
   */
  async transaction(callback) {
    return await this.dbManager.transaction(callback);
  }

  /**
   * Track test data for cleanup
   * @param {string} table - Table name
   * @param {number|string} id - Record ID
   */
  trackTestData(table, id) {
    this.testDataCreated.push({ table, id });
  }

  /**
   * Clean up test data
   * Removes all tracked test records in reverse order
   */
  async cleanup() {
    // Clean up in reverse order (children before parents)
    for (let i = this.testDataCreated.length - 1; i >= 0; i--) {
      const { table, id } = this.testDataCreated[i];
      try {
        await this.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
      } catch (error) {
        console.warn(`Failed to cleanup ${table}:${id}:`, error.message);
      }
    }
    this.testDataCreated = [];
  }

  /**
   * Clean up test data by pattern
   * @param {string} table - Table name
   * @param {string} column - Column to match
   * @param {string} pattern - Pattern to match (for LIKE)
   */
  async cleanupByPattern(table, column, pattern) {
    try {
      await this.query(
        `DELETE FROM ${table} WHERE ${column} LIKE $1`,
        [pattern]
      );
    } catch (error) {
      console.warn(`Failed to cleanup ${table} by pattern:`, error.message);
    }
  }

  /**
   * Truncate test tables (use with caution in test environment only)
   * @param {Array<string>} tables - Tables to truncate
   */
  async truncateTables(tables) {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('truncateTables can only be called in test environment');
    }

    for (const table of tables) {
      try {
        await this.query(`TRUNCATE TABLE ${table} CASCADE`);
      } catch (error) {
        console.warn(`Failed to truncate ${table}:`, error.message);
      }
    }
  }

  /**
   * Seed test data
   * @param {string} table - Table name
   * @param {Object} data - Data to insert
   * @returns {Promise<Object>} Inserted record
   */
  async seedTestData(table, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await this.query(query, values);
    
    if (result.rows[0]?.id) {
      this.trackTestData(table, result.rows[0].id);
    }

    return result.rows[0];
  }

  /**
   * Get connection health
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const result = await this.query('SELECT NOW() as time');
      return {
        healthy: true,
        timestamp: result.rows[0].time
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Close database connections
   * Only call this at the end of all tests (in afterAll)
   * DO NOT call this in individual test cleanup
   */
  async closePool() {
    // Only close if we're truly done with all tests
    // Usually not needed as Jest will handle cleanup
    if (this.dbManager.pool?.end) {
      await this.dbManager.pool.end();
    }
  }
}

// Export singleton instance
const testDb = new TestDatabase();
export default testDb;

// Also export class for custom instances
export { TestDatabase };
