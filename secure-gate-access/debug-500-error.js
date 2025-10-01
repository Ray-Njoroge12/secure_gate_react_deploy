// Comprehensive 500 error debugging

async function debug500Error() {
  console.log('🔍 Starting comprehensive 500 error debugging...');
  
  // Test 1: Health check
  console.log('\n📊 Test 1: Health Check');
  try {
    const healthResponse = await fetch('http://localhost:5000/health');
    const healthData = await healthResponse.text();
    console.log('✅ Health check status:', healthResponse.status);
    console.log('📄 Health response:', healthData);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return;
  }
  
  // Test 2: Create a fresh test invite
  console.log('\n📊 Test 2: Creating Fresh Test Invite');
  const inviteCode = `DEBUG-${Date.now()}`;
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1);
  
  try {
    // Import dbManager to create test invite
    const { dbManager } = await import('./server/src/database/db.enhanced.js');
    
    const result = await dbManager.query(`
      INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, invite_code, date_of_visit
    `, [
      'Debug Test Visitor',
      '0712345678',
      'debug@example.com',
      '500 Error Debugging',
      futureDate.toISOString().split('T')[0],
      '14:00',
      inviteCode,
      'PENDING'
    ]);
    
    console.log('✅ Test invite created:', result.rows[0]);
    console.log('🔗 Invite code:', inviteCode);
    
  } catch (error) {
    console.error('❌ Failed to create test invite:', error.message);
    return;
  }
  
  // Test 3: Test completeInvite with detailed logging
  console.log('\n📊 Test 3: Testing completeInvite API');
  const testData = {
    name: "Debug Test Visitor Complete",
    phone: "0712345679",
    email: "debugcomplete@example.com"
  };
  
  const requestId = `debug-${Date.now()}`;
  
  try {
    console.log('📤 Sending request to completeInvite...');
    console.log('📋 Request data:', JSON.stringify(testData, null, 2));
    console.log('🔗 URL:', `http://localhost:5000/api/visitors/complete/${inviteCode}`);
    
    const response = await fetch(`http://localhost:5000/api/visitors/complete/${inviteCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📄 Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ API call successful!');
      const responseData = JSON.parse(responseText);
      console.log('📋 Response data:', JSON.stringify(responseData, null, 2));
    } else {
      console.log('❌ API call failed with status:', response.status);
      
      // Try to parse error response
      try {
        const errorData = JSON.parse(responseText);
        console.log('📋 Error details:', JSON.stringify(errorData, null, 2));
      } catch (parseError) {
        console.log('📋 Raw error response:', responseText);
      }
    }
    
  } catch (error) {
    console.error('💥 Request failed:', error.message);
    console.error('📚 Error stack:', error.stack);
  }
  
  // Test 4: Check server logs (if possible)
  console.log('\n📊 Test 4: Server Status Check');
  try {
    const statusResponse = await fetch('http://localhost:5000/api/health');
    const statusData = await statusResponse.text();
    console.log('✅ Server status check:', statusResponse.status);
    console.log('📄 Status response:', statusData);
  } catch (error) {
    console.error('❌ Server status check failed:', error.message);
  }
  
  console.log('\n🎯 Debugging complete. Check the output above for clues about the 500 error.');
}

debug500Error().catch(console.error);
