/**
 * Credential Verification Script
 * Tests all seeded user credentials to ensure they work correctly
 */


const API_URL = 'http://127.0.0.1:3001';

const testUsers = [
    {
        role: 'Super Admin',
        email: 'superadmin@securegate.com',
        password: 'SuperAdmin123!',
        username: 'superadmin'
    },
    {
        role: 'Admin',
        email: 'admin@securegate.com',
        password: 'AdminPass123!',
        username: 'admin'
    },
    {
        role: 'Guard',
        email: 'guard1@securegate.com',
        password: 'GuardPass123!',
        username: 'guard1'
    },
    {
        role: 'Resident',
        email: 'resident1@securegate.com',
        password: 'ResidentPass123!',
        username: 'resident1'
    }
];

async function testLogin(user) {
    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: user.email,
                password: user.password
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log(`✅ ${user.role} (${user.username}): Login successful`);
            console.log(`   - Estate ID: ${data.user?.estate_id || 'N/A'}`);
            console.log(`   - Role: ${data.user?.role}`);
            return { success: true, user: data.user };
        } else {
            console.log(`❌ ${user.role} (${user.username}): Login failed`);
            console.log(`   - Error: ${data.error || 'Unknown error'}`);
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.log(`❌ ${user.role} (${user.username}): Connection error`);
        console.log(`   - Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function testAllCredentials() {
    console.log('==========================================');
    console.log('🔐 CREDENTIAL VERIFICATION TEST');
    console.log('==========================================\n');

    const results = [];

    for (const user of testUsers) {
        const result = await testLogin(user);
        results.push({ ...user, ...result });
        console.log(''); // Empty line for readability
    }

    console.log('==========================================');
    console.log('📊 SUMMARY');
    console.log('==========================================');

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`✅ Successful: ${successful}/${testUsers.length}`);
    console.log(`❌ Failed: ${failed}/${testUsers.length}`);

    if (failed > 0) {
        console.log('\n⚠️  Failed credentials:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`   - ${r.role} (${r.username}): ${r.error}`);
        });
    }

    console.log('\n==========================================\n');

    process.exit(failed > 0 ? 1 : 0);
}

testAllCredentials();
