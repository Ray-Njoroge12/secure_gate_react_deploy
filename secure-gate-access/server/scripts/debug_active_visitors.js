import { getActiveVisitors } from '../src/controllers/visitorAdminController.js';
import { dbManager } from '../src/database/db.enhanced.js';

// Mock Response object
const res = {
    json: (data) => console.log(JSON.stringify(data, null, 2)),
    status: (code) => {
        console.log(`Status: ${code}`);
        return { json: (data) => console.log(JSON.stringify(data, null, 2)) };
    }
};

// Mock Request object
// We need a valid estate_id. User is using Guard (Role: guard).
// From previous debug, Guard Estate ID was issue. Let's assume 44 based on previous logs.
const req = {
    user: {
        email: 'verify_guard@test.com',
        role: 'guard',
        estate_id: 44
    },
    query: {},
    audit: () => { }
};

async function run() {
    try {
        console.log('--- Debugging Active Visitors ---');
        await dbManager.query('SELECT 1'); // Init DB
        await getActiveVisitors(req, res);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

run();
