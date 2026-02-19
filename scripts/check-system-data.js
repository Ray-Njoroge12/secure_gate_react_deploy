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

async function checkSystemData() {
    try {
        const tables = ['users', 'visitors', 'deliveries', 'incidents', 'estates'];
        console.log('--- Current System Data Summary ---');
        for (const table of tables) {
            try {
                const res = await pool.query(`SELECT count(*) FROM ${table}`);
                console.log(`${table.padEnd(12)}: ${res.rows[0].count} records`);
            } catch (e) {
                console.warn(`${table.padEnd(12)}: Table not found or error: ${e.message}`);
            }
        }

        console.log('\n--- User Breakdown ---');
        const usersRes = await pool.query('SELECT email, role, verified FROM users');
        usersRes.rows.forEach(u => {
            console.log(`- ${u.email} (${u.role}) [Verified: ${u.verified}]`);
        });

    } catch (err) {
        console.error('Data Check Error:', err);
    } finally {
        await pool.end();
    }
}

checkSystemData();
