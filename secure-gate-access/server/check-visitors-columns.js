
import { dbManager } from './src/database/db.enhanced.js';

async function checkColumns() {
    await dbManager.initializeAsync();
    const res = await dbManager.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'visitors'
    `);
    console.log('Visitors Table Columns:', JSON.stringify(res.rows, null, 2));
    process.exit(0);
}

checkColumns().catch(e => {
    console.error(e);
    process.exit(1);
});
