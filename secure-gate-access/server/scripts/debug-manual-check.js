/**
 * Manual Check Flow Debugging Script
 * Simulates the exact flow that ManualCheck.jsx uses to search for visitors by OTP
 */

import { dbManager } from '../src/database/db.enhanced.js';

// Test credentials
const GUARD_CREDENTIALS = {
    email: 'guard1@securegate.com',
    password: 'GuardPass123!'
};

const TEST_OTP = '564858'; // Updated OTP from latest seed
const API_BASE = 'http://localhost:3001';

async function debugManualCheckFlow() {
    console.log('==========================================');
    console.log('🔍 MANUAL CHECK FLOW DEBUG');
    console.log('==========================================\n');

    // Step 1: Login as Guard
    console.log('Step 1: Logging in as Guard...');
    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(GUARD_CREDENTIALS)
    });

    if (!loginRes.ok) {
        console.log('❌ Login failed:', loginRes.status, loginRes.statusText);
        return;
    }

    const loginData = await loginRes.json();
    console.log('✅ Login successful');
    console.log('   - Response:', JSON.stringify(loginData, null, 2));

    const user = loginData.user || loginData.data?.user;
    if (!user) {
        console.log('❌ No user data in login response!');
        return;
    }

    console.log(`   - Guard ID: ${user.id}`);
    console.log(`   - Estate ID: ${user.estate_id}`);

    // Extract cookies
    const cookies = loginRes.headers.get('set-cookie');
    console.log(`   - Cookies: ${cookies ? 'Present' : 'Missing'}\n`);

    // Step 2: Fetch all visitors (as ManualCheck.jsx does)
    console.log('Step 2: Fetching all visitors via /api/visitors...');
    const visitorsRes = await fetch(`${API_BASE}/api/visitors`, {
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookies || ''
        }
    });

    if (!visitorsRes.ok) {
        console.log('❌ Fetch visitors failed:', visitorsRes.status, visitorsRes.statusText);
        const errorText = await visitorsRes.text();
        console.log('   Error:', errorText);
        return;
    }

    const visitorsData = await visitorsRes.json();
    console.log('   - Response structure:', JSON.stringify(visitorsData, null, 2).substring(0, 500));

    const visitors = visitorsData.data?.visitors || visitorsData.data || visitorsData || [];
    console.log(`✅ Fetched ${Array.isArray(visitors) ? visitors.length : 'invalid'} visitors\n`);

    // Step 3: Check for our test visitor
    console.log('Step 3: Looking for Test Visitor (Active)...');
    const testVisitor = visitors.find(v => v.name === 'Test Visitor (Active)');

    if (!testVisitor) {
        console.log('❌ Test Visitor NOT found in API response!');
        console.log('\n   Available visitors:');
        visitors.slice(0, 5).forEach(v => {
            console.log(`   - ${v.name} (Status: ${v.status}, ID: ${v.id})`);
        });
        console.log(`   ... and ${Math.max(0, visitors.length - 5)} more\n`);
    } else {
        console.log('✅ Test Visitor found in API response');
        console.log(`   - ID: ${testVisitor.id}`);
        console.log(`   - Status: ${testVisitor.status}`);
        console.log(`   - Phone: ${testVisitor.phone}`);
        console.log(`   - Estate ID: ${testVisitor.estate_id}\n`);
    }

    // Step 4: Filter for OTP-eligible visitors (as ManualCheck.jsx does)
    console.log('Step 4: Filtering for otp_sent/pending status...');
    const normalizeStatus = (status) => String(status || '').toLowerCase().replace(/[_-]/g, '_');

    const otpPending = visitors.filter((visitor) => {
        const normalized = normalizeStatus(visitor.status);
        return normalized === 'otp_sent' || normalized === 'pending';
    });

    console.log(`✅ Found ${otpPending.length} visitors with otp_sent/pending status`);
    otpPending.forEach(v => {
        console.log(`   - ${v.name} (Status: ${v.status}, Normalized: ${normalizeStatus(v.status)})`);
    });
    console.log();

    // Step 5: Try to verify OTP (as ManualCheck.jsx does)
    if (otpPending.length > 0) {
        console.log('Step 5: Testing OTP verification for each pending visitor...');

        for (const visitor of otpPending) {
            console.log(`\n   Testing visitor: ${visitor.name} (ID: ${visitor.id})`);

            try {
                const otpRes = await fetch(`${API_BASE}/api/visitors/${visitor.id}/verify-otp`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': cookies || ''
                    },
                    body: JSON.stringify({ otp: TEST_OTP })
                });

                if (otpRes.ok) {
                    const otpData = await otpRes.json();
                    console.log(`   ✅ OTP MATCH! Status: ${otpData.status || 'verified'}`);
                    break;
                } else {
                    const errorData = await otpRes.json();
                    console.log(`   ❌ OTP mismatch: ${JSON.stringify(errorData, null, 2)}`);
                }
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
            }
        }
    } else {
        console.log('⚠️  No pending visitors to test OTP verification against!');
    }

    // Step 6: Direct database check
    console.log('\n\nStep 6: Direct database verification...');
    await dbManager.initializeAsync();

    const dbVisitor = await dbManager.query(`
    SELECT id, name, status, otp_hash, otp_expires_at, estate_id, created_at
    FROM visitors 
    WHERE name = 'Test Visitor (Active)'
    ORDER BY created_at DESC
    LIMIT 1
  `);

    if (dbVisitor.rows.length > 0) {
        const v = dbVisitor.rows[0];
        console.log('✅ Test Visitor in Database:');
        console.log(`   - ID: ${v.id}`);
        console.log(`   - Status: ${v.status}`);
        console.log(`   - Estate ID: ${v.estate_id}`);
        console.log(`   - Has OTP Hash: ${v.otp_hash ? 'Yes' : 'No'}`);
        console.log(`   - OTP Expired: ${new Date(v.otp_expires_at) < new Date() ? 'Yes' : 'No'}`);
        console.log(`   - Created: ${v.created_at}`);
    } else {
        console.log('❌ Test Visitor NOT in database!');
    }

    await dbManager.disconnect();

    console.log('\n==========================================\n');
}

debugManualCheckFlow().catch(error => {
    console.error('❌ Fatal Error:', error);
    process.exit(1);
});
