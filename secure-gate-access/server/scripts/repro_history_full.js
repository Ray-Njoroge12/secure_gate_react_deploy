
import { dbManager } from '../src/database/db.enhanced.js';
import { getVisitorHistory } from '../src/controllers/visitorAdminController.js';
import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';

// Mock Auth
const mockAuth = (role, email, estateId) => (req, res, next) => {
    req.user = { id: 999, email, role, estate_id: estateId };
    next();
};

async function runHistoryScopeRepro() {
    console.log('--- Visitor History Scope & Privacy Reproduction ---');
    try {
        await dbManager.initializeAsync();
    } catch (e) {
        console.log('DB init hook (ignoring)');
    }

    const timestamp = Date.now();
    const guardEmail = `guard_scope_${timestamp}@test.com`;
    const estateId = 1;
    const idsToDelete = [];

    try {
        // 1. Create Test Visitors with UNIQUE Invite Codes

        // A. Pending Visitor (Should be HIDDEN)
        const pendingName = `Pending Scope ${timestamp}`;
        const uniqueSuffix = timestamp.toString().slice(-6);

        const resA = await dbManager.query(
            `INSERT INTO visitors (name, phone, email, purpose, date_of_visit, resident_id, host_id, estate_id, status, is_private, invite_code, created_at)
         VALUES ($1, $2, $3, 'Scope Test', NOW(), 999, 999, $4, 'pending', false, $5, NOW())
         RETURNING id`,
            [pendingName, '+254700000001', 'pending@scope.com', estateId, `PEND${uniqueSuffix}`]
        );
        const pendingId = resA.rows[0].id;
        idsToDelete.push(pendingId);
        console.log(`Created Pending Visitor: ${pendingId} (${pendingName})`);

        // B. Checked-Out Private Visitor (Should be VISIBLE & MASKED)
        const privateName = `Private Scope ${timestamp}`;
        const resB = await dbManager.query(
            `INSERT INTO visitors (name, phone, email, purpose, date_of_visit, resident_id, host_id, estate_id, status, is_private, invite_code, created_at, check_in_time, check_out_time)
         VALUES ($1, $2, $3, 'Scope Test', NOW(), 999, 999, $4, 'checked_out', true, $5, NOW(), NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour')
         RETURNING id`,
            [privateName, '+254700000002', 'private@scope.com', estateId, `PRIV${uniqueSuffix}`]
        );
        const privateId = resB.rows[0].id;
        idsToDelete.push(privateId);
        console.log(`Created Checked-Out Private Visitor: ${privateId} (${privateName})`);

        // 2. Controller Harness
        let capturedData = null;
        const req = {
            user: { id: 999, email: guardEmail, role: 'guard', estate_id: estateId },
            query: {
                start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            },
            params: {},
            audit: async () => { }
        };
        const res = {
            status: (code) => res, // ignore status
            json: (d) => {
                capturedData = d;
                return res;
            },
        };

        console.log('Invoking controller...');
        await getVisitorHistory(req, res);

        if (capturedData) {
            let list = [];
            if (Array.isArray(capturedData)) list = capturedData;
            else if (capturedData.data && Array.isArray(capturedData.data)) list = capturedData.data;
            else if (capturedData.visitors && Array.isArray(capturedData.visitors)) list = capturedData.visitors;
            else list = capturedData;

            console.log(`Received ${list ? list.length : 0} records.`);

            if (list) {
                // Check Pending (Should FAIL to find)
                const foundPending = list.find(v => v.id === pendingId);
                if (foundPending) {
                    console.log(`[FAIL] Pending visitor found in history! Scope incorrect.`);
                } else {
                    console.log(`[PASS] Pending visitor NOT found (Correct Scope).`);
                }

                // Check Private (Should PASS to find & Check Mask)
                const foundPrivate = list.find(v => v.id === privateId);
                if (foundPrivate) {
                    console.log(`[PASS] Private checked-out visitor found.`);
                    if (foundPrivate.visitorName === 'Private Guest') {
                        console.log(`[PASS] Name is correctly masked: "${foundPrivate.visitorName}"`);
                    } else {
                        console.log(`[FAIL] Name NOT masked: "${foundPrivate.visitorName}"`);
                    }
                } else {
                    console.log(`[FAIL] Checked-out visitor NOT found in history.`);
                }
            }
        } else {
            console.log('No data captured from controller.');
        }

        // Clean up
        for (const id of idsToDelete) {
            await dbManager.query('DELETE FROM visitors WHERE id = $1', [id]);
        }
        await dbManager.query('DELETE FROM users WHERE email = $1', [guardEmail]);

    } catch (err) {
        console.error('Repro failed:', err);
    } finally {
        process.exit();
    }
}

runHistoryScopeRepro();
