#!/usr/bin/env node

/**
 * Data Encryption Migration Script
 * 
 * This script encrypts existing personal data in the database.
 * It should be run AFTER deploying the encrypted fields migration (008_add_encrypted_fields.sql)
 * 
 * Usage:
 *   node scripts/migrate-encrypt-data.js [options]
 * 
 * Options:
 *   --dry-run         Show what would be encrypted without actually encrypting
 *   --batch-size N    Process N records at a time (default: 100)
 *   --table NAME      Only encrypt specific table (users, visitors, or all)
 *   --verify          Verify encryption after migration
 * 
 * Example:
 *   node scripts/migrate-encrypt-data.js --dry-run
 *   node scripts/migrate-encrypt-data.js --batch-size 50
 *   node scripts/migrate-encrypt-data.js --table users
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import encryptionService from '../src/services/encryptionService.js';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const shouldVerify = args.includes('--verify');
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size'));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 100;
const tableArg = args.find(arg => arg.startsWith('--table'));
const targetTable = tableArg ? tableArg.split('=')[1] : 'all';

// Database connection
const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE
});

// Statistics
const stats = {
  users: { total: 0, encrypted: 0, failed: 0, skipped: 0 },
  visitors: { total: 0, encrypted: 0, failed: 0, skipped: 0 }
};

/**
 * Encrypt users table
 */
async function encryptUsers(client) {
  console.log('\n📧 Encrypting users table...');
  
  // Get all users with unencrypted data
  const query = `
    SELECT id, email, phone
    FROM users
    WHERE email_encrypted IS NULL
    AND email IS NOT NULL
    ORDER BY id
  `;
  
  const result = await client.query(query);
  stats.users.total = result.rows.length;
  
  console.log(`Found ${stats.users.total} users to encrypt`);
  
  if (isDryRun) {
    console.log('🔍 DRY RUN - No data will be encrypted');
    stats.users.skipped = stats.users.total;
    return;
  }
  
  // Process in batches
  for (let i = 0; i < result.rows.length; i += batchSize) {
    const batch = result.rows.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(result.rows.length / batchSize)}...`);
    
    for (const user of batch) {
      try {
        const encrypted = await encryptionService.encryptFields(user, ['email', 'phone']);
        
        await client.query(
          `UPDATE users 
           SET email_encrypted = $1,
               phone_encrypted = $2,
               encryption_version = 'v1',
               encrypted_at = NOW()
           WHERE id = $3`,
          [encrypted.email, encrypted.phone, user.id]
        );
        
        // Log to encryption audit
        await client.query(
          `INSERT INTO encryption_audit (table_name, record_id, field_name, operation, encryption_method, performed_by)
           VALUES ('users', $1, 'email,phone', 'migrate', $2, 'migration-script')`,
          [user.id, process.env.ENCRYPTION_METHOD || 'local']
        );
        
        stats.users.encrypted++;
      } catch (error) {
        console.error(`❌ Failed to encrypt user ${user.id}:`, error.message);
        stats.users.failed++;
        
        // Log failure
        await client.query(
          `INSERT INTO encryption_audit (table_name, record_id, field_name, operation, success, error_message)
           VALUES ('users', $1, 'email,phone', 'migrate', false, $2)`,
          [user.id, error.message]
        );
      }
    }
  }
  
  console.log(`✅ Users encrypted: ${stats.users.encrypted}/${stats.users.total}`);
  if (stats.users.failed > 0) {
    console.log(`❌ Failed: ${stats.users.failed}`);
  }
}

/**
 * Encrypt visitors table
 */
async function encryptVisitors(client) {
  console.log('\n🚶 Encrypting visitors table...');
  
  // Get all visitors with unencrypted data
  const query = `
    SELECT id, name, phone, email, id_number, vehicle_plate
    FROM visitors
    WHERE name_encrypted IS NULL
    AND name IS NOT NULL
    ORDER BY id
  `;
  
  const result = await client.query(query);
  stats.visitors.total = result.rows.length;
  
  console.log(`Found ${stats.visitors.total} visitors to encrypt`);
  
  if (isDryRun) {
    console.log('🔍 DRY RUN - No data will be encrypted');
    stats.visitors.skipped = stats.visitors.total;
    return;
  }
  
  // Process in batches
  for (let i = 0; i < result.rows.length; i += batchSize) {
    const batch = result.rows.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(result.rows.length / batchSize)}...`);
    
    for (const visitor of batch) {
      try {
        const encrypted = await encryptionService.encryptFields(
          visitor, 
          ['name', 'phone', 'email', 'id_number', 'vehicle_plate']
        );
        
        await client.query(
          `UPDATE visitors 
           SET name_encrypted = $1,
               phone_encrypted = $2,
               email_encrypted = $3,
               id_number_encrypted = $4,
               vehicle_plate_encrypted = $5,
               encryption_version = 'v1',
               encrypted_at = NOW()
           WHERE id = $6`,
          [
            encrypted.name,
            encrypted.phone,
            encrypted.email,
            encrypted.id_number,
            encrypted.vehicle_plate,
            visitor.id
          ]
        );
        
        // Log to encryption audit
        await client.query(
          `INSERT INTO encryption_audit (table_name, record_id, field_name, operation, encryption_method, performed_by)
           VALUES ('visitors', $1, 'name,phone,email,id_number,vehicle_plate', 'migrate', $2, 'migration-script')`,
          [visitor.id, process.env.ENCRYPTION_METHOD || 'local']
        );
        
        stats.visitors.encrypted++;
      } catch (error) {
        console.error(`❌ Failed to encrypt visitor ${visitor.id}:`, error.message);
        stats.visitors.failed++;
        
        // Log failure
        await client.query(
          `INSERT INTO encryption_audit (table_name, record_id, field_name, operation, success, error_message)
           VALUES ('visitors', $1, 'name,phone,email,id_number,vehicle_plate', 'migrate', false, $2)`,
          [visitor.id, error.message]
        );
      }
    }
  }
  
  console.log(`✅ Visitors encrypted: ${stats.visitors.encrypted}/${stats.visitors.total}`);
  if (stats.visitors.failed > 0) {
    console.log(`❌ Failed: ${stats.visitors.failed}`);
  }
}

