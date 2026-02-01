import { dbManager } from './server/src/database/db.enhanced.js';

async function checkAdmins() {
    try {
        console.log('Connecting to database...');
        const res = await dbManager.query(`
      SELECT id, username, email, role, estate_id 
      FROM users 
      WHERE role IN ('admin', 'super_admin')
    `);

        console.log('--- Admin Users ---');
        console.table(res.rows);

        const missingEstate = res.rows.filter(u => u.role === 'admin' && !u.estate_id);
        if (missingEstate.length > 0) {
            console.log('⚠️ WARNING: The following admins are missing an estate_id:');
            missingEstate.forEach(u => console.log(`- ${u.username} (${u.email})`));

            // Attempt to fix using the first available estate if needed (optional)
            const estates = await dbManager.query('SELECT id, name FROM estate_locations');
            if (estates.rows.length > 0) {
                console.log(`\nAvailable Estates:`);
                console.table(estates.rows);

                const defaultEstateId = estates.rows[0].id;
                console.log(`\nTo fix, running update for missing admins to estate_id: ${defaultEstateId}`);
                for (const u of missingEstate) {
                    await dbManager.query('UPDATE users SET estate_id = $1 WHERE id = $2', [defaultEstateId, u.id]);
                    console.log(`Updated ${u.username} to estate ${defaultEstateId}`);
                }
            } else {
                console.log('No estates found in database.');
            }

        } else {
            console.log('✅ All admins have valid estate_ids.');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

checkAdmins();
