// Check all tables with user_id columns to find the integer/UUID mismatch
import pool from './src/database/db.js';

async function checkSchema() {
    try {
        // Find all tables with user_id columns
        const tablesResult = await pool.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE column_name = 'user_id'
            ORDER BY table_name;
        `);
        console.log('Tables with user_id columns:');
        console.table(tablesResult.rows);
        
        // Check access_logs specifically since it was mentioned
        const accessLogsResult = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'access_logs'
            ORDER BY ordinal_position;
        `);
        console.log('\naccess_logs table schema:');
        console.table(accessLogsResult.rows);
        
        // Check users table
        const userResult = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'users'
            AND column_name = 'id'
            ORDER BY ordinal_position;
        `);
        console.log('\nusers.id column:');
        console.table(userResult.rows);
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        process.exit(0);
    }
}

checkSchema();
