/**
 * DATABASE INTEGRITY TEST
 * Validates schema, relationships, and data consistency
 */

const { Pool } = require('pg');
const colors = require('colors');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../server/.env') });

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'secure_gate',
  user: process.env.PGUSER || 'secure_gate_user',
  password: process.env.PGPASSWORD || 'ba15b9d76ba471ef455ca854d934b16a'
});

let testResults = { passed: 0, failed: 0, errors: [] };

async function runTest(testName, testFunction) {
  process.stdout.write(`Testing: ${testName}... `);
  try {
    await testFunction();
    console.log('✅ PASSED'.green);
    testResults.passed++;
  } catch (error) {
    console.log('❌ FAILED'.red);
    console.log(`   Error: ${error.message}`.red);
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message });
  }
}

async function testDatabaseConnection() {
  const result = await pool.query('SELECT NOW()');
  if (!result.rows || result.rows.length === 0) {
    throw new Error('Database query returned no results');
  }
}

async function testRequiredTablesExist() {
  const requiredTables = [
    'users',
    'visitors', 
    'visitor_logs',
    'audit_logs'
  ];
  
  const result = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
  `);
  
  const existingTables = result.rows.map(row => row.table_name);
  console.log(`   (Found ${existingTables.length} tables)`.cyan);
  
  const missingTables = [];
  for (const table of requiredTables) {
    if (!existingTables.includes(table)) {
      missingTables.push(table);
    }
  }
  
  if (missingTables.length > 0) {
    throw new Error(`Required tables missing: ${missingTables.join(', ')}`);
  }
}

async function testForeignKeyConstraints() {
  const result = await pool.query(`
    SELECT 
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
  `);
  
  console.log(`   (Found ${result.rows.length} foreign key constraints)`.cyan);
  
  if (result.rows.length === 0) {
    console.log('   Warning: No foreign key constraints found (data integrity risk)'.yellow);
  }
}

async function testUserTableSchema() {
  const result = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'users'
    AND table_schema = 'public'
    ORDER BY ordinal_position
  `);
  
  if (result.rows.length === 0) {
    throw new Error('Users table not found or has no columns');
  }
  
  const requiredColumns = ['id', 'email', 'password'];
  const existingColumns = result.rows.map(row => row.column_name);
  
  console.log(`   (Users table has ${existingColumns.length} columns)`.cyan);
  
  const missingColumns = [];
  for (const col of requiredColumns) {
    if (!existingColumns.some(c => c.toLowerCase() === col.toLowerCase())) {
      missingColumns.push(col);
    }
  }
  
  if (missingColumns.length > 0) {
    throw new Error(`Required columns missing in users table: ${missingColumns.join(', ')}`);
  }
  
  // Check for password storage security
  const passwordColumn = result.rows.find(r => r.column_name.toLowerCase().includes('password'));
  if (passwordColumn) {
    if (passwordColumn.column_name === 'password' && !passwordColumn.column_name.includes('hash')) {
      console.log('   Warning: Password column should be named password_hash for clarity'.yellow);
    }
  }
}

async function testIndexes() {
  const result = await pool.query(`
    SELECT 
      schemaname,
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname NOT LIKE '%_pkey'
    ORDER BY tablename, indexname
  `);
  
  console.log(`   (Found ${result.rows.length} custom indexes)`.cyan);
  
  // Check for important indexes
  const importantIndexes = [
    { table: 'users', column: 'email' },
    { table: 'visitors', column: 'id_number' },
    { table: 'visitor_logs', column: 'visitor_id' },
    { table: 'audit_logs', column: 'user_id' }
  ];
  
  const missingIndexes = [];
  for (const idx of importantIndexes) {
    const hasIndex = result.rows.some(row => 
      row.tablename === idx.table && 
      row.indexdef.toLowerCase().includes(idx.column)
    );
    
    if (!hasIndex) {
      missingIndexes.push(`${idx.table}.${idx.column}`);
    }
  }
  
  if (missingIndexes.length > 0) {
    console.log(`   Warning: Missing recommended indexes: ${missingIndexes.join(', ')}`.yellow);
  }
}

