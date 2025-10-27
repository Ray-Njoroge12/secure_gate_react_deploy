#!/usr/bin/env node

/**
 * Quick Africa's Talking Test
 * 
 * Run this script with your username to test the integration
 * Usage: node quick-test-at.js YOUR_USERNAME
 */

import AfricasTalking from 'africastalking';

const apiKey = 'atsk_c9abf9c6f99348d7ca727aff992d96c0bfd414bcd623b7a9c813f0bd9fd65521f0738073';
const username = process.argv[2];

if (!username) {
  console.log('❌ Please provide your username');
  console.log('Usage: node quick-test-at.js YOUR_USERNAME');
  console.log('');
  console.log('Example: node quick-test-at.js myusername');
  process.exit(1);
}

console.log(`🧪 Testing Africa's Talking with username: "${username}"`);
console.log(`🔑 API Key: ${apiKey.substring(0, 20)}...`);
console.log('');

try {
  const africasTalking = AfricasTalking({
    apiKey: apiKey,
    username: username
  });

  const sms = africasTalking.SMS;
  
  console.log('📱 Sending test SMS...');
  
  const result = await sms.send({
    to: ['+254712345678'],
    message: `Test message from Africa's Talking - ${new Date().toISOString()}`,
    from: 'SECUREGATE'
  });
  
  console.log('✅ SUCCESS! SMS sent successfully');
  console.log('📋 Response:', JSON.stringify(result, null, 2));
  
  console.log('');
  console.log('🎉 Integration is working! You can now:');
  console.log('1. Update your .env.africastalking file with this username');
  console.log('2. Run the full integration test');
  console.log('3. Deploy to production when ready');
  
} catch (error) {
  console.log('❌ FAILED!');
  console.log('Error:', error.message);
  
  if (error.message.includes('401')) {
    console.log('');
    console.log('🔍 This looks like an authentication error. Please check:');
    console.log('1. Is the username correct?');
    console.log('2. Is the API key valid?');
    console.log('3. Is SMS service enabled in your account?');
  } else if (error.message.includes('403')) {
    console.log('');
    console.log('🔍 This looks like an authorization error. Please check:');
    console.log('1. Is SMS service enabled in your account?');
    console.log('2. Do you have SMS credits?');
    console.log('3. Is your account in good standing?');
  }
}

