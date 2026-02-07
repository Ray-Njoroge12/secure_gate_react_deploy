/**
 * MFA Migration Runner
 * Applies migration 061 to add MFA columns to users table
 * 
 * USAGE:
 * ======
 * npm run mfa:migrate
 * 
 * OR directly:
 * node src/scripts/run-mfa-migration.js
 * 
 * WHAT IT DOES:
 * =============
 * 1. Checks if MFA columns already exist in users table
 * 2. If not, applies migration 061_add_mfa_columns_to_users.sql
 * 3. Migrates any existing MFA data from user_security_settings
 * 4. Creates necessary indexes for performance
 * 5. Verifies the migration was successful
 * 
 * REQUIREMENTS:
 * =============
 * - DATABASE_URL environment variable must be set
 * - PostgreSQL database must be accessible
 * - Users table must exist
 * 
 * SAFE TO RUN MULTIPLE TIMES:
 * ============================
 * Yes - The script checks if migration has already been applied
 * and will skip if MFA columns already exist.
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('Please set DATABASE_URL in your .env file');
  process.exit(1);
}

async function runMigration() {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Check if migration has already been run
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('mfa_enabled', 'mfa_secret', 'backup_codes', 'mfa_methods')
    `);
    
    const existingColumns = checkResult.rows.map(r => r.column_name);
    const requiredColumns = ['mfa_enabled', 'mfa_secret', 'backup_codes', 'mfa_methods'];
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length === 0) {
      console.log('ℹ️  All MFA columns already exist in users table');
      console.log('✅ Migration already applied');
    } else if (existingColumns.length > 0 && missingColumns.length > 0) {
      console.log(`⚠️  Partial migration detected. Missing columns: ${missingColumns.join(', ')}`);
      console.log('� Running migration to add missing columns...');
      
      const migrationPath = join(__dirname, '../database/migrations/061_add_mfa_columns_to_users.sql');
      const migrationSQL = readFileSync(migrationPath, 'utf8');
      
      await client.query(migrationSQL);
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('📝 Reading migration file...');
      const migrationPath = join(__dirname, '../database/migrations/061_add_mfa_columns_to_users.sql');
      const migrationSQL = readFileSync(migrationPath, 'utf8');
      
      console.log('🚀 Running migration 061_add_mfa_columns_to_users.sql...');
      await client.query(migrationSQL);
      
      console.log('✅ Migration completed successfully!');
    }
    
    // Verify columns were added
    const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('mfa_enabled', 'mfa_secret', 'backup_codes', 'mfa_methods')
      ORDER BY column_name
    `);
    
    console.log('\n✅ Verified MFA columns in users table:');
    verifyResult.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    // Check for migrated data
    const dataCheck = await client.query(`
      SELECT COUNT(*) as migrated_count 
      FROM users 
      WHERE mfa_enabled = true
    `);
    
    if (dataCheck.rows[0].migrated_count > 0) {
      console.log(`\n📦 Migrated MFA data for ${dataCheck.rows[0].migrated_count} user(s)`);
    }
    
    console.log('\n🎉 MFA schema migration complete!');
    console.log('Next steps:');
    console.log('  1. Restart your application server');
    console.log('  2. Test MFA setup for admin/guard users');
    console.log('  3. Verify MFA login flow');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
