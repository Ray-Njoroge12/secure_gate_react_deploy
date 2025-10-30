#!/usr/bin/env node

/**
 * Run Encryption Migration
 * Applies the 008_add_encrypted_fields.sql migration
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import { readFileSync } from 'fs';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE
});

async function runMigration() {
  console.log('🔐 Running encryption fields migration...\n');
  
  const client = await pool.connect();
  
  try {
    // Read migration file
    const migrationPath = join(__dirname, '..', 'src', 'database', 'migrations', '008_add_encrypted_fields.sql');
    const sql = readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await client.query(sql);
    
    console.log('✅ Encryption fields migration completed successfully!\n');
    
    // Verify tables were created
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name LIKE '%encrypted%'
      ORDER BY column_name
    `);
    
    console.log('Added encrypted columns to users table:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
    const visitorsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'visitors' 
      AND column_name LIKE '%encrypted%'
      ORDER BY column_name
    `);
    
    console.log('\nAdded encrypted columns to visitors table:');
    visitorsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
    // Check encryption_audit table
    const auditCheck = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'encryption_audit'
    `);
    
    if (auditCheck.rows.length > 0) {
      console.log('\n✅ encryption_audit table created');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
