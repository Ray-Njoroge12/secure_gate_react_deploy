import pool from './src/database/db.js';
import fs from 'fs';

async function runMigration() {
    try {
        console.log('Running access_logs user_id migration...');
        
        const migrationSQL = fs.readFileSync('./migrations/20250913_fix_access_logs_user_id.sql', 'utf8');
        
        // Split by semicolons and run each statement
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('--') && s !== '');
        
        for (const statement of statements) {
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            await pool.query(statement);
        }
        
        console.log('✅ Migration completed successfully');
        
        // Verify the change
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'access_logs' AND column_name = 'user_id'
        `);
        
        console.log('\nVerification - access_logs.user_id:');
        console.table(result.rows);
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        process.exit(0);
    }
}

runMigration();