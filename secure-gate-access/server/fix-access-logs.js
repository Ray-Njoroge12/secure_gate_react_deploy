import pool from './src/database/db.js';

async function fixAccessLogs() {
    try {
        console.log('Fixing access_logs user_id column type...');
        
        // Check current state
        console.log('\n1. Current schema:');
        let result = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'access_logs' AND column_name LIKE '%user_id%'
            ORDER BY column_name
        `);
        console.table(result.rows);
        
        // Step 1: Add new UUID column
        console.log('\n2. Adding new UUID column...');
        await pool.query('ALTER TABLE access_logs ADD COLUMN user_id_new UUID');
        
        // Step 2: Check intermediate state
        result = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'access_logs' AND column_name LIKE '%user_id%'
            ORDER BY column_name
        `);
        console.table(result.rows);
        
        // Step 3: Drop old column
        console.log('\n3. Dropping old INTEGER column...');
        await pool.query('ALTER TABLE access_logs DROP COLUMN user_id');
        
        // Step 4: Rename new column
        console.log('\n4. Renaming new column to user_id...');
        await pool.query('ALTER TABLE access_logs RENAME COLUMN user_id_new TO user_id');
        
        // Step 5: Add foreign key constraint
        console.log('\n5. Adding foreign key constraint...');
        await pool.query(`
            ALTER TABLE access_logs ADD CONSTRAINT fk_access_logs_user_id 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        `);
        
        // Final verification
        console.log('\n6. Final verification:');
        result = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'access_logs' AND column_name = 'user_id'
        `);
        console.table(result.rows);
        
        console.log('✅ Access logs user_id migration completed successfully');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Full error:', error);
    } finally {
        process.exit(0);
    }
}

fixAccessLogs();