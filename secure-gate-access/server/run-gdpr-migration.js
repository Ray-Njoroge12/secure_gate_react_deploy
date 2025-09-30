import fs from 'fs';
import pool from './src/database/db.js';

async function runMigration() {
  try {
    console.log('Running GDPR compliance migration...');
    
    // Read the migration file
    const migrationSQL = fs.readFileSync('migrations/20250915_gdpr_compliance_fixed.sql', 'utf8');
    
    // Execute the migration
    const result = await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully');
    
    // The migration includes a check at the end, so let's show the result
    if (result.rows && result.rows.length > 0) {
      console.log('\nGDPR Compliance Status:');
      console.log(JSON.stringify(result.rows[0].compliance_status, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Details:', error.stack);
  } finally {
    await pool.end();
  }
}

runMigration();