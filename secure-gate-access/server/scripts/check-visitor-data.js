/**
 * Database verification script
 * Checks if visitor data exists and displays OTP information
 */

import { dbManager } from '../src/database/db.enhanced.js';

async function checkVisitorData() {
    await dbManager.initializeAsync();

    console.log('==========================================');
    console.log('🔍 VISITOR DATA VERIFICATION');
    console.log('==========================================\n');

    // Check for "Test Visitor (Active)"
    const testVisitor = await dbManager.query(`
    SELECT id, name, phone, email, status, date_of_visit, otp_hash, 
           otp_expires_at, host_id, estate_id, created_at
    FROM visitors 
    WHERE name = 'Test Visitor (Active)'
    ORDER BY created_at DESC
    LIMIT 1
  `);

    if (testVisitor.rows.length > 0) {
        console.log('✅ Test Visitor Found:');
        console.log(JSON.stringify(testVisitor.rows[0], null, 2));
    } else {
        console.log('❌ Test Visitor NOT found in database');
    }

    console.log('\n------------------------------------------\n');

    // Check total visitors
    const totalVisitors = await dbManager.query(`
    SELECT COUNT(*) as count FROM visitors
  `);
    console.log(`Total Visitors in Database: ${totalVisitors.rows[0].count}`);

    // Check visitors by status
    const byStatus = await dbManager.query(`
    SELECT status, COUNT(*) as count 
    FROM visitors 
    GROUP BY status
    ORDER BY count DESC
  `);
    console.log('\nVisitors by Status:');
    byStatus.rows.forEach(row => {
        console.log(`  ${row.status}: ${row.count}`);
    });

    // Check visitors with OTP
    const withOtp = await dbManager.query(`
    SELECT COUNT(*) as count 
    FROM visitors 
    WHERE otp_hash IS NOT NULL
  `);
    console.log(`\nVisitors with OTP hash: ${withOtp.rows[0].count}`);

    // Check estate linkage
    const estateCheck = await dbManager.query(`
    SELECT estate_id, COUNT(*) as count 
    FROM visitors 
    GROUP BY estate_id
  `);
    console.log('\nVisitors by Estate:');
    estateCheck.rows.forEach(row => {
        console.log(`  Estate ${row.estate_id}: ${row.count} visitors`);
    });

    console.log('\n==========================================\n');

    await dbManager.disconnect();
}

checkVisitorData().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
