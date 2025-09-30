import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

import pool from './src/database/db.js';

async function main() {
  try {
    console.log('🔧 Applying Fixed Database Performance Indexes');
    console.log('==============================================');
    
    const sql = fs.readFileSync('migrations/20250915_performance_indexes_fixed.sql', 'utf8');
    
    // Split by CREATE INDEX statements
    const indexStatements = sql.split(/CREATE INDEX/i).filter(s => s.trim());
    
    console.log(`📝 Found ${indexStatements.length - 1} additional index statements to apply`);
    
    let successCount = 0;
    
    for (let i = 1; i < indexStatements.length; i++) {
      const statement = 'CREATE INDEX' + indexStatements[i].split(';')[0] + ';';
      const indexMatch = statement.match(/idx_\w+/);
      const indexName = indexMatch ? indexMatch[0] : `index-${i}`;
      
      try {
        console.log(`   [${i}/${indexStatements.length - 1}] Creating ${indexName}...`);
        await pool.query(statement);
        console.log(`   ✅ ${indexName} created successfully`);
        successCount++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ⏭️  ${indexName} already exists, skipping`);
        } else {
          console.error(`   ❌ Failed to create ${indexName}: ${error.message}`);
        }
      }
    }
    
    // Apply ANALYZE statements
    console.log('\n📊 Updating table statistics...');
    try {
      await pool.query('ANALYZE users');
      await pool.query('ANALYZE visitors');
      await pool.query('ANALYZE bulk_invites');
      await pool.query('ANALYZE passes');
      await pool.query('ANALYZE access_logs');
      await pool.query('ANALYZE audit_logs');
      console.log('✅ Table statistics updated');
    } catch (error) {
      console.error('❌ Failed to update statistics:', error.message);
    }
    
    console.log('\n🎉 Fixed Database Index Migration Complete!');
    console.log(`✅ Successfully applied ${successCount} additional performance indexes`);
    
    // List all performance indexes
    console.log('\n📋 All Performance Indexes:');
    const result = await pool.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `);
    
    result.rows.forEach(row => {
      console.log(`   ✅ ${row.tablename}.${row.indexname}`);
    });
    
    console.log(`\n📈 Total Performance Indexes: ${result.rowCount}`);
    console.log('🚀 Database is now optimized for production workloads!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();