#!/usr/bin/env node
// Database Migration Script
// Provides a simple interface for running database migrations

import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const dbConfig = {
  host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
  port: process.env.PGPORT || process.env.DB_PORT || 5432,
  database: process.env.PGDATABASE || process.env.DB_NAME || 'secure_gate',
  user: process.env.PGUSER || process.env.DB_USER || 'secure_gate_user',
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'secure_gate_password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

class DatabaseMigrator {
  constructor() {
    this.pool = new Pool(dbConfig);
    this.migrationsDir = path.join(__dirname, '../src/database/migrations');
  }

  /**
   * Initialize migration system
   */
  async initialize() {
    try {
      console.log('🔄 Initializing database migration system...');
      
      // Test database connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      console.log('✅ Database connection established');
      
      // Create migrations table if it doesn't exist
      await this.createMigrationsTable();
      
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  }

  /**
   * Create migrations tracking table
   */
  async createMigrationsTable() {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS pgmigrations (
          id SERIAL PRIMARY KEY,
          migration_name VARCHAR(255) NOT NULL UNIQUE,
          run_on TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          checksum VARCHAR(64),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
      console.log('✅ Migrations table ready');
    } catch (error) {
      console.error('❌ Failed to create migrations table:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get migration status
   */
  async getStatus() {
    try {
      const client = await this.pool.connect();
      
      // Get applied migrations
      const appliedMigrations = await client.query(`
        SELECT migration_name, run_on 
        FROM pgmigrations 
        ORDER BY run_on ASC
      `);
      
      // Get all migration files
      const migrationFiles = fs.readdirSync(this.migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      const appliedNames = appliedMigrations.rows.map(row => row.migration_name);
      const pendingMigrations = migrationFiles.filter(file => !appliedNames.includes(file));
      
      console.log('\n📊 Migration Status');
      console.log('==================');
      console.log(`Applied: ${appliedMigrations.rows.length}`);
      console.log(`Pending: ${pendingMigrations.length}`);
      
      if (appliedMigrations.rows.length > 0) {
        console.log('\n✅ Applied Migrations:');
        appliedMigrations.rows.forEach(row => {
          console.log(`   ${row.migration_name} (${row.run_on})`);
        });
      }
      
      if (pendingMigrations.length > 0) {
        console.log('\n⏳ Pending Migrations:');
        pendingMigrations.forEach(file => {
          console.log(`   ${file}`);
        });
      }
      
      client.release();
      return {
        applied: appliedMigrations.rows,
        pending: pendingMigrations
      };
    } catch (error) {
      console.error('❌ Failed to get migration status:', error.message);
      throw error;
    }
  }

  /**
   * Run migrations up
   */
  async migrateUp(count = Infinity) {
    try {
      console.log('⬆️  Running migrations up...');
      
      const status = await this.getStatus();
      const migrationsToRun = status.pending.slice(0, count);
      
      if (migrationsToRun.length === 0) {
        console.log('✅ No pending migrations to run');
        return;
      }
      
      console.log(`Running ${migrationsToRun.length} migration(s)...`);
      
      for (const migrationFile of migrationsToRun) {
        await this.runMigration(migrationFile, 'up');
      }
      
      console.log('✅ All migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  }

  /**
   * Run migrations down (rollback)
   */
  async migrateDown(count = 1) {
    try {
      console.log('⬇️  Running migrations down...');
      
      const client = await this.pool.connect();
      
      // Get applied migrations in reverse order
      const appliedMigrations = await client.query(`
        SELECT migration_name, run_on 
        FROM pgmigrations 
        ORDER BY run_on DESC
        LIMIT $1
      `, [count]);
      
      if (appliedMigrations.rows.length === 0) {
        console.log('✅ No migrations to rollback');
        client.release();
        return;
      }
      
      console.log(`Rolling back ${appliedMigrations.rows.length} migration(s)...`);
      
      for (const migration of appliedMigrations.rows) {
        await this.runMigration(migration.migration_name, 'down');
      }
      
      client.release();
      console.log('✅ Rollback completed successfully');
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }

  /**
   * Run a single migration
   */
  async runMigration(migrationFile, direction) {
    try {
      const filePath = path.join(this.migrationsDir, migrationFile);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract up or down section
      const sections = this.parseMigrationContent(content);
      const sql = sections[direction];
      
      if (!sql || sql.trim() === '') {
        console.log(`⚠️  No ${direction} section found in ${migrationFile}, skipping`);
        return;
      }
      
      console.log(`   Running ${migrationFile} (${direction})...`);
      
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        
        if (direction === 'up') {
          // Record migration as applied
          await client.query(`
            INSERT INTO pgmigrations (migration_name, checksum) 
            VALUES ($1, $2)
            ON CONFLICT (migration_name) DO NOTHING
          `, [migrationFile, this.calculateChecksum(content)]);
        } else {
          // Remove migration from applied list
          await client.query(`
            DELETE FROM pgmigrations 
            WHERE migration_name = $1
          `, [migrationFile]);
        }
        
        await client.query('COMMIT');
        console.log(`   ✅ ${migrationFile} completed`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`❌ Failed to run ${migrationFile}:`, error.message);
      throw error;
    }
  }

  /**
   * Parse migration content to extract up/down sections
   */
  parseMigrationContent(content) {
    const sections = { up: '', down: '' };
    const lines = content.split('\n');
    let currentSection = null;
    
    for (const line of lines) {
      if (line.includes('-- Up migration') || line.includes('-- UP MIGRATION')) {
        currentSection = 'up';
        continue;
      }
      if (line.includes('-- Down migration') || line.includes('-- DOWN MIGRATION')) {
        currentSection = 'down';
        continue;
      }
      
      if (currentSection && !line.startsWith('--')) {
        sections[currentSection] += line + '\n';
      }
    }
    
    return sections;
  }

  /**
   * Calculate file checksum
   */
  calculateChecksum(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Create a new migration file
   */
  async createMigration(name) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `${timestamp}_${name}.sql`;
      const filePath = path.join(this.migrationsDir, fileName);
      
      const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- Description: ${name.replace(/_/g, ' ')}

-- Up migration
-- Add your SQL statements here
-- Example:
-- CREATE TABLE example_table (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP DEFAULT NOW()
-- );

-- Down migration (rollback)
-- Add your rollback SQL statements here
-- Example:
-- DROP TABLE IF EXISTS example_table;
`;

      fs.writeFileSync(filePath, template);
      console.log(`✅ Created migration file: ${fileName}`);
      return filePath;
    } catch (error) {
      console.error('❌ Failed to create migration:', error.message);
      throw error;
    }
  }

  /**
   * Validate migration files
   */
  async validateMigrations() {
    try {
      console.log('🔍 Validating migration files...');
      
      const migrationFiles = fs.readdirSync(this.migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      let validCount = 0;
      let invalidCount = 0;
      
      for (const file of migrationFiles) {
        const filePath = path.join(this.migrationsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Basic validation - check for up/down sections
        if (content.includes('-- Up migration') && content.includes('-- Down migration')) {
          validCount++;
          console.log(`   ✅ ${file} - Valid`);
        } else {
          invalidCount++;
          console.log(`   ❌ ${file} - Invalid (missing up/down sections)`);
        }
      }
      
      console.log(`\n📊 Validation Results:`);
      console.log(`   Valid: ${validCount}`);
      console.log(`   Invalid: ${invalidCount}`);
      
      return { valid: validCount, invalid: invalidCount };
    } catch (error) {
      console.error('❌ Migration validation failed:', error.message);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close() {
    await this.pool.end();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const param = args[1];

  const migrator = new DatabaseMigrator();
  
  try {
    const initialized = await migrator.initialize();
    if (!initialized) {
      process.exit(1);
    }

    switch (command) {
      case 'up':
        await migrator.migrateUp(param ? parseInt(param) : Infinity);
        break;
        
      case 'down':
        await migrator.migrateDown(param ? parseInt(param) : 1);
        break;
        
      case 'status':
        await migrator.getStatus();
        break;
        
      case 'create':
        if (!param) {
          console.error('❌ Migration name required. Usage: node migrate.js create <name>');
          process.exit(1);
        }
        await migrator.createMigration(param);
        break;
        
      case 'validate':
        await migrator.validateMigrations();
        break;
        
      default:
        console.log('📖 Database Migration System');
        console.log('============================');
        console.log('');
        console.log('Usage: node scripts/migrate.js <command> [options]');
        console.log('');
        console.log('Commands:');
        console.log('  up [count]     Run pending migrations (default: all)');
        console.log('  down [count]   Rollback migrations (default: 1)');
        console.log('  status         Show migration status');
        console.log('  create <name>  Create new migration file');
        console.log('  validate       Validate migration files');
        console.log('');
        console.log('Examples:');
        console.log('  npm run db:migrate up');
        console.log('  npm run db:migrate up 3');
        console.log('  npm run db:migrate down');
        console.log('  npm run db:migrate down 2');
        console.log('  npm run db:migrate status');
        console.log('  npm run db:migrate create add_user_table');
        console.log('  npm run db:migrate validate');
        break;
    }
  } catch (error) {
    console.error('❌ Migration operation failed:', error.message);
    process.exit(1);
  } finally {
    await migrator.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default DatabaseMigrator;
