
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

async function run() {
    try {
        console.log('Starting Guard Features Verification (E2E Mode)...');

        // 1. Login as Guard
        console.log('--- Logging in as (guard1 / GuardPass123!) ---');
        let token, estateId;
        let guardUser;

        try {
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                username: 'guard1',
                password: 'GuardPass123!'
            }, {
                // Enforce JSON return by masquerading as mobile/api client
                headers: { 'x-client-platform': 'mobile' }
            });

            console.log('✅ Login Successful');
            const data = loginRes.data.data;

            token = data.accessToken;
            guardUser = data.user;
            estateId = guardUser.estate_id;

            if (!token) {
                throw new Error('No access token returned');
            }

            console.log(`Guard: ${guardUser.username} (Estate: ${estateId})`);

        } catch (err) {
            console.error('❌ Login Failed:', err.response?.status, err.response?.statusText);
            if (err.response?.data) {
                console.error('Details:', JSON.stringify(err.response.data, null, 2));
            } else {
                console.error('Error:', err.message);
            }
            // Try fallback password just in case
            try {
                console.log('Retrying with Password123! ...');
                const retryRes = await axios.post(`${API_URL}/auth/login`, {
                    username: 'guard1',
                    password: 'Password123!'
                }, { headers: { 'x-client-platform': 'mobile' } });
                console.log('✅ Login Successful on Retry');
                const data = retryRes.data.data;
                token = data.accessToken;
                guardUser = data.user;
                estateId = guardUser.estate_id;
            } catch (retryErr) {
                console.error('❌ Retry Failed:', retryErr.response?.data?.message || retryErr.message);
                process.exit(1);
            }
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'x-estate-id': estateId
        };

        // 2. Verify Visitor History (Activity Log)
        console.log('\n--- Verifying Visitor History ---');
        try {
            const historyRes = await axios.get(`${API_URL}/visitors/history`, { headers });
            console.log('✅ Visitor History Endpoint Accessible');
            console.log(`Received ${historyRes.data.data.length} records`);
            if (historyRes.data.data.length > 0) {
                // Check fields match what Frontend expects
                const sample = historyRes.data.data[0];
                console.log('Sample record keys:', Object.keys(sample).join(', '));
                if (!sample.check_in && !sample.check_out && !sample.created_at) {
                    console.warn('⚠️  Warning: Missing expected timestamp fields (check_in, check_out, created_at)');
                }
            }
        } catch (err) {
            console.error('❌ Visitor History Failed:', err.response?.status, err.response?.data?.message || err.message);
        }

        // 3. Verify Shifts
        console.log('\n--- Verifying Shifts ---');
        try {
            const shiftsRes = await axios.get(`${API_URL}/guards/shifts?start_date=2024-01-01&end_date=2026-12-31`, { headers });
            console.log('✅ Shifts Endpoint Accessible');
            console.log(`Received ${shiftsRes.data.data.length} shifts`);
        } catch (err) {
            console.error('❌ Shifts Endpoint Failed:', err.response?.status, err.response?.data?.message || err.message);
        }

        // 4. Verify Revoke Capability
        console.log('\n--- Verifying Revoke Permission ---');
        try {
            // We fetch from history to find a non-revoked visitor
            const historyRes = await axios.get(`${API_URL}/visitors/history`, { headers });
            // Find a visitor that is NOT revoked and NOT checked out (so revocation makes sense)
            const candidates = historyRes.data.data.filter(v =>
                v.status !== 'revoked' &&
                v.status !== 'checked_out' &&
                v.status !== 'cancelled'
            );

            if (candidates.length > 0) {
                const target = candidates[0];
                console.log(`Attempting to revoke visitor ${target.id} (${target.name}, status: ${target.status})`);
                const revokeRes = await axios.delete(`${API_URL}/visitors/${target.id}/revoke`, { headers });
                console.log('✅ Revoke Successful:', revokeRes.data);
            } else {
                console.log('⚠️ No active visitor suitable for revocation test found.');
            }
        } catch (err) {
            console.error('❌ Revoke Test Failed:', err.response?.status, err.response?.data?.message || err.message);
        }

        console.log('\nVerification Complete.');
        process.exit(0);

    } catch (err) {
        console.error('Fatal Error:', err);
        process.exit(1);
    }
}

run();
