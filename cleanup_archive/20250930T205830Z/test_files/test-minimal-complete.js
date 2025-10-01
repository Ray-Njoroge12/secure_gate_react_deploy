// Minimal test of completeInvite function
import { dbManager } from './src/database/db.enhanced.js';

async function testMinimalComplete() {
  console.log('🧪 Testing minimal completeInvite logic...');
  
  try {
    // Test 1: Check if invite exists
    const inviteCode = 'FIXED-1758799283466';
    console.log(`📊 Testing with invite code: ${inviteCode}`);
    
    const visitorRes = await dbManager.query(
      'SELECT id, name, status, date_of_visit FROM visitors WHERE invite_code = $1',
      [inviteCode]
    );
    
    console.log('📋 Visitor query result:', {
      rowCount: visitorRes.rowCount,
      data: visitorRes.rows[0] || null
    });
    
    if (visitorRes.rowCount === 0) {
      console.log('❌ Invite not found');
      return;
    }
    
    const visitor = visitorRes.rows[0];
    console.log('✅ Visitor found:', visitor);
    
    // Test 2: Check visitor status
    if (visitor.status !== 'PENDING') {
      console.log(`❌ Visitor status is not PENDING: ${visitor.status}`);
      return;
    }
    
    console.log('✅ Visitor status is PENDING');
    
    // Test 3: Check visit date
    if (visitor.date_of_visit) {
      const visitDate = new Date(visitor.date_of_visit);
      const today = new Date();
      today.setHours(0,0,0,0);
      console.log(`📅 Visit date: ${visitDate.toISOString()}, Today: ${today.toISOString()}`);
      
      if (visitDate < today) {
        console.log('❌ Invitation expired');
        return;
      }
      console.log('✅ Invitation is not expired');
    }
    
    // Test 4: Generate OTP and QR code
    console.log('📊 Generating OTP and QR code...');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`✅ OTP generated: ${otp}`);
    
    // Test 5: Test database update
    console.log('📊 Testing database update...');
    const testData = {
      name: "Minimal Test Visitor",
      phone: "0712345678",
      email: "minimal@example.com"
    };
    
    const updateResult = await dbManager.query(
      `UPDATE visitors SET name=$1, phone=$2, email=$3, otp=$4, qr_code=$5, status='OTP_SENT' WHERE id=$6`,
      [testData.name, testData.phone, testData.email, otp, 'test-qr-code', visitor.id]
    );
    
    console.log('✅ Database update successful:', updateResult.rowCount, 'rows affected');
    
    // Test 6: Verify update
    const verifyRes = await dbManager.query(
      'SELECT id, name, phone, email, status FROM visitors WHERE id = $1',
      [visitor.id]
    );
    
    console.log('✅ Verification query result:', verifyRes.rows[0]);
    
    console.log('🎉 All minimal tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📚 Error stack:', error.stack);
  }
}

testMinimalComplete();
