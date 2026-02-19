
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';
const ADMIN_CREDENTIALS = {
    username: 'admin@securegate.com', // API expects username
    password: 'AdminPass123!'
};

async function verifyReveal() {
    try {
        console.log('Authenticating as Admin...');
        const authRes = await axios.post(`${API_URL}/auth/login`, ADMIN_CREDENTIALS);
        const cookies = authRes.headers['set-cookie'];
        if (!cookies) {
            console.error('FAIL: No cookies received in login response!');
            return;
        }
        const headers = { Cookie: cookies };
        console.log('Authenticated successfully.');

        // 1. Verify Password Endpoint
        console.log('\nTesting Password Verification...');

        // Success Case
        try {
            const verifyRes = await axios.post(`${API_URL}/auth/verify-password`, { password: ADMIN_CREDENTIALS.password }, { headers });
            if (verifyRes.data.success && verifyRes.data.data.verified) {
                console.log('PASS: Password verified successfully.');
            } else {
                console.error('FAIL: Password verification returned false.', verifyRes.data);
            }
        } catch (e) {
            console.error('FAIL: Password verification request failed.', e.message);
            if (e.response) {
                console.error('Response data:', JSON.stringify(e.response.data, null, 2));
            }
        }

        // Failure Case
        try {
            await axios.post(`${API_URL}/auth/verify-password`, { password: 'WrongPassword' }, { headers });
            console.error('FAIL: Wrong password should have failed!');
        } catch (e) {
            if (e.response && e.response.status === 401) {
                console.log('PASS: Wrong password correctly rejected with 401.');
            } else {
                console.error('FAIL: Wrong password failed with unexpected error:', e.message);
            }
        }

        // 2. Test Unmasked Visitor Details
        console.log('\nTesting Unmasked Visitor Details...');

        // First get a visitor to check
        let visitorId;
        try {
            const listRes = await axios.get(`${API_URL}/visitors/active`, { headers });
            // visitorAdminController.js:getActiveVisitors returns { success: true, data: [...] } or just [...] depending on implementation?
            // Looking at getActiveVisitors in controller: it calls respond(res, visitors) -> which usually wraps in { success: true, data: ... }

            // Let's check what verify-privacy.js found for users.
            const visitors = listRes.data.data || listRes.data;
            if (visitors.length > 0) {
                visitorId = visitors[0].id;
                console.log(`Found visitor ID: ${visitorId} (Masked Phone: ${visitors[0].phone})`);
            } else {
                console.log('No active visitors found. Trying recent visitors...');
                const recentRes = await axios.get(`${API_URL}/visitors/recent`, { headers });
                const recent = recentRes.data.data || recentRes.data;
                if (recent.length > 0) {
                    visitorId = recent[0].id;
                    console.log(`Found recent visitor ID: ${visitorId}`);
                }
            }
        } catch (e) {
            console.error('Error fetching visitor list:', e.message);
        }

        if (visitorId) {
            try {
                const detailRes = await axios.get(`${API_URL}/visitors/${visitorId}/details`, { headers });
                const detail = detailRes.data.data || detailRes.data;
                console.log(`Visitor Detail: Name: ${detail.name}, Phone: ${detail.phone}, Email: ${detail.email}`);

                if (detail.phone && !detail.phone.includes('*')) {
                    console.log('PASS: Visitor phone is UNMASKED.');
                } else {
                    console.warn('WARN: Visitor phone is masked or empty. (Might be empty in DB?)');
                }
            } catch (e) {
                console.error('FAIL: Failed to fetch visitor details.', e.message, e.response?.data);
            }
        } else {
            console.warn('SKIP: Could not find a visitor to test.');
        }

    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

verifyReveal();
