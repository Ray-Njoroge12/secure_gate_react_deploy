
import { dbManager } from './src/database/db.enhanced.js';

async function checkUsers() {
    await dbManager.initializeAsync();
    const result = await dbManager.query('SELECT id, username, email, role FROM users ORDER BY id ASC LIMIT 5');
    console.log('First 5 Users:', JSON.stringify(result.rows, null, 2));
    process.exit(0);
}

checkUsers().catch(e => {
    console.error(e);
    process.exit(1);
});
