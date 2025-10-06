// Test script to verify rate limiting on auth endpoints
import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

async function testRateLimiting() {
  console.log('🧪 Testing Rate Limiting on Auth Endpoints...\n');
  
  try {
    // Test 1: Single request should work
    console.log('1. Testing single request...');
    const response1 = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'test',
      password: 'test'
    }, {
      validateStatus: () => true // Don't throw on any status
    });
    console.log(`   Status: ${response1.status}`);
    console.log(`   Response: ${JSON.stringify(response1.data).substring(0, 100)}...`);
    
    // Test 2: Multiple requests to trigger rate limiting
    console.log('\n2. Testing multiple requests to trigger rate limiting...');
    const promises = [];
    
    for (let i = 0; i < 25; i++) {
      promises.push(
        axios.post(`${BASE_URL}/api/auth/login`, {
          username: 'test',
          password: 'test'
        }, {
          validateStatus: () => true
        })
      );
    }
    
    const responses = await Promise.all(promises);
    const statusCodes = responses.map(r => r.status);
    
    console.log(`   Total requests: ${responses.length}`);
    console.log(`   Status codes: ${statusCodes.join(', ')}`);
    
    const rateLimited = responses.filter(r => r.status === 429);
    const successful = responses.filter(r => r.status === 200 || r.status === 401);
    
    console.log(`   Successful (200/401): ${successful.length}`);
    console.log(`   Rate Limited (429): ${rateLimited.length}`);
    
    if (rateLimited.length > 0) {
      console.log('\n✅ Rate limiting is working!');
      console.log(`   Rate limit response: ${JSON.stringify(rateLimited[0].data).substring(0, 200)}...`);
    } else {
      console.log('\n❌ Rate limiting is NOT working - no 429 responses found');
    }
    
    // Test 3: Check rate limiting headers
    console.log('\n3. Checking rate limiting headers...');
    const lastResponse = responses[responses.length - 1];
    const headers = lastResponse.headers;
    
    console.log(`   Rate limit headers:`);
    console.log(`   - ratelimit-limit: ${headers['ratelimit-limit'] || 'Not found'}`);
    console.log(`   - ratelimit-remaining: ${headers['ratelimit-remaining'] || 'Not found'}`);
    console.log(`   - ratelimit-reset: ${headers['ratelimit-reset'] || 'Not found'}`);
    console.log(`   - retry-after: ${headers['retry-after'] || 'Not found'}`);
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

// Run the test
testRateLimiting();
