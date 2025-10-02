#!/usr/bin/env node
/**
 * Phase 2: Database Schema & Connectivity Test
 * Validates database schema alignment and performs safe round-trip operations
 */

import { dbManager } from '../secure-gate-access/server/src/database/db.enhanced.js';

async function testDatabaseSchemaConnectivity() {
  console.log('🧪 Phase 2: Database Schema & Connectivity Test\n');
  
  let allTestsPassed = true;
  const testResults = {
    phase: 'Database Schema & Connectivity',
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  try {
    // Test 1: Database Connection
    console.log('1. Testing database connection...');
    try {
      // Test connection by running a simple query
      const testQuery = await dbManager.query('SELECT 1 as test');
      if (testQuery.rows.length > 0 && testQuery.rows[0].test === 1) {
        console.log('✅ Database connection successful');
        testResults.tests.push({ name: 'Database Connection', status: 'PASS', details: 'Successfully connected to database' });
      } else {
        console.log('❌ Database connection failed');
        testResults.tests.push({ name: 'Database Connection', status: 'FAIL', details: 'Failed to connect to database' });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Database connection error:', error.message);
      testResults.tests.push({ name: 'Database Connection', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 2: Visitors Table OTP Columns
    console.log('\n2. Testing visitors table OTP columns...');
    try {
      const visitorColumns = await dbManager.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'visitors' 
        AND column_name IN ('otp_hash', 'otp_expires_at', 'otp_attempts', 'otp_resend_count', 'otp_last_resend')
        ORDER BY column_name
      `);
      
      const expectedColumns = ['otp_hash', 'otp_expires_at', 'otp_attempts', 'otp_resend_count', 'otp_last_resend'];
      const foundColumns = visitorColumns.rows.map(row => row.column_name);
      
      let missingColumns = [];
      for (const expectedCol of expectedColumns) {
        if (!foundColumns.includes(expectedCol)) {
          missingColumns.push(expectedCol);
        }
      }
      
      if (missingColumns.length === 0) {
        console.log('✅ All OTP columns present in visitors table');
        testResults.tests.push({ name: 'Visitors OTP Columns', status: 'PASS', details: 'All 5 OTP columns found' });
      } else {
        console.log('❌ Missing OTP columns:', missingColumns);
        testResults.tests.push({ name: 'Visitors OTP Columns', status: 'FAIL', details: `Missing: ${missingColumns.join(', ')}` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Visitors OTP columns test failed:', error.message);
      testResults.tests.push({ name: 'Visitors OTP Columns', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 3: Access Logs Additional Columns
    console.log('\n3. Testing access_logs additional columns...');
    try {
      const accessLogColumns = await dbManager.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'access_logs' 
        AND column_name IN ('request_id', 'entity_type', 'entity_id', 'outcome', 'message', 'metadata')
        ORDER BY column_name
      `);
      
      const expectedAccessLogColumns = ['request_id', 'entity_type', 'entity_id', 'outcome', 'message', 'metadata'];
      const foundAccessLogColumns = accessLogColumns.rows.map(row => row.column_name);
      
      let missingAccessLogColumns = [];
      for (const expectedCol of expectedAccessLogColumns) {
        if (!foundAccessLogColumns.includes(expectedCol)) {
          missingAccessLogColumns.push(expectedCol);
        }
      }
      
      if (missingAccessLogColumns.length === 0) {
        console.log('✅ All additional columns present in access_logs table');
        testResults.tests.push({ name: 'Access Logs Additional Columns', status: 'PASS', details: 'All 6 additional columns found' });
      } else {
        console.log('❌ Missing access_logs columns:', missingAccessLogColumns);
        testResults.tests.push({ name: 'Access Logs Additional Columns', status: 'FAIL', details: `Missing: ${missingAccessLogColumns.join(', ')}` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Access logs columns test failed:', error.message);
      testResults.tests.push({ name: 'Access Logs Additional Columns', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 4: OTP Resend Log Table
    console.log('\n4. Testing otp_resend_log table...');
    try {
      const otpResendLogExists = await dbManager.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'otp_resend_log'
        )
      `);
      
      if (otpResendLogExists.rows[0].exists) {
        console.log('✅ otp_resend_log table exists');
        
        // Verify table structure
        const otpResendLogColumns = await dbManager.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = 'otp_resend_log'
          ORDER BY column_name
        `);
        
        const expectedOtpResendColumns = ['id', 'visitor_id', 'channel', 'success', 'metadata', 'created_at'];
        const foundOtpResendColumns = otpResendLogColumns.rows.map(row => row.column_name);
        
        let missingOtpResendColumns = [];
        for (const expectedCol of expectedOtpResendColumns) {
          if (!foundOtpResendColumns.includes(expectedCol)) {
            missingOtpResendColumns.push(expectedCol);
          }
        }
        
        if (missingOtpResendColumns.length === 0) {
          console.log('✅ otp_resend_log table structure correct');
          testResults.tests.push({ name: 'OTP Resend Log Table', status: 'PASS', details: 'Table exists with correct structure' });
        } else {
          console.log('❌ Missing otp_resend_log columns:', missingOtpResendColumns);
          testResults.tests.push({ name: 'OTP Resend Log Table', status: 'FAIL', details: `Missing: ${missingOtpResendColumns.join(', ')}` });
          allTestsPassed = false;
        }
      } else {
        console.log('❌ otp_resend_log table does not exist');
        testResults.tests.push({ name: 'OTP Resend Log Table', status: 'FAIL', details: 'Table does not exist' });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ OTP resend log table test failed:', error.message);
      testResults.tests.push({ name: 'OTP Resend Log Table', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 5: Round-trip Operations
    console.log('\n5. Testing round-trip operations...');
    try {
      // Create test visitor with OTP fields
      const testVisitor = await dbManager.query(`
        INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status, created_by, otp_hash, otp_expires_at, otp_attempts, otp_resend_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, name, otp_hash, otp_expires_at, otp_attempts, otp_resend_count
      `, [
        'Test Visitor DB',
        '0712345678',
        'testdb@example.com',
        'Testing database operations',
        '2025-01-15',
        '14:00',
        'TEST-DB-001',
        'OTP_SENT',
        'test@resident.com',
        'hashed_otp_value',
        new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
        0,
        0
      ]);
      
      if (testVisitor.rows.length > 0) {
        console.log('✅ Visitor creation with OTP fields successful');
        
        // Test access_logs insertion with new columns
        const testAccessLog = await dbManager.query(`
          INSERT INTO access_logs (user_id, action, request_id, entity_type, entity_id, outcome, message, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id, request_id, entity_type, entity_id, outcome, message, metadata
        `, [
          1, // Assuming user_id 1 exists
          'visitor.otp.issue',
          'test-request-db-123',
          'visitor',
          testVisitor.rows[0].id.toString(),
          'success',
          'OTP issued for visitor',
          JSON.stringify({ test: true, otp_ttl_minutes: 15 })
        ]);
        
        if (testAccessLog.rows.length > 0) {
          console.log('✅ Access log insertion with new columns successful');
          
          // Test otp_resend_log insertion
          const testOtpResendLog = await dbManager.query(`
            INSERT INTO otp_resend_log (visitor_id, channel, success, metadata)
            VALUES ($1, $2, $3, $4)
            RETURNING id, visitor_id, channel, success, metadata
          `, [
            testVisitor.rows[0].id,
            'email',
            true,
            JSON.stringify({ reason: 'user_requested', ip: '127.0.0.1' })
          ]);
          
          if (testOtpResendLog.rows.length > 0) {
            console.log('✅ OTP resend log insertion successful');
            
            // Cleanup test data
            await dbManager.query('DELETE FROM otp_resend_log WHERE visitor_id = $1', [testVisitor.rows[0].id]);
            await dbManager.query('DELETE FROM access_logs WHERE request_id = $1', ['test-request-db-123']);
            await dbManager.query('DELETE FROM visitors WHERE id = $1', [testVisitor.rows[0].id]);
            console.log('✅ Test data cleaned up successfully');
            
            testResults.tests.push({ name: 'Round-trip Operations', status: 'PASS', details: 'All CRUD operations successful' });
          } else {
            console.log('❌ OTP resend log insertion failed');
            testResults.tests.push({ name: 'Round-trip Operations', status: 'FAIL', details: 'OTP resend log insertion failed' });
            allTestsPassed = false;
          }
        } else {
          console.log('❌ Access log insertion failed');
          testResults.tests.push({ name: 'Round-trip Operations', status: 'FAIL', details: 'Access log insertion failed' });
          allTestsPassed = false;
        }
      } else {
        console.log('❌ Visitor creation failed');
        testResults.tests.push({ name: 'Round-trip Operations', status: 'FAIL', details: 'Visitor creation failed' });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Round-trip operations test failed:', error.message);
      testResults.tests.push({ name: 'Round-trip Operations', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 6: Database Indexes
    console.log('\n6. Testing database indexes...');
    try {
      const indexes = await dbManager.query(`
        SELECT indexname, tablename, indexdef
        FROM pg_indexes 
        WHERE tablename IN ('visitors', 'access_logs', 'otp_resend_log')
        ORDER BY tablename, indexname
      `);
      
      const expectedIndexes = [
        'idx_visitors_invite_code',
        'idx_visitors_status',
        'idx_visitors_otp_expires_at',
        'idx_access_logs_user_id',
        'idx_access_logs_request_id',
        'idx_otp_resend_log_visitor_id'
      ];
      
      const foundIndexes = indexes.rows.map(row => row.indexname);
      let missingIndexes = [];
      
      for (const expectedIndex of expectedIndexes) {
        if (!foundIndexes.includes(expectedIndex)) {
          missingIndexes.push(expectedIndex);
        }
      }
      
      if (missingIndexes.length === 0) {
        console.log('✅ All expected indexes present');
        testResults.tests.push({ name: 'Database Indexes', status: 'PASS', details: 'All expected indexes found' });
      } else {
        console.log('⚠️ Some indexes missing:', missingIndexes);
        testResults.tests.push({ name: 'Database Indexes', status: 'WARN', details: `Missing: ${missingIndexes.join(', ')}` });
      }
    } catch (error) {
      console.log('❌ Database indexes test failed:', error.message);
      testResults.tests.push({ name: 'Database Indexes', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
  } catch (error) {
    console.error('❌ Database schema connectivity test failed:', error.message);
    testResults.tests.push({ name: 'Test Execution', status: 'FAIL', details: error.message });
    allTestsPassed = false;
  } finally {
    // Disconnect from database
    try {
      await dbManager.disconnect();
    } catch (error) {
      // Ignore disconnect errors
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  if (allTestsPassed) {
    console.log('🎉 Phase 2 PASSED: Database Schema & Connectivity');
    testResults.overall = 'PASS';
  } else {
    console.log('❌ Phase 2 FAILED: Database Schema & Connectivity');
    testResults.overall = 'FAIL';
  }
  console.log('='.repeat(50));
  
  return { success: allTestsPassed, results: testResults };
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDatabaseSchemaConnectivity()
    .then(({ success, results }) => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export default testDatabaseSchemaConnectivity;
