
import { dbManager } from '../src/database/db.enhanced.js';
import { getVisitorHistory } from '../src/controllers/visitorAdminController.js';

async function debugHistoryResponse() {
    console.log('--- Debugging Visitor History Response Structure ---');
    try {
        await dbManager.initializeAsync();
    } catch (e) {
        console.log('DB init hook (ignoring)');
    }

    try {
        // 1. Get Guard User
        const guardRes = await dbManager.query(`SELECT id, email, role, estate_id FROM users WHERE email = 'verify_guard@test.com' LIMIT 1`);
        const guard = guardRes.rows[0];

        if (!guard) {
            console.error('❌ Guard not found. Please run seed script first.');
            return;
        }

        // 2. Mock Request/Response
        let capturedData = null;
        const req = {
            user: guard,
            query: {
                start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
                end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            },
            audit: async () => { }
        };
        const res = {
            status: (code) => res,
            json: (d) => {
                capturedData = d;
                return res;
            },
        };

        console.log(`Invoking getVisitorHistory for Guard (Estate ${guard.estate_id})...`);
        await getVisitorHistory(req, res);

        // 3. Inspect Data
        if (capturedData) {
            let list = [];
            if (Array.isArray(capturedData)) list = capturedData;
            else if (capturedData.data) list = capturedData.data;

            console.log(`Received ${list.length} records.`);
            if (list.length > 0) {
                console.log('\n🔍 Sample Record Structure:');
                console.log(JSON.stringify(list[0], null, 2));

                // Verification Checks
                const sample = list[0];
                const checks = {
                    'visitor_name': sample.visitor_name !== undefined,
                    'resident_name': sample.resident_name !== undefined,
                    'check_in_time': sample.check_in_time !== undefined,
                    'check_out_time': sample.check_out_time !== undefined
                };

                console.log('\n✅ Key Verification:');
                Object.entries(checks).forEach(([key, passed]) => {
                    console.log(`   - ${key}: ${passed ? '✅ Present' : '❌ MISSING'}`);
                });

            } else {
                console.log('⚠️ No history records found.');
            }
        } else {
            console.log('❌ No data captured.');
        }

    } catch (err) {
        console.error('Debug failed:', err);
    } finally {
        process.exit();
    }
}

debugHistoryResponse();
