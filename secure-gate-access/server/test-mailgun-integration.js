#!/usr/bin/env node

/**
 * Mailgun Integration Test Script
 * 
 * This script tests the Mailgun API integration with the notification service
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('📧 Mailgun Integration Test\n');

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

console.log('📋 Mailgun Configuration:');
console.log(`   Email Provider: ${process.env.EMAIL_PROVIDER || 'smtp'}`);
console.log(`   Mailgun API Key: ${process.env.MAILGUN_API_KEY ? 'Set ✅' : 'Not set ❌'}`);
console.log(`   Mailgun Domain: ${process.env.MAILGUN_DOMAIN || 'Not set ❌'}`);
console.log(`   Mailgun Base URL: ${process.env.MAILGUN_BASE_URL || 'Not set ❌'}`);
console.log(`   Email From: ${process.env.EMAIL_FROM || 'Not set ❌'}`);
console.log('');

// Test email address (you can change this to your email)
const TEST_EMAIL = 'nn0200774@gmail.com'; // Using the email from your example

console.log('🧪 Testing Mailgun Integration...');

try {
  // Import the notification service
  const notificationService = await import('./src/services/notificationService.js');
  
  console.log('✅ Notification service imported successfully');
  
  // Test 1: Visitor Invitation Email
  console.log('\n📧 Test 1: Visitor Invitation Email');
  
  const testVisitorData = {
    name: 'John Test Visitor',
    email: TEST_EMAIL,
    dateOfVisit: '2025-01-15',
    time: '10:00 AM',
    purpose: 'Testing Mailgun integration',
    inviteCode: 'MAILGUN123'
  };

  const testResidentData = {
    name: 'Jane Resident',
    email: 'resident@example.com'
  };

  const testInviteLink = 'https://securegate.test.com/invite/MAILGUN123';

  const emailResult1 = await notificationService.sendVisitorInviteEmail(
    testVisitorData,
    testResidentData,
    testInviteLink
  );

  if (emailResult1) {
    console.log('✅ Visitor invitation email sent successfully via Mailgun!');
  } else {
    console.log('❌ Visitor invitation email failed');
  }

  // Test 2: OTP Verification Email
  console.log('\n🔐 Test 2: OTP Verification Email');
  
  const otpResult = await notificationService.sendOtpVerificationEmail(
    testVisitorData,
    '123456',
    15
  );

  if (otpResult) {
    console.log('✅ OTP verification email sent successfully via Mailgun!');
  } else {
    console.log('❌ OTP verification email failed');
  }

  // Test 3: Legacy Email Function
  console.log('\n📨 Test 3: Legacy Email Function');
  
  const legacyResult = await notificationService.sendInviteEmail(
    TEST_EMAIL,
    'Test Email - Mailgun Integration',
    `
      <h2>Mailgun Integration Test</h2>
      <p>This is a test email to verify Mailgun API integration is working correctly.</p>
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      <p><strong>System:</strong> Secure Gate Access Control</p>
      <p><strong>Provider:</strong> Mailgun API</p>
      <hr>
      <p><em>This is an automated test email.</em></p>
    `
  );

  if (legacyResult) {
    console.log('✅ Legacy email function sent successfully via Mailgun!');
  } else {
    console.log('❌ Legacy email function failed');
  }

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  const results = [emailResult1, otpResult, legacyResult];
  const successCount = results.filter(r => r).length;
  const totalTests = results.length;
  
  console.log(`✅ Successful: ${successCount}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - successCount}/${totalTests}`);
  
  if (successCount === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('   Mailgun integration is working perfectly!');
    console.log('   All email functions are operational.');
  } else if (successCount > 0) {
    console.log('\n🟡 PARTIAL SUCCESS');
    console.log('   Some email functions are working.');
    console.log('   Check the failed tests above.');
  } else {
    console.log('\n🔴 ALL TESTS FAILED');
    console.log('   Mailgun integration is not working.');
    console.log('   Check configuration and credentials.');
  }

} catch (error) {
  console.log('❌ Integration test failed');
  console.log(`   Error: ${error.message}`);
  console.log('');
  console.log('🔍 Troubleshooting:');
  console.log('   1. Check if Mailgun credentials are correct');
  console.log('   2. Verify EMAIL_PROVIDER is set to "mailgun"');
  console.log('   3. Ensure Mailgun domain is properly configured');
  console.log('   4. Check if test email address is authorized in sandbox');
}

console.log('');
console.log('📝 Next Steps:');
console.log('');
console.log('1. Check your email inbox for test messages');
console.log('2. Verify emails are being delivered');
console.log('3. Check Mailgun dashboard for delivery logs');
console.log('4. Add more authorized recipients if needed');
console.log('5. Test with production domain when ready');
console.log('');
console.log('💡 Mailgun Dashboard: https://app.mailgun.com/');
console.log('📧 Test Email: ' + TEST_EMAIL);




