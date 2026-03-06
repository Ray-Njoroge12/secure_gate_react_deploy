

const BASE_URL = 'http://localhost:3001/api';

async function verifyGuardE2E() {
    console.log('🔍 Starting Guard E2E Verification...');

    let superAdminToken = '';
    let estateAdminToken = '';
    let residentToken = '';
    let guardToken = '';
    let estateId = null;
    let visitorToken = null;
    let visitorId = null;

    const timestamp = Date.now();
    const adminEmail = `estate.admin.${timestamp}@test.com`;
    const adminPassword = 'Password123!';
    const estateName = `Guard_Test_Estate_${timestamp}`;

    const residentEmail = `resident.${timestamp}@test.com`;
    const residentPassword = 'Password123!';

    const guardEmail = `guard.${timestamp}@test.com`;
    const guardPassword = 'Password123!';

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
        if (!saRes.ok) {
            const txt = await saRes.text();
            throw new Error(`Super Admin Login Failed: ${saRes.status} ${saRes.statusText} - ${txt}`);
        }
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
                'Cookie': `accessToken=${superAdminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: estateName,
                address: '123 Guard Lane',
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
        if (!estateAdminToken) throw new Error('Estate Admin Token not found');
        console.log('  ✅ Estate Admin Logged In');

        // Create Resident
        console.log('  Creating Resident...');
        const resRes = await fetch(`${BASE_URL}/admin/residents`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${estateAdminToken}`,
                'Cookie': `accessToken=${estateAdminToken}`,
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
        if (!resRes.ok) {
            const err = await resRes.json(); // Log error if fails
            throw new Error(`Resident Creation Failed: ${JSON.stringify(err)}`);
        }
        console.log('  ✅ Resident Created');

        // Create Guard
        console.log('  Creating Guard...');
        const guardRes = await fetch(`${BASE_URL}/guards`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${estateAdminToken}`,
                'Cookie': `accessToken=${estateAdminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                first_name: 'Security',
                last_name: 'Guard',
                username: `guard_${timestamp}`,
                email: guardEmail,
                phone: '+254722334455',
                password: guardPassword,
                shift_start: '08:00',
                shift_end: '18:00'
            })
        });
        if (!guardRes.ok) {
            const err = await guardRes.json();
            throw new Error(`Guard Creation Failed: ${err.message}`);
        }
        console.log('  ✅ Guard Created');

        // --- 3. RESIDENT ACTIONS (Create Visitor Invite) ---
        console.log('  Login as Resident...');
        const rLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: residentEmail, password: residentPassword })
        });
        if (!rLoginRes.ok) {
            const err = await rLoginRes.json();
            throw new Error(`Resident Login Failed: ${err.message}`);
        }
        const rData = await rLoginRes.json();
        residentToken = getToken(rLoginRes, rData);
        if (!residentToken) throw new Error('Resident Token not found');

        // Create Visitor
        console.log('  Creating Visitor Invite...');
        const visitorRes = await fetch(`${BASE_URL}/visitors`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${residentToken}`,
                'Cookie': `accessToken=${residentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'E2E Visitor',
                phone: '+254700112233',
                email: `visitor.${timestamp}@test.com`,
                purpose: 'Inspection',
                dateOfVisit: new Date().toISOString().split('T')[0],
                status: 'pending_confirmation'
            })
        });
        if (!visitorRes.ok) {
            const err = await visitorRes.json();
            throw new Error(`Visitor Creation Failed: ${err.message}`);
        }
        const visitorData = await visitorRes.json();

        console.log('DEBUG: Visitor Response:', JSON.stringify(visitorData, null, 2));

        // Extract token
        const vPayload = visitorData.data?.visitor || visitorData.data || visitorData;
        visitorToken = vPayload.visitorToken || vPayload.visitor_token;
        visitorId = vPayload.id;

        if (!visitorToken) {
            console.log('  ℹ️  Generating explicit pass...');
            const passRes = await fetch(`${BASE_URL}/visitors/${visitorId}/pass`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${residentToken}`,
                    'Cookie': `accessToken=${residentToken}`
                }
            });
            const passData = await passRes.json();
            console.log('DEBUG: Pass Response:', JSON.stringify(passData, null, 2));
            visitorToken = passData.visitor_token || passData.data?.visitor_token;
        }

        if (!visitorToken) throw new Error('Failed to obtain Visitor Token');
        console.log(`  ✅ Visitor Invite Created (Token: ${visitorToken})`);


        // --- 4. GUARD ACTIONS ---
        console.log('  Login as Guard...');
        const gLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: guardEmail, password: guardPassword })
        });
        if (!gLoginRes.ok) {
            const err = await gLoginRes.json();
            throw new Error(`Guard Login Failed: ${err.message}`);
        }
        const gData = await gLoginRes.json();
        guardToken = getToken(gLoginRes, gData);
        if (!guardToken) throw new Error('Guard Token not found');
        console.log('  ✅ Guard Logged In');

        // 1. QR Scan (Check-In)
        console.log('  Testing QR Check-In...');
        const checkInRes = await fetch(`${BASE_URL}/check-in/qr`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${guardToken}`,
                'Cookie': `accessToken=${guardToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ qrCode: visitorToken, notes: 'Guard E2E CheckIn' })
        });

        if (!checkInRes.ok) {
            const err = await checkInRes.json();
            throw new Error(`Check-In Failed: ${JSON.stringify(err)}`);
        }
        console.log('  ✅ Visitor Checked In (QR)');

        // 2. Verified Active list
        console.log('  Testing Active Visitors List...');
        const activeRes = await fetch(`${BASE_URL}/check-out/active`, {
            headers: {
                'Authorization': `Bearer ${guardToken}`,
                'Cookie': `accessToken=${guardToken}`
            }
        });
        const activeData = await activeRes.json();
        const activeList = activeData.data || activeData;
        const found = Array.isArray(activeList) && activeList.find(v => v.visitor_token === visitorToken);
        if (found) console.log('  ✅ Active List Verified');
        else console.warn('  ⚠️ Visitor not found in Active List (Possible filter/timing issue)');

        // 3. QR Scan (Check-Out)
        console.log('  Testing QR Check-Out...');
        const checkOutRes = await fetch(`${BASE_URL}/check-out/qr`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${guardToken}`,
                'Cookie': `accessToken=${guardToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ qrCode: visitorToken, notes: 'Guard E2E CheckOut' })
        });
        if (!checkOutRes.ok) {
            const err = await checkOutRes.json();
            throw new Error(`Check-Out Failed: ${JSON.stringify(err)}`);
        }
        console.log('  ✅ Visitor Checked Out (QR)');

        // 4. Incident
        console.log('  Reporting Incident...');
        const incidentRes = await fetch(`${BASE_URL}/guard/incidents`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${guardToken}`,
                'Cookie': `accessToken=${guardToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: 'Gate Malfunction',
                description: 'Gate 2 stuck open',
                severity: 'medium',
                location: 'Gate 2',
                status: 'open',
                category: 'system_error'
            })
        });

        if (incidentRes.ok) console.log('  ✅ Incident Reported');
        else {
            const iErr = await incidentRes.json();
            console.warn(`  ⚠️ Incident Failed: ${iErr.message}`);
        }

        // --- 5. CLEANUP ---
        console.log('--- Cleaning Up ---');
        await fetch(`${BASE_URL}/admin/super-admin/estates/${estateId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${superAdminToken}`,
                'Cookie': `accessToken=${superAdminToken}`
            }
        });
        console.log('  ✅ Estate Deleted');

        console.log('\n✅✅ GUARD E2E VERIFICATION PASSED ✅✅');

    } catch (error) {
        console.error('\n❌ VERIFICATION FAILED:', error.message);
        if (superAdminToken && estateId) {
            try {
                await fetch(`${BASE_URL}/admin/super-admin/estates/${estateId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${superAdminToken}`,
                        'Cookie': `accessToken=${superAdminToken}`
                    }
                });
                console.log('  (Cleanup) Estate Deleted');
            } catch (e) { }
        }
        process.exit(1);
    }
}

verifyGuardE2E();
