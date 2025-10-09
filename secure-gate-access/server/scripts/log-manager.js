#!/usr/bin/env node
/**
 * Log Management CLI Tool
 * Provides command-line interface for log management and monitoring
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LogManager {
  constructor() {
    this.dbConfig = {
      host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
      port: process.env.PGPORT || process.env.DB_PORT || 5432,
      database: process.env.PGDATABASE || process.env.DB_NAME || 'secure_gate',
      user: process.env.PGUSER || process.env.DB_USER || 'secure_gate_user',
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'secure_gate_password',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
    
    this.pool = new Pool(this.dbConfig);
    this.logsDir = path.join(__dirname, '../logs');
  }

  /**
   * Main command handler
   */
  async main() {
    const command = process.argv[2];
    const args = process.argv.slice(3);

    try {
      switch (command) {
        case 'status':
          await this.showStatus();
          break;
        case 'cleanup':
          await this.cleanupLogs();
          break;
        case 'export':
          await this.exportLogs(args);
          break;
        case 'search':
          await this.searchLogs(args);
          break;
        case 'stats':
          await this.showStats();
          break;
        case 'health':
          await this.checkHealth();
          break;
        case 'retention':
          await this.manageRetention(args);
          break;
        case 'monitor':
          await this.startMonitoring();
          break;
        case 'help':
          this.showHelp();
          break;
        default:
          console.log('❌ Unknown command. Use "help" to see available commands.');
          process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }

  /**
   * Show system status
   */
  async showStatus() {
    console.log('📊 System Status\n');
    
    try {
      const client = await this.pool.connect();
      
      // Get health summary
      const healthResult = await client.query('SELECT * FROM get_system_health_summary()');
      console.log('🏥 Health Status:');
      healthResult.rows.forEach(row => {
        const status = row.status === 'healthy' ? '✅' : row.status === 'warning' ? '⚠️' : '❌';
        console.log(`  ${status} ${row.component}: ${row.status} (${row.response_time_ms}ms)`);
      });
      
      // Get recent errors
      const errorResult = await client.query('SELECT COUNT(*) as count FROM recent_errors');
      console.log(`\n🚨 Recent Errors (24h): ${errorResult.rows[0].count}`);
      
      // Get security events
      const securityResult = await client.query('SELECT COUNT(*) as count FROM security_events WHERE timestamp >= NOW() - INTERVAL \'24 hours\'');
      console.log(`🔒 Security Events (24h): ${securityResult.rows[0].count}`);
      
      // Get log file sizes
      console.log('\n📁 Log Files:');
      if (fs.existsSync(this.logsDir)) {
        const files = fs.readdirSync(this.logsDir);
        files.forEach(file => {
          const filePath = path.join(this.logsDir, file);
          const stats = fs.statSync(filePath);
          const size = this.formatFileSize(stats.size);
          console.log(`  ${file}: ${size}`);
        });
      } else {
        console.log('  No log files found');
      }
      
      client.release();
      
    } catch (error) {
      console.error('❌ Failed to get status:', error.message);
    }
  }

  /**
   * Cleanup old logs
   */
  async cleanupLogs() {
    console.log('🧹 Cleaning up old logs...\n');
    
    try {
      const client = await this.pool.connect();
      
      // Run cleanup function
      const result = await client.query('SELECT cleanup_old_logs()');
      const deletedCount = result.rows[0].cleanup_old_logs;
      
      console.log(`✅ Cleaned up ${deletedCount} log records`);
      
      // Clean up file logs
      await this.cleanupFileLogs();
      
      client.release();
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
    }
  }

  /**
   * Cleanup file logs
   */
  async cleanupFileLogs() {
    if (!fs.existsSync(this.logsDir)) {
      return;
    }

    const files = fs.readdirSync(this.logsDir);
    let deletedFiles = 0;
    let freedSpace = 0;

    files.forEach(file => {
      const filePath = path.join(this.logsDir, file);
      const stats = fs.statSync(filePath);
      const age = Date.now() - stats.mtime.getTime();
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

      if (age > maxAge) {
        freedSpace += stats.size;
        fs.unlinkSync(filePath);
        deletedFiles++;
        console.log(`  Deleted: ${file}`);
      }
    });

    if (deletedFiles > 0) {
      console.log(`\n✅ Deleted ${deletedFiles} files, freed ${this.formatFileSize(freedSpace)}`);
    } else {
      console.log('\n✅ No old files to delete');
    }
  }

  /**
   * Export logs
   */
  async exportLogs(args) {
    const logType = args[0] || 'all';
    const format = args[1] || 'json';
    const outputFile = args[2] || `logs_export_${new Date().toISOString().split('T')[0]}.${format}`;

    console.log(`📤 Exporting ${logType} logs to ${outputFile}...\n`);

    try {
      const client = await this.pool.connect();
      let query;
      let params = [];

      switch (logType) {
        case 'audit':
          query = 'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1000';
          break;
        case 'errors':
          query = 'SELECT * FROM error_logs ORDER BY timestamp DESC LIMIT 1000';
          break;
        case 'security':
          query = 'SELECT * FROM security_events ORDER BY timestamp DESC LIMIT 1000';
          break;
        case 'performance':
          query = 'SELECT * FROM performance_metrics ORDER BY timestamp DESC LIMIT 1000';
          break;
        case 'all':
          query = `
            SELECT 'audit' as log_type, * FROM audit_logs 
            UNION ALL
            SELECT 'error' as log_type, * FROM error_logs 
            UNION ALL
            SELECT 'security' as log_type, * FROM security_events 
            UNION ALL
            SELECT 'performance' as log_type, * FROM performance_metrics 
            ORDER BY timestamp DESC LIMIT 1000
          `;
          break;
        default:
          throw new Error(`Unknown log type: ${logType}`);
      }

      const result = await client.query(query, params);
      const logs = result.rows;

      if (format === 'json') {
        fs.writeFileSync(outputFile, JSON.stringify(logs, null, 2));
      } else if (format === 'csv') {
        const csv = this.convertToCSV(logs);
        fs.writeFileSync(outputFile, csv);
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }

      console.log(`✅ Exported ${logs.length} log entries to ${outputFile}`);
      client.release();

    } catch (error) {
      console.error('❌ Export failed:', error.message);
    }
  }

  /**
   * Search logs
   */
  async searchLogs(args) {
    const searchTerm = args[0];
    const logType = args[1] || 'all';
    const limit = parseInt(args[2]) || 50;

    if (!searchTerm) {
      console.log('❌ Please provide a search term');
      return;
    }

    console.log(`🔍 Searching for "${searchTerm}" in ${logType} logs...\n`);

    try {
      const client = await this.pool.connect();
      let query;
      let params = [searchTerm, limit];

      switch (logType) {
        case 'audit':
          query = `
            SELECT * FROM audit_logs 
            WHERE message ILIKE $1 OR details::text ILIKE $1 
            ORDER BY timestamp DESC LIMIT $2
          `;
          break;
        case 'errors':
          query = `
            SELECT * FROM error_logs 
            WHERE error_message ILIKE $1 OR error_stack ILIKE $1 
            ORDER BY timestamp DESC LIMIT $2
          `;
          break;
        case 'security':
          query = `
            SELECT * FROM security_events 
            WHERE event_type ILIKE $1 OR details::text ILIKE $1 
            ORDER BY timestamp DESC LIMIT $2
          `;
          break;
        case 'all':
          query = `
            SELECT 'audit' as log_type, * FROM audit_logs WHERE message ILIKE $1 OR details::text ILIKE $1
            UNION ALL
            SELECT 'error' as log_type, * FROM error_logs WHERE error_message ILIKE $1 OR error_stack ILIKE $1
            UNION ALL
            SELECT 'security' as log_type, * FROM security_events WHERE event_type ILIKE $1 OR details::text ILIKE $1
            ORDER BY timestamp DESC LIMIT $2
          `;
          break;
        default:
          throw new Error(`Unknown log type: ${logType}`);
      }

      const result = await client.query(query, params);
      const logs = result.rows;

      if (logs.length === 0) {
        console.log('No matching logs found');
        return;
      }

      console.log(`Found ${logs.length} matching entries:\n`);
      logs.forEach((log, index) => {
        console.log(`${index + 1}. [${log.log_type || logType}] ${log.timestamp}`);
        if (log.message) console.log(`   Message: ${log.message}`);
        if (log.error_message) console.log(`   Error: ${log.error_message}`);
        if (log.event_type) console.log(`   Event: ${log.event_type}`);
        console.log('');
      });

      client.release();

    } catch (error) {
      console.error('❌ Search failed:', error.message);
    }
  }

  /**
   * Show statistics
   */
  async showStats() {
    console.log('📈 Log Statistics\n');

    try {
      const client = await this.pool.connect();

      // Get performance summary
      const perfResult = await client.query('SELECT * FROM get_performance_summary(24)');
      console.log('📊 Performance Metrics (24h):');
      perfResult.rows.forEach(row => {
        console.log(`  ${row.metric_name}: avg=${row.avg_value}, max=${row.max_value}, count=${row.count}`);
      });

      // Get security events summary
      const securityResult = await client.query('SELECT * FROM security_events_summary');
      console.log('\n🔒 Security Events (7d):');
      securityResult.rows.forEach(row => {
        console.log(`  ${row.event_type} (${row.severity}): ${row.event_count} events, ${row.unresolved_count} unresolved`);
      });

      // Get log counts by type
      const counts = await client.query(`
        SELECT 
          'audit_logs' as type, COUNT(*) as count FROM audit_logs WHERE timestamp >= NOW() - INTERVAL '24 hours'
        UNION ALL
        SELECT 'error_logs' as type, COUNT(*) as count FROM error_logs WHERE timestamp >= NOW() - INTERVAL '24 hours'
        UNION ALL
        SELECT 'security_events' as type, COUNT(*) as count FROM security_events WHERE timestamp >= NOW() - INTERVAL '24 hours'
        UNION ALL
        SELECT 'performance_metrics' as type, COUNT(*) as count FROM performance_metrics WHERE timestamp >= NOW() - INTERVAL '24 hours'
      `);

      console.log('\n📝 Log Counts (24h):');
      counts.rows.forEach(row => {
        console.log(`  ${row.type}: ${row.count} entries`);
      });

      client.release();

    } catch (error) {
      console.error('❌ Failed to get statistics:', error.message);
    }
  }

  /**
   * Check health
   */
  async checkHealth() {
    console.log('🏥 Health Check\n');

    try {
      const client = await this.pool.connect();

      // Test database connection
      await client.query('SELECT 1');
      console.log('✅ Database connection: OK');

      // Check system health
      const healthResult = await client.query('SELECT * FROM get_system_health_summary()');
      const unhealthy = healthResult.rows.filter(row => row.status !== 'healthy');
      
      if (unhealthy.length === 0) {
        console.log('✅ All components: Healthy');
      } else {
        console.log('⚠️  Unhealthy components:');
        unhealthy.forEach(row => {
          console.log(`  ❌ ${row.component}: ${row.status}`);
        });
      }

      // Check recent errors
      const errorResult = await client.query('SELECT COUNT(*) as count FROM recent_errors');
      const errorCount = parseInt(errorResult.rows[0].count);
      
      if (errorCount === 0) {
        console.log('✅ Recent errors: None');
      } else {
        console.log(`⚠️  Recent errors: ${errorCount} in last 24h`);
      }

      client.release();

    } catch (error) {
      console.error('❌ Health check failed:', error.message);
    }
  }

  /**
   * Manage retention policies
   */
  async manageRetention(args) {
    const action = args[0];
    const logType = args[1];
    const days = parseInt(args[2]);

    try {
      const client = await this.pool.connect();

      switch (action) {
        case 'list':
          const policies = await client.query('SELECT * FROM log_retention_policies ORDER BY log_type');
          console.log('📋 Retention Policies:\n');
          policies.rows.forEach(policy => {
            console.log(`  ${policy.log_type}: ${policy.retention_days} days (${policy.enabled ? 'enabled' : 'disabled'})`);
          });
          break;

        case 'set':
          if (!logType || !days) {
            console.log('❌ Usage: retention set <log_type> <days>');
            return;
          }
          
          await client.query(`
            INSERT INTO log_retention_policies (log_type, retention_days, enabled)
            VALUES ($1, $2, true)
            ON CONFLICT (log_type) DO UPDATE SET
              retention_days = $2,
              updated_at = NOW()
          `, [logType, days]);
          
          console.log(`✅ Set retention for ${logType} to ${days} days`);
          break;

        case 'disable':
          if (!logType) {
            console.log('❌ Usage: retention disable <log_type>');
            return;
          }
          
          await client.query(`
            UPDATE log_retention_policies 
            SET enabled = false, updated_at = NOW()
            WHERE log_type = $1
          `, [logType]);
          
          console.log(`✅ Disabled retention for ${logType}`);
          break;

        default:
          console.log('❌ Unknown action. Use: list, set, disable');
      }

      client.release();

    } catch (error) {
      console.error('❌ Retention management failed:', error.message);
    }
  }

  /**
   * Start monitoring
   */
  async startMonitoring() {
    console.log('👀 Starting log monitoring...\n');
    console.log('Press Ctrl+C to stop\n');

    const interval = setInterval(async () => {
      try {
        const client = await this.pool.connect();
        
        // Check for new errors
        const errorResult = await client.query(`
          SELECT COUNT(*) as count 
          FROM error_logs 
          WHERE timestamp >= NOW() - INTERVAL '1 minute'
        `);
        
        const errorCount = parseInt(errorResult.rows[0].count);
        if (errorCount > 0) {
          console.log(`🚨 ${errorCount} new errors in last minute`);
        }

        // Check for security events
        const securityResult = await client.query(`
          SELECT COUNT(*) as count 
          FROM security_events 
          WHERE timestamp >= NOW() - INTERVAL '1 minute'
        `);
        
        const securityCount = parseInt(securityResult.rows[0].count);
        if (securityCount > 0) {
          console.log(`🔒 ${securityCount} new security events in last minute`);
        }

        client.release();

      } catch (error) {
        console.error('❌ Monitoring error:', error.message);
      }
    }, 60000); // Check every minute

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      clearInterval(interval);
      console.log('\n👋 Monitoring stopped');
      process.exit(0);
    });
  }

  /**
   * Show help
   */
  showHelp() {
    console.log(`
📋 Log Manager CLI Tool

Usage: node log-manager.js <command> [args]

Commands:
  status                    Show system status
  cleanup                   Clean up old logs
  export <type> [format]    Export logs (types: audit, errors, security, performance, all)
  search <term> [type]      Search logs
  stats                     Show log statistics
  health                    Check system health
  retention <action>        Manage retention policies
  monitor                   Start real-time monitoring
  help                      Show this help

Examples:
  node log-manager.js status
  node log-manager.js export audit json
  node log-manager.js search "error" errors
  node log-manager.js retention set audit_logs 90
  node log-manager.js monitor
    `);
  }

  /**
   * Convert data to CSV
   */
  convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csv = [headers.join(',')];
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value).replace(/,/g, ';');
      });
      csv.push(values.join(','));
    });
    
    return csv.join('\n');
  }

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// Run the CLI tool
const logManager = new LogManager();
logManager.main().catch(console.error);




