import { dbManager } from '../src/database/db.enhanced.js';

async function migrate() {
    console.log('Starting migration to add estate_id to bulk_invites...');
    try {
        await dbManager.initializeAsync();

        // Add estate_id column
        await dbManager.query(`
      ALTER TABLE bulk_invites 
      ADD COLUMN IF NOT EXISTS estate_id INT REFERENCES estates(id);
    `);

        // Set default estate_id for existing rows (if any) to 1 (Default Estate)
        await dbManager.query(`
      UPDATE bulk_invites 
      SET estate_id = 1 
      WHERE estate_id IS NULL;
    `);

        console.log('✅ Migration successful: estate_id added to bulk_invites');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
