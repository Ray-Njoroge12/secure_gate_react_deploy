
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

const pool = new Pool();

async function checkSchema() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'guard_shifts'
    `);
        console.log('Columns in guard_shifts table:', res.rows.map(r => `${r.column_name} (${r.data_type})`).sort());

        const res2 = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'events'
    `);
        console.log('Columns in events table:', res2.rows.map(r => `${r.column_name} (${r.data_type})`).sort());

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkSchema();
