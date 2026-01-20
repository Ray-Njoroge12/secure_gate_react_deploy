
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { dbManager } from './src/database/db.enhanced.js';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Force load .env.test
dotenv.config({ path: join(__dirname, '.env.test') });

async function run() {
    console.log(`Fixing schema for DB: ${process.env.DATABASE_URL || process.env.DB_NAME}`);

    try {
        await dbManager.initializeAsync();

        // 041
        console.log('Applying 041...');
        const sql041 = await fs.readFile(join(__dirname, 'src/database/migrations/041_create_revoked_tokens.sql'), 'utf8');
        await dbManager.query(sql041);

        // 042
        console.log('Applying 042...');
        const sql042 = await fs.readFile(join(__dirname, 'src/database/migrations/042_create_notifications_table.sql'), 'utf8');
        await dbManager.query(sql042);

        // 043
        console.log('Applying 043...');
        const sql043 = await fs.readFile(join(__dirname, 'src/database/migrations/043_add_notification_delivery_tracking.sql'), 'utf8');
        await dbManager.query(sql043);

        // 044
        console.log('Applying 044...');
        const sql044 = await fs.readFile(join(__dirname, 'src/database/migrations/044_create_delivery_logs.sql'), 'utf8');
        await dbManager.query(sql044);

        // 045
        console.log('Applying 045...');
        const sql045 = await fs.readFile(join(__dirname, 'src/database/migrations/045_update_event_analytics_view.sql'), 'utf8');
        await dbManager.query(sql045);

        // 046
        console.log('Applying 046...');
        const sql046 = await fs.readFile(join(__dirname, 'src/database/migrations/046_add_status_to_users.sql'), 'utf8');
        await dbManager.query(sql046);

        console.log('Schema fixed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Failed:', error);
        process.exit(1);
    }
}

run();