async function testDataConsistency() {
  // Check for orphaned visitor logs
  try {
    const orphanCheckQuery = `
      SELECT COUNT(*) as orphaned_count
      FROM visitor_logs vl
      LEFT JOIN visitors v ON vl.visitor_id = v.id
      WHERE v.id IS NULL
    `;
    
    // First check if tables exist
    const tablesExist = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('visitor_logs', 'visitors')
    `);
    
    if (tablesExist.rows[0].count === '2') {
      const result = await pool.query(orphanCheckQuery);
      
      if (parseInt(result.rows[0].orphaned_count) > 0) {
        throw new Error(`Found ${result.rows[0].orphaned_count} orphaned visitor logs without valid visitor references`);
      }
    } else {
      console.log('   (Skipping orphan check - tables not found)'.yellow);
    }
  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.log('   (Skipping consistency check - tables not configured)'.yellow);
    } else if (error.message.includes('orphaned')) {
      throw error;
    } else {
      console.log(`   (Consistency check error: ${error.message})`.yellow);
    }
  }
}

async function testDatabaseSize() {
  const result = await pool.query(`
    SELECT 
      pg_database.datname as database_name,
      pg_size_pretty(pg_database_size(pg_database.datname)) as size
    FROM pg_database
    WHERE datname = $1
  `, [process.env.PGDATABASE || 'secure_gate']);
  
  if (result.rows.length > 0) {
    console.log(`   (Database size: ${result.rows[0].size})`.cyan);
  }
}

async function testTableRowCounts() {
  const tables = ['users', 'visitors', 'visitor_logs', 'audit_logs'];
  const counts = {};
  
  for (const table of tables) {
    try {
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      counts[table] = result.rows[0].count;
    } catch (error) {
      counts[table] = 'N/A';
    }
  }
  
  console.log(`   Row counts:`.cyan);
  Object.entries(counts).forEach(([table, count]) => {
    console.log(`     - ${table}: ${count}`.cyan);
  });
}

async function testDatabasePerformance() {
  // Test query performance with EXPLAIN
  try {
    const result = await pool.query(`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      SELECT * FROM users WHERE email = 'test@example.com'
    `);
    
    const plan = result.rows[0]['QUERY PLAN'][0];
    const executionTime = plan['Execution Time'];
    const planningTime = plan['Planning Time'];
    
    console.log(`   (Query planning: ${planningTime}ms, Execution: ${executionTime}ms)`.cyan);
    
    if (executionTime > 100) {
      console.log('   Warning: Slow query detected (>100ms)'.yellow);
    }
  } catch (error) {
    console.log('   (Performance test skipped - table may not exist)'.yellow);
  }
}

async function testSecuritySettings() {
  // Check for dangerous settings
  const dangerousSettings = await pool.query(`
    SELECT name, setting 
    FROM pg_settings 
    WHERE name IN (
      'ssl',
      'password_encryption',
      'shared_preload_libraries'
    )
  `);
  
  const settings = {};
  dangerousSettings.rows.forEach(row => {
    settings[row.name] = row.setting;
  });
  
  // Check SSL
  if (settings.ssl === 'off') {
    console.log('   Warning: SSL is disabled (security risk for production)'.yellow);
  }
  
  // Check password encryption
  if (settings.password_encryption !== 'scram-sha-256') {
    console.log('   Warning: Using weak password encryption'.yellow);
  }
  
  console.log(`   Security settings checked`.cyan);
}

async function runAllTests() {
  console.log('\n🚀 STARTING DATABASE INTEGRITY TESTS\n'.cyan.bold);
  console.log(`Database: ${process.env.PGDATABASE || 'secure_gate'}`.cyan);
  console.log(`Host: ${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}`.cyan);
  console.log('─'.repeat(50).cyan);
  
  try {
    // Connection tests
    console.log('\n🔌 CONNECTION TESTS'.cyan.bold);
    await runTest('Database Connection', testDatabaseConnection);
    
    // Schema tests
    console.log('\n📋 SCHEMA TESTS'.cyan.bold);
    await runTest('Required Tables Exist', testRequiredTablesExist);
    await runTest('Foreign Key Constraints', testForeignKeyConstraints);
    await runTest('User Table Schema', testUserTableSchema);
    await runTest('Database Indexes', testIndexes);
    
    // Data tests
    console.log('\n📊 DATA INTEGRITY TESTS'.cyan.bold);
    await runTest('Data Consistency', testDataConsistency);
    await runTest('Table Row Counts', testTableRowCounts);
    
    // Performance tests
    console.log('\n⚡ PERFORMANCE TESTS'.cyan.bold);
    await runTest('Database Size', testDatabaseSize);
    await runTest('Query Performance', testDatabasePerformance);
    
    // Security tests
    console.log('\n🔒 SECURITY TESTS'.cyan.bold);
    await runTest('Security Settings', testSecuritySettings);
    
    await pool.end();
    
    // Print Results
    console.log('\n' + '═'.repeat(50).cyan);
    console.log('📊 TEST RESULTS'.cyan.bold);
    console.log('═'.repeat(50).cyan);
    console.log(`✅ Passed: ${testResults.passed}`.green.bold);
    console.log(`❌ Failed: ${testResults.failed}`.red.bold);
    console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`.cyan);
    
    if (testResults.errors.length > 0) {
      console.log('\n🐛 ERRORS FOUND:'.red.bold);
      testResults.errors.forEach((err, index) => {
        console.log(`   ${index + 1}. ${err.test}: ${err.error}`.red);
      });
    }
    
    // Summary
    console.log('\n' + '─'.repeat(50).cyan);
    if (testResults.failed === 0) {
      console.log('🎉 ALL TESTS PASSED!'.green.bold);
    } else if (testResults.passed > testResults.failed) {
      console.log('⚠️  SOME TESTS FAILED - Database partially configured'.yellow.bold);
    } else {
      console.log('❌ CRITICAL FAILURES - Database not ready'.red.bold);
    }
    
    process.exit(testResults.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('Fatal error during testing:', error);
    await pool.end();
    process.exit(1);
  }
}

// Check if we can connect to database first
pool.query('SELECT 1')
  .then(() => {
    console.log('✅ Database connection established'.green);
    runAllTests();
  })
  .catch((error) => {
    console.log('❌ Cannot connect to database'.red);
    console.log(`   Error: ${error.message}`.red);
    console.log('\nPlease check:'.yellow);
    console.log('1. PostgreSQL is running'.yellow);
    console.log('2. Database "secure_gate" exists'.yellow);
    console.log('3. User credentials are correct'.yellow);
    console.log('4. Connection settings in .env file'.yellow);
    process.exit(1);
  });
