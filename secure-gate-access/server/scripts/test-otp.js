/**
 * OTP Verification Test Script
 * Tests OTP verification for the test visitor
 */

import { dbManager } from '../src/database/db.enhanced.js';
import argon2 from 'argon2';

async function testOTPVerification() {
    await dbManager.initializeAsync();

    console.log('==========================================');
    console.log('🔍 OTP VERIFICATION TEST');
    console.log('==========================================\n');

    // Fetch the test visitor
    const visitor = await dbManager.query(`
    SELECT id, name, phone, status, otp_hash, otp_expires_at, otp_attempts,
           date_of_visit, created_at, estate_id
    FROM visitors 
    WHERE name = 'Test Visitor (Active)'
    ORDER BY created_at DESC
    LIMIT 1
  `);

    if (visitor.rows.length === 0) {
        console.log('❌ Test Visitor NOT found!');
        await dbManager.disconnect();
        return;
    }

    const testVisitor = visitor.rows[0];
    console.log('✅ Test Visitor Found:');
    console.log(JSON.stringify(testVisitor, null, 2));

    console.log('\n------------------------------------------');
    console.log('🔐 OTP Verification Analysis\n');

    // Check expiry
    const now = new Date();
    const expiryDate = new Date(testVisitor.otp_expires_at);
    const isExpired = now > expiryDate;

    console.log(`Current Time: ${now.toISOString()}`);
    console.log(`OTP Expires:  ${expiryDate.toISOString()}`);
    console.log(`Is Expired:   ${isExpired ? '❌ YES' : '✅ NO'}`);
    console.log(`Time Until Expiry: ${Math.floor((expiryDate - now) / 1000 / 60)} minutes`);

    // Test OTP comparison
    console.log('\n------------------------------------------');
    console.log('🧪 Testing OTP Hash Comparison\n');

    const testOTP = '238686'; // The OTP we generated

    if (!testVisitor.otp_hash) {
        console.log('❌ No OTP hash stored in database!');
    } else {
        try {
            const isValid = await argon2.verify(testVisitor.otp_hash, testOTP);
            console.log(`Testing OTP: ${testOTP}`);
            console.log(`Hash Match:  ${isValid ? '✅ VALID' : '❌ INVALID'}`);

            // Test wrong OTP
            const wrongOTP = '123456';
            const isWrongValid = await argon2.verify(testVisitor.otp_hash, wrongOTP);
            console.log(`\nTesting Wrong OTP: ${wrongOTP}`);
            console.log(`Hash Match:  ${isWrongValid ? '✅ VALID (unexpected!)' : '❌ INVALID (expected)'}`);
        } catch (error) {
            console.error('❌ Error comparing OTP:', error.message);
        }
    }

    console.log('\n==========================================\n');

    await dbManager.disconnect();
}

testOTPVerification().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
