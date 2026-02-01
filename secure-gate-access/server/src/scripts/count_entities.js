
import 'dotenv/config';
import { dbManager } from '../database/db.enhanced.js';

async function countEntities() {
    try {
        await dbManager.initializeAsync();

        const [estates, users, visitors, incidents] = await Promise.all([
            dbManager.query('SELECT COUNT(*) FROM estates'),
            dbManager.query('SELECT COUNT(*) FROM users'),
            dbManager.query('SELECT COUNT(*) FROM visitors'),
            dbManager.query('SELECT COUNT(*) FROM incidents')
        ]);

        console.log('--- DB COUNTS ---');
        console.log('Estates:', estates.rows[0].count);
        console.log('Users:', users.rows[0].count);
        console.log('Visitors:', visitors.rows[0].count);
        console.log('Incidents:', incidents.rows[0].count);

        // Check Super Admin
        const sa = await dbManager.query("SELECT id, email, role FROM users WHERE role = 'super_admin'");
        console.log('Super Admin:', sa.rows);

    } catch (err) {
        console.error('Error counting:', err);
    } finally {
        process.exit(0);
    }
}

countEntities();
