import dotenv from 'dotenv';
dotenv.config();
import pool from './src/database/db.js';

async function main() {
  try {
    console.log('📋 Checking Visitors Table Structure');
    console.log('====================================');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'visitors' 
      ORDER BY ordinal_position
    `);
    
    console.log('Visitors table columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
    // Check if created_by exists
    const hasCreatedBy = result.rows.some(row => row.column_name === 'created_by');
    console.log(`\n🔍 created_by column exists: ${hasCreatedBy}`);
    
    if (!hasCreatedBy) {
      console.log('⚠️  Need to use a different column for visitor creator tracking');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();