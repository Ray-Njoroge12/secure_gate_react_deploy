/**
 * Manual Data Retention Service Test
 * Run this script to manually test the retention service
 */

import dotenv from 'dotenv';
import pool from '../src/database/db.enhanced.js';
import retentionService from '../src/services/retentionService.js';

dotenv.config();

async function testRetentionService() {
  console.log('=== Data Retention Service Manual Test ===\n');
  
  try {
    console.log('1. Initializing database connection...');
    // Initialize the database connection
    await pool.connect();
    console.log('✓ Database connection initialized');
    
    console.log('\n2. Checking database connection...');
    const dbCheck = await pool.query('SELECT NOW()');
    console.log('✓ Database connected:', dbCheck.rows[0].now);
    
    console.log('\n3. Checking archive tables exist...');
    const tables = await pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename LIKE 'archived_%'
      ORDER BY tablename
    `);
    console.log('✓ Archive tables found:', tables.rows.map(r => r.tablename));
    
    console.log('\n4. Creating test data...');
    
    // Create test unit
    const unitResult = await pool.query(
      `INSERT INTO units (unit_number, block) 
       VALUES ('TEST-RET-001', 'A') 
       ON CONFLICT DO NOTHING
       RETURNING unit_id`
    );
    
    let unitId;
    if (unitResult.rows.length > 0) {
      unitId = unitResult.rows[0].unit_id;
    } else {
      const existingUnit = await pool.query(
        `SELECT unit_id FROM units WHERE unit_number = 'TEST-RET-001'`
      );
      unitId = existingUnit.rows[0].unit_id;
    }
    console.log('✓ Test unit created/found:', unitId);
    
    // Create test resident
    const residentResult = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, unit_id) 
       VALUES ('resident_retention_test', 'resident_ret_test@test.com', '$2b$10$test', 'resident', $1)
       ON CONFLICT (email) DO NOTHING
       RETURNING user_id`,
      [unitId]
    );
    
    let residentId;
    if (residentResult.rows.length > 0) {
      residentId = residentResult.rows[0].user_id;
    } else {
      const existingResident = await pool.query(
        `SELECT user_id FROM users WHERE email = 'resident_ret_test@test.com'`
      );
      residentId = existingResident.rows[0].user_id;
    }
    console.log('✓ Test resident created/found:', residentId);
    
    // Create old visitor (2 years ago)
    const oldDate = new Date();
    oldDate.setFullYear(oldDate.getFullYear() - 2);
    
    const visitorResult = await pool.query(
      `INSERT INTO visitors (
        visitor_name, phone_number, id_number, vehicle_reg, 
        visit_date, visit_time, resident_id, unit_id, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING visitor_id`,
      [
        'Old Test Visitor',
        '+1234567890',
        'TEST123456',
        'TEST123',
        oldDate.toISOString().split('T')[0],
        '10:00',
        residentId,
        unitId,
        'expired',
        oldDate
      ]
    );
    const visitorId = visitorResult.rows[0].visitor_id;
    console.log('✓ Old visitor created:', visitorId);
    
    // Create old access log
    const logResult = await pool.query(
      `INSERT INTO access_logs (user_id, action, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING log_id`,
      [residentId, 'test_action', '127.0.0.1', 'test-agent', oldDate]
    );
    const logId = logResult.rows[0].log_id;
    console.log('✓ Old access log created:', logId);
    
    console.log('\n5. Checking retention service configuration...');
    console.log('✓ Service config:', retentionService.config);
    
    console.log('\n6. Running retention job (DRY RUN)...');
    process.env.DATA_RETENTION_DRY_RUN = 'true';
    const dryRunResult = await retentionService.runRetentionJob();
    console.log('✓ Dry run completed:', dryRunResult);
    
    console.log('\n7. Checking if data still exists...');
    const visitorCheck = await pool.query(
      `SELECT visitor_id FROM visitors WHERE visitor_id = $1`,
      [visitorId]
    );
    console.log('✓ Visitor still exists (dry run):', visitorCheck.rows.length > 0);
    
    console.log('\n8. Testing actual archival (disabled for safety)...');
    console.log('  To test actual archival, manually set DATA_RETENTION_DRY_RUN=false');
    console.log('  and call retentionService.runRetentionJob()');
    
    console.log('\n9. Cleaning up test data...');
    await pool.query('DELETE FROM visitors WHERE visitor_id = $1', [visitorId]);
    await pool.query('DELETE FROM access_logs WHERE log_id = $1', [logId]);
    await pool.query('DELETE FROM users WHERE user_id = $1', [residentId]);
    await pool.query('DELETE FROM units WHERE unit_id = $1', [unitId]);
    console.log('✓ Test data cleaned up');
    
    console.log('\n=== Test completed successfully! ===');
    
  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    console.log('\nClosing database connection...');
    await pool.close();
    console.log('✓ Database connection closed');
  }
}

// Run the test
testRetentionService();
