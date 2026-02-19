#!/usr/bin/env node
/**
 * Quick test of guard visitor-history endpoint
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';
const GUARD_CREDENTIALS = {
    email: 'guard1@securegate.com',
    password: 'GuardPass123!'
};

async function testGuardHistory() {
    console.log('🔐 Logging in as guard...');
    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(GUARD_CREDENTIALS)
    });

    if (!loginRes.ok) {
        console.log('❌ Login failed');
        return;
    }

    const cookies = loginRes.headers.get('set-cookie');
    console.log('✅ Login successful\n');

    console.log('📋 Testing /api/guard/visitor-history...');
    const historyRes = await fetch(`${API_BASE}/api/guard/visitor-history`, {
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookies || ''
        }
    });

    if (!historyRes.ok) {
        console.log(`❌ Failed: ${historyRes.status}`);
        const errorText = await historyRes.text();
        console.log(errorText);
        return;
    }

    const historyData = await historyRes.json();
    const visitors = historyData.data || [];

    console.log(`✅ Success! Returned ${visitors.length} visitors\n`);

    if (visitors.length > 0) {
        console.log('First 10 visitors:');
        visitors.slice(0, 10).forEach((v, i) => {
            console.log(`${i + 1}. ${v.visitor_name || 'Unknown'}`);
            console.log(`   Status: ${v.status}`);
            console.log(`   Check-in: ${v.check_in_time || 'N/A'}`);
            console.log(`   Check-out: ${v.check_out_time || 'N/A'}`);
            console.log(`   Resident: ${v.resident_name || 'Unknown'}\n`);
        });
    } else {
        console.log('⚠️  No visitors in history');
    }
}

testGuardHistory().catch(console.error);
