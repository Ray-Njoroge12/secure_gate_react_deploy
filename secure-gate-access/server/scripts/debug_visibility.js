
import { dbManager } from '../src/database/db.enhanced.js';

async function debugDataVisibility() {
    console.log('--- Debugging Data Visibility ---');
    try {
        await dbManager.initializeAsync();
    } catch (e) {
        console.log('DB init hook (ignoring)');
    }

    try {
        // 1. Check Guard User
        const guardRes = await dbManager.query(`SELECT id, username, email, estate_id FROM users WHERE email = 'verify_guard@test.com'`);
        const guard = guardRes.rows[0];

        if (!guard) {
            console.log('❌ Guard user NOT FOUND');
            return;
        }
        console.log(`👮 Guard: ${guard.username} (ID: ${guard.id})`);
        console.log(`   Estate ID: ${guard.estate_id}`);

        // 2. Check Visitors created by Seed Script
        const visitorsRes = await dbManager.query(
            `SELECT id, name, status, estate_id, check_in_time 
         FROM visitors 
         WHERE email IN ('manuela@check.com', 'victor@active.com', 'patricia@private.com', 'harry@history.com')`
        );

        console.log(`\n📋 Seeded Visitors Found: ${visitorsRes.rows.length}`);

        visitorsRes.rows.forEach(v => {
            const match = v.estate_id === guard.estate_id ? '✅ MATCH' : '❌ MISMATCH';
            console.log(`   - ${v.name} (${v.status}): Estate ${v.estate_id} [${match}]`);
        });

        // 3. Simulate Active Visitors Query
        console.log('\n🔍 Simulating getActiveVisitors Query for Guard...');
        if (guard.estate_id) {
            const query = `
          SELECT id, name, status 
          FROM visitors 
          WHERE estate_id = $1 AND status = 'on_premise'
        `;
            const activeRes = await dbManager.query(query, [guard.estate_id]);
            console.log(`   Found ${activeRes.rows.length} active visitors for Estate ${guard.estate_id}:`);
            activeRes.rows.forEach(r => console.log(`     - ${r.name} (${r.status})`));
        } else {
            console.log('   Skipping query (No Estate ID for Guard)');
        }

    } catch (err) {
        console.error('Debug failed:', err);
    } finally {
        process.exit();
    }
}

debugDataVisibility();
