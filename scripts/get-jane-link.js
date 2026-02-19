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

async function getJaneLink() {
    try {
        const res = await pool.query("SELECT invite_code FROM visitors WHERE name = 'Jane Doe' ORDER BY created_at DESC LIMIT 1;");
        if (res.rows.length > 0) {
            console.log(`INVITE_CODE: ${res.rows[0].invite_code}`);
        } else {
            console.log('Jane Doe not found');
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

getJaneLink();
