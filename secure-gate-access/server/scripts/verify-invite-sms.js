
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001/api';
const CREDENTIALS = {
    email: 'resident1@securegate.com',
    password: 'ResidentPass123!'
};

async function verifyInviteFlow() {
    console.log('🚀 Starting Verification Flow...');

    // 1. Login
    console.log('🔑 Logging in...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-client-platform': 'api'
        },
        body: JSON.stringify(CREDENTIALS)
    });

    if (!loginRes.ok) {
        throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText}`);
    }

    const loginData = await loginRes.json();
    const token = loginData.data.accessToken;
    console.log('✅ Login successful. Token obtained.');

    // 2. Create Invite
    console.log('📨 Creating visitor invite...');
    const inviteRes = await fetch(`${BASE_URL}/visitors/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            name: 'Test Visitor',
            email: 'test.visitor@example.com',
            phone: '+254712345678',
            expectedArrival: new Date().toISOString(),
            purpose: 'Verification Test'
        })
    });

    if (!inviteRes.ok) {
        const err = await inviteRes.text();
        throw new Error(`Invite creation failed: ${inviteRes.status} ${err}`);
    }

    const inviteData = await inviteRes.json();
    console.log('DEBUG: Invite Response:', JSON.stringify(inviteData, null, 2));
    const inviteCode = inviteData.data.inviteCode;
    console.log(`✅ Invite created. Code: ${inviteCode}`);

    // 3. Complete Invite (Simulate Guest Action)
    console.log('👤 Completing invite (Guest Action)...');
    const completeRes = await fetch(`${BASE_URL}/visitors/complete/${inviteCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test Visitor',
            email: 'test.visitor@example.com',
            phone: '+254712345678',
            idNumber: 'ID123456',
            vehiclePlate: 'KAA 123B',
            consent_given: true
        })
    });

    if (!completeRes.ok) {
        const err = await completeRes.text();
        throw new Error(`Complete invite failed: ${completeRes.status} ${err}`);
    }

    const completeData = await completeRes.json();
    console.log('✅ Invite completed successfully.');

    if (completeData.data.otp) {
        console.log(`🔑 OTP Received in response: ${completeData.data.otp}`);
    } else {
        console.error('❌ OTP missing from response!');
    }

    console.log('✅ Verification Flow Complete. Check server logs for SMS Simulation output.');
}

verifyInviteFlow().catch(console.error);
