#!/usr/bin/env node
/**
 * Test script to verify database schema alignment with controllers
 * Tests the critical-path database operations that controllers depend on
 */

import { dbManager } from '../secure-gate-access/server/src/database/db.enhanced.js';

async function testDatabaseSchemaAlignment() {
  console.log('🧪 Testing database schema alignment with controllers...\n');
  
  let allTestsPassed = true;
  
  try {
    // Test 1: Verify visitors table has OTP columns
    console.log('1. Testing visitors table OTP columns...');
    const visitorColumns = await dbManager.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'visitors' 
      AND column_name IN ('otp_hash', 'otp_expires_at', 'otp_attempts', 'otp_resend_count', 'otp_last_resend')
      ORDER BY column_name
    `);
    
    const expectedColumns = ['otp_hash', 'otp_expires_at', 'otp_attempts', 'otp_resend_count', 'otp_last_resend'];
    const foundColumns = visitorColumns.rows.map(row => row.column_name);
    
    for (const expectedCol of expectedColumns) {
      if (!foundColumns.includes(expectedCol)) {
        console.error(`❌ Missing column: visitors.${expectedCol}`);
        allTestsPassed = false;
      } else {
        console.log(`✅ Found column: visitors.${expectedCol}`);
      }
    }
    
    // Test 2: Verify access_logs table has additional columns
    console.log('\n2. Testing access_logs table additional columns...');
    const accessLogColumns = await dbManager.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'access_logs' 
      AND column_name IN ('request_id', 'entity_type', 'entity_id', 'outcome', 'message', 'metadata')
      ORDER BY column_name
    `);
    
    const expectedAccessLogColumns = ['request_id', 'entity_type', 'entity_id', 'outcome', 'message', 'metadata'];
    const foundAccessLogColumns = accessLogColumns.rows.map(row => row.column_name);
    
    for (const expectedCol of expectedAccessLogColumns) {
      if (!foundAccessLogColumns.includes(expectedCol)) {
        console.error(`❌ Missing column: access_logs.${expectedCol}`);
        allTestsPassed = false;
      } else {
        console.log(`✅ Found column: access_logs.${expectedCol}`);
      }
    }
    
    // Test 3: Verify otp_resend_log table exists
    console.log('\n3. Testing otp_resend_log table exists...');
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
      
      for (const expectedCol of expectedOtpResendColumns) {
        if (!foundOtpResendColumns.includes(expectedCol)) {
          console.error(`❌ Missing column: otp_resend_log.${expectedCol}`);
          allTestsPassed = false;
        } else {
          console.log(`✅ Found column: otp_resend_log.${expectedCol}`);
        }
      }
    } else {
      console.error('❌ otp_resend_log table does not exist');
      allTestsPassed = false;
    }
    
    // Test 4: Test critical controller operations
    console.log('\n4. Testing critical controller operations...');
    
    // Test visitor creation with OTP fields
    try {
      const testVisitor = await dbManager.query(`
        INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status, created_by, otp_hash, otp_expires_at, otp_attempts, otp_resend_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, name, otp_hash, otp_expires_at, otp_attempts, otp_resend_count
      `, [
        'Test Visitor',
        '0712345678',
        'test@example.com',
        'Testing OTP functionality',
        '2025-01-15',
        '14:00',
        'TEST-INVITE-001',
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
          'test-request-123',
          'visitor',
          testVisitor.rows[0].id.toString(),
          'success',
          'OTP issued for visitor',
          JSON.stringify({ test: true, otp_ttl_minutes: 15 })
        ]);
        
        if (testAccessLog.rows.length > 0) {
          console.log('✅ Access log insertion with new columns successful');
        } else {
          console.error('❌ Access log insertion failed');
          allTestsPassed = false;
        }
        
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
        } else {
          console.error('❌ OTP resend log insertion failed');
          allTestsPassed = false;
        }
        
        // Cleanup test data
        await dbManager.query('DELETE FROM otp_resend_log WHERE visitor_id = $1', [testVisitor.rows[0].id]);
        await dbManager.query('DELETE FROM access_logs WHERE request_id = $1', ['test-request-123']);
        await dbManager.query('DELETE FROM visitors WHERE id = $1', [testVisitor.rows[0].id]);
        console.log('✅ Test data cleaned up');
        
      } else {
        console.error('❌ Visitor creation failed');
        allTestsPassed = false;
      }
    } catch (error) {
      console.error('❌ Controller operation test failed:', error.message);
      allTestsPassed = false;
    }
    
  } catch (error) {
    console.error('❌ Database connection or query failed:', error.message);
    allTestsPassed = false;
  }
  
  console.log('\n' + '='.repeat(50));
  if (allTestsPassed) {
    console.log('🎉 All database schema alignment tests PASSED!');
    console.log('✅ Database is ready for controller operations');
  } else {
    console.log('❌ Some database schema alignment tests FAILED!');
    console.log('🔧 Please fix the issues before proceeding');
  }
  console.log('='.repeat(50));
  
  return allTestsPassed;
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDatabaseSchemaAlignment()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export default testDatabaseSchemaAlignment;
