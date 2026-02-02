import { dbManager } from './src/database/db.enhanced.js';

async function inspect() {
    await dbManager.initializeAsync();
    const result = await dbManager.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'bulk_invites';
    `);
    console.log("Bulk Invites Columns:", result.rows);

    const rideshare = await dbManager.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'rideshare_entries';
    `);
    console.log("Rideshare Entries Columns:", rideshare.rows);

    const deliveries = await dbManager.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'deliveries';
    `);
    console.log("Deliveries Columns:", deliveries.rows);

    const deliveryLogs = await dbManager.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'delivery_logs';
    `);
    console.log("Delivery Logs Columns:", deliveryLogs.rows);
    process.exit(0);
}

inspect().catch(err => console.error(err));
