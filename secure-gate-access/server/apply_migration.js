/**
 * Apply resident_id migration to visitors table
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'secure_gate',
  user: process.env.PGUSER || 'secure_gate_user',
  password: process.env.PGPASSWORD || 'postgres'
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Applying migration: Add resident_id to visitors table...\n');
    
    // Check if column already exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'visitors' AND column_name = 'resident_id'
    `;
    
    const checkResult = await client.query(checkQuery);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Column resident_id already exists in visitors table');
      console.log('   Migration skipped (idempotent)\n');
    } else {
      console.log('📝 Adding resident_id column to visitors table...');
      
      await client.query(`
        ALTER TABLE visitors 
        ADD COLUMN resident_id INTEGER REFERENCES users(id) ON DELETE SET NULL
      `);
      
      console.log('✅ Column added successfully\n');
      
      console.log('📝 Creating index on resident_id...');
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_visitors_resident_id ON visitors(resident_id)
      `);
      
      console.log('✅ Index created successfully\n');
    }
    
    // Verify
    const verifyQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'visitors' AND column_name = 'resident_id'
    `;
    
    const verifyResult = await client.query(verifyQuery);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ MIGRATION SUCCESSFUL');
      console.log('   Column:', verifyResult.rows[0].column_name);
      console.log('   Type:', verifyResult.rows[0].data_type);
      console.log('   Nullable:', verifyResult.rows[0].is_nullable);
      console.log('\n🎉 Phase G2 walk-in feature schema is ready!\n');
    } else {
      console.error('❌ Verification failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
