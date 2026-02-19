
import { dbManager } from '../src/database/db.enhanced.js';
import { getMyVisitors } from '../src/controllers/visitorInviteController.js';
import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';

// Mock Auth
const mockAuth = (role, email, estateId) => (req, res, next) => {
    req.user = { id: 999, email, role, estate_id: estateId };
    next();
};

async function runHistoryRepro() {
    console.log('--- Manual Check Scope/History Reproduction ---');
    try {
        await dbManager.initializeAsync();
    } catch (e) {
        console.log('DB init hook (ignoring if active)');
    }

    const timestamp = Date.now();
    const guardEmail = `guard_hist_${timestamp}@test.com`;
    const estateId = 1;

    try {
        // 1. Create Guard (Schema Fix: No status column)
        await dbManager.query(
            `INSERT INTO users (username, email, password_hash, role, estate_id)
         VALUES ($1, $2, 'hash', 'guard', $3)`,
            [`Guard ${timestamp}`, guardEmail, estateId]
        );

        // 2. Create Expired Visitor (e.g., visited last month)
        // We explicitly set token_expires_at to PAST and status to EXPIRED or CHECKED_OUT
        // Also ensuring no active status
        const expiredName = `Old Visitor ${timestamp}`;
        const vRes = await dbManager.query(
            `INSERT INTO visitors (
          name, phone, email, purpose, date_of_visit, 
          resident_id, host_id, estate_id, 
          status, visitor_token, token_expires_at, 
          invite_code, created_at
        ) VALUES ($1, $2, $3, 'Old Visit', NOW() - INTERVAL '30 days', 999, 999, $4, 'expired', 'token_old', NOW() - INTERVAL '29 days', 'old_code', NOW() - INTERVAL '30 days')
        RETURNING id`,
            [expiredName, '+254700000000', 'old@test.com', estateId]
        );
        const expiredId = vRes.rows[0].id;
        console.log(`Created Expired Visitor: ${expiredId} (${expiredName})`);

        // 3. Act as Guard
        const app = express();
        app.use(bodyParser.json());
        app.use((req, res, next) => {
            res.respond = (data, code = 200) => res.status(code).json({ success: true, data });
            next();
        });
        app.get('/api/visitors', mockAuth('guard', guardEmail, estateId), getMyVisitors);

        // Test Search for the old name
        const response = await request(app)
            .get('/api/visitors')
            .query({ search: expiredName });

        console.log('--- Results ---');
        if (response.body.data && response.body.data.visitors) {
            const found = response.body.data.visitors.find(v => v.id === expiredId);
            if (found) {
                console.log(`[FAIL] Guard sees expired history: "${found.name}" from ${found.date_of_visit}`);
                console.log(`       Status: ${found.status}`);
                console.log(`       Outcome: History LEAK CONFIRMED.`);
            } else {
                console.log('[PASS] Expired visitor NOT found in search.');
            }
        } else {
            console.log('Unexpected response:', response.body);
        }

        // Clean up
        await dbManager.query('DELETE FROM visitors WHERE id = $1', [expiredId]);
        await dbManager.query('DELETE FROM users WHERE email = $1', [guardEmail]);

    } catch (err) {
        console.error('Repro failed:', err);
    } finally {
        process.exit();
    }
}

runHistoryRepro();
