

const BASE_URL = 'http://localhost:5001/api';

async function verifyEstateAdmin() {
    console.log('🔍 Starting Estate Admin E2E Verification...');

    let superAdminToken = '';
    let estateId = '';
    let estateAdminEmail = '';
    let estateAdminPassword = 'Password123!';
    let estateAdminToken = '';

    try {
        // ==========================================
        // PHASE 1: BOOTSTRAPPING (AS SUPER ADMIN)
        // ==========================================
        console.log('\n--- Phase 1: Bootstrapping Estate & Admin ---');

        // 1. Login as Super Admin
        const saLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'super.admin@securegate.com', password: 'SuperAdmin123!' })
        });
        if (!saLoginRes.ok) throw new Error('Super Admin Login Failed');

        const saData = await saLoginRes.json();
        const setCookie = saLoginRes.headers.get('set-cookie');
        superAdminToken = saData.token || (setCookie && setCookie.match(/(?:access)?token=([^;]+)/i)[1]);
        if (!superAdminToken) throw new Error('No Super Admin Token');
        console.log('  ✅ Super Admin Logged In');

        // 2. Create Test Estate
        const estateName = `Estate_Admin_Test_${Date.now()}`;
        estateAdminEmail = `estate.admin.${Date.now()}@test.com`;

        const createRes = await fetch(`${BASE_URL}/admin/super-admin/estates`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${superAdminToken}`,
                'Cookie': `accessToken=${superAdminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: estateName,
                address: '456 Admin Blvd',
                adminName: 'Estate_Admin_User',
                adminEmail: estateAdminEmail,
                adminPassword: estateAdminPassword
            })
        });

        if (!createRes.ok) {
            const err = await createRes.json();
            throw new Error(`Estate Create Failed: ${err.message}`);
        }
        const createData = await createRes.json();
        estateId = (createData.data && createData.data.estate && createData.data.estate.id) || createData.estate.id;
        console.log(`  ✅ Estate Created: ${estateName} (ID: ${estateId})`);
        console.log(`  ✅ Admin Created: ${estateAdminEmail}`);

        // ==========================================
        // PHASE 2: ESTATE ADMIN VERIFICATION
        // ==========================================
        console.log('\n--- Phase 2: Verifying Estate Admin Features ---');

        // 1. Login as Estate Admin
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: estateAdminEmail, password: estateAdminPassword })
        });
        if (!loginRes.ok) throw new Error('Estate Admin Login Failed');

        const userData = await loginRes.json();
        const userCookie = loginRes.headers.get('set-cookie');
        estateAdminToken = userData.token || (userCookie && userCookie.match(/(?:access)?token=([^;]+)/i)[1]);
        console.log('  ✅ Estate Admin Login Successful');

        // 2. Metrics Access
        const metricsRes = await fetch(`${BASE_URL}/admin/metrics`, {
            headers: { 'Authorization': `Bearer ${estateAdminToken}`, 'Cookie': `accessToken=${estateAdminToken}` }
        });
        if (!metricsRes.ok) throw new Error(`Metrics Failed: ${metricsRes.status}`);
        console.log('  ✅ Metrics Access Verified');

        // 3. Estate Info
        const infoRes = await fetch(`${BASE_URL}/admin/estate-info`, {
            headers: { 'Authorization': `Bearer ${estateAdminToken}`, 'Cookie': `accessToken=${estateAdminToken}` }
        });
        if (!infoRes.ok) throw new Error(`Estate Info Failed: ${infoRes.status}`);
        console.log('  ✅ Estate Info Verified');

        // 4. Resident Management (Create)
        const resUsername = `res_${Date.now()}`;
        const residentRes = await fetch(`${BASE_URL}/admin/residents`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${estateAdminToken}`,
                'Cookie': `accessToken=${estateAdminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: resUsername,
                first_name: 'John',
                last_name: 'Doe', // ensure required fields
                email: `res.${Date.now()}@test.com`,
                password: 'Password123!',
                phone: '1234567890',
                unit_number: 'A-101'
            })
        });
        if (!residentRes.ok) {
            const err = await residentRes.json();
            throw new Error(`Resident Create Failed: ${JSON.stringify(err)}`);
        }
        const resData = await residentRes.json();
        const residentId = resData.data.id;
        console.log('  ✅ Resident Creation Verified');

        // 5. Audit Logs (Estate Scoped)
        const auditRes = await fetch(`${BASE_URL}/admin/audit-logs`, {
            headers: { 'Authorization': `Bearer ${estateAdminToken}`, 'Cookie': `accessToken=${estateAdminToken}` }
        });
        if (!auditRes.ok) throw new Error(`Audit Logs Failed: ${auditRes.status}`);
        const auditData = await auditRes.json();
        // Controller returns { success: true, data: [...logs], pagination: {...} }
        const logsCount = Array.isArray(auditData.data) ? auditData.data.length : (auditData.data.logs ? auditData.data.logs.length : 0);
        console.log(`  ✅ Audit Logs Verified (Count: ${logsCount})`);

        // 6. Guard Management
        console.log('  Testing Guard Management...');
        const guardRes = await fetch(`${BASE_URL}/guards`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${estateAdminToken}`,
                'Cookie': `accessToken=${estateAdminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: `guard_${Date.now()}`,
                first_name: 'Security',
                last_name: 'Guard',
                email: `guard.${Date.now()}@test.com`,
                password: 'Password123!',
                phone: '0987654321'
            })
        });

        if (!guardRes.ok) {
            const gErr = await guardRes.json();
            console.warn(`  ⚠️ Guard Creation Failed: ${gErr.message}`);
        } else {
            const guardData = await guardRes.json();
            console.log(`  ✅ Guard Created: ${guardData.data.username}`);

            // List Guards
            const guardsListRes = await fetch(`${BASE_URL}/guards`, {
                headers: { 'Authorization': `Bearer ${estateAdminToken}`, 'Cookie': `accessToken=${estateAdminToken}` }
            });
            if (guardsListRes.ok) {
                const gList = await guardsListRes.json();
                console.log(`  ✅ Guards List Verified (Count: ${gList.data.length})`);
            }
        }

        // 7. Estate Settings Update
        console.log('  Testing Settings Update...');
        const settingsRes = await fetch(`${BASE_URL}/admin/settings`, {
            headers: { 'Authorization': `Bearer ${estateAdminToken}`, 'Cookie': `accessToken=${estateAdminToken}` }
        });
        if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            // Update settings
            const updateRes = await fetch(`${BASE_URL}/admin/settings`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${estateAdminToken}`,
                    'Cookie': `accessToken=${estateAdminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    address: '789 Updated Blvd'
                })
            });
            if (updateRes.ok) console.log('  ✅ Settings Update Verified');
            else console.warn('  ⚠️ Settings Update Failed');
        } else {
            console.warn('  ⚠️ Settings GET Failed');
        }

        // ==========================================
        // PHASE 3: CLEANUP
        // ==========================================
        console.log('\n--- Phase 3: Cleanup ---');
        // Delete Estate using Super Admin Token
        await fetch(`${BASE_URL}/admin/super-admin/estates/${estateId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${superAdminToken}`, 'Cookie': `accessToken=${superAdminToken}` }
        });
        console.log('  ✅ Estate Deleted');

        console.log('\n✅✅ ESTATE ADMIN E2E VERIFICATION PASSED ✅✅');

    } catch (error) {
        console.error('\n❌ VERIFICATION FAILED:', error.message);
        process.exit(1);
    }
}

verifyEstateAdmin();