/**
 * Verify encryption
 */
async function verifyEncryption(client) {
  console.log('\n🔍 Verifying encryption...');
  
  // Check users
  const usersResult = await client.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(email_encrypted) as encrypted,
      COUNT(*) - COUNT(email_encrypted) as unencrypted
    FROM users
    WHERE email IS NOT NULL
  `);
  
  const usersStats = usersResult.rows[0];
  console.log('\nUsers:');
  console.log(`  Total: ${usersStats.total}`);
  console.log(`  Encrypted: ${usersStats.encrypted}`);
  console.log(`  Unencrypted: ${usersStats.unencrypted}`);
  
  // Check visitors
  const visitorsResult = await client.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(name_encrypted) as encrypted,
      COUNT(*) - COUNT(name_encrypted) as unencrypted
    FROM visitors
    WHERE name IS NOT NULL
  `);
  
  const visitorsStats = visitorsResult.rows[0];
  console.log('\nVisitors:');
  console.log(`  Total: ${visitorsStats.total}`);
  console.log(`  Encrypted: ${visitorsStats.encrypted}`);
  console.log(`  Unencrypted: ${visitorsStats.unencrypted}`);
  
  // Test decryption of sample records
  console.log('\n🔓 Testing decryption...');
  
  const sampleUser = await client.query(
    `SELECT id, email, email_encrypted FROM users WHERE email_encrypted IS NOT NULL LIMIT 1`
  );
  
  if (sampleUser.rows.length > 0) {
    const user = sampleUser.rows[0];
    const decrypted = await encryptionService.decrypt(user.email_encrypted);
    
    if (decrypted === user.email) {
      console.log('✅ User email decryption verified');
    } else {
      console.log('❌ User email decryption failed');
      console.log(`  Expected: ${user.email}`);
      console.log(`  Got: ${decrypted}`);
    }
  }
  
  const sampleVisitor = await client.query(
    `SELECT id, name, name_encrypted FROM visitors WHERE name_encrypted IS NOT NULL LIMIT 1`
  );
  
  if (sampleVisitor.rows.length > 0) {
    const visitor = sampleVisitor.rows[0];
    const decrypted = await encryptionService.decrypt(visitor.name_encrypted);
    
    if (decrypted === visitor.name) {
      console.log('✅ Visitor name decryption verified');
    } else {
      console.log('❌ Visitor name decryption failed');
      console.log(`  Expected: ${visitor.name}`);
      console.log(`  Got: ${decrypted}`);
    }
  }
}

/**
 * Main migration function
 */
async function main() {
  console.log('🔐 Data Encryption Migration');
  console.log('============================');
  console.log(`Encryption Method: ${process.env.ENCRYPTION_METHOD || 'local'}`);
  console.log(`Batch Size: ${batchSize}`);
  console.log(`Target Table: ${targetTable}`);
  console.log(`Dry Run: ${isDryRun ? 'Yes' : 'No'}`);
  console.log(`Verify: ${shouldVerify ? 'Yes' : 'No'}`);
  
  // Validate encryption configuration
  const validation = encryptionService.validateEncryptionConfig();
  
  if (!validation.isValid) {
    console.error('\n❌ Encryption configuration is invalid:');
    validation.errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('\n⚠️  Encryption warnings:');
    validation.warnings.forEach(warn => console.warn(`  - ${warn}`));
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Encrypt tables based on target
    if (targetTable === 'all' || targetTable === 'users') {
      await encryptUsers(client);
    }
    
    if (targetTable === 'all' || targetTable === 'visitors') {
      await encryptVisitors(client);
    }
    
    if (isDryRun) {
      console.log('\n🔍 DRY RUN - Rolling back transaction');
      await client.query('ROLLBACK');
    } else {
      console.log('\n💾 Committing changes...');
      await client.query('COMMIT');
      console.log('✅ Changes committed successfully');
    }
    
    // Verify encryption if requested
    if (shouldVerify) {
      await verifyEncryption(client);
    }
    
    // Print final summary
    console.log('\n📊 Migration Summary');
    console.log('===================');
    console.log(`Users: ${stats.users.encrypted}/${stats.users.total} encrypted`);
    console.log(`Visitors: ${stats.visitors.encrypted}/${stats.visitors.total} encrypted`);
    
    if (stats.users.failed > 0 || stats.visitors.failed > 0) {
      console.log(`\n⚠️  Total failures: ${stats.users.failed + stats.visitors.failed}`);
      console.log('Check encryption_audit table for details');
    }
    
    if (!isDryRun) {
      console.log('\n✅ Migration completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Verify encrypted data with: node scripts/migrate-encrypt-data.js --verify');
      console.log('2. Update application code to read from encrypted fields');
      console.log('3. Test thoroughly before dropping plaintext columns');
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
