
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbManager } from '../src/database/db.enhanced.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testDashboardQuery() {
    try {
        console.log('Initializing database...');
        await dbManager.initializeAsync();

        const userEmail = 'resident1@securegate.com';
        const estateId = 1;

        console.log('Testing User Lookup...');
        const residentResult = await dbManager.query(
            'SELECT id FROM users WHERE email = $1 AND estate_id = $2',
            [userEmail, estateId]
        );
        console.log('User Lookup Result:', residentResult.rows);

        if (residentResult.rows.length === 0) {
            console.error('Resident not found!');
            process.exit(1);
        }

        const residentId = residentResult.rows[0].id;
        console.log('Found Resident ID:', residentId);

        console.log('Testing Resident Stats Query...');

        // Recent visitors query (The one I suspected)
        console.log('Query 1: Recent Visitors');
        const recentResult = await dbManager.query(
            `SELECT id, name, phone, purpose, status, date_of_visit, created_at 
       FROM visitors 
       WHERE resident_id = $1 AND estate_id = $2
       ORDER BY created_at DESC 
       LIMIT 5`,
            [residentId, estateId]
        );
        console.log('Query 1 Success. Rows:', recentResult.rowCount);

        // Monthly visitors query
        console.log('Query 2: Monthly Visitors');
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const monthlyResult = await dbManager.query(
            `SELECT COUNT(*) as total FROM visitors 
       WHERE resident_id = $1 AND created_at >= $2 AND estate_id = $3`,
            [residentId, monthStart, estateId]
        );
        console.log('Query 2 Success. Total:', monthlyResult.rows[0].total);

    } catch (error) {
        console.error('>>> DEBUG SCRIPT ERROR <<<', error);
    } finally {
        process.exit();
    }
}

testDashboardQuery();
