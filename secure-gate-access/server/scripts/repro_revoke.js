
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';
const AUTH_URL = `${API_URL}/auth/login`;

// Test credentials (Guard)
const GUARD_CREDENTIALS = {
    email: 'guard@tests.com',
    password: 'TestPass123!'
};

async function testRevoke() {
    try {
        // 1. Login as Guard
        console.log('Logging in as Guard...');
        const loginRes = await axios.post(AUTH_URL, GUARD_CREDENTIALS);

        // Capture cookies
        const cookies = loginRes.headers['set-cookie'];
        const headers = cookies ? { Cookie: cookies.join('; ') } : {};

        console.log('Guard logged in successfully. Cookies captured.');

        // 2. Fetch active visitors to find a target.
        console.log('Fetching visitors...');
        // Try getMyVisitors (mapped to /history/my usually, but let's check routes)
        const vRes = await axios.get(`${API_URL}/visitors`, { headers });
        const visitors = vRes.data.data.visitors || [];

        if (visitors.length === 0) {
            console.log('No visitors found. Cannot test revoke.');
            return;
        }

        // Find an APPROVED visitor to revoke
        const targetVisitor = visitors.find(v => v.status === 'APPROVED') || visitors[0];
        console.log(`Attempting to revoke visitor ID: ${targetVisitor.id} (Name: ${targetVisitor.name}, Status: ${targetVisitor.status})`);

        // 3. Attempt Revoke (mimicking Frontend behavior: POST /api/visitors/:id/revoke)
        const revokeUrl = `${API_URL}/visitors/${targetVisitor.id}/revoke`;
        console.log(`Sending POST request to: ${revokeUrl}`);

        try {
            const revokeRes = await axios.post(revokeUrl, {}, { headers });
            console.log('Revoke response:', JSON.stringify(revokeRes.data, null, 2));
        } catch (revokeError) {
            console.error('Revoke Failed!');
            if (revokeError.response) {
                console.error('Status:', revokeError.response.status);
                console.error('Data:', JSON.stringify(revokeError.response.data, null, 2));
            } else {
                console.error('Error:', revokeError.message);
            }
        }

    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testRevoke();
