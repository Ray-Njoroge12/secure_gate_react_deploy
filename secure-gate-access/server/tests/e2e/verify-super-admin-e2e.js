

const BASE_URL = 'http://localhost:5001/api';
// Assuming the server is running on port 5000. Adjust if necessary.

async function verifySuperAdmin() {
    console.log('🔍 Starting Super Admin E2E Verification...');

    try {
        // 1. Login
        console.log('  Testing Login...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'super.admin@securegate.com',
                password: 'SuperAdmin123!'
            })
        });

        if (!loginRes.ok) {
            throw new Error(`Login failed with status: ${loginRes.status} ${loginRes.statusText}`);
        }

        const loginData = await loginRes.json();
        let token = loginData.token;

        // Check for token in cookies if not in body
        if (!token) {
            const setCookie = loginRes.headers.get('set-cookie');
            if (setCookie) {
                // Match accessToken=... or token=...
                const tokenMatch = setCookie.match(/(?:access)?token=([^;]+)/i);
                if (tokenMatch) {
                    token = tokenMatch[1];
                    console.log('  ℹ️  Token found in Set-Cookie header.');
                }
            }
        }

        if (!token) {
            console.error('Login Response:', JSON.stringify(loginData, null, 2));
            console.error('Headers:', loginRes.headers.raw && loginRes.headers.raw());
            throw new Error('No token received in login response or cookies');
        }
        console.log('  ✅ Login Successful. Token received.');

        // 2. Access Super Admin Overview
        console.log('  Testing Super Admin Overview Access...');
        const overviewRes = await fetch(`${BASE_URL}/admin/super-admin/overview`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!overviewRes.ok) {
            const errText = await overviewRes.text();
            throw new Error(`Overview access failed: ${overviewRes.status} ${errText}`);
        }

        const overviewData = await overviewRes.json();
        console.log('  ✅ Overview Access Successful.');
        console.log('     Stats:', JSON.stringify(overviewData.stats || overviewData, null, 2));

        // 3. Access Estates List
        console.log('  Testing Estates List Access...');
        const estatesRes = await fetch(`${BASE_URL}/admin/super-admin/estates`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!estatesRes.ok) {
            const errText = await estatesRes.text();
            throw new Error(`Estates list access failed: ${estatesRes.status} ${errText}`);
        }

        const estatesData = await estatesRes.json();
        console.log('  ✅ Estates List Access Successful.');
        console.log(`     Retrieved ${(estatesData.data || estatesData).length} estates.`);

        // 4. Test Estate Creation (Write Operation)
        console.log('  Testing Estate Creation (Transaction Loop)...');
        const newEstateName = `E2E_Test_Estate_${Date.now()}`;
        const newAdminEmail = `admin.${Date.now()}@test.com`;

        const createRes = await fetch(`${BASE_URL}/admin/super-admin/estates`, {
            method: 'POST',
            headers: {
                'Cookie': `accessToken=${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: newEstateName,
                address: '123 Test Lane',
                adminName: 'Test_Admin',
                adminEmail: newAdminEmail,
                adminPassword: 'Password123!'
            })
        });

        if (!createRes.ok) {
            const err = await createRes.json();
            throw new Error(`Estate creation failed: ${createRes.status} - ${err.message}`);
        }

        const createData = await createRes.json();
        const newEstateId = (createData.data && createData.data.estate && createData.data.estate.id) || (createData.estate && createData.estate.id);
        console.log('  ✅ Estate Creation Successful:', newEstateId, newEstateName);

        // 5. Test Estate Status Update (Suspend/Activate)
        console.log('  Testing Estate Status Update...');
        const statusRes = await fetch(`${BASE_URL}/admin/super-admin/estates/${newEstateId}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`, // Fallback if cookie not used by middleware (middleware uses both)
                'Cookie': `accessToken=${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'suspended' })
        });

        if (!statusRes.ok) {
            throw new Error(`Estate Suspend failed: ${statusRes.status}`);
        }
        console.log('  ✅ Estate Suspended Successfully.');

        // Re-activate for cleanup (optional but good practice)
        await fetch(`${BASE_URL}/admin/super-admin/estates/${newEstateId}/status`, {
            method: 'PATCH',
            headers: { 'Cookie': `accessToken=${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'active' })
        });


        // 6. Test Global User Search
        console.log('  Testing Global User Search...');
        const searchRes = await fetch(`${BASE_URL}/admin/super-admin/users/search?q=Super`, {
            headers: { 'Cookie': `accessToken=${token}` }
        });
        if (!searchRes.ok) throw new Error(`User search failed: ${searchRes.status}`);
        const searchData = await searchRes.json();
        console.log(`  ✅ User Search Successful. Found ${searchData.length} users.`);

        // 7. Test Global Audit Logs
        console.log('  Testing Global Audit Logs...');
        const logsRes = await fetch(`${BASE_URL}/admin/super-admin/audit-logs?limit=5`, {
            headers: { 'Cookie': `accessToken=${token}` }
        });
        if (!logsRes.ok) throw new Error(`Audit logs failed: ${logsRes.status}`);
        console.log('  ✅ Audit Logs Access Successful.');

        // 8. Test System Metrics
        console.log('  Testing System Metrics...');
        const metricsRes = await fetch(`${BASE_URL}/admin/super-admin/system/metrics`, {
            headers: { 'Cookie': `accessToken=${token}` }
        });
        if (!metricsRes.ok) throw new Error(`System metrics failed: ${metricsRes.status}`);
        console.log('  ✅ System Metrics Access Successful.');

        // 9. Cleanup (Delete Estate)
        console.log('  Cleaning up (Deleting Estate)...');
        const deleteRes = await fetch(`${BASE_URL}/admin/super-admin/estates/${newEstateId}`, {
            method: 'DELETE',
            headers: {
                'Cookie': `accessToken=${token}`
            }
        });

        if (!deleteRes.ok) {
            console.warn('  ⚠️ Cleanup failed:', await deleteRes.json());
        } else {
            console.log('  ✅ Cleanup Successful: Estate deleted.');
        }

        console.log('\n✅✅ SUPER ADMIN E2E VERIFICATION PASSED ✅✅');

    } catch (error) {
        console.error('\n❌ VERIFICATION FAILED:', error.message);
        process.exit(1);
    }
}

verifySuperAdmin();
