#!/usr/bin/env node

/**
 * Database Index Migration Script
 * Applies performance optimization indexes to the database
 * Usage: node apply-performance-indexes.js
 */

import dotenv from 'dotenv';
dotenv.config();

import pool from './src/database/db.js';
import fs from 'fs';
import path from 'path';

const MIGRATION_FILE = 'migrations/20250915_performance_indexes.sql';

async function checkDatabaseConnection() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connection established');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function getExistingIndexes() {
  try {
    const result = await pool.query(`
      SELECT indexname, tablename, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `);
    
    console.log('\n📋 Existing Performance Indexes:');
    console.log('================================');
    
    if (result.rowCount === 0) {
      console.log('   No performance indexes found');
    } else {
      result.rows.forEach(row => {
        console.log(`   ${row.tablename}.${row.indexname}`);
      });
    }
    
    return result.rows;
  } catch (error) {
    console.error('❌ Failed to retrieve existing indexes:', error.message);
    return [];
  }
}

async function analyzeQueryPlans() {
  console.log('\n📊 Analyzing Query Execution Plans:');
  console.log('====================================');
  
  const testQueries = [
    {
      name: 'User Email Lookup',
      query: `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
              SELECT id, email, username, role, verified 
              FROM users 
              WHERE LOWER(email) = LOWER('test@example.com')`
    },
    {
      name: 'Visitor List Query',
      query: `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
              SELECT id, name, status, check_in_time
              FROM visitors 
              WHERE created_by = 'resident@example.com'
              ORDER BY check_in_time DESC NULLS LAST
              LIMIT 20`
    },
    {
      name: 'Active Visitors Query',
      query: `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
              SELECT id, name, status 
              FROM visitors 
              WHERE status IN ('ON_PREMISE', 'CONFIRMED')
              ORDER BY check_in_time DESC
              LIMIT 50`
    }
  ];
  
  for (const { name, query } of testQueries) {
    try {
      const result = await pool.query(query);
      const plan = result.rows[0]['QUERY PLAN'][0];
      
      console.log(`\n   ${name}:`);
      console.log(`   Execution Time: ${plan['Execution Time']}ms`);
      console.log(`   Planning Time: ${plan['Planning Time']}ms`);
      
      // Look for sequential scans (bad performance indicators)
      const planStr = JSON.stringify(plan);
      if (planStr.includes('Seq Scan')) {
        console.log(`   ⚠️  Sequential scan detected - needs optimization`);
      } else {
        console.log(`   ✅ Using indexes efficiently`);
      }
      
    } catch (error) {
      console.log(`   ❌ Failed to analyze ${name}: ${error.message}`);
    }
  }
}

async function applyMigration() {
  console.log('\n🔧 Applying Performance Index Migration:');
  console.log('=========================================');
  
  try {
    // Read migration file
    const migrationPath = path.join(process.cwd(), MIGRATION_FILE);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📖 Reading migration file...');
    
    // Split migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} migration statements`);
    
    let successCount = 0;
    let skipCount = 0;
    
    for (const [index, statement] of statements.entries()) {
      const stmtNum = index + 1;
      
      try {
        // Check if it's a CREATE INDEX statement
        if (statement.toUpperCase().includes('CREATE INDEX CONCURRENTLY')) {
          const indexMatch = statement.match(/idx_\w+/);
          const indexName = indexMatch ? indexMatch[0] : `statement-${stmtNum}`;
          
          console.log(`   [${stmtNum}/${statements.length}] Creating index: ${indexName}...`);
          
          const startTime = Date.now();
          await pool.query(statement + ';');
          const duration = Date.now() - startTime;
          
          console.log(`   ✅ ${indexName} created successfully (${duration}ms)`);
          successCount++;
          
        } else if (statement.toUpperCase().includes('ANALYZE')) {
          console.log(`   [${stmtNum}/${statements.length}] Analyzing table statistics...`);
          await pool.query(statement + ';');
          console.log(`   ✅ Table analysis completed`);
          successCount++;
          
        } else {
          console.log(`   [${stmtNum}/${statements.length}] Executing: ${statement.substring(0, 50)}...`);
          await pool.query(statement + ';');
          successCount++;
        }
        
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ⏭️  Index already exists, skipping...`);
          skipCount++;
        } else {
          console.error(`   ❌ Failed to execute statement ${stmtNum}:`, error.message);
          // Continue with other statements instead of failing completely
        }
      }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skipCount}`);
    console.log(`   🎯 Total: ${statements.length}`);
    
    return successCount > 0;
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    return false;
  }
}

async function validateIndexes() {
  console.log('\n🔍 Validating Index Creation:');
  console.log('=============================');
  
  const expectedIndexes = [
    'idx_users_email_lower',
    'idx_users_auth_composite', 
    'idx_visitors_created_by_checkin',
    'idx_visitors_status_checkin',
    'idx_visitors_date_status',
    'idx_visitors_invite_code_status',
    'idx_bulk_invites_code_expires',
    'idx_bulk_invites_creator_expires',
    'idx_access_logs_user_time',
    'idx_access_logs_action_entity',
    'idx_passes_status_expires',
    'idx_audit_logs_user_action_time'
  ];
  
  let validCount = 0;
  
  for (const indexName of expectedIndexes) {
    try {
      const result = await pool.query(`
        SELECT indexname, tablename, indexdef 
        FROM pg_indexes 
        WHERE indexname = $1 AND schemaname = 'public'
      `, [indexName]);
      
      if (result.rowCount > 0) {
        console.log(`   ✅ ${indexName} (${result.rows[0].tablename})`);
        validCount++;
      } else {
        console.log(`   ❌ ${indexName} - NOT FOUND`);
      }
    } catch (error) {
      console.log(`   ❌ ${indexName} - ERROR: ${error.message}`);
    }
  }
  
  console.log(`\n📈 Index Validation: ${validCount}/${expectedIndexes.length} indexes created`);
  return validCount === expectedIndexes.length;
}

async function main() {
  console.log('🚀 Database Performance Index Migration');
  console.log('=======================================');
  
  try {
    // Check database connection
    const connected = await checkDatabaseConnection();
    if (!connected) {
      process.exit(1);
    }
    
    // Show existing indexes
    await getExistingIndexes();
    
    // Analyze current query plans
    await analyzeQueryPlans();
    
    // Apply migration
    const migrationSuccess = await applyMigration();
    if (!migrationSuccess) {
      console.error('❌ Migration failed, exiting');
      process.exit(1);
    }
    
    // Validate indexes were created
    const validationSuccess = await validateIndexes();
    
    // Re-analyze query plans after indexes
    console.log('\n📊 Post-Migration Query Plan Analysis:');
    console.log('======================================');
    await analyzeQueryPlans();
    
    console.log('\n🎉 Performance Index Migration Complete!');
    console.log('========================================');
    
    if (validationSuccess) {
      console.log('✅ All expected indexes created successfully');
      console.log('📈 Database queries should now be significantly faster');
      console.log('💡 Run benchmark-db-performance.js --after to measure improvements');
    } else {
      console.log('⚠️  Some indexes may not have been created - check logs above');
    }
    
  } catch (error) {
    console.error('❌ Migration script failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error);
}

export { applyMigration, validateIndexes };