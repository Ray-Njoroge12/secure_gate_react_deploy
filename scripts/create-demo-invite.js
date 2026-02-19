import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', 'secure-gate-access', 'server', '.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function createDemoInvite() {
    try {
        // 1. Get resident ID for resident1@securegate.com
        const residentRes = await pool.query("SELECT id, estate_id FROM users WHERE email = 'resident1@securegate.com'");
        if (residentRes.rows.length === 0) {
            console.error('Resident not found');
            return;
        }
        const residentId = residentRes.rows[0].id;
        const estateId = residentRes.rows[0].estate_id;

        // 2. Insert a fresh visitor with a 1-year expiry to ensure no demo lag/expiry issues
        const inviteCode = 'demo_unstoppable_2026';
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        // Delete any existing demo invite with this code to avoid conflict
        await pool.query("DELETE FROM visitors WHERE invite_code = $1", [inviteCode]);

        const result = await pool.query(`
      INSERT INTO visitors (
        name, phone, email, purpose, status, host_id, estate_id, 
        invite_code, token_expires_at, date_of_visit, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING invite_code, id
    `, [
            'Demo Guest',
            '+254700000000',
            'demo.guest@example.com',
            'Demo Visit',
            'pending', // important to allow registration
            residentId,
            estateId,
            inviteCode,
            expiryDate,
            new Date()
        ]);

        console.log(`--- DEMO INVITE CREATED ---`);
        console.log(`INVITE_CODE: ${result.rows[0].invite_code}`);
        console.log(`URL: http://localhost:3000/invite/${result.rows[0].invite_code}`);
        console.log(`--------------------------`);

    } catch (err) {
        console.error('Database Error:', err);
    } finally {
        await pool.end();
    }
}

createDemoInvite();
