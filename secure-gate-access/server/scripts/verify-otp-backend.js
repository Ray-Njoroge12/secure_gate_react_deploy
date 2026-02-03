
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001/api';
const CREDENTIALS = {
    email: 'resident1@securegate.com',
    password: 'ResidentPass123!'
};

async function verifyOtpBackend() {
    console.log('🚀 Starting OTP verification check...');

    // 1. Login
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-platform': 'api' },
        body: JSON.stringify(CREDENTIALS)
    });
    const loginData = await loginRes.json();
    const token = loginData.data.accessToken;
    console.log('✅ Login successful');

    // 2. Create Invite
    const inviteRes = await fetch(`${BASE_URL}/visitors/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            name: 'OTP Test Visitor',
            email: 'otp.test@example.com',
            phone: '+254700000000',
            expectedArrival: new Date().toISOString(),
            purpose: 'OTP Verification Test'
        })
    });
    const inviteData = await inviteRes.json();
    const inviteCode = inviteData.data.inviteCode;
    const visitorId = inviteData.data.id;
    console.log(`✅ Invite created. ID: ${visitorId}, Code: ${inviteCode}`);

    // 3. Complete Invite (Get OTP)
    const completeRes = await fetch(`${BASE_URL}/visitors/complete/${inviteCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'OTP Test Visitor',
            email: 'otp.test@example.com',
            phone: '+254700000000',
            idNumber: 'ID999999',
            vehiclePlate: 'KZZ 999Z',
            consent_given: true
        })
    });
    const completeData = await completeRes.json();
    if (!completeRes.ok) {
        throw new Error(`Complete Invite Failed: ${completeRes.status} ${JSON.stringify(completeData)}`);
    }
    console.log('DEBUG: Complete Response:', JSON.stringify(completeData, null, 2));
    const otp = completeData.data?.otp;
    if (!otp) throw new Error('OTP not found in response');
    console.log(`✅ Invite completed. OTP Received: ${otp}`);

    // 4. Verify OTP (Simulate Guard)
    // Need Guard Token first? Or can resident verify? 
    // verifyOtp checks for estate_id but allows implicit logic. Let's try with same resident token first (might fail if role restricted, usually public/guard)
    // The route /:id/verify-otp is PUBLIC in visitorRoutes.js? 
    // router.post('/:id/verify-otp', verifyOtp); -> It is public!

    console.log(`🔐 Verifying OTP for Visitor ${visitorId}...`);
    const verifyRes = await fetch(`${BASE_URL}/visitors/${visitorId}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp })
    });

    if (!verifyRes.ok) {
        const err = await verifyRes.text();
        throw new Error(`OTP Verification failed: ${verifyRes.status} ${err}`);
    }

    const verifyData = await verifyRes.json();
    console.log('✅ OTP Verified Successfully:', verifyData);
}

verifyOtpBackend().catch(console.error);
