#!/usr/bin/env node
// Database Migration System
// Uses node-pg-migrate for database schema management

// import { createMigration } from 'node-pg-migrate'; // Not available in this version
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'gatedb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Migration configuration
const migrationConfig = {
  databaseUrl: `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`,
  migrationsTable: 'pgmigrations',
  migrationsDirectory: path.join(__dirname, 'migrations'),
  direction: 'up', // 'up' or 'down'
  count: Infinity, // Number of migrations to run
  dryRun: false, // Set to true to see what would be executed
  createMigrationsTable: true,
  createSchema: true,
  schemaName: 'public',
  logger: console.log,
  verbose: true
};

class MigrationManager {
  constructor(customDbConfig = null) {
    const config = customDbConfig || dbConfig;
    this.pool = new Pool(config);
    this.config = {
      ...migrationConfig,
      databaseUrl: `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`
    };
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
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  }

  /**
   * Run migrations up
   */
  async migrateUp(count = Infinity) {
    try {
      console.log('⬆️  Running migrations up...');
      
      const config = { ...this.config, count };
      const result = await createMigration(config);
      
      console.log('✅ Migrations completed successfully');
      return result;
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
      
      const config = { ...this.config, direction: 'down', count };
      const result = await createMigration(config);
      
      console.log('✅ Rollback completed successfully');
      return result;
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async getStatus() {
    try {
      const client = await this.pool.connect();
      
      // Check if migrations table exists
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'pgmigrations'
        );
      `);
      
      if (!tableExists.rows[0].exists) {
        console.log('📊 No migrations table found - no migrations have been run');
        client.release();
        return { applied: [], pending: [] };
      }
      
      // Get applied migrations
      const appliedMigrations = await client.query(`
        SELECT migration_name, run_on 
        FROM pgmigrations 
        ORDER BY run_on DESC
      `);
      
      // Get all migration files
      const fs = await import('fs');
      const migrationFiles = fs.readdirSync(this.config.migrationsDirectory)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      const appliedNames = appliedMigrations.rows.map(row => row.migration_name);
      const pendingMigrations = migrationFiles.filter(file => !appliedNames.includes(file));
      
      console.log('📊 Migration Status:');
      console.log(`   Applied: ${appliedMigrations.rows.length}`);
      console.log(`   Pending: ${pendingMigrations.length}`);
      
      if (appliedMigrations.rows.length > 0) {
        console.log('\n   Applied Migrations:');
        appliedMigrations.rows.forEach(row => {
          console.log(`   ✅ ${row.migration_name} (${row.run_on})`);
        });
      }
      
      if (pendingMigrations.length > 0) {
        console.log('\n   Pending Migrations:');
        pendingMigrations.forEach(file => {
          console.log(`   ⏳ ${file}`);
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
   * Create a new migration file
   */
  async createMigration(name) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `${timestamp}_${name}.sql`;
      const filePath = path.join(this.config.migrationsDirectory, fileName);
      
      const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- Description: ${name.replace(/_/g, ' ')}

-- Up migration
-- Add your SQL statements here

-- Down migration (rollback)
-- Add your rollback SQL statements here
`;

      const fs = await import('fs');
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
      
      const fs = await import('fs');
      const migrationFiles = fs.readdirSync(this.config.migrationsDirectory)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      let validCount = 0;
      let invalidCount = 0;
      
      for (const file of migrationFiles) {
        const filePath = path.join(this.config.migrationsDirectory, file);
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

  const migrationManager = new MigrationManager();
  
  try {
    const initialized = await migrationManager.initialize();
    if (!initialized) {
      process.exit(1);
    }

    switch (command) {
      case 'up':
        await migrationManager.migrateUp(param ? parseInt(param) : Infinity);
        break;
        
      case 'down':
        await migrationManager.migrateDown(param ? parseInt(param) : 1);
        break;
        
      case 'status':
        await migrationManager.getStatus();
        break;
        
      case 'create':
        if (!param) {
          console.error('❌ Migration name required. Usage: node migrate.js create <name>');
          process.exit(1);
        }
        await migrationManager.createMigration(param);
        break;
        
      case 'validate':
        await migrationManager.validateMigrations();
        break;
        
      default:
        console.log('📖 Database Migration System');
        console.log('============================');
        console.log('');
        console.log('Usage: node migrate.js <command> [options]');
        console.log('');
        console.log('Commands:');
        console.log('  up [count]     Run pending migrations (default: all)');
        console.log('  down [count]   Rollback migrations (default: 1)');
        console.log('  status         Show migration status');
        console.log('  create <name>  Create new migration file');
        console.log('  validate       Validate migration files');
        console.log('');
        console.log('Examples:');
        console.log('  node migrate.js up');
        console.log('  node migrate.js up 3');
        console.log('  node migrate.js down');
        console.log('  node migrate.js down 2');
        console.log('  node migrate.js status');
        console.log('  node migrate.js create add_user_table');
        console.log('  node migrate.js validate');
        break;
    }
  } catch (error) {
    console.error('❌ Migration operation failed:', error.message);
    process.exit(1);
  } finally {
    await migrationManager.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default MigrationManager;
