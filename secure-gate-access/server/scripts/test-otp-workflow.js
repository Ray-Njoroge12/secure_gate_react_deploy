
const BASE_URL = 'http://localhost:3001/api';

async function testOTPWorkflow() {
    console.log('🧪 Testing Complete OTP Workflow\n');

    // 1. Login as Resident
    console.log('1️⃣ Logging in as resident...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-platform': 'api' },
        body: JSON.stringify({
            email: 'resident1@securegate.com',
            password: 'ResidentPass123!'
        })
    });
    const loginData = await loginRes.json();
    const residentToken = loginData.data.accessToken;
    console.log('✅ Resident logged in\n');

    // 2. Create Visitor Invite
    console.log('2️⃣ Creating visitor invite...');
    const inviteRes = await fetch(`${BASE_URL}/visitors/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${residentToken}`
        },
        body: JSON.stringify({
            name: 'OTP Workflow Test',
            email: 'otptest@example.com',
            phone: '+254712345678',
            expectedArrival: new Date().toISOString(),
            purpose: 'Testing OTP Entry'
        })
    });
    const inviteData = await inviteRes.json();
    const inviteCode = inviteData.data.inviteCode;
    const visitorId = inviteData.data.id;
    console.log(`✅ Invite created: ${inviteCode}\n`);

    // 3. Complete Invite (as visitor)
    console.log('3️⃣ Visitor completing invite...');
    const completeRes = await fetch(`${BASE_URL}/visitors/complete/${inviteCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'OTP Workflow Test',
            email: 'otptest@example.com',
            phone: '+254712345678',
            idNumber: 'ID123456',
            vehiclePlate: 'KAA 123A',
            consent_given: true
        })
    });
    const completeData = await completeRes.json();
    const otp = completeData.data.otp;
    console.log(`✅ Invite completed. OTP: ${otp}`);
    console.log(`📱 SMS would be sent to: ${completeData.data.phone}\n`);

    // 4. Login as Guard
    console.log('4️⃣ Logging in as guard...');
    const guardLoginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-platform': 'api' },
        body: JSON.stringify({
            email: 'guard1@securegate.com',
            password: 'GuardPass123!'
        })
    });
    const guardLoginData = await guardLoginRes.json();
    if (!guardLoginData.success) {
        console.error('❌ Guard login failed:', guardLoginData);
        return;
    }
    const guardToken = guardLoginData.data.accessToken;
    console.log('✅ Guard logged in\n');

    // 5. Verify OTP (as guard)
    console.log('5️⃣ Guard verifying OTP...');
    const verifyRes = await fetch(`${BASE_URL}/visitors/${visitorId}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp })
    });
    const verifyData = await verifyRes.json();
    console.log('✅ OTP Verified:', verifyData.success ? 'SUCCESS' : 'FAILED');
    console.log(`   Status: ${verifyData.data?.status || 'N/A'}\n`);

    // 6. Check-in visitor
    console.log('6️⃣ Guard checking in visitor...');
    const checkinRes = await fetch(`${BASE_URL}/visitors/${visitorId}/check-in`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${guardToken}`
        }
    });
    const checkinData = await checkinRes.json();
    console.log('✅ Check-in:', checkinData.success ? 'SUCCESS' : 'FAILED');
    console.log(`   Status: ${checkinData.data?.status || 'N/A'}\n`);

    console.log('🎉 Complete OTP Workflow Test Finished!\n');
    console.log('📋 Summary:');
    console.log(`   - Visitor ID: ${visitorId}`);
    console.log(`   - OTP: ${otp}`);
    console.log(`   - Final Status: ${checkinData.data?.status || 'Unknown'}`);
}

testOTPWorkflow().catch(console.error);
