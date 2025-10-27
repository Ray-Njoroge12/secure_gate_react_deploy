#!/usr/bin/env node

/**
 * Test Different Sender IDs for Africa's Talking
 * 
 * This script tests various sender ID formats for sandbox environment
 */

import AfricasTalking from 'africastalking';

const apiKey = 'atsk_c9abf9c6f99348d7ca727aff992d96c0bfd414bcd623b7a9c813f0bd9fd65521f0738073';
const username = 'securelabstest';

// Different sender ID formats to try
const senderIds = [
  'SECURELABS',      // App name based
  'securelabs',      // Lowercase
  'SecureLabs',      // Title case
  'SECUREGATE',      // Original
  'securegate',      // Lowercase original
  'TEST',            // Generic test
  'test',            // Lowercase test
  'SMS',             // Generic SMS
  'sms',             // Lowercase SMS
  'AFRICASTALKING',  // Service name
  'africastalking'   // Lowercase service name
];

console.log(`🧪 Testing sender IDs for username: "${username}"`);
console.log('');

const africasTalking = AfricasTalking({
  apiKey: apiKey,
  username: username
});

const sms = africasTalking.SMS;

for (const senderId of senderIds) {
  try {
    console.log(`Testing sender ID: "${senderId}"`);
    
    const result = await sms.send({
      to: ['+254712345678'],
      message: `Test message from ${senderId} - ${new Date().toISOString()}`,
      from: senderId
    });
    
    console.log(`✅ SUCCESS with sender ID: "${senderId}"`);
    console.log(`   Response:`, JSON.stringify(result, null, 2));
    
    // If successful, break and use this sender ID
    console.log(`\n🎉 Use this sender ID in your configuration: "${senderId}"`);
    break;
    
  } catch (error) {
    console.log(`❌ Failed with sender ID: "${senderId}"`);
    console.log(`   Error: ${error.message}`);
    
    // Check the specific error
    if (error.message.includes('InvalidSenderId')) {
      console.log(`   → Sender ID not approved`);
    } else if (error.message.includes('401')) {
      console.log(`   → Authentication error`);
    } else if (error.message.includes('403')) {
      console.log(`   → Authorization error`);
    } else {
      console.log(`   → Other error: ${error.message}`);
    }
    console.log('');
  }
}

console.log('\n📋 Next Steps:');
console.log('1. If you found a working sender ID, update your configuration');
console.log('2. For production, you\'ll need to register a custom sender ID');
console.log('3. Contact Africa\'s Talking support to register your preferred sender ID');
console.log('');
console.log('💡 Common working sender IDs for sandbox:');
console.log('   - Your app name (e.g., "SECURELABS")');
console.log('   - Generic names like "TEST", "SMS"');
console.log('   - Sometimes no sender ID (empty string)');

