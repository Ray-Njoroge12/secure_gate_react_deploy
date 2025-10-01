// Test Visitor 500 Error
// Tests visitor invitation endpoint to identify 500 error

const testVisitor500 = async () => {
  console.log('🔍 TESTING VISITOR 500 ERROR');
  console.log('============================');
  
  const baseUrl = 'http://localhost:5000';
  
  // Step 1: Test visitor invitation creation
  console.log('\n1. Testing visitor invitation creation...');
  try {
    const response = await fetch(`${baseUrl}/api/visitors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Visitor',
        phone: '0712345678',
        email: 'visitor@example.com',
        purpose: 'Testing 500 Error',
        dateOfVisit: '2025-12-31',
        time: '14:00'
      })
    });
    
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
    
    if (response.status === 500) {
      console.log(`   🚨 500 ERROR DETECTED!`);
      console.log(`   Error details: ${JSON.stringify(data)}`);
    } else if (response.status === 401) {
      console.log(`   ⚠️  Authentication required - testing with auth...`);
      
      // Try to login first
      const loginResponse = await fetch(`${baseUrl}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@securegate.com',
          password: 'admin123'
        })
      });
      
      const loginData = await loginResponse.json();
      console.log(`   Login Status: ${loginResponse.status}`);
      console.log(`   Login Response: ${JSON.stringify(loginData)}`);
      
      if (loginResponse.ok && loginData.token) {
        console.log(`   ✅ Got auth token, retrying visitor creation...`);
        
        const authResponse = await fetch(`${baseUrl}/api/visitors`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginData.token}`
          },
          body: JSON.stringify({
            name: 'Test Visitor',
            phone: '0712345678',
            email: 'visitor@example.com',
            purpose: 'Testing 500 Error',
            dateOfVisit: '2025-12-31',
            time: '14:00'
          })
        });
        
        const authData = await authResponse.json();
        console.log(`   Auth Status: ${authResponse.status}`);
        console.log(`   Auth Response: ${JSON.stringify(authData, null, 2)}`);
        
        if (authResponse.status === 500) {
          console.log(`   🚨 500 ERROR DETECTED WITH AUTH!`);
          console.log(`   Error details: ${JSON.stringify(authData)}`);
        }
      }
    }
    
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n✅ Testing completed');
};

// Run the test
testVisitor500().catch(console.error);
