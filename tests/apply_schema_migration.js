#!/usr/bin/env node
/**
 * Migration script to apply schema changes to the database
 * This applies the DDL changes needed to align the database with controllers
 */

import { dbManager } from '../secure-gate-access/server/src/database/db.enhanced.js';

async function applySchemaMigration() {
  console.log('🔄 Applying database schema migration...\n');
  
  try {
    // Add OTP columns to visitors table
    console.log('1. Adding OTP columns to visitors table...');
    await dbManager.query(`
      ALTER TABLE visitors 
      ADD COLUMN IF NOT EXISTS otp_hash TEXT,
      ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS otp_attempts INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS otp_resend_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS otp_last_resend TIMESTAMP
    `);
    console.log('✅ OTP columns added to visitors table');
    
    // Add additional columns to access_logs table
    console.log('2. Adding additional columns to access_logs table...');
    await dbManager.query(`
      ALTER TABLE access_logs 
      ADD COLUMN IF NOT EXISTS request_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS outcome VARCHAR(20),
      ADD COLUMN IF NOT EXISTS message TEXT,
      ADD COLUMN IF NOT EXISTS metadata JSONB
    `);
    console.log('✅ Additional columns added to access_logs table');
    
    // Create otp_resend_log table
    console.log('3. Creating otp_resend_log table...');
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS otp_resend_log (
        id SERIAL PRIMARY KEY,
        visitor_id INT REFERENCES visitors(id) ON DELETE CASCADE,
        channel VARCHAR(20),
        success BOOLEAN,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ otp_resend_log table created');
    
    // Add indexes for performance
    console.log('4. Adding performance indexes...');
    await dbManager.query(`
      CREATE INDEX IF NOT EXISTS idx_visitors_otp_expires_at ON visitors(otp_expires_at)
    `);
    await dbManager.query(`
      CREATE INDEX IF NOT EXISTS idx_visitors_created_by ON visitors(created_by)
    `);
    await dbManager.query(`
      CREATE INDEX IF NOT EXISTS idx_access_logs_request_id ON access_logs(request_id)
    `);
    await dbManager.query(`
      CREATE INDEX IF NOT EXISTS idx_otp_resend_log_visitor_id ON otp_resend_log(visitor_id)
    `);
    await dbManager.query(`
      CREATE INDEX IF NOT EXISTS idx_otp_resend_log_created_at ON otp_resend_log(created_at)
    `);
    console.log('✅ Performance indexes added');
    
    console.log('\n🎉 Database schema migration completed successfully!');
    console.log('✅ Database is now aligned with controller expectations');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  applySchemaMigration()
    .then(() => {
      console.log('\n✅ Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

export default applySchemaMigration;
