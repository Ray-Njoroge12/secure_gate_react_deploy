#!/usr/bin/env node

/**
 * Test Africa's Talking Credentials
 * 
 * This script helps identify the correct username for your Africa's Talking account
 */

import AfricasTalking from 'africastalking';

console.log('🔍 Testing Africa\'s Talking Credentials\n');

const apiKey = 'atsk_c9abf9c6f99348d7ca727aff992d96c0bfd414bcd623b7a9c813f0bd9fd65521f0738073';

// Common username patterns for Africa's Talking
const possibleUsernames = [
  'sandbox',
  'sandbox_user',
  'sandboxuser',
  'sandbox-user',
  'test',
  'test_user',
  'testuser',
  'test-user'
];

console.log('🧪 Testing different username patterns...\n');

for (const username of possibleUsernames) {
  try {
    console.log(`Testing username: "${username}"`);
    
    const africasTalking = AfricasTalking({
      apiKey: apiKey,
      username: username
    });

    // Test SMS service initialization
    const sms = africasTalking.SMS;
    
    // Try to send a test SMS (this will fail if credentials are wrong)
    const result = await sms.send({
      to: ['+254712345678'],
      message: 'Test message - ' + new Date().toISOString(),
      from: 'SECUREGATE'
    });
    
    console.log(`✅ SUCCESS with username: "${username}"`);
    console.log(`   Response:`, JSON.stringify(result, null, 2));
    break;
    
  } catch (error) {
    console.log(`❌ Failed with username: "${username}"`);
    console.log(`   Error: ${error.message}`);
    
    // Check if it's an authentication error
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log(`   → Authentication failed (wrong username)`);
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      console.log(`   → Authorization failed (username might be correct but no SMS permission)`);
    } else {
      console.log(`   → Other error: ${error.message}`);
    }
    console.log('');
  }
}

console.log('\n📋 Instructions:');
console.log('1. If you see a SUCCESS message above, use that username');
console.log('2. If all tests fail, you need to:');
console.log('   - Log into your Africa\'s Talking dashboard');
console.log('   - Go to Settings → API Key');
console.log('   - Check your username in the dashboard');
console.log('   - Make sure SMS service is enabled for your account');
console.log('');
console.log('3. For production, you\'ll need to:');
console.log('   - Register a custom sender ID');
console.log('   - Get production credentials (not sandbox)');
console.log('   - Update your environment variables');




