
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';
const ADMIN_CREDENTIALS = {
    email: 'admin@securegate.com',
    password: 'AdminPass123!'
};

async function verifyPrivacy() {
    try {
        console.log('Authenticating as Admin...');
        const authRes = await axios.post(`${API_URL}/auth/login`, ADMIN_CREDENTIALS);
        console.log('Login response headers:', authRes.headers);
        const cookies = authRes.headers['set-cookie'];
        if (!cookies) {
            console.error('FAIL: No cookies received in login response!');
            return;
        }
        const headers = { Cookie: cookies };
        console.log(`Authenticated with cookies: ${cookies.length} cookies received.`);

        // 1. Check Pending Users (Should be UNMASKED)
        console.log('\nChecking Pending Users (Expect UNMASKED)...');
        try {
            const pendingRes = await axios.get(`${API_URL}/admin/users/pending`, { headers });
            const pendingUsers = pendingRes.data.data;
            if (pendingUsers.length > 0) {
                const user = pendingUsers[0];
                console.log(`Pending User: ${user.username}, Phone: ${user.phone}, Email: ${user.email}`);
                if (user.phone && user.phone.includes('***')) {
                    console.error('FAIL: Pending user phone is masked!');
                } else {
                    console.log('PASS: Pending user phone is unmasked.');
                }
            } else {
                console.log('No pending users to check, skipping.');
            }
        } catch (e) {
            console.error('Error fetching pending users:', e.message);
        }

        // 2. Check All Users List (Should be MASKED)
        console.log('\nChecking All Users List (Expect MASKED)...');
        try {
            const usersRes = await axios.get(`${API_URL}/admin/users?limit=5`, { headers });
            const users = usersRes.data.data;
            if (users.length > 0) {
                const user = users.find(u => u.phone); // Find one with a phone
                if (user) {
                    console.log(`User List: ${user.username}, Phone: ${user.phone}, Email: ${user.email}`);
                    if (user.phone.includes('***')) {
                        console.log('PASS: User list phone is masked.');
                    } else {
                        console.error('FAIL: User list phone is UNMASKED!');
                    }
                } else {
                    console.log('No users with phone numbers found in top 5.');
                }

                const userId = users[0].id;

                // 3. Check Single User Details (Should be UNMASKED)
                console.log(`\nChecking Single User Details for ID ${userId} (Expect UNMASKED)...`);
                try {
                    const detailRes = await axios.get(`${API_URL}/admin/users/${userId}`, { headers });
                    const detailUser = detailRes.data.data;
                    console.log(`Detail User: ${detailUser.username}, Phone: ${detailUser.phone}, Email: ${detailUser.email}`);
                    if (detailUser.phone && detailUser.phone.includes('***')) {
                        console.error('FAIL: Single user detail phone is MASKED!');
                    } else {
                        console.log('PASS: Single user detail phone is unmasked.');
                    }
                } catch (e) {
                    console.error('Error fetching single user details:', e.message);
                }

            }
        } catch (e) {
            console.error('Error fetching users list:', e.message);
        }

    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

verifyPrivacy();
