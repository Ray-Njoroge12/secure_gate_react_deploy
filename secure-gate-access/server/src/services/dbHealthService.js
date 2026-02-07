/**
 * Database Health Check Service
 * 
 * Monitors database health including:
 * - Connection pool status
 * - Table sizes and growth
 * - Index usage
 * - Query performance
 * - Orphaned records
 * 
 * Usage:
 *   import { dbHealthService } from './services/dbHealthService.js';
 *   const health = await dbHealthService.getHealthReport();
 */

import { dbManager } from '../database/db.enhanced.js';

class DatabaseHealthService {
  /**
   * Get comprehensive database health report
   */
  async getHealthReport() {
    const report = {
      timestamp: new Date().toISOString(),
      connection: await this.checkConnection(),
      poolStatus: this.getPoolStatus(),
      tables: await this.getTableStats(),
      indexes: await this.getIndexUsage(),
      orphanedRecords: await this.checkOrphanedRecords(),
      performance: await this.getPerformanceMetrics()
    };

    return report;
  }

  /**
   * Check database connection
   */
  async checkConnection() {
    try {
      const result = await dbManager.query('SELECT NOW() as time, version() as version');
      return {
        status: 'healthy',
        serverTime: result.rows[0].time,
        version: result.rows[0].version.split(' ')[0] // PostgreSQL version
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Get connection pool status
   */
  getPoolStatus() {
    if (!dbManager.pool) {
      return { status: 'no_pool' };
    }

    return {
      totalConnections: dbManager.pool.totalCount,
      idleConnections: dbManager.pool.idleCount,
      waitingRequests: dbManager.pool.waitingCount,
      maxConnections: dbManager.config.max || 20
    };
  }

  /**
   * Get table statistics
   */
  async getTableStats() {
    try {
      const result = await dbManager.query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
          pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes,
          n_live_tup AS row_count,
          n_dead_tup AS dead_rows
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 20
      `);

      return result.rows;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Get index usage statistics
   */
  async getIndexUsage() {
    try {
      const result = await dbManager.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan AS times_used,
          pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0 
          AND indexrelname NOT LIKE '%_pkey'
        ORDER BY pg_relation_size(indexrelid) DESC
        LIMIT 20
      `);

      return {
        unusedIndexes: result.rows,
        unusedCount: result.rows.length
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Check for orphaned records (missing foreign key targets)
   */
  async checkOrphanedRecords() {
    const orphans = [];

    try {
      // Check visitors without valid estates
      const visitorsResult = await dbManager.query(`
        SELECT COUNT(*) as count
        FROM visitors v
        WHERE v.estate_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM estates e WHERE e.id = v.estate_id)
      `);
      
      if (parseInt(visitorsResult.rows[0].count) > 0) {
        orphans.push({
          table: 'visitors',
          issue: 'estate_id references non-existent estates',
          count: visitorsResult.rows[0].count
        });
      }

      // Check visitors without valid residents
      const residentsResult = await dbManager.query(`
        SELECT COUNT(*) as count
        FROM visitors v
        WHERE v.resident_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = v.resident_id)
      `);
      
      if (parseInt(residentsResult.rows[0].count) > 0) {
        orphans.push({
          table: 'visitors',
          issue: 'resident_id references non-existent users',
          count: residentsResult.rows[0].count
        });
      }

      // Check users without valid estates
      const usersResult = await dbManager.query(`
        SELECT COUNT(*) as count
        FROM users u
        WHERE u.estate_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM estates e WHERE e.id = u.estate_id)
      `);
      
      if (parseInt(usersResult.rows[0].count) > 0) {
        orphans.push({
          table: 'users',
          issue: 'estate_id references non-existent estates',
          count: usersResult.rows[0].count
        });
      }

      return {
        orphanedRecords: orphans,
        totalIssues: orphans.length
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    try {
      // Slow queries (if pg_stat_statements extension enabled)
      const slowQueries = await dbManager.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
        ) as has_extension
      `);

      if (slowQueries.rows[0].has_extension) {
        const queries = await dbManager.query(`
          SELECT 
            LEFT(query, 100) as query_preview,
            calls,
            total_exec_time / 1000 as total_seconds,
            mean_exec_time / 1000 as avg_seconds
          FROM pg_stat_statements
          WHERE query NOT LIKE '%pg_stat_statements%'
          ORDER BY total_exec_time DESC
          LIMIT 10
        `);

        return {
          slowQueries: queries.rows
        };
      }

      return {
        slowQueries: [],
        note: 'pg_stat_statements extension not enabled'
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Fix orphaned records by setting foreign keys to NULL
   */
  async fixOrphanedRecords() {
    const fixes = [];

    try {
      // Fix visitors with invalid estate_id
      const visitorsEstate = await dbManager.query(`
        UPDATE visitors 
        SET estate_id = NULL
        WHERE estate_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM estates e WHERE e.id = estate_id)
        RETURNING id
      `);
      
      if (visitorsEstate.rows.length > 0) {
        fixes.push({
          table: 'visitors',
          column: 'estate_id',
          fixed: visitorsEstate.rows.length
        });
      }

      // Fix visitors with invalid resident_id
      const visitorsResident = await dbManager.query(`
        UPDATE visitors 
        SET resident_id = NULL
        WHERE resident_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = resident_id)
        RETURNING id
      `);
      
      if (visitorsResident.rows.length > 0) {
        fixes.push({
          table: 'visitors',
          column: 'resident_id',
          fixed: visitorsResident.rows.length
        });
      }

      return {
        success: true,
        fixes: fixes
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get database size
   */
  async getDatabaseSize() {
    try {
      const result = await dbManager.query(`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as size,
          pg_database_size(current_database()) as size_bytes
      `);

      return result.rows[0];
    } catch (error) {
      return { error: error.message };
    }
  }
}

export const dbHealthService = new DatabaseHealthService();
export default dbHealthService;
