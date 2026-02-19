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

async function verifyUsers() {
    const usersToVerify = [
        'superadmin@securegate.com',
        'admin@securegate.com',
        'guard1@securegate.com',
        'resident1@securegate.com'
    ];

    console.log('--- Verifying Demo Users ---');
    try {
        for (const email of usersToVerify) {
            const res = await pool.query('SELECT username, role, verified FROM users WHERE email = $1', [email]);
            if (res.rows.length > 0) {
                console.log(`[OK] found user: ${email} (Role: ${res.rows[0].role})`);
            } else {
                console.warn(`[FAIL] user NOT found: ${email}`);
            }
        }

        // Check visitors count
        const visitorsRes = await pool.query('SELECT count(*) FROM visitors');
        console.log(`[OK] Total visitors in DB: ${visitorsRes.rows[0].count}`);

    } catch (err) {
        console.error('Error during verification:', err);
    } finally {
        await pool.end();
    }
}

verifyUsers();
