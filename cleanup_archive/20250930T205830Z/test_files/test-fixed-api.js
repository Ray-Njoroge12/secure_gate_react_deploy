// Test the fixed API with a fresh invite
import { dbManager } from './src/database/db.enhanced.js';

async function testFixedAPI() {
  console.log('🧪 Testing fixed API with fresh invite...');
  
  try {
    // Create a fresh test invite
    const inviteCode = `FIXED-${Date.now()}`;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    
    console.log('📊 Creating fresh test invite...');
    const result = await dbManager.query(`
      INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, invite_code, date_of_visit
    `, [
      'Fixed Test Visitor',
      '0712345678',
      'fixed@example.com',
      'API Fix Testing',
      futureDate.toISOString().split('T')[0],
      '14:00',
      inviteCode,
      'PENDING'
    ]);
    
    console.log('✅ Fresh invite created:', result.rows[0]);
    console.log('🔗 Invite code:', inviteCode);
    
    // Test the API
    console.log('\n📊 Testing completeInvite API...');
    const testData = {
      name: "Fixed Test Visitor Complete",
      phone: "0712345679",
      email: "fixedcomplete@example.com"
    };
    
    const response = await fetch(`http://localhost:5000/api/visitors/complete/${inviteCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': `test-${Date.now()}`
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📊 Response status:', response.status);
    const responseText = await response.text();
    console.log('📄 Response body:', responseText);
    
    if (response.ok) {
      console.log('🎉 API call successful!');
      const responseData = JSON.parse(responseText);
      console.log('📋 Response data:', JSON.stringify(responseData, null, 2));
    } else {
      console.log('❌ API call failed with status:', response.status);
      try {
        const errorData = JSON.parse(responseText);
        console.log('📋 Error details:', JSON.stringify(errorData, null, 2));
      } catch (parseError) {
        console.log('📋 Raw error response:', responseText);
      }
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error('📚 Error stack:', error.stack);
  }
}

testFixedAPI();
