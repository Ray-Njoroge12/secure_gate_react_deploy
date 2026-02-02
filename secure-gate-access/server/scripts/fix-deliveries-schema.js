import { dbManager } from '../src/database/db.enhanced.js';

async function migrate() {
    console.log('Starting migration to add estate_id to deliveries...');
    try {
        await dbManager.initializeAsync();

        // Add estate_id column
        await dbManager.query(`
      ALTER TABLE deliveries 
      ADD COLUMN IF NOT EXISTS estate_id INT REFERENCES estates(id);
    `);

        // Set default estate_id for existing rows to 1
        await dbManager.query(`
      UPDATE deliveries 
      SET estate_id = 1 
      WHERE estate_id IS NULL;
    `);

        // Verify
        const verify = await dbManager.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'deliveries' AND column_name = 'estate_id';
    `);

        if (verify.rows.length > 0) {
            console.log('✅ Migration successful: estate_id added to deliveries');
        } else {
            throw new Error('Column not found after migration');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
