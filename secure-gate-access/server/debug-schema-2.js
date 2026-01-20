
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

const pool = new Pool();

async function checkSchema() {
    try {
        const users = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
        console.log('Columns in users table:', users.rows.map(r => `${r.column_name}`).sort());

        const visitors = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'visitors'
    `);
        console.log('Columns in visitors table:', visitors.rows.map(r => `${r.column_name}`).sort());

        const view = await pool.query(`
      SELECT definition 
      FROM pg_views 
      WHERE viewname = 'event_analytics'
    `);
        console.log('View definition for event_analytics:', view.rows[0]?.definition || 'View not found');

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkSchema();
