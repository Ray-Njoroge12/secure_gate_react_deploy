// Simple 500 Error Test Script
// Tests specific endpoints to identify 500 errors

const testEndpoints = async () => {
  console.log('🔍 TESTING FOR 500 ERRORS');
  console.log('=========================');
  
  const baseUrl = 'http://localhost:5000';
  
  // Test 1: Health check
  console.log('\n1. Testing health endpoint...');
  try {
    const response = await fetch(`${baseUrl}/health`);
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Data: ${JSON.stringify(data)}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  // Test 2: API health check
  console.log('\n2. Testing API health endpoint...');
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Data: ${JSON.stringify(data)}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  // Test 3: User registration
  console.log('\n3. Testing user registration...');
  try {
    const response = await fetch(`${baseUrl}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!',
        role: 'resident'
      })
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Data: ${JSON.stringify(data)}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  // Test 4: User login
  console.log('\n4. Testing user login...');
  try {
    const response = await fetch(`${baseUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@securegate.com',
        password: 'admin123'
      })
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Data: ${JSON.stringify(data)}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  // Test 5: Create visitor invitation
  console.log('\n5. Testing visitor invitation creation...');
  try {
    const response = await fetch(`${baseUrl}/api/visitors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Visitor',
        phone: '0712345678',
        email: 'visitor@example.com',
        purpose: 'Testing',
        dateOfVisit: '2025-12-31',
        time: '14:00'
      })
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Data: ${JSON.stringify(data)}`);
    
    // If successful, test visitor completion
    if (response.ok && data.invite_code) {
      console.log(`\n6. Testing visitor completion with invite code: ${data.invite_code}`);
      try {
        const completeResponse = await fetch(`${baseUrl}/api/visitors/invite/${data.invite_code}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test Visitor',
            phone: '0712345678',
            email: 'visitor@example.com',
            idNumber: '123456789',
            vehiclePlate: 'ABC123',
            expectedTime: '2 hours'
          })
        });
        const completeData = await completeResponse.json();
        console.log(`   Status: ${completeResponse.status}`);
        console.log(`   Data: ${JSON.stringify(completeData)}`);
      } catch (error) {
        console.log(`   Error: ${error.message}`);
      }
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  // Test 6: List visitors
  console.log('\n7. Testing visitor list...');
  try {
    const response = await fetch(`${baseUrl}/api/visitors`);
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Data: ${JSON.stringify(data)}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n✅ Testing completed');
};

// Run the tests
testEndpoints().catch(console.error);
