/**
 * Migration runner script
 * Runs all SQL migrations in the correct order using Node.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbManager as db } from '../database/db.enhanced.js'; // Migrated from database-wrapper

const pool = db.pool || db;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

// Migration order
const MIGRATION_ORDER = [
  '000-enable-extensions.sql',
  'add-visitor-token.sql',
  'add-notification-system.sql',
  'add-swahili-templates.sql',
  'add-admin-analytics-tables.sql',
  'add-rbac-system.sql',
  'add-policies-watchlist.sql',
  'add-incidents-table.sql',
  'add-incident-workflow.sql',
  'add-multisite-integrations.sql'
];

async function runMigration(filename) {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Running: ${filename}`);
  console.log('='.repeat(50));
  
  if (!fs.existsSync(filepath)) {
    console.log(`⚠️  File not found: ${filename}`);
    return false;
  }
  
  try {
    const sql = fs.readFileSync(filepath, 'utf8');
    await db.query(sql);
    console.log(`✅ SUCCESS: ${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ FAILED: ${filename}`);
    console.error(error.message);
    return false;
  }
}

async function runAllMigrations() {
  console.log('\n' + '='.repeat(50));
  console.log('STARTING DATABASE MIGRATIONS');
  console.log('='.repeat(50));
  
  try {
    // Test database connection
    console.log('\nTesting database connection...');
    const result = await db.query('SELECT version()');
    console.log('✅ Database connected successfully');
    console.log(`PostgreSQL version: ${result.rows[0].version.split(',')[0]}`);
    
    // Run migrations
    let successCount = 0;
    let failCount = 0;
    
    for (const migration of MIGRATION_ORDER) {
      const success = await runMigration(migration);
      if (success) {
        successCount++;
      } else {
        failCount++;
        console.log('\n❌ Migration failed. Stopping execution.');
        break;
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Total: ${MIGRATION_ORDER.length}`);
    
    // Verify database state
    console.log('\nVerifying database state...');
    const tableCount = await db.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    `);
    console.log(`📋 Total tables: ${tableCount.rows[0].count}`);
    
    // List all tables
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log('\n📑 Tables in database:');
    tables.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.table_name}`);
    });
    
    console.log('\n' + '='.repeat(50));
    console.log(failCount === 0 ? '✅ ALL MIGRATIONS COMPLETE!' : '❌ MIGRATIONS INCOMPLETE');
    console.log('='.repeat(50) + '\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (pool && pool.end) {
      await pool.end();
    }
  }
}

// Run migrations
runAllMigrations();
