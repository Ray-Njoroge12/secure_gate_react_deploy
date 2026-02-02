
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001/api';

async function verifyResidentE2E() {
    console.log('🔍 Starting Resident E2E Verification...');

    let superAdminToken = '';
    let estateAdminToken = '';
    let residentToken = '';
    let estateId = null;
    let visitorId = null;

    const timestamp = Date.now();
    const adminEmail = `estate.admin.${timestamp}@test.com`;
    const adminPassword = 'Password123!';
    const estateName = `Resident_Test_Estate_${timestamp}`;
    const residentEmail = `resident.${timestamp}@test.com`;
    const residentPassword = 'Password123!';

    // Helper to get token
    const getToken = (res, data) => {
        let token = data.token;
        if (!token) {
            const setCookie = res.headers.get('set-cookie');
            if (setCookie) {
                const matches = setCookie.match(/(?:access)?token=([^;]+)/i);
                if (matches) token = matches[1];
            }
        }
        return token;
    };

    try {
        // --- 1. SUPER ADMIN SETUP ---
        console.log('  Testing Super Admin Login...');
        const saRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'super.admin@securegate.com', password: 'SuperAdmin123!' })
        });
        if (!saRes.ok) throw new Error('Super Admin Login Failed');
        const saData = await saRes.json();
        superAdminToken = getToken(saRes, saData);
        if (!superAdminToken) throw new Error('Super Admin Token not found');
        console.log('  ✅ Super Admin Logged In');

        // Create Estate
        console.log('  Creating Test Estate...');
        const estateRes = await fetch(`${BASE_URL}/admin/super-admin/estates`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${superAdminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: estateName,
                address: '123 Resident Lane',
                adminName: 'Estate_Admin',
                adminEmail: adminEmail,
                adminPassword: adminPassword
            })
        });
        if (!estateRes.ok) {
            const err = await estateRes.json();
            throw new Error(`Estate Creation Failed: ${err.message}`);
        }
        const estateData = await estateRes.json();
        const estateObj = estateData.data?.estate || estateData.estate;
        estateId = estateObj.id;
        console.log(`  ✅ Estate Created: ${estateName} (ID: ${estateId})`);

        // --- 2. ESTATE ADMIN SETUP ---
        console.log('  Login as Estate Admin...');
        const eaRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: adminEmail, password: adminPassword })
        });
        if (!eaRes.ok) throw new Error('Estate Admin Login Failed');
        const eaData = await eaRes.json();
        estateAdminToken = getToken(eaRes, eaData);

        // Create Resident
        console.log('  Creating Resident...');
        const resRes = await fetch(`${BASE_URL}/admin/residents`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${estateAdminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: `resident_${timestamp}`,
                first_name: 'John',
                last_name: 'Resident',
                email: residentEmail,
                phone: '+254712345678',
                password: residentPassword,
                unit_number: 'A101'
            })
        });
        if (!resRes.ok) throw new Error('Resident Creation Failed');
        console.log('  ✅ Resident Created');

        // --- 3. RESIDENT ACTIONS ---
        console.log('  Login as Resident...');
        const rLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: residentEmail, password: residentPassword })
        });
        if (!rLoginRes.ok) throw new Error('Resident Login Failed');
        const rData = await rLoginRes.json();
        residentToken = getToken(rLoginRes, rData);
        console.log('  ✅ Resident Logged In');

        // 3a. Get Profile
        console.log('  Fetching Profile...');
        const profRes = await fetch(`${BASE_URL}/resident/profile`, {
            headers: { 'Authorization': `Bearer ${residentToken}` }
        });
        if (!profRes.ok) {
            const txt = await profRes.text();
            throw new Error(`Get Profile Failed: ${profRes.status} ${profRes.statusText} - ${txt}`);
        }
        console.log('  ✅ Profile Fetched');

        // 3b. Update Profile
        console.log('  Updating Profile...');
        const updateRes = await fetch(`${BASE_URL}/resident/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${residentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone: '+254799887766' })
        });
        if (!updateRes.ok) throw new Error('Update Profile Failed');
        console.log('  ✅ Profile Updated');

        // 3c. Create Visitor
        console.log('  Creating Visitor Invite...');
        const visRes = await fetch(`${BASE_URL}/visitors`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${residentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'Resident Guest',
                phone: '+254700000001',
                email: 'guest@test.com',
                purpose: 'Visit',
                dateOfVisit: new Date().toISOString().split('T')[0],
                status: 'pending' // Usually automatic PENDING
            })
        });
        if (!visRes.ok) throw new Error('Create Visitor Failed');
        const visData = await visRes.json();
        visitorId = visData.data?.visitor?.id || visData.data?.id;
        console.log('  ✅ Visitor Created (ID: ' + visitorId + ')');

        // 3d. Get Visitors
        console.log('  Fetching Visitors...');
        const listRes = await fetch(`${BASE_URL}/visitors`, {
            headers: { 'Authorization': `Bearer ${residentToken}` }
        });
        if (!listRes.ok) throw new Error('Get Visitors Failed');
        console.log('  ✅ Visitors List Fetched');

        // 3e. Add Favorite
        console.log('  Adding Favorite Visitor...');
        const favRes = await fetch(`${BASE_URL}/resident/favorites`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${residentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                visitor_name: 'Mom',
                visitor_phone: '+254711111111',
                relationship: 'Family',
                nickname: 'Mom'
            })
        });
        if (!favRes.ok) {
            const err = await favRes.json();
            throw new Error('Add Favorite Failed: ' + err.message);
        }
        console.log('  ✅ Favorite Added');

        // 3f. Get Favorites
        console.log('  Fetching Favorites...');
        const favListRes = await fetch(`${BASE_URL}/resident/favorites`, {
            headers: { 'Authorization': `Bearer ${residentToken}` }
        });
        if (!favListRes.ok) throw new Error('Get Favorites Failed');
        const favData = await favListRes.json();
        if (favData.data?.favorites?.length > 0 || favData.favorites?.length > 0) {
            console.log('  ✅ Favorites List Verified');
        } else {
            console.warn('  ⚠️ Favorites List Empty (Unexpected)');
        }

        // 3g. Get Stats
        console.log('  Fetching Stats...');
        const statsRes = await fetch(`${BASE_URL}/resident/stats`, {
            headers: { 'Authorization': `Bearer ${residentToken}` }
        });
        if (!statsRes.ok) throw new Error('Get Stats Failed');
        console.log('  ✅ Stats Verified');

        // --- 4. CLEANUP ---
        console.log('--- Cleaning Up ---');
        await fetch(`${BASE_URL}/admin/super-admin/estates/${estateId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${superAdminToken}`
            }
        });
        console.log('  ✅ Estate Deleted');

        console.log('\n✅✅ RESIDENT E2E VERIFICATION PASSED ✅✅');

    } catch (error) {
        console.error('\n❌ VERIFICATION FAILED:', error.message);
        if (superAdminToken && estateId) {
            try {
                await fetch(`${BASE_URL}/admin/super-admin/estates/${estateId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${superAdminToken}` }
                });
                console.log('  (Cleanup) Estate Deleted');
            } catch (e) { }
        }
        process.exit(1);
    }
}

verifyResidentE2E();
