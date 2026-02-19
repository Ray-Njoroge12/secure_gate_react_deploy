import { dbManager } from '../src/database/db.enhanced.js';
import { getMyVisitors } from '../src/controllers/visitorInviteController.js';

// Mock Express Request/Response
const mockReq = (user, query) => ({
    user,
    query,
    headers: {},
    audit: async () => { }
});

const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.body = data;
        return res;
    };
    return res;
};

async function run() {
    await dbManager.initializeAsync();

    try {
        // 1. Get Guard User
        const guardRes = await dbManager.query("SELECT * FROM users WHERE email = 'guard1@securegate.com'");
        if (guardRes.rows.length === 0) {
            console.error("Guard 'guard1@securegate.com' not found. Run seed first.");
            return;
        }
        const guard = guardRes.rows[0];
        console.log("Guard User:", { id: guard.id, email: guard.email, estate_id: guard.estate_id });

        // 2. Create a test visitor if none exists
        const visitorRes = await dbManager.query("SELECT * FROM visitors WHERE estate_id = $1 LIMIT 1", [guard.estate_id]);
        let visitorName = "Test Visitor";
        if (visitorRes.rows.length > 0) {
            visitorName = visitorRes.rows[0].name;
            console.log("Found existing visitor for test:", visitorName);
        } else {
            console.log("No visitors found for this estate. Creating one...");
            // Insert code here if needed, but existing seed should have them.
        }

        // 3. Simulate Manual Check Search
        const searchTerm = "Visitor"; // Should match "Visitor 1", etc.
        const req = mockReq(guard, { search: searchTerm });
        const res = mockRes();

        console.log(`Testing search with term: '${searchTerm}'`);
        await getMyVisitors(req, res);

        console.log("Response Status:", res.statusCode);
        if (res.body && res.body.data && res.body.data.visitors) {
            console.log(`Found ${res.body.data.visitors.length} visitors.`);
            res.body.data.visitors.forEach(v => {
                console.log(` - ${v.name} (Status: ${v.status})`);
            });
        } else {
            console.log("Response Body:", JSON.stringify(res.body, null, 2));
        }

        // 4. Test exact name match
        if (visitorName) {
            const req2 = mockReq(guard, { search: visitorName });
            const res2 = mockRes();
            console.log(`Testing search with exact name: '${visitorName}'`);
            await getMyVisitors(req2, res2);
            console.log(`Found ${res2.body?.data?.visitors?.length || 0} visitors.`);
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await dbManager.disconnect();
    }
}

run();
