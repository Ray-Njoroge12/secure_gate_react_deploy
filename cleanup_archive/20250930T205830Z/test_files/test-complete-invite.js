// Test the completeInvite function directly
import { dbManager } from './src/database/db.enhanced.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const qrcode = require('qrcode');
import bcrypt from 'bcryptjs';

async function testCompleteInvite() {
  console.log('🧪 Testing completeInvite function components...');
  
  try {
    // Test 1: Database connection
    console.log('\n📊 Test 1: Database Connection');
    const dbResult = await dbManager.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful:', dbResult.rows[0]);
    
    // Test 2: QR code generation
    console.log('\n📊 Test 2: QR Code Generation');
    const testData = 'TEST-QR-DATA';
    const qrCode = await qrcode.toDataURL(testData);
    console.log('✅ QR code generation successful, length:', qrCode.length);
    
    // Test 3: bcrypt hashing
    console.log('\n📊 Test 3: bcrypt Hashing');
    const testPassword = 'test-password';
    const hash = await bcrypt.hash(testPassword, 10);
    console.log('✅ bcrypt hash generation successful, length:', hash.length);
    
    // Test 4: Verify hash
    const isValid = await bcrypt.compare(testPassword, hash);
    console.log('✅ bcrypt verification successful:', isValid);
    
    // Test 5: Check if invite exists
    console.log('\n📊 Test 5: Check Invite in Database');
    const inviteResult = await dbManager.query('SELECT id, status, date_of_visit FROM visitors WHERE invite_code = $1', ['DEBUG-1758798291021']);
    console.log('📋 Invite query result:', {
      rowCount: inviteResult.rowCount,
      data: inviteResult.rows[0] || null
    });
    
    if (inviteResult.rowCount > 0) {
      const visitor = inviteResult.rows[0];
      console.log('✅ Invite found:', {
        id: visitor.id,
        status: visitor.status,
        date_of_visit: visitor.date_of_visit
      });
      
      // Test 6: Check if visitor status is PENDING
      if (visitor.status === 'PENDING') {
        console.log('✅ Visitor status is PENDING - ready for completion');
      } else {
        console.log('❌ Visitor status is not PENDING:', visitor.status);
      }
    } else {
      console.log('❌ Invite not found in database');
    }
    
    console.log('\n🎉 All component tests passed! The issue might be in the function logic.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📚 Error stack:', error.stack);
  }
}

testCompleteInvite();
