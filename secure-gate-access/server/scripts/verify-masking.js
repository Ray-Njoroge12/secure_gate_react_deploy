
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';
const ADMIN_CREDENTIALS = {
    username: 'admin@securegate.com',
    password: 'AdminPass123!'
};

async function verifyMasking() {
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

        // 1. Verify Residents List (Masked)
        console.log('\nTesting /api/admin/residents (Should be MASKED)...');
        try {
            const res = await axios.get(`${API_URL}/admin/residents`, { headers });
            const residents = res.data.data;
            if (residents.length > 0) {
                const resident = residents[0];
                console.log(`Resident: ${resident.email}, ${resident.phone}`);
                if (resident.email.includes('*') && (!resident.phone || resident.phone.includes('*'))) {
                    console.log('PASS: Residents list is masked.');
                } else {
                    console.error('FAIL: Residents list is NOT masked!', resident);
                }
            } else {
                console.warn('WARN: No residents found to test.');
            }
        } catch (e) {
            console.error('FAIL: Fetch residents failed.', e.message);
        }

        // 2. Verify Visitors List (Masked)
        let testVisitorId = null;
        console.log('\nTesting /api/admin/visitors (Should be MASKED)...');
        try {
            const res = await axios.get(`${API_URL}/admin/visitors`, { headers });
            const visitors = res.data.data;
            if (visitors.length > 0) {
                const visitor = visitors[0];
                testVisitorId = visitor.id;
                console.log(`Visitor: ${visitor.email}, ${visitor.phone}`);
                if (visitor.email.includes('*') && (!visitor.phone || visitor.phone.includes('*'))) {
                    console.log('PASS: Visitors list is masked.');
                } else {
                    console.error('FAIL: Visitors list is NOT masked!', visitor);
                }
            } else {
                console.warn('WARN: No visitors found to test.');
            }
        } catch (e) {
            console.error('FAIL: Fetch visitors failed.', e.message, e.response?.data);
        }

        // 3. Verify Visitor Details (Unmasked)
        if (testVisitorId) {
            console.log(`\nTesting /api/admin/visitors/${testVisitorId}/details (Should be UNMASKED)...`);
            try {
                const res = await axios.get(`${API_URL}/admin/visitors/${testVisitorId}/details`, { headers });
                const detail = res.data.data || res.data; // Helper wraps it? Check controller.
                // Controller says: respond(res, result.rows[0]); which is { success: true, data: ... } usually?
                // respond utils usually structure it.
                // Let's inspect response structure if it fails.

                console.log(`Visitor Detail: ${detail.email}, ${detail.phone}`);
                if (detail.email && !detail.email.includes('*') && detail.phone && !detail.phone.includes('*')) {
                    console.log('PASS: Visitor details are UNMASKED.');
                } else {
                    console.warn('WARN: Visitor details might be masked or partial?', detail);
                }

            } catch (e) {
                console.error('FAIL: Fetch visitor details failed.', e.message, e.response?.status, e.response?.data);
            }
        }

    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

verifyMasking();
