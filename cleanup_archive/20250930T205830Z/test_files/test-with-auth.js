// Test with Authentication
// Tests endpoints with proper authentication to identify 500 errors

const testWithAuth = async () => {
  console.log('🔍 TESTING WITH AUTHENTICATION');
  console.log('==============================');
  
  const baseUrl = 'http://localhost:5000';
  let authToken = null;
  
  // Step 1: Login to get authentication token
  console.log('\n1. Logging in to get authentication token...');
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
    
    if (response.ok && data.token) {
      authToken = data.token;
      console.log(`   ✅ Authentication token obtained`);
    } else {
      console.log(`   ❌ Failed to get authentication token`);
      return;
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
    return;
  }
  
  // Step 2: Test visitor invitation creation with auth
  console.log('\n2. Testing visitor invitation creation with auth...');
  try {
    const response = await fetch(`${baseUrl}/api/visitors`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
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
      console.log(`\n3. Testing visitor completion with invite code: ${data.invite_code}`);
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
        
        if (completeResponse.status === 500) {
          console.log(`   🚨 500 ERROR DETECTED!`);
          console.log(`   Error details: ${JSON.stringify(completeData)}`);
        }
      } catch (error) {
        console.log(`   Error: ${error.message}`);
      }
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  // Step 3: Test other endpoints with auth
  console.log('\n4. Testing other endpoints with auth...');
  
  const endpoints = [
    { method: 'GET', path: '/api/visitors', name: 'List Visitors' },
    { method: 'GET', path: '/api/admin/dashboard', name: 'Admin Dashboard' },
    { method: 'GET', path: '/api/admin/visitors', name: 'Admin Visitors' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      console.log(`   ${endpoint.name}: ${response.status}`);
      
      if (response.status === 500) {
        console.log(`   🚨 500 ERROR DETECTED in ${endpoint.name}!`);
        console.log(`   Error details: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      console.log(`   ${endpoint.name}: Error - ${error.message}`);
    }
  }
  
  console.log('\n✅ Testing with authentication completed');
};

// Run the tests
testWithAuth().catch(console.error);
