#!/usr/bin/env node
// Manual OTP resend persistence test script
// Run with: node manual-otp-test.js

import pool from './src/database/db.js';
import request from 'supertest';
import app from './src/app.js';

console.log('🧪 Testing OTP resend persistence limits...\n');

async function testOtpResendLimits() {
  try {
    // 1. Create a test visitor in OTP_SENT state
    console.log('1️⃣ Creating test visitor...');
    const visitor = await pool.query(`
      INSERT INTO visitors (name, phone, email, status, otp_hash, otp_expires_at)
      VALUES ('Test User', '0700000000', 'test@example.com', 'OTP_SENT', 'dummy_hash', NOW() + INTERVAL '15 minutes')
      RETURNING id, name, phone
    `);
    const visitorId = visitor.rows[0].id;
    console.log(`✅ Created visitor ID: ${visitorId}`);

    // 2. First resend - should succeed
    console.log('\n2️⃣ First resend (should succeed)...');
    const r1 = await request(app)
      .post(`/api/visitors/${visitorId}/resend-otp`)
      .send({});
    console.log(`Status: ${r1.statusCode}, Response: ${JSON.stringify(r1.body?.data || r1.body?.error)}`);

    // 3. Immediate second resend - should be rate limited (429)
    console.log('\n3️⃣ Immediate second resend (should be 429 - cooldown)...');
    const r2 = await request(app)
      .post(`/api/visitors/${visitorId}/resend-otp`)
      .send({});
    console.log(`Status: ${r2.statusCode}, Response: ${JSON.stringify(r2.body?.data || r2.body?.error)}`);

    // 4. Manually advance the cooldown timestamp
    console.log('\n4️⃣ Advancing cooldown timestamp by 2 minutes...');
    await pool.query(`
      UPDATE visitors 
      SET otp_last_resend = NOW() - INTERVAL '2 minutes', 
          otp_resend_count = 4 
      WHERE id = $1
    `, [visitorId]);

    // 5. Fifth resend (count becomes 5) - should succeed
    console.log('\n5️⃣ Fifth resend after cooldown (should succeed)...');
    const r5 = await request(app)
      .post(`/api/visitors/${visitorId}/resend-otp`)
      .send({});
    console.log(`Status: ${r5.statusCode}, Response: ${JSON.stringify(r5.body?.data || r5.body?.error)}`);

    // 6. Sixth resend - should hit daily limit (429)
    console.log('\n6️⃣ Sixth resend (should be 429 - daily limit)...');
    const r6 = await request(app)
      .post(`/api/visitors/${visitorId}/resend-otp`)
      .send({});
    console.log(`Status: ${r6.statusCode}, Response: ${JSON.stringify(r6.body?.data || r6.body?.error)}`);

    // 7. Check resend log entries
    console.log('\n7️⃣ Checking otp_resend_log entries...');
    const logs = await pool.query(`
      SELECT id, visitor_id, channel, success, sent_at
      FROM otp_resend_log 
      WHERE visitor_id = $1 
      ORDER BY sent_at DESC
    `, [visitorId]);
    console.log(`📝 Found ${logs.rowCount} resend log entries:`);
    logs.rows.forEach((log, i) => {
      console.log(`   ${i+1}. Channel: ${log.channel}, Success: ${log.success}, Time: ${log.sent_at}`);
    });

    // 8. Check visitor state
    console.log('\n8️⃣ Final visitor state...');
    const finalState = await pool.query(`
      SELECT otp_resend_count, otp_last_resend, status
      FROM visitors WHERE id = $1
    `, [visitorId]);
    const state = finalState.rows[0];
    console.log(`📊 Resend count: ${state.otp_resend_count}, Last resend: ${state.otp_last_resend}, Status: ${state.status}`);

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await pool.query('DELETE FROM visitors WHERE id = $1', [visitorId]);
    console.log('✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the test
testOtpResendLimits();
