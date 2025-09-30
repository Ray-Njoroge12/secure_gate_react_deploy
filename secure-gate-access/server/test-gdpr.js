import pool from './src/database/db.js';

async function testGdprFunctions() {
  try {
    console.log('Testing GDPR compliance functions...\n');
    
    // 0. Clean up any existing test user
    console.log('0. Cleaning up existing test data...');
    await pool.query("DELETE FROM users WHERE email LIKE 'gdpr.test%@example.com';");
    console.log('Cleaned up existing test users');
    
    // 1. Check overall compliance status
    console.log('\n1. Checking GDPR compliance status:');
    const complianceCheck = await pool.query('SELECT check_gdpr_compliance() as status;');
    console.log(JSON.stringify(complianceCheck.rows[0].status, null, 2));
    
    // 2. Create a test user for demonstration
    console.log('\n2. Creating test user for GDPR demo...');
    const testEmail = `gdpr.test.${Date.now()}@example.com`;
    const testUser = await pool.query(`
      INSERT INTO users (id, email, username, password_hash, phone, role, area, house, verified)
      VALUES (
        gen_random_uuid(),
        $1,
        'gdpr_testuser',
        '$2b$10$test.hash.for.demo',
        '+1234567890',
        'resident',
        'Test Area',
        'Test House',
        true
      )
      RETURNING id, email, username;
    `, [testEmail]);
    
    const testUserId = testUser.rows[0].id;
    console.log(`Created test user: ${testUser.rows[0].username} (${testUser.rows[0].email})`);
    console.log(`User ID: ${testUserId}`);
    
    // 3. Create some test audit and access logs
    console.log('\n3. Creating test audit and access logs...');
    
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, created_at)
      VALUES 
        ($1, 'user_login', 'authentication', $2, '{"method": "password", "success": true}', '192.168.1.100', NOW()),
        ($1, 'profile_update', 'user', $2, '{"fields_changed": ["phone"]}', '192.168.1.100', NOW() - INTERVAL '1 hour');
    `, [testUserId, testUserId]);
    
    await pool.query(`
      INSERT INTO access_logs (user_id, action, log_time, entity_type, entity_id, outcome, message, metadata)
      VALUES 
        ($1, 'ACCESS_GRANTED', NOW(), 'gate', 'main_entrance', 'success', 'Access granted to main entrance', '{"method": "qr_code"}'),
        ($1, 'ACCESS_DENIED', NOW() - INTERVAL '2 hours', 'gate', 'main_entrance', 'failure', 'Invalid QR code', '{"reason": "expired"}');
    `, [testUserId]);
    
    console.log('Created test logs for the user');
    
    // 4. Test anonymization function
    console.log('\n4. Testing data anonymization...');
    const anonymizeResult = await pool.query('SELECT anonymize_user_data($1) as result;', [testUserId]);
    console.log('Anonymization result:');
    console.log(JSON.stringify(anonymizeResult.rows[0].result, null, 2));
    
    // 5. Check what the logs look like after anonymization
    console.log('\n5. Checking anonymized logs...');
    
    const anonymizedAudit = await pool.query(`
      SELECT user_id, action, ip_address, details 
      FROM audit_logs 
      WHERE details->>'anonymized' = 'true'
      ORDER BY created_at DESC;
    `);
    
    console.log('Anonymized audit logs:');
    anonymizedAudit.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. Action: ${row.action}, User ID: ${row.user_id}, IP: ${row.ip_address}`);
      console.log(`     Details: ${JSON.stringify(row.details)}`);
    });
    
    const anonymizedAccess = await pool.query(`
      SELECT user_id, action, outcome, metadata 
      FROM access_logs 
      WHERE metadata->>'anonymized' = 'true'
      ORDER BY log_time DESC;
    `);
    
    console.log('\nAnonymized access logs:');
    anonymizedAccess.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. Action: ${row.action}, User ID: ${row.user_id}, Outcome: ${row.outcome}`);
      console.log(`     Metadata: ${JSON.stringify(row.metadata)}`);
    });
    
    // 6. Clean up - delete the test user using GDPR function
    console.log('\n6. Testing GDPR user deletion...');
    const deleteResult = await pool.query('SELECT gdpr_delete_user($1, false) as result;', [testUserId]);
    console.log('GDPR deletion result:');
    console.log(JSON.stringify(deleteResult.rows[0].result, null, 2));
    
    // 7. Verify user is deleted and logs are properly handled
    console.log('\n7. Verifying deletion...');
    
    const userCheck = await pool.query('SELECT COUNT(*) as count FROM users WHERE id = $1;', [testUserId]);
    console.log(`User exists: ${userCheck.rows[0].count === '0' ? 'No (deleted)' : 'Yes'}`);
    
    const orphanedLogs = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM audit_logs WHERE user_id = $1) as audit_orphans,
        (SELECT COUNT(*) FROM access_logs WHERE user_id = $1) as access_orphans;
    `, [testUserId]);
    
    console.log(`Orphaned audit logs: ${orphanedLogs.rows[0].audit_orphans}`);
    console.log(`Orphaned access logs: ${orphanedLogs.rows[0].access_orphans}`);
    
    // 8. Final compliance check
    console.log('\n8. Final compliance status:');
    const finalCheck = await pool.query('SELECT check_gdpr_compliance() as status;');
    console.log(JSON.stringify(finalCheck.rows[0].status, null, 2));
    
    console.log('\n✅ GDPR compliance testing completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Details:', error.stack);
  } finally {
    await pool.end();
  }
}

testGdprFunctions();