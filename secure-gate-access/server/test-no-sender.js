#!/usr/bin/env node

/**
 * Test Africa's Talking without sender ID
 * 
 * Some sandbox environments don't require or support custom sender IDs
 */

import AfricasTalking from 'africastalking';

const apiKey = 'atsk_c9abf9c6f99348d7ca727aff992d96c0bfd414bcd623b7a9c813f0bd9fd65521f0738073';
const username = 'securelabstest';

console.log(`🧪 Testing Africa's Talking without sender ID`);
console.log(`Username: "${username}"`);
console.log('');

try {
  const africasTalking = AfricasTalking({
    apiKey: apiKey,
    username: username
  });

  const sms = africasTalking.SMS;
  
  console.log('📱 Sending test SMS without sender ID...');
  
  // Try without sender ID (some sandbox environments work this way)
  const result = await sms.send({
    to: ['+254712345678'],
    message: `Test message without sender ID - ${new Date().toISOString()}`
    // Note: No 'from' field
  });
  
  console.log('✅ SUCCESS! SMS sent without sender ID');
  console.log('📋 Response:', JSON.stringify(result, null, 2));
  
  console.log('');
  console.log('🎉 Integration is working! You can now:');
  console.log('1. Update your configuration to not use a sender ID');
  console.log('2. Or contact Africa\'s Talking support to register a sender ID');
  
} catch (error) {
  console.log('❌ FAILED without sender ID');
  console.log('Error:', error.message);
  
  // Let's try with a very simple sender ID
  console.log('');
  console.log('🔄 Trying with simple sender ID...');
  
  try {
    const result2 = await sms.send({
      to: ['+254712345678'],
      message: `Test with simple sender - ${new Date().toISOString()}`,
      from: 'SMS'  // Very simple sender ID
    });
    
    console.log('✅ SUCCESS with simple sender ID "SMS"');
    console.log('📋 Response:', JSON.stringify(result2, null, 2));
    
  } catch (error2) {
    console.log('❌ Also failed with simple sender ID');
    console.log('Error:', error2.message);
    
    console.log('');
    console.log('📋 This might be a sandbox limitation. Try:');
    console.log('1. Check your Africa\'s Talking dashboard for approved sender IDs');
    console.log('2. Contact Africa\'s Talking support');
    console.log('3. Upgrade to production account for custom sender IDs');
  }
}



