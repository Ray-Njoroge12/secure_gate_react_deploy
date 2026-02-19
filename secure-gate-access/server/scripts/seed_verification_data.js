
import { dbManager } from '../src/database/db.enhanced.js';
import bcrypt from 'bcryptjs';

async function seedVerificationData() {
    console.log('--- Seeding Functional Verification Data ---');
    try {
        await dbManager.initializeAsync();
    } catch (e) {
        console.log('DB init hook (ignoring)');
    }

    try {
        // 1. Ensure Estate
        const estateRes = await dbManager.query(`SELECT id FROM estates LIMIT 1`);
        let estateId = estateRes.rows[0]?.id;
        if (!estateId) {
            const est = await dbManager.query(`INSERT INTO estates (name, address, plan, sms_limit) VALUES ('Verify Estate', '123 Test St', 'obsidian', 1000) RETURNING id`);
            estateId = est.rows[0].id;
        }

        // 2. Create/Update Users
        const passwordHash = await bcrypt.hash('password123', 10);

        // Resident
        let resUser = await dbManager.query(`SELECT id FROM users WHERE email = 'verify_resident@test.com'`);
        let residentId = resUser.rows[0]?.id;
        if (!residentId) {
            const r = await dbManager.query(
                `INSERT INTO users (username, email, password, role, estate_id, status, phone, unit_number) 
             VALUES ('Verify Resident', 'verify_resident@test.com', $1, 'resident', $2, 'active', '+254700000001', 'A1') RETURNING id`,
                [passwordHash, estateId]
            );
            residentId = r.rows[0].id;
        } else {
            await dbManager.query(`UPDATE users SET estate_id = $1 WHERE id = $2`, [estateId, residentId]);
        }

        // Guard
        let guardUser = await dbManager.query(`SELECT id FROM users WHERE email = 'verify_guard@test.com'`);
        if (!guardUser.rows[0]) {
            await dbManager.query(
                `INSERT INTO users (username, email, password, role, estate_id, status, phone) 
             VALUES ('Verify Guard', 'verify_guard@test.com', $1, 'guard', $2, 'active', '+254700000002')`,
                [passwordHash, estateId]
            );
        } else {
            await dbManager.query(`UPDATE users SET estate_id = $1 WHERE id = $2`, [estateId, guardUser.rows[0].id]);
        }

        // 3. Create Visitors for Specific Scenarios

        // CLEANUP old test data
        await dbManager.query(`DELETE FROM visitors WHERE resident_id = $1`, [residentId]);

        const today = new Date();
        const uniqueSuffix = Date.now().toString().slice(-4);

        // Scenario 1: Manual Check Candidate (Status: Verified, Date: Today)
        // Goal: Guard Searches -> Finds -> Checks In
        await dbManager.query(
            `INSERT INTO visitors (name, phone, email, purpose, date_of_visit, resident_id, host_id, estate_id, status, is_private, invite_code, created_at)
         VALUES ($1, $2, $3, 'Manual Check Test', NOW(), $4, $4, $5, 'verified', false, $6, NOW())`,
            ['Manuela Check', '+254711000111', 'manuela@check.com', residentId, estateId, `MAN${uniqueSuffix}`]
        );
        console.log('✅ Created "Manuela Check" (Ready for Manual Check-In)');

        // Scenario 2: Active Visitor (Status: On Premise)
        // Goal: Visible in "Active Visitors" Dashboard
        await dbManager.query(
            `INSERT INTO visitors (name, phone, email, purpose, date_of_visit, resident_id, host_id, estate_id, status, is_private, invite_code, created_at, check_in_time)
         VALUES ($1, $2, $3, 'Active Test', NOW(), $4, $4, $5, 'on_premise', false, $6, NOW(), NOW() - INTERVAL '1 hour')`,
            ['Victor Active', '+254711000222', 'victor@active.com', residentId, estateId, `ACT${uniqueSuffix}`]
        );
        console.log('✅ Created "Victor Active" (Should be on Dashboard)');

        // Scenario 3: Private Active Visitor (Status: On Premise, Private)
        // Goal: Visible as "Private Guest" in Dashboard
        await dbManager.query(
            `INSERT INTO visitors (name, phone, email, purpose, date_of_visit, resident_id, host_id, estate_id, status, is_private, invite_code, created_at, check_in_time)
         VALUES ($1, $2, $3, 'Private Active Test', NOW(), $4, $4, $5, 'on_premise', true, $6, NOW(), NOW() - INTERVAL '30 minutes')`,
            ['Patricia Private', '+254711000333', 'patricia@private.com', residentId, estateId, `PRIV${uniqueSuffix}`]
        );
        console.log('✅ Created "Patricia Private" (Should be "Private Guest" on Dashboard)');

        // Scenario 4: History Record (Status: Checked Out)
        // Goal: Visible in "Visitor History" Log
        await dbManager.query(
            `INSERT INTO visitors (name, phone, email, purpose, date_of_visit, resident_id, host_id, estate_id, status, is_private, invite_code, created_at, check_in_time, check_out_time)
         VALUES ($1, $2, $3, 'History Test', NOW() - INTERVAL '1 day', $4, $4, $5, 'checked_out', false, $6, NOW() - INTERVAL '1 day', NOW() - INTERVAL '25 hours', NOW() - INTERVAL '24 hours')`,
            ['Harry History', '+254711000444', 'harry@history.com', residentId, estateId, `HIST${uniqueSuffix}`]
        );
        console.log('✅ Created "Harry History" (Should be in History Log)');

        // Scenario 5: Pending Invite (Status: Pending)
        // Goal: HIDDEN from History Log (Scope check)
        await dbManager.query(
            `INSERT INTO visitors (name, phone, email, purpose, date_of_visit, resident_id, host_id, estate_id, status, is_private, invite_code, created_at)
         VALUES ($1, $2, $3, 'Pend Test', NOW(), $4, $4, $5, 'pending', false, $6, NOW())`,
            ['Penny Pending', '+254711000555', 'penny@pending.com', residentId, estateId, `PEND${uniqueSuffix}`]
        );
        console.log('✅ Created "Penny Pending" (Should be HIDDEN from History)');

        console.log('\n--- Credentials ---');
        console.log('Guard: verify_guard@test.com / password123');
        console.log('Resident: verify_resident@test.com / password123');

    } catch (err) {
        console.error('Seeding failed:', err);
    } finally {
        process.exit();
    }
}

seedVerificationData();
