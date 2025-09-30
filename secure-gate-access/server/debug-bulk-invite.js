// Debug script to check bulk invite API response structure
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.OTP_DEBUG_ECHO = 'true';

import request from 'supertest';
import app from './src/app.js';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev_test_secret';

function makeHeaders(email, role = 'resident') {
  const token = jwt.sign({ email, role }, SECRET, { expiresIn: '1h' });
  return { Authorization: `Bearer ${token}` };
}

async function debugBulkInvite() {
  try {
    console.log('Testing bulk invite API response structure...');
    
    const residentHeaders = makeHeaders('resident@test.com', 'resident');
    const payload = { eventName: 'Debug Event', date: '2099-12-31', time: '12:00', numGuests: 2 };
    
    const res = await request(app)
      .post('/api/visitors/bulk-invite')
      .set(residentHeaders)
      .send(payload);
    
    console.log('Status Code:', res.statusCode);
    console.log('Response Body:');
    console.log(JSON.stringify(res.body, null, 2));
    
    if (res.body && res.body.data) {
      console.log('\nData fields:');
      Object.keys(res.body.data).forEach(key => {
        console.log(`  ${key}: ${res.body.data[key]}`);
      });
      
      if (res.body.data.inviteCode) {
        console.log(`\n✅ inviteCode found: ${res.body.data.inviteCode}`);
        
        // Test completing the invite
        console.log('\nTesting complete invite...');
        const completeRes = await request(app)
          .post(`/api/visitors/complete/${res.body.data.inviteCode}`)
          .send({ name: 'Debug User', phone: '0712345678', email: 'debug@example.com' });
          
        console.log('Complete Status Code:', completeRes.statusCode);
        console.log('Complete Response Body:');
        console.log(JSON.stringify(completeRes.body, null, 2));
        
      } else {
        console.log('❌ inviteCode not found in response');
      }
    } else {
      console.log('❌ No data field in response');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    process.exit(0);
  }
}

debugBulkInvite();