import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function debugSchema() {
    try {
        console.log('Connecting to DB...');

        // Check Estates Table
        console.log('--- Estates Table ---');
        const resEstates = await pool.query('SELECT * FROM estates LIMIT 1');
        if (resEstates.rows.length > 0) {
            console.log('Estates Table Columns:', Object.keys(resEstates.rows[0]));
        } else {
            console.log('Estates table empty, fetching schema...');
            const schemaRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'estates'");
            console.log('Estates Table Columns (Schema):', schemaRes.rows.map(r => r.column_name));
        }

        // Run the failing query
        console.log('\n--- Running Test Query ---');
        const q = 'Super';
        const result = await pool.query(
            `SELECT 
                u.id, u.username, u.first_name, u.last_name, u.email, u.role, u.account_status as status, u.estate_id, u.created_at,
                e.name as estate_name
             FROM users u
             LEFT JOIN estates e ON u.estate_id = e.id
             WHERE 
                u.username ILIKE $1 OR 
                u.first_name ILIKE $1 OR
                u.last_name ILIKE $1 OR
                u.email ILIKE $1
             LIMIT 20`,
            [`%${q}%`]
        );
        console.log('Test Query Success! Rows:', result.rows.length);

    } catch (err) {
        console.error('DB Error:', err);
    } finally {
        await pool.end();
    }
}

debugSchema();
