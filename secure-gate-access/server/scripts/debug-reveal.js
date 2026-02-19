
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

async function verify() {
    try {
        // 1. Login as Admin
        console.log('Logging in as admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@securegate.com',
            password: 'AdminPass123!'
        });
        const token = loginRes.data.token;
        console.log('Login successful.');

        // 2. Get All Residents (to get an ID)
        const listRes = await axios.get(`${API_URL}/admin/residents`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (listRes.data.data.length === 0) {
            console.log('No residents found.');
            return;
        }

        const resident = listRes.data.data[0];
        console.log(`Checking resident: ${resident.username} (ID: ${resident.id})`);
        console.log('List View Email (Expect Masked):', resident.email);

        // 3. Get Resident Details (Reveal)
        const detailRes = await axios.get(`${API_URL}/admin/users/${resident.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const detailedUser = detailRes.data.data;
        console.log('--- Detail View Response ---');
        console.log('Email:', detailedUser.email);
        console.log('Phone:', detailedUser.phone);
        console.log('----------------------------');

        if (detailedUser.email.includes('***')) {
            console.log('FAIL: Email is still masked in detail view!');
        } else {
            console.log('SUCCESS: Email is clear text in detail view.');
        }

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

verify();
