/**
 * Comprehensive Guard Data Debugging Script
 * Checks guard user permissions, estate scoping, and API access
 */

import { dbManager } from '../src/database/db.enhanced.js';

const GUARD_CREDENTIALS = {
    email: 'guard1@securegate.com',
    password: 'GuardPass123!'
};

const API_BASE = 'http://localhost:3001';

async function debugGuardData() {
    console.log('==========================================');
    console.log('🔍 GUARD DATA DEBUGGING');
    console.log('==========================================\n');

    await dbManager.initializeAsync();

    // ========== DATABASE CHECKS ==========
    console.log('📊 DATABASE CHECKS\n');

    // Check guard user
    const guardUser = await dbManager.query(`
    SELECT id, username, email, role, estate_id, verified
    FROM users 
    WHERE email = $1
  `, [GUARD_CREDENTIALS.email]);

    if (guardUser.rows.length === 0) {
        console.log('❌ Guard user not found in database!');
        return;
    }

    const guard = guardUser.rows[0];
    console.log('✅ Guard User:');
    console.log(`   - ID: ${guard.id}`);
    console.log(`   - Username: ${guard.username}`);
    console.log(`   - Email: ${guard.email}`);
    console.log(`   - Role: ${guard.role}`);
    console.log(`   - Estate ID: ${guard.estate_id}`);
    console.log(`   - Verified: ${guard.verified}\n`);

    // Check visitors for this estate
    const visitors = await dbManager.query(`
    SELECT id, name, status, created_at, estate_id
    FROM visitors
    WHERE estate_id = $1
    ORDER BY created_at DESC
    LIMIT 25
  `, [guard.estate_id]);

    console.log(`📋 Visitors in Estate ${guard.estate_id}:`);
    console.log(`   - Total (first 25): ${visitors.rows.length}`);
    if (visitors.rows.length > 0) {
        console.log('   - Latest visitors:');
        visitors.rows.slice(0, 5).forEach(v => {
            console.log(`     • ${v.name} (ID: ${v.id}, Status: ${v.status}, Created: ${v.created_at})`);
        });
    } else {
        console.log('   ⚠️  No visitors found for this estate!');
    }
    console.log();

    // Count visitors with otp_sent status
    const otpVisitors = await dbManager.query(`
    SELECT COUNT(*) as count
    FROM visitors
    WHERE estate_id = $1 AND status = 'otp_sent'
  `, [guard.estate_id]);

    console.log(`🔐 OTP-Ready Visitors: ${otpVisitors.rows[0].count}\n`);

    // ========== API CHECKS ==========
    console.log('🌐 API CHECKS\n');

    // Login as guard
    console.log('Step 1: Logging in as guard...');
    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(GUARD_CREDENTIALS)
    });

    if (!loginRes.ok) {
        console.log(`❌ Login failed: ${loginRes.status} ${loginRes.statusText}`);
        const errorText = await loginRes.text();
        console.log(`   Error: ${errorText}`);
        return;
    }

    const loginData = await loginRes.json();
    const cookies = loginRes.headers.get('set-cookie');
    console.log('✅ Login successful\n');

    // Check /api/visitors endpoint
    console.log('Step 2: Fetching /api/visitors...');
    const visitorsRes = await fetch(`${API_BASE}/api/visitors`, {
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookies || ''
        }
    });

    if (!visitorsRes.ok) {
        console.log(`❌ Failed: ${visitorsRes.status} ${visitorsRes.statusText}`);
        const errorText = await visitorsRes.text();
        console.log(`   Error: ${errorText}\n`);
    } else {
        const visitorsData = await visitorsRes.json();
        const apiVisitors = visitorsData.data?.visitors || visitorsData.data || visitorsData || [];
        console.log(`✅ API returned ${Array.isArray(apiVisitors) ? apiVisitors.length : 'invalid'} visitors`);

        if (Array.isArray(apiVisitors) && apiVisitors.length > 0) {
            console.log('   - First 5 visitors:');
            apiVisitors.slice(0, 5).forEach(v => {
                console.log(`     • ${v.name} (Status: ${v.status})`);
            });

            // Check for test visitor
            const testVisitor = apiVisitors.find(v => v.name && v.name.includes('Test Visitor'));
            if (testVisitor) {
                console.log(`\n   ✅ Test Visitor found: ${testVisitor.name} (ID: ${testVisitor.id}, Status: ${testVisitor.status})`);
            } else {
                console.log('\n   ⚠️  Test Visitor NOT in API response');
            }
        }
        console.log();
    }

    // Check visitor history endpoint
    console.log('Step 3: Fetching visitor history /api/guard/visitors/history...');
    const historyRes = await fetch(`${API_BASE}/api/guard/visitors/history?limit=20`, {
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookies || ''
        }
    });

    if (!historyRes.ok) {
        console.log(`❌ Failed: ${historyRes.status} ${historyRes.statusText}`);
        const errorText = await historyRes.text();
        console.log(`   Error: ${errorText}\n`);
    } else {
        const historyData = await historyRes.json();
        console.log('✅ History endpoint response:');
        console.log(JSON.stringify(historyData, null, 2).substring(0, 1000));
        console.log();
    }

    // Check recent visitors endpoint
    console.log('Step 4: Fetching recent visitors /api/guard/visitors/recent...');
    const recentRes = await fetch(`${API_BASE}/api/guard/visitors/recent`, {
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookies || ''
        }
    });

    if (!recentRes.ok) {
        console.log(`❌ Failed: ${recentRes.status} ${recentRes.statusText}`);
        const errorText = await recentRes.text();
        console.log(`   Error: ${errorText}\n`);
    } else {
        const recentData = await recentRes.json();
        console.log('✅ Recent visitors response:');
        console.log(JSON.stringify(recentData, null, 2).substring(0, 1000));
        console.log();
    }

    await dbManager.disconnect();
    console.log('==========================================\n');
}

debugGuardData().catch(error => {
    console.error('❌ Fatal Error:', error);
    process.exit(1);
});
