import pool from './src/database/db.js';

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name LIKE '%audit%'
      ORDER BY table_name;
    `);
    console.log('Audit-related tables:');
    result.rows.forEach(row => console.log('  ' + row.table_name));
    
    const allTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('\nAll tables:');
    allTables.rows.forEach(row => console.log('  ' + row.table_name));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkTables();