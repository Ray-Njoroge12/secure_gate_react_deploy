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

async function fullCleanup() {
    console.log('--- SYSTEM CLEANUP IN PROGRESS ---');
    try {
        // Order matters for foreign keys
        const tables = [
            'visitor_history',
            'audit_logs',
            'notifications',
            'mfa_credentials',
            'deliveries',
            'incidents',
            'visitors',
            'invite_links',
            'estates',
            'users'
        ];

        for (const table of tables) {
            try {
                await pool.query(`TRUNCATE TABLE ${table} CASCADE`);
                console.log(`[OK] Truncated ${table}`);
            } catch (e) {
                console.warn(`[SKIP] ${table}: ${e.message}`);
            }
        }

        // Optional: Re-seed basic Super Admin so the user isn't locked out
        // If they want to test 'registration' flow of the first user, we can skip this.
        // However, usually one Super Admin is needed to initialize things.

        console.log('\n--- CLEANUP COMPLETE ---');
        console.log('System is now in a "Day Zero" state.');

    } catch (err) {
        console.error('Cleanup Error:', err);
    } finally {
        await pool.end();
    }
}

fullCleanup();
