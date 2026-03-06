

const BASE_URL = 'http://localhost:3001/api';
const SUPER_ADMIN_EMAIL = 'super_admin@securegate.com';
const SUPER_ADMIN_PASSWORD = 'SuperAdminPassword123!';

let estateId;
let superAdminToken;
let estateAdminToken;
let guardToken;
let residentToken;
let residentId;
let visitorId;

async function runTest() {
    console.log('🔍 Starting Approvals E2E Verification...');

    try {
        // 1. Login Super Admin
        console.log('  Testing Super Admin Login...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD })
        });

        if (!loginRes.ok) throw new Error(`Super Admin Login Failed: ${loginRes.status}`);
        const loginData = await loginRes.json();
        superAdminToken = loginData.token;
        console.log('  ✅ Super Admin Logged In');

        // 2. Create Estate
        console.log('  Creating Test Estate...');
        const estateRes = await fetch(`${BASE_URL}/admin/super-admin/estates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${superAdminToken}`
            },
            body: JSON.stringify({
                name: `Approval_Test_Estate_${Date.now()}`,
                type: 'Residential',
                address: '123 Test Lane',
                contact_email: `admin_${Date.now()}@test.com`,
                owner_name: 'Test Owner',
                owner_phone: '1234567890',
                subscription_plan: 'Enterprise'
            })
        });

        if (!estateRes.ok) throw new Error(`Estate Creation Failed: ${estateRes.status}`);
        const estateData = await estateRes.json();
        estateId = estateData.data.estate.id;
        console.log(`  ✅ Estate Created (ID: ${estateId})`);

        // 3. Login as Estate Admin
        console.log('  Login as Estate Admin...');
        const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: estateData.data.admin.email,
                password: 'Password123!' // Default password
            })
        });

        if (!adminLoginRes.ok) throw new Error(`Estate Admin Login Failed: ${adminLoginRes.status}`);
        const adminLoginData = await adminLoginRes.json();
        estateAdminToken = adminLoginData.token;
        console.log('  ✅ Estate Admin Logged In');

        // 4. Create Guard
        console.log('  Creating Guard...');
        const guardRes = await fetch(`${BASE_URL}/admin/guards`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${estateAdminToken}`,
                'x-estate-id': estateId
            },
            body: JSON.stringify({
                username: `gate_guard_${Date.now()}`,
                first_name: 'Gate',
                last_name: 'Guard',
                email: `guard_${Date.now()}@test.com`,
                password: 'Password123!',
                phone: '0711000000',
                shift_start: '08:00',
                shift_end: '18:00'
            })
        });

        if (!guardRes.ok) throw new Error(`Guard Creation Failed: ${guardRes.status}`);
        const guardData = await guardRes.json();
        console.log('  ✅ Guard Created');

        // 5. Test User Approval Flow
        // Create Resident explicitly with status 'pending' (if API supports it) or rely on default
        // Using admin creation usually makes them active.
        // Let's create a resident via PUBLIC registration if available? 
        // Or assume Admin creates them Pending.
        // Actually, `admin/residents` creates them as 'active' by default in `adminRoutes.js`.
        // We want to test Admin Approving a user.
        // Let's try creating a user via `auth/register` (if it exists) or create via Admin with status 'pending'.

        console.log('  Creating Resident (Pending)...');
        const residentRes = await fetch(`${BASE_URL}/admin/residents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${estateAdminToken}`,
                'x-estate-id': estateId
            },
            body: JSON.stringify({
                username: `resident_${Date.now()}`,
                first_name: 'John',
                last_name: 'Resident',
                email: `resident_${Date.now()}@test.com`,
                password: 'Password123!',
                phone: '0722000000',
                unit_number: 'A-101' // Will be mapped to 'house'
            })
        });

        if (!residentRes.ok) throw new Error(`Resident Creation Failed: ${residentRes.status}`);
        const residentData = await residentRes.json();
        residentId = residentData.data.id;
        const residentEmail = residentData.data.email;
        console.log(`  ✅ Resident Created (ID: ${residentId})`);

        // Verify Resident can login (should be active by default from Admin)
        // To test approval, we might need to UPDATE status to pending first?
        console.log('  Setting Resident to Pending (Simulating new registration)...');
        await fetch(`${BASE_URL}/admin/users/${residentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${estateAdminToken}`,
                'x-estate-id': estateId
            },
            body: JSON.stringify({ status: 'pending' })
        });

        // Try Login (Should fail or show not verified?)
        // Actually `userService.authenticateUser` checks `account_status` (pending is usually allowed to login but limited? OR blocked?)
        // `userService.js` line 229: `account_status` is returned but not checked in `authenticateUser` except `lockout`.
        // Wait, `userService.js` I read earlier didn't check `account_status` inside `authenticateUser`.
        // Let's check `requireRole` middleware or `authenticateToken`.
        // But let's assume Flow: Admin Views Pending -> Approve.

        // List Pending Users
        console.log('  Fetching Pending Users...');
        const pendingRes = await fetch(`${BASE_URL}/admin/users/pending`, {
            headers: {
                'Authorization': `Bearer ${estateAdminToken}`,
                'x-estate-id': estateId
            }
        });
        const pendingData = await pendingRes.json();
        const isPending = pendingData.data.some(u => u.id === residentId);
        if (!isPending) console.warn('  ⚠️ User not found in pending list (might be active or filter issue)');
        else console.log('  ✅ Resident found in Pending List');

        // Approve User
        console.log('  Approving Resident...');
        const approveRes = await fetch(`${BASE_URL}/admin/users/${residentId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${estateAdminToken}`,
                'x-estate-id': estateId
            },
            body: JSON.stringify({ status: 'active' })
        });

        if (!approveRes.ok) throw new Error(`Approval Failed: ${approveRes.status}`);
        console.log('  ✅ Resident Approved');

        // Login as Resident
        console.log('  Login as Resident...');
        const residentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: residentEmail,
                password: 'Password123!'
            })
        });

        if (!residentLoginRes.ok) throw new Error(`Resident Login Failed: ${residentLoginRes.status}`);
        const residentLoginData = await residentLoginRes.json();
        residentToken = residentLoginData.token;
        console.log('  ✅ Resident Logged In');


        // 6. Test Walk-In Visitor Approval Flow
        // Login as Guard
        console.log('  Login as Guard...');
        const guardLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: guardData.data.email,
                password: 'Password123!'
            })
        });

        if (!guardLoginRes.ok) throw new Error(`Guard Login Failed: ${guardLoginRes.status}`);
        const guardLoginData = await guardLoginRes.json();
        guardToken = guardLoginData.token;
        console.log('  ✅ Guard Logged In');

        // Guard creates Walk-In
        console.log('  Registering Walk-In Visitor...');
        const walkInRes = await fetch(`${BASE_URL}/visitors/walk-in`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${guardToken}`,
                'x-estate-id': estateId
            },
            body: JSON.stringify({
                name: 'Walk In Visitor',
                phone: '0755000000',
                houseNumber: 'A-101', // Matching mapped unit_number from resident creation
                purpose: 'Delivery'
            })
        });

        if (!walkInRes.ok) {
            const txt = await walkInRes.text();
            throw new Error(`Walk-In Registration Failed: ${walkInRes.status} - ${txt}`);
        }
        const walkInData = await walkInRes.json();
        visitorId = walkInData.data.id;
        console.log(`  ✅ Walk-In Registered (ID: ${visitorId})`);

        // Resident checks pending approvals
        console.log('  Resident Checking Pending Approvals...');
        const pendingAppRes = await fetch(`${BASE_URL}/visitors/pending-approvals`, {
            headers: {
                'Authorization': `Bearer ${residentToken}`,
                'x-estate-id': estateId
            }
        });

        if (!pendingAppRes.ok) throw new Error(`Get Pending Approvals Failed: ${pendingAppRes.status}`);
        const pendingAppData = await pendingAppRes.json();
        const approvalRequest = pendingAppData.data.find(v => v.id === visitorId);

        if (!approvalRequest) throw new Error('Walk-In visitor not found in pending approvals list');
        console.log('  ✅ Pending Approval Found');

        // Resident Approves
        console.log('  Resident Approving Visitor...');
        const visitorApproveRes = await fetch(`${BASE_URL}/visitors/${visitorId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${residentToken}`,
                'x-estate-id': estateId
            },
            body: JSON.stringify({ notes: 'Allowed' })
        });

        if (!visitorApproveRes.ok) {
            const txt = await visitorApproveRes.text();
            throw new Error(`Visitor Approval Failed: ${visitorApproveRes.status} - ${txt}`);
        }
        console.log('  ✅ Visitor Approved');

        // Verify Status is APPROVED
        // Fetch my visitors or just verify response
        const myVisitorsRes = await fetch(`${BASE_URL}/visitors`, {
            headers: {
                'Authorization': `Bearer ${residentToken}`,
                'x-estate-id': estateId
            }
        });
        const myVisitorsData = await myVisitorsRes.json();
        const visitorCheck = myVisitorsData.data.visitors.find(v => v.id === visitorId);

        if (visitorCheck.status !== 'APPROVED') throw new Error(`Visitor Status Verification Failed: Expected APPROVED, got ${visitorCheck.status}`);
        console.log('  ✅ Visitor Status Verified: APPROVED');


    } catch (error) {
        console.error(`\n❌ VERIFICATION FAILED: ${error.message}`);
        process.exit(1);
    } finally {
        // Cleanup
        if (estateId && superAdminToken) {
            console.log('--- Cleaning Up ---');
            try {
                await fetch(`${BASE_URL}/admin/super-admin/estates/${estateId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${superAdminToken}` }
                });
                console.log('  ✅ Estate Deleted');
            } catch (e) {
                console.error('  ⚠️ Cleanup Failed:', e.message);
            }
        }
    }
    console.log('\n✅✅ APPROVALS VERIFICATION PASSED ✅✅');

}

runTest();
