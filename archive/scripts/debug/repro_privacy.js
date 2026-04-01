
import { dbManager } from '../src/database/db.enhanced.js';
import { createVisitor, getMyVisitors } from '../src/controllers/visitorInviteController.js';
import { getActiveVisitors } from '../src/controllers/visitorAdminController.js';
import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';

// Mock Auth Middleware
const mockAuth = (role, email, estateId) => (req, res, next) => {
    req.user = { id: 999, email, role, estate_id: estateId };
    next();
};

async function runReproduction() {
    console.log('--- Privacy Issue Reproduction ---');
    try {
        await dbManager.initializeAsync();
    } catch (e) {
        console.error('DB Init prevented/failed (might be already initialized):', e.message);
    }

    // 1. Setup Test Data
    const timestamp = Date.now();
    const residentEmail = `res_${timestamp}@test.com`;
    const guardEmail = `guard_${timestamp}@test.com`;
    const estateId = 1; // Assuming estate 1 exists from seed

    try {
        // Create Resident
        const resUser = await dbManager.query(
            `INSERT INTO users (username, email, password_hash, role, estate_id, unit_number)
       VALUES ($1, $2, 'hash', 'resident', $3, 'A101') RETURNING id`,
            [`Res ${timestamp}`, residentEmail, estateId]
        );
        // Create Guard
        const guardUser = await dbManager.query(
            `INSERT INTO users (username, email, password_hash, role, estate_id)
         VALUES ($1, $2, 'hash', 'guard', $3) RETURNING id`,
            [`Guard ${timestamp}`, guardEmail, estateId]
        );

        console.log('Users created.');

        // 2. Create a "Private" Visitor as Resident
        // We'll mock the request/response for createVisitor controller
        const reqCreate = {
            user: { email: residentEmail, role: 'resident', estate_id: estateId },
            body: {
                name: `Private Guest ${timestamp}`,
                phone: '+254700000000',
                dateOfVisit: new Date().toISOString().split('T')[0],
                isPrivate: true, // THE KEY FLAG
                status: 'pending' // Unconfirmed/Pending
            },
            audit: () => { }
        };

        let visitorId;

        // Let's insert the visitor directly to ensure exact state for "Pending" and "Private"
        const vRes = await dbManager.query(
            `INSERT INTO visitors (
          name, phone, email, purpose, date_of_visit, 
          resident_id, host_id, estate_id, 
          status, is_private, created_at, invite_code
        ) VALUES ($1, $2, $3, 'Visit', NOW(), $4, $4, $5, 'pending', true, NOW(), $6)
        RETURNING id`,
            [`Private Guest ${timestamp}`, '+254711111111', 'test@test.com', resUser.rows[0].id, estateId, `INV${timestamp}`]
        );
        visitorId = vRes.rows[0].id;
        console.log(`Created Private Visitor: ${visitorId}`);

        // 3. Act as Guard: Search for this visitor (Manual Check)
        // using getMyVisitors (mapped to GET /api/visitors)

        const app = express();
        app.use(bodyParser.json());

        // Mock Respond Middleware to capture output
        app.use((req, res, next) => {
            res.respond = (data, code = 200) => res.status(code).json({ success: true, data });
            next();
        });

        app.get('/api/visitors', mockAuth('guard', guardEmail, estateId), getMyVisitors);

        // Run the request via supertest
        const response = await request(app)
            .get('/api/visitors')
            .query({ search: `Private Guest ${timestamp}` });

        console.log('--- Results ---');
        if (response.body.data && response.body.data.visitors) {
            // Look for our specific visitor
            const found = response.body.data.visitors.find(v => v.id === visitorId);

            if (found) {
                console.log(`[FAIL] Guard found private visitor: "${found.name}" (Should be masked or hidden)`);
                console.log(`       Status: ${found.status}`);
                console.log(`       Is Private: ${found.is_private}`);

                if (found.name === `Private Guest ${timestamp}`) {
                    console.log('       STATUS: PRIVACY LEAK CONFIRMED (Name is visible)');
                } else {
                    console.log('       STATUS: PASSED (Name is masked)');
                }
            } else {
                console.log('[PASS] Visitor not found in search (This is also acceptable if private visitors are hidden from search completely).');
            }
        } else {
            console.log('Unexpected response structure:', response.body);
        }

        // Clean up
        await dbManager.query('DELETE FROM visitors WHERE id = $1', [visitorId]);
        await dbManager.query('DELETE FROM users WHERE id IN ($1, $2)', [resUser.rows[0].id, guardUser.rows[0].id]);

    } catch (err) {
        console.error('Reproduction failed:', err);
    } finally {
        process.exit();
    }
}

runReproduction();
