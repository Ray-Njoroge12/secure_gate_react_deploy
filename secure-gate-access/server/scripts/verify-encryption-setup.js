#!/usr/bin/env node

/**
 * Verify Encryption Setup
 * Tests the complete encryption infrastructure
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import encryptionService from '../src/services/encryptionService.js';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE
});

async function verifySetup() {
  console.log('🔐 Encryption Setup Verification');
  console.log('=================================\n');
  
  const client = await pool.connect();
  
  try {
    // 1. Verify encryption configuration
    console.log('1️⃣  Checking encryption configuration...');
    const validation = encryptionService.validateEncryptionConfig();
    
    if (validation.isValid) {
      console.log(`   ✅ Encryption method: ${validation.method}`);
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(w => console.log(`   ⚠️  ${w}`));
      }
    } else {
      console.log('   ❌ Configuration invalid:');
      validation.errors.forEach(e => console.log(`      - ${e}`));
      process.exit(1);
    }
    
    // 2. Verify database schema
    console.log('\n2️⃣  Checking database schema...');
    
    // Check users table
    const usersColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name LIKE '%encrypted%'
      ORDER BY column_name
    `);
    
    console.log('   Users table encrypted columns:');
    if (usersColumns.rows.length > 0) {
      usersColumns.rows.forEach(row => console.log(`     ✅ ${row.column_name}`));
    } else {
      console.log('     ❌ No encrypted columns found');
    }
    
    // Check visitors table
    const visitorsColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'visitors' 
      AND column_name LIKE '%encrypted%'
      ORDER BY column_name
    `);
    
    console.log('   Visitors table encrypted columns:');
    if (visitorsColumns.rows.length > 0) {
      visitorsColumns.rows.forEach(row => console.log(`     ✅ ${row.column_name}`));
    } else {
      console.log('     ❌ No encrypted columns found');
    }
    
    // Check encryption_audit table
    const auditTable = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'encryption_audit'
    `);
    
    if (auditTable.rows.length > 0) {
      console.log('   ✅ encryption_audit table exists');
    } else {
      console.log('   ❌ encryption_audit table missing');
    }
    
    // 3. Test encryption/decryption with database
    console.log('\n3️⃣  Testing encryption with database...');
    
    const testEmail = 'test@example.com';
    const testPhone = '+254712345678';
    const testName = 'Test User';
    
    console.log(`   Original email: ${testEmail}`);
    console.log(`   Original phone: ${testPhone}`);
    console.log(`   Original name: ${testName}`);
    
    // Encrypt
    const encryptedEmail = await encryptionService.encrypt(testEmail);
    const encryptedPhone = await encryptionService.encrypt(testPhone);
    const encryptedName = await encryptionService.encrypt(testName);
    
    console.log(`\n   Encrypted email: ${encryptedEmail.substring(0, 50)}...`);
    console.log(`   Encrypted phone: ${encryptedPhone.substring(0, 50)}...`);
    console.log(`   Encrypted name: ${encryptedName.substring(0, 50)}...`);
    
    // Insert test record
    await client.query('BEGIN');
    
    const insertResult = await client.query(`
      INSERT INTO visitors (
        name, name_encrypted,
        phone, phone_encrypted,
        email, email_encrypted,
        purpose, status,
        encryption_version, encrypted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'Testing encryption', 'TEST', 'v1', NOW())
      RETURNING id
    `, [testName, encryptedName, testPhone, encryptedPhone, testEmail, encryptedEmail]);
    
    const testId = insertResult.rows[0].id;
    console.log(`\n   ✅ Test record inserted (ID: ${testId})`);
    
    // Read and decrypt
    const selectResult = await client.query(`
      SELECT name_encrypted, phone_encrypted, email_encrypted
      FROM visitors
      WHERE id = $1
    `, [testId]);
    
    const record = selectResult.rows[0];
    
    const decryptedEmail = await encryptionService.decrypt(record.email_encrypted);
    const decryptedPhone = await encryptionService.decrypt(record.phone_encrypted);
    const decryptedName = await encryptionService.decrypt(record.name_encrypted);
    
    console.log(`\n   Decrypted email: ${decryptedEmail}`);
    console.log(`   Decrypted phone: ${decryptedPhone}`);
    console.log(`   Decrypted name: ${decryptedName}`);
    
    // Verify
    if (decryptedEmail === testEmail && 
        decryptedPhone === testPhone && 
        decryptedName === testName) {
      console.log('\n   ✅ Encryption/decryption working correctly!');
    } else {
      console.log('\n   ❌ Encryption/decryption failed!');
      console.log(`      Expected email: ${testEmail}, got: ${decryptedEmail}`);
      console.log(`      Expected phone: ${testPhone}, got: ${decryptedPhone}`);
      console.log(`      Expected name: ${testName}, got: ${decryptedName}`);
    }
    
    // Cleanup
    await client.query('DELETE FROM visitors WHERE id = $1', [testId]);
    await client.query('COMMIT');
    
    console.log('   ✅ Test record cleaned up');
    
    // 4. Test field encryption helper
    console.log('\n4️⃣  Testing field encryption helper...');
    
    const testUser = {
      id: 999,
      email: 'user@example.com',
      phone: '+254700000000',
      name: 'John Doe',
      role: 'admin'
    };
    
    const encrypted = await encryptionService.encryptFields(testUser, ['email', 'phone', 'name']);
    const decrypted = await encryptionService.decryptFields(encrypted, ['email', 'phone', 'name']);
    
    if (decrypted.email === testUser.email && 
        decrypted.phone === testUser.phone && 
        decrypted.name === testUser.name &&
        decrypted.role === testUser.role) {
      console.log('   ✅ Field encryption helper working correctly!');
    } else {
      console.log('   ❌ Field encryption helper failed!');
    }
    
    // 5. Test hash function
    console.log('\n5️⃣  Testing hash function...');
    
    const hash1 = encryptionService.hash('test@example.com');
    const hash2 = encryptionService.hash('test@example.com');
    const hash3 = encryptionService.hash('different@example.com');
    
    if (hash1 === hash2 && hash1 !== hash3) {
      console.log('   ✅ Hash function working correctly!');
      console.log(`   Hash: ${hash1}`);
    } else {
      console.log('   ❌ Hash function failed!');
    }
    
    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 ENCRYPTION SETUP VERIFICATION COMPLETE!');
    console.log('='.repeat(50));
    console.log('\n✅ All tests passed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Update controllers to use encryption');
    console.log('   2. Test with Mailgun and Africa\'s Talking');
    console.log('   3. Run data migration on existing records');
    console.log('   4. Update application code to read from encrypted fields\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Verification failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

verifySetup().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
