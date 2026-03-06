
const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config({ path: './server/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/secure_gate_access'
});

const API_URL = 'http://localhost:3001/api/visitors';

async function verifyInviteFlow() {
    let client;
    let inviteId;
    let inviteCode;

    try {
        console.log('🔄 Starting Invite Flow Verification...');
        client = await pool.connect();

        // Get a valid estate ID
        const estateRes = await client.query('SELECT id FROM estates LIMIT 1');
        const estateId = estateRes.rows[0]?.id;

        if (!estateId) throw new Error('No estates found in DB for testing');

        // 1. Create a Mock Invite in DB
        inviteCode = 'TEST_INV_' + Math.random().toString(36).substring(7);
        const date = new Date();
        date.setDate(date.getDate() + 1); // Tomorrow

        const insertRes = await client.query(`
      INSERT INTO visitors (name, invite_code, status, date_of_visit, token_expires_at, estate_id)
      VALUES ('Test Visitor', $1, 'pending_confirmation', $2, $3, $4)
      RETURNING id
    `, [inviteCode, date, date, estateId]);

        inviteId = insertRes.rows[0].id;
        console.log(`✅ Created mock invite: ${inviteCode} (ID: ${inviteId})`);

        // 2. Test Missing ID Number (Should Fail)
        try {
            await axios.post(`${API_URL}/complete/${inviteCode}`, {
                name: 'Test Visitor',
                phone: '0712345678',
                consent_given: true,
                // idNumber missing
            });
            console.error('❌ Failed: Server accepted request without ID Number!');
        } catch (err) {
            if (err.response && err.response.status === 400) {
                console.log('✅ Verified: Server rejected missing ID Number (400 Bad Request)');
            } else {
                console.error('❌ Unexpected error for missing ID:', err.message);
            }
        }

        // 3. Test Valid Request (Should Succeed)
        try {
            const res = await axios.post(`${API_URL}/complete/${inviteCode}`, {
                name: 'Test Visitor',
                phone: '0712345678',
                idNumber: 'ID12345678',
                consent_given: true
            });

            if (res.status === 201) {
                console.log('✅ Verified: Server accepted valid request');
                console.log('   Response includes:', Object.keys(res.data));
            }
        } catch (err) {
            console.error('❌ Failed to complete valid invite:', err.response ? err.response.data : err.message);
            throw err;
        }

        // 4. Verify DB State (QR Code & OTP)
        const visitorRes = await client.query('SELECT * FROM visitors WHERE id = $1', [inviteId]);
        const visitor = visitorRes.rows[0];

        if (visitor.qr_code) {
            console.log('✅ Verified: QR Code ID generated in DB');
        } else {
            console.error('❌ Failed: QR Code NOT generated in DB');
        }

        if (visitor.otp_hash) {
            console.log('✅ Verified: OTP Hash stored in DB');
        } else {
            console.error('❌ Failed: OTP Hash NOT stored in DB');
        }

        // Cleanup
        await client.query('DELETE FROM visitors WHERE id = $1', [inviteId]);
        console.log('🧹 Cleanup: Deleted test visitor');

    } catch (err) {
        console.error('❌ Verification Script Failed:', err);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

verifyInviteFlow();
