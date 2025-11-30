/**
 * Database Service - Compatibility Layer
 * 
 * This file provides backward compatibility for services expecting databaseService.
 * All new code should use dbManager from '../database/db.enhanced.js' directly.
 * 
 * Created: November 21, 2025
 * Reason: 5 DR/HA services were importing non-existent databaseService.js
 * Affected services:
 * - haService.js (High Availability)
 * - drService.js (Disaster Recovery)
 * - drDrillService.js (DR Drills)
 * - restoreService.js (Restore Operations)
 * - incidentDetectionService.js (Incident Detection)
 * 
 * @deprecated Use dbManager from '../database/db.enhanced.js' instead
 */

import { dbManager } from '../database/db.enhanced.js';
import loggingService from './loggingService.js';

/**
 * DatabaseService class - wraps dbManager for compatibility
 */
class DatabaseService {
  constructor() {
    this.db = dbManager;
    this.pool = dbManager.pool;
    this.isConnected = false;
    
    // Log creation of compatibility layer
    loggingService.logInfo('DatabaseService compatibility layer initialized', {
      service: 'databaseService',
      wrapping: 'dbManager',
      reason: 'backward compatibility'
    });
  }

  /**
   * Execute a database query
   * Delegates to dbManager.query()
   */
  async query(text, params) {
    try {
      const result = await this.db.query(text, params);
      return result;
    } catch (error) {
      loggingService.logError('Database query failed', {
        query: text.substring(0, 100), // Log first 100 chars only
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Initialize database connection
   * Delegates to dbManager.initialize()
   */
  async initialize() {
    try {
      await this.db.initialize();
      this.isConnected = true;
      loggingService.logInfo('Database initialized through compatibility layer');
      return true;
    } catch (error) {
      loggingService.logError('Database initialization failed', {
        error: error.message
      });
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnect from database
   * Delegates to dbManager.disconnect()
   */
  async disconnect() {
    try {
      await this.db.disconnect();
      this.isConnected = false;
      loggingService.logInfo('Database disconnected through compatibility layer');
      return true;
    } catch (error) {
      loggingService.logError('Database disconnect failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get database connection status
   * Delegates to dbManager.getStatus()
   */
  getStatus() {
    return this.db.getStatus();
  }

  /**
   * Test database connection
   * Delegates to dbManager.testConnection()
   */
  async testConnection() {
    try {
      const result = await this.db.testConnection();
      this.isConnected = result;
      return result;
    } catch (error) {
      loggingService.logError('Database connection test failed', {
        error: error.message
      });
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Begin transaction
   * Useful for DR/HA operations that need transactional consistency
   */
  async beginTransaction() {
    const client = await this.db.pool.connect();
    await client.query('BEGIN');
    return client;
  }

  /**
   * Commit transaction
   */
  async commitTransaction(client) {
    await client.query('COMMIT');
    client.release();
  }

  /**
   * Rollback transaction
   */
  async rollbackTransaction(client) {
    try {
      await client.query('ROLLBACK');
    } catch (error) {
      loggingService.logError('Transaction rollback failed', {
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * Execute backup operation (DR services specific)
   * Creates a consistent backup point
   */
  async createBackupPoint(backupName) {
    try {
      // PostgreSQL specific backup point creation
      await this.query(`SELECT pg_create_restore_point($1)`, [backupName]);
      loggingService.logInfo('Backup point created', { backupName });
      return true;
    } catch (error) {
      loggingService.logError('Failed to create backup point', {
        backupName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check replication status (HA services specific)
   * Useful for high availability monitoring
   */
  async getReplicationStatus() {
    try {
      const result = await this.query(`
        SELECT 
          pg_is_in_recovery() as is_standby,
          pg_last_wal_receive_lsn() as receive_lsn,
          pg_last_wal_replay_lsn() as replay_lsn,
          pg_last_xact_replay_timestamp() as last_replay_time
      `);
      return result.rows[0];
    } catch (error) {
      loggingService.logWarn('Could not get replication status', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get database statistics (monitoring)
   */
  async getDatabaseStats() {
    try {
      const stats = await this.query(`
        SELECT 
          pg_database_size(current_database()) as db_size,
          (SELECT count(*) FROM pg_stat_activity) as active_connections,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections,
          (SELECT count(*) FROM pg_stat_activity WHERE wait_event_type IS NOT NULL) as waiting_queries
      `);
      return stats.rows[0];
    } catch (error) {
      loggingService.logError('Failed to get database stats', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Health check for DR/HA services
   */
  async isHealthy() {
    try {
      const result = await this.testConnection();
      if (!result) return false;

      // Check if database is accepting queries
      const check = await this.query('SELECT 1 as health');
      return check.rows[0].health === 1;
    } catch (error) {
      return false;
    }
  }
}

// Create singleton instance for compatibility
const databaseService = new DatabaseService();

// Export both the instance and individual methods for maximum compatibility
export default databaseService;

// Also export individual methods for services that might destructure
export const {
  query,
  initialize,
  disconnect,
  getStatus,
  testConnection,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
  createBackupPoint,
  getReplicationStatus,
  getDatabaseStats,
  isHealthy
} = {
  query: (text, params) => databaseService.query(text, params),
  initialize: () => databaseService.initialize(),
  disconnect: () => databaseService.disconnect(),
  getStatus: () => databaseService.getStatus(),
  testConnection: () => databaseService.testConnection(),
  beginTransaction: () => databaseService.beginTransaction(),
  commitTransaction: (client) => databaseService.commitTransaction(client),
  rollbackTransaction: (client) => databaseService.rollbackTransaction(client),
  createBackupPoint: (name) => databaseService.createBackupPoint(name),
  getReplicationStatus: () => databaseService.getReplicationStatus(),
  getDatabaseStats: () => databaseService.getDatabaseStats(),
  isHealthy: () => databaseService.isHealthy()
};

// Log successful creation
loggingService.logInfo('DatabaseService compatibility layer created successfully', {
  exports: [
    'default (databaseService instance)',
    'query', 'initialize', 'disconnect', 'getStatus',
    'testConnection', 'beginTransaction', 'commitTransaction',
    'rollbackTransaction', 'createBackupPoint',
    'getReplicationStatus', 'getDatabaseStats', 'isHealthy'
  ],
  purpose: 'Backward compatibility for DR/HA services'
});
