
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';
const ADMIN_CREDENTIALS = {
    username: 'admin@securegate.com',
    password: 'AdminPass123!'
};

async function verifyResidentReveal() {
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

        // 1. Get List of Residents
        console.log('\nFetching Residents List...');
        const listRes = await axios.get(`${API_URL}/admin/users?role=resident`, { headers });
        const residents = listRes.data.data?.users || listRes.data.data || [];

        if (residents.length === 0) {
            console.warn('SKIP: No residents found to test.');
            return;
        }

        const targetResident = residents[0];
        console.log(`Found resident ID: ${targetResident.id} (Email: ${targetResident.email}, Phone: ${targetResident.phone})`);

        // Check if list view is masked (it SHOULD be)
        if (targetResident.email.includes('***')) {
            console.log('INFO: Resident email in LIST view is masked (Expected).');
        } else {
            console.warn('WARN: Resident email in LIST view is UNMASKED (Unexpected).');
        }

        // 2. Get Resident Details (Should be UNMASKED)
        console.log(`\nFetching Resident Details for ID: ${targetResident.id}...`);
        const detailRes = await axios.get(`${API_URL}/admin/users/${targetResident.id}`, { headers });
        const detail = detailRes.data.data;

        console.log(`Resident Detail: Email: ${detail.email}, Phone: ${detail.phone}`);

        let passed = true;
        if (detail.email && detail.email.includes('***')) {
            console.error('FAIL: Resident email is MASKED in detail view!');
            passed = false;
        } else {
            console.log('PASS: Resident email is UNMASKED.');
        }

        if (detail.phone && detail.phone.includes('***')) {
            console.error('FAIL: Resident phone is MASKED in detail view!');
            passed = false;
        } else {
            // Note: phone might be null/empty
            console.log(`PASS: Resident phone is ${detail.phone ? 'UNMASKED' : 'empty'}.`);
        }

    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

verifyResidentReveal();
