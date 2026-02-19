import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));

const API_URL = 'http://localhost:3001/api';

async function run() {
    try {
        // 1. Login as Guard
        console.log('Logging in as Guard...');
        await client.post(`${API_URL}/auth/login`, {
            email: 'guard1@securegate.com',
            password: 'GuardPass123!'
        });
        console.log('Login successful.');

        // 2. Fetch Visitor History
        console.log('Fetching Visitor History...');
        const res = await client.get(`${API_URL}/guard/visitor-history`);

        console.log('Response Status:', res.status);
        if (res.data && res.data.data && res.data.data.length > 0) {
            const first = res.data.data[0];
            console.log('First Record Keys:', Object.keys(first));
            console.log('First Record Sample:', JSON.stringify(first, null, 2));

            // Check specifically for visitorName
            if (first.visitorName) console.log('✅ visitorName present');
            else console.log('❌ visitorName MISSING');

            if (first.residentName) console.log('✅ residentName present');
            else console.log('❌ residentName MISSING');

        } else {
            console.log('No history records found.');
            console.log('Full Response:', JSON.stringify(res.data, null, 2));
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Data:', error.response.data);
        }
    }
}

run();
