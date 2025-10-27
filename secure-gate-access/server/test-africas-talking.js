#!/usr/bin/env node

/**
 * Test Africa's Talking SMS Integration
 * 
 * This script tests the Africa's Talking SMS integration with real credentials
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.africastalking') });

// Override the sender ID if it's empty
if (!process.env.AT_SENDER_ID || process.env.AT_SENDER_ID.trim() === '') {
  delete process.env.AT_SENDER_ID; // Remove the empty sender ID
}

// Import the notification service
const notificationService = await import('./src/services/notificationService.js');

console.log('🧪 Testing Africa\'s Talking SMS Integration\n');

// Test data
const testVisitorData = {
  name: 'John Test',
  phone: '+254712345678', // Kenya test number
  email: 'john.test@example.com',
  dateOfVisit: '2025-01-15',
  time: '10:00 AM',
  purpose: 'Testing Africa\'s Talking Integration',
  inviteCode: 'TEST123'
};

const testResidentData = {
  name: 'Jane Resident',
  email: 'jane@example.com'
};

const testInviteLink = 'https://securegate.test.com/invite/TEST123';

console.log('📋 Configuration:');
console.log(`   SMS Provider: ${process.env.SMS_PROVIDER || 'twilio (default)'}`);
console.log(`   AT Username: ${process.env.AT_USERNAME || 'Not set'}`);
console.log(`   AT API Key: ${process.env.AT_API_KEY ? 'Set ✅' : 'Not set ❌'}`);
console.log(`   AT Sender ID: ${process.env.AT_SENDER_ID || 'None (sandbox mode)'}`);
console.log('');

// Test 1: Basic SMS sending
console.log('📱 Test 1: Sending visitor invitation SMS...');
try {
  const result = await notificationService.sendVisitorInviteSms(
    testVisitorData,
    testResidentData,
    testInviteLink
  );
  
  if (result) {
    console.log('✅ SMS sent successfully!');
  } else {
    console.log('❌ SMS sending failed');
  }
} catch (error) {
  console.log(`❌ Error: ${error.message}`);
}

console.log('');

// Test 2: OTP verification SMS
console.log('🔐 Test 2: Sending OTP verification SMS...');
try {
  const result = await notificationService.sendOtpVerificationSms(
    testVisitorData,
    '123456',
    15
  );
  
  if (result) {
    console.log('✅ OTP SMS sent successfully!');
  } else {
    console.log('❌ OTP SMS sending failed');
  }
} catch (error) {
  console.log(`❌ Error: ${error.message}`);
}

console.log('');

// Test 3: Legacy SMS function
console.log('📨 Test 3: Testing legacy SMS function...');
try {
  const result = await notificationService.sendSms(
    '+254712345678',
    'Test message from Africa\'s Talking integration - ' + new Date().toISOString()
  );
  
  if (result) {
    console.log('✅ Legacy SMS sent successfully!');
  } else {
    console.log('❌ Legacy SMS sending failed');
  }
} catch (error) {
  console.log(`❌ Error: ${error.message}`);
}

console.log('');

// Test 4: Check metrics
console.log('📊 Test 4: Checking metrics...');
try {
  // Import metrics
  const metricsModule = await import('./src/utils/metrics.js');
  const metrics = metricsModule.metrics || {};
  
  console.log('   SMS Metrics:');
  console.log(`   - SMS Sent: ${metrics.notifications_sms_sent || 0}`);
  console.log(`   - SMS Failed: ${metrics.notifications_sms_failed || 0}`);
  console.log(`   - Email Sent: ${metrics.notifications_email_sent || 0}`);
  console.log(`   - Email Failed: ${metrics.notifications_email_failed || 0}`);
} catch (error) {
  console.log(`❌ Error reading metrics: ${error.message}`);
}

console.log('');
console.log('🎉 Africa\'s Talking integration test completed!');
console.log('');
console.log('📝 Next steps:');
console.log('   1. Check your phone (+254712345678) for SMS messages');
console.log('   2. If messages are received, the integration is working correctly');
console.log('   3. Update your production environment with these credentials');
console.log('   4. Test with real visitor phone numbers');
console.log('');
console.log('⚠️  Note: This uses the sandbox environment. For production:');
console.log('   - Register for a production account at africastalking.com');
console.log('   - Get production API credentials');
console.log('   - Register a custom sender ID');
