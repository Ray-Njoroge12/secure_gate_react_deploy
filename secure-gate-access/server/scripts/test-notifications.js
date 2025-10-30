#!/usr/bin/env node

/**
 * Test Notification Services
 * Tests Mailgun email and Africa's Talking SMS delivery
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { 
  sendVisitorInviteEmail, 
  sendOtpVerificationEmail,
  sendVisitorInviteSms,
  sendOtpVerificationSms 
} from '../src/services/notificationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('📧 Testing Notification Services');
console.log('==================================\n');

// Configuration check
console.log('Configuration:');
console.log(`  Email Provider: ${process.env.EMAIL_PROVIDER || 'not set'}`);
console.log(`  Mailgun Domain: ${process.env.MAILGUN_DOMAIN || 'not set'}`);
console.log(`  Mailgun API Key: ${process.env.MAILGUN_API_KEY ? '***' + process.env.MAILGUN_API_KEY.slice(-4) : 'not set'}`);
console.log(`  SMS Provider: ${process.env.SMS_PROVIDER || 'not set'}`);
console.log(`  AT Username: ${process.env.AT_USERNAME || 'not set'}`);
console.log(`  AT API Key: ${process.env.AT_API_KEY ? '***' + process.env.AT_API_KEY.slice(-4) : 'not set'}`);
console.log(`  Site Name: ${process.env.SITE_NAME || 'Secure Gate Access'}`);
console.log(`  Site URL: ${process.env.SITE_URL || 'http://localhost:5000'}\n`);

async function testMailgunEmail() {
  console.log('1️⃣  Testing Mailgun Email...');
  console.log('   ⚠️  Make sure recipient is authorized in Mailgun dashboard!\n');
  
  // Use authorized recipient
  const testEmail = 'n91599727@gmail.com'; // Your authorized recipient
  
  const visitorData = {
    name: 'Test Visitor',
    email: testEmail,
    phone: '+254712345678',
    dateOfVisit: new Date().toISOString().split('T')[0],
    time: '14:00',
    purpose: 'Testing Mailgun Integration',
    inviteCode: 'TEST-MAILGUN-' + Date.now()
  };
  
  const residentData = {
    name: 'Test Resident',
    email: 'resident@example.com'
  };
  
  const inviteLink = `${process.env.SITE_URL || 'http://localhost:5000'}/invite/${visitorData.inviteCode}`;
  
  try {
    const result = await sendVisitorInviteEmail(visitorData, residentData, inviteLink);
    
    if (result) {
      console.log('   ✅ Mailgun email sent successfully!');
      console.log(`   📧 Recipient: ${testEmail}`);
      console.log(`   📝 Invite Code: ${visitorData.inviteCode}`);
      return true;
    } else {
      console.log('   ❌ Mailgun email failed to send');
      console.log('   Check Mailgun dashboard for errors');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Mailgun email error:', error.message);
    return false;
  }
}

async function testMailgunOTP() {
  console.log('\n2️⃣  Testing Mailgun OTP Email...\n');
  
  const testEmail = 'n91599727@gmail.com'; // Your authorized recipient
  
  const visitorData = {
    name: 'Test Visitor',
    email: testEmail
  };
  
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  try {
    const result = await sendOtpVerificationEmail(visitorData, otpCode, 15);
    
    if (result) {
      console.log('   ✅ OTP email sent successfully!');
      console.log(`   📧 Recipient: ${testEmail}`);
      console.log(`   🔐 OTP Code: ${otpCode}`);
      return true;
    } else {
      console.log('   ❌ OTP email failed to send');
      return false;
    }
  } catch (error) {
    console.log('   ❌ OTP email error:', error.message);
    return false;
  }
}

async function testAfricasTalkingSMS() {
  console.log('\n3️⃣  Testing Africa\'s Talking SMS...');
  console.log('   ⚠️  This will consume SMS credits (KES ~0.80 per SMS)\n');
  
  // Use your phone number for testing
  const testPhone = '+254700000000'; // REPLACE WITH YOUR ACTUAL PHONE NUMBER
  
  console.log(`   ⚠️  IMPORTANT: Update phone number in script to your actual number`);
  console.log(`   Current test number: ${testPhone}\n`);
  
  if (testPhone === '+254700000000') {
    console.log('   ⏭️  Skipping SMS test - please update phone number first');
    return false;
  }
  
  const visitorData = {
    name: 'Test Visitor',
    phone: testPhone,
    dateOfVisit: new Date().toISOString().split('T')[0],
    time: '14:00',
    purpose: 'Testing SMS',
    inviteCode: 'TEST-SMS-' + Date.now()
  };
  
  const residentData = {
    name: 'Test Resident'
  };
  
  const inviteLink = `${process.env.SITE_URL || 'http://localhost:5000'}/invite/${visitorData.inviteCode}`;
  
  try {
    const result = await sendVisitorInviteSms(visitorData, residentData, inviteLink);
    
    if (result) {
      console.log('   ✅ SMS sent successfully!');
      console.log(`   📱 Recipient: ${testPhone}`);
      console.log(`   💰 Cost: ~KES 0.80`);
      console.log(`   Remaining balance: ~KES ${160 - 0.80}`);
      return true;
    } else {
      console.log('   ❌ SMS failed to send');
      console.log('   Check Africa\'s Talking dashboard for errors');
      return false;
    }
  } catch (error) {
    console.log('   ❌ SMS error:', error.message);
    return false;
  }
}

async function testAfricasTalkingOTP() {
  console.log('\n4️⃣  Testing Africa\'s Talking OTP SMS...');
  console.log('   ⚠️  This will consume SMS credits (KES ~0.80 per SMS)\n');
  
  const testPhone = '+254700000000'; // REPLACE WITH YOUR ACTUAL PHONE NUMBER
  
  if (testPhone === '+254700000000') {
    console.log('   ⏭️  Skipping OTP SMS test - please update phone number first');
    return false;
  }
  
  const visitorData = {
    name: 'Test Visitor',
    phone: testPhone
  };
  
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  try {
    const result = await sendOtpVerificationSms(visitorData, otpCode, 15);
    
    if (result) {
      console.log('   ✅ OTP SMS sent successfully!');
      console.log(`   📱 Recipient: ${testPhone}`);
      console.log(`   🔐 OTP Code: ${otpCode}`);
      console.log(`   💰 Cost: ~KES 0.80`);
      return true;
    } else {
      console.log('   ❌ OTP SMS failed to send');
      return false;
    }
  } catch (error) {
    console.log('   ❌ OTP SMS error:', error.message);
    return false;
  }
}

async function main() {
  const results = {
    mailgunEmail: false,
    mailgunOTP: false,
    atSms: false,
    atOTP: false
  };
  
  // Test Mailgun emails
  results.mailgunEmail = await testMailgunEmail();
  results.mailgunOTP = await testMailgunOTP();
  
  // Test Africa's Talking SMS
  results.atSms = await testAfricasTalkingSMS();
  results.atOTP = await testAfricasTalkingOTP();
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Mailgun Email:        ${results.mailgunEmail ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Mailgun OTP:          ${results.mailgunOTP ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Africa's Talking SMS: ${results.atSms ? '✅ PASS' : '⏭️  SKIPPED'}`);
  console.log(`Africa's Talking OTP: ${results.atOTP ? '✅ PASS' : '⏭️  SKIPPED'}`);
  console.log('='.repeat(50));
  
  const totalTests = Object.values(results).filter(r => r === true || r === false).length;
  const passedTests = Object.values(results).filter(r => r === true).length;
  
  console.log(`\n${passedTests}/${totalTests} tests passed\n`);
  
  if (results.mailgunEmail && results.mailgunOTP) {
    console.log('✅ Email notifications are working!');
  } else {
    console.log('⚠️  Email notifications need attention');
    console.log('\nTroubleshooting:');
    console.log('  1. Verify Mailgun API key is correct');
    console.log('  2. Check authorized recipients in Mailgun dashboard');
    console.log('  3. Check Mailgun logs for delivery status');
  }
  
  if (!results.atSms && !results.atOTP) {
    console.log('\n⚠️  SMS tests were skipped');
    console.log('  Update phone number in script and run again');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('  1. Check your email inbox for test messages');
  console.log('  2. Update phone number in script for SMS testing');
  console.log('  3. Monitor Africa\'s Talking credit balance');
  console.log('  4. Add more authorized recipients in Mailgun if needed\n');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
