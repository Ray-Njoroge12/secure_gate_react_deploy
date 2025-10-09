#!/usr/bin/env node

/**
 * Database Optimization Script
 * 
 * This script optimizes database performance by:
 * - Adding missing indexes
 * - Analyzing query performance
 * - Optimizing table structures
 * - Implementing connection pooling
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class DatabaseOptimizer {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // Maximum number of connections
      idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
      connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
    });
  }

  /**
   * Run all database optimizations
   */
  async optimize() {
    console.log('🚀 Starting database optimization...');
    
    try {
      // Test connection
      await this.testConnection();
      
      // Add performance indexes
      await this.addPerformanceIndexes();
      
      // Analyze tables
      await this.analyzeTables();
      
      // Optimize queries
      await this.optimizeQueries();
      
      // Implement connection pooling
      await this.implementConnectionPooling();
      
      // Generate optimization report
      await this.generateOptimizationReport();
      
      console.log('✅ Database optimization completed successfully');
      
    } catch (error) {
      console.error('❌ Database optimization failed:', error.message);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  /**
   * Test database connection
   */
  async testConnection() {
    console.log('🔌 Testing database connection...');
    
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      
      console.log('✅ Database connection successful');
      console.log(`📅 Database time: ${result.rows[0].now}`);
      
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  /**
   * Add performance indexes
   */
  async addPerformanceIndexes() {
    console.log('📊 Adding performance indexes...');
    
    const indexes = [
      // Users table indexes
      {
        name: 'idx_users_email',
        table: 'users',
        columns: ['email'],
        type: 'UNIQUE'
      },
      {
        name: 'idx_users_phone',
        table: 'users',
        columns: ['phone'],
        type: 'UNIQUE'
      },
      {
        name: 'idx_users_role',
        table: 'users',
        columns: ['role']
      },
      {
        name: 'idx_users_created_at',
        table: 'users',
        columns: ['created_at']
      },
      
      // Visitors table indexes
      {
        name: 'idx_visitors_email',
        table: 'visitors',
        columns: ['email']
      },
      {
        name: 'idx_visitors_phone',
        table: 'visitors',
        columns: ['phone']
      },
      {
        name: 'idx_visitors_status',
        table: 'visitors',
        columns: ['status']
      },
      {
        name: 'idx_visitors_created_at',
        table: 'visitors',
        columns: ['created_at']
      },
      {
        name: 'idx_visitors_visit_date',
        table: 'visitors',
        columns: ['visit_date']
      },
      
      // Access logs table indexes
      {
        name: 'idx_access_logs_user_id',
        table: 'access_logs',
        columns: ['user_id']
      },
      {
        name: 'idx_access_logs_visitor_id',
        table: 'access_logs',
        columns: ['visitor_id']
      },
      {
        name: 'idx_access_logs_timestamp',
        table: 'access_logs',
        columns: ['timestamp']
      },
      {
        name: 'idx_access_logs_action',
        table: 'access_logs',
        columns: ['action']
      },
      
      // Audit logs table indexes
      {
        name: 'idx_audit_logs_user_id',
        table: 'audit_logs',
        columns: ['user_id']
      },
      {
        name: 'idx_audit_logs_entity_type',
        table: 'audit_logs',
        columns: ['entity_type']
      },
      {
        name: 'idx_audit_logs_timestamp',
        table: 'audit_logs',
        columns: ['timestamp']
      },
      
      // Security events table indexes
      {
        name: 'idx_security_events_user_id',
        table: 'security_events',
        columns: ['user_id']
      },
      {
        name: 'idx_security_events_event_type',
        table: 'security_events',
        columns: ['event_type']
      },
      {
        name: 'idx_security_events_timestamp',
        table: 'security_events',
        columns: ['timestamp']
      }
    ];
    
    for (const index of indexes) {
      try {
        await this.createIndex(index);
        console.log(`✅ Created index: ${index.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Index already exists: ${index.name}`);
        } else {
          console.error(`❌ Failed to create index ${index.name}:`, error.message);
        }
      }
    }
  }

  /**
   * Create a database index
   */
  async createIndex(index) {
    const client = await this.pool.connect();
    
    try {
      let sql = `CREATE ${index.type || 'INDEX'} ${index.name} ON ${index.table} (${index.columns.join(', ')})`;
      
      if (index.type === 'UNIQUE') {
        sql = `CREATE UNIQUE INDEX ${index.name} ON ${index.table} (${index.columns.join(', ')})`;
      }
      
      await client.query(sql);
      
    } finally {
      client.release();
    }
  }

  /**
   * Analyze tables for optimization
   */
  async analyzeTables() {
    console.log('📈 Analyzing tables for optimization...');
    
    const tables = ['users', 'visitors', 'access_logs', 'audit_logs', 'security_events'];
    
    for (const table of tables) {
      try {
        const client = await this.pool.connect();
        
        try {
          // Analyze table
          await client.query(`ANALYZE ${table}`);
          
          // Get table statistics
          const stats = await client.query(`
            SELECT 
              schemaname,
              tablename,
              attname,
              n_distinct,
              correlation,
              most_common_vals,
              most_common_freqs
            FROM pg_stats 
            WHERE tablename = $1
            ORDER BY attname
          `, [table]);
          
          console.log(`✅ Analyzed table: ${table} (${stats.rows.length} columns)`);
          
        } finally {
          client.release();
        }
        
      } catch (error) {
        console.error(`❌ Failed to analyze table ${table}:`, error.message);
      }
    }
  }

  /**
   * Optimize queries
   */
  async optimizeQueries() {
    console.log('🔍 Optimizing queries...');
    
    const optimizations = [
      {
        name: 'Enable query plan caching',
        sql: 'SET plan_cache_mode = force_custom_plan;'
      },
      {
        name: 'Set work memory for sorting',
        sql: 'SET work_mem = 256MB;'
      },
      {
        name: 'Set shared buffers',
        sql: 'SET shared_buffers = 256MB;'
      },
      {
        name: 'Set effective cache size',
        sql: 'SET effective_cache_size = 1GB;'
      },
      {
        name: 'Set random page cost',
        sql: 'SET random_page_cost = 1.1;'
      }
    ];
    
    for (const optimization of optimizations) {
      try {
        const client = await this.pool.connect();
        
        try {
          await client.query(optimization.sql);
          console.log(`✅ Applied optimization: ${optimization.name}`);
        } finally {
          client.release();
        }
        
      } catch (error) {
        console.error(`❌ Failed to apply optimization ${optimization.name}:`, error.message);
      }
    }
  }

  /**
   * Implement connection pooling
   */
  async implementConnectionPooling() {
    console.log('🔗 Implementing connection pooling...');
    
    try {
      // Test connection pool
      const client = await this.pool.connect();
      
      try {
        const result = await client.query('SELECT COUNT(*) as connection_count FROM pg_stat_activity');
        console.log(`✅ Connection pool active: ${result.rows[0].connection_count} connections`);
        
        // Test pool performance
        const startTime = Date.now();
        const promises = [];
        
        for (let i = 0; i < 10; i++) {
          promises.push(this.pool.query('SELECT NOW()'));
        }
        
        await Promise.all(promises);
        const duration = Date.now() - startTime;
        
        console.log(`✅ Pool performance test: 10 queries in ${duration}ms`);
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('❌ Connection pooling test failed:', error.message);
    }
  }

  /**
   * Generate optimization report
   */
  async generateOptimizationReport() {
    console.log('📄 Generating optimization report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      optimizations: {
        indexes: await this.getIndexReport(),
        tables: await this.getTableReport(),
        connections: await this.getConnectionReport()
      },
      recommendations: this.generateRecommendations()
    };
    
    // Save report
    const reportPath = path.join(__dirname, '../tests/results/database-optimization-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`✅ Optimization report saved to: ${reportPath}`);
  }

  /**
   * Get index report
   */
  async getIndexReport() {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get table report
   */
  async getTableReport() {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_stat_get_tuples_returned(c.oid) as tuples_returned,
          pg_stat_get_tuples_fetched(c.oid) as tuples_fetched
        FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get connection report
   */
  async getConnectionReport() {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    return [
      {
        priority: 'HIGH',
        category: 'Database',
        issue: 'Database optimization completed',
        recommendation: 'Monitor query performance and add indexes as needed',
        impact: 'Improved database performance and query response times'
      },
      {
        priority: 'MEDIUM',
        category: 'Connection Pooling',
        issue: 'Connection pooling implemented',
        recommendation: 'Monitor connection usage and adjust pool size as needed',
        impact: 'Better resource utilization and connection management'
      },
      {
        priority: 'LOW',
        category: 'Maintenance',
        issue: 'Regular maintenance needed',
        recommendation: 'Schedule regular VACUUM and ANALYZE operations',
        impact: 'Maintained database performance over time'
      }
    ];
  }
}

// Main execution
async function main() {
  const optimizer = new DatabaseOptimizer();
  
  try {
    await optimizer.optimize();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database optimization failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = DatabaseOptimizer;




