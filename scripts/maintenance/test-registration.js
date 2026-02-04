#!/usr/bin/env node
/**
 * Test registration and check email sending
 */

import https from 'https';

const testData = {
  username: 'testuser999',
  email: 'n91599727+cleantest@gmail.com',
  password: 'SecurePass123!',
  role: 'resident',
  phone: '+254712345678',
  area: 'Muthaiga',
  house: '42'
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'secure-gate-api.onrender.com',
  port: 443,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Testing registration...');
console.log('📧 Email:', testData.email);
console.log('');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
    console.log('');
    
    if (res.statusCode === 201) {
      console.log('✅ Registration successful!');
      console.log('📧 Check your email inbox (and spam) for verification link');
      console.log('   Email: n91599727+cleantest@gmail.com -> n91599727@gmail.com');
      console.log('');
      console.log('⏰ Email should arrive within 1-2 minutes');
    } else if (res.statusCode === 409) {
      console.log('⚠️  User already exists. Try a different email:');
      console.log('   n91599727+test2@gmail.com');
      console.log('   n91599727+test3@gmail.com');
    } else {
      console.log('❌ Registration failed');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request failed:', e.message);
});

req.write(postData);
req.end();
